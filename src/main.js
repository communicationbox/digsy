/* Boot + game loop */
import { S, P, cam, save, initState, setSaveErrorHandler, sanitizePos, hasCheatSnapshot, setCheatLock } from './state.js';
import { FOOT_DY } from './body.js';
import { fit } from './screen.js';
import { findStart, openArea } from './world.js';
import { TS } from './data.js';
import { applyLook } from './sprites.js';
import { collide, stepDig, gearSpeedMul, grantStarterGift, companionWorkTick, isMounted } from './gameplay.js';
import { updateCompanion } from './companion.js';
import { playIntro, introActive } from './intro.js';
import { updateHUD, updatePrompt, isModalOpen, isBagOpen, isBookOpen, isMapOpen, isPrepOpen, isTossOpen, openEditor, welcomeToasts, showBanner } from './ui.js';
import { updateCompass } from './compass.js';
import { trackPlayer } from './map.js';
import { checkWonderDiscovery } from './gameplay.js';
import { wonderName } from './wonders.js';
import { refreshVisParks, visParks, updatePark } from './park.js';
import { render } from './render.js';
import { initSplash, splashActive, cloudEnabled } from './splash.js';
import { keys, steerFollow } from './input.js';
import { advanceTime, seasonOf, SEASONS, isNight } from './daynight.js';
import { tr, seasonName, applyStaticTexts } from './i18n.js';
import { hydrateIcons } from './icons.js';
import { armAudioResume } from './audio.js';
import { INT, updateInterior, checkDoorEnter } from './interior.js';
import { CAVE, updateCave, checkCaveEnter } from './cave.js';
import { caveEntranceAt } from './world.js';
import { showTip } from './ui.js';
import { waterTile } from './gameplay.js';
import { pruneExpired } from './commission.js';
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
      .then(reg => { try { reg.update(); } catch (e) { /* niente rete: pazienza */ } })
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
      /* commissione scaduta: lo si dice, non si scopre tornando al museo */
      if (pruneExpired(S.day)) toast(tr('🏛️ La commissione del Museo è scaduta', '🏛️ The Museum commission has expired'));
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
    updateCompanion(dt);    // altrimenti il compagno insegue il player
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
  refreshVisParks();
  for (const t of visParks) updatePark(t, dt);
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
  if (hasCheatSnapshot()) setCheatLock(true);   // sessione con comandi attivi: dopo il refresh tieni il tag e `vanilla` disponibili
  applyLook();
  if (S.started) {
    P.x = S.px; P.y = S.py;
    // migrazione/soccorso: dentro un solido o intrappolato (es. cerchio di alberi) → riposiziona
    if (collide(P.x, P.y) || !openArea(Math.floor(P.x / TS), Math.floor(P.y / TS))) {
      const st = findStart(); P.x = st.x; P.y = st.y; save();
    }
  } else {
    const st = findStart(); P.x = st.x; P.y = st.y; S.started = true; save();
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
  if (import.meta.env && import.meta.env.DEV && typeof location !== 'undefined') {
    const _p = new URLSearchParams(location.search);
    if (_p.get('mount') || _p.get('dig') || _p.has('comptown')) {
      S.lookDone = true; S.introSeen = true; S.started = true; setPref('tips', false); // SINCRONO: prima che initSplash apra editor/tip (il resto è in devview, async)
      import('./devview.js').then(m => m.setupDebugView(_p));
    }
  }
  requestAnimationFrame(loop);
  /* splash → (prima volta) editor personaggio → INTRO (lore) → gioco */
  initSplash(() => {
    const startGame = () => { if (!loaded) welcomeToasts(); };
    const runIntro = (cb) => { if (!S.introSeen) playIntro(() => { S.introSeen = true; grantStarterGift(); save(); cb(); }); else cb(); };
    if (!S.lookDone) openEditor(() => runIntro(startGame));
    else runIntro(startGame);
  });
  setInterval(save, 5000);
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
      splashView: (v) => import('./splash.js').then(sp => sp.setView && sp.setView(v)),
      /* entrare/uscire dalle scene: serve agli e2e per DISEGNARLE davvero. Una regressione
         negli interni era passata inosservata perché nessun test ci entrava mai. */
      enterRoom: (t) => import('./interior.js').then(m => { m.enterInterior({ type: t, name: t, x: Math.floor(P.x / 16), y: Math.floor(P.y / 16) }); return true; }),
      leaveRoom: () => import('./interior.js').then(m => { try { m.exitInterior(); } catch (e) { /* la tile d'uscita dipende dalla città */ } }),
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
      openStore: () => import('./ui.js').then(u => u.openBuilding({ type: 'store', name: 'Negozio' })),
    };
  });
}
boot();
