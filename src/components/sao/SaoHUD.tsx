'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
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
  /** Quando true, il componente è position:relative invece di fixed (per uso dentro altri container) */
  embedded?: boolean;
  /** Scala delle barre (default 1, usare 0.6-0.7 per versione compatta) */
  scale?: number;
  /** Quando true, ogni barra ha il suo VR hover individuale */
  perBarHover?: boolean;
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
  embedded = false,
  scale = 1,
  perBarHover = false,
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
      className={embedded ? "relative z-30 select-none" : "fixed top-4 left-4 z-30 select-none"}
      initial={embedded ? false : { opacity: 0, x: -30, y: -10 }}
      animate={embedded ? {} : { opacity: 1, x: 0, y: 0 }}
      transition={embedded ? {} : { duration: 0.6, ease: 'easeOut', delay: 0.2 }}
      style={embedded ? { transform: `scale(${scale})`, transformOrigin: 'top left' } : { transform: `scale(${scale})`, transformOrigin: 'top left' }}
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
          perBarHover={perBarHover}
        />
        <SaoBar
          type="mp"
          current={mp.current}
          max={mp.max}
          mounted={mounted}
          showLevel={false}
          level={level}
          perBarHover={perBarHover}
        />
        <SaoBar
          type="energy"
          current={energy.current}
          max={energy.max}
          mounted={mounted}
          showLevel={true}
          level={level}
          perBarHover={perBarHover}
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
  perBarHover = false,
}: {
  type: BarType;
  current: number;
  max: number;
  mounted: boolean;
  showLevel: boolean;
  level: number;
  playerName?: string;
  perBarHover?: boolean;
}) {
  const config = BAR_CONFIG[type];
  const pct = Math.max(0, Math.min(1, current / max));
  const hidePct = (1 - pct) * 100;
  const displayCurrent = String(current);
  const displayMax = String(max);

  // VR hover per singola barra
  const barRef = useRef<HTMLDivElement>(null);
  const [barHover, setBarHover] = useState<{ tilt: string; lightX: number; lightY: number } | null>(null);
  const barRafRef = useRef<number | null>(null);

  const handleBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!perBarHover) return;
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    if (barRafRef.current !== null) cancelAnimationFrame(barRafRef.current);
    barRafRef.current = requestAnimationFrame(() => {
      setBarHover({
        tilt: `perspective(400px) rotateX(${-(py - 0.5) * 12}deg) rotateY(${(px - 0.5) * 12}deg) scale3d(1.03, 1.03, 1.03)`,
        lightX: px * 100,
        lightY: py * 100,
      });
      barRafRef.current = null;
    });
  };

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
    textShadow: '1px 1px 0 #C0C0C0, -1px -1px 0 #C0C0C0, 1px -1px 0 #C0C0C0, -1px 1px 0 #C0C0C0, 0 0 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    lineHeight: 1,
  };

  return (
    <div
      ref={barRef}
      onMouseMove={handleBarMouseMove}
      onMouseLeave={() => { if (perBarHover) { setBarHover(null); if (barRafRef.current) cancelAnimationFrame(barRafRef.current); } }}
      className="relative"
      style={{
        width: 'min(420px, 40vw)',
        transform: perBarHover ? barHover?.tilt : undefined,
        transformStyle: perBarHover ? 'preserve-3d' : undefined,
        transition: perBarHover ? 'transform 0.15s ease-out' : undefined,
        willChange: perBarHover && barHover ? 'transform' : 'auto',
      }}
    >
      {/* VR glow per singola barra */}
      {perBarHover && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: barHover ? 1 : 0,
            background: `radial-gradient(circle at ${barHover?.lightX ?? 50}% ${barHover?.lightY ?? 50}%, ${config.labelColor}22 0%, transparent 50%)`,
            mixBlendMode: 'screen',
            zIndex: 10,
          }}
        />
      )}
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
            textShadow: '1px 1px 0 #C0C0C0, -1px -1px 0 #C0C0C0, 1px -1px 0 #C0C0C0, -1px 1px 0 #C0C0C0, 0 0 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          {playerName.toUpperCase()}
        </div>
      )}

      {/* Bar type label (HP/MP/EN) — placed ABOVE the bar.
          OUTSIDE the clipped div so it's never affected by clip-path. */}
      <div
        className="absolute left-1 px-1 z-10"
        style={{
          top: '-0.75rem',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          fontWeight: 400,
          fontSize: '0.55rem',
          letterSpacing: '0.25em',
          color: config.labelColor,
          textShadow: '1px 1px 0 #C0C0C0, -1px -1px 0 #C0C0C0, 1px -1px 0 #C0C0C0, -1px 1px 0 #C0C0C0, 0 0 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
          lineHeight: 1,
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        {config.label}
      </div>

      {/* Bar (using [Blank] 2.png as background) */}
      {/* On HP/MP we clip away ONLY the LV box area (x=84-100%, y=52-100%)
          to hide the empty LV slot. The label above is NOT affected because
          it's a sibling, not a child, of this clipped div.
          Energy bar is NOT clipped (LV number is shown there). */}
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
              textShadow: '1px 1px 0 #C0C0C0, -1px -1px 0 #C0C0C0, 1px -1px 0 #C0C0C0, -1px 1px 0 #C0C0C0, 0 0 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
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
