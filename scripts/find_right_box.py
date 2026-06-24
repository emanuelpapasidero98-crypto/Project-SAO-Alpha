#!/usr/bin/env python3
"""
Find the [ / ] value box location on the RIGHT side of the bar.
The user says there's a [ / ] slot on the right side of the bar PNG
(not in the center). Let me scan the entire bar to find it.
"""
from PIL import Image
from collections import defaultdict

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size
print(f"Image size: {w}x{h}")

# Get ALL pixels with any transparency, grouped by alpha
print("\n=== All distinct alpha values and their regions ===")
alpha_pixels = defaultdict(list)
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if a > 0 and a < 255:  # semi-transparent or partial
            alpha_pixels[a].append((x, y, r, g, b))

# For each alpha, find the bounding box and check if it's on the right side
print(f"{'alpha':>6} | {'count':>6} | {'x_range':>20} | {'y_range':>15} | {'x_center':>10}")
print("-" * 80)
for a in sorted(alpha_pixels.keys()):
    pixels = alpha_pixels[a]
    xs = [p[0] for p in pixels]
    ys = [p[1] for p in pixels]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    x_center = (x_min + x_max) / 2 / w * 100
    print(f"{a:6d} | {len(pixels):6d} | {x_min:4d}-{x_max:4d} ({x_min/w*100:5.1f}%-{x_max/w*100:5.1f}%) | {y_min:4d}-{y_max:4d} | {x_center:8.1f}%")

# Focus on the RIGHT portion (x > 60%) to find the [ / ] box
print("\n=== Pixels in the RIGHT portion (x > 60%) ===")
right_pixels = []
for y in range(h):
    for x in range(int(w * 0.6), w):
        r, g, b, a = img.getpixel((x, y))
        if a > 0:
            right_pixels.append((x, y, r, g, b, a))

print(f"Total non-transparent pixels in right portion: {len(right_pixels)}")

# Group by color/alpha to find the box
from collections import Counter
color_counter = Counter((r, g, b, a) for x, y, r, g, b, a in right_pixels)
print("\nTop 10 colors in right portion:")
for color, count in color_counter.most_common(10):
    r, g, b, a = color
    print(f"  rgba({r:3d},{g:3d},{b:3d},{a:3d}): {count} pixels")

# Look specifically for dark pixels (the box background) in the right portion
print("\n=== Dark pixels (brightness < 100) in right portion ===")
dark_right = [(x, y, r, g, b, a) for x, y, r, g, b, a in right_pixels if (r+g+b)/3 < 100]
if dark_right:
    xs = [p[0] for p in dark_right]
    ys = [p[1] for p in dark_right]
    print(f"  Found {len(dark_right)} dark pixels in right portion")
    print(f"  X range: {min(xs)}-{max(xs)} ({min(xs)/w*100:.2f}%-{max(xs)/w*100:.2f}%)")
    print(f"  Y range: {min(ys)}-{max(ys)} ({min(ys)/h*100:.2f}%-{max(ys)/h*100:.2f}%)")
    print(f"  Center X: {(min(xs)+max(xs))/2/w*100:.2f}%")
    print(f"  Center Y: {(min(ys)+max(ys))/2/h*100:.2f}%")

# Also show ASCII visualization of just the right portion
print("\n=== ASCII visualization of RIGHT portion (x > 55%) ===")
print("Legend: . = transparent, # = dark opaque, : = semi-transparent dark, ' ' = bright, G = green")
for ry in range(20):
    y = int((ry + 0.5) * h / 20)
    line = f"y={y:3d}: "
    for rx in range(50):
        x = int(w * 0.55 + rx * (w * 0.45) / 50)
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
                line += "+"
    print(line)
