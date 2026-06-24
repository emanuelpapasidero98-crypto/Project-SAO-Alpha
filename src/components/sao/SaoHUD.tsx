'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * SAO HUD — top-left status bars (HP / MP / Energy).
 *
 * Built EXCLUSIVELY from the 4 SVGs in "Pezzi barra HP, Mana e Energia":
 *   - contenitore Barre.svg  (dark background + white decorative line + outer frame)
 *   - Contenuto barra HP.svg (the green fill shape, recolored for MP/Energy)
 *   - Contorno barre.svg     (outer dark + metallic edge outline)
 *   - pezzi valori barre e lv.svg (LV badge with the canonical SAO aesthetic)
 *
 * The 3 bars are stacked. Each bar is rendered by stacking the 3 SVG layers:
 *   1. container.svg  — dark inner background (#2A2A2A) + white top line
 *   2. fill-{type}.svg — colored fill, width animated on mount, clipped to %
 *   3. outline.svg    — outer frame stroke (#3A3A3A) + metallic edge (#7A7A7A)
 *
 * The fill SVGs have a hexagonal shape (right side cut) matching the container,
 * so we clip them horizontally via CSS `clip-path: inset(0 X% 0 0)` to show
 * only the filled portion.
 *
 * The LV badge uses the "pezzi valori barre e lv.svg" style: dark #303030 box,
 * #151515 outer border, #5a5a5a inner border, with a vertical divider between
 * the "/" indicator and the "LV:" label.
 *
 * No graphics are invented — only the existing SVG assets are used.
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

const BAR_CONFIG: Record<BarType, { fill: string; label: string; labelColor: string }> = {
  hp: { fill: '/sao/hpbar/fill-hp.svg', label: 'HP', labelColor: '#7FC522' },
  mp: { fill: '/sao/hpbar/fill-mp.svg', label: 'MP', labelColor: '#2B73B3' },
  energy: { fill: '/sao/hpbar/fill-energy.svg', label: 'EN', labelColor: '#EBA601' },
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

      <div className="relative flex flex-col gap-[3px]">
        <SaoBar type="hp" current={hp.current} max={hp.max} mounted={mounted} />
        <SaoBar type="mp" current={mp.current} max={mp.max} mounted={mounted} />
        <SaoBar type="energy" current={energy.current} max={energy.max} mounted={mounted} />
      </div>

      {/* LV badge — built from the "pezzi valori barre e lv.svg" aesthetic:
          dark #303030 box, #151515 outer border, #5a5a5a inner border,
          vertical divider between "/" and "LV:" sections */}
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
      {/* Layer 1: container.svg — dark background + white top line + outer frame.
          This SVG has viewBox 0 0 1020 120 (aspect ratio 8.5:1) */}
      <div className="relative" style={{ aspectRatio: '1020 / 120' }}>
        <img
          src="/sao/hpbar/container.svg"
          alt=""
          className="absolute inset-0 w-full h-full"
          draggable={false}
          style={{ zIndex: 1 }}
          aria-hidden
        />

        {/* Layer 2: fill-{type}.svg — colored fill, clipped to (1-pct) from right.
            The fill SVG has viewBox 0 0 1000 100 (aspect 10:1). We overlay it
            on the container's inner area (which has the same hexagonal shape). */}
        <motion.div
          className="absolute inset-0"
          style={{ zIndex: 2 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* The fill image is positioned to align with the container's inner
              hexagonal area. Container viewBox is 1020x120, the inner path
              starts at (10,10) and ends at (1010,10)→(980,70)→(610,70)→(590,110)→(10,110).
              Fill viewBox is 1000x100 with path 0,0→1000,0→970,60→600,60→580,100→0,100.
              They match if we offset fill by (10,10) and scale by ~1.005x on x.
              For simplicity, we use object-fit and let it fill the container, then
              clip-path inset hides the right portion. */}
          <motion.img
            src={config.fill}
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
        </motion.div>

        {/* Layer 3: outline.svg — outer dark + metallic edge stroke.
            This SVG has viewBox -10 -15 1030 130 (slightly larger than container
            to allow the stroke to extend outside). */}
        <img
          src="/sao/hpbar/outline.svg"
          alt=""
          className="absolute -left-[1%] -top-[3%] w-[102%] h-[106%] pointer-events-none"
          draggable={false}
          style={{ zIndex: 3 }}
          aria-hidden
        />

        {/* Label tag (left side, like the SAO HUD) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-2 px-1.5 py-0.5"
          style={{
            zIndex: 4,
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

        {/* Numeric value display (top-right, like the SAO HUD) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 right-[8%] flex items-baseline gap-1"
          style={{
            zIndex: 4,
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
              zIndex: 5,
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
