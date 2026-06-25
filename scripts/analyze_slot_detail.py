#!/usr/bin/env python3
"""
Detailed analysis of the value slot region in [Blank] 2.png.
We found 79 semi-transparent dark pixels in x:340-945, y:61-132.
Let's see if there are TWO separate slots (one for values, one for LV)
or just one continuous slot.
"""
from PIL import Image
from collections import defaultdict

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size

# Collect all semi-transparent dark pixels
slot_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200:
            brightness = (r + g + b) / 3
            if brightness < 100:
                slot_pixels.append((x, y, r, g, b, a))

print(f"Total slot pixels: {len(slot_pixels)}")

# Group by column (x) — find continuous regions
x_counts = defaultdict(int)
for x, y, *_ in slot_pixels:
    x_counts[x] += 1

# Find column groups (gaps > 5px = new group)
sorted_xs = sorted(x_counts.keys())
groups = []
if sorted_xs:
    start = sorted_xs[0]
    prev = sorted_xs[0]
    for x in sorted_xs[1:]:
        if x - prev > 5:
            groups.append((start, prev))
            start = x
        prev = x
    groups.append((start, prev))

print(f"\nColumn groups (semi-transparent dark regions):")
for i, (xs, xe) in enumerate(groups):
    width = xe - xs + 1
    # Find y range for this group
    ys = [y for x, y, *_ in slot_pixels if xs <= x <= xe]
    if ys:
        y_min, y_max = min(ys), max(ys)
        y_pct_min = y_min / h * 100
        y_pct_max = y_max / h * 100
        x_pct_min = xs / w * 100
        x_pct_max = xe / w * 100
        print(f"  Group {i+1}: x={xs}-{xe} (width {width}px, {x_pct_min:.1f}%-{x_pct_max:.1f}%), y={y_min}-{y_max} ({y_pct_min:.1f}%-{y_pct_max:.1f}%)")

# Also look for the LV slot — check the area to the LEFT of the value slot
# (since LV: usually comes before the value)
# OR check different alpha ranges (the slot might use a different alpha)
print("\n=== Looking for OTHER semi-transparent regions (any brightness) ===")
print("(to find LV slot if it's a different transparency)")
all_semi = defaultdict(list)
for y in range(h):
    for x in range(w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200:
            all_semi[a].append((x, y, r, g, b))

print("Alpha values found in semi-transparent pixels:")
for a in sorted(all_semi.keys()):
    pixels = all_semi[a]
    xs = [p[0] for p in pixels]
    ys = [p[1] for p in pixels]
    print(f"  alpha={a:3d}: {len(pixels):5d} pixels, x={min(xs)}-{max(xs)} ({min(xs)/w*100:.1f}%-{max(xs)/w*100:.1f}%), y={min(ys)}-{max(ys)} ({min(ys)/h*100:.1f}%-{max(ys)/h*100:.1f}%)")
