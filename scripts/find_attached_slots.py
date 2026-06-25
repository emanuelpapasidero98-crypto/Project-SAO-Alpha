#!/usr/bin/env python3
"""
Find the value slots that are ATTACHED to the bar in [Blank] 2.png.
The user says the slots are on the RIGHT side, BELOW the narrower part
of each bar. They are part of the PNG itself.

Let me do a complete visualization with high resolution to find them.
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size
print(f"Image size: {w}x{h}")

# Full high-res ASCII visualization
print("\n=== HIGH RES ASCII visualization (80 cols x 30 rows) ===")
print("Legend: . = transparent, # = dark opaque, : = semi-transparent dark, ' ' = bright, G = green, ? = other opaque")
for ry in range(30):
    y = int((ry + 0.5) * h / 30)
    line = f"y={y:3d} ({y/h*100:5.1f}%): "
    for rx in range(80):
        x = int((rx + 0.5) * w / 80)
        r, g, b, a = img.getpixel((x, y))
        if a < 50:
            line += "."
        elif 50 <= a < 200:
            brightness = (r + g + b) / 3
            if brightness < 100:
                line += ":"
            else:
                line += "-"
        else:
            brightness = (r + g + b) / 3
            if brightness < 80:
                line += "#"
            elif brightness > 200:
                line += " "
            elif g > 100 and g > r + 30 and g > b + 30:
                line += "G"
            else:
                line += "?"
    print(line)

# Find ALL connected regions of dark semi-transparent pixels
# These should be the value slots
print("\n=== Connected regions of semi-transparent dark pixels (the slots) ===")
import numpy as np
from scipy import ndimage

# Build a binary mask of slot pixels (semi-transparent + dark)
mask = np.zeros((h, w), dtype=bool)
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200 and (r+g+b)/3 < 100:
            mask[y, x] = True

# Label connected regions
labeled, num_features = ndimage.label(mask)
print(f"Found {num_features} connected regions of semi-transparent dark pixels")

# For each region, find bounding box
for i in range(1, num_features + 1):
    ys, xs = np.where(labeled == i)
    if len(xs) < 5:  # skip tiny regions
        continue
    x_min, x_max = xs.min(), xs.max()
    y_min, y_max = ys.min(), ys.max()
    print(f"  Region {i}: {len(xs)} pixels, x={x_min}-{x_max} ({x_min/w*100:.2f}%-{x_max/w*100:.2f}%), y={y_min}-{y_max} ({y_min/h*100:.2f}%-{y_max/h*100:.2f}%)")
    print(f"    Size: {x_max-x_min+1}x{y_max-y_min+1} px, Center: ({(x_min+x_max)/2/w*100:.2f}%, {(y_min+y_max)/2/h*100:.2f}%)")
