/* Rendering: tile, decorazioni, edifici, parco, eroe, indicatore bussola */
import { TS, spColor, spById } from './data.js';
import { partParams } from './bones.js';
import { ctx, view } from './screen.js';
import { S, P, cam, dugSet } from './state.js';
import { DEEP, WATER, SAND, GRASS, FOREST, DIRT, MTN, FLOOR, PARK, baseTerrain, diggable, decoAt, townInfo, townForTile, siteAt } from './world.js';
import { siteRemaining } from './gameplay.js';
import { SEED, vhash } from './noise.js';
import { drawHero } from './sprites.js';
import { parks, visParks } from './park.js';
import { compass, playerInTown, octant } from './compass.js';
import { INT, NPCS, HALL_DOORS, caseRects } from './interior.js';
import { zonePools, ZONES } from './data.js';
import { applyLook } from './sprites.js';
import { darknessAt, seasonOf } from './daynight.js';
import { zoneAt, zoneIdxAt } from './regions.js';

/* stato del frame: oscurità (0..1) e stagione corrente, letti dalle funzioni di disegno */
let NIGHT = 0, SEA = 0;
/* palette stagionali: erba [3 toni]+dettagli, foresta [2 toni]+dettaglio */
const SEASON_TILES = [
  { g: ['#79bb63', '#7ec069', '#74b55e'], gd: '#5fa04e', gh: '#6cb35a', f: ['#5b9e54', '#63a659'], fd: '#4c8c47' },
  { g: ['#88c05f', '#8ec565', '#82ba59'], gd: '#6aa84e', gh: '#79b75c', f: ['#699e50', '#71a656'], fd: '#578c45' },
  { g: ['#b7a355', '#bda95d', '#af9c4f'], gd: '#96813c', gh: '#c7b36a', f: ['#8f8a48', '#97914e'], fd: '#7a7440' },
  { g: ['#dfe5ea', '#e6ecf0', '#d7dee3'], gd: '#b9c4cc', gh: '#f2f6f8', f: ['#9fb3ab', '#a7bbb2'], fd: '#8aa096' },
];
/* palette TERRENO per zona (0 prati usa le stagioni): erba[3]+dettagli, foresta[2]+dettaglio, dirt[2] */
const ZONE_TILES = [
  null, // prati → stagionale
  { g: ['#d8c48c', '#dcc994', '#d2bd82'], gd: '#b9a468', gh: '#e8dcae', f: ['#c2ae76', '#c8b47c'], fd: '#a89460', dirt: ['#d2b078', '#c2a068'] },
  { g: ['#6f7f62', '#75856a', '#69795c'], gd: '#57644c', gh: '#83937a', f: ['#4c5c48', '#525f4c'], fd: '#3d4a3a', dirt: ['#8a8272', '#7a7264'] },
  { g: ['#b98a5a', '#bf9060', '#b28454'], gd: '#9a7044', gh: '#cc9c6c', f: ['#8a6a48', '#907050'], fd: '#755838', dirt: ['#c06a48', '#a85a3c'] },
  { g: ['#5f7a52', '#657f58', '#59744c'], gd: '#4a6340', gh: '#6f8a62', f: ['#465c3e', '#4c6244'], fd: '#39492f', dirt: ['#7a7050', '#6a6044'] },
  { g: ['#dfe5ea', '#e6ecf0', '#d7dee3'], gd: '#b9c4cc', gh: '#f2f6f8', f: ['#9fb3ab', '#a7bbb2'], fd: '#8aa096', dirt: ['#b8c2c8', '#a6b2ba'] },
];
/* chiome degli alberi per zona (null → stagionale) */
const ZONE_TREE = [null, null,
  ['#4c5c48', '#556653', '#5e7059', '#66785f', '#7a8c70', '#39492f'],   // boschi cinerei
  ['#a5622f', '#b96f33', '#c97e3a', '#d18d45', '#e5aa62', '#7f4a22'],   // terre: secchi
  ['#3f5c40', '#46644a', '#4e6c50', '#567456', '#6a8868', '#2f4530'],   // palude: cupi
  ['#dfe8ee', '#e8eff3', '#f1f6f8', '#f8fbfc', '#ffffff', '#b9c7d0'],   // ghiacci: innevati
];

/* chiome degli alberi per stagione: [base, mid, alto, cima, luce, ombra] */
const SEASON_TREE = [
  ['#3f8a4c', '#4a9a55', '#54ab5f', '#5fb768', '#7cd07f', '#2f6b3b'],
  ['#42904e', '#4da058', '#57b162', '#63bd6c', '#83d584', '#337340'],
  ['#a5622f', '#b96f33', '#c97e3a', '#d18d45', '#e5aa62', '#7f4a22'],
  ['#dfe8ee', '#e8eff3', '#f1f6f8', '#f8fbfc', '#ffffff', '#b9c7d0'],
];

/* ---------- helper pixel ---------- */
/* aggancia una coordinata interna alla griglia dei pixel FISICI (multipli di 1/K):
   niente Math.round intero → niente oscillazione ±1px quando W/H sono dispari */
function snap(v) { return Math.round(v * view.K) / view.K; }
function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function shadow(cx, cy, rw) {
  ctx.fillStyle = 'rgba(15,25,15,.16)';
  for (let i = -rw; i <= rw; i++) { const h = Math.round(2 * Math.sqrt(Math.max(0, 1 - (i * i) / (rw * rw)))); ctx.fillRect(cx + i, cy - h, 1, h * 2); }
}

/* ---------- tile di terreno ---------- */
function groundTile(t, tx, ty, sx, sy, time, zi) {
  const ZP = ZONE_TILES[zi] || null;
  switch (t) {
    case DEEP: {
      if (zi === 5) { rect(sx, sy, TS, TS, '#9cc0d4'); rect(sx, sy, TS, 1, '#b6d4e4'); break; }           // mare gelato
      if (zi === 4) { rect(sx, sy, TS, TS, '#3d5844'); rect(sx, sy + 7, TS, 2, '#48644e'); break; }        // acque nere
      rect(sx, sy, TS, TS, '#3f7fa6'); rect(sx, sy + 7, TS, 2, '#4d8fb5'); break;
    }
    case WATER: {
      if (zi === 5) { // LASTRA DI GHIACCIO: crepe, niente onde
        rect(sx, sy, TS, TS, '#c2dcea'); rect(sx, sy, TS, 1, '#daeaf4');
        if (vhash(tx, ty, 51) < 0.4) { px(sx + 3, sy + 5, '#9cc0d4'); px(sx + 4, sy + 6, '#9cc0d4'); px(sx + 5, sy + 7, '#9cc0d4'); }
        break;
      }
      if (zi === 4) { // acqua di palude: torbida, ninfee
        rect(sx, sy, TS, TS, '#5d7a54');
        const w2 = Math.floor(Math.sin((tx + ty) * 0.8 + time / 600) * 1);
        rect(sx, sy + 7 + w2, TS, 1, '#6f8a62');
        if (vhash(tx, ty, 52) < 0.18) { rect(sx + 5, sy + 5, 5, 3, '#4a9a55'); px(sx + 7, sy + 4, '#e08aa8'); }
        break;
      }
      rect(sx, sy, TS, TS, '#5cb6d6'); const w = Math.floor(Math.sin((tx + ty) * 0.8 + time / 400) * 2); rect(sx, sy + 6 + w, TS, 2, '#83cfe6'); rect(sx, sy + 11 - w, TS, 1, '#49a4c6'); break;
    }
    case SAND: {
      if (zi === 1) { rect(sx, sy, TS, TS, '#e9d9a8'); px(sx + 4, sy + 5, '#f4ecd4'); px(sx + 11, sy + 9, '#d6c48e'); px(sx + 7, sy + 12, '#f4ecd4'); break; } // sabbia d'ossa
      if (zi === 5) { rect(sx, sy, TS, TS, '#d7dee3'); px(sx + 5, sy + 6, '#eef3f6'); px(sx + 10, sy + 10, '#b9c4cc'); break; }                                  // riva gelata
      rect(sx, sy, TS, TS, '#e6cf96'); px(sx + 4, sy + 5, '#d6bd82'); px(sx + 11, sy + 9, '#d6bd82'); px(sx + 7, sy + 12, '#d6bd82'); break;
    }
    case GRASS: { // zona 0: stagioni · altrove: palette del bioma
      const SP = ZP || SEASON_TILES[SEA];
      const v = vhash(tx, ty, 21);
      rect(sx, sy, TS, TS, v < 0.4 ? SP.g[0] : v < 0.8 ? SP.g[1] : SP.g[2]);
      const d = vhash(tx, ty, 22);
      const gx = sx + 3 + Math.floor(vhash(tx, ty, 23) * 9), gy = sy + 3 + Math.floor(vhash(tx, ty, 24) * 9);
      if (d < 0.26) { px(gx, gy, SP.gd); px(gx + 1, gy, SP.gd); px(gx, gy - 1, SP.gh); px(gx + 2, gy - 1, SP.gh); }
      else if (d < 0.33) { px(gx, gy, vhash(tx, ty, 26) < 0.5 ? '#f2dd7a' : '#f3ece0'); px(gx, gy + 1, SP.gd); }
      else if (d < 0.38) { px(gx, gy, '#a8ad92'); px(gx + 1, gy, '#8f947c'); }
      break;
    }
    case FOREST: { const SP = ZP || SEASON_TILES[SEA]; rect(sx, sy, TS, TS, ((tx + ty) & 1) ? SP.f[0] : SP.f[1]); px(sx + 5, sy + 6, SP.fd); px(sx + 10, sy + 11, SP.fd); break; }
    case DIRT: {
      const d0 = ZP ? ZP.dirt[0] : '#c9a06a', d1 = ZP ? ZP.dirt[1] : '#b98d59';
      rect(sx, sy, TS, TS, d0); px(sx + 4, sy + 4, d1); px(sx + 10, sy + 8, d1); px(sx + 7, sy + 12, d1);
      if (zi === 3 && vhash(tx, ty, 53) < 0.15) { px(sx + 6, sy + 6, '#8a3f2e'); px(sx + 7, sy + 6, '#8a3f2e'); px(sx + 8, sy + 7, '#8a3f2e'); } // crepe
      break;
    }
    case MTN: { rect(sx, sy, TS, TS, '#9a9285'); rect(sx, sy, TS, 3, '#aaa294'); px(sx + 5, sy + 8, '#7f776a'); px(sx + 11, sy + 11, '#7f776a'); break; }
    case FLOOR: { // lastricato: toni variabili, fughe a mattoni sfalsati, crepe rare
      const v = vhash(tx, ty, 25);
      rect(sx, sy, TS, TS, v < 0.5 ? '#d8c49a' : v < 0.8 ? '#d2bd90' : '#dfcda6');
      rect(sx, sy, TS, 1, '#c3ad7e'); rect(sx, sy, 1, TS, '#c3ad7e');
      if (ty & 1) rect(sx + 8, sy, 1, TS, '#cab687'); // giunto sfalsato a file alterne
      if (vhash(tx, ty, 26) < 0.08) { px(sx + 5, sy + 6, '#b6a071'); px(sx + 6, sy + 7, '#b6a071'); px(sx + 7, sy + 8, '#b6a071'); }
      else if (vhash(tx, ty, 27) < 0.3) px(sx + 3 + Math.floor(vhash(tx, ty, 28) * 10), sy + 4 + Math.floor(vhash(tx, ty, 29) * 9), '#c8b285');
      break;
    }
    case PARK: { // prato curato: strisce falciate + margherite e ciuffi
      rect(sx, sy, TS, TS, ((tx + ty) & 1) ? '#8cc873' : '#92cd79');
      const d = vhash(tx, ty, 31);
      const gx = sx + 3 + Math.floor(vhash(tx, ty, 32) * 9), gy = sy + 3 + Math.floor(vhash(tx, ty, 33) * 9);
      if (d < 0.24) { px(gx, gy, '#76b35f'); px(gx + 1, gy, '#76b35f'); px(gx + 1, gy - 1, '#a4dd8c'); }
      else if (d < 0.33) { px(gx, gy, '#f6f2e4'); px(gx + 1, gy, '#f6f2e4'); px(gx, gy - 1, '#f6f2e4'); px(gx + 1, gy - 1, '#f6f2e4'); px(gx, gy, '#f2dd7a'); }
      break;
    }
  }
}

/* ---------- decorazioni ---------- */
/* solo ~1 albero su 3 ondeggia (vhash sul tile): movimento senza appesantire */
function drawTree(sx, sy, time, tx, ty) {
  const zi = zoneIdxAt(tx, ty);
  const T = ZONE_TREE[zi] || SEASON_TREE[SEA];
  const sw = vhash(tx, ty, 41) < 0.35 ? Math.round(Math.sin(time / 850 + tx * 1.7 + ty * 2.3)) : 0;
  const cx = sx + 8, base = sy + 15; shadow(cx, base, 7); rect(cx - 2, base - 6, 4, 6, '#7c4f2e'); px(cx - 2, base - 6, '#5f3c22');
  const k = cx + sw;
  rect(k - 7, base - 16, 14, 9, T[0]); rect(k - 8, base - 14, 16, 6, T[1]); rect(k - 6, base - 19, 12, 6, T[2]); rect(k - 4, base - 21, 8, 5, T[3]);
  rect(k - 3, base - 19, 3, 2, T[4]); px(k + 2, base - 17, T[4]); px(k - 8, base - 9, T[5]); px(k + 7, base - 9, T[5]);
}
function drawBoulder(sx, sy) { const cx = sx + 8, base = sy + 13; shadow(cx, base, 6); rect(cx - 6, base - 7, 12, 7, '#9a9285'); rect(cx - 5, base - 9, 10, 3, '#aaa294'); px(cx - 2, base - 7, '#b8b0a2'); rect(cx - 4, base - 4, 4, 2, '#b8b0a2'); rect(cx - 6, base - 1, 12, 1, '#75695c'); }
function drawFlower(sx, sy, tx, ty) { const bx = sx + 8, by = sy + 9, k = (((tx * 5 + ty * 3) % 3) + 3) % 3; const petal = k === 0 ? '#f0a5c0' : k === 1 ? '#f2dd7a' : '#f3ece0'; px(bx, by - 2, petal); px(bx - 2, by, petal); px(bx + 2, by, petal); px(bx, by + 2, petal); px(bx, by, '#d98a3c'); px(bx, by + 4, '#4a8f4f'); }
function drawShell(sx, sy) { const bx = sx + 8, by = sy + 9; rect(bx - 2, by - 2, 4, 4, '#e7c6a0'); px(bx - 1, by - 1, '#f5e4cf'); px(bx, by - 3, '#d3a97f'); }
function drawHole(sx, sy) { const cx = sx + 8, cy = sy + 10; ctx.fillStyle = '#6d4f30'; ctx.fillRect(cx - 5, cy - 3, 10, 6); ctx.fillStyle = '#4d371f'; px(cx - 4, cy - 2, '#4d371f'); px(cx + 4, cy - 2, '#4d371f'); px(cx, cy + 1, '#4d371f'); }


/* ---------- decorazioni di zona ---------- */
function drawCactus(sx, sy) {
  const cx = sx + 8, base = sy + 15; shadow(cx, base, 5);
  rect(cx - 2, base - 12, 4, 12, '#4a9a55'); rect(cx - 1, base - 12, 1, 12, '#5fb768');
  rect(cx - 6, base - 9, 4, 2, '#4a9a55'); rect(cx - 6, base - 9, 2, 5, '#4a9a55');
  rect(cx + 2, base - 7, 4, 2, '#4a9a55'); rect(cx + 4, base - 11, 2, 6, '#4a9a55');
  px(cx - 3, base - 10, '#2f6b3b'); px(cx + 1, base - 5, '#2f6b3b'); px(cx, base - 13, '#e08aa8');
}
function drawBonespire(sx, sy) {
  const cx = sx + 8, base = sy + 14; shadow(cx, base, 6);
  for (const [ox, h] of [[-5, 7], [0, 10], [5, 6]]) {
    rect(cx + ox - 1, base - h, 2, h, '#ece5d2'); px(cx + ox - 2, base - h, '#ece5d2'); px(cx + ox + 1, base - h + 1, '#cbbfa4');
  }
  rect(cx - 6, base - 2, 12, 2, '#cbbfa4');
}
function drawDeadtree(sx, sy) {
  const cx = sx + 8, base = sy + 15; shadow(cx, base, 5);
  rect(cx - 1, base - 13, 3, 13, '#6e5138'); px(cx - 1, base - 13, '#5c4229');
  rect(cx - 6, base - 11, 5, 2, '#6e5138'); px(cx - 6, base - 13, '#6e5138');
  rect(cx + 2, base - 9, 6, 2, '#6e5138'); px(cx + 7, base - 11, '#6e5138');
  px(cx + 1, base - 15, '#6e5138'); px(cx - 3, base - 6, '#6e5138');
}
function drawMushroom(sx, sy) {
  const bx = sx + 8, by = sy + 11;
  rect(bx - 1, by - 2, 3, 3, '#ece5d2');
  rect(bx - 3, by - 5, 7, 3, '#c65a54'); rect(bx - 2, by - 6, 5, 1, '#c65a54');
  px(bx - 1, by - 5, '#f6efdd'); px(bx + 2, by - 4, '#f6efdd');
}
function drawStump(sx, sy) {
  const cx = sx + 8, base = sy + 13; shadow(cx, base, 5);
  rect(cx - 4, base - 5, 8, 5, '#8a5f38'); rect(cx - 4, base - 6, 8, 2, '#c9a06a');
  px(cx - 1, base - 6, '#a97a4c'); px(cx + 1, base - 5, '#a97a4c'); px(cx - 5, base - 3, '#6e5138');
}
function drawRedspire(sx, sy) {
  const cx = sx + 8, base = sy + 15; shadow(cx, base, 6);
  rect(cx - 3, base - 14, 6, 14, '#b05e3e'); rect(cx - 4, base - 8, 8, 8, '#c06a48');
  rect(cx - 2, base - 14, 2, 14, '#cc7854'); px(cx - 1, base - 16, '#b05e3e'); px(cx + 3, base - 6, '#8a3f2e');
}
function drawOrecrystal(sx, sy) {
  const cx = sx + 8, base = sy + 13; shadow(cx, base, 5);
  for (const [ox, h, c] of [[-4, 6, '#8d7ba0'], [0, 9, '#9ad0c8'], [4, 5, '#8d7ba0']]) {
    rect(cx + ox - 1, base - h, 3, h, c); px(cx + ox, base - h - 1, c); px(cx + ox - 1, base - h + 1, '#e8f6fb');
  }
}
function drawReed(sx, sy, time, tx, ty) {
  const cx = sx + 8, base = sy + 14;
  const sw2 = Math.round(Math.sin(time / 800 + tx * 2.1 + ty) * 1);
  for (const ox of [-4, 0, 4]) {
    rect(cx + ox, base - 9, 1, 9, '#4a6340');
    px(cx + ox + sw2, base - 10, '#4a6340');
    if (ox === 0) { rect(cx + sw2, base - 13, 2, 4, '#8a5f38'); }
  }
}
function drawIcecrystal(sx, sy) {
  const cx = sx + 8, base = sy + 13; shadow(cx, base, 5);
  for (const [ox, h] of [[-4, 6], [0, 10], [4, 7]]) {
    rect(cx + ox - 1, base - h, 3, h, '#bfe9f4'); px(cx + ox, base - h - 1, '#e8f6fb'); px(cx + ox - 1, base - h + 2, '#8fd0e6');
  }
}
function drawHay(sx, sy) {
  const cx = sx + 8, base = sy + 13; shadow(cx, base, 6);
  rect(cx - 6, base - 8, 12, 8, '#d4b13c'); rect(cx - 6, base - 8, 12, 2, '#e0c25c');
  rect(cx - 6, base - 5, 12, 1, '#b99b2e'); px(cx - 4, base - 3, '#b99b2e'); px(cx + 3, base - 6, '#e0c25c');
}
/* ---------- edifici / parco ---------- */
const roofCol = {
  store: ['#d8973c', '#a86e22'], lab: ['#5a86c8', '#3d5f97'], museum: ['#c98a5a', '#9c6636'],
  inn: ['#c65a54', '#9a3f3a'], barber: ['#8d7ba0', '#655a80'], tailor: ['#e08aa8', '#a85f7d'],
};
/* icona 5x5 dentro l'insegna: riconoscibilità immediata del tipo di edificio */
function drawSignIcon(type, cx, y) {
  switch (type) {
    case 'store': // moneta
      rect(cx - 1, y + 1, 3, 3, '#e8c34a'); px(cx - 2, y + 2, '#e8c34a'); px(cx + 2, y + 2, '#e8c34a'); px(cx, y + 2, '#a8842a'); break;
    case 'lab': // fiala
      rect(cx, y, 1, 2, '#cfe8f2'); rect(cx - 1, y + 2, 3, 2, '#5a86c8'); px(cx, y + 3, '#8fd0e6'); break;
    case 'museum': // osso
      px(cx - 2, y + 1, '#f3ecda'); px(cx - 2, y + 3, '#f3ecda'); px(cx + 2, y + 1, '#f3ecda'); px(cx + 2, y + 3, '#f3ecda');
      rect(cx - 2, y + 2, 5, 1, '#f3ecda'); break;
    case 'inn': // mezzaluna
      rect(cx - 1, y, 3, 4, '#f2dd7a'); rect(cx + 1, y, 2, 4, '#d9b98a'); px(cx - 1, y, '#d9b98a'); px(cx - 1, y + 3, '#d9b98a'); break;
    case 'barber': // palo rosso/bianco
      rect(cx - 1, y, 1, 5, '#e05a5a'); rect(cx, y, 1, 5, '#f3ecda'); rect(cx + 1, y, 1, 5, '#e05a5a'); break;
    case 'tailor': // maglietta
      rect(cx - 2, y + 1, 5, 1, '#e08aa8'); rect(cx - 1, y + 2, 3, 3, '#e08aa8'); px(cx - 2, y + 2, '#c06a88'); px(cx + 2, y + 2, '#c06a88'); break;
  }
}
function drawSign(type, cx, y) {
  px(cx, y - 1, '#5c4229'); // gancio
  rect(cx - 5, y, 11, 7, '#8a5f38'); rect(cx - 4, y + 1, 9, 5, '#d9b98a');
  drawSignIcon(type, cx, y + 1);
}
function drawBuilding(b, sx, sy) {
  const w = 3 * TS, h = 2 * TS;
  /* variazioni deterministiche per edificio */
  const bv = vhash(b.x0, b.y0, 77), bw = vhash(b.x0, b.y0, 78), bc = vhash(b.x0, b.y0, 79);
  shadow(sx + w / 2, sy + h + 2, Math.floor(w / 2) - 2);
  // muro: tono variabile + travi angolari
  const wall = bv < 0.34 ? '#efe3c6' : bv < 0.67 ? '#e9dbb8' : '#f0e0cb';
  rect(sx + 2, sy + 10, w - 4, h - 8, wall); rect(sx + 2, sy + 10, w - 4, 2, '#fff6e0'); rect(sx + 2, sy + h - 2, w - 4, 2, '#cdbd97');
  rect(sx + 2, sy + 12, 2, h - 14, '#d9c8a2'); rect(sx + w - 4, sy + 12, 2, h - 14, '#d9c8a2');
  // tetto con tegole
  const rc = roofCol[b.type] || ['#c98a5a', '#9c6636'];
  rect(sx, sy + 2, w, 10, rc[0]);
  rect(sx, sy + 5, w, 1, 'rgba(0,0,0,.10)'); rect(sx, sy + 8, w, 1, 'rgba(0,0,0,.10)');
  rect(sx, sy + 2, w, 3, '#ffffff22'); rect(sx - 1, sy + 11, w + 2, 2, rc[1]);
  ctx.fillStyle = rc[1]; ctx.beginPath(); ctx.moveTo(sx, sy + 2); ctx.lineTo(sx + w / 2, sy - 4); ctx.lineTo(sx + w, sy + 2); ctx.closePath(); ctx.fill();
  // camino su alcune case
  if (bc < 0.45) { rect(sx + w - 12, sy - 3, 4, 7, '#9a8874'); rect(sx + w - 12, sy - 3, 4, 2, '#7f6f5e'); px(sx + w - 11, sy - 5, '#cfcabf'); px(sx + w - 10, sy - 7, '#dcd8cf'); }
  // finestre con infissi (+ fioriere su alcune); di notte si accendono
  const glass = NIGHT > 0.4 ? '#ffdf8a' : '#8fd0e6';
  for (const wx of [sx + 6, sx + w - 11]) {
    rect(wx, sy + 16, 5, 5, glass); rect(wx + 2, sy + 16, 1, 5, '#efe6cf'); rect(wx, sy + 18, 5, 1, '#efe6cf'); rect(wx, sy + 21, 5, 1, '#cdbd97');
    if (bw < 0.5) { rect(wx - 1, sy + 22, 7, 2, '#8a5f38'); px(wx + 1, sy + 21, '#e05a7a'); px(wx + 4, sy + 21, '#f2dd7a'); }
  }
  // porta
  const dcx = sx + w / 2; rect(dcx - 5, sy + h - 12, 10, 12, '#7a5a3a'); rect(dcx - 3, sy + h - 10, 6, 10, '#5c4229'); px(dcx + 1, sy + h - 6, '#d9b98a');
  // insegna appesa sopra la porta
  drawSign(b.type, dcx, sy + 12);
}
/* ---------- arredo urbano ---------- */
function drawFountain(sx, sy, time) {
  shadow(sx + 16, sy + 31, 13);
  rect(sx + 2, sy + 10, 28, 20, '#aaa294');            // bordo esterno
  rect(sx + 3, sy + 11, 26, 18, '#9a9285');
  rect(sx + 5, sy + 13, 22, 14, '#4d8fb5');            // acqua
  rect(sx + 5, sy + 13, 22, 2, '#5cb6d6');
  const ph = Math.floor(time / 220);                   // riflessi che scorrono
  for (let i = 0; i < 3; i++) {
    rect(sx + 6 + ((ph + i * 3) % 9) * 2, sy + 16 + i * 4, 4, 1, '#83cfe6');
    px(sx + 8 + ((ph * 2 + i * 5) % 14), sy + 18 + i * 3, '#bfe9f4');
  }
  rect(sx + 12, sy + 15, 8, 3, '#9a9285');             // base colonna
  rect(sx + 14, sy + 6, 4, 10, '#aaa294'); rect(sx + 14, sy + 6, 4, 2, '#c9c2b4');
  const j = Math.floor(time / 160) % 4;                // zampilli e gocce
  px(sx + 15, sy + 3 - (j % 2), '#bfe9f4'); px(sx + 16, sy + 2 + (j % 2), '#e8f6fb');
  px(sx + 12 + (j & 1), sy + 6 + (j >> 1), '#bfe9f4'); px(sx + 19 - (j & 1), sy + 7 - (j >> 1), '#bfe9f4');
  px(sx + 10, sy + 9 + j, '#bfe9f4'); px(sx + 21, sy + 12 - j, '#bfe9f4');
}
function drawBench(sx, sy) {
  shadow(sx + 8, sy + 14, 6);
  rect(sx + 2, sy + 4, 12, 2, '#c79a66'); px(sx + 2, sy + 4, '#a97a4c'); px(sx + 13, sy + 4, '#a97a4c'); // schienale
  rect(sx + 2, sy + 8, 12, 3, '#c79a66'); rect(sx + 2, sy + 8, 12, 1, '#dcb27e');                        // seduta
  rect(sx + 3, sy + 11, 2, 3, '#8a5f38'); rect(sx + 11, sy + 11, 2, 3, '#8a5f38');                       // gambe
}
function drawBushDeco(sx, sy) {
  shadow(sx + 8, sy + 14, 6);
  rect(sx + 3, sy + 6, 10, 7, '#4a9a55'); rect(sx + 4, sy + 4, 8, 4, '#54ab5f');
  px(sx + 5, sy + 5, '#7cd07f'); px(sx + 9, sy + 4, '#7cd07f');
  px(sx + 6, sy + 9, '#e05a7a'); px(sx + 10, sy + 8, '#f2dd7a'); // bacche/fiori
  rect(sx + 3, sy + 12, 10, 1, '#2f6b3b');
}
function drawLamp(sx, sy) {
  shadow(sx + 8, sy + 15, 4);
  rect(sx + 7, sy + 3, 2, 12, '#5a5248');                        // palo
  rect(sx + 5, sy, 6, 4, '#3f3a33'); rect(sx + 6, sy + 1, 4, 2, NIGHT > 0.4 ? '#ffdf8a' : '#c9c2b4'); // lanterna
  if (NIGHT > 0.4) { px(sx + 5, sy + 1, '#ffe9a0'); px(sx + 10, sy + 1, '#ffe9a0'); }
  rect(sx + 5, sy + 14, 6, 1, '#3f3a33');
}
/* affioramento d'ossa: cranio semisepolto + costole; scintilla se ha ancora scavi */
function drawSite(sx, sy, remaining, time) {
  shadow(sx + 8, sy + 14, 7);
  rect(sx + 2, sy + 9, 12, 5, '#c9a06a'); rect(sx + 3, sy + 8, 10, 2, '#d8b581'); // montarolo di terra
  const boneC = remaining > 0 ? '#ece5d2' : '#b8b0a2', boneD = remaining > 0 ? '#cbbfa4' : '#9a927f';
  for (let i = 0; i < 3; i++) { // costole ad arco
    const bx = sx + 4 + i * 3;
    px(bx, sy + 4 + i, boneC); px(bx + 1, sy + 3 + i, boneC); px(bx + 2, sy + 4 + i, boneD); px(bx, sy + 6 + i, boneD);
  }
  rect(sx + 10, sy + 7, 4, 3, boneC); px(sx + 11, sy + 8, '#3a3128'); px(sx + 13, sy + 8, '#3a3128'); // cranio
  if (remaining > 0) { // scintilla pulsante
    const a = (Math.sin(time / 300 + sx) + 1) / 2;
    if (a > 0.4) { px(sx + 2, sy + 2, '#fff6c8'); px(sx + 1, sy + 3, '#f6d95c'); px(sx + 3, sy + 3, '#f6d95c'); px(sx + 2, sy + 4, '#fff6c8'); }
  }
}
function drawTownDeco(d, sx, sy, time) {
  if (d.type === 'fountain') drawFountain(sx, sy, time);
  else if (d.type === 'bench') drawBench(sx, sy);
  else if (d.type === 'lamp') drawLamp(sx, sy);
  else drawBushDeco(sx, sy);
}
function drawFence(sx, sy) {
  rect(sx, sy + 7, TS, 2, '#a97a4c'); rect(sx, sy + 11, TS, 2, '#8a5f38');
  rect(sx + 2, sy + 3, 2, 11, '#8a5f38'); px(sx + 2, sy + 3, '#c79a66'); px(sx + 3, sy + 3, '#c79a66');
  rect(sx + 11, sy + 3, 2, 11, '#8a5f38'); px(sx + 11, sy + 3, '#c79a66'); px(sx + 12, sy + 3, '#c79a66');
}
/* chimera del parco: forma guidata dai parametri delle specie (taglia, becco/corni, ali, coda, serpente) */
function drawCreature(a, sx, sy) {
  const skSp = spById[a.c.skull], toSp = spById[a.c.torso];
  const pk = skSp ? partParams(skSp) : { skull: 0, horns: 1 };
  const pt = toSp ? partParams(toSp) : { size: 1, limb: 0, tail: 0, posture: 0 };
  const body = spColor[a.c.torso] || '#c8b078', head = spColor[a.c.skull] || '#c8b078';
  const fr = Math.floor(a.anim * 6) % 2, d = a.dir < 0 ? -1 : 1;
  const bw = 7 + pt.size * 2;                                   // larghezza corpo per taglia
  const bx = sx + 8 - Math.floor(bw / 2);
  shadow(sx + 8, sy + 13, 4 + pt.size);
  if (pt.posture === 2) {                                       // serpentino: corpo basso e ondulato, senza zampe
    for (let i = 0; i < bw + 2; i++) rect(bx + i - 1, sy + 8 + ((i + fr) % 2), 1, 3, body);
  } else {
    rect(bx, sy + 5, bw, 5, body); rect(bx + 1, sy + 4, bw - 2, 1, body);   // corpo
    const l = fr ? 1 : 0;                                                    // zampe
    rect(bx + 1 + l, sy + 10, 2, 3, body); rect(bx + bw - 3 - l, sy + 10, 2, 3, body);
    if (pt.posture === 1) rect(bx + (d < 0 ? bw - 2 : 0), sy + 2, 2, 3, body); // bipede: busto rialzato
  }
  if (pt.limb === 2) { rect(sx + 5, sy + 2 - fr, 3, 2, head); rect(sx + 9, sy + 2 - fr, 3, 2, head); } // ali che sbattono
  const tl = 2 + pt.tail * 2;                                   // coda per lunghezza
  for (let i = 0; i < tl; i++) px(d < 0 ? bx + bw + i : bx - 1 - i, sy + 6 + (i % 2), i === tl - 1 ? head : body);
  const hx = d < 0 ? sx + 1 : sx + 9;                           // testa (davanti)
  const hy = pt.posture === 1 ? sy - 1 : sy + 1;
  rect(hx, hy, 5, 5, head); rect(hx + 1, hy - 1, 3, 1, head);
  if (pk.skull === 2) rect(d < 0 ? hx - 2 : hx + 5, hy + 2, 2, 1, '#e8c34a');       // becco
  else if (pk.skull === 1) rect(d < 0 ? hx - 2 : hx + 5, hy + 3, 2, 2, head);       // muso lungo
  else if (pk.skull === 3) px(hx + 2, hy - 2, head);                                 // cupola
  const hn = pk.horns === 2 ? [1, 3] : [2];                     // corni
  for (const o of hn) px(hx + o, hy - 2, '#e8e2d0');
  px(hx + (d < 0 ? 1 : 3), hy + 2, '#33291f');                  // occhio
}

/* ---------- eroe ---------- */
function drawPlayer() {
  const sx = snap(P.x - cam.x), sy = snap(P.y - cam.y); shadow(sx, sy + 16, 7);
  if (P.digging) { drawDigging(sx, sy); return; }
  const fr = (P.moving ? (Math.floor(P.anim * 7) % 2) : 0); const bob = (P.moving && fr === 1) ? -1 : 0;
  drawHero(null, sx - 8, sy + bob, P.dir, fr);
}
/* animazione di scavo: piccone alzato/colpo + terra che schizza dai piedi */
function drawDigging(sx, sy) {
  const ph = P.digging.t / P.digging.dur;
  const struck = Math.floor(ph * 4) % 2 === 1;              // due colpi per scavata
  const d = P.dir === 'left' ? -1 : 1;
  drawHero(null, sx - 8, sy + (struck ? 1 : 0), P.dir === 'up' ? 'down' : P.dir, 0);
  if (!struck) { // piccone alzato dietro la testa
    rect(sx + d * 5, sy - 4, 2, 7, '#8a5f38');
    rect(sx + d * 3, sy - 6, 6, 3, '#9a9285'); px(sx + d * 3, sy - 6, '#b8b0a2');
  } else {       // colpo in diagonale verso terra
    for (let i = 0; i < 5; i++) px(sx + d * (2 + i), sy + 3 + i, '#8a5f38');
    rect(sx + d * 7 - 1, sy + 8, 4, 2, '#9a9285');
  }
  if (struck) {  // schizzi di terra ad arco, sulla casella VERSO CUI si guarda
    const fx = P.dir === 'left' ? -14 : P.dir === 'right' ? 14 : 0;
    const fy = P.dir === 'up' ? -12 : P.dir === 'down' ? 12 : 0;
    const t2 = (ph * 4) % 1;
    const OX = [-6, -3, 1, 4, 7, -1], H = [4, 6, 5, 6, 4, 7];
    const CC = ['#8a6a42', '#c9a06a', '#6d4f30', '#b98d59', '#8a6a42', '#c9a06a'];
    for (let i = 0; i < 6; i++) {
      px(Math.round(sx + fx + OX[i] * t2), Math.round(sy + 13 + fy - Math.sin(Math.PI * t2) * H[i]), CC[i]);
    }
  }
}

/* ---------- freccia bussola a bordo schermo ---------- */
function arrowPx(x, y, dx, dy) {
  for (let i = 0; i < 4; i++) {
    const bx = x - dx * i, by = y - dy * i;
    for (let j = -i; j <= i; j++) ctx.fillRect(bx - dy * j, by + dx * j, 1, 1);
  }
}
function drawCompassIndicator(time) {
  const t = compass.town; if (!t || playerInTown(t)) return;
  const W = view.W, H = view.H;
  const tx = t.C.x * TS + TS / 2 - cam.x, ty = t.C.y * TS + TS / 2 - cam.y;
  const L = 10, R = W - 10, T = 16, B = H - 12; // inset: HUD in alto
  if (tx >= L && tx <= R && ty >= T && ty <= B) return; // città già in vista
  const ax = Math.max(L, Math.min(R, tx)), ay = Math.max(T, Math.min(B, ty));
  const o = octant(tx - W / 2, ty - H / 2);
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const dx = DIRS[o][0], dy = DIRS[o][1];
  const pulse = Math.round(Math.sin(time / 280) + 1); // 0..2 lungo la direzione
  const cx0 = ax + dx * pulse, cy0 = ay + dy * pulse;
  ctx.fillStyle = 'rgba(20,15,8,.45)'; arrowPx(cx0 + 1, cy0 + 1, dx, dy);
  ctx.fillStyle = '#f6d95c'; arrowPx(cx0, cy0, dx, dy);
}

/* ---------- interni delle case ---------- */

/* NEGOZIO: scaffali di merci, casse, sacchi, botti, bilancia che oscilla, lanterna */
function drawStoreRoom(rw, rh, time) {
  /* scaffale merci sulla parete + cartellino prezzi */
  const shx = rw / 2 - 30;
  rect(shx, 5, 60, 18, '#6e5138'); rect(shx + 2, 7, 56, 5, '#8a6a4a'); rect(shx + 2, 15, 56, 5, '#8a6a4a');
  const goods = ['#e8c34a', '#c65a54', '#5a86c8', '#5fa04e', '#8d7ba0', '#e08aa8'];
  goods.forEach((c, i) => { rect(shx + 4 + i * 9, 8, 6, 4, c); rect(shx + 6 + ((i * 5) % 40), 16, 5, 4, goods[(i + 3) % 6]); });
  rect(shx + 50, 3, 8, 6, '#f6efdd'); px(shx + 52, 5, '#c65a54'); px(shx + 55, 5, '#c65a54'); // cartellino
  /* salami e erbe appesi al soffitto (dondolano) */
  const sw2 = Math.round(Math.sin(time / 700));
  for (const [hx2, c] of [[30, '#8a3f3a'], [42, '#5fa04e'], [126, '#8a3f3a']]) {
    rect(hx2, 2, 1, 6, '#5c4229');
    rect(hx2 - 1 + sw2, 8, 3, 8, c); px(hx2 + sw2, 16, c);
  }
  /* bilancia che oscilla + monete + registro sul bancone */
  const bx = rw / 2 + 26, tilt = Math.floor(time / 900) % 2 ? 1 : -1;
  rect(bx, 30, 2, 8, '#5a5248'); rect(bx - 6, 30, 14, 2, '#8f887a');
  rect(bx - 7, 32 + tilt, 5, 2, '#c9a06a'); rect(bx + 4, 32 - tilt, 5, 2, '#c9a06a');
  rect(rw / 2 - 30, 32, 6, 3, '#e8c34a'); rect(rw / 2 - 28, 30, 4, 2, '#e8c34a');     // pila di monete
  rect(rw / 2 - 18, 31, 10, 5, '#f6efdd'); rect(rw / 2 - 13, 31, 1, 5, '#8a5f38');    // registro aperto
  /* lanterna appesa (fiammella) */
  const lf = Math.floor(time / 300) % 2;
  rect(14, 4, 2, 6, '#5c4229'); rect(11, 10, 8, 9, '#5a5248'); rect(13, 12, 4, 5, lf ? '#f2c53d' : '#e8862e');
  /* casse, sacco di grano e GATTO che dorme (coda che si muove) */
  rect(14, 46, 16, 16, '#a97a4c'); rect(14, 46, 16, 3, '#c49a63'); rect(20, 52, 4, 4, '#6e5138');
  rect(30, 50, 14, 14, '#8a5f38'); rect(32, 48, 10, 4, '#8a5f38');
  rect(16, 62, 12, 8, '#d4b13c'); rect(18, 60, 8, 4, '#c9a06a'); px(21, 60, '#8a5f38');
  const cat = Math.floor(time / 800) % 2;
  rect(31, 44, 10, 5, '#c9a06a'); rect(29, 42, 5, 4, '#c9a06a'); px(29, 41, '#c9a06a'); px(32, 41, '#c9a06a');
  px(30, 43, '#201a14'); rect(40, 45 + cat, 4, 1, '#c9a06a');                          // coda
  /* botti + mele */
  for (const ox of [116, 134]) {
    rect(ox, 48, 14, 18, '#8a5f38'); rect(ox, 52, 14, 2, '#5c4229'); rect(ox, 60, 14, 2, '#5c4229');
    rect(ox + 4, 46, 6, 2, '#a97a4c');
  }
  rect(118, 44, 10, 4, '#c65a54'); px(120, 42, '#5fa04e');
  /* paglia sparsa sul pavimento */
  for (let i = 0; i < 6; i++) px(56 + (i * 17) % 50, 78 + (i * 11) % 22, '#d4b13c');
}

/* MUSEO — HALL: 6 porte tematiche (una per bioma), banco accoglienza, tappeto rosso */
const WING_COL = ['#d4b13c', '#d2b078', '#6f7f62', '#c06a48', '#5f7a52', '#8fd0e6'];
function drawMuseumHall(rw, rh, time) {
  /* fregio in alto */
  rect(0, 0, rw, 4, '#8d7ba0'); for (let i = 0; i < rw; i += 8) px(i + 3, 2, '#e8e2d0');
  /* 6 porte ad arco colorate per bioma */
  HALL_DOORS.forEach((dx2, i) => {
    rect(dx2 - 8, 6, 16, 20, '#3a3a44');
    rect(dx2 - 8, 6, 16, 3, WING_COL[i]); rect(dx2 - 8, 6, 2, 20, WING_COL[i]); rect(dx2 + 6, 6, 2, 20, WING_COL[i]);
    rect(dx2 - 3, 10, 6, 5, WING_COL[i]);                             // stemma del bioma
    px(dx2 - 1, 22, '#e8e2d0'); px(dx2 + 1, 22, '#e8e2d0');           // gradino
  });
  /* tappeto rosso dalla porta d'ingresso al banco */
  rect(rw / 2 - 10, 82, 20, rh - 86, '#8a3f3a'); rect(rw / 2 - 8, 82, 16, rh - 86, '#c65a54');
  /* banco accoglienza al centro */
  rect(70, 66, 20, 12, '#8a5f38'); rect(70, 66, 20, 3, '#a97a4c');
  rect(72, 62, 8, 5, '#f6efdd'); rect(84, 63, 5, 4, '#e8c34a');       // registro e campanella
  /* colonne laterali */
  for (const cx2 of [10, rw - 14]) { rect(cx2, 30, 4, rh - 40, '#cbbfa4'); rect(cx2 - 1, 28, 6, 3, '#e8e2d0'); rect(cx2 - 1, rh - 12, 6, 3, '#e8e2d0'); }
}
/* MUSEO — ALA di un bioma: 10 teche, pezzi esposti slot per slot, oro se completa */
function drawMuseumWing(rw, rh, time, zi) {
  const col = WING_COL[zi] || '#8d7ba0';
  /* fascia del bioma + insegna */
  rect(0, 0, rw, 4, col);
  rect(rw / 2 - 20, 6, 40, 12, '#3a3a44'); rect(rw / 2 - 20, 6, 40, 2, col);
  for (let i = 0; i < 5; i++) px(rw / 2 - 12 + i * 6, 11, col);
  const pool = zonePools[ZONES[zi].id];
  const cases = caseRects();
  cases.forEach((f, i) => {
    const sp = pool[i]; if (!sp) return;
    const parts = S.museum[sp.id] || [];
    const full = parts.length === 5;
    shadow((f.x0 + f.x1) / 2, f.y1 + 3, 10);
    rect(f.x0, f.y0 + 8, f.x1 - f.x0, f.y1 - f.y0 - 8, '#9a9285');          // basamento
    rect(f.x0, f.y0 + 8, f.x1 - f.x0, 2, '#aaa294');
    rect(f.x0 + 1, f.y0 - 4, f.x1 - f.x0 - 2, 12, full ? '#f6ecc8' : '#dce9f0'); // vetrina
    rect(f.x0 + 1, f.y0 - 4, f.x1 - f.x0 - 2, 1, '#f6f2e4');
    /* 5 slot pezzo per pezzo: cranio·torace·zampa·coda·corno */
    for (let k = 0; k < 5; k++) {
      const on = parts.includes(['cranio', 'torace', 'zampa', 'coda', 'corno'][k]);
      rect(f.x0 + 2 + k * 3, f.y0, 2, 4, on ? '#ece5d2' : '#75695c');
      if (on) px(f.x0 + 2 + k * 3, f.y0 + 1, '#cbbfa4');
    }
    /* targhetta rarità + stella se completa */
    const rc = { comune: '#b8b0a2', raro: '#4e8d7c', eccezionale: '#d8973c', leggendario: '#8d6ac8' }[sp.r];
    rect(f.x0 + 6, f.y1 - 3, f.x1 - f.x0 - 12, 2, rc);
    if (full) { const tw2 = Math.floor(time / 400) % 2; px(f.x0 + (tw2 ? 4 : 18), f.y0 - 6, '#f2c53d'); }
  });
}
/* MUSEO: pavimento a scacchi, quadri, teche con fossili e riflesso animato, corda rossa */
function drawMuseumRoom(rw, rh, time) {
  /* quadri incorniciati con scheletri */
  for (const [qx, col] of [[rw / 2 - 34, '#8a5f38'], [rw / 2 + 10, '#8a5f38']]) {
    rect(qx, 5, 24, 15, col); rect(qx + 2, 7, 20, 11, '#3a3a44');
    rect(qx + 5, 11, 5, 4, '#ece5d2'); for (let i = 0; i < 4; i++) px(qx + 11 + i * 2, 12 + (i % 2), '#ece5d2');
  }
  /* stendardo */
  rect(rw / 2 - 3, 4, 6, 12, '#8d7ba0'); px(rw / 2 - 1, 16, '#8d7ba0'); px(rw / 2 + 1, 16, '#8d7ba0');
  /* teche di vetro con fossili */
  for (const [tx2, bone] of [[20, 'skull'], [108, 'femur']]) {
    rect(tx2, 58, 34, 12, '#9a9285'); rect(tx2, 58, 34, 3, '#aaa294');          // basamento
    rect(tx2 + 2, 42, 30, 17, '#bfe9f420'.slice(0, 7)); // vetro
    rect(tx2 + 2, 42, 30, 1, '#cfe8f2'); rect(tx2 + 2, 42, 1, 17, '#cfe8f2'); rect(tx2 + 31, 42, 1, 17, '#cfe8f2');
    if (bone === 'skull') { rect(tx2 + 12, 48, 9, 7, '#ece5d2'); px(tx2 + 14, 50, '#201a14'); px(tx2 + 18, 50, '#201a14'); }
    else { rect(tx2 + 8, 51, 18, 3, '#ece5d2'); rect(tx2 + 6, 49, 4, 3, '#ece5d2'); rect(tx2 + 24, 49, 4, 3, '#ece5d2'); rect(tx2 + 6, 53, 4, 3, '#ece5d2'); rect(tx2 + 24, 53, 4, 3, '#ece5d2'); }
    const gl = (Math.floor(time / 500) + tx2) % 4; px(tx2 + 5 + gl * 6, 44, '#f6f2e4'); // riflesso che scorre
  }
  /* paletti con corda rossa davanti alle teche */
  for (const px2 of [60, 100]) { rect(px2, 60, 3, 10, '#c9a06a'); px(px2 + 1, 58, '#e8c34a'); }
  for (let i = 0; i < 9; i++) px(64 + i * 4, 62 + Math.round(Math.sin(i / 2) * 2), '#c65a54');
}
/* LOCANDA: camino ACCESO, tavoli con boccali fumanti, botti, appendiabiti */
function drawInnRoom(rw, rh, time) {
  /* camino con fuoco, PENTOLA di stufato che bolle e fumo che sale */
  const cx = rw / 2 - 14;
  rect(cx, 3, 28, 20, '#75695c'); rect(cx + 3, 6, 22, 14, '#3a3a44'); rect(cx - 2, 21, 32, 3, '#8f887a');
  const ff = Math.floor(time / 150) % 3;
  rect(cx + 9, 12 + ff, 10, 7 - ff, '#e8862e'); rect(cx + 11, 14 + (ff % 2), 6, 5, '#f2c53d');
  px(cx + 13, 9 + ff, '#f2c53d'); px(cx + 15, 8 + ((ff + 1) % 3), '#e8862e');
  rect(cx + 6, 19, 16, 2, '#5c4229');
  rect(cx + 8, 8, 12, 5, '#3f3a33'); rect(cx + 10, 6, 8, 2, '#5a5248');               // pentola appesa
  const stw = Math.floor(time / 350) % 2; px(cx + 11 + stw * 4, 7, '#d4b13c');        // stufato che sobbolle
  const sm = Math.floor(time / 500) % 3;
  px(cx + 13, 2 - sm < 0 ? 0 : 2 - sm, '#8f887a'); px(cx + 16, 1, sm === 1 ? '#b8b0a2' : '#8f887a'); // fumo
  /* bagliore caldo pulsante sul pavimento davanti al camino */
  const gl = 0.10 + 0.04 * (Math.floor(time / 400) % 2);
  ctx.fillStyle = 'rgba(240,160,60,' + gl + ')'; ctx.fillRect(cx - 6, 24, 40, 26);
  /* trofeo alle pareti + mensola boccali + appendiabiti */
  rect(16, 6, 10, 8, '#8a5f38'); rect(18, 8, 6, 4, '#ece5d2'); px(19, 9, '#201a14'); px(22, 9, '#201a14'); // cranio trofeo
  rect(rw - 44, 5, 26, 2, '#5c4229');
  for (let i = 0; i < 4; i++) rect(rw - 42 + i * 6, 7, 4, 5, i % 2 ? '#c9a06a' : '#8f887a'); // boccali
  rect(rw - 26, 12, 14, 12, '#8a5f38'); rect(rw - 26, 16, 14, 2, '#5c4229'); px(rw - 20, 26, '#e8c34a'); // botte
  /* tappeto al centro */
  rect(rw / 2 - 18, 74, 36, 18, '#8a3f3a'); rect(rw / 2 - 16, 76, 32, 14, '#c65a54'); rect(rw / 2 - 12, 80, 24, 6, '#8a3f3a');
  /* CANE che dorme accanto al camino (respira) */
  const brt = Math.floor(time / 700) % 2;
  rect(94, 40 - brt, 12, 5 + brt, '#8a5f38'); rect(90, 42, 6, 4, '#8a5f38'); px(90, 41, '#8a5f38');
  px(91, 43, '#201a14'); rect(105, 43, 4, 2, '#6e4a2a');                               // coda
  /* tavoli con sgabelli, boccali fumanti e CANDELA */
  for (const ox of [16, 114]) {
    rect(ox + 4, 50, 26, 14, '#a97a4c'); rect(ox + 4, 50, 26, 3, '#c49a63');
    rect(ox + 8, 64, 4, 4, '#6e5138'); rect(ox + 22, 64, 4, 4, '#6e5138');
    rect(ox, 54, 5, 6, '#8a5f38'); rect(ox + 29, 54, 5, 6, '#8a5f38');
    rect(ox + 12, 46, 5, 6, '#c9a06a'); px(ox + 17, 47, '#c9a06a');
    const st = Math.floor(time / 400) % 3;
    px(ox + 14, 42 - st, '#f6efdd');
    rect(ox + 22, 46, 2, 4, '#f6efdd'); px(ox + 22, 44, Math.floor(time / 250) % 2 ? '#f2c53d' : '#e8862e'); // candela
  }
}
/* BARBIERE: pavimento a scacchi, specchiera, poltrona, palo con strisce che SCORRONO */
function drawBarberRoom(rw, rh, time) {
  /* specchiera: riflessi + BAGLIORE che scorre sul vetro */
  const mx = rw / 2 - 22;
  rect(mx, 4, 44, 18, '#8a5f38'); rect(mx + 3, 6, 38, 13, '#bfe9f4');
  rect(mx + 5, 8, 10, 9, '#cfe8f2'); rect(mx + 28, 8, 8, 9, '#cfe8f2');
  const sh2 = Math.floor(time / 260) % 12;
  rect(mx + 4 + sh2 * 3, 7, 2, 11, '#e8f6fb');                                        // shine
  rect(mx - 2, 22, 48, 3, '#a97a4c');
  ['#5a86c8', '#e08aa8', '#5fa04e', '#e8c34a'].forEach((c, i) => rect(mx + 4 + i * 10, 17, 4, 5, c));
  rect(mx + 40, 18, 6, 3, '#f6efdd'); rect(mx + 40, 15, 6, 3, '#f6efdd');             // asciugamani
  /* OROLOGIO a pendolo (oscilla) */
  const pd = Math.floor(time / 600) % 2 ? 2 : -2;
  rect(14, 4, 12, 14, '#8a5f38'); rect(16, 6, 8, 7, '#f6efdd'); px(19, 8, '#201a14'); px(19 + Math.sign(pd), 9, '#201a14');
  rect(19, 18, 1, 6, '#5a5248'); px(19 + pd, 24, '#e8c34a');                          // pendolo
  /* palo del barbiere: strisce che scorrono */
  const off = Math.floor(time / 180) % 6;
  rect(rw - 20, 4, 10, 26, '#f3ecda'); rect(rw - 20, 2, 10, 2, '#5a5248'); rect(rw - 20, 30, 10, 2, '#5a5248');
  for (let yy = -6 + off; yy < 26; yy += 6) { if (yy >= 0 && yy < 24) rect(rw - 20, 4 + yy, 10, 3, yy % 12 < 6 ? '#c65a54' : '#5a86c8'); }
  /* poltrona + CIUFFI DI CAPELLI tagliati a terra */
  rect(18, 46, 22, 6, '#c65a54'); rect(16, 52, 26, 10, '#c65a54'); rect(16, 52, 26, 2, '#e08a84');
  rect(20, 62, 4, 6, '#5a5248'); rect(34, 62, 4, 6, '#5a5248'); rect(26, 66, 6, 3, '#8f887a');
  const hairs = [['#33291f', 46, 74], ['#caa25a', 52, 78], ['#b5622e', 44, 82], ['#6e4a2a', 56, 72], ['#33291f', 50, 86]];
  hairs.forEach(([c, hx2, hy2]) => { px(hx2, hy2, c); px(hx2 + 1, hy2, c); });
  /* scopa appoggiata + panca d'attesa + pianta */
  rect(60, 40, 2, 22, '#c9a06a'); rect(57, 60, 8, 5, '#d4b13c');
  rect(116, 52, 30, 8, '#a97a4c'); rect(118, 60, 4, 6, '#6e5138'); rect(140, 60, 4, 6, '#6e5138');
  rect(146, 42, 8, 8, '#4a9a55'); rect(148, 50, 4, 6, '#c65a54');
  px(rw / 2 + 24, 32, '#8f887a'); px(rw / 2 + 25, 33, '#8f887a'); px(rw / 2 + 26, 32, '#8f887a');
}
/* SARTORIA: rotoli di stoffa, manichino vestito, macchina da cucire con ago ANIMATO */
function drawTailorRoom(rw, rh, time) {
  /* rastrelliera di stoffe + bozzetti incorniciati */
  const rx = rw / 2 - 28;
  rect(rx, 4, 56, 3, '#5c4229');
  ['#c65a54', '#5a86c8', '#5fa04e', '#e08aa8', '#e8c34a', '#8d7ba0'].forEach((c, i) => {
    rect(rx + 3 + i * 9, 7, 7, 14, c); rect(rx + 3 + i * 9, 7, 7, 2, '#f6efdd');
  });
  rect(12, 6, 12, 14, '#8a5f38'); rect(14, 8, 8, 10, '#f6efdd'); rect(16, 10, 4, 6, '#e08aa8'); // bozzetto abito
  rect(rw - 24, 6, 12, 14, '#8a5f38'); rect(rw - 22, 8, 8, 10, '#f6efdd'); rect(rw - 20, 10, 4, 3, '#5a86c8'); rect(rw - 21, 14, 6, 3, '#5a86c8');
  /* mensola rocchetti + METRO che dondola dal bancone */
  rect(30, 24, 30, 2, '#5c4229');
  ['#c65a54', '#5fa04e', '#f6efdd'].forEach((c, i) => { rect(32 + i * 9, 18, 5, 6, c); px(34 + i * 9, 16, '#5a5248'); });
  const tp = Math.round(Math.sin(time / 650) * 2);
  rect(rw / 2 + 30 + tp, 38, 2, 10, '#f2c53d'); px(rw / 2 + 30 + tp, 48, '#201a14');   // metro a nastro
  /* manichino vestito + cesto di gomitoli */
  rect(24, 44, 8, 6, '#f3cfa0'); rect(20, 50, 16, 12, '#e08aa8'); rect(22, 50, 12, 3, '#c06a88');
  rect(27, 62, 2, 5, '#5a5248'); rect(24, 66, 8, 2, '#5a5248');
  rect(42, 58, 12, 8, '#c9a06a'); rect(44, 56, 8, 3, '#a97a4c');
  px(45, 55, '#c65a54'); px(48, 54, '#5a86c8'); px(51, 55, '#5fa04e');                 // gomitoli
  /* tavolo da cucito: macchina con RUOTA che gira e ago, spilli, ritagli */
  rect(112, 48, 36, 18, '#8a5f38'); rect(112, 48, 36, 3, '#a97a4c'); rect(114, 66, 4, 4, '#5c4229'); rect(142, 66, 4, 4, '#5c4229');
  rect(118, 38, 16, 10, '#3f3a33'); rect(120, 34, 4, 4, '#3f3a33');
  const wh = Math.floor(time / 150) % 4;                                               // ruota a 4 fasi
  rect(136, 40, 6, 6, '#5a5248');
  if (wh === 0) rect(138, 40, 2, 6, '#8f887a'); else if (wh === 1) px(140, 41, '#8f887a');
  else if (wh === 2) rect(136, 42, 6, 2, '#8f887a'); else px(137, 41, '#8f887a');
  const ndl = Math.floor(time / 200) % 2;
  rect(133, 40 + ndl, 1, 5 - ndl, '#cfc9bc');
  rect(126, 44, 6, 2, '#e08aa8');
  rect(120, 50, 4, 3, '#c65a54'); px(121, 49, '#8f887a'); px(123, 49, '#8f887a');      // puntaspilli
  px(140, 44, '#8f887a'); px(141, 45, '#8f887a');
  /* ritagli di stoffa a terra */
  for (let i = 0; i < 5; i++) px(60 + (i * 19) % 44, 80 + (i * 13) % 20, ['#c65a54', '#5a86c8', '#e08aa8', '#5fa04e', '#e8c34a'][i]);
}
/* LABORATORIO: lavagna con scheletro, scaffale pozioni, alambicco con fiamma e bolle, banco studio */
function drawLabRoom(rw, rh, time) {
  /* lavagna al centro della parete */
  const bx = rw / 2 - 26;
  rect(bx - 2, 3, 56, 2, '#5c4229'); rect(bx - 2, 21, 56, 2, '#5c4229');
  rect(bx, 5, 52, 16, '#2e3d33');
  rect(bx + 5, 8, 7, 6, '#e8e2d0'); px(bx + 7, 10, '#2e3d33'); px(bx + 10, 10, '#2e3d33');
  for (let i = 0; i < 7; i++) px(bx + 14 + i * 3, 11 + (i % 2), '#e8e2d0');
  for (let i = 0; i < 3; i++) { px(bx + 16 + i * 6, 13, '#cbbfa4'); px(bx + 16 + i * 6, 14, '#cbbfa4'); }
  rect(bx + 38, 7, 9, 6, '#cbbfa4'); px(bx + 40, 9, '#2e3d33'); px(bx + 43, 9, '#2e3d33');
  rect(bx + 4, 18, 8, 2, '#f6efdd');
  /* barattoli con ESEMPLARI sospesi (bollicine) sotto la finestra sinistra */
  rect(12, 24, 30, 2, '#5c4229');
  for (let i = 0; i < 3; i++) {
    const jx = 14 + i * 10;
    rect(jx, 14, 7, 10, '#bfe9f4'); rect(jx, 13, 7, 1, '#5a5248');
    rect(jx + 2, 17, 3, 4, ['#5fa04e', '#c65a54', '#8d7ba0'][i]);                       // esemplare
    const jb = (Math.floor(time / 300) + i) % 4; px(jx + 1 + (i % 2) * 4, 22 - jb, '#e8f6fb'); // bollicina
  }
  /* scaffale pozioni sotto la finestra destra */
  const shx = rw - 3.4 * TS;
  rect(shx - 2, 24, 40, 2, '#5c4229');
  const bots = [['#5a86c8', 7], ['#4e8d7c', 9], ['#c65a54', 6], ['#8d7ba0', 10], ['#e8c34a', 7]];
  bots.forEach(([c, hgt], i) => {
    const x = shx + i * 8;
    rect(x, 24 - hgt, 5, hgt, c); rect(x + 1, 24 - hgt - 2, 3, 2, '#cfe8f2'); px(x + 1, 26 - hgt, '#f6efdd');
  });
  /* postazione ALAMBICCO: bruciatore, storta con bolle, tubo con GOCCIA che cade, beuta */
  rect(12, 44, 36, 22, '#8a5f38'); rect(12, 44, 36, 3, '#a97a4c'); rect(14, 66, 4, 4, '#5c4229'); rect(42, 66, 4, 4, '#5c4229');
  const fl = Math.floor(time / 160) % 2;
  rect(19, 40, 8, 3, '#75695c');
  px(21 + fl, 37, '#f2c53d'); px(22, 36 - fl, '#e8862e'); px(23 - fl, 37, '#f2c53d'); px(22, 38, '#e8862e');
  rect(17, 26, 12, 12, '#bfe9f4'); rect(18, 30, 10, 7, '#5fa04e');
  rect(20, 22, 4, 5, '#bfe9f4'); rect(19, 20, 6, 2, '#8fd0e6');
  const bb = Math.floor(time / 260) % 3;
  px(21, 35 - bb, '#a4dd8c'); px(24, 33 - ((bb + 1) % 3), '#a4dd8c');
  for (let i = 0; i < 5; i++) px(29 + i * 2, 24 + i, '#8fd0e6');
  const drop = Math.floor(time / 340) % 4;
  px(37, 29 + drop, '#8fd0e6');                                                         // goccia che cade
  rect(38, 30, 7, 8, '#bfe9f4'); rect(39, 34, 5, 3, '#8d7ba0');
  px(40, 28 - fl, '#cfe8f2');
  /* banco da studio: microscopio, teschio, libro, CANDELA accesa, fogli a terra */
  rect(112, 44, 36, 22, '#8a5f38'); rect(112, 44, 36, 3, '#a97a4c'); rect(114, 66, 4, 4, '#5c4229'); rect(142, 66, 4, 4, '#5c4229');
  rect(117, 34, 3, 10, '#5a5248'); rect(119, 32, 5, 3, '#3f3a33'); rect(116, 42, 9, 2, '#3f3a33');
  px(121, 36, '#8fd0e6');
  rect(129, 36, 8, 7, '#ece5d2'); px(131, 38, '#201a14'); px(134, 38, '#201a14'); rect(130, 41, 6, 1, '#cbbfa4');
  rect(139, 38, 9, 6, '#f6efdd'); rect(143, 38, 1, 6, '#8a5f38'); px(140, 40, '#8f887a'); px(145, 40, '#8f887a');
  rect(126, 32, 2, 5, '#f6efdd'); px(126, 30, Math.floor(time / 250) % 2 ? '#f2c53d' : '#e8862e'); // candela
  rect(100, 78, 7, 5, '#f6efdd'); rect(104, 84, 7, 5, '#ece5d2'); px(102, 80, '#8f887a');           // fogli caduti
  /* TOPOLINO che sfreccia lungo la parete bassa ogni tanto */
  const rt = (time / 1000) % 14;
  if (rt < 2.2) {
    const rxp = 18 + (rt / 2.2) * 120;
    rect(rxp, 100, 5, 3, '#8f887a'); px(rxp + 5, 100, '#8f887a'); px(rxp - 2, 101, '#8f887a'); px(rxp + 4, 99, '#201a14');
  }
}
/* pattugliamento dietro il bancone: fermo → cammina a destra → fermo → attraversa → fermo → torna */
const NPC_SPAN = 22;
const NPC_SEGS = [[2.2, 0, 0], [1.5, 0, NPC_SPAN], [1.8, NPC_SPAN, NPC_SPAN], [3, NPC_SPAN, -NPC_SPAN], [1.8, -NPC_SPAN, -NPC_SPAN], [1.5, -NPC_SPAN, 0]];
const NPC_TOT = NPC_SEGS.reduce((a, s) => a + s[0], 0);
function npcPose(time) {
  let t = (time / 1000) % NPC_TOT;
  for (const [d, a, b] of NPC_SEGS) {
    if (t < d) {
      const walk = a !== b;
      return { ox: a + (b - a) * (t / d), mov: walk, dir: walk ? (b > a ? 'right' : 'left') : 'down' };
    }
    t -= d;
  }
  return { ox: 0, mov: false, dir: 'down' };
}
function drawNpc(x, y, type, time) {
  const saved = S.look;
  S.look = { hat: '#d06b43', shirt: '#57a58f', pants: '#c88a44', skin: '#f3cfa0', ...((NPCS[type] || {}).look || {}) };
  applyLook();
  const p = npcPose(time);
  const fr = p.mov ? Math.floor(time / 170) % 2 : 0;
  drawHero(null, Math.round(x - 8 + p.ox), y - 12, p.dir, fr);
  S.look = saved; applyLook();
}
function drawInteriorScene(time) {
  const W = view.W, H = view.H;
  ctx.setTransform(view.K, 0, 0, view.K, 0, 0);
  ctx.fillStyle = '#12100c'; ctx.fillRect(0, 0, W, H); // fuori: buio
  const rw = INT.w * TS, rh = INT.h * TS;
  const ox = Math.floor((W - rw) / 2), oy = Math.floor((H - rh) / 2);
  ctx.save(); ctx.translate(ox, oy);
  const type = INT.b ? INT.b.type : 'store';
  /* pavimento a tema: pietra al laboratorio, assi di legno altrove */
  for (let ty = 0; ty < INT.h; ty++) for (let tx = 0; tx < INT.w; tx++) {
    const sx = tx * TS, sy = ty * TS;
    if (type === 'lab') {
      rect(sx, sy, TS, TS, (tx + ty) % 2 ? '#8f887a' : '#9a9285');
      rect(sx, sy, TS, 1, '#7f776a'); rect(sx, sy, 1, TS, '#7f776a');
      if ((tx * 7 + ty * 5) % 9 === 0) px(sx + 9, sy + 10, '#75695c');
    } else if (type === 'museum') {
      rect(sx, sy, TS, TS, (tx + ty) % 2 ? '#ece5d2' : '#d9d0bb');
      rect(sx, sy, TS, 1, '#c4baa2'); rect(sx, sy, 1, TS, '#c4baa2');
    } else if (type === 'barber') {
      rect(sx, sy, TS, TS, (tx + ty) % 2 ? '#e8f2f5' : '#9fc4d0');
      rect(sx, sy, TS, 1, '#8fb0bd'); rect(sx, sy, 1, TS, '#8fb0bd');
    } else {
      rect(sx, sy, TS, TS, (tx + ty) % 2 ? '#b98d59' : '#c49a63');
      rect(sx, sy + 7, TS, 1, '#a37a4a'); rect(sx + ((ty % 2) * 8), sy, 1, TS, '#a37a4a');
    }
  }
  /* parete di fondo + laterali */
  rect(0, 0, rw, 2 * TS, '#8a6a4a'); rect(0, 2 * TS - 3, rw, 3, '#6e5138');
  rect(0, 0, 6, rh, '#6e5138'); rect(rw - 6, 0, 6, rh, '#6e5138');
  rect(0, rh - 4, rw, 4, '#6e5138');
  if (type !== 'museum') {
    /* finestre sulla parete */
    for (const wx of [1.5 * TS, rw - 2.5 * TS]) {
      rect(wx, 6, TS, 12, NIGHT > 0.4 ? '#2b3a55' : '#8fd0e6'); rect(wx, 6, TS, 2, '#5c4229'); rect(wx, 16, TS, 2, '#5c4229'); rect(wx + 7, 6, 2, 12, '#5c4229');
    }
    /* bancone davanti all'NPC */
    rect(TS, 2.2 * TS, rw - 2 * TS, 10, '#8a5f38'); rect(TS, 2.2 * TS, rw - 2 * TS, 3, '#a97a4c');
  }
  /* arredo per mestiere */
  if (type === 'lab') drawLabRoom(rw, rh, time);
  else if (type === 'store') drawStoreRoom(rw, rh, time);
  else if (type === 'museum') { if (INT.room === 'hall') drawMuseumHall(rw, rh, time); else drawMuseumWing(rw, rh, time, INT.room); }
  else if (type === 'inn') drawInnRoom(rw, rh, time);
  else if (type === 'barber') drawBarberRoom(rw, rh, time);
  else if (type === 'tailor') drawTailorRoom(rw, rh, time);
  /* varco della porta in basso */
  rect(rw / 2 - 10, rh - 6, 20, 6, '#3a2e20'); rect(rw / 2 - 8, rh - 4, 16, 4, '#c49a63');
  /* NPC dietro il bancone (museo: solo in hall, dietro il banco accoglienza) */
  if (type !== 'museum') drawNpc(rw / 2, 1.9 * TS, type, time);
  else if (INT.room === 'hall') drawNpc(rw / 2, 58, type, time);
  const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
  shadow(Math.round(INT.x), Math.round(INT.y) + 6, 6);
  drawHero(null, Math.round(INT.x) - 8, Math.round(INT.y) - 10, INT.dir, fr);
  ctx.restore();
}

/* ---------- frame ---------- */
export function render(time) {
  if (INT.active) { NIGHT = darknessAt(S.tod || 0); drawInteriorScene(time); return; }
  const W = view.W, H = view.H, VW = view.VW, VH = view.VH;
  NIGHT = darknessAt(S.tod || 0); SEA = seasonOf(S.day || 1);
  /* camera ancorata alla griglia dei pixel FISICI (passi da 1/K): scroll fluido, niente scatti */
  cam.x = Math.round((P.x - W / 2) * view.K) / view.K;
  cam.y = Math.round((P.y - H / 2) * view.K) / view.K;
  const tx0 = Math.floor(cam.x / TS) - 1, ty0 = Math.floor(cam.y / TS) - 1;
  const tx1 = tx0 + VW + 2, ty1 = ty0 + VH + 2;
  ctx.clearRect(0, 0, W, H);
  // passata terreno
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const sx = tx * TS - cam.x, sy = ty * TS - cam.y;
    const ti = townInfo(tx, ty);
    let t = baseTerrain(tx, ty);
    if (ti && (ti.floor || ti.fence || ti.deco)) t = ti.park ? PARK : FLOOR;
    groundTile(t, tx, ty, sx, sy, time, ti ? 0 : zoneIdxAt(tx, ty));
    // buche sulle caselle scavate (mai sul pavimento città: il layout può cambiare)
    if (dugSet.has(tx + ',' + ty) && !(ti && ti.floor)) drawHole(sx, sy);
  }
  // entità ordinate per y
  const ents = [];
  const lampGlows = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const sx = tx * TS - cam.x, sy = ty * TS - cam.y;
    const ti = townInfo(tx, ty);
    if (ti) {
      if (ti.fence) ents.push({ y: sy + 12, f: () => drawFence(sx, sy) });
      else if (ti.deco && ti.anchor) {
        const d = ti.deco;
        const ey = d.type === 'fountain' ? sy + 30 : sy + 13;
        ents.push({ y: ey, f: () => drawTownDeco(d, sx, sy, time) });
        if (d.type === 'lamp') lampGlows.push({ x: sx + 8, y: sy + 2 });
      }
      else if (ti.building && tx === ti.building.x0 && ty === ti.building.y0) { const b = ti.building; ents.push({ y: (b.y1 + 1) * TS - cam.y, f: () => drawBuilding(b, b.x0 * TS - cam.x, b.y0 * TS - cam.y) }); }
      continue;
    }
    const st = siteAt(tx, ty);
    if (st) { ents.push({ y: sy + 14, f: () => drawSite(sx, sy, siteRemaining(st), time) }); continue; }
    const d = decoAt(tx, ty);
    if (d === 'tree') ents.push({ y: sy + 15, f: () => drawTree(sx, sy, time, tx, ty) });
    else if (d === 'boulder') ents.push({ y: sy + 13, f: () => drawBoulder(sx, sy) });
    else if (d === 'flower') ents.push({ y: sy + 2, f: () => drawFlower(sx, sy, tx, ty) });
    else if (d === 'shell') ents.push({ y: sy + 2, f: () => drawShell(sx, sy) });
    else if (d === 'cactus') ents.push({ y: sy + 15, f: () => drawCactus(sx, sy) });
    else if (d === 'bonespire') ents.push({ y: sy + 14, f: () => drawBonespire(sx, sy) });
    else if (d === 'deadtree') ents.push({ y: sy + 15, f: () => drawDeadtree(sx, sy) });
    else if (d === 'mushroom') ents.push({ y: sy + 8, f: () => drawMushroom(sx, sy) });
    else if (d === 'stump') ents.push({ y: sy + 13, f: () => drawStump(sx, sy) });
    else if (d === 'redspire') ents.push({ y: sy + 15, f: () => drawRedspire(sx, sy) });
    else if (d === 'orecrystal') ents.push({ y: sy + 13, f: () => drawOrecrystal(sx, sy) });
    else if (d === 'reed') ents.push({ y: sy + 14, f: () => drawReed(sx, sy, time, tx, ty) });
    else if (d === 'icecrystal') ents.push({ y: sy + 13, f: () => drawIcecrystal(sx, sy) });
    else if (d === 'hay') ents.push({ y: sy + 13, f: () => drawHay(sx, sy) });
  }
  // chimere nei parchi in vista
  for (const t of visParks) {
    for (const a of parks.get(t.key) || []) {
      const ax = snap(a.x - cam.x), ay = snap(a.y - cam.y);
      if (ax < -20 || ax > W + 20 || ay < -20 || ay > H + 20) continue;
      ents.push({ y: ay, f: () => drawCreature(a, ax - 8, ay - 13) });
    }
  }
  ents.push({ y: P.y - cam.y + 16, f: drawPlayer });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.f());
  /* notte: fuori dalla luce quasi NERO; cono 8-bit attorno al player; le città restano illuminate */
  if (NIGHT > 0.02) {
    const pxc = P.x - cam.x, pyc = P.y - cam.y + 8;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const sx = tx * TS - cam.x, sy = ty * TS - cam.y;
      const d = Math.hypot(sx + 8 - pxc, sy + 8 - pyc) / TS;
      let base = d < 2.5 ? 0.15 : d < 4 ? 0.55 : d < 5.5 ? 0.85 : 0.96;
      /* città illuminata + ALONE graduale attorno (falloff su 5 tile, a scalini) */
      const tw = townForTile(tx, ty);
      if (tw) {
        const y1 = tw.pen ? tw.pen.y1 : tw.y1;
        const dxd = Math.max(tw.x0 - tx, 0, tx - tw.x1);
        const dyd = Math.max(tw.y0 - ty, 0, ty - y1);
        const dist = Math.max(dxd, dyd);
        const light = dist <= 0 ? 0.8 : dist < 5 ? 0.8 * (1 - dist / 5) : 0;
        base *= (1 - light);
      }
      ctx.fillStyle = 'rgba(8,9,24,' + (base * NIGHT).toFixed(2) + ')';
      ctx.fillRect(sx, sy, TS, TS);
    }
    /* alone caldo dei lampioni */
    for (const g of lampGlows) {
      ctx.fillStyle = 'rgba(255,215,130,' + (0.10 * NIGHT) + ')'; ctx.fillRect(g.x - 24, g.y - 20, 48, 44);
      ctx.fillStyle = 'rgba(255,215,130,' + (0.13 * NIGHT) + ')'; ctx.fillRect(g.x - 14, g.y - 12, 28, 28);
      ctx.fillStyle = 'rgba(255,225,150,' + (0.16 * NIGHT) + ')'; ctx.fillRect(g.x - 7, g.y - 6, 14, 16);
    }
  }
  drawCompassIndicator(time);
}
