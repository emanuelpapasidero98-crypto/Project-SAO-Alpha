'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import type { GameBookPage, GameBookState, GameBookChoice } from '@/lib/sao-gamebook-types';

/**
 * GameBookCard — card centrale per l'esplorazione stile libro game.
 *
 * Stile: coerente con il resto del gioco (Sword Art Online anime):
 *   - Sfondo: pannello semi-trasparente blu scuro con blur (come GameScreen)
 *   - Bordo: clip-path angolare SAO con color #5CC4F0
 *   - Header: titolo grande con icona Location + glow azzurro
 *   - Descrizione: testo bianco #FBFBFB su sfondo scuro, font SAO UI
 *   - Scelte: pulsanti SAO con hover glow + icona ▸
 *
 * Struttura:
 *   - PARTE SUPERIORE: header con titolo + linea decorativa
 *   - PARTE CENTRALE: descrizione (con typewriter)
 *   - PARTE INFERIORE: scelte (bottoni SAO)
 */

interface GameBookCardProps {
  state: GameBookState;
  onChoice: (choice: GameBookChoice) => void;
}

export default function GameBookCard({ state, onChoice }: GameBookCardProps) {
  const { play } = useSaoSound();
  const currentPage: GameBookPage = state.pages[state.currentPageId];
  const cardRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ tilt: string; lightX: number; lightY: number } | null>(null);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const typedPagesRef = useRef<Set<string>>(new Set());
  const skipRef = useRef<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const description = currentPage?.description ?? '';

  // Typewriter effect
  useEffect(() => {
    if (!currentPage) return;
    const text = description;
    if (!text) { setTypedText(''); return; }
    if (typedPagesRef.current.has(currentPage.id)) {
      setTypedText(text);
      setIsTyping(false);
      return;
    }
    typedPagesRef.current.add(currentPage.id);
    skipRef.current = false;
    setIsTyping(true);
    setTypedText('');
    setResultText(null);
    let i = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (skipRef.current) {
        setTypedText(text);
        setIsTyping(false);
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        return;
      }
      if (i < text.length) {
        setTypedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      }
    }, 14);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [currentPage?.id, description]);

  // VR hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setHover({
        tilt: `perspective(1000px) rotateX(${-(py - 0.5) * 4}deg) rotateY(${(px - 0.5) * 4}deg)`,
        lightX: px * 100,
        lightY: py * 100,
      });
      rafRef.current = null;
    });
  };

  const skipTyping = useCallback(() => {
    if (isTyping) {
      skipRef.current = true;
      setTypedText(description);
      setIsTyping(false);
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
  }, [isTyping, description]);

  const handleChoice = (choice: GameBookChoice) => {
    if (choice.locked) { play('warning', 0.3); return; }
    play('click', 0.4);
    if (choice.resultText) {
      setResultText(choice.resultText);
    }
    setTimeout(() => onChoice(choice), 300);
  };

  if (!currentPage) return null;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setHover(null); if (rafRef.current) cancelAnimationFrame(rafRef.current); }}
      className="relative overflow-hidden"
      style={{
        width: '100%',
        maxWidth: '720px',
        transform: hover?.tilt,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out',
        background: 'linear-gradient(180deg, rgba(8,22,40,0.85) 0%, rgba(2,8,20,0.92) 100%)',
        border: '1.5px solid rgba(92,196,240,0.4)',
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 0 30px rgba(43,115,179,0.08)',
        willChange: hover ? 'transform' : 'auto',
      }}
    >
      {/* VR glow seguendo il cursore */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: hover ? 1 : 0,
          background: `radial-gradient(circle at ${hover?.lightX ?? 50}% ${hover?.lightY ?? 50}%, rgba(92,196,240,0.12) 0%, transparent 50%)`,
          mixBlendMode: 'screen',
        }}
      />

      {/* === HEADER: titolo + linea decorativa === */}
      <div
        className="relative px-6 pt-5 pb-3"
        style={{
          borderBottom: '1px solid rgba(92,196,240,0.25)',
          background: 'linear-gradient(180deg, rgba(43,115,179,0.15) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-3 justify-center">
          <img
            src="/sao/menu/Location_on.svg"
            alt=""
            className="w-5 h-5"
            style={{ filter: 'drop-shadow(0 0 5px rgba(92,196,240,0.7))' }}
            draggable={false}
          />
          <h3
            className="tracking-[0.35em] text-center"
            style={{
              color: '#FBFBFB',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: '1.1rem',
              textShadow: '0 0 12px rgba(92,196,240,0.5), 0 2px 4px rgba(0,0,0,0.95)',
            }}
          >
            {currentPage.title.toUpperCase()}
          </h3>
        </div>
        {/* Linea decorativa SAO sotto il titolo */}
        <div
          className="mt-3 mx-auto"
          style={{
            width: '60%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(92,196,240,0.4), transparent)',
          }}
        />
      </div>

      {/* === PARTE CENTRALE: Descrizione === */}
      <div
        className="relative"
        onClick={skipTyping}
        style={{
          background: 'rgba(0,0,0,0.4)',
          padding: '24px 28px',
          minHeight: '180px',
          maxHeight: '320px',
          overflowY: 'auto',
          cursor: isTyping ? 'pointer' : 'default',
        }}
      >
        {/* Effetto scanline sottile (SAO style) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(92,196,240,0.02) 3px, rgba(92,196,240,0.02) 4px)',
          }}
        />

        {/* Testo descrizione */}
        <pre
          style={{
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 300,
            fontSize: '0.88rem',
            lineHeight: 1.75,
            textShadow: '0 1px 2px rgba(0,0,0,0.95)',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            margin: 0,
            position: 'relative',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          {resultText || typedText}
          {isTyping && !resultText && (
            <span style={{
              color: '#5CC4F0',
              animation: 'blink 0.8s infinite',
              textShadow: '0 0 6px rgba(92,196,240,0.8)',
            }}>█</span>
          )}
        </pre>

        {/* Bottone "SKIP" */}
        {isTyping && !resultText && (
          <button
            onClick={(e) => { e.stopPropagation(); skipTyping(); }}
            className="absolute bottom-2 right-2 z-10"
            style={{
              background: 'rgba(92,196,240,0.1)',
              border: '1px solid rgba(92,196,240,0.4)',
              color: 'rgba(92,196,240,0.85)',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: '0.6rem',
              padding: '3px 8px',
              cursor: 'pointer',
              clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
              textShadow: '0 0 6px rgba(92,196,240,0.6)',
              letterSpacing: '0.1em',
            }}
          >
            ▼ SKIP
          </button>
        )}
      </div>

      {/* === PARTE INFERIORE: Scelte === */}
      <div
        className="flex flex-col gap-2 p-4"
        style={{
          background: 'rgba(8,22,40,0.7)',
          borderTop: '1px solid rgba(92,196,240,0.25)',
        }}
      >
        {!isTyping && (
          <AnimatePresence>
            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentPage.choices.map((choice, idx) => {
                const isDisabled = !!choice.locked;
                return (
                  <motion.button
                    key={choice.id}
                    onClick={() => handleChoice(choice)}
                    disabled={isDisabled}
                    className="px-4 py-2.5 text-left transition-all flex items-center justify-between gap-3 group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx }}
                    whileHover={!isDisabled ? { scale: 1.01, x: 4 } : {}}
                    whileTap={!isDisabled ? { scale: 0.99 } : {}}
                    style={{
                      background: isDisabled
                        ? 'rgba(48,48,48,0.15)'
                        : 'linear-gradient(90deg, rgba(43,115,179,0.18) 0%, rgba(43,115,179,0.08) 100%)',
                      border: `1px solid ${isDisabled ? 'rgba(48,48,48,0.3)' : 'rgba(92,196,240,0.35)'}`,
                      clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                      color: isDisabled ? 'rgba(251,251,251,0.3)' : '#FBFBFB',
                      fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                      fontWeight: 400,
                      fontSize: '0.82rem',
                      letterSpacing: '0.04em',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.55 : 1,
                      textShadow: '0 1px 2px rgba(0,0,0,0.95)',
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      {!isDisabled && (
                        <span style={{ color: '#5CC4F0', fontSize: '0.7rem', textShadow: '0 0 5px rgba(92,196,240,0.6)' }}>▸</span>
                      )}
                      {isDisabled && (
                        <span style={{ color: 'rgba(190,33,86,0.5)', fontSize: '0.7rem' }}>✕</span>
                      )}
                      {choice.label}
                    </span>
                    {choice.locked && choice.lockReason && (
                      <span style={{ color: 'rgba(190,33,86,0.5)', fontSize: '0.65rem' }}>
                        [BLOCCATO: {choice.lockReason}]
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* === Footer: statistiche === */}
      <div
        className="flex justify-between items-center px-5 py-2"
        style={{
          background: 'rgba(2,8,20,0.6)',
          borderTop: '1px solid rgba(92,196,240,0.15)',
        }}
      >
        <span
          style={{
            color: 'rgba(92,196,240,0.4)',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            fontSize: '0.55rem',
            letterSpacing: '0.15em',
          }}
        >
          {state.subAreaName.toUpperCase()}
        </span>
        <span
          style={{
            color: 'rgba(92,196,240,0.4)',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            fontSize: '0.55rem',
            letterSpacing: '0.15em',
          }}
        >
          PAG. {state.stats.pagesVisited} · SCELTE {state.stats.choicesMade}
        </span>
      </div>
    </div>
  );
}
