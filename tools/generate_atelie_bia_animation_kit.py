from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
GM = ROOT / "assets/games/atelie-bia/golden-master"
OUT = ROOT / "assets/games/atelie-bia/animation/RS-ATELIE-BIA-JARDIM-ASSET-006"
CANVAS = (1254, 1254)


def rgba(name):
    return Image.open(GM / name).convert("RGBA")


def blank():
    return Image.new("RGBA", CANVAS, (0, 0, 0, 0))


def save(img, folder, name):
    target = OUT / folder
    target.mkdir(parents=True, exist_ok=True)
    img.save(target / name)


def paste(base, layer):
    base.alpha_composite(layer)
    return base


def transform_layer(layer, pivot, angle=0, scale=(1, 1), translate=(0, 0)):
    bbox = layer.getchannel("A").getbbox()
    if not bbox:
        return blank()

    crop = layer.crop(bbox)
    local_pivot = (pivot[0] - bbox[0], pivot[1] - bbox[1])
    pad = max(crop.size) * 2
    stage = Image.new("RGBA", (pad, pad), (0, 0, 0, 0))
    origin = (pad // 2 - int(local_pivot[0]), pad // 2 - int(local_pivot[1]))
    stage.alpha_composite(crop, origin)

    if scale != (1, 1):
        resized = stage.resize(
            (max(1, int(stage.width * scale[0])), max(1, int(stage.height * scale[1]))),
            Image.Resampling.BICUBIC,
        )
        scaled = Image.new("RGBA", stage.size, (0, 0, 0, 0))
        scaled.alpha_composite(resized, ((stage.width - resized.width) // 2, (stage.height - resized.height) // 2))
        stage = scaled

    if angle:
        stage = stage.rotate(angle, resample=Image.Resampling.BICUBIC, center=(pad // 2, pad // 2))

    result = blank()
    result.alpha_composite(stage, (int(pivot[0] + translate[0] - pad // 2), int(pivot[1] + translate[1] - pad // 2)))
    return result


def crop_alpha(layer, box):
    mask = Image.new("L", CANVAS, 0)
    ImageDraw.Draw(mask).rectangle(box, fill=255)
    alpha = Image.composite(layer.getchannel("A"), Image.new("L", CANVAS, 0), mask)
    out = layer.copy()
    out.putalpha(alpha)
    return out


def make_shadow(scale=1.0, y=1012, opacity=76):
    shadow = blank()
    w, h = int(700 * scale), int(116 * scale)
    oval = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(oval).ellipse((0, 0, w - 1, h - 1), fill=(44, 28, 16, opacity))
    oval = oval.filter(ImageFilter.GaussianBlur(int(18 * scale)))
    shadow.alpha_composite(oval, ((CANVAS[0] - w) // 2 + 80, y))
    return shadow


def font(size=26):
    try:
        return ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", size)
    except OSError:
        return ImageFont.load_default()


def guide(master):
    img = blank()
    faded = master.copy()
    faded.putalpha(master.getchannel("A").point(lambda a: int(a * 0.34)))
    img.alpha_composite(faded)
    draw = ImageDraw.Draw(img)
    points = {
        "CENTRO CORPO": (755, 735),
        "PIVO ASA SUP.": (688, 540),
        "PIVO ASA INF.": (720, 760),
        "PIVO ANTENA E": (180, 170),
        "PIVO ANTENA D": (462, 118),
        "PERNAS DIANTEIRAS": (230, 860),
        "PERNAS TRASEIRAS": (950, 925),
    }
    for name, (x, y) in points.items():
        draw.ellipse((x - 10, y - 10, x + 10, y + 10), fill=(255, 92, 118, 255), outline=(255, 255, 255, 255), width=3)
        draw.line((x, y, x + 88, y - 34), fill=(255, 92, 118, 255), width=4)
        draw.text((x + 96, y - 54), name, fill=(82, 46, 22, 255), font=font())

    draw.rectangle((54, 1070, 1198, 1192), fill=(255, 248, 232, 232), outline=(196, 128, 62, 255), width=4)
    draw.text((80, 1094), "Canvas tecnico: 1254 x 1254 px | origem preservada | PNG transparente", fill=(82, 46, 22, 255), font=font())
    draw.text((80, 1134), "Camadas pintaveis sao textura movel, sem substituir a criacao da crianca.", fill=(82, 46, 22, 255), font=font())
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    protected = rgba("JOANINHA_BASE_PROTEGIDA.png")
    master = rgba("JOANINHA_GOLDEN_MASTER_V2.png")
    head = rgba("JOANINHA_PARTE_CABECA.png")
    body = rgba("JOANINHA_PARTE_CORPO.png")
    wings = rgba("JOANINHA_PARTE_ASAS.png")
    spots = rgba("JOANINHA_PARTE_PINTINHAS.png")
    legs_antennas = rgba("JOANINHA_PARTE_PERNAS_ANTENAS.png")

    save(master, "IDLE", "JOANINHA_ANIM_IDLE.png")
    save(master, "IDLE", "JOANINHA_ANIM_IDLE_REFERENCE_GOLDEN_MASTER.png")

    wing_surface = blank()
    paste(wing_surface, wings)
    paste(wing_surface, spots)
    half_wings = transform_layer(wing_surface, (690, 555), angle=-9, scale=(0.96, 1.02), translate=(10, -44))
    open_wings = transform_layer(wing_surface, (690, 555), angle=-24, scale=(0.84, 1.10), translate=(-16, -112))

    half = blank()
    for layer in (protected, head, body, legs_antennas, half_wings):
        paste(half, layer)
    save(half, "WINGS", "JOANINHA_ANIM_WINGS_HALF.png")

    inner = blank()
    d = ImageDraw.Draw(inner)
    d.ellipse((650, 330, 1160, 650), fill=(214, 246, 255, 86), outline=(126, 205, 232, 150), width=7)
    d.ellipse((645, 550, 1178, 884), fill=(214, 246, 255, 70), outline=(126, 205, 232, 130), width=7)
    inner = inner.filter(ImageFilter.GaussianBlur(0.4))
    save(inner, "WINGS", "JOANINHA_INNER_WINGS.png")

    opened = blank()
    for layer in (inner, protected, head, body, legs_antennas, open_wings):
        paste(opened, layer)
    save(opened, "WINGS", "JOANINHA_ANIM_WINGS_OPEN.png")
    save(wing_surface, "WINGS", "JOANINHA_LAYER_EXTERNAL_WINGS_TEXTURE_IDLE.png")
    save(half_wings, "WINGS", "JOANINHA_LAYER_EXTERNAL_WINGS_TEXTURE_HALF.png")
    save(open_wings, "WINGS", "JOANINHA_LAYER_EXTERNAL_WINGS_TEXTURE_OPEN.png")

    front = crop_alpha(legs_antennas, (0, 730, 430, 1210))
    middle = crop_alpha(legs_antennas, (430, 730, 860, 1210))
    rear = crop_alpha(legs_antennas, (860, 730, 1254, 1210))
    antennas = crop_alpha(legs_antennas, (0, 0, 650, 430))
    save(front, "LEGS", "JOANINHA_LEGS_FRONT_IDLE.png")
    save(middle, "LEGS", "JOANINHA_LEGS_MIDDLE_IDLE.png")
    save(rear, "LEGS", "JOANINHA_LEGS_REAR_IDLE.png")
    save(antennas, "ANTENNAS", "JOANINHA_ANTENNAS_IDLE.png")
    save(transform_layer(antennas, (315, 365), angle=3, translate=(0, -2)), "ANTENNAS", "JOANINHA_ANTENNAS_SOFT_A.png")
    save(transform_layer(antennas, (315, 365), angle=-3, translate=(0, 2)), "ANTENNAS", "JOANINHA_ANTENNAS_SOFT_B.png")

    steps = [
        ("JOANINHA_LEGS_STEP_A.png", [transform_layer(front, (230, 858), angle=-8, translate=(-8, 0)), middle, transform_layer(rear, (980, 910), angle=7, translate=(8, 0))]),
        ("JOANINHA_LEGS_STEP_B.png", [front, transform_layer(middle, (625, 940), angle=5, translate=(0, -3)), rear]),
        ("JOANINHA_LEGS_STEP_C.png", [transform_layer(front, (230, 858), angle=8, translate=(8, 0)), middle, transform_layer(rear, (980, 910), angle=-7, translate=(-8, 0))]),
    ]
    for filename, layers in steps:
        step = blank()
        for layer in layers:
            paste(step, layer)
        save(step, "LEGS", filename)

    blink = blank()
    d = ImageDraw.Draw(blink)
    d.arc((115, 475, 315, 615), start=200, end=340, fill=(24, 19, 16, 255), width=14)
    d.arc((375, 458, 590, 610), start=200, end=340, fill=(24, 19, 16, 255), width=14)
    save(crop_alpha(protected, (75, 405, 625, 700)), "EYES", "JOANINHA_EYES_OPEN_PROTECTED.png")
    save(blink, "EYES", "JOANINHA_EYES_BLINK_OVERLAY.png")

    save(make_shadow(1.0, 1014, 72), "SHADOW", "JOANINHA_SHADOW.png")
    save(make_shadow(0.72, 1040, 46), "SHADOW", "JOANINHA_SHADOW_FLIGHT_SOFT.png")
    save(guide(master), "GUIDE", "JOANINHA_ANIMATION_GUIDE.png")

    (OUT / "README.md").write_text(
        "# RS-ATELIE-BIA-JARDIM-ASSET-006\n\n"
        "Kit tecnico de animacao da Joaninha para homologacao visual. Todos os PNGs usam canvas 1254x1254, origem preservada e fundo transparente.\n\n"
        "## Regra central\n\n"
        "As camadas pintaveis da crianca devem ser tratadas como textura independente. O movimento deve transformar essas camadas sem trocar a Joaninha por uma imagem pronta.\n\n"
        "## Pastas\n\n"
        "- IDLE: pose base oficial e referencia Golden Master.\n"
        "- WINGS: estados de asas half/open, asas internas protegidas e texturas externas transformaveis.\n"
        "- LEGS: recortes e tres passos tecnicos para caminhada.\n"
        "- ANTENNAS: antenas neutras e variacoes suaves.\n"
        "- EYES: olhos protegidos e overlay de piscada.\n"
        "- SHADOW: sombras independentes para solo e voo.\n"
        "- GUIDE: mapa visual dos pivots principais.\n\n"
        "## Teste conceitual\n\n"
        "Uma pintura com cabeca rosa, corpo azul, asas amarelas com tracos verdes, pintinhas roxas e pernas vermelhas permanece a mesma porque as partes coloridas sao preservadas em camadas e apenas transformadas geometricamente.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
