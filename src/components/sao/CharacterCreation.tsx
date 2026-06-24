'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSaoSound } from '@/hooks/useSaoSound';
import { CLASSES, GENDERS, STATS, getStartingStats, type CharacterClass, type Gender } from '@/lib/sao-data';

interface CharacterCreationProps {
  onComplete: (data: { name: string; gender: Gender; classId: string }) => void;
  onBack: () => void;
  /** Notify parent when a card is hovered, so the particle background can react */
  onCardHover?: (coords: { x: number; y: number } | null) => void;
}

type Step = 'gender' | 'class' | 'summary';

/**
 * Character Creation screen.
 *
 * Two main steps:
 * 1) Choose avatar gender (SAO_Man / SAO_Woman)
 * 2) Choose class (6 equipment icons)
 * 3) Summary & confirmation
 *
 * Cards have 3D tilt-on-hover (perspective + rotateX/rotateY), a moving
 * spotlight that simulates a 3D light, and react to mouse position.
 */
export default function CharacterCreation({ onComplete, onBack, onCardHover }: CharacterCreationProps) {
  const { play } = useSaoSound();
  const [step, setStep] = useState<Step>('gender');
  const [gender, setGender] = useState<Gender | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    // Welcome sound on entry
    play('popupMenu', 0.4);
    play('system', 0.25);
  }, [play]);

  const handleGenderSelect = (g: Gender) => {
    setGender(g);
    play('click', 0.6);
    setTimeout(() => {
      setStep('class');
      play('popupPanel', 0.35);
    }, 250);
  };

  const handleClassSelect = (c: CharacterClass) => {
    setClassId(c.id);
    play('click', 0.6);
    setTimeout(() => {
      setStep('summary');
      play('system', 0.35);
    }, 250);
  };

  const handleComplete = () => {
    if (!name.trim()) {
      play('warning', 0.5);
      return;
    }
    play('present', 0.5);
    play('linkStartA', 0.5);
    onComplete({ name: name.trim(), gender: gender!, classId: classId! });
  };

  const handleBack = () => {
    play('dismissLauncher', 0.4);
    if (step === 'summary') setStep('class');
    else if (step === 'class') setStep('gender');
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
        className="w-full max-w-6xl flex items-center justify-between mb-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={handleBack}
          onMouseEnter={() => play('click', 0.2)}
          className="text-cyan-200/70 hover:text-cyan-100 text-sm tracking-[0.2em] transition-colors flex items-center gap-2"
        >
          ◀ INDIETRO
        </button>
        <div className="text-center">
          <h2
            className="text-cyan-100 tracking-[0.3em] font-light"
            style={{
              fontSize: 'clamp(0.9rem, 2vw, 1.3rem)',
              textShadow: '0 0 18px rgba(92, 196, 240, 0.5)',
            }}
          >
            CREAZIONE PERSONAGGIO
          </h2>
          <p className="text-cyan-100/40 text-[0.65rem] tracking-[0.4em] mt-1">
            FLOOR 1 — CITY OF BEGINNINGS
          </p>
        </div>
        <div className="text-cyan-200/70 text-xs tracking-[0.2em]">
          STEP {step === 'gender' ? '1' : step === 'class' ? '2' : '3'} / 3
        </div>
      </motion.div>

      <div className="w-full max-w-6xl flex-1 flex items-start justify-center">
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
                subtitle="Il tuo corpo ad Aincrad — l'aspetto verrà generato dal sistema NerveGear"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 max-w-4xl mx-auto mt-10">
                {GENDERS.map((g) => (
                  <Card3D
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
                  </Card3D>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'class' && (
            <motion.div
              key="class"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <StepHeader
                title="SCEGLI LA TUA CLASSE"
                subtitle="La classe determina le tue statistiche iniziali e l'equipaggiamento disponibile"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto mt-10">
                {CLASSES.map((c) => (
                  <Card3D
                    key={c.id}
                    glowColor={c.glowColor}
                    onHover={(coords) => {
                      setHoveredCard(c.id);
                      onCardHover?.(coords);
                      if (coords) play('click', 0.15);
                    }}
                    onLeave={() => {
                      setHoveredCard(null);
                      onCardHover?.(null);
                    }}
                    selected={classId === c.id}
                    onClick={() => handleClassSelect(c)}
                  >
                    <ClassCardContent cls={c} highlighted={hoveredCard === c.id} />
                  </Card3D>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'summary' && gender && classId && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-4xl"
            >
              <StepHeader
                title="RIEPILOGO PERSONAGGIO"
                subtitle="Conferma i dettagli del tuo avatar prima di entrare ad Aincrad"
              />

              <motion.div
                className="relative mt-10 backdrop-blur-md rounded-lg overflow-hidden"
                style={{
                  background: 'rgba(8, 22, 40, 0.55)',
                  border: '1px solid rgba(92, 196, 240, 0.4)',
                  boxShadow: '0 0 50px rgba(92, 196, 240, 0.2), inset 0 0 30px rgba(92, 196, 240, 0.08)',
                }}
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <div className="grid md:grid-cols-[260px_1fr] gap-6 p-6 sm:p-8">
                  {/* Character preview */}
                  <div className="flex flex-col items-center">
                    <div
                      className="relative w-full aspect-[137/316] max-w-[220px]"
                      style={{
                        filter: 'drop-shadow(0 0 25px rgba(92, 196, 240, 0.4))',
                      }}
                    >
                      <img
                        src={`/sao/characters/${gender.svg}`}
                        alt={gender.label}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="mt-4 text-cyan-100 tracking-[0.3em] text-sm">{gender.label.toUpperCase()}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={`/sao/equipment/${CLASSES.find((c) => c.id === classId)!.iconRound}`}
                        alt=""
                        className="w-8 h-8"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(92, 196, 240, 0.6))' }}
                      />
                      <span className="text-cyan-200 text-sm tracking-wider">
                        {CLASSES.find((c) => c.id === classId)!.name}
                      </span>
                    </div>
                  </div>

                  {/* Details + name + stats */}
                  <div className="flex flex-col gap-5">
                    <div>
                      <label
                        htmlFor="char-name"
                        className="block text-cyan-200/70 text-xs tracking-[0.3em] mb-2"
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
                        className="w-full bg-slate-950/60 border border-cyan-400/40 rounded px-3 py-2 text-cyan-50 placeholder:text-cyan-200/30 outline-none focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(92,196,240,0.4)] transition"
                        style={{ fontFamily: 'var(--font-sao, "Trebuchet MS", sans-serif)' }}
                      />
                    </div>

                    <div>
                      <p className="text-cyan-200/70 text-xs tracking-[0.3em] mb-2">CLASSE</p>
                      <p className="text-cyan-50 text-base">
                        {CLASSES.find((c) => c.id === classId)!.name}{' '}
                        <span className="text-cyan-200/50 text-sm">
                          — {CLASSES.find((c) => c.id === classId)!.tagline}
                        </span>
                      </p>
                      <p className="text-cyan-100/60 text-xs mt-1">
                        {CLASSES.find((c) => c.id === classId)!.description}
                      </p>
                    </div>

                    <div>
                      <p className="text-cyan-200/70 text-xs tracking-[0.3em] mb-2">
                        STATISTICHE INIZIALI
                      </p>
                      <StatsGrid classId={classId} />
                    </div>
                  </div>
                </div>

                {/* Confirm button */}
                <div className="border-t border-cyan-400/20 p-4 sm:p-6 flex justify-end gap-3">
                  <button
                    onClick={handleBack}
                    onMouseEnter={() => play('click', 0.2)}
                    className="px-5 py-2 text-cyan-200/70 hover:text-cyan-100 text-sm tracking-[0.2em] transition"
                  >
                    MODIFICA
                  </button>
                  <button
                    onClick={handleComplete}
                    onMouseEnter={() => play('click', 0.3)}
                    className="relative px-7 py-2.5 text-white font-semibold tracking-[0.25em] text-sm rounded transition-all hover:scale-105"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(92,196,240,0.9), rgba(43,115,179,0.95))',
                      boxShadow: '0 0 25px rgba(92,196,240,0.6), inset 0 0 10px rgba(255,255,255,0.25)',
                      border: '1px solid rgba(255,255,255,0.5)',
                    }}
                  >
                    ENTRA AD AINCRAD →
                  </button>
                </div>
              </motion.div>
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
        className="text-cyan-100 tracking-[0.35em] font-light"
        style={{
          fontSize: 'clamp(1rem, 2.4vw, 1.6rem)',
          textShadow: '0 0 20px rgba(92, 196, 240, 0.5)',
        }}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {title}
      </motion.h3>
      <p className="text-cyan-100/50 text-xs sm:text-sm tracking-[0.2em] mt-2">{subtitle}</p>
    </div>
  );
}

interface Card3DProps {
  children: React.ReactNode;
  glowColor: string;
  onHover: (coords: { x: number; y: number } | null) => void;
  onLeave: () => void;
  selected: boolean;
  onClick: () => void;
}

/**
 * 3D-tilt card with simulated 3D light.
 * Uses Framer Motion's motion values for the perspective transform; a CSS
 * radial gradient acts as the "moving spotlight" that follows the cursor
 * across the card surface — visually consistent with the R3F lights in the
 * background, giving the impression that the same 3D light source
 * illuminates the cards.
 */
function Card3D({ children, glowColor, onHover, onLeave, selected, onClick }: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('');
  const [lightPos, setLightPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHover, setIsHover] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const rotY = (px - 0.5) * 18; // -9..9 deg
    const rotX = -(py - 0.5) * 18;
    setTransform(`perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03,1.03,1.03)`);
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
      className="relative cursor-pointer group rounded-lg overflow-hidden transition-shadow"
      style={{
        transform,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.18s ease-out',
        background: 'rgba(8, 22, 40, 0.55)',
        border: `1px solid ${selected ? glowColor : 'rgba(92, 196, 240, 0.25)'}`,
        boxShadow: selected
          ? `0 0 30px ${glowColor}99, inset 0 0 20px ${glowColor}33`
          : isHover
            ? `0 0 25px ${glowColor}66, inset 0 0 15px ${glowColor}22`
            : '0 0 10px rgba(92, 196, 240, 0.15)',
      }}
    >
      {/* Simulated 3D spotlight that follows the cursor */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHover ? 1 : 0,
          background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, ${glowColor}55 0%, transparent 50%)`,
          mixBlendMode: 'screen',
        }}
      />
      {/* Edge glow line */}
      <div
        className="absolute inset-0 pointer-events-none rounded-lg"
        style={{
          boxShadow: `inset 0 0 1px 1px ${glowColor}40`,
          opacity: isHover || selected ? 1 : 0.4,
        }}
      />
      <div className="relative" style={{ transform: 'translateZ(40px)' }}>
        {children}
      </div>
    </motion.div>
  );
}

function GenderCardContent({ gender, highlighted }: { gender: Gender; highlighted: boolean }) {
  return (
    <div className="flex flex-col items-center p-6 sm:p-8 min-h-[360px] justify-center">
      <div
        className="relative w-full aspect-[137/316] max-w-[180px] transition-transform duration-300"
        style={{
          filter: highlighted
            ? `drop-shadow(0 0 25px ${gender.glowColor})`
            : 'drop-shadow(0 0 10px rgba(92, 196, 240, 0.3))',
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
        className="mt-6 tracking-[0.3em] text-cyan-100 font-light"
        style={{ fontSize: 'clamp(1rem, 1.8vw, 1.4rem)' }}
      >
        {gender.label.toUpperCase()}
      </h4>
      <p className="text-cyan-100/40 text-[0.65rem] tracking-[0.2em] mt-2 text-center">
        {gender.description}
      </p>
    </div>
  );
}

function ClassCardContent({ cls, highlighted }: { cls: CharacterClass; highlighted: boolean }) {
  return (
    <div className="flex flex-col items-center p-5 sm:p-6 min-h-[260px] sm:min-h-[300px] justify-between">
      <div
        className="relative transition-transform duration-300"
        style={{
          transform: highlighted ? 'scale(1.18)' : 'scale(1)',
          filter: highlighted ? `drop-shadow(0 0 18px ${cls.glowColor})` : 'drop-shadow(0 0 6px rgba(92,196,240,0.4))',
        }}
      >
        <img
          src={`/sao/equipment/${cls.icon}`}
          alt={cls.name}
          className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
        />
      </div>
      <div className="text-center mt-4">
        <h4
          className="tracking-[0.2em] text-cyan-100 font-light"
          style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1.05rem)' }}
        >
          {cls.name.toUpperCase()}
        </h4>
        <p className="text-cyan-200/40 text-[0.6rem] tracking-[0.15em] mt-1">{cls.tagline}</p>
      </div>
      {/* Primary stat pills */}
      <div className="flex gap-1.5 mt-3">
        {cls.primaryStats.map((statId) => {
          const s = STATS.find((x) => x.id === statId);
          if (!s) return null;
          return (
            <div
              key={statId}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                background: `${cls.glowColor}22`,
                border: `1px solid ${cls.glowColor}55`,
              }}
              title={`${s.name}: ${s.description}`}
            >
              <img src={`/sao/stats/${s.icon}`} alt={s.name} className="w-3 h-3" />
              <span className="text-cyan-100/80 text-[0.55rem] tracking-wider">{s.id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsGrid({ classId }: { classId: string }) {
  const stats = getStartingStats(classId);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {STATS.map((s) => {
        const value = stats[s.id] ?? 0;
        const max = 14;
        return (
          <div
            key={s.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-950/40 border border-cyan-400/20"
            title={s.description}
          >
            <img src={`/sao/stats/${s.icon}`} alt={s.name} className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between">
                <span className="text-cyan-200/70 text-[0.6rem] tracking-wider">{s.id}</span>
                <span className="text-cyan-50 text-xs font-semibold">{value}</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(value / max) * 100}%`,
                    background: 'linear-gradient(90deg, #5CC4F0, #9FE8FF)',
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
