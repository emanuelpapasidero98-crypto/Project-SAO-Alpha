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
    revisitDescription: `I tuoi stivali calcano di nuovo l'erba smeraldo delle praterie, familiare ormai come una vecchia conoscenza. Il vento ti accarezza il viso portando con sé il profumo dolce della terra umida e quello più aspro del sudore dei novizi che si allenano alle tue spalle. Il cielo di Aincrad si stende sopra di te, immutato, con la mole incombente del Labirinto che incombe all'orizzonte come un promemoria silenzioso.

Alle tue spalle, i cancelli di pietra della Città degli Inizi continuano a rigurgitare la loro vita ansiosa: il brusio dei novizi, il tintinnio metallico delle armature, le grida lontane di chi combatte i cinghiali blu per racimolare esperienza. Un refolo di vento fa piegare l'erba alta in onde successive, rivelando qui e là il luccichio azzurrognolo di un cinghiale che grufola. I sentieri si diramano davanti a te come arterie di esplorazione: a est il fruscio ritmico dei mulini a vento, a nord l'ombra fitta del bosco di Horunka, a ovest il rombo sordo delle cascate montane celate nella foschia.`,
    choices: [
      { id: 'combat_boars', label: 'Inizia un combattimento con i cinghiali blu', outcome: 'combat', resultText: 'Ti avvicini ai cinghiali blu che grufolano nella prateria, estrai la tua arma pronto al combattimento.' },
      { id: 'est_mulini', label: 'Prendi la strada verso Est che porta ai mulini', outcome: 'progress' },
      { id: 'nord_bosco', label: 'Prendi la strada verso Nord che porta al bosco', outcome: 'progress', targetPage: 'nord_bosco' },
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
        // Tutto completato: case + mulino + secret room
        requiresFlags: ['windmill_event_resolved', 'houses_d10_1', 'houses_d10_2_5', 'houses_d10_6_9', 'houses_d10_10', 'secret_room_completed'],
        description: `Ricalchi i tuoi passi tra l'erba alta che ti solletica i polpacci, diretto verso i mulini a vento. Lo scricchiolio ritmico delle pale di legno ti accoglie come un suono familiare, mescolato al grugnito soffocato dei cinghiali blu che raspano la terra secca tra le rovine. L'odore di muschio e legno marcio ti raggiunge prima ancora che il villaggio fantasma si sveli davanti ai tuoi occhi: scheletri di case con i tetti sfondati, orti divorati dai rovi, attrezzi agricoli che la ruggine ha reso irriconoscibili.

Hai già frugato in ogni anfratto delle case diroccate — non resta che polvere, insetti e legno marcio. Anche il mulino a vento in cui sei entrato è ormai vuoto e silenzioso, svuotato di ogni segreto. L'aria ferma della zona porta solo l'eco lontana del vento tra le pale e il verso sporadico di un uccello solitario.`,
      },
      {
        // Case completate (tutti i D10 + secret room) ma mulino NON risolto
        requiresFlags: ['houses_d10_1', 'houses_d10_2_5', 'houses_d10_6_9', 'houses_d10_10', 'secret_room_completed'],
        description: `Ricalchi i tuoi passi tra l'erba alta che ti solletica i polpacci, diretto verso i mulini a vento. Lo scricchiolio ritmico delle pale di legno ti accoglie come un suono familiare, mescolato al grugnito soffocato dei cinghiali blu che raspano la terra secca tra le rovine. L'odore di muschio e legno marcio ti raggiunge prima ancora che il villaggio fantasma si sveli davanti ai tuoi occhi: scheletri di case con i tetti sfondati, orti divorati dai rovi, attrezzi agricoli che la ruggine ha reso irriconoscibili.

Hai già frugato in ogni anfratto delle case diroccate — non resta che polvere, insetti e legno marcio. Resta però il grande mulino a vento: il suo portone semiaperto continua a stagliarsi come un varco buio e invitante, ancora inesplorato, con la luce che filtra dalle fessure delle pale in movimento.`,
      },
      {
        // Mulino risolto ma case NON completamente esplorate
        requiresFlags: ['windmill_event_resolved'],
        description: `Ricalchi i tuoi passi tra l'erba alta che ti solletica i polpacci, diretto verso i mulini a vento. Lo scricchiolio ritmico delle pale di legno ti accoglie come un suono familiare, mescolato al grugnito soffocato dei cinghiali blu che raspano la terra secca tra le rovine. L'odore di muschio e legno marcio ti raggiunge prima ancora che il villaggio fantasma si sveli davanti ai tuoi occhi: scheletri di case con i tetti sfondati, orti divorati dai rovi, attrezzi agricoli che la ruggine ha reso irriconoscibili.

Il mulino in cui sei entrato è ora silenzioso e vuoto, svuotato di ogni presenza. Le case diroccate, invece, continuano a incombere con le loro ombre cupe — potrebbero ancora celare qualcosa di utile tra le macerie e la polvere.`,
      },
    ],
    revisitDescription: `Ricalchi i tuoi passi tra l'erba alta che ti solletica i polpacci, diretto verso i mulini a vento. Lo scricchiolio ritmico delle pale di legno ti accoglie come un suono familiare, mescolato al grugnito soffocato dei cinghiali blu che raspano la terra secca tra le rovine. L'odore di muschio e legno marcio ti raggiunge prima ancora che il villaggio fantasma si sveli davanti ai tuoi occhi: scheletri di case con i tetti sfondati, orti divorati dai rovi, attrezzi agricoli che la ruggine ha reso irriconoscibili.

Le case diroccate incombono come scheletri di pietra, le loro finestre vuote come orbite spalancate. Il grande mulino a vento, con il suo portone semiaperto, si staglia contro il cielo come un varco buio e invitante, mentre la luce filtra a tratti dalle fessure tra le pale in movimento.`,
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
    description: `La curiosità e la voglia di migliorare il tuo equipaggiamento ti spinge a esplorare questo villaggio dimenticato da chiunque, inizi a osservarne ogni anfratto, ad entrare in ogni casa diroccata spostando oggetti che per un giocatore non hanno alcun valore togliendo polvere e qualche piccolo insetto che ne ha fatto la sua casa di quel ciarpame.`,
    conditionalDescriptions: [
      {
        // Libreria scoperta ma secret room non completata
        requiresFlags: ['bookcase_discovered'],
        anyOfFlags: ['secret_room_completed'],
        description: `Riprendi la tua esplorazione tra le case diroccate. L'aria è densa di polvere sospesa che danza nei raggi di sole che penetrano dai tetti sfondati, e ogni passo solleva una nuvoletta grigia dal pavimento di legno marcio. Sposti vecchi mobili che scricchiolano sotto le tue mani, sollevi assi del pavimento che lasciano intravedere solo terra umida e insetti spaventati. Hai già trovato una libreria particolare che nasconde un'entrata segreta — puoi tornarci direttamente per esplorare il sotterraneo.

Tira un D10 per cercare altro materiale tra le macerie.`,
      },
      {
        requiresFlags: ['bookcase_discovered'],
        description: `Riprendi la tua esplorazione tra le case diroccate. L'aria è densa di polvere sospesa che danza nei raggi di sole che penetrano dai tetti sfondati, e ogni passo solleva una nuvoletta grigia dal pavimento di legno marcio. Sposti vecchi mobili che scricchiolano sotto le tue mani, sollevi assi del pavimento che lasciano intravedere solo terra umida e insetti spaventati. Hai già trovato una libreria particolare che nasconde un'entrata segreta — puoi tornarci direttamente per esplorare il sotterraneo.

Tira un D10 per cercare altro materiale tra le macerie.`,
      },
    ],
    revisitDescription: `Riprendi la tua esplorazione tra le case diroccate. L'aria è densa di polvere sospesa che danza nei raggi di sole che penetrano dai tetti sfondati, e ogni passo solleva una nuvoletta grigia dal pavimento di legno marcio. Sposti vecchi mobili che scricchiolano sotto le tue mani, sollevi assi del pavimento che lasciano intravedere solo terra umida e insetti spaventati.

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
    revisitDescription: `Torni davanti alla libreria che hai scoperto in precedenza. È ancora lì, stranamente integra e pulita rispetto al resto della casa diroccata, con i suoi libri perfettamente allineati che spargono un profumo di carta vecchia e cuoio in mezzo al tanfo di umidità e marciume. La luce che filtra dal tetto sfondato la colpisce quasi a proposito, come a indicartela. Dietro di essa sai che si nasconde una porta.`,
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

  // === PAGINA: Scende senza talismano (Sotterraneo Buio) ===
  pages['descend_dark'] = {
    id: 'descend_dark',
    title: 'Il Sotterraneo Buio',
    zoneType: 'discovery',
    description: `Il silenzio regna sovrano, non hai fonti di luce, attorno a te vi è solamente polvere, vecchi mobili marci e un buio che non ti fa capire bene cosa ti circonda. Brancoli nel buio totale, le mani tese in avanti a cercare appigli, i piedi che calpestano pavimento di pietra fredda e scivolosa. Ogni passo è una scommessa: non sai cosa ci sia davanti a te, non sai cosa potrebbe nascondersi nell'ombra. L'aria è pesante, stantia, carica di un tanfo di umidità e decomposizione che ti fa arricciare il naso.

Da qualche parte in questo buio totale, percepisci una presenza. Non un rumore, non un movimento — solo la sensazione gelida di non essere solo. Le tue dita sfiorano qualcosa di freddo, di metallico. È una lama? È un oggetto? Non puoi saperlo finché non la afferri.`,
    choices: [
      {
        id: 'roll_d10_dark',
        label: 'Tira 1D10',
        outcome: 'custom',
        diceRoll: {
          sides: 10,
          outcomes: [
            { min: 1, max: 10, parity: 'even', targetPage: 'dark_found_diary', setsFlags: ['took_diary'] },
            { min: 1, max: 10, parity: 'odd', targetPage: 'dark_found_dagger', setsFlags: ['took_dagger'] },
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
      { id: 'proceed_ambush_dark_diary', label: 'Risali le scale', outcome: 'progress', targetPage: 'after_take_item_dark' },
    ],
  };

  pages['dark_found_dagger'] = {
    id: 'dark_found_dagger',
    title: 'Trovato: Pugnale di Bronzo',
    zoneType: 'discovery',
    description: `Brancolando nel buio, le tue dita si chiudono su qualcosa di freddo e metallico: una lama. La tasti con cautela — è un pugnale di bronzo, corto ma ancora affilato nonostante il tempo. Lo infili nella cintura con un mezzo sorriso: in un luogo del genere, qualsiasi arma è benedetta. Mentre lo afferri, sfiori con l'altra mano qualcosa di freddo e osseo — uno scheletro incatenato, privo di gambe — ma nel buio totale non puoi vederlo, solo immaginarlo. Un brivido ti percorre la schiena mentre ti prepari a risalire.

[OGGETTO OTTENUTO: Pugnale di Bronzo x1]`,
    choices: [
      { id: 'proceed_ambush_dark_dagger', label: 'Risali le scale', outcome: 'progress', targetPage: 'after_take_item_dark' },
    ],
  };

  // === PAGINA: Dopo aver preso un oggetto (senza talismano, nel buio) ===
  pages['after_take_item_dark'] = {
    id: 'after_take_item_dark',
    title: 'L\'imboscata nel buio',
    zoneType: 'combat',
    description: `una volta messo nel tuo inventario l'oggetto dietro di te sentirai un rumore che conosci bene, il rumore di Spawn...anzi, di due Spawn. Ti volti di scatto estraendo la tua arma, ma a causa del buio non riesci a vedere bene e sei costretto a combattere quasi alla cieca. Senti i passi dei due assalitori avvicinarsi da direzioni diverse, il sibilo delle loro armi nell'aria nera. Non puoi affidarti alla vista — solo all'udito e all'istinto.`,
    choices: [
      { id: 'fight_cultists_dark', label: 'Affronta i cultisti alla cieca', outcome: 'combat', targetPage: 'cultist_combat' },
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
        targetPage: 'est_mulini',
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
    description: `Varchi di nuovo la soglia del mulino a vento. La luce dorata filtra dai fori sul soffitto e dai grandi finestroni polverosi, disegnando lame di luce che tagliano l'aria satura di pulviscolo. Lo stesso interno spoglio ti accoglie: cumuli di paglia ingiallita, attrezzi da fattore arrugginiti abbandonati contro le pareti, l'odore insistente di umidità e muschio che ti si appiccica alle narici. Il vento fa girare le pale sopra di te con il loro scricchiolio familiare, e la porta alle tue spalle resta aperta, lasciando entrare la brezza erbosa della prateria.

Il mulino è vuoto, silenzioso. Solo il vento e il legno parlano.`,
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


  // ========================================================================
  // === PAGINE BOSCO DI HORUNKA (Nord) ===
  // ========================================================================

  // === PAGINA: Nord - Strada sterrata verso il bosco ===
  pages['nord_bosco'] = {
    id: 'nord_bosco',
    title: 'Strada per il Bosco',
    zoneType: 'exploration',
    description: `La strada sterrata è ben definita, ogni tuo passo ti avvicina all'entrata del bosco in cui nei giorni passati molti giocatori si sono avventurati ma davvero molto pochi sono tornati. Le urla dei combattimenti che stanno avvenendo nelle praterie si fanno via via sempre più distanti, una leggera brezza ti investe dandoti per qualche secondo un lieve senso di sollievo, quasi facendoti dimenticare che questo posto in realtà è solo un ammasso di pixel e dati. Il paesaggio attorno a te si indurisce, l'erba soffice cede definitivamente il passo a radici affioranti, rocce spigolose e muschio umido, incanalando i tuoi passi verso il greto di un ruscello gorgogliante. Oltre quelle assi scricchiolanti si innalza un autentico muro di tronchi massicci e fronde scurissime, é un confine netto, molti giocatori hanno varcato questa soglia nei giorni scorsi, spinti dall'urgenza di salire di livello, ma il silenzio innaturale che ristagna tra gli alberi è la prova tangibile di quanti pochi abbiano fatto ritorno. Inoltre, sai bene che udire il suono di animali non è la stessa cosa della vita reale, ogni cosa può portare a friggerti il cervello a causa delle scariche elettriche che provocherebbe il nervegear che hai piantato in testa, perciò essere avventato non é la scelta migliore che puoi fare, ma tutto dipende da te. Sai cosa ti aspetta dentro alla fitta boscaglia, non solo i soliti cinghiali delle prime zone, ma grosse vespe pronte ad attaccarti in massa per punire un tuo passo falso, per non parlare del pericolo più grande…..i giocatori.`,
    revisitDescription: `Ricalchi la strada sterrata che porta verso il bosco di Horunka. Le urla dei combattimenti nelle praterie si fanno via via più distanti, sostituite dal gorgoglio del ruscello e dallo scricchiolio delle assi del ponte di legno che ti attende poco più avanti. Il paesaggio si indurisce gradualmente: erba soffice cede il passo a radici affioranti, rocce spigolose e muschio umido. Oltre il ponte, il muro di tronchi massicci e fronde scurissime del bosco si staglia come un confine netto, silente e opprimente — un promemoria di quanti pochi siano tornati da quella soglia.`,
    choices: [
      { id: 'varca_ponte', label: 'Varca il ponte di legno', outcome: 'progress', targetPage: 'varca_ponte' },
      { id: 'back_entry_from_bosco', label: 'Torna indietro', outcome: 'back', targetPage: 'entry' },
    ],
  };

  // === PAGINA: Varca il ponte di legno (Horunka) ===
  pages['varca_ponte'] = {
    id: 'varca_ponte',
    title: 'Bosco di Horunka',
    zoneType: 'exploration',
    description: `Il villaggio di Horunka ti attende oltre questa fitta muraglia di tronchi e ombre. Molti giocatori si sono già spinti fin quaggiù, mossi dalla disperata fame di nuovo equipaggiamento o, più semplicemente, dal bisogno psicologico di agire; qualsiasi cosa è meglio che consumarsi nella Città degli Inizi aspettando una salvezza improbabile. Non appena i tuoi stivali si lasciano alle spalle le assi scricchiolanti del ponte per calcare la terra nuda, l'ambiente circostante muta radicalmente: i fusti degli alberi si ergono a dismisura fino a inghiottire la luce, mentre le rocce affioranti lungo il sentiero assumono contorni spigolosi e bizzarri. Sono geometrie aliene, contorte in pose che nessuna vera forza erosiva avrebbe mai potuto scolpire, come se il codice di questo mondo volesse gridare in ogni istante la sua spietata natura artificiale.

Le fronde degli alberi si muovono serenamente a causa del venticello fresco che riempie la zona, ogni tanto puoi vedere qualche cervo in lontananza o qualche piccolo coniglietto che saltella di qua e la, anche la caccia è contemplata ad Aincrad e potrebbe essere l'opzione ideale per chi vuole ottenere materiali per cucinare qualcosa in modo tale da appagare i propri sensi e riempire, seppur in maniera fittizia, il proprio stomaco.`,
    revisitDescription: `Ti ritrovi oltre il ponte di legno, nel cuore del bosco di Horunka. I fusti degli alberi si ergono a dismisura inghiottendo la luce, le rocce affioranti mostrano contorni spigolosi e bizzarri — geometrie aliene che il codice di questo mondo scolpisce per ricordarti la sua natura artificiale. Le fronde si muovono serenamente al venticello fresco, e in lontananza scorgi ancora qualche cervo e qualche coniglietto che saltella indisturbato.`,
    choices: [
      { id: 'caccia_cervi', label: 'Vai a caccia di cervi', outcome: 'custom', targetPage: 'caccia_cervi' },
      { id: 'caccia_conigli', label: 'Vai a caccia di conigli', outcome: 'custom', targetPage: 'caccia_conigli' },
      { id: 'attacca_vespe', label: 'Attacca le Vespe [tutte le volte che si vuole]', outcome: 'combat', targetPage: 'attacca_vespe' },
      { id: 'segui_strada_sterrata', label: 'Segui la strada sterrata', outcome: 'progress', targetPage: 'segui_strada_sterrata' },
      { id: 'addentrati_boscaglia', label: 'Addentrati nella boscaglia', outcome: 'progress', targetPage: 'addentrati_boscaglia' },
      { id: 'back_nord_bosco', label: 'Torna alle Praterie', outcome: 'back', targetPage: 'entry' },
    ],
  };

  // === PAGINA: Caccia ai cervi ===
  pages['caccia_cervi'] = {
    id: 'caccia_cervi',
    title: 'Caccia ai Cervi',
    zoneType: 'discovery',
    description: `Decidi di darti da fare e procacciarti qualche risorsa utile per riuscire a cucinare qualcosa di buono insieme a qualche materiale che potrebbe tornarti utile. ti incammini con passo felpato in modo tale da non spaventare le prede che sostano a una decina di metri da te, è un branco parecchio numeroso quindi non dovresti avere troppa difficoltà.`,
    revisitDescription: `Decidi di nuovo di darti da fare con la caccia ai cervi. Ti incammini con passo felpato verso il branco che sosta a una decina di metri da te, numeroso come la volta precedente.`,
    choices: [
      { id: 'lancia_cervo', label: 'Lanciati verso un cervo', outcome: 'combat', targetPage: 'lancia_cervo' },
      { id: 'sorpresa_cervi', label: 'Avvicinati cercando di prenderli di sorpresa [Destrezza 5]', outcome: 'custom', requiresStat: { stat: 'DEX', value: 5 }, targetPage: 'sorpresa_cervi' },
      { id: 'sword_skill_cervi', label: 'Utilizza una Sword Skill', outcome: 'custom', targetPage: 'sword_skill_cervi', locked: true, lockReason: 'Sistema Sword Skill non ancora implementato' },
      { id: 'back_varca_ponte_cervi', label: 'Torna indietro', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Lanciati verso un cervo ===
  pages['lancia_cervo'] = {
    id: 'lancia_cervo',
    title: 'Cervo Abbattuto',
    zoneType: 'combat',
    description: `Ti apposti silenziosamente tra le felci, calcolando con freddezza il momento perfetto per scivolare alle spalle del primo cervo che si ferma a portata di tiro. Muovendo passi felpati per non far scricchiolare il fogliame del sottobosco, annulli gradualmente le distanze; non appena il grande bersaglio è a tiro, metti da parte ogni esitazione e fai scattare il polso, calando un fendente secco e spietato. La lama trancia l'aria con una rapidità invisibile, colpendo la creatura prima ancora che possa percepire la minaccia: in un battito di ciglia la sua forma si infrange silenziosamente, svanendo nell'aria per lasciare il posto a una pioggia scintillante di poligoni azzurri e frammenti di dati.

[OGGETTO OTTENUTO: 1x Carne di Cervo Rovinata (Comune), 1x Pelle di Cervo Rovinata (Comune)]`,
    choices: [
      { id: 'back_caccia_cervi_1', label: 'Torna alla caccia', outcome: 'back', targetPage: 'caccia_cervi' },
      { id: 'back_varca_ponte_1', label: 'Torna al bosco', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Avvicinati di sorpresa [DES 5] ===
  pages['sorpresa_cervi'] = {
    id: 'sorpresa_cervi',
    title: 'Agguato al Branco',
    zoneType: 'combat',
    description: `Sfruttando la tua destrezza, ti avvicini ai cervi con la silenziosità di un predatore esperto. Riesci ad abbattere due esemplari prima che il branco si disperda.`,
    choices: [
      {
        id: 'roll_cervo_regale_50',
        label: 'Controlla se appare il Cervo Regale (50%)',
        outcome: 'custom',
        diceRoll: {
          sides: 2,
          outcomes: [
            { min: 1, max: 1, targetPage: 'cervo_regale_appare' },
            { min: 2, max: 2, targetPage: 'sorpresa_cervi_ricompensa' },
          ],
        },
      },
    ],
  };

  // === PAGINA: Sorpresa cervi - ricompensa (senza cervo regale) ===
  pages['sorpresa_cervi_ricompensa'] = {
    id: 'sorpresa_cervi_ricompensa',
    title: 'Doppio Bottino',
    zoneType: 'discovery',
    description: `I due cervi si infrangono in una pioggia di poligoni azzurri, lasciando a terra il loro bottino. Il resto del branco si disperde nel folto del bosco, scomparendo tra le fronde scure. Nessun esemplare raro fa capolino questa volta — la fortuna non ti arride oltre.

[OGGETTO OTTENUTO: 2x Carne di Cervo Rovinata (Comune), 2x Pelle di Cervo Rovinata (Comune)]`,
    choices: [
      { id: 'back_caccia_cervi_2', label: 'Torna alla caccia', outcome: 'back', targetPage: 'caccia_cervi' },
      { id: 'back_varca_ponte_2', label: 'Torna al bosco', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Cervo Regale appare ===
  pages['cervo_regale_appare'] = {
    id: 'cervo_regale_appare',
    title: 'Il Cervo Regale',
    zoneType: 'combat',
    description: `Appena il corpo dell'ultimo bersaglio si dissolve in frammenti luminosi lasciando a terra il suo bottino, un tonfo sordo fa vibrare il terreno sotto i tuoi stivali; il crepitio di tronchi e radici spezzate rivela l'avvicinarsi di un MOB ben più grande. Fendendo il fogliame, compare la sagoma maestosa di un raro Cervo Regale: una bestia dalla corporatura massiccia e dai muscoli tesi, sormontata da un palco di corna tanto ampio da sembrare un intricato groviglio di lame naturali. L'animale è concentrato a strappare con forza interi ciuffi di vegetazione a pochi metri da te, del tutto ignaro del pericolo imminente. Sfruttando le ombre degli alberi e calcolando ogni singolo movimento, sei riuscito a fondere i tuoi passi con i sussurri del bosco, trasformandoti in un predatore invisibile; la mano scivola salda sull'arma, consapevole che la finestra per un colpo letale a sorpresa si è appena aperta.`,
    choices: [
      {
        id: 'attacca_cervo_regale',
        label: 'Attacca il Cervo Regale (10% successo)',
        outcome: 'combat',
        diceRoll: {
          sides: 10,
          outcomes: [
            { min: 1, max: 1, targetPage: 'cervo_regale_successo' },
            { min: 2, max: 10, targetPage: 'cervo_regale_fallimento' },
          ],
        },
      },
      {
        id: 'cervo_regale_sorpresa_analisi',
        label: 'Prendi il Cervo Regale di sorpresa [Skill Analisi liv.2]',
        outcome: 'custom',
        targetPage: 'cervo_regale_sorpresa',
        locked: true,
        lockReason: 'Richiede Skill Analisi liv.2 (non ancora implementata)',
      },
      { id: 'back_caccia_cervi_3', label: 'Lascia perdere e torna alla caccia', outcome: 'back', targetPage: 'caccia_cervi' },
    ],
  };

  // === PAGINA: Cervo Regale - Attacco successo (10%) ===
  pages['cervo_regale_successo'] = {
    id: 'cervo_regale_successo',
    title: 'Colpo Letale',
    zoneType: 'combat',
    description: `Con un grido di battaglia ti scagli verso la preda più ambita che potesse capitarti a tiro. Sfruttando la gravità irreale e la leggerezza di questo corpo digitale, scatti in avanti in un'unica, fluida accelerazione; la tua lama si accende di un intenso bagliore giallognolo, tracciando nell'aria un fendente sottile e perfettamente verticale generando una stoccata letale e precisissima. Nonostante l'eco improvvisa della tua carica, la mole imponente del cervo lo tradisce, lasciandolo disorientato per una decisiva manciata di secondi: è tutto il tempo che ti serve. La scia luminosa dell'arma affonda netta nel torace dell'animale, strappandogli un debole mugolio strozzato prima che la sua intera corporatura vada in frantumi, esplodendo in una pioggia di poligoni azzurri e dati evanescenti.

[OGGETTO OTTENUTO: 30 XP, 5x Carne di Cervo Pregiata (Raro), 5x Pelle di Cervo Perfetta (Raro)]`,
    choices: [
      { id: 'back_caccia_cervi_4', label: 'Torna alla caccia', outcome: 'back', targetPage: 'caccia_cervi' },
      { id: 'back_varca_ponte_3', label: 'Torna al bosco', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Cervo Regale - Attacco fallimento (90%) ===
  pages['cervo_regale_fallimento'] = {
    id: 'cervo_regale_fallimento',
    title: 'Preda Sfuggita',
    zoneType: 'combat',
    description: `Con un grido di battaglia ti scagli verso la preda più ambita che potesse incrociare il tuo cammino. Sfruttando la gravità irreale di questo corpo digitale, scatti in avanti in un'unica, fluida accelerazione; la tua arma fende l'aria, già in posizione per scaricare un colpo fatale. Tuttavia, questo Cervo Regale non condivide la goffa routine comportamentale dei mostri iniziali: prima ancora che tu riesca ad accorciare la distanza, le sue lunghe orecchie scattano all'indietro, captando istantaneamente il frastuono della tua carica. Con una reattività bruciante, la maestosa creatura fa perno sugli zoccoli e si lancia in un balzo prodigioso per allontanarsi dalla tua traiettoria; un attimo dopo, il tonfo ritmico del suo galoppo sfuma a perdifiato, inghiottito da un fitto muro di rovi e fronde che si richiude come un sipario, negandoti qualsiasi speranza di inseguimento.`,
    choices: [
      { id: 'back_caccia_cervi_5', label: 'Torna alla caccia', outcome: 'back', targetPage: 'caccia_cervi' },
      { id: 'back_varca_ponte_4', label: 'Torna al bosco', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Cervo Regale - Sorpresa [Analisi liv.2] ===
  pages['cervo_regale_sorpresa'] = {
    id: 'cervo_regale_sorpresa',
    title: 'Decapitazione Perfetta',
    zoneType: 'combat',
    description: `Osservando la fluidità nervosa dei suoi movimenti e la maniacale attenzione a ogni minimo fruscio, capisci subito che questo non è un bersaglio comune: la tua abilità di Analisi conferma che l'unica garanzia per abbatterlo e ottenerne l'intero bottino è una decapitazione perfetta. Ti accovacci tra le ombre del sottobosco, pedinando la creatura per svariati, interminabili minuti; ogni tuo passo è calcolato per fondersi con i sussurri della foresta in un'attesa paziente, finché la bestia non ti concede la sua unica, fugace vulnerabilità. Non appena il cervo china il muso per abbeverarsi alle acque chiare di un ruscello, scatti in avanti con un'accelerazione fulminea; tieni la mano serrata sull'elsa per silenziare sul nascere qualsiasi vibrazione metallica e, giunto a un soffio dal bersaglio, estrai l'arma scatenando un unico, micidiale arco di taglio. Il fendente recide il collo di netto, strappando all'animale un debole mugolio strozzato prima che la sua intera mole collassi, infrangendosi in una spettacolare tempesta di poligoni azzurri e dati evanescenti.

[OGGETTO OTTENUTO: 30 XP, 5x Carne di Cervo Pregiata (Raro), 5x Pelle di Cervo Perfetta (Raro), 1x Pelle di Cervo Regale, 1x Palchi di Cervo Regale]`,
    choices: [
      { id: 'back_caccia_cervi_6', label: 'Torna alla caccia', outcome: 'back', targetPage: 'caccia_cervi' },
      { id: 'back_varca_ponte_5', label: 'Torna al bosco', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Sword Skill - Cervi (placeholder) ===
  pages['sword_skill_cervi'] = {
    id: 'sword_skill_cervi',
    title: 'Sword Skill: Cervi',
    zoneType: 'combat',
    description: `[PLACEHOLDER — Sistema Sword Skill non ancora implementato. Quando sarà disponibile, il giocatore potrÃ  scegliere quale Sword Skill usare spendendo i PA necessari.]

L'obiettivo non si limita piÃ¹ a un singolo esemplare isolato, ma si allarga all'intero branco ignaro che pascola dinanzi a te: la tua determinazione esige quante piÃ¹ prede possibili prima che si disperdano. Con un gesto fluido, ormai scolpito nella memoria muscolare del tuo avatar, arretri la spalla per caricare il colpo; in perfetta risposta a quella specifica postura, il Sistema riconosce l'innesco e la lama inizia a vibrare, avvolgendosi di un tenue e letale bagliore giallognolo. Trattieni il fiato per una frazione di secondo, avvertendo la netta sensazione del codice digitale che si aggancia al tuo braccio per guidarne la traiettoria, per poi sprigionare tutta la tua foga guerriera:
"[NOME SWORD SKILL]"
Il tuo grido squarcia la quiete del bosco mentre ti lanci all'attacco, trasformandoti in un inarrestabile vortice di fendenti luminosi. Sfruttando la furia cieca e il disperato istinto di sopravvivenza che ti spinge ad andare avanti in questo mondo mortale, la tua arma falcia l'aria, abbattendosi inesorabile su tutti i cervi troppo lenti per sfuggire alla tua carica; non c'Ã¨ sangue nÃ© carne strappata, ma solo un coro di mugolii terrorizzati che viene brutalmente silenziato, mentre i corpi degli animali crollano l'uno dopo l'altro, deflagrando in una magnifica e fredda tempesta di poligoni azzurri e stringhe di dati fluttuanti.

[OGGETTO OTTENUTO: 5x Carne di Cervo Rovinata (Comune), 5x Pelle di Cervo Rovinata (Comune)]`,
    choices: [
      { id: 'back_caccia_cervi_7', label: 'Torna alla caccia', outcome: 'back', targetPage: 'caccia_cervi' },
    ],
  };

  // === PAGINA: Caccia ai conigli ===
  pages['caccia_conigli'] = {
    id: 'caccia_conigli',
    title: 'Caccia ai Conigli',
    zoneType: 'discovery',
    description: `Mentre avanzi con cautela lungo il sentiero appena abbozzato che serpeggia nel cuore della boscaglia, i tuoi sensi si abituano gradualmente ai rumori di questo finto ecosistema naturale; l'intrico di radici umide e fogliame basso offre infatti un riparo perfetto per la pacifica microfauna del piano. Di tanto in tanto, la tua attenzione viene catturata dal movimento guizzante di qualche piccolo bersaglio: un coniglio dal manto grigiastro o una lepre selvatica che balzella indisturbata tra le fronde, fermandosi fiduciosa a rosicchiare delle succulente bacche scarlatte cadute a terra. Il loro muso freme in modo fin troppo realistico, del tutto ignaro del pericolo, mentre un minuscolo cursore giallo lampeggia debolmente sopra le loro lunghe orecchie; si tratta di prede inoffensive, lente e sprovviste di qualsivoglia difesa, rappresentano un'ottima e ghiotta occasione per accumulare rapidamente preziosi drop di carne cruda con un singolo fendente, senza correre il minimo rischio.`,
    revisitDescription: `Ti addentri di nuovo lungo il sentiero nella boscaglia alla ricerca di conigli. L'intrico di radici umide e fogliame basso offre riparo alla pacifica microfauna del piano: conigli dal manto grigiastro e lepri selvatiche balzellano indisturbate tra le fronde, fermandosi a rosicchiare bacche scarlatte cadute a terra. Un minuscolo cursore giallo lampeggia sopra le loro lunghe orecchie — prede inoffensive, lente e sprovviste di difese.`,
    choices: [
      { id: 'lancia_coniglio', label: 'Lanciati verso un coniglio', outcome: 'combat', targetPage: 'lancia_coniglio' },
      { id: 'sword_skill_conigli', label: 'Usa una sword skill', outcome: 'custom', targetPage: 'sword_skill_conigli', locked: true, lockReason: 'Sistema Sword Skill non ancora implementato' },
      { id: 'back_varca_ponte_conigli', label: 'Torna indietro', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Lanciati verso un coniglio ===
  pages['lancia_coniglio'] = {
    id: 'lancia_coniglio',
    title: 'Coniglio Abbattuto',
    zoneType: 'combat',
    description: `Ti apposti silenziosamente tra le felci, calcolando con freddezza il momento perfetto per scivolare alle spalle del primo coniglio che si ferma a portata di tiro. Muovendo passi felpati per non far scricchiolare il fogliame del sottobosco, annulli gradualmente le distanze; non appena il piccolo bersaglio è a tiro, metti da parte ogni esitazione e fai scattare il polso, calando un fendente secco e spietato. La lama trancia l'aria con una rapidità invisibile, colpendo la creatura prima ancora che possa percepire la minaccia: in un battito di ciglia la sua forma si infrange silenziosamente, svanendo nell'aria per lasciare il posto a una pioggia scintillante di poligoni azzurri e frammenti di dati.

[OGGETTO OTTENUTO: 1x Carne Cruda di Coniglio, 1x Pelliccia di Coniglio, 1x Ossa Piccole di Animale]`,
    choices: [
      { id: 'back_caccia_conigli_1', label: 'Torna alla caccia', outcome: 'back', targetPage: 'caccia_conigli' },
      { id: 'back_varca_ponte_6', label: 'Torna al bosco', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Sword Skill - Conigli (placeholder) ===
  pages['sword_skill_conigli'] = {
    id: 'sword_skill_conigli',
    title: 'Sword Skill: Conigli',
    zoneType: 'combat',
    description: `[PLACEHOLDER — Sistema Sword Skill non ancora implementato. Quando sarÃ  disponibile, il giocatore potrÃ  scegliere quale Sword Skill usare spendendo i PA necessari.]

Rendendoti conto che avvicinarti silenziosamente a ogni singolo leporide richiederebbe troppa pazienza, decidi di affidarti all'assistenza del Sistema per massimizzare la caccia in un solo istante. Fissi lo sguardo su un piccolo gruppo di conigli ammassati attorno a un cespuglio di bacche; pieghi le ginocchia per abbassare il baricentro e arretri il braccio portando la lama quasi parallela al terreno, innescando l'immediata reazione del codice del NerveGear. L'arma inizia a vibrare con un ronzio sommesso, avvolgendosi rapidamente di una fredda e tagliente luce azzurra; non appena avverti la postura agganciarsi alla traiettoria perfetta, rilasci la tensione accumulata nei muscoli virtuali:
"[NOME SWORD SKILL]"
Il comando vocale spezza la quiete del sottobosco mentre il tuo avatar scatta in avanti a una velocità innaturale, trascinato dalla forza propulsiva della mossa speciale. La lama descrive un arco fulmineo e inesorabile a pelo d'erba, spazzando l'area prima ancora che i piccoli bersagli abbiano il tempo di drizzare le orecchie o tentare un balzo disperato verso la salvezza; il fendente netto falcia il gruppetto in un'unica, letale frazione di secondo, tramutando istantaneamente i corpi degli animali in una pioggia scintillante di poligoni blu e stringhe di dati che si disperde dolcemente, riempiendo il tuo inventario senza farti versare una singola goccia di sudore.

[OGGETTO OTTENUTO: 5x Carne Cruda di Coniglio, 5x Pelliccia di Coniglio, 5x Ossa Piccole di Animale]`,
    choices: [
      { id: 'back_caccia_conigli_2', label: 'Torna alla caccia', outcome: 'back', targetPage: 'caccia_conigli' },
    ],
  };

  // === PAGINA: Attacca le Vespe ===
  pages['attacca_vespe'] = {
    id: 'attacca_vespe',
    title: 'Combattimento: Vespe',
    zoneType: 'combat',
    description: `[PLACEHOLDER COMBATTIMENTO — il sistema di combat sarà implementato in futuro.]

Le vespe del bosco di Horunka sono note per attaccare in massa al minimo passo falso. Le loro dimensioni sono ben più grandi di quelle delle api comuni, e il loro pungiglione può infliggere status avvelenato. Sfrutta il terreno a tuo vantaggio e non farti circondare.`,
    choices: [
      { id: 'back_varca_ponte_vespe', label: 'Torna al bosco', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Segui la strada sterrata ===
  pages['segui_strada_sterrata'] = {
    id: 'segui_strada_sterrata',
    title: 'Strada Sterrata',
    zoneType: 'exploration',
    description: `[Questa zona sarà implementata in futuro. La strada sterrata si inoltra nel bosco di Horunka, verso zone più profonde e pericolose.]`,
    choices: [
      { id: 'back_varca_ponte_strada', label: 'Torna al bosco', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Addentrati nella boscaglia ===
  pages['addentrati_boscaglia'] = {
    id: 'addentrati_boscaglia',
    title: 'Boscaglia Profonda',
    zoneType: 'exploration',
    description: `Spinto dall'urgenza viscerale di salire di livello e dalla necessità disperata di un equipaggiamento in grado di garantirti la sopravvivenza, decidi di addentrarti nel cuore soffocante della boscaglia che si estende per chilometri in ogni direzione. Man mano che avanzi, le fronde secolari si intrecciano in una volta fittissima che strangola i raggi del sole; non regna un'oscurità totale, ma una penombra opprimente in cui il silenzio innaturale, spezzato solo dai fruscii predatori e dai ringhi lontani di bestie feroci, basterebbe a far scorrere un brivido freddo lungo la schiena anche allo spadaccino più solitario e temprato. Scrutando tra la vegetazione ostile, il tuo sguardo viene catturato da un'anomalia architettonica: seminascosta in lontananza, una lastra di pietra alta almeno tre metri si erge miracolosamente intatta, tenuta in ostaggio da un inestricabile e minaccioso groviglio di rovi spinosi. All'apparenza potrebbe sembrare un elemento decorativo di poco conto, ma la spietata logica di questo VRMMO ti ha già insegnato che nessun dettaglio viene mai lasciato al caso.

Spostando l'attenzione più vicino, sulla tua destra, un movimento furtivo attira i tuoi occhi: un branco di lupi dal folto manto grigio cenere pattuglia silenziosamente l'area, mettendo in mostra zanne e sguardi che tradiscono un'aggressività programmata e letale; per il momento non hanno ancora fiutato la tua presenza, offrendoti su un piatto d'argento un'ottima occasione per tendere un'imboscata e incamerare preziosi punti esperienza. Infine, esattamente dritto davanti a te, la fitta trama degli alberi si dirada per rivelare un massiccio ammasso di rovine di pietra antica; al centro di questo desolante cimitero di macerie troneggia una statua imponente, i cui lineamenti erosi risultano troppo sfocati dalla distanza per poterne decifrare la vera natura.`,
    revisitDescription: `Ti addentri di nuovo nel cuore soffocante della boscaglia. Le fronde secolari si intrecciano in una volta fittissima che strangola i raggi del sole, avvolgendoti in una penombra opprimente. Riconosci la lastra di pietra alta tre metri, ancora prigioniera del groviglio di rovi spinosi. Sulla destra, il branco di lupi dal manto grigio cenere pattuglia l'area come la volta precedente. Diritto davanti a te, le rovine di pietra antica con la loro statua imponente attendono ancora di essere esplorate.`,
    choices: [
      { id: 'fuoco_rovi', label: 'Dai fuoco ai rovi e libera la lastra di pietra [Pietra di fuoco x1 necessaria]', outcome: 'custom', targetPage: 'fuoco_rovi', locked: true, lockReason: 'Richiede Pietra di Fuoco x1 (inventario non ancora implementato)' },
      { id: 'attacca_lupi', label: 'Attacca il branco di lupi', outcome: 'combat', targetPage: 'attacca_lupi' },
      { id: 'ispeziona_rovine_statua', label: 'Ispeziona le rovine e avvicinati alla statua', outcome: 'progress', targetPage: 'ispeziona_rovine_statua' },
      { id: 'ispeziona_rovine_d10_choice', label: 'Ispeziona le rovine', outcome: 'custom', targetPage: 'ispeziona_rovine_d10' },
      { id: 'back_varca_ponte_boscaglia', label: 'Torna indietro', outcome: 'back', targetPage: 'varca_ponte' },
    ],
  };

  // === PAGINA: Dai fuoco ai rovi ===
  pages['fuoco_rovi'] = {
    id: 'fuoco_rovi',
    title: 'La Lastra di Pietra',
    zoneType: 'discovery',
    description: `Ti avvicini con estrema cautela alla lastra, calcolando ogni passo per evitare che il tuo avatar venga ferito dalla selva di rovi appuntiti che la avvolge in una morsa inestricabile; da una distanza ravvicinata, ti rendi subito conto che non si tratta di un banale blocco di pietra generato casualmente dal Sistema per riempire il paesaggio. Sulla fredda superficie vi è infatti incisa una complessa sequenza di caratteri, un messaggio criptico che fatichi a decifrare a causa delle fitte spine scure che ne oscurano i contorni. Senza esitare, richiami il menù olografico e selezioni una Pietra di Fuoco dal tuo inventario: l'oggetto si materializza istantaneamente nel palmo della tua mano, irradiando un piacevole e pulsante tepore. Fai qualche passo indietro per assicurarti un'angolazione perfetta e, presa la mira, scagli il proiettile incandescente dritto contro il cuore del groviglio; non appena l'artefatto entra in collisione con la pianta, un'esplosione di fiamme rossastre divampa con voracità innaturale, consumando i rovi in un batter d'occhio. Una densa colonna di fumo si innalza a spirale verso il finto cielo di Aincrad, mentre il fuoco si estingue altrettanto rapidamente in una pioggia di scintille e poligoni bruciacchiati, liberando definitivamente la superficie immacolata della grande lastra e permettendoti di leggere a chiare lettere ciò che vi è scolpito sopra. Con una rapidità consolidata dall'abitudine, apri il diario del tuo avatar e inizi a trascrivere meticolosamente ogni segno inciso sulla pietra, assicurandoti di non tralasciare alcuna sfumatura di quei caratteri arcaici; ti rendi subito conto che non si tratta di un semplice graffito, bensì di uno dei frammenti di lore sparsi tra i cento piani di Aincrad. Le leggende che circolano tra i corridoi sicuri delle città parlano chiaro: questi indizi criptici sono spesso il punto di partenza per missioni segrete o il filo conduttore per scovare tesori inestimabili, equipaggiamenti di rarità assoluta o materiali necessari per potenziare le armi oltre i limiti standard.

[FRAMMENTO DI LORE OTTENUTO: "Canto degli Elfi" — Parte 1 della Preghiera]
[aggiunto al Diario del giocatore]`,
    choices: [
      { id: 'back_boscaglia_fuoco', label: 'Torna alla boscaglia', outcome: 'back', targetPage: 'addentrati_boscaglia' },
    ],
  };

  // === PAGINA: Attacca il branco di lupi ===
  pages['attacca_lupi'] = {
    id: 'attacca_lupi',
    title: 'Combattimento: Lupi',
    zoneType: 'combat',
    description: `[PLACEHOLDER COMBATTIMENTO — il sistema di combat sarà implementato in futuro.]

Il branco di lupi dal manto grigio cenere è composto da 5 esemplari. Sono veloci e coordinati, tendono ad accerchiare la preda. Sfrutta il terreno e non farti mettere all'angolo. La loro ricompensa include carne di lupo, pelliccia di lupo e, raramente, zanne di lupo.`,
    choices: [
      { id: 'back_boscaglia_lupi', label: 'Torna alla boscaglia', outcome: 'back', targetPage: 'addentrati_boscaglia' },
    ],
  };

  // === PAGINA: Ispeziona le rovine - statua ===
  pages['ispeziona_rovine_statua'] = {
    id: 'ispeziona_rovine_statua',
    title: 'Le Rovine e la Statua',
    zoneType: 'discovery',
    description: `Chiunque verrebbe attirato da delle rovine antiche in un VRMMO e tu non sei da meno, nonostante questo sia un gioco mortale dove anche il più piccolo errore può portare alla fine di tutto quanto, non riesci a toglierti dalla testa che questo tipo di scoperte possono portare a vantaggi incredibili. Con passo leggermente nervoso ti avvicini e man mano che lo fai noti come un tempo, tutto questo doveva essere davvero maestoso e importante, cari simboli catturano la tua attenzione come anche varie cianfursaglie lasciate alla mercè del tempo, questo posto sembra decisamente più vecchio delle rovine dei piccoli villaggi che gli esseri umani hanno lasciato per andare a vivere nelle città. Ma la cosa che attira di più la tua attenzione è proprio la statua che si erge al centro di queste rovine, una figura femminile con le mani congiunte intenta a pregare si staglia davanti a te, le manca qualche pezzo come il naso, purtroppo il tempo non è stato favorevole con questa opera d’arte. Fai il giro per osservarla meglio e noti una cosa molto particolare, dietro non presenta una schiena come ci si aspetterebbe ma un'altra figura femminile, anche questa rovinata dal tempo e con le mani congiunte, un'unica statua che presenta due lati quasi identici, tutte e due caratterizzate da degli elementi in comune, come le orecchie a punta.`,
    revisitDescription: `Ti avvicini di nuovo alle rovine antiche. I simboli e le cianfrusaglie lasciate alla mercé del tempo catturano ancora la tua attenzione. La statua bifronte si erge al centro delle macerie come la volta precedente: due figure femminili con le mani congiunte in preghiera, entrambe caratterizzate da orecchie a punta, entrambe rovinate dal tempo — manca ancora il naso alla faccia frontale. Il mistero di questa effigie doppia continua a tormentarti.`,
    choices: [
      // Mostra solo se ha almeno una parte della preghiera (flag preghiera_parte_1 OR preghiera_parte_2 OR preghiera_parte_3)
      // Per ora non c'è sistema per ottenere le parti, quindi questa choice sarà nascosta
      {
        id: 'intona_preghiera_parte',
        label: 'Intona parte della preghiera',
        outcome: 'custom',
        targetPage: 'intona_preghiera_parte',
        showWhenFlag: 'ha_preghiera_parte',
      },
      // Mostra solo se ha tutte e 3 le parti della preghiera
      {
        id: 'intona_preghiera_completa',
        label: 'Intona la preghiera completa',
        outcome: 'custom',
        targetPage: 'intona_preghiera_completa',
        showWhenFlag: 'ha_preghiera_completa',
      },
      { id: 'ispeziona_rovine_d10_from_statua', label: 'Ispeziona le rovine', outcome: 'custom', targetPage: 'ispeziona_rovine_d10' },
      { id: 'back_boscaglia_statua', label: 'Torna indietro', outcome: 'back', targetPage: 'addentrati_boscaglia' },
    ],
  };

  // === PAGINA: Intona parte della preghiera (evoca golem) ===
  pages['intona_preghiera_parte'] = {
    id: 'intona_preghiera_parte',
    title: 'La Trappola del Sistema',
    zoneType: 'combat',
    description: `Schiarisci la voce e, richiamando alla memoria le criptiche parole incise sulla lastra di pietra, inizi a intonare i versi della sacra preghiera nel silenzio innaturale delle rovine; non fai in tempo a lasciar sfumare l'ultima sillaba che l'aria attorno a te si fa improvvisamente densa e carica di elettricità statica. Le orbite erose della statua bifronte si infiammano di un minaccioso bagliore scarlatto, proiettando due fasci di luce cremisi sulle macerie circostanti: il tuo canto non ha evocato una benevola benedizione divina, ma ha innescato una spietata trappola del Sistema. Il suolo trema con violenza sotto i tuoi stivali mentre, condensandosi da un turbolento vortice di poligoni violacei e dati di gioco, si erge la titanica figura di un golem guerriero; la mole della creatura è interamente incassata in una pesante armatura a piastre di un profondo blu scuro, dominata da un elmo massiccio che ne sigilla completamente il volto dietro una impenetrabile celata metallica. Con uno stridio meccanico che ti gela il sangue, il formidabile guardiano estrae un colossale spadone, sollevando la lama con una facilità innaturale per puntarla dritta verso il tuo petto.`,
    choices: [
      { id: 'combatti_golem', label: 'Combatti il Golem Guerriero', outcome: 'combat', targetPage: 'combatti_golem_placeholder' },
      { id: 'back_statua_preghiera', label: 'Torna indietro', outcome: 'back', targetPage: 'ispeziona_rovine_statua' },
    ],
  };

  // === PAGINA: Intona preghiera completa (apre dungeon) ===
  pages['intona_preghiera_completa'] = {
    id: 'intona_preghiera_completa',
    title: 'Il Santuario Segreto',
    zoneType: 'discovery',
    description: `Richiamando alla mente l'intera sequenza di parole trascritta dal frammento di lore, chiudi gli occhi e intoni la preghiera nella sua forma completa; la tua voce risuona ferma e solenne, riempiendo il silenzio sacrale delle rovine senza tralasciare una singola intonazione. Questa volta, l'antica effigie bifronte non attiva alcuna trappola mortale: una pacifica risonanza azzurra inizia a pulsare alla base del piedistallo, espandendosi in magici cerchi concentrici lungo il pavimento fino a investire il muro di pietra semi-crollato situato proprio alle spalle della statua. È in quel punto che il codice del Sistema si manifesta in tutta la sua potenza creatrice: l'aria vibra saturandosi di pura energia arcana mentre una fitta rete di stringhe luminose avvolge i detriti, sollevando i massi sbriciolati per fonderli e riplasmarli in una nuova, maestosa architettura. Sotto il tuo sguardo affascinato, i resti del muro si mutano in un imponente portone di roccia finemente scolpita; con un rombo sordo ed echeggiante che fa tremare il suolo, i pesanti battenti millenari ruotano lentamente sui cardini, spalancando le fauci buie di un passaggio sotterraneo. Un'allettante corrente di aria fredda risale dalle profondità, portando con sé l'odore di polvere e antichità: il santuario ha riconosciuto la tua devozione, svelandoti l'accesso a un dungeon segreto che attende solo di essere esplorato.`,
    choices: [
      { id: 'entra_dungeon', label: 'Entra nel dungeon segreto', outcome: 'progress', targetPage: 'dungeon_placeholder' },
      { id: 'back_statua_completa', label: 'Torna indietro (per ora)', outcome: 'back', targetPage: 'ispeziona_rovine_statua' },
    ],
  };

  // === PAGINA: Combatti Golem (placeholder) ===
  pages['combatti_golem_placeholder'] = {
    id: 'combatti_golem_placeholder',
    title: 'Combattimento: Golem Guerriero',
    zoneType: 'combat',
    description: `[PLACEHOLDER COMBATTIMENTO — il sistema di combat sarà implementato in futuro.]

Il Golem Guerriero è un nemico di alto livello per il primo piano. La sua armatura a piastre blu scuro lo rende resistente ai colpi fisici, e il suo spadone può infliggere danni devastanti. Tuttavia, le giunture dell'armatura potrebbero essere il suo punto debole.`,
    choices: [
      { id: 'back_preghiera_parte', label: 'Torna indietro', outcome: 'back', targetPage: 'intona_preghiera_parte' },
    ],
  };

  // === PAGINA: Dungeon segreto (placeholder) ===
  pages['dungeon_placeholder'] = {
    id: 'dungeon_placeholder',
    title: 'Dungeon Segreto',
    zoneType: 'exploration',
    description: `[Questo dungeon segreto sarà implementato in futuro. L'aria fredda che risale dalle profondità porta con sé l'odore di polvere e antichità. Una scalinata di pietra scompare nell'oscurità, promettendo tesori e pericoli sconosciuti.]`,
    choices: [
      { id: 'back_statua_dungeon', label: 'Torna alle rovine', outcome: 'back', targetPage: 'ispeziona_rovine_statua' },
    ],
  };

  // === PAGINA: Ispeziona le rovine (D10) ===
  pages['ispeziona_rovine_d10'] = {
    id: 'ispeziona_rovine_d10',
    title: 'Ispezione Rovine',
    zoneType: 'discovery',
    description: `Ignorando la zona centrale del piazzale, decidi di dedicare la tua totale attenzione alla periferia di queste antiche rovine, spinto dalla necessità vitale di accumulare risorse in un mondo dove un singolo pezzo di equipaggiamento può fare la differenza tra la vita e la morte. Inizi la tua meticolosa ispezione calandoti tra i resti di quelli che un tempo dovevano essere possenti colonnati e mura perimetrali; le tue mani saggiano la ruvidezza dei blocchi di pietra sgretolati, spostando con fatica cumuli di macerie, lastre crollate e detriti coperti da uno spesso strato di muschio umido. Ti accovacci per scrutare nelle fessure più buie alla base dei muri diroccati, frugando tra grovigli di radici affioranti e scostando cumuli di foglie secche e terriccio, mantenendo sempre i sensi all'erta per scongiurare eventuali agguati. La ricerca è estenuante ma richiede metodo: rovesci vecchie anfore spaccate sperando di sentir tintinnare qualche moneta di Col o materiali da crafting, sradichi erbacce ostinate che ostruiscono anfratti sospetti e passi i guanti lungo le giunture della pavimentazione, cercando ossessivamente quella debole luminescenza azzurra che il Sistema utilizza per segnalare gli oggetti raccoglibili. Ogni singolo cumulo di roccia viene setacciato, scalfito e ribaltato con la speranza di scovare uno scrigno logoro, un'arma dimenticata o anche solo un frammento minerale raro da aggiungere al tuo inventario, trasformando questa faticosa perlustrazione in una vera e propria caccia al tesoro tra le macerie di un'architettura perduta.`,
    revisitDescription: `Ti rimetti a setacciare la periferia delle rovine con la stessa meticolosità di prima. Le tue mani saggiano ancora la ruvidezza dei blocchi di pietra sgretolati, sposti cumuli di macerie e rovesci anfore spaccate, scruti nelle fessure buie alla base dei muri diroccati e frughi tra grovigli di radici affioranti. La caccia al tesoro tra le macerie dell'architettura perduta continua, ostinata.`,
    choices: [
      {
        id: 'roll_d10_rovine',
        label: 'Tira 1D10',
        outcome: 'custom',
        diceRoll: {
          sides: 10,
          outcomes: [
            { min: 1, max: 1, targetPage: 'rovine_d10_col', setsFlags: ['rovine_d10_1'] },
            { min: 2, max: 5, targetPage: 'rovine_d10_teletrasporto', setsFlags: ['rovine_d10_2_5'] },
            { min: 6, max: 8, targetPage: 'rovine_d10_pozione', setsFlags: ['rovine_d10_6_8'] },
            { min: 9, max: 9, targetPage: 'rovine_d10_ferro', setsFlags: ['rovine_d10_9'] },
            { min: 10, max: 10, targetPage: 'rovine_d10_acciaio', setsFlags: ['rovine_d10_10'] },
          ],
        },
        hideWhenAllFlags: ['rovine_d10_1', 'rovine_d10_2_5', 'rovine_d10_6_8', 'rovine_d10_9', 'rovine_d10_10'],
      },
      { id: 'back_boscaglia_d10', label: 'Torna alla boscaglia', outcome: 'back', targetPage: 'addentrati_boscaglia' },
    ],
  };

  // === PAGINE RISULTATO D10 rovine ===
  pages['rovine_d10_col'] = {
    id: 'rovine_d10_col',
    title: 'Trovato: 200 Col',
    zoneType: 'discovery',
    description: `In un'intercapedine tra due lastre di pavimentazione, le tue dita sfiorano il freddo luccichio di alcune monete di Col. Le raccogli con un mezzo sorriso — non è una fortuna, ma sempre meglio di niente.

[OGGETTO OTTENUTO: 200 Col]`,
    choices: [
      { id: 'back_rovine_d10_col', label: 'Continua a ispezionare', outcome: 'back', targetPage: 'ispeziona_rovine_d10' },
      { id: 'back_boscaglia_d10_col', label: 'Torna alla boscaglia', outcome: 'back', targetPage: 'addentrati_boscaglia' },
    ],
  };

  pages['rovine_d10_teletrasporto'] = {
    id: 'rovine_d10_teletrasporto',
    title: 'Trovato: Cristallo del Teletrasporto',
    zoneType: 'discovery',
    description: `Spostando un cumulo di detriti, noti un bagliore azzurro pulsante: è un Cristallo del Teletrasporto, un oggetto di valore inestimabile che permette di tornare istantaneamente alla città più vicica. Lo riponi con cura nella borsa — potrebbe salvarti la vita un giorno.

[OGGETTO OTTENUTO: Cristallo del Teletrasporto x1]`,
    choices: [
      { id: 'back_rovine_d10_teletrasporto', label: 'Continua a ispezionare', outcome: 'back', targetPage: 'ispeziona_rovine_d10' },
      { id: 'back_boscaglia_d10_teletrasporto', label: 'Torna alla boscaglia', outcome: 'back', targetPage: 'addentrati_boscaglia' },
    ],
  };

  pages['rovine_d10_pozione'] = {
    id: 'rovine_d10_pozione',
    title: 'Trovato: Pozione Curativa Minore',
    zoneType: 'discovery',
    description: `Tra i resti di un'anfora spaccata, trovi una fiala di vetro intatta contenente un liquido rossastro. È una Pozione Curativa Minore — utile per ripristinare un po' di HP in combattimento. La infili con cura nella borsa.

[OGGETTO OTTENUTO: Pozione Curativa Minore x1]`,
    choices: [
      { id: 'back_rovine_d10_pozione', label: 'Continua a ispezionare', outcome: 'back', targetPage: 'ispeziona_rovine_d10' },
      { id: 'back_boscaglia_d10_pozione', label: 'Torna alla boscaglia', outcome: 'back', targetPage: 'addentrati_boscaglia' },
    ],
  };

  pages['rovine_d10_ferro'] = {
    id: 'rovine_d10_ferro',
    title: 'Trovato: Lingotto di Ferro',
    zoneType: 'discovery',
    description: `Sotto una lastra di pietra ribaltata, scorgi il luccichio metallico di un lingotto di ferro. Un materiale da crafting fondamentale per forgia e riparazioni. Lo riponi nella borsa con soddisfazione.

[OGGETTO OTTENUTO: Lingotto di Ferro x1]`,
    choices: [
      { id: 'back_rovine_d10_ferro', label: 'Continua a ispezionare', outcome: 'back', targetPage: 'ispeziona_rovine_d10' },
      { id: 'back_boscaglia_d10_ferro', label: 'Torna alla boscaglia', outcome: 'back', targetPage: 'addentrati_boscaglia' },
    ],
  };

  pages['rovine_d10_acciaio'] = {
    id: 'rovine_d10_acciaio',
    title: 'Trovato: Acciaio Elfico Grezzo',
    zoneType: 'discovery',
    description: `In un anfratto nascosto tra le radici di un albero antico, le tue dita si chiudono su un materiale freddo e sorprendentemente leggero. È Acciaio Elfico Grezzo — un materiale raro e prezioso, capace di essere forgiato in armi e armature di qualità superiore. Un ritrovamento fortunato che potrebbe farti guadagnare un bel po' di Col al mercato, o essere usato per creare equipaggiamento di alto livello.

[OGGETTO OTTENUTO: Acciaio Elfico Grezzo x1 (Raro)]`,
    choices: [
      { id: 'back_rovine_d10_acciaio', label: 'Continua a ispezionare', outcome: 'back', targetPage: 'ispeziona_rovine_d10' },
      { id: 'back_boscaglia_d10_acciaio', label: 'Torna alla boscaglia', outcome: 'back', targetPage: 'addentrati_boscaglia' },
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
