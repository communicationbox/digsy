/* Bussola: città più vicina (ring-scan celle), testo HUD, toast di benvenuto */
import { TS } from './data.js';
import { S, P, save } from './state.js';
import { TCELL, townForCell } from './world.js';
import { zoneAt } from './regions.js';
import { toast } from './ui.js';
import { tr, zoneName } from './i18n.js';
import { withIcons } from './icons.js';

let lastZone = null;

export const compass = { town: null, dist: 0, next: 0 };

export function nearestTown() {
  const ccx = Math.floor(P.x / (TS * TCELL)), ccy = Math.floor(P.y / (TS * TCELL));
  let best = null, bd = Infinity, extra = 0;
  for (let r = 0; r <= 8; r++) {
    for (let cy = ccy - r; cy <= ccy + r; cy++) for (let cx = ccx - r; cx <= ccx + r; cx++) {
      if (Math.max(Math.abs(cx - ccx), Math.abs(cy - ccy)) !== r) continue;
      const t = townForCell(cx, cy); if (!t) continue;
      const d = Math.hypot(t.C.x * TS + TS / 2 - P.x, t.C.y * TS + TS / 2 - P.y);
      if (d < bd) { bd = d; best = t; }
    }
    if (best && ++extra >= 2) break; // un anello extra: il jitter può rendere più vicina una città della cella adiacente
  }
  compass.town = best; compass.dist = bd;
}
export const DIRCHARS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
export function octant(dx, dy) { return ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8; }
export function playerInTown(t) {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  if (ptx >= t.x0 && ptx <= t.x1 && pty >= t.y0 && pty <= t.y1) return true;
  const p = t.pen; return !!p && ptx >= p.x0 && ptx <= p.x1 && pty >= p.y0 && pty <= p.y1;
}
export function updateCompass(ts) {
  if (ts < compass.next) return; compass.next = ts + 300;
  /* zona corrente: tag HUD + toast quando ci entri */
  const z = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
  document.getElementById('h-zone').innerHTML = withIcons(z.icon + ' ' + zoneName(z.id));
  if (z.id !== lastZone) {
    if (lastZone !== null) toast(z.icon + tr(' Stai entrando: ', ' Entering: ') + zoneName(z.id));
    lastZone = z.id;
  }
  nearestTown();
  const el = document.getElementById('h-compass');
  const t = compass.town;
  if (!t) { el.textContent = '—'; return; }
  if (playerInTown(t)) {
    el.textContent = t.name;
    if (S.lastTown !== t.key) { S.lastTown = t.key; save(); toast(tr('Benvenuto a ', 'Welcome to ') + t.name + '!'); }
    return;
  }
  const arrow = DIRCHARS[octant(t.C.x * TS + TS / 2 - P.x, t.C.y * TS + TS / 2 - P.y)];
  el.innerHTML = withIcons(arrow + ' ' + t.name + ' · ' + Math.round(compass.dist / TS) + tr(' passi', ' steps'));
}
