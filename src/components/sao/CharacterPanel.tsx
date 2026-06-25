'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import { STATS } from '@/lib/sao-data';
import type { Gender } from '@/lib/sao-data';
import {
  calcDerivedStats,
  calcMaxHp,
  calcMaxMp,
  calcMaxSp,
  calcXpToNext,
  STAT_META,
  getUnlockedBonuses,
  getNextBonus,
  type DerivedStats,
} from '@/lib/sao-stats-engine';
import type { PlayerStats } from '@/lib/sao-types';

/**
 * SAO Character Panel — shown when the user clicks "Personaggio" in the menu.
 *
 * Animation (from Progetto-SAO/qml/PanelView.qml):
 *   OPEN: opacity 0→1 (500ms) + scale 0.85→1 (400ms, OutQuart)
 *   CLOSE: opacity 1→0 (250ms) + scale 1→0.9
 *
 * VR hover effect on the card:
 *   - 3D tilt (rotateX/rotateY) following the mouse
 *   - Parallax depth (inner content shifts slightly)
 *   - Glow that follows the cursor
 *
 * All stats are computed using the SAO stats engine (lib/sao-stats-engine.ts):
 *   - calcDerivedStats() for attack/defense/dodge/crit/etc.
 *   - calcMaxHp/Mp/Sp() for resource pools
 *   - calcXpToNext() for XP requirements
 *   - getUnlockedBonuses() and getNextBonus() for milestone display
 *
 * Assets used (SOLO dai repo GitHub):
 *   - SAO_Man.svg / SAO_Woman.svg (avatar)
 *   - Stats PNG icons (Forza.png, Vita.png, ecc.)
 *   - Font SAO UI (SAOUI-Regular.otf)
 *   - Colors: #FBFBFB, #D6D6D6, #2B73B3, #EBA601, #1a2a3a, #303030
 */

interface CharacterPanelProps {
  open: boolean;
  onClose: () => void;
  playerName: string;
  gender: Gender;
  level: number;
  stats: PlayerStats;
  /** Current XP (absolute, not percentage) */
  xp: number;
}

export default function CharacterPanel({
  open,
  onClose,
  playerName,
  gender,
  level,
  stats,
  xp,
}: CharacterPanelProps) {
  const { play } = useSaoSound();
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });
  const [isHover, setIsHover] = useState(false);

  // Sound on open (after 300ms delay, per PanelView.qml pattern)
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => play('popupPanel', 0.4), 300);
      return () => clearTimeout(t);
    }
  }, [open, play]);

  // ESC key to close
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        play('dismissLauncher', 0.35);
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose, play]);

  // VR hover effect: 3D tilt + parallax following the mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 8; // -4..4 deg
    const rotX = -(py - 0.5) * 8;
    setTransform(
      `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.01, 1.01, 1.01)`
    );
    setLightPos({ x: px * 100, y: py * 100 });
  };

  const handleMouseEnter = () => {
    setIsHover(true);
    play('click', 0.15);
  };

  const handleMouseLeave = () => {
    setIsHover(false);
    setTransform('');
  };

  // === Compute derived stats using the SAO stats engine ===
  const derived: DerivedStats = calcDerivedStats(level, stats, {
    weaponCategory: 'none', // fists/no weapon equipped
  });
  const maxHp = calcMaxHp(level, stats.vit);
  const maxMp = calcMaxMp(level, stats.men);
  const maxSp = calcMaxSp(level, stats.res);
  const xpToNext = calcXpToNext(level);
  const xpRemaining = Math.max(0, xpToNext - xp);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            background: 'rgba(2, 8, 20, 0.7)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={onClose}
        >
          {/* Card container — animation from PanelView.qml:
              opacity 0→1 (500ms) + scale 0.85→1 (400ms OutQuart)
              + VR hover (3D tilt + parallax + cursor-following glow) */}
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="relative"
            style={{
              width: 'min(900px, 95vw)',
              maxHeight: '90vh',
              overflow: 'hidden',
              transform,
              transformStyle: 'preserve-3d',
              transition: 'transform 0.18s ease-out',
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              opacity: { duration: 0.5, ease: 'easeOut' },
              scale: {
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1], // OutQuart
              },
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* VR cursor-following glow overlay */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                opacity: isHover ? 1 : 0,
                background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, rgba(92, 196, 240, 0.18) 0%, transparent 50%)`,
                mixBlendMode: 'screen',
                zIndex: 50,
              }}
              aria-hidden
            />

            {/* Card body — white SAO style with angular clip-path */}
            <div
              className="relative w-full"
              style={{
                background: '#FBFBFB',
                clipPath:
                  'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
                boxShadow: isHover
                  ? '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(43, 115, 179, 0.5)'
                  : '0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(43, 115, 179, 0.3)',
                transition: 'box-shadow 0.25s',
              }}
            >
              {/* Top accent bar */}
              <div
                className="h-1.5 w-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)',
                }}
              />

              {/* Close button (top-right, red X circle) */}
              <button
                onClick={() => {
                  play('dismissLauncher', 0.35);
                  onClose();
                }}
                onMouseEnter={() => play('click', 0.2)}
                className="absolute top-3 right-3 z-10"
                style={{
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                }}
                aria-label="Chiudi"
              >
                <img
                  src="/sao/window/btn-red.svg"
                  alt="Chiudi"
                  className="w-full h-full"
                  draggable={false}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(190, 33, 86, 0.5))',
                  }}
                />
              </button>

              {/* Title */}
              <div
                className="px-8 pt-5 pb-3 text-center"
                style={{
                  background:
                    'linear-gradient(180deg, #EFEFEF 0%, #DFDFDF 100%)',
                  borderBottom: '1px solid #A8A8A8',
                }}
              >
                <h2
                  className="tracking-[0.4em]"
                  style={{
                    color: '#1a2a3a',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                    fontWeight: 400,
                    fontSize: 'clamp(1rem, 2vw, 1.4rem)',
                  }}
                >
                  STATO PERSONAGGIO
                </h2>
              </div>

              {/* Main content: 2 columns */}
              <div className="grid md:grid-cols-[300px_1fr] gap-0">
                {/* ===== LEFT: Avatar box + sub-stats ===== */}
                <div
                  className="p-6 flex flex-col items-center"
                  style={{
                    background: '#D6D6D6',
                    borderRight: '1px solid #A8A8A8',
                  }}
                >
                  {/* Avatar box — SAO style with metallic border */}
                  <div
                    className="relative mb-4"
                    style={{
                      width: '180px',
                      height: '240px',
                      background: '#303030',
                      border: '2px solid #151515',
                      boxShadow:
                        'inset 0 0 0 1px #5a5a5a, 0 4px 12px rgba(0,0,0,0.4)',
                      clipPath:
                        'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={`/sao/characters/${gender.svg}`}
                      alt={gender.label}
                      className="w-full h-full object-contain"
                      draggable={false}
                      style={{
                        filter: 'drop-shadow(0 0 10px rgba(43, 115, 179, 0.5))',
                      }}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1"
                      style={{
                        background: gender.glowColor,
                        boxShadow: `0 0 8px ${gender.glowColor}`,
                      }}
                    />
                  </div>

                  {/* Player name + level (LV 1, black, bold, relief effect) */}
                  <div className="text-center mb-4">
                    <p
                      className="tracking-[0.3em]"
                      style={{
                        color: '#1a2a3a',
                        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        fontWeight: 400,
                        fontSize: '1rem',
                      }}
                    >
                      {playerName.toUpperCase()}
                    </p>
                    <p
                      className="mt-1 tracking-[0.2em]"
                      style={{
                        color: '#000000',
                        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        // Relief effect: light shadow top-left, dark shadow bottom-right
                        textShadow:
                          '1px 1px 0 rgba(255,255,255,0.7), -1px -1px 1px rgba(0,0,0,0.4), 0 0 2px rgba(0,0,0,0.3)',
                      }}
                    >
                      LV {level}
                    </p>
                  </div>

                  {/* Sub-stats (gender + system) */}
                  <div
                    className="w-full p-3"
                    style={{
                      background: 'rgba(48, 48, 48, 0.08)',
                      border: '1px solid rgba(43, 115, 179, 0.3)',
                      clipPath:
                        'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                    }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span style={subStatLabelStyle}>GENERE</span>
                      <span style={subStatValueStyle}>
                        {gender.label.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span style={subStatLabelStyle}>SISTEMA</span>
                      <span style={subStatValueStyle}>NERVEGEAR</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span style={subStatLabelStyle}>HP MAX</span>
                      <span style={subStatValueStyle}>{maxHp}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span style={subStatLabelStyle}>MP MAX</span>
                      <span style={subStatValueStyle}>{maxMp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span style={subStatLabelStyle}>ENERGIA MAX</span>
                      <span style={subStatValueStyle}>{maxSp}</span>
                    </div>
                  </div>
                </div>

                {/* ===== RIGHT: XP + Stats + Derived ===== */}
                <div className="p-6 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '80vh' }}>
                  {/* XP section — NO percentage, just numeric values */}
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span style={sectionLabelStyle}>ESPERIENZA</span>
                      <span style={sectionValueStyle}>
                        {xp} / {xpToNext} EXP
                      </span>
                    </div>
                    {/* XP bar — SAO style */}
                    <div
                      className="relative w-full h-5 overflow-hidden"
                      style={{
                        background: '#303030',
                        border: '2px solid #151515',
                        boxShadow: 'inset 0 0 0 1px #5a5a5a',
                        clipPath:
                          'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                      }}
                    >
                      <motion.div
                        className="h-full"
                        style={{
                          background:
                            'linear-gradient(90deg, #EBA601 0%, #FFD24D 100%)',
                          boxShadow: '0 0 8px rgba(235, 166, 1, 0.6)',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (xp / xpToNext) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                      />
                      {/* XP text overlay — numeric only, no percentage */}
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          color: '#FBFBFB',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                          fontWeight: 400,
                          fontSize: '0.6rem',
                          letterSpacing: '0.05em',
                          textShadow: '0 1px 1px rgba(0,0,0,0.9)',
                        }}
                      >
                        MANCANO {xpRemaining} EXP AL LIVELLO {level + 1}
                      </div>
                    </div>
                  </div>

                  {/* Stats grid — 7 stats with canonical icons (no white background) */}
                  <div>
                    <p className="mb-2" style={sectionLabelStyle}>STATISTICHE</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(STAT_META) as Array<keyof typeof STAT_META>).map((key) => {
                        const meta = STAT_META[key];
                        const value = stats[key];
                        const unlocked = getUnlockedBonuses(value, key);
                        const next = getNextBonus(value, key);
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-2 px-2 py-1.5"
                            style={{
                              background: 'rgba(48, 48, 48, 0.08)',
                              border: '1px solid rgba(43, 115, 179, 0.3)',
                              clipPath:
                                'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                            }}
                            title={meta.description}
                          >
                            {/* Stat icon — PNG with transparent background.
                                The icon has dark colors, so we put a light
                                circular background to make it visible. */}
                            <div
                              className="w-7 h-7 flex-shrink-0 flex items-center justify-center"
                              style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '2px',
                                border: '1px solid rgba(43, 115, 179, 0.2)',
                              }}
                            >
                              <img
                                src={meta.icon}
                                alt={meta.name}
                                className="w-5 h-5"
                                draggable={false}
                                style={{ objectFit: 'contain' }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between">
                                <span
                                  style={{
                                    color: meta.color,
                                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                    fontWeight: 400,
                                    fontSize: '0.6rem',
                                    letterSpacing: '0.15em',
                                  }}
                                >
                                  {meta.short}
                                </span>
                                <span
                                  style={{
                                    color: '#1a2a3a',
                                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                    fontWeight: 400,
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  {value}
                                </span>
                              </div>
                              {/* Mini progress bar toward next milestone */}
                              <div
                                className="h-0.5 mt-0.5 overflow-hidden"
                                style={{ background: 'rgba(26, 42, 58, 0.15)' }}
                              >
                                <motion.div
                                  className="h-full"
                                  style={{
                                    background: meta.color,
                                    boxShadow: `0 0 4px ${meta.color}`,
                                  }}
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: next
                                      ? `${Math.min(100, (value / next.pointsRequired) * 100)}%`
                                      : '100%',
                                  }}
                                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
                                />
                              </div>
                              {/* Next milestone hint */}
                              {next && (
                                <p
                                  className="mt-0.5"
                                  style={{
                                    color: 'rgba(26, 42, 58, 0.5)',
                                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                    fontWeight: 400,
                                    fontSize: '0.5rem',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  → {next.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Derived combat stats (from the SAO stats engine) */}
                  <div>
                    <p className="mb-2" style={sectionLabelStyle}>COMBATTIMENTO</p>
                    <div className="grid grid-cols-2 gap-2">
                      <DerivedStatBox label="ATTACCO" value={derived.attack} />
                      <DerivedStatBox label="DIFESA" value={derived.defense} />
                      <DerivedStatBox label="SCHIVATA" value={`${derived.dodge}%`} />
                      <DerivedStatBox label="CRITICO" value={`${derived.critChance}%`} />
                      <DerivedStatBox label="SCHIVATA PERF." value={`${derived.perfectDodgeChance}%`} />
                      <DerivedStatBox label="MISS AVV." value={`${derived.enemyMissChance}%`} />
                      <DerivedStatBox label="STORDIMENTO" value={`${derived.stunChance}%`} />
                      <DerivedStatBox label="DANNO SKILL" value={`+${Math.round((derived.skillDamageMult - 1) * 100)}%`} />
                    </div>
                  </div>

                  {/* Status resistances */}
                  <div>
                    <p className="mb-2" style={sectionLabelStyle}>RESISTENZE STATUS</p>
                    <div className="grid grid-cols-2 gap-2">
                      <DerivedStatBox label="BRUCIATO" value={`${derived.resistBurn}%`} />
                      <DerivedStatBox label="AVVELENATO" value={`${derived.resistPoison}%`} />
                      <DerivedStatBox label="CONGELATO" value={`${derived.resistFreeze}%`} />
                      <DerivedStatBox label="ADDORMENTATO" value={`${derived.resistSleep}%`} />
                    </div>
                  </div>

                  {/* Utility multipliers */}
                  <div>
                    <p className="mb-2" style={sectionLabelStyle}>BONUS UTILITY</p>
                    <div className="grid grid-cols-2 gap-2">
                      <DerivedStatBox label="XP BONUS" value={`+${Math.round((derived.xpMult - 1) * 100)}%`} />
                      <DerivedStatBox label="COL BONUS" value={`+${Math.round((derived.colMult - 1) * 100)}%`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom accent bar */}
              <div
                className="h-1.5 w-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)',
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Styles ---------- */

const subStatLabelStyle: React.CSSProperties = {
  color: 'rgba(26, 42, 58, 0.6)',
  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
  fontWeight: 400,
  fontSize: '0.65rem',
  letterSpacing: '0.15em',
};

const subStatValueStyle: React.CSSProperties = {
  color: '#1a2a3a',
  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
  fontWeight: 400,
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
};

const sectionLabelStyle: React.CSSProperties = {
  color: 'rgba(26, 42, 58, 0.7)',
  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
  fontWeight: 400,
  fontSize: '0.7rem',
  letterSpacing: '0.25em',
};

const sectionValueStyle: React.CSSProperties = {
  color: '#1a2a3a',
  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
  fontWeight: 400,
  fontSize: '0.75rem',
  letterSpacing: '0.05em',
};

/* ---------- Sub-components ---------- */

function DerivedStatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex items-center justify-between px-2 py-1.5"
      style={{
        background: 'rgba(48, 48, 48, 0.08)',
        border: '1px solid rgba(43, 115, 179, 0.3)',
        clipPath:
          'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
      }}
    >
      <span
        style={{
          color: 'rgba(26, 42, 58, 0.7)',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          fontWeight: 400,
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: '#1a2a3a',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          fontWeight: 400,
          fontSize: '0.75rem',
        }}
      >
        {value}
      </span>
    </div>
  );
}
