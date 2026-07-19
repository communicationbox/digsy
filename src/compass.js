/* Bussola: città più vicina (ring-scan celle), testo HUD, toast di benvenuto */
import { TS } from './data.js';
import { S, P, save } from './state.js';
import { TCELL, townForCell } from './world.js';
import { zoneAt } from './regions.js';
import { toast } from './ui.js';
import { tr, zoneName, rarLabel } from './i18n.js';
import { withIcons } from './icons.js';
import { CAVE } from './cave.js';
import { setBiomeMood } from './audio.js';
import { companionAbility } from './companion.js';
import { weatherAt, weatherLabel } from './weather.js';

let lastZone = null;

export const compass = { town: null, dist: 0, next: 0, target: null, cityGuide: false };

/* mappa del tesoro seguita; se è stata scavata/consumata si torna alla città */
export function trackedMap() {
  if (!S.trackMap) return null;
  const m = (S.maps || []).find(x => x.uid === S.trackMap);
  if (!m) { S.trackMap = null; return null; }
  return m;
}

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
  /* zona corrente: tag HUD + toast quando ci entri (in grotta: Grotta) */
  if (CAVE.active) { document.getElementById('h-zone').innerHTML = withIcons('🕳️ ' + tr('Grotta', 'Cave')); const tg = document.getElementById('compasstag'); if (tg) tg.style.display = 'none'; return; }
  const z = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
  const wx = weatherLabel(weatherAt(z.id, S.day));
  document.getElementById('h-zone').innerHTML = withIcons(z.icon + ' ' + zoneName(z.id) + (wx ? ' · ' + wx : ''));
  setBiomeMood(z.id); // musica col mood del bioma (crossfade al cambio)
  if (z.id !== lastZone) {
    if (lastZone !== null) toast(z.icon + tr(' Stai entrando: ', ' Entering: ') + zoneName(z.id));
    lastZone = z.id;
  }
  nearestTown();
  const el = document.getElementById('h-compass');
  const tag = document.getElementById('compasstag');
  const show = v => { if (tag) tag.style.display = v ? '' : 'none'; };
  /* mappa del tesoro seguita (click nello zaino): il tag mostra la X (la freccia rossa guida) */
  const mp = trackedMap();
  if (mp) {
    const mx = mp.x * TS + 8, my = mp.y * TS + 8;
    compass.target = { x: mx, y: my };
    show(true); el.innerHTML = withIcons('🗺️ X ' + rarLabel(mp.rar));
    return;
  }
  compass.target = null; // il target (freccia ROSSA) è solo per le mappe del tesoro
  const t = compass.town;
  /* benvenuto entrando in città: INDIPENDENTE dalla bussola */
  if (t && playerInTown(t) && S.lastTown !== t.key) { S.lastTown = t.key; save(); toast(tr('Benvenuto a ', 'Welcome to ') + t.name + '!'); }
  /* BUSSOLA = oggetto acquistabile e ATTIVABILE (o compagno "bussola"): solo allora nome + freccia città */
  const cOn = !!(S.tools && S.tools.compass && S.compassOn) || companionAbility() === 'compass';
  compass.cityGuide = cOn && !!t; // la freccia gialla verso la città (letta in drawCompassIndicator)
  if (cOn && t) {
    const inTown = playerInTown(t);
    show(true); el.innerHTML = withIcons('🧭 ' + t.name + (inTown ? '' : ' · ' + Math.round(compass.dist / TS) + tr(' passi', ' steps')));
    return;
  }
  show(false);
}
