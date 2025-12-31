from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OVERLAYS = ASSETS / "overlays"
TEMPLATES = ASSETS / "templates"


def make_base_image(path: Path) -> None:
    base = Image.new("RGB", (1920, 1080))
    for y in range(base.height):
        r = int(20 + (120 * y / base.height))
        g = int(80 + (80 * y / base.height))
        b = int(140 + (80 * y / base.height))
        for x in range(base.width):
            base.putpixel((x, y), (r, g, b))

    overlay = Image.new("RGB", (base.width // 2, base.height), (30, 30, 30))
    base.paste(overlay, (0, 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    base.save(path, quality=92)


def make_arrow(path: Path) -> None:
    arrow = Image.new("RGBA", (300, 160), (0, 0, 0, 0))
    draw = ImageDraw.Draw(arrow)
    points = [(0, 80), (200, 80), (200, 30), (300, 80), (200, 130), (200, 80)]
    draw.polygon(points, fill=(255, 60, 60, 230))
    path.parent.mkdir(parents=True, exist_ok=True)
    arrow.save(path)


def make_logo(path: Path) -> None:
    logo = Image.new("RGBA", (240, 240), (0, 0, 0, 0))
    draw = ImageDraw.Draw(logo)
    draw.ellipse((10, 10, 230, 230), fill=(20, 200, 255, 230))
    inner = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
    draw_inner = ImageDraw.Draw(inner)
    draw_inner.ellipse((0, 0, 140, 140), fill=(0, 40, 80, 255))
    logo.alpha_composite(inner, (50, 50))
    path.parent.mkdir(parents=True, exist_ok=True)
    logo.save(path)


def main() -> None:
    make_base_image(TEMPLATES / "sample_base.jpg")
    make_arrow(OVERLAYS / "arrow_red.png")
    make_logo(OVERLAYS / "logo_blue.png")


if __name__ == "__main__":
    main()
