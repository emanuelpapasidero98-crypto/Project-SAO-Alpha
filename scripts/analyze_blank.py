#!/usr/bin/env python3
"""Analyze the [Blank] 2.png reference image to understand the canonical
SAO HP/MP/Energy bar layout. Output a textual map of the image."""
from PIL import Image
from collections import Counter

img = Image.open('/home/z/my-project/upload/[Blank] 2.png').convert('RGBA')
w, h = img.size
print(f"Size: {w}x{h}")
print(f"Aspect ratio: {w/h:.2f}:1")

# Sample colors at different rows
print("\n=== Color analysis by row (most common colors) ===")
for y in range(0, h, max(1, h // 20)):
    row_pixels = []
    for x in range(0, w, 10):
        row_pixels.append(img.getpixel((x, y)))
    counter = Counter(row_pixels)
    top = counter.most_common(3)
    print(f"y={y:3d}: {top}")

# Find unique colors overall
print("\n=== Top 15 most common colors overall ===")
all_pixels = list(img.getdata())
counter = Counter(all_pixels)
for color, count in counter.most_common(15):
    pct = count / len(all_pixels) * 100
    print(f"  {color}: {count} ({pct:.1f}%)")
