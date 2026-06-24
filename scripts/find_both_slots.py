#!/usr/bin/env python3
"""
Find BOTH slots in [Blank] 2.png:
1. The LARGE slot (with "/" separator) — where values go (300/300)
2. The SMALL slot (with LV placeholder) — where level goes

The user says:
- Values go in the LARGE rectangle (with the "/" separator line)
- LV goes in the SMALL rectangle (next to the large one)

Let me find both rectangles precisely.
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size
print(f"Image size: {w}x{h}")

# From previous analysis, slots are in the lower-right region
# y=176-218 area. Let me do a complete scan of this region.

print("\n=== Complete scan of lower-right region (x>80%, y=170-220) ===")
print("Looking for rectangular slots...\n")

# Find all semi-transparent pixels in this region
slot_pixels = []
for y in range(170, 220):
    for x in range(int(w * 0.80), w):
        r, g, b, a = img.getpixel((x, y))
        if 30 < a < 200:
            slot_pixels.append((x, y, r, g, b, a))

print(f"Found {len(slot_pixels)} semi-transparent pixels in lower-right")

# Group into connected regions (simple flood fill)
from collections import deque

visited = set()
regions = []

for px in slot_pixels:
    if px[:2] in visited:
        continue
    # BFS to find connected region
    region = []
    queue = deque([px[:2]])
    while queue:
        x, y = queue.popleft()
        if (x, y) in visited:
            continue
        # Check if this pixel is a slot pixel
        is_slot = False
        for sx, sy, sr, sg, sb, sa in slot_pixels:
            if sx == x and sy == y:
                is_slot = True
                break
        if not is_slot:
            continue
        visited.add((x, y))
        region.append((x, y))
        # Check 4 neighbors
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nx, ny = x + dx, y + dy
            if (nx, ny) not in visited:
                queue.append((nx, ny))

    if len(region) > 10:
        regions.append(region)

print(f"\nFound {len(regions)} connected regions:")
for i, region in enumerate(regions):
    xs = [p[0] for p in region]
    ys = [p[1] for p in region]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    width = x_max - x_min + 1
    height = y_max - y_min + 1
    center_x = (x_min + x_max) / 2 / w * 100
    center_y = (y_min + y_max) / 2 / h * 100
    print(f"\n  Region {i+1}: {len(region)} pixels")
    print(f"    X: {x_min}-{x_max} ({x_min/w*100:.2f}%-{x_max/w*100:.2f}%), width {width}px ({width/w*100:.2f}%)")
    print(f"    Y: {y_min}-{y_max} ({y_min/h*100:.2f}%-{y_max/h*100:.2f}%), height {height}px ({height/h*100:.2f}%)")
    print(f"    Center: ({center_x:.2f}%, {center_y:.2f}%)")
    if width > height * 1.5:
        print(f"    Type: LARGE (likely VALUES slot with /)")
    else:
        print(f"    Type: SMALL (likely LV slot)")
