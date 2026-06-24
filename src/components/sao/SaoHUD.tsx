'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO HUD — top-left status bars (HP / MP / Energy).
 *
 * Visual layout follows the asset repository's "Pezzi barra HP, Mana e Energia"
 * SVGs exactly:
 *   - Angular hexagonal shape (right side cut at ~580/1000 width)
 *   - HP = green (#7FC522 with #AEDB5E reflection)
 *   - MP = blue (#2B73B3 with #5CC4F0 reflection)
 *   - Energy = yellow (#EBA601 with #FFD24D reflection)
 *   - White decorative top line, dark inner background (#2A2A2A),
 *     outer frame (#3A3A3A) and metallic edge (#7A7A7A)
 *   - LV badge from "pezzi valori barre e lv.svg" style
 *
 * The fill is clipped by the same hexagonal shape so the bar respects
 * the angular SAO silhouette when filling.
 *
 * Audio:
 *   - popupPanel on mount
 *   - click on hover
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
  /** Optional player name shown above bars (small) */
  playerName?: string;
}

const DEFAULT_HP: BarValue = { current: 240, max: 300 };
const DEFAULT_MP: BarValue = { current: 80, max: 120 };
const DEFAULT_ENERGY: BarValue = { current: 180, max: 200 };
const DEFAULT_LEVEL = 1;

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
      onMouseEnter={() => play('click', 0.15)}
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

      <div className="relative flex flex-col gap-1.5">
        <SaoBar
          type="hp"
          current={hp.current}
          max={hp.max}
          label="HP"
          mounted={mounted}
        />
        <SaoBar
          type="mp"
          current={mp.current}
          max={mp.max}
          label="MP"
          mounted={mounted}
        />
        <SaoBar
          type="energy"
          current={energy.current}
          max={energy.max}
          label="EN"
          mounted={mounted}
        />
      </div>

      {/* Level badge — uses the "pezzi valori barre e lv" aesthetic */}
      <motion.div
        className="mt-2 flex items-center"
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

type BarType = 'hp' | 'mp' | 'energy';

const BAR_COLORS: Record<
  BarType,
  { base: string; reflection: string; label: string }
> = {
  hp: { base: '#7FC522', reflection: '#AEDB5E', label: 'HP' },
  mp: { base: '#2B73B3', reflection: '#5CC4F0', label: 'MP' },
  energy: { base: '#EBA601', reflection: '#FFD24D', label: 'EN' },
};

function SaoBar({
  type,
  current,
  max,
  label,
  mounted,
}: {
  type: BarType;
  current: number;
  max: number;
  label: string;
  mounted: boolean;
}) {
  const { play } = useSaoSound();
  const colors = BAR_COLORS[type];
  // Percentage (0..1)
  const pct = Math.max(0, Math.min(1, current / max));
  // The hexagonal shape: at 100% the fill reaches the right-cut point (~970px of 1000).
  // We map pct to a clip on the same polygon.
  // Bar dimensions (relative to viewBox 1000x100)
  const W = 1000;
  const H = 100;
  // Right cut: top-right at 970,60; bottom-right at 580,100. Fill width scales pct over 970.
  const fillRight = pct * 970;
  // Build a clip polygon that follows the hexagonal shape up to fillRight
  // (interpolating along the right diagonal from (970,60)→(580,100) when partial)
  let clipPolygon: string;
  if (fillRight >= 970) {
    clipPolygon = `M 0,0 L 970,0 L 970,60 L 580,60 L 580,100 L 0,100 Z`;
  } else if (fillRight >= 580) {
    // On the upper-right diagonal (0,0)→(970,60) — fill up to fillRight on top
    // and bottom edge follows lower diagonal (970,60)→(580,100) but only where fillRight >= 580
    const tTop = fillRight / 970;
    const yTop = tTop * 60; // y at top diagonal
    // For the bottom diagonal we go from (970,60) to (580,100): for x in [580,970], y = 60 + (970-x)*(40/390)
    // But if fillRight is between 580 and 970, the fill at bottom edge is at fillRight (since bottom diagonal only starts at 580)
    // Actually for fillRight >= 580, the bottom edge is on the diagonal: y = 100 - (fillRight-580)*(40/390)
    const yBottom = 100 - ((fillRight - 580) * 40) / 390;
    clipPolygon = `M 0,0 L ${fillRight},${yTop} L ${fillRight},${yBottom} L 0,100 Z`;
  } else {
    // fillRight < 580: just a rectangle (no bottom diagonal reached yet)
    // Top edge at y = (fillRight/970)*60
    const yTop = (fillRight / 970) * 60;
    clipPolygon = `M 0,0 L ${fillRight},${yTop} L ${fillRight},100 L 0,100 Z`;
  }

  // Display values (formatted like SAO: current / max)
  const displayCurrent = String(current).padStart(3, '0');
  const displayMax = String(max).padStart(3, '0');

  return (
    <div className="relative" style={{ width: 'min(380px, 35vw)' }}>
      {/* White decorative top line (like the SVG) */}
      <div
        className="absolute -top-[2px] left-2 right-2 h-[2px]"
        style={{ background: 'rgba(255,255,255,0.55)' }}
        aria-hidden
      />

      {/* Bar container — hexagonal shape via clip-path */}
      <div
        className="relative"
        style={{
          aspectRatio: '1000 / 100',
          background: '#2A2A2A',
          clipPath:
            'polygon(0% 0%, 97% 0%, 97% 60%, 58% 60%, 58% 100%, 0% 100%)',
          border: '2px solid #3A3A3A',
          // We can't combine border with clip-path; use outline+filter for chrome
        }}
      >
        {/* Outer dark frame + metallic edge (recreate via nested divs since clip-path cuts border) */}
        {/* Inner background already set above. Now fill layer. */}

        {/* FILL — animated width on mount */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            clipPath: `path('${clipPolygon}')`,
            WebkitClipPath: `path('${clipPolygon}')`,
          }}
        >
          {/* Base color fill */}
          <motion.div
            className="absolute inset-0"
            initial={{ width: '0%' }}
            animate={{ width: mounted ? `${pct * 100}%` : '0%' }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
            style={{
              background: colors.base,
            }}
          />
          {/* Light reflection on the right portion (like the SVG's #AEDB5E strip) */}
          <motion.div
            className="absolute top-0 bottom-0 right-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: mounted ? 1 : 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            style={{
              width: '6%',
              background: colors.reflection,
              mixBlendMode: 'screen',
            }}
          />
          {/* Top gloss highlight (subtle white at top) */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '30%',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
            }}
          />
        </motion.div>

        {/* Metallic frame (re-drawn on top via SVG overlay, since clip-path removes border) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M 0,0 L 970,0 L 970,60 L 580,60 L 580,100 L 0,100 Z"
            fill="none"
            stroke="#3A3A3A"
            strokeWidth="8"
            strokeMiterlimit="10"
          />
          <path
            d="M 0,0 L 970,0 L 970,60 L 580,60 L 580,100 L 0,100 Z"
            fill="none"
            stroke="#7A7A7A"
            strokeWidth="2"
            strokeMiterlimit="10"
          />
        </svg>

        {/* Numeric value display (top-right, like the SAO HUD) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 right-[8%] flex items-baseline gap-1"
          style={{
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.7)',
          }}
        >
          <span
            className="text-sm sm:text-base"
            style={{ color: '#FBFBFB' }}
          >
            {displayCurrent}
          </span>
          <span className="text-[0.65rem]" style={{ color: '#FBFBFB', opacity: 0.6 }}>
            /
          </span>
          <span className="text-[0.7rem]" style={{ color: '#FBFBFB', opacity: 0.75 }}>
            {displayMax}
          </span>
        </div>

        {/* Label tag (left side, like the SAO HUD) */}
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
            style={{ color: colors.base }}
          >
            {label}
          </span>
        </div>

        {/* Hover interaction (cursor crosshair to suggest interactivity) */}
        <div
          className="absolute inset-0"
          onMouseEnter={() => play('click', 0.12)}
          style={{ cursor: 'default' }}
          aria-hidden
        />
      </div>

      {/* Pulse glow when low (<25%) */}
      {pct < 0.25 && pct > 0 && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, ${colors.base}00, ${colors.base}40, ${colors.base}00)`,
            clipPath:
              'polygon(0% 0%, 97% 0%, 97% 60%, 58% 60%, 58% 100%, 0% 100%)',
          }}
          animate={{ opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          aria-hidden
        />
      )}
    </div>
  );
}
