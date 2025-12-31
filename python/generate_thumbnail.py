import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

TARGET_W = 1280
TARGET_H = 720


def load_font(size, bold=True):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except Exception:
            continue
    return ImageFont.load_default()


def parse_hex_color(value, alpha=255):
    if not value:
        return (255, 0, 0, alpha)
    value = value.strip().lstrip("#")
    if len(value) == 6:
        r = int(value[0:2], 16)
        g = int(value[2:4], 16)
        b = int(value[4:6], 16)
        return (r, g, b, alpha)
    return (255, 0, 0, alpha)


def scale_crop(image):
    scale = max(TARGET_W / image.width, TARGET_H / image.height)
    new_size = (int(image.width * scale), int(image.height * scale))
    resized = image.resize(new_size, Image.LANCZOS)
    left = (resized.width - TARGET_W) // 2
    top = (resized.height - TARGET_H) // 2
    return resized.crop((left, top, left + TARGET_W, top + TARGET_H))


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        width = draw.textbbox((0, 0), test, font=font)[2]
        if width <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines)


def draw_outlined_text(draw, pos, text, font, fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), stroke=6, align="left"):
    x, y = pos
    draw.text((x, y), text, font=font, fill=fill, stroke_width=stroke, stroke_fill=outline, align=align)


def main():
    payload = json.loads(sys.stdin.read())

    image_path = Path(payload.get("image_path"))
    output_path = Path(payload.get("output_path"))

    main_title = payload.get("main_title", "")
    left_caption = payload.get("left_caption", "")
    right_caption = payload.get("right_caption", "")
    primary_color = parse_hex_color(payload.get("primary_color"), alpha=210)

    base_font_size = payload.get("font_size") or 64
    title_font = load_font(int(base_font_size), bold=True)
    sub_font = load_font(int(base_font_size * 0.6), bold=True)

    img = Image.open(image_path).convert("RGBA")
    base = scale_crop(img).convert("RGBA")

    draw = ImageDraw.Draw(base)
    banner_height = int(base_font_size * 1.2)
    banner = Image.new("RGBA", (TARGET_W, banner_height + 24), primary_color)
    base.alpha_composite(banner, (0, 0))

    title_text = wrap_text(draw, main_title, title_font, TARGET_W - 80)
    tw, th = draw.textbbox((0, 0), title_text, font=title_font)[2:]
    title_x = (TARGET_W - tw) // 2
    draw_outlined_text(draw, (title_x, 12), title_text, title_font, stroke=8, align="center")

    panel_h = int(TARGET_H * 0.28)
    panel_w = TARGET_W // 2 - 50
    panel_y = TARGET_H - panel_h - 40
    left_x = 30
    right_x = TARGET_W // 2 + 20

    def add_panel(x, y, w, h):
        panel = Image.new("RGBA", (w, h), (0, 0, 0, 155))
        shadow = panel.filter(ImageFilter.GaussianBlur(6))
        base.alpha_composite(shadow, (x + 6, y + 6))
        base.alpha_composite(panel, (x, y))

    add_panel(left_x, panel_y, panel_w, panel_h)
    add_panel(right_x, panel_y, panel_w, panel_h)

    left_text = wrap_text(draw, left_caption, sub_font, panel_w - 40)
    right_text = wrap_text(draw, right_caption, sub_font, panel_w - 40)

    draw_outlined_text(draw, (left_x + 18, panel_y + 18), left_text, sub_font, stroke=7)
    draw_outlined_text(draw, (right_x + 18, panel_y + 18), right_text, sub_font, stroke=7)

    divider = Image.new("RGBA", (8, TARGET_H), (255, 255, 255, 120))
    divider = divider.filter(ImageFilter.GaussianBlur(2))
    base.alpha_composite(divider, (TARGET_W // 2 - 4, 0))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(output_path, quality=95)

    print(json.dumps({"output_path": str(output_path)}))


if __name__ == "__main__":
    main()
