from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from python.make_sample_assets import main as make_sample_assets
from python.render_thumbnail import render_thumbnail

BASE = ROOT / "assets/templates/sample_base.jpg"
OUT_DIR = ROOT / "out"


def ensure_sample_assets() -> None:
    if not BASE.exists() or not (ROOT / "assets/overlays/arrow_red.png").exists() or not (ROOT / "assets/overlays/logo_blue.png").exists():
        make_sample_assets()


def main() -> None:
    ensure_sample_assets()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    render_thumbnail(
        BASE,
        ROOT / "assets/templates/split_screen_classic.json",
        ROOT / "assets/templates/vars_split_screen_classic.json",
        OUT_DIR / "split_screen_classic.png",
    )
    render_thumbnail(
        BASE,
        ROOT / "assets/templates/vram_tax.json",
        ROOT / "assets/templates/vars_vram_tax.json",
        OUT_DIR / "vram_tax.png",
    )


if __name__ == "__main__":
    main()
