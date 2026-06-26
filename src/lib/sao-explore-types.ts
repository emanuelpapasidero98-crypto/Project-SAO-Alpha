// === SAO Exploration Types ===
// Gerarchia: ExploreArea → SubArea[] → Zone[8]

export type TerrainType =
  | 'plains' | 'hills' | 'river' | 'sparse_wood' | 'ruins'
  | 'camp' | 'clearing' | 'highland' | 'terminal';

export type ZoneEventType =
  | 'chest' | 'trapChest' | 'combat' | 'terminal'
  | 'questNpc' | 'playerKiller' | 'distressNpc';

export interface ZoneEvent {
  type: ZoneEventType;
  resolved: boolean;
  payload: Record<string, unknown>;
}

export interface ZoneNode {
  id: string;
  index: number;      // 0..7
  position: number;   // 1..8 (per UI e regola "prime 3 zone")
  terrain: TerrainType;
  title: string;
  description: string;
  events: ZoneEvent[];
  cleared: boolean;
}

export interface SubAreaDef {
  id: string;
  areaId: string;
  name: string;
  description: string;
  order: number;
  terrainPalette: TerrainType[];
  zoneTexts: Partial<Record<TerrainType, { title: string; variants: [string, string, string] }>>;
}

export interface ExploreAreaDef {
  id: string;
  name: string;
  description: string;
  order: number;
  subAreaIds: string[];
}

export interface SubAreaRun {
  subAreaId: string;
  seed: number;
  zones: ZoneNode[];
  currentZoneIndex: number;
  spawnedTrapChest: boolean;
  spawnedQuestNpc: boolean;
  spawnedDistressNpc: boolean;
  usedTerminal: boolean;
  tempPartyMemberId: string | null;
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
  subAreaCheckpoints: Record<string, {
    seed: number;
    zoneIndex: number;
    spawnedTrapChest: boolean;
    spawnedQuestNpc: boolean;
    spawnedDistressNpc: boolean;
  }>;
  visitedHubs: string[];
  stolenLoot: StolenLootRecord[];
  pendingQuestStubs: PendingQuestStub[];
  bossLetterObtained: boolean;
  secretQuestUnlocked: boolean;
  secretQuestCompleted: boolean;
  reputations: string[];
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
  };
}
