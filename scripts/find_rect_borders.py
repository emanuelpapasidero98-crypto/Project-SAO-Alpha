#!/usr/bin/env python3
"""
The slots might be defined by their DARK OPAQUE borders (not semi-transparent).
Let me look for rectangular regions defined by dark borders in the lower-right.
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size

# Show a high-res ASCII viz of the lower-right region (x>80%, y=170-220)
print("=== ASCII viz x=80-95%, y=170-220 (each char = 1 pixel) ===")
print("Legend: . = transparent, : = semi-transparent dark, - = semi-transparent bright,")
print("        ' ' = bright opaque, # = dark opaque, G = green, ? = other opaque\n")

x_start = int(w * 0.80)
x_end = int(w * 0.96)
y_start = 170
y_end = 220

# Print column header
print(f"{'':>4} ", end="")
for x in range(x_start, x_end):
    print(f"{x % 10}", end="")
print("  <- x last digit")
print(f"{'':>4} ", end="")
for x in range(x_start, x_end):
    print(f"{(x // 10) % 10}", end="")
print("  <- x tens digit")
print("-" * (4 + x_end - x_start + 20))

for y in range(y_start, y_end):
    line = f"{y:3d} "
    for x in range(x_start, x_end):
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
    # Also show the x range for this row
    line += f"  (x={x_start}-{x_end-1}, y={y})"
    print(line)

# Now find rectangular borders — scan for horizontal and vertical dark lines
print("\n=== Looking for rectangular borders (dark opaque lines) ===")
# Find rows with many dark pixels
print("\nRows with > 5 dark opaque pixels:")
for y in range(170, 220):
    dark_count = 0
    dark_xs = []
    for x in range(int(w * 0.80), int(w * 0.96)):
        r, g, b, a = img.getpixel((x, y))
        if a >= 200 and (r+g+b)/3 < 80:
            dark_count += 1
            dark_xs.append(x)
    if dark_count > 3:
        print(f"  y={y}: {dark_count} dark pixels at x={dark_xs}")

print("\nColumns with > 3 dark opaque pixels:")
for x in range(int(w * 0.80), int(w * 0.96)):
    dark_count = 0
    dark_ys = []
    for y in range(170, 220):
        r, g, b, a = img.getpixel((x, y))
        if a >= 200 and (r+g+b)/3 < 80:
            dark_count += 1
            dark_ys.append(y)
    if dark_count > 2:
        print(f"  x={x} ({x/w*100:.2f}%): {dark_count} dark pixels at y={dark_ys}")
