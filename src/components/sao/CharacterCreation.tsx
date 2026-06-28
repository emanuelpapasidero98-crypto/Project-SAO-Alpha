'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSaoSound } from '@/hooks/useSaoSound';
import { GENDERS, STATS, getStartingStats, type Gender } from '@/lib/sao-data';

interface CharacterCreationProps {
  onComplete: (data: { name: string; gender: Gender }) => void;
  onBack: () => void;
  onCardHover?: (coords: { x: number; y: number } | null) => void;
}

type Step = 'gender' | 'summary';

/**
 * Character Creation screen (SAO-style — NO CLASSES).
 *
 * SAO is a skill-based system: every avatar starts equal and grows through
 * play. So this screen only collects:
 *   Step 1: Gender (SAO_Man / SAO_Woman)
 *   Step 2: Name + stat overview
 *
 * Cards are styled after the SAO HUD aesthetic found in the asset repo:
 *   - Sharp angular shapes (clip-path with cut corners)
 *   - Color palette: #2B73B3 (blue) for male / #BE2156 (red) for female,
 *     #FBFBFB background, #A8A8A8 dividers — exactly like the
 *     SAO_UI-Window_blank.svg and Pulsante azzurro/rosso SVGs
 *   - Angular "spigolose" corners, not rounded
 *   - The SAO window SVG is used as the card chrome
 */
export default function CharacterCreation({ onComplete, onBack, onCardHover }: CharacterCreationProps) {
  const { play } = useSaoSound();
  const [step, setStep] = useState<Step>('gender');
  const [gender, setGender] = useState<Gender | null>(null);
  const [name, setName] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    play('popupMenu', 0.4);
    play('system', 0.25);
  }, [play]);

  // VR head-tracking parallax
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setParallax({
        x: (e.clientX - w / 2) / w,
        y: (e.clientY - h / 2) / h,
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const handleGenderSelect = (g: Gender) => {
    setGender(g);
    play('click', 0.6);
    setTimeout(() => {
      setStep('summary');
      play('popupPanel', 0.35);
    }, 250);
  };

  const handleComplete = () => {
    if (!name.trim()) {
      play('warning', 0.5);
      return;
    }
    play('present', 0.5);
    play('linkStartA', 0.5);
    onComplete({ name: name.trim(), gender: gender! });
  };

  const handleBack = () => {
    play('dismissLauncher', 0.4);
    if (step === 'summary') setStep('gender');
    else onBack();
  };

  return (
    <motion.div
      className="relative min-h-screen w-full flex flex-col items-center justify-start py-8 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Top header */}
      <motion.div
        className="w-full max-w-6xl flex items-center justify-between mb-6 z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={handleBack}
          onMouseEnter={() => play('click', 0.2)}
          className="text-cyan-200/70 hover:text-cyan-100 text-sm tracking-[0.2em] transition-colors flex items-center gap-2"
          style={{ fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif" }}
        >
          ◀ INDIETRO
        </button>
        <div className="text-cyan-200/70 text-xs tracking-[0.2em]" style={{ fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif" }}>
          STEP {step === 'gender' ? '1' : '2'} / 2
        </div>
      </motion.div>

      <div className="w-full max-w-6xl flex-1 flex items-start justify-center z-10">
        <AnimatePresence mode="wait">
          {step === 'gender' && (
            <motion.div
              key="gender"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <StepHeader
                title="SCEGLI IL TUO AVATAR"
                subtitle="Il tuo corpo ad Aincrad — generato dal sistema NerveGear"
              />
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-3xl mx-auto mt-8"
                style={{
                  transform: `translate3d(${parallax.x * 10}px, ${parallax.y * 10}px, 0)`,
                }}
              >
                {GENDERS.map((g) => (
                  <SaoCard
                    key={g.id}
                    glowColor={g.glowColor}
                    onHover={(coords) => {
                      setHoveredCard(g.id);
                      onCardHover?.(coords);
                      if (coords) play('click', 0.15);
                    }}
                    onLeave={() => {
                      setHoveredCard(null);
                      onCardHover?.(null);
                    }}
                    selected={gender?.id === g.id}
                    onClick={() => handleGenderSelect(g)}
                  >
                    <GenderCardContent gender={g} highlighted={hoveredCard === g.id} />
                  </SaoCard>
                ))}
              </div>

              {/* SAO-style info banner under the cards */}
              <motion.div
                className="max-w-3xl mx-auto mt-8 px-5 py-3"
                style={{
                  background: 'rgba(43, 115, 179, 0.15)',
                  border: '1px solid rgba(43, 115, 179, 0.5)',
                  clipPath:
                    'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p
                  className="text-cyan-100/80 text-xs sm:text-sm tracking-[0.15em] text-center"
                  style={{ fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif" }}
                >
                  IN SAO OGNI AVATAR NASCE UGUALE — LE ABILITÀ SI SVILUPPANO GIOCANDO
                </p>
              </motion.div>
            </motion.div>
          )}

          {step === 'summary' && gender && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-3xl"
            >
              <StepHeader
                title="RIEPILOGO PERSONAGGIO"
                subtitle="Conferma i dettagli del tuo avatar prima di entrare ad Aincrad"
              />

              {/* SAO-style summary card with VR hover effect (same as gender cards) */}
              <SaoCard
                glowColor={gender.glowColor}
                onHover={(coords) => onCardHover?.(coords)}
                onLeave={() => onCardHover?.(null)}
                selected={false}
                onClick={() => play('click', 0.2)}
              >
                <div className="grid md:grid-cols-[200px_1fr] gap-5 p-5 sm:p-6">
                  {/* Character preview */}
                  <div className="flex flex-col items-center">
                    <div
                      className="relative w-full aspect-[137/316] max-w-[150px]"
                      style={{
                        filter: 'drop-shadow(0 0 25px rgba(43, 115, 179, 0.5))',
                      }}
                    >
                      <img
                        src={`/sao/characters/${gender.svg}`}
                        alt={gender.label}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p
                      className="mt-4 tracking-[0.3em] text-sm"
                      style={{
                        color: '#1a2a3a',
                        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                      }}
                    >
                      {gender.label.toUpperCase()}
                    </p>
                    {/* Gender color badge — matches the SAO blue/red palette */}
                    <div
                      className="mt-3 w-12 h-1.5"
                      style={{
                        background: gender.glowColor,
                        boxShadow: `0 0 12px ${gender.glowColor}`,
                      }}
                    />
                  </div>

                  {/* Details + name + stats */}
                  <div className="flex flex-col gap-5">
                    <div>
                      <label
                        htmlFor="char-name"
                        className="block text-[0.65rem] tracking-[0.3em] mb-2"
                        style={{
                          color: 'rgba(26, 42, 58, 0.7)',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        }}
                      >
                        NOME PERSONAGGIO
                      </label>
                      <input
                        id="char-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => play('click', 0.15)}
                        maxLength={20}
                        placeholder="es. Kirito, Asuna, Klein..."
                        className="w-full px-3 py-2 outline-none transition"
                        style={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          color: '#1a2a3a',
                          border: '1px solid rgba(43, 115, 179, 0.6)',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                          fontWeight: 400,
                          letterSpacing: '0.04em',
                          clipPath:
                            'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                          caretColor: '#0682BE',
                        }}
                      />
                    </div>

                    <div>
                      <p
                        className="text-[0.65rem] tracking-[0.3em] mb-2"
                        style={{
                          color: 'rgba(26, 42, 58, 0.7)',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        }}
                      >
                        GENERE
                      </p>
                      <p className="text-sm" style={{ color: '#1a2a3a' }}>
                        {gender.label}{' '}
                        <span style={{ color: 'rgba(26, 42, 58, 0.55)', fontSize: '0.7rem' }}>
                          — {gender.description}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p
                        className="text-[0.65rem] tracking-[0.3em] mb-1"
                        style={{
                          color: 'rgba(26, 42, 58, 0.7)',
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        }}
                      >
                        STATISTICHE INIZIALI
                      </p>
                      <p
                        className="text-[0.6rem] tracking-wider mb-3"
                        style={{ color: 'rgba(26, 42, 58, 0.5)' }}
                      >
                        Tutti gli avatar iniziano con le stesse statistiche base
                      </p>
                      <StatsGrid />
                    </div>
                  </div>
                </div>

                {/* Confirm buttons */}
                <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex justify-end gap-3">
                  <button
                    onClick={handleBack}
                    onMouseEnter={() => play('click', 0.2)}
                    className="px-5 py-2 text-sm tracking-[0.2em] transition"
                    style={{
                      color: 'rgba(26, 42, 58, 0.7)',
                      fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                    }}
                  >
                    MODIFICA
                  </button>
                  <SaoButton onClick={handleComplete} hoverSound>
                    ENTRA AD AINCRAD →
                  </SaoButton>
                </div>
              </SaoCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ---------- Sub-components ---------- */

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center mb-4">
      <motion.h3
        className="tracking-[0.35em] font-light"
        style={{
          fontSize: 'clamp(1rem, 2.4vw, 1.6rem)',
          color: '#FBFBFB',
          textShadow: '1px 1px 0 #C0C0C0, -1px -1px 0 #C0C0C0, 1px -1px 0 #C0C0C0, -1px 1px 0 #C0C0C0, 0 0 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
        }}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {title}
      </motion.h3>
      <p
        className="text-cyan-100/50 text-xs sm:text-sm tracking-[0.2em] mt-2"
        style={{ fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif" }}
      >
        {subtitle}
      </p>
    </div>
  );
}

/**
 * SAO-style angular card.
 *
 * Visual reference: SAO_UI-Window_blank.svg + Pulsante azzurro/rosso SVGs.
 * - Sharp corners with diagonal cuts (clip-path)
 * - #2B73B3 (blue) or #BE2156 (red) accent border
 * - Light translucent background like the SAO notification window
 * - 3D tilt on hover with cursor-following spotlight
 * - The window SVG is layered behind the content as chrome
 */
interface SaoCardProps {
  children: React.ReactNode;
  glowColor: string;
  onHover: (coords: { x: number; y: number } | null) => void;
  onLeave: () => void;
  selected: boolean;
  onClick: () => void;
}

function SaoCard({ children, glowColor, onHover, onLeave, selected, onClick }: SaoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('');
  const [lightPos, setLightPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHover, setIsHover] = useState(false);

  // Angular clip-path: top-left + bottom-right cut at 16px
  const saoClip =
    'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)';

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 14;
    const rotX = -(py - 0.5) * 14;
    setTransform(
      `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.025,1.025,1.025)`,
    );
    setLightPos({ x: px * 100, y: py * 100 });
  };

  const handleEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHover(true);
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onHover({
      x: ((e.clientX - rect.left + rect.left) / window.innerWidth) * 2 - 1,
      y: -(((e.clientY - rect.top + rect.top) / window.innerHeight) * 2 - 1),
    });
  };

  const handleLeave = () => {
    setIsHover(false);
    setTransform('');
    onLeave();
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={onClick}
      className="relative cursor-pointer group"
      style={{
        transform,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.18s ease-out',
        clipPath: saoClip,
        background: 'rgba(251, 251, 251, 0.95)',
        border: `2px solid ${selected ? glowColor : 'rgba(43, 115, 179, 0.4)'}`,
        boxShadow: selected
          ? `0 0 30px ${glowColor}, 0 0 60px ${glowColor}66, inset 0 0 20px ${glowColor}22`
          : isHover
            ? `0 0 25px ${glowColor}99, 0 0 50px ${glowColor}44, inset 0 0 15px ${glowColor}22`
            : '0 0 10px rgba(43, 115, 179, 0.2), inset 0 0 4px rgba(43, 115, 179, 0.1)',
      }}
    >
      {/* SAO-style top accent bar (like the #A8A8A8 separator in window SVG) */}
      <div
        className="h-2 w-full"
        style={{
          background: isHover || selected
            ? `linear-gradient(90deg, transparent, ${glowColor} 30%, ${glowColor} 70%, transparent)`
            : 'linear-gradient(90deg, transparent, #A8A8A8 30%, #A8A8A8 70%, transparent)',
          transition: 'background 0.25s',
        }}
      />

      {/* Cursor-following 3D spotlight */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHover ? 1 : 0,
          background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, ${glowColor}55 0%, transparent 55%)`,
          mixBlendMode: 'multiply',
        }}
      />

      <div className="relative" style={{ transform: 'translateZ(40px)' }}>
        {children}
      </div>

      {/* Bottom accent bar */}
      <div
        className="h-2 w-full"
        style={{
          background: isHover || selected
            ? `linear-gradient(90deg, transparent, ${glowColor} 30%, ${glowColor} 70%, transparent)`
            : 'linear-gradient(90deg, transparent, #A8A8A8 30%, #A8A8A8 70%, transparent)',
          transition: 'background 0.25s',
        }}
      />

      {/* SAO-style corner accents (small triangles at cut corners) */}
      <div
        className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
        style={{
          background: selected || isHover ? glowColor : 'rgba(43, 115, 179, 0.5)',
          clipPath: 'polygon(0 0, 16px 0, 0 16px)',
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none"
        style={{
          background: selected || isHover ? glowColor : 'rgba(43, 115, 179, 0.5)',
          clipPath: 'polygon(100% 100%, calc(100% - 16px) 100%, 100% calc(100% - 16px))',
        }}
      />
    </motion.div>
  );
}

function GenderCardContent({ gender, highlighted }: { gender: Gender; highlighted: boolean }) {
  return (
    <div className="flex flex-col items-center p-5 sm:p-6 min-h-[280px] justify-center">
      <div
        className="relative w-full aspect-[137/316] max-w-[130px] transition-transform duration-300"
        style={{
          filter: highlighted
            ? `drop-shadow(0 0 25px ${gender.glowColor})`
            : 'drop-shadow(0 0 10px rgba(43, 115, 179, 0.4))',
          transform: highlighted ? 'scale(1.08)' : 'scale(1)',
        }}
      >
        <img
          src={`/sao/characters/${gender.svg}`}
          alt={gender.label}
          className="w-full h-full object-contain"
        />
      </div>
      <h4
        className="mt-6 tracking-[0.3em] font-light"
        style={{
          fontSize: 'clamp(1rem, 1.8vw, 1.4rem)',
          color: '#1a2a3a',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
        }}
      >
        {gender.label.toUpperCase()}
      </h4>
      <p
        className="text-[0.65rem] tracking-[0.2em] mt-2 text-center"
        style={{
          color: 'rgba(26, 42, 58, 0.55)',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
        }}
      >
        {gender.description}
      </p>

      {/* SAO-style circular indicator (like the rings in Pulsante azzurro/rosso) */}
      <div
        className="mt-4 relative w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          border: `2px solid ${gender.glowColor}`,
          boxShadow: highlighted ? `0 0 12px ${gender.glowColor}` : 'none',
        }}
      >
        <div
          className="w-4 h-4 rounded-full transition-transform duration-300"
          style={{
            background: gender.glowColor,
            transform: highlighted ? 'scale(1.3)' : 'scale(1)',
          }}
        />
      </div>
    </div>
  );
}

function StatsGrid() {
  const stats = getStartingStats();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {STATS.map((s) => {
        const value = stats[s.key] ?? 0;
        const max = 10;
        return (
          <div
            key={s.id}
            className="flex items-center gap-2 px-2 py-1.5"
            title={s.description}
            style={{
              background: 'rgba(43, 115, 179, 0.08)',
              border: '1px solid rgba(43, 115, 179, 0.35)',
              clipPath:
                'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
            }}
          >
            <img src={`/sao/stats/${s.icon}`} alt={s.name} className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between">
                <span
                  className="text-[0.6rem] tracking-wider"
                  style={{
                    color: 'rgba(26, 42, 58, 0.7)',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                  }}
                >
                  {s.id}
                </span>
                <span
                  className="text-sm"
                  style={{
                    color: '#0682BE',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                    fontWeight: 400,
                  }}
                >
                  {value}
                </span>
              </div>
              <div className="h-1 overflow-hidden mt-0.5" style={{ background: 'rgba(26, 42, 58, 0.15)' }}>
                <div
                  className="h-full"
                  style={{
                    width: `${(value / max) * 100}%`,
                    background: 'linear-gradient(90deg, #2B73B3, #5CC4F0)',
                    boxShadow: '0 0 6px rgba(43, 115, 179, 0.7)',
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * SAO-style angular button (matches the Pulsante azzurro aesthetic).
 */
function SaoButton({
  children,
  onClick,
  hoverSound = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  hoverSound?: boolean;
}) {
  const { play } = useSaoSound();
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => hoverSound && play('click', 0.3)}
      className="relative px-7 py-2.5 text-white tracking-[0.25em] text-sm transition-all hover:scale-[1.03]"
      style={{
        background: 'linear-gradient(135deg, #5CC4F0 0%, #2B73B3 60%, #0682BE 100%)',
        boxShadow: '0 0 25px rgba(43,115,179,0.7), inset 0 0 10px rgba(255,255,255,0.25)',
        border: '1px solid rgba(255,255,255,0.6)',
        clipPath:
          'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
        fontWeight: 400,
      }}
    >
      {children}
    </button>
  );
}
