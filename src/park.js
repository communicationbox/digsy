/* Cortile: sim di wander dentro il recinto UNICO della casa (solo runtime, non salvato).
   M5: sostituisce il vecchio parco per-città (`town.pen`, una Map per città) — ora c'è UN
   solo rettangolo (yardRect, in world.js) e chi ci vive è una scelta esplicita del giocatore
   (`S.house.yard`, elenco di `key`), non più "tutte le creature, in ogni città". */
import { TS, spById } from './data.js';
import { S, P } from './state.js';
import { FOOT_DY, placeOnTile } from './body.js';
import { yardRect, houseFootprint } from './world.js';
import { COMP } from './companion.js';

/* la casa ora sta DENTRO il recinto (M6: cortile tutto attorno): le creature non devono
   scegliere un bersaglio sopra il suo footprint, o ci camminerebbero sopra. Margine di 1
   tile tutto attorno alla casa, così non le sfiorano nemmeno. */
function pickSpot(yr) {
  const hf = houseFootprint();
  for (let i = 0; i < 20; i++) {
    const x = (yr.x0 + 1) * TS + 4 + Math.random() * ((yr.x1 - yr.x0 - 1) * TS - 8);
    const y = (yr.y0 + 1) * TS + 4 + Math.random() * ((yr.y1 - yr.y0 - 1) * TS - 8);
    if (!hf) return { x, y };
    const tx = x / TS, ty = y / TS;
    if (tx < hf.x0 - 1 || tx > hf.x1 + 1 || ty < hf.y0 - 1 || ty > hf.y1 + 1) return { x, y };
  }
  return { x: (yr.x0 + 1) * TS + 4, y: (yr.y0 + 1) * TS + 4 };
}

export const yardAnimals = []; // lista persistente di {c,x,y,tx,ty,pause,dir,anim}
export let yardNear = false;   // il player è abbastanza vicino da simulare/disegnare il cortile

/* CHI PUÒ vivere nel cortile: le chimere assemblate E le specie risvegliate al Laboratorio.
 *
 * Per molto tempo qui c'erano solo le chimere, e chi risvegliava una specie — cinque pezzi
 * più una fialetta intera di DNA, la cosa più cara del gioco — trovava il recinto vuoto:
 * la creatura esisteva nel Libro e fra i compagni, ma nel posto dove il gioco promette che
 * "tornano a vivere" non ci metteva piede. Segnalato da un giocatore che ne aveva risvegliate
 * dieci e le credeva perse.
 *
 * Questa è l'UNICA lista: la usa il selettore del cortile/compagno (companion.js) e il filtro
 * di `penPopulation`, così non possono più divergere. Una specie risvegliata ha cranio/torso/
 * zampa della stessa specie: lo sprite viene fuori identico all'animale del Libro. */
let popCache = null, popKey = '';
export function parkPopulation() {
  const chi = S.creatures || [], awk = S.awakened || [];
  /* la chiave deve dipendere dal CONTENUTO, non solo dalla lunghezza: due popolazioni diverse
     con lo stesso numero di chimere e risvegli (es. nei test, che sostituiscono S.creatures
     spesso) restituivano la lista VECCHIA dalla cache. */
  const k = chi.map(c => c.uid).join(',') + '|' + awk.join(',');
  if (popCache && popKey === k) return popCache;
  const out = [];
  for (const c of chi) {
    out.push({ name: c.name, skull: c.skull, torso: c.torso, leg: c.leg, q: c.q, key: 'chi' + c.uid, uid: c.uid });
  }
  for (const id of awk) {
    const sp = spById[id]; if (!sp) continue;
    /* uid sfalsato di 1000: serve solo a spargere le posizioni di partenza dentro il recinto,
       non deve accavallarsi con quelli delle chimere */
    out.push({ name: sp.name, skull: id, torso: id, leg: id, q: sp.r, key: 'sp' + id, uid: 1000 + (sp.idx || 0) });
  }
  popCache = out; popKey = k;
  return out;
}

export function refreshVisParks() {
  const yr = yardRect();
  if (!yr) { yardNear = false; return; }
  const cx = (yr.x0 + yr.x1) / 2 * TS, cy = (yr.y0 + yr.y1) / 2 * TS;
  yardNear = Math.abs(P.x - cx) < 500 && Math.abs(P.y - cy) < 400; // ben oltre lo schermo
  checkGateClose(yr);
}
/* Il cancello (render.js) si chiude appena visto da FUORI: qui si accorge del passaggio
   dentro→fuori e fa partire l'ANIMAZIONE di chiusura (non un tono di testo — si guarda,
   non si legge: "quando esce deve fare l'animazione della chiusura"). `gateCloseStart` è il
   momento della transizione; `gateClosingProgress()` lo confronta con `Date.now()` e dà a
   render.js quanto è chiuso il battente ORA (0 = appena iniziato, 1 = del tutto chiuso). */
let wasInsideYard = null;
let gateCloseStart = 0;
let closePending = 0;
const GATE_CLOSE_MS = 450;
/* aperto in attesa che il compagno esca (vedi checkGateClose) */
export function gateHeldOpen() { return !!closePending || !!P.gateWalk; }
export function gateClosingProgress() {
  if (!gateCloseStart) return 1;
  const t = (Date.now() - gateCloseStart) / GATE_CLOSE_MS;
  return t >= 1 ? 1 : t;
}
function checkGateClose(yr) {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  const inside = ptx >= yr.x0 && ptx <= yr.x1 && pty >= yr.y0 && pty <= yr.y1;
  /* il cancello aspetta il COMPAGNO: segue a 40px di scia, e chiudendo appena usciva Digsy lui
     era ancora dentro e passava attraverso il cancello chiuso (segnalato con foto). Si chiude
     quando anche lui è fuori; se resta indietro troppo a lungo (incastrato) si chiude lo stesso. */
  if (wasInsideYard === true && inside === false) closePending = Date.now();
  if (inside) { closePending = 0; P.gateWalk = null; }
  const compIn = () => {
    if (!S.companion || !COMP.init) return false;
    const cx = Math.floor(COMP.x / TS), cy = Math.floor((COMP.y + FOOT_DY) / TS);
    return cx >= yr.x0 && cx <= yr.x1 && cy >= yr.y0 && cy <= yr.y1;
  };
  if (closePending && !P.gateWalk && (!compIn() || Date.now() - closePending > 3000)) {
    /* "animiamo l'omino che torna verso la porta": prima si RITORNA al cancello camminando (fino
       alla casella del vialetto appena sotto), poi ci si gira e lo si chiude. Da troppo lontano
       (compagno rimasto indietro a lungo) si chiude da dove si è, senza una camminata lunga. */
    const spot = placeOnTile(yr.cx, yr.y1 + 1);
    const to = { x: yr.cx * TS, y: spot.y };
    if (Math.hypot(to.x - P.x, to.y - P.y) < TS * 4) P.gateWalk = { x: to.x, y: to.y, until: Date.now() + 2000 };
    else startGateClose();
  }
  wasInsideYard = inside;
}
/* un passo della camminata di ritorno (main.js la chiama al posto dei comandi, come lo scavo) */
export function stepGateWalk(dt) {
  const g = P.gateWalk; if (!g) return false;
  const dx = g.x - P.x, dy = g.y - P.y, d = Math.hypot(dx, dy);
  if (d < 1 || Date.now() > g.until) { P.gateWalk = null; startGateClose(); return true; }
  const step = Math.min(d, P.speed * 0.8 * dt);
  P.x += dx / d * step; P.y += dy / d * step;
  if (Math.abs(dx) > Math.abs(dy) * 1.3) P.dir = dx < 0 ? 'left' : 'right'; else P.dir = dy < 0 ? 'up' : 'down';
  P.anim += dt; P.moving = true;
  return true;
}
function startGateClose() {
  closePending = 0;
  /* un P.dir='up' da solo durava un fotogramma: chi teneva ancora premuto un tasto lo
     sovrascriveva subito col verso di marcia, e la svolta non si vedeva mai (segnalato:
     "quando esce si deve girare per far capire che sta chiudendo il cancello"). Si blocca
     il movimento per la durata dell'animazione, come fa P.digging per lo scavo — ci si
     ferma, ci si gira, si vede il cancello chiudersi, poi si riparte. */
  P.dir = 'up'; P.moving = false;
  gateCloseStart = Date.now();
  P.gateTurnUntil = gateCloseStart + GATE_CLOSE_MS + 250;         // un attimo fermi a guardarlo chiuso
}
/* chi vive DAVVERO nel cortile ORA: SOLO chi ci hai scelto (`S.house.yard`), e SENZA il
   compagno che è "con te" (altrimenti la stessa creatura si vede due volte — nel cortile e al
   tuo fianco). Il selettore usa invece parkPopulation intera, così ogni creatura resta
   scegliibile sia come compagno sia per il cortile. */
export function penPopulation() {
  const ck = S.companion && S.companion.key;
  const yard = new Set((S.house && S.house.yard) || []);
  return parkPopulation().filter(c => yard.has(c.key) && c.key !== ck);
}
export function yardList() {
  const yr = yardRect(); if (!yr) return yardAnimals;
  const pop = penPopulation(), want = new Set(pop.map(c => c.key));
  /* esce chi non c'è più nel cortile (rimosso, o è il compagno uscito con te); gli altri
     tengono la loro posizione di gironzolo, così scegliere non fa saltare tutti gli altri */
  for (let i = yardAnimals.length - 1; i >= 0; i--) if (!want.has(yardAnimals[i].c.key)) yardAnimals.splice(i, 1);
  const have = new Set(yardAnimals.map(e => e.c.key));
  for (const c of pop) if (!have.has(c.key)) {         // entra chi è nuovo (o è tornato a casa)
    const { x, y } = pickSpot(yr);
    yardAnimals.push({ c, x, y, tx: x, ty: y, pause: 0.5, dir: 1, anim: 0 });
  }
  return yardAnimals;
}
export function updatePark(dt) {
  const yr = yardRect(); if (!yr) return;
  for (const a of yardList()) {
    if (a.pause > 0) { a.pause -= dt; continue; }
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
    if (d < 1.5) { // nuovo bersaglio dentro il recinto (interno, margine 4px, mai sopra la casa)
      const spot = pickSpot(yr);
      a.tx = spot.x; a.ty = spot.y;
      a.pause = 0.6 + Math.random() * 2.2;
    } else {
      a.x += dx / d * 14 * dt; a.y += dy / d * 14 * dt;
      if (Math.abs(dx) > 0.5) a.dir = dx < 0 ? -1 : 1;
      a.anim += dt;
    }
  }
}
