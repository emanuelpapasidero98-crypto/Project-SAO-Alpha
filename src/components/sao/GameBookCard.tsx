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
      // Prova sia la chiave maiuscola (STR) che minuscola (str) per robustezza
      const statKeyUpper = choice.requiresStat.stat.toUpperCase();
      const statKeyLower = choice.requiresStat.stat.toLowerCase();
      const statValue = playerStats[statKeyUpper] ?? playerStats[statKeyLower] ?? 0;
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
      className="relative overflow-hidden"
      style={{
        width: '100%',
        maxWidth: 'min(700px, 94vw)',
        transform: hover?.tilt,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out',
        // Card: palette bianco argenteo SAO (#EFEFEF → #DFDFDF)
        background: 'linear-gradient(180deg, #EFEFEF 0%, #DFDFDF 100%)',
        border: '2px solid #A8A8A8',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.6)',
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
        willChange: hover ? 'transform' : 'auto',
      }}
    >
      {/* VR glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: hover ? 1 : 0,
          background: `radial-gradient(circle at ${hover?.lightX ?? 50}% ${hover?.lightY ?? 50}%, rgba(43,115,179,0.12) 0%, transparent 50%)`,
          mixBlendMode: 'screen',
        }}
      />

      {/* === HEADER: titolo (su sfondo argenteo, testo scuro) === */}
      <div
        className="relative px-6 pt-5 pb-3"
        style={{
          borderBottom: '1px solid #A8A8A8',
          background: 'linear-gradient(180deg, #EFEFEF 0%, #D6D6D6 100%)',
        }}
      >
        <div className="flex items-center gap-3 justify-center">
          <img
            src="/sao/menu/Location_on.svg"
            alt=""
            className="w-5 h-5"
            style={{ filter: 'drop-shadow(0 0 4px rgba(43,115,179,0.5))' }}
            draggable={false}
          />
          <h3
            className="tracking-[0.35em] text-center"
            style={{
              color: '#1a2a3a',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              fontSize: '1.1rem',
              textShadow: '0 1px 0 rgba(255,255,255,0.6)',
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
            background: 'linear-gradient(90deg, transparent, #A8A8A8, transparent)',
          }}
        />
      </div>

      {/* === PARTE CENTRALE: Descrizione (su sfondo scuro per leggibilità) === */}
      <div
        className="relative"
        onClick={skipTyping}
        style={{
          background: '#1a1f2e',
          padding: '24px 28px',
          minHeight: '180px',
          maxHeight: '320px',
          overflowY: 'auto',
          cursor: isTyping ? 'pointer' : 'default',
        }}
      >
        {/* Effetto scanline sottile */}
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

      {/* === PARTE INFERIORE: Scelte (box argentei con hover elevate) === */}
      <div
        className="flex flex-col gap-2.5 p-4"
        style={{
          background: 'linear-gradient(180deg, #D6D6D6 0%, #EFEFEF 100%)',
          borderTop: '1px solid #A8A8A8',
        }}
      >
        {/* Nascondi scelte durante typing */}
        {!isTyping && (
          <AnimatePresence>
            <motion.div
              className="flex flex-col gap-2.5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentPage.choices.filter(isChoiceVisible).map((choice, idx) => {
                const status = getChoiceStatus(choice);
                const isDisabled = status.disabled || choice.locked;
                return (
                  <motion.button
                    key={choice.id}
                    onClick={() => handleChoice(choice)}
                    disabled={isDisabled}
                    className="px-4 py-3 text-left flex items-center justify-between gap-3"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * idx }}
                    // Hover: eleva il bottone (translateY + shadow) per staccarlo dalla card
                    whileHover={!isDisabled ? { y: -3, scale: 1.02 } : {}}
                    whileTap={!isDisabled ? { y: -1, scale: 0.99 } : {}}
                    style={{
                      // Box argenteo SAO: gradiente #EFEFEF → #D6D6D6
                      background: isDisabled
                        ? 'linear-gradient(180deg, #C8C8C8 0%, #B8B8B8 100%)'
                        : 'linear-gradient(180deg, #F5F5F5 0%, #D6D6D6 100%)',
                      border: `1px solid ${isDisabled ? '#888' : '#A8A8A8'}`,
                      borderRadius: '2px',
                      clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                      color: isDisabled ? 'rgba(26,42,58,0.4)' : '#1a2a3a',
                      fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                      fontWeight: 400,
                      fontSize: '0.82rem',
                      letterSpacing: '0.04em',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.6 : 1,
                      textShadow: '0 1px 0 rgba(255,255,255,0.6)',
                      // Shadow che aumenta al hover per effetto "elevato"
                      boxShadow: isDisabled
                        ? 'inset 0 1px 2px rgba(0,0,0,0.1)'
                        : '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.7)',
                      transition: 'box-shadow 0.2s ease, background 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isDisabled) {
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3), 0 0 12px rgba(43,115,179,0.2), inset 0 1px 0 rgba(255,255,255,0.8)';
                        e.currentTarget.style.background = 'linear-gradient(180deg, #FBFBFB 0%, #E0E0E0 100%)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDisabled) {
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.7)';
                        e.currentTarget.style.background = 'linear-gradient(180deg, #F5F5F5 0%, #D6D6D6 100%)';
                      }
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      {!isDisabled && (
                        <span style={{ color: '#2B73B3', fontSize: '0.7rem', fontWeight: 700 }}>▸</span>
                      )}
                      {isDisabled && (
                        <span style={{ color: '#888', fontSize: '0.7rem' }}>✕</span>
                      )}
                      {choice.label}
                    </span>
                    {(status.reason || status.label) && (
                      <span
                        style={{
                          color: status.label ? '#5a7a0c' : '#8a1a3a',
                          fontSize: '0.65rem',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                          letterSpacing: '0.05em',
                        }}
                      >
                        {status.label ? status.label : `[${status.reason}]`}
                      </span>
                    )}
                    {choice.locked && choice.lockReason && (
                      <span style={{ color: '#8a1a3a', fontSize: '0.65rem' }}>
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

      {/* === Footer: statistiche (su sfondo argenteo scuro) === */}
      <div
        className="flex justify-between items-center px-5 py-2"
        style={{
          background: 'linear-gradient(180deg, #C8C8C8 0%, #B8B8B8 100%)',
          borderTop: '1px solid #A8A8A8',
        }}
      >
        <span style={{ color: 'rgba(26,42,58,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem', letterSpacing: '0.15em' }}>
          {state.subAreaName.toUpperCase()}
        </span>
        <span style={{ color: 'rgba(26,42,58,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem', letterSpacing: '0.15em' }}>
          PAG. {state.stats.pagesVisited} · SCELTE {state.stats.choicesMade}
        </span>
      </div>
    </div>
  );
}

