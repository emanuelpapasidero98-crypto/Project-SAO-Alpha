#!/usr/bin/env python3
"""
Find the EXACT location of the value slot inside [Blank] 2.png.
The slot is a small semi-transparent dark region. We need its precise
bounding box to position the values text exactly over it.
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size
print(f"Image size: {w}x{h}")

# Find ALL semi-transparent dark pixels (the slot)
slot_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        # Semi-transparent (alpha 30-200) AND dark (brightness < 100)
        if 30 < a < 200:
            brightness = (r + g + b) / 3
            if brightness < 100:
                slot_pixels.append((x, y))

print(f"\nFound {len(slot_pixels)} semi-transparent dark pixels")

if slot_pixels:
    xs = [p[0] for p in slot_pixels]
    ys = [p[1] for p in slot_pixels]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)

    print(f"\nSlot bounding box:")
    print(f"  X: {x_min}-{x_max} (width {x_max-x_min+1}px)")
    print(f"  Y: {y_min}-{y_max} (height {y_max-y_min+1}px)")
    print(f"  X as % of width: {x_min/w*100:.2f}% - {x_max/w*100:.2f}%")
    print(f"  Y as % of height: {y_min/h*100:.2f}% - {y_max/h*100:.2f}%")
    print(f"  Center X: {(x_min+x_max)/2/w*100:.2f}%")
    print(f"  Center Y: {(y_min+y_max)/2/h*100:.2f}%")

# Also find ALL distinct semi-transparent regions (any brightness, but
# specifically dark ones with low alpha) — the LV slot might be elsewhere
print("\n=== All semi-transparent regions grouped by alpha value ===")
from collections import defaultdict
alpha_regions = defaultdict(list)
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200:
            alpha_regions[a].append((x, y, r, g, b))

# For each alpha, find the bounding box
print("Alpha -> bounding box (only for dark pixels, brightness < 100):")
for a in sorted(alpha_regions.keys()):
    pixels = [(x, y, r, g, b) for x, y, r, g, b in alpha_regions[a] if (r+g+b)/3 < 100]
    if len(pixels) > 10:
        xs = [p[0] for p in pixels]
        ys = [p[1] for p in pixels]
        print(f"  alpha={a:3d}: {len(pixels):4d} dark pixels, x={min(xs)}-{max(xs)} ({min(xs)/w*100:.1f}%-{max(xs)/w*100:.1f}%), y={min(ys)}-{max(ys)} ({min(ys)/h*100:.1f}%-{max(ys)/h*100:.1f}%)")

# Visualize the bar with the slot highlighted
print("\n=== ASCII visualization of the bar (60 cols x 15 rows) ===")
print("Legend: . = transparent, # = dark opaque, : = semi-transparent dark, ' ' = bright")
for ry in range(15):
    y = int((ry + 0.5) * h / 15)
    line = f"y={y:3d}: "
    for rx in range(60):
        x = int((rx + 0.5) * w / 60)
        r, g, b, a = img.getpixel((x, y))
        if a < 50:
            line += "."
        elif 50 <= a < 200:
            brightness = (r + g + b) / 3
            if brightness < 100:
                line += ":"
            else:
                line += "-"
        else:  # opaque
            brightness = (r + g + b) / 3
            if brightness < 100:
                line += "#"
            elif brightness > 200:
                line += " "
            else:
                line += "+"
    print(line)
