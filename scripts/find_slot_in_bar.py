#!/usr/bin/env python3
"""
Find the value slot location inside [Blank] 2.png.
The user says the bar PNG already has a slot for values — we need to find
where it is (likely a semi-transparent dark area on the right portion).
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size
print(f"Image size: {w}x{h}")

# Detailed pixel scan in the right portion of the bar (where value slot should be)
# Look at all pixels and identify regions by their alpha (transparency)
print("\n=== Alpha channel analysis (right portion of bar, y=middle) ===")
mid_y = h // 2
print(f"y={mid_y}:")
prev_alpha = None
for x in range(int(w * 0.5), int(w * 0.99), 2):
    r, g, b, a = img.getpixel((x, mid_y))
    if a != prev_alpha and a > 0:
        brightness = (r + g + b) / 3
        print(f"  x={x:4d} ({x/w*100:.1f}%): rgba=({r:3d},{g:3d},{b:3d},{a:3d}) brightness={brightness:.0f}")
        prev_alpha = a

# Sample the entire bar in a grid
print("\n=== Grid sample (10 cols x 5 rows) ===")
for ry in range(5):
    y = int((ry + 0.5) * h / 5)
    line = f"y={y:3d}: "
    for rx in range(10):
        x = int((rx + 0.5) * w / 10)
        r, g, b, a = img.getpixel((x, y))
        line += f"({r:3d},{g:3d},{b:3d},{a:3d}) "
    print(line)

# Look specifically for the dark slot — it would be a rectangular region
# with relatively low alpha (semi-transparent) and dark color
print("\n=== Looking for semi-transparent dark slot (alpha 30-200) ===")
slot_x_range = [w, 0]
slot_y_range = [h, 0]
slot_count = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200:
            brightness = (r + g + b) / 3
            if brightness < 100:
                slot_count += 1
                slot_x_range[0] = min(slot_x_range[0], x)
                slot_x_range[1] = max(slot_x_range[1], x)
                slot_y_range[0] = min(slot_y_range[0], y)
                slot_y_range[1] = max(slot_y_range[1], y)

if slot_count > 0:
    print(f"Found {slot_count} semi-transparent dark pixels")
    print(f"X range: {slot_x_range[0]}-{slot_x_range[1]} ({slot_x_range[0]/w*100:.1f}%-{slot_x_range[1]/w*100:.1f}%)")
    print(f"Y range: {slot_y_range[0]}-{slot_y_range[1]} ({slot_y_range[0]/h*100:.1f}%-{slot_y_range[1]/h*100:.1f}%)")
else:
    print("No semi-transparent dark pixels found")

# Also check the rightmost 40% of the bar for any non-green pixels
print("\n=== Right 40% of bar — non-fill pixels (where slot might be) ===")
right_x_start = int(w * 0.6)
for y in [int(h * 0.2), int(h * 0.3), int(h * 0.4), int(h * 0.5), int(h * 0.6), int(h * 0.7)]:
    line = f"y={y:3d}: "
    for x in range(right_x_start, w, 30):
        r, g, b, a = img.getpixel((x, y))
        is_green = g > 100 and g > r + 30 and g > b + 30
        marker = "G" if is_green else ("." if a < 50 else "?")
        line += f"{marker}@{x/w*100:.0f}% "
    print(line)
