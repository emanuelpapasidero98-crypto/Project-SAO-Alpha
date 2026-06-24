'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO HUD — top-left status bars (HP / MP / Energy).
 *
 * Built EXCLUSIVELY from the canonical "[Blank] 2.png" asset found in the
 * "Pezzi barra HP, Mana e Energia" folder. This PNG (1620×258, aspect 6.28:1)
 * is the OFFICIAL rendered template of a single SAO bar — it contains:
 *   - Dark outer border (#373737)
 *   - White decorative top line
 *   - Hexagonal shape (right side cut)
 *   - Colored gradient fill (green for HP, recolored to blue for MP and
 *     yellow for Energy via hue rotation)
 *
 * Value/LV boxes are placed INSIDE each bar (overlaid on the fill, in the
 * right portion), styled as semi-transparent dark boxes that match the
 * SAO HUD aesthetic:
 *   - HP/MP bars: only the value box (current/max), NO LV box
 *   - Energy bar: value box + LV box (both inside the bar)
 *
 * The value/LV box style uses:
 *   - Semi-transparent dark background (rgba(0,0,0,0.55)) — same as the
 *     "pezzi valori barre e lv.svg" #303030 aesthetic but with transparency
 *   - Thin border (rgba(255,255,255,0.15)) matching the canonical style
 *   - White text (#FBFBFB) for values, yellow (#EBA601) for LV number
 *   - All using the SAO UI font
 *
 * The bar type label (HP/MP/EN) is placed ABOVE each bar (small, top-left).
 *
 * The player name is placed ABOVE the HP bar, styled as a semi-transparent
 * dark box matching the bar value box aesthetic (so it looks like part of
 * the same HUD system, not a separate white card). It takes most of the
 * HP bar's width, positioned to the right of the "HP" label.
 *
 * No graphics are invented — only the existing canonical PNG asset is used
 * as the bar background, and the value/LV boxes are styled to match the
 * canonical "pezzi valori barre e lv.svg" aesthetic.
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

  return (
    <div className="relative" style={{ width: 'min(420px, 40vw)' }}>
      {/* Player name — placed ABOVE the HP bar only, taking most of its width.
          Styled as a semi-transparent dark box matching the bar value box
          aesthetic (so it looks like part of the same HUD system, not a
          separate white card). Positioned to the RIGHT of the "HP" label. */}
      {playerName && type === 'hp' && (
        <div
          className="absolute -top-5 left-8 right-1 px-2 py-0.5 text-[0.6rem] tracking-[0.25em] truncate text-center"
          style={{
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            background: 'rgba(8, 12, 20, 0.6)',
            border: '1px solid rgba(43, 115, 179, 0.5)',
            boxShadow: '0 0 8px rgba(0, 0, 0, 0.5), inset 0 0 4px rgba(43, 115, 179, 0.2)',
            textShadow: '0 0 6px rgba(92, 196, 240, 0.6)',
            backdropFilter: 'blur(4px)',
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

        {/* Bar type label (HP/MP/EN) — placed ABOVE the bar (small, top-left),
            so it doesn't intersect with the colored fill or the value box. */}
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

        {/* ===== Value box INSIDE the bar (right portion) =====
            Styled as a semi-transparent dark box matching the canonical
            "pezzi valori barre e lv.svg" aesthetic (#303030 background with
            transparency, #151515 border accent, white text).
            Positioned inside the bar's right portion, vertically centered.
            - HP/MP: only the value box (current/max), NO LV box
            - Energy: value box + LV box side by side inside the bar */}
        <div
          className="absolute flex items-stretch gap-0"
          style={{
            right: '4%',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '55%',
            // Semi-transparent dark background matching the canonical SAO box
          }}
        >
          {/* Value sub-box (current/max) — always present */}
          <div
            className="relative flex items-center justify-center px-1.5"
            style={{
              background: 'rgba(48, 48, 48, 0.85)',
              border: '1px solid rgba(21, 21, 21, 0.9)',
              boxShadow:
                'inset 0 0 0 1px rgba(90, 90, 90, 0.6), 0 1px 2px rgba(0,0,0,0.4)',
              color: '#FBFBFB',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(0.55rem, 1vw, 0.75rem)',
              letterSpacing: '0.04em',
              textShadow: '0 1px 1px rgba(0,0,0,0.9)',
              minWidth: '60px',
            }}
          >
            <span className="opacity-95">{displayCurrent}</span>
            <span className="opacity-60 mx-0.5">/</span>
            <span className="opacity-80">{displayMax}</span>
          </div>

          {/* LV sub-box — ONLY for the Energy bar.
              Has a vertical separator like the canonical SVG. */}
          {showLevel && (
            <div
              className="relative flex items-center justify-center px-1.5"
              style={{
                background: 'rgba(48, 48, 48, 0.85)',
                border: '1px solid rgba(21, 21, 21, 0.9)',
                borderLeft: '2px solid rgba(21, 21, 21, 0.9)',
                boxShadow:
                  'inset 0 0 0 1px rgba(90, 90, 90, 0.6), 0 1px 2px rgba(0,0,0,0.4)',
                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                fontWeight: 400,
                fontSize: 'clamp(0.55rem, 1vw, 0.75rem)',
                letterSpacing: '0.04em',
                minWidth: '36px',
              }}
            >
              <span
                className="opacity-70 mr-1"
                style={{ color: '#FBFBFB' }}
              >
                LV
              </span>
              <span
                style={{
                  color: '#EBA601',
                  textShadow: '0 0 6px rgba(235, 166, 1, 0.7)',
                }}
              >
                {String(level).padStart(2, '0')}
              </span>
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
