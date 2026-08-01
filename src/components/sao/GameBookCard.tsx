'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import { resolvePageDescription } from '@/lib/sao-gamebook-types';
import type { GameBookPage, GameBookState, GameBookChoice } from '@/lib/sao-gamebook-types';

/**
 * Parsa il testo e identifica i dialoghi (testo tra virgolette "..." o "..." ecc.).
 * Ritorna un array di segmenti { type: 'normal' | 'dialogue', text }.
 *
 * Gestisce anche virgolette non chiuse (durante il typewriter effect):
 * se il testo termina con una virgoletta aperta non chiusa, tutto il testo
 * dopo quella virgoletta viene trattato come dialogo.
 *
 * Supporta sia virgolette dritte (") che virgolette tipografiche (" ").
 */
function parseTextSegments(text: string): { type: 'normal' | 'dialogue'; text: string }[] {
  if (!text) return [];
  const segments: { type: 'normal' | 'dialogue'; text: string }[] = [];
  // Regex: trova "..." (con virgolette dritte o tipografiche)
  // La virgoletta finale è opzionale per gestire il typing parziale
  const dialogueRegex = /["\u201C\u201D]([^"\u201C\u201D]*)(?:["\u201C\u201D])?/g;
  let lastIndex = 0;
  let match;
  while ((match = dialogueRegex.exec(text)) !== null) {
    // Testo normale prima del dialogo
    if (match.index > lastIndex) {
      segments.push({ type: 'normal', text: text.slice(lastIndex, match.index) });
    }
    // Il dialogo (include le virgolette di apertura e, se presente, di chiusura)
    segments.push({ type: 'dialogue', text: match[0] });
    lastIndex = match.index + match[0].length;
  }
  // Testo normale rimanente
  if (lastIndex < text.length) {
    segments.push({ type: 'normal', text: text.slice(lastIndex) });
  }
  // Se non ci sono segmenti (nessun dialogo), ritorna l'intero testo come normal
  if (segments.length === 0) {
    segments.push({ type: 'normal', text });
  }
  return segments;
}

/** Renderizza il testo parsando i dialoghi e applicando stili diversi. */
function renderTextWithDialogues(text: string) {
  const segments = parseTextSegments(text);
  return segments.map((seg, i) => {
    if (seg.type === 'dialogue') {
      return (
        <span
          key={i}
          style={{
            color: '#EBA601',
            fontStyle: 'italic',
            fontWeight: 400,
            textShadow: '0 0 6px rgba(235,166,1,0.3), 0 1px 2px rgba(0,0,0,0.95)',
          }}
        >
          {seg.text}
        </span>
      );
    }
    return <span key={i}>{seg.text}</span>;
  });
}

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
 * La descrizione mostrata tiene conto dei flag di stato: prima visita =
 * descrizione originale; visite successive = revisitDescription o
 * conditionalDescriptions (es. dopo aver esplorato le case, dopo l'evento
 * mulino, ecc.).
 */

interface GameBookCardProps {
  state: GameBookState;
  onChoice: (choice: GameBookChoice) => void;
  /** Statistiche giocatore per verificare requiresStat (opzionale) */
  playerStats?: Record<string, number>;
}

export default function GameBookCard({ state, onChoice, playerStats }: GameBookCardProps) {
  const { play } = useSaoSound();
  const currentPage: GameBookPage = state.pages[state.currentPageId];
  const cardRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ tilt: string; lightX: number; lightY: number } | null>(null);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const typedPagesRef = useRef<Set<string>>(new Set());
  // Ref per skippare il typewriter: se true, il setInterval smette di aggiornare typedText
  const skipRef = useRef<boolean>(false);
  // Ref per tenere traccia dell'interval corrente e poterlo pulire
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Risolve la descrizione corretta in base ai flag
  const resolvedDescription = currentPage ? resolvePageDescription(currentPage, state) : '';

  // Typewriter effect per la descrizione (stile Matrix)
  useEffect(() => {
    if (!currentPage) return;
    const text = resolvedDescription;
    if (!text) { setTypedText(''); return; }
    // Se abbiamo già typato questa pagina con questo exact text, salta
    const typeKey = `${currentPage.id}::${text.slice(0, 40)}`;
    if (typedPagesRef.current.has(typeKey)) {
      setTypedText(text);
      setIsTyping(false);
      return;
    }
    typedPagesRef.current.add(typeKey);
    skipRef.current = false; // reset skip per nuova pagina
    setIsTyping(true);
    setTypedText('');
    setResultText(null);
    let i = 0;
    // Pulisci eventuale interval precedente
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      // Se l'utente ha skippato, ferma subito il typewriter
      if (skipRef.current) {
        setTypedText(text);
        setIsTyping(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      if (i < text.length) {
        setTypedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 12); // Veloce per effetto Matrix
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentPage?.id, resolvedDescription]);

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

  // Determina se una scelta è disabled (per maxUses/oneTime/requiresStat)
  const getChoiceStatus = useCallback((choice: GameBookChoice): { disabled: boolean; reason?: string; label?: string } => {
    // maxUses / oneTime
    if (choice.oneTime || choice.maxUses) {
      const uses = state.choiceUses[choice.id] ?? 0;
      const limit = choice.oneTime ? 1 : (choice.maxUses ?? Infinity);
      if (uses >= limit) {
        return { disabled: true, reason: 'Esaurito', label: '✓ Fatto' };
      }
    }
    // requiresStat
    if (choice.requiresStat && playerStats) {
      const statKey = choice.requiresStat.stat.toLowerCase();
      const statValue = playerStats[statKey] ?? 0;
      if (statValue < choice.requiresStat.value) {
        return {
          disabled: true,
          reason: `Richiede ${choice.requiresStat.stat} ${choice.requiresStat.value} (hai ${statValue})`,
        };
      }
    }
    return { disabled: false };
  }, [state.choiceUses, playerStats]);

  // Determina se una scelta deve essere mostrata (filtri showWhenFlag / hideWhenAllFlags)
  const isChoiceVisible = useCallback((choice: GameBookChoice): boolean => {
    // showWhenFlag: mostra solo se il flag è true
    if (choice.showWhenFlag && !state.flags[choice.showWhenFlag]) {
      return false;
    }
    // hideWhenAllFlags: nascondi quando TUTTI i flag sono true
    if (choice.hideWhenAllFlags && choice.hideWhenAllFlags.length > 0) {
      const allTrue = choice.hideWhenAllFlags.every((f) => state.flags[f]);
      if (allTrue) return false;
    }
    return true;
  }, [state.flags]);

  // Salta l'animazione del typewriter (mostra subito la descrizione completa)
  const skipTyping = useCallback(() => {
    if (isTyping) {
      // Imposta il flag di skip PRIMA dei setter: al prossimo tick del setInterval
      // questo flag viene letto e l'interval viene fermato + il testo completo viene
      // settato in modo atomico.
      skipRef.current = true;
      setTypedText(resolvedDescription);
      setIsTyping(false);
      // Pulisci subito l'interval per evitare ulteriori tick
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isTyping, resolvedDescription]);

  const handleChoice = (choice: GameBookChoice) => {
    const status = getChoiceStatus(choice);
    if (status.disabled) {
      play('warning', 0.3);
      return;
    }
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
      onClick={skipTyping}
      className="relative overflow-hidden glass-panel"
      style={{
        width: '100%',
        maxWidth: 'min(700px, 94vw)',
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

      {/* === PARTE CENTRALE: Descrizione (stile SAO anime) === */}
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
        {/* Effetto scanline sottile (SAO style, azzurro) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(92,196,240,0.02) 3px, rgba(92,196,240,0.02) 4px)',
          }}
        />

        {/* Testo descrizione o risultato */}
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
          {renderTextWithDialogues(resultText || typedText)}
          {isTyping && !resultText && (
            <span style={{
              color: '#5CC4F0',
              animation: 'blink 0.8s infinite',
              textShadow: '0 0 6px rgba(92,196,240,0.8)',
            }}>█</span>
          )}
        </pre>

        {/* Bottone SKIP */}
        {isTyping && !resultText && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              skipTyping();
            }}
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
              {currentPage.choices.filter(isChoiceVisible).map((choice) => {
                const status = getChoiceStatus(choice);
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleChoice(choice)}
                    disabled={status.disabled || choice.locked}
                    className="px-4 py-2.5 text-left transition-all flex items-center justify-between gap-3"
                    style={{
                      background: status.disabled || choice.locked
                        ? 'rgba(48,48,48,0.15)'
                        : 'rgba(43,115,179,0.12)',
                      border: `1px solid ${status.disabled || choice.locked ? 'rgba(48,48,48,0.2)' : 'rgba(43,115,179,0.35)'}`,
                      clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                      color: status.disabled || choice.locked ? 'rgba(251,251,251,0.25)' : '#FBFBFB',
                      fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                      fontWeight: 400,
                      fontSize: '0.8rem',
                      letterSpacing: '0.05em',
                      cursor: status.disabled || choice.locked ? 'not-allowed' : 'pointer',
                      opacity: status.disabled || choice.locked ? 0.5 : 1,
                      textShadow: '0 0 6px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
                    }}
                  >
                    <span>{choice.label}</span>
                    {(status.reason || status.label) && (
                      <span
                        style={{
                          color: status.disabled ? 'rgba(190,33,86,0.7)' : 'rgba(127,197,34,0.7)',
                          fontSize: '0.65rem',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {status.label ? status.label : `[${status.reason}]`}
                      </span>
                    )}
                    {choice.locked && choice.lockReason && (
                      <span style={{ color: 'rgba(190,33,86,0.5)', fontSize: '0.65rem' }}>
                        [BLOCCATO: {choice.lockReason}]
                      </span>
                    )}
                  </button>
                );
              })}
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

