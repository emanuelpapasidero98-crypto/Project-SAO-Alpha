#!/usr/bin/env python3
"""
Find the exact pixel location of the [ / ] value box inside the [Blank] 2.png
SAO bar image. The box is a dark semi-transparent rectangle on the right
side of the bar. We detect it by scanning for dark translucent pixels.

Also check if there's a separate LV: box further right.
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size
print(f"Image size: {w}x{h}")

# Scan each column from right to left to find dark box regions
# The bar fill is bright (green/blue/yellow), the box is dark grayish
def is_dark_box_pixel(r, g, b, a):
    """Detect dark semi-transparent box pixels (not the bar border)."""
    if a < 100:
        return False
    brightness = (r + g + b) / 3
    # The box is dark (brightness < 100) and not too saturated
    return brightness < 80

# Count dark pixels per column
dark_cols = []
for x in range(w):
    dark_count = sum(1 for y in range(h) if is_dark_box_pixel(*img.getpixel((x, y))))
    if dark_count > 5:  # at least 5 dark pixels in this column
        dark_cols.append((x, dark_count))

# Group consecutive columns into regions
if dark_cols:
    regions = []
    start_x = dark_cols[0][0]
    prev_x = start_x
    for x, _ in dark_cols[1:]:
        if x - prev_x > 5:  # gap
            regions.append((start_x, prev_x))
            start_x = x
        prev_x = x
    regions.append((start_x, prev_x))

    print(f"\nDark box regions (x_start, x_end) — image width = {w}:")
    for r in regions:
        x_start, x_end = r
        width = x_end - x_start
        # Find vertical extent
        ys = [y for x in range(x_start, x_end + 1) for y in range(h) if is_dark_box_pixel(*img.getpixel((x, y)))]
        if ys:
            y_start, y_end = min(ys), max(ys)
            print(f"  x: {x_start}-{x_end} (width {width}, {x_start/w*100:.1f}%-{x_end/w*100:.1f}%), y: {y_start}-{y_end} ({y_start/h*100:.1f}%-{y_end/h*100:.1f}%)")
