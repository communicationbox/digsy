# Digsy World — brief di progetto

> Questo file viene letto automaticamente da Claude Code come memoria del progetto.
> Riassume cos'è il gioco, cosa è già stato costruito e quali sono i prossimi passi.

## Cos'è
**Digsy World** è un cozy game 2D dall'alto (top-down), in stile pixel-art SNES.
Il giocatore è **Digsy**, un piccolo archeologo che esplora un mondo, scava reperti di
creature estinte (di fantasia), li fa identificare, li vende/dona, assembla **chimere**
e le fa rivivere in un **parco**.
Tono: rilassato, di scoperta, senza stress, niente game over.

- Nome del gioco: **Digsy World**
- **Digsy = il personaggio** (mascotte). Le città hanno nomi propri (NON chiamare una città "Digsy").
- Palette e mood: pixel-art "16-bit morbido" (tipo SNES), colori caldi/pastello.

## Struttura del progetto (Vite + ES modules, zero dipendenze runtime)
```
index.html          markup (canvas, HUD, modale, splash, touch)
src/style.css       tutti gli stili (HUD, modale, splash, editor)
src/data.js         SPECIES/PARTS/RAR, biomi, spColor, costi, LOOKS/HAIR_*, DEFAULT_LOOK, TS
src/noise.js        SEED, vhash/smooth/fbm (value-noise deterministico)
src/state.js        S (+fresh/save/load/initState), dugSet, P (player), cam
src/screen.js       canvas, ctx, view{K,W,H,VW,VH}, fit() fullscreen a scala intera
src/world.js        terreni, decorazioni, città (TCELL, TOWN_SIZES, townInfo, parco), findStart
src/sprites.js      PAL mutabile, shade/applyLook, SPR (fronte/retro/profilo), HAIRS, blit/drawHero
src/park.js         sim chimere nel recinto (parks Map, refreshVisParks/updatePark)
src/compass.js      città più vicina, octant, updateCompass (HUD + toast benvenuto)
src/gameplay.js     tryDig/economia/chimere (chimeraName/assembleChimera), collide, act
src/brush.js        primitive di disegno (snap/px/rect/shadow/shade8, BRUSH)
src/tiles.js        palette stagionali/bioma, BIOME_BUILD/INT_WOOD, soilDetail, groundTile
src/props.js        alberi, sassi, fiori, funghi, oggetti a terra, decorazioni di bioma
src/interiors.js    le 6 stanze a tema, galleria del museo, NPC (npcPose/drawNpc)
src/render.js       composizione della scena: entità, player, veicoli, scavo, bussola, loop
src/voxview.js      projectVox: proiezione 2D di un modello voxel su canvas
src/bookui.js       Libro dei Fossili (pagine, 3D/2D, descFor, finestre di presenza)
src/mapui.js        mappa del mondo (pergamena, zoom, punti d'interesse)
src/prefs.js        preferenze del giocatore FUORI dal salvataggio (suggerimenti, comandi, mano)
src/tapmove.js      "tocca dove andare": meta, cammino, arrivo
src/path.js         A* su caselle (aggira gli ostacoli, tetto 40 caselle)
src/fuse.js         fusione dei doppioni (3 uguali → 1 di rarità superiore)
src/lang/ru.js      dizionario russo (chiave = stringa inglese)
src/prepui.js       tavolo di preparazione (overlay); logica in prepare.js
src/prepare.js      crosta/spazzola/gradi (puro, testabile)
src/commission.js   commissione del Museo a 3 giorni (puro, testabile)
src/ui.js           toast/HUD/prompt, modale, Lab/Negozio/Museo/Locanda/Barbiere/Sartoria, zaino, editor
src/splash.js       splash screen (splashActive/initSplash)
src/input.js        tastiera + touch
src/main.js         boot (migrazione save, flow splash→editor→gioco) + game loop
tests/              suite Node con stub DOM (stub.mjs, run.mjs)
legacy/             vecchio prototipo single-file (riferimento)
```
Attenzione ai cicli import ui↔gameplay: sono ok solo perché le chiamate incrociate
avvengono a runtime dentro le funzioni, mai a top-level.

## Come far girare / testare
- `npm install` (solo la prima volta), poi `npm run dev` → http://localhost:5173
- `npm run build` → `dist/` statico; `npm run preview` per provarlo.
- `npm run stress` → limiti veri (mappa, scavi, salvataggio, creature, distanza dall'origine).
  In gioco: comando `stress=1..5` per caricare il gioco sul dispositivo e misurare gli fps.
- `npm run cov` → copertura per modulo (V8, zero dipendenze); `--gate` fallisce sotto soglia.
- `npm test` → suite Node senza browser (stub DOM in `tests/stub.mjs`): mondo/città,
  bussola, chimere/parco, sprite/look, smoke UI e render. Tenerla verde e **aggiornarla
  a ogni feature**.
- Il doppio clic su `index.html` NON funziona più (ES modules); serve il dev server.

## Meccaniche implementate
- **Mondo procedurale infinito** deterministico (value-noise + fbm, seed salvato).
  Terreni: acqua profonda/acqua/sabbia/prato/foresta/terra/montagna + pavimenti città/parco.
- **Scava ovunque** con rese per terreno (sabbia .62 / prato .30 / foresta .43 / terra .52);
  caselle esauribili (`dugSet` salvato). Reperti grezzi → **Laboratorio** identifica → codex.
  **Scavo animato** (~0.5s, `P.digging` + `beginDig/stepDig` nel loop): piccone alzato/colpo,
  terra che schizza, movimento bloccato, esito alla risoluzione (vale anche per i siti).
- **Negozio**: vendi reperti; **ristoro** 15🪙 → va nello ZAINO (`S.snacks`, +15⚡ quando lo usi);
  **mappe del tesoro** (raro 🪙40 / eccezionale 🪙130 / leggendario 🪙480, `MAP_COST/MAP_DIST`):
  X scavabile lontana (più raro = più lontano), reperto GARANTITO di quella rarità, X rossa
  disegnata a terra (`drawXmark`), mappa consumata allo scavo. **Locanda** (dormi → alba, +1 giorno).
- **Zaino (I o Z) = OVERLAY a forma di zaino** da escursione 8-bit (teal/arancio, patta
  aperta col rombo, `#bagov/#bagbox`, ESC/✕/fuori per chiudere, `isBagOpen/closeBag`):
  bocca scura con gli slot dei reperti (miniature = **proiezione 2D del VERO pezzo voxel**,
  `partVoxels`+`projectVox`/`hydratePv`, canvas `.pv` — anche in negozio), tasca frontale
  per ristori (click = usa), DNA, attrezzi, **mappe cliccabili** → bussola HUD e freccia
  a bordo schermo (ROSSA) seguono la X (`S.trackMap`, `trackedMap()`, riclick = città).
- **Attrezzi** (Negozio, `TOOL_COST` 60/120/150/400, `buyTool`): **pala fortunata** 🪏
  (S.shovel, 60 cariche, drop ×1.6 cap .95), **accetta** 🪓 (E davanti a un albero →
  `tryChop`, CHOPPABLE, `S.chopped/choppedSet`), **piccone** ⛏️ (massi/guglie, `tryMine`,
  MINEABLE, `S.mined`), **barca** ⛵ (mai si rompe: sull'acqua — anche gelata — spawna da
  sola, `onBoat()`, collide passa su WATER/DEEP, sprite barca con bob+scia, niente camminata;
  **E sull'acqua = PESCA** `tryFish` con lenza/galleggiante).
- **Fonti dei fossili** (`sp.src` in data.js): per zona 1 raro vive negli ALBERI, 1 raro in
  ACQUA, 1 eccezionale nelle ROCCE — lo scavo a terra li ESCLUDE (`makeRaw(zone,dist,rar,src)`,
  siti/fontana/mappe = 'any'); il **Libro indica la fonte** nella riga meta (accetta/piccone/
  barca). Nel Libro gli scheletri sono **OSCURATI**: si accendono solo i pezzi consegnati al
  museo (tag `v.p` per parte in bones.js, `lit` in projectVox/mountSkeleton; VIVO = completo).
- **Cutscene libro al museo**: prima volta in un museo di bioma nuovo → player bloccato, il
  Curatore esce dal banco (destra poi giù, waypoint `CUT`), consegna il Libro (animazione:
  libro che sale con scintille) + **banner centrale** (`showBanner`), poi torna al banco.
  NPC/player/banco ordinati per y (niente sovrapposizioni). Museo = edificio **5×2 con
  frontone e 6 colonne elleniche**; ogni edificio ha sagoma sua (tenda a strisce, palo del
  barbiere, torretta del lab, locanda a 2 piani, vetrina della sartoria).
- **Fontana**: max 10 lanci per città (`S.fountains[key]={n,d0}`), poi riposa e si ricarica
  dopo 10 giorni. **Identificazione al MUSEO** (non più al Lab): il Lab tiene chimere+risveglio.
- **Città procedurali** in celle `TCELL=40` (prob 0.45), nomi propri tema terra/ossa (`townName`).
  Taglie: **borgo** (Lab+Negozio), **paese** (+Locanda+**Barbiere**), **città**
  (6 edifici: +Museo+**Sartoria**, piazza larga 23, + **parco recintato**). Piazze SPAZIOSE
  (file di case distanti 5+ tile) con **strade sterrate** (`town.roads` Set, tile `ROAD`):
  vialetto porta→strada per ogni casa, strada orizzontale davanti a ogni fila, viale centrale
  x=C.x sempre libero (fila bassa città sfalsata apposta) che scende fino al cancello del parco.
  Niente arredo sulle strade (`forb`). Città+parco SEMPRE dentro la propria cella (jy 8..27).
  Sotto gli edifici: lastricato, mai erba, e non ci si scava (`tryDig` rifiuta ogni townInfo).
  `exitInterior` cerca la prima tile LIBERA davanti alla porta (niente compenetrazioni).
- **Barbiere** 💈 / **Sartoria** 👕: **prova LIBERA + Conferma** (`beginLook/confirmLook/
  revertLook`, `lookPaidFields`): provi quanto vuoi gratis, paghi 🪙8 solo per i campi
  cambiati alla conferma; Annulla/chiudi ripristina. **Cosmetici TEMATICI per zona**
  (`ZONE_COSMETICS`, `THEMED_HAIR/THEMED_HAT`): ogni zona ha 1 taglio + 1 cappello esclusivi
  (Boccaglio in palude, Colbacco nelle Lande Gelide, Coroncina nei Prati, Elmetto nelle Terre,
  Cappuccio nei Boschi, Bandana nelle Dune, tagli Germogli/Duna/Boschivo/Fiamma/Alghe/Gelo)
  **scopribili solo nel negozio di QUELLA zona** (`discoverBox`, costo ×3, `unlockCosmetic`,
  `S.unlocked{hats,hairs}`); una volta sbloccati sono scegliibili ovunque (`hairStylesAvail/
  hatStylesAvail`). Sprite in HAIRS/HATS (righe 16, fronte/retro simmetriche, HAT_CROWN).
- **Barbiere** 💈: 6 tagli base × 12 colori (anteprima senza cappello).
- **Sartoria** 👕 (solo città): 3 forme di cappello (Esploratore/Berretto/Cuffia, `HAT_STYLES`
  + overlay `HATS[forma]`), colori, maglia/pantaloni 🪙8; ultimo quadratino ✕ = **senza
  cappello, gratis** (`S.look.hatStyle='none'`; scegliere un colore lo rimette).
- **Chimere**: al Lab, Cranio+Torace+Zampa identificati +🪙40 → creatura con nome portmanteau
  ("Gastrodonte"), rarità = max parti; salvate in `S.creatures`; passeggiano in ogni parco.
- **Bussola** HUD 🧭 (nome + freccia 8-dir + passi) + freccia gialla a bordo schermo.
- **Splash = schermo titolo con menu**: ▶ Continua/Gioca, 💾 Carica partita (lista slot con
  conferma), 🌱 Nuova partita (con conferma). Load/Nuova → reload con skip una-tantum della
  splash (`sessionStorage digsy_skipsplash`). In dev la splash si salta (`?splash` la forza,
  `?nosplash` la salta in prod). Prima partita: **editor personaggio** (gratis, `S.lookDone`).
- **HUD leggibile**: etichette testuali (`.lbl`, nascoste <760px), energia mostrata come
  `corrente/max`, tooltip `title` su ogni tag, **orologio HH:MM** nel tag giorno (alba=06:00).
- **Sprite a layer**: corpo a testa nuda → capelli (`HAIRS`) → cappello (`HATS`, overlay
  removibile); profilo dedicato (occhio singolo, falcata), retro con zaino; `S.look` pilota
  la palette via `applyLook`.
- **Fullscreen responsive** a scala intera K 2–6 (~13 tile sull'asse corto → ok portrait
  mobile); camera ancorata alla griglia dei pixel fisici (passi 1/K → scroll fluido);
  fase di stelline/fiori legata alle coordinate tile (niente sfarfallio in camminata).
- **Mobile**: d-pad+A grandi con `env(safe-area-inset)`, HUD `clamp(14–18px)`, tap target
  maggiorati con `@media(pointer:coarse)`.
- **Salvataggio** automatico in `localStorage` (chiave `ossa_world_pixel_v1`); al boot i save
  con layout città cambiato vengono riposizionati con `findStart()` se dentro un solido.
- **Splash = titolo E menu pausa** (ESC o ☰ riaprono la splash; ESC di nuovo riprende).
  Sottomenu: **💾 Partite** (3 slot Salva/Carica con conferma, `saveToSlot/loadFromSlot/
  slotInfo`, chiavi `_slotN`; 🌱 Nuova partita) e **🎵 Audio**. ESC nei sottomenu = indietro.
  Carica/Nuova → `location.reload()` con skip una-tantum (le cache mondo dipendono dal seed).
  `view/pause/inGameMode` in splash.js; il vecchio menu modale è stato rimosso.
- **Audio** (`audio.js`): musica chiptune PROCEDURALE WebAudio (lead square + basso triangle,
  pentatonica, zero asset), parte al primo gesto (dismiss splash). Impostazioni persistite in
  localStorage `digsy_audio` (music/vol/sfx/sfxVol) fuori dal save. **SFX predisposti**
  (`playSfx('click'|'dig'|'coin'|'found')`) con settaggi già nel menu — da agganciare al gameplay.

- **Texture con random deterministico** (`vhash` per tile): erba a 3 toni con ciuffi/fiorellini/
  sassolini, lastricato piazza a mattoni sfalsati con crepe, parco con margherite; case con tono
  muro/camino/fioriere variabili per edificio, **jitter ±1** sulla posizione (fila bassa solo
  verso l'alto: porte mai bloccate) e **insegna pixel sopra la porta** per tipo
  (`drawSign/drawSignIcon`: moneta/fiala/osso/luna/palo barbiere/maglietta).
- **Arredo urbano** (`town.decos`, scala con la taglia; filtro `forb` evita porte/cancello/bordi):
  panchine, cespugli, **lampioni** (solo città, accesi di notte con alone), **fontana 2×2 con
  acqua animata** (paesi+città). **Monetina nella fontana** (E vicino alla vasca, 1🪙):
  55% nulla / 30% comune / 10% raro / 4% eccezionale / 1% leggendario → reperto identificato.
- **Giorno/notte + stagioni** (`daynight.js`): giorno = 20 min reali (`DAY_LEN=1200`, `S.tod`
  0..1, avanza solo fuori da modali/splash; la Locanda porta all'alba). Notte: oscurità a
  scalini per tile con **cono di luce 8-bit** attorno al player, finestre e lampioni accesi.
  Stagioni da 3 giorni (🌸☀️🍂❄️): palette stagionali per erba/foresta/alberi (inverno innevato).
  Icona stagione+notte nel tag giorno dell'HUD. La notte fuori dalla luce è **quasi nera**
  (0.96); le città restano illuminate con **alone graduale** attorno (falloff 5 tile sul
  rettangolo città+parco, `townForTile` nel pass notte).

- **Zone endemiche** (`regions.js`): 6 tipi stile Minecraft (Prati Dorati 🌾, Dune Ossee 🏜️,
  Boschi Cinerei 🌲, Terre Rosse ⛰️, Palude Antica 🐸, Lande Gelide 🧊) da noise a bassa
  frequenza, cache per blocchi 4×4; tag HUD 🌍 + toast d'ingresso. Confini **domain-warped**
  (serpeggiano, mai a righello) con dithering leggero; **coerenza climatica**: temperatura in
  3 fasce (freddo Lande/Boschi · temperato Prati/Palude · caldo Terre/Dune, tabella `BAND`)
  → Lande Gelide e Terre Rosse non si toccano mai (test: 0 violazioni + niente confini dritti).
- **60 specie** (10 per zona: 4 comuni/3 rare/2 eccezionali/1 LEGGENDARIA, `zonePools`);
  la rarità dell'oggetto = rarità intrinseca della specie. **Gradiente distanza** (`rarWeights`):
  lontano dall'origine → più rari/leggendari e valori più alti. `spColor` generato (hue aureo).
- **Libro dei Fossili** (tasto **L**, o da zaino/Lab/Museo): overlay grande a tutta scheda
  (`#bookov`, copertina in pelle, 2 pagine, frecce ‹›/←/→). Per pagina: **scheletro voxel 3D
  rotante** sopra, nome, **descrizione generata** dalle caratteristiche (`descFor`), zona di
  ritrovamento, quanti reperti possiedi, donato ✓. Il **Museo indicizza** la sua zona
  (`S.book[zoneId]` → silhouette scura + "? ? ?"), **identificare completa** la pagina.
- **Scheletri voxel 3D** (Three.js, unica dipendenza runtime, **lazy-load** al primo uso —
  chunk separato ~130KB gz): `bones.js` = logica PURA testabile (voxel, socket, `LIMITS`:
  max 3 teste/1 petto/6 braccia/4 gambe/3 code, 1-2 corni per testa; base = 1/1/2/2/1;
  arti = ossa/pinne/ALI per specie; `baseSpec/clampSpec/buildVoxels`); `skeleton3d.js` =
  wrapper Three (render lowres pixelato = 3D 8-bit, InstancedMesh, ortho camera, spin,
  **drag per ruotare**, spin riprende dopo 2s; span minimo fisso → la taglia si legge).
  **BLUEPRINT CURATI A MANO** (`BP` in bones.js, uno per specie — 60/60 scheletri unici,
  test): ricetta {seg (segmenti corpo, formiche/vespe/millepiedi), legs [n 0-10, lunghezza],
  wings [n, membrana|piume|insetto], head 0-3|'none', mand (chele), ant (antenne),
  prob (proboscide), horns, tail none|short|long|club|sting|fin|fan, neck, extra
  sail|spikes|shell|hump, float, wave, tall}. UN assemblatore (`buildFromRecipe`, mode
  skel|flesh) con RACCORDI garantiti (segmenti sovrapposti, giunzioni anca/collo/ali/code;
  test connettività flood-fill ≥90% su carne, chimera 100%). Le chimere ereditano: corpo
  dal torace, stile teste dalle specie-cranio, ali dalle braccia alate, tipo coda per coda.
  `partParams` ora deriva dal blueprint (compat parco/2D). descFor generata dalla ricetta.
  Libro = **libro aperto pixel-art**: pagine crema con contorno scuro netto, pila di pagine
  sotto (box-shadow a strati), dorso a fasce dure, sotto la pagina che sfoglia si vede CARTA
  rigata (bg di #bk-pages), niente cornice marrone.
  Parametri specie da hash intero (`ph`) → 8 dimensioni:
  cranio×4 (scala con la taglia; muso lungo VERO, becco, cresta a ventaglio), arti×3 (osso/
  pinna/**ala grande** a raggiera), coda×3 (lunghe, sinuosa/pinnata/aculei), taglia×3,
  corni×2 (lunghezza per taglia), **postura×3** (quadrupede ad arco / **bipede ripido con
  braccine T-rex** / **serpentino lungo ondulato senza zampe**, spuntoni ventrali), collo×3,
  cresta dorsale×4 (vela). Distribuzione su 60: ~22/17/21 posture, ~20 alati (test).
  Anche le **chimere del parco** sono param-driven (taglia, becco/corni, ali che sbattono,
  serpentino, coda per lunghezza — `drawCreature`).
- **Risveglio + vista VIVA**: raccogliere **tutti e 5 i pezzi** di una specie e risvegliarla
  al Lab (`awakenReady/awakenSpecies`, consuma i pezzi, `S.awakened`) sblocca nel Libro il
  bottone **▶ Vivo** sul 3D: switch scheletro ↔ animale rianimato (`buildFleshVoxels`:
  volume di pelle con colori per specie — dorso/pancia, becco giallo, occhi, membrane ali;
  nelle chimere ogni pezzo ha il colore della SUA specie). In debug tutte e 60 attive.
  L'anteprima chimera del Lab è in versione viva. `viewByCv/remount3D` per il toggle.
- **Creature del parco = proiezione dello STESSO modello voxel VIVO** (`creatureSprite`:
  buildFleshVoxels della chimera → sprite 2D cache con CONTORNO scuro così staccano dallo
  sfondo, flip per verso, bob camminata) — coerenti con libro/museo, non più il vecchio 2D.
- **Ingresso case coi PIEDI sulla porta** (`checkDoorEnter` usa P.y+13, non un blocco prima);
  sempre **3 blocchi liberi davanti** (`forb` doory+1..+3) + uscita su tile aperta (`exitInterior`
  con `openArea`). **Acque leggibili come liquido** in tutte le zone (onde/riflessi animati,
  palude verde-blu non-erba, mare gelato azzurro con lastre di ghiaccio). HUD mobile compatto
  (tag `white-space:nowrap`, zona/bussola troncate con ellissi <760px).
- Niente stelline di scavo (rimosse); ~1 albero su 3 ondeggia la chioma (fase da tile).
  Lo **sprite 2D del libro è la proiezione laterale statica dello STESSO modello voxel**
  (`drawVoxel2D`: ossa bianche a 3 toni di profondità z su fondo scuro, nell'intestazione —
  non copre il 3D); stessa funzione usata come fallback se WebGL manca.
  Sfogliata **8-bit**: squeeze della pagina sul dorso con `steps()` (turn-l/r + in-l/r),
  bloccata ai bordi (`bookMaxPage`); stile libro senza sfumature (bordi netti, ombre solide).
  **Anteprima chimera 3D nel Lab**. Viste vive smontate con `disposeViews`.

- **Siti di scavo speciali** (`siteForCell/siteAt`, celle `SCELL=30`, prob 0.22): affioramenti
  d'ossa visibili (cranio+costole, scintilla se attivi), solidi, 3-5 scavi garantiti **mai
  comuni** (`siteRarWeights`: raro/eccezionale/leggendario, gradiente distanza); esaurimento
  in `S.sites` (usati per chiave sito). Interazione adiacente con E (priorità: porta > sito >
  fontana > scavo).

- **Scavo sotto i piedi**: `digTarget()` = tile del player (mai il cubetto sbagliato);
  animazione dedicata (piccone alto → colpo verticale tra i piedi, terra a ventaglio).
- **Mobile: joystick analogico** (`#joy/#joyknob` in input.js): pointer capture, si trascina
  senza staccare il dito, knob clampato nel cerchio, zona morta al centro, vettore → 8
  direzioni (stessi flag `keys` della tastiera). Il d-pad a 4 frecce è stato rimosso.
- **Editor/barbiere/sartoria**: anteprima GRANDE (360px) e ANIMATA — cammina sul posto in 3
  pose (2 frame + bob, ritmo del gioco); loop rAF che muore quando la canvas esce dal DOM.
- **Multilingua** (`i18n.js`): **INGLESE di default**, italiano secondario, **RUSSO** da dizionario
  (`src/lang/ru.js`, chiave = stringa inglese; chiave mancante → si vede l'inglese). Aggiungere
  una lingua = un file in `src/lang/` + una riga in `LANGS`, senza toccare le 669 chiamate `tr()`.
  Nei testi i tasti si scrivono con i **segnaposto** `{act}` e `{key:M}` risolti da `keys()`:
  concatenare `actKey()` dentro la stringa cambierebbe la chiave del dizionario e la traduzione
  non verrebbe più trovata. Test: copertura ≥90%, spazi iniziali/finali e tag HTML conservati,
  nessuna voce orfana. `tr(it, en)` inline
  + helper etichette (`rarLabel/partName/zoneName/bldName/seasonName/lookLabel/hairLabel/
  hatLabel`), `applyStaticTexts()` per l'HUD statico. Cambio lingua: splash → 🌍 Lingua →
  `setLang` (persist `digsy_lang` + reload). I nomi propri (specie/città/chimere) NON si
  traducono. **I test girano in italiano** (stub setta `digsy_lang=it`).
- **Scavo direzionale**: si scava la casella VERSO CUI si guarda (`digTarget()`), schizzi di
  terra sul bersaglio; prompt coerente.
- Libro: layout grande (98vw/94vh), meta su una riga, footer allineato in basso (`bk-foot`),
  **risma di fogli** ai lati che cresce/cala sfogliando (`bk-edge-l/r`); il toggle Vivo/
  Scheletro rimonta su **canvas clonata** (il contesto WebGL muore col dispose — `remount3D`).

- **Icone 8-bit** (`icons.js` + `src/pxicons/*.svg`): set **pixelarticons** (MIT, npm dev-dep,
  copiati e rinominati nel repo) + 6 custom nello stesso stile (pick/bone/rib/spiral/horn/dna,
  griglia 24, currentColor). SVG inline via `import.meta.glob ?raw` (guardato per Node) →
  si colorano col testo (chiare su HUD scuro, scure su carta). **`withIcons(html)`** sostituisce OGNI
  emoji nota con `<img class="pxi">` e STRIPPA le sconosciute — applicato a tutti i sink
  innerHTML (modali, prompt, toast, HUD, libro, splash) + `hydrateIcons()` per HUD/d-pad
  statici. NIENTE emoji nel gioco (test: 50 icone valide + withIcons pulisce). Nuove emoji
  nelle stringhe → aggiungere la mappa in `EMAP`/`MAPS` o verranno strippate.

- **Interni camminabili** (`interior.js` + `drawInteriorScene` in render): si entra
  **camminando sulla porta** (niente E, `checkDoorEnter` nel loop, `justLeft` anti-rientro),
  stanza 10×7 col motore tile (pavimento in assi, pareti, finestre che si spengono di notte,
  bancone, arredo per mestiere), **NPC con look e nome propri** (`NPCS`, disegnato con
  drawHero + swap temporaneo di S.look). Coordinate interne separate (`INT.x/y`) — P resta
  sulla porta (save/bussola intatti). **E vicino all'NPC** apre il pannello servizi; si esce
  ripassando dalla porta in basso o con ESC. Il prompt "Entra"/"Scava" semplici sono rimossi.
  **Tutte e 6 le stanze a tema** (arredi solidi via `FURN`, animazioni per ognuna):
  LAB pietra+lavagna+alambicco (fiamma/bolle)+banco studio · NEGOZIO scaffale merci+bilancia
  che oscilla+lanterna+casse/sacchi/botti · MUSEO marmo a scacchi+quadri+teche di vetro con
  fossili (riflesso che scorre)+corda rossa · LOCANDA camino ACCESO+tavoli con boccali
  fumanti+botte sidro · BARBIERE scacchi bianco/blu+specchiera+poltrona+**palo con strisce
  che scorrono** · SARTORIA stoffe colorate+rocchetti+manichino vestito+macchina da cucire
  con ago animato. NPC pattuglia dietro il bancone (npcPose); collisione interni a hitbox
  piedi (intCollide). Test generico sui 6 tipi.

- **Biomi tematizzati per davvero**: palette terreno per zona (`ZONE_TILES` — zona 0 usa le
  stagioni), chiome alberi per zona (`ZONE_TREE`), acqua a tema (palude torbida con ninfee,
  ghiacci = LASTRA con crepe), sabbia d'ossa nelle Dune, crepe rosse nelle Terre; decorazioni
  FIRMATE per zona in `decoAt` (dune: cactus/bonespire · boschi: deadtree/mushroom/stump ·
  terre: redspire/orecrystal · palude: reed ondeggianti/alberi contorti · ghiacci: icecrystal/
  pini innevati · prati: hay/fiori). Velatura tint rimossa.
- **Museo v3**: consegni i **GREZZI** al Curatore (`museumDeposit` → `S.museumJob{items,ready}`,
  bloccati), gli esperti identificano in **1 giorno** (debug: subito); al **ritiro**
  (`museumCollect`) i doppioni tornano a te identificati (vendibili), i pezzi NUOVI vengono
  esposti — **niente monete dal museo**. Teca completa 5/5 → **fialetta DNA intera**.
- **DNA a mezze dosi** (`S.dna[spId]` = mezze, 2 = fialetta intera): **risveglio al Lab =
  1 fialetta intera** (senza fossili, si consuma, `awakenReady/awakenSpecies`); **chimera =
  ½ fialetta per ogni specie DISTINTA usata + i 3 pezzi + 🪙40** (mezza avanzata non risveglia);
  **ricariche al museo** solo per teche complete, prezzo per rarità (`DNA_COST` 30/80/150/300,
  `buyDna`). Identificazione SOLO via museo (il Lab tiene chimere+risveglio).
- **Galleria camminabile GRANDE** (niente porte): `GAL_W×GAL_H` 60×48 tile con **camera che
  segue il player** (`drawMuseumGallery`, culling tile/teche). **6 SALE per bioma** a griglia
  2×3 (`roomOrigin/ROOM_W/ROOM_H`), ognuna con tappeto del colore bioma, stendardo+emblema
  sulla parete di fondo, colonne agli angoli, lampadario e panche. **Atrio d'ingresso** con
  **bancone del Curatore CENTRATO davanti alla porta** (`GAL_DESK` centrato), insegna MUSEO,
  tappeto rosso e piante. **60 piedistalli** (`pedList`, 2 file da 5 per sala) espongono i
  **SOLI pezzi consegnati** (`composedPartsVox`+`exhibitSprite`, stella se 5/5); **E → scheda**
  (`openExhibit`). La cutscene del libro: il Curatore aggira il banco e scende dritto dal player.

- **Bioma GROTTA** (`cave.js` + `caveEntranceAt` in world): imbocchi rari sulle **montagne**
  (roccia con terra sotto, camminabili). Entri camminandoci dentro → **dimensione buia**
  esplorabile (64×48, `CAVE`), camera che segue, **quasi tutto nero salvo l'alone** attorno al
  player (come notte). Pareti di roccia solide, **giacimenti luminosi** (cristalli) da scavare
  con E → **6 fossili di grotta ESCLUSIVI** (`CAVE_SPECIES`, fuori dalle 60, `src:'grotta'`,
  BP dedicati in bones). Uscita dal corridoio in basso. `goto=grotta` e ingressi renderizzati
  (`drawCaveEntrance`/`drawCaveScene`). HUD zona = 🕳️ Grotta.
- **Mappa: le città col Museo hanno un pin loro** (`hasMuseum` in world.js, `museumPin` in
  mapui.js): avorio come il marmo, timpano basso a casetta e due colonne, contro il quadratino
  giallo delle altre città. Il Museo è l'unico posto dove si identificano i reperti, si riempiono
  le teche e si comprano le fialette: si deve vedere da lontano dove tornare. Anche in legenda
  (sagoma a casa via clip-path) e nel toast al click ("col Museo").
- **Zaino tarato sulla prima ora** (`BAG_CAPS` 14/22/30/40, `BAG_UPCOST` 30/100/240): con 10
  slot si tornava al Museo ogni due minuti proprio quando non si hanno monete per ingrandirlo
  (i GREZZI non si vendono: le prime monete arrivano solo dopo il primo Museo). I salvataggi
  vecchi salgono alla taglia corrispondente (10→14, 18→22, 28→30) in state.js.
- **Nomi di chimera distinguibili** (`chimeraName(skull, leg, taken)` + `nameDistance`):
  il solo taglio a 2 sillabe dava 693 nomi identici su 4.356 accoppiate e 1.156 coppie a una
  lettera di distanza ("Grillosso"/"Grillolosso"). Ora, se il nome cozza con una chimera GIÀ
  posseduta, si allunga prefisso o suffisso di una sillaba: 199 su 200 restano il nome base.
  L'unicità è dentro la partita, non nel mondo (al giocatore importano le SUE creature).
- **Niente testo murato in index.html**: i testi statici passano da `applyStaticTexts()`
  (`#pr-done`, `#exitbtn`, `#debugtag`); la schermata di boot si traduce con uno script inline
  che legge `digsy_lang` (i moduli non sono ancora caricati). Un test scandisce il markup.
- **Console comandi** (`\`, `commands.js`): `money/energy/day/speed(1-20)/heal`, `godmode`
  (sblocca+completa tutto, ×5), `goddna`, `goditem` (fossili+attrezzi+barca+mappe), `goto=<bioma|grotta>`
  (suggest+Tab), `gotocity`, **`fly`** (attraversa ostacoli, `P.fly`), **`vanilla`** (toglie i
  cheat e ripristina il save: i cheat sono NON distruttivi, `cheatLock`+snapshot in state).
  Output multi-linea (`#cmdout`), `\` toggle. Doc in `COMMANDS.md`.
- **Audio**: tema chiptune **rifatto** (128 ottavi, 4 frasi + variazione, progressione d'accordi,
  pad+shaker). Riparte in loop **al primo gesto dopo il refresh** (`armAudioResume`). **SFX**
  agganciati: scavo (dig/found), accetta/piccone, pesca, monete (fontana/vendite/acquisti).
- **Cosmetici tematici disegnati a mano** (editor `/editor`): overlay HATS con righe da **-3**
  (svettano sopra la testa) e accenti W/K; anteprima sarto con +4px di headroom.

## Prossimi passi → vedi ROADMAP.md
Le feature sono **congelate**: nessun sistema nuovo finché i quattro lavori di `ROADMAP.md`
non sono chiusi. Bug, arte, bilanciamento, test e refactor si fanno sempre.

- **Modalità DEBUG** (Ctrl+Shift+D in game, `debug.js`): energia e monete infinite (∞ nell'HUD,
  tag 🐞), libro completo, sartoria/barbiere gratis, velocità ×3. **Non distruttiva**: override
  runtime ai punti di lettura/spesa (`isDebug()`), il salvataggio non viene mai toccato.

## Prestazioni (pass di ottimizzazione)
- **Render a UNICA passata tile**: terreno + raccolta entità in un solo loop (`townInfo`/
  `baseTerrain`/`zoneIdxAt` chiamati 1× per tile in vista, non 2×).
- **`decoAt` con cache** (`decoCache` Map, deterministica; invalidata solo su chop/mine):
  niente più tempesta di `vhash` per ogni tile ogni frame.
- **`pedList` memoizzato** (museo): non rialloca 60 oggetti a ogni frame (render+collisioni+prompt).
- **Render saltato sotto overlay pieni** (zaino/libro): il mondo è coperto, le animazioni sono
  in pausa → niente redraw inutile (`isBagOpen/isBookOpen` in main loop).
- **Culling** tile/teche nella galleria museo; sprite voxel (teche/creature) in cache canvas.
- NPC e player agganciati alla griglia dei pixel fisici (`snap`): niente sfarfallio in movimento.

## Semplificazioni note / debito tecnico
- I borghi non hanno Locanda (il Negozio vende comunque +15⚡).
- Il barbiere non cambia la pelle: tonalità solo nell'editor iniziale.
- Le chimere compaiono identiche in tutti i parchi (sono "magiche", va bene così).


## REGOLE FERREE (già sbagliate in passato — non ripeterle)
1. **Animazioni: la fase viene SOLO dal tempo.** Mai da `sx`/`sy`/`cx` (coordinate schermo):
   con la camera in movimento l'animazione "corre" col personaggio. Se serve variare per
   oggetto, usare le coordinate TILE (`tx`,`ty`) o un indice, mai i pixel schermo.
2. **Tutto ciò che sta nel mondo va disegnato con `snap()`** (griglia dei pixel fisici).
   Senza snap, camminando la struttura VIBRA perché la camera scorre di frazioni di pixel.
3. **Scale pixel INTERE** (×2, ×3, ×4). Le frazionarie spaccano i pixel.
4. **Contrasto**: ogni cosa nel mondo deve staccare dal proprio sfondo (contorno scuro o
   tono diverso dal terreno del bioma). Verificare in `/wonders` (prova visiva) prima di dire fatto.
5. **Autore = solo Marco Giacobazzi** nei credit. Mai Claude o librerie. Commit senza `Co-Authored-By`.
6. **Cutscene**: si avanza SOLO al click, con "clicca per continuare" e Salta.
7. **Ogni testo di gioco dice cosa fa davvero** (niente "ristoro" senza dire +15⚡, niente
   cooldown nascosti: sempre "pronta" / "riposa ancora N giorni").
8. Bump di `src/version.js` a ogni build; `npm test`, `npm run e2e` e `npm run cov -- --gate` verdi.
9. **Ogni schermata e ogni scena va DISEGNATA da un test.** Un modulo che nessuno esegue è un
   crash che aspetta: gli interni sono rimasti rotti con 475 test verdi perché nessuno
   chiamava `drawInteriorScene`. `npm run cov` elenca i moduli mai toccati.
10. **Negli e2e headless `requestAnimationFrame` NON avanza** (`--virtual-time-budget`): per
   disegnare davvero serve chiamare `window.__digsy.frame(t)`, altrimenti i test "visivi"
   girano su un canvas mai ridisegnato e non provano niente.
11. **Su mobile non esiste il tasto E**: ogni testo che nomina un comando passa da
   `actKey()`/`keyHint()` in i18n.js.
12. **Ogni emoji usata va mappata in `EMAP`** (icons.js): `withIcons` STRIPPA quelle che non
   conosce e il testo resta muto, senza errori. Un test scandaglia il codice e le trova.
13. **Il contrasto è responsabilità di chi scrive il colore**, non del giocatore che se ne
   accorge: gli e2e misurano il rapporto WCAG su cinque schermate, avvisi accesi compresi.
   Le icone hanno un colore INLINE: sulle superfici chiare va sovrascritto con `!important`.
14. **Niente due aree che scorrono una dentro l'altra**: su mobile si muove sempre quella
   sbagliata. Scorre la pagina, non il riquadro.

## Convenzioni / preferenze
- Rispondere in italiano.
- Mantenere lo stile cozy e la coerenza pixel SNES.
- Zero dipendenze runtime; Vite solo come dev tool.
- Ogni feature nuova: aggiungere check a `tests/run.mjs` e tenerla verde.
- Pagine di prova: `/wonders` (meraviglie, mostra gli sprite rifiniti a mano quando ci sono),
  `/sprites` (Sprite Studio: meraviglie, personaggio, capelli e cappelli nelle TRE viste, icone,
  **Natura** 14 = alberi/rocce/funghi/canne… e **Città** 11 = i 6 edifici + fontana/panchina/
  lampione/staccionata/imbocco grotta), `/playground` (mobile).
  Lo Studio si tira dentro il **markup vero del gioco** (fetch di `index.html` in un contenitore
  fuori schermo) prima di importare i moduli: così `getElementById('bagbtn').onclick = …` e
  simili trovano i loro elementi e l'import non esplode. Le funzioni di disegno scrivono solo
  sulla canvas `#cv`, quindi si disegna là e si copia (`viaGameCanvas`). Gli edifici vogliono
  il rettangolo di caselle `{x0,y0,x1,y1}`, non `{x,y,w,h}`.
