#!/usr/bin/env python3
"""
The user says the [Blank] 2.png ALREADY contains a semi-transparent box with
a "/" symbol on the RIGHT side, BELOW the narrow part of the bar. Let me
find the EXACT location of this box and the "/" symbol.

The bar PNG is 1620x258. Earlier analysis showed:
  - Bar top part (y=23%-38%): wide, extends to x=93%
  - Bar bottom part (y=38%-51%): NARROW, extends only to x=58%
  - Below y=51%: empty space

But the user says there's a semi-transparent box with "/" BELOW the narrow
part. Let me look more carefully — maybe the box is in a region I missed.
"""
from PIL import Image
from collections import defaultdict

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size
print(f"Image size: {w}x{h}")

# Scan ALL pixels in the lower-right region (x > 50%, y > 30%)
# to find the semi-transparent box with "/"
print("\n=== ALL pixels in region x > 50%, y > 30% (any transparency) ===")
print("Looking for the [ / ] box...")

# Find ALL semi-transparent pixels (alpha 30-200) in the entire image
print("\n=== ALL semi-transparent regions (alpha 30-200) ===")
semi_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200:
            semi_pixels.append((x, y, r, g, b, a))

print(f"Total semi-transparent pixels: {len(semi_pixels)}")

# Group by alpha
alpha_groups = defaultdict(list)
for x, y, r, g, b, a in semi_pixels:
    alpha_groups[a].append((x, y, r, g, b))

# For each alpha, show the bounding box
print(f"\n{'alpha':>6} | {'count':>6} | {'x_range':>25} | {'y_range':>20}")
print("-" * 80)
for a in sorted(alpha_groups.keys()):
    pixels = alpha_groups[a]
    xs = [p[0] for p in pixels]
    ys = [p[1] for p in pixels]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    print(f"{a:6d} | {len(pixels):6d} | {x_min:4d}-{x_max:4d} ({x_min/w*100:5.1f}%-{x_max/w*100:5.1f}%) | {y_min:4d}-{y_max:4d} ({y_min/h*100:5.1f}%-{y_max/h*100:5.1f}%)")

# Look for the [ / ] box specifically — it would be a rectangular region
# with consistent dark semi-transparent pixels in the lower-right
print("\n=== Looking for dark semi-transparent box in lower-right (x>50%, y>30%) ===")
lower_right_dark = []
for y in range(int(h * 0.3), h):
    for x in range(int(w * 0.5), w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200 and (r+g+b)/3 < 100:
            lower_right_dark.append((x, y, r, g, b, a))

if lower_right_dark:
    print(f"Found {len(lower_right_dark)} dark semi-transparent pixels in lower-right")
    xs = [p[0] for p in lower_right_dark]
    ys = [p[1] for p in lower_right_dark]
    print(f"  X: {min(xs)}-{max(xs)} ({min(xs)/w*100:.2f}%-{max(xs)/w*100:.2f}%)")
    print(f"  Y: {min(ys)}-{max(ys)} ({min(ys)/h*100:.2f}%-{max(ys)/h*100:.2f}%)")
else:
    print("NO dark semi-transparent pixels in lower-right region")

# Maybe the box is semi-transparent but BRIGHT (not dark)
# Let me check for any semi-transparent pixel with high brightness
print("\n=== Looking for BRIGHT semi-transparent box in lower-right ===")
lower_right_bright = []
for y in range(int(h * 0.3), h):
    for x in range(int(w * 0.5), w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200 and (r+g+b)/3 > 200:
            lower_right_bright.append((x, y, r, g, b, a))

if lower_right_bright:
    print(f"Found {len(lower_right_bright)} bright semi-transparent pixels in lower-right")
    xs = [p[0] for p in lower_right_bright]
    ys = [p[1] for p in lower_right_bright]
    print(f"  X: {min(xs)}-{max(xs)} ({min(xs)/w*100:.2f}%-{max(xs)/w*100:.2f}%)")
    print(f"  Y: {min(ys)}-{max(ys)} ({min(ys)/h*100:.2f}%-{max(ys)/h*100:.2f}%)")

# Detailed ASCII viz of just the lower-right region (x>50%, y>30%)
print("\n=== ASCII viz of lower-right region (x>50%, y>30%) — 60 cols x 20 rows ===")
print("Legend: . = transparent, : = semi-transparent dark, - = semi-transparent bright, ' ' = bright opaque, # = dark opaque, G = green")
for ry in range(20):
    y = int(h * 0.3 + (ry + 0.5) * h * 0.7 / 20)
    line = f"y={y:3d} ({y/h*100:5.1f}%): "
    for rx in range(60):
        x = int(w * 0.5 + (rx + 0.5) * w * 0.5 / 60)
        if x >= w:
            break
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
