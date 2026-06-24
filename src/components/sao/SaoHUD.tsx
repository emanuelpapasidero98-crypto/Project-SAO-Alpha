'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO HUD — top-left status bars (HP / MP / Energy).
 *
 * Built EXCLUSIVELY from canonical assets in "Pezzi barra HP, Mana e Energia":
 *
 *   1. Bar background = "[Blank] 2.png" (1620×258) — the OFFICIAL rendered
 *      template of a single SAO bar (dark border, white decorative top line,
 *      hexagonal right cut, colored gradient fill).
 *      Recolored to blue (MP) and yellow (Energy) via hue rotation.
 *
 *   2. Value box = "pezzi valori barre e lv.svg" (110×30) — the canonical
 *      SAO HUD value box. It contains:
 *        - Dark #303030 background with #151515 outer border + #5a5a5a inner border
 *        - Vertical separator at x=35
 *        - Left section (0-35): "/" symbol — where current/max values go
 *        - Right section (35-110): "LV:" text — where the level number goes
 *
 *      Two variants are pre-generated from this canonical SVG:
 *        - values-only.svg  → only the left section (for HP/MP, no LV)
 *        - values-with-lv.svg → full canonical box (for Energy, with LV)
 *
 * The value box is placed INSIDE each bar (overlaid on the fill, in the
 * right portion), as part of the bar itself. The numbers are then rendered
 * on top of the box's "/" and "LV:" placeholders:
 *   - HP/MP: only the values (300/300) inside the values-only box
 *   - Energy: values (200/200) + LV (01) inside the values-with-lv box
 *
 * All standalone LV boxes/badges are ELIMINATED.
 *
 * The bar type label (HP/MP/EN) is placed ABOVE each bar (small, top-left).
 *
 * The player name is placed ABOVE the HP bar, styled as a semi-transparent
 * dark box matching the bar value box aesthetic.
 *
 * No graphics are invented — only the existing canonical assets are used.
 */

export interface BarValue {
  current: number;
  max: number;
}

interface SaoHUDProps {
  hp?: BarValue;
  mp?: BarValue;
  energy?: BarValue;
  level?: number;
  playerName?: string;
}

const DEFAULT_HP: BarValue = { current: 300, max: 300 };
const DEFAULT_MP: BarValue = { current: 120, max: 120 };
const DEFAULT_ENERGY: BarValue = { current: 200, max: 200 };
const DEFAULT_LEVEL = 1;

type BarType = 'hp' | 'mp' | 'energy';

const BAR_CONFIG: Record<BarType, { png: string; label: string; labelColor: string }> = {
  hp: { png: '/sao/hpbar/blank-hp.png', label: 'HP', labelColor: '#7FC522' },
  mp: { png: '/sao/hpbar/blank-mp.png', label: 'MP', labelColor: '#2B73B3' },
  energy: { png: '/sao/hpbar/blank-energy.png', label: 'EN', labelColor: '#EBA601' },
};

export default function SaoHUD({
  hp = DEFAULT_HP,
  mp = DEFAULT_MP,
  energy = DEFAULT_ENERGY,
  level = DEFAULT_LEVEL,
  playerName,
}: SaoHUDProps) {
  const { play } = useSaoSound();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    play('popupPanel', 0.3);
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, [play]);

  return (
    <motion.div
      className="fixed top-4 left-4 z-30 select-none"
      initial={{ opacity: 0, x: -30, y: -10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
      onMouseEnter={() => play('click', 0.12)}
    >
      <div className="relative flex flex-col gap-[2px]">
        <SaoBar
          type="hp"
          current={hp.current}
          max={hp.max}
          mounted={mounted}
          showLevel={false}
          level={level}
          playerName={playerName}
        />
        <SaoBar
          type="mp"
          current={mp.current}
          max={mp.max}
          mounted={mounted}
          showLevel={false}
          level={level}
        />
        <SaoBar
          type="energy"
          current={energy.current}
          max={energy.max}
          mounted={mounted}
          showLevel={true}
          level={level}
        />
      </div>
    </motion.div>
  );
}

/* ---------- Sub-component: single bar ---------- */

function SaoBar({
  type,
  current,
  max,
  mounted,
  showLevel,
  level,
  playerName,
}: {
  type: BarType;
  current: number;
  max: number;
  mounted: boolean;
  showLevel: boolean;
  level: number;
  playerName?: string;
}) {
  const config = BAR_CONFIG[type];
  const pct = Math.max(0, Math.min(1, current / max));
  const hidePct = (1 - pct) * 100;

  const displayCurrent = String(current).padStart(3, '0');
  const displayMax = String(max).padStart(3, '0');

  // Value box dimensions (relative to bar width):
  // - values-only.svg has aspect 35/30 = 1.167 (wider than tall)
  // - values-with-lv.svg has aspect 110/30 = 3.667
  // We size the box so its height matches ~55% of the bar height.
  // The bar aspect is 1620/258 = 6.28, so at full width 420px the bar is 66.8px tall.
  // Box height = 55% of 66.8 = 36.7px. Box width:
  //   - values-only: 36.7 * 1.167 = 42.8px
  //   - values-with-lv: 36.7 * 3.667 = 134.6px
  // We express these as percentages of the bar width (420px):
  //   - values-only: 42.8/420 = 10.2%
  //   - values-with-lv: 134.6/420 = 32.1%

  return (
    <div className="relative" style={{ width: 'min(420px, 40vw)' }}>
      {/* Player name — placed ABOVE the HP bar only.
          Styled as a semi-transparent dark box matching the bar value box
          aesthetic (rgba(48,48,48,0.85) like the canonical SVG #303030
          with #151515 border). Takes most of the HP bar width. */}
      {playerName && type === 'hp' && (
        <div
          className="absolute -top-5 left-8 right-1 px-2 py-0.5 text-[0.6rem] tracking-[0.25em] truncate text-center"
          style={{
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            background: 'rgba(48, 48, 48, 0.85)',
            border: '1px solid rgba(21, 21, 21, 0.9)',
            boxShadow:
              'inset 0 0 0 1px rgba(90, 90, 90, 0.6), 0 1px 2px rgba(0,0,0,0.4)',
            textShadow: '0 1px 1px rgba(0,0,0,0.9)',
          }}
        >
          {playerName.toUpperCase()}
        </div>
      )}

      {/* Bar (using [Blank] 2.png as background) */}
      <div className="relative" style={{ aspectRatio: '1620 / 258' }}>
        {/* Bar PNG — animated fill via clip-path */}
        <motion.img
          src={config.png}
          alt=""
          className="absolute inset-0 w-full h-full"
          draggable={false}
          aria-hidden
          initial={{ clipPath: `inset(0 100% 0 0)` }}
          animate={{
            clipPath: mounted
              ? `inset(0 ${hidePct}% 0 0)`
              : `inset(0 100% 0 0)`,
          }}
          transition={{
            duration: 1.1,
            ease: 'easeOut',
            delay: 0.3,
          }}
          style={{
            objectFit: 'fill',
          }}
        />

        {/* Bar type label (HP/MP/EN) — placed ABOVE the bar (small, top-left) */}
        <div
          className="absolute -top-3 left-1 px-1"
          style={{
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            fontSize: '0.55rem',
            letterSpacing: '0.25em',
            color: config.labelColor,
            textShadow: '0 0 4px rgba(0,0,0,0.9), 0 1px 1px rgba(0,0,0,0.8)',
            lineHeight: 1,
          }}
          aria-hidden
        >
          {config.label}
        </div>

        {/* ===== Canonical value box INSIDE the bar =====
            Uses "pezzi valori barre e lv.svg" (or its values-only variant)
            placed inside the bar's right portion, vertically centered.
            The SVG already contains the dark #303030 background, borders,
            vertical separator, "/" and "LV:" placeholders.
            We just overlay the numeric values on top.
            - HP/MP: use values-only.svg (only "/" section, no LV)
            - Energy: use values-with-lv.svg (full canonical box with both) */}
        <div
          className="absolute"
          style={{
            right: '3%',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '55%',
            width: showLevel ? '32%' : '10%',
            aspectRatio: showLevel ? '110 / 30' : '35 / 30',
          }}
        >
          {/* The canonical value box SVG (renders the dark box + "/" + "LV:") */}
          <img
            src={showLevel ? '/sao/hpbar/values-with-lv.svg' : '/sao/hpbar/values-only.svg'}
            alt=""
            className="absolute inset-0 w-full h-full"
            draggable={false}
            aria-hidden
            style={{
              objectFit: 'fill',
            }}
          />

          {/* Numeric values overlay — placed in the left section (over "/")
              which is 0-35 of 110 (31.8%) for the full box, or 100% for the
              values-only box. */}
          <div
            className="absolute top-0 bottom-0 flex items-center justify-center"
            style={{
              left: '0',
              width: showLevel ? '31.8%' : '100%',
              color: '#FBFBFB',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(0.5rem, 0.9vw, 0.7rem)',
              letterSpacing: '0.04em',
              textShadow: '0 1px 1px rgba(0,0,0,0.9)',
            }}
          >
            <span className="opacity-95">{displayCurrent}</span>
            <span className="opacity-60 mx-0.5">/</span>
            <span className="opacity-80">{displayMax}</span>
          </div>

          {/* LV number overlay — only for the Energy bar.
              Placed in the right section (35-110 of 110 = 31.8%-100%).
              Overlaps the "LV:" text from the SVG. */}
          {showLevel && (
            <div
              className="absolute top-0 bottom-0 flex items-center justify-center"
              style={{
                left: '31.8%',
                right: '0',
                color: '#EBA601',
                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                fontWeight: 400,
                fontSize: 'clamp(0.5rem, 0.9vw, 0.7rem)',
                letterSpacing: '0.04em',
                textShadow: '0 0 6px rgba(235, 166, 1, 0.7)',
              }}
            >
              {String(level).padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Pulse glow when low (<25%) — warning state */}
        {pct < 0.25 && pct > 0 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, ${config.labelColor}00, ${config.labelColor}55, ${config.labelColor}00)`,
              mixBlendMode: 'screen',
            }}
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
