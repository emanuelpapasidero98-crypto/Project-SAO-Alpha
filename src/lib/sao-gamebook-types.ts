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
  /** Requisito statistica: la scelta è bloccata se il giocatore non ha la stat richiesta */
  requiresStat?: { stat: string; value: number };
  /** Limite di utilizzo per esplorazione (es. "solo 1 volta", "solo 2 volte") */
  maxUses?: number;
  /** Se true, la scelta scompare dopo essere stata usata */
  oneTime?: boolean;
  /** Pagina di destinazione esplicita (soprattutto per outcome 'back').
   *  Se omessa con outcome 'back', torna a 'entry'. */
  targetPage?: string;
  /** Tiro di dado richiesto dalla scelta */
  diceRoll?: DiceRollConfig;
  /** Flag impostati a true quando la scelta viene selezionata */
  setsFlags?: string[];
  /** Flag azzerati a false quando la scelta viene selezionata (es. morte → perdi oggetti) */
  clearsFlags?: string[];
  /** Mostra la scelta SOLO se questo flag è true (utile per choice "vai alla libreria" dopo scoperta) */
  showWhenFlag?: string;
  /** Nascondi la scelta quando TUTTI questi flag sono true
   *  (es. esplora case diroccate sparisce quando tutti i D10 outcomes + secret_room sono completi) */
  hideWhenAllFlags?: string[];
  /** Se true, questa choice chiude l'esplorazione e SALVA i progressi.
   *  È l'unico modo per uscire dall'esplorazione senza perdere i progressi
   *  (oltre al futuro Cristallo del Teletrasporto).
   *  Usata per "Torna alla città degli Inizi" etc. */
  exitsExploration?: boolean;
}

export interface DiceRollConfig {
  /** Numero di facce del dado (es. 10 per D10) */
  sides: number;
  /** Mappa risultato → pagina di destinazione */
  outcomes: DiceRollOutcome[];
}

export interface DiceRollOutcome {
  /** Range inclusivo. Se parity è specificato, solo risultati di quella parità nel range contano. */
  min: number;
  max: number;
  /** Se specificato, filtra solo risultati pari ('even') o dispari ('odd') */
  parity?: 'even' | 'odd';
  /** Pagina di destinazione */
  targetPage: string;
  /** Flag impostati a true quando questo outcome viene ottenuto (per esaurimento D10) */
  setsFlags?: string[];
}

export interface ConditionalDescription {
  /** Tutti i flag elencati devono essere true nello state.flags */
  requiresFlags?: string[];
  /** Almeno uno dei flag deve essere true */
  anyOfFlags?: string[];
  /** Testo mostrato se la condizione è soddisfatta */
  description: string;
}

export interface GameBookPage {
  id: string;
  /** URL immagine (placeholder per ora) */
  image?: string;
  /** Titolo della scena */
  title: string;
  /** Descrizione lunga mostrata al giocatore (stile Matrix) — PRIMA VISITA */
  description: string;
  /** Scelte disponibili al giocatore */
  choices: GameBookChoice[];
  /** Tipo di zona (per coerenza con il sistema esplorazione) */
  zoneType?: 'entry' | 'exploration' | 'terminal' | 'combat' | 'discovery' | 'finale';
  /** Descrizione di default quando si ritorna in una pagina già visitata */
  revisitDescription?: string;
  /** Descrizioni condizionali (valutate in ordine; la prima che matcha vince).
   *  Se nessuna matcha, si usa revisitDescription, altrimenti description. */
  conditionalDescriptions?: ConditionalDescription[];
}

export interface GameBookState {
  subAreaId: string;
  subAreaName: string;
  currentPageId: string;
  visitedPages: string[];
  pages: Record<string, GameBookPage>;
  /** Conteggio utilizzi di ogni choice.id (per maxUses / oneTime) */
  choiceUses: Record<string, number>;
  /** Flag di stato dell'esplorazione (case esplorate, evento mulino risolto, ecc.) */
  flags: Record<string, boolean>;
  /** Numero di volte che ogni pagina è stata visitata (1 = prima visita, 2+ = revisit).
   *  Reset a ogni nuova esplorazione (createInitialGameBookState). */
  visitCount: Record<string, number>;
  stats: {
    pagesVisited: number;
    choicesMade: number;
    itemsFound: number;
    combatsWon: number;
  };
}

/** Restituisce la descrizione corretta per una pagina tenendo conto dei flag e del numero di visite.
 *
 *  Priorità:
 *    1. conditionalDescriptions (in ordine, se i flag matchano) — sempre attiva quando i flag matchano
 *    2. revisitDescription (SOLO se visitCount >= 2, cioè sei tornato in questa pagina)
 *    3. description (prima visita)
 */
export function resolvePageDescription(page: GameBookPage, state: GameBookState): string {
  // 1. conditionalDescriptions (valgono sempre quando i flag matchano)
  if (page.conditionalDescriptions) {
    for (const cond of page.conditionalDescriptions) {
      const reqOk = cond.requiresFlags ? cond.requiresFlags.every((f) => state.flags[f]) : true;
      const anyOk = cond.anyOfFlags ? cond.anyOfFlags.some((f) => state.flags[f]) : true;
      if (reqOk && anyOk) return cond.description;
    }
  }

  // 2. revisitDescription SOLO se questa è la 2a+ volta che si visita la pagina
  const visits = state.visitCount[page.id] ?? 1;
  if (visits >= 2 && page.revisitDescription) return page.revisitDescription;

  // 3. description originale (prima visita)
  return page.description;
}

// === Pagine Praterie (sotto-area: pianure-esteriori) ===
export function createInitialGameBookState(subAreaId: string, subAreaName: string): GameBookState {
  const pages: Record<string, GameBookPage> = {};

  // === PAGINA: ENTRY (Praterie) ===
  pages['entry'] = {
    id: 'entry',
    title: 'Praterie',
    zoneType: 'entry',
    description: `L'aria fresca ti riempie i polmoni, portando con sé il profumo di terra umida ed erba incontaminata. Sotto i tuoi stivali, ogni singolo stelo color smeraldo si piega con una resistenza fin troppo realistica, scricchiolando a ogni passo. È un'illusione perfetta, un oceano verde che si increspa a perdita d'occhio sotto le raffiche di vento, facendoti quasi dimenticare che ogni respiro e ogni sensazione tattile sono solo stringhe di codice. Eppure, basta alzare lo sguardo per ricordarsi della vera natura di questa prigione: il cielo non è infinito. Lassù, a schiacciare l'orizzonte in una morsa titanica, incombe la base metallica e rocciosa del secondo piano, sorretta al centro dall'imponente sagoma del Labirinto. Quell'enorme pilastro colossale si staglia contro la luce come una cicatrice scura, un promemoria silenzioso e costante dell'unica via d'uscita.

Alle tue spalle, la titanica ombra dei cancelli in pietra della Città degli Inizi domina ancora il paesaggio, rigurgitando echi di vita. Il brusio ansioso dei novizi si mescola al tintinnio metallico di armature appena equipaggiate; un gruppo di quattro giocatori ti supera a passo di marcia lungo la strada e uno di loro ti lancia un'occhiata fugace, cercando di capire chi tu sia prima di voltarsi e seguire il suo party. altri invece combattono dei semplici cinghiali blu per guadagnare punti esperienza preziosi per riuscire a salire di livello.

Davanti a te il mondo si dispiega in un richiamo all'esplorazione. Abbandonando la sicurezza della strada battuta verso est, l'erba si fa più alta e selvatica, cullata dal fruscio ritmico di gigantesche pale di legno dove una serie di imponenti mulini a vento macina instancabilmente. Seguendo invece il sentiero di terra chiara che punta a nord, la via si tuffa in un solido muro di tronchi secolari: è l'inizio del bosco che conduce al villaggio di Horunka, un intrico di foglie così denso da inghiottire la luce del sole e promettere un percorso insidioso. A ovest, infine, l'aria stessa vibra sotto l'eco di un rombo sordo; montagne dalle vette aspre squarciano la visuale, avvolte da banchi di foschia che tradiscono la presenza di maestose cascate celate tra i canyon. L'avventura è appena iniziata, e ogni direzione attende solo i tuoi passi.`,
    revisitDescription: `Ti ritrovi nella vasta prateria ai piedi della Città degli Inizi. Il cielo di Aincrad si stende sopra di te, sormontato dalla mole incombente del Labirinto che porta al secondo piano. L'erba smeraldo ondeggia al vento, scricchiolando sotto i tuoi stivali.

I cancelli di pietra della città continuano a vomitare echi di vita alle tue spalle: novizi ansiosi, gruppi di giocatori diretti a caccia di cinghiali blu, il rumore metallico di equipaggiamenti appena comprati. I sentieri si diramano davanti a te: la strada a est verso i mulini a vento, quella a nord verso il bosco di Horunka, e quella a ovest verso le montagne avvolte nella foschia.`,
    choices: [
      { id: 'combat_boars', label: 'Inizia un combattimento con i cinghiali blu', outcome: 'combat', resultText: 'Ti avvicini ai cinghiali blu che grufolano nella prateria, estrai la tua arma pronto al combattimento.' },
      { id: 'est_mulini', label: 'Prendi la strada verso Est che porta ai mulini', outcome: 'progress' },
      { id: 'nord_bosco', label: 'Prendi la strada verso Nord che porta al bosco', outcome: 'progress', resultText: 'TODO: Il bosco non è ancora implementato.' },
      { id: 'ovest_montagne', label: 'Prendi la strada verso Ovest che porta alle montagne', outcome: 'progress', resultText: 'TODO: Le montagne non sono ancora implementate.' },
      { id: 'back_city', label: 'Torna alla città degli Inizi', outcome: 'back', resultText: 'Decidi di tornare verso la Città degli Inizi.', exitsExploration: true },
    ],
  };

  // === PAGINA: EST - Mulini a Vento ===
  pages['est_mulini'] = {
    id: 'est_mulini',
    title: 'Zona dei Mulini a Vento',
    zoneType: 'exploration',
    description: `Mentre abbandoni la sicurezza del sentiero battuto, la terra compatta cede il passo a un'erba più alta e ribelle, che ti accarezza i polpacci a ogni passo. Alle tue spalle, i lampi colorati delle Sword Skill e le urla lontane dei gruppi in combattimento si affievoliscono dolcemente, cullandoti in un senso di inaspettata tranquillità. L'oceano verde della pianura si estende placido, interrotto solo dalle ombre fresche di qualche sparuto boschetto e da morbide colline. Più avanzi, più le sagome dei mulini a vento si ergono imponenti contro il cielo di Aincrad, accompagnate dai grugniti bassi e raschianti di un branco di cinghiali dal manto azzurrognolo che grufola lì vicino.

Tuttavia, quando la distanza si accorcia, l'illusione si spezza. I mulini non sono strutture isolate, ma i guardiani di un villaggio fantasma. Scheletri di case con i tetti sfondati giacciono in un silenzio irreale, circondati da orti ormai soffocati da rovi e malerbe. Zappe e falci giacciono abbandonate a terra, divorate da una ruggine che sembra essersi accanita su di esse per decenni. È un luogo morto, dimenticato dal tempo che entra in contrasto con il finto cielo azzurro e il manto verde che circonda tutto quanto, ma l'istinto ti suggerisce che tra quelle macerie fatiscenti potrebbe ancora celarsi qualcosa di prezioso. Avvicinarsi, però, richiede cautela: i cinghiali blu pattugliano le rovine con occhi ostili, raspando il terreno con gli zoccoli, pronti a caricare chiunque osi violare il loro territorio. Eppure, in mezzo a quella desolazione di legno marcio e pietra sgretolata, l'ingresso di uno dei grandi mulini a vento si staglia come un'eccezione: il portone è semiaperto, un varco buio e accessibile che sembra invitarti a entrare.`,
    conditionalDescriptions: [
      {
        requiresFlags: ['windmill_event_resolved', 'houses_explored'],
        description: `Ritorni nella zona dei mulini a vento. Il villaggio fantasma si stende davanti a te, immutato nella sua desolazione: case diroccate, orti soffocati dai rovi, attrezzi agricoli divorati dalla ruggine. Le pale dei mulini continuano il loro giro instancabile, scricchiolando nel vento. I cinghiali blu brontolano ancora tra le rovine.

Hai già esplorato a fondo le case diroccate — non c'è più nulla di utile da cercare lì dentro. Anche il mulino a vento in cui sei entrato è ormai vuoto, silenzioso.`,
      },
      {
        requiresFlags: ['windmill_event_resolved'],
        description: `Ritorni nella zona dei mulini a vento. Le pale continuano a girare instancabili, accompagnate dal coro di grugniti dei cinghiali blu. Il villaggio fantasma si stende davanti a te: case diroccate, orti soffocati, attrezzi abbandonati.

Il mulino in cui sei entrato ora è silenzioso e vuoto. Le case diroccate, invece, potrebbero ancora nascondere qualcosa di utile.`,
      },
      {
        requiresFlags: ['houses_explored'],
        description: `Ritorni nella zona dei mulini a vento. Il villaggio fantasma si stende davanti a te, immutato: case diroccate, orti soffocati, attrezzi arrugginiti. Le pale dei mulini continuano il loro giro monotono, scricchiolando nel vento. I cinghiali blu pattugliano ancora le rovine con i loro occhi ostili.

Hai già setacciato le case diroccate — non c'è più nulla da cercare lì dentro. Resta però il grande mulino a vento: il portone semiaperto continua a stagliarsi come un varco buio e invitante, ancora inesplorato.`,
      },
    ],
    revisitDescription: `Ritorni nella zona dei mulini a vento. Le pale continuano a girare instancabili, accompagnate dal coro di grugniti dei cinghiali blu. Il villaggio fantasma si stende davanti a te: case diroccate, orti soffocati dai rovi, attrezzi abbandonati divorati dalla ruggine. L'aria è immobile, sospesa in un silenzio irreale rotto solo dallo scricchiolio del legno delle pale.

Le case diroccate incombono come scheletri di pietra. Il grande mulino a vento, con il suo portone semiaperto, si staglia come un varco buio e invitante.`,
    choices: [
      {
        id: 'explore_houses',
        label: 'Esplora le case diroccate [50% possibilità di essere attaccato]',
        outcome: 'custom',
        targetPage: 'explore_houses',
        setsFlags: ['houses_explored'],
        // Sparisce solo quando tutti i D10 outcomes + secret_room sono completi
        hideWhenAllFlags: ['houses_d10_1', 'houses_d10_2_5', 'houses_d10_6_9', 'houses_d10_10', 'secret_room_completed'],
      },
      {
        id: 'attack_boars_mill',
        label: 'Attacca i cinghiali [Solo due volte ad esplorazione]',
        outcome: 'combat',
        maxUses: 2,
      },
      {
        // Prima volta: entra nel mulino (evento PK)
        id: 'enter_windmill',
        label: 'Entra nel mulino a vento',
        outcome: 'progress',
        targetPage: 'enter_windmill',
        // Visibile solo se l'evento NON è stato risolto
        hideWhenAllFlags: ['windmill_event_resolved'],
      },
      {
        // Dopo aver risolto l'evento: entra nel mulino vuoto
        id: 'enter_windmill_empty',
        label: 'Entra nel mulino a vento',
        outcome: 'progress',
        targetPage: 'windmill_empty',
        // Visibile solo se l'evento è stato risolto
        showWhenFlag: 'windmill_event_resolved',
      },
      {
        // Accesso diretto alla libreria scoperta nelle case diroccate
        // (visibile solo se bookcase_discovered e secret_room non completata)
        id: 'go_to_bookcase_from_mulini',
        label: 'Vai alla libreria nascosta nelle case diroccate',
        outcome: 'progress',
        targetPage: 'd10_bookcase',
        showWhenFlag: 'bookcase_discovered',
        hideWhenAllFlags: ['secret_room_completed'],
      },
      {
        id: 'back_entry',
        label: 'Torna alle Praterie',
        outcome: 'back',
        targetPage: 'entry',
      },
    ],
  };

  // === PAGINA: Esplora case diroccate ===
  pages['explore_houses'] = {
    id: 'explore_houses',
    title: 'Case Diroccate',
    zoneType: 'discovery',
    description: `La curiosità e la voglia di migliorare il tuo equipaggiamento ti spinge a esplorare questo villaggio dimenticato da chiunque, inizi a osservarne ogni anfratto, ad entrare in ogni casa diroccata spostando oggetti che per un giocatore non hanno alcun valore togliendo polvere e qualche piccolo insetto che ne ha fatto la sua casa di quel ciarpame.

Tira un D10 [Se esce come risultato 1 trova l'oggetto "ciottolo x1"; Se esce come risultato da 2 a 5 trova ferro grezzo x2; se esce da 6 a 9 trova kit di erbe essenziali; se esce 10 trovi una libreria molto pesante che nasconde un entrata, per spostarla serve avere Forza a 8]`,
    conditionalDescriptions: [
      {
        // Libreria scoperta ma secret room non completata
        requiresFlags: ['bookcase_discovered'],
        anyOfFlags: ['secret_room_completed'],
        description: `Ritorni tra le case diroccate del villaggio fantasma. Cammini tra le macerie, entri in ogni stanza, sposti vecchi mobili e controlli ogni angolo. Hai già trovato una libreria particolare che nasconde un'entrata segreta — puoi tornarci direttamente per esplorare il sotterraneo.

Tira un D10 per cercare altro materiale tra le macerie.`,
      },
      {
        requiresFlags: ['bookcase_discovered'],
        description: `Ritorni tra le case diroccate del villaggio fantasma. Cammini tra le macerie, entri in ogni stanza, sposti vecchi mobili e controlli ogni angolo. Hai già trovato una libreria particolare che nasconde un'entrata segreta — puoi tornarci direttamente per esplorare il sotterraneo.

Tira un D10 per cercare altro materiale tra le macerie.`,
      },
    ],
    revisitDescription: `Ritorni tra le case diroccate del villaggio fantasma. Cammini tra le macerie, entri in ogni stanza, sposti vecchi mobili e controlli ogni angolo.

Tira un D10 per cercare materiale tra le macerie.`,
    choices: [
      {
        id: 'roll_d10_houses',
        label: 'Tira il D10',
        outcome: 'custom',
        diceRoll: {
          sides: 10,
          outcomes: [
            { min: 1, max: 1, targetPage: 'd10_houses_ciottolo', setsFlags: ['houses_d10_1'] },
            { min: 2, max: 5, targetPage: 'd10_houses_ferro', setsFlags: ['houses_d10_2_5'] },
            { min: 6, max: 9, targetPage: 'd10_houses_erbe', setsFlags: ['houses_d10_6_9'] },
            { min: 10, max: 10, targetPage: 'd10_bookcase', setsFlags: ['houses_d10_10', 'bookcase_discovered'] },
          ],
        },
        // Sparisce quando tutti i 4 D10 outcomes sono stati ottenuti
        hideWhenAllFlags: ['houses_d10_1', 'houses_d10_2_5', 'houses_d10_6_9', 'houses_d10_10'],
      },
      {
        // Choice condizionale: appare solo se hai scoperto la libreria
        id: 'go_to_bookcase',
        label: 'Vai alla libreria che hai scoperto',
        outcome: 'progress',
        targetPage: 'd10_bookcase',
        showWhenFlag: 'bookcase_discovered',
        // Sparisce quando la secret room è completata
        hideWhenAllFlags: ['secret_room_completed'],
      },
      {
        id: 'back_est_mulini',
        label: 'Torna ai mulini',
        outcome: 'back',
        targetPage: 'est_mulini',
      },
    ],
  };

  // === PAGINE RISULTATO D10 (case diroccate) ===
  pages['d10_houses_ciottolo'] = {
    id: 'd10_houses_ciottolo',
    title: 'Trovato: Ciottolo',
    zoneType: 'discovery',
    description: `Frugando tra le macerie di una casa particolarmente fatiscente, le tue dita si chiudono su un piccolo oggetto freddo e liscio. Lo tiri fuori dalla polvere: è un semplice ciottolo di fiume, levigato dal tempo. In qualsiasi altro contesto lo ignoreresti, ma in questo mondo dove ogni oggetto può diventare un proiettile o un diversivo, lo riponi nella borsa. Chissà, potrebbe sempre tornare utile.

[OGGETTO OTTENUTO: Ciottolo x1]`,
    choices: [
      { id: 'back_est_mulini_from_ciottolo', label: 'Torna ai mulini', outcome: 'back', targetPage: 'est_mulini' },
    ],
  };

  pages['d10_houses_ferro'] = {
    id: 'd10_houses_ferro',
    title: 'Trovato: Ferro Grezzo',
    zoneType: 'discovery',
    description: `Spostando un vecchio mobile marcio, scopri un piccolo nascondiglio nel pavimento: due pezzi di ferro grezzo, freddi e pesanti tra le tue dita. Devono essere stati nascosti qui dai vecchi abitanti, o forse da qualche giocatore che non è mai tornato a recuperarli. Li infili nella borsa con un mezzo sorriso: il ferro grezzo è una risorsa di base per la forgia, sempre richiesta dai craftsmen.

[OGGETTO OTTENUTO: Ferro Grezzo x2]`,
    choices: [
      { id: 'back_est_mulini_from_ferro', label: 'Torna ai mulini', outcome: 'back', targetPage: 'est_mulini' },
    ],
  };

  pages['d10_houses_erbe'] = {
    id: 'd10_houses_erbe',
    title: 'Trovato: Kit di Erbe Essenziali',
    zoneType: 'discovery',
    description: `In una credenza semi-divorata dalla ruggine, scopri un piccolo involto di stoffa che conserva ancora un profumo erbaceo. Aprendo con cautela, rivela un kit di erbe essenziali: piccole foglie essiccate, radici polverizzate e fiori secchi, ordinatamente separati. Un oggetto prezioso per chiunque voglia preparare pozioni di cura o unguenti. Lo riponi con cura nella borsa.

[OGGETTO OTTENUTO: Kit di Erbe Essenziali x1]`,
    choices: [
      { id: 'back_est_mulini_from_erbe', label: 'Torna ai mulini', outcome: 'back', targetPage: 'est_mulini' },
    ],
  };

  // === PAGINA: Risultato D10 - Libreria trovata ===
  pages['d10_bookcase'] = {
    id: 'd10_bookcase',
    title: 'Scoperta Inaspettata',
    zoneType: 'discovery',
    description: `In una delle varie case immerse nel degrado e nella polvere trovi una libreria stranamente integra e ben pulita, con vari libri incastonati al suo interno in perfetto ordine e stato, con un'attenta occhiata ti rendi conto di una cosa, dietro di essa vi è quella che sembra una porta.`,
    revisitDescription: `Torni davanti alla libreria che hai scoperto in precedenza. È ancora lì, stranamente integra e pulita rispetto al resto della casa diroccata, con i suoi libri perfettamente allineati. Dietro di essa sai che si nasconde una porta.`,
    choices: [
      { id: 'move_bookcase', label: 'Sposta la libreria', outcome: 'custom', requiresStat: { stat: 'STR', value: 8 }, targetPage: 'move_bookcase' },
      { id: 'back_est_mulini_2', label: 'Torna ai mulini', outcome: 'back', targetPage: 'est_mulini' },
    ],
  };

  // === PAGINA: Sposta libreria (successo) ===
  pages['move_bookcase'] = {
    id: 'move_bookcase',
    title: 'La Porta Nascosta',
    zoneType: 'discovery',
    description: `Ti avvicini alla libreria piantando bene i piedi a terra, sfruttando tutta la forza che possiedi inizi a spostare pian piano il pesante mobile spostando vari strati di polvere da terra che si disperdono nell'ambiente circostante, creando un rumore fastidioso per le orecchie di chiunque. Ma alla fine, quello che avevi intravisto si rivela davanti a te, una porta in legno non ancora del tutto marcia con la maniglia che cade non appena provi a usarla, con la porta che grazie ad una leggera spintarella si apre rivelando una scalinata che porta ad un buio piano di sotto.`,
    choices: [
      { id: 'descend_talisman', label: 'Scendi le scale [Usando un talismano di luce]', outcome: 'custom', targetPage: 'descend_talisman' },
      { id: 'descend_dark', label: 'Scendi le scale [senza usare il talismano di luce]', outcome: 'custom', targetPage: 'descend_dark' },
      { id: 'back_est_mulini_3', label: 'Torna ai mulini', outcome: 'back', targetPage: 'est_mulini' },
    ],
  };

  // === PAGINA: Scende con talismano di luce ===
  pages['descend_talisman'] = {
    id: 'descend_talisman',
    title: 'Il Sotterraneo Illuminato',
    zoneType: 'discovery',
    description: `apri il menu della tua borsa e materializzi uno dei tuoi talismani di luce, attivandolo esso si distrugge nelle tue mani facendo poi comparire un piccolo globo luminoso che illumina tutto quello che c'è attorno a te.

Il silenzio regna sovrano, l'unica fonte di luce è quella generata dal tuo globo luminoso, attorno a te vi è solamente polvere, vecchi mobili marci e qualcosa che, non appena aguzzi di più la vista ti fa raggelare il sangue. Uno scheletro incatenato e senza gambe è stato lasciato lì in balia del tempo. Di fianco a lui sembrerebbe esserci un pugnale di bronzo e qualcosa di inaspettato, un vecchio e piccolo diario impolverato con la copertina semi distrutta.`,
    choices: [
      { id: 'take_diary', label: 'Prendi il diario', outcome: 'item', oneTime: true, targetPage: 'after_take_item_light', setsFlags: ['took_diary'] },
      { id: 'take_dagger', label: 'Prendi il pugnale', outcome: 'item', oneTime: true, targetPage: 'after_take_item_light', setsFlags: ['took_dagger'] },
      { id: 'back_move_bookcase', label: 'Torna su', outcome: 'back', targetPage: 'move_bookcase' },
    ],
  };

  // === PAGINA: Scende senza talismano ===
  pages['descend_dark'] = {
    id: 'descend_dark',
    title: 'Il Sotterraneo Buio',
    zoneType: 'discovery',
    description: `Il silenzio regna sovrano, non hai fonti di luce , attorno a te vi è solamente polvere, vecchi mobili marci e un buio che non ti fa capire bene cosa ti circonda

Tira 1D10 [Pari trovi il diario, dispari trovi il pugnale di bronzo]`,
    choices: [
      {
        id: 'roll_d10_dark',
        label: 'Tira 1D10',
        outcome: 'custom',
        diceRoll: {
          sides: 10,
          outcomes: [
            { min: 1, max: 10, parity: 'even', targetPage: 'dark_found_diary' },
            { min: 1, max: 10, parity: 'odd', targetPage: 'dark_found_dagger' },
          ],
        },
      },
      { id: 'back_move_bookcase_2', label: 'Torna su', outcome: 'back', targetPage: 'move_bookcase' },
    ],
  };

  // === PAGINE RISULTATO D10 (buio) ===
  pages['dark_found_diary'] = {
    id: 'dark_found_diary',
    title: 'Trovato: Diario',
    zoneType: 'discovery',
    description: `Brancolando nel buio, le tue dita sfiorano qualcosa di cuoioso e polveroso: un piccolo diario con la copertina semi-distrutta. Lo afferri con cura, ignorando il brivido che ti percorre la schiena nel sentire sotto le dita anche qualcosa di freddo e osseo lì vicino — uno scheletro incatenato, ormai privo di gambe. Non hai modo di vederlo, ma l'immagine si forma da sola nella tua mente, alimentata dai rumori del tuo respiro e dal silenzio tombale. Stringi il diario al petto e ti prepari a risalire.

[OGGETTO OTTENUTO: Vecchio Diario x1]`,
    choices: [
      { id: 'back_move_bookcase_from_diary', label: 'Torna su', outcome: 'back', targetPage: 'move_bookcase' },
    ],
  };

  pages['dark_found_dagger'] = {
    id: 'dark_found_dagger',
    title: 'Trovato: Pugnale di Bronzo',
    zoneType: 'discovery',
    description: `Brancolando nel buio, le tue dita si chiudono su qualcosa di freddo e metallico: una lama. La tasti con cautela — è un pugnale di bronzo, corto ma ancora affilato nonostante il tempo. Lo infili nella cintura con un mezzo sorriso: in un luogo del genere, qualsiasi arma è benedetta. Mentre lo afferri, sfiori con l'altra mano qualcosa di freddo e osseo — uno scheletro incatenato, privo di gambe — ma nel buio totale non puoi vederlo, solo immaginarlo. Un brivido ti percorre la schiena mentre ti prepari a risalire.

[OGGETTO OTTENUTO: Pugnale di Bronzo x1]`,
    choices: [
      { id: 'back_move_bookcase_from_dagger', label: 'Torna su', outcome: 'back', targetPage: 'move_bookcase' },
    ],
  };

  // === PAGINA: Dopo aver preso un oggetto (con talismano) ===
  pages['after_take_item_light'] = {
    id: 'after_take_item_light',
    title: 'L\'imboscata',
    zoneType: 'combat',
    description: `una volta messo nel tuo inventario l'oggetto dietro di te sentirai un rumore che conosci bene, il rumore di Spawn di un MOB. Ti volti di scatto estraendo la tua arma, grazie alla luce che emani noti che si tratta di due figure incappucciate che impugnano un'arma ciascuno, non presentano indicatori quindi capisci bene che sono due NPC, dopo qualche secondo si lanciano all'attacco.`,
    choices: [
      { id: 'fight_cultists_light', label: 'Affronta i cultisti', outcome: 'combat', targetPage: 'cultist_combat' },
    ],
  };

  // === PAGINA: Combattimento cultisti (placeholder — da sostituire con sistema combat vero)
  // Per ora due scelte: vinci o perdi. Quando il combat sarà implementato, questa pagina
  // verrà sostituita dal flusso di combattimento reale.
  pages['cultist_combat'] = {
    id: 'cultist_combat',
    title: 'Combattimento: Cultisti',
    zoneType: 'combat',
    description: `I due cultisti si lanciano all'attacco contemporaneamente, le loro armi luccicano nella luce del tuo talismano. Devi reagire in fretta o cadrai sotto i loro colpi.

[PLACEHOLDER COMBATTIMENTO — quando il sistema di combat sarà implementato, questa pagina verrà sostituita dal flusso reale. Per ora scegli l'esito per testing.]`,
    choices: [
      { id: 'win_cultists', label: 'Vinci il combattimento', outcome: 'combat', targetPage: 'after_cultist_fight', setsFlags: ['cultists_defeated'] },
      { id: 'lose_cultists', label: 'Perdi il combattimento', outcome: 'combat', targetPage: 'cultist_fight_lost', clearsFlags: ['took_diary', 'took_dagger', 'took_remaining'] },
    ],
  };

  // === PAGINA: Cultisti sconfitti (vittoria) ===
  pages['after_cultist_fight'] = {
    id: 'after_cultist_fight',
    title: 'Dopo la Battaglia',
    zoneType: 'discovery',
    description: `dopo aver vinto il combattimento il silenzio torna a regnare sovrano, e l'oggetto che ti mancava ora è a portata di mano.`,
    choices: [
      {
        id: 'take_remaining_item',
        label: 'Prendi l\'oggetto rimasto',
        outcome: 'item',
        oneTime: true,
        targetPage: 'move_bookcase',
        setsFlags: ['took_remaining', 'secret_room_completed'],
      },
      { id: 'back_move_bookcase_3', label: 'Torna su', outcome: 'back', targetPage: 'move_bookcase' },
    ],
  };

  // === PAGINA: Cultisti vincitori (sconfitta del giocatore) ===
  pages['cultist_fight_lost'] = {
    id: 'cultist_fight_lost',
    title: 'Sei Caduto',
    zoneType: 'combat',
    description: `I cultisti ti sopraffanno. L'ultimo colpo ti fa esplodere in un ammasso di dati e poligoni azzurri, e tutto diventa nero.

Quando riapri gli occhi, ti ritrovi fuori dalle case diroccate, vicino ai mulini. Gli oggetti che avevi preso nel sotterraneo sono spariti — la morte in SAO ha il suo prezzo. Dovrai tornare laggiù se vuoi recuperarli.`,
    choices: [
      { id: 'back_to_mulini_after_death', label: 'Torna ai mulini', outcome: 'back', targetPage: 'est_mulini' },
    ],
  };

  // === PAGINA: D10 case diroccate - nulla di nuovo (risultato già ottenuto) ===
  pages['d10_nothing_new'] = {
    id: 'd10_nothing_new',
    title: 'Nulla di Nuovo',
    zoneType: 'discovery',
    description: `Frughi tra le macerie delle case diroccate, sposti mobili marci, sollevi assi del pavimento, controlli ogni anfratto. Dopo una lunga ricerca, non trovi nulla che non abbia già trovato in precedenza. Le case sembrano aver esaurito tutti i loro segreti.`,
    choices: [
      { id: 'back_explore_houses_from_nothing', label: 'Continua a cercare', outcome: 'back', targetPage: 'explore_houses' },
      { id: 'back_mulini_from_nothing', label: 'Torna ai mulini', outcome: 'back', targetPage: 'est_mulini' },
    ],
  };

  // === PAGINA: Entra nel mulino a vento (prima volta - evento PK) ===
  // NOTA: questa pagina è raggiungibile SOLO la prima volta (quando windmill_event_resolved è false).
  // Dopo che l'evento è risolto, la choice 'enter_windmill' sparisce e viene sostituita
  // da 'enter_windmill_empty' che punta a 'windmill_empty'.
  pages['enter_windmill'] = {
    id: 'enter_windmill',
    title: 'Dentro il Mulino',
    zoneType: 'discovery',
    description: `Ti avvicini al mulino con molta calma, ad ogni passo che fai le pale della grande struttura diventano via via sempre più grandi. Una volta davanti l'edificio noti come la porta sia completamente aperta, l'interno è ben illuminato in quanto sul soffitto vi sono diversi fori che fanno filtrare bene la luce, oltre ai grandi finestroni di cui è dotato. Una volta dentro un incredibile odore di umidità e muschio ti riempie le narici, ricordandoti ancora una volta quanto questo VRMMO sia quasi indistinguibile dalla realtà. L'interno è completamente spoglio, nulla sembra esserci a parte qualche cumulo di paglia e attrezzi da fattore ormai arrugginiti e abbandonati a se stessi.

[CLOCK]

Proprio quando stavi per andare via, senti la porta del mulino chiudersi a chiave dietro di te "io....voglio uscire da questo posto" quando ti volti vedi quello che sembra essere un giocatore alle prime armi, un ragazzo dai capelli biondi corti e gli occhi verdi che impugna spaventato quella che non fatichi a riconoscere essere una spada corta "voglio...tornare a casa mia...non voglio morire...non voglio..." biascica parole avvicinandosi minacciosamente a te "dammi tutto quello che hai....trasferisci gli item e le armi...TUTTO!!" lo sguardo sembra spiritato, continua ad ingoiare saliva impugnando saldamente la sua arma puntandotela contro "non costringermi a...a..." in quel momento, lo noti, il cursore sopra la sua testa è rosso, proprio come quelli dei player killer.`,
    choices: [
      {
        id: 'give_items',
        label: 'Dai tutto quello che hai equipaggiato e in borsa',
        outcome: 'custom',
        targetPage: 'give_items',
        setsFlags: ['windmill_event_resolved', 'pk_spared'],
      },
      {
        id: 'fight_pk',
        label: 'Affronta il giocatore',
        outcome: 'combat',
        targetPage: 'fight_pk',
      },
    ],
  };

  // === PAGINA: Mulino vuoto (dopo che l'evento PK è stato risolto) ===
  pages['windmill_empty'] = {
    id: 'windmill_empty',
    title: 'Dentro il Mulino',
    zoneType: 'discovery',
    description: `Rientri nel mulino a vento. La luce filtra dai fori sul soffitto e dai grandi finestroni, illuminando lo stesso interno spoglio: cumuli di paglia, attrezzi da fattore arrugginiti, l'odore insistente di umidità e muschio. La porta alle tue spalle resta aperta.

Il mulino è vuoto, silenzioso.`,
    choices: [
      {
        id: 'leave_windmill_empty',
        label: 'Esci dal mulino',
        outcome: 'back',
        targetPage: 'est_mulini',
      },
    ],
  };

  // === PAGINA: Dai tutto al PK ===
  pages['give_items'] = {
    id: 'give_items',
    title: 'Resa',
    zoneType: 'discovery',
    description: `con il classico gesto di mano apri il tuo menu e trasferisci tutto quello che possiedi al giocatore davanti a te, il suono della notifica che proviene da lui riecheggia in tutto il mulino "io....grazie...." sollevato dal tuo gesto, si volta abbassando la spada "questo posto ti rende un mostro...ma tanto tutto rimane dentro al gioco no?...infondo io faccio quello che faccio per sopravvivere...." una volta finito di parlare correrà via, sparendo tra le immense praterie di questa zona.`,
    choices: [
      { id: 'leave_windmill_after_give', label: 'Esci dal mulino', outcome: 'back', targetPage: 'est_mulini' },
    ],
  };

  // === PAGINA: Affronta il PK ===
  pages['fight_pk'] = {
    id: 'fight_pk',
    title: 'Lo Scontro',
    zoneType: 'combat',
    description: `estrài la tua arma con decisione "quindi....è cosí che vuoi che vada, ti ho dato una scelta...perchè volete tutti morire...PERCHÈ!?" ormai capisci bene che ragionare con un individuo del genere non ha molto senso, l'incubo che è questo gioco ha portato molti giocatori alla pazzia, compreso il ragazzo che hai davanti che, dopo un ultimo scambio di sguardi, si lancia all'attacco.`,
    choices: [
      { id: 'pk_spared', label: 'Sconfiggilo senza ucciderlo', outcome: 'combat', targetPage: 'pk_spared' },
    ],
  };

  // === PAGINA: PK sconfitto (non ucciso) ===
  pages['pk_spared'] = {
    id: 'pk_spared',
    title: 'Il Player Killer Sconfitto',
    zoneType: 'discovery',
    description: `Il tuo ultimo colpo fa cadere il giocatore a terra che preso dal panico inizierà ad avere tremori in ogni sua parte del corpo "no...ti prego...no...io non volevo...pensavo non fossi cosí abile..." i suoi occhi si riempiono di puro terrore, si alza di scatto voltandosi verso la porta del mulino "NO LASCIAMI STARE!! AIUTATEMI!! VUOLE DERUBARMI AIUTATEMI!!" ci siete solo voi due qui dentro però, e nessuno al di fuori del mulino sembra sentirvi.`,
    choices: [
      { id: 'kill_pk', label: 'Uccidi il giocatore', outcome: 'combat', requiresStat: { stat: 'DEX', value: 5 }, targetPage: 'kill_pk', setsFlags: ['windmill_event_resolved', 'pk_killed'] },
      { id: 'spare_pk', label: 'Lascialo andare', outcome: 'custom', targetPage: 'spare_pk', setsFlags: ['windmill_event_resolved', 'pk_spared'] },
    ],
  };

  // === PAGINA: Uccidi il PK ===
  pages['kill_pk'] = {
    id: 'kill_pk',
    title: 'La Fine del Player Killer',
    zoneType: 'discovery',
    description: `per evitare che possa fare del male a qualcun altro, ti avvicini a lui con uno scatto fulmineo che non gli lascia alcuna via di fuga, con la tua arma gli trafiggi il petto colpendolo da dietro proprio mentre aveva finito si sbloccare la porta dell'edificio "io...mamma...papà...aiuto...." il suono sordo delle ginocchia che cadono a terra viene sovrascritato dal suono degli ultimi HP che scendono a 0, facendolo esplodere in un ammasso di dati e poligoni azzurri, riportando il silenzio.`,
    choices: [
      { id: 'leave_windmill_after_kill', label: 'Esci dal mulino', outcome: 'back', targetPage: 'est_mulini' },
    ],
  };

  // === PAGINA: Risparmia il PK ===
  pages['spare_pk'] = {
    id: 'spare_pk',
    title: 'Pietà',
    zoneType: 'discovery',
    description: `Abbassi la tua arma e fai un passo indietro. Il ragazzo ti guarda con occhi increduli, poi scatta verso la porta del mulino, la spinge con tutta la forza che gli resta e corre via, scomparendo tra le praterie senza mai voltarsi indietro. Il silenzio cala nuovamente nel mulino vuoto.`,
    choices: [
      { id: 'leave_windmill_after_spare', label: 'Esci dal mulino', outcome: 'back', targetPage: 'est_mulini' },
    ],
  };

  return {
    subAreaId,
    subAreaName,
    currentPageId: 'entry',
    visitedPages: ['entry'],
    pages,
    choiceUses: {},
    flags: {},
    visitCount: { entry: 1 },
    stats: { pagesVisited: 1, choicesMade: 0, itemsFound: 0, combatsWon: 0 },
  };
}
