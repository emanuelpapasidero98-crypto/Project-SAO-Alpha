#!/usr/bin/env python3
"""
Better analysis: sample specific pixels to understand the [Blank] 2.png layout.
Print a small ASCII visualization of the image.
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size
print(f"Image size: {w}x{h}")

# Sample a coarse grid and print brightness/alpha
print("\nASCII visualization (40 cols x 12 rows):")
print("Legend: . = transparent, # = dark, : = mid, ' ' = bright/white, G = green")
cols = 80
rows = 20
for ry in range(rows):
    y = int((ry + 0.5) * h / rows)
    line = ""
    for rx in range(cols):
        x = int((rx + 0.5) * w / cols)
        r, g, b, a = img.getpixel((x, y))
        if a < 50:
            line += "."
        else:
            brightness = (r + g + b) / 3
            if brightness < 80:
                line += "#"
            elif brightness < 150:
                line += ":"
            elif brightness < 220:
                line += "-"
            else:
                line += " "
    print(f"  y={y:3d} {line}")

# Now check the rightmost portion of the bar (where the value box should be)
print("\n=== Pixel colors at right portion (x > 80% of width) ===")
for y in [60, 90, 120, 150, 180, 210]:
    line = f"y={y:3d}: "
    for x_pct in [85, 88, 91, 94, 97]:
        x = int(x_pct * w / 100)
        r, g, b, a = img.getpixel((x, y))
        line += f"({r:3d},{g:3d},{b:3d},{a:3d})@{x_pct}% "
    print(line)
