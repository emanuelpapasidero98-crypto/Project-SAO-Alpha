#!/usr/bin/env python3
"""
Generate value box SVGs based on the canonical "pezzi valori barre e lv.svg".

We create two variants:
1. values-only.svg — only the left section (0-35) of the canonical box,
   for HP and MP bars (no LV).
2. values-with-lv.svg — the full canonical box (0-110), for the Energy bar.

Both are derived from the original SVG, just clipped/extended as needed.
The original SVG already contains:
  - Box: rect 2,2 to 108,28 with fill #303030 + stroke #151515
  - Inner border: rect 3,3 to 107,27 with stroke #5a5a5a
  - Vertical separator at x=35
  - "/" symbol at x=18 (left section)
  - "LV:" text at x=70 (right section)

For values-only.svg: we keep only the left section (crop viewBox to 0 0 35 30),
  but we need to also remove the right border line at x=35 and replace it with
  a proper right border. We rewrite the SVG with viewBox 0 0 37 30 (with 2px
  border on right side too).

For values-with-lv.svg: we use the original SVG as-is.
"""
from pathlib import Path

# Original canonical SVG content
ORIGINAL = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 30" width="100%" height="100%">
  <style>
    .hud-text {
      font-family: 'Arial', sans-serif;
      font-weight: bold;
      fill: #ffffff;
      opacity: 0.9;
    }
  </style>

  <g>
    <path d="M 2,2 L 108,2 L 108,28 L 2,28 Z" fill="#303030" stroke="#151515" stroke-width="2"/>
    
    <path d="M 3,3 L 107,3 L 107,27 L 3,27 Z" fill="none" stroke="#5a5a5a" stroke-width="1"/>

    <text x="18" y="21" class="hud-text" font-size="16" text-anchor="middle">/</text>
    
    <text x="70" y="20" class="hud-text" font-size="14" text-anchor="middle">LV:</text>
  </g>
</svg>'''

# Write the full version (with LV) for the Energy bar
Path('/home/z/my-project/public/sao/hpbar/values-with-lv.svg').write_text(ORIGINAL, encoding='utf-8')
print('Generated values-with-lv.svg (full canonical, for Energy bar)')

# Write the values-only version (no LV) for HP and MP bars
# We crop to viewBox 0 0 35 30 (only the left section with "/")
# and add a proper right border.
VALUES_ONLY = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 30" width="100%" height="100%">
  <style>
    .hud-text {
      font-family: 'Arial', sans-serif;
      font-weight: bold;
      fill: #ffffff;
      opacity: 0.9;
    }
  </style>

  <g>
    <!-- Box background + outer border (cropped from canonical 2,2 to 33,28) -->
    <path d="M 2,2 L 33,2 L 33,28 L 2,28 Z" fill="#303030" stroke="#151515" stroke-width="2"/>
    
    <!-- Inner border -->
    <path d="M 3,3 L 32,3 L 32,27 L 3,27 Z" fill="none" stroke="#5a5a5a" stroke-width="1"/>

    <!-- "/" symbol (where current/max values go) -->
    <text x="18" y="21" class="hud-text" font-size="16" text-anchor="middle">/</text>
  </g>
</svg>'''

Path('/home/z/my-project/public/sao/hpbar/values-only.svg').write_text(VALUES_ONLY, encoding='utf-8')
print('Generated values-only.svg (left section only, for HP/MP bars)')

print('\nDone. Both files are derived from the canonical "pezzi valori barre e lv.svg".')
