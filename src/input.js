/* Input: tastiera (WASD/frecce, E/spazio, I, Esc) + touch (joystick, tasto A) + console (\) */
import { isModalOpen, closeModal, openBag, isBagOpen, closeBag, openBook, closeBook, isBookOpen, bookFlip, openQuests, openMap, closeMap, isMapOpen, isPrepOpen, closePrepare, isTossOpen, tossPress, tossAbort, isSkeletonFitOpen, skeletonFitSkip } from './ui.js';
import { FOOT_DY } from './body.js';
import { setGoal, clearGoal, screenToWorld, inReach } from './tapmove.js';
import { findPath, fits } from './path.js';
import { tileBlocked, toggleMount, companionRides, tapFurnitureAt } from './gameplay.js';
import { interiorCam } from './interiors.js';
import { CAVE, caveSolid, caveCam } from './cave.js';
import { toast, refreshFurnHold } from './ui.js';
import { tr } from './i18n.js';
import { TS } from './data.js';
import { P } from './state.js';
import { tapToMoveOn, floatStickOn, followMouseOn } from './prefs.js';
import { view } from './screen.js';
import { cam } from './state.js';
import { act } from './gameplay.js';
import { runCommand, suggest } from './commands.js';
import { splashActive, showSplash, resumeSplash } from './splash.js';
import { INT, interiorLeave, intCollide, CUT, doorTileX, nudgeOffFurniture } from './interior.js';
import { isHolding, setHoldTarget, placeHold, pickUpFurniture, furnAt, furnLayer, rotateHold, cancelHold, holdItem, snapFurn, clampFurn, rotateHandleRect } from './house.js';
import { furnSize } from './data.js';
import { furnRise } from './furnArt.js';
import { S } from './state.js';
import { keys as keyText, isTouch } from './i18n.js';
import { playSfx } from './audio.js';

export const keys = {};
const KM = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };

/* ---------- console comandi (tipo Minecraft) ---------- */
const cmdEl = document.getElementById('cmd'), cmdi = document.getElementById('cmdi'), cmdHint = document.getElementById('cmdhint'), cmdOut = document.getElementById('cmdout');
let consoleOpen = false;
function refreshHint() { if (cmdHint) { const s = suggest(cmdi.value); cmdHint.textContent = s.length ? s.slice(0, 6).join('  ') : ''; } }
function showOut(txt) { if (cmdOut) { if (txt) { cmdOut.textContent = txt; cmdOut.classList.add('on'); } else { cmdOut.textContent = ''; cmdOut.classList.remove('on'); } } }
/* la console dei CHEAT (`\`) è uno strumento da SVILUPPO: attiva in `npm run dev` e nei test
   (dove `import.meta.env` non esiste). Nel build ONLINE (vite build → DEV=false) è DISATTIVATA:
   i giocatori non ci arrivano. */
const CHEATS_ON = !import.meta.env || !!import.meta.env.DEV;
function openConsole() {
  if (!CHEATS_ON) return;                                     // build online: niente console cheat
  consoleOpen = true; for (const k in keys) keys[k] = false; // ferma il movimento
  if (cmdEl) { cmdEl.classList.add('on'); cmdi.value = ''; cmdi.focus(); showOut(''); refreshHint(); }
}
function closeConsole() { consoleOpen = false; for (const k in keys) keys[k] = false; if (cmdEl) { cmdEl.classList.remove('on'); cmdi.blur(); showOut(''); } }

/* ---------- CRONOLOGIA della console (come in un terminale) ----------
   ↑ risale nei comandi già dati, ↓ ridiscende fino a tornare a quello che stavi scrivendo.
   Resta fra una sessione e l'altra (localStorage) e non registra doppioni consecutivi. */
const HKEY = 'digsy_cmdhist';
let hist = [], hIdx = -1, hDraft = '';
try { const r = localStorage.getItem(HKEY); if (r) hist = JSON.parse(r) || []; } catch (e) { /* ok */ }
function pushHistory(v) {
  const s2 = String(v).trim(); if (!s2) return;
  if (hist[hist.length - 1] !== s2) hist.push(s2);
  if (hist.length > 60) hist.shift();                 // le ultime 60, non serve di più
  hIdx = -1; hDraft = '';
  try { localStorage.setItem(HKEY, JSON.stringify(hist)); } catch (e) { /* quota: pazienza */ }
}
function histPrev(cur) {
  if (!hist.length) return null;
  if (hIdx === -1) { hDraft = cur; hIdx = hist.length - 1; }   // ricorda cosa stavi scrivendo
  else if (hIdx > 0) hIdx--;
  return hist[hIdx];
}
function histNext() {
  if (hIdx === -1) return null;
  if (hIdx < hist.length - 1) { hIdx++; return hist[hIdx]; }
  hIdx = -1; return hDraft;                                     // oltre l'ultimo: torna alla bozza
}
export function cmdHistory() { return hist.slice(); }
function putCaretEnd() { setTimeout(() => { try { cmdi.setSelectionRange(cmdi.value.length, cmdi.value.length); } catch (e) { /* ok */ } }, 0); }

if (cmdi) {
  cmdi.addEventListener('input', refreshHint);
  cmdi.addEventListener('keydown', e => {
    e.stopPropagation(); // non far arrivare i tasti al gioco mentre si scrive
    if (e.key === '\\') { closeConsole(); e.preventDefault(); return; } // \ di nuovo = chiudi la console
    if (e.key === 'Enter') {
      if (!cmdi.value.trim()) { closeConsole(); return; } // Invio su vuoto = chiudi
      pushHistory(cmdi.value);           // ↑/↓ ripescano i comandi dati, come in un terminale
      const r = runCommand(cmdi.value);
      if (r) showOut(r);                 // risultato multi-linea nel pannello (la console resta aperta)
      cmdi.value = ''; refreshHint();
    }
    else if (e.key === 'ArrowUp') { const v = histPrev(cmdi.value); if (v !== null) { cmdi.value = v; putCaretEnd(); refreshHint(); } e.preventDefault(); }
    else if (e.key === 'ArrowDown') { const v = histNext(); if (v !== null) { cmdi.value = v; putCaretEnd(); refreshHint(); } e.preventDefault(); }
    else if (e.key === 'Escape') closeConsole();
    else if (e.key === 'Tab') { const s = suggest(cmdi.value); if (s.length) { cmdi.value = s[0]; refreshHint(); } e.preventDefault(); }
  });
}

/* SI STA SCRIVENDO in un campo (nome del personaggio, console, ricerche): il gioco deve
   tenere giù le mani, altrimenti W/A/S/D/E/I/Z/L/Q non si possono nemmeno digitare. */
export function isTyping(t) {
  if (!t) return false;
  const tag = (t.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable === true;
}
addEventListener('keydown', e => {
  if (isTyping(e.target)) { if (e.key === 'Escape' && e.target.blur) e.target.blur(); return; } // ESC = esci dal campo
  if (e.key === '\\' && CHEATS_ON) { consoleOpen ? closeConsole() : openConsole(); e.preventDefault(); return; } // \ = toggle console cheat (SOLO in dev)
  if (consoleOpen) return; // mentre la console è aperta, il gioco ignora i tasti
  /* RICOMPONI LO SCHELETRO: ESC = salta il pezzo corrente (si può sempre saltare) */
  if (isSkeletonFitOpen()) {
    if (e.key === 'Escape') { skeletonFitSkip(); e.preventDefault(); }
    return;
  }
  /* FONTANA: durante i tiri, E/spazio FERMANO il tiro (sul premere, per precisione); ESC chiude */
  if (isTossOpen()) {
    if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') { tossPress(); e.preventDefault(); return; }
    if (e.key === 'Escape') { tossAbort(); e.preventDefault(); return; }
    return;
  }
  if (splashActive()) {
    if (e.key === 'Escape') { resumeSplash(); e.preventDefault(); } // ESC di nuovo: riprendi
    return;
  }
  if (isBookOpen() && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { bookFlip(e.key === 'ArrowLeft' ? -1 : 1); e.preventDefault(); return; }
  if (KM[e.key]) { keys[KM[e.key]] = true; e.preventDefault(); }
  /* azione (E/spazio): si scatena al RILASCIO (keyup), non tenendo premuto → niente spam */
  if ((e.key === 'e' || e.key === 'E' || e.key === ' ') && !isModalOpen()) e.preventDefault();
  /* DURANTE UNA CUTSCENE non si apre NIENTE. La consegna del Libro toglie il controllo, ma i
     tasti degli overlay restavano vivi: zaino/libro/mappa/missioni si aprivano SOPRA il video,
     che intanto andava avanti da solo, e il clic per farlo proseguire finiva sulla modale.
     Si restava in un limbo da cui si usciva solo ricaricando (segnalato con foto).
     `busy` è la stessa domanda per tutti: c'è già qualcosa che ha il controllo? */
  const busy = () => isModalOpen() || CUT.on;
  if ((e.key === 'i' || e.key === 'I' || e.key === 'z' || e.key === 'Z') && !busy()) { openBag(); e.preventDefault(); }
  if ((e.key === 'l' || e.key === 'L') && !busy()) { openBook(); e.preventDefault(); }
  if ((e.key === 'm' || e.key === 'M') && !busy()) { openMap(); e.preventDefault(); } // mappa del mondo
  if ((e.key === 'q' || e.key === 'Q') && !busy()) { openQuests(); e.preventDefault(); }
  if ((e.key === 'f' || e.key === 'F') && !isModalOpen() && companionRides()) { toggleMount(); e.preventDefault(); } // cavalca/scendi il compagno volante di grotta
  /* ARREDO IN MANO: R ruota (e l'anteprima nella stanza cambia subito), Esc lo rimette nel
     vassoio invece di farti uscire dalla stanza col mobile ancora a mezz'aria */
  const inCasa = INT.active && INT.b && INT.b.type === 'house' && INT.houseRoom != null;
  if ((e.key === 'r' || e.key === 'R') && inCasa && isHolding() && !isModalOpen()) {
    if (!rotateHold()) { toast('🎨 ' + tr('Questo pezzo non si gira', 'This piece doesn\'t rotate')); e.preventDefault(); return; }
    /* girato, un pezzo lungo può sbordare dal muro: si riaccosta invece di diventare rosso */
    const hv = holdItem(), t = hv && hv.gx != null ? clampFurn(hv.itemId, hv.rot, hv.gx, hv.gy) : null;
    if (t) setHoldTarget(t.gx, t.gy);
    refreshFurnHold(); playSfx('ui'); e.preventDefault(); return;
  }
  if (e.key === 'Escape' && inCasa && isHolding() && !isModalOpen()) { cancelHold(); refreshFurnHold(); toast('🎨 ' + tr('Torna nel vassoio', 'Back in your tray')); e.preventDefault(); return; }
  if (e.key === 'Escape') { if (isPrepOpen()) closePrepare(); else if (isMapOpen()) closeMap(); else if (isBookOpen()) closeBook(); else if (isBagOpen()) closeBag(); else if (isModalOpen()) closeModal(); else if (INT.active) interiorLeave(); else showSplash(); e.preventDefault(); }
});
addEventListener('keyup', e => {
  if (isTyping(e.target)) return; // vedi isTyping: mentre si scrive il gioco non reagisce
  if (consoleOpen) return;
  if (isTossOpen()) { if (e.key === 'e' || e.key === 'E' || e.key === ' ') e.preventDefault(); return; } // il tiro l'ha già fermato il keydown
  if (KM[e.key]) { keys[KM[e.key]] = false; e.preventDefault(); }
  if ((e.key === 'e' || e.key === 'E' || e.key === ' ') && !isModalOpen()) { act(); e.preventDefault(); } // azione al rilascio
});

/* joystick analogico: pointer capture → si trascina senza mai staccare il dito.
   Il vettore knob→centro diventa gli stessi flag su/giù/sx/dx della tastiera (8 direzioni). */
const joy = document.getElementById('joy'), knob = document.getElementById('joyknob');
function joyKeys(dx, dy, dead) {
  keys.up = keys.down = keys.left = keys.right = false;
  if (Math.hypot(dx, dy) < dead) return;
  const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)); // -4..4, a passi di 45°
  if (oct >= -1 && oct <= 1) keys.right = true;
  if (Math.abs(oct) >= 3) keys.left = true;
  if (oct >= 1 && oct <= 3) keys.down = true;
  if (oct <= -1 && oct >= -3) keys.up = true;
}
if (joy && knob && joy.addEventListener && typeof joy.getBoundingClientRect === 'function') {
  let jid = null;
  const move = e => {
    const r = joy.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 12, l = Math.hypot(dx, dy);
    if (l > max) { dx = dx / l * max; dy = dy / l * max; } // il knob resta nel cerchio
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    joyKeys(dx, dy, r.width * 0.09); // zona morta al centro
  };
  joy.addEventListener('pointerdown', e => { jid = e.pointerId; try { joy.setPointerCapture(jid); } catch (err) { /* ok */ } joy.classList.add('on'); move(e); e.preventDefault(); }, { passive: false });
  joy.addEventListener('pointermove', e => { if (jid !== null && e.pointerId === jid) move(e); });
  const end = e => {
    if (jid === null || e.pointerId !== jid) return;
    jid = null; joy.classList.remove('on'); knob.style.transform = '';
    keys.up = keys.down = keys.left = keys.right = false;
  };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
}
/* TOCCA DOVE ANDARE: un tocco sul mondo fissa la meta, il game loop ci cammina.
   Si ascolta sulla CANVAS, non su document: così i tocchi su HUD, joystick, tasto A e
   overlay restano loro e non fanno partire il personaggio per sbaglio. */
const cv = document.getElementById('cv');
/* ARREDARE COL PUNTATORE: la casella della stanza di casa sotto il dito/mouse. È il ponte fra
   lo schermo e l'anteprima del mobile in mano, che deve seguire quello che si sta guardando. */
function houseWorldAt(clientX, clientY) {
  if (!(INT.active && INT.b && INT.b.type === 'house' && INT.houseRoom != null)) return null;
  const r = cv.getBoundingClientRect();
  const w = screenToWorld(clientX, clientY, r, view, interiorCam());
  return { x: w.x, y: w.y, gx: Math.floor(w.x / TS), gy: Math.floor(w.y / TS) };
}
function houseCellAt(clientX, clientY) { return houseWorldAt(clientX, clientY); }
/* QUALE MOBILE si sta indicando: si guarda il DISEGNO, non solo la casella a terra. Uno
   schienale, un paralume, una testiera stanno sopra la loro casella — cliccando lì, cioè dove
   l'oggetto si vede, non si prendeva niente ("impossibile ruotare gli oggetti perché non
   posso selezionarli"). Vince quello più davanti, come nel disegno. */
function furnHitAt(wx, wy) {
  const room = (S.house && S.house.rooms || [])[INT.houseRoom];
  if (!room) return null;
  const WALL_H = Math.round(1.3 * TS);
  let best = null, bestDepth = -1;
  for (const f of room.furn || []) {
    const sz = furnSize(f.itemId, f.rot || 0), layer = furnLayer(f.itemId);
    let x0 = f.gx * TS, x1 = x0 + sz.w * TS, y0, y1, depth;
    if (layer === 'wall') { y0 = 0; y1 = WALL_H; depth = 1; }
    else {
      y1 = (f.gy + sz.h) * TS; y0 = f.gy * TS - furnRise(f.itemId);
      depth = layer === 'rug' ? 0 : 10 + y1;                      // tappeti sotto, mobili per profondità
    }
    if (wx >= x0 && wx < x1 && wy >= y0 && wy < y1 && depth > bestDepth) { best = f; bestDepth = depth; }
  }
  return best;
}
if (cv && cv.addEventListener) {
  let downX = 0, downY = 0, downT = 0;
  /* pressione sull'arredo: 'preso' = si è appena alzato un mobile (al rilascio senza
     trascinare RESTA IN MANO, selezionato: si può ruotare) · 'inmano' = lo si aveva già (al
     rilascio si posa) · null = la pressione non riguarda l'arredo */
  let furnPress = null, grabDx = 0, grabDy = 0, grabbed = false;
  /* dove va l'anteprima col puntatore in (w): se il pezzo è stato PRESO da un punto, lo si
     tiene da lì; se arriva dal vassoio, il puntatore sta al suo centro. Sempre a mezza
     casella (snapFurn): la griglia fitta è quella che permette di sistemare davvero. */
  const overHandle = (w) => {
    const hr = rotateHandleRect(INT.houseRoom);
    return !!hr && w.x >= hr.x - 2 && w.x < hr.x + hr.w + 2 && w.y >= hr.y - 2 && w.y < hr.y + hr.h + 2;
  };
  const holdAt = (w) => {
    const hv = holdItem(); if (!hv) return;
    let ox = grabDx, oy = grabDy;
    if (!grabbed) { const sz = furnSize(hv.itemId, hv.rot || 0); ox = sz.w / 2; oy = sz.h / 2; }
    const c = clampFurn(hv.itemId, hv.rot || 0, snapFurn(w.x / TS - ox), snapFurn(w.y / TS - oy));
    setHoldTarget(c.gx, c.gy);
  };
  cv.addEventListener('pointerdown', e => {
    downX = e.clientX; downY = e.clientY; downT = Date.now();
    furnPress = null;
    if (!isModalOpen() && !splashActive() && !isPrepOpen()) {
      const w = houseWorldAt(e.clientX, e.clientY);
      if (w) {
        /* MANIGLIA ↻ vicino al mobile in mano: si tocca/clicca e ruota, e basta — niente
           posa, niente spostamento. Viene PRIMA di tutto il resto della pressione. */
        const hr = isHolding() ? rotateHandleRect(INT.houseRoom) : null;
        if (hr && w.x >= hr.x - 2 && w.x < hr.x + hr.w + 2 && w.y >= hr.y - 2 && w.y < hr.y + hr.h + 2) {
          furnPress = 'ruota';
          rotateHold();
          const hv = holdItem(), t = clampFurn(hv.itemId, hv.rot, hv.gx, hv.gy);
          setHoldTarget(t.gx, t.gy);
          refreshFurnHold(); playSfx('ui'); clearGoal();
          return;
        }
        if (isHolding()) {
          furnPress = 'inmano';
          holdAt(w);
        } else {
          const f = furnHitAt(w.x, w.y);
          if (f && pickUpFurniture(INT.houseRoom, f.gx, f.gy, furnLayer(f.itemId) === 'rug' ? 'decor' : furnLayer(f.itemId) === 'wall' ? 'wall' : 'solid')) {
            furnPress = 'preso';
            /* si tiene il mobile DAL PUNTO in cui lo si è preso: trascinando un letto per la
               testiera non deve saltare con l'angolo sotto il dito */
            grabDx = w.x / TS - f.gx; grabDy = w.y / TS - f.gy;
            grabbed = true;
            setHoldTarget(f.gx, f.gy);
            try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
          }
        }
        if (furnPress) { clearGoal(); return; }             // la pressione è per l'arredo, non per camminare
      }
    }
    if (followMouseOn()) { followHeld = true; followX = e.clientX; followY = e.clientY; clearGoal(); }
    /* la leva fluttuante nasce qui sotto, ma resta invisibile finché non si trascina:
       chi voleva solo indicare un punto non si vede comparire un cerchio in faccia */
    if (floatStickOn() && !isModalOpen() && !splashActive() && !isPrepOpen()) {
      floatId = e.pointerId; floatX = e.clientX; floatY = e.clientY; floatMoved = false;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    }
  });
  cv.addEventListener('pointermove', e => {
    /* l'anteprima segue il puntatore SOLO mentre si trascina (tasto o dito premuto). Seguendolo
       sempre, col mouse la maniglia ↻ scappava via mentre ci si andava sopra: è attaccata al
       mobile, e il mobile inseguiva il mouse. Da fermi si clicca dove posarlo. */
    if (isHolding() && (furnPress === 'preso' || furnPress === 'inmano')) {
      const c = houseWorldAt(e.clientX, e.clientY);
      if (c) holdAt(c);
    } else if (!isHolding()) grabbed = false;                              // mano vuota: la prossima presa riparte dal centro
    if (followHeld) { followX = e.clientX; followY = e.clientY; }
    if (floatId === null || e.pointerId !== floatId) return;
    const dx = e.clientX - floatX, dy = e.clientY - floatY;
    if (!floatMoved && Math.hypot(dx, dy) < 12) return;      // ancora un tocco, non un comando
    if (!floatMoved) { floatMoved = true; floatShow(true, floatX, floatY); clearGoal(); }
    const l = Math.hypot(dx, dy), max = FLOAT_R - 10;
    const kx = l > max ? dx / l * max : dx, ky = l > max ? dy / l * max : dy;
    const k = document.getElementById('joyknob');
    if (k && k.style) k.style.transform = `translate(${kx}px,${ky}px)`;
    joyKeys(dx, dy, 14);
  });
  const stopFollow = () => {
    if (!followHeld) return;
    followHeld = false;
    keys.up = keys.down = keys.left = keys.right = false;
  };
  cv.addEventListener('pointerup', stopFollow);
  cv.addEventListener('pointercancel', stopFollow);
  cv.addEventListener('pointerleave', stopFollow);      // il puntatore esce dalla finestra
  const floatEnd = e => {
    if (floatId === null || e.pointerId !== floatId) return;
    floatId = null;
    if (floatMoved) { keys.up = keys.down = keys.left = keys.right = false; floatShow(false); }
    floatMoved = false;
  };
  cv.addEventListener('pointercancel', floatEnd);
  /* TASTO DESTRO = il tasto azione (E). Con "clicca dove andare" o "segui il puntatore" si
     gioca interamente col mouse: senza questo mancava proprio l'azione — scavare, entrare,
     parlare — e servivano comunque le mani sulla tastiera. */
  cv.addEventListener('contextmenu', e => {
    e.preventDefault();                        // niente menu del browser sul mondo
    if (isModalOpen() || splashActive() || isPrepOpen()) return;
    clearGoal();                               // si agisce dove si è, non dove si stava andando
    act();
  });
  cv.addEventListener('pointerup', e => {
    const wasDrag = floatMoved;
    floatEnd(e);
    /* ARREDO. Tre casi, e nessuno deve rimettere a posto di nascosto quello che si è appena
       preso (era il difetto: la pressione lo alzava e il rilascio lo ripiazzava subito nella
       stessa casella, quindi la selezione durava un istante e Ruota non serviva mai):
         · alzato e rilasciato SENZA trascinare → resta in mano, selezionato: si ruota;
         · trascinato → si posa dove lo si vede, se ci sta (altrimenti resta in mano);
         · già in mano e cliccato → si posa lì. */
    if (furnPress === 'ruota') { furnPress = null; return; }   // la maniglia ha già fatto il suo
    if (furnPress) {
      const tipo = furnPress; furnPress = null;
      const c = houseWorldAt(e.clientX, e.clientY);
      if (c && isHolding()) holdAt(c);
      const mosso = Math.hypot(e.clientX - downX, e.clientY - downY) > 6;
      if (tipo === 'preso' && !mosso) {
        playSfx('ui');
        toast('🎨 ' + keyText(isTouch() ? tr('↻ ruota · tocca dove posarlo', '↻ rotate · tap to place')
          : tr('↻ o R ruota, clic per posare', '↻ or R rotates, click to place')));
        return;
      }
      if (isHolding()) {
        if (placeHold(INT.houseRoom)) { nudgeOffFurniture(); playSfx('ui'); grabDx = grabDy = 0; grabbed = false; }
        else toast('🎨 ' + tr('Qui non ci sta', "It doesn't fit here"));
      }
      return;
    }
    if (wasDrag) return;                                     // si stava guidando: niente meta
    if (isModalOpen() || splashActive() || isPrepOpen()) return;
    /* un TOCCO, non un trascinamento e non una pressione lunga: chi trascina sta guardando */
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 14 || Date.now() - downT > 600) return;
    const r = cv.getBoundingClientRect();
    /* OGNI SCENA ha la sua camera e le sue collisioni: mondo aperto, stanza, galleria del
       museo, grotta. Prima si convertiva sempre con la camera del mondo, e dentro gli
       edifici il tocco finiva su coordinate che non c'entravano nulla. */
    const sc = currentScene();
    const w = screenToWorld(e.clientX, e.clientY, r, view, sc.cam);
    /* ARREDO DI CASA: si tocca DIRETTAMENTE il mobile per raccoglierlo, o la casella libera
       per posarlo — senza doverci camminare sopra come col tasto azione (richiesto: "devo
       poterli spostare come mi pare"). Viene PRIMA del tocca-per-camminare: un tocco su una
       sedia deve raccoglierla, non diventare una meta di cammino verso quella casella. */
    if (INT.active && INT.b && INT.b.type === 'house' && INT.houseRoom != null) {
      if (tapFurnitureAt(Math.floor(w.x / TS), Math.floor(w.y / TS))) return;
    }
    if (!tapToMoveOn()) return;
    if (sc.reach && !sc.reach(w.x, w.y)) return;
    /* La casella di PARTENZA è dove stanno i piedi ora (P.y è l'ancora alta, i piedi +13).
       La casella di ARRIVO è invece quella che si è toccata, senza correzioni: il dito indica
       un punto dello schermo, non l'ancora dello sprite. Applicando +13 anche qui il bersaglio
       finiva una casella più in basso, e per entrare bisognava toccare l'INSEGNA invece della
       porta. */
    const stx = Math.floor(sc.pos.x / TS), sty = Math.floor((sc.pos.y + FOOT_DY) / TS);
    const gtx = Math.floor(w.x / TS), gty = Math.floor(w.y / TS);
    const path = findPath(stx, sty, gtx, gty, sc.blocked, sc.maxLen);
    if (path) setGoal(w.x, w.y - FOOT_DY, path);      // i PIEDI vanno sulla casella toccata
    else toast('🚶 ' + tr('Troppo lontano o senza strada', 'Too far or no path'));
  });
  /* toccare il joystick o premere un tasto annulla la meta: il comando diretto ha la
     precedenza, sempre (niente personaggio che continua per conto suo) */
  const drop = () => clearGoal();
  if (joy && joy.addEventListener) { joy.addEventListener('pointerdown', drop); }
  addEventListener('keydown', e => { if (KM[e.key]) drop(); });
}

/* LEVA FLUTTUANTE — la leva non sta in un angolo: nasce dove appoggi il dito e lo segue.
   È la stessa leva analogica di sempre (8 direzioni, zona morta, stessi flag della tastiera),
   solo che il centro lo decide il giocatore ogni volta. Chi tiene il telefono con l'altra
   mano non deve cambiare niente, ed è comodo su schermi grandi dove l'angolo è lontano.
   Un tocco SECCO (senza trascinare) non è un comando di leva: vale come "vai lì". */
let floatId = null, floatX = 0, floatY = 0, floatMoved = false;
const FLOAT_R = 62;           // raggio utile della leva, in pixel di schermo
function floatShow(on, x, y) {
  const el = document.getElementById('joy'); if (!el || !el.style) return;
  if (!on) {
    el.classList.remove('floating', 'on');
    el.classList.add('off');                 // a riposo torna invisibile, come deve essere
    el.style.left = ''; el.style.top = ''; el.style.bottom = '';
    return;
  }
  /* `off` la mette syncTouchControls perché in questa modalità NON c'è una leva fissa da
     mostrare: qui va tolta, altrimenti il cerchio nasce sotto il dito e resta invisibile. */
  el.classList.remove('off');
  el.classList.add('floating', 'on');
  el.style.left = (x - FLOAT_R) + 'px';
  el.style.top = (y - FLOAT_R) + 'px';
  el.style.bottom = 'auto';
  const k = document.getElementById('joyknob'); if (k && k.style) k.style.transform = '';
}

/* SEGUI IL PUNTATORE — col mouse tenuto premuto Digsy va verso il puntatore, come se lo
   tirasse un filo. È il corrispettivo della leva su desktop: controllo continuo, nessuna
   ricerca di percorso (quella è del clic secco), e si smette appena si rilascia. */
let followHeld = false, followX = 0, followY = 0;
export function followActive() { return followHeld; }
/* converte la distanza puntatore→personaggio negli stessi flag della tastiera.
   Chiamata dal game loop a ogni frame: il personaggio si muove, quindi la direzione cambia
   anche se il mouse resta fermo. */
export function steerFollow() {
  if (!followHeld || !followMouseOn()) return false;
  if (isModalOpen() || splashActive() || isPrepOpen()) { followHeld = false; return false; }
  const cv2 = document.getElementById('cv');
  if (!cv2 || !cv2.getBoundingClientRect) return false;
  const r = cv2.getBoundingClientRect();
  const sc = currentScene();
  const w = screenToWorld(followX, followY, r, view, sc.cam);
  const dx = w.x - sc.pos.x, dy = w.y - (sc.pos.y + FOOT_DY);
  joyKeys(dx, dy, 6);                        // zona morta piccola: col mouse si è precisi
  return true;
}

/* la scena in cui ci si trova: dove sta il giocatore, com'è la camera, cosa è muro.
   Tenerlo in un posto solo evita che il tocco funzioni fuori e non dentro (è già successo). */
function currentScene() {
  if (CAVE.active) {
    return {
      pos: CAVE, cam: caveCam(),
      blocked: (tx, ty) => caveSolid(tx, ty),
      maxLen: 30,
    };
  }
  if (INT.active) {
    return {
      pos: INT, cam: interiorCam(),
      blocked: (tx, ty) => !fits(tx, ty, TS, intCollide),
      maxLen: 30,
      /* la strada disegnata SOTTO la porta non è calpestabile: il clic lì si traduce nella
         soglia, l'ultima casella in cui si può stare */
      exitTile: (tx, ty) => (ty >= INT.h - 1 && Math.abs(tx - doorTileX()) <= 3)
        ? { tx: doorTileX(), ty: INT.h - 2 } : null,
    };
  }
  return { pos: P, cam, blocked: tileBlocked, reach: inReach };
}

/* tasto A: azione al RILASCIO (touchend), non tenendo premuto → niente spam */
const ab = document.getElementById('abtn');
let abTouched = false;
ab.addEventListener('touchstart', e => { e.preventDefault(); abTouched = true; ab.classList.add('press'); }, { passive: false });
ab.addEventListener('touchend', e => { e.preventDefault(); ab.classList.remove('press'); if (abTouched && !isModalOpen() && !splashActive()) act(); abTouched = false; }, { passive: false });
ab.addEventListener('touchcancel', () => { abTouched = false; ab.classList.remove('press'); });
ab.addEventListener('click', () => { if (!isModalOpen() && !splashActive()) act(); }); // mouse/desktop
