#!/usr/bin/env python3
"""
Generate Milomatic PWA icons.

Pure dev-time tool (the app itself ships no Python and no dependencies at
runtime). Re-run this whenever the icon design changes, then bump the service
worker cache version so clients pick up the new files.

Usage:
    python3 icons/generate-icons.py

Requires Pillow:
    python3 -m pip install Pillow
"""

import math
import os

from PIL import Image, ImageDraw

# App palette (matches index.html :root variables)
BG = (12, 17, 27, 255)        # --bg  #0c111b
CARD = (21, 28, 39, 255)      # --card #151c27
PRIMARY = (217, 119, 6, 255)  # --primary #d97706
LIGHT = (229, 231, 235, 255)  # --text #e5e7eb
MUTED = (156, 163, 175, 255)  # --muted #9ca3af

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
SS = 4  # supersample factor for antialiasing


def draw_speedometer(size, *, maskable=False):
    """Render a speedometer-gauge icon at the given size (px)."""
    work = size * SS
    img = Image.new("RGBA", (work, work), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Background plate.
    if maskable:
        # Maskable icons are full-bleed; the platform applies its own mask.
        d.rectangle([0, 0, work, work], fill=BG)
        pad = int(work * 0.18)  # keep content inside the safe zone
    else:
        radius = int(work * 0.22)
        d.rounded_rectangle([0, 0, work - 1, work - 1], radius=radius, fill=CARD)
        pad = int(work * 0.14)

    cx = work / 2
    cy = work / 2 + work * 0.04  # nudge gauge down a touch for needle balance
    r = (work / 2) - pad
    stroke = max(2, int(work * 0.055))

    box = [cx - r, cy - r, cx + r, cy + r]

    # Dial track (muted) then the active sweep (primary), open at the bottom.
    d.arc(box, start=135, end=405, fill=MUTED, width=stroke)
    d.arc(box, start=135, end=315, fill=PRIMARY, width=stroke)

    # Tick marks around the dial.
    tick_outer = r - stroke * 0.2
    tick_inner = r - stroke * 1.6
    for deg in range(135, 406, 27):
        a = math.radians(deg)
        x1 = cx + tick_outer * math.cos(a)
        y1 = cy + tick_outer * math.sin(a)
        x2 = cx + tick_inner * math.cos(a)
        y2 = cy + tick_inner * math.sin(a)
        d.line([x1, y1, x2, y2], fill=LIGHT, width=max(1, int(work * 0.012)))

    # Needle pointing to the upper-right (~75% of the sweep).
    needle_deg = 315
    a = math.radians(needle_deg)
    nx = cx + (r - stroke * 0.4) * math.cos(a)
    ny = cy + (r - stroke * 0.4) * math.sin(a)
    d.line([cx, cy, nx, ny], fill=LIGHT, width=max(2, int(work * 0.03)))

    # Center hub.
    hub = max(3, int(work * 0.05))
    d.ellipse([cx - hub, cy - hub, cx + hub, cy + hub], fill=PRIMARY)

    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    path = os.path.join(OUT_DIR, name)
    img.save(path, "PNG")
    print(f"wrote {os.path.relpath(path)}")


def main():
    save(draw_speedometer(192), "icon-192.png")
    save(draw_speedometer(512), "icon-512.png")
    save(draw_speedometer(512, maskable=True), "icon-maskable-512.png")

    # apple-touch-icon: iOS applies its own rounding and dislikes alpha, so
    # flatten onto an opaque background at 180x180.
    apple = Image.new("RGBA", (180, 180), BG)
    apple.alpha_composite(draw_speedometer(180))
    save(apple.convert("RGB"), "apple-touch-icon.png")


if __name__ == "__main__":
    main()
