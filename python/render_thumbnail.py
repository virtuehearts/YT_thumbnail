import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont


PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}")


@dataclass
class CanvasSpec:
    width: int
    height: int


class TemplateError(ValueError):
    pass


def read_json(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise TemplateError(f"Invalid JSON in {path}: {exc}") from exc
    except FileNotFoundError as exc:
        raise TemplateError(f"Missing JSON file: {path}") from exc


def resolve_color(color: str, opacity: float | None = None) -> Tuple[int, int, int, int]:
    if not isinstance(color, str) or not color.startswith("#"):
        raise TemplateError(f"Color must be hex string like #RRGGBB: {color}")
    hex_value = color.lstrip("#")
    if len(hex_value) != 6:
        raise TemplateError(f"Color must be 6-digit hex: {color}")
    r = int(hex_value[0:2], 16)
    g = int(hex_value[2:4], 16)
    b = int(hex_value[4:6], 16)
    alpha = 255
    if opacity is not None:
        alpha = int(max(0, min(1, opacity)) * 255)
    return (r, g, b, alpha)


def substitute_vars(text: str, variables: Dict[str, Any]) -> str:
    def replacer(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in variables:
            raise TemplateError(f"Missing variable '{key}' for text '{text}'")
        return str(variables[key])

    return PLACEHOLDER_RE.sub(replacer, text)


def load_font(font_path: str, size: int) -> ImageFont.FreeTypeFont:
    path = Path(font_path)
    if not path.exists():
        raise TemplateError(f"Font not found: {font_path}")
    try:
        return ImageFont.truetype(str(path), size=size)
    except Exception as exc:
        raise TemplateError(f"Unable to load font {font_path}: {exc}") from exc


def anchor_point(anchor: str, canvas: CanvasSpec) -> Tuple[int, int]:
    anchors = {
        "top_left": (0, 0),
        "top_center": (canvas.width // 2, 0),
        "top_right": (canvas.width, 0),
        "center_left": (0, canvas.height // 2),
        "center": (canvas.width // 2, canvas.height // 2),
        "center_right": (canvas.width, canvas.height // 2),
        "bottom_left": (0, canvas.height),
        "bottom_center": (canvas.width // 2, canvas.height),
        "bottom_right": (canvas.width, canvas.height),
    }
    if anchor not in anchors:
        raise TemplateError(f"Unknown anchor '{anchor}'")
    return anchors[anchor]


def position_from_anchor(anchor: str, position: Dict[str, int], canvas: CanvasSpec) -> Tuple[int, int]:
    base_x, base_y = anchor_point(anchor, canvas)
    x = base_x + int(position.get("x", 0))
    y = base_y + int(position.get("y", 0))
    return x, y


def cover_crop(image: Image.Image, canvas: CanvasSpec, anchor: str) -> Image.Image:
    scale = max(canvas.width / image.width, canvas.height / image.height)
    new_size = (int(image.width * scale), int(image.height * scale))
    resized = image.resize(new_size, Image.LANCZOS)
    if anchor == "center":
        left = (resized.width - canvas.width) // 2
        top = (resized.height - canvas.height) // 2
    else:
        left = (resized.width - canvas.width) // 2
        top = (resized.height - canvas.height) // 2
    return resized.crop((left, top, left + canvas.width, top + canvas.height))


def apply_panel(base: Image.Image, layer: Dict[str, Any], canvas: CanvasSpec) -> None:
    position = position_from_anchor(layer.get("anchor", "top_left"), layer.get("position", {}), canvas)
    size = layer.get("size")
    if not size:
        raise TemplateError(f"Panel layer '{layer.get('name')}' missing size")
    width = int(size.get("width"))
    height = int(size.get("height"))
    fill = layer.get("fill", {})
    color = resolve_color(fill.get("color", "#000000"), fill.get("opacity", 1.0))

    panel = Image.new("RGBA", (width, height), color)

    shadow = layer.get("shadow")
    if shadow:
        shadow_color = resolve_color(shadow.get("color", "#000000"), shadow.get("opacity", 0.5))
        shadow_img = Image.new("RGBA", (width, height), shadow_color)
        blur = int(shadow.get("blur", 0))
        if blur > 0:
            shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(blur))
        offset = shadow.get("offset", {"x": 0, "y": 0})
        base.alpha_composite(shadow_img, (position[0] + int(offset.get("x", 0)), position[1] + int(offset.get("y", 0))))

    base.alpha_composite(panel, position)


def text_bbox(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, spacing: int) -> Tuple[int, int, int, int]:
    return draw.multiline_textbbox((0, 0), text, font=font, spacing=spacing)


def apply_text(base: Image.Image, layer: Dict[str, Any], canvas: CanvasSpec, variables: Dict[str, Any]) -> None:
    raw_text = layer.get("text", "")
    text = substitute_vars(raw_text, variables)
    font_spec = layer.get("font")
    if not font_spec:
        raise TemplateError(f"Text layer '{layer.get('name')}' missing font")
    font = load_font(font_spec.get("path"), int(font_spec.get("size")))

    align = layer.get("align", "left")
    spacing = int(layer.get("line_spacing", 0))
    padding = layer.get("padding", {"x": 0, "y": 0})

    draw = ImageDraw.Draw(base)
    bbox = text_bbox(draw, text, font, spacing)
    text_width = bbox[2] - bbox[0]

    position = position_from_anchor(layer.get("anchor", "top_left"), layer.get("position", {}), canvas)
    x = position[0] + int(padding.get("x", 0))
    y = position[1] + int(padding.get("y", 0))

    if align == "center":
        x = x - text_width // 2
    elif align == "right":
        x = x - text_width

    fill = layer.get("fill", "#FFFFFF")
    stroke = layer.get("stroke", {})
    stroke_color = stroke.get("color", "#000000")
    stroke_width = int(stroke.get("width", 0))

    shadow = layer.get("shadow")
    if shadow:
        shadow_color = resolve_color(shadow.get("color", "#000000"), shadow.get("opacity", 0.5))
        shadow_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow_layer)
        shadow_draw.multiline_text((x, y), text, font=font, fill=shadow_color, spacing=spacing, align=align)
        blur = int(shadow.get("blur", 0))
        if blur > 0:
            shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(blur))
        offset = shadow.get("offset", {"x": 0, "y": 0})
        base.alpha_composite(shadow_layer, (int(offset.get("x", 0)), int(offset.get("y", 0))))

    draw.multiline_text(
        (x, y),
        text,
        font=font,
        fill=fill,
        spacing=spacing,
        align=align,
        stroke_width=stroke_width,
        stroke_fill=stroke_color,
    )


def apply_overlay(base: Image.Image, layer: Dict[str, Any], canvas: CanvasSpec) -> None:
    path = layer.get("path")
    if not path:
        raise TemplateError(f"Overlay layer '{layer.get('name')}' missing path")
    overlay_path = Path(path)
    if not overlay_path.exists():
        raise TemplateError(f"Overlay not found: {path}")
    overlay = Image.open(overlay_path).convert("RGBA")
    size = layer.get("size")
    if size:
        overlay = overlay.resize((int(size.get("width")), int(size.get("height"))), Image.LANCZOS)

    opacity = float(layer.get("opacity", 1.0))
    if opacity < 1.0:
        alpha = overlay.getchannel("A")
        alpha = alpha.point(lambda p: int(p * opacity))
        overlay.putalpha(alpha)

    position = position_from_anchor(layer.get("anchor", "top_left"), layer.get("position", {}), canvas)
    base.alpha_composite(overlay, position)


def apply_divider(base: Image.Image, layer: Dict[str, Any], canvas: CanvasSpec) -> None:
    width = int(layer.get("width", 4))
    position_x = int(layer.get("position", canvas.width // 2))
    color = resolve_color(layer.get("color", "#FFFFFF"), layer.get("opacity", 1.0))
    divider = Image.new("RGBA", (width, canvas.height), color)
    blur = int(layer.get("blur", 0))
    if blur > 0:
        divider = divider.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(divider, (position_x - width // 2, 0))


def validate_template(template: Dict[str, Any]) -> CanvasSpec:
    if "canvas" not in template:
        raise TemplateError("Template missing canvas")
    canvas = template["canvas"]
    try:
        width = int(canvas["width"])
        height = int(canvas["height"])
    except Exception as exc:
        raise TemplateError("Canvas width/height must be integers") from exc
    if width <= 0 or height <= 0:
        raise TemplateError("Canvas width/height must be positive")
    if "layers" not in template or not isinstance(template["layers"], list):
        raise TemplateError("Template missing layers list")
    return CanvasSpec(width=width, height=height)


def render_thumbnail(input_path: Path, template_path: Path, vars_path: Path, output_path: Path) -> None:
    template = read_json(template_path)
    variables = read_json(vars_path)
    canvas = validate_template(template)

    if not input_path.exists():
        raise TemplateError(f"Input image not found: {input_path}")

    image = Image.open(input_path).convert("RGBA")
    crop = template.get("crop", {"strategy": "cover", "anchor": "center"})
    if crop.get("strategy") != "cover":
        raise TemplateError("Only crop strategy 'cover' is supported")

    base = cover_crop(image, canvas, crop.get("anchor", "center"))

    for layer in template["layers"]:
        layer_type = layer.get("type")
        if layer_type == "panel":
            apply_panel(base, layer, canvas)
        elif layer_type == "text":
            apply_text(base, layer, canvas, variables)
        elif layer_type == "overlay":
            apply_overlay(base, layer, canvas)
        elif layer_type == "divider":
            apply_divider(base, layer, canvas)
        else:
            raise TemplateError(f"Unknown layer type '{layer_type}'")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() in {".jpg", ".jpeg"}:
        base.convert("RGB").save(output_path, quality=95)
    else:
        base.save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Render YouTube-style thumbnails locally.")
    parser.add_argument("--in", dest="input_path", required=True, help="Input JPG/PNG image")
    parser.add_argument("--template", required=True, help="Template JSON path")
    parser.add_argument("--vars", required=True, help="Vars JSON path")
    parser.add_argument("--out", required=True, help="Output PNG/JPG path")

    args = parser.parse_args()
    try:
        render_thumbnail(
            Path(args.input_path),
            Path(args.template),
            Path(args.vars),
            Path(args.out),
        )
    except TemplateError as exc:
        raise SystemExit(f"Error: {exc}") from exc


if __name__ == "__main__":
    main()
