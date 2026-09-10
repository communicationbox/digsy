/* Boot + game loop */
import { S, P, cam, save, initState, setSaveErrorHandler, sanitizePos, clearCheatSnapshot } from './state.js';
import { FOOT_DY } from './body.js';
import { fit, view } from './screen.js';
import { findStart, findHomeSpot, openArea, invalidateHouseDecoCache } from './world.js';
import { TS } from './data.js';
import { applyLook } from './sprites.js';
import { collide, stepDig, gearSpeedMul, grantStarterGift, companionWorkTick, companionPlayTick, isMounted } from './gameplay.js';
import { updateCompanion } from './companion.js';
import { playIntro, introActive } from './intro.js';
import { updateHUD, updatePrompt, isModalOpen, isBagOpen, isBookOpen, isMapOpen, isPrepOpen, isTossOpen, openEditor, welcomeToasts, showBanner, lookPreviewPending, showIdleWelcome } from './ui.js';
import { idleHours, idleCoins, idleEligible, IDLE_DNA_CHANCE } from './idle.js';
import { updateCompass } from './compass.js';
import { trackPlayer } from './map.js';
import { checkWonderDiscovery, checkGateNotice } from './gameplay.js';
import { wonderName } from './wonders.js';
import { refreshVisParks, yardNear, updatePark } from './park.js';
import { render } from './render.js';
import { initSplash, splashActive, cloudEnabled } from './splash.js';
import { keys, steerFollow } from './input.js';
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
  else if (P.gateTurnUntil && Date.now() < P.gateTurnUntil) { P.moving = false; P.dir = 'up'; clearGoal(); } // ci si ferma a guardare il cancello chiudersi
  else if (keys.up || keys.down || keys.left || keys.right) {
    if (keys.up) dy--; if (keys.down) dy++; if (keys.left) dx--; if (keys.right) dx++;
    clearGoal();                                    // il comando diretto batte la meta
  } else if (hasGoal()) {
    /* "tocca dove andare": si cammina lungo il percorso calcolato, aggirando gli ostacoli */
    const spd = P.speed * gearSpeedMul() * (P.speedMul || 1);
    walkedToGoal = advance(dt, spd, (nx, ny) => {
      if (collide(nx, ny)) return false;
      P.x = nx; P.y = ny; return true;
    });
    if (walkedToGoal) { P.anim += dt; P.moving = true; }
  }
  if (dx || dy) {
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    if (Math.abs(dx) > Math.abs(dy)) P.dir = dx < 0 ? 'left' : 'right'; else P.dir = dy < 0 ? 'up' : 'down';
    const spd = P.speed * gearSpeedMul() * (P.speedMul || 1);
    const nx = P.x + dx * spd * dt, ny = P.y + dy * spd * dt;
    if (!collide(nx, P.y)) P.x = nx; if (!collide(P.x, ny)) P.y = ny;
    P.anim += dt; P.moving = true;
  } else if (!P.digging && !walkedToGoal) P.moving = false;
  /* `walkedToGoal`: senza, questo ramo azzerava P.moving a ogni frame anche mentre si
     camminava verso la meta, e il personaggio scivolava con le gambe ferme. */
}

let last = 0, hudAcc = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (introActive()) { requestAnimationFrame(loop); return; } // l'intro disegna la sua scena
  if (!isModalOpen() && !splashActive() && !isTossOpen()) {
    steerFollow();                  // col mouse tenuto premuto si va verso il puntatore
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
      if (pruneExpired(S.day)) toast(tr('🏛️ La commissione del Museo è scaduta', '🏛️ The Museum commission has expired'));
      /* l'uovo è pronto: lo si dice appena il giorno scatta, non si scopre tornando al Lab */
      if (eggReady(S.day)) toast(tr('🥚 Un uovo si è schiuso… quasi: torna al Laboratorio per vederlo!', '🥚 An egg is about to hatch… head back to the Laboratory to see it!'));
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
    companionWorkTick(dt);  // raccoglitore leggendario: se lavora, guida lui il movimento
    companionPlayTick(dt);  // "gioca col compagno": lancio, corsa, finestra di cattura
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
      ? tr('Spazio esaurito: il gioco NON sta salvando! Libera spazio nel browser.', 'Storage full: the game is NOT saving! Free some browser storage.')
      : tr('Il browser blocca i salvataggi (navigazione privata?): i progressi non verranno salvati.', 'Your browser blocks saving (private mode?): progress will not be kept.')));
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
      openQuests: u.openQuests, updateHUD: u.updateHUD,
      /* l'EDITOR del personaggio: si apre solo alla primissima partita, quindi senza questa
         riga non c'era modo di fotografarlo né di farlo disegnare da un test (regola 9) */
      openEditor: () => u.openEditor(() => {}),
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
      enterCave: () => import('./cave.js').then(m => { m.enterCave(1, Math.floor(P.x / 16), Math.floor(P.y / 16)); return true; }),
      leaveCave: () => import('./cave.js').then(m => m.exitCave()),
      inRoom: () => import('./interior.js').then(m => !!m.INT.active),
      /* palloncino di dialogo: va acceso per forza nei test, altrimenti il ramo che lo
         disegna non viene mai eseguito (ed è proprio lì che si era rotto) */
      say: (t) => import('./interior.js').then(m => { m.INT.say = t ? { text: t } : null; }),
      /* DISEGNA un frame su richiesta: in Chrome headless con --virtual-time-budget il
         requestAnimationFrame non avanza, quindi senza questo i test "visivi" non
         disegnavano davvero nulla e ogni crash di rendering restava invisibile. */
      frame: (t) => { render(t || 1000); return true; },
      /* un passo del mondo su richiesta: in headless il rAF è fermo, quindi senza questo
         gli e2e non potrebbero verificare NIENTE di ciò che accade camminando */
      stepWorld: (dt) => { steerFollow(); walk(dt || 1 / 60); return { moving: P.moving, anim: P.anim, x: P.x, y: P.y }; },
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
      /* un toast su richiesta: serve agli e2e per provare, in un browser VERO, che il
         messaggio si veda anche con un pannello aperto (là finiva dietro la modale) */
      toast: (m) => { u.toast(m || 'test'); return true; },
      /* il LABORATORIO: fusione, chimera e risveglio. È il pannello dove un bottone che
         rifiuta senza spiegare sembra rotto, quindi va guardato, non solo misurato. */
      openLab: () => import('./ui.js').then(u => u.openBuilding({ type: 'lab', name: 'Laboratorio' })),
      openMuseum: () => import('./ui.js').then(u => u.openBuilding({ type: 'museum', name: 'Museo' })),
      openTailor: () => import('./ui.js').then(u => u.openBuilding({ type: 'tailor', name: 'Sartoria' })),
      /* il pannello COMPAGNO E CORTILE: è dove si sceglie chi ti segue e chi vive in casa, e
         senza questo ponte non si poteva né fotografare né far disegnare da un test */
      openCompanion: () => import('./ui.js').then(u => { u.openCompanionPicker(); return true; }),
      /* il rettangolo del CORTILE: serve a mettersi in punti precisi (davanti al cancello)
         per fotografare o misurare, senza indovinare le coordinate */
      yard: () => import('./world.js').then(w => w.yardRect()),
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
