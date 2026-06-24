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
 *      OFFICIAL rendered template of a single SAO bar (dark border, white
 *      decorative top line, hexagonal right cut, colored gradient fill).
 *      Recolored to blue (MP) and yellow (Energy) via hue rotation of the
 *      original green pixels.
 *
 *   2. Values box = "pezzi valori barre e lv.svg" (viewBox 110×30) — a dark
 *      #303030 rectangular box with:
 *        - Left section (0-35px): contains "/" — this is where current/max
 *          values are placed (e.g. "300/300")
 *        - Right section (35-110px): contains "LV:" — this is where the
 *          level number is placed
 *      A vertical #151515 separator line divides the two sections.
 *
 * Per the SAO canon:
 *   - HP and MP bars show ONLY the values box (left section, no LV)
 *   - Energy bar (the last one) shows the FULL values box (values + LV)
 *   - The standalone LV badge below the bars is REMOVED
 *
 * The bar type label (HP/MP/EN) is placed ABOVE each bar (small, top-left),
 * so it doesn't intersect with the colored fill or the values box.
 *
 * Player name uses the "bianco SAO" card style: #FBFBFB background with
 * #1a2a3a dark text and angular clip-path (matching the gender cards).
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
      {/* Player name — "bianco SAO" style matching the gender cards:
          #FBFBFB background with #1a2a3a dark text, angular clip-path,
          subtle blue border accent. */}
      {playerName && (
        <div
          className="mb-1.5 inline-block px-2.5 py-0.5 text-[0.65rem] tracking-[0.25em]"
          style={{
            color: '#1a2a3a',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            background: '#FBFBFB',
            border: '1px solid rgba(43, 115, 179, 0.5)',
            clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
            boxShadow: '0 0 8px rgba(43, 115, 179, 0.3)',
          }}
        >
          {playerName.toUpperCase()}
        </div>
      )}

      <div className="relative flex flex-col gap-[2px]">
        <SaoBar type="hp" current={hp.current} max={hp.max} mounted={mounted} showLevel={false} level={level} />
        <SaoBar type="mp" current={mp.current} max={mp.max} mounted={mounted} showLevel={false} level={level} />
        <SaoBar type="energy" current={energy.current} max={energy.max} mounted={mounted} showLevel={true} level={level} />
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
}: {
  type: BarType;
  current: number;
  max: number;
  mounted: boolean;
  showLevel: boolean;
  level: number;
}) {
  const config = BAR_CONFIG[type];
  const pct = Math.max(0, Math.min(1, current / max));
  // Inset percentage from the right (how much to hide)
  const hidePct = (1 - pct) * 100;

  const displayCurrent = String(current).padStart(3, '0');
  const displayMax = String(max).padStart(3, '0');

  return (
    <div className="relative flex items-stretch gap-1.5" style={{ width: 'min(420px, 40vw)' }}>
      {/* ===== Bar (using [Blank] 2.png as background) ===== */}
      <div className="relative flex-1" style={{ aspectRatio: '1620 / 258' }}>
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
            so it doesn't intersect with the colored fill or values box. */}
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

      {/* ===== Values box (pezzi valori barre e lv.svg) =====
          The SVG has viewBox 110×30. Left section (0-35) holds the values
          with "/", right section (35-110) holds "LV:".
          - For HP/MP: show only the left section (clip to 0-31.8%)
          - For Energy: show the full box (values + LV) */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{
          width: showLevel ? '24%' : '11%',
          aspectRatio: showLevel ? '110 / 30' : '35 / 30',
          alignSelf: 'center',
          height: '60%',
        }}
      >
        {/* The values SVG — for HP/MP (no level), we show only the left section
            by making the image wider (314%) and clipping via overflow:hidden
            on the parent. For Energy, we show the full SVG at 100% width. */}
        <img
          src="/sao/hpbar/pezzi valori barre e lv.svg"
          alt=""
          className="absolute inset-0 h-full"
          draggable={false}
          aria-hidden
          style={{
            width: showLevel ? '100%' : '314%', // 110/35 ≈ 3.14x to show only left part
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
            fontSize: 'clamp(0.5rem, 1vw, 0.7rem)',
            letterSpacing: '0.05em',
            textShadow: '0 1px 1px rgba(0,0,0,0.9)',
            // For Energy, restrict to left section (31.8% of width)
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
              fontSize: 'clamp(0.5rem, 1vw, 0.7rem)',
              letterSpacing: '0.05em',
              textShadow: '0 0 6px rgba(235, 166, 1, 0.6)',
            }}
          >
            {String(level).padStart(2, '0')}
          </div>
        )}
      </div>
    </div>
  );
}
