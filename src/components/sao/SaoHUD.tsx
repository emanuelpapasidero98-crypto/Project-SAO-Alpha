'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO HUD — top-left status bars (HP / MP / Energy).
 *
 * Built EXCLUSIVELY from the canonical "[Blank] 2.png" asset. This PNG
 * already contains a built-in semi-transparent dark slot for the values
 * (located in the right portion of the bar at approximately x=57-58%, y=38-51%).
 *
 * The user wants the numeric values (and LV for the Energy bar) to be placed
 * DIRECTLY inside this existing slot — NO separate value box SVG, NO overlay
 * box. Just the numbers written where the slot already is.
 *
 * Slot location in the bar PNG (1620×258, viewBox):
 *   - Values slot: x=926-945 (57.2%-58.3% of width), y=99-132 (38.4%-51.2% of height)
 *   - This is a small semi-transparent dark region inside the bar
 *
 * For the Energy bar, the LV goes in the same slot (we make it slightly
 * wider to accommodate "200/200 LV 01"). For HP/MP, just "300/300" / "120/120".
 *
 * The bar type label (HP/MP/EN) is placed ABOVE each bar.
 * The player name is placed ABOVE the HP bar, styled as a semi-transparent
 * dark box matching the bar slot aesthetic.
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
      {/* Player name — placed ABOVE the HP bar only.
          Styled as a semi-transparent dark box matching the bar slot aesthetic.
          Uses the same dark #303030 background as the value slots, with
          angular clip-path and metallic edge like the canonical SAO bars.
          More subtle and elegant than the previous version. */}
      {playerName && type === 'hp' && (
        <div
          className="absolute -top-5 left-8 right-1 px-2.5 py-0.5 text-[0.6rem] tracking-[0.3em] truncate text-center"
          style={{
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            // Semi-transparent dark background matching the bar value slots
            background: 'rgba(48, 48, 48, 0.78)',
            // Subtle border + metallic inner edge (like the canonical bar outline)
            boxShadow:
              'inset 0 0 0 1px rgba(90, 90, 90, 0.5), 0 1px 3px rgba(0,0,0,0.5)',
            // Angular SAO clip-path (sharp corners, top-left + bottom-right cut)
            clipPath:
              'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
            // Subtle text glow for readability
            textShadow: '0 0 6px rgba(92, 196, 240, 0.4), 0 1px 1px rgba(0,0,0,0.9)',
            // No backdrop-filter — keep it lightweight and clean
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

        {/* ===== Numeric values INSIDE the bar's existing [ / ] slot =====
            The [Blank] 2.png bar PNG ALREADY contains a semi-transparent dark
            slot on the RIGHT side, BELOW the narrow part of the bar.
            The slot is at:
              X: 86.48% - 89.75% (center X = 88.12%)
              Y: 68.22% - 84.50% (center Y = 76.36%)
              Width: 3.27%, Height: 16.28%
            We place the numbers DIRECTLY in this existing slot — NO separate
            box, NO SVG, NO overlay rectangle, just text positioned over the
            slot that's already part of the bar PNG.
            - HP/MP: just the values "300/300" / "120/120" centered in the slot
            - Energy: values "200/200" + LV "01" — slightly wider to fit both */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            // Position EXACTLY at the existing slot center in the PNG
            // Slot center: X=88.12%, Y=76.36%
            left: '88.12%',
            top: '76.36%',
            transform: 'translate(-50%, -50%)',
            // No background — just text over the PNG's existing slot
            background: 'transparent',
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            fontSize: 'clamp(0.4rem, 0.7vw, 0.55rem)',
            letterSpacing: '0.02em',
            textShadow: '0 1px 2px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <span className="opacity-95">{displayCurrent}</span>
          <span className="opacity-60 mx-0.5">/</span>
          <span className="opacity-80">{displayMax}</span>
          {showLevel && (
            <>
              <span className="opacity-40 mx-1">|</span>
              <span className="opacity-70 mr-1">LV</span>
              <span
                style={{
                  color: '#EBA601',
                  textShadow: '0 0 6px rgba(235, 166, 1, 0.8)',
                }}
              >
                {String(level).padStart(2, '0')}
              </span>
            </>
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
