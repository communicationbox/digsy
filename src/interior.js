/* Interni delle case: stanza camminabile con NPC. Coordinate separate dal mondo (P resta
   sulla porta): salvataggi, bussola e titoli non cambiano. Si entra CAMMINANDO sulla porta,
   si esce ripassando dalla porta in basso (o ESC). */
import { TS } from './data.js';
import { P } from './state.js';
import { townInfo, townForTile } from './world.js';
import { ZONES, zonePools } from './data.js';
import { S } from './state.js';
import { tr } from './i18n.js';

export const INT = {
  active: false, b: null, town: null,
  w: 10, h: 7,            // stanza in tile
  x: 0, y: 0,             // posizione del player DENTRO (px)
  dir: 'up', anim: 0, moving: false,
  justLeft: false,        // anti-rientro immediato
  room: 'main',           // museo: 'hall' | indice zona 0..5
};
/* museo: 6 porte sulla parete della hall (x centro) e teche delle ali */
export const HALL_DOORS = [16, 40, 64, 96, 120, 144];
export function caseRects() {
  const out = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) out.push({ x0: 12 + c * 30, y0: 48 + r * 28, x1: 30 + c * 30, y1: 62 + r * 28 }); // corsie da 12px
  return out;
}
const HALL_DESK = { x0: 70, y0: 66, x1: 90, y1: 78 }; // stretto: le 6 porte restano raggiungibili

/* NPC per mestiere: look (usato con drawHero) e nome */
export const NPCS = {
  lab: { name: ['Prof. Ossidiana', 'Prof. Obsidian'], look: { hat: '#e2d7bd', hatStyle: 'none', shirt: '#f6efdd', pants: '#5a6a8a', skin: '#e3b98a', hairStyle: 'curly', hairColor: '#8a8a8a' } },
  store: { name: ['Bottegaia Ambra', 'Shopkeeper Amber'], look: { hat: '#d8973c', hatStyle: 'none', shirt: '#c98a2e', pants: '#6b5137', skin: '#c9995f', hairStyle: 'long', hairColor: '#6e4a2a' } },
  museum: { name: ['Curatore Basalto', 'Curator Basalt'], look: { hat: '#8d7ba0', hatStyle: 'none', shirt: '#8d7ba0', pants: '#3d5f4a', skin: '#f3cfa0', hairStyle: 'receding', hairColor: '#8a8a8a' } },
  inn: { name: ['Locandiera Papavera', 'Innkeeper Poppy'], look: { hat: '#c65a54', hatStyle: 'none', shirt: '#c65a54', pants: '#8a5f38', skin: '#e3b98a', hairStyle: 'long', hairColor: '#b5622e' } },
  barber: { name: ['Barbiere Figaro', 'Barber Figaro'], look: { hat: '#5a86c8', hatStyle: 'none', shirt: '#5a86c8', pants: '#33291f', skin: '#a3744a', hairStyle: 'punk', hairColor: '#33291f' } },
  tailor: { name: ['Sarta Ortensia', 'Tailor Hortense'], look: { hat: '#e08aa8', hatStyle: 'none', shirt: '#e08aa8', pants: '#5a6a8a', skin: '#f3cfa0', hairStyle: 'curly', hairColor: '#caa25a' } },
};
export function npcName(type) { const n = (NPCS[type] || NPCS.store).name; return tr(n[0], n[1]); }

/* mobili solidi per mestiere (px, stanza 160×112) — corridoio centrale sempre libero */
const FURN = {
  lab: [
    { x0: 12, y0: 46, x1: 48, y1: 68 },    // postazione alambicco
    { x0: 112, y0: 46, x1: 148, y1: 68 },  // banco da lavoro
  ],
  store: [
    { x0: 12, y0: 46, x1: 46, y1: 68 },    // casse e sacchi
    { x0: 114, y0: 46, x1: 148, y1: 68 },  // botti
  ],
  museum: [
    { x0: 18, y0: 46, x1: 52, y1: 70 },    // teca sinistra
    { x0: 108, y0: 46, x1: 142, y1: 70 },  // teca destra
  ],
  inn: [
    { x0: 14, y0: 48, x1: 48, y1: 68 },    // tavolo sinistro
    { x0: 112, y0: 48, x1: 146, y1: 68 },  // tavolo destro
  ],
  barber: [
    { x0: 14, y0: 46, x1: 44, y1: 68 },    // poltrona
    { x0: 114, y0: 50, x1: 148, y1: 66 },  // panca d'attesa
  ],
  tailor: [
    { x0: 16, y0: 48, x1: 42, y1: 66 },    // manichino
    { x0: 110, y0: 46, x1: 148, y1: 68 },  // tavolo da cucito
  ],
};
export function enterInterior(b, town) {
  INT.active = true; INT.b = b; INT.town = town;
  INT.x = (INT.w / 2) * TS; INT.y = (INT.h - 1.3) * TS;
  INT.dir = 'up'; INT.moving = false;
  INT.room = b.type === 'museum' ? 'hall' : 'main';
  INT.solids = b.type === 'museum' ? [HALL_DESK] : (FURN[b.type] || []);
}
export function exitInterior() {
  INT.active = false; INT.justLeft = true;
  if (INT.b) { P.x = INT.b.doorx * TS + 8; P.y = (INT.b.doory + 1) * TS + 10; }
}
/* pareti + bancone: il player vive tra y=2.4 tile e la parete bassa */
export function interiorSolid(x, y) {
  const w = INT.w * TS, h = INT.h * TS;
  if (x < 8 || x > w - 8) return true;
  if (INT.room === 'main') { if (y < 2.9 * TS) return true; }            // parete + bancone
  else if (y < 1.6 * TS) {                                               // museo: parete con PORTE
    if (INT.room !== 'hall') return true;                                 // nelle ali niente varchi in alto
    if (!HALL_DOORS.some(dx => Math.abs(x - dx) < 8)) return true;        // in hall si passa solo alle porte
  }
  if (y > h - 4) return true;                            // parete bassa (la porta è un varco)
  for (const f of INT.solids || []) if (x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1) return true;
  return false;
}
export function nearNpc() {
  if (!INT.active) return false;
  if (INT.b && INT.b.type === 'museum') {
    if (INT.room !== 'hall') return false;
    return Math.abs(INT.x - 80) < 26 && INT.y > 78 && INT.y < 98; // davanti al banco della hall
  }
  return Math.abs(INT.x - (INT.w / 2) * TS) < 30 && INT.y < 3.6 * TS;
}
/* teca più vicina nell'ala del museo: {sp, n} per il prompt */
export function nearCase() {
  if (!INT.active || !INT.b || INT.b.type !== 'museum' || INT.room === 'hall' || INT.room === 'main') return null;
  const pool = zonePools[ZONES[INT.room].id];
  const cases = caseRects();
  for (let i = 0; i < cases.length; i++) {
    const f = cases[i], cx = (f.x0 + f.x1) / 2, cy = (f.y0 + f.y1) / 2;
    if (Math.abs(INT.x - cx) < 20 && Math.abs(INT.y - (cy + 12)) < 14) {
      const sp = pool[i]; if (!sp) return null;
      return { sp, n: (S.museum[sp.id] || []).length };
    }
  }
  return null;
}
export function onDoor() {
  return INT.y > (INT.h - 1.15) * TS && Math.abs(INT.x - (INT.w / 2) * TS) < 14;
}
/* hitbox dei piedi (4 punti): lo sprite non compenetra i mobili */
function intCollide(x, y) {
  return interiorSolid(x - 5, y) || interiorSolid(x + 5, y) || interiorSolid(x - 5, y + 5) || interiorSolid(x + 5, y + 5);
}
export function updateInterior(dt, keys, speed) {
  let dx = 0, dy = 0;
  if (keys.up) dy--; if (keys.down) dy++; if (keys.left) dx--; if (keys.right) dx++;
  if (dx || dy) {
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    if (Math.abs(dx) > Math.abs(dy)) INT.dir = dx < 0 ? 'left' : 'right'; else INT.dir = dy < 0 ? 'up' : 'down';
    const nx = INT.x + dx * speed * dt, ny = INT.y + dy * speed * dt;
    if (!intCollide(nx, INT.y)) INT.x = nx;
    if (!intCollide(INT.x, ny) || (dy > 0 && onDoor())) INT.y = ny; // verso la porta si passa
    INT.anim += dt; INT.moving = true;
  } else INT.moving = false;
  /* museo: transizioni tra hall e ali */
  if (INT.b && INT.b.type === 'museum') {
    if (INT.room === 'hall' && INT.y < 1.9 * TS) {
      const di = HALL_DOORS.findIndex(dx => Math.abs(INT.x - dx) < 8);
      if (di >= 0) { INT.room = di; INT.solids = caseRects(); INT.x = 80; INT.y = (INT.h - 1.3) * TS; return; }
    }
    if (INT.room !== 'hall' && onDoor() && INT.y > (INT.h - 0.9) * TS) {
      const back = HALL_DOORS[INT.room] || 80;
      INT.room = 'hall'; INT.solids = [HALL_DESK]; INT.x = back; INT.y = 2.4 * TS; return;
    }
    if (INT.room === 'hall' && onDoor() && INT.y > (INT.h - 0.9) * TS) exitInterior();
    return;
  }
  if (onDoor() && INT.y > (INT.h - 0.9) * TS) exitInterior();
}
/* chiamato dal loop: si entra solo CAMMINANDO DENTRO la porta (verso l'alto),
   non passandoci davanti in orizzontale */
export function checkDoorEnter() {
  if (INT.active) return;
  const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
  const ti = townInfo(tx, ty);
  if (ti && ti.door) {
    if (INT.justLeft) return;                        // appena usciti: serve allontanarsi
    if (!(P.moving && P.dir === 'up')) return;       // di passaggio: non entrare
    enterInterior(ti.door, townForTile(tx, ty));
  } else INT.justLeft = false;
}
