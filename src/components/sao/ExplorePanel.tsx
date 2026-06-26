'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import {
  type SubAreaRun,
  type ZoneNode,
  type ZoneEvent,
  type ExploreState,
  createInitialExploreState,
} from '@/lib/sao-explore-types';
import {
  EXPLORE_AREAS,
  getSubAreasForArea,
  getSubAreaById,
} from '@/lib/sao-explore-data';
import { generateSubAreaRun, generateSeed, getChestLoot } from '@/lib/sao-explore-engine';
import { SAMPLE_ITEMS } from '@/lib/sao-sample-items';
import type { Item, EquipmentState } from '@/lib/sao-inventory-types';
import { BAG_MAX_ITEMS } from '@/lib/sao-inventory-types';
import ItemDetailModal from './ItemDetailModal';

/**
 * SAO Explore Panel — Full-screen procedural exploration.
 */

interface ExplorePanelProps {
  open: boolean;
  onClose: () => void;
  areaId?: string;
  onItemFound?: (itemId: string) => void;
  onRest?: () => void;
  // Terminal management props
  items?: Item[];
  equipment?: EquipmentState;
  onMoveToBag?: (item: Item) => void;
  onMoveToInventory?: (item: Item) => void;
  onEquip?: (item: Item) => void;
  onUnequip?: (slot: string) => void;
  // Cheats
  cheats?: { skipEvents: boolean; immortal: boolean; instakill: boolean; infiniteCol: boolean };
}

const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  chest: { label: 'Forziere', color: '#EBA601', icon: '◆' },
  trapChest: { label: 'Forziere Trappola!', color: '#BE2156', icon: '⚠' },
  combat: { label: 'Nemici', color: '#cc2233', icon: '⚔' },
  terminal: { label: 'Terminale', color: '#5CC4F0', icon: '◈' },
  questNpc: { label: 'NPC Quest', color: '#3b82f6', icon: '✦' },
  playerKiller: { label: 'Player Killer!', color: '#BE2156', icon: '☠' },
  distressNpc: { label: 'NPC in Difficoltà', color: '#EBA601', icon: '!' },
};

export default function ExplorePanel({ open, onClose, areaId = 'grandi-pianure', onItemFound, onRest, items = [], equipment, onMoveToBag, onMoveToInventory, onEquip, onUnequip, cheats }: ExplorePanelProps) {
  const { play } = useSaoSound();
  const [exploreState, setExploreState] = useState<ExploreState>(createInitialExploreState);
  const [run, setRun] = useState<SubAreaRun | null>(null);
  const [view, setView] = useState<'subareas' | 'exploring'>('subareas');
  const [activeSubAreaId, setActiveSubAreaId] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [foundItem, setFoundItem] = useState<string | null>(null);
  const [showCheckmark, setShowCheckmark] = useState<string | null>(null);

  const areaDef = EXPLORE_AREAS.find((a) => a.id === areaId);
  const subAreas = areaDef ? getSubAreasForArea(areaId) : [];
  const currentZone = run?.zones[run.currentZoneIndex];
  const activeSubAreaDef = activeSubAreaId ? getSubAreaById(activeSubAreaId) : null;

  // Sound on open
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => play('popupPanel', 0.4), 200);
      return () => clearTimeout(t);
    }
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRun(null);
      setView('subareas');
      setActiveSubAreaId(null);
      setShowTerminal(false);
      setFoundItem(null);
      setShowCheckmark(null);
    }
  }, [open, play]);

  // ESC
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTerminal || foundItem) return;
        if (view === 'exploring') {
          play('dismissLauncher', 0.3);
          setView('subareas');
          setRun(null);
          setActiveSubAreaId(null);
        } else {
          play('dismissLauncher', 0.35);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose, play, view, showTerminal, foundItem]);

  // Start exploration
  const handleStartExplore = useCallback((subAreaId: string) => {
    const def = getSubAreaById(subAreaId);
    if (!def) return;
    const checkpoint = exploreState.subAreaCheckpoints[subAreaId];
    const seed = checkpoint?.seed ?? generateSeed();
    const newRun = generateSubAreaRun(def, seed, checkpoint);
    setRun(newRun);
    setActiveSubAreaId(subAreaId);
    setView('exploring');
    play('click', 0.5);
  }, [exploreState, play]);

  // Advance zone
  const handleAdvance = useCallback(() => {
    if (!run || !activeSubAreaId) return;

    // Blocca avanzamento se non sono risolti almeno 2 eventi (a meno che skipEvents non sia attivo)
    const currentZone = run.zones[run.currentZoneIndex];
    if (currentZone && currentZone.terrain !== 'terminal' && !cheats?.skipEvents) {
      const resolvedCount = currentZone.events.filter((e) => e.resolved).length;
      if (resolvedCount < 2) {
        play('warning', 0.3);
        return;
      }
    }

    const updatedZones = run.zones.map((z, i) =>
      i === run.currentZoneIndex
        ? { ...z, cleared: true, events: z.events.map((ev) => ({ ...ev, resolved: true })) }
        : z,
    );
    const nextIndex = run.currentZoneIndex + 1;

    if (nextIndex >= 8) {
      // Completed!
      setRun({ ...run, zones: updatedZones, currentZoneIndex: 7 });
      setExploreState((prev) => ({
        ...prev,
        subAreaProgress: {
          ...prev.subAreaProgress,
          [activeSubAreaId]: { status: 'completed' },
        },
        activeRun: null,
      }));
      setShowCheckmark(activeSubAreaId);
      play('present', 0.5);
      setTimeout(() => {
        setShowCheckmark(null);
        setView('subareas');
        setRun(null);
        setActiveSubAreaId(null);
      }, 2500);
    } else {
      setRun({ ...run, zones: updatedZones, currentZoneIndex: nextIndex });
      play('click', 0.3);
    }
  }, [run, activeSubAreaId, play, cheats]);

  // Resolve event — marks the event as resolved so it can't be clicked again.
  // EXCEPTION: terminal events are NEVER marked as resolved (reusable — can be
  // clicked multiple times to access rest/checkpoint/manage bag repeatedly).
  const handleResolveEvent = useCallback((event: ZoneEvent) => {
    if (event.resolved) return;
    if (!run) return;

    // Terminal events are reusable — don't mark as resolved
    if (event.type !== 'terminal') {
      const updatedZones = run.zones.map((z, i) => {
        if (i !== run.currentZoneIndex) return z;
        return {
          ...z,
          events: z.events.map((ev) =>
            ev === event ? { ...ev, resolved: true } : ev
          ),
        };
      });
      setRun({ ...run, zones: updatedZones });
    }

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
          setFoundItem('Forziere vuoto...');
          play('click', 0.3);
        }
        break;
      }
      case 'terminal':
        setShowTerminal(true);
        play('popupPanel', 0.4);
        break;
      case 'combat':
      case 'trapChest':
      case 'playerKiller':
      case 'distressNpc':
        // TODO(combat-system)
        play('alert', 0.4);
        break;
      case 'questNpc':
        // TODO(quest-system)
        play('message', 0.4);
        break;
    }
  }, [run, onItemFound, play]);

  const handleTerminalRest = useCallback(() => {
    onRest?.();
    play('welcome', 0.4);
    setShowTerminal(false);
  }, [onRest, play]);

  const handleTerminalCheckpoint = useCallback(() => {
    if (!run || !activeSubAreaId) return;
    setExploreState((prev) => ({
      ...prev,
      subAreaCheckpoints: {
        ...prev.subAreaCheckpoints,
        [activeSubAreaId]: {
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
  }, [run, activeSubAreaId, play]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ background: 'rgba(2, 8, 20, 0.92)', backdropFilter: 'blur(10px)' }}
        >
          {/* CRT TV power-on animation overlay */}
          <motion.div
            className="absolute inset-0 z-50 pointer-events-none"
            style={{ background: '#5CC4F0' }}
            initial={{ scaleY: 0.005, opacity: 1 }}
            animate={{ scaleY: [0.005, 0.005, 1, 1], opacity: [1, 1, 1, 0] }}
            transition={{ duration: 0.6, times: [0, 0.15, 0.5, 1], ease: 'easeOut' }}
          />

          {/* Close button */}
          <button
            onClick={() => {
              play('dismissLauncher', 0.35);
              onClose();
            }}
            className="absolute top-4 right-4 z-30"
            style={{ width: '32px', height: '32px', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
            aria-label="Chiudi"
          >
            <img src="/sao/window/btn-red.svg" alt="Chiudi" className="w-full h-full" draggable={false} />
          </button>

          {/* Back button (when exploring) */}
          {view === 'exploring' && (
            <button
              onClick={() => {
                play('dismissLauncher', 0.3);
                setView('subareas');
                setRun(null);
                setActiveSubAreaId(null);
              }}
              className="absolute top-4 left-4 z-30"
              style={{
                color: 'rgba(92, 196, 240, 0.6)',
                fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                fontWeight: 400,
                fontSize: '0.7rem',
                letterSpacing: '0.2em',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
              }}
            >
              ◀ SOTTO-AREE
            </button>
          )}

          {/* === SUB-AREA SELECTION === */}
          {view === 'subareas' && (
            <motion.div
              className="h-full flex flex-col items-center justify-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* Title */}
              <p
                className="tracking-[0.3em] mb-2"
                style={{ color: 'rgba(92,196,240,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem' }}
              >
                {areaDef?.name.toUpperCase()}
              </p>
              <h2
                className="tracking-[0.4em] mb-8"
                style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: 'clamp(1.2rem, 3vw, 2rem)', textShadow: '0 0 20px rgba(92,196,240,0.5)' }}
              >
                SELEZIONA SOTTO-AREA
              </h2>

              {/* Sub-area cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
                {subAreas.map((sa, idx) => {
                  const status = exploreState.subAreaProgress[sa.id]?.status ?? 'unlocked';
                  const isCompleted = status === 'completed';
                  return (
                    <SubAreaCard
                      key={sa.id}
                      sa={sa}
                      idx={idx}
                      isCompleted={isCompleted}
                      onClick={() => handleStartExplore(sa.id)}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* === EXPLORING === */}
          {view === 'exploring' && run && currentZone && activeSubAreaDef && (
            <motion.div
              className="h-full flex flex-col items-center justify-center px-6 py-16 overflow-y-auto sao-scroll"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Sub-area title */}
              <p
                className="tracking-[0.25em] mb-1"
                style={{ color: 'rgba(92,196,240,0.4)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.6rem' }}
              >
                {activeSubAreaDef.name.toUpperCase()}
              </p>

              {/* Zone path */}
              <div className="flex items-center justify-center gap-1 mb-6">
                {run.zones.map((zone, i) => (
                  <div key={zone.id} className="flex items-center">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: zone.cleared ? 'rgba(127,197,34,0.3)' : i === run.currentZoneIndex ? 'rgba(43,115,179,0.8)' : 'rgba(48,48,48,0.2)',
                        border: `2px solid ${zone.cleared ? 'rgba(127,197,34,0.6)' : i === run.currentZoneIndex ? '#2B73B3' : 'rgba(43,115,179,0.2)'}`,
                        color: zone.cleared ? '#3a7a0c' : i === run.currentZoneIndex ? '#FBFBFB' : 'rgba(251,251,251,0.3)',
                        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        fontWeight: 400, fontSize: '0.6rem',
                      }}
                    >
                      {zone.position}
                    </div>
                    {i < 7 && <div style={{ width: '20px', height: '2px', background: zone.cleared ? 'rgba(127,197,34,0.4)' : 'rgba(43,115,179,0.15)' }} />}
                  </div>
                ))}
              </div>

              {/* Current zone card — same style as SubAreaCard (white borders, VR hover) */}
              <ZoneCard currentZone={currentZone} run={run} onResolveEvent={handleResolveEvent} onAdvance={handleAdvance} cheats={cheats} />
            </motion.div>
          )}

          {/* === COMPLETION CHECKMARK (non-invasive) === */}
          <AnimatePresence>
            {showCheckmark && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', duration: 0.6 }}
                >
                  {/* SAO-style check circle */}
                  <motion.div
                    className="flex items-center justify-center"
                    style={{
                      width: '80px', height: '80px', borderRadius: '50%',
                      background: 'rgba(127, 197, 34, 0.15)',
                      border: '3px solid rgba(127, 197, 34, 0.7)',
                      boxShadow: '0 0 30px rgba(127, 197, 34, 0.4)',
                    }}
                  >
                    <motion.svg width="40" height="40" viewBox="0 0 40 40" fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <motion.path d="M8 20L16 28L32 12" stroke="#7FC522" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  </motion.div>
                  <motion.p
                    className="mt-4 tracking-[0.3em]"
                    style={{ color: '#7FC522', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.8rem', textShadow: '0 0 12px rgba(127,197,34,0.5)' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    SOTTO-AREA COMPLETATA
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* === TERMINAL OVERLAY === */}
          <AnimatePresence>
            {showTerminal && (
              <TerminalOverlay
                onClose={() => setShowTerminal(false)}
                onRest={handleTerminalRest}
                onCheckpoint={handleTerminalCheckpoint}
                visitedHubs={exploreState.visitedHubs}
                onManageBag={() => { setShowTerminal(false); setShowManagePanel(true); play('popupPanel', 0.4); }}
              />
            )}
          </AnimatePresence>

          {/* === TERMINAL MANAGE PANEL === */}
          <AnimatePresence>
            {showManagePanel && (
              <TerminalManagePanel
                items={items}
                equipment={equipment}
                onMoveToBag={onMoveToBag}
                onMoveToInventory={onMoveToInventory}
                onEquip={onEquip}
                onUnequip={onUnequip}
                onClose={() => { setShowManagePanel(false); play('dismissLauncher', 0.3); }}
              />
            )}
          </AnimatePresence>

          {/* === ITEM FOUND OVERLAY === */}
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
                  style={{ minWidth: '300px', borderColor: 'rgba(43,115,179,0.5)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="tracking-[0.3em] mb-3" style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem' }}>
                    HAI TROVATO
                  </p>
                  <h3 className="tracking-[0.15em] mb-4" style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '1.2rem' }}>
                    {foundItem}
                  </h3>
                  <button
                    onClick={() => setFoundItem(null)}
                    className="px-5 py-2"
                    style={{
                      background: 'rgba(43,115,179,0.8)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                      color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.2em', cursor: 'pointer',
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

function TerminalOverlay({ onClose, onRest, onCheckpoint, visitedHubs, onManageBag }: {
  onClose: () => void; onRest: () => void; onCheckpoint: () => void; visitedHubs: string[]; onManageBag: () => void;
}) {
  const { play } = useSaoSound();
  const [showCheckpointMsg, setShowCheckpointMsg] = useState(false);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(2,8,20,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel p-6" style={{ minWidth: 'min(400px, 90vw)', borderColor: 'rgba(43,115,179,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="tracking-[0.3em] text-center mb-4" style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '1rem' }}>
          TERMINALE
        </h3>
        {!showCheckpointMsg ? (
          <div className="flex flex-col gap-2">
            <TerminalButton label="Riposa (HP/MP/Energia full)" color="#7FC522" onClick={onRest} />
            <TerminalButton label="Modifica Borsa" color="#5CC4F0" onClick={onManageBag} />
            <TerminalButton label="Teletrasporto" color="#EBA601" onClick={() => { setShowCheckpointMsg(true); play('system', 0.3); }} />
            <TerminalButton label="Chiudi" color="#BE2156" onClick={() => { play('dismissLauncher', 0.3); onClose(); }} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-center tracking-[0.15em] mb-2" style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.8rem' }}>
              Registrare la posizione attuale?
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => { onCheckpoint(); setShowCheckpointMsg(false); }} className="px-4 py-2" style={{ background: 'rgba(43,115,179,0.8)', border: '1px solid rgba(255,255,255,0.3)', clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)', color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.15em', cursor: 'pointer' }}>
                SÌ
              </button>
              <button onClick={() => { setShowCheckpointMsg(false); play('dismissLauncher', 0.3); }} className="px-4 py-2" style={{ background: 'rgba(190,33,86,0.6)', border: '1px solid rgba(255,255,255,0.2)', clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)', color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.15em', cursor: 'pointer' }}>
                NO
              </button>
            </div>
            {visitedHubs.length > 0 && (
              <p className="text-center mt-2" style={{ color: 'rgba(92,196,240,0.4)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem', letterSpacing: '0.1em' }}>
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
      className="px-4 py-2.5 text-left w-full transition-all"
      style={{
        background: `${color}22`,
        border: `1px solid ${color}55`,
        clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
        color: '#FBFBFB',
        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
        fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}44`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${color}22`; }}
    >
      {label}
    </button>
  );
}

/* ---------- Zone Card with VR hover (same style as SubAreaCard) ---------- */

function ZoneCard({ currentZone, run, onResolveEvent, onAdvance, cheats }: {
  currentZone: ZoneNode;
  run: SubAreaRun;
  onResolveEvent: (event: ZoneEvent) => void;
  onAdvance: () => void;
  cheats?: { skipEvents: boolean; immortal: boolean; instakill: boolean; infiniteCol: boolean };
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  // Single state object for hover transform + light position (reduces re-renders)
  const [hover, setHover] = useState<{ tilt: string; lightX: number; lightY: number } | null>(null);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // RAF throttle ref — coalesce multiple mousemove events into 1 frame
  const rafRef = useRef<number | null>(null);

  // Typewriter effect per la descrizione lunga
  useEffect(() => {
    if (!currentZone.longDescription) {
      setTypedText('');
      return;
    }
    setIsTyping(true);
    setTypedText('');
    const text = currentZone.longDescription;
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 15); // 15ms per carattere
    return () => clearInterval(interval);
  }, [currentZone.id, currentZone.longDescription]);

  // Throttled mouse-move handler — uses RAF to coalesce events to 1 per frame
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    // Cancel pending frame, schedule new one
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      setHover({
        tilt: `perspective(800px) rotateX(${-(py - 0.5) * 8}deg) rotateY(${(px - 0.5) * 8}deg) scale3d(1.02, 1.02, 1.02)`,
        lightX: px * 100,
        lightY: py * 100,
      });
      rafRef.current = null;
    });
  };

  const resolvedCount = currentZone.events.filter((e) => e.resolved).length;
  const canAdvance = currentZone.terrain === 'terminal' || resolvedCount >= 2 || !!cheats?.skipEvents;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setHover(null); if (rafRef.current) cancelAnimationFrame(rafRef.current); }}
      className="relative w-full max-w-2xl overflow-hidden"
      style={{
        padding: '24px',
        transform: hover?.tilt,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out',
        background: 'rgba(8, 22, 40, 0.85)',
        border: '2px solid rgba(251, 251, 251, 0.5)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 0 20px rgba(43, 115, 179, 0.08)',
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
        willChange: hover ? 'transform' : 'auto',
      }}
    >
      {/* VR glow following cursor */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: hover ? 1 : 0,
          background: `radial-gradient(circle at ${hover?.lightX ?? 50}% ${hover?.lightY ?? 50}%, rgba(92, 196, 240, 0.15) 0%, transparent 50%)`,
          mixBlendMode: 'screen',
        }}
      />

      {/* Zone title */}
      <div className="flex items-baseline justify-between mb-2">
        <h3
          className="tracking-[0.2em]"
          style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '1.1rem' }}
        >
          ZONA {currentZone.position} — {currentZone.title}
        </h3>
        <span style={{ color: 'rgba(92,196,240,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem', letterSpacing: '0.15em' }}>
          {currentZone.terrain.toUpperCase()}
        </span>
      </div>

      {/* Long description with typewriter effect — white SAO-style, larger for readability */}
      {typedText && (
        <p
          className="leading-relaxed mb-3"
          style={{
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            fontSize: '0.85rem',
            lineHeight: 1.8,
            minHeight: '4rem',
            textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.7)',
            letterSpacing: '0.01em',
          }}
        >
          {typedText}
          {isTyping && <span style={{ color: '#5CC4F0', animation: 'blink 1s infinite' }}>▋</span>}
        </p>
      )}

      {/* Short description — white SAO-style, slightly larger */}
      <p
        className="leading-relaxed mb-4"
        style={{
          color: '#FBFBFB',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          fontWeight: 400,
          fontSize: '0.85rem',
          lineHeight: 1.6,
          textShadow: '0 1px 3px rgba(0,0,0,0.95)',
          opacity: 0.9,
        }}
      >
        {currentZone.description}
      </p>

      {/* Events — displayed as small square cards (same style as character panel equipment slots) */}
      {currentZone.events.length > 0 ? (
        <div className="grid grid-cols-6 gap-1.5 mb-4 max-w-md">
          {currentZone.events.map((event, idx) => {
            const meta = EVENT_LABELS[event.type] || { label: event.type, color: '#999', icon: '?' };
            return (
              <EventSquareCard
                key={idx}
                label={meta.label}
                color={meta.color}
                icon={meta.icon}
                resolved={event.resolved}
                isTerminal={event.type === 'terminal'}
                onClick={() => onResolveEvent(event)}
              />
            );
          })}
        </div>
      ) : (
        <p className="mb-4" style={{ color: 'rgba(251,251,251,0.25)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.65rem', letterSpacing: '0.15em' }}>
          ZONA DI PASSAGGIO. NESSUN EVENTO.
        </p>
      )}

      {/* Advance button + event counter */}
      <div className="flex justify-between items-center">
        {currentZone.terrain !== 'terminal' && (
          <span
            style={{
              color: resolvedCount >= 2 ? 'rgba(127, 197, 34, 0.6)' : 'rgba(235, 166, 1, 0.6)',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400, fontSize: '0.55rem', letterSpacing: '0.15em',
            }}
          >
            EVENTI: {resolvedCount}/{currentZone.events.length}
            {resolvedCount < 2 ? ' (MIN 2)' : ''}
          </span>
        )}
        <button
          onClick={onAdvance}
          className="px-5 py-2 ml-auto"
          style={{
            background: canAdvance
              ? 'linear-gradient(135deg, #5CC4F0 0%, #2B73B3 60%, #0682BE 100%)'
              : 'rgba(48, 48, 48, 0.3)',
            boxShadow: canAdvance
              ? '0 0 20px rgba(43,115,179,0.5), inset 0 0 8px rgba(255,255,255,0.2)'
              : 'none',
            border: '1px solid rgba(255,255,255,0.3)',
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.2em',
            cursor: canAdvance ? 'pointer' : 'not-allowed',
            opacity: canAdvance ? 1 : 0.5,
          }}
        >
          {run.currentZoneIndex === 7 ? 'COMPLETA →' : 'AVANZA →'}
        </button>
      </div>
    </div>
  );
}

/* ---------- Event Square Card ----------
 * Square card style matching the Character Panel equipment slots.
 * Has a placeholder area for future event images (no image yet).
 * VR hover effect (3D tilt + glow) like the character panel.
 * When resolved: shows a checkmark and becomes non-clickable.
 */

function EventSquareCard({
  label,
  color,
  icon,
  resolved,
  isTerminal = false,
  onClick,
}: {
  label: string;
  color: string;
  icon: string;
  resolved: boolean;
  isTerminal?: boolean;
  onClick: () => void;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState('');
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });
  const [isHover, setIsHover] = useState(false);

  // Terminal events are always interactive (never "resolved/disabled")
  const isDisabled = resolved && !isTerminal;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt(`perspective(400px) rotateX(${-(py - 0.5) * 10}deg) rotateY(${(px - 0.5) * 10}deg) scale3d(1.04, 1.04, 1.04)`);
    setLightPos({ x: px * 100, y: py * 100 });
  };

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={isDisabled ? undefined : onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setTilt(''); setIsHover(false); }}
      onMouseEnter={() => setIsHover(true)}
      disabled={isDisabled}
      className="relative overflow-hidden transition-all"
      style={{
        aspectRatio: '1 / 1',
        transform: tilt,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out, opacity 0.2s',
        background: isDisabled
          ? 'rgba(48, 48, 48, 0.15)'
          : `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
        border: `1px solid ${isDisabled ? 'rgba(48, 48, 48, 0.2)' : color + '66'}`,
        clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
        cursor: isDisabled ? 'default' : 'pointer',
        opacity: isDisabled ? 0.4 : 1,
        padding: 0,
        willChange: isDisabled ? 'auto' : 'transform',
      }}
      aria-label={isDisabled ? `${label} - Completato` : label}
    >
      {/* VR glow following cursor (only when interactive) */}
      {!isDisabled && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            opacity: isHover ? 1 : 0,
            background: `radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, ${color}33 0%, transparent 60%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Content: icon + label + image placeholder */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-0.5">
        {/* Image placeholder area (for future event images) */}
        <div
          className="flex items-center justify-center mb-0.5"
          style={{
            width: '55%',
            aspectRatio: '1 / 1',
            background: isDisabled ? 'rgba(48, 48, 48, 0.1)' : `${color}15`,
            border: `1px dashed ${isDisabled ? 'rgba(48, 48, 48, 0.2)' : color + '44'}`,
            borderRadius: '2px',
          }}
        >
          {/* Icon as placeholder for future image */}
          <span
            style={{
              color: isDisabled ? 'rgba(251, 251, 251, 0.3)' : color,
              fontSize: '0.85rem',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
              fontWeight: 400,
              textShadow: isDisabled ? 'none' : `0 0 4px ${color}66`,
            }}
          >
            {isDisabled ? '✓' : icon}
          </span>
        </div>

        {/* Label */}
        <span
          className="text-center leading-tight"
          style={{
            color: isDisabled ? 'rgba(251, 251, 251, 0.4)' : '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            fontSize: '0.4rem',
            letterSpacing: '0.03em',
            textShadow: '0 1px 2px rgba(0,0,0,0.9)',
            padding: '0 1px',
          }}
        >
          {isDisabled ? 'COMPL.' : label.toUpperCase()}
        </span>
      </div>

      {/* Resolved overlay checkmark */}
      {isDisabled && (
        <div
          className="absolute top-0.5 right-0.5 flex items-center justify-center"
          style={{
            width: '10px',
            height: '10px',
            background: 'rgba(127, 197, 34, 0.9)',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          }}
        >
          <span style={{ color: '#FFFFFF', fontSize: '0.45rem', fontWeight: 700 }}>✓</span>
        </div>
      )}
    </button>
  );
}

/* ---------- Sub-Area Card with VR hover ---------- */

function SubAreaCard({ sa, idx, isCompleted, onClick }: {
  sa: { id: string; name: string; description: string; order: number };
  idx: number;
  isCompleted: boolean;
  onClick: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ tilt: string; lightX: number; lightY: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setHover({
        tilt: `perspective(800px) rotateX(${-(py - 0.5) * 10}deg) rotateY(${(px - 0.5) * 10}deg) scale3d(1.03, 1.03, 1.03)`,
        lightX: px * 100,
        lightY: py * 100,
      });
      rafRef.current = null;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + idx * 0.1, duration: 0.5 }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHover(null); if (rafRef.current) cancelAnimationFrame(rafRef.current); }}
        onClick={onClick}
        className="relative cursor-pointer overflow-hidden"
        style={{
          padding: '24px',
          transform: hover?.tilt,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.15s ease-out',
          background: 'rgba(8, 22, 40, 0.85)',
          border: `2px solid ${isCompleted ? 'rgba(127, 197, 34, 0.6)' : 'rgba(251, 251, 251, 0.5)'}`,
          boxShadow: isCompleted
            ? '0 4px 20px rgba(127, 197, 34, 0.2), inset 0 0 20px rgba(127, 197, 34, 0.05)'
            : '0 4px 20px rgba(0,0,0,0.4), inset 0 0 20px rgba(43, 115, 179, 0.08)',
          clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
          willChange: hover ? 'transform' : 'auto',
        }}
      >
        {/* VR glow following cursor */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: hover ? 1 : 0,
            background: `radial-gradient(circle at ${hover?.lightX ?? 50}% ${hover?.lightY ?? 50}%, rgba(92, 196, 240, 0.15) 0%, transparent 50%)`,
            mixBlendMode: 'screen',
          }}
        />

        {/* Completed checkmark */}
        {isCompleted && (
          <motion.div
            className="absolute top-3 right-3 flex items-center justify-center"
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'rgba(127, 197, 34, 0.2)',
              border: '2px solid rgba(127, 197, 34, 0.6)',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 + idx * 0.1, type: 'spring' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L5.5 10.5L12 3.5" stroke="#7FC522" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        )}

        {/* Order number */}
        <div
          className="mb-3 flex items-center justify-center"
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'rgba(43, 115, 179, 0.2)',
            border: '1px solid rgba(251, 251, 251, 0.3)',
            color: '#5CC4F0',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400, fontSize: '0.9rem',
          }}
        >
          {sa.order}
        </div>

        {/* Name */}
        <h3
          className="tracking-[0.2em] mb-2"
          style={{
            color: '#FBFBFB',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 700, fontSize: '1rem',
            textShadow: '0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {sa.name.toUpperCase()}
        </h3>

        {/* Description */}
        <p
          className="leading-relaxed mb-3"
          style={{
            color: 'rgba(251,251,251,0.5)',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400, fontSize: '0.7rem',
          }}
        >
          {sa.description}
        </p>

        {/* Status */}
        <p
          className="tracking-[0.2em]"
          style={{
            color: isCompleted ? 'rgba(127, 197, 34, 0.7)' : 'rgba(92, 196, 240, 0.5)',
            fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
            fontWeight: 400, fontSize: '0.6rem',
          }}
        >
          {isCompleted ? '[ COMPLETATA — RIESPLORABILE ]' : '[ DISPONIBILE ]'}
        </p>
      </div>
    </motion.div>
  );
}

/* ---------- Terminal Manage Panel (Borsa + Inventario + Equipaggiamento) ---------- */

function TerminalManagePanel({ items, equipment, onMoveToBag, onMoveToInventory, onEquip, onUnequip, onClose }: {
  items: Item[];
  equipment?: EquipmentState;
  onMoveToBag?: (item: Item) => void;
  onMoveToInventory?: (item: Item) => void;
  onEquip?: (item: Item) => void;
  onUnequip?: (slot: string) => void;
  onClose: () => void;
}) {
  const { play } = useSaoSound();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState('');
  const [lightPos, setLightPos] = useState({ x: 50, y: 50 });
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<'bag' | 'inventory' | 'equipment'>('bag');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      if (tilt) { setTilt(''); }
      return;
    }
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt(`perspective(1200px) rotateX(${-(py - 0.5) * 6}deg) rotateY(${(px - 0.5) * 6}deg) scale3d(1.01, 1.01, 1.01)`);
    setLightPos({ x: px * 100, y: py * 100 });
  };

  const bagItems = items.filter((i) => i.location === 'bag');
  const inventoryItems = items.filter((i) => {
    if (i.location !== 'inventory') return false;
    if (searchQuery.trim() && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeCategory !== 'all' && i.category !== activeCategory) return false;
    return true;
  });

  const equippedSlots = equipment ? [
    { slot: 'weapon', label: 'ARMA', itemId: equipment.weapon },
    { slot: 'shield', label: 'SCUDO', itemId: equipment.shield },
    { slot: 'armor', label: 'ARMATURA', itemId: equipment.armor },
    { slot: 'accessory1', label: 'ACC. 1', itemId: equipment.accessory1 },
    { slot: 'accessory2', label: 'ACC. 2', itemId: equipment.accessory2 },
  ] : [];

  const categories = ['all', 'one-handed-sword', 'two-handed-sword', 'one-handed-axe', 'two-handed-axe', 'dagger', 'finesword', 'shield', 'armor', 'accessory', 'item', 'potion', 'quest-item'];
  const catLabels: Record<string, string> = {
    'all': 'TUTTI', 'one-handed-sword': 'SPADE 1H', 'two-handed-sword': 'SPADONI', 'one-handed-axe': 'ASCE 1H',
    'two-handed-axe': 'ASCE 2H', 'dagger': 'PUGNALI', 'finesword': 'FIORETTO', 'shield': 'SCUDI',
    'armor': 'ARMATURE', 'accessory': 'ACCESSORI', 'item': 'OGGETTI', 'potion': 'POZIONI', 'quest-item': 'MISSIONE',
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: 'rgba(2,8,20,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt('')}
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
        style={{ width: 'min(900px, 95vw)', maxHeight: '90vh' }}
      >
        {/* Inner wrapper for VR tilt */}
        <div
          ref={cardRef}
          className="relative"
          style={{
            transform: tilt,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.18s ease-out',
          }}
        >
          {/* VR glow */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              opacity: tilt ? 1 : 0,
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
              boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(43, 115, 179, 0.3)',
            }}
          >
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)' }} />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10"
            style={{ width: '28px', height: '28px', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
            aria-label="Chiudi"
          >
            <img src="/sao/window/btn-red.svg" alt="Chiudi" className="w-full h-full" draggable={false} />
          </button>

          {/* Title */}
          <div className="px-8 pt-5 pb-3 text-center" style={{ background: 'linear-gradient(180deg, #EFEFEF 0%, #DFDFDF 100%)', borderBottom: '1px solid #A8A8A8' }}>
            <h2 className="tracking-[0.4em]" style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}>
              GESTIONE TERMINALE
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-4 justify-center border-b border-[#A8A8A8]">
            {(['bag', 'inventory', 'equipment'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); play('click', 0.2); }}
                className="px-4 py-1.5"
                style={{
                  background: activeTab === tab ? '#2B73B3' : 'rgba(48,48,48,0.08)',
                  color: activeTab === tab ? '#FBFBFB' : 'rgba(26,42,58,0.5)',
                  border: `1px solid ${activeTab === tab ? '#2B73B3' : 'rgba(43,115,179,0.2)'}`,
                  fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                  fontWeight: 400, fontSize: '0.65rem', letterSpacing: '0.15em',
                  cursor: 'pointer',
                  clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                }}
              >
                {tab === 'bag' ? 'BORSA' : tab === 'inventory' ? 'INVENTARIO' : 'EQUIPAGGIAMENTO'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-5 sao-scroll" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {activeTab === 'bag' && (
              <div>
                <p className="mb-3 tracking-[0.2em] text-center" style={{ color: 'rgba(26,42,58,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.65rem' }}>
                  BORSA — {bagItems.length} / {BAG_MAX_ITEMS} SLOT
                </p>
                {bagItems.length === 0 ? (
                  <p className="text-center py-8" style={{ color: 'rgba(26,42,58,0.3)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.8rem' }}>BORSA VUOTA</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {bagItems.map((item) => (
                      <ManageItemCard key={item.id} item={item} onClick={() => { play('click', 0.3); setSelectedItem(item); }} onAction={onMoveToInventory ? () => onMoveToInventory(item) : undefined} actionLabel="INV." canEquip={item.equippable} onEquip={onEquip ? () => onEquip(item) : undefined} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'inventory' && (
              <div>
                {/* Search bar */}
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca oggetto..."
                    className="flex-1 px-3 py-1.5 outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      color: '#1a2a3a',
                      border: '1px solid rgba(43, 115, 179, 0.4)',
                      fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                      fontWeight: 400, fontSize: '0.75rem',
                      clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                    }}
                  />
                </div>
                {/* Category filters */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); play('click', 0.15); }}
                      className="px-2 py-0.5"
                      style={{
                        background: activeCategory === cat ? 'rgba(43,115,179,0.2)' : 'transparent',
                        border: `1px solid ${activeCategory === cat ? 'rgba(43,115,179,0.5)' : 'rgba(43,115,179,0.15)'}`,
                        color: activeCategory === cat ? '#2B73B3' : 'rgba(26,42,58,0.4)',
                        fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
                        fontWeight: 400, fontSize: '0.55rem', letterSpacing: '0.1em',
                        cursor: 'pointer',
                        clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {catLabels[cat]}
                    </button>
                  ))}
                </div>
                <p className="mb-3 tracking-[0.2em] text-center" style={{ color: 'rgba(26,42,58,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.65rem' }}>
                  INVENTARIO — {inventoryItems.length} OGGETTI
                </p>
                {inventoryItems.length === 0 ? (
                  <p className="text-center py-8" style={{ color: 'rgba(26,42,58,0.3)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.8rem' }}>INVENTARIO VUOTO</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {inventoryItems.map((item) => {
                      const bagCount = bagItems.length;
                      const canMove = bagCount < BAG_MAX_ITEMS;
                      return (
                        <ManageItemCard key={item.id} item={item} onClick={() => { play('click', 0.3); setSelectedItem(item); }} onAction={canMove && onMoveToBag ? () => onMoveToBag(item) : undefined} actionLabel="BORSA" canEquip={item.equippable} onEquip={onEquip ? () => onEquip(item) : undefined} />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'equipment' && (
              <div>
                <p className="mb-3 tracking-[0.2em] text-center" style={{ color: 'rgba(26,42,58,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.65rem' }}>
                  EQUIPAGGIAMENTO
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {equippedSlots.map(({ slot, label, itemId }) => {
                    const item = itemId ? items.find((i) => i.id === itemId) : null;
                    return (
                      <div key={slot} className="flex flex-col items-center p-2" style={{ background: item ? 'rgba(127,197,34,0.08)' : 'rgba(48,48,48,0.05)', border: `1px solid ${item ? 'rgba(127,197,34,0.3)' : 'rgba(43,115,179,0.15)'}`, clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>
                        <span style={{ color: 'rgba(26,42,58,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.5rem', letterSpacing: '0.1em' }}>{label}</span>
                        {item ? (
                          <>
                            <button onClick={() => { play('click', 0.3); setSelectedItem(item); }} className="my-1" style={{ width: '40px', height: '40px', cursor: 'pointer', background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(127,197,34,0.3)', borderRadius: '2px', padding: 0 }}>
                              <img src={`/sao/equipment/${item.icon}`} alt={item.name} className="w-8 h-8" draggable={false} style={{ objectFit: 'contain', margin: 'auto' }} />
                            </button>
                            <p className="truncate w-full text-center" style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.45rem' }}>{item.name}</p>
                            {onUnequip && (
                              <button onClick={() => { play('click', 0.3); onUnequip(slot); }} className="mt-1 px-1.5 py-0.5" style={{ background: 'rgba(190,33,86,0.1)', border: '1px solid rgba(190,33,86,0.3)', color: '#BE2156', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.45rem', cursor: 'pointer', clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}>
                                RIMUOVI
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="my-1 flex items-center justify-center" style={{ width: '40px', height: '40px', background: 'rgba(48,48,48,0.05)', border: '1px dashed rgba(43,115,179,0.15)', borderRadius: '2px' }}>
                            <span style={{ color: 'rgba(26,42,58,0.2)', fontSize: '0.7rem' }}>—</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #2B73B3 20%, #2B73B3 80%, transparent)' }} />
          </div>
          </div>
      </motion.div>

      {/* Item detail modal */}
      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </motion.div>
  );
}

/* ---------- Manage Item Card ---------- */

function ManageItemCard({ item, onClick, onAction, actionLabel, canEquip, onEquip }: {
  item: Item;
  onClick: () => void;
  onAction?: () => void;
  actionLabel: string;
  canEquip: boolean;
  onEquip?: () => void;
}) {
  return (
    <div className="flex flex-col items-center p-2" style={{ background: 'rgba(48,48,48,0.06)', border: '1px solid rgba(43,115,179,0.2)', clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>
      <button onClick={onClick} style={{ width: '48px', height: '48px', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0, marginBottom: '4px' }} title={item.name}>
        <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(43,115,179,0.15)', borderRadius: '2px' }}>
          <img src={`/sao/equipment/${item.icon}`} alt={item.name} className="w-10 h-10" draggable={false} style={{ objectFit: 'contain' }} />
        </div>
      </button>
      <p className="truncate w-full text-center mb-1" style={{ color: '#1a2a3a', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '0.7rem', textShadow: '0 1px 0 rgba(255,255,255,0.9), 0 -1px 2px rgba(0,0,0,0.2)' }}>
        {item.name}
      </p>
      <div className="flex gap-1">
        {canEquip && onEquip && (
          <button onClick={onEquip} className="px-1.5 py-0.5" style={{ background: 'rgba(127,197,34,0.15)', border: '1px solid rgba(127,197,34,0.4)', color: '#3a7a0c', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.5rem', cursor: 'pointer', clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}>EQUIP</button>
        )}
        {onAction && (
          <button onClick={onAction} className="px-1.5 py-0.5" style={{ background: 'rgba(43,115,179,0.1)', border: '1px solid rgba(43,115,179,0.3)', color: '#2B73B3', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.5rem', cursor: 'pointer', clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}>{actionLabel}</button>
        )}
      </div>
    </div>
  );
}
