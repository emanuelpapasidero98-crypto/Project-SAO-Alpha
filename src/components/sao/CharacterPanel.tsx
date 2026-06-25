'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import { STATS, type Gender } from '@/lib/sao-data';

/**
 * SAO Character Panel — shown when the user clicks "Personaggio" in the menu.
 *
 * Animation (from Progetto-SAO/qml/PanelView.qml):
 *   OPEN:
 *     - opacity: 0 → 1 over 500ms
 *     - panelClip width/height: 80 → full over 400ms with easing OutQuart
 *     - sound after 300ms delay
 *   CLOSE:
 *     - opacity: 1 → 0 over 250ms
 *     - panelClip width/height collapse over 250ms
 *
 * Layout:
 *   - Background overlay: rgba(2,8,20,0.6) with backdrop-blur (the game
 *     world is dimmed when the panel is open)
 *   - Card: white SAO style (#FBFBFB) with angular clip-path corners,
 *     matching the gender selection cards
 *   - LEFT side: avatar in a SAO-style box (using the canonical
 *     "Parte interna finestra" gray #D6D6D6 background), with stats below
 *   - RIGHT side: character name + level + XP progress + full stat list
 *     with the 7 canonical stat icons (Forza, Vita, Agilità, Destrezza,
 *     Intelligenza, Mente, Resistenza)
 *
 * All assets used:
 *   - SAO_Man.svg / SAO_Woman.svg (avatar)
 *   - Stats PNG icons (Forza.png, Vita.png, ecc.) from asset-gioco-di-SAO
 *   - Font SAO UI (SAOUI-Regular.otf)
 *   - Colors: #FBFBFB, #D6D6D6, #2B73B3, #EBA601, #1a2a3a
 *
 * No graphics are invented — only existing assets are used.
 */

interface CharacterPanelProps {
  open: boolean;
  onClose: () => void;
  playerName: string;
  gender: Gender;
  level: number;
  stats: Record<string, number>;
  /** Current XP and XP needed for next level */
  xp: { current: number; needed: number };
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

  const xpPct = Math.min(100, (xp.current / xp.needed) * 100);

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
              opacity 0→1 (500ms) + scale/clip expand (400ms OutQuart) */}
          <motion.div
            className="relative"
            style={{
              width: 'min(900px, 95vw)',
              maxHeight: '90vh',
              overflow: 'hidden',
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
            {/* Card body — white SAO style with angular clip-path
                (matching the gender selection cards) */}
            <div
              className="relative w-full"
              style={{
                background: '#FBFBFB',
                clipPath:
                  'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(43, 115, 179, 0.3)',
              }}
            >
              {/* Top accent bar (canonical SAO #A8A8A8 separator) */}
              <div
                className="h-1.5 w-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)',
                }}
              />

              {/* Close button (top-right, using the red X circle SVG) */}
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

              {/* Title (top-center) */}
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

              {/* Main content: 2 columns (avatar+stats | details) */}
              <div className="grid md:grid-cols-[300px_1fr] gap-0">
                {/* ===== LEFT: Avatar box + sub-stats ===== */}
                <div
                  className="p-6 flex flex-col items-center"
                  style={{
                    background: '#D6D6D6',
                    borderRight: '1px solid #A8A8A8',
                  }}
                >
                  {/* Avatar box — SAO style with metallic border
                      (matching the bar value box aesthetic: #303030 + #151515 + #5a5a5a) */}
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
                    {/* Avatar SVG (SAO_Man or SAO_Woman) */}
                    <img
                      src={`/sao/characters/${gender.svg}`}
                      alt={gender.label}
                      className="w-full h-full object-contain"
                      draggable={false}
                      style={{
                        filter: 'drop-shadow(0 0 10px rgba(43, 115, 179, 0.5))',
                      }}
                    />
                    {/* Gender color accent at bottom of avatar box */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1"
                      style={{
                        background: gender.glowColor,
                        boxShadow: `0 0 8px ${gender.glowColor}`,
                      }}
                    />
                  </div>

                  {/* Player name + level under avatar */}
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
                        color: '#EBA601',
                        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        fontWeight: 400,
                        fontSize: '0.75rem',
                        textShadow: '0 0 4px rgba(235, 166, 1, 0.4)',
                      }}
                    >
                      LV {String(level).padStart(2, '0')}
                    </p>
                  </div>

                  {/* Sub-stats (gender + class info) — small SAO-style box */}
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
                      <span
                        style={{
                          color: 'rgba(26, 42, 58, 0.6)',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                          fontWeight: 400,
                          fontSize: '0.65rem',
                          letterSpacing: '0.15em',
                        }}
                      >
                        GENERE
                      </span>
                      <span
                        style={{
                          color: '#1a2a3a',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                          fontWeight: 400,
                          fontSize: '0.7rem',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {gender.label.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        style={{
                          color: 'rgba(26, 42, 58, 0.6)',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                          fontWeight: 400,
                          fontSize: '0.65rem',
                          letterSpacing: '0.15em',
                        }}
                      >
                        SISTEMA
                      </span>
                      <span
                        style={{
                          color: '#1a2a3a',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                          fontWeight: 400,
                          fontSize: '0.7rem',
                          letterSpacing: '0.1em',
                        }}
                      >
                        NERVEGEAR
                      </span>
                    </div>
                  </div>
                </div>

                {/* ===== RIGHT: Stats + XP ===== */}
                <div className="p-6 flex flex-col gap-5">
                  {/* XP section */}
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span
                        style={{
                          color: 'rgba(26, 42, 58, 0.7)',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                          fontWeight: 400,
                          fontSize: '0.7rem',
                          letterSpacing: '0.25em',
                        }}
                      >
                        ESPERIENZA
                      </span>
                      <span
                        style={{
                          color: '#1a2a3a',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                          fontWeight: 400,
                          fontSize: '0.75rem',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {xp.current} / {xp.needed} EXP
                      </span>
                    </div>
                    {/* XP bar — SAO style (dark #303030 box with metallic border) */}
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
                        animate={{ width: `${xpPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                      />
                      {/* XP text overlay */}
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
                        {xpPct.toFixed(0)}% — MANCANO {xp.needed - xp.current} EXP
                      </div>
                    </div>
                  </div>

                  {/* Stats grid — 7 stats with canonical icons */}
                  <div>
                    <p
                      className="mb-3 tracking-[0.3em]"
                      style={{
                        color: 'rgba(26, 42, 58, 0.7)',
                        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        fontWeight: 400,
                        fontSize: '0.7rem',
                        letterSpacing: '0.25em',
                      }}
                    >
                      STATISTICHE
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {STATS.map((stat) => {
                        const value = stats[stat.id] ?? 1;
                        return (
                          <div
                            key={stat.id}
                            className="flex items-center gap-2 px-2 py-1.5"
                            style={{
                              background: 'rgba(48, 48, 48, 0.08)',
                              border: '1px solid rgba(43, 115, 179, 0.3)',
                              clipPath:
                                'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                            }}
                            title={stat.description}
                          >
                            {/* Stat icon (from asset-gioco-di-SAO/1_Menu-1/Icone statistiche/) */}
                            <img
                              src={`/sao/stats/${stat.icon}`}
                              alt={stat.name}
                              className="w-6 h-6 flex-shrink-0"
                              draggable={false}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between">
                                <span
                                  style={{
                                    color: 'rgba(26, 42, 58, 0.7)',
                                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                    fontWeight: 400,
                                    fontSize: '0.6rem',
                                    letterSpacing: '0.15em',
                                  }}
                                >
                                  {stat.id}
                                </span>
                                <span
                                  style={{
                                    color: '#1a2a3a',
                                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                    fontWeight: 400,
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  {value}
                                </span>
                              </div>
                              {/* Mini progress bar (value / 20 for visual) */}
                              <div
                                className="h-0.5 mt-0.5 overflow-hidden"
                                style={{ background: 'rgba(26, 42, 58, 0.15)' }}
                              >
                                <motion.div
                                  className="h-full"
                                  style={{
                                    background:
                                      'linear-gradient(90deg, #2B73B3, #5CC4F0)',
                                    boxShadow: '0 0 4px rgba(43, 115, 179, 0.6)',
                                  }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, (value / 20) * 100)}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Equipment preview (using canonical equipment icons) */}
                  <div>
                    <p
                      className="mb-2 tracking-[0.3em]"
                      style={{
                        color: 'rgba(26, 42, 58, 0.7)',
                        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        fontWeight: 400,
                        fontSize: '0.7rem',
                        letterSpacing: '0.25em',
                      }}
                    >
                      EQUIPAGGIAMENTO
                    </p>
                    <div className="flex gap-2">
                      {['icon_sword.png', 'icon_light_armor.png', 'icon_accessory.png'].map((icon, i) => (
                        <div
                          key={i}
                          className="w-10 h-10 flex items-center justify-center"
                          style={{
                            background: 'rgba(48, 48, 48, 0.08)',
                            border: '1px solid rgba(43, 115, 179, 0.3)',
                            clipPath:
                              'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                          }}
                        >
                          <img
                            src={`/sao/equipment/${icon}`}
                            alt=""
                            className="w-7 h-7"
                            draggable={false}
                          />
                        </div>
                      ))}
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
