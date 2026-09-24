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
src/sprites.js      PAL mutabile, shade/applyLook, SPR (fronte/retro/profilo), HAIRS/HATS,
                    SHIRTS/PANTS (vestiti a mano, additivi sopra styleLook), blit/drawHero
src/park.js         sim chimere nel recinto (parks Map, refreshVisParks/updatePark)
src/compass.js      città più vicina, octant, updateCompass (HUD + toast benvenuto)
src/gameplay.js     tryDig/economia/chimere (chimeraName/assembleChimera), collide, act
src/brush.js        primitive di disegno (snap/px/rect/shadow/shade8, BRUSH)
src/tiles.js        palette stagionali/bioma, BIOME_BUILD/INT_WOOD, soilDetail, groundTile
src/props.js        alberi, sassi, fiori, funghi, oggetti a terra, decorazioni di bioma
src/interiors.js    le 6 stanze a tema, galleria del museo, NPC (npcPose/drawNpc)
src/house.js        casa del giocatore: stanze, arredo (strati, ingombro, parete, fondi), comodità
src/wonderNative.js tutte e 18 le meraviglie disegnate in NATIVO a 32px (gli sprite dello Studio restano in banca come riserva)
src/furnArt.js      disegno NATIVO dell'arredo e del fondo della stanza (modulo puro, come wonderart)
src/hatArt.js       cappelli disegnati in NATIVO a 32px: forme (cupola, tesa, fascia, cono), luce e un solo contorno (puro)
src/bodyArt.js      corpo del personaggio in NATIVO: testa con viso, braccia, scarpe, a specchio; contorno dopo i vestiti (puro)
src/holeArt.js      buche dello scavo: 10 forme curate (lobi, mucchi, zolle, sasso, radice), scelte/specchiate per casella (puro)
src/hairArt.js      capelli disegnati in NATIVO: massa + attaccatura ritagliata, ciocche, riccioli, punte (puro, usa grid di hatArt)
src/faceArt.js      barba/baffi (colore dei capelli, senza contorno) e occhiali (montature 'K') in NATIVO (puro)
src/npcArt.js       segni di mestiere degli NPC (look.acc): camice/occhiali, grembiuli, baffi, papillon+monocolo, metro (puro)
src/houseArt.js     architettura della casa: muri con spessore, porte con targhetta, finestre, soglie (puro)
src/caveArt.js      grotte: pareti in 3/4, pavimento a lastre con pozze e funghi luminosi, giacimenti (puro)
src/decoArt.js      arredo urbano e ritrovamenti: fontana, panchine, lampioni, bacheca, statua, posta, ossa (puro)
src/townArt.js      esterni di botteghe e casa: materiali per mestiere, tetti del bioma, porte, finestre (puro)
src/museumArt.js    la galleria del Museo: marmo, parquet, tappeti, vetrine col faretto, colonne, bancone (puro)
src/shopArt.js      le 5 botteghe (Negozio/Locanda/Barbiere/Sartoria/Lab): stesso guscio della casa, bancone, arredi (puro)
src/furnCatalog.js  CATALOGO: 12 temi × 21 pezzi, ognuno con la sua ricetta di disegno scritta a mano
src/furnRecipe.js   interprete delle ricette (scatole, cilindri, dischi… nello stile 3/4 dell'arredo)
src/furnShop.js     vetrina del giorno al Negozio (base + rotazione, tema di zona scontato)
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
- **A INIZIO SESSIONE, da soli e senza chiedere**: `bash dbssh/dbssh.sh up` apre l'accesso al
  database di produzione (profilo `digsy-oracle`, password già in cache). Serve per qualunque
  verifica sul cloud. Letture `./dbssh.sh q "SQL"`; per SCRIVERE serve `DBSH_ALLOW_WRITE=1`
  davanti (la protezione sola-lettura è voluta). Il DB si chiama **`digsy_dev_box_it`**, non
  `digsy`. Modalità `remote`: `mysql` gira sul server via SSH, niente tunnel.
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
- **Negozio**: vendi reperti; **ristoro** 20🪙 (mai quanto la pala: nel tutorial si confondono) → va nello ZAINO (`S.snacks`, +15⚡ quando lo usi);
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
  Taglie (elenco vero in `TOWN_SIZES`, con un test che lo confronta col mondo generato):
  **borgo** = Negozio+Locanda · **paese** = +Laboratorio+**Barbiere** · **città** = 7 edifici
  (+Museo+**Sartoria**+**Bottega d'arredo**, piazza larga 23). **In ogni taglia si dorme**: la
  Locanda c'è anche nei borghi. Il **Museo solo in città** — è lì che si identifica. Piazze SPAZIOSE
  (file di case distanti 5+ tile) con **strade sterrate** (`town.roads` Set, tile `ROAD`):
  vialetto porta→strada per ogni casa, strada orizzontale davanti a ogni fila, viale centrale
  x=C.x sempre libero (fila bassa città sfalsata apposta) che scende fino al cancello del parco.
  Niente arredo sulle strade (`forb`). Città+parco SEMPRE dentro la propria cella (jy 8..27).
  Sotto gli edifici: lastricato, mai erba, e non ci si scava (`tryDig` rifiuta ogni townInfo).
  `exitInterior` cerca la prima tile LIBERA davanti alla porta (niente compenetrazioni).
- **GUARDAROBA: quello che hai pagato una volta resta tuo** (`S.bought` per campo e valore,
  `cosmeticOwned/markBought/markLookBought` + `LOOK_FIELDS` in state.js): riprendere un taglio,
  un colore o un capo già comprato è **gratis** — prima ogni cambio costava, quindi rimettersi
  il taglio di ieri si ripagava daccapo. Non è un servizio, è un guardaroba. Quello che si
  indossa è per definizione già proprio (l'editor iniziale registra tutto alla conferma, e i
  salvataggi vecchi si registrano il look addosso al boot). **E si vede**: ✓ verde sulle voci
  già tue (anche sui quadratini dei colori, `.sw.own`), 🪙8 su quelle che si pagano, e la barra
  in fondo dice "Gratis: è già tuo" invece di "Totale: 🪙 0". Prima il conto compariva solo
  nella barra, a scelta fatta.
  L'**anteprima resta appesa in cima** anche in bottega (`.ed-stick` in previewHtml, la stessa
  dell'editor): Sartoria e Barbiere sono elenchi lunghi e arrivati agli occhiali il Digsy era
  fuori schermo da un pezzo — si provava senza vedere quello che si sta provando.
  Due trappole, tutte e due trovate con una foto e chiuse da una misura negli e2e:
  **1)** `.sheet` aveva `overflow:auto` oltre a `.sb` — due aree che scorrono una dentro
  l'altra (regola 15), e la fascia si incolla solo a una delle due. Ora scorre solo `.sb`.
  **2)** `position:sticky` tiene dentro il riquadro la **scatola dei margini**, non il bordo:
  con `margin-top:-14px` (che serve a far arrivare la fascia ai bordi del foglio) e `top:0` la
  fascia si agganciava **14px più in basso**, e in quella fessura passavano i bottoni sopra il
  Digsy. `top` deve pareggiare il margine negativo (`-15px`). Il vecchio controllo e2e misurava
  contro `sb.top + padding` e quindi **pretendeva il difetto**: ora misura la fessura contro il
  bordo dell'area che scorre, in editor E in bottega (il pannello lo costruisce un'altra
  funzione: una prova sul solo editor non l'avrebbe preso).
- **Barbiere** 💈 / **Sartoria** 👕: **prova LIBERA + Conferma** (`beginLook/confirmLook/
  revertLook`, `lookPaidFields`): provi quanto vuoi gratis, paghi 🪙8 solo per i campi
  cambiati alla conferma; Annulla/chiudi ripristina. **Cosmetici TEMATICI per zona**
  (`ZONE_COSMETICS`, `THEMED_HAIR/THEMED_HAT`): ogni zona ha 1 taglio + 1 cappello esclusivi
  (Boccaglio in palude, Colbacco nelle Lande Gelide, Coroncina nei Prati, NESSUN cappello nelle
  Terre Rosse — l'elmetto è stato tolto, vedi REMOVED_HATS in state.js,
  Cappuccio nei Boschi, Bandana nelle Dune, tagli Germogli/Duna/Boschivo/Fiamma/Alghe/Gelo)
  **scopribili solo nel negozio di QUELLA zona** (`discoverBox`, costo ×3, `unlockCosmetic`,
  `S.unlocked{hats,hairs}`); una volta sbloccati sono scegliibili ovunque (`hairStylesAvail/
  hatStylesAvail`). Sprite in HAIRS/HATS (righe 16, fronte/retro simmetriche, HAT_CROWN).
- **Barbiere** 💈: 6 tagli base × 12 colori (anteprima senza cappello).
- **Viso: barba/baffi e occhiali** (`faceArt.js`, `S.look.beardStyle/beardColor/glassesStyle/
  glassesColor`): 3 barbe (baffi · pizzetto · barba piena) + colore dal **Barbiere**, 3 montature
  (tondi · rettangolari · da sole) + colore dalla **Sartoria**, più `none` GRATIS in tutte e due
  (toglierla non è un servizio, `FREE_OFF` in lookPaidFields). Stesso flusso prova-libera +
  conferma, 🪙8 per campo cambiato, niente sblocchi. Materiali propri: `Z/n/m` la barba,
  `O/l/o` la montatura. **La barba nasce del colore dei capelli e li SEGUE** finché non le si dà
  un colore suo (`beardFollowsHair` in ui.js): chi cambia testa non deve scoprire una seconda
  tavolozza per non ritrovarsi il barbone di prima. Strati in `drawHero`: barba SOTTO i capelli
  (una frangia la copre), occhiali SOPRA i capelli e sotto il cappello.
  **Niente contorno su nessuno dei due**: `finish` gira un bordo scuro attorno alla sagoma e su
  un baffo alto un pixel ne raddoppia l'altezza — veniva una bocca sorridente disegnata a
  pennarello, e sulla montatura una maschera da sub. Il volume se lo fa da sé la barba (riga
  chiara sopra, riga d'ombra sotto); le **montature sono tutte SCURE** (`GLASSES_COLORS`, test
  sulla luminanza) perché senza bordo il contrasto sulla pelle lo deve dare il colore (regola 4).
  **Barba piena e pizzetto hanno il buco della bocca**: attaccati, baffi e mento diventano una
  macchia sola. Negli occhiali **ponte e astine stanno una riga sotto il bordo alto delle lenti**
  (alla stessa quota si saldavano in una barra larga 15 px: una visiera) e **di profilo la lente
  arriva al fronte del viso** (colonna 25) — centrata sull'occhio e basta, restava una striscia
  di guancia davanti e sembrava un monocolo sullo zigomo. Di spalle la barba non c'è (la testa
  la copre) e degli occhiali resta l'astina.
  Foto: `npm run shot -- viso 720,1680 "viso=11:down"` (scala : vista : elenco di id) ·
  `barbiere` · `sartoria` · `editor 700,1000 "giu=1"` (`giu` scorre prima dello scatto: Chrome
  headless non apre finestre più alte di ~620 px e le colonne lunghe si fotografano a metà).
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
  **Aspetto rifatto al livello della casa** (`shopArt.js`): materiali per mestiere (lastre di pietra
  al Lab, piastrelle dal Barbiere, assi del legno di zona altrove), parete con carta/zoccolo/cornice,
  finestra con tende, bancone con piano e pannelli, arredi con contorno e ombre. Gli ingombri
  `FURN` NON sono cambiati. Un test disegna ogni bottega e vieta pixel fuori dai muri.
  Foto: `npm run shot -- bottega 900,700 "tipo=inn"` (store/inn/barber/tailor/lab/furniture) · `bottega-fuori`.

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
- **Mappa leggibile a colpo d'occhio** (`mapui.js`, "non si capisce cosa è cosa"): ogni luogo è un
  DISTINTIVO tondo con l'icona del set del gioco (`MAP_SIGNS` + `drawSign`: tempio = città col Museo,
  case = paese/borgo, casetta = casa tua, stella = meraviglia, porta = arco, osso = siti di scavo
  attivi), X del tesoro rossa, nomi delle città scritti, riga scura sulle coste e bordo a matita
  dell'esplorato. Canvas a `RES` 2 per il testo; i segni crescono se la carta è mostrata piccola
  (telefono). La legenda disegna gli STESSI segni (`paintLegend`). Foto: `npm run shot -- mappa`.
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
- **TOCCA DOVE ANDARE, rifatto** (`tapmove.js` + `path.js`): il movimento a click/tap aveva
  SETTE difetti insieme ("il pathfinder funziona male, si fa fatica a uscire di casa o ad
  arrivare a un punto preciso"). Due erano costanti sbagliate che si coprivano a vicenda:
  **1)** `tapmove` teneva una COPIA di `placeOnTile` con i piedi a 13px invece di `FOOT_DY`
  (26) — la convenzione che body.js dichiara abbandonata. Ogni waypoint puntava mezza casella
  troppo in basso e Digsy camminava sul bordo INFERIORE di ogni casella, strusciando contro
  tutto quello che stava sotto. **2)** `fits` in path.js provava il corpo con un margine di ±8
  su un corpo già largo ±10: 36 px su una casella di 32, quindi **ogni casella accostata a un
  muro risultava impercorribile** — in una stanza o in una strada è metà dello spazio buono. Il
  margine grande era nato per tappare il difetto 1. Sistemata la causa, il margine è 4.
  Gli altri cinque: la meta veniva sovrascritta col CENTRO dell'ultima casella (non ci si
  fermava dove si toccava, fino a mezza casella di errore) · `ARRIVE` a 10px fermava un passo
  prima · si passava per il centro di OGNI casella invece di tagliare in linea retta (ora
  `shortcut`, con la stessa collisione del gioco: deviazione media 1,19× → **1,04×**) ·
  strusciando lungo un muro `stuck` si azzerava a ogni fotogramma e non si rinunciava mai (ora
  si misura la distanza dalla META, non "si è mosso") · il segno della meta si disegnava solo
  nel mondo aperto, proprio dove serve meno (ora anche in casa, bottega e grotta).
  Il `exitTile` di `currentScene` era scritto e **non chiamato da nessuno**: l'ho provato, porta
  alla porta per la via lunga (36 fotogrammi contro 15, misurati) senza cambiare l'esito —
  `findPath` già ripiega sulla casella libera più vicina. Tolto: due regole per la stessa cosa,
  e la peggiore. Misure: 100% di arrivi su 46 mete vere, corridoio a L largo UNA casella
  (mappa finta, deterministica), angoli di casa, uscita da bottega e da casa (atrio e Sala).
- **Il vialetto di casa è una STRADA, e va controllata prima di scegliere il posto**
  (`homeRoadGeomFor/homeRoadOk` in world.js, usate da `findHomeSpot`): si disegna come
  pavimento e rende camminabile la casella **anche sull'acqua**, quindi finché nessuno la
  guardava nasceva una striscia grigia in mezzo al mare — e bastava un edificio di traverso
  perché la casa diventasse irraggiungibile, senza da che parte aggirarlo. Su 24 mondi di prova
  erano **17**. Ora `findHomeSpot` fa quattro passate (a nord col vialetto buono · ovunque col
  vialetto buono · a nord senza · ovunque senza: una casa scomoda è meglio di nessuna casa) e
  il vialetto **si ferma alla prima casella di città NON solida** invece di puntare al bordo del
  rettangolo — gli edifici sporgono oltre quel bordo, ed è lì che nasceva "la casa in mezzo".
  La spezzata è un `Set` di caselle con il suo rettangolo d'ingombro (`nearHouseZone` lo usa per
  non fare 25 letture per ogni casella del mondo). I salvataggi vecchi con la strada rotta
  vengono rimessi una volta sola al boot (`homeRoadBroken` in main.js): la casa DENTRO sta in
  `S.house`, non nelle coordinate, quindi non si perde niente. Test: 10 città diverse dello
  stesso mondo (con UNA sola il controllo passava per caso) + il vialetto continuo casella per
  casella (un buco è un muro d'acqua che da fuori non si vede).
  **NON si controllano le decorazioni** sul tracciato: un albero lì sparisce da solo appena la
  casa è fissata (`nearHouseZone`), e scartare per un cespuglio che non esisterà buttava via
  posti buoni.
- **In grotta niente segni d'interfaccia dentro il mondo** (`caveArt.caveCrystal`/parete): i
  giacimenti avevano quattro angoli agli spigoli della casella — un mirino — e le ossa fossili
  nella parete avevano il contorno scuro e l'avorio dei reperti, cioè le due promesse che in
  questo gioco significano "si tocca" (regola 4). Ora: il cristallo dice da sé di essere a
  portata (alone più acceso, luccichio più fitto e doppio), e il fossile è un rilievo nella
  pietra. Un test misura il pixel più chiaro di una parete col fossile: deve restare roccia
  (62% < 70%; col vecchio avorio era 81%).
- **In volo la bestia RACCOGLIE le zampe** (`tuckLegs` in bones.js → `legVox`): non un ginocchio
  che sporge ma un **rilievo lungo il ventre**, che si stacca di UNA casella e si richiude verso
  la coda (+x: il muso sta alle x basse, la coda alle alte). Tre errori in fila, tutti e tre
  visti solo in foto: dritte in giù sembrava appesa a un filo · piegate in AVANTI sembravano
  rotte (la differenza è un segno meno) · piegate ma staccate sembravano due uncini appesi. Vale SOLO per la cavalcatura (`drawFlyingMount`): il modello del
  Libro, del parco e del cortile resta quello che cammina. Tre misure sul MODELLO: il fondo dei
  voxel si alza (0 → 6), la bestia resta tutta d'un pezzo, e il piede raccolto finisce più
  indietro di dove finiva quello disteso (12 → 16).
- **In sella le gambe sono PIEGATE** (posa `ride` in bodyArt: `legsSide` coscia avanti + stinco
  giù, `legsFront` a cavalcioni con le ginocchia in fuori). Sulla cavalcatura volante il
  cavaliere era un busto appoggiato sul drago: il ritaglio di `seatHero` si fermava alla vita
  (48×46 → 48×62) **e** i lembi della sella si disegnavano DOPO il cavaliere, quindi passavano
  davanti agli stinchi. Ora la sella sta fra la bestia e la gamba, com'è nella realtà.
  Foto: `npm run shot -- pose 1000,600 "solo=volo&zoom=5"` (e `solo=bici`).
- **Ogni scena si rimette la scala della tela** (`ctx.setTransform(view.PX…)` in cima a mondo,
  grotta e interni): il mondo aperto era l'unico a fidarsi di quella lasciata da `fit()`, ma
  l'intro disegna a `view.PX × Z` (Z fino a 3 sugli schermi grandi) e non la rimetteva. Finita
  l'intro senza passare da una stanza — cioè quando non si entra in casa — il mondo usciva
  ingrandito del doppio con Digsy fuori dall'inquadratura ("omino invisibile e super zoom",
  segnalato con foto). Solo su certe finestre, perché sotto i 600×337 px di gioco Z vale 1 e la
  scala sbagliata coincide con quella giusta: un test misura la chiamata, non l'effetto.
- **Niente giocatore sotto la barra** (`hudPad()` in screen.js, usata da `caveCam` e
  `galleryCamY`): dove la camera si ferma al bordo della mappa (grotte, galleria del museo)
  si continuava a salire e Digsy finiva NASCOSTO dietro i tag dell'HUD (segnalato con foto da
  un giocatore). Ora la camera può salire oltre il bordo quanto è alta la barra. `hudPad`
  RICORDA l'ultima misura buona: con una modale aperta l'HUD è display:none e misurarlo lì
  darebbe margine zero proprio dove serve.
- **Energia: un solo punto di spesa** (`spendEnergy(n)` in state.js): il controllo
  `energy <= 0` sta PRIMA dell'azione, quindi copre solo chi consuma 1 — staccare un
  cristallo in grotta ne costa 2 e da 1 si finiva a **-1/65** (visto da un giocatore).
  `spendEnergy` ha lo zero come fondo; un test vieta ogni `S.energy--/-=` fuori da lì.
- **HUD vivo in ogni scena**: il refresh periodico stava DOPO i `return` di grotte e interni
  nel game loop, quindi là sotto la barra restava congelata (si scavava fino a zero energia
  continuando a leggere "46/60"). Ora sta prima di entrambi i rami, e `cave.js` aggiorna
  anche subito dopo lo scavo.
- **Uscita della grotta come la porta del museo** (`CAVE_FOOT` in cave.js): la camera scende
  oltre il fondo e sotto l'imbocco si vede un pezzo di MONDO ESTERNO (terra, erba, stipiti di
  roccia, alone di luce diurna che risale). Prima l'uscita era una linguetta di 4 px
  sull'ultimo bordo, al buio: con il solo mouse non c'era niente da cliccare "fuori" per
  uscire. Il pass del buio si apre vicino all'imbocco, altrimenti il varco tornerebbe nero.
  `render.js` ora usa `caveCam()` invece di ricopiarne la formula (le due erano divergute).
- **Console comandi** (`\`, `commands.js`): ~20 comandi in inglese corto raggruppati
  (`money/energy/day/speed/heal`, `season/time/weather/market`, `god[=parte]`, `go=meta|bioma`,
  `play=prep|restore|toss|skeleton|egg|hatch|fuse`, `buddy=tipo`, `mount/chimera/fly/stress`,
  **`vanilla`** annulla i cheat via snapshot). Aiuto nella lingua del gioco, VALORI in italiano o
  inglese. I nomi vecchi (`godmode`, `goto`, `prep`, `meteo`…) restano in `LEGACY`, riscritti nel
  comando nuovo e fuori da `help`: promo/shot/test li usano ancora. Doc in `COMMANDS.md`.
- **Audio**: tema chiptune **rifatto** (128 ottavi, 4 frasi + variazione, progressione d'accordi,
  pad+shaker). Riparte in loop **al primo gesto dopo il refresh** (`armAudioResume`). **SFX**
  agganciati: scavo (dig/found), accetta/piccone, pesca, monete (fontana/vendite/acquisti).
- **Cosmetici tematici disegnati a mano** (editor `/editor`): overlay HATS con righe da **-3**
  (svettano sopra la testa) e accenti W/K; anteprima sarto con +4px di headroom.

## La seconda collezione: l'AMBRA (per le 30 ore)
Misurato con `npm run pacing` (simulatore di ritmo: usa makeRaw, pity, anti-doppione e livelli VERI,
più un modello di tempo dichiarato e prudente): la prima collezione — 330 pezzi, 66 risvegli — finiva
in ~15 ore di gioco. Da lì i doppioni servivano solo a far monete. I **pezzi d'ambra** (`it.amber`,
`AMBER_CHANCE` per rarità in gameplay.js) escono SOLO per le specie con la teca già completa, vanno in
una seconda fila (`S.amber[sp]`), e cinque su cinque accendono la **teca d'ambra** (`S.amberDone`,
vetro caldo con scintille in `drawCaseFront`) e pagano `amberReward`. Nello zaino hanno la cornice
arancio, nel Libro il contatore ✨ n/5. Col simulatore: prima teca d'ambra ~3 h, metà ~18 h, tutte
~43 h. Le leggendarie hanno la probabilità più alta: con quella di tutte chiedevano da sole decine
di ore. Se si tocca un numero di rarità, drop o energia, si rilancia `npm run pacing` e si guarda.

## Arredare la casa serve a qualcosa (e si vede)
Ogni pezzo dichiara **dove vive** (`place`: floor · rug · wall · paper · ground) e **quanto
occupa** (`w`/`h` in caselle, scambiate ruotando). Prima erano tutti 1×1 e un letto era grande
quanto una lampada: senza differenza di taglia la stanza non ha gerarchia e l'arredo sembra
sparso. Tre strati indipendenti per casella — tappeto sotto, mobile sopra, quadro alla parete
(fila `gy 1`, si appende stando addossati al muro).
**Il fondo è arredo anche lui**: carta da parati e pavimento si comprano al Negozio della zona
e si applicano alla stanza dal vassoio; sono la leva che cambia una stanza più di qualsiasi
mobile, quindi costano poco e stanno in cima all'elenco. Anche il fondo DI SERIE
(`ROOM_DEFAULT`) passa dallo stesso disegno: una stanza vuota deve sembrare una stanza.
`furnArt.js` disegna tutto nativo a 32px nella stessa vista del gioco — ombra di contatto,
lato in luce e lato in ombra, altezza che sfora verso l'alto. I mobili erano cubetti voxel
isometrici sopra un pavimento in pianta: due proiezioni che litigano, e nessun pezzo che
poggia da qualche parte. Le miniature del negozio e del vassoio sono LO STESSO disegno
scalato, non un modellino a parte (quello divergeva).
`roomComfort` misura la stanza (fino a 4 mobili, qualcosa a terra, qualcosa alla parete, i due
fondi, la coerenza di zona). Dormire nel PROPRIO letto rifà l'energia come la Locanda e in più
regala il "ben riposato": fino a 6 fatiche gratis, scalate dentro `spendEnergy` — l'unico
punto di spesa — quindi valgono anche per accetta, piccone e cristalli.
Foto: `npm run shot -- casa` (arredata) · `casa-vuota` (com'è la prima volta) · `letto`.
L'ARCHITETTURA (`houseArt.js`) è separata dalla geometria (`house.js`): muri con cresta e faccia,
porte con stipiti/battente/lucchetto e una targhetta con l'icona della stanza (niente testo a 6px),
zoccolo diverso per stanza, parquet a tavole lunghe. La scena sfora sopra la stanza: `houseOrigin`
la centra e `interiorCam` usa lo STESSO punto, o i tocchi finiscono di lato. Foto: `atrio`.
**Catalogo per temi** (`furnCatalog.js`): 252 pezzi in 12 temi (Cucina, Bagno, Camera, Salotto,
Studio da archeologo, Giardino interno, Museo e fossili, Rustico, Marinaro, Magico e cristalli,
Festivo, Bambini). Ogni pezzo è una RICETTA di poche righe scritta a mano (`furnRecipe.js`:
`B` scatola, `C` cilindro, `O` disco, `T/V` triangoli, `G` vetro, `Q` fiammella…), non un
ricolore: un test pretende sagome uniche, niente fuori dall'ingombro, colori validi, nomi in tre
lingue. Si compra alla **Bottega d'arredo** (`furniture`, SOLO nelle città: settimo edificio della fila bassa,
falegname Ettore; il Negozio è tornato alimentari — "in un alimentari non ha senso acquistare
arredamenti"): ogni giorno i pezzi `base` più 6 a rotazione per
tema; il tema DI CASA della zona (`ZONE_THEME`) è tutto in vetrina e costa un quarto in meno.
Si ruota solo chi ha la vista `side`. Per guardarli tutti: `npm run shot -- catalogo 1400,1100 "tema=cucina"`.

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
- I borghi non hanno il **Laboratorio** (né il Museo): per identificare e risvegliare si va in
  città. Dormire invece si può ovunque, Locanda compresa nei borghi.
- Le chimere compaiono identiche in tutti i parchi (sono "magiche", va bene così).
> Questo elenco è invecchiato male due volte (diceva "i borghi non hanno Locanda" e "il
> barbiere non cambia la pelle", tutte e due false da mesi). Se una riga qui si può misurare,
> si misura: vedi il test sulle taglie delle città.


## Le ZONE hanno UN elenco solo
`ZONE_LIST` (= `ZONES`) in data.js è l'ordine ufficiale: chi indicizza per POSIZIONE
(`ZONE_TILES`, `ZONE_TREE`, `BAND`) lo deve seguire, chi indicizza per ID
(`ZONE_COSMETICS`, `zonePools`) deve avere una voce per ognuna. Gli elenchi piatti
(`THEMED_HAIR`, `THEMED_HAT`) si DERIVANO dalla tabella, non si riscrivono: erano due liste a
mano accanto ai dati che le contenevano già, e una si è ritrovata con 5 voci per 6 zone senza
che nulla lo segnalasse — l'Elmetto delle Terre Rosse risultava documentato qui e non esisteva.
Un campo che non si applica a una zona si scrive `null` (`terre: { hair:'ember', hat:null }`):
una chiave assente è un buco che nessuno nota, una a null è una decisione che si legge.
Un test pretende che ogni zona compaia in ogni tabella, che ogni cosmetico nominato abbia il
suo disegno e che ognuna stia in una fascia di temperatura.

## In produzione ci sta SOLO il gioco
Sprite Studio (`/sprites`), playground, editor, la pagina delle statistiche (`/stats`) e le
pagine `__*.html` dei test importano i **sorgenti** (`/src/…`), non il bundle: tenerli online
vorrebbe dire pubblicare tutto il codice per far funzionare uno strumento che serve a una
persona sola sul suo computer.
Vivono in locale con `npm run dev`. Il deploy li esclude e **verifica** che non ci siano, e un
test pretende che OGNI `public/<nome>/index.html` compaia nelle esclusioni: Vite copia tutta
`public/` in `dist/`, quindi uno strumento nuovo va online da solo se nessuno lo toglie.
`/stats` non entra nemmeno in `dist/` (la build la cancella): mostra dati dei giocatori.

## Pubblicare
`npm run deploy` — prove verdi, mette da parte la versione online, pubblica, **verifica otto
cose** (gioco raggiungibile, versione giusta, API viva, database che scrive, privacy, e che
config/librerie/test restino chiusi) e se qualcosa non torna **rimette la versione di prima**.
`npm run deploy -- --check` verifica soltanto, senza toccare niente.
Prima si faceva `tar | ssh` a mano: nessun controllo dopo e nessun modo rapido di tornare
indietro. `server/health.php` risponde 200/503 sui segni vitali (database raggiungibile,
tabelle presenti, scrittura possibile) ed è pensato per un controllo automatico ogni pochi
minuti. Gli errori JavaScript dei giocatori arrivano a `server/api/oops.php`, raggruppati e
contati, senza niente che dica chi è la persona.

## Si installa come app (PWA)
`public/sw.js` + il manifest rendono il gioco installabile su Android, desktop e iPhone
("Aggiungi a Home"): icona propria, niente barra del browser, e si gioca **senza rete** —
il mondo è procedurale e il salvataggio sta nel dispositivo.
La regola che governa il service worker: **nessuno deve restare su una versione vecchia**.
`index.html` e `sw.js` si chiedono SEMPRE alla rete (la copia serve solo offline); gli asset
sotto `assets/` hanno l'hash nel nome e si tengono per sempre. Le istruzioni di cache stanno
nell'`.htaccess` della webroot, e in Apache fra più `<FilesMatch>` che combaciano vince
**l'ultimo**: la regola di `sw.js` deve stare DOPO quella generica `\.js$`, altrimenti viene
annullata in silenzio e il service worker resta in cache un anno. Il deploy lo verifica.
Il gioco chiede anche lo storage persistente: senza, il sistema può ripulire il salvataggio
quando lo spazio scarseggia.

## Sapere come va la prova
`npm run tester` racconta cosa sta succedendo: quanti stanno giocando, **quanto durano le
sessioni**, a che giorno si fermano, chi è tornato una seconda volta, da telefono o computer.
`npm run tester -- --errori` aggiunge gli schianti segnalati dal gioco, con la scena in cui
erano. Gli **stessi numeri da guardare**: `npm run dev` → http://localhost:5173/stats
(fasce di durata, giorno raggiunto, dispositivo, versioni in giro, tabella per giocatore,
schianti; si riaggiorna da sola ogni minuto). La lettura e i conti stanno in un posto solo
(`tests/battito.mjs`, usato sia dal terminale sia dalla pagina): due lettori vorrebbero dire
due risposte diverse alla stessa domanda. I file del battito NON sono scaricabili dal web —
stanno fuori dalla webroot e si leggono via SSH, quindi la pagina passa da `/dev/battito.json`,
un pezzo di `vite.config.js` che esiste solo nel dev server. I dati arrivano dal battito (`src/beat.js` → `server/api/beat.php`): una riga ogni
cinque minuti con minuti giocati, giorno, livello, specie, versione. **Niente che dica chi è
la persona** — l'identificativo lo genera il gioco a caso e vive nel dispositivo, nessun IP,
nessun legame con l'account. Si spegne da Impostazioni → Statistiche anonime, ed è scritto
nella privacy policy. I numeri vanno letti come indizi: con tre tester una sessione lunga può
essere una scheda lasciata aperta.

## Il guardiano (cron sul server)
`server/watch.sh` gira ogni 5 minuti dal cron di `digsy.dev-box.it` (fuori dalla cartella
pubblica, 700). Controlla pagina, API e `health.php`; **riprova tre volte** prima di
dichiarare un guasto (un pacchetto perso non è un'emergenza) e **avvisa solo quando lo stato
CAMBIA** — un servizio giù sei ore manderebbe 72 mail, e alla settima nessuno le legge più.
Avvisa su **Discord** (canale `#guardian`) e non per posta: una mail da un server che non ne
manda quasi mai finisce nello spam o viene rifiutata, e un avviso che non arriva è peggio di
nessun avviso, perché ci si fida. L'indirizzo del webhook è una CHIAVE — chi ce l'ha scrive
nel canale — e sta in `.webhook` (600), fuori dalla cartella pubblicata e fuori dal
repository, come la password del database. Registro in `.watch-log`, ultimi 500 controlli.

## GUARDARE le schermate prima di consegnarle
`npm run shot -- <vista> [larghezza,altezza]` fotografa una schermata vera del gioco in
`.shots/`. Viste: `main saves stats settings trophies changelog credits account`.
`npm run promo` fa invece le **immagini per la vetrina** (Reddit, itch) in `.shots/promo/`:
partite già avanti portate nello stato giusto dai comandi veri (`G.cmd`), in orizzontale, senza
tag di debug né toast — quelli si spengono con una regola CSS, perché nasconderli da JavaScript
è una gara col tempo che si perde (lo scatto avviene quando finisce il tempo virtuale, non
quando decide la sonda). Ogni scena porta il SEME del suo mondo (`?seed=`, letto da `initState`
solo su una partita NUOVA): senza, ogni scatto nasceva in un mondo diverso e la stessa foto non
si poteva rifare. Serve WebGL vero (SwiftShader, niente `--disable-gpu`) o gli scheletri del
Libro escono come macchie 2D.
Serve perché i test misurano che i comandi ESISTANO, non che siano messi bene: sono passati
tre salvataggi schiacciati fino a sparire, riquadri di larghezze diverse e tre taglie di
pulsante nella stessa schermata, tutti con la suite verde. Build → foto → **guardarla** →
poi dire che è fatto. E quando si trova un difetto visivo, aggiungere anche una misura agli
e2e (larghezze uguali, spazi uniformi, stessa altezza): la foto la si guarda una volta, la
misura resta.

## Provare davvero su telefono
`npm run build && npm run mobile` apre il gioco in **telefoni emulati con Playwright** (iPhone SE,
iPhone 13 in verticale e in orizzontale, Pixel 7, col tocco), conferma il personaggio, salta
l'intro, attraversa le scene e fotografa in `.shots/mobile/`, segnalando cosa esce dallo schermo.
Serve perché gli e2e girano in Chrome headless, che su macOS non scende sotto ~500px: lo zoom
sbagliato su telefono (5 caselle visibili invece di 13, stanze tagliate) lì non si vedeva.
Playwright NON è una dipendenza: `npm i -g playwright` o `PLAYWRIGHT_PATH=…/playwright/index.mjs`.
Lo zoom sta in `fit()` (screen.js): `view.K` = pixel CSS per pixel di gioco (minimo 1),
`view.PX` = pixel FISICI (K × densità): la tela e `snap()` lavorano su PX.

## Coerenza visiva (design system)
I valori dell'interfaccia stanno in `:root` (in cima a `src/style.css`): colori (`--c-ink`,
`--c-line`, `--c-gold`, `--c-amber`, `--c-teal`, `--c-clay`), spazi in scala di 4
(`--sp-1..5`), raggi (`--r-1..3`), testo (`--fs-note/sm/md/lg`), larghezze (`--w-menu`,
`--w-panel`). Il CSS aveva 29 copie del marrone dei bordi e 17 dell'ambra: bastava sbagliare
una cifra perché un pannello stonasse senza che si capisse perché.
La conversione è FATTA: 191 usi sparsi (27 copie del marrone dei bordi, 20 della carta, 15
dell'ambra) ora passano dai token. Un test lo sorveglia: se un colore del tema ricompare
scritto a mano nel foglio, fallisce e dice quale e quante volte. Se serve una tinta nuova si
aggiunge un token, non una costante in mezzo a una regola. I colori usati UNA volta sola (le
sfumature dei singoli pannelli) restano dove sono: un token per un posto solo è un nome in più
da ricordare e basta. Niente riquadri dove il resto del gioco non ne ha: per separare bastano un titoletto
in oro maiuscolo e una riga `.sp-sep`.

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
14. **Un confine è UNA linea, disegnata da tutte e due le caselle.** Il profilo si calcola
   sul BORDO (coordinate condivise), non sulla casella: ognuna dipinge dentro di sé il colore
   dell'altra dove la curva pende verso di lei. Se lo disegna una sola (o solo il terreno "più
   alto"), viene dentellato da un lato e a righello dall'altro. Dentelli di 1-3 px, mai fasce:
   a sette pixel comparivano bande rettangolari. Vale anche per le chiazze di tono del terreno,
   che vanno sfrangiate sui lati o fra due toni vicini si vede solo la riga dritta.
15. **Niente due aree che scorrono una dentro l'altra**: su mobile si muove sempre quella
   sbagliata. Scorre la pagina, non il riquadro.

## Convenzioni / preferenze
- Rispondere in italiano.
- Mantenere lo stile cozy e la coerenza pixel SNES.
- Zero dipendenze runtime; Vite solo come dev tool.
- Ogni feature nuova: aggiungere check a `tests/run.mjs` e tenerla verde.
- Pagine di prova: `/wonders` (meraviglie, mostra gli sprite rifiniti a mano quando ci sono),
  `/sprites` (Sprite Studio: meraviglie, personaggio, capelli e cappelli nelle TRE viste, icone,
  **Viso** 6 (3 barbe + 3 occhiali),
  **Vestiti** 12 (4 maglie + 4 pantaloni × 2 passi: le gambe cambiano fra i
  fotogrammi, il torso no), **Natura** 14 = alberi/rocce/funghi/canne… e **Città** 11 = i 6 edifici + fontana/panchina/
  lampione/staccionata/imbocco grotta), `/playground` (mobile).
  Lo Studio si tira dentro il **markup vero del gioco** (fetch di `index.html` in un contenitore
  fuori schermo) prima di importare i moduli: così `getElementById('bagbtn').onclick = …` e
  simili trovano i loro elementi e l'import non esplode. Le funzioni di disegno scrivono solo
  sulla canvas `#cv`, quindi si disegna là e si copia (`viaGameCanvas`). Gli edifici vogliono
  il rettangolo di caselle `{x0,y0,x1,y1}`, non `{x,y,w,h}`.
