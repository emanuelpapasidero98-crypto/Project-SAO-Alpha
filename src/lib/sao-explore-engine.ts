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
    // Descrizione lunga (~200 parole) — usa longDesc se disponibile, altrimenti genera
    const longDescs = textDef?.longDesc;
    const longDescription = longDescs ? pick(rng, longDescs) : generateLongDescription(terrain, title, rng);

    zones.push({
      id: `${subAreaDef.id}-zone-${i}`,
      index: i,
      position,
      terrain,
      title,
      description,
      longDescription,
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

  // 50% di probabilità di aggiungere un terzo evento
  if (events.length === 2 && rng() < 0.5) {
    if (rng() < 0.5) {
      events.push(makeChest(rng));
    } else {
      const max = firstThree ? 2 : 5;
      events.push(makeCombat(rngInt(rng, 1, max), false));
    }
  }

  // 30% di probabilità di aggiungere un quarto evento (se siamo a 3)
  if (events.length === 3 && rng() < 0.3) {
    if (rng() < 0.5) {
      events.push(makeChest(rng));
    } else {
      const max = firstThree ? 2 : 5;
      events.push(makeCombat(rngInt(rng, 1, max), false));
    }
  }

  // Safety: mai più di 4
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

// === GENERATORE DESCRIZIONE LUNGA (~200 parole) ===
// Genera una descrizione atmosferica di ~200 parole basata sul terreno.
// Le descrizioni sono composte da frasi che vengono combinate casualmente.
function generateLongDescription(terrain: TerrainType, title: string, rng: () => number): string {
  const terrainPhrases: Record<TerrainType, string[]> = {
    plains: [
      `La pianura si stende davanti a te come un mare d'erba che ondegga dolcemente al vento. Il sole di Aincrad brilla alto nel cielo, tingendo d'oro ogni filo d'erba. In lontananza puoi scorgere le mura della Città degli Inizi, mentre davanti a te il sentiero si perde nell'orizzonte. L'aria è fresca e pulita, carica del profumo della terra bagnata e dei fiori selvatici. Piccoli insetti ronzano tra l'erba alta, e di tanto in tanto un uccello attraversa il cielo azzurro. È un luogo sereno, quasi troppo per un mondo come Aincrad dove la morte è sempre in agguato. Mentre cammini, i tuoi stivali affondano nel terreno soffice, lasciando impronte che il vento cancella rapidamente. Ti guardi intorno, vigile: anche nelle zone più tranquille, un mostro potrebbe nascondersi tra l'erba alta. La spada al tuo fianco è un peso rassicurante, un promemoria che qui nulla è davvero sicuro. Procedi avanti, un passo dopo l'altro, verso l'ignoto che ti attende oltre la prossima collina.`,
    ],
    hills: [
      `Le colline si susseguono davanti a te come onde verdi che si alzano e si abbassano con un ritmo tranquillo. Ogni cima ti regala una vista nuova: a est la sagoma lontana della città, a ovest le montagne che segnano il confine del piano. Il vento qui è più forte, costante, e ti scompiglia i capelli mentre procedi lungo il sentiero che serpeggia tra i pendii. L'erba è più bassa sulle colline, schiacciata dal vento, ma in compenso i fiori selvatici punteggiano i pendii di rosso, giallo e viola. Senti il canto di grilli e cicale nascosti tra la vegetazione. Il terreno è irregolare, a tratti roccioso, e devi fare attenzione a dove metti i piedi. Ogni tanto trovi un sasso piatto, magari un vecchio cippo di confine, consumato dal tempo. Le colline di Aincrad nascondono segreti: forzieri dimenticati, mostri in agguato, e a volte NPC che hanno bisogno di aiuto. Continui a salire, sentendo i muscoli delle gambe che lavorano, mentre il cielo sembra farsi sempre più vicino.`,
    ],
    river: [
      `Il fiume scorre davanti a te con un mormorio costante, le acque limpide che riflettono il cielo azzurro di Aincrad. Ti fermi un momento sulla riva, osservando i pesci guizzare sotto la superficie. L'acqua è fredda al tatto, un sollievo dopo la camminata. Segui il corso del fiume, che serpeggia tra rocce lisce e rive erbose. Canne di bambù crescono lungo le sponde, e le loro foglie frusciano nel vento come sussurri. L'aria qui è più umida, più densa, e sa di muschio e terra bagnata. Sull'altra sponda vedi tracce di animali: impronte fresche nella fanghiglia, erba calpestata. Forse un cinghiale, o qualcosa di peggio. Il fiume è un luogo di incontro: gli avventurieri spesso si fermano qui per riposare, ma anche i mostri vengono a bere. Tieni la mano sull'elsa della spada mentre procedi. Il sentiero segue la curva del fiume, e ogniansa nasconde qualcosa di nuovo: un masso coperto di muschi, un albero caduto che fa da ponte, un piccolo estuario dove l'acqua si allarga in una pozza tranquilla.`,
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
      `L'altopiano ti accoglie con una folata di vento freddo che ti fa rabbrividire. Da quassù la vista è spettacolare: le Grandi Pianure si stendono sotto di te come una mappa vivente, con la Città degli Inizi che brilla in lontananza e i fiumi che scorrono come nastri d'argento. Il terreno è roccioso, coperto di erba stenta e licheni che crescono ostinati tra le pietre. Poche piote di terra resistono quassù, abbarbicate tra le rocce come sentinelle ostinate. Il vento è costante, a volte forte abbastanza da farti barcollare, e porta con sé l'odore della pietra e della terra lontana. Cammini lungo il bordo dell'altopiano, dove il terreno si lascia scivolare verso il pendio, facendo attenzione a non avvicinarti troppo al vuoto. Sotto di te, il panorama cambia con ogni passo: una valle nascosta, un corso d'acqua scintillante, una macchia di bosco che da quassù sembra un giocattolo. L'altopiano è un luogo esposto, dove non ci sono ripari: se un mostro ti attacca qui, non hai dove nasconderti. Ma la vista che ti regala vale il rischio: per un momento ti senti padrone di tutto Aincrad.`,
    ],
    terminal: [
      `Il terminale di esplorazione si erge davanti a te come un pilastro di luce, un cristallo azzurro che pulsa delicatamente emanando un bagliore rassicurante. La sua superficie è liscia e fredda al tatto, e quando la sfiori senti un formicolio: è il sistema di Aincrad che ti riconosce. Attorno al terminale, il terreno è stato ripulito: erba tagliata, pietre disposte in cerchio, e alcuni tronchi scavati che fungono da panche. Qualcuno ha reso questo posto un rifugio, un punto sicuro nel mezzo dell'esplorazione. Il cristallo emette un suono basso e continuo, come un cuore che batte, e la sua luce cambia intensità a intervalli regolari. Ti siedi su una delle panche e senti la tensione abbandonare i muscoli. Qui sei al sicuro: nessun mostro può avvicinarsi al terminale. È un momento di tregua, un respiro prima di riprendere il cammino. Osservi il cristallo: al suo interno vedi forme che si muovono, come pesci in un acquario, o forse come ricordi che fluttuano. Il terminale offre riposo, riparazione, e se lo desideri, può registrare la tua posizione per permetterti di tornare qui in futuro.`,
    ],
  };

  const phrases = terrainPhrases[terrain] ?? terrainPhrases.plains;
  return pick(rng, phrases);
}
