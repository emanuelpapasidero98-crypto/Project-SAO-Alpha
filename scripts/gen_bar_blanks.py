#!/usr/bin/env python3
"""
Generate MP (blue) and Energy (yellow) versions of the canonical SAO HP bar
by recoloring the green pixels in [Blank] 2.png.

The original HP bar has a green gradient:
  (106, 174, 28) → (135, 213, 41)  (top to bottom of the fill)

We want:
  - MP blue:    (43, 115, 179) range → recolor green→blue
  - Energy yellow: (235, 166, 1) range → recolor green→yellow

Approach: HSL hue rotation.
  Green hue ≈ 90°
  Blue hue  ≈ 210°  → rotate by +120°
  Yellow hue ≈ 45°  → rotate by -45°

We only recolor pixels that are "green enough" (high G, low R, low B).
The dark border (#373737) and white/transparent pixels are preserved.
"""
from PIL import Image
import colorsys

SRC = '/home/z/my-project/public/sao/hpbar/[Blank] 2.png'

def is_green_pixel(r, g, b):
    """Detect green SAO bar pixels (high G, lower R and B)."""
    return g > 100 and g > r + 30 and g > b + 30

def recolor_hue(r, g, b, target_hue_deg):
    """Recolor a pixel to the target hue, preserving S and L."""
    h, s, l = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    target_h = target_hue_deg / 360.0
    nr, ng, nb = colorsys.hls_to_rgb(target_h, l, s)
    return (int(nr * 255), int(ng * 255), int(nb * 255))

# Generate MP (blue, hue ~210°)
img = Image.open(SRC).convert('RGBA')
pixels = img.load()
w, h = img.size
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a > 0 and is_green_pixel(r, g, b):
            nr, ng, nb = recolor_hue(r, g, b, 210)
            pixels[x, y] = (nr, ng, nb, a)
img.save('/home/z/my-project/public/sao/hpbar/blank-mp.png')
print('Generated blank-mp.png (blue)')

# Generate Energy (yellow, hue ~48°)
img = Image.open(SRC).convert('RGBA')
pixels = img.load()
w, h = img.size
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a > 0 and is_green_pixel(r, g, b):
            nr, ng, nb = recolor_hue(r, g, b, 48)
            pixels[x, y] = (nr, ng, nb, a)
img.save('/home/z/my-project/public/sao/hpbar/blank-energy.png')
print('Generated blank-energy.png (yellow)')

# Also copy the original as blank-hp.png for naming consistency
import shutil
shutil.copy(SRC, '/home/z/my-project/public/sao/hpbar/blank-hp.png')
print('Copied blank-hp.png (green, original)')
