// === SAO Exploration Types ===
// Gerarchia: ExploreArea → SubArea[] → grafo di ZoneNode (layer + connections + fog-of-war)

// === Le 7 statistiche canoniche (per skill check) ===
export type ExploreStatKey = 'STR' | 'DEX' | 'AGI' | 'VIT' | 'RES' | 'MEN' | 'INT';

export type TerrainType =
  | 'plains' | 'hills' | 'river' | 'sparse_wood' | 'ruins'
  | 'camp' | 'clearing' | 'highland' | 'terminal';

// === Tipi di evento (solo quelli canonici SAO) ===
export type ZoneEventType =
  | 'chest' | 'trapChest' | 'opulentChest' | 'combat' | 'terminal'
  | 'questNpc' | 'playerKiller' | 'distressNpc' | 'ending';

// === Tipo di finale della sotto-area (4 esiti) ===
export type EndingType = 'boss' | 'treasure' | 'horde' | 'nothing';

export interface ZoneEvent {
  type: ZoneEventType;
  resolved: boolean;
  payload: Record<string, unknown>;
}

// === ZoneNode ora è un NODO DI GRAFO ===
export interface ZoneNode {
  id: string;
  depth: number;          // indice del layer (0..depth-1)
  indexInLayer: number;   // posizione nel layer
  position: number;       // numero progressivo per UI/lore — mantiene la regola "prime 3 zone"
  terrain: TerrainType;
  title: string;
  description: string;
  longDescription?: string;
  events: ZoneEvent[];
  cleared: boolean;
  connections: string[];  // ID dei nodi raggiungibili nel layer successivo
  revealed: boolean;      // fog-of-war: tipo/eventi visibili al giocatore
  isTerminal: boolean;    // nodo terminale (riposo/checkpoint) — al centro
  isLandmark: boolean;    // nodo finale (ending) — ultimo layer
  ending?: EndingType;    // valorizzato solo se isLandmark
}

// === SubAreaRun: ora basato su grafo ===
export interface SubAreaRun {
  subAreaId: string;
  seed: number;
  depth: number;                      // numero di layer (lunghezza variabile)
  nodes: Record<string, ZoneNode>;    // tutti i nodi per ID
  layers: string[][];                 // ID dei nodi per layer (per il rendering della mappa)
  currentNodeId: string;
  visitedNodeIds: string[];           // percorso effettivo del giocatore
  spawnedTrapChest: boolean;
  spawnedQuestNpc: boolean;
  spawnedDistressNpc: boolean;
  usedTerminal: boolean;
  tempPartyMemberId: string | null;
  // statistiche per la schermata di completamento (Fase C)
  stats: {
    nodesVisited: number;
    eventsResolved: number;
    itemsFound: number;
    skillChecksPassed: number;
    skillChecksFailed: number;
    
  };
}

// === Checkpoint aggiornato (salva il percorso nel grafo) ===
export interface SubAreaCheckpoint {
  seed: number;
  depth: number;
  currentNodeId: string;
  visitedNodeIds: string[];
  spawnedTrapChest: boolean;
  spawnedQuestNpc: boolean;
  spawnedDistressNpc: boolean;
}

// === Esiti di opzioni narrative / skill check (Fase B) ===
export type ExploreOutcomeType = 'reward' | 'heal' | 'risk' | 'nothing';
export interface ExploreOutcome {
  type: ExploreOutcomeType;
  itemPool?: string;   // chiave di LOOT_TABLES (per 'reward')
  text: string;        // testo mostrato al giocatore
  // 'risk' → TODO(combat-system): innescherà un combattimento
}

export interface NarrativeOption {
  label: string;
  // prova opzionale: se presente, l'opzione fa uno skill check. 'difficulty' è sulla scala
  // delle 7 statistiche (~1..90); la probabilità di successo è derivata dalla statistica vs
  // difficulty (vedi skillCheckChance in B.5.1).
  check?: { stat: ExploreStatKey; difficulty: number };
  success: ExploreOutcome;
  failure?: ExploreOutcome; // usato solo se c'è un check
}
export interface NarrativeScene {
  id: string;
  prompt: string;          // descrizione della situazione
  options: NarrativeOption[];
}


export interface SubAreaDef {
  id: string;
  areaId: string;
  name: string;
  description: string;
  order: number;
  terrainPalette: TerrainType[];
  zoneTexts: Partial<Record<TerrainType, { title: string; variants: [string, string, string]; longDesc?: [string, string, string] }>>;
}

export interface ExploreAreaDef {
  id: string;
  name: string;
  description: string;
  order: number;
  subAreaIds: string[];
}

export interface SubAreaProgress {
  status: 'locked' | 'unlocked' | 'completed';
}

export interface AreaProgress {
  unlocked: boolean;
}

export interface StolenLootRecord {
  id: string;
  items: string[];      // item IDs
  col: number;
  stolenAt: number;
  deadline: number;
  fromAreaId: string;
  targetSubAreaId: string;
  thievesZoneIndex: number;
  status: 'pending' | 'recovered' | 'failed';
}

export interface PendingQuestStub {
  id: string;
  type: 'procedural' | 'loot_recovery' | 'secret_knights';
  createdAt: number;
  deadline?: number;
  data: Record<string, unknown>;
}

export interface ExploreState {
  areaProgress: Record<string, AreaProgress>;
  subAreaProgress: Record<string, SubAreaProgress>;
  activeRun: SubAreaRun | null;
  subAreaCheckpoints: Record<string, SubAreaCheckpoint>;
  visitedHubs: string[];
  stolenLoot: StolenLootRecord[];
  pendingQuestStubs: PendingQuestStub[];
  bossLetterObtained: boolean;
  secretQuestUnlocked: boolean;
  secretQuestCompleted: boolean;
  reputations: string[];
  // === FASE C: stato persistente di collezione/cartografia ===
  mappedTerrains: TerrainType[];     // tipi di terreno visitati almeno una volta
  visitedLandmarks: EndingType[];    // esiti finali incontrati (per collezione)
  gatheredResources: Record<string, number>; // forward-compat crafting (herb/mineral/wood → quantità)
  knownBossPaths: string[];          // subAreaId che hanno generato un finale 'boss' (MAI cancellare)
}

export const ENCOUNTER_RESOLUTION_MODE: 'priority' | 'independent' = 'priority';

export function createInitialExploreState(): ExploreState {
  return {
    areaProgress: {
      'grandi-pianure': { unlocked: true },
    },
    subAreaProgress: {
      'pianure-esteriori': { status: 'unlocked' },
      'mulini-a-vento': { status: 'unlocked' },
      'bosco-rigoglioso': { status: 'unlocked' },
    },
    activeRun: null,
    subAreaCheckpoints: {},
    visitedHubs: ['city-of-beginnings'],
    stolenLoot: [],
    pendingQuestStubs: [],
    bossLetterObtained: false,
    secretQuestUnlocked: false,
    secretQuestCompleted: false,
    reputations: [],
    // FASE C: collezione/cartografia
    mappedTerrains: [],
    visitedLandmarks: [],
    gatheredResources: {},
    knownBossPaths: [],
  };
}
