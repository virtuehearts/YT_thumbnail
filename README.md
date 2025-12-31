# YT_thumbnail

YT_thumbnail is an image editor focused on producing YouTube-ready thumbnails from an uploaded JPEG. The goal is to give creators a repeatable, automated way to generate high-contrast thumbnails that still feel custom: fonts, colors, text positions, panels, overlays, and layout can all be tuned.

## What it does

- Takes a **JPEG upload** as the base image.
- Automatically resizes and crops to **1280×720** (YouTube thumbnail size) while preserving key composition.
- Adds **headline text**, **subheadings**, **panel captions**, and **tags**.
- Supports **customizable** typography, colors, outline strokes, panel backgrounds, and positioning.
- Outputs a final **thumbnail PNG/JPEG** that is ready to publish.

## Why this exists

YouTube thumbnails need clarity, contrast, and bold typography. This project gives you a programmable pipeline so you can:

- Keep layout consistent across a series.
- Adjust styling without redoing design work.
- Rapidly prototype variations for A/B tests.

## Customization goals

The editor is designed to be customizable in the following areas:

- **Fonts**: headline, subtitle, body fonts (size, weight, and file path).
- **Text color and outline**: fill and stroke for legibility.
- **Panel positions**: left/right panels, margins, padding, and size.
- **Banner placement**: top, bottom, or full width.
- **Tags and labels**: per-side tags like “THEN”/“NOW”, decade labels, etc.
- **Divider and effects**: center divider glow, drop shadows, blur overlays.

These knobs allow a creator or team to establish a house style that stays consistent while still being easy to update.

## Example script

Below is an example script that illustrates the intended pipeline. It takes a JPEG, crops it to 1280×720, adds text banners, captions, and tags, and writes out a finished thumbnail.

```python
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

img_path = Path("/mnt/data/A_photograph_in_a_split-screen_composition_juxtapo.png")
img = Image.open(img_path).convert("RGBA")

# Resize/crop to YouTube thumbnail 1280x720 while keeping split center
target_w, target_h = 1280, 720
# Scale to cover
scale = max(target_w / img.width, target_h / img.height)
new_size = (int(img.width * scale), int(img.height * scale))
img_resized = img.resize(new_size, Image.LANCZOS)

# Center crop
left = (img_resized.width - target_w) // 2
top = (img_resized.height - target_h) // 2
img_cropped = img_resized.crop((left, top, left + target_w, top + target_h))

base = img_cropped.copy()
draw = ImageDraw.Draw(base)

# Fonts
def load_font(size, bold=True):
    # DejaVu fonts are typically available
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, size=size)
        except Exception:
            continue
    return ImageFont.load_default()

title_font = load_font(72, bold=True)
sub_font = load_font(40, bold=True)
body_font = load_font(34, bold=True)

# Helper: outlined text
def draw_outlined_text(d, pos, text, font, fill=(255,255,255,255), outline=(0,0,0,255), stroke=6, align="left"):
    x, y = pos
    d.text((x, y), text, font=font, fill=fill, stroke_width=stroke, stroke_fill=outline, align=align)

# Title banner
title = "SAME MONEY. SAME JUNK."
tw, th = draw.textbbox((0,0), title, font=title_font)[2:]
pad = 18
banner_h = th + pad*2
banner = Image.new("RGBA", (target_w, banner_h), (0,0,0,150))
base.alpha_composite(banner, (0, 0))
draw = ImageDraw.Draw(base)
draw_outlined_text(draw, (target_w//2 - tw//2, pad-2), title, title_font, stroke=8, align="center")

# Split captions
left_caption_1 = "$60/month for channels\nyou don’t watch."
left_caption_2 = "Paying monthly for\njunk food + junk TV."

right_caption_1 = "$60/month for prompts\nyou don’t remember."
right_caption_2 = "Paying monthly for\njunk dopamine + junk outputs."

# Panels with semi-transparent boxes
box_pad = 18
mid = target_w // 2
panel_w = target_w // 2 - 40
panel_h = 220

# Positions (bottom area)
y_start = target_h - panel_h - 30
left_x = 20
right_x = mid + 20

def add_panel(x, y, w, h):
    panel = Image.new("RGBA", (w, h), (0,0,0,155))
    # subtle blur shadow
    shadow = panel.filter(ImageFilter.GaussianBlur(6))
    base.alpha_composite(shadow, (x+6, y+6))
    base.alpha_composite(panel, (x, y))

add_panel(left_x, y_start, panel_w, panel_h)
add_panel(right_x, y_start, panel_w, panel_h)

draw = ImageDraw.Draw(base)

# Text layout in panels
def panel_text(x, y, cap1, cap2):
    # cap1 big, cap2 smaller
    draw_outlined_text(draw, (x + box_pad, y + 18), cap1, sub_font, stroke=7)
    draw_outlined_text(draw, (x + box_pad, y + 120), cap2, body_font, stroke=6)

panel_text(left_x, y_start, left_caption_1, left_caption_2)
panel_text(right_x, y_start, right_caption_1, right_caption_2)

# Add "THEN" / "NOW" tags
tag_font = load_font(44, bold=True)
def tag(x, y, label):
    # colored tag
    tag_w, tag_h = draw.textbbox((0,0), label, font=tag_font)[2:]
    tag_box = Image.new("RGBA", (tag_w + 30, tag_h + 18), (255, 214, 0, 230))  # bright yellow
    base.alpha_composite(tag_box, (x, y))
    draw2 = ImageDraw.Draw(base)
    draw2.text((x+15, y+8), label, font=tag_font, fill=(0,0,0,255))

tag(30, banner_h + 18, "1990s")
tag(mid + 30, banner_h + 18, "NOW")

# Add subtle center divider glow
divider = Image.new("RGBA", (8, target_h), (255,255,255,120))
divider = divider.filter(ImageFilter.GaussianBlur(2))
base.alpha_composite(divider, (mid-4, 0))

# Save
out_path = Path("/mnt/data/couch_potato_thumbnail_youtube_style.png")
base.convert("RGB").save(out_path, quality=95)

out_path
```

Result:

```
PosixPath('/mnt/data/couch_potato_thumbnail_youtube_style.png')
```

## Next steps

- Add a UI for uploading JPEGs and configuring layout.
- Persist style presets for repeated use.
- Offer template variations for different content types.
