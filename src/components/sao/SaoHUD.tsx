'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO HUD — top-left status bars (HP / MP / Energy).
 *
 * Built EXCLUSIVELY from the canonical "[Blank] 2.png" asset found in the
 * "Pezzi barra HP, Mana e Energia" folder of the asset repository. This PNG
 * (1620×258, aspect 6.28:1) is the OFFICIAL rendered template of a single
 * SAO bar — it already contains:
 *   - The dark outer border (#373737)
 *   - The white decorative top line
 *   - The hexagonal shape (right side cut)
 *   - The colored fill with gradient (green for HP, recolored to blue for MP
 *     and yellow for Energy via hue rotation — same PNG, different colors)
 *
 * We render 3 stacked bars (HP / MP / Energy), each using its own blank PNG
 * as background. The fill level is animated via `clip-path: inset(0 X% 0 0)`
 * which hides the right portion of the PNG proportionally to the missing
 * percentage. The hexagonal shape is preserved because the PNG itself has
 * the cut on the right side, so clipping just reveals less of the bar.
 *
 * The LV badge is built from the "pezzi valori barre e lv.svg" aesthetic:
 * dark #303030 box, #151515 outer border, #5a5a5a inner border, vertical
 * divider between the "/" indicator and the "LV:" label.
 *
 * No graphics are invented — only the existing canonical PNG assets are used.
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
      {/* Optional player name above bars */}
      {playerName && (
        <div
          className="mb-1 px-2 py-0.5 text-[0.65rem] tracking-[0.25em]"
          style={{
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            background: 'rgba(8, 12, 20, 0.65)',
            border: '1px solid rgba(43, 115, 179, 0.5)',
            clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
            textShadow: '0 0 8px rgba(43, 115, 179, 0.6)',
          }}
        >
          {playerName.toUpperCase()}
        </div>
      )}

      <div className="relative flex flex-col gap-[2px]">
        <SaoBar type="hp" current={hp.current} max={hp.max} mounted={mounted} />
        <SaoBar type="mp" current={mp.current} max={mp.max} mounted={mounted} />
        <SaoBar type="energy" current={energy.current} max={energy.max} mounted={mounted} />
      </div>

      {/* LV badge — built from the "pezzi valori barre e lv.svg" aesthetic:
          dark #303030 box, #151515 outer border, #5a5a5a inner border,
          vertical divider between "/" and "LV:" sections */}
      <motion.div
        className="mt-1.5 flex items-center"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div
          className="flex items-center"
          style={{
            background: '#303030',
            border: '2px solid #151515',
            boxShadow: 'inset 0 0 0 1px #5a5a5a, 0 0 8px rgba(0,0,0,0.5)',
            padding: '3px 10px',
            clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
          }}
        >
          <span
            className="text-[0.65rem] tracking-[0.2em] mr-2 pr-2"
            style={{
              color: '#FBFBFB',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              borderRight: '1px solid #151515',
              opacity: 0.9,
            }}
          >
            LV
          </span>
          <motion.span
            className="text-sm"
            style={{
              color: '#EBA601',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              textShadow: '0 0 8px rgba(235, 166, 1, 0.6)',
            }}
            key={level}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {String(level).padStart(2, '0')}
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Sub-component: single bar ---------- */

function SaoBar({
  type,
  current,
  max,
  mounted,
}: {
  type: BarType;
  current: number;
  max: number;
  mounted: boolean;
}) {
  const config = BAR_CONFIG[type];
  const pct = Math.max(0, Math.min(1, current / max));
  // Inset percentage from the right (how much to hide)
  const hidePct = (1 - pct) * 100;

  const displayCurrent = String(current).padStart(3, '0');
  const displayMax = String(max).padStart(3, '0');

  return (
    <div className="relative" style={{ width: 'min(380px, 35vw)' }}>
      {/* The bar PNG has aspect ratio 6.28:1 (1620x258). */}
      <div className="relative" style={{ aspectRatio: '1620 / 258' }}>
        {/* Layer 1: The canonical "[Blank] 2.png" — used DIRECTLY as the bar
            background. It already contains:
              - dark outer border (#373737)
              - white decorative top line
              - hexagonal shape (right side cut)
              - colored fill with gradient (green/blue/yellow depending on type)
            We animate the fill level by clipping the right portion via
            clip-path: inset(0 X% 0 0). This reveals less of the bar when
            the value is low, while preserving the hexagonal right cut. */}
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

        {/* Label tag (left side, like the SAO HUD) — small dark badge with
            the bar type abbreviation (HP/MP/EN) colored to match the bar */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-2 px-1.5 py-0.5"
          style={{
            background: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(255,255,255,0.15)',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
          }}
        >
          <span
            className="text-[0.6rem] tracking-[0.2em]"
            style={{ color: config.labelColor }}
          >
            {config.label}
          </span>
        </div>

        {/* Numeric value display (right side, like the SAO HUD) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 right-[3%] flex items-baseline gap-1"
          style={{
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.7)',
          }}
        >
          <span className="text-sm sm:text-base" style={{ color: '#FBFBFB' }}>
            {displayCurrent}
          </span>
          <span className="text-[0.65rem]" style={{ color: '#FBFBFB', opacity: 0.6 }}>
            /
          </span>
          <span className="text-[0.7rem]" style={{ color: '#FBFBFB', opacity: 0.75 }}>
            {displayMax}
          </span>
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
