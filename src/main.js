/* Boot + game loop */
import { S, P, cam, save, initState, setSaveErrorHandler, sanitizePos, clearCheatSnapshot } from './state.js';
import { FOOT_DY } from './body.js';
import { fit, view } from './screen.js';
import { findStart, findHomeSpot, openArea, invalidateHouseDecoCache, homeRoadBroken, homeRoadOk, homeTown } from './world.js';
import { TS } from './data.js';
import { applyLook } from './sprites.js';
import { collide, stepDig, gearSpeedMul, grantStarterGift, companionWorkTick, isMounted } from './gameplay.js';
import { updateCompanion } from './companion.js';
import { playIntro, introActive, drawIntroLine } from './intro.js';
import { updateHUD, updatePrompt, isModalOpen, isBagOpen, isBookOpen, isMapOpen, isPrepOpen, isTossOpen, openEditor, welcomeToasts, showBanner, lookPreviewPending, showIdleWelcome } from './ui.js';
import { idleHours, idleCoins, idleEligible, IDLE_DNA_CHANCE } from './idle.js';
import { updateCompass } from './compass.js';
import { trackPlayer } from './map.js';
import { checkWonderDiscovery, checkGateNotice } from './gameplay.js';
import { wonderName } from './wonders.js';
import { refreshVisParks, yardNear, updatePark, stepGateWalk } from './park.js';
import { render } from './render.js';
import { initSplash, splashActive, cloudEnabled, drawCornerAt } from './splash.js';
import { keys, steerFollow, checkStatueArrival } from './input.js';
import { MP, tick as mpTick, orologio as mpOrologio } from './mp.js';
import { advanceTime, seasonOf, SEASONS, isNight } from './daynight.js';
import { tr, seasonName, applyStaticTexts } from './i18n.js';
import { hydrateIcons } from './icons.js';
import { armAudioResume } from './audio.js';
import { INT, updateInterior, checkDoorEnter, enterInterior, enterHouseRoom } from './interior.js';
import { CAVE, updateCave, checkCaveEnter } from './cave.js';
import { caveEntranceAt } from './world.js';
import { showTip } from './ui.js';
import { waterTile } from './gameplay.js';
import { pruneExpired } from './commission.js';
import { eggReady } from './breeding.js';
import { expireQuests, questExpiryText } from './quests.js';
import { tutTick, tutActive } from './tutorial.js';
import { announceTutStep } from './ui.js';
import { advance, hasGoal, clearGoal } from './tapmove.js';
import { toast } from './ui.js';
import { isDebug } from './debug.js';
import { setPref } from './prefs.js';
import { VERSION } from './version.js';

/* GLI SCHIANTI VANNO RACCONTATI. Un errore JavaScript sul telefono di un giocatore è
   invisibile: non si può riprodurre e spesso non si sa nemmeno che è successo. Tutti i guasti
   corretti finora li ha segnalati qualcuno che si è preso la briga di scrivere — per uno che
   scrive, dieci chiudono la scheda.
   Si manda il minimo per capire (messaggio, dove, versione) e NIENTE che dica chi è. Una
   volta sola per sessione: gli errori si ripetono a ogni fotogramma, e non serve saperlo
   diecimila volte. Se la rete non c'è, pazienza: il gioco non deve accorgersene. */
if (typeof window !== 'undefined') {
  let raccontato = false;
  const racconta = (msg, dove) => {
    if (raccontato || !msg) return;
    /* "Script error." NUDO non serve a niente: è quello che il browser dice quando l'errore
       viene da un altro dominio (per noi: lo script di Google per l'accesso). Nasconde
       messaggio, file e riga per sicurezza. Segnalarlo vuol dire riempire l'elenco di righe
       che non si possono nemmeno cercare — e coprire quelle vere. */
    if (/^Script error\.?$/i.test(String(msg).trim()) && !dove) return;
    raccontato = true;
    try {
      fetch((window.DIGSY_API || './server/api') + '/oops.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        /* il CONTESTO vale quanto il messaggio: lo stesso errore in grotta o nel Libro sono
           due bug diversi, e senza sapere dove si cerca alla cieca */
        body: JSON.stringify({
          msg: String(msg).slice(0, 300),
          dove: String(dove || '').slice(0, 200),
          ver: VERSION,
          scena: (CAVE && CAVE.active) ? 'grotta' : (INT && INT.active) ? 'interno'
            : splashActive() ? 'menu' : 'mondo',
        }),
        keepalive: true,
      }).catch(() => {});
    } catch (e) { /* mai far pesare al giocatore un problema di segnalazione */ }
  };
  addEventListener('error', e => racconta(e.message, (e.filename || '') + ':' + (e.lineno || '')));
  addEventListener('unhandledrejection', e => racconta((e.reason && e.reason.message) || e.reason, 'promise'));
}

/* IL GIOCO SI INSTALLA. Con il service worker, digsy.dev-box.it diventa un'app: icona sulla
   schermata, niente barra del browser, e si gioca senza rete — il mondo è procedurale e il
   salvataggio sta nel dispositivo.
   Si registra DOPO il caricamento: durante l'avvio ogni millisecondo va al gioco, e questo
   può aspettare. In sviluppo si tiene spento, altrimenti si finisce per provare una versione
   in cache invece di quella appena scritta.
   `updateViaCache: 'none'` è la riga che conta: senza, il browser tiene in cache il service
   worker STESSO fino a un giorno, e una versione nuova può restare invisibile. */
if (typeof navigator !== 'undefined' && navigator.serviceWorker && location.protocol === 'https:') {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then(reg => { reg.update().catch(() => { /* niente rete o registrazione invalidata: pazienza */ }); })
      .catch(() => { /* il gioco funziona lo stesso: non è un errore da mostrare */ });
  });
  /* Il salvataggio non deve poter sparire. Senza questo, il sistema può ripulire i dati di un
     sito quando lo spazio scarseggia — e una partita da quaranta ore è irrecuperabile.
     È una richiesta: il browser decide, ma con un'app installata di solito dice di sì. */
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then(gia => { if (!gia) navigator.storage.persist(); }).catch(() => {});
  }
}

/* niente menu del tasto destro e niente scorciatoie devtools in gioco (esperienza "app") */
if (typeof addEventListener === 'function') {
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    const k = (e.key || '').toUpperCase();
    if (k === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'I' || k === 'J' || k === 'C'))) e.preventDefault();
  });
}

/* MOVIMENTO del giocatore in superficie. Estratto dal loop per poterlo provare: senza,
   nessun test poteva verificare che camminando le gambe si muovano davvero. */
function walk(dt) {
  let dx = 0, dy = 0, walkedToGoal = false;
  if (P.digging) { P.moving = false; stepDig(dt); clearGoal(); } // scavando non ci si muove
  else if (P.gateWalk) { stepGateWalk(dt); clearGoal(); }        // torna al cancello per chiuderlo
  else if (P.gateTurnUntil && Date.now() < P.gateTurnUntil) { P.moving = false; P.dir = 'up'; clearGoal(); } // ci si ferma a guardare il cancello chiudersi
  else if (keys.up || keys.down || keys.left || keys.right) {
    if (keys.up) dy--; if (keys.down) dy++; if (keys.left) dx--; if (keys.right) dx++;
    clearGoal();                                    // il comando diretto batte la meta
  } else if (hasGoal()) {
    /* "tocca dove andare": si cammina lungo il percorso calcolato, aggirando gli ostacoli */
    const spd = P.speed * gearSpeedMul() * (P.speedMul || 1);
    /* `freeAt` è la STESSA domanda della collisione: serve al taglio in linea retta (tapmove),
       che salta i waypoint raggiungibili dritti invece di passare per il centro di ognuno. */
    walkedToGoal = advance(dt, spd, (nx, ny) => {
      if (collide(nx, ny)) return false;
      P.x = nx; P.y = ny; return true;
    }, P, (x, y) => !collide(x, y));
    if (walkedToGoal) { P.anim += dt; P.moving = true; }
  }
  if (dx || dy) {
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    if (Math.abs(dx) > Math.abs(dy)) P.dir = dx < 0 ? 'left' : 'right'; else P.dir = dy < 0 ? 'up' : 'down';
    const spd = P.speed * gearSpeedMul() * (P.speedMul || 1);
    const nx = P.x + dx * spd * dt, ny = P.y + dy * spd * dt;
    if (!collide(nx, P.y)) P.x = nx; if (!collide(P.x, ny)) P.y = ny;
    P.anim += dt; P.moving = true;
  } else if (!P.digging && !walkedToGoal && !P.gateWalk) P.moving = false;
  /* `walkedToGoal`: senza, questo ramo azzerava P.moving a ogni frame anche mentre si
     camminava verso la meta, e il personaggio scivolava con le gambe ferme. */
}

let last = 0, hudAcc = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (introActive()) { requestAnimationFrame(loop); return; } // l'intro disegna la sua scena
  if (typeof window !== 'undefined' && window.__digsyFreeze) { requestAnimationFrame(loop); return; } // solo le foto di prova: tela ferma
  if (!isModalOpen() && !splashActive() && !isTossOpen()) {
    steerFollow();                  // col mouse tenuto premuto si va verso il puntatore
    /* IN COMPAGNIA: si dice dove si è. `tick` decide da solo se c'è qualcosa da dire (dieci
       volte al secondo, e solo se ci si è mossi) e non fa NIENTE se non si è in una stanza —
       chi gioca da solo non paga un centesimo di questo ramo. */
    if (MP.stato === 'dentro') {
      const dove = CAVE.active ? { pos: CAVE, scena: 'grotta' } : INT.active ? { pos: INT, scena: 'stanza' } : { pos: P, scena: 'world' };
      mpTick(ts, { x: dove.pos.x, y: dove.pos.y, dir: P.dir, moving: dove.pos.moving || P.moving, scene: dove.scena });
      /* se ospito, l'orologio lo do io: gli ospiti non lo calcolano, lo ricevono */
      mpOrologio(ts, S.day, S.tod);
    }
    /* HUD: va rinfrescato in QUALSIASI scena. Stava dopo i `return` di grotte e interni,
       quindi là sotto la barra restava congelata sull'ultimo valore visto fuori — un
       giocatore ha scavato in grotta fino a zero energia continuando a leggere "46/60". */
    hudAcc += dt; if (hudAcc > 2) { hudAcc = 0; updateHUD(); }
    /* TUTORIAL: sta qui sopra insieme all'HUD, e per la stessa ragione — i passi che si
       spuntano da soli (hai abbastanza da comprare la pala, hai la pala) vanno visti in
       QUALSIASI scena, compresi il Negozio e il Museo, che sono interni. */
    if (tutActive() && tutTick() === 'step') announceTutStep();
    /* OROLOGIO: sta qui sopra, PRIMA dei `return` di grotte e interni — stesso posto e
       stessa ragione dell'HUD. Il tempo scorre dovunque si stia giocando: sottoterra si
       passano dieci minuti veri a staccare cristalli, e prima si riemergeva alla stessa ora
       di quando si era scesi, con la commissione del Museo che non scadeva mai finché si
       restava dentro. Le grotte e gli interni NON sono una modale: là si gioca.
       Sotto non cambia niente a vedersi (la grotta è buia per conto suo, la stanza resta
       illuminata): solo le finestre virano al blu, così quando esci lo sapevi già. */
    /* ORE DI GIOCO: si contano qui, dove si conta anche l'orologio del mondo — cioè solo
       mentre si gioca davvero, non con una modale aperta o il gioco in pausa. È il numero
       che i giocatori guardano per primo nelle statistiche. */
    /* solo col gioco DAVANTI: una scheda lasciata aperta mentre si fa altro non è tempo
       giocato, e gonfiava proprio la misura che serve a capire quanto si gioca davvero */
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
      S.playSec = (S.playSec || 0) + dt;
    }
    if (advanceTime(dt)) {
      toast(tr('📅 Giorno ', '📅 Day ') + S.day + ' — ' + seasonName(seasonOf(S.day)));
      /* missioni del cartello scadute: lo si DICE. Sparivano in silenzio e chi le aveva in
         corso lo leggeva come una perdita di dati, non come una regola del gioco. */
      { const t = questExpiryText(expireQuests(S.day)); if (t) toast(t); }
      /* commissione scaduta: lo si dice, non si scopre tornando al museo */
      if (pruneExpired(S.day)) toast(tr('🏛️ Commissione scaduta', '🏛️ Commission expired'));
      /* l'uovo è pronto: lo si dice appena il giorno scatta, non si scopre tornando al Lab */
      if (eggReady(S.day)) toast(tr('🥚 Uovo quasi pronto: torna al Lab!', '🥚 Egg almost ready: back to the Lab!'));
    }
    if (CAVE.active) { // dentro una grotta: area buia esplorabile
      updateCave(dt, keys, P.speed * gearSpeedMul() * (P.speedMul || 1));
      updatePrompt();
      render(ts); requestAnimationFrame(loop); return;
    }
    if (INT.active) { // dentro una casa: stanza camminabile
      updateInterior(dt, keys, P.speed * gearSpeedMul() * (P.speedMul || 1));
      updatePrompt();
      render(ts); requestAnimationFrame(loop); return;
    }
    walk(dt);
    checkStatueArrival();            // toccata la statua da lontano: si apre all'arrivo
    companionWorkTick(dt);  // raccoglitore leggendario: se lavora, guida lui il movimento
    updateCompanion(dt, isMounted());    // in volo resta incollato; a terra insegue il player
    if (!isMounted()) {               // in volo si SORVOLA: per entrare scendi (tasto cavalcatura)
      checkDoorEnter(); // pestare una porta = entrare (niente E)
      checkCaveEnter(caveEntranceAt); // pestare un imbocco di grotta = entrare
    }
    if (sanitizePos()) clearGoal();  // posizione impazzita: riparata prima che rompa tutto
    trackPlayer();                  // la mappa si scopre camminando
    /* suggerimenti al PRIMO incontro: acqua davanti, imbocco di grotta, notte */
    { const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
      if (!S.tips || !S.tips.dig) showTip('dig');
      else if (waterTile(ptx, pty + 1) || waterTile(ptx, pty - 1)) showTip('water');
      else if (caveEntranceAt(ptx, pty - 1)) showTip('cave');
      else if (isNight()) showTip('night'); }
    const wonder = checkWonderDiscovery();
    if (wonder) {                   // MERAVIGLIA TROVATA: il momento "wow"
      showBanner('✨ ' + tr('MERAVIGLIA TROVATA', 'WONDER DISCOVERED') + '<br><span style="font-size:.8em">' + wonderName(wonder.type) + '</span>', 3000);
      toast('📖 ' + tr('Aggiunta alle Meraviglie del Libro', 'Added to the Wonders in your Book'));
    }
    updatePrompt();
  }
  /* overlay a tutto schermo (zaino/libro): il mondo è coperto → salta il render pesante
     (le animazioni sono comunque in pausa). La modale edifici è semitrasparente: si continua. */
  if (isBagOpen() || isBookOpen() || isPrepOpen() || isTossOpen()) { requestAnimationFrame(loop); return; }
  updateCompass(ts);
  checkGateNotice();
  refreshVisParks();
  if (yardNear) updatePark(dt);
  render(ts);
  requestAnimationFrame(loop);
}

function boot() {
  /* se il browser non può scrivere (quota piena, Safari privato) il giocatore DEVE saperlo:
     senza avviso si gioca per ore e si perde tutto al primo refresh */
  setSaveErrorHandler(name => {
    const full = /quota|QuotaExceeded/i.test(name || '');
    toast('⚠️ ' + (full
      ? tr('Spazio pieno: NON sto salvando!', 'Storage full: NOT saving!')
      : tr('Salvataggi bloccati (navigazione privata?)', 'Saving blocked (private mode?)')));
  });
  const loaded = initState();
  /* PARCO CHE RENDE (idle.js): quanto tempo VERO è passato dall'ultimo salvataggio, calcolato
     SUBITO — prima che qualunque `save()` qui sotto lo azzeri riscrivendo S.idleAt a adesso.
     Si racconta solo dopo la splash (startGame), ma si misura qui. */
  let idleResult = null;
  if (loaded && S.idleAt) {
    const hrs = idleHours(Date.now(), S.idleAt);
    if (idleEligible(hrs)) {
      const coins = idleCoins(hrs, (S.creatures || []).length);
      if (coins > 0) { S.coins += coins; idleResult = { coins }; }
      if ((S.creatures || []).length && S.donated && S.donated.length && Math.random() < IDLE_DNA_CHANCE) {
        const sp = S.donated[Math.floor(Math.random() * S.donated.length)];
        S.dna[sp] = (S.dna[sp] || 0) + 1;
        idleResult = idleResult || { coins: 0 };
        idleResult.dnaSp = sp;
      }
    }
    /* riparte da ADESSO, sempre — un doppio refresh entro pochi secondi non deve ripetere il
       premio finché il prossimo autosave (5s) non arriva a coprirlo da solo */
    S.idleAt = Date.now();
    if (idleResult) save();
  }
  /* lo SNAPSHOT dei comandi è per-SESSIONE: si azzera al caricamento. Persisteva fra i refresh e
     `vanilla` finiva per ripristinare uno stato VECCHIO di una sessione passata (vecchio compagno +
     vecchia posizione), sovrascrivendo la partita corrente. Ora la partita coi comandi è salvata e
     basta; `vanilla` annulla solo i comandi dati IN questa sessione. */
  clearCheatSnapshot();
  applyLook();
  let startTown = null;
  /* PARTITA NUOVA DI ZECCA: la prima cosa che si vede è casa propria, non il mondo aperto.
     `freshGame` resta vero solo per QUESTO avvio — un salvataggio già iniziato (anche se il
     soccorso qui sotto lo riposiziona) ha già superato l'introduzione e non va rispinto dentro
     casa: sarebbe sorprendente per una partita già avanti. */
  let freshGame = false;
  if (S.started) {
    P.x = S.px; P.y = S.py;
    /* soccorso SOLO se la posizione salvata è davvero INVALIDA (dentro un solido, o del tutto murata
       senza una casella libera adiacente). NON riposizionare una posizione valida solo perché è in
       un punto chiuso: in un BOSCO ci si salva benissimo (need=2 = basta 1 casella libera vicina). */
    if (collide(P.x, P.y) || !openArea(Math.floor(P.x / TS), Math.floor(P.y / TS), 2)) {
      const st = findStart(); P.x = st.x; P.y = st.y; startTown = st.town; save();
    }
  } else {
    const st = findStart(); P.x = st.x; P.y = st.y; startTown = st.town; S.started = true; freshGame = true; save();
  }
  /* CASA del giocatore: fissata UNA VOLTA, vicino alla città grande di partenza (o, per un save
     già avviato che non l'aveva ancora, vicino a quella più vicina alla posizione salvata). */
  if (S.home === undefined) {
    const town = startTown || findStart().town || null;
    S.home = town ? findHomeSpot(town) : null;
    if (S.home) invalidateHouseDecoCache(); // il mondo lì poteva già avere alberi/funghi in cache
    save();
  } else if (S.home && homeRoadBroken()) {
    /* SALVATAGGI NATI PRIMA DEL CONTROLLO SUL VIALETTO: la casa poteva finire dall'altra
       parte del mare, con l'unica strada che attraversava l'acqua e un edificio di traverso —
       casa irraggiungibile a piedi (segnalato con foto). Si rimette una volta sola, e solo se
       la strada è davvero rotta: la casa dentro (stanze e arredo) sta in S.house, non nelle
       coordinate, quindi non si perde niente. */
    const t2 = homeTown();
    const meglio = t2 ? findHomeSpot(t2) : null;
    if (meglio && homeRoadOk(meglio.x, meglio.y, t2)) { S.home = meglio; invalidateHouseDecoCache(); save(); }
  }
  cam.x = P.x; cam.y = P.y;
  fit(); addEventListener('resize', fit);
  applyStaticTexts();
  hydrateIcons();
  armAudioResume(); // musica in loop anche dopo un refresh (parte al primo gesto)
  updateHUD();
  document.getElementById('boot').style.display = 'none';
  /* DEBUG VISIVO (SOLO dev): ?mount / ?dig forzano una scena da fotografare. Tutta la logica
     sta in devview.js, importato solo qui sotto DEV → in produzione il ramo è morto. */
  let devView = false;
  if (import.meta.env && import.meta.env.DEV && typeof location !== 'undefined') {
    const _p = new URLSearchParams(location.search);
    if (_p.get('mount') || _p.get('dig')) {
      devView = true;
      S.lookDone = true; S.introSeen = true; S.started = true; setPref('tips', false); // SINCRONO: prima che initSplash apra editor/tip (il resto è in devview, async)
      import('./devview.js').then(m => m.setupDebugView(_p));
    }
  }
  requestAnimationFrame(loop);
  /* splash → (prima volta) editor personaggio → INTRO (lore) → gioco */
  initSplash(() => {
    const startGame = () => { if (!loaded) welcomeToasts(); else if (idleResult) showIdleWelcome(idleResult); };
    /* "la prima cosa che vede è la sua casa": per una partita NUOVA si entra dritti nella Sala
       (stessa strada di `checkDoorEnter`/`enterHouseRoom`, mai un mondo a parte), DOPO editor e
       intro — mai prima, o si sovrapporrebbe alle loro scene. La posizione FUORI (P.x/P.y) va
       comunque sistemata subito accanto alla porta: è quella che conta per bussola/salvataggio
       finché non si esce davvero, ed è la stessa che `exitInterior()` sceglierebbe. */
    const enterHome = () => {
      if (freshGame && S.home) {
        enterInterior({ type: 'house', doorx: S.home.x, doory: S.home.y }, null);
        enterHouseRoom(0);
        P.x = S.home.x * TS + 8; P.y = (S.home.y + 1) * TS + 10;
        save();
      }
    };
    const runIntro = (cb) => { if (!S.introSeen) playIntro(() => { S.introSeen = true; grantStarterGift(); save(); cb(); }); else cb(); };
    if (!S.lookDone) openEditor(() => runIntro(() => { enterHome(); startGame(); }));
    else runIntro(() => { enterHome(); startGame(); });
  });
  if (!devView) setInterval(() => { if (!lookPreviewPending()) save(); }, 5000);   // niente autosave in dev-view, NÉ mentre provi un look (cappello/vestiti): l'anteprima non deve persistere al refresh senza pagare
  /* il battito: quanto si gioca e fin dove si arriva. Serve a chi fa provare il gioco, non
     al gioco — e si spegne dalle Impostazioni. */
  import('./beat.js').then(b => b.avviaBattito()).catch(() => {});
  /* PARTITA IN CLOUD: se il giocatore è già entrato in una sessione precedente, la sincronia
     deve ripartire DA SOLA all'avvio — non solo quando si apre il menu dell'account. Senza
     questo si scaricava la partita entrando e poi si giocava per ore senza che il server ne
     sapesse più niente. Caricato solo se il cloud è acceso: chi gioca in locale non si tira
     dietro un pezzo di rete che non userà mai. */
  if (cloudEnabled()) {
    import('./account.js').then(async (a) => {
      a.wireSync();                      // il salvataggio locale ora avvisa il server
      try { await a.refreshMe(); } catch (e) { /* offline: si riproverà al prossimo salvataggio */ }
    }).catch(() => { /* senza rete si gioca lo stesso, in locale */ });
  }
}

/* SONDA per i test visivi/mobile: la pagina di prova apre gli overlay veri senza simulare
   tocchi (vedi tests/e2e.mjs e /playground). In gioco non cambia nulla. */
if (typeof window !== 'undefined') {
  import('./ui.js').then(u => {
    window.__digsy = {
      openBag: u.openBag, closeBag: u.closeBag, openBook: u.openBook, closeBook: u.closeBook,
      openMap: u.openMap, closeMap: u.closeMap, openGuide: u.openGuide, openWonderBook: u.openWonderBook,
      openLetters: u.openLetters, openAchievements: u.openAchievements, closeModal: u.closeModal,
      openQuests: u.openQuests, updateHUD: u.updateHUD, drawIntroLine, drawCornerAt,
      /* l'EDITOR del personaggio: si apre solo alla primissima partita, quindi senza questa
         riga non c'era modo di fotografarlo né di farlo disegnare da un test (regola 9) */
      openEditor: () => u.openEditor(() => {}),
      /* FOGLIO DEL VISO (`npm run shot -- viso`): ogni barba e ogni paio di occhiali nelle tre
         viste, uno sotto l'altro. Una forma da quattro pixel si giudica SOLO affiancata alle
         altre: da sola sembra sempre a posto, e il difetto salta fuori quando la riga sopra
         fa da metro. Disegna su una tela sua, sopra a tutto: il gioco sotto non si tocca. */
      faceSheet: (K, only, pick) => Promise.all([import('./sprites.js'), import('./data.js')]).then(([sp, d]) => {
        K = +K || 5;
        const dirs = only ? [only] : ['down', 'right', 'up'];
        const CW = 36 * K, CH = 38 * K, LW = 170;
        const rows = d.BEARD_STYLES.map(x => ({ f: 'beardStyle', id: x.id, n: 'barba · ' + x.label }))
          .concat(d.GLASSES_STYLES.filter(x => x.id !== 'none').map(x => ({ f: 'glassesStyle', id: x.id, n: 'occhiali · ' + x.label })))
          .filter(x => !pick || pick.split(',').includes(x.id));
        const box = document.createElement('div');
        box.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#2a2419;overflow:auto';
        const cv = document.createElement('canvas');
        cv.width = LW + dirs.length * CW; cv.height = rows.length * CH + 8;
        cv.style.cssText = 'display:block;margin:0 auto;image-rendering:pixelated';
        const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        const keep = { ...S.look };
        S.look.hatStyle = 'none'; S.look.beardStyle = 'none'; S.look.glassesStyle = 'none';
        rows.forEach((r, i) => {
          S.look.beardStyle = r.f === 'beardStyle' ? r.id : 'none';
          S.look.glassesStyle = r.f === 'glassesStyle' ? r.id : 'none';
          sp.applyLook();
          const y = i * CH + 4;
          g.fillStyle = i % 2 ? '#332c1f' : '#3a3224'; g.fillRect(0, y, cv.width, CH);
          g.fillStyle = '#e7d9b6'; g.font = '14px ui-monospace,monospace'; g.textBaseline = 'middle';
          g.fillText(r.n, 8, y + CH / 2);
          dirs.forEach((dir, j) => {
            g.save(); g.setTransform(K, 0, 0, K, LW + j * CW, y);
            sp.drawHero(g, 2, 2, dir, 0, false);
            g.restore();
          });
        });
        S.look = keep; sp.applyLook();
        box.appendChild(cv); document.body.appendChild(box);
        return rows.length;
      }),
      splashView: (v) => import('./splash.js').then(sp => sp.setView && sp.setView(v)),
      /* entrare/uscire dalle scene: serve agli e2e per DISEGNARLE davvero. Una regressione
         negli interni era passata inosservata perché nessun test ci entrava mai. */
      enterRoom: (t) => import('./interior.js').then(m => { m.enterInterior({ type: t, name: t, x: Math.floor(P.x / 16), y: Math.floor(P.y / 16) }); return true; }),
      leaveRoom: () => import('./interior.js').then(m => { try { m.exitInterior(); } catch (e) { /* la tile d'uscita dipende dalla città */ } }),
      /* la casa ha una stanza per volta (atrio + Sala/Cucina/Bagno/Camera): senza questo,
         fotografare o testare una stanza specifica significava camminare la transizione a mano */
      enterHouseRoom: (id) => import('./interior.js').then(m => { m.enterHouseRoom(id); return true; }),
      /* modulo intero della CASA: raccogli/ruota/ripiazza un mobile (M4) muove uno stato "in
         mano" che vive DENTRO house.js (non nel salvataggio), quindi fotografarlo o testarlo
         richiede le sue funzioni vere, non solo `state()`. */
      house: () => import('./house.js'),
      /* il prompt/i bottoni a schermo (Esci, Ruota/Annulla) si aggiornano dentro il game
         loop vero: `frame()` disegna la canvas ma non li tocca, quindi senza questo le foto
         "in mano" mostravano il ghost ma non i due bottoni sotto. */
      updatePrompt: () => import('./ui.js').then(u => { u.updatePrompt(); return true; }),
      /* dove si sta DENTRO la stanza. La galleria del museo è 60×62 tile e si entra sempre dalla
         porta in fondo: senza questo, ogni foto e ogni test la ritraggono dall'atrio e le sale
         con i piedistalli — cioè quasi tutta la scena — non vengono mai disegnate. */
      intPos: (tx, ty) => import('./interior.js').then(m => { m.INT.x = tx * TS + 8; m.INT.y = ty * TS + 8; return [m.INT.x, m.INT.y]; }),
      /* foto della coccola: mette la reazione dell'animale della bottega a metà (t in secondi rimasti) */
      petPose: (t) => import('./interior.js').then(m => { const p = m.SHOP_PETS[m.INT.b && m.INT.b.type]; if (p) m.INT.pet = { kind: p.kind, t: +t || 1.4 }; return !!p; }),
      enterCave: () => import('./cave.js').then(m => { m.enterCave(1, Math.floor(P.x / 16), Math.floor(P.y / 16)); return true; }),
      leaveCave: () => import('./cave.js').then(m => m.exitCave()),
      inRoom: () => import('./interior.js').then(m => !!m.INT.active),
      /* DOVE SI TROVA CHI SI STA GUIDANDO: fuori è il giocatore del mondo, dentro una stanza o
         una grotta è un altro personaggio con le sue coordinate. Serve alla prova col dito su
         telefono: senza, quella prova leggeva il personaggio sbagliato e diceva «non ci si
         muove» mentre in casa ci si muoveva benissimo. */
      heroPos: () => Promise.all([import('./interior.js'), import('./cave.js')]).then(([i, c]) =>
        i.INT.active ? { x: i.INT.x, y: i.INT.y, dove: 'stanza' }
          : c.CAVE.active ? { x: c.CAVE.x, y: c.CAVE.y, dove: 'grotta' }
            : { x: P.x, y: P.y, dove: 'mondo' }),
      /* palloncino di dialogo: va acceso per forza nei test, altrimenti il ramo che lo
         disegna non viene mai eseguito (ed è proprio lì che si era rotto) */
      say: (t) => import('./interior.js').then(m => { m.INT.say = t ? { text: t } : null; }),
      /* DISEGNA un frame su richiesta: in Chrome headless con --virtual-time-budget il
         requestAnimationFrame non avanza, quindi senza questo i test "visivi" non
         disegnavano davvero nulla e ogni crash di rendering restava invisibile. */
      frame: (t) => { render(t || 1000); return true; },
      /* un passo del mondo su richiesta: in headless il rAF è fermo, quindi senza questo
         gli e2e non potrebbero verificare NIENTE di ciò che accade camminando */
      stepWorld: (dt) => { steerFollow(); walk(dt || 1 / 60); updateCompanion(dt || 1 / 60, isMounted()); return { moving: P.moving, anim: P.anim, x: P.x, y: P.y }; },
      /* un passo del CORTILE: le chimere partono tutte da una posizione derivata dall'uid e si
         sparpagliano solo camminando. Senza questo, in headless (rAF fermo) ogni foto del
         cortile le ritrae schierate sulla stessa griglia, che non è come si vede giocando. */
      stepPark: (dt) => { refreshVisParks(); if (yardNear) updatePark(dt || 1 / 60); return yardNear ? 1 : 0; },
      /* la console dei comandi, senza doverla aprire e digitare: serve a portare una partita
         in uno stato preciso (godmode, goto=..., chimera) prima di fotografarla o misurarla. */
      cmd: (s) => import('./commands.js').then(m => m.runCommand(s)),
      /* lo stato della partita in chiaro. I comandi arrivano fin dove arrivano — `godmode`
         sblocca tutto O NIENTE, e per una foto serve la via di mezzo (dieci specie risvegliate,
         non sessantasei; uno zaino con dentro qualcosa, non 330 pezzi su 14 posti). */
      state: () => S,
      /* il giocatore (posizione compresa). I `goto=` lasciano dove capita — accanto alla statua,
         sulla prima tile del bioma — e da lì l'inquadratura è quella che è: serve poter spostare
         la camera di qualche tile per comporre la scena. */
      player: () => P,
      /* porta Digsy in un punto della grotta aperta (frazioni della larghezza/altezza), sul pavimento */
      caveAt: (fx, fy) => import('./cave.js').then(m => { const C = m.CAVE; let tx = Math.floor(C.w * fx), ty = Math.floor(C.h * fy); for (let r = 0; r < 20; r++) { let hit = null; for (let dy = -r; dy <= r && !hit; dy++) for (let dx = -r; dx <= r && !hit; dx++) if (!m.caveSolid(tx + dx, ty + dy) && !m.caveSolid(tx + dx, ty + dy + 1)) hit = [tx + dx, ty + dy]; if (hit) { C.x = hit[0] * 32 + 16; C.y = hit[1] * 32 - 10; break; } } return true; }),
      reveal: (r) => import('./map.js').then(m => m.revealArea(Math.floor(P.x / TS), Math.floor(P.y / TS), r)),
      townHere: () => import('./world.js').then(w => w.townForTile(Math.floor(P.x / TS), Math.floor(P.y / TS))),
      /* `godmode` accende anche la modalità debug, e con quella l'HUD mostra ∞ e il tag 🐞:
         va bene mentre si prova, non in una foto che finisce in vetrina. */
      debug: (on) => import('./debug.js').then(m => { m.setDebug(!!on); return u.updateHUD(), !!on; }),
      /* stato del "tocca dove andare": gli e2e verificano che il tocco sulla canvas
         diventi davvero una meta (listener + preferenze + conversione schermo→mondo) */
      goalInfo: () => import('./tapmove.js').then(m => ({ on: m.goal.on, x: m.goal.x, y: m.goal.y,
        tile: m.goalTile(),
        px: P.x, py: P.y, cx: cam.x, cy: cam.y, reach: m.inReach(m.goal.x, m.goal.y) })),
      setPref: (k, v) => import('./prefs.js').then(m => m.setPref(k, v)),
      keysNow: () => import('./input.js').then(m => ({ ...m.keys })),
      /* stato dei blocchi che impediscono il tocco: serve agli e2e per capire PERCHÉ
         un tocco non è stato raccolto invece di limitarsi a fallire */
      uiBusy: () => import('./ui.js').then(u => import('./splash.js').then(sp => ({
        modal: u.isModalOpen(), splash: sp.splashActive(), prep: u.isPrepOpen(),
      }))),
      resume: () => import('./splash.js').then(sp => sp.resumeSplash()),
      /* audio: acceso/spento e stato del contesto. Gli e2e lo usano per provare, in un browser
         VERO, che mandare la pagina in background zittisce il gioco (su Android la musica
         continuava col browser ridotto e si doveva chiudere l'app). */
      audio: () => import('./audio.js').then(a => a.audioState()),
      audioStart: () => import('./audio.js').then(a => { a.setMusicOn(true); a.startAudio(); return a.audioState(); }),
      openStore: () => import('./ui.js').then(u => u.openBuilding({ type: 'store', name: 'Negozio' })),
      openFurnShop: () => import('./ui.js').then(u => u.openBuilding({ type: 'furniture', name: "Bottega d'arredo" })),
      /* un toast su richiesta: serve agli e2e per provare, in un browser VERO, che il
         messaggio si veda anche con un pannello aperto (là finiva dietro la modale) */
      toast: (m) => { u.toast(m || 'test'); return true; },
      /* il LABORATORIO: fusione, chimera e risveglio. È il pannello dove un bottone che
         rifiuta senza spiegare sembra rotto, quindi va guardato, non solo misurato. */
      openLab: () => import('./ui.js').then(u => u.openBuilding({ type: 'lab', name: 'Laboratorio' })),
      openMuseum: () => import('./ui.js').then(u => u.openBuilding({ type: 'museum', name: 'Museo' })),
      openTailor: () => import('./ui.js').then(u => u.openBuilding({ type: 'tailor', name: 'Sartoria' })),
      openBarber: () => import('./ui.js').then(u => u.openBuilding({ type: 'barber', name: 'Barbiere' })),
      /* il pannello COMPAGNO E CORTILE: è dove si sceglie chi ti segue e chi vive in casa, e
         senza questo ponte non si poteva né fotografare né far disegnare da un test */
      openCompanion: () => import('./ui.js').then(u => { u.openCompanionPicker(); return true; }),
      /* il rettangolo del CORTILE: serve a mettersi in punti precisi (davanti al cancello)
         per fotografare o misurare, senza indovinare le coordinate */
      yard: () => import('./world.js').then(w => w.yardRect()),
      /* il modulo del COMPAGNO: dove sta e come segue, per le foto e le prove che lo guardano */
      companion: () => import('./companion.js'),
      /* il VASSOIO dell'arredo nella stanza in cui si è: schede e ricerca vanno provate in un browser */
      openTray: () => import('./ui.js').then(u => import('./interior.js').then(m => { u.openFurnitureTray(m.INT.houseRoom == null ? 0 : m.INT.houseRoom, 3, 3); return true; })),
      /* GALLERIA di un tema del catalogo: ogni pezzo disegnato dalla sua ricetta su un
         pavimento, col nome sotto. Serve a GUARDARE duecentocinquanta mobili tutti insieme (per le
         foto), non entra nel gioco. */
      /* tutte le meraviglie insieme sul terreno della loro zona, per giudicarle una accanto all'altra */
      /* gli esterni degli edifici in fila, giorno e notte, su lastricato e con tre materiali di tetto */
      buildingGallery: () => Promise.all([import('./townArt.js'), import('./brush.js'), import('./tiles.js')]).then(([ta, br, tl]) => {
        const types = ['store', 'lab', 'museum', 'inn', 'barber', 'tailor', 'furniture', 'house'];
        const cw = 230, ch = 150, cols = 4, rows = 4;
        const cv2 = document.createElement('canvas'); cv2.width = cols * cw * 2; cv2.height = rows * ch * 2;
        const c2 = cv2.getContext('2d'); c2.imageSmoothingEnabled = false; c2.scale(2, 2);
        const g = { ctx: c2, shade8: br.shade8, rect: (x, y, w, h, c) => { c2.fillStyle = c; c2.fillRect(x, y, w, h); }, px: (x, y, c) => { c2.fillStyle = c; c2.fillRect(x, y, 1, 1); } };
        const builds = tl.BIOME_BUILD;
        for (let r = 0; r < rows; r++) types.forEach((t, i) => {
          const row = r * 2 + Math.floor(i / 4), col = i % 4; if (row >= rows) return;
          const x = col * cw, y = row * ch; if (r > 0 && Math.floor(i / 4) === 0 && false) return;
          const BB = builds[(r * 2 + i) % builds.length], night = r === 1;
          c2.fillStyle = night ? '#6a6a70' : '#d8c49a'; c2.fillRect(x, y, cw, ch);
          const w = (t === 'museum' ? 5 : 3) * 32;
          c2.save(); c2.translate(x + (cw - w) / 2, y + ch - 80);
          const tq = typeof location !== 'undefined' && new URLSearchParams(location.search).get('t');   // ?t=ms: un fotogramma delle animazioni
          (ta.FRONTS[t])(g, w, 64, BB, night ? '#ffdf8a' : '#8fd0e6', night, tq != null ? { t: +tq, ph: 0 } : undefined);
          c2.restore();
          c2.fillStyle = '#000'; c2.font = 'bold 10px monospace'; c2.fillText(t + ' · ' + (BB.mat || '') + (night ? ' · notte' : ''), x + 4, y + 12);
        });
        cv2.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;image-rendering:pixelated';
        document.body.appendChild(cv2); return true;
      }),
      /* gli oggetti piccoli del mondo tutti insieme, sul loro terreno, per giudicarli a colpo d'occhio */
      /* galleria delle POSE del personaggio: camminata, scavo, accetta, piccone, bici, pattini,
         barca, motoscafo, pesca, volo — nelle quattro direzioni, dal codice vero del gioco */
      poseGallery: (solo, zoom, shirt) => Promise.all([import('./render.js'), import('./screen.js'), import('./state.js')]).then(([r, sc, st]) => {
        const c = sc.ctx, P2 = st.P, S2 = st.S, saved = { ...P2 }, sg = S2.gear;
        if (shirt) S2.look.shirtStyle = shirt;
        const stools = { ...S2.tools }, smount = S2.mounted;
        S2.tools.bike = S2.tools.skates = true;
        const dirs = ['down', 'right', 'up', 'left'];
        const poses = [
          ['cammina 1', () => { P2.moving = true; P2.anim = 0; }], ['cammina 2', () => { P2.moving = true; P2.anim = 0.15; }],
          ['scava su', () => { P2.digging = { kind: 'dig', t: 0.05, dur: 1 }; }], ['scava giù', () => { P2.digging = { kind: 'dig', t: 0.35, dur: 1 }; }],
          ['accetta', () => { P2.digging = { kind: 'chop', t: 0.05, dur: 1 }; }], ['accetta colpo', () => { P2.digging = { kind: 'chop', t: 0.35, dur: 1 }; }],
          ['piccone carica', () => { P2.digging = { kind: 'mine', t: 0.1, dur: 1 }; }], ['piccone fendente', () => { P2.digging = { kind: 'mine', t: 0.25, dur: 1 }; }],
          ['piccone impatto', () => { P2.digging = { kind: 'mine', t: 0.33, dur: 1 }; }],
          ['bici', () => { S2.gear = 'bike'; P2.moving = true; P2.anim = 0; }], ['pattini', () => { S2.gear = 'skates'; P2.moving = true; P2.anim = 0; }], ['pattini 2', () => { S2.gear = 'skates'; P2.moving = true; P2.anim = 0.15; }],
          ['barca', 'boat'], ['motoscafo', 'motorboat'], ['pesca', 'fish'], ['volo', 'mount'],
        ];
        c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#9cc47e'; c.fillRect(0, 0, 4000, 4000);
        const K = (sc.view.PX || sc.view.K) * (+zoom || 1); c.setTransform(K, 0, 0, K, 0, 0);
        const pick = solo ? poses.filter(p => solo.split(',').includes(p[0])) : poses;
        pick.forEach(([nm, f], i) => dirs.forEach((d, j) => {
          const x = 70 + j * 80, y = 60 + i * 70;
          Object.assign(P2, saved, { dir: d, moving: false, anim: 0, digging: null }); S2.gear = null; S2.mounted = f === 'mount' ? smount : false;
          if (j === 0) { c.fillStyle = '#000'; c.font = '7px monospace'; c.fillText(nm, 2, y + 20); }
          try {
            if (typeof f === 'function') { f(); r.drawPlayerAt(x + 20, y); }
            else if (f === 'boat') r.drawBoat(x + 20, y);
            else if (f === 'motorboat') r.drawMotorboat(x + 20, y);
            else if (f === 'fish') { P2.digging = { kind: 'fish', t: 0.3, dur: 1 }; r.drawBoat(x + 20, y); }
            else if (f === 'mount') r.drawFlyingMount(x + 20, y + 4);
          } catch (e) { c.fillStyle = '#f00'; c.font = '5px monospace'; c.fillText(e.message.slice(0, 30), x, y); }
        }));
        Object.assign(P2, saved); S2.gear = sg; S2.tools = stools; S2.mounted = smount;
        const src = document.getElementById('cv'), snap2 = document.createElement('canvas');
        snap2.width = src.width; snap2.height = src.height; snap2.getContext('2d').drawImage(src, 0, 0);
        snap2.style.cssText = 'position:fixed;left:0;top:0;width:' + src.style.width + ';height:' + src.style.height + ';z-index:9999;image-rendering:pixelated';
        document.body.appendChild(snap2);
        return true;
      }),
      /* galleria delle CREATURE: specie risvegliate e chimere nelle tre viste, alla risoluzione del
         parco (res 2) e a quella della cavalcatura (res 4) */
      creatureGallery: (zoom, res) => Promise.all([import('./render.js'), import('./screen.js'), import('./data.js')]).then(([r, sc, dt]) => {
        const c = sc.ctx, sp = dt.ALL_SPECIES || dt.SPECIES;
        if (res === 'tutte') {                                  // tutte le specie di profilo, col nome
          c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#8fbf6a'; c.fillRect(0, 0, 4000, 4000);
          const K2 = (sc.view.PX || sc.view.K) * (+zoom || 1); c.setTransform(K2, 0, 0, K2, 0, 0); c.imageSmoothingEnabled = false;
          sp.forEach((s1, i) => {
            const cv = r.creatureSprite({ c: { skull: s1.id, torso: s1.id, leg: s1.id, q: 'raro' } }, 'side');
            const x = 4 + (i % 11) * 52, y = 10 + Math.floor(i / 11) * 52;
            if (cv) c.drawImage(cv, x, y + 40 - cv.height);
            c.fillStyle = '#000'; c.font = '5px monospace'; c.fillText(s1.id.slice(0, 11), x, y + 48);
          });
          const src0 = document.getElementById('cv'), sn = document.createElement('canvas');
          sn.width = src0.width; sn.height = src0.height; sn.getContext('2d').drawImage(src0, 0, 0);
          sn.style.cssText = 'position:fixed;left:0;top:0;width:' + src0.style.width + ';height:' + src0.style.height + ';z-index:9999;image-rendering:pixelated';
          document.body.appendChild(sn); return true;
        }
        const pick = [0, 7, 13, 22, 31, 38, 44, 52, 59].map(i => sp[i % sp.length].id);
        const list = pick.map(id => ({ c: { skull: id, torso: id, leg: id, q: 'raro' } }));
        for (let i = 0; i < 4; i++) list.push({ c: { skull: pick[i], torso: pick[(i + 3) % pick.length], leg: pick[(i + 6) % pick.length], q: 'raro' } });
        c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#8fbf6a'; c.fillRect(0, 0, 4000, 4000);
        const K = (sc.view.PX || sc.view.K) * (+zoom || 1); c.setTransform(K, 0, 0, K, 0, 0); c.imageSmoothingEnabled = false;
        const R2 = +res || 2, cell = R2 > 2 ? 90 : 48;
        list.forEach((a, i) => ['side', 'front', 'back'].forEach((v, j) => {
          const cv = r.creatureSprite(a, v, R2 > 2 ? { res: R2 } : undefined);
          const x = 4 + ((i % 4) * 3 + j) * cell, y = 4 + Math.floor(i / 4) * cell;
          if (cv) c.drawImage(cv, x, y);
        }));
        const src = document.getElementById('cv'), snap2 = document.createElement('canvas');
        snap2.width = src.width; snap2.height = src.height; snap2.getContext('2d').drawImage(src, 0, 0);
        snap2.style.cssText = 'position:fixed;left:0;top:0;width:' + src.style.width + ';height:' + src.style.height + ';z-index:9999;image-rendering:pixelated';
        document.body.appendChild(snap2);
        return true;
      }),
      smallGallery: () => Promise.all([import('./render.js'), import('./props.js'), import('./tiles.js'), import('./world.js'), import('./screen.js'), import('./noise.js')]).then(([r, pr, tl, w, sc, noiseMod]) => {
        const c = sc.ctx, items = [
          ['imbocco', (x, y) => r.drawCaveEntrance(x, y, 1000), w.MTN], ['X tesoro', (x, y) => r.drawXmark(x, y, 400), w.GRASS], ['buca', (x, y) => pr.drawHole(x, y, 3, 4), w.GRASS], ...Array.from({ length: 10 }, (_, k) => ['buca ' + (k + 1), (x, y) => { for (let t = 0; t < 400; t++) if (Math.floor(noiseMod.vhash(t, k * 7, 104) * 10) % 10 === k) return pr.drawHole(x, y, t, k * 7); }, w.DIRT]),
          ['relitto', (x, y) => r.drawWreck(x, y, 1000, 2, 2), w.WATER], ['masso', (x, y) => pr.drawBoulder(x, y, 1, 1), w.DIRT], ['masso 2', (x, y) => pr.drawBoulder(x, y, 2, 5), w.GRASS], ['sito ossa', (x, y) => r.drawSite(x, y, 2, 1000, 1, 1), w.SAND], ['cranio sepolto', (x, y) => r.drawBonePart(x, y, 'cranio', 1000, 1, 1), w.DIRT],
          ['fiore maturo', (x, y) => pr.drawFlower(x, y, 1, 1, true), w.GRASS], ['conchiglia', (x, y) => pr.drawShell(x, y, true), w.SAND], ['fungo maturo', (x, y) => pr.drawMushroom(x, y, 1000, 1, 1, true), w.FOREST],
          ['canne mature', (x, y) => pr.drawReed(x, y, 1000, 1, 1, true), w.GRASS], ['fiore', (x, y) => pr.drawFlower(x, y, 1, 1, false), w.GRASS], ['ambra', (x, y) => pr.drawPickup('ambra', x, y, 1000, 1, 1), w.GRASS],
        ];
        c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#d8c49a'; c.fillRect(0, 0, 4000, 4000);
        c.setTransform(sc.view.K * 2, 0, 0, sc.view.K * 2, 0, 0);
        items.forEach(([nm, f, ter], i) => {
          const x = 8 + (i % 4) * 56, y = 20 + Math.floor(i / 4) * 64;
          try { for (let ty = 0; ty < 2; ty++) for (let tx = -1; tx < 1; tx++) tl.groundTile(ter, tx + i * 3, ty, x + 12 + tx * 32 + 16, y + ty * 32 - 16, 1000, 0);
          f(x + 12, y); } catch (e) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#f00'; c.font = '12px monospace'; c.fillText(nm + ': ' + e.message, 10, 60 + i * 14); c.setTransform(sc.view.K * 2, 0, 0, sc.view.K * 2, 0, 0); }
          c.fillStyle = '#000'; c.font = '5px monospace'; c.fillText(nm, x, y - 12);
        });
        /* copia subito quello che è stato disegnato: il ciclo del gioco ridisegna la tela */
        const src = document.getElementById('cv'), snap2 = document.createElement('canvas');
        snap2.width = src.width; snap2.height = src.height; snap2.getContext('2d').drawImage(src, 0, 0);
        snap2.style.cssText = 'position:fixed;left:0;top:0;width:' + src.style.width + ';height:' + src.style.height + ';z-index:9999;image-rendering:pixelated';
        document.body.appendChild(snap2);
        return true;
      }),
      wonderGallery: (t) => Promise.all([import('./wonderart.js'), import('./wonders.js'), import('./brush.js'), import('./spritebank.js')]).then(([wa, wd, br, sb]) => {
        const ids = Object.keys(wd.WONDERS), cols = 3, cw = 360, ch = 330;
        const GROUND = { prati: '#7fb85a', dune: '#dcc08a', boschi: '#5c7050', terre: '#b0704a', palude: '#5a7a56', ghiacci: '#dfe9ee' };
        const cv2 = document.createElement('canvas'); cv2.width = cols * cw; cv2.height = Math.ceil(ids.length / cols) * ch;
        const c2 = cv2.getContext('2d'); c2.imageSmoothingEnabled = false;
        const g = { ctx: c2, shade8: br.shade8, rect: (x, y, w, h, c) => { c2.fillStyle = c; c2.fillRect(x, y, w, h); }, px: (x, y, c) => { c2.fillStyle = c; c2.fillRect(x, y, 1, 1); },
          shadow: (cx, cy, rw) => { c2.fillStyle = 'rgba(15,25,15,.16)'; for (let i = -rw; i <= rw; i++) { const hh = Math.round(2 * Math.sqrt(Math.max(0, 1 - (i * i) / (rw * rw)))); c2.fillRect(cx + i, cy - hh, 1, hh * 2); } } };
        ids.forEach((id, i) => {
          const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
          c2.fillStyle = GROUND[wd.WONDERS[id].zone] || '#7fb85a'; c2.fillRect(x, y, cw, ch);
          c2.strokeStyle = '#000'; c2.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
          c2.save(); c2.beginPath(); c2.rect(x, y, cw, ch); c2.clip(); c2.translate(x + cw / 2, y + ch - 30); c2.scale(2, 2);
          try { wa.drawWonder(g, id, -8, -16, t || 1000); } catch (e) { c2.setTransform(1, 0, 0, 1, 0, 0); c2.fillStyle = '#f00'; c2.fillText(e.message, x + 4, y + 30); }
          c2.restore();
          c2.fillStyle = '#000'; c2.font = 'bold 14px monospace'; c2.fillText(id + (sb.hasSprite('wonder:' + id) ? ' (a mano)' : ''), x + 6, y + 18);
        });
        cv2.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;image-rendering:pixelated';
        document.body.appendChild(cv2); return true;
      }),
      furnGallery: (tema) => Promise.all([import('./furnArt.js'), import('./furnCatalog.js'), import('./brush.js'), import('./data.js')]).then(([fa, fc, br, dm]) => {
        const lista = fc.FURN_CATALOG.filter(f => f.theme === tema);
        const cell = 112, cols = 6, rows = Math.ceil(lista.length / cols);
        const cv2 = document.createElement('canvas'); cv2.width = cols * cell; cv2.height = rows * (cell + 14);
        const c2 = cv2.getContext('2d'); c2.imageSmoothingEnabled = false;
        c2.fillStyle = '#c9a66b'; c2.fillRect(0, 0, cv2.width, cv2.height);
        const g = br.makeCanvasBrush(c2);
        lista.forEach((f, i) => {
          const cx = (i % cols) * cell, cy = Math.floor(i / cols) * (cell + 14);
          const w = (f.w || 1) * 32, h = (f.h || 1) * (f.place === 'wall' ? 36 : 32);
          if (f.place === 'wall') { c2.fillStyle = '#e6d9a6'; c2.fillRect(cx + 4, cy + 8, 104, 44); }
          fa.drawFurnPiece(g, f.id, cx + Math.round((cell - w) / 2), cy + (f.place === 'wall' ? 12 : 22), w, h, 1000, 0);
          c2.fillStyle = '#2a2016'; c2.font = '10px monospace'; c2.fillText(f.it.slice(0, 18), cx + 4, cy + cell + 10);
        });
        cv2.style.cssText = 'position:fixed;left:0;top:0;z-index:99998;image-rendering:pixelated;width:' + (cv2.width * 2) + 'px;height:' + (cv2.height * 2) + 'px';
        document.body.appendChild(cv2);
        return lista.length;
      }),
      /* il punto SULLO SCHERMO di una casella della stanza di casa: serve alle prove del
         trascinamento, che devono premere esattamente sopra un mobile */
      roomPoint: (gx, gy) => import('./interiors.js').then(m => {
        const c = m.interiorCam(), cv2 = document.getElementById('cv');
        const r = cv2.getBoundingClientRect();
        return { x: ((gx + 0.5) * TS - c.x) / view.W * r.width, y: ((gy + 0.5) * TS - c.y) / view.H * r.height };
      }),
      /* il pannello del LETTO di casa: comodità della stanza e riposo. Si legge lì perché
         arredare conviene, quindi va guardato e fatto disegnare da un test */
      openBed: (room, gx, gy) => import('./ui.js').then(u => { u.openBed(room || 0, gx || 1, gy || 2); return true; }),

      /* porta il giocatore ACCANTO alla statua: senza, fotografarla è questione di fortuna */
      gotoStatue: () => import('./world.js').then(w => {
        for (let r = 0; r < 14; r++) for (let cy = -r; cy <= r; cy++) for (let cx = -r; cx <= r; cx++) {
          const t = w.townForCell(cx, cy);
          if (t && t.statue) { P.x = t.statue.x * TS + 8; P.y = (t.statue.y + 2) * TS + 2; return true; }
        }
        return false;
      }),
      /* la scheda di una TECA: ci gira dentro lo scheletro 3D, e senza questo ponte non si
         poteva né fotografare né far disegnare da un test */
      openExhibit: (id) => import('./ui.js').then(u => import('./data.js').then(d => {
        const sp = id ? d.spById[id] : d.ALL_SPECIES[0];
        if (sp) { S.museum[sp.id] = ['cranio', 'torace']; u.openExhibit(sp.id); }
        return !!sp;
      })),
    };
  });
}
boot();
