#!/usr/bin/env python3
"""
Deep analysis of [Blank] 2.png to find the value/LV slots that are ALREADY
part of the bar PNG. The user says these slots exist inside the bar itself.

We scan for semi-transparent dark regions in the right portion of the bar
where values and LV would be displayed.
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size
print(f"Image size: {w}x{h}")

# Sample the right portion of the bar at various Y coordinates
print("\n=== Right portion of bar (x: 60% to 95%) ===")
for y_pct in [25, 35, 45, 50, 55, 65, 75]:
    y = int(y_pct * h / 100)
    line = f"y={y:3d} ({y_pct}%): "
    for x_pct in [60, 65, 70, 75, 80, 85, 90]:
        x = int(x_pct * w / 100)
        r, g, b, a = img.getpixel((x, y))
        line += f"({r:3d},{g:3d},{b:3d},{a:3d})@{x_pct}% "
    print(line)

# Find all semi-transparent dark pixels (the slot background)
print("\n=== Semi-transparent dark regions (potential value/LV slots) ===")
# A slot would be: alpha between 30-200, brightness low
slot_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200:  # semi-transparent
            brightness = (r + g + b) / 3
            if brightness < 100:  # dark
                slot_pixels.append((x, y, r, g, b, a))

if slot_pixels:
    print(f"Found {len(slot_pixels)} semi-transparent dark pixels")
    # Find bounding boxes by grouping
    xs = [p[0] for p in slot_pixels]
    ys = [p[1] for p in slot_pixels]
    print(f"X range: {min(xs)}-{max(xs)} ({min(xs)/w*100:.1f}%-{max(xs)/w*100:.1f}%)")
    print(f"Y range: {min(ys)}-{max(ys)} ({min(ys)/h*100:.1f}%-{max(ys)/h*100:.1f}%)")

    # Group by X regions (columns)
    from collections import Counter
    x_counter = Counter(xs)
    print("\nColumns with most semi-transparent dark pixels (top 20):")
    for x, count in x_counter.most_common(20):
        print(f"  x={x:4d} ({x/w*100:.1f}%): {count} pixels")
else:
    print("NO semi-transparent dark pixels found!")
    print("\n=== All semi-transparent pixels (any brightness) ===")
    semi_trans = [(x, y) for y in range(h) for x in range(w) if 30 < img.getpixel((x, y))[3] < 200]
    print(f"Total semi-transparent: {len(semi_trans)}")
    if semi_trans:
        # Group by alpha value
        alpha_counter = Counter(img.getpixel((x, y))[3] for x, y in semi_trans)
        print("Alpha distribution:")
        for a, count in sorted(alpha_counter.items())[:10]:
            print(f"  alpha={a}: {count} pixels")
