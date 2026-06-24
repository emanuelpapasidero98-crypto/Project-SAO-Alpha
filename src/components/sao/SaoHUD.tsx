'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO HUD — top-left status bars (HP / MP / Energy).
 *
 * Built EXCLUSIVELY from canonical assets in "Pezzi barra HP, Mana e Energia":
 *
 *   1. Bar background = "[Blank] 2.png" (1620×258, aspect 6.28:1) — the
 *      OFFICIAL rendered template of a single SAO bar. It contains only the
 *      dark border (#373737) + white decorative top line + hexagonal right
 *      cut + colored gradient fill. It does NOT contain the value box.
 *
 *   2. Value box = "pezzi valori barre e lv.svg" (viewBox 110×30) — a dark
 *      #303030 rectangular box with:
 *        - Left section (0-35px): contains "/" — where current/max values go
 *        - Right section (35-110px): contains "LV:" — where the level goes
 *      A vertical #151515 separator line divides the two sections.
 *
 * Layout per the user's request:
 *   - The value box is placed INSIDE each bar (overlaid on the fill), in the
 *     right portion of the bar (semi-transparent so the bar color shows through).
 *   - HP bar: only the LEFT section of the box (values "300/300"), NO LV box.
 *   - MP bar: same as HP — only values, NO LV box.
 *   - Energy bar: the FULL box (values + LV) inside the bar.
 *   - All standalone LV boxes/badges are ELIMINATED — only the one inside the
 *     Energy bar remains.
 *
 * The bar type label (HP/MP/EN) is placed ABOVE each bar (small, top-left)
 * so it doesn't intersect with the fill or the value box.
 *
 * The player name is placed ABOVE the HP bar, taking most of the HP bar's
 * width, and positioned so it doesn't intersect with the "HP" label.
 *
 * Player name uses the "bianco SAO" card style: #FBFBFB background with
 * #1a2a3a dark text and angular clip-path.
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
  // Inset percentage from the right (how much to hide)
  const hidePct = (1 - pct) * 100;

  const displayCurrent = String(current).padStart(3, '0');
  const displayMax = String(max).padStart(3, '0');

  return (
    <div className="relative" style={{ width: 'min(420px, 40vw)' }}>
      {/* Player name — placed ABOVE the HP bar, taking most of its width.
          Positioned to the RIGHT of the "HP" label so they don't intersect. */}
      {playerName && type === 'hp' && (
        <div
          className="absolute -top-5 left-8 right-1 px-2 py-0.5 text-[0.6rem] tracking-[0.25em] truncate"
          style={{
            color: '#1a2a3a',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            background: '#FBFBFB',
            border: '1px solid rgba(43, 115, 179, 0.5)',
            clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
            boxShadow: '0 0 6px rgba(43, 115, 179, 0.3)',
            textAlign: 'center',
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

        {/* ===== Value box INSIDE the bar (using pezzi valori barre e lv.svg) =====
            The SVG (110×30) is placed inside the right portion of the bar,
            semi-transparent so the bar color shows through.
            - HP/MP: show only the LEFT section of the box (values "300/300"), NO LV.
              We clip the SVG to show only 0-35px of the 110px width (31.8%).
            - Energy: show the FULL box (values + LV) inside the bar.

            The box is positioned in the right portion of the bar, vertically centered.
            Per the SAO canon, the box sits at roughly 60-95% of the bar width. */}
        <div
          className="absolute overflow-hidden"
          style={{
            // Position in the right portion of the bar
            right: '3%',
            top: '50%',
            transform: 'translateY(-50%)',
            // Width: small box for HP/MP (only values section), larger for Energy (values+LV)
            // The SVG aspect ratio is 110/30 = 3.67:1
            // For HP/MP we show 35/110 = 31.8% of the SVG width
            // For Energy we show 100% of the SVG width
            width: showLevel ? '22%' : '7%',
            height: '50%',
            // Semi-transparent overlay so the bar color shows through
            opacity: 0.92,
          }}
        >
          {/* The values SVG.
              For HP/MP: render at 314% width (110/35) to show only the left section
              For Energy: render at 100% width to show full SVG */}
          <img
            src="/sao/hpbar/pezzi valori barre e lv.svg"
            alt=""
            className="absolute inset-0 h-full"
            draggable={false}
            aria-hidden
            style={{
              width: showLevel ? '100%' : '314%',
              maxWidth: 'none',
              objectFit: 'fill',
            }}
          />

          {/* Values text overlay (current/max) — positioned in the left section.
              For HP/MP: full width of the (clipped) box.
              For Energy: only the left 31.8% of the box. */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              color: '#FBFBFB',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(0.45rem, 0.9vw, 0.65rem)',
              letterSpacing: '0.05em',
              textShadow: '0 1px 1px rgba(0,0,0,0.9)',
              width: showLevel ? '31.8%' : '100%',
            }}
          >
            <span className="opacity-90">{displayCurrent}</span>
            <span className="opacity-50 mx-0.5">/</span>
            <span className="opacity-75">{displayMax}</span>
          </div>

          {/* Level number overlay — only for Energy bar.
              Positioned in the right section (35-110 of 110 = 31.8%-100%). */}
          {showLevel && (
            <div
              className="absolute top-0 bottom-0 flex items-center justify-center"
              style={{
                left: '31.8%',
                right: '0',
                color: '#EBA601',
                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                fontWeight: 400,
                fontSize: 'clamp(0.45rem, 0.9vw, 0.65rem)',
                letterSpacing: '0.05em',
                textShadow: '0 0 6px rgba(235, 166, 1, 0.6)',
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
