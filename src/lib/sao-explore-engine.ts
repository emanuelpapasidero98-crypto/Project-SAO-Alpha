// === SAO Exploration Generation Engine ===
// Generazione deterministica delle 8 zone + rolling eventi.

import type {
  SubAreaDef,
  ZoneNode,
  ZoneEvent,
  SubAreaRun,
  TerrainType,
} from './sao-explore-types';
import { ENCOUNTER_RESOLUTION_MODE } from './sao-explore-types';
import { TERRAIN_ADJACENCY, LOOT_TABLES } from './sao-explore-data';

// === PRNG seedato (mulberry32) ===
// Generazione di layout, NON combattimento (regola d'oro).
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// === GENERAZIONE 8 ZONE ===
export function generateSubAreaRun(
  subAreaDef: SubAreaDef,
  seed: number,
  checkpoint?: {
    seed: number;
    zoneIndex: number;
    spawnedTrapChest: boolean;
    spawnedQuestNpc: boolean;
    spawnedDistressNpc: boolean;
  },
): SubAreaRun {
  // Usa il seed del checkpoint se presente, altrimenti il seed passato
  const actualSeed = checkpoint?.seed ?? seed;
  const rng = mulberry32(actualSeed);

  // Genera 8 zone
  const zones: ZoneNode[] = [];
  const palette = subAreaDef.terrainPalette;

  // Zona 5 (index 4) è sempre terminal
  for (let i = 0; i < 8; i++) {
    const position = i + 1;
    let terrain: TerrainType;

    if (i === 4) {
      // Zona 5 = Terminale fisso
      terrain = 'terminal';
    } else {
      // Coerenza geografica: scegli terreno compatibile col precedente
      if (i === 0) {
        // Prima zona: terreno "ingresso" (primo della palette)
        terrain = palette[0];
      } else if (i === 7) {
        // Ultima zona: terreno "landmark" (ultimo della palette)
        terrain = palette[palette.length - 1];
      } else {
        // Zone intermedie: compatibile col precedente
        const prevTerrain = zones[i - 1].terrain;
        const compatible = TERRAIN_ADJACENCY[prevTerrain]?.filter((t) =>
          palette.includes(t),
        ) ?? palette;
        terrain = compatible.length > 0 ? pick(rng, compatible) : pick(rng, palette);
      }
    }

    // Testo zona
    const textDef = subAreaDef.zoneTexts[terrain];
    const title = textDef?.title ?? 'Zona Sconosciuta';
    const variants = textDef?.variants ?? ['Ti trovi in una zona.', 'Procedi avanti.', 'Il sentiero continua.'];
    const description = pick(rng, variants);

    zones.push({
      id: `${subAreaDef.id}-zone-${i}`,
      index: i,
      position,
      terrain,
      title,
      description,
      events: [],
      cleared: false,
    });
  }

  // Rolling eventi per ogni zona non-terminale
  const spawnedTrapChest = checkpoint?.spawnedTrapChest ?? false;
  const spawnedQuestNpc = checkpoint?.spawnedQuestNpc ?? false;
  const spawnedDistressNpc = checkpoint?.spawnedDistressNpc ?? false;

  const runFlags = {
    spawnedTrapChest,
    spawnedQuestNpc,
    spawnedDistressNpc,
  };

  for (let i = 0; i < 8; i++) {
    if (zones[i].terrain === 'terminal') {
      zones[i].events = [{ type: 'terminal', resolved: false, payload: {} }];
      continue;
    }
    zones[i].events = rollZoneEvents(rng, zones[i], runFlags);
  }

  // Se checkpoint, riparti da quell'indice e marca le zone precedenti come cleared
  const currentZoneIndex = checkpoint?.zoneIndex ?? 0;
  if (checkpoint) {
    for (let i = 0; i < currentZoneIndex && i < 8; i++) {
      zones[i].cleared = true;
      for (const ev of zones[i].events) ev.resolved = true;
    }
  }

  return {
    subAreaId: subAreaDef.id,
    seed: actualSeed,
    zones,
    currentZoneIndex,
    spawnedTrapChest,
    spawnedQuestNpc,
    spawnedDistressNpc,
    usedTerminal: false,
    tempPartyMemberId: null,
  };
}

// === ROLLING EVENTI (modalità priority, default) ===
function rollZoneEvents(
  rng: () => number,
  zone: ZoneNode,
  runFlags: { spawnedTrapChest: boolean; spawnedQuestNpc: boolean; spawnedDistressNpc: boolean },
): ZoneEvent[] {
  const events: ZoneEvent[] = [];
  const firstThree = zone.position <= 3;

  if (ENCOUNTER_RESOLUTION_MODE === 'priority') {
    // --- SLOT COMBATTIMENTO: al massimo UNO, priorità a eventi rari/once ---
    if (!runFlags.spawnedTrapChest && rng() < 0.05) {
      runFlags.spawnedTrapChest = true;
      events.push(makeTrapChest());
    } else if (!runFlags.spawnedDistressNpc && rng() < 0.10) {
      runFlags.spawnedDistressNpc = true;
      events.push(makeDistressNpc());
    } else if (rng() < 0.30) {
      const count = rngInt(rng, 3, 5);
      events.push(makePlayerKiller(count));
    } else if (rng() < 0.60) {
      const max = firstThree ? 2 : 5;
      const count = rngInt(rng, 1, max);
      const hasElite = rng() < 0.30;
      events.push(makeCombat(count, hasElite));
    }
  } else {
    if (rng() < 0.60) {
      const max = firstThree ? 2 : 5;
      const count = rngInt(rng, 1, max);
      const hasElite = rng() < 0.30;
      events.push(makeCombat(count, hasElite));
    }
    if (!runFlags.spawnedTrapChest && rng() < 0.05) {
      runFlags.spawnedTrapChest = true;
      events.push(makeTrapChest());
    }
    if (!runFlags.spawnedDistressNpc && rng() < 0.10) {
      runFlags.spawnedDistressNpc = true;
      events.push(makeDistressNpc());
    }
    if (rng() < 0.30) {
      const count = rngInt(rng, 3, 5);
      events.push(makePlayerKiller(count));
    }
  }

  // --- DISCOVERY in overlay (indipendenti) ---
  if (rng() < 0.20) {
    events.push(makeChest(rng));
  }
  if (!runFlags.spawnedQuestNpc && rng() < 0.20) {
    runFlags.spawnedQuestNpc = true;
    events.push(makeQuestNpc());
  }

  // === GARANTIA MIN 2 EVENTI, MAX 4 ===
  // Se ci sono meno di 2 eventi, aggiungi eventi finché ne abbiamo almeno 2
  while (events.length < 2) {
    // Aggiungi un forziere o un combattimento base
    if (rng() < 0.5) {
      events.push(makeChest(rng));
    } else {
      const max = firstThree ? 2 : 5;
      events.push(makeCombat(rngInt(rng, 1, max), false));
    }
  }

  // Se ci sono più di 4 eventi, taglia a 4
  if (events.length > 4) {
    events.splice(4);
  }

  return events;
}

// === FACTORY EVENTI ===

function makeChest(rng: () => number): ZoneEvent {
  // 25% probabilità forziere vuoto
  const isEmpty = rng() < 0.25;
  if (isEmpty) {
    return { type: 'chest', resolved: false, payload: { empty: true } };
  }
  // Scegli item dalla chest_pool
  const pool = LOOT_TABLES.chest_pool;
  const itemId = pick(rng, pool);
  return { type: 'chest', resolved: false, payload: { itemId, empty: false } };
}

function makeTrapChest(): ZoneEvent {
  // 3 Mob + 1 Elite (capitano). 5 item rari se sopravvivi.
  const rewards = LOOT_TABLES.trap_chest_pool.slice(0, 5);
  return {
    type: 'trapChest',
    resolved: false,
    payload: {
      mobCount: 3,
      eliteCount: 1,
      noEscape: true,
      rewards,
      // TODO(combat-system): startCombat con composizione fissa
    },
  };
}

function makeCombat(count: number, hasElite: boolean): ZoneEvent {
  return {
    type: 'combat',
    resolved: false,
    payload: {
      mobCount: count,
      hasElite,
      // TODO(combat-system): startCombat con composizione generata
    },
  };
}

function makePlayerKiller(count: number): ZoneEvent {
  return {
    type: 'playerKiller',
    resolved: false,
    payload: {
      pkCount: count,
      // TODO(combat-system): startCombat con NPC ostili
      // Se player perde: svuota Borsa → StolenLootRecord
    },
  };
}

function makeDistressNpc(): ZoneEvent {
  const wantsToJoin = Math.random() < 0.05; // 5% chiede di unirsi
  return {
    type: 'distressNpc',
    resolved: false,
    payload: {
      mobCount: 2, // NPC attaccato da 2 mob
      wantsToJoin,
      giftPool: LOOT_TABLES.npc_gift_pool,
      // TODO(combat-system): startCombat per salvare NPC
      // Se salvi: dono 1 item a tutti i party members
      // 5%: NPC chiede di unirsi → tempPartyMemberId
    },
  };
}

function makeQuestNpc(): ZoneEvent {
  return {
    type: 'questNpc',
    resolved: false,
    payload: {
      // TODO(quest-system): creare PendingQuestStub type 'procedural'
      questType: 'procedural',
      placeholder: true,
    },
  };
}

// === HELPER: genera seed casuale ===
export function generateSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}

// === HELPER: ottieni loot item ID da evento chest ===
export function getChestLoot(event: ZoneEvent): string | null {
  if (event.type !== 'chest') return null;
  if (event.payload.empty) return null;
  return (event.payload.itemId as string) ?? null;
}
