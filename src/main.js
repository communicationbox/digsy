/* Boot + game loop */
import { S, P, cam, save, initState } from './state.js';
import { fit } from './screen.js';
import { findStart, openArea } from './world.js';
import { TS } from './data.js';
import { applyLook } from './sprites.js';
import { collide, stepDig } from './gameplay.js';
import { updateHUD, updatePrompt, isModalOpen, openEditor, welcomeToasts } from './ui.js';
import { updateCompass } from './compass.js';
import { refreshVisParks, visParks, updatePark } from './park.js';
import { render } from './render.js';
import { initSplash, splashActive } from './splash.js';
import { keys } from './input.js';
import { advanceTime, seasonOf, SEASONS } from './daynight.js';
import { tr, seasonName, applyStaticTexts } from './i18n.js';
import { hydrateIcons } from './icons.js';
import { INT, updateInterior, checkDoorEnter } from './interior.js';
import { toast } from './ui.js';
import { isDebug } from './debug.js';

let last = 0, hudAcc = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (!isModalOpen() && !splashActive()) {
    if (INT.active) { // dentro una casa: stanza camminabile
      updateInterior(dt, keys, P.speed * (isDebug() ? 3 : 1));
      updatePrompt();
      render(ts); requestAnimationFrame(loop); return;
    }
    let dx = 0, dy = 0;
    if (P.digging) { P.moving = false; stepDig(dt); } // scavando non ci si muove
    else if (keys.up || keys.down || keys.left || keys.right) {
      if (keys.up) dy--; if (keys.down) dy++; if (keys.left) dx--; if (keys.right) dx++;
    }
    if (dx || dy) {
      const l = Math.hypot(dx, dy); dx /= l; dy /= l;
      if (Math.abs(dx) > Math.abs(dy)) P.dir = dx < 0 ? 'left' : 'right'; else P.dir = dy < 0 ? 'up' : 'down';
      const spd = P.speed * (isDebug() ? 3 : 1);
      const nx = P.x + dx * spd * dt, ny = P.y + dy * spd * dt;
      if (!collide(nx, P.y)) P.x = nx; if (!collide(P.x, ny)) P.y = ny;
      P.anim += dt; P.moving = true;
    } else if (!P.digging) P.moving = false;
    checkDoorEnter(); // pestare una porta = entrare (niente E)
    updatePrompt();
    /* orologio: il tempo scorre solo giocando (non in modale/splash) */
    if (advanceTime(dt)) toast(tr('📅 Giorno ', '📅 Day ') + S.day + ' — ' + seasonName(seasonOf(S.day)));
    hudAcc += dt; if (hudAcc > 2) { hudAcc = 0; updateHUD(); } // aggiorna icone fase/stagione
  }
  updateCompass(ts);
  refreshVisParks();
  for (const t of visParks) updatePark(t, dt);
  render(ts);
  requestAnimationFrame(loop);
}

function boot() {
  const loaded = initState();
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
  updateHUD();
  document.getElementById('boot').style.display = 'none';
  requestAnimationFrame(loop);
  /* splash → (prima volta) editor personaggio → gioco */
  initSplash(() => {
    if (!S.lookDone) openEditor(() => { if (!loaded) welcomeToasts(); });
    else if (!loaded) welcomeToasts();
  });
  setInterval(save, 5000);
}

boot();
