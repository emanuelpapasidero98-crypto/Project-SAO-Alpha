// === SAO Exploration Data ===
// Data-driven: aggiungere nuove aree/sotto-aree è solo aggiungere dati qui.

import type { ExploreAreaDef, SubAreaDef, TerrainType } from './sao-explore-types';

// === AREE ===
export const EXPLORE_AREAS: ExploreAreaDef[] = [
  {
    id: 'grandi-pianure',
    name: 'Grandi Pianure',
    description: 'Le ampie pianure che circondano la Città degli Inizi. Il primo territorio esplorabile di Aincrad.',
    order: 1,
    subAreaIds: ['pianure-esteriori'],
  },
];

// === SOTTO-AREE ===
export const EXPLORE_SUBAREAS: SubAreaDef[] = [
  {
    id: 'pianure-esteriori',
    areaId: 'grandi-pianure',
    name: 'Pianure Esteriori',
    description: 'La prima zona delle Grandi Pianure, subito fuori dalle mura della città.',
    order: 1,
    terrainPalette: ['plains', 'hills', 'river', 'sparse_wood', 'clearing', 'ruins'],
    zoneTexts: {
      plains: {
        title: 'Pianura Aperta',
        variants: [
          'Ti trovi in una vasta pianura erbosa. Il vento fa oscillare l\'erba alta in tutte le direzioni.',
          'Una distesa di erba verde si estende a perdita d\'occhio. Il sole brilla alto nel cielo di Aincrad.',
          'La pianura si stende davanti a te, piatta e silenziosa. Lontano, si intravede la sagoma di una foresta.',
        ],
      },
      hills: {
        title: 'Colline Dolci',
        variants: [
          'Le colline si susseguono dolcemente. Dalla cima di una di esse puoi scorgere la città lontana.',
          'Il terreno si fa ondulato. Piccoli fiori selvatici punteggiano i pendii.',
          'Cammini tra colline basse e arrotondate. L\'aria è fresca e pulita.',
        ],
      },
      river: {
        title: 'Riva del Fiume',
        variants: [
          'Un fiume cristallino scorre davanti a te. Le acque sono basse ma scorrono veloci.',
          'Segui il corso di un piccolo fiume. Sulla riva ci sono tracce di animali.',
          'Un ruscello gorgoglia tra le pietre. L\'acqua è limpida e fredda al tatto.',
        ],
      },
      sparse_wood: {
        title: 'Bosco Rado',
        variants: [
          'Entri in un bosco rado. I raggi di sole filtrano tra i tronchi sottili.',
          'Alcuni alberi isolati formano un boschetto. Senti uccelli cantare in lontananza.',
          'Il sentiero entra in una macchia di alberi. L\'ombra è fresca e gradevole.',
        ],
      },
      clearing: {
        title: 'Radura',
        variants: [
          'Arrivi in una radura circolare. L\'erba è bassa e ben curata, quasi innaturale.',
          'Una radura si apre davanti a te. Al centro c\'è un grande masso coperto di muschio.',
          'Il bosco si dirada e ti trovi in una radura soleggiata. È un buon posto per riposare.',
        ],
      },
      ruins: {
        title: 'Rovine Antiche',
        variants: [
          'Tra l\'erba spuntano le rovine di una struttura antica. Pietre consumate dal tempo.',
          'Resti di muri di pietra emergono dal terreno. Chissà cosa c\'era qui un tempo.',
          'Cammini tra ruderi coperti di edera. L\'atmosfera è silenziosa e misteriosa.',
        ],
      },
      terminal: {
        title: 'Terminale di Esplorazione',
        variants: [
          'Un terminale di cristallo brilla in una piccola radura. È un punto sicuro.',
          'Trovi un terminale di esplorazione. La sua luce azzurra pulsa delicatamente.',
          'Un pilastro di cristallo segna un punto sicuro. Puoi riposare qui.',
        ],
      },
      camp: {
        title: 'Campo Abbandonato',
        variants: [
          'Trovi i resti di un campo. Un fuoco spento e alcune provviste abbandonate.',
          'Un piccolo accampamento abbandonato. Sembra che qualcuno sia fuggito in fretta.',
          'Resti di un campo temporaneo. Le tracce sul terreno sono recenti.',
        ],
      },
      highland: {
        title: 'Altopiano',
        variants: [
          'Il terreno si alza in un altopiano. Da qui puoi vedere tutta la zona circostante.',
          'Sei su un altopiano battuto dal vento. La vista spazia per chilometri.',
          'L\'altopiano offre una vista panoramica sulle pianure sottostanti.',
        ],
      },
    },
  },
];

// === LOOT TABLES (data-driven) ===
// Pool di item per rarità. Riferisce gli item esistenti in sao-sample-items.
// L'utente le espanderà in futuro.
export const LOOT_TABLES: Record<string, string[]> = {
  // Item ID per rarità
  common: ['sample-item', 'sample-potion'],
  uncommon: ['sample-sword-1h', 'sample-dagger', 'sample-item'],
  rare: ['sample-sword-2h', 'sample-axe-2h', 'sample-armor', 'sample-accessory'],
  epic: ['sample-sword-2h', 'sample-axe-2h'],
  legendary: [],
  // Pool speciale per forzieri (mai item missione)
  chest_pool: [
    'sample-sword-1h', 'sample-dagger', 'sample-finesword', 'sample-axe-1h',
    'sample-armor', 'sample-accessory', 'sample-item', 'sample-potion',
  ],
  // Pool per forziere trappola (5 item rari+)
  trap_chest_pool: [
    'sample-sword-2h', 'sample-axe-2h', 'sample-armor', 'sample-accessory',
    'sample-sword-1h', 'sample-finesword',
  ],
  // Pool per NPC dono (common/uncommon)
  npc_gift_pool: ['sample-item', 'sample-potion', 'sample-dagger', 'sample-sword-1h'],
};

// === HELPER ===
export function getAreaById(id: string): ExploreAreaDef | undefined {
  return EXPLORE_AREAS.find((a) => a.id === id);
}

export function getSubAreaById(id: string): SubAreaDef | undefined {
  return EXPLORE_SUBAREAS.find((s) => s.id === id);
}

export function getSubAreasForArea(areaId: string): SubAreaDef[] {
  return EXPLORE_SUBAREAS.filter((s) => s.areaId === areaId).sort((a, b) => a.order - b.order);
}

// === COERENZA GEOGRAFICA TERRENI ===
// Definisce quali terreni possono seguire quali (adiacenza compatibile)
export const TERRAIN_ADJACENCY: Record<TerrainType, TerrainType[]> = {
  plains: ['plains', 'hills', 'river', 'sparse_wood', 'clearing', 'camp', 'ruins'],
  hills: ['plains', 'hills', 'highland', 'sparse_wood', 'ruins'],
  river: ['plains', 'river', 'sparse_wood', 'hills'],
  sparse_wood: ['plains', 'sparse_wood', 'clearing', 'ruins', 'hills'],
  ruins: ['plains', 'ruins', 'sparse_wood', 'hills'],
  camp: ['plains', 'camp', 'clearing', 'hills'],
  clearing: ['plains', 'clearing', 'sparse_wood', 'camp'],
  highland: ['hills', 'highland', 'ruins'],
  terminal: [], // gestito separatamente
};
