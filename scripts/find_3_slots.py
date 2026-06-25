#!/usr/bin/env python3
"""
Find the EXACT coordinates of the 3 rectangular slots visible in the lower-right
of [Blank] 2.png. The slots are defined by their semi-transparent borders.

From the ASCII viz I can see:
  - Slot 1 (left, smaller): x≈1376-1393
  - Slot 2 (middle, larger): x≈1408-1430 — this is the one with "/" separator
  - Slot 3 (right, smaller): x≈1441-1460

Let me find their exact boundaries.
"""
from PIL import Image

img = Image.open('/home/z/my-project/public/sao/hpbar/blank-hp.png').convert('RGBA')
w, h = img.size

# Find all semi-transparent pixels in y=176-218
# Group them into rectangles by X coordinate
print("=== Finding slot boundaries ===\n")

# For each row in the slot range, find the X coordinates of semi-transparent pixels
# Then identify the rectangles
slot_data = []
for y in range(176, 219):
    row_slots = []
    in_slot = False
    slot_start = 0
    for x in range(int(w * 0.84), int(w * 0.92)):
        r, g, b, a = img.getpixel((x, y))
        is_slot = (30 < a < 200) or (a >= 200 and (r+g+b)/3 > 200)  # semi-transparent OR bright opaque (the " " in ASCII)
        if is_slot and not in_slot:
            in_slot = True
            slot_start = x
        elif not is_slot and in_slot:
            in_slot = False
            if x - slot_start >= 3:  # min width 3px
                row_slots.append((slot_start, x - 1))
    if in_slot:
        row_slots.append((slot_start, int(w * 0.92) - 1))
    slot_data.append((y, row_slots))

# Print first 20 rows
for y, slots in slot_data[:30]:
    if slots:
        slots_str = ", ".join(f"{s}-{e} ({s/w*100:.2f}%-{e/w*100:.2f}%)" for s, e in slots)
        print(f"y={y}: {slots_str}")

# Group slots across rows into rectangles
# A rectangle is a slot that persists across multiple consecutive rows
print("\n=== Grouping into rectangles ===")
# For each X range that appears in many rows, find its Y range
from collections import defaultdict
slot_rows = defaultdict(list)  # (x_start, x_end) -> [rows]

# Round X coordinates to nearest 5 to group similar slots
for y, slots in slot_data:
    for s, e in slots:
        # Round to nearest 5px
        key = (round(s / 5) * 5, round(e / 5) * 5)
        slot_rows[key].append(y)

print(f"\nFound {len(slot_rows)} unique slot X-ranges:")
for (xs, xe), rows in sorted(slot_rows.items()):
    if len(rows) >= 5:  # only show slots that span at least 5 rows
        y_min, y_max = min(rows), max(rows)
        width = xe - xs
        height = y_max - y_min + 1
        center_x = (xs + xe) / 2 / w * 100
        center_y = (y_min + y_max) / 2 / h * 100
        print(f"\n  X: {xs}-{xe} ({xs/w*100:.2f}%-{xe/w*100:.2f}%), width {width}px ({width/w*100:.2f}%)")
        print(f"  Y: {y_min}-{y_max} ({y_min/h*100:.2f}%-{y_max/h*100:.2f}%), height {height}px ({height/h*100:.2f}%)")
        print(f"  Center: ({center_x:.2f}%, {center_y:.2f}%)")
        print(f"  Rows: {len(rows)}")
        if width > 20:
            print(f"  TYPE: LARGE (values slot)")
        else:
            print(f"  TYPE: SMALL (LV slot)")
