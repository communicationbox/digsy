/* Parco chimere: sim di wander dentro i recinti delle città grandi (solo runtime, non salvato) */
import { TS } from './data.js';
import { S, P } from './state.js';
import { TCELL, townForCell } from './world.js';

export const parks = new Map(); // townKey → [{c,x,y,tx,ty,pause,dir,anim}]
export const visParks = [];

export function refreshVisParks() {
  visParks.length = 0;
  const ccx = Math.floor(P.x / (TS * TCELL)), ccy = Math.floor(P.y / (TS * TCELL));
  for (let cy = ccy - 1; cy <= ccy + 1; cy++) for (let cx = ccx - 1; cx <= ccx + 1; cx++) {
    const t = townForCell(cx, cy); if (t && t.pen) visParks.push(t);
  }
}
export function parkList(t) {
  let list = parks.get(t.key);
  if (!list) { list = []; parks.set(t.key, list); }
  const p = t.pen;
  while (list.length < S.creatures.length) { // le nuove chimere entrano nel parco
    const c = S.creatures[list.length];
    const x = (p.x0 + 1 + (c.uid * 7) % (p.x1 - p.x0 - 1)) * TS + 8;
    const y = (p.y0 + 1 + (c.uid * 13) % (p.y1 - p.y0 - 1)) * TS + 8;
    list.push({ c, x, y, tx: x, ty: y, pause: 0.5, dir: 1, anim: 0 });
  }
  if (list.length > S.creatures.length) list.length = S.creatures.length;
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
