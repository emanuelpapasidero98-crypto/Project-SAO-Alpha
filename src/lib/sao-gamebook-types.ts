// === SAO Game Book Types ===
// Sistema di esplorazione stile libro game: il giocatore progredisce
// attraverso scelte narrative invece di una mappa a grafo.

export interface GameBookChoice {
  id: string;
  label: string;
  /** Effetto della scelta (placeholder per futuro sistema eventi) */
  outcome?: 'progress' | 'combat' | 'item' | 'rest' | 'back' | 'custom';
  /** Testo descrittivo che appare dopo aver scelto */
  resultText?: string;
  /** Se true, la scelta è disponibile solo se si hanno determinati requisiti */
  locked?: boolean;
  lockReason?: string;
}

export interface GameBookPage {
  id: string;
  /** URL immagine (placeholder per ora) */
  image?: string;
  /** Titolo della scena */
  title: string;
  /** Descrizione lunga mostrata al giocatore (stile Matrix) */
  description: string;
  /** Scelte disponibili al giocatore */
  choices: GameBookChoice[];
  /** Tipo di zona (per coerenza con il sistema esplorazione) */
  zoneType?: 'entry' | 'exploration' | 'terminal' | 'combat' | 'discovery' | 'finale';
}

export interface GameBookState {
  subAreaId: string;
  subAreaName: string;
  currentPageId: string;
  visitedPages: string[];
  pages: Record<string, GameBookPage>;
  stats: {
    pagesVisited: number;
    choicesMade: number;
    itemsFound: number;
    combatsWon: number;
  };
}

// === Pagine iniziali placeholder (saranno sostituite con contenuti reali) ===
export function createInitialGameBookState(subAreaId: string, subAreaName: string): GameBookState {
  const entryPage: GameBookPage = {
    id: 'entry',
    title: 'Inizio Esplorazione',
    description: `Ti addentri in ${subAreaName}. L'aria è densa, carica di profumi sconosciuti. Davanti a te il sentiero si biforca: a sinistra un sentiero ombroso che s'infitta tra gli alberi, a destra una radura soleggiata che sembra condurre verso una struttura in lontananza.\n\nCosa vuoi fare?`,
    zoneType: 'entry',
    choices: [
      { id: 'go_left', label: '▶ Prendi il sentiero ombroso', outcome: 'progress', resultText: 'Ti addentri nel folto degli alberi...' },
      { id: 'go_right', label: '▶ Vai verso la radura', outcome: 'progress', resultText: 'Cammini verso la struttura...' },
      { id: 'observe', label: '▶ Osserva i dintorni', outcome: 'custom', resultText: 'Guardi attentamente intorno a te...' },
    ],
  };

  const leftPage: GameBookPage = {
    id: 'go_left',
    title: 'Sentiero Ombroso',
    description: `Gli alberi si chiudono sopra di te, filtrando la luce in raggi dorati. Il sentiero è stretto e coperto di foglie secche che scricchiolano ad ogni passo. Senti un fruscio tra i cespugli alla tua destra.\n\nUn forziere parzialmente nascosto tra le radici di un albero attira la tua attenzione.`,
    zoneType: 'discovery',
    choices: [
      { id: 'open_chest', label: '▶ Apri il forziere', outcome: 'item', resultText: 'Trovi un oggetto nel forziere!' },
      { id: 'investigate_noise', label: '▶ Indaga il fruscio', outcome: 'combat', resultText: 'Un nemico salta fuori dai cespugli!' },
      { id: 'continue_path', label: '▶ Continua sul sentiero', outcome: 'progress', resultText: 'Procedi oltre nel bosco...' },
      { id: 'go_back_entry', label: '◀ Torna all\'inizio', outcome: 'back' },
    ],
  };

  const rightPage: GameBookPage = {
    id: 'go_right',
    title: 'Radura Soleggiata',
    description: `La radura è aperta e luminosa. Al centro sorge una struttura di pietra antica, semi-diroccata. Un terminale di esplorazione brilla accanto all'ingresso.\n\nUn gruppo di figure si muove in lontananza. Potrebbero essere altri avventurieri... o qualcosa di peggio.`,
    zoneType: 'terminal',
    choices: [
      { id: 'use_terminal', label: '▶ Usa il terminale', outcome: 'rest', resultText: 'Il terminale pulsa di luce azzurra.' },
      { id: 'approach_figures', label: '▶ Avvicinati alle figure', outcome: 'combat', resultText: 'Le figure si rivelano ostili!' },
      { id: 'explore_ruins', label: '▶ Esplora le rovine', outcome: 'progress', resultText: 'Entri nella struttura di pietra...' },
      { id: 'go_back_entry', label: '◀ Torna all\'inizio', outcome: 'back' },
    ],
  };

  const pages: Record<string, GameBookPage> = {
    entry: entryPage,
    go_left: leftPage,
    go_right: rightPage,
  };

  // Aggiungi collegamenti "back"
  pages['go_left'].choices.find(c => c.id === 'go_back_entry')!.resultText = 'Torni sui tuoi passi.';
  pages['go_right'].choices.find(c => c.id === 'go_back_entry')!.resultText = 'Torni sui tuoi passi.';

  return {
    subAreaId,
    subAreaName,
    currentPageId: 'entry',
    visitedPages: ['entry'],
    pages,
    stats: { pagesVisited: 1, choicesMade: 0, itemsFound: 0, combatsWon: 0 },
  };
}
