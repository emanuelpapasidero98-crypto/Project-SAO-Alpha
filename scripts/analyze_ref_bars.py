#!/usr/bin/env python3
"""
Analyze the reference image's bars area to find where the value box is
located INSIDE each bar. We compare with the [Blank] 2.png to understand
what's different.
"""
from PIL import Image

# Reference image - full 1920x1080
ref = Image.open('/home/z/my-project/upload/pasted_image_1782341360915.png').convert('RGBA')
print(f"Reference size: {ref.size}")

# Find the bars by scanning for colored rows (green/blue/yellow)
w, h = ref.size
print("\n=== Scanning for colored bars (HP green, MP blue, Energy yellow) ===")
bar_rows = []
for y in range(0, min(300, h), 2):
    # Sample a row in the left portion
    colors = []
    for x in range(50, 500, 5):
        r, g, b, a = ref.getpixel((x, y))
        if a > 100:
            colors.append((r, g, b))
    if colors:
        # Check if row has green/blue/yellow dominant
        avg_r = sum(c[0] for c in colors) / len(colors)
        avg_g = sum(c[1] for c in colors) / len(colors)
        avg_b = sum(c[2] for c in colors) / len(colors)
        if avg_g > 100 and avg_g > avg_r + 20 and avg_g > avg_b + 20:
            bar_rows.append((y, 'GREEN', avg_r, avg_g, avg_b))
        elif avg_b > 100 and avg_b > avg_r + 20 and avg_b > avg_g + 20:
            bar_rows.append((y, 'BLUE', avg_r, avg_g, avg_b))
        elif avg_r > 150 and avg_g > 100 and avg_b < 100:
            bar_rows.append((y, 'YELLOW', avg_r, avg_g, avg_b))

# Group consecutive rows
if bar_rows:
    print(f"Found {len(bar_rows)} colored rows")
    # Group by color
    groups = []
    current_color = bar_rows[0][1]
    start_y = bar_rows[0][0]
    for y, color, r, g, b in bar_rows[1:]:
        if color != current_color or y - start_y > 10:
            groups.append((current_color, start_y, y - 2))
            current_color = color
            start_y = y
    groups.append((current_color, start_y, bar_rows[-1][0]))

    print("\nBar groups (color, y_start, y_end):")
    for color, y_s, y_e in groups:
        print(f"  {color}: y={y_s}-{y_e}")

# For the first green bar, scan the right portion to find value box
print("\n=== Detailed analysis of the first green bar ===")
if bar_rows:
    green_y_start = bar_rows[0][0]
    green_y_end = bar_rows[0][0]
    for y, c, _, _, _ in bar_rows:
        if c == 'GREEN':
            green_y_end = y
        else:
            break
    print(f"Green bar y range: {green_y_start}-{green_y_end}")

    # Sample colors along the green bar at its middle
    mid_y = (green_y_start + green_y_end) // 2
    print(f"\nPixel colors along y={mid_y} (x from 50 to 500, step 20):")
    for x in range(50, 500, 20):
        r, g, b, a = ref.getpixel((x, mid_y))
        brightness = (r + g + b) / 3
        # Mark dark pixels (potential value box)
        marker = ""
        if brightness < 100 and a > 100:
            marker = " <-- DARK"
        elif a < 100:
            marker = " (transparent)"
        print(f"  x={x:3d}: ({r:3d},{g:3d},{b:3d},{a:3d}){marker}")
