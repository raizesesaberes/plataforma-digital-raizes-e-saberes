from pathlib import Path
from PIL import Image


SOURCE_DIR = Path("assets/atividades-imprimiveis/educacao-infantil/ei2/originais")
TARGET_DIR = Path("assets/atividades-imprimiveis/educacao-infantil/ei2/a4")
A4_LANDSCAPE_300_DPI = (3508, 2480)


def main():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    for source in sorted(SOURCE_DIR.glob("RS-EI2-ATI-*.png")):
        with Image.open(source) as image:
            image = image.convert("RGBA")
            canvas = Image.new("RGBA", A4_LANDSCAPE_300_DPI, (255, 255, 255, 255))
            ratio = min(A4_LANDSCAPE_300_DPI[0] / image.width, A4_LANDSCAPE_300_DPI[1] / image.height)
            size = (round(image.width * ratio), round(image.height * ratio))
            resized = image.resize(size, Image.Resampling.LANCZOS)
            offset = ((A4_LANDSCAPE_300_DPI[0] - size[0]) // 2, (A4_LANDSCAPE_300_DPI[1] - size[1]) // 2)
            canvas.alpha_composite(resized, offset)
            canvas.convert("RGB").save(TARGET_DIR / source.name, "PNG", dpi=(300, 300), optimize=True)


if __name__ == "__main__":
    main()
