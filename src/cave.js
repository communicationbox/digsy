/* GROTTE: dimensione grande, BUIA (solo alone attorno al player), esplorabile.
   Si entra dagli ingressi sulle montagne (o col comando goto=grotta). Coordinate separate:
   il player nel mondo resta sull'ingresso (save/bussola intatti), come per gli interni. */
import { TS, CAVE_POOL, RAR, PARTS, ptById } from './data.js';
import { view, hudPad } from './screen.js';
import { P, S, save, spendEnergy } from './state.js';
import { goalIsTile, clearGoal, hasGoal, advance, goalTile } from './tapmove.js';
import { fbm, vhash } from './noise.js';
import { isDebug } from './debug.js';
import { zoneAt } from './regions.js';
import { addXp, XP_BY_RAR, digDurationMul } from './progress.js';
import { playSfx, setBiomeMood } from './audio.js';
import { toast, updateHUD } from './ui.js';
import { tr } from './i18n.js';

export const CAVE = {
  active: false, w: 64, h: 48, x: 0, y: 0, dir: 'up', anim: 0, moving: false,
  seed: 0, wx: 0, wy: 0, justLeft: false, digging: null, trail: [], lastFoot: 0,
};

/* muro (roccia) deterministico: bordo pieno + caverne da noise. Attorno all'ingresso
   in basso c'è una CAMERA sgombra 5×5 (mai incastrati all'uscita). */
export function caveSolid(cx, cy) {
  if (cx < 1 || cy < 1 || cx >= CAVE.w - 1 || cy >= CAVE.h - 1) return true;
  const midx = CAVE.w >> 1;
  if (cy >= CAVE.h - 6 && Math.abs(cx - midx) <= 2) return false; // camera d'ingresso 5 di larghezza
  const n = fbm((cx + CAVE.seed) * 0.16, (cy + CAVE.seed * 1.3) * 0.16, 3);
  return n > 0.62;
}
/* giacimento di fossili: RARO e sparso (affioramento luminoso da scavare) */
export function caveNodeAt(cx, cy) {
  if (caveSolid(cx, cy)) return false;
  if (cy >= CAVE.h - 6 && Math.abs(cx - (CAVE.w >> 1)) <= 2) return false; // non nell'ingresso
  return vhash(cx + CAVE.seed, cy + CAVE.seed, 88) < 0.018;
}
function caveNodeKey(cx, cy) { return CAVE.seed + ':' + cx + ',' + cy; }
/* Set invece di Array.includes: questa funzione gira per OGNI tile in vista, ogni frame */
let dugSetC = null, dugSetN = -1;
export function caveNodeDone(cx, cy) {
  const arr = S.caveDug || [];
  if (!dugSetC || dugSetN !== arr.length) { dugSetC = new Set(arr); dugSetN = arr.length; }
  return dugSetC.has(caveNodeKey(cx, cy));
}

export function enterCave(seed, wx, wy) {
  clearGoal();                              // sottoterra la meta di superficie non serve più
  CAVE.active = true; CAVE.seed = ((seed | 0) % 997) + 3; CAVE.wx = wx; CAVE.wy = wy; CAVE.trail = [];
  /* spawn nel corridoio d'ingresso in basso al centro */
  CAVE.x = (CAVE.w >> 1) * TS + 8; CAVE.y = (CAVE.h - 2) * TS; CAVE.dir = 'up'; CAVE.moving = false;
  if (!S.caves) S.caves = {}; S.caves[CAVE.seed] = true;
  /* la PRIMA grotta apre l'ala "Grotte Profonde" del Libro e del Museo: da qui le 6 specie
     sotterranee hanno pagina, teca e risveglio come tutte le altre */
  if (!S.book) S.book = {};
  if (!S.book.grotta) {
    S.book.grotta = true; save();
    if (typeof document !== 'undefined') import('./ui.js').then(u => {
      u.showBanner('🕳️ ' + tr('NUOVA ALA: GROTTE PROFONDE', 'NEW WING: DEEP CAVES') + '<br><span style="font-size:.8em">' + tr('il Museo ha una sala per i fossili di grotta', 'the Museum now has a room for cave fossils') + '</span>');
    });
  }
  setBiomeMood('grotta'); // musica avventurosa da grotta (crossfade)
}
export function exitCave() {
  CAVE.active = false; CAVE.justLeft = true;
  P.x = CAVE.wx * TS + 8; P.y = (CAVE.wy + 1) * TS + 10; // torna appena SOTTO l'ingresso
  setBiomeMood(zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS)).id); // torna al mood del bioma in superficie
  save();
}
/* hitbox piedi (4 punti) */
function cSolidPx(px, py) { return caveSolid(Math.floor(px / TS), Math.floor(py / TS)); }
function cCollide(x, y) { if (P.fly) return false; return cSolidPx(x - 5, y + 10) || cSolidPx(x + 5, y + 10) || cSolidPx(x - 5, y + 15) || cSolidPx(x + 5, y + 15); }
/* vicini al corridoio d'uscita (per il bottone Esci) */
export function nearCaveExit() {
  if (!CAVE.active) return false;
  const cx = Math.floor(CAVE.x / TS), cy = Math.floor((CAVE.y + 13) / TS);
  return cy >= CAVE.h - 5 && Math.abs(cx - (CAVE.w >> 1)) <= 2;
}
export function onCaveExit() {
  const cx = Math.floor(CAVE.x / TS), cy = Math.floor((CAVE.y + 13) / TS);
  return cy >= CAVE.h - 2 && Math.abs(cx - (CAVE.w >> 1)) <= 1;
}

/* fossile di grotta grezzo: pesi spostati su ecc./leggendario, ma NON tanto da rendere
   inutile il resto del mondo (prima la grotta rendeva 12× lo scavo di superficie: qui il
   valore base scende a 10 e i pesi sono meno estremi → resta la miglior fonte, ~3×). */
function makeCaveRaw(dist) {
  const w = { comune: 16, raro: 30, eccezionale: 26 + Math.min(16, dist / 60), leggendario: 12 + Math.min(14, dist / 80) };
  const tot = CAVE_POOL.reduce((a, s) => a + w[s.r], 0);
  let r = Math.random() * tot, sp = CAVE_POOL[0];
  for (const s of CAVE_POOL) { r -= w[s.r]; if (r <= 0) { sp = s; break; } }
  const part = PARTS[Math.floor(Math.random() * PARTS.length)].id;
  const val = Math.max(6, Math.round(10 * ptById[part].mult * RAR.find(x => x.id === sp.r).mult));
  return { uid: S.uid++, s: sp.id, t: part, q: sp.r, val };
}
/* giacimento raggiungibile: la casella sotto i piedi o una delle 8 adiacenti (più tollerante) */
export function caveNodeReach() {
  const cx = Math.floor(CAVE.x / TS), cy = Math.floor((CAVE.y + 13) / TS);
  for (const [dx, dy] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    if (caveNodeAt(cx + dx, cy + dy) && !caveNodeDone(cx + dx, cy + dy)) return [cx + dx, cy + dy];
  }
  return null;
}
/* scava il giacimento vicino (sotto i piedi o adiacente) */
export function digCave() {
  if (CAVE.digging) return;
  const n = caveNodeReach();
  if (!n) return false;
  if (!S.tools.pick && !isDebug()) return 'nopick'; // i cristalli si staccano SOLO col piccone
  if (S.energy <= 0 && !isDebug()) return 'noenergy';
  CAVE.digging = { t: 0, dur: 0.5 * digDurationMul(), cx: n[0], cy: n[1] }; // il livello vale anche qui
  return true;
}
export function stepCave(dt) {
  const d = CAVE.digging; if (!d) return;
  d.t += dt;
  if (d.t >= d.dur) {
    CAVE.digging = null;
    /* la roccia è dura: costa il doppio. Passa da spendEnergy, che non scende sotto zero
       (con 1 di energia si finiva a -1), e l'HUD va avvisato SUBITO: quaggiù il refresh
       periodico del loop non gira, e la barra restava ferma sul valore di prima. */
    if (!isDebug()) spendEnergy(2);
    updateHUD();
    if (!S.caveDug) S.caveDug = []; S.caveDug.push(caveNodeKey(d.cx, d.cy));
    /* NON tutti i giacimenti danno un fossile (~55%) */
    if (Math.random() < 0.55) {
      const raw = makeCaveRaw(Math.hypot(CAVE.wx, CAVE.wy)); S.raw.push(raw);
      addXp((XP_BY_RAR[raw.q] || 4) + 4); // i fossili di grotta valgono un po' di più
      playSfx('found'); toast('💎 ' + tr('Fossile di grotta! (raro — da identificare)', 'Cave fossil! (rare — needs identifying)'));
      save(); return raw;
    }
    playSfx('mine'); toast(tr('…solo cristallo spento', '…just a dull crystal'));
    save(); return null;
  }
}
export function updateCave(dt, keys, speed) {
  if (CAVE.digging) { CAVE.moving = false; stepCave(dt); return; }
  let dx = 0, dy = 0;
  if (keys.up) dy--; if (keys.down) dy++; if (keys.left) dx--; if (keys.right) dx++;
  if (dx || dy) {
    clearGoal();                                     // il comando diretto batte la meta
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    if (Math.abs(dx) > Math.abs(dy)) CAVE.dir = dx < 0 ? 'left' : 'right'; else CAVE.dir = dy < 0 ? 'up' : 'down';
    const nx = CAVE.x + dx * speed * dt, ny = CAVE.y + dy * speed * dt;
    if (!cCollide(nx, CAVE.y) || (dy > 0 && onCaveExit())) CAVE.x = nx;
    if (!cCollide(CAVE.x, ny) || (dy > 0 && onCaveExit())) CAVE.y = ny;
    CAVE.anim += dt; CAVE.moving = true;
    /* ORME: lascia una traccia sul pavimento (aiuta a ritrovare la strada) */
    CAVE.lastFoot = (CAVE.lastFoot || 0) + Math.hypot(dx, dy) * speed * dt;
    if (CAVE.lastFoot > 9) { CAVE.lastFoot = 0; CAVE.trail.push({ x: CAVE.x, y: CAVE.y + 13, s: CAVE.dir === 'left' || CAVE.dir === 'right' ? 1 : 0, t: 0 }); if (CAVE.trail.length > 60) CAVE.trail.shift(); }
  } else if (hasGoal()) {
    /* "tocca dove andare" anche sottoterra: stesse regole, muri della grotta */
    const gEx = goalTile();
    const toExit = gEx.ty >= CAVE.h - 2 && Math.abs(gEx.tx - (CAVE.w >> 1)) <= 1;
    const moved = advance(dt, speed, (nx, ny) => {
      if (cCollide(nx, ny) && !(ny > CAVE.y && onCaveExit())) return false;
      CAVE.x = nx; CAVE.y = ny; return true;
    }, CAVE);
    if (moved) {
      CAVE.anim += dt; CAVE.moving = true; CAVE.dir = P.dir;
      CAVE.lastFoot = (CAVE.lastFoot || 0) + speed * dt;
      if (CAVE.lastFoot > 9) { CAVE.lastFoot = 0; CAVE.trail.push({ x: CAVE.x, y: CAVE.y + 13, s: CAVE.dir === 'left' || CAVE.dir === 'right' ? 1 : 0, t: 0 }); if (CAVE.trail.length > 60) CAVE.trail.shift(); }
    } else CAVE.moving = false;
    /* come per le porte: il corridoio d'uscita sta oltre l'ultima casella camminabile */
    if (toExit && !hasGoal() && Math.abs(CAVE.x - (CAVE.w >> 1) * TS) < 24) { clearGoal(); exitCave(); return; }
  } else CAVE.moving = false;
  for (const f of CAVE.trail) f.t += dt; // per lo sbiadire
  if (onCaveExit() && CAVE.y > (CAVE.h - 1.4) * TS) { clearGoal(); exitCave(); }
}
/* ingresso sul mondo: si entra CAMMINANDO nell'imbocco (verso l'alto), come per le porte */
/* camera della grotta: stessa formula del disegno (serve al "tocca dove andare") */
export function caveCam() {
  const W = view.W, H = view.H, rw = CAVE.w * TS, rh = CAVE.h * TS;
  /* la camera può salire OLTRE il bordo della grotta quanto è alta la barra dell'HUD:
     senza, arrivati in cima il giocatore continua a camminare ma la camera è già ferma, e
     Digsy sparisce dietro i tag delle monete. Sopra il bordo c'è solo il nero della roccia,
     quindi non si scopre nessun vuoto. */
  const pad = hudPad();
  return {
    x: rw <= W ? (rw - W) / 2 : Math.max(0, Math.min(rw - W, CAVE.x - W / 2)),
    y: rh <= H ? (rh - H) / 2 - pad : Math.max(-pad, Math.min(rh - H, CAVE.y - H / 2)),
  };
}
export function checkCaveEnter(caveEntranceAt) {
  if (CAVE.active) return;
  const tx = Math.floor(P.x / TS), ty = Math.floor((P.y + 13) / TS);
  const e = caveEntranceAt(tx, ty);
  if (e) {
    if (CAVE.justLeft) return;
    /* come per le porte: a piedi si entra salendo, col tocco vale dove si è toccato */
    if (!(P.moving && P.dir === 'up') && !goalIsTile(tx, ty)) return;
    /* senza piccone non si entra: il masso davanti va spaccato, e serve per staccare i
       cristalli là dentro (in debug si passa comunque) */
    if (!S.tools.pick && !isDebug()) { toast('⛏️ ' + tr('Serve il piccone per entrare (Negozio)', 'You need the pickaxe to get in (Shop)')); CAVE.justLeft = true; return; }
    enterCave(vhash(tx, ty, 91) * 1000, tx, ty);
  } else CAVE.justLeft = false;
}
