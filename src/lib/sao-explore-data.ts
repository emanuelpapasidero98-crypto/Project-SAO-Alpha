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
    subAreaIds: ['pianure-esteriori', 'mulini-a-vento', 'bosco-rigoglioso'],
  },
];

// === SOTTO-AREE ===
export const EXPLORE_SUBAREAS: SubAreaDef[] = [
  {
    id: 'pianure-esteriori',
    areaId: 'grandi-pianure',
    name: 'Praterie',
    description: 'Le praterie aperte subito fuori dalla città. Il primo territorio che ogni avventuriero esplora ad Aincrad.',
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
  {
    id: 'mulini-a-vento',
    areaId: 'grandi-pianure',
    name: 'Zona dei Mulini a Vento',
    description: 'Una zona collinare punteggiata da vecchi mulini a vento. Le pale girano lentamente nel vento costante.',
    order: 2,
    terrainPalette: ['hills', 'plains', 'camp', 'highland', 'ruins', 'clearing'],
    zoneTexts: {
      hills: {
        title: 'Colline dei Mulini',
        variants: [
          'Le colline sono costellate di mulini a vento. Le pale scricchiolano nel vento.',
          'Cammini tra colline dove antichi mulini a vento dominano il paesaggio.',
          'I mulini a vento girano pigramente sulle colline. L\'aria sa di erba e legno vecchio.',
        ],
      },
      plains: {
        title: 'Pianura dei Mulini',
        variants: [
          'Una pianura aperta con mulini sparsi. Il vento qui è particolarmente forte.',
          'I mulini a vento si stagliano contro il cielo nella pianura.',
          'L\'erba della pianura si piega al vento che fa girare i mulini.',
        ],
      },
      camp: {
        title: 'Campo di Sostegno',
        variants: [
          'Trovi un campo di sostegno vicino a un mulino. Qualcuno ha lasciato delle provviste.',
          'Un piccolo campo tra i mulini. Sembra essere usato dai raccoglitori.',
          'Un accampamento temporaneo all\'ombra di un grande mulino a vento.',
        ],
      },
      highland: {
        title: 'Altopiano Ventoso',
        variants: [
          'L\'altopiano è battuto da un vento fortissimo. I mulini qui girano vorticosamente.',
          'Dall\'altopiano vedi tutti i mulini della zona. Il vento ti scompiglia i capelli.',
          'Sull\'altopiano il vento è così forte che fa vibrare le pale dei mulini.',
        ],
      },
      ruins: {
        title: 'Mulini in Rovina',
        variants: [
          'Mulini abbandonati e in rovina. Le pale spezzate non girano più.',
          'Tra le rovine di vecchi mulini, il vento fischia attraverso le assi rotte.',
          'I resti di mulini antichi emergono dall\'erba alta. Chissà chi li ha costruiti.',
        ],
      },
      clearing: {
        title: 'Radura tra i Mulini',
        variants: [
          'Una radura tra i mulini. Il terreno è calpestato da molti passi.',
          'Ti fermi in una radura. I mulini circostanti creano un muro di legno e tela.',
          'Una radura circolare attorniata da mulini. È un buon punto di osservazione.',
        ],
      },
      terminal: {
        title: 'Terminale dei Mulini',
        variants: [
          'Un terminale di cristallo brilla vicino a un mulino. Le sue luci riflettono sulle pale.',
          'Trovi un terminale di esplorazione ai piedi di un mulino. Pulsa di luce azzurra.',
          'Un pilastro di cristallo tra i mulini. Un punto sicuro nel vento.',
        ],
      },
      river: {
        title: 'Ruscello dei Mulini',
        variants: [
          'Un piccolo ruscello scorre tra i mulini. L\'acqua alimenta alcune delle pale.',
          'Segui il ruscello che passa tra le colline dei mulini.',
          'L\'acqua gorgoglia vicino alle fondamenta di un mulino.',
        ],
      },
      sparse_wood: {
        title: 'Boschetto vicino ai Mulini',
        variants: [
          'Un piccolo boschetto cresce vicino ai mulini. Fa da frangivento.',
          'Alcuni alberi proteggono i mulini dal vento più forte.',
          'Un boschetto rado ombreggia un gruppo di mulini.',
        ],
      },
    },
  },
  {
    id: 'bosco-rigoglioso',
    areaId: 'grandi-pianure',
    name: 'Bosco Rigoglioso',
    description: 'Un bosco denso e lussureggiante ai margini delle Grandi Pianure. La luce filtra a malapena tra le fronde.',
    order: 3,
    terrainPalette: ['sparse_wood', 'river', 'ruins', 'clearing', 'hills', 'camp'],
    zoneTexts: {
      sparse_wood: {
        title: 'Bosco Denso',
        variants: [
          'Il bosco si infittisce. Gli alberi sono così vicini che i rami si intrecciano sopra di te.',
          'Cammini in un bosco rigoglioso. Il canto degli uccelli riempie l\'aria.',
          'Il sottobosco è rigoglioso e umido. Le foglie formano un tetto verde sopra la tua testa.',
        ],
      },
      river: {
        title: 'Fiume del Bosco',
        variants: [
          'Un fiume scorre attraverso il bosco. L\'acqua è scura per le foglie che la cadono dentro.',
          'Segui il corso del fiume tra gli alberi. L\'acqua gorgoglia sulle radici sommerse.',
          'Un ruscello serpeggia nel bosco. Piccoli pesci guizzano sotto la superficie.',
        ],
      },
      ruins: {
        title: 'Rovine nel Bosco',
        variants: [
          'Tra le radici degli alberi spuntano pietre antiche. Il bosco ha inghiottito le rovine.',
          'Muri coperti di muschio emergono dal terreno del bosco. La natura ha reclamato tutto.',
          'Cammini tra rovine che il bosco ha avvolto nei secoli. L\'edera copre ogni cosa.',
        ],
      },
      clearing: {
        title: 'Radura del Bosco',
        variants: [
          'Una radura nel cuore del bosco. I raggi di sole creano un cerchio di luce.',
          'La radura è un rifugio di pace nel bosco fitto. Farfalle danzano tra i fiori.',
          'Ti fermi in una radura luminosa. Dopo il buio del bosco, la luce è accecante.',
        ],
      },
      hills: {
        title: 'Colline Boscose',
        variants: [
          'Il bosco copre le colline. Il terreno è irregolare e coperto di radici.',
          'Le colline boscose si alzano dolcemente. Senti il profumo di resina.',
          'Cammini tra colline coperte di alberi. Il terreno è morbido di foglie secche.',
        ],
      },
      camp: {
        title: 'Campo nel Bosco',
        variants: [
          'Trovi un campo nascosto nel bosco. È ben camuffato tra gli alberi.',
          'Un accampamento di boscaioli abbandonato. Le asce sono ancora appoggiate a un tronco.',
          'Un piccolo campo nella radura del bosco. Sembra essere stato usato di recente.',
        ],
      },
      terminal: {
        title: 'Terminale del Bosco',
        variants: [
          'Un terminale di cristallo brilla tra gli alberi. La sua luce è l\'unica cosa artificiale nel bosco.',
          'Trovi un terminale di esplorazione avvolto dalle radici. Pulsa delicatamente.',
          'Un pilastro di cristallo nella radura del bosco. La sua luce attira le lucciole.',
        ],
      },
      plains: {
        title: 'Margine del Bosco',
        variants: [
          'Il bosco si dirada verso la pianura. Senti il vento che non entra tra gli alberi.',
          'Sei al margine del bosco. Davanti a te si apre la pianura luminosa.',
          'Gli ultimi alberi del bosco lasciano spazio alla pianura.',
        ],
      },
      highland: {
        title: 'Altopiano Boscato',
        variants: [
          'Il bosco copre un altopiano. Da qui puoi vedere la cima degli alberi stendersi a perdita d\'occhio.',
          'Sull\'altopiano boscato l\'aria è più sottile. Gli alberi sono più bassi qui.',
          'Un altopiano coperto di bosco. Il vento muove le chiome degli alberi come onde.',
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
