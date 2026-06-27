// === SAO Exploration Generation Engine ===
// Generazione deterministica del grafo di zone (layer + connections + fog) + rolling eventi.

import type {
  SubAreaDef,
  ZoneNode,
  ZoneEvent,
  SubAreaRun,
  SubAreaCheckpoint,
  TerrainType,
  EndingType,
  ExploreStatKey,
} from './sao-explore-types';
import { ENCOUNTER_RESOLUTION_MODE } from './sao-explore-types';
import { TERRAIN_ADJACENCY, LOOT_TABLES, SKILL_CHECK_PROMPTS, NARRATIVE_SCENES } from './sao-explore-data';

// === Costanti lunghezza variabile ===
const MIN_DEPTH = 7;   // lunghezza minima (numero di layer)
const MAX_DEPTH = 9;   // lunghezza massima

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
  // guardia: array vuoto → ritorna il primo elemento (o undefined castato) per non crashare
  if (!arr || arr.length === 0) {
    console.warn('[explore-engine] pick() su array vuoto, ritorno undefined');
    return undefined as unknown as T;
  }
  return arr[Math.floor(rng() * arr.length)];
}

// === GENERAZIONE GRAFO A LAYER ===
export function generateSubAreaRun(
  subAreaDef: SubAreaDef,
  seed: number,
  checkpoint?: SubAreaCheckpoint,
): SubAreaRun {
  const actualSeed = checkpoint?.seed ?? seed;
  const rng = mulberry32(actualSeed);
  const palette = subAreaDef.terrainPalette;

  // --- 1. Lunghezza variabile ---
  const depth = checkpoint?.depth ?? rngInt(rng, MIN_DEPTH, MAX_DEPTH);
  const terminalLayer = Math.floor(depth / 2); // terminale al centro (convergenza forzata)
  const lastLayer = depth - 1;                  // finale (convergenza forzata)

  // --- 2. Larghezza di ogni layer ---
  const widths: number[] = [];
  for (let d = 0; d < depth; d++) {
    if (d === 0 || d === terminalLayer || d === lastLayer) widths.push(1);
    else widths.push(rngInt(rng, 1, 3)); // ramificazione
  }

  // --- 3. Crea i nodi (terreno/eventi assegnati dopo) ---
  const nodes: Record<string, ZoneNode> = {};
  const layers: string[][] = [];
  let positionCounter = 1;
  for (let d = 0; d < depth; d++) {
    const layerIds: string[] = [];
    for (let k = 0; k < widths[d]; k++) {
      const id = `${subAreaDef.id}-n${d}-${k}`;
      nodes[id] = {
        id, depth: d, indexInLayer: k, position: positionCounter++,
        terrain: 'plains', title: '', description: '', events: [],
        cleared: false, connections: [], revealed: false,
        isTerminal: d === terminalLayer, isLandmark: d === lastLayer,
      };
      layerIds.push(id);
    }
    layers.push(layerIds);
  }

  // --- 4. Archi tra layer adiacenti (per prossimità, con ramificazione) ---
  for (let d = 0; d < depth - 1; d++) {
    const cur = layers[d];
    const next = layers[d + 1];
    for (let i = 0; i < cur.length; i++) {
      const rel = cur.length === 1 ? 0.5 : i / (cur.length - 1);
      const targetIdx = Math.round(rel * (next.length - 1));
      const targets = new Set<number>([targetIdx]);
      if (next.length > 1 && rng() < 0.5) {
        const dir = rng() < 0.5 ? -1 : 1;
        targets.add(Math.min(next.length - 1, Math.max(0, targetIdx + dir)));
      }
      nodes[cur[i]].connections = Array.from(targets).map((t) => next[t]);
    }
    // ogni nodo del layer successivo deve avere almeno un arco entrante
    const reached = new Set<string>();
    for (const id of cur) for (const c of nodes[id].connections) reached.add(c);
    for (let j = 0; j < next.length; j++) {
      if (!reached.has(next[j])) {
        const rel = next.length === 1 ? 0.5 : j / (next.length - 1);
        const srcId = cur[Math.round(rel * (cur.length - 1))];
        if (!nodes[srcId].connections.includes(next[j])) nodes[srcId].connections.push(next[j]);
      }
    }
  }

  // --- 5. Terreno (ordine topologico: layer per layer, compatibile coi parent) ---
  const parents: Record<string, string[]> = {};
  for (const id in nodes) parents[id] = [];
  for (const id in nodes) for (const c of nodes[id].connections) parents[c].push(id);

  for (let d = 0; d < depth; d++) {
    for (const id of layers[d]) {
      const node = nodes[id];
      if (node.isTerminal) { node.terrain = 'terminal'; continue; }
      if (d === 0) { node.terrain = palette[0]; continue; }
      if (node.isLandmark) { node.terrain = palette[palette.length - 1]; continue; }
      const compatible = new Set<TerrainType>();
      for (const p of parents[id]) {
        for (const t of (TERRAIN_ADJACENCY[nodes[p].terrain] ?? [])) {
          if (palette.includes(t)) compatible.add(t);
        }
      }
      const arr = Array.from(compatible);
      node.terrain = arr.length > 0 ? pick(rng, arr) : pick(rng, palette);
    }
  }

  // --- 6. Testi ---
  for (const id in nodes) {
    const node = nodes[id];
    const textDef = subAreaDef.zoneTexts[node.terrain];
    node.title = textDef?.title ?? 'Zona Sconosciuta';
    const variants = textDef?.variants ?? ['Ti trovi in una zona.', 'Procedi avanti.', 'Il sentiero continua.'];
    node.description = pick(rng, variants);
    const longDescs = textDef?.longDesc;
    node.longDescription = longDescs ? pick(rng, longDescs) : generateLongDescription(node.terrain, node.title, rng, node.position);
  }

  // --- 7. Eventi (con scaling di tensione) ---
  const runFlags = {
    spawnedTrapChest: checkpoint?.spawnedTrapChest ?? false,
    spawnedQuestNpc: checkpoint?.spawnedQuestNpc ?? false,
    spawnedDistressNpc: checkpoint?.spawnedDistressNpc ?? false,
  };
  for (let d = 0; d < depth; d++) {
    for (const id of layers[d]) {
      const node = nodes[id];
      if (node.isTerminal) { node.events = [{ type: 'terminal', resolved: false, payload: {} }]; continue; }
      if (node.isLandmark) {
        const ev = makeEnding(rng);
        node.ending = ev.payload.ending as EndingType;
        node.events = [ev];
        continue;
      }
      // tensione: 0 prima del terminale, cresce dopo fino a 1 al finale
      const danger = d <= terminalLayer ? 0 : (d - terminalLayer) / Math.max(1, lastLayer - terminalLayer);
      node.events = rollZoneEvents(rng, node, runFlags, danger);
    }
  }

  // --- 8. Stato iniziale / ripristino checkpoint ---
  const entryId = layers[0][0];
  let currentNodeId = entryId;
  const visitedNodeIds: string[] = [entryId];

  if (checkpoint?.currentNodeId && nodes[checkpoint.currentNodeId]) {
    currentNodeId = checkpoint.currentNodeId;
    visitedNodeIds.length = 0;
    for (const vid of checkpoint.visitedNodeIds ?? []) {
      if (!nodes[vid]) continue;
      visitedNodeIds.push(vid);
      if (vid !== currentNodeId) {
        nodes[vid].cleared = true;
        nodes[vid].revealed = true;
        for (const ev of nodes[vid].events) ev.resolved = true;
      }
    }
    if (!visitedNodeIds.includes(currentNodeId)) visitedNodeIds.push(currentNodeId);
  }

  revealNeighbors(nodes, currentNodeId);

  return {
    subAreaId: subAreaDef.id, seed: actualSeed, depth, nodes, layers,
    currentNodeId, visitedNodeIds,
    spawnedTrapChest: runFlags.spawnedTrapChest,
    spawnedQuestNpc: runFlags.spawnedQuestNpc,
    spawnedDistressNpc: runFlags.spawnedDistressNpc,
    usedTerminal: false, tempPartyMemberId: null,
    stats: { nodesVisited: visitedNodeIds.length, eventsResolved: 0, itemsFound: 0, skillChecksPassed: 0, skillChecksFailed: 0, loreFound: 0 },
  };
}

// === FOG: rivela un nodo e i suoi vicini diretti ===
export function revealNeighbors(nodes: Record<string, ZoneNode>, nodeId: string): void {
  const node = nodes[nodeId];
  if (!node) return;
  node.revealed = true;
  for (const c of node.connections) if (nodes[c]) nodes[c].revealed = true;
}

// === FINALE: sceglie l'esito (Fase C gestisce la UI/combat) ===
function makeEnding(rng: () => number): ZoneEvent {
  const r = rng();
  let ending: EndingType;
  if (r < 0.15) ending = 'boss';        // raro, richiede combat (placeholder)
  else if (r < 0.40) ending = 'treasure';
  else if (r < 0.65) ending = 'horde';  // richiede combat (placeholder)
  else ending = 'nothing';
  return { type: 'ending', resolved: false, payload: { ending } };
}

// === ROLLING EVENTI (con danger scaling + discovery estesi) ===
// Versione finale Fase B: slot combattimento invariato, discovery arricchito con
// skillCheck/narrative/gathering/shrine/vista. Garanzia min 2 / max 4 invariata.
function rollZoneEvents(
  rng: () => number,
  node: ZoneNode,
  runFlags: { spawnedTrapChest: boolean; spawnedQuestNpc: boolean; spawnedDistressNpc: boolean },
  danger: number, // 0..1
): ZoneEvent[] {
  const events: ZoneEvent[] = [];
  const earlyNode = node.position <= 3;
  const pkChance = 0.10 + danger * 0.30;     // 10% (sicuro) → 40% (vicino al finale)
  const eliteChance = 0.20 + danger * 0.40;  // 20% → 60%
  const mobMax = earlyNode ? 2 : Math.round(4 + danger * 2); // 4..6

  // --- SLOT COMBATTIMENTO (invariato) ---
  if (!runFlags.spawnedTrapChest && rng() < 0.05) {
    runFlags.spawnedTrapChest = true;
    events.push(makeTrapChest());
  } else if (!runFlags.spawnedDistressNpc && rng() < 0.10) {
    runFlags.spawnedDistressNpc = true;
    events.push(makeDistressNpc(rng));
  } else if (rng() < pkChance) {
    events.push(makePlayerKiller(rngInt(rng, 3, 5)));
  } else if (rng() < 0.60) {
    events.push(makeCombat(rngInt(rng, 1, mobMax), rng() < eliteChance));
  }

  // --- DISCOVERY (indipendenti, più varietà) ---
  if (rng() < 0.18) events.push(makeChest(rng));
  if (rng() < 0.16) events.push(makeSkillCheck(rng, danger, node.position));
  if (rng() < 0.14) events.push(makeNarrative(rng));
  if (rng() < 0.12) events.push(makeGathering(rng));
  if (rng() < 0.07) events.push(makeShrine(rng));
  if (rng() < 0.06 && (node.terrain === 'highland' || node.terrain === 'hills')) events.push(makeVista(rng));
  if (!runFlags.spawnedQuestNpc && rng() < 0.18) {
    runFlags.spawnedQuestNpc = true;
    events.push(makeQuestNpc());
  }

  // --- GARANZIA min 2, max 4 (riempi con chest o combat base) ---
  while (events.length < 2) {
    if (rng() < 0.5) events.push(makeChest(rng));
    else events.push(makeCombat(rngInt(rng, 1, mobMax), false));
  }
  if (events.length > 4) events.splice(4);
  return events;
}

// === FACTORY EVENTI ===

// Forziere con micro-scelta (trappola deterministica, rilevabile con DEX)
function makeChest(rng: () => number): ZoneEvent {
  const isEmpty = rng() < 0.25;
  if (isEmpty) return { type: 'chest', resolved: false, payload: { empty: true, trapped: false } };
  const itemId = pick(rng, LOOT_TABLES.chest_pool);
  const trapped = rng() < 0.20; // 20% nasconde una trappola (rilevabile con DEX)
  return { type: 'chest', resolved: false, payload: { itemId, empty: false, trapped } };
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

// FIX determinismo: ora usa rng (prima usava Math.random, bug per checkpoint)
function makeDistressNpc(rng: () => number): ZoneEvent {
  const wantsToJoin = rng() < 0.05; // deterministico, coerente coi checkpoint
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

// === FACTORY EVENTI FASE B ===

// SKILL CHECK ambientale: stat + difficoltà decisi in generazione (deterministico);
// la prova viene risolta a runtime nella UI (Fase B.5), NON in generazione.
function makeSkillCheck(rng: () => number, danger: number, position: number): ZoneEvent {
  const stats: ExploreStatKey[] = ['STR', 'DEX', 'AGI', 'VIT', 'RES', 'MEN', 'INT'];
  const stat = pick(rng, stats);
  const prompts = SKILL_CHECK_PROMPTS[stat];
  const promptIdx = Math.floor(rng() * prompts.length);
  // difficoltà sulla scala delle 7 statistiche (~1..90): cresce con posizione e tensione (tunable)
  const difficulty = 10 + Math.round(position) + Math.round(danger * 8);
  return {
    type: 'skillCheck',
    resolved: false,
    payload: { stat, difficulty, promptIdx, rewardPool: danger > 0.5 ? 'rare' : 'uncommon' },
  };
}

function makeNarrative(rng: () => number): ZoneEvent {
  const scene = pick(rng, NARRATIVE_SCENES);
  return { type: 'narrative', resolved: false, payload: { sceneId: scene.id } };
}

function makeGathering(rng: () => number): ZoneEvent {
  const resources = ['herb', 'mineral', 'wood'] as const;
  const resourceType = pick(rng, resources);
  const amount = rngInt(rng, 1, 3);
  return { type: 'gathering', resolved: false, payload: { resourceType, amount } };
  // TODO(crafting-system): le risorse alimenteranno il crafting futuro
}

function makeShrine(rng: () => number): ZoneEvent {
  // buff placeholder + frammento di lore
  const loreIds = ['altar-truth', 'windmill-origin', 'forest-heart'];
  return { type: 'shrine', resolved: false, payload: { loreId: pick(rng, loreIds), buff: 'placeholder' } };
  // TODO(combat-system): il buff sarà un bonus temporaneo reale
}

function makeVista(rng: () => number): ZoneEvent {
  const loreIds = ['altar-truth', 'windmill-origin', 'forest-heart'];
  return { type: 'vista', resolved: false, payload: { loreId: pick(rng, loreIds), revealAhead: true } };
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

// === GENERATORE DESCRIZIONE LUNGA (~200 parole) ===
// Genera una descrizione atmosferica di ~200 parole basata sul terreno E sulla posizione.
// Ogni zona (8 per sotto-area) ha un intro unico che la distingue dalle altre,
// combinato con la descrizione del terreno specifico.

// 8 intro unici, uno per ogni posizione (1-8) nella sotto-area
const POSITION_INTROS: string[] = [
  // Position 1 — Inizio
  "I tuoi primi passi in questa sotto-area. Lo sguardo corre tra i dettagli del paesaggio, mentre la mano stringe l'elsa della spada. Tutto è nuovo, tutto è da scoprire. ",
  // Position 2 — Avanzamento
  "Procedi più a fondo, lasciandoti alle spalle il punto di partenza. Il sentiero si fa meno battuto, e l'aria porta odori nuovi. Senti di essere entrato in un territorio meno esplorato. ",
  // Position 3 — Zona intermedia
  "Sei ormai nel cuore della prima metà di questa zona. Il paesaggio ti circonda, familiare eppure carico di dettagli che prima avevi trascurato. Ogni passo ti porta più lontano dalla sicurezza. ",
  // Position 4 — Pre-terminale
  "Avanzi verso il centro della sotto-area. La luce cambia, e in lontananza intravedi un bagliore azzurro che potrebbe essere un terminale. La tensione sale: sai di essere vicino a un punto di svolta. ",
  // Position 5 — Terminale (gestito separatamente, ma tenuto per coerenza)
  "Il terminale di esplorazione si erge davanti a te. ",
  // Position 6 — Post-terminale
  "Hai superato il terminale, e il paesaggio cambia nuovamente. Le ombre si allungano, e l'aria si fa più densa. Senti di essere entrato in una zona meno ospitale, dove la prudenza è fondamentale. ",
  // Position 7 — Avvicinamento finale
  "Ti avvicini alla fine della sotto-area. Ogni passo è pesante, carico dell'esperienza accumulata. Il paesaggio sembra anticipare la conclusione del tuo viaggio, ma anche nascondere le sfide maggiori. ",
  // Position 8 — Zona finale
  "Sei nell'ultima zona di questa sotto-area. Davanti a te si estende il confine, oltre il quale il territorio cambia del tutto. È il momento di raccogliere le forze per l'ultima sfida. ",
];

function generateLongDescription(terrain: TerrainType, title: string, rng: () => number, position: number = 1): string {
  const terrainPhrases: Record<TerrainType, string[]> = {
    plains: [
      `La pianura si stende davanti a te come un mare d'erba che ondegga dolcemente al vento. Il sole di Aincrad brilla alto nel cielo, tingendo d'oro ogni filo d'erba. In lontananza puoi scorgere le mura della Città degli Inizi, mentre davanti a te il sentiero si perde nell'orizzonte. L'aria è fresca e pulita, carica del profumo della terra bagnata e dei fiori selvatici. Piccoli insetti ronzano tra l'erba alta, e di tanto in tanto un uccello attraversa il cielo azzurro. È un luogo sereno, quasi troppo per un mondo come Aincrad dove la morte è sempre in agguato. Mentre cammini, i tuoi stivali affondano nel terreno soffice, lasciando impronte che il vento cancella rapidamente. Ti guardi intorno, vigile: anche nelle zone più tranquille, un mostro potrebbe nascondersi tra l'erba alta. La spada al tuo fianco è un peso rassicurante, un promemoria che qui nulla è davvero sicuro. Procedi avanti, un passo dopo l'altro, verso l'ignoto che ti attende oltre la prossima collina.`,
    ],
    hills: [
      `Le colline si susseguono davanti a te come onde verdi che si alzano e si abbassano con un ritmo tranquillo. Ogni cima ti regala una vista nuova: a est la sagoma lontana della città, a ovest le montagne che segnano il confine del piano. Il vento qui è più forte, costante, e ti scompiglia i capelli mentre procedi lungo il sentiero che serpeggia tra i pendii. L'erba è più bassa sulle colline, schiacciata dal vento, ma in compenso i fiori selvatici punteggiano i pendii di rosso, giallo e viola. Senti il canto di grilli e cicale nascosti tra la vegetazione. Il terreno è irregolare, a tratti roccioso, e devi fare attenzione a dove metti i piedi. Ogni tanto trovi un sasso piatto, magari un vecchio cippo di confine, consumato dal tempo. Le colline di Aincrad nascondono segreti: forzieri dimenticati, mostri in agguato, e a volte NPC che hanno bisogno di aiuto. Continui a salire, sentendo i muscoli delle gambe che lavorano, mentre il cielo sembra farsi sempre più vicino.`,
    ],
    river: [
      `Il fiume scorre davanti a te con un mormorio costante, le acque limpide che riflettono il cielo azzurro di Aincrad. Ti fermi un momento sulla rina, osservando i pesci guizzare sotto la superficie. L'acqua è fredda al tatto, un sollievo dopo la camminata. Segui il corso del fiume, che serpeggia tra rocce lisce e rive erbose. Canne di bambù crescono lungo le sponde, e le loro foglie frusciano nel vento come sussurri. L'aria qui è più umida, più densa, e sa di muschio e terra bagnata. Sull'altra sponda vedi tracce di animali: impronte fresche nella fanghiglia, erba calpestata. Forse un cinghiale, o qualcosa di peggio. Il fiume è un luogo di incontro: gli avventurieri spesso si fermano qui per riposare, ma anche i mostri vengono a bere. Tieni la mano sull'elsa della spada mentre procedi. Il sentiero segue la curva del fiume, e ogni ansa nasconde qualcosa di nuovo: un masso coperto di muschio, un albero caduto che fa da ponte, un piccolo estuario dove l'acqua si allarga in una pozza tranquilla.`,
    ],
    sparse_wood: [
      `Il bosco si apre davanti a te, rado ma sufficiente a filtrare la luce del sole in raggi dorati che danzano sul terreno. I tronchi sono sottili, giovani, e tra loro puoi ancora scorgere il cielo. L'aria sa di resina e foglie umide, e il canto degli uccelli è più intimo, più vicino. Cammini tra gli alberi seguendo un sentiero appena visibile, segnato da pietre disposte a distanze irregolari. Il sottobosco è sorprendentemente ricco: funghi dai colori vivaci crescono alla base dei tronchi, e piccoli fiori bianchi tappezzano le radici esposte. Ogni tanto un ramo scricchiola, e ti volti di scatto, ma è solo il vento. Oppure no. Nei boschi di Aincrad, la differenza tra un ramo che scricchiola e un mostro che si avvicina può essere questione di vita o di morte. Procedi con cautela, i passi attutiti dal tappeto di foglie secche. La luce diminuisce leggermente man mano che il bosco si infittisce, e le ombre si allungano tra i tronchi. Tendi l'orecchio: un fruscio, un respiro, un passo che non è il tuo. Stringi la spada e continui.`,
    ],
    ruins: [
      `Le rovine emergono dal terreno come ossa di un passato dimenticato. Muri di pietra consumati dal tempo, archi spezzati che non portano più da nessuna parte, fondamenta che la natura ha cominciato a reclamare con edera e muschio. Cammini tra i resti di quella che doveva essere una struttura imponente, forse un tempio o una fortezza. Le pietre sono fredde al tatto, e su alcune puoi ancora vedere incisioni sbiadite: simboli che non riconosci, lettere in una lingua che non sai leggere. L'aria tra le rovine è pesante, carica di un silenzio che sembra voler dire qualcosa. Un rubinetto arrugginito, un frammento di ceramica, un pezzo di metallo contorto: ogni reperto racconta una storia che nessuno ricorda più. Ti guardi intorno con rispetto, ma anche con prudenza: le rovine di Aincrad sono spesso rifugio per mostri e banditi. Le ombre tra i muri crollati sono profonde, e potrebbero nascondere qualsiasi cosa. Procedi con la spada sfoderata, gli occhi che scrutano ogni angolo, ogni fessura, ogni anfratto dove un nemico potrebbe tendere un'imboscata.`,
    ],
    camp: [
      `Il campo abbandonato si nasconde in una piccola radura, circondato da alberi che lo rendono invisibile da lontano. I resti di un fuoco da campo occupano il centro: cenere fredda, pietre annerite dal calore, e qualche ramo bruciato a metà. Attorno al fuoco, impronte confuse nella terra: qualcuno è stato qui, e non troppo tempo fa. Un paio di stivali logori giace accanto a un masso, insieme a una coperta lacera e a una borraccia vuota. Sembra che chiunque fosse qui sia fuggito in fretta, senza nemmeno raccogliere le proprie cose. Esamini il campo con attenzione: un coltello da cucina piantato in un tronco, una corda legata a un ramo, forse un essiccatore per carne. Niente armi, niente oggetti di valore: o li hanno portati via, o non ne avevano. L'atmosfera è inquietante. Il silenzio è rotto solo dal vento che fa sbattere la coperta. Prendi la borraccia: è vuota, ma pulita. Chiunque fosse, si prendeva cura delle proprie cose. Mentre lasci il campo, non puoi fare a meno di chiederti cosa li abbia spaventati tanto da fuggire senza voltarsi indietro.`,
    ],
    clearing: [
      `La radura si apre improvvisamente davanti a te, come se gli alberi si fossero ritirati per fare spazio a qualcosa. È un cerchio quasi perfetto di erba bassa e morbida, circondato da una corona di alberi che sembrano fare da guardia. La luce del sole cade qui senza ostacoli, creando un alone caldo e luminoso che contrasta con l'ombra del bosco circostante. Al centro della radura c'è un grande masso, coperto di muschio sulla cima, che sembra un altare naturale. Ti avvicini e vedi che qualcuno ha inciso qualcosa sulla roccia: un simbolo che riconosci, un simbolo che hai già visto da qualche parte. L'erba intorno al masso è calpestata, segno che non sei il primo a fermarsi qui. L'aria è immobile, quasi ferma, come se il tempo in questo punto scorresse più lentamente. È un luogo che invita alla sosta, alla riflessione. Ma anche all'attenzione: le radure di Aincrad sono punti di incontro, e non sempre gli incontri sono piacevoli. Ti siedi sul masso per un momento, godendoti la pace, con la spada a portata di mano e gli occhi che scrutano il limitare degli alberi.`,
    ],
    highland: [
      `L'altopiano ti accoglie con una folata di vento freddo che ti fa rabbrividire. Da quassù la vista è spettacolare: le Grandi Pianure si stendono sotto di te come una mappa vivente, con la Città degli Inizi che brilla in lontananza e i fiumi che scorrono come nastri d'argento. Il terreno è roccioso, coperto di erba stenta e licheni che crescono ostinati tra le pietre. Poche piante resistono quassù, abbarbicate tra le rocce come sentinelle ostinate. Il vento è costante, a volte forte abbastanza da farti barcollare, e porta con sé l'odore della pietra e della terra lontana. Cammini lungo il bordo dell'altopiano, dove il terreno si lascia scivolare verso il pendio, facendo attenzione a non avvicinarti troppo al vuoto. Sotto di te, il panorama cambia con ogni passo: una valle nascosta, un corso d'acqua scintillante, una macchia di bosco che da quassù sembra un giocattolo. L'altopiano è un luogo esposto, dove non ci sono ripari: se un mostro ti attacca qui, non hai dove nasconderti. Ma la vista che ti regala vale il rischio: per un momento ti senti padrone di tutto Aincrad.`,
    ],
    terminal: [
      `Il terminale di esplorazione si erge davanti a te come un pilastro di luce, un cristallo azzurro che pulsa delicatamente emanando un bagliore rassicurante. La sua superficie è liscia e fredda al tatto, e quando la sfiori senti un formicolio: è il sistema di Aincrad che ti riconosce. Attorno al terminale, il terreno è stato ripulito: erba tagliata, pietre disposte in cerchio, e alcuni tronchi scavati che fungono da panche. Qualcuno ha reso questo posto un rifugio, un punto sicuro nel mezzo dell'esplorazione. Il cristallo emette un suono basso e continuo, come un cuore che batte, e la sua luce cambia intensità a intervalli regolari. Ti siedi su una delle panche e senti la tensione abbandonare i muscoli. Qui sei al sicuro: nessun mostro può avvicinarsi al terminale. È un momento di tregua, un respiro prima di riprendere il cammino. Osservi il cristallo: al suo interno vedi forme che si muovono, come pesci in un acquario, o forse come ricordi che fluttuano. Il terminale offre riposo, riparazione, e se lo desideri, può registrare la tua posizione per permetterti di tornare qui in futuro.`,
    ],
  };

  const phrases = terrainPhrases[terrain] ?? terrainPhrases.plains;
  const terrainDesc = pick(rng, phrases);

  // Per il terminale, usa solo la descrizione del terminale (l'intro è ridondante)
  if (terrain === 'terminal') {
    return terrainDesc;
  }

  // Combina l'intro unico (basato su posizione) con la descrizione del terreno
  // Questo garantisce che ogni zona abbia un testo diverso, anche se il terreno si ripete
  const intro = POSITION_INTROS[position - 1] ?? POSITION_INTROS[0];
  return intro + terrainDesc;
}

// Re-export per comodità (usato da Fase B)
export type { ExploreStatKey };
