'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSaoSound } from '@/hooks/useSaoSound';
import {
  type SubAreaRun,
  type ZoneNode,
  type ZoneEvent,
  type ExploreState,
  type SubAreaCheckpoint,
  type ExploreStatKey,
  type ExploreOutcome,
  type EndingType,
  type TerrainType,
  type SubAreaDef,
  createInitialExploreState,
} from '@/lib/sao-explore-types';
import {
  EXPLORE_AREAS,
  getSubAreasForArea,
  getSubAreaById,
  SKILL_CHECK_PROMPTS,
  NARRATIVE_SCENES,
  LOOT_TABLES,
} from '@/lib/sao-explore-data';
import { generateSubAreaRun, generateSeed, getChestLoot, revealNeighbors } from '@/lib/sao-explore-engine';
import { SAMPLE_ITEMS } from '@/lib/sao-sample-items';
import type { Item, EquipmentState } from '@/lib/sao-inventory-types';
import { BAG_MAX_ITEMS } from '@/lib/sao-inventory-types';
import SaoHUD, { type BarValue } from './SaoHUD';
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
  // Le 7 statistiche effettive del giocatore (per skill check — Fase B)
  playerStats?: Partial<Record<ExploreStatKey, number>>;
  // Barre HP/MP/Energia da mostrare in esplorazione (alto destra, VR hover)
  hp?: BarValue;
  mp?: BarValue;
  energy?: BarValue;
  level?: number;
  playerName?: string;
}

const EVENT_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  chest: { label: 'Forziere', color: '#EBA601', icon: '◆' },
  trapChest: { label: 'Forziere Trappola!', color: '#BE2156', icon: '⚠' },
  opulentChest: { label: 'Forziere Opulento', color: '#9b6dff', icon: '◈' },
  combat: { label: 'Nemici', color: '#cc2233', icon: '⚔' },
  terminal: { label: 'Terminale', color: '#5CC4F0', icon: '⌬' },
  questNpc: { label: 'NPC Quest', color: '#3b82f6', icon: '✦' },
  playerKiller: { label: 'Player Killer!', color: '#BE2156', icon: '☠' },
  distressNpc: { label: 'NPC in Difficoltà', color: '#EBA601', icon: '!' },
  ending: { label: 'Finale', color: '#FBFBFB', icon: '★' },
};

// === FUNZIONI PURE A LIVELLO DI MODULO (fuori dal componente per evitare TDZ) ===

// PROBABILITÀ DI SUCCESSO — unico punto da tarare. statValue e difficulty sono sulla stessa
// scala delle 7 statistiche (~1..90). Se statValue === difficulty → 50%. Ogni punto di scarto
// sposta ±3%. Clamp 10%..95% (mai vittoria/sconfitta automatica).
function skillCheckChance(statValue: number, difficulty: number): number {
  const raw = 0.5 + (statValue - difficulty) * 0.03;
  return Math.max(0.10, Math.min(0.95, raw));
}

// helper: pesca un item ID da una pool di LOOT_TABLES (usa Math.random: è una ricompensa runtime)
// DIFENSIVO: se la pool è mancante/vuota, ritorna undefined senza crashare
function pickFromPool(poolKey: string): string | undefined {
  const pool = (LOOT_TABLES as Record<string, string[]>)?.[poolKey] ?? (LOOT_TABLES as Record<string, string[]>)?.common;
  if (!Array.isArray(pool) || pool.length === 0) {
    console.warn(`[explore] pool mancante/vuota: "${poolKey}". Disponibili:`, Object.keys(LOOT_TABLES ?? {}));
    return undefined;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function ExplorePanel({ open, onClose, areaId = 'grandi-pianure', onItemFound, onRest, items = [], equipment, onMoveToBag, onMoveToInventory, onEquip, onUnequip, cheats, playerStats, hp, mp, energy, level, playerName }: ExplorePanelProps) {
  const { play } = useSaoSound();
  const [exploreState, setExploreState] = useState<ExploreState>(createInitialExploreState);
  const [run, setRun] = useState<SubAreaRun | null>(null);
  const [view, setView] = useState<'subareas' | 'exploring'>('subareas');
  const [activeSubAreaId, setActiveSubAreaId] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [foundItem, setFoundItem] = useState<string | null>(null);
  const [showCheckmark, setShowCheckmark] = useState<string | null>(null);
  // Fase B: nuovi modali + toast
  const [skillCheckEvent, setSkillCheckEvent] = useState<ZoneEvent | null>(null);
  const [narrativeEvent, setNarrativeEvent] = useState<ZoneEvent | null>(null);
  const [chestChoiceEvent, setChestChoiceEvent] = useState<ZoneEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Fase C: schermata riepilogo + pannello cartografia
  const [showSummary, setShowSummary] = useState(false);
  const [endingResult, setEndingResult] = useState<EndingType | null>(null);
  const [showCartography, setShowCartography] = useState(false);

  const areaDef = EXPLORE_AREAS.find((a) => a.id === areaId);
  const subAreas = areaDef ? getSubAreasForArea(areaId) : [];
  const currentNode = run ? run.nodes[run.currentNodeId] : null;
  const activeSubAreaDef = activeSubAreaId ? getSubAreaById(activeSubAreaId) : null;

  // FASE C: helper che aggiorna la cartografia in modo idempotente
  const registerDiscovery = useCallback((opts: { terrain?: TerrainType; resource?: { type: string; n: number } }) => {
    setExploreState((prev) => {
      const next = { ...prev };
      if (opts.terrain && !next.mappedTerrains.includes(opts.terrain)) {
        next.mappedTerrains = [...next.mappedTerrains, opts.terrain];
      }
      if (opts.resource) {
        const cur = next.gatheredResources[opts.resource.type] ?? 0;
        next.gatheredResources = { ...next.gatheredResources, [opts.resource.type]: cur + opts.resource.n };
      }
      return next;
    });
  }, []);

  // FASE B: helper che mostra un toast non-bloccante (scompare dopo 2.5s)
  // DICHIARATO QUI (sopra handleResolveEvent/resolveSkillCheck/applyOutcome) per evitare TDZ:
  // quei callback elencano showToast nelle loro deps e vengono valutati al mount.
  const showToast = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  }, []);

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

  // Viaggia verso un nodo connesso (scelta del percorso ai bivi)
  const handleChooseNode = useCallback((nextNodeId: string) => {
    if (!run) return;
    const current = run.nodes[run.currentNodeId];
    if (!current || !current.connections.includes(nextNodeId)) return;

    // gating: almeno 2 eventi risolti (tranne terminale; il landmark usa handleComplete)
    if (current.terrain !== 'terminal' && !current.isLandmark && !cheats?.skipEvents) {
      const resolved = current.events.filter((e) => e.resolved).length;
      if (resolved < 1) { play('warning', 0.3); return; }
    }

    const nodes = { ...run.nodes };
    nodes[run.currentNodeId] = {
      ...current,
      cleared: true,
      events: current.events.map((ev) => ({ ...ev, resolved: true })),
    };
    revealNeighbors(nodes, nextNodeId);

    // FASE C: registra il terreno del nodo di destinazione nella cartografia
    const destNode = nodes[nextNodeId];
    if (destNode) {
      registerDiscovery({ terrain: destNode.terrain });
    }

    setRun({
      ...run,
      nodes,
      currentNodeId: nextNodeId,
      visitedNodeIds: [...run.visitedNodeIds, nextNodeId],
      stats: { ...run.stats, nodesVisited: run.visitedNodeIds.length + 1 },
    });
    play('click', 0.3);
  }, [run, play, cheats, registerDiscovery]);

  // Completa la sotto-area dal nodo finale (landmark) — FASE C: 4 esiti + knownBossPaths + riepilogo
  const handleComplete = useCallback(() => {
    if (!run || !activeSubAreaId) return;
    const current = run.nodes[run.currentNodeId];
    if (!current?.isLandmark) return;
    const ending = current.ending ?? 'nothing';

    // registra l'esito nella collezione + boss path (MAI cancellare knownBossPaths)
    // + registra tutte le zone visitate nella cartografia
    setExploreState((prev) => {
      const next = { ...prev };
      if (!next.visitedLandmarks.includes(ending)) {
        next.visitedLandmarks = [...next.visitedLandmarks, ending];
      }
      if (ending === 'boss' && !next.knownBossPaths.includes(activeSubAreaId)) {
        next.knownBossPaths = [...next.knownBossPaths, activeSubAreaId];
      }
      // Registra i terreni di tutte le zone visitate nella cartografia
      for (const vid of run.visitedNodeIds) {
        const vNode = run.nodes[vid];
        if (vNode && !next.mappedTerrains.includes(vNode.terrain)) {
          next.mappedTerrains = [...next.mappedTerrains, vNode.terrain];
        }
      }
      next.subAreaProgress = { ...next.subAreaProgress, [activeSubAreaId]: { status: 'completed' } };
      next.activeRun = null;
      return next;
    });

    // applica l'esito
    switch (ending) {
      case 'treasure': {
        const itemId = pickFromPool('rare');
        if (itemId) {
          const item = SAMPLE_ITEMS.find((i) => i.id === itemId);
          if (item) onItemFound?.(itemId);
        }
        break;
      }
      case 'boss':
      case 'horde':
        // TODO(combat-system): avvia il combattimento finale
        break;
      case 'nothing':
      default:
        break;
    }

    setEndingResult(ending);
    setShowSummary(true);
    play('present', 0.5);
  }, [run, activeSubAreaId, onItemFound, play]);

  // Resolve event — marks the event as resolved so it can't be clicked again.
  // EXCEPTION: terminal events are NEVER marked as resolved (reusable).
  const handleResolveEvent = useCallback((event: ZoneEvent) => {
    if (event.resolved) return;
    if (!run) return;
    const current = run.nodes[run.currentNodeId];
    if (!current) return;

    // Tipi che NON vengono marcati risolti qui (gestiti dalle loro risoluzioni)
    const selfResolvedTypes = new Set(['terminal', 'chest', 'opulentChest']);
    if (!selfResolvedTypes.has(event.type)) {
      const nodes = { ...run.nodes };
      nodes[run.currentNodeId] = {
        ...current,
        events: current.events.map((ev) => (ev === event ? { ...ev, resolved: true } : ev)),
      };
      setRun({ ...run, nodes, stats: { ...run.stats, eventsResolved: run.stats.eventsResolved + 1 } });
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
        // marca risolto ora
        const nodes = { ...run.nodes };
        nodes[run.currentNodeId] = {
          ...current,
          events: current.events.map((ev) => (ev === event ? { ...ev, resolved: true } : ev)),
        };
        setRun({ ...run, nodes, stats: { ...run.stats, eventsResolved: run.stats.eventsResolved + 1 } });
        break;
      }
      case 'opulentChest': {
        // Forziere opulento: serve Chiave/Chiave Universale oppure DEX
        // TODO(item-system): controlla se il giocatore ha una Chiave
        // Per ora: placeholder, mostra notifica
        showToast('Forziere opulento. Serve una Chiave o abbastanza Destrezza per scassinarlo.');
        play('alert', 0.3);
        // NON marcare risolto (richiede chiave/DEX)
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
      case 'ending':
        // Gestito da handleComplete
        break;
    }
  }, [run, onItemFound, play, showToast]);

  // === FASE B: skill check + narrativa + forziere con micro-scelta ===

  // Risolve uno skill check: singolo tiro a runtime (anti-save-scumming)
  // (showToast è dichiarato sopra, vicino agli altri helper foglia)
  const resolveSkillCheck = useCallback((event: ZoneEvent, stat: ExploreStatKey, difficulty: number, rewardPool: string) => {
    // DIFENSIVO: playerStats può essere undefined/parziale — default a 1
    const statsMap = (playerStats ?? {}) as Record<string, number>;
    const value = statsMap[stat] ?? 1;
    const chance = skillCheckChance(value, difficulty);
    const success = Math.random() < chance;

    if (run) {
      const current = run.nodes[run.currentNodeId];
      const nodes = { ...run.nodes };
      nodes[run.currentNodeId] = {
        ...current,
        events: current.events.map((ev) => ev === event ? { ...ev, resolved: true, payload: { ...ev.payload, success, chance } } : ev),
      };
      setRun({
        ...run, nodes, stats: {
          ...run.stats,
          eventsResolved: run.stats.eventsResolved + 1,
          skillChecksPassed: run.stats.skillChecksPassed + (success ? 1 : 0),
          skillChecksFailed: run.stats.skillChecksFailed + (success ? 0 : 1),
        },
      });
    }

    if (success) {
      const itemId = pickFromPool(rewardPool);
      if (itemId) {
        const item = SAMPLE_ITEMS.find((i) => i.id === itemId);
        if (item) {
          onItemFound?.(item.id);
          setRun((prev) => prev ? { ...prev, stats: { ...prev.stats, itemsFound: prev.stats.itemsFound + 1 } } : prev);
          showToast(`Prova superata! Ottieni: ${item.name}`);
        } else {
          showToast('Prova superata!');
        }
      } else {
        showToast('Prova superata!');
      }
      play('present', 0.4);
    } else {
      showToast('Prova fallita.');
      play('alert', 0.3);
    }
  }, [run, playerStats, onItemFound, play, showToast]);

  // Applica un ExploreOutcome (per narrativa e forziere)
  const applyOutcome = useCallback((outcome: ExploreOutcome) => {
    switch (outcome.type) {
      case 'reward': {
        if (outcome.itemPool) {
          const itemId = pickFromPool(outcome.itemPool);
          if (itemId) {
            const item = SAMPLE_ITEMS.find((i) => i.id === itemId);
            if (item) {
              onItemFound?.(item.id);
              setRun((prev) => prev ? { ...prev, stats: { ...prev.stats, itemsFound: prev.stats.itemsFound + 1 } } : prev);
            }
          }
        }
        showToast(outcome.text);
        play('present', 0.4);
        break;
      }
      case 'lore': {
        if (outcome.loreId) {
          registerDiscovery({ lore: outcome.loreId });
        }
        showToast(outcome.text);
        play('system', 0.4);
        break;
      }
      case 'heal': {
        onRest?.();
        showToast(outcome.text);
        play('welcome', 0.4);
        break;
      }
      case 'risk': {
        showToast(outcome.text + ' (Combattimento — TODO)');
        play('alert', 0.4);
        // TODO(combat-system): innesca combattimento
        break;
      }
      case 'nothing':
      default:
        showToast(outcome.text);
        play('click', 0.3);
        break;
    }
  }, [onItemFound, onRest, play, showToast, registerDiscovery]);

  const handleTerminalRest = useCallback(() => {
    onRest?.();
    play('welcome', 0.4);
    setShowTerminal(false);
  }, [onRest, play]);

  const handleTerminalCheckpoint = useCallback(() => {
    if (!run || !activeSubAreaId) return;
    // Salva la posizione corrente come checkpoint + registra zone visitate nella cartografia
    setExploreState((prev) => {
      const next = { ...prev };
      // Registra i terreni di tutte le zone visitate nella cartografia
      for (const vid of run.visitedNodeIds) {
        const vNode = run.nodes[vid];
        if (vNode && !next.mappedTerrains.includes(vNode.terrain)) {
          next.mappedTerrains = [...next.mappedTerrains, vNode.terrain];
        }
      }
      next.subAreaCheckpoints = {
        ...prev.subAreaCheckpoints,
        [activeSubAreaId]: {
          seed: run.seed,
          depth: run.depth,
          currentNodeId: run.currentNodeId,
          visitedNodeIds: run.visitedNodeIds,
          spawnedTrapChest: run.spawnedTrapChest,
          spawnedQuestNpc: run.spawnedQuestNpc,
          spawnedDistressNpc: run.spawnedDistressNpc,
        } satisfies SubAreaCheckpoint,
      };
      return next;
    });
    play('system', 0.4);
    setShowTerminal(false);
    // Teletrasporto: esci dall'esplorazione e torna alla selezione sotto-aree.
    // La posizione è salvata: quando il giocatore ritorna, riprende da qui.
    setView('subareas');
    setRun(null);
    setActiveSubAreaId(null);
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

              {/* FASE C: bottone CARTOGRAFIA */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => { setShowCartography(true); play('popupPanel', 0.4); }}
                  className="px-5 py-2"
                  style={{
                    background: 'rgba(235,166,1,0.15)',
                    border: '1px solid rgba(235,166,1,0.4)',
                    clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                    color: '#EBA601', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.2em', cursor: 'pointer',
                  }}
                >
                  ⚐ CARTOGRAFIA
                </button>
              </div>
            </motion.div>
          )}

          {/* === EXPLORING === */}
          {view === 'exploring' && run && currentNode && activeSubAreaDef && (() => {
            const resolvedCount = currentNode.events.filter((e) => e.resolved).length;
            const gatingOk = currentNode.terrain === 'terminal' || currentNode.isLandmark || resolvedCount >= 1 || !!cheats?.skipEvents;
            return (
            <>
            {/* HUD barre HP/MP/Energia (alto sinistra, compatte, VR hover per-barra) */}
            <ExploreHUD hp={hp} mp={mp} energy={energy} level={level} playerName={playerName} />

            {/* Layout: mappa centrata grande + pannello destro con ZoneCard + SideCard */}
            <div className="h-full flex [align-items:safe_center] justify-center gap-4 px-4 pt-16 pb-4 overflow-y-auto sao-scroll">

              {/* === COLONNA CENTRO: mappa grande (dal basso verso l'alto) === */}
              <div className="flex-1 flex items-center justify-center min-w-0">
                <ExploreMap run={run} onChooseNode={handleChooseNode} onResolveCurrentEvent={() => { if (currentNode.events[0] && !currentNode.events[0].resolved) handleResolveEvent(currentNode.events[0]); }} gatingOk={gatingOk} large />
              </div>

              {/* === COLONNA DESTRA: ZoneCard (corrente, auto-adattante) === */}
              <div className="flex flex-col items-end" style={{ width: '340px', minWidth: '340px', maxHeight: '85vh', overflowY: 'auto' }}>
                <ZoneCard currentNode={currentNode} run={run} onResolveEvent={handleResolveEvent} onChooseNode={handleChooseNode} onComplete={handleComplete} cheats={cheats} />
              </div>
            </div>
            </>
            );
          })()}

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

          {/* === FASE B: SKILL CHECK MODAL === */}
          <AnimatePresence>
            {skillCheckEvent && (
              <SkillCheckModal
                event={skillCheckEvent}
                playerStats={playerStats}
                onResolve={(s, d, p) => resolveSkillCheck(skillCheckEvent, s, d, p)}
                onClose={() => setSkillCheckEvent(null)}
              />
            )}
          </AnimatePresence>

          {/* === FASE B: NARRATIVE MODAL === */}
          <AnimatePresence>
            {narrativeEvent && (
              <NarrativeModal
                event={narrativeEvent}
                playerStats={playerStats}
                onChoose={(optionIndex) => {
                  const scene = NARRATIVE_SCENES.find((s) => s.id === narrativeEvent.payload.sceneId);
                  if (!scene || !run) return;
                  const opt = scene.options[optionIndex];
                  if (!opt) return;

                  // Se l'opzione ha un check: risolvi come skill check
                  let success = true;
                  if (opt.check) {
                    const statsMap = (playerStats ?? {}) as Record<string, number>;
                    const value = statsMap[opt.check.stat] ?? 1;
                    const chance = skillCheckChance(value, opt.check.difficulty);
                    success = Math.random() < chance;
                  }

                  // marca risolto + aggiorna stats
                  const current = run.nodes[run.currentNodeId];
                  const nodes = { ...run.nodes };
                  nodes[run.currentNodeId] = {
                    ...current,
                    events: current.events.map((ev) => ev === narrativeEvent ? { ...ev, resolved: true } : ev),
                  };
                  setRun({
                    ...run, nodes, stats: {
                      ...run.stats,
                      eventsResolved: run.stats.eventsResolved + 1,
                      skillChecksPassed: run.stats.skillChecksPassed + (opt.check && success ? 1 : 0),
                      skillChecksFailed: run.stats.skillChecksFailed + (opt.check && !success ? 1 : 0),
                    },
                  });

                  // applica l'esito
                  const outcome = success ? opt.success : (opt.failure ?? opt.success);
                  applyOutcome(outcome);

                  setNarrativeEvent(null);
                }}
                onClose={() => setNarrativeEvent(null)}
              />
            )}
          </AnimatePresence>

          {/* === FASE B: CHEST CHOICE MODAL === */}
          <AnimatePresence>
            {chestChoiceEvent && (
              <ChestChoiceModal
                event={chestChoiceEvent}
                playerStats={playerStats}
                onOpenNow={() => {
                  if (!run) return;
                  const event = chestChoiceEvent;
                  const trapped = !!event.payload.trapped;
                  const trapTriggered = trapped && Math.random() < 0.5;

                  // marca risolto
                  const current = run.nodes[run.currentNodeId];
                  const nodes = { ...run.nodes };
                  nodes[run.currentNodeId] = {
                    ...current,
                    events: current.events.map((ev) => ev === event ? { ...ev, resolved: true } : ev),
                  };
                  setRun({ ...run, nodes, stats: { ...run.stats, eventsResolved: run.stats.eventsResolved + 1 } });

                  if (trapTriggered) {
                    showToast('Trappola! Scatta un meccanismo ostile. (Combattimento — TODO)');
                    play('alert', 0.4);
                    // TODO(combat-system): innesca combattimento trappola
                  } else {
                    const itemId = getChestLoot(event);
                    if (itemId) {
                      const item = SAMPLE_ITEMS.find((i) => i.id === itemId);
                      if (item) {
                        setFoundItem(item.name);
                        onItemFound?.(itemId);
                        setRun((prev) => prev ? { ...prev, stats: { ...prev.stats, itemsFound: prev.stats.itemsFound + 1 } } : prev);
                        play('present', 0.4);
                      }
                    }
                  }
                  setChestChoiceEvent(null);
                }}
                onInspect={() => {
                  if (!run) return;
                  const event = chestChoiceEvent;
                  const trapped = !!event.payload.trapped;
                  // DEX check difficoltà 12 (difensivo: playerStats può essere undefined)
                  const statsMap = (playerStats ?? {}) as Record<string, number>;
                  const value = statsMap.DEX ?? 1;
                  const chance = skillCheckChance(value, 12);
                  const success = Math.random() < chance;

                  // marca risolto
                  const current = run.nodes[run.currentNodeId];
                  const nodes = { ...run.nodes };
                  nodes[run.currentNodeId] = {
                    ...current,
                    events: current.events.map((ev) => ev === event ? { ...ev, resolved: true } : ev),
                  };
                  setRun({
                    ...run, nodes, stats: {
                      ...run.stats,
                      eventsResolved: run.stats.eventsResolved + 1,
                      skillChecksPassed: run.stats.skillChecksPassed + (success ? 1 : 0),
                      skillChecksFailed: run.stats.skillChecksFailed + (success ? 0 : 1),
                    },
                  });

                  if (success) {
                    // Disinnesca la trappola (se presente) e ottieni l'item in sicurezza
                    const itemId = getChestLoot(event);
                    if (itemId) {
                      const item = SAMPLE_ITEMS.find((i) => i.id === itemId);
                      if (item) {
                        setFoundItem(`${item.name}${trapped ? ' (trappola disinnesata)' : ''}`);
                        onItemFound?.(itemId);
                        setRun((prev) => prev ? { ...prev, stats: { ...prev.stats, itemsFound: prev.stats.itemsFound + 1 } } : prev);
                        play('present', 0.4);
                      }
                    }
                  } else if (trapped) {
                    // Fallimento su trapped → la trappola scatta
                    showToast('Ispezione fallita! La trappola scatta. (Combattimento — TODO)');
                    play('alert', 0.4);
                    // TODO(combat-system)
                  } else {
                    // Forziere non intrappolato, ispezione fallita ma niente trappola
                    const itemId = getChestLoot(event);
                    if (itemId) {
                      const item = SAMPLE_ITEMS.find((i) => i.id === itemId);
                      if (item) {
                        setFoundItem(item.name);
                        onItemFound?.(itemId);
                        setRun((prev) => prev ? { ...prev, stats: { ...prev.stats, itemsFound: prev.stats.itemsFound + 1 } } : prev);
                        play('present', 0.4);
                      }
                    }
                  }
                  setChestChoiceEvent(null);
                }}
                onClose={() => setChestChoiceEvent(null)}
              />
            )}
          </AnimatePresence>

          {/* === FASE C: RUN SUMMARY (sostituisce il vecchio checkmark) === */}
          <AnimatePresence>
            {showSummary && run && (
              <RunSummary
                run={run}
                ending={endingResult}
                onContinue={() => {
                  setShowSummary(false);
                  setEndingResult(null);
                  setView('subareas');
                  setRun(null);
                  setActiveSubAreaId(null);
                }}
              />
            )}
          </AnimatePresence>

          {/* === FASE C: CARTOGRAPHY PANEL === */}
          <AnimatePresence>
            {showCartography && (
              <CartographyPanel
                exploreState={exploreState}
                onClose={() => { setShowCartography(false); play('dismissLauncher', 0.3); }}
              />
            )}
          </AnimatePresence>

          {/* === FASE B: TOAST (non-bloccante) === === */}
          <AnimatePresence>
            {toast && <ExploreToast text={toast} />}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Skill Check Modal (Fase B) ---------- */

function SkillCheckModal({ event, playerStats, onResolve, onClose }: {
  event: ZoneEvent;
  playerStats?: Partial<Record<ExploreStatKey, number>>;
  onResolve: (stat: ExploreStatKey, difficulty: number, rewardPool: string) => void;
  onClose: () => void;
}) {
  const stat = event.payload.stat as ExploreStatKey;
  const difficulty = event.payload.difficulty as number;
  const promptIdx = event.payload.promptIdx as number;
  const rewardPool = event.payload.rewardPool as string;
  const def = SKILL_CHECK_PROMPTS[stat]?.[promptIdx];
  const statsMap = (playerStats ?? {}) as Record<string, number>;
  const value = statsMap[stat] ?? 1;
  const done = !!event.resolved;
  const success = event.payload.success as boolean | undefined;

  // PROBABILITÀ DI SUCCESSO (replicata per la UI — unico punto da tarare)
  function chanceFn(sv: number, diff: number): number {
    const raw = 0.5 + (sv - diff) * 0.03;
    return Math.max(0.10, Math.min(0.95, raw));
  }
  const chance = Math.round(chanceFn(value, difficulty) * 100);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(2,8,20,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel p-6" style={{ minWidth: 'min(440px, 90vw)', borderColor: 'rgba(155,109,255,0.5)' }}
      >
        <h3 className="tracking-[0.3em] text-center mb-4" style={{ color: '#9b6dff', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '1rem' }}>
          PROVA — {stat}
        </h3>
        {!done ? (
          <>
            <p className="mb-4 text-center" style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.85rem', lineHeight: 1.6 }}>
              {def?.prompt}
            </p>
            <div className="flex justify-center gap-4 mb-4" style={{ fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.7rem', letterSpacing: '0.1em' }}>
              <span style={{ color: 'rgba(251,251,251,0.6)' }}>STATISTICA: <span style={{ color: '#9b6dff' }}>{stat} {value}</span></span>
              <span style={{ color: 'rgba(251,251,251,0.6)' }}>DIFFICOLTÀ: <span style={{ color: '#EBA601' }}>{difficulty}</span></span>
              <span style={{ color: 'rgba(251,251,251,0.6)' }}>PROBABILITÀ: <span style={{ color: '#7FC522' }}>{chance}%</span></span>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => onResolve(stat, difficulty, rewardPool)}
                className="px-5 py-2"
                style={{
                  background: 'linear-gradient(135deg, #9b6dff 0%, #6b3fcc 100%)',
                  boxShadow: '0 0 20px rgba(155,109,255,0.5), inset 0 0 8px rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                  color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.2em', cursor: 'pointer',
                }}
              >
                TENTA {stat}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-center" style={{ color: success ? '#7FC522' : '#BE2156', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.9rem', lineHeight: 1.6 }}>
              {success ? def?.success : def?.failure}
            </p>
            <div className="flex justify-center">
              <button
                onClick={onClose}
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
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ---------- Narrative Modal (Fase B) ---------- */

function NarrativeModal({ event, playerStats, onChoose, onClose }: {
  event: ZoneEvent;
  playerStats?: Partial<Record<ExploreStatKey, number>>;
  onChoose: (optionIndex: number) => void;
  onClose: () => void;
}) {
  const scene = NARRATIVE_SCENES.find((s) => s.id === event.payload.sceneId);
  if (!scene) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(2,8,20,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel p-6" style={{ minWidth: 'min(480px, 92vw)', maxWidth: '600px', borderColor: 'rgba(43,115,179,0.5)' }}
      >
        <h3 className="tracking-[0.3em] text-center mb-4" style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '1rem' }}>
          INCONTRO
        </h3>
        <p className="mb-5" style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.85rem', lineHeight: 1.7 }}>
          {scene.prompt}
        </p>
        <div className="flex flex-col gap-2">
          {scene.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => onChoose(idx)}
              className="px-4 py-2.5 text-left"
              style={{
                background: 'rgba(43,115,179,0.15)',
                border: '1px solid rgba(43,115,179,0.4)',
                clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              {opt.label}
              {opt.check && (
                <span style={{ color: '#9b6dff', marginLeft: '8px', fontSize: '0.7rem' }}>
                  [{opt.check.stat} {opt.check.difficulty}]
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Chest Choice Modal (Fase B) ---------- */

function ChestChoiceModal({ event, playerStats, onOpenNow, onInspect, onClose }: {
  event: ZoneEvent;
  playerStats?: Partial<Record<ExploreStatKey, number>>;
  onOpenNow: () => void;
  onInspect: () => void;
  onClose: () => void;
}) {
  const DEX_REQUIRED = 12;
  const statsMap = (playerStats ?? {}) as Record<string, number>;
  const dexValue = statsMap.DEX ?? 1;
  const canInspect = dexValue >= DEX_REQUIRED;
  const inspectChance = canInspect ? Math.round(skillCheckChance(dexValue, DEX_REQUIRED) * 100) : 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(2,8,20,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel p-6" style={{ minWidth: 'min(420px, 90vw)', borderColor: 'rgba(235,166,1,0.5)' }}
      >
        <h3 className="tracking-[0.3em] text-center mb-3" style={{ color: '#EBA601', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '1rem' }}>
          FORZIERE
        </h3>
        <p className="mb-5 text-center" style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.85rem', lineHeight: 1.6 }}>
          Un forziere riposa davanti a te. Potrebbe contenere un tesoro... o nascondere una trappola.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onOpenNow}
            className="px-4 py-2.5"
            style={{
              background: 'linear-gradient(135deg, #EBA601 0%, #b07d00 100%)',
              boxShadow: '0 0 16px rgba(235,166,1,0.4)',
              border: '1px solid rgba(255,255,255,0.3)',
              clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
              color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.15em', cursor: 'pointer',
            }}
          >
            APRI SUBITO
          </button>
          <button
            onClick={canInspect ? onInspect : undefined}
            disabled={!canInspect}
            className="px-4 py-2.5"
            style={{
              background: canInspect ? 'rgba(92,196,240,0.15)' : 'rgba(48,48,48,0.15)',
              border: `1px solid ${canInspect ? 'rgba(92,196,240,0.4)' : 'rgba(190,33,86,0.3)'}`,
              clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
              color: canInspect ? '#5CC4F0' : 'rgba(190,33,86,0.6)',
              fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.15em',
              cursor: canInspect ? 'pointer' : 'not-allowed',
              opacity: canInspect ? 1 : 0.6,
            }}
          >
            {canInspect
              ? `ISPEZIONA [DEX ${dexValue}/${DEX_REQUIRED}] — ${inspectChance}%`
              : `ISPEZIONA [DEX ${dexValue}/${DEX_REQUIRED}] — BLOCCATO`}
          </button>
          {!canInspect && (
            <p className="text-center" style={{ color: 'rgba(190,33,86,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.6rem', letterSpacing: '0.1em' }}>
              Destrezza insufficiente. Ti servono almeno {DEX_REQUIRED} punti DEX.
            </p>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2"
            style={{
              background: 'transparent',
              border: '1px solid rgba(48,48,48,0.4)',
              color: 'rgba(251,251,251,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.15em', cursor: 'pointer',
            }}
          >
            LASCIA
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Explore Toast (Fase B) ---------- */

function ExploreToast({ text }: { text: string }) {
  return (
    <motion.div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="px-5 py-2.5"
        style={{
          background: 'rgba(8, 22, 40, 0.92)',
          border: '1px solid rgba(92,196,240,0.4)',
          clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <p style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.8rem', letterSpacing: '0.05em', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
          {text}
        </p>
      </div>
    </motion.div>
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

/* ---------- Cartography Panel (Fase C — collezione/cartografia) ---------- */

function CartographyPanel({ exploreState, onClose }: {
  exploreState: ExploreState;
  onClose: () => void;
}) {
  const allTerrains: TerrainType[] = ['plains', 'hills', 'river', 'sparse_wood', 'ruins', 'camp', 'clearing', 'highland', 'terminal'];
  const terrainLabels: Record<string, string> = {
    plains: 'Pianura', hills: 'Colline', river: 'Fiume', sparse_wood: 'Bosco Rado',
    ruins: 'Rovine', camp: 'Campo', clearing: 'Radura', highland: 'Altopiano', terminal: 'Terminale',
  };
  const endingLabels: Record<string, string> = {
    boss: 'Boss', treasure: 'Tesoro', horde: 'Orda', nothing: 'Confine',
  };
  const allEndings: EndingType[] = ['boss', 'treasure', 'horde', 'nothing'];
  const resourceLabels: Record<string, string> = { herb: 'Erbe', mineral: 'Minerali', wood: 'Legno' };

  const terrainPct = Math.round((exploreState.mappedTerrains.length / allTerrains.length) * 100);
  const endingPct = Math.round((exploreState.visitedLandmarks.length / allEndings.length) * 100);
  const globalPct = Math.round((terrainPct + lorePct + endingPct) / 3);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(2,8,20,0.92)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel p-6 overflow-y-auto sao-scroll"
        style={{ minWidth: 'min(560px, 92vw)', maxHeight: '85vh', borderColor: 'rgba(235,166,1,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="tracking-[0.3em] text-center mb-2" style={{ color: '#EBA601', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '1rem' }}>
          CARTOGRAFIA
        </h3>
        <p className="tracking-[0.15em] text-center mb-5" style={{ color: 'rgba(251,251,251,0.5)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem' }}>
          COMPLETAMENTO GLOBALE: {globalPct}%
        </p>

        {/* Terreni mappati */}
        <div className="mb-5">
          <p className="tracking-[0.2em] mb-2" style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.65rem' }}>
            TERRENI MAPPATI ({exploreState.mappedTerrains.length}/{allTerrains.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allTerrains.map((t) => {
              const found = exploreState.mappedTerrains.includes(t);
              return (
                <span
                  key={t}
                  className="px-2 py-1"
                  style={{
                    background: found ? 'rgba(127,197,34,0.15)' : 'rgba(48,48,48,0.15)',
                    border: `1px solid ${found ? 'rgba(127,197,34,0.4)' : 'rgba(48,48,48,0.3)'}`,
                    clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                    color: found ? '#7FC522' : 'rgba(251,251,251,0.25)',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem', letterSpacing: '0.1em',
                  }}
                >
                  {terrainLabels[t]?.toUpperCase() ?? t.toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>

        {/* Finali incontrati */}
        <div className="mb-5">
          <p className="tracking-[0.2em] mb-2" style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.65rem' }}>
            FINALI INCONTRATI ({exploreState.visitedLandmarks.length}/{allEndings.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allEndings.map((e) => {
              const found = exploreState.visitedLandmarks.includes(e);
              return (
                <span
                  key={e}
                  className="px-2 py-1"
                  style={{
                    background: found ? 'rgba(235,166,1,0.15)' : 'rgba(48,48,48,0.15)',
                    border: `1px solid ${found ? 'rgba(235,166,1,0.4)' : 'rgba(48,48,48,0.3)'}`,
                    clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                    color: found ? '#EBA601' : 'rgba(251,251,251,0.25)',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem', letterSpacing: '0.1em',
                  }}
                >
                  {endingLabels[e]?.toUpperCase() ?? e.toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>

        {/* Risorse raccolte */}
        <div className="mb-5">
          <p className="tracking-[0.2em] mb-2" style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.65rem' }}>
            RISORSE RACCOLTE
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(resourceLabels).map((r) => {
              const amount = exploreState.gatheredResources[r] ?? 0;
              return (
                <span
                  key={r}
                  className="px-2 py-1"
                  style={{
                    background: amount > 0 ? 'rgba(127,197,34,0.15)' : 'rgba(48,48,48,0.15)',
                    border: `1px solid ${amount > 0 ? 'rgba(127,197,34,0.4)' : 'rgba(48,48,48,0.3)'}`,
                    clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                    color: amount > 0 ? '#7FC522' : 'rgba(251,251,251,0.25)',
                    fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem', letterSpacing: '0.1em',
                  }}
                >
                  {resourceLabels[r]?.toUpperCase() ?? r.toUpperCase()}: {amount}
                </span>
              );
            })}
          </div>
        </div>

        {/* knownBossPaths (info nascosta, solo se presente) */}
        {exploreState.knownBossPaths.length > 0 && (
          <div className="mb-4">
            <p className="tracking-[0.2em] mb-1" style={{ color: '#BE2156', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.6rem' }}>
              ⚠ PERCORSI BOSS CONOSCIUTI: {exploreState.knownBossPaths.join(', ')}
            </p>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-5 py-2"
            style={{
              background: 'rgba(43,115,179,0.8)',
              border: '1px solid rgba(255,255,255,0.3)',
              clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
              color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.2em', cursor: 'pointer',
            }}
          >
            CHIUDI
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Run Summary (Fase C — schermata riepilogo) ---------- */

function RunSummary({ run, ending, onContinue }: {
  run: SubAreaRun;
  ending: EndingType | null;
  onContinue: () => void;
}) {
  const endingLabel: Record<EndingType, string> = {
    boss: 'BOSS AFFRONTATO',
    treasure: 'TESORO RIVENDICATO',
    horde: 'ORDA RESPINTA',
    nothing: 'CONFINE RAGGIUNTO',
  };
  const endingColor: Record<EndingType, string> = {
    boss: '#BE2156',
    treasure: '#EBA601',
    horde: '#BE2156',
    nothing: '#5CC4F0',
  };
  const rows: [string, string | number][] = [
    ['Zone visitate', run.stats.nodesVisited],
    ['Eventi risolti', run.stats.eventsResolved],
    ['Oggetti trovati', run.stats.itemsFound],
    ['Prove superate', run.stats.skillChecksPassed],
    ['Prove fallite', run.stats.skillChecksFailed],
  ];
  const totalEvents = run.stats.eventsResolved;
  const rating = totalEvents >= 15 ? 'ESPLORATORE LEGGENDARIO' : totalEvents >= 10 ? 'ESPLORATORE ESPERTO' : totalEvents >= 5 ? 'ESPLORATORE' : 'PRINCIPIIANTE';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: 'rgba(2,8,20,0.92)', backdropFilter: 'blur(10px)' }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel p-8 text-center"
        style={{ minWidth: 'min(440px, 92vw)', borderColor: ending ? endingColor[ending] + '88' : 'rgba(43,115,179,0.5)' }}
      >
        <p className="tracking-[0.3em] mb-2" style={{ color: '#7FC522', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', textShadow: '0 0 12px rgba(127,197,34,0.5)' }}>
          SOTTO-AREA COMPLETATA
        </p>
        {ending && (
          <h3 className="tracking-[0.25em] mb-1" style={{ color: endingColor[ending], fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '1.3rem', textShadow: `0 0 16px ${endingColor[ending]}66` }}>
            {endingLabel[ending]}
          </h3>
        )}
        <p className="tracking-[0.15em] mb-5" style={{ color: 'rgba(92,196,240,0.6)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.6rem' }}>
          {rating}
        </p>
        <div className="flex flex-col gap-2 mb-6 text-left">
          {rows.map(([label, val]) => (
            <div key={label} className="flex justify-between items-baseline px-2 py-1" style={{ borderBottom: '1px solid rgba(43,115,179,0.15)' }}>
              <span style={{ color: 'rgba(251,251,251,0.6)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                {label.toUpperCase()}
              </span>
              <span style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '0.85rem' }}>
                {val}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={onContinue}
          className="px-6 py-2.5"
          style={{
            background: 'linear-gradient(135deg, #5CC4F0 0%, #2B73B3 60%, #0682BE 100%)',
            boxShadow: '0 0 20px rgba(43,115,179,0.5), inset 0 0 8px rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
            color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.25em', cursor: 'pointer',
          }}
        >
          CONTINUA
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ---------- ExploreHUD: barre HP/MP/Energia IDENTICHE al game screen, compatte, VR hover per-barra ---------- */

function ExploreHUD({ hp, mp, energy, level, playerName }: {
  hp?: BarValue; mp?: BarValue; energy?: BarValue; level?: number; playerName?: string;
}) {
  return (
    <div className="fixed top-4 left-4 z-30 select-none">
      <SaoHUD hp={hp} mp={mp} energy={energy} level={level} playerName={playerName} embedded scale={0.6} perBarHover />
    </div>
  );
}

/* ---------- ExploreSideCard: card espandibile a destra con descrizione sotto-area ---------- */

function ExploreSideCard({ subAreaDef, currentNode, run }: {
  subAreaDef: SubAreaDef;
  currentNode: ZoneNode;
  run: SubAreaRun;
}) {
  const [expanded, setExpanded] = useState(true);
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
        tilt: `perspective(800px) rotateX(${-(py - 0.5) * 4}deg) rotateY(${(px - 0.5) * 4}deg)`,
        lightX: px * 100,
        lightY: py * 100,
      });
      rafRef.current = null;
    });
  };

  // Stile testo con bordo nero (per rilievo)
  const textBorder = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.9)';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setHover(null); if (rafRef.current) cancelAnimationFrame(rafRef.current); }}
      className="glass-panel relative overflow-hidden transition-all duration-300"
      style={{
        width: expanded ? '320px' : '48px',
        minWidth: '48px',
        padding: expanded ? '16px' : '8px',
        transform: hover?.tilt,
        transformStyle: 'preserve-3d',
        willChange: hover ? 'transform' : 'auto',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      {/* VR glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: hover ? 1 : 0,
          background: `radial-gradient(circle at ${hover?.lightX ?? 50}% ${hover?.lightY ?? 50}%, rgba(92,196,240,0.1) 0%, transparent 50%)`,
          mixBlendMode: 'screen',
        }}
      />
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'transparent',
          border: 'none',
          color: '#5CC4F0',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          fontSize: '0.8rem',
          cursor: 'pointer',
          zIndex: 20,
        }}
      >
        {expanded ? '▶' : '◀'}
      </button>

      {expanded ? (
        <>
          <h3
            className="tracking-[0.2em] mb-2"
            style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '0.8rem', textShadow: textBorder }}
          >
            {subAreaDef.name.toUpperCase()}
          </h3>
          <p
            className="mb-3"
            style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.7rem', lineHeight: 1.6, textShadow: textBorder }}
          >
            {subAreaDef.description}
          </p>
          <div style={{ borderTop: '1px solid rgba(43,115,179,0.2)', paddingTop: '8px' }}>
            <p
              className="tracking-[0.15em] mb-1"
              style={{ color: 'rgba(92,196,240,0.6)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem', textShadow: textBorder }}
            >
              ZONA CORRENTE
            </p>
            <p
              style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '0.75rem', textShadow: textBorder }}
            >
              {currentNode.title}
            </p>
            <p
              className="mt-1"
              style={{ color: 'rgba(251,251,251,0.6)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.6rem', textShadow: textBorder }}
            >
              Layer {currentNode.depth + 1}/{run.depth}
            </p>
          </div>
          <div className="mt-3" style={{ borderTop: '1px solid rgba(43,115,179,0.2)', paddingTop: '8px' }}>
            <p
              className="tracking-[0.15em] mb-1"
              style={{ color: 'rgba(92,196,240,0.6)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.55rem', textShadow: textBorder }}
            >
              STATISTICHE RUN
            </p>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between" style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.6rem', textShadow: textBorder }}>
                <span>Zone visitate</span><span>{run.stats.nodesVisited}</span>
              </div>
              <div className="flex justify-between" style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.6rem', textShadow: textBorder }}>
                <span>Eventi risolti</span><span>{run.stats.eventsResolved}</span>
              </div>
              <div className="flex justify-between" style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.6rem', textShadow: textBorder }}>
                <span>Oggetti trovati</span><span>{run.stats.itemsFound}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div
          className="flex flex-col items-center justify-center h-full"
          style={{ color: '#5CC4F0', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontSize: '0.5rem', letterSpacing: '0.2em', writingMode: 'vertical-rl', textShadow: textBorder }}
        >
          {subAreaDef.name.toUpperCase()}
        </div>
      )}
    </div>
  );
}

/* ---------- ExploreMap: mappa a grafo con posizionamento assoluto + linee precise ---------- */

function ExploreMap({ run, onChooseNode, onResolveCurrentEvent, gatingOk, large = false }: {
  run: SubAreaRun;
  onChooseNode: (nodeId: string) => void;
  onResolveCurrentEvent: () => void;
  gatingOk: boolean;
  large?: boolean;
}) {
  const current = run.nodes[run.currentNodeId];
  const reachable = new Set(current?.connections ?? []);
  const visitedSet = new Set(run.visitedNodeIds);

  const MAX_MAP_W = large ? 880 : 520;
  const NODE_SIZE = large ? 60 : 44;
  const LAYER_GAP = large ? 116 : 78;

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(MAX_MAP_W);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setCanvasW(Math.min(MAX_MAP_W, Math.max(1, el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [MAX_MAP_W]);

  const eventGlyph: Record<string, { icon: string; color: string }> = {
    chest: { icon: '◆', color: '#EBA601' },
    trapChest: { icon: '⚠', color: '#BE2156' },
    opulentChest: { icon: '◈', color: '#9b6dff' },
    combat: { icon: '⚔', color: '#cc2233' },
    terminal: { icon: '⌬', color: '#5CC4F0' },
    questNpc: { icon: '✦', color: '#3b82f6' },
    playerKiller: { icon: '☠', color: '#BE2156' },
    distressNpc: { icon: '!', color: '#EBA601' },
    ending: { icon: '★', color: '#FBFBFB' },
  };

  const textBorder = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.9)';

  const PAD_X = NODE_SIZE * 0.9;
  const mapWidth = canvasW;
  const mapHeight = run.depth * LAYER_GAP;
  const bandLeft = PAD_X;
  const bandW = Math.max(1, mapWidth - PAD_X * 2);

  const nodePositions: Record<string, { x: number; y: number }> = {};
  run.layers.forEach((layerIds, d) => {
    const y = (run.depth - 1 - d) * LAYER_GAP + LAYER_GAP / 2;
    const n = layerIds.length;
    layerIds.forEach((id, k) => {
      const frac = (k + 1) / (n + 1);
      nodePositions[id] = { x: bandLeft + frac * bandW, y };
    });
  });

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: `${mapHeight}px`, maxWidth: `${MAX_MAP_W}px`, margin: '0 auto' }}>
      <svg className="absolute inset-0 pointer-events-none" width={mapWidth} height={mapHeight} style={{ zIndex: 1 }}>
        {run.layers.slice(0, -1).map((layerIds, d) =>
          layerIds.map((id) => {
            const node = run.nodes[id];
            const pos1 = nodePositions[id];
            if (!pos1) return null;
            return node.connections.map((cid) => {
              const target = run.nodes[cid];
              const pos2 = nodePositions[cid];
              if (!pos2) return null;
              const isPathVisited = visitedSet.has(id) && visitedSet.has(cid);
              const isReachable = id === run.currentNodeId && reachable.has(cid);
              const isRevealed = node.revealed && target.revealed;
              if (!isRevealed && !isPathVisited) return null;
              const lineColor = isPathVisited ? '#7FC522' : isReachable ? '#5CC4F0' : 'rgba(43,115,179,0.2)';
              const lineW = isPathVisited ? 3 : isReachable ? 2.5 : 1.5;
              const lineOpacity = isPathVisited ? 0.8 : isReachable ? 0.6 : 0.3;
              return (
                <motion.line key={`${id}-${cid}`} x1={pos1.x} y1={pos1.y} x2={pos2.x} y2={pos2.y}
                  stroke={lineColor} strokeWidth={lineW} strokeDasharray={isReachable ? '6 4' : 'none'} opacity={lineOpacity}
                  initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: lineOpacity }}
                  transition={{ duration: 0.5, ease: 'easeOut' }} />
              );
            });
          })
        )}
      </svg>

      {run.layers.map((layerIds, d) =>
        layerIds.map((id) => {
          const node = run.nodes[id];
          const pos = nodePositions[id];
          if (!pos) return null;
          const isCurrent = id === run.currentNodeId;
          const isReach = reachable.has(id) && gatingOk;
          const isVisited = visitedSet.has(id);
          const fog = !node.revealed;
          const eventKnown = isCurrent || node.cleared || isVisited;
          const currentEventResolved = isCurrent && node.events.length > 0 && node.events.every(e => e.resolved);
          const canClickCurrent = isCurrent && !currentEventResolved && !node.isLandmark && node.terrain !== 'terminal';
          const canClickTerminal = isCurrent && node.terrain === 'terminal';

          let bg = 'rgba(48,48,48,0.18)';
          let border = 'rgba(43,115,179,0.2)';
          let glyph = '?';
          let glyphColor = 'rgba(251,251,251,0.3)';

          if (node.cleared) { bg = 'rgba(127,197,34,0.2)'; border = 'rgba(127,197,34,0.4)'; glyph = '✓'; glyphColor = '#7FC522'; }
          else if (isCurrent) {
            bg = 'rgba(43,115,179,0.85)'; border = '#2B73B3';
            const ev = node.events[0];
            if (ev) { const eg = eventGlyph[ev.type]; if (eg) { glyph = eg.icon; glyphColor = eg.color; } }
            else { glyphColor = '#FBFBFB'; }
          } else if (fog) { glyph = '?'; glyphColor = 'rgba(251,251,251,0.2)'; }
          else if (eventKnown) {
            const ev = node.events[0];
            if (ev) { const eg = eventGlyph[ev.type]; if (eg) { glyph = eg.icon; glyphColor = eg.color; } }
          } else {
            glyph = '?'; glyphColor = 'rgba(251,251,251,0.4)';
            if (isReach) { bg = 'rgba(92,196,240,0.15)'; border = 'rgba(92,196,240,0.4)'; }
          }
          if (node.isTerminal && !node.cleared) { glyph = fog ? '?' : (eventKnown ? '⌬' : '?'); glyphColor = '#5CC4F0'; }
          if (node.isLandmark && !node.cleared) { glyph = fog ? '?' : (eventKnown ? '★' : '?'); glyphColor = '#FBFBFB'; }

          return (
            <button key={id} type="button"
              disabled={!isReach && !canClickCurrent && !canClickTerminal}
              onClick={() => { if (canClickCurrent) onResolveCurrentEvent(); else if (canClickTerminal) onResolveCurrentEvent(); else if (isReach) onChooseNode(id); }}
              className="flex items-center justify-center transition-all absolute"
              style={{
                left: `${pos.x - NODE_SIZE / 2}px`, top: `${pos.y - NODE_SIZE / 2}px`,
                width: `${NODE_SIZE}px`, height: `${NODE_SIZE}px`, borderRadius: '50%',
                background: bg, border: `2px solid ${border}`,
                cursor: (isReach || canClickCurrent || canClickTerminal) ? 'pointer' : 'default',
                boxShadow: isCurrent ? '0 0 16px rgba(43,115,179,0.7)' : isReach ? '0 0 12px rgba(92,196,240,0.5)' : 'none',
                animation: isReach ? 'saoPulse 1.6s ease-in-out infinite' : isCurrent ? 'saoPulse 2.4s ease-in-out infinite' : 'none',
                zIndex: 2,
              }}
              aria-label={fog || !eventKnown ? 'Zona sconosciuta' : (node.events[0] ? (EVENT_LABELS[node.events[0].type]?.label ?? node.title) : node.title)}
              title={fog || !eventKnown ? '???' : node.title}
            >
              <span style={{ color: glyphColor, fontSize: large ? '1.3rem' : '0.95rem', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, textShadow: textBorder }}>
                {glyph}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
/* ---------- Zone Card with VR hover (same style as SubAreaCard) ---------- */

function ZoneCard({ currentNode, run, onResolveEvent, onChooseNode, onComplete, cheats }: {
  currentNode: ZoneNode;
  run: SubAreaRun;
  onResolveEvent: (event: ZoneEvent) => void;
  onChooseNode: (nodeId: string) => void;
  onComplete: () => void;
  cheats?: { skipEvents: boolean; immortal: boolean; instakill: boolean; infiniteCol: boolean };
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  // Single state object for hover transform + light position (reduces re-renders)
  const [hover, setHover] = useState<{ tilt: string; lightX: number; lightY: number } | null>(null);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // RAF throttle ref — coalesce multiple mousemove events into 1 frame
  const rafRef = useRef<number | null>(null);
  // FASE C: tracking nodi già "digitati" (l'animazione parte una sola volta per nodo)
  const typedNodesRef = useRef<Set<string>>(new Set());

  // Typewriter effect — FASE C: 8ms per carattere, skip-on-click, una sola volta per nodo
  useEffect(() => {
    const text = currentNode.longDescription;
    if (!text) { setTypedText(''); return; }
    // Se il nodo è già stato "digitato", mostra il testo completo senza animazione
    if (typedNodesRef.current.has(currentNode.id)) {
      setTypedText(text);
      setIsTyping(false);
      return;
    }
    typedNodesRef.current.add(currentNode.id);
    setIsTyping(true);
    setTypedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 8); // 8ms per carattere (era 15ms)
    return () => clearInterval(interval);
  }, [currentNode.id, currentNode.longDescription]);

  // FASE C: handler skip — completa immediatamente il testo se si clicca sulla card durante typing
  const skipTyping = useCallback(() => {
    if (isTyping && currentNode.longDescription) {
      setTypedText(currentNode.longDescription);
      setIsTyping(false);
    }
  }, [isTyping, currentNode.longDescription]);

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

  const resolvedCount = currentNode.events.filter((e) => e.resolved).length;
  const gatingOk = currentNode.terrain === 'terminal' || currentNode.isLandmark || resolvedCount >= 1 || !!cheats?.skipEvents;
  const connections = currentNode.connections;

  // Etichetta dinamica per il bottone del landmark in base all'esito (Fase C arricchirà)
  const landmarkLabel: Record<string, string> = {
    boss: 'AFFRONTA IL BOSS →',
    treasure: 'RIVENDICA IL TESORO →',
    horde: 'RESPINGI L\'ORDA →',
    nothing: 'RAGGIUNGI IL CONFINE →',
  };
  const landmarkAccent = currentNode.ending === 'boss' || currentNode.ending === 'horde' ? '#BE2156' : undefined;

  const textBorder = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.9)';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setHover(null); if (rafRef.current) cancelAnimationFrame(rafRef.current); }}
      onClick={skipTyping}
      className="relative overflow-hidden glass-panel"
      style={{
        width: '100%',
        padding: '20px',
        transform: hover?.tilt,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out, height 0.4s ease-out',
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
          style={{ color: '#FBFBFB', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 700, fontSize: '0.95rem', textShadow: textBorder }}
        >
          ZONA {currentNode.position} — {currentNode.title}
        </h3>
        <span style={{ color: 'rgba(92,196,240,0.6)', fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif", fontWeight: 400, fontSize: '0.5rem', letterSpacing: '0.15em', textShadow: textBorder }}>
          {currentNode.terrain.toUpperCase()}
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
            textShadow: textBorder,
            letterSpacing: '0.01em',
          }}
        >
          {typedText}
          {isTyping && <span style={{ color: '#5CC4F0', animation: 'blink 1s infinite' }}>▋</span>}
        </p>
      )}

      {/* Short description — white SAO-style, with black border */}
      <p
        className="leading-relaxed mb-4"
        style={{
          color: '#FBFBFB',
          fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif",
          fontWeight: 400,
          fontSize: '0.8rem',
          lineHeight: 1.6,
          textShadow: textBorder,
          opacity: 0.9,
        }}
      >
        {currentNode.description}
      </p>

      {/* La card mostra SOLO la descrizione. Eventi e navigazione si gestiscono dalla mappa. */}
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
