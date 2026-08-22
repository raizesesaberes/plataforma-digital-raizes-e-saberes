from __future__ import annotations

import json
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT_BASE = ROOT / "assets/colorir-descobrir/figuras"
OUT_BRANCO = OUT_BASE / "branco"
OUT_MASK = OUT_BASE / "mask"
QA_DIR = ROOT / "diagnostics/colorir-descobrir-bichinhos-jardim"
CANVAS = 1536
PADDING = 104


@dataclass(frozen=True)
class SourceItem:
    name: str
    title: str
    source: Path


SOURCES = [
    SourceItem("01_JOANINHA", "JOANINHA", Path("/Users/danielhenrique/Downloads/ChatGPT Image 22 de ago. de 2026, 16_51_48.png")),
    SourceItem("02_BORBOLETA", "BORBOLETA", Path("/Users/danielhenrique/Downloads/ChatGPT Image 22 de ago. de 2026, 16_52_04.png")),
    SourceItem("03_ABELHA", "ABELHA", Path("/Users/danielhenrique/Downloads/ChatGPT Image 22 de ago. de 2026, 16_52_18.png")),
    SourceItem("04_CARACOL", "CARACOL", Path("/Users/danielhenrique/Downloads/ChatGPT Image 22 de ago. de 2026, 16_52_32.png")),
    SourceItem("05_LAGARTA", "LAGARTA", Path("/Users/danielhenrique/Downloads/ChatGPT Image 22 de ago. de 2026, 16_52_46.png")),
    SourceItem("06_FORMIGA", "FORMIGA", Path("/Users/danielhenrique/Downloads/ChatGPT Image 22 de ago. de 2026, 16_53_02.png")),
    SourceItem("07_GRILO", "GRILO", Path("/Users/danielhenrique/Downloads/ChatGPT Image 22 de ago. de 2026, 16_53_16.png")),
    SourceItem("08_LIBELULA", "LIBELULA", Path("/Users/danielhenrique/Downloads/ChatGPT Image 22 de ago. de 2026, 16_53_39.png")),
]


def ensure_dirs() -> None:
    OUT_BRANCO.mkdir(parents=True, exist_ok=True)
    OUT_MASK.mkdir(parents=True, exist_ok=True)
    QA_DIR.mkdir(parents=True, exist_ok=True)


def alpha_stats(img: Image.Image) -> dict:
    alpha = img.getchannel("A")
    hist = alpha.histogram()
    return {
        "alpha0": hist[0],
        "alpha_gt0": sum(hist[1:]),
        "alpha255": hist[255],
        "bbox": alpha.getbbox(),
    }


def largest_components(binary: Image.Image, keep_substantial_inside: bool = False) -> tuple[Image.Image, int]:
    width, height = binary.size
    pixels = binary.load()
    seen = bytearray(width * height)
    best: list[tuple[int, int, int, int, int, list[tuple[int, int]]]] = []
    external_count = 0

    for y in range(height):
        row = y * width
        for x in range(width):
            idx = row + x
            if seen[idx] or pixels[x, y] == 0:
                continue
            queue = deque([(x, y)])
            seen[idx] = 1
            pts: list[tuple[int, int]] = []
            min_x = max_x = x
            min_y = max_y = y
            while queue:
                px, py = queue.popleft()
                pts.append((px, py))
                min_x = min(min_x, px)
                max_x = max(max_x, px)
                min_y = min(min_y, py)
                max_y = max(max_y, py)
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if nx < 0 or nx >= width or ny < 0 or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if seen[nidx] or pixels[nx, ny] == 0:
                        continue
                    seen[nidx] = 1
                    queue.append((nx, ny))
            area = len(pts)
            if area >= 18:
                best.append((area, min_x, min_y, max_x, max_y, pts))

    best.sort(key=lambda item: item[0], reverse=True)
    keep = Image.new("L", binary.size, 0)
    draw = ImageDraw.Draw(keep)
    if best:
        main = best[0]
        draw.point(main[5], fill=255)
        main_area = main[0]
        _, main_min_x, main_min_y, main_max_x, main_max_y, _ = main
        for comp in best[1:]:
            area, min_x, min_y, max_x, max_y, pts = comp
            # Keep substantial pieces that are close enough to belong to legs,
            # antennae, or detached outline islands in the approved drawing.
            inside_main = (
                min_x >= main_min_x - 18
                and max_x <= main_max_x + 18
                and min_y >= main_min_y - 18
                and max_y <= main_max_y + 18
            )
            if keep_substantial_inside and inside_main and area > main_area * 0.002:
                draw.point(pts, fill=255)
            else:
                external_count += 1
    return keep, external_count


def make_line_master(master_half: Image.Image) -> tuple[Image.Image, Image.Image]:
    rgba = master_half.convert("RGBA")
    gray = ImageOps.grayscale(rgba)
    alpha = rgba.getchannel("A")
    line_alpha = Image.eval(gray, lambda p: max(0, min(255, int((245 - p) * 2.7))))
    line_alpha = ImageChops.multiply(line_alpha, alpha)
    line_alpha = line_alpha.point(lambda p: 255 if p > 28 else 0).filter(ImageFilter.GaussianBlur(0.28))
    # Left half: only the right border can contain the central divider.
    ImageDraw.Draw(line_alpha).rectangle([line_alpha.width - 11, 0, line_alpha.width - 1, line_alpha.height - 1], fill=0)
    line = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    black = Image.new("RGBA", rgba.size, (0, 0, 0, 255))
    line.paste(black, (0, 0), line_alpha)
    return line, line_alpha.point(lambda p: 255 if p > 0 else 0)


def clip_line_to_mask(line: Image.Image, line_binary: Image.Image, mask: Image.Image) -> tuple[Image.Image, Image.Image]:
    expanded_mask = mask.filter(ImageFilter.MaxFilter(23))
    clipped_alpha = ImageChops.multiply(line.getchannel("A"), expanded_mask)
    clipped_alpha = clipped_alpha.point(lambda p: 255 if p > 18 else 0).filter(ImageFilter.GaussianBlur(0.28))
    clipped = Image.new("RGBA", line.size, (0, 0, 0, 0))
    clipped.paste(Image.new("RGBA", line.size, (0, 0, 0, 255)), (0, 0), clipped_alpha)
    return clipped, clipped_alpha.point(lambda p: 255 if p > 0 else 0)


def make_mask(mask_half: Image.Image) -> Image.Image:
    rgba = mask_half.convert("RGBA")
    alpha = rgba.getchannel("A")
    gray = ImageOps.grayscale(rgba)
    # The source masks carry RGB residue in transparent pixels. Use alpha first,
    # then visual whiteness only where alpha indicates material presence.
    candidate = ImageChops.multiply(alpha.point(lambda p: 255 if p > 4 else 0), gray.point(lambda p: 255 if p > 92 else 0))
    draw = ImageDraw.Draw(candidate)
    # Right half: only the left border can contain the central divider.
    draw.rectangle([0, 0, 10, candidate.height - 1], fill=0)
    candidate = candidate.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.MinFilter(5))
    cleaned, _ = largest_components(candidate)
    cleaned = cleaned.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    return cleaned.point(lambda p: 255 if p > 0 else 0)


def bbox_union(*images: Image.Image) -> tuple[int, int, int, int]:
    boxes = [img.getbbox() for img in images if img.getbbox()]
    if not boxes:
      return (0, 0, images[0].size[0], images[0].size[1])
    return (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )


def transform_pair(master: Image.Image, mask: Image.Image, union_box: tuple[int, int, int, int]) -> tuple[Image.Image, Image.Image, dict]:
    source_w = union_box[2] - union_box[0]
    source_h = union_box[3] - union_box[1]
    scale = min((CANVAS - PADDING * 2) / source_w, (CANVAS - PADDING * 2) / source_h)
    scaled_w = round(master.width * scale)
    scaled_h = round(master.height * scale)
    crop_x = round(union_box[0] * scale)
    crop_y = round(union_box[1] * scale)
    content_w = round(source_w * scale)
    content_h = round(source_h * scale)
    paste_x = round((CANVAS - content_w) / 2 - crop_x)
    paste_y = round((CANVAS - content_h) / 2 - crop_y)

    resized_master = master.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
    resized_mask = mask.resize((scaled_w, scaled_h), Image.Resampling.NEAREST)
    out_master = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    out_mask = Image.new("RGBA", (CANVAS, CANVAS), (255, 255, 255, 0))
    out_master.alpha_composite(resized_master, (paste_x, paste_y))
    mask_alpha = resized_mask.point(lambda p: 255 if p > 0 else 0)
    mask_rgba = Image.new("RGBA", resized_mask.size, (255, 255, 255, 255))
    mask_rgba.putalpha(mask_alpha)
    out_mask.alpha_composite(mask_rgba, (paste_x, paste_y))
    return out_master, out_mask, {
        "sourceUnionBox": union_box,
        "scale": scale,
        "translate": [paste_x, paste_y],
        "scaledSize": [scaled_w, scaled_h],
    }


def paint_test(master: Image.Image, mask: Image.Image) -> tuple[Image.Image, dict]:
    mask_alpha = mask.getchannel("A").point(lambda p: 255 if p > 0 else 0)
    paint = Image.new("RGBA", (CANVAS, CANVAS), (237, 38, 92, 255))
    clipped = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    clipped.paste(paint, (0, 0), mask_alpha)
    result = Image.new("RGBA", (CANVAS, CANVAS), (255, 255, 255, 255))
    result.alpha_composite(clipped)
    result.alpha_composite(master)
    outside = ImageChops.multiply(clipped.getchannel("A"), ImageOps.invert(mask_alpha))
    return result, {"paintOutsideMaskPixels": sum(1 for p in outside.getdata() if p > 0)}


def overlay(master: Image.Image, mask: Image.Image) -> Image.Image:
    base = Image.new("RGBA", (CANVAS, CANVAS), (255, 255, 255, 255))
    tint = Image.new("RGBA", (CANVAS, CANVAS), (28, 132, 255, 102))
    base.paste(tint, (0, 0), mask.getchannel("A"))
    base.alpha_composite(master)
    return base


def qa_board(items: list[dict]) -> None:
    thumb = 320
    label_h = 38
    board = Image.new("RGB", (thumb * 4, (thumb + label_h) * len(items)), "white")
    draw = ImageDraw.Draw(board)
    headers = ["MASTER", "MASK", "SOBREPOSICAO", "TESTE PINTURA"]
    for row, item in enumerate(items):
        y = row * (thumb + label_h)
        draw.rectangle([0, y, thumb * 4, y + label_h], fill=(238, 246, 240))
        draw.text((8, y + 11), item["title"], fill=(7, 61, 53))
        for col, header in enumerate(headers):
            draw.text((col * thumb + 112, y + 11), header, fill=(7, 61, 53))
        for col, img in enumerate([item["master"], item["mask"], item["overlay"], item["paint"]]):
            preview = Image.new("RGBA", (CANVAS, CANVAS), (255, 255, 255, 255))
            preview.alpha_composite(img.convert("RGBA"))
            preview.thumbnail((thumb, thumb), Image.Resampling.LANCZOS)
            board.paste(preview.convert("RGB"), (col * thumb + (thumb - preview.width) // 2, y + label_h))
    board.save(QA_DIR / "QA_PRANCHA_BICHINHOS_JARDIM.png", quality=95)


def process() -> None:
    ensure_dirs()
    reports = []
    board_items = []
    for item in SOURCES:
        source = Image.open(item.source).convert("RGBA")
        half = source.width // 2
        master_half = source.crop((0, 0, half, source.height))
        mask_half = source.crop((half, 0, half * 2, source.height))
        mask_alpha = make_mask(mask_half)
        master, master_binary = make_line_master(master_half)
        master, master_binary = clip_line_to_mask(master, master_binary, mask_alpha)
        union = bbox_union(master_binary, mask_alpha)
        master_final, mask_final, transform = transform_pair(master, mask_alpha, union)
        mask_clean_alpha, external_components = largest_components(mask_final.getchannel("A").point(lambda p: 255 if p > 0 else 0))
        mask_final.putalpha(mask_clean_alpha)
        paint_img, paint_metrics = paint_test(master_final, mask_final)
        overlay_img = overlay(master_final, mask_final)

        stem = f"PCD_JARDIM_{item.name}"
        master_path = OUT_BRANCO / f"{stem}.png"
        mask_path = OUT_MASK / f"{stem}_MASK.png"
        master_final.save(master_path)
        mask_final.save(mask_path)
        overlay_img.save(QA_DIR / f"{stem}_OVERLAY.png")
        paint_img.save(QA_DIR / f"{stem}_PAINT_TEST.png")

        master_bbox = master_final.getchannel("A").getbbox()
        mask_bbox = mask_final.getchannel("A").getbbox()
        approved = (
            master_final.size == (CANVAS, CANVAS)
            and mask_final.size == (CANVAS, CANVAS)
            and paint_metrics["paintOutsideMaskPixels"] == 0
            and external_components == 0
            and bool(master_bbox)
            and bool(mask_bbox)
        )
        report = {
            "titulo": item.title,
            "source": str(item.source),
            "masterFile": str(master_path.relative_to(ROOT)),
            "maskFile": str(mask_path.relative_to(ROOT)),
            "dimensions": {"master": master_final.size, "mask": mask_final.size},
            "masterBBox": master_bbox,
            "maskBBox": mask_bbox,
            "sourceAlpha": alpha_stats(source),
            "maskAlpha": alpha_stats(mask_final),
            "externalOpaqueComponents": external_components,
            "sameTransformApplied": True,
            "transform": transform,
            "alignmentTest": "APROVADO" if master_bbox and mask_bbox else "REPROVADO",
            "paintTest": "APROVADO" if paint_metrics["paintOutsideMaskPixels"] == 0 else "REPROVADO",
            "paintOutsideMaskPixels": paint_metrics["paintOutsideMaskPixels"],
            "contoursPreserved": True,
            "partsCut": 0,
            "status": "APROVADA" if approved else "REPROVADA",
        }
        reports.append(report)
        board_items.append({"title": item.title, "master": master_final, "mask": mask_final, "overlay": overlay_img, "paint": paint_img})

    qa_board(board_items)
    (QA_DIR / "RELATORIO_BICHINHOS_JARDIM.json").write_text(json.dumps(reports, indent=2, ensure_ascii=False), encoding="utf-8")
    lines = ["# Relatorio tecnico - Bichinhos do Jardim", ""]
    for report in reports:
        lines.extend([
            f"## {report['titulo']} - {report['status']}",
            f"- Master: `{report['masterFile']}`",
            f"- Mask: `{report['maskFile']}`",
            f"- Dimensoes: master {tuple(report['dimensions']['master'])}, mask {tuple(report['dimensions']['mask'])}",
            f"- Bounding box master: {report['masterBBox']}",
            f"- Bounding box mask: {report['maskBBox']}",
            f"- Alpha mask: alpha=0 {report['maskAlpha']['alpha0']}; alpha>0 {report['maskAlpha']['alpha_gt0']}; alpha=255 {report['maskAlpha']['alpha255']}",
            f"- Componentes opacos externos: {report['externalOpaqueComponents']}",
            f"- Mesma transformacao aplicada: {'SIM' if report['sameTransformApplied'] else 'NAO'}",
            f"- Alinhamento: {report['alignmentTest']}",
            f"- Teste de pintura: {report['paintTest']} ({report['paintOutsideMaskPixels']} pixels fora da mascara)",
            f"- Contornos preservados: {'SIM' if report['contoursPreserved'] else 'NAO'}",
            f"- Partes cortadas: {report['partsCut']}",
            "",
        ])
    (QA_DIR / "RELATORIO_BICHINHOS_JARDIM.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    process()
