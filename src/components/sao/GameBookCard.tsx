'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import type { GameBookPage, GameBookState, GameBookChoice } from '@/lib/sao-gamebook-types';

/**
 * GameBookCard — card centrale per l'esplorazione stile libro game.
 *
 * Struttura:
 *   - PARTE SUPERIORE: immagine (placeholder per ora)
 *   - PARTE CENTRALE: descrizione (stile Matrix: verde fosforescente su nero)
 *   - PARTE INFERIORE: scelte (bottoni SAO)
 *
 * La card usa la stessa grafica SAO delle altre card (glass-panel, VR hover),
 * ma la zona descrizione ha uno sfondo nero con testo verde Matrix.
 */

interface GameBookCardProps {
  state: GameBookState;
  onChoice: (choice: GameBookChoice) => void;
  onResolveCurrentEvent?: () => void;
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

  // Typewriter effect per la descrizione (stile Matrix)
  useEffect(() => {
    const text = currentPage.description;
    if (!text) { setTypedText(''); return; }
    if (typedPagesRef.current.has(currentPage.id)) {
      setTypedText(text);
      setIsTyping(false);
      return;
    }
    typedPagesRef.current.add(currentPage.id);
    setIsTyping(true);
    setTypedText('');
    setResultText(null);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 12); // Veloce per effetto Matrix
    return () => clearInterval(interval);
  }, [currentPage.id, currentPage.description]);

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
        tilt: `perspective(800px) rotateX(${-(py - 0.5) * 6}deg) rotateY(${(px - 0.5) * 6}deg)`,
        lightX: px * 100,
        lightY: py * 100,
      });
      rafRef.current = null;
    });
  };

  const handleChoice = (choice: GameBookChoice) => {
    if (choice.locked) return;
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
      onClick={() => { if (isTyping) { setTypedText(currentPage.description); setIsTyping(false); } }}
      className="relative overflow-hidden glass-panel"
      style={{
        width: '100%',
        maxWidth: '700px',
        transform: hover?.tilt,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out',
        border: '2px solid rgba(251, 251, 251, 0.5)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 0 20px rgba(43, 115, 179, 0.08)',
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
        willChange: hover ? 'transform' : 'auto',
      }}
    >
      {/* VR glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: hover ? 1 : 0,
          background: `radial-gradient(circle at ${hover?.lightX ?? 50}% ${hover?.lightY ?? 50}%, rgba(92,196,240,0.15) 0%, transparent 50%)`,
          mixBlendMode: 'screen',
        }}
      />

      {/* === PARTE SUPERIORE: Immagine === */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: '180px',
          background: 'linear-gradient(180deg, rgba(2,8,20,0.6) 0%, rgba(2,8,20,0.9) 100%)',
          borderBottom: '1px solid rgba(43,115,179,0.3)',
        }}
      >
        {currentPage.image ? (
          <img
            src={currentPage.image}
            alt={currentPage.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center gap-2" style={{ opacity: 0.3 }}>
            <span style={{ fontSize: '2rem', color: 'rgba(92,196,240,0.4)' }}>◈</span>
            <span style={{ color: 'rgba(92,196,240,0.3)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.6rem', letterSpacing: '0.2em' }}>
              IMMAGINE ZONA
            </span>
          </div>
        )}
        {/* Titolo sovrapposto all'immagine */}
        <div
          className="absolute bottom-2 left-0 right-0 text-center px-4"
          style={{
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            fontSize: '1rem',
            letterSpacing: '0.2em',
            textShadow: '0 0 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          {currentPage.title.toUpperCase()}
        </div>
      </div>

      {/* === PARTE CENTRALE: Descrizione stile Matrix === */}
      <div
        className="relative"
        style={{
          background: '#000',
          padding: '20px 24px',
          minHeight: '160px',
          maxHeight: '300px',
          overflowY: 'auto',
        }}
      >
        {/* Effetto scanline Matrix */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 3px)',
          }}
        />
        {/* Glow verde attorno al testo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 30px rgba(0,255,65,0.05)',
          }}
        />

        {/* Testo descrizione o risultato */}
        <pre
          style={{
            color: '#00ff41',
            fontFamily: "'Courier New', 'Monaco', monospace",
            fontSize: '0.85rem',
            lineHeight: 1.6,
            textShadow: '0 0 5px rgba(0,255,65,0.6), 0 0 10px rgba(0,255,65,0.3)',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            margin: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {resultText || typedText}
          {isTyping && !resultText && (
            <span style={{ color: '#00ff41', animation: 'blink 0.8s infinite', textShadow: '0 0 8px rgba(0,255,65,0.8)' }}>█</span>
          )}
        </pre>

        {/* Indicatore "premi per saltare" durante typing */}
        {isTyping && !resultText && (
          <div
            className="absolute bottom-1 right-2"
            style={{
              color: 'rgba(0,255,65,0.4)',
              fontFamily: "'Courier New', monospace",
              fontSize: '0.55rem',
            }}
          >
            [click per saltare]
          </div>
        )}
      </div>

      {/* === PARTE INFERIORE: Scelte === */}
      <div
        className="flex flex-col gap-2 p-4"
        style={{
          background: 'rgba(8, 22, 40, 0.85)',
          borderTop: '1px solid rgba(43,115,179,0.3)',
        }}
      >
        {/* Nascondi scelte durante typing */}
        {!isTyping && (
          <AnimatePresence>
            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentPage.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice)}
                  disabled={choice.locked}
                  className="px-4 py-2.5 text-left transition-all"
                  style={{
                    background: choice.locked
                      ? 'rgba(48,48,48,0.15)'
                      : 'rgba(43,115,179,0.12)',
                    border: `1px solid ${choice.locked ? 'rgba(48,48,48,0.2)' : 'rgba(43,115,179,0.35)'}`,
                    clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                    color: choice.locked ? 'rgba(251,251,251,0.25)' : '#FBFBFB',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                    fontWeight: 400,
                    fontSize: '0.8rem',
                    letterSpacing: '0.05em',
                    cursor: choice.locked ? 'not-allowed' : 'pointer',
                    opacity: choice.locked ? 0.5 : 1,
                    textShadow: '0 0 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
                  }}
                >
                  {choice.label}
                  {choice.locked && choice.lockReason && (
                    <span style={{ marginLeft: '8px', color: 'rgba(190,33,86,0.5)', fontSize: '0.65rem' }}>
                      [BLOCCATO: {choice.lockReason}]
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* === Footer: statistiche === */}
      <div
        className="flex justify-between items-center px-4 py-2"
        style={{
          background: 'rgba(2,8,20,0.6)',
          borderTop: '1px solid rgba(43,115,179,0.15)',
        }}
      >
        <span style={{ color: 'rgba(92,196,240,0.4)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.55rem', letterSpacing: '0.1em' }}>
          {state.subAreaName.toUpperCase()}
        </span>
        <span style={{ color: 'rgba(92,196,240,0.4)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.55rem', letterSpacing: '0.1em' }}>
          PAGINE: {state.stats.pagesVisited} | SCELTE: {state.stats.choicesMade}
        </span>
      </div>
    </div>
  );
}
