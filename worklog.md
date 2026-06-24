---
Task ID: SAO-LOGIN-CREATION
Agent: Super Z (main)
Task: Creare web app RPG a turni per Sword Art Online — fase 1: Login + Creazione Personaggio. Usare React Three Fiber per luci/ombre 3D, hover sulle card, background particellare. Solo asset dai repo GitHub forniti dall'utente.

Work Log:
- Clonati i due repository: asset-gioco-di-SAO (SVG/PNG) e Progetto-SAO (audio WAV + asset Qt)
- Esplorati tutti gli asset disponibili:
  * SVG: SAO_Login_UI_Transparent.svg, SAO_Login_Tech-Circle_v1.000.svg, SAO_Nervegear.svg, SAO_Man.svg, SAO_Woman.svg, Finestra notifiche SAO (window + pulsanti), SAO_HEX (Warning, Immortal Object, You are dead), Pezzi barra HP/Mana/Energia
  * PNG: Equipment Icons (spada, pugnale, arco, due lame, spada fina, mazza, ecc.), Icone statistiche (Forza, Vita, Agilità, Destrezza, Intelligenza, Mente, Resistenza), Backgrounds (Aincrad, City of Beginnings, Background UI)
  * Audio (16+ file WAV): Startup.SAO.NerveGear, LinkStart.SAO.Kirito/Asuna, Ready.SAO.Welcome, Feedback.SAO.Click, Notify.SAO.Alert/System/Warning/Present/Message, Popup.SAO.Menu/Panel/Message/Launcher, Dismiss.SAO.Launcher/Message, ProgramStart, ProgramReady, Credits
- Inizializzato ambiente fullstack Next.js 16 con TypeScript, Tailwind CSS 4, shadcn/ui
- Installato three@0.184.0 + @react-three/fiber@9.6.1 + @react-three/drei@10.7.7 + @types/three
- Copiati tutti gli asset rilevanti in /public/sao/ organizzati per categoria (login, characters, equipment, stats, window, hex, backgrounds, bars, audio)
- Creato hook useSaoSound (src/hooks/useSaoSound.ts) — cache audio + clone per playback sovrapposto + gestione autoplay bloccato
- Creato src/lib/sao-data.ts con 6 classi personaggio coerenti con lore SAO (Spadaccino, Ladro d'Ombre, Due Lame, Spadaccino Fino, Arciere, Paladino) e 7 statistiche
- Creato ParticleBackground.tsx (R3F):
  * 1500 particelle in volume 3D con shader custom (glow + twinkle)
  * 2 point lights che seguono il mouse (cyan + bianco)
  * Repulsione particelle vicino al cursore
  * Parallax rotazione campo
  * Spotlight boost da UI hover
  * Lazy DPR per mobile
- Creato LoginScreen.tsx:
  * SAO_Login_UI_Transparent.svg come pannello centrale (1920x1080 viewBox)
  * Tech-Circle rotante in background
  * NerveGear badge in alto
  * Input username/password sovrapposti esattamente alle aree del SVG
  * Pulsante "Link Start" con glow cyan
  * Boot sequence: NerveGear startup sound + welcome
- Creato CharacterCreation.tsx:
  * Step 1: scelta genere (card SAO_Man / SAO_Woman) con tilt 3D + spotlight che segue il cursore
  * Step 2: scelta classe (6 card con icone equipment) — pill statistiche primarie
  * Step 3: riepilogo con preview personaggio, input nome, griglia stats con barre
  * Card3D componente riutilizzabile: perspective + rotateX/Y + radial gradient spotlight
- Creato page.tsx con state machine: login → linkstart (transizione flash) → creation → entering (splash Aincrad)
- Aggiornato layout.tsx con metadata SAO (titolo, favicon NerveGear, lang="it")
- Corretti errori lint:
  * Aggiunto sao-assets a eslintignore
  * Refactor ParticleBackground: ref per shaderMaterial (regola immutability hook) + lazy useState per dpr
  * Rimosse direttive eslint-disable inutilizzate
- Verifica con Agent Browser:
  * Pagina login renderizza correttamente (NerveGear + titolo + Tech-Circle rotante + pannello + input)
  * Compilazione credenziali + click "Link Start" → transizione LinkStart → schermata creazione
  * Schermata genere: 2 card (UOMO/DONNA) con SVG personaggi
  * Click UOMO → schermata classe: 6 card (Spadaccino, Ladro d'Ombre, Due Lame, Spadaccino Fino, Arciere, Paladino)
  * Click Due Lame → schermata riepilogo con stats grid + input nome
  * Inserito nome "Kirito" + click "ENTRA AD AINCRAD" → splash finale
  * Test viewport mobile 390x844 OK
  * Nessun errore console/page; solo warning deprecation THREE.Clock (non bloccante)

Stage Summary:
- App Next.js 16 funzionante su http://localhost:3000
- File creati:
  * src/app/page.tsx (orchestrazione stage + transizioni)
  * src/app/layout.tsx (metadata SAO)
  * src/components/sao/ParticleBackground.tsx (R3F particle field + luci 3D)
  * src/components/sao/LoginScreen.tsx (login UI con asset SVG originali)
  * src/components/sao/CharacterCreation.tsx (3-step flow con card 3D)
  * src/hooks/useSaoSound.ts (audio manager)
  * src/lib/sao-data.ts (classi/stat personaggio)
- Asset copiati in /public/sao/: login (7 file), characters (3), equipment (24), stats (14), window (7), hex (7+), backgrounds (3), bars (4), audio (32 file WAV)
- Screenshot salvati in /home/z/my-project/download/: sao-login-01/02/03, sao-creation-01/02/03/04/05, sao-login-mobile
- Tutti gli asset visivi e audio provengono ESCLUSIVAMENTE dai due repo GitHub forniti; nessuna grafica creata da zero
- Scope rispettato: solo Login → Creazione Personaggio (no combat, no world, no HUD di gioco)
