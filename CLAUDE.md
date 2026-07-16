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
src/render.js       groundTile, drawTree/Building/Fence/Creature, drawPlayer, render, freccia bussola
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
- `npm test` → suite Node senza browser (stub DOM in `tests/stub.mjs`): mondo/città,
  bussola, chimere/parco, sprite/look, smoke UI e render. Tenerla verde e **aggiornarla
  a ogni feature**.
- Il doppio clic su `index.html` NON funziona più (ES modules); serve il dev server.

## Meccaniche implementate
- **Mondo procedurale infinito** deterministico (value-noise + fbm, seed salvato).
  Terreni: acqua profonda/acqua/sabbia/prato/foresta/terra/montagna + pavimenti città/parco.
- **Scava ovunque** con rese per terreno (sabbia .72 / prato .35 / foresta .5 / roccia .6);
  caselle esauribili (`dugSet` salvato). Reperti grezzi → **Laboratorio** identifica → codex.
  **Scavo animato** (~0.5s, `P.digging` + `beginDig/stepDig` nel loop): piccone alzato/colpo,
  terra che schizza, movimento bloccato, esito alla risoluzione (vale anche per i siti).
- **Negozio** (vendi, +15⚡ a 15🪙), **Museo** (dona il primo esemplare → taglia 2×),
  **Locanda** (dormi → energia piena, +1 giorno).
- **Città procedurali** in celle `TCELL=40` (prob 0.45), nomi propri tema terra/ossa (`townName`).
  Taglie: **borgo** (Lab+Negozio), **paese** (+Locanda+**Barbiere**), **città**
  (6 edifici: +Museo+**Sartoria**, piazza larga 19, + **parco recintato**).
- **Barbiere** 💈: 6 tagli (Rasato/Corto/Lungo/Riccio/Punk/Stempiato) × 12 colori, 🪙8 a modifica
  (anteprima senza cappello).
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
  `corrente/max`, tooltip `title` su ogni tag.
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
  frequenza, cache per blocchi 8×8; tinta leggera sulle tile, tag HUD 🌍 + toast d'ingresso.
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

- **Multilingua** (`i18n.js`): **INGLESE di default**, italiano secondario. `tr(it, en)` inline
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
- **Museo rifatto**: donazioni **PEZZO PER PEZZO** (`S.museum[spId]=[parti]`, `donateItem` →
  {bounty, dna, count}): monete per ogni pezzo nuovo, 5/5 → **DNA estratto = specie
  RISVEGLIATA** (S.awakened, vista VIVA nel libro). Interno multi-stanza: **hall** (6 porte
  colorate per bioma, banco accoglienza con Curatore, tappeto rosso) → **ali espositive** con
  10 teche/specie (slot 5 pezzi accesi/spenti, targhetta rarità, stella dorata se completa);
  navigazione `INT.room` ('hall'|0..5), `HALL_DOORS`, `caseRects` (corsie 12px ≥ hitbox);
  prompt sulla teca = nome specie + n/5.

## Prossimi passi (decisi, in ordine)
1. **Missioni del Museo**: fetch quest generate ("Cranio di Magmadonte", taglia ×4).
2. **Mappe del tesoro**: reperto raro → X lontano → scavo leggendario garantito.
3. Agganciare gli SFX (`playSfx`) a scavo/monete/ritrovamenti.

- **Modalità DEBUG** (Ctrl+Shift+D in game, `debug.js`): energia e monete infinite (∞ nell'HUD,
  tag 🐞), libro completo, sartoria/barbiere gratis, velocità ×3. **Non distruttiva**: override
  runtime ai punti di lettura/spesa (`isDebug()`), il salvataggio non viene mai toccato.

## Semplificazioni note / debito tecnico
- I borghi non hanno Locanda (il Negozio vende comunque +15⚡).
- Il barbiere non cambia la pelle: tonalità solo nell'editor iniziale.
- Le chimere compaiono identiche in tutti i parchi (sono "magiche", va bene così).

## Prossimi passi proposti (in ordine consigliato)
1. **Multilingua**: dizionario i18n, **inglese di default**, italiano come seconda lingua
   (tradurre anche nomi specie/parti/rarità e generatori nomi città/chimere).
2. **Texture più varie**: variazioni per città (pavimenti/tetti), campi, terra, transizioni tra biomi.
3. Idee future: suoni cozy, stagioni/meteo, missioni del museo, foto alle chimere.

## Convenzioni / preferenze
- Rispondere in italiano.
- Mantenere lo stile cozy e la coerenza pixel SNES.
- Zero dipendenze runtime; Vite solo come dev tool.
- Ogni feature nuova: aggiungere check a `tests/run.mjs` e tenerla verde.
