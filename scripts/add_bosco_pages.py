#!/usr/bin/env python3
"""Aggiunge le pagine del bosco (Horunka) al file sao-gamebook-types.ts"""
import re

FILE_PATH = '/home/z/my-project/src/lib/sao-gamebook-types.ts'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Le nuove pagine da inserire prima di "  return {"
new_pages = r'''
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

[OGGETTO OTTENUTO: 1x Carne di Cervo Rovinata (Comune), 1x Pelle di Cervo Rovinata (Comune)]
[Nota: con Skill Analisi liv.1 otterresti Carne di Cervo (Non Comune) e Pelle di Cervo (Non Comune); con Analisi liv.2 otterresti Carne di Cervo Pregiata (Raro) e Pelle di Cervo Perfetta (Raro)]`,
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

[OGGETTO OTTENUTO: 2x Carne di Cervo Rovinata (Comune), 2x Pelle di Cervo Rovinata (Comune)]
[Nota: con Skill Analisi liv.1 otterresti 2x Carne di Cervo (Non Comune) e 2x Pelle di Cervo (Non Comune); con Analisi liv.2 otterresti 2x Carne di Cervo Pregiata (Raro) e 2x Pelle di Cervo Perfetta (Raro)]`,
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

[OGGETTO OTTENUTO: 5x Carne di Cervo Rovinata (Comune), 5x Pelle di Cervo Rovinata (Comune)]
[Nota: con Skill Analisi liv.1 otterresti 5x Carne di Cervo (Non Comune) e 5x Pelle di Cervo (Non Comune); con Analisi liv.2 otterresti 5x Carne di Cervo Pregiata (Raro) e 5x Pelle di Cervo Perfetta (Raro)]`,
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

'''

# Inserisci prima di "  return {"
marker = "  return {"
idx = content.find(marker)
if idx == -1:
    print("ERRORE: marker 'return {' non trovato")
    exit(1)

new_content = content[:idx] + new_pages + "\n" + content[idx:]

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Pagine del bosco aggiunte con successo!")
print(f"File aggiornato: {FILE_PATH}")
