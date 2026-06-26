'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import {
  type SubAreaRun,
  type ZoneNode,
  type ZoneEvent,
  type ExploreState,
  type SubAreaProgress,
  createInitialExploreState,
} from '@/lib/sao-explore-types';
import {
  EXPLORE_AREAS,
  EXPLORE_SUBAREAS,
  getSubAreasForArea,
  getSubAreaById,
} from '@/lib/sao-explore-data';
import { generateSubAreaRun, generateSeed, getChestLoot } from '@/lib/sao-explore-engine';
import { SAMPLE_ITEMS } from '@/lib/sao-sample-items';
import { useSaoSound as useSound } from '@/hooks/useSaoSound';

/**
 * SAO Explore Panel — the procedural exploration UI.
 *
 * Hierarchy: Area → SubArea → 8 Zones (Zona 5 = Terminal)
 *
 * Flow:
 *   1. Player clicks "Pianure dell'inizio" in FloorPanel → opens ExplorePanel
 *   2. Shows the 8 zones of the sub-area as a path
 *   3. Player traverses zones sequentially
 *   4. Each zone may have events: chest, combat, trapChest, questNpc, playerKiller, distressNpc
 *   5. Zona 5 = Terminal (rest, modify bag, teleport)
 *   6. Complete all 8 zones → sub-area completed → unlock next
 *
 * Combat events are STUBBED with // TODO(combat-system).
 * Chest events give items directly.
 * Terminal events let the player rest/teleport.
 *
 * Same card style as CharacterPanel/InventoryPanel.
 * Uses .glass-panel for zone cards.
 */

interface ExplorePanelProps {
  open: boolean;
  onClose: () => void;
  subAreaId: string;
  onItemFound?: (itemId: string) => void;
  onRest?: () => void;
}

// Event type labels (Italian)
const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  chest: { label: 'Forziere', color: '#EBA601', icon: '📦' },
  trapChest: { label: 'Forziere Trappola!', color: '#BE2156', icon: '⚠' },
  combat: { label: 'Nemici', color: '#cc2233', icon: '⚔' },
  terminal: { label: 'Terminale', color: '#5CC4F0', icon: '◈' },
  questNpc: { label: 'NPC Quest', color: '#3b82f6', icon: '◈' },
  playerKiller: { label: 'Player Killer!', color: '#BE2156', icon: '☠' },
  distressNpc: { label: 'NPC in Difficoltà', color: '#EBA601', icon: '!' },
};

export default function ExplorePanel({ open, onClose, subAreaId, onItemFound, onRest }: ExplorePanelProps) {
  const { play } = useSaoSound();
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });
  const [isHover, setIsHover] = useState(false);

  // Exploration state
  const [exploreState, setExploreState] = useState<ExploreState>(createInitialExploreState);
  const [run, setRun] = useState<SubAreaRun | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [foundItem, setFoundItem] = useState<string | null>(null);

  const subAreaDef = getSubAreaById(subAreaId);
  const areaDef = EXPLORE_AREAS.find((a) => a.id === subAreaDef?.areaId);

  // Generate run when panel opens
  useEffect(() => {
    if (open && subAreaDef) {
      const checkpoint = exploreState.subAreaCheckpoints[subAreaId];
      const seed = checkpoint?.seed ?? generateSeed();
      const newRun = generateSubAreaRun(subAreaDef, seed, checkpoint);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRun(newRun);
      const t = setTimeout(() => play('popupPanel', 0.4), 300);
      return () => clearTimeout(t);
    }
    if (!open) {
      setRun(null);
      setShowTerminal(false);
      setFoundItem(null);
    }
  }, [open, subAreaId, subAreaDef, exploreState, play]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showTerminal && !foundItem) {
        play('dismissLauncher', 0.35);
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose, play, showTerminal, foundItem]);

  // VR hover effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      if (isHover) { setIsHover(false); setTransform(''); }
      return;
    }
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTransform(`perspective(1200px) rotateX(${-(py - 0.5) * 6}deg) rotateY(${(px - 0.5) * 6}deg) scale3d(1.01, 1.01, 1.01)`);
    setLightPos({ x: px * 100, y: py * 100 });
    if (!isHover) setIsHover(true);
  };

  // === Zone interaction ===
  const currentZone = run?.zones[run.currentZoneIndex];

  const handleAdvanceZone = useCallback(() => {
    if (!run) return;
    // Mark current zone as cleared
    const updatedZones = [...run.zones];
    updatedZones[run.currentZoneIndex] = {
      ...updatedZones[run.currentZoneIndex],
      cleared: true,
      events: updatedZones[run.currentZoneIndex].events.map((ev) => ({ ...ev, resolved: true })),
    };

    const nextIndex = run.currentZoneIndex + 1;

    if (nextIndex >= 8) {
      // Sub-area completed!
      setRun({ ...run, zones: updatedZones, currentZoneIndex: 7 });
      setExploreState((prev) => ({
        ...prev,
        subAreaProgress: {
          ...prev.subAreaProgress,
          [subAreaId]: { status: 'completed' },
        },
        activeRun: null,
        subAreaCheckpoints: {
          ...prev.subAreaCheckpoints,
          [subAreaId]: undefined as never, // remove checkpoint
        },
      }));
      play('present', 0.5);
    } else {
      setRun({ ...run, zones: updatedZones, currentZoneIndex: nextIndex });
      play('click', 0.3);
    }
  }, [run, subAreaId, play]);

  const handleResolveEvent = useCallback((event: ZoneEvent) => {
    if (event.resolved) return;

    switch (event.type) {
      case 'chest': {
        const itemId = getChestLoot(event);
        if (itemId) {
          const item = SAMPLE_ITEMS.find((i) => i.id === itemId);
          if (item) {
            setFoundItem(item.name);
            onItemFound?.(itemId);
            play('present', 0.4);
          }
        } else {
          setFoundItem('Vuoto');
          play('click', 0.3);
        }
        break;
      }
      case 'terminal': {
        setShowTerminal(true);
        play('popupPanel', 0.4);
        break;
      }
      case 'combat':
      case 'trapChest':
      case 'playerKiller':
      case 'distressNpc':
        // TODO(combat-system): startCombat with event.payload composition
        play('alert', 0.4);
        // For now, mark as resolved (stub)
        break;
      case 'questNpc':
        // TODO(quest-system): create PendingQuestStub
        play('message', 0.4);
        break;
    }
  }, [onItemFound, play]);

  const handleTerminalRest = useCallback(() => {
    onRest?.();
    play('welcome', 0.4);
    setShowTerminal(false);
  }, [onRest, play]);

  const handleTerminalCheckpoint = useCallback(() => {
    if (!run) return;
    setExploreState((prev) => ({
      ...prev,
      subAreaCheckpoints: {
        ...prev.subAreaCheckpoints,
        [subAreaId]: {
          seed: run.seed,
          zoneIndex: run.currentZoneIndex,
          spawnedTrapChest: run.spawnedTrapChest,
          spawnedQuestNpc: run.spawnedQuestNpc,
          spawnedDistressNpc: run.spawnedDistressNpc,
        },
      },
    }));
    play('system', 0.4);
    setShowTerminal(false);
  }, [run, subAreaId, play]);

  const isCompleted = exploreState.subAreaProgress[subAreaId]?.status === 'completed';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ background: 'rgba(2, 8, 20, 0.7)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setIsHover(false); setTransform(''); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              opacity: { duration: 0.5, ease: 'easeOut' },
              scale: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(1000px, 95vw)' }}
          >
            <div
              ref={cardRef}
              className="relative"
              style={{
                maxHeight: '90vh',
                overflow: 'hidden',
                transform,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.18s ease-out',
              }}
            >
              {/* VR glow */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  opacity: isHover ? 1 : 0,
                  background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, rgba(92, 196, 240, 0.18) 0%, transparent 50%)`,
                  mixBlendMode: 'screen',
                  zIndex: 50,
                }}
              />
              {/* Card body */}
              <div
                className="relative w-full"
                style={{
                  background: '#FBFBFB',
                  clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
                  boxShadow: isHover
                    ? '0 20px 60px rgba(0,0,0,0.6), 0 0 80px rgba(43, 115, 179, 0.5)'
                    : '0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(43, 115, 179, 0.3)',
                  transition: 'box-shadow 0.25s',
                }}
              >
                <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)' }} />

                {/* Close button */}
                <button
                  onClick={() => { play('dismissLauncher', 0.35); onClose(); }}
                  className="absolute top-3 right-3 z-10"
                  style={{ width: '28px', height: '28px', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
                  aria-label="Chiudi"
                >
                  <img src="/sao/window/btn-red.svg" alt="Chiudi" className="w-full h-full" draggable={false} />
                </button>

                {/* Title */}
                <div
                  className="px-8 pt-5 pb-3 text-center"
                  style={{ background: 'linear-gradient(180deg, #EFEFEF 0%, #DFDFDF 100%)', borderBottom: '1px solid #A8A8A8' }}
                >
                  <p
                    className="tracking-[0.25em] mb-1"
                    style={{ color: 'rgba(26,42,58,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.65rem' }}
                  >
                    {areaDef?.name.toUpperCase()}
                  </p>
                  <h2
                    className="tracking-[0.3em]"
                    style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}
                  >
                    {subAreaDef?.name.toUpperCase()}
                  </h2>
                  {isCompleted && (
                    <p
                      className="mt-1 tracking-[0.3em]"
                      style={{ color: '#7FC522', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.65rem' }}
                    >
                      [ COMPLETATA ]
                    </p>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 sao-scroll" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  {run && currentZone && !isCompleted && (
                    <>
                      {/* Zone path visualization (8 zones) */}
                      <div className="flex items-center justify-center gap-1 mb-6">
                        {run.zones.map((zone, i) => (
                          <div key={zone.id} className="flex items-center">
                            {/* Zone dot */}
                            <div
                              className="flex items-center justify-center"
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background:
                                  zone.cleared
                                    ? 'rgba(127, 197, 34, 0.3)'
                                    : i === run.currentZoneIndex
                                      ? 'rgba(43, 115, 179, 0.8)'
                                      : 'rgba(48, 48, 48, 0.1)',
                                border: `2px solid ${
                                  zone.cleared
                                    ? 'rgba(127, 197, 34, 0.6)'
                                    : i === run.currentZoneIndex
                                      ? '#2B73B3'
                                      : 'rgba(43, 115, 179, 0.2)'
                                }`,
                                color: zone.cleared
                                  ? '#3a7a0c'
                                  : i === run.currentZoneIndex
                                    ? '#FBFBFB'
                                    : 'rgba(26,42,58,0.4)',
                                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                fontWeight: 400,
                                fontSize: '0.6rem',
                              }}
                            >
                              {zone.position}
                            </div>
                            {/* Connector line */}
                            {i < 7 && (
                              <div
                                style={{
                                  width: '20px',
                                  height: '2px',
                                  background: zone.cleared ? 'rgba(127, 197, 34, 0.4)' : 'rgba(43, 115, 179, 0.15)',
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Current zone card */}
                      <div className="glass-panel p-5 mb-4">
                        <div className="flex items-baseline justify-between mb-2">
                          <h3
                            className="tracking-[0.2em]"
                            style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '1.1rem' }}
                          >
                            ZONA {currentZone.position} — {currentZone.title}
                          </h3>
                          <span
                            style={{ color: 'rgba(92,196,240,0.6)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.6rem', letterSpacing: '0.15em' }}
                          >
                            {currentZone.terrain.toUpperCase()}
                          </span>
                        </div>
                        <p
                          className="leading-relaxed mb-4"
                          style={{ color: 'rgba(251,251,251,0.7)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.8rem' }}
                        >
                          {currentZone.description}
                        </p>

                        {/* Events in current zone */}
                        {currentZone.events.length > 0 ? (
                          <div className="flex flex-col gap-2 mb-4">
                            {currentZone.events.map((event, idx) => {
                              const meta = EVENT_LABELS[event.type] || { label: event.type, color: '#999', icon: '?' };
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleResolveEvent(event)}
                                  disabled={event.resolved}
                                  className="flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                                  style={{
                                    background: event.resolved
                                      ? 'rgba(48, 48, 48, 0.2)'
                                      : `${meta.color}22`,
                                    border: `1px solid ${event.resolved ? 'rgba(48,48,48,0.2)' : meta.color + '66'}`,
                                    clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                                    cursor: event.resolved ? 'default' : 'pointer',
                                    opacity: event.resolved ? 0.4 : 1,
                                  }}
                                >
                                  <span style={{ color: meta.color, fontSize: '1rem', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif" }}>
                                    {meta.icon}
                                  </span>
                                  <span
                                    style={{
                                      color: event.resolved ? 'rgba(251,251,251,0.4)' : '#FBFBFB',
                                      fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                                      fontWeight: 400,
                                      fontSize: '0.75rem',
                                      letterSpacing: '0.05em',
                                    }}
                                  >
                                    {meta.label}
                                    {event.resolved ? ' — Risolto' : ''}
                                  </span>
                                  {!event.resolved && (
                                    <span
                                      className="ml-auto"
                                      style={{ color: meta.color, fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.6rem' }}
                                    >
                                      ▸
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p
                            className="mb-4"
                            style={{ color: 'rgba(251,251,251,0.3)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.15em' }}
                          >
                            Zona di passaggio. Nessun evento.
                          </p>
                        )}

                        {/* Advance button */}
                        <div className="flex justify-end">
                          <button
                            onClick={handleAdvanceZone}
                            className="px-5 py-2"
                            style={{
                              background: 'linear-gradient(135deg, #5CC4F0 0%, #2B73B3 60%, #0682BE 100%)',
                              boxShadow: '0 0 20px rgba(43,115,179,0.6), inset 0 0 8px rgba(255,255,255,0.25)',
                              border: '1px solid rgba(255,255,255,0.5)',
                              clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                              color: '#FBFBFB',
                              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                              fontWeight: 400,
                              fontSize: '0.75rem',
                              letterSpacing: '0.2em',
                              cursor: 'pointer',
                            }}
                          >
                            {run.currentZoneIndex === 7 ? 'COMPLETA SOTTO-AREA →' : 'AVANZA →'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Completion message */}
                  {isCompleted && (
                    <div className="text-center py-12">
                      <h3
                        className="tracking-[0.3em] mb-3"
                        style={{ color: '#7FC522', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '1.3rem' }}
                      >
                        SOTTO-AREA COMPLETATA
                      </h3>
                      <p
                        style={{ color: 'rgba(26,42,58,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.8rem' }}
                      >
                        Hai esplorato tutte le 8 zone. Torna alla mappa del piano.
                      </p>
                    </div>
                  )}
                </div>

                <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)' }} />
              </div>
            </div>
          </motion.div>

          {/* Terminal overlay */}
          <AnimatePresence>
            {showTerminal && (
              <TerminalOverlay
                onClose={() => setShowTerminal(false)}
                onRest={handleTerminalRest}
                onCheckpoint={handleTerminalCheckpoint}
                visitedHubs={exploreState.visitedHubs}
              />
            )}
          </AnimatePresence>

          {/* Item found overlay */}
          <AnimatePresence>
            {foundItem && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ background: 'rgba(2,8,20,0.8)', backdropFilter: 'blur(4px)' }}
                onClick={() => setFoundItem(null)}
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="glass-panel p-8 text-center"
                  style={{ minWidth: '300px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p
                    className="tracking-[0.3em] mb-3"
                    style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem' }}
                  >
                    HAI TROVATO
                  </p>
                  <h3
                    className="tracking-[0.15em] mb-4"
                    style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '1.2rem' }}
                  >
                    {foundItem === 'Vuoto' ? 'Forziere vuoto...' : foundItem}
                  </h3>
                  <button
                    onClick={() => setFoundItem(null)}
                    className="px-5 py-2"
                    style={{
                      background: 'rgba(43,115,179,0.8)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                      color: '#FBFBFB',
                      fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                      fontWeight: 400,
                      fontSize: '0.7rem',
                      letterSpacing: '0.2em',
                      cursor: 'pointer',
                    }}
                  >
                    OK
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Terminal Overlay ---------- */

function TerminalOverlay({
  onClose,
  onRest,
  onCheckpoint,
  visitedHubs,
}: {
  onClose: () => void;
  onRest: () => void;
  onCheckpoint: () => void;
  visitedHubs: string[];
}) {
  const { play } = useSound();
  const [showCheckpointMsg, setShowCheckpointMsg] = useState(false);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: 'rgba(2,8,20,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel p-6"
        style={{ minWidth: 'min(400px, 90vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="tracking-[0.3em] text-center mb-4"
          style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '1rem' }}
        >
          TERMINALE
        </h3>

        {!showCheckpointMsg ? (
          <div className="flex flex-col gap-2">
            {/* Rest */}
            <TerminalButton
              label="Riposa (HP/MP/Energia full)"
              color="#7FC522"
              onClick={() => { onRest(); }}
            />
            {/* Modify bag — TODO: open bag panel */}
            <TerminalButton
              label="Modifica Borsa"
              color="#5CC4F0"
              onClick={() => { play('click', 0.3); /* TODO: open bag panel */ }}
            />
            {/* Teleport */}
            <TerminalButton
              label="Teletrasporto"
              color="#EBA601"
              onClick={() => { setShowCheckpointMsg(true); play('system', 0.3); }}
            />
            {/* Close */}
            <TerminalButton
              label="Chiudi"
              color="#BE2156"
              onClick={() => { play('dismissLauncher', 0.3); onClose(); }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p
              className="text-center tracking-[0.15em] mb-2"
              style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.8rem' }}
            >
              Registrare la posizione attuale?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => { onCheckpoint(); setShowCheckpointMsg(false); }}
                className="px-4 py-2"
                style={{
                  background: 'rgba(43,115,179,0.8)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                  color: '#FBFBFB',
                  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                  fontWeight: 400,
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  cursor: 'pointer',
                }}
              >
                SÌ
              </button>
              <button
                onClick={() => { setShowCheckpointMsg(false); play('dismissLauncher', 0.3); }}
                className="px-4 py-2"
                style={{
                  background: 'rgba(190,33,86,0.6)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                  color: '#FBFBFB',
                  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                  fontWeight: 400,
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  cursor: 'pointer',
                }}
              >
                NO
              </button>
            </div>
            {visitedHubs.length > 0 && (
              <p
                className="text-center mt-2"
                style={{ color: 'rgba(92,196,240,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem', letterSpacing: '0.1em' }}
              >
                HUB visitati: {visitedHubs.join(', ')}
              </p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function TerminalButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 text-left"
      style={{
        background: `${color}22`,
        border: `1px solid ${color}55`,
        clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
        color: '#FBFBFB',
        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
        fontWeight: 400,
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}44`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${color}22`; }}
    >
      {label}
    </button>
  );
}
