/* Parco: sim di wander dentro i recinti delle città grandi (solo runtime, non salvato) */
import { TS, spById } from './data.js';
import { S, P } from './state.js';
import { TCELL, townForCell } from './world.js';

export const parks = new Map(); // townKey → [{c,x,y,tx,ty,pause,dir,anim}]
export const visParks = [];

/* CHI VIVE NEL PARCO: le chimere assemblate E le specie risvegliate al Laboratorio.
 *
 * Per molto tempo qui c'erano solo le chimere, e chi risvegliava una specie — cinque pezzi
 * più una fialetta intera di DNA, la cosa più cara del gioco — trovava il recinto vuoto:
 * la creatura esisteva nel Libro e fra i compagni, ma nel posto dove il gioco promette che
 * "tornano a vivere" non ci metteva piede. Segnalato da un giocatore che ne aveva risvegliate
 * dieci e le credeva perse.
 *
 * Questa è l'UNICA lista: la usa il parco e la usa il selettore dei compagni (companion.js),
 * così le due non possono più divergere. Una specie risvegliata ha cranio/torace/zampa della
 * stessa specie: lo sprite viene fuori identico all'animale del Libro. */
let popCache = null, popKey = '';
export function parkPopulation() {
  const chi = S.creatures || [], awk = S.awakened || [];
  const k = chi.length + '/' + awk.length;
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
  visParks.length = 0;
  const ccx = Math.floor(P.x / (TS * TCELL)), ccy = Math.floor(P.y / (TS * TCELL));
  for (let cy = ccy - 1; cy <= ccy + 1; cy++) for (let cx = ccx - 1; cx <= ccx + 1; cx++) {
    const t = townForCell(cx, cy); if (t && t.pen) visParks.push(t);
  }
}
/* chi vive DAVVERO nel recinto ORA: come parkPopulation ma SENZA il compagno che è "con te"
   (altrimenti la stessa creatura si vede due volte — nel recinto e al tuo fianco). Il selettore
   dei compagni usa invece parkPopulation intera, così il compagno attivo resta scegliibile. */
export function penPopulation() {
  const ck = S.companion && S.companion.key;
  const all = parkPopulation();
  return ck ? all.filter(c => c.key !== ck) : all;
}
export function parkList(t) {
  let list = parks.get(t.key);
  if (!list) { list = []; parks.set(t.key, list); }
  const p = t.pen, pop = penPopulation(), want = new Set(pop.map(c => c.key));
  /* esce chi non c'è più nel recinto (es. il compagno uscito con te); gli altri tengono la
     loro posizione di gironzolo, così scegliere un compagno non fa saltare tutti gli altri */
  for (let i = list.length - 1; i >= 0; i--) if (!want.has(list[i].c.key)) list.splice(i, 1);
  const have = new Set(list.map(e => e.c.key));
  for (const c of pop) if (!have.has(c.key)) {         // entra chi è nuovo (o è tornato a casa)
    const x = (p.x0 + 1 + (c.uid * 7) % (p.x1 - p.x0 - 1)) * TS + 8;
    const y = (p.y0 + 1 + (c.uid * 13) % (p.y1 - p.y0 - 1)) * TS + 8;
    list.push({ c, x, y, tx: x, ty: y, pause: 0.5, dir: 1, anim: 0 });
  }
  return list;
}
export function updatePark(t, dt) {
  const p = t.pen;
  for (const a of parkList(t)) {
    if (a.pause > 0) { a.pause -= dt; continue; }
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
    if (d < 1.5) { // nuovo bersaglio dentro il recinto (interno, margine 4px)
      a.tx = (p.x0 + 1) * TS + 4 + Math.random() * ((p.x1 - p.x0 - 1) * TS - 8);
      a.ty = (p.y0 + 1) * TS + 4 + Math.random() * ((p.y1 - p.y0 - 1) * TS - 8);
      a.pause = 0.6 + Math.random() * 2.2;
    } else {
      a.x += dx / d * 14 * dt; a.y += dy / d * 14 * dt;
      if (Math.abs(dx) > 0.5) a.dir = dx < 0 ? -1 : 1;
      a.anim += dt;
    }
  }
}
