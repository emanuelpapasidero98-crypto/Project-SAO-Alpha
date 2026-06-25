#!/usr/bin/env python3
"""
Remove the white background from the stat icons in public/sao/stats/.
The PNGs have an opaque white background that looks bad on the character panel.
We make near-white pixels transparent.
"""
from PIL import Image
from pathlib import Path

STATS_DIR = Path('/home/z/my-project/public/sao/stats')

# Backup originals first (only if not already backed up)
backup_dir = STATS_DIR / 'original'
backup_dir.mkdir(exist_ok=True)

for png_path in sorted(STATS_DIR.glob('*.png')):
    # Skip files in the backup folder
    if png_path.parent != STATS_DIR:
        continue

    # Backup if not already done
    backup_path = backup_dir / png_path.name
    if not backup_path.exists():
        backup_path.write_bytes(png_path.read_bytes())

    img = Image.open(png_path).convert('RGBA')
    w, h = img.size
    pixels = img.load()

    # Make near-white pixels transparent
    # Threshold: brightness > 230 = treat as background
    changed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a > 0 and r > 230 and g > 230 and b > 230:
                pixels[x, y] = (255, 255, 255, 0)
                changed += 1

    img.save(png_path)
    print(f'{png_path.name}: {changed} pixels made transparent')

print('\nDone! Originals backed up to:', backup_dir)
