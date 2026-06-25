#!/usr/bin/env python3
"""
Generate MP and Energy bar fill SVGs from the HP fill SVG,
recoloring the green (#7FC522 / #AEDB5E) to blue (MP) and yellow (Energy).

The original HP fill is at: public/sao/hpbar/fill-hp.svg
Output:
  - public/sao/hpbar/fill-mp.svg  (blue: #2B73B3 / #5CC4F0)
  - public/sao/hpbar/fill-energy.svg (yellow: #EBA601 / #FFD24D)
"""
from pathlib import Path

SRC = Path('/home/z/my-project/public/sao/hpbar/fill-hp.svg')
content = SRC.read_text(encoding='utf-8')

# Color mapping: HP green -> MP blue
mp_content = content.replace('#7FC522', '#2B73B3').replace('#AEDB5E', '#5CC4F0')
Path('/home/z/my-project/public/sao/hpbar/fill-mp.svg').write_text(mp_content, encoding='utf-8')

# Color mapping: HP green -> Energy yellow
energy_content = content.replace('#7FC522', '#EBA601').replace('#AEDB5E', '#FFD24D')
Path('/home/z/my-project/public/sao/hpbar/fill-energy.svg').write_text(energy_content, encoding='utf-8')

print('Generated fill-mp.svg and fill-energy.svg')
