#!/usr/bin/env python3
"""
Detailed visualization of the value slot in [Blank] 2.png.
We zoom in on the slot region (x: 20-60%, y: 20-55%) to see its exact shape.
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size

# Zoom into the slot region
x_start = int(w * 0.18)
x_end = int(w * 0.62)
y_start = int(h * 0.18)
y_end = int(h * 0.55)

print(f"Slot region: x={x_start}-{x_end}, y={y_start}-{y_end}")
print(f"\nDetailed ASCII visualization (each char = 1 pixel sample):\n")
print("Legend: . = transparent, # = dark opaque, : = semi-transparent dark (slot), ' ' = bright/white, G = green fill")

# Sample every 3 pixels for better resolution
for y in range(y_start, y_end, 3):
    line = ""
    for x in range(x_start, x_end, 3):
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
            if brightness < 80:
                line += "#"
            elif brightness > 200:
                line += " "
            elif g > 100 and g > r + 30 and g > b + 30:
                line += "G"
            else:
                line += "+"
    print(f"y={y:3d}: {line}")

# Find the EXACT dark slot bounding box (the ":" region)
print("\n=== EXACT slot bounding box (semi-transparent dark) ===")
slot_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200 and (r+g+b)/3 < 100:
            slot_pixels.append((x, y))

if slot_pixels:
    xs = [p[0] for p in slot_pixels]
    ys = [p[1] for p in slot_pixels]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)

    print(f"X: {x_min}-{x_max} = {x_min/w*100:.2f}%-{x_max/w*100:.2f}% (width: {(x_max-x_min)/w*100:.2f}%)")
    print(f"Y: {y_min}-{y_max} = {y_min/h*100:.2f}%-{y_max/h*100:.2f}% (height: {(y_max-y_min)/h*100:.2f}%)")
    print(f"Center X: {(x_min+x_max)/2/w*100:.2f}%")
    print(f"Center Y: {(y_min+y_max)/2/h*100:.2f}%")

    # Check if the slot has internal divisions (vertical lines, etc.)
    print("\n=== Looking for internal divisions (vertical separators) ===")
    # For each column in the slot, count dark pixels
    col_counts = []
    for x in range(x_min, x_max + 1):
        count = sum(1 for y in range(y_min, y_max + 1) if (x, y) in slot_pixels)
        col_counts.append((x, count))

    # Print column counts (showing only non-zero)
    print("Columns with dark slot pixels:")
    for x, count in col_counts:
        if count > 0:
            print(f"  x={x:4d} ({x/w*100:.2f}%): {count} pixels")
