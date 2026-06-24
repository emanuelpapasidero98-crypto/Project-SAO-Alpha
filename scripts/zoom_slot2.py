#!/usr/bin/env python3
"""
Zoom into the small semi-transparent region at y=190, x=87%.
This might be the [ / ] box the user is referring to.
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size

# Zoom into x=80%-95%, y=65%-85%
print("=== Zoom into x=80%-95%, y=65%-85% (where the small slot is) ===")
print("Legend: . = transparent, : = semi-transparent dark, - = semi-transparent bright, ' ' = bright opaque, # = dark opaque, G = green")
print("(each char = 1 pixel)\n")

x_start = int(w * 0.80)
x_end = int(w * 0.95)
y_start = int(h * 0.65)
y_end = int(h * 0.85)

# Print header with x coordinates
print(f"{'y':>4} | ", end="")
for x in range(x_start, x_end, 2):
    print(f"{int(x/w*100):2d}", end="")
print()
print("-" * (5 + (x_end - x_start) // 2 * 2))

for y in range(y_start, y_end, 1):
    line = f"{y:4d} | "
    for x in range(x_start, x_end, 2):
        r, g, b, a = img.getpixel((x, y))
        if a < 50:
            line += ". "
        elif 50 <= a < 200:
            brightness = (r + g + b) / 3
            if brightness < 100:
                line += ": "
            else:
                line += "- "
        else:
            brightness = (r + g + b) / 3
            if brightness < 80:
                line += "# "
            elif brightness > 200:
                line += "  "
            else:
                line += "? "
    print(line)

# Find the bounding box of this slot
print("\n=== Slot bounding box (semi-transparent in this region) ===")
slot_pixels = []
for y in range(y_start, y_end):
    for x in range(x_start, x_end):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200:
            slot_pixels.append((x, y, r, g, b, a))

if slot_pixels:
    xs = [p[0] for p in slot_pixels]
    ys = [p[1] for p in slot_pixels]
    print(f"  X: {min(xs)}-{max(xs)} ({min(xs)/w*100:.2f}%-{max(xs)/w*100:.2f}%)")
    print(f"  Y: {min(ys)}-{max(ys)} ({min(ys)/h*100:.2f}%-{max(ys)/h*100:.2f}%)")
    print(f"  Center X: {(min(xs)+max(xs))/2/w*100:.2f}%")
    print(f"  Center Y: {(min(ys)+max(ys))/2/h*100:.2f}%")
    print(f"  Width: {(max(xs)-min(xs))/w*100:.2f}%")
    print(f"  Height: {(max(ys)-min(ys))/h*100:.2f}%")
