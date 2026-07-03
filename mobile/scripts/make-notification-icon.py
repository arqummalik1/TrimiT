#!/usr/bin/env python3
"""
Generate a proper Android notification (status-bar) icon from the logo mark.

Android small-icon rules:
  • Only the ALPHA channel is used — every opaque pixel is drawn WHITE and
    tinted by the notification accent color. RGB is ignored.
  • It must be a transparent-background silhouette with padding, or Android
    shows a filled white square (the classic bug).

We therefore: trim the logo to its content, scale it into a padded 96x96
canvas, and force every visible pixel to solid white (alpha preserved).
"""
from PIL import Image

SRC = "assets/logo.png"
OUT = "assets/notification-icon.png"
CANVAS = 96          # dp-independent base size; Expo generates densities from this
CONTENT = 66         # logo fits inside this box → ~15px padding all around

src = Image.open(SRC).convert("RGBA")

# Trim to the non-transparent bounding box so padding is even.
alpha = src.split()[3]
bbox = alpha.getbbox()
if bbox:
    src = src.crop(bbox)

# Scale into the content box, preserving aspect ratio.
w, h = src.size
scale = min(CONTENT / w, CONTENT / h)
new_size = (max(1, round(w * scale)), max(1, round(h * scale)))
src = src.resize(new_size, Image.LANCZOS)

# Force every visible pixel to solid white; keep the original alpha silhouette.
r, g, b, a = src.split()
white = Image.merge("RGBA", (
    a.point(lambda _: 255),
    a.point(lambda _: 255),
    a.point(lambda _: 255),
    a,
))

canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
offset = ((CANVAS - new_size[0]) // 2, (CANVAS - new_size[1]) // 2)
canvas.paste(white, offset, white)
canvas.save(OUT)
print(f"wrote {OUT} ({CANVAS}x{CANVAS}, white silhouette, transparent bg)")
