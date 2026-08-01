'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';

/**
 * DiceRollOverlay — animazione a tutto schermo di un tiro di dado.
 *
 * Sostituisce il dado 3D con un'animazione "slot machine" di numeri
 * che scorrono verticalmente. Più pulita, leggibile, e funziona per
 * qualsiasi tipo di dado (D10, D20, D100, ecc.).
 *
 * Stile: tema SAO/Matrix — fondo nero con sfumature blu, numeri verdi
 * fosforescenti con glow, scanline, particelle fluttuanti.
 *
 * Suono: 'diceRoll' (MenuTick) ripetuto a intervalli crescenti (decelerazione);
 * al termine 'diceLand' (ConfirmSound).
 *
 * Animazione:
 *   - Una colonna verticale di numeri che scorrono verso l'alto
 *   - I numeri sono generati casualmente durante il roll
 *   - Decelerazione: lo scroll rallenta verso la fine
 *   - Il numero finale si "ferma" al centro con glow verde intenso
 */

interface DiceRollOverlayProps {
  open: boolean;
  sides?: number;
  onResult: (result: number) => void;
}

// === Durate configurabili ===
const ROLL_DURATION = 2200; // ms totali di rotolamento
const LAND_DELAY = 1100; // ms dopo il fermo prima di chiamare onResult
const FLICKER_INTERVAL_START = 60; // ms iniziali tra cambi numero
const FLICKER_INTERVAL_END = 180; // ms finali tra cambi numero (decelerazione)
const TICK_INTERVAL_START = 80; // ms iniziali tra suoni
const TICK_INTERVAL_END = 200; // ms finali tra suoni

// Numeri mostrati nella colonna scorrevole (generati casualmente)
const COLUMN_LENGTH = 30;

export default function DiceRollOverlay({ open, sides = 10, onResult }: DiceRollOverlayProps) {
  const { play } = useSaoSound();
  const [finalResult, setFinalResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rollPhase, setRollPhase] = useState<'idle' | 'rolling' | 'landed'>('idle');
  // Colonna di numeri che scorre
  const [numberColumn, setNumberColumn] = useState<number[]>([]);
  // Offset verticale corrente (per simulare lo scroll)
  const [scrollOffset, setScrollOffset] = useState(0);
  const flickerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    if (flickerTimeoutRef.current) clearTimeout(flickerTimeoutRef.current);
    if (tickTimeoutRef.current) clearTimeout(tickTimeoutRef.current);
    if (landTimeoutRef.current) clearTimeout(landTimeoutRef.current);
    if (onResultTimeoutRef.current) clearTimeout(onResultTimeoutRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  // Genera una colonna di numeri casuali
  const generateColumn = useCallback((length: number, sidesCount: number): number[] => {
    return Array.from({ length }, () => Math.floor(Math.random() * sidesCount) + 1);
  }, []);

  useEffect(() => {
    if (!open) {
      setFinalResult(null);
      setIsRolling(false);
      setRollPhase('idle');
      setNumberColumn([]);
      setScrollOffset(0);
      clearAllTimers();
      return;
    }

    // Genera risultato finale
    const result = Math.floor(Math.random() * sides) + 1;

    // Costruisci la colonna finale: numeri casuali + risultato in ultima posizione
    const col = generateColumn(COLUMN_LENGTH, sides);
    col[col.length - 1] = result; // l'ultimo numero è il risultato
    setNumberColumn(col);
    setFinalResult(null);
    setIsRolling(true);
    setRollPhase('rolling');
    setScrollOffset(0);
    startTimeRef.current = Date.now();

    // === Animazione scroll con requestAnimationFrame ===
    const itemHeight = 80; // px per numero
    const totalScroll = (col.length - 1) * itemHeight; // scroll fino all'ultimo numero
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / ROLL_DURATION, 1);
      // Easing: cubic-out per decelerazione
      const eased = 1 - Math.pow(1 - progress, 3);
      const offset = eased * totalScroll;
      setScrollOffset(offset);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    // === Loop tick audio (con decelerazione) ===
    const scheduleNextTick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / ROLL_DURATION, 1);
      const interval = TICK_INTERVAL_START + (TICK_INTERVAL_END - TICK_INTERVAL_START) * progress;

      tickTimeoutRef.current = setTimeout(() => {
        if (Date.now() - startTimeRef.current >= ROLL_DURATION) return;
        play('diceRoll', 0.2);
        scheduleNextTick();
      }, interval);
    };
    scheduleNextTick();

    // === Land ===
    landTimeoutRef.current = setTimeout(() => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (tickTimeoutRef.current) clearTimeout(tickTimeoutRef.current);
      setScrollOffset(totalScroll); // ferma esattamente sul risultato
      setFinalResult(result);
      setIsRolling(false);
      setRollPhase('landed');
      play('diceLand', 0.5);

      onResultTimeoutRef.current = setTimeout(() => {
        onResult(result);
      }, LAND_DELAY);
    }, ROLL_DURATION);

    return () => {
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sides]);

  // === Calcola transform della colonna ===
  // La colonna si sposta verso l'alto (valore negativo) di scrollOffset px
  // Il numero centrale visibile è quello a posizione Math.floor(scrollOffset / itemHeight)
  const itemHeight = 80;
  const highlightIndex = Math.floor(scrollOffset / itemHeight);
  const currentVisibleNumber = numberColumn[highlightIndex] ?? 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'radial-gradient(circle at center, rgba(2,8,20,0.85) 0%, rgba(0,0,0,0.95) 100%)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* Titolo */}
          <motion.p
            className="tracking-[0.5em] mb-8"
            style={{
              color: 'rgba(92,196,240,0.7)',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: '0.9rem',
              textShadow: '0 0 10px rgba(92,196,240,0.4)',
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {rollPhase === 'rolling' ? 'TIRO IN CORSO' : 'RISULTATO'}
          </motion.p>

          {/* Indicatore D10 */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.2 }}
            style={{
              color: 'rgba(92,196,240,0.6)',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: '0.75rem',
              letterSpacing: '0.4em',
            }}
          >
            D{sides}
          </motion.div>

          {/* === Finestra numeri scorrevoli === */}
          <div
            className="relative overflow-hidden"
            style={{
              width: 'min(180px, 60vw)',
              height: 'min(240px, 50vh)', // 3 numeri visibili
              background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(2,8,20,0.9) 50%, rgba(0,0,0,0.95) 100%)',
              border: '2px solid rgba(92,196,240,0.5)',
              clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
              boxShadow: '0 0 30px rgba(92,196,240,0.2), inset 0 0 20px rgba(0,0,0,0.8)',
            }}
          >
            {/* Scanline Matrix */}
            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,255,65,0.04) 2px, rgba(0,255,65,0.04) 3px)',
              }}
            />

            {/* Linee separatrici (3 slot) */}
            <div
              className="absolute left-0 right-0 pointer-events-none z-10"
              style={{
                top: '80px',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(92,196,240,0.3), transparent)',
              }}
            />
            <div
              className="absolute left-0 right-0 pointer-events-none z-10"
              style={{
                top: '160px',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(92,196,240,0.3), transparent)',
              }}
            />

            {/* Highlight sul numero centrale quando landed */}
            {finalResult !== null && (
              <motion.div
                className="absolute left-0 right-0 pointer-events-none z-10"
                style={{
                  top: '80px',
                  height: '80px',
                  background: 'radial-gradient(ellipse at center, rgba(0,255,65,0.15) 0%, transparent 70%)',
                  border: '1px solid rgba(0,255,65,0.4)',
                  clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}

            {/* Colonna di numeri scorrevole */}
            <div
              style={{
                transform: `translateY(${-scrollOffset + 80}px)`, // +80 per centrare il primo numero
                willChange: 'transform',
              }}
            >
              {numberColumn.map((num, i) => {
                const isResult = finalResult !== null && i === numberColumn.length - 1;
                const isCenter = i === highlightIndex;
                return (
                  <div
                    key={i}
                    style={{
                      height: `${itemHeight}px`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isResult ? '#00ff41' : (isCenter && !isRolling ? '#00ff41' : '#FBFBFB'),
                      fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                      fontWeight: 400,
                      fontSize: isResult ? '3.5rem' : '2.5rem',
                      textShadow: isResult
                        ? '0 0 15px rgba(0,255,65,0.9), 0 0 30px rgba(0,255,65,0.5)'
                        : '0 0 8px rgba(0,0,0,0.95), 0 0 4px rgba(92,196,240,0.3)',
                      opacity: isResult ? 1 : (Math.abs(i - highlightIndex) <= 1 ? 0.9 : 0.4),
                      transition: 'color 0.2s, text-shadow 0.2s, font-size 0.2s',
                    }}
                  >
                    {num}
                  </div>
                );
              })}
            </div>

            {/* Glow centrale quando landed */}
            {finalResult !== null && (
              <motion.div
                className="absolute inset-0 pointer-events-none z-15"
                style={{
                  boxShadow: 'inset 0 0 40px rgba(0,255,65,0.3)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              />
            )}
          </div>

          {/* Risultato finale (testo sotto la finestra) */}
          <AnimatePresence>
            {finalResult !== null && (
              <motion.div
                className="mt-8 text-center"
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', duration: 0.6 }}
              >
                <div
                  className="tracking-[0.3em]"
                  style={{
                    color: 'rgba(0,255,65,0.7)',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.8rem',
                  }}
                >
                  D{sides} → {finalResult}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Particelle fluttuanti durante il roll */}
          {isRolling && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 14 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    width: '3px',
                    height: '3px',
                    background: 'rgba(0,255,65,0.5)',
                    borderRadius: '50%',
                    boxShadow: '0 0 6px rgba(0,255,65,0.7)',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -40, 0],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5 + Math.random() * 1,
                    repeat: Infinity,
                    delay: Math.random() * 0.5,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
