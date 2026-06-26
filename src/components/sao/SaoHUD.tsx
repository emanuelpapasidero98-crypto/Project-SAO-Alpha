'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO HUD — top-left status bars (HP / MP / Energy).
 *
 * Built EXCLUSIVELY from the canonical "[Blank] 2.png" asset (1620×258).
 *
 * The bar PNG already has TWO semi-transparent dark slots BELOW the bar,
 * on the right side, with graphics already drawn inside them:
 *   - LARGE slot with a "/" separator:  X = 60%–84%  (the "/" sits at X≈72.4%)
 *   - SMALL slot with "LV:" label:      X = 84%–97%  ("LV:" ends at X≈89.7%)
 *   - Both slots are vertically centered at Y ≈ 76.4%
 *
 * Because the container uses aspectRatio 1620/258 and the <img> uses
 * objectFit:fill, these PNG percentages map 1:1 to left/top here.
 *
 * We DO NOT draw our own "/" — we reuse the PNG's "/" and place:
 *   - current value to the LEFT of the "/"  (X≈66.3%)
 *   - max value to the RIGHT of the "/"     (X≈78.3%)
 * For the Energy bar only, the level number goes to the RIGHT of "LV:" (X≈93.2%).
 * HP/MP: values only (no level). Energy: values + level.
 *
 * The bar type label (HP/MP/EN) is placed ABOVE each bar.
 * The player name is placed ABOVE the HP bar.
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

/* ===== Slot coordinates (measured from the PNG, map 1:1 to left/top) ===== */
const SLOT = {
  currentLeft: '66.3%', // current value, LEFT of the PNG "/"
  maxLeft: '78.3%',     // max value, RIGHT of the PNG "/"
  levelLeft: '93.2%',   // level number, RIGHT of the PNG "LV:" (Energy only)
  top: '76.4%',         // vertical center of both slots
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
  const displayCurrent = String(current);
  const displayMax = String(max);

  // Shared style for the numeric value text (current / max).
  // Identical look to before — only the POSITION changes.
  const valueTextStyle: React.CSSProperties = {
    position: 'absolute',
    top: SLOT.top,
    transform: 'translate(-50%, -50%)',
    color: '#FBFBFB',
    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
    fontWeight: 400,
    fontSize: 'clamp(0.55rem, 1vw, 0.75rem)',
    letterSpacing: '0.02em',
    textShadow: '0 1px 2px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.8)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    lineHeight: 1,
  };

  return (
    <div className="relative" style={{ width: 'min(420px, 40vw)' }}>
      {/* Player name — placed ABOVE the HP bar only.
          No box, just the text styled in SAO UI font with subtle glow. */}
      {playerName && type === 'hp' && (
        <div
          className="absolute -top-5 left-8 right-1 truncate text-center"
          style={{
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            fontSize: '0.8rem',
            letterSpacing: '0.35em',
            textShadow: '0 0 10px rgba(92, 196, 240, 0.7), 0 1px 2px rgba(0,0,0,0.9)',
          }}
        >
          {playerName.toUpperCase()}
        </div>
      )}

      {/* Bar (using [Blank] 2.png as background) */}
      {/* On HP/MP we clip away the bottom-right corner to hide the PNG's
          built-in "LV:" box (the LV box must appear on the Energy bar only).
          The clip removes everything past X=84%, Y=52% — i.e. exactly the
          LV box region — while keeping the large "/" value box (which ends
          at X=84%) and the whole colored bar (which sits above Y=52%) fully
          intact. Applied only when type !== 'energy'. */}
      <div
        className="relative"
        style={{
          aspectRatio: '1620 / 258',
          ...(type !== 'energy'
            ? {
                clipPath:
                  'polygon(0% 0%, 100% 0%, 100% 52%, 84% 52%, 84% 100%, 0% 100%)',
              }
            : {}),
        }}
      >
        {/* Bar PNG — animated fill via clip-path */}
        <motion.img
          src={config.png}
          alt=""
          className="absolute inset-0 w-full h-full"
          draggable={false}
          aria-hidden
          initial={{ clipPath: `inset(0 100% 0 0)` }}
          animate={{
            clipPath: mounted ? `inset(0 ${hidePct}% 0 0)` : `inset(0 100% 0 0)`,
          }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
          style={{ objectFit: 'fill' }}
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

        {/* ===== Numeric values around the PNG's existing "/" separator =====
            The PNG already draws the "/" inside the LARGE slot at X≈72.4%.
            We place "current" to its LEFT (X≈66.3%) and "max" to its RIGHT
            (X≈78.3%), both vertically centered at Y≈76.4%.
            We do NOT draw our own "/" — the PNG provides it. */}
        <div style={{ ...valueTextStyle, left: SLOT.currentLeft }}>
          {displayCurrent}
        </div>
        <div style={{ ...valueTextStyle, left: SLOT.maxLeft }}>
          {displayMax}
        </div>

        {/* LV number — only for the Energy bar.
            The PNG already draws "LV:" (ending at X≈89.7%); we place the
            level number to its RIGHT at X≈93.2%, same vertical center. */}
        {showLevel && (
          <div
            style={{
              ...valueTextStyle,
              left: SLOT.levelLeft,
              color: '#FBFBFB',
              textShadow: '0 1px 2px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.8)',
            }}
          >
            {String(level)}
          </div>
        )}

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
