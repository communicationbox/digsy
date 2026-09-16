/* BOTTEGHE — l'aspetto delle cinque stanze a mestiere (Negozio, Locanda, Barbiere, Sartoria,
   Laboratorio). Modulo PURO come houseArt.js: disegna solo col pennello che riceve.

   Le stanze erano rettangoli pieni con qualche dettaglio sopra: un bancone era un'asse
   marrone, una finestra un quadrato azzurro, la parete un'unica tinta. La casa del giocatore è
   stata ridisegnata come architettura vera ("ora mi piace molto") e il passo successivo è
   stato chiaro: "questo è il livello di dettaglio che vorrei in ogni negozio". Quindi qui:
     · lo stesso GUSCIO della casa (muri con spessore, cornice, carta da parati, zoccolo,
       battiscopa, ombre dove il pavimento incontra i muri, soglia e zerbino) con materiali
       propri per ogni mestiere — la pietra al laboratorio, le piastrelle dal barbiere, le assi
       del legno della zona altrove;
     · ogni mobile con contorno, lato in luce e lato in ombra, ombra di contatto;
     · gli ingombri restano IDENTICI (FURN in interior.js): cambia come appare, non dove si
       cammina, e le soglie tarate su bancone, NPC e uscita non si spostano. */
import { drawWindow, drawWindowLight, wallCap, drawCrown, drawBaseboard, floorShadow, drawDoormat, drawFrontDoorway } from './houseArt.js';

const TS = 32;
export const SHOP_WALL = 64;        // altezza della parete di fondo (come prima: il bancone sta a 2.2 caselle)
export const SHOP_TOP = 10;         // la cresta del muro sale sopra la stanza

/* ---------- primitive ---------- */
/* GAMBA di un mobile: non un rettangolo quasi nero ma legno vero — contorno della sua tinta,
   corpo, filo di luce a sinistra. I tavoli e le sedie delle botteghe avevano le gambe dipinte
   col nero pieno e in mezzo alla stanza si vedevano come due sbarre (segnalato con foto). */
export function gamba(g, x, y, w, h, c = '#5c3d22') {
  g.rect(x, y, w, h, g.shade8(c, 0.38));
  g.rect(x + 1, y, w - 2, h - 1, c);
  g.rect(x + 1, y, 1, h - 1, g.shade8(c, 1.28));
}
/* scatola in 3/4: contorno scuro, luce sopra e a sinistra, ombra sotto e a destra */
export function box(g, x, y, w, h, c) {
  if (w <= 0 || h <= 0) return;
  g.rect(x, y, w, h, g.shade8(c, 0.42));
  if (w <= 2 || h <= 2) return;
  g.rect(x + 1, y + 1, w - 2, h - 2, c);
  g.rect(x + 1, y + 1, w - 2, Math.min(2, h - 2), g.shade8(c, 1.22));
  g.rect(x + 1, y + 1, 1, h - 2, g.shade8(c, 1.1));
  if (h > 6) g.rect(x + 1, y + h - 3, w - 2, 2, g.shade8(c, 0.76));
  if (w > 4) g.rect(x + w - 2, y + 1, 1, h - 2, g.shade8(c, 0.82));
}
/* SCATOLA CON GLI ANGOLI SMUSSATI — il pennello base di ogni mobile.
   Prima ogni mobile era una pila di rettangoli: spigoli a novanta gradi dappertutto, e in una
   stanza dove anche il pavimento e i muri sono griglie il risultato è un disegno tecnico
   (segnalato: «i mobili tutti gli angoli a 90 gradi... NON VA BENE»). Qui gli angoli si
   mangiano di qualche pixel, c'è un contorno solo e la luce viene sempre da sopra-sinistra.
   Si disegna per RIGHE, non per pixel: un mobile costa una cinquantina di rettangoli. */
function boxr(g, x, y, w, h, fill, r = 3, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const line = o.line || g.shade8(fill, 0.45), light = o.light || g.shade8(fill, 1.16), dark = o.dark || g.shade8(fill, 0.82);
  const ins = dy => (dy >= r ? 0 : Math.max(0, Math.ceil(r - Math.sqrt(Math.max(0, r * r + r - (r - dy) * (r - dy))))));
  for (let yy = 0; yy < h; yy++) {
    const dy = Math.min(yy, h - 1 - yy), i = ins(dy), x0 = x + i, ww = w - i * 2;
    if (ww <= 0) continue;
    const primo = yy === 0 || i > ins(Math.min(yy - 1, h - yy)), ultimo = yy === h - 1;
    g.rect(x0, y + yy, ww, 1, line);                                  // il contorno, tutt'intorno
    if (primo || ultimo || ww <= 2) continue;
    const c = yy <= 1 ? light : yy >= h - 2 ? dark : fill;
    g.rect(x0 + 1, y + yy, ww - 2, 1, c);
    if (!o.piatto) { g.px(x0 + 1, y + yy, light); g.px(x0 + ww - 2, y + yy, dark); }
  }
}
/* DISCO/ellisse piena con contorno: basi tonde, cuscini, pomelli */
function disco(g, cx, cy, rx, ry, fill, o = {}) {
  const line = o.line || g.shade8(fill, 0.45), light = o.light || g.shade8(fill, 1.16);
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    if (w <= 0) continue;
    g.rect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1, line);
    if (w > 1 && dy > -ry && dy < ry) g.rect(Math.round(cx - w) + 1, Math.round(cy + dy), w * 2 - 2, 1, dy < 0 ? light : fill);
  }
}
/* bottiglia/barattolo: vetro colorato con tappo e riflesso */
function bottle(g, x, y, w, h, c, cap) {
  g.rect(x, y + 3, w, h - 3, g.shade8(c, 0.45));
  g.rect(x + 1, y + 4, w - 2, h - 5, c);
  g.rect(x + 1, y + 4, 1, h - 6, g.shade8(c, 1.45));
  g.rect(x + Math.floor(w / 2) - 1, y, 3, 4, cap || '#6b4a2e');
}
/* mensola a parete con due staffe */
function shelf(g, x, y, w) {
  boxr(g, x, y, w, 4, '#8a5f38', 2);
  /* le staffe sono mensoline a squadra, non due stecchini: una riga in meno a ogni pixel */
  for (const bx of [x + 3, x + w - 6]) for (let k = 0; k < 4; k++) g.rect(bx, y + 4 + k, 3 - k, 1, '#3a2a1c');
}
function frame(g, x, y, w, h, gold) {
  boxr(g, x, y, w, h, gold ? '#c9a227' : '#8a5f38', 2, { line: '#2a1e14' });
  g.rect(x + 1, y + 1, w - 2, 1, gold ? '#f0d470' : '#b07c4a');
}
function candle(g, x, y, time) {
  g.rect(x, y, 4, 8, g.shade8('#f3ecda', 0.34)); g.rect(x + 1, y, 2, 7, '#f3ecda');
  const f = Math.floor((time || 0) / 250) % 2;
  g.rect(x + 1, y - 4 + f, 2, 3 - f, '#e8873a'); g.px(x + 1, y - 2, '#f6dc78');
}
function mug(g, x, y, c) {
  g.rect(x, y, 8, 10, g.shade8('#c9a06a', 0.34)); g.rect(x + 1, y + 1, 6, 8, c || '#c9a06a'); g.rect(x + 1, y + 1, 6, 2, '#f3ecda');
  g.rect(x + 8, y + 3, 2, 5, '#2a2016');
}

/* ---------- materiali ---------- */
/* LASTRE di pietra sfalsate, con bisello e qualche crepa (laboratorio) */
function floorFlags(g, sx, sy, tx, ty) {
  const base = ['#8f887a', '#9a9285', '#877f71'];
  const rows = [[0, 20, 32], [0, 11, 32]];
  for (let r = 0; r < 2; r++) {
    const cuts = rows[(ty + r + tx) % 2];
    for (let i = 0; i < cuts.length - 1; i++) {
      const x0 = sx + cuts[i], w = cuts[i + 1] - cuts[i], y0 = sy + r * 16;
      const c = base[(tx * 3 + ty * 5 + r * 7 + i) % 3];
      g.rect(x0, y0, w, 16, '#6c6558');
      g.rect(x0 + 1, y0 + 1, w - 1, 15, c);
      g.rect(x0 + 1, y0 + 1, w - 2, 1, g.shade8(c, 1.14));
      g.rect(x0 + 1, y0 + 1, 1, 14, g.shade8(c, 1.08));
      g.rect(x0 + 1, y0 + 15, w - 1, 1, g.shade8(c, 0.84));
      if ((tx * 7 + ty * 11 + r + i) % 9 === 0) { g.rect(x0 + 4, y0 + 6, 5, 1, '#6c6558'); g.px(x0 + 9, y0 + 7, '#6c6558'); }
    }
  }
}
/* PIASTRELLE a scacchi con fuga e riflesso (barbiere) */
/* numerello stabile per casella: serve a consumare il pavimento sempre allo stesso modo */
function h2(a, b) { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); }
function floorChecker(g, sx, sy, tx, ty) {
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const x0 = sx + c * 16, y0 = sy + r * 16, chiara = (tx * 2 + c + ty * 2 + r) % 2;
    const q = h2(tx * 2 + c, ty * 2 + r);
    /* NON SONO TUTTE UGUALI: ogni piastrella scarta di un filo dal suo tono. A due colori esatti
       ripetuti il pavimento diventa un foglio a quadretti e la stanza sembra disegnata col
       righello (segnalato: «sono tutte troppo squadrate»). */
    const col = g.shade8(chiara ? '#eef4f5' : '#8fb7c6', 0.96 + q * 0.08);
    g.rect(x0, y0, 16, 16, '#6f95a3');
    g.rect(x0 + 1, y0 + 1, 15, 15, col);
    g.rect(x0 + 1, y0 + 1, 14, 1, g.shade8(col, 1.08));
    g.rect(x0 + 1, y0 + 15, 15, 1, g.shade8(col, 0.86));
    /* gli SPIGOLI si consumano: un pixel di fuga in due angoli su quattro */
    for (let k = 0; k < 4; k++) if (h2(tx * 8 + c * 4 + k, ty * 8 + r * 4) > 0.55)
      g.px(x0 + 1 + (k & 1) * 14, y0 + 1 + (k >> 1) * 14, '#6f95a3');
    if (q > 0.88) { g.rect(x0 + 4, y0 + 7, 7, 1, g.shade8(col, 0.9)); g.px(x0 + 10, y0 + 8, g.shade8(col, 0.9)); }   // crepa
    else if (q < 0.10) { g.rect(x0 + 5, y0 + 5, 4, 3, g.shade8(col, 0.94)); }                                        // alone di consumo
    if ((tx + ty + r + c) % 3 === 0) g.px(x0 + 4, y0 + 4, '#ffffff');
  }
}
/* carta da parati e muri, uno per mestiere; tutto dentro (x,y,w,h) */
function wallFill(g, kind, x, y, w, h) {
  const clip = (rx, ry, rw, rh, c) => {
    const x0 = Math.max(rx, x), x1 = Math.min(rx + rw, x + w), y0 = Math.max(ry, y), y1 = Math.min(ry + rh, y + h);
    if (x1 > x0 && y1 > y0) g.rect(x0, y0, x1 - x0, y1 - y0, c);
  };
  if (kind === 'stone') {                               // blocchi di pietra con bisello
    clip(x, y, w, h, '#6f6a60');
    for (let r = 0; r * 10 < h; r++) for (let c = -1; c * 20 < w; c++) {
      const bx = x + c * 20 + (r % 2) * 10, by = y + r * 10, col = ['#9a9285', '#8f887a', '#a39b8d'][(r * 3 + c * 5 + 9) % 3];
      clip(bx + 1, by + 1, 19, 9, col); clip(bx + 1, by + 1, 19, 1, g.shade8(col, 1.15)); clip(bx + 1, by + 9, 19, 1, g.shade8(col, 0.82));
    }
  } else if (kind === 'timber') {                       // assi orizzontali con travi scure
    for (let r = 0; r * 8 < h; r++) {
      const col = r % 2 ? '#8a6240' : '#946a46';
      clip(x, y + r * 8, w, 8, col); clip(x, y + r * 8, w, 1, g.shade8(col, 1.12)); clip(x, y + r * 8 + 7, w, 1, g.shade8(col, 0.72));
    }
    for (let bx = x + 6; bx < x + w; bx += 74) { clip(bx, y, 8, h, '#4e3622'); clip(bx + 1, y, 2, h, '#6b4a2e'); }
  } else if (kind === 'boards') {                       // bottega d'arredo: perline chiare di legno grezzo
    for (let bx = x, i = 0; bx < x + w; bx += 10, i++) {
      const col = ['#c9a77a', '#bf9c6d', '#d0ae82'][i % 3];
      clip(bx, y, 10, h, col); clip(bx, y, 1, h, g.shade8(col, 0.72)); clip(bx + 1, y, 1, h, g.shade8(col, 1.12));
      if ((i * 7) % 5 === 0) clip(bx + 5, y + 14 + (i % 3) * 7, 2, 2, g.shade8(col, 0.78));        // nodo del legno
    }
  } else if (kind === 'stripe') {                       // righe verdi del negozio
    clip(x, y, w, h, '#8fae7a');
    for (let sx = x + 2; sx < x + w; sx += 12) { clip(sx, y, 4, h, '#7c9b68'); clip(sx + 6, y, 1, h, '#a3c08c'); }
  } else if (kind === 'mint') {                         // barbiere: menta con righine
    clip(x, y, w, h, '#b9ddd2');
    for (let sx = x + 4; sx < x + w; sx += 8) clip(sx, y, 1, h, '#a3cbbf');
    for (let sy = y + 6; sy < y + h; sy += 12) for (let sx = x + 8; sx < x + w; sx += 16) g.rect(sx, sy, 1, 1, '#ffffff');
  } else {                                              // sartoria: damasco a rombi
    clip(x, y, w, h, '#e7c9c4');
    for (let sy = y + 2, r = 0; sy < y + h; sy += 10, r++) for (let sx = x + (r % 2) * 8; sx < x + w; sx += 16) {
      clip(sx + 3, sy, 2, 1, '#d4a9a3'); clip(sx + 2, sy + 1, 4, 1, '#d4a9a3'); clip(sx + 1, sy + 2, 6, 1, '#d4a9a3');
      clip(sx + 2, sy + 3, 4, 1, '#d4a9a3'); clip(sx + 3, sy + 4, 2, 1, '#d4a9a3'); clip(sx + 3, sy + 2, 2, 1, '#f4e1dc');
    }
  }
}
/* zoccolo per mestiere */
function wainscot(g, kind, x, y, w, h) {
  if (kind === 'tile') {
    g.rect(x, y, w, h, '#f3ecda');
    for (let r = 0; r * 5 < h; r++) { g.rect(x, y + r * 5, w, 1, '#c9d6d6'); for (let c = (r % 2) * 5; c < w; c += 10) g.rect(x + c, y + r * 5, 1, 5, '#c9d6d6'); }
  } else if (kind === 'dark') {
    g.rect(x, y, w, h, '#4e3622');
    for (let c = 0; c < w; c += 6) { g.rect(x + c, y, 1, h, '#3a2818'); g.rect(x + c + 1, y, 1, h, '#65462c'); }
  } else if (kind === 'slab') {
    g.rect(x, y, w, h, '#6c6558');
    for (let c = 0; c < w - 2; c += 24) { const cw = Math.min(22, w - c - 2); g.rect(x + c + 1, y + 1, cw, h - 2, '#7f776a'); g.rect(x + c + 1, y + 1, cw, 1, '#948c7e'); }
  } else {
    const wood = kind === 'light' ? '#a97a4c' : '#7a4f30';
    g.rect(x, y, w, h, wood);
    for (let c = 4; c + 20 <= w; c += 26) {
      g.rect(x + c, y + 2, 20, h - 4, g.shade8(wood, 0.78));
      g.rect(x + c + 1, y + 3, 18, h - 6, g.shade8(wood, 1.08));
      g.rect(x + c + 1, y + 3, 18, 1, g.shade8(wood, 1.3));
    }
  }
  g.rect(x, y - 2, w, 2, '#9a6d45'); g.rect(x, y - 2, w, 1, '#c49a63');
}

/* ogni mestiere: materiali e colori */
export const SHOP_STYLE = {
  store: { rug: '#8a4b3a', floor: 'plank', wall: 'stripe', wains: 'panel', accent: '#b8574a', accent2: '#e0a24a', mat: '#8a6a3a', counter: '#8a5f38', top: '#b07c4a' },
  inn: { rug: '#7a3b30', floor: 'plank', wall: 'timber', wains: 'dark', accent: '#8a3f3a', accent2: '#d8b23c', mat: '#6e3a30', counter: '#5c3d22', top: '#7a5636' },
  barber: { rug: '#8f4a46', floor: 'checker', wall: 'mint', wains: 'tile', accent: '#4e8d9c', accent2: '#f3ecda', mat: '#3f6f7c', counter: '#3f7f86', top: '#eef0ea' },
  tailor: { rug: '#7a4f86', floor: 'plank', wall: 'damask', wains: 'light', accent: '#8a6ab0', accent2: '#e8c34a', mat: '#a0526a', counter: '#b07c4a', top: '#d8b58a' },
  furniture: { rug: '#5f6f42', floor: 'plank', wall: 'boards', wains: 'panel', accent: '#5f7a52', accent2: '#e8c34a', mat: '#6b5a3a', counter: '#a97a4c', top: '#d8b58a' },
  lab: { rug: '#3f5a54', floor: 'flags', wall: 'stone', wains: 'slab', accent: '#4e8d7c', accent2: '#c9a227', mat: '#4a5a4e', counter: '#4e3a28', top: '#8f9aa3' },
};
export function shopStyle(type) { return SHOP_STYLE[type] || SHOP_STYLE.store; }

/* ---------- GUSCIO: pavimento, parete di fondo, muri, finestre ---------- */
export function drawShopFloor(g, type, rw, rh, wood, groundTile) {
  const st = shopStyle(type);
  for (let ty = 0; ty < Math.ceil(rh / TS); ty++) for (let tx = 0; tx < Math.ceil(rw / TS); tx++) {
    const sx = tx * TS, sy = ty * TS;
    if (st.floor === 'flags') floorFlags(g, sx, sy, tx, ty);
    else if (st.floor === 'checker') floorChecker(g, sx, sy, tx, ty);
    else groundTile(g, null, sx, sy, tx, ty, { c1: wood[0], c2: wood[1], kind: 'plank' });
  }
  passatoia(g, rw / 2, SHOP_WALL + 30, rh - 30, 42, st.rug || st.mat);
}
/* PASSATOIA dalla porta al bancone. Una stanza tutta a piastrelle o tutte assi è una griglia:
   il tappeto è la cosa che la spezza e che dice dove si cammina. Il primo giro aveva righe
   ogni sei pixel e sembrava una grata: qui ci sono un bordo chiaro e pochi rombi radi, e il
   colore è CALDO, in contrasto col pavimento, o il tappeto sparisce dentro le piastrelle. */
function passatoia(g, cx, y0, y1, w, col) {
  const x0 = Math.round(cx - w / 2), h = Math.round(y1 - y0);
  if (h < 20) return;
  const chiaro = g.shade8(col, 1.28), scuro = g.shade8(col, 0.68);
  boxr(g, x0, y0, w, h, col, 3, { line: scuro, light: col, dark: col, piatto: true });   // anche il tappeto ha gli angoli smussi
  g.rect(x0 + 4, y0 + 4, w - 8, 1, chiaro); g.rect(x0 + 4, y0 + h - 5, w - 8, 1, chiaro);
  g.rect(x0 + 4, y0 + 4, 1, h - 8, chiaro); g.rect(x0 + w - 5, y0 + 4, 1, h - 8, chiaro);
  for (let y = y0 + 16; y < y0 + h - 14; y += 22) for (let r = 0; r < 5; r++) {   // rombo
    g.rect(Math.round(cx) - r, y - 4 + r, r * 2 + 1, 1, chiaro);
    g.rect(Math.round(cx) - r, y + 4 - r, r * 2 + 1, 1, chiaro);
  }
  for (let k = 1; k < w - 2; k += 4) { g.rect(x0 + k, y0 - 3, 2, 3, scuro); g.rect(x0 + k, y0 + h, 2, 3, scuro); }   // frange
}
/* parete di fondo con le sue finestre (in `wins`, coordinate x) */
export function drawShopWall(g, type, rw, rh, nightK, time, wins) {
  const st = shopStyle(type), W = SHOP_WALL;
  wallFill(g, st.wall, 0, 0, rw, W);
  drawCrown(g, 0, 0, rw);
  wainscot(g, st.wains, 0, W - 22, rw, 16);
  drawBaseboard(g, 0, W - 6, rw);
  for (const wx of wins || []) drawWindow(g, wx, 10, st, nightK, time);
}
export function drawShopShell(g, type, rw, rh, nightK, wins) {
  const st = shopStyle(type), W = SHOP_WALL;
  for (const wx of wins || []) drawWindowLight(g, wx, W + 26, nightK);
  floorShadow(g, 12, W, rw - 24, 0, 'down');
  floorShadow(g, 12, W, 0, rh - W, 'right');
  floorShadow(g, rw - 17, W, 5, rh - W, 'left');
  /* GLI ANGOLI NON SONO SPIGOLI VIVI: dove due pareti si incontrano l'ombra si raccoglie e fa
     una curva. È quello che toglie alla stanza l'aria di rettangolo disegnato col righello. */
  for (const [ax, sxg] of [[12, 1], [rw - 12, -1]]) for (let i = 0; i < 22; i++) {
    const h = Math.round(Math.sqrt(Math.max(0, 1 - (i * i) / 484)) * 22);
    if (h > 0) g.rect(ax + (sxg > 0 ? i : -i - 1), W, 1, h, i < 8 ? 'rgba(30,18,8,.13)' : 'rgba(30,18,8,.07)');
  }
  wallCap(g, 0, -SHOP_TOP, rw, SHOP_TOP, 'bottom');
  wallCap(g, 0, -1, 12, rh + 1, 'right');
  wallCap(g, rw - 12, -1, 12, rh + 1, 'left');
  drawDoormat(g, rw / 2 - 18, rh - 26, 36, 13, st.mat);
}
/* muro davanti col varco (dopo il giocatore, che uscendo ci passa sotto) */
export function drawShopFront(g, rw, rh) {
  wallCap(g, 0, rh - 8, rw / 2 - 21, 12, 'top');
  wallCap(g, rw / 2 + 21, rh - 8, rw / 2 - 21, 12, 'top');
  drawFrontDoorway(g, rw / 2, rh - 8, 18, 12, true);
}
/* BANCONE: piano con lo spigolo in luce, fronte a pannelli, zoccolo scuro, ombra a terra */
export function drawCounter(g, type, x, y, w, h) {
  const st = shopStyle(type), c = st.counter, t = st.top;
  g.rect(x + 2, y + h, w - 4, 3, 'rgba(30,18,8,.22)');
  /* il CORPO del bancone ha le testate raccordate: una barra che finisce di netto contro i due
     muri è la riga più lunga della stanza, e teneva insieme tutta la squadratura */
  boxr(g, x, y + 5, w, h - 5, c, 4, { light: g.shade8(c, 1.1), dark: g.shade8(c, 0.7) });
  for (let px2 = x + 6; px2 + 26 <= x + w - 4; px2 += 32) {
    g.rect(px2, y + 9, 26, h - 14, g.shade8(c, 0.78));
    g.rect(px2 + 1, y + 10, 24, h - 16, g.shade8(c, 1.06));
    g.rect(px2 + 1, y + 10, 24, 1, g.shade8(c, 1.28));
  }
  g.rect(x + 3, y + h - 4, w - 6, 3, g.shade8(c, 0.6));
  boxr(g, x - 2, y, w + 4, 7, t, 3, { light: g.shade8(t, 1.2), dark: g.shade8(t, 0.78) });   // piano: sporge un filo, spigoli tondi
  if (type === 'barber') for (let i = 8; i < w; i += 22) g.rect(x + i, y + 2, 6, 1, '#d7dad2'); // venature del marmo
  if (type === 'tailor') for (let i = 0; i < w; i += 4) g.rect(x + i, y + 6, 2, 1, i % 16 ? '#e8c34a' : '#2a2016'); // metro sul bordo
}

/* ================= NEGOZIO ================= */
export function drawStoreProps(g, rw, rh, time) {
  /* scaffale grande dietro il bancone */
  const sx = rw / 2 - 60;
  boxr(g, sx, 6, 120, 52, '#6e4a2e', 3);                                            // scaffale con gli spigoli smussati
  g.rect(sx + 4, 10, 112, 44, '#3a2a1c');
  for (const sy of [24, 40, 54]) { g.rect(sx + 3, sy, 114, 3, '#8a5f38'); g.rect(sx + 3, sy, 114, 1, '#b07c4a'); }
  const goods = [
    [4, 'jar', '#e8c34a'], [16, 'jar', '#c65a54'], [28, 'box', '#5a86c8'], [44, 'bottle', '#5fa04e'], [52, 'bottle', '#8a6ab0'],
    [62, 'box', '#e0873a'], [78, 'jar', '#e8a0b8'], [90, 'sack', '#d8b58a'], [104, 'bottle', '#4e8d7c'],
  ];
  goods.forEach(([ox, k, c], i) => {
    const x = sx + 4 + ox;
    if (k === 'jar') bottle(g, x, 13, 9, 11, c, '#c9a06a');
    else if (k === 'bottle') bottle(g, x, 11, 6, 13, c, '#6b4a2e');
    else if (k === 'box') boxr(g, x, 15, 13, 9, c, 2);
    else { g.rect(x, 14, 11, 10, '#6b5238'); g.rect(x + 1, 15, 9, 9, c); g.rect(x + 3, 13, 5, 2, '#6b5238'); }
    const y2 = 29, c2 = ['#c65a54', '#e8c34a', '#5a86c8', '#5fa04e', '#e0873a', '#8a6ab0'][(i * 5) % 6];
    if (i % 3 === 0) boxr(g, x, y2 + 3, 12, 8, c2, 2); else if (i % 3 === 1) bottle(g, x + 2, y2, 7, 11, c2); else { g.rect(x, y2 + 5, 10, 6, '#2a2016'); g.rect(x + 1, y2 + 6, 8, 4, c2); }
  });
  for (let i = 0; i < 5; i++) { g.rect(sx + 8 + i * 22, 44, 14, 9, '#5c4229'); g.rect(sx + 9 + i * 22, 45, 12, 7, ['#e8dcc0', '#c86a4a', '#d8b58a', '#7ec069', '#e8c34a'][i]); }
  boxr(g, sx + 96, 2, 20, 12, '#f3ecda', 2); g.rect(sx + 100, 6, 3, 3, '#c9a227'); g.rect(sx + 105, 6, 8, 1, '#6b4a2e'); g.rect(sx + 105, 9, 6, 1, '#6b4a2e'); // cartellino prezzi
  /* lavagnetta dei prezzi sulla destra */
  frame(g, rw - 64, 10, 40, 28);
  g.rect(rw - 61, 13, 34, 22, '#2e3d33');
  for (let r = 0; r < 3; r++) { g.rect(rw - 57, 17 + r * 6, 14, 1, '#e8e2d0'); g.rect(rw - 38, 16 + r * 6, 3, 3, '#e8c34a'); }
  /* trecce d'aglio e salami appesi che dondolano */
  const sw = Math.round(Math.sin((time || 0) / 700));
  for (const [hx, c, n] of [[rw - 80, '#8a3f3a', 3], [22, '#f3ecda', 4]]) {
    g.rect(hx, 0, 1, 10, '#5c4229');
    for (let i = 0; i < n; i++) { disco(g, hx + sw, 13 + i * 7, 4, 4, c); g.px(hx - 1 + sw, 12 + i * 7, g.shade8(c, 1.3)); }   // teste d'aglio e salami: tondi
  }
  /* lanterna appesa */
  const lf = Math.floor((time || 0) / 300) % 2;
  g.rect(sx - 12, 0, 1, 14, '#3a2e20');
  boxr(g, sx - 17, 14, 11, 14, lf ? '#f2c53d' : '#e8862e', 3, { line: '#5a5248' }); g.rect(sx - 15, 17, 2, 8, '#fff3c8');
  disco(g, sx - 11, 13, 7, 2, '#5a5248'); disco(g, sx - 11, 28, 7, 2, '#5a5248');   // cupola e piatto della lanterna
}
/* ANIMALETTI TONDI. Fatti a rettangoli sembravano scatole con le orecchie ("gli animali sono molto
   squadrati"): qui si posano OVALI e linee spesse in una mappa di celle, e alla fine un solo contorno
   morbido gira attorno alla sagoma intera — come il coniglietto, che era l'unico riuscito. */
function critter(g, outline) {
  const m = new Map();
  const put = (x, y, c) => m.set(x + ',' + y, [x, y, c]);
  return {
    put,
    oval(cx, cy, rx, ry, col) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x - cx) / rx, v = (y - cy) / ry;
        if (u * u + v * v <= 1.04) put(x, y, typeof col === 'function' ? col(u, v) : col);
      }
    },
    line(x0, y0, x1, y1, w, col) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; this.oval(Math.round(x), Math.round(y), w / 2, w / 2, col); }
    },
    paint() {
      /* IL CONTORNO PRENDE IL COLORE DI CHI TOCCA. Prima era una tinta scura sola per tutta la
         bestiola: muso, guscio e zampe finivano dentro lo stesso filo quasi nero e l'animale
         sembrava ritagliato. `outline` resta come ripiego se il colore non è un esagono. */
      /* ogni pixel di contorno è la MEDIA di quello che tocca, non l'ultimo arrivato: così la
         linea segue la luce del pelo (chiara sul dorso, scura sotto) invece di risultare un
         unico bordo piatto tutt'attorno alla bestiola (segnalato con foto). */
      const bordo = new Map();
      for (const [x, y, c] of m.values()) {
        if (typeof c !== 'string' || c[0] !== '#') continue;
        const n = parseInt(c.slice(1), 16);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = (x + dx) + ',' + (y + dy); if (m.has(k)) continue;
          const a = bordo.get(k) || [0, 0, 0, 0];
          a[0] += (n >> 16) & 255; a[1] += (n >> 8) & 255; a[2] += n & 255; a[3]++;
          bordo.set(k, a);
        }
      }
      for (const [k, a] of bordo) {
        const [x, y] = k.split(',').map(Number);
        const f = v => Math.max(0, Math.min(255, Math.round((v / a[3]) * 0.46)));
        g.px(x, y, a[3] ? '#' + ((1 << 24) | (f(a[0]) << 16) | (f(a[1]) << 8) | f(a[2])).toString(16).slice(1) : outline);
      }
      for (const [x, y, c] of m.values()) g.px(x, y, c);
    },
  };
}
/* luce in alto a sinistra, ombra in basso a destra, su tre toni */
const tone3 = (L, M, D) => (u, v) => (v < -0.35 && u < 0.35 ? L : u + v > 0.75 ? D : M);
/* CUORICINI che salgono e svaniscono sopra un animale coccolato (fase dal tempo della reazione) */
function hearts(g, x, y, pet) {
  const k = 1 - pet.t / 2.6;
  for (let i = 0; i < 3; i++) {
    const p = k * 1.6 - i * 0.35; if (p < 0 || p > 1) continue;
    const hx = Math.round(x + (i - 1) * 9 + Math.sin(p * 6 + i) * 2), hy = Math.round(y - p * 26);
    const c = i === 1 ? '#e8607a' : '#f08aa0';
    g.rect(hx, hy, 2, 2, c); g.rect(hx + 3, hy, 2, 2, c); g.rect(hx - 1, hy + 1, 7, 2, c); g.rect(hx, hy + 3, 5, 1, c); g.px(hx + 2, hy + 4, c); g.px(hx, hy, '#ffd0da');
  }
}
export function drawStoreFloorProps(g, rw, rh, time, _e, _r, pet) {
  /* sul bancone: bilancia che oscilla, monete, registro, vaso di caramelle */
  const bx = rw / 2 + 52, tilt = (Math.floor((time || 0) / 900) % 2 ? 1 : -1) * 2;
  g.rect(bx - 6, 67, 16, 4, '#3a3630'); g.rect(bx, 54, 4, 14, '#5a5248'); g.rect(bx + 1, 54, 1, 14, '#8f887a');
  g.rect(bx - 12, 54, 28, 2, '#8f887a');
  for (const [dx, dy] of [[-14, tilt], [10, -tilt]]) { g.rect(bx + dx, 56 + dy, 1, 6, '#5a5248'); g.rect(bx + dx - 4, 62 + dy, 10, 3, '#c9a227'); g.rect(bx + dx - 4, 62 + dy, 10, 1, '#f0d470'); }
  for (let i = 0; i < 3; i++) { g.rect(rw / 2 - 64 + i * 3, 66 - i * 3, 10, 3, '#8a6a1e'); g.rect(rw / 2 - 64 + i * 3, 66 - i * 3, 10, 1, '#f0d470'); }
  g.rect(rw / 2 - 42, 62, 24, 9, g.shade8('#f3ecda', 0.34)); g.rect(rw / 2 - 41, 63, 10, 7, '#f3ecda'); g.rect(rw / 2 - 29, 63, 10, 7, '#e8dcc0');
  g.rect(rw / 2 - 31, 63, 2, 8, '#8a3f3a'); for (let i = 0; i < 3; i++) { g.rect(rw / 2 - 39, 65 + i * 2, 6, 1, '#8f887a'); g.rect(rw / 2 - 27, 65 + i * 2, 6, 1, '#8f887a'); }
  bottle(g, rw / 2 + 20, 58, 10, 12, '#e8a0b8', '#c65a54'); g.px(rw / 2 + 23, 64, '#e8c34a'); g.px(rw / 2 + 26, 66, '#7ec069');
  /* casse, sacco di grano e GATTO che dorme (24..92 × 92..136) */
  g.shadow(58, 136, 32);
  boxr(g, 26, 100, 34, 34, '#a97a4c', 2);
  g.rect(30, 110, 26, 2, '#6e4a2e'); g.rect(30, 122, 26, 2, '#6e4a2e'); g.rect(41, 104, 4, 28, '#6e4a2e');
  boxr(g, 60, 106, 30, 28, '#8a5f38', 2); g.rect(64, 112, 22, 2, '#5c4229'); g.rect(64, 122, 22, 2, '#5c4229');
  /* il SACCO è pieno e gonfio: fianchi tondi e collo strozzato dallo spago */
  for (let k = 0; k < 16; k++) { const u = k / 15, w = 9 + Math.round(Math.sin(u * 2.4) * 2); g.rect(39 - w, 120 + k, w * 2, 1, k ? '#d8b58a' : '#6b5238'); }
  g.rect(28, 135, 22, 1, '#6b5238'); g.rect(33, 117, 12, 4, '#6b5238'); g.rect(34, 118, 10, 2, '#c9a06a'); g.rect(33, 126, 12, 1, '#b8955f');
  for (let i = 0; i < 4; i++) g.px(34 + i * 3, 116 - (i % 2), '#e8c34a');
  /* GATTO acciambellato sulla cassa: pagnotta tonda a righe, coda arrotolata davanti alle zampe. Coccolato
     alza la testa, apre gli occhi, drizza la coda che ondeggia e muove i baffi */
  {
    const petCat = pet && pet.kind === 'gatto';
    const OR = '#e08a2c', ORL = '#f4ad5a', ORD = '#b8662a', OUT = '#4a2e1a';
    const c = critter(g, OUT);
    const lift = petCat ? 3 : 0, sw = petCat ? Math.floor(pet.t * 6) % 2 : 0;
    c.oval(76, 101, 14, 6.5, tone3(ORL, OR, ORD));                                        // corpo
    if (petCat) c.line(89, 99, 92 + sw, 88, 3, OR);                                       // coda alzata che ondeggia
    else c.line(88, 104, 70, 107, 3, OR);                                                  // coda arrotolata davanti
    c.oval(61, 98 - lift, 6.5, 5.5, tone3(ORL, OR, ORD));                                 // testa
    for (const ex of [57, 64]) { c.put(ex, 92 - lift, OR); c.put(ex + 1, 92 - lift, OR); c.put(ex, 91 - lift, OR); c.put(ex + (ex < 60 ? 0 : 1), 90 - lift, OR); }   // orecchie a punta
    c.paint();
    for (const x of [72, 77, 82]) { g.px(x, 96, ORD); g.px(x, 97, ORD); g.px(x + 1, 98, ORD); }                                   // righe sulla schiena
    g.px(57, 91 - lift, '#e8a0b8'); g.px(65, 91 - lift, '#e8a0b8');
    g.rect(58, 100 - lift, 6, 3, '#f7d8b0');                                                                                    // muso chiaro
    g.px(60, 100 - lift, '#e07a8a');                                                                                             // nasino
    if (petCat) {
      g.rect(58, 96 - lift, 2, 2, '#2a1e18'); g.rect(63, 96 - lift, 2, 2, g.shade8('#ffffff', 0.34)); g.px(58, 96 - lift, '#ffffff'); g.px(63, 96 - lift, '#ffffff');
      const WC = '#fff6e6', wh = Math.floor(pet.t * 6) % 2;
      for (const [x, y] of [[54, 100], [53, 100], [52, 99 - wh], [54, 102], [53, 102], [52, 103 + wh]]) g.px(x, y - lift, WC);
      hearts(g, 66, 84, pet);
    } else {
      g.px(58, 97, '#2a1e18'); g.px(59, 98, '#2a1e18'); g.px(63, 98, '#2a1e18'); g.px(64, 97, '#2a1e18');                         // occhi chiusi a mezzaluna
    }
  }
  /* botti con mele (228..296 × 92..136) */
  g.shadow(262, 136, 34);
  /* BOTTI BOMBATE: una botte dritta è un parallelepipedo, e si vedeva. La pancia si allarga a
     metà altezza, i cerchi la seguono e il coperchio è un'ellisse. */
  for (const ox of [230, 264]) {
    const cx2 = ox + 15;
    for (let k = 0; k < 36; k++) {
      const u = k / 35, pancia = Math.round(Math.sin(u * Math.PI) * 2.5), w = 13 + pancia;
      const y = 100 + k;
      g.rect(cx2 - w, y, w * 2, 1, '#3a2a1c');
      g.rect(cx2 - w + 1, y, w * 2 - 2, 1, '#8a5f38');
      g.rect(cx2 - w + 1, y, 4, 1, '#a97a4c'); g.rect(cx2 + w - 6, y, 5, 1, '#6e4a2e');
      /* i cerchi di ferro: due righe scure con un filo di luce sopra, non due bande chiare */
      if (k === 6 || k === 26) g.rect(cx2 - w, y, w * 2, 1, '#6b5a48');
      if (k === 7 || k === 27) g.rect(cx2 - w, y, w * 2, 1, '#3d3128');
    }
    disco(g, cx2, 99, 14, 4, '#b07c4a');                                   // coperchio, visto di tre quarti
  }
  for (const [ax, ay, c] of [[234, 90, '#c65a54'], [242, 91, '#d8603c'], [250, 90, '#c65a54'], [238, 86, '#e0873a'], [246, 86, '#c65a54'],
    [268, 90, '#7ec069'], [276, 91, '#9ac24a'], [284, 90, '#7ec069'], [272, 86, '#9ac24a'], [280, 86, '#7ec069']]) {
    disco(g, ax + 3, ay + 3, 4, 4, c); g.px(ax + 2, ay + 2, g.shade8(c, 1.4)); g.px(ax + 3, ay - 1, '#5c4229');   // le mele sono TONDE
  }
  for (let i = 0; i < 7; i++) g.rect(112 + (i * 37) % 100, 156 + (i * 23) % 36, 3, 1, '#d4b13c');
}

/* ================= LOCANDA ================= */
export function drawInnProps(g, rw, rh, time) {
  const t = time || 0, cx = rw / 2;
  /* camino di pietra con mensola */
  g.rect(cx - 34, 2, 68, 58, '#4a4640');
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    const bx = cx - 33 + c * 10 - (r % 2) * 5, by = 3 + r * 9;
    if (bx < cx - 33 || bx > cx + 25) continue;
    const col = ['#8f887a', '#9a9285', '#7f776a'][(r + c) % 3];
    g.rect(bx, by, 9, 8, col); g.rect(bx, by, 9, 1, g.shade8(col, 1.18));
  }
  boxr(g, cx - 38, 20, 76, 6, '#8a5f38', 2);                                        // mensola del camino
  /* la BOCCA del camino è un ARCO, non un buco quadrato */
  for (let k = 0; k < 32; k++) {
    const y = 28 + k, w = k < 10 ? Math.round(20 * Math.sqrt(Math.max(0, 1 - ((10 - k) * (10 - k)) / 121))) : 20;
    if (w <= 0) continue;
    g.rect(cx - w, y, w * 2, 1, '#2a2016');
    if (w > 2) g.rect(cx - w + 2, y, w * 2 - 4, 1, '#1a1410');
  }
  const ff = Math.floor(t / 150) % 3;
  g.rect(cx - 12, 52, 24, 5, '#5c3d22'); g.rect(cx - 10, 49, 20, 4, '#6e4a2e');                // ceppi
  g.rect(cx - 10, 38 + ff, 20, 12 - ff, '#c9502a'); g.rect(cx - 7, 41 + (ff % 2), 14, 9, '#e8873a'); g.rect(cx - 3, 44, 6, 6, '#f6dc78');
  g.px(cx - 4, 36 + ff, '#e8873a'); g.px(cx + 3, 35 + ((ff + 1) % 3), '#f2c53d');
  g.rect(cx - 1, 30, 2, 5, '#2a2016'); g.rect(cx - 8, 34, 16, 6, '#2a2620'); g.rect(cx - 7, 34, 14, 2, '#4a4640');         // pentola appesa
  const sm = Math.floor(t / 500) % 3; g.px(cx - 2 + sm, 29 - sm, '#8f887a');
  /* sulla mensola: candele e un vaso */
  candle(g, cx - 32, 13, t); candle(g, cx + 28, 13, t); bottle(g, cx - 4, 10, 8, 11, '#4e8d7c', '#c9a227');
  /* trofeo: cranio su scudo di legno */
  boxr(g, 28, 12, 24, 22, '#8a5f38', 5);                                            // scudo del trofeo, sagomato
  g.rect(33, 16, 14, 11, '#ece5d2'); g.rect(35, 27, 10, 3, '#cbbfa4'); g.rect(35, 19, 3, 3, '#2a2016'); g.rect(42, 19, 3, 3, '#2a2016'); g.px(40, 23, '#2a2016');
  g.rect(30, 14, 3, 4, '#ece5d2'); g.rect(47, 14, 3, 4, '#ece5d2');
  /* mensola dei boccali e botte sul cavalletto */
  shelf(g, rw - 96, 22, 50);
  for (let i = 0; i < 4; i++) mug(g, rw - 92 + i * 12, 12, i % 2 ? '#c9a06a' : '#8f887a');
  /* BOTTE DEL SIDRO coricata: cerchio di doghe, pancia al centro */
  {
    const bx = rw - 30;
    for (let k = 0; k < 22; k++) {
      const u = k / 21, w = 13 + Math.round(Math.sin(u * Math.PI) * 2), y = 30 + k;
      g.rect(bx - w, y, w * 2, 1, '#3a2a1c');
      g.rect(bx - w + 1, y, w * 2 - 2, 1, k < 3 ? '#a97a4c' : '#8a5f38');
      if (k === 5 || k === 16) g.rect(bx - w, y, w * 2, 1, '#4a4640');
    }
  }
  g.rect(rw - 40, 52, 3, 6, '#3a2a1c'); g.rect(rw - 23, 52, 3, 6, '#3a2a1c');
  g.rect(rw - 50, 39, 6, 3, '#c9a227'); if (Math.floor(t / 700) % 3 === 0) g.px(rw - 49, 43 + (Math.floor(t / 230) % 3), '#e8c34a');
}
export function drawInnFloorProps(g, rw, rh, time, _e, _r, pet) {
  const t = time || 0, cx = rw / 2;
  /* bagliore del camino che pulsa sul pavimento */
  const gl = 0.08 + 0.04 * (Math.floor(t / 400) % 2);
  for (let i = 0; i < 5; i++) g.rect(cx - 40 + i * 6, 92 + i * 8, 80 - i * 12, 8, 'rgba(240,160,60,' + (gl - i * 0.012).toFixed(3) + ')');
  /* sul bancone: boccali, bottiglie, tagliere col pane */
  mug(g, cx - 64, 60, '#d4a24a'); mug(g, cx - 52, 60, '#d4a24a');
  bottle(g, cx + 44, 56, 6, 14, '#5f7a52', '#c9a227'); bottle(g, cx + 52, 58, 6, 12, '#8a3f3a', '#c9a227');
  boxr(g, cx + 60, 65, 20, 5, '#b07c4a', 2);                                  // tagliere
  for (let k = 0; k < 5; k++) { const w2 = 12 - Math.abs(k - 2) * 2; g.rect(cx + 69 - (w2 >> 1), 61 + k, w2, 1, k ? '#c98a4a' : '#e0a86a'); }   // pagnotta tonda
  /* tappeto al centro */
  const rx = cx - 38, ry = 146;
  boxr(g, rx, ry, 76, 40, '#a8453c', 4, { line: '#5c2a26', light: '#a8453c', dark: '#a8453c', piatto: true });
  boxr(g, rx + 4, ry + 4, 68, 32, '#8a3a32', 3, { line: '#d8b23c', light: '#8a3a32', dark: '#8a3a32', piatto: true });
  for (let k = 0; k < 6; k++) { g.rect(cx - k * 2, ry + 9 + k * 2, k * 4 + 1, 2, '#e0a24a'); g.rect(cx - k * 2, ry + 29 - k * 2, k * 4 + 1, 2, '#e0a24a'); }
  for (let i = 2; i < 74; i += 3) { g.px(rx + i, ry - 1, '#e8dcc0'); g.px(rx + i, ry + 40, '#e8dcc0'); }
  /* CANE acciambellato davanti al camino: corpo tondo che respira, testa appoggiata sulle zampe, orecchio
     morbido che ricade, coda arricciata. Coccolato alza la testa, apre gli occhi, lingua fuori, scodinzola */
  {
    const petDog = pet && pet.kind === 'cane';
    const B = '#c08a50', BL = '#dcaa70', BD = '#936434', OUT = '#4a3020', CR = '#f0d6ac';
    const br = Math.floor(t / 700) % 2, lift = petDog ? 4 : 0, wg = petDog ? Math.floor(pet.t * 10) % 2 : 0;
    g.shadow(46, 200, 20);
    const c = critter(g, OUT);
    c.oval(50, 191 - br * 0.5, 15, 7 + br * 0.5, tone3(BL, B, BD));                          // corpo
    if (petDog) c.line(64, 188, 68 + wg * 2, 180 - wg, 3, B); else c.line(63, 192, 67, 186, 3, B);   // coda
    c.oval(30, 192 - lift, 8, 6.5, tone3(BL, B, BD));                                        // testa
    c.oval(23, 195 - lift, 4.5, 3.5, CR);                                                     // muso
    c.oval(34, 192 - lift, 3, 5.5, BD);                                                       // orecchio che ricade
    c.oval(26, 199, 4, 2, CR); c.oval(35, 199, 4, 2, CR);                                     // zampe davanti
    c.paint();
    g.rect(44, 194, 10, 3, CR);                                                               // pancia chiara
    g.px(19, 194 - lift, '#2a1e18'); g.px(20, 194 - lift, '#2a1e18');                         // tartufo
    if (petDog) {
      g.rect(27, 189 - lift, 2, 2, g.shade8('#ffffff', 0.34)); g.px(27, 189 - lift, '#ffffff');
      g.rect(21, 198 - lift, 2, 3, '#e8607a');
      hearts(g, 32, 176, pet);
    } else {
      g.px(26, 191, '#2a1e18'); g.px(27, 192, '#2a1e18'); g.px(28, 192, '#2a1e18');          // occhio chiuso
      if (Math.floor(t / 1400) % 2) { g.px(22, 182, '#f3ecda'); g.px(20, 179, '#f3ecda'); g.px(23, 177, '#f3ecda'); }   // zzz
    }
  }
  /* tavoli con tovaglia, sgabelli, boccali e candela (28..96 e 224..292 × 96..136) */
  for (const ox of [30, 226]) {
    g.shadow(ox + 34, 136, 34);
    /* SGABELLI TONDI: la seduta è un disco, non un rettangolo */
    for (const sx of [ox - 2, ox + 58]) { disco(g, sx + 6, 115, 7, 3, '#6e4a2e'); g.rect(sx + 2, 117, 2, 10, '#4c3320'); g.rect(sx + 8, 117, 2, 10, '#4c3320'); }
    gamba(g, ox + 6, 122, 5, 14); gamba(g, ox + 57, 122, 5, 14);
    boxr(g, ox + 2, 100, 64, 24, '#5c3d22', 5, { light: '#7a5636' });                 // piano del tavolo, spigoli tondi
    /* la TOVAGLIA cade sul bordo e l'orlo ondeggia */
    boxr(g, ox + 12, 100, 44, 22, '#e8dcc0', 4, { line: '#b9a57a', light: '#f6efdd', dark: '#d3c4a2' });
    for (let k = 0; k < 44; k++) { const d = 2 + ((k + ox) % 3); g.rect(ox + 12 + k, 122, 1, d, '#d3c4a2'); }
    for (let i = 0; i < 42; i += 6) g.rect(ox + 13 + i, 125, 3, 2, '#b9a57a');
    mug(g, ox + 18, 94, '#d4a24a');
    const st = Math.floor(t / 400) % 3; g.px(ox + 21, 90 - st, '#f6efdd'); g.px(ox + 23, 88 - st, '#e8e2d0');
    g.rect(ox + 32, 104, 12, 6, g.shade8('#f3ecda', 0.34)); g.rect(ox + 33, 105, 10, 4, '#f3ecda'); g.rect(ox + 35, 104, 6, 3, '#c98a4a');
    candle(g, ox + 48, 96, t);
  }
}

/* ================= BARBIERE ================= */
export function drawBarberProps(g, rw, rh, time) {
  const t = time || 0, mx = rw / 2 - 44;
  /* grande specchio con cornice dorata */
  boxr(g, mx, 4, 88, 40, '#c9a227', 6, { light: '#f0d470', dark: '#8a6a1e' });   // cornice con gli angoli tondi
  boxr(g, mx + 4, 8, 80, 32, '#bfe3ef', 5, { line: '#8a6a1e', light: '#dff2f8', dark: '#a9d3df' });
  g.rect(mx + 6, 30, 76, 8, '#a9d3df');
  const sh = Math.floor(t / 260) % 20;
  if (sh < 14) { g.rect(mx + 6 + sh * 5, 8, 3, 32, '#e8f6fb'); g.rect(mx + 11 + sh * 5, 8, 1, 32, '#e8f6fb'); }
  g.px(mx + 44, 2, '#c9a227'); g.rect(mx + 42, 3, 5, 2, '#c9a227');
  /* mensola con flaconi e asciugamani */
  shelf(g, mx - 4, 44, 96);
  ['#5a86c8', '#e8a0b8', '#5fa04e', '#e8c34a'].forEach((c, i) => bottle(g, mx + 6 + i * 14, 33, 7, 11, c, '#f3ecda'));
  for (let i = 0; i < 2; i++) { g.rect(mx + 66, 38 - i * 5, 18, 5, g.shade8('#f3ecda', 0.34)); g.rect(mx + 67, 39 - i * 5, 16, 3, i ? '#f3ecda' : '#4e8d9c'); }
  /* orologio a pendolo */
  const pd = Math.round(Math.sin(t / 380) * 3);
  boxr(g, 24, 6, 26, 50, '#8a5f38', 5);                                   // cassa con la cimasa tonda
  disco(g, 37, 19, 9, 9, '#f3ecda');                                       // quadrante ROTONDO
  g.rect(36, 13, 1, 6, '#2a2016'); g.rect(37, 18, 4, 1, '#2a2016');
  g.rect(29, 30, 16, 22, g.shade8('#c9a227', 0.34)); g.rect(36 + pd, 30, 1, 16, '#c9a227');
  disco(g, 36 + pd, 47, 3, 3, '#c9a227');                                  // lente del pendolo
  /* palo del barbiere: strisce che scorrono */
  /* IL PALO GIRA DAVVERO. Il ciclo dell'animazione era lungo 12 pixel ma le bande si alternano
     a due a due: ogni giro il disegno saltava di mezza banda e si vedeva lo scatto. Il periodo
     giusto è 24 (rossa + blu), e le bande si disegnano per COLONNA a segmenti interi, non a
     trattini di 4 px: l'elica diventa continua e il loop non ha cuciture. */
  const px0 = rw - 42, PER = 24, off = Math.floor(t / 70) % PER;
  g.rect(px0 - 1, 4, 20, 56, g.shade8('#8f887a', 0.34));
  g.rect(px0, 9, 18, 46, '#f3ecda');
  for (let k = 0; k < 18; k++) {
    const sh = Math.floor(k / 3);                       // l'elica: ogni tre colonne scende di uno
    let a = 0;
    while (a < 46) {
      const v = a + off + sh, resto = v % (PER / 2), fine = Math.min(46, a + (PER / 2 - resto));
      g.rect(px0 + k, 9 + a, 1, fine - a, (Math.floor(v / (PER / 2)) & 1) ? '#5a86c8' : '#c65a54');
      a = fine;
    }
  }
  g.rect(px0 + 2, 9, 2, 46, 'rgba(255,255,255,.35)');
  g.rect(px0 - 2, 4, 22, 5, '#8f9aa3'); g.rect(px0 - 2, 4, 22, 1, '#dfe6ea'); g.rect(px0 - 2, 55, 22, 5, '#8f9aa3'); g.rect(px0 - 2, 55, 22, 1, '#dfe6ea');
  g.rect(px0 + 7, 1, 4, 3, '#c9a227');
  /* diploma incorniciato */
  frame(g, rw - 76, 14, 24, 18, true); g.rect(rw - 73, 17, 18, 12, '#f3ecda'); g.rect(rw - 70, 20, 12, 1, '#8f887a'); g.rect(rw - 70, 23, 9, 1, '#8f887a'); g.rect(rw - 62, 25, 3, 3, '#c65a54');
}
export function drawBarberFloorProps(g, rw, rh, time, _e, _r, pet) {
  const cx = rw / 2;
  /* sul bancone: forbici, pettine, pennello, flacone */
  g.rect(cx - 64, 66, 10, 2, '#8f9aa3'); g.rect(cx - 58, 64, 2, 6, '#8f9aa3'); g.rect(cx - 66, 64, 4, 4, '#c65a54'); g.rect(cx - 66, 68, 4, 3, '#c65a54');
  g.rect(cx - 44, 66, 16, 3, '#2a2016'); for (let i = 0; i < 16; i += 2) g.px(cx - 44 + i, 69, '#2a2016');
  g.rect(cx + 40, 62, 4, 8, '#8a5f38'); g.rect(cx + 38, 58, 8, 5, '#f3ecda');
  bottle(g, cx + 52, 56, 8, 14, '#4e8d9c', '#f3ecda');
  /* POLTRONA da barbiere (28..88 × 92..136): tutta curve — testata tonda, braccioli a rullo,
     seduta imbottita, piede a disco. Prima era una pila di rettangoli. */
  const x = 34;
  g.shadow(x + 22, 136, 20);
  disco(g, x + 22, 133, 19, 4, '#8f9aa3');                                                   // piede a disco
  boxr(g, x + 16, 114, 12, 18, '#cfd6da', 3); g.rect(x + 18, 116, 2, 14, '#ffffff');          // colonna
  boxr(g, x + 10, 86, 24, 10, '#3a3a44', 5);                                                  // poggiatesta, tondo
  boxr(g, x + 5, 93, 34, 24, '#c65a54', 7, { dark: '#8f3a38' });                               // schienale con la cima curva
  for (const bx of [x + 14, x + 22, x + 30]) g.rect(bx, 99, 1, 13, '#a3494e');                 // cuciture
  boxr(g, x - 1, 103, 9, 16, '#8f9aa3', 4); boxr(g, x + 36, 103, 9, 16, '#8f9aa3', 4);         // braccioli a rullo
  boxr(g, x + 3, 111, 38, 11, '#c65a54', 5, { dark: '#8f3a38' });                              // seduta imbottita
  disco(g, x + 22, 126, 11, 3, '#5a5248');                                                     // poggiapiedi
  /* SCOPA appoggiata di sbieco: un manico verticale attaccato al muro era l'ennesima riga a
     piombo. Qui pende contro la parete e le setole si aprono a ventaglio. */
  for (let k = 0; k < 34; k++) {
    const mx2 = 96 - Math.round(k * 0.22);
    g.rect(mx2, 92 + k, 3, 1, '#8a5f38'); g.px(mx2, 92 + k, '#b07c4a');
  }
  boxr(g, 84, 124, 14, 6, '#6b5238', 2);
  for (let i = 0; i < 12; i++) { const hh = 5 + ((i * 5) % 4); g.rect(84 + i, 129, 1, hh, i % 2 ? '#d4b13c' : '#b8955f'); }
  /* ciuffi di capelli a terra */
  for (const [c, hx, hy] of [['#33291f', 106, 146], ['#caa25a', 118, 150], ['#b5622e', 100, 156], ['#6e4a2a', 122, 142]]) {
    g.rect(hx, hy, 4, 1, c); g.rect(hx + 1, hy + 1, 4, 1, c); g.px(hx + 5, hy, c);
  }
  /* panca d'attesa con cuscino e giornale (228..296 × 100..132) + pianta */
  g.shadow(262, 132, 32);
  gamba(g, 232, 116, 5, 16); gamba(g, 284, 116, 5, 16);
  boxr(g, 228, 100, 64, 18, '#a97a4c', 4);                                   // seduta con gli spigoli smussati
  g.rect(230, 112, 60, 2, '#8a5f38');
  boxr(g, 232, 95, 26, 9, '#4e8d9c', 4);                                     // cuscino
  boxr(g, 264, 99, 14, 10, '#f3ecda', 2); g.rect(267, 102, 8, 1, '#5a5248'); g.rect(267, 105, 6, 1, '#8f887a');   // giornale
  boxr(g, 294, 108, 12, 12, '#c86a4a', 3);                                   // vaso: anche lui senza spigoli
  g.rect(292, 94, 7, 14, '#3f7a3a'); g.rect(299, 90, 7, 18, '#4f9a48'); g.rect(296, 86, 5, 12, '#5fae52'); g.px(298, 88, '#8fd07a');
  /* PAPPAGALLO sul trespolo in basso a sinistra: dondola la testa; coccolato apre le ali e fischietta */
  {
    const t = time || 0, pp = pet && pet.kind === 'pappagallo';
    g.shadow(40, 204, 12);
    g.rect(38, 170, 3, 34, g.shade8('#8a5f38', 0.34)); g.rect(39, 171, 1, 32, '#8a5f38');
    disco(g, 40, 203, 11, 3, '#6e4a2e');                                     // base tonda del trespolo
    boxr(g, 28, 167, 24, 4, '#a97a4c', 2);                                   // il posatoio
    const bob = pp ? (Math.floor(pet.t * 8) % 2) : (Math.floor(t / 900) % 2), fl = pp ? Math.floor(pet.t * 10) % 2 : 0;
    const c = critter(g, '#2a2420');
    if (pp) { c.oval(30, 156 - fl * 2, 5, 8, (u, v) => v > 0.4 ? '#e0873a' : '#4fae5a'); c.oval(50, 156 - fl * 2, 5, 8, (u, v) => v > 0.4 ? '#5a86c8' : '#4fae5a'); }
    c.line(40, 165 + bob, 39, 172, 4, '#2f8a3a');                                             // coda
    c.oval(40, 158 + bob, 6, 9, tone3('#6ac46e', '#3f9a4a', '#2f7a3a'));                     // corpo
    c.oval(41, 148 + bob, 6, 5.5, tone3('#f06a5a', '#d8453c', '#a8302a'));                   // testa
    c.oval(47, 150 + bob, 2.5, 2.5, '#e8dcc0');                                               // becco ricurvo
    c.paint();
    g.rect(37, 159 + bob, 6, 5, '#e8c34a'); g.rect(38, 158 + bob, 4, 1, '#e8c34a');           // petto giallo
    g.rect(43, 146 + bob, 2, 2, g.shade8('#ffffff', 0.34)); g.px(43, 146 + bob, '#ffffff');
    g.px(48, 152 + bob, '#8f887a');
    if (pp) { for (let i = 0; i < 3; i++) if ((Math.floor(pet.t * 5) + i) % 3 === 0) g.rect(52 + i * 4, 142 - i * 3, 2, 2, '#f3ecda'); hearts(g, 40, 136, pet); }
  }
}

/* ================= SARTORIA ================= */
export function drawTailorProps(g, rw, rh, time) {
  const rx = rw / 2 - 58;
  /* rastrelliera con i rotoli di stoffa */
  g.rect(rx, 6, 116, 4, g.shade8('#c9a227', 0.34)); g.rect(rx + 1, 7, 114, 2, '#c9a227');
  g.rect(rx + 2, 10, 3, 42, '#6b4a2e'); g.rect(rx + 111, 10, 3, 42, '#6b4a2e'); g.rect(rx, 50, 116, 4, '#6b4a2e');
  ['#c65a54', '#5a86c8', '#5fa04e', '#e8a0b8', '#e8c34a', '#8a6ab0'].forEach((c, i) => {
    const x = rx + 8 + i * 17, h = 30 + (i % 3) * 4;
    g.rect(x, 10, 15, h, g.shade8(c, 0.5)); g.rect(x + 1, 11, 13, h - 2, c);
    g.rect(x + 1, 11, 3, h - 2, g.shade8(c, 1.25)); g.rect(x + 11, 11, 3, h - 2, g.shade8(c, 0.8));
    for (let yy = 16; yy < h + 6; yy += 8) g.rect(x + 1, yy, 13, 1, g.shade8(c, 0.85));
    /* l'ORLO cade a onda: la stoffa non finisce con un taglio netto */
    for (let k = 0; k < 13; k++) { const d = 1 + Math.round(Math.abs(Math.sin((k + i) * 0.9)) * 3); g.rect(x + 1 + k, 10 + h - 1, 1, d, g.shade8(c, 0.62)); }
  });
  /* bozzetti d'abito incorniciati */
  frame(g, 22, 10, 26, 32); g.rect(25, 13, 20, 26, '#f3ecda');
  g.rect(33, 16, 4, 4, '#e0b890'); g.rect(30, 20, 10, 6, '#e8a0b8'); g.rect(28, 26, 14, 10, '#e8a0b8'); g.rect(29, 26, 1, 10, '#c06a88');
  frame(g, rw - 48, 10, 26, 32); g.rect(rw - 45, 13, 20, 26, '#f3ecda');
  g.rect(rw - 37, 16, 4, 4, '#e0b890'); g.rect(rw - 40, 20, 10, 8, '#5a86c8'); g.rect(rw - 40, 28, 4, 8, '#3f5a86'); g.rect(rw - 34, 28, 4, 8, '#3f5a86');
  /* mensola dei rocchetti */
  shelf(g, 60, 50, 40);
  ['#c65a54', '#5fa04e', '#e8c34a', '#5a86c8'].forEach((c, i) => {
    const x = 63 + i * 9; g.rect(x, 40, 7, 2, '#8a5f38'); g.rect(x + 1, 42, 5, 6, c); g.rect(x + 1, 42, 1, 6, g.shade8(c, 1.3)); g.rect(x, 48, 7, 2, '#8a5f38');
  });
  /* forbicione appeso */
  g.rect(rw - 72, 14, 2, 18, '#8f9aa3'); g.rect(rw - 66, 14, 2, 18, '#8f9aa3'); g.rect(rw - 75, 32, 6, 6, '#2a2016'); g.rect(rw - 67, 32, 6, 6, '#2a2016');
  g.rect(rw - 74, 33, 4, 4, '#c9a227'); g.rect(rw - 66, 33, 4, 4, '#c9a227');
}
export function drawTailorFloorProps(g, rw, rh, time, _e, _r, pet) {
  const t = time || 0, cx = rw / 2;
  /* sul bancone: pila di stoffe piegate, puntaspilli, forbici */
  const pile = ['#5a86c8', '#e8a0b8', '#e8c34a', '#5fa04e'];
  pile.forEach((c, i) => { g.rect(cx - 66, 66 - i * 4, 26, 4, g.shade8(c, 0.55)); g.rect(cx - 65, 66 - i * 4, 24, 3, c); });
  disco(g, cx + 46, 66, 6, 4, '#c65a54');                                     // puntaspilli TONDO g.px(cx + 43, 61, '#8f9aa3'); g.px(cx + 48, 60, '#8f9aa3'); g.px(cx + 46, 62, '#e8c34a');
  g.rect(cx + 58, 66, 12, 2, '#8f9aa3'); g.rect(cx + 70, 64, 4, 4, '#2a2016');
  /* MANICHINO = un OMINO DI LEGNO CON L'ABITO ADDOSSO: testa tonda senza faccia, spalle,
     maniche corte, vita e gonna che si apre. Il busto-e-basta sembrava una campana rosa
     (segnalato): un manichino si riconosce perché ha la forma di una persona. */
  {
    const cx2 = 58, LEG = '#d8b48a', LEGD = '#a9825a', AB = '#e8a0b8', ABD = '#cf7b96', LN = '#6a2e48';
    g.shadow(cx2, 134, 16);
    disco(g, cx2, 131, 11, 3, '#8f887a');                                      // base tonda
    g.rect(cx2 - 2, 114, 4, 17, LEGD); g.rect(cx2 - 1, 114, 2, 17, '#8f887a'); // asta
    disco(g, cx2, 80, 6, 7, LEG, { line: LEGD });                              // testa di legno, senza faccia
    g.rect(cx2 - 2, 86, 4, 4, LEGD);                                           // collo
    /* SPALLE E MANICHE: il taglio dell'abito parte da qui */
    for (let k = 0; k < 8; k++) {
      const w = 13 - Math.abs(k - 3), y = 90 + k;
      g.rect(cx2 - w, y, w * 2, 1, LN);
      g.rect(cx2 - w + 1, y, w * 2 - 2, 1, k < 2 ? g.shade8(AB, 1.14) : AB);
    }
    for (const sgn of [-1, 1]) {                                               // il braccio di legno che spunta dalla manica
      const bx = cx2 + sgn * 13;
      g.rect(sgn < 0 ? bx - 3 : bx, 97, 3, 6, LEGD); g.rect(sgn < 0 ? bx - 2 : bx, 97, 2, 5, LEG);
    }
    /* BUSTO che si stringe in vita e GONNA che si apre: due tronchi di cono, non una palla */
    for (let k = 0; k < 14; k++) {
      const w = 12 - Math.round(k * 0.35), y = 98 + k;
      g.rect(cx2 - w, y, w * 2, 1, LN); g.rect(cx2 - w + 1, y, w * 2 - 2, 1, k > 10 ? ABD : AB);
    }
    for (let k = 0; k < 16; k++) {
      const w = 8 + Math.round(k * 0.75), y = 112 + k;
      const orlo = k === 15 && ((y + w) % 3 === 0);                            // l'orlo non è una riga netta
      if (orlo) continue;
      g.rect(cx2 - w, y, w * 2, 1, LN); g.rect(cx2 - w + 1, y, w * 2 - 2, 1, k < 3 ? AB : ABD);
    }
    g.rect(cx2 - 3, 92, 6, 3, '#f3ecda');                                      // collo dell'abito
    for (const by of [101, 105, 109]) g.px(cx2, by, '#c9a227');                // bottoncini
    for (let i = 0; i < 5; i++) g.rect(cx2 - 10 + i * 5, 127, 3, 1, '#f3ecda'); // merletto sull'orlo
    g.rect(cx2 - 16, 94, 10, 2, '#e8c34a'); g.rect(cx2 - 14, 96, 2, 12, '#e8c34a');   // metro appeso alla spalla
  }
  /* cesto di gomitoli */
  boxr(g, 88, 118, 24, 14, '#b07c4a', 4);                                     // cesto: bocca tonda
  for (let i = 0; i < 22; i += 4) g.rect(89 + i, 119, 2, 12, '#8a5f38');
  for (const [bx, c] of [[90, '#c65a54'], [98, '#5a86c8'], [104, '#5fa04e']]) { g.rect(bx, 111, 8, 8, g.shade8(c, 0.5)); g.rect(bx + 1, 112, 6, 6, c); g.px(bx + 2, 113, g.shade8(c, 1.4)); }
  g.rect(108, 118, 1, 6, '#5a86c8'); g.rect(109, 124, 6, 1, '#5a86c8');
  /* TAVOLO da cucito con la MACCHINA (220..296 × 92..136) */
  g.shadow(258, 136, 36);
  gamba(g, 222, 114, 6, 22, '#4a4640'); g.rect(290, 114, 6, 22, g.shade8('#4a4640', 0.34)); g.rect(223, 126, 72, 3, '#4a4640');
  g.rect(218, 106, 82, 10, g.shade8('#a97a4c', 0.34)); g.rect(219, 107, 80, 8, '#a97a4c'); g.rect(219, 107, 80, 2, '#c49a63');
  g.rect(236, 128, 22, 6, g.shade8('#5a5248', 0.34)); g.rect(237, 129, 20, 4, '#5a5248');                                          // pedale
  g.rect(230, 98, 60, 9, '#1a1714'); g.rect(231, 99, 58, 7, '#3a3630'); g.rect(231, 99, 58, 1, '#c9a227');           // base
  g.rect(232, 76, 12, 24, '#1a1714'); g.rect(233, 77, 10, 22, '#2f2b26'); g.rect(233, 77, 2, 22, '#4a4640');         // colonna
  g.rect(232, 74, 46, 12, '#1a1714'); g.rect(233, 75, 44, 10, '#2f2b26'); g.rect(233, 75, 44, 2, '#4a4640');         // braccio
  for (let i = 0; i < 5; i++) g.px(240 + i * 7, 79, i % 2 ? '#e8c34a' : '#c9a227');
  g.rect(266, 86, 8, 6, '#1a1714');
  const ndl = Math.floor(t / 140) % 2;
  g.rect(269, 92, 1, 5 + ndl, '#dfe6ea');
  g.rect(248, 96, 36, 4, '#3f5a86'); g.rect(249, 96, 34, 1, '#5a86c8');
  for (let i = 0; i < 5; i++) g.rect(250 + i * 6, 98, 3, 1, (i + Math.floor(t / 200)) % 2 ? '#f3ecda' : '#3f5a86');
  const wcx = 286, wcy = 84, ang = t / 200;
  g.rect(wcx - 7, wcy - 7, 14, 14, '#1a1714'); g.rect(wcx - 6, wcy - 6, 12, 12, '#5a5248'); g.rect(wcx - 5, wcy - 5, 10, 2, '#8f887a'); g.px(wcx, wcy, '#c9a227');
  g.rect(Math.round(wcx + Math.cos(ang) * 4), Math.round(wcy + Math.sin(ang) * 4), 2, 2, '#e8c34a');
  g.rect(240, 70, 4, 5, '#c65a54'); g.rect(241, 68, 2, 2, '#8a5f38');                                              // rocchetto in cima
  /* ritagli di stoffa a terra */
  for (let i = 0; i < 6; i++) { const c = ['#c65a54', '#5a86c8', '#e8a0b8', '#5fa04e', '#e8c34a', '#8a6ab0'][i]; g.rect(124 + (i * 38) % 80, 156 + (i * 26) % 36, 4, 2, c); g.px(125 + (i * 38) % 80, 158 + (i * 26) % 36, c); }
  /* CONIGLIETTO acciambellato nel cesto di stoffe, in basso a destra, di profilo: corpo tondo e morbido,
     orecchie lunghe distese sulla schiena, codino a pompon, naso che fremita. Coccolato si tira su,
     drizza le orecchie e fa due saltelli. Contorno bruno morbido, non nero: è un animale di peluche. */
  {
    const t = time || 0, pr = pet && pet.kind === 'coniglio';
    const OUT = '#6b5a4c', W1 = '#f6f1e8', W2 = '#e4dccf', W3 = '#cfc4b4', PK = '#f0a8b8';
    const oval = (cx, cy, rx, ry, fill) => {
      for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry + 0.01))); g.rect(cx - w, cy + y, w * 2 + 1, 1, fill(y, w)); }
    };
    const edge = (cx, cy, rx, ry) => oval(cx, cy, rx + 1, ry + 1, () => OUT);
    g.shadow(284, 207, 17);
    /* cesto */
    g.rect(266, 192, 36, 15, g.shade8('#b07c4a', 0.34)); g.rect(267, 193, 34, 13, '#b07c4a'); for (let k = 0; k < 34; k += 4) g.rect(267 + k, 193, 2, 13, '#8a5f38');
    g.rect(265, 189, 38, 5, g.shade8('#d9869f', 0.34)); g.rect(266, 190, 36, 3, '#d9869f'); g.rect(266, 190, 36, 1, '#eaa6bb');
    const hop = pr ? -Math.round(Math.abs(Math.sin(pet.t * 6)) * 5) : 0;
    const bx = 288, by = 186 + hop;
    /* corpo */
    edge(bx, by, 10, 7);
    oval(bx, by, 10, 7, (y, w) => y < -3 ? W1 : y > 3 ? W3 : W2);
    g.rect(bx + 9, by - 3, 5, 5, OUT); g.rect(bx + 10, by - 2, 3, 3, '#ffffff');               // codino a pompon
    /* testa, davanti al corpo verso sinistra */
    const hx = bx - 10, hy = by - 4 - (pr ? 2 : 0);
    edge(hx, hy, 6, 5);
    oval(hx, hy, 6, 5, (y) => y < -2 ? W1 : W2);
    /* orecchie: distese sulla schiena da ferme, dritte coccolate */
    if (pr) {
      for (const ex of [hx - 1, hx + 3]) { g.rect(ex - 1, hy - 15, 4, 11, OUT); g.rect(ex, hy - 14, 2, 10, W1); g.rect(ex, hy - 12, 1, 7, PK); }
    } else {
      g.rect(hx + 1, hy - 6, 14, 4, OUT); g.rect(hx + 2, hy - 5, 12, 2, W1); g.rect(hx + 4, hy - 5, 8, 1, PK);
    }
    /* occhio col punto di luce, guancia, naso che fremita */
    g.rect(hx - 3, hy - 1, 2, 2, g.shade8('#ffffff', 0.34)); g.px(hx - 3, hy - 1, '#ffffff');
    g.px(hx - 1, hy + 2, '#f6c6cf');
    const nose = Math.floor(pr ? pet.t * 12 : t / 350) % 2;
    g.rect(hx - 7, hy + 1 - nose, 2, 2, PK);
    /* zampine davanti */
    g.rect(hx - 3, by + 5, 4, 3, OUT); g.rect(hx - 2, by + 5, 2, 2, W1);
    if (pr) hearts(g, bx - 4, hy - 18, pet);
  }
}

/* ================= LABORATORIO ================= */
export function drawLabProps(g, rw, rh, time) {
  const t = time || 0, bx = rw / 2 - 54;
  /* lavagna con lo scheletro e le formule */
  boxr(g, bx, 4, 108, 42, '#8a5f38', 3);                                            // cornice della lavagna
  g.rect(bx + 4, 8, 100, 34, '#2e3d33'); g.rect(bx + 4, 8, 100, 2, '#27342b');
  const ch = '#e8e2d0';
  g.rect(bx + 12, 18, 10, 7, ch); g.rect(bx + 14, 20, 2, 2, '#2e3d33'); g.rect(bx + 22, 22, 22, 2, ch);
  for (let i = 0; i < 4; i++) g.rect(bx + 26 + i * 5, 24, 1, 6, ch);
  g.rect(bx + 24, 30, 1, 6, ch); g.rect(bx + 40, 30, 1, 6, ch); g.rect(bx + 44, 20, 8, 1, ch); g.rect(bx + 52, 18, 1, 3, ch);
  for (let i = 0; i < 3; i++) { g.rect(bx + 62, 14 + i * 8, 14, 1, '#cbbfa4'); g.rect(bx + 80, 14 + i * 8, 5 + i * 3, 1, '#cbbfa4'); }
  g.rect(bx + 90, 30, 8, 1, ch); g.rect(bx + 90, 37, 8, 1, ch); g.rect(bx + 90, 30, 1, 8, ch); g.rect(bx + 97, 30, 1, 8, ch);
  g.rect(bx + 2, 44, 104, 3, '#6b4a2e'); g.rect(bx + 20, 42, 6, 2, '#f3ecda'); g.rect(bx + 30, 42, 4, 2, '#e8a0b8');
  /* barattoli con gli esemplari (bollicine) */
  shelf(g, 18, 46, 68);
  for (let i = 0; i < 3; i++) {
    const jx = 22 + i * 21;
    boxr(g, jx, 24, 16, 22, '#bfe3ef', 4, { line: '#3f5a6a', dark: '#9cc8d8' });      // barattolo: vetro con spalle tonde
    disco(g, jx + 8, 23, 8, 3, '#5a5248');                                            // tappo
    g.rect(jx + 4, 31, 8, 10, ['#5fa04e', '#c65a54', '#8a6ab0'][i]); g.rect(jx + 5, 32, 2, 3, '#f3ecda');
    g.rect(jx + 2, 26, 2, 16, 'rgba(255,255,255,.5)');
    const jb = (Math.floor(t / 300) + i) % 5; g.px(jx + 11, 43 - jb * 3, '#e8f6fb');
  }
  /* scaffale delle pozioni */
  const shx = rw - 100;
  shelf(g, shx, 46, 84);
  [['#5a86c8', 14], ['#4e8d7c', 18], ['#c65a54', 12], ['#8a6ab0', 20], ['#e8c34a', 14]].forEach(([c, h], i) => bottle(g, shx + 6 + i * 16, 46 - h, 10, h, c, '#cfe8f2'));
  g.rect(shx + 4, 16, 76, 3, g.shade8('#8a5f38', 0.34)); g.rect(shx + 4, 16, 76, 1, '#8a5f38');
  for (let i = 0; i < 4; i++) { g.rect(shx + 10 + i * 18, 19, 1, 4, '#5a5248'); g.rect(shx + 7 + i * 18, 23, 8, 5, ['#7ec069', '#c9a227', '#8f9aa3', '#b8574a'][i]); }
}
function eggTankArt(g, x, y, time, egg, ready) {
  const W = 28, H = 32;
  g.shadow(x + 14, y + H + 10, 18);
  g.rect(x - 5, y + H, W + 10, 9, g.shade8('#5c4229', 0.34)); g.rect(x - 4, y + H + 1, W + 8, 7, '#5c4229'); g.rect(x - 4, y + H + 1, W + 8, 2, '#8a5f38');
  g.rect(x - 3, y - 5, W + 6, 6, g.shade8('#8f9aa3', 0.34)); g.rect(x - 2, y - 4, W + 4, 4, '#8f9aa3'); g.rect(x - 2, y - 4, W + 4, 1, '#dfe6ea');
  g.rect(x + 10, y - 9, 8, 5, '#5a5248');
  g.rect(x - 1, y, W + 2, H, '#3f5a6a');
  g.rect(x, y, W, H, ready ? '#dff4e0' : (egg ? '#cdeef2' : '#9fb0aa'));
  g.rect(x, y + H - 8, W, 8, ready ? '#c8ecca' : (egg ? '#b4e0e6' : '#8a9a94'));
  g.rect(x + 2, y + 2, 3, H - 6, 'rgba(255,255,255,.45)');
  if (egg) {
    const bob = Math.round(Math.sin(time / 480) * 3), ex = x + W / 2 - 5, ey = y + H / 2 - 8 + bob;
    g.rect(ex + 2, ey, 6, 1, '#8a5a1e'); g.rect(ex, ey + 1, 10, 13, '#8a5a1e'); g.rect(ex + 1, ey + 1, 8, 12, '#d8973c');
    g.rect(ex + 2, ey + 3, 2, 3, '#f2c53d'); g.px(ex + 6, ey + 8, '#b8752a');
    const b = Math.floor(time / 260) % 6; g.px(x + 6, y + H - 4 - b * 4, '#ffffff'); g.px(x + 21, y + H - 6 - ((b + 3) % 6) * 4, '#ffffff');
    if (ready) { const sp = Math.floor(time / 200) % 2; g.rect(ex - 5, ey + 2 + sp * 2, 1, 3, '#fff3c8'); g.rect(ex + 13, ey + 8 - sp * 2, 1, 3, '#fff3c8'); }
  }
  g.px(x + W - 4, y + H + 4, egg ? (ready ? '#7ec069' : '#e8c34a') : '#5a5248');
}
export function drawLabFloorProps(g, rw, rh, time, egg, ready, pet) {
  const t = time || 0, cx = rw / 2;
  /* sul bancone: fogli, calamaio, lente */
  g.rect(cx - 66, 64, 18, 8, '#8f887a'); g.rect(cx - 65, 64, 16, 7, '#f3ecda'); g.rect(cx - 62, 66, 10, 1, '#8f887a'); g.rect(cx - 62, 68, 8, 1, '#8f887a');
  g.rect(cx - 42, 64, 8, 7, g.shade8('#3f5a86', 0.34)); g.rect(cx - 41, 65, 6, 5, '#3f5a86'); g.rect(cx - 37, 56, 1, 9, '#f3ecda');
  g.rect(cx + 44, 60, 10, 10, g.shade8('#bfe3ef', 0.34)); g.rect(cx + 45, 61, 8, 8, '#bfe3ef'); g.rect(cx + 53, 68, 8, 3, '#8a5f38');
  /* postazione ALAMBICCO (24..96 × 92..136) */
  g.shadow(60, 136, 36);
  g.rect(24, 94, 72, 12, g.shade8('#6e4a2e', 0.34)); g.rect(25, 95, 70, 10, '#6e4a2e'); g.rect(25, 95, 70, 2, '#8a5f38');
  g.rect(22, 90, 76, 6, '#3f4448'); g.rect(23, 91, 74, 3, '#8f9aa3'); g.rect(23, 91, 74, 1, '#c9ced3');
  gamba(g, 28, 106, 6, 30, '#4a4640'); g.rect(86, 106, 6, 30, g.shade8('#4a4640', 0.34)); g.rect(29, 120, 62, 3, '#4a4640');
  boxr(g, 34, 124, 18, 10, '#bfe3ef', 3, { line: '#6e8f9c' }); g.rect(36, 128, 14, 5, '#8a6ab0');              // flacone sotto
  const fl = Math.floor(t / 160) % 2;
  g.rect(36, 82, 18, 8, g.shade8('#5a5248', 0.34)); g.rect(37, 83, 16, 6, '#5a5248');
  g.rect(41, 76 + fl, 8, 6 - fl, '#e8873a'); g.rect(43, 78, 4, 4, '#f6dc78'); g.px(44, 74 - fl, '#e8873a');
  /* l'AMPOLLA è una boccia di vetro: pancia tonda, liquido che segue la curva */
  disco(g, 45, 65, 12, 11, '#bfe3ef', { line: '#3f5a6a' });
  for (let k = 0; k < 12; k++) { const w2 = Math.round(12 * Math.sqrt(Math.max(0, 1 - ((k - 1) * (k - 1)) / 121))); if (w2 > 1) g.rect(45 - w2 + 1, 64 + k, w2 * 2 - 2, 1, k ? '#5fa04e' : '#7ec069'); }
  g.rect(40, 42, 10, 13, '#3f5a6a'); g.rect(41, 43, 8, 12, '#bfe3ef'); g.rect(38, 40, 14, 3, '#8f9aa3');
  g.rect(35, 56, 2, 14, 'rgba(255,255,255,.55)');
  const bb = Math.floor(t / 260) % 3; g.px(42, 70 - bb * 3, '#c8f0b0'); g.px(49, 67 - ((bb + 1) % 3) * 3, '#c8f0b0');
  for (let i = 0; i < 7; i++) g.rect(50 + i * 4, 44 + i * 2, 4, 2, '#8fb7c6');
  const drop = Math.floor(t / 340) % 4; g.px(78, 60 + drop * 3, '#8fd0e6');
  boxr(g, 72, 68, 18, 22, '#bfe3ef', 5, { line: '#3f5a6a', dark: '#9cc8d8' });
  for (let k = 0; k < 11; k++) { const w2 = 7 - Math.max(0, k - 8); g.rect(81 - w2, 78 + k, w2 * 2, 1, k ? '#8a6ab0' : '#b39ad4'); }
  /* banco da studio (224..296 × 92..136): microscopio, cranio, libro, candela */
  g.shadow(260, 136, 36);
  g.rect(224, 94, 72, 12, g.shade8('#8a5f38', 0.34)); g.rect(225, 95, 70, 10, '#8a5f38'); g.rect(225, 95, 70, 2, '#b07c4a');
  gamba(g, 228, 106, 6, 30, '#4a4640'); gamba(g, 286, 106, 6, 30, '#4a4640');
  g.rect(230, 106, 26, 20, g.shade8('#6e4a2e', 0.34)); g.rect(231, 107, 24, 18, '#6e4a2e'); g.rect(242, 114, 3, 3, '#c9a227');           // cassettiera
  g.rect(232, 86, 20, 6, '#1a1714'); g.rect(233, 87, 18, 4, '#3f3a33');
  g.rect(238, 64, 6, 24, '#1a1714'); g.rect(239, 65, 4, 22, '#5a5248'); g.rect(239, 65, 1, 22, '#8f887a');
  g.rect(236, 60, 10, 8, '#1a1714'); g.rect(237, 61, 8, 6, '#3f3a33'); g.px(240, 70, '#8fd0e6'); g.rect(234, 74, 14, 2, '#8f887a');
  g.rect(256, 74, 18, 16, g.shade8('#ece5d2', 0.34)); g.rect(257, 75, 16, 12, '#ece5d2'); g.rect(257, 75, 16, 2, '#f6f3ea'); g.rect(259, 87, 12, 3, '#cbbfa4');
  g.rect(260, 79, 3, 3, '#2a2016'); g.rect(267, 79, 3, 3, '#2a2016'); g.px(265, 84, '#2a2016');
  g.rect(276, 82, 20, 12, g.shade8('#f3ecda', 0.34)); g.rect(277, 83, 8, 10, '#f3ecda'); g.rect(286, 83, 8, 10, '#e8dcc0'); g.rect(285, 82, 1, 12, '#8a3f3a');
  for (let i = 0; i < 3; i++) { g.rect(279, 85 + i * 3, 5, 1, '#8f887a'); g.rect(287, 85 + i * 3, 5, 1, '#8f887a'); }
  candle(g, 250, 80, t);
  eggTankArt(g, 252, 148, t, egg, ready);
  /* fogli caduti */
  g.rect(200, 156, 14, 10, '#8f887a'); g.rect(201, 156, 12, 9, '#f3ecda'); g.rect(208, 168, 14, 10, '#8f887a'); g.rect(209, 168, 12, 9, '#ece5d2');
  g.rect(203, 159, 8, 1, '#8f887a'); g.rect(211, 171, 8, 1, '#8f887a');
  /* TANA del topolino nel battiscopa, con gli occhietti che brillano nel buio */
  g.rect(22, 194, 16, 12, '#2a2016'); g.rect(24, 196, 12, 10, '#140e0a'); g.rect(23, 193, 14, 2, '#6f685c');
  const mouseAt = (mx, my, up, face) => {                                        // topolino tondo: corpo a goccia, orecchie rotonde, coda a filo
    const c = critter(g, '#3a3430');
    c.line(mx + 5 * face, my + 3, mx + 12 * face, my + 4, 1.4, '#c0a8a0');
    c.oval(mx, my, 6, 4.5 + up, tone3('#b8b0a6', '#9a9288', '#7a7268'));
    c.oval(mx - 6 * face, my - 2 - up, 4, 3.2, tone3('#b8b0a6', '#9a9288', '#7a7268'));
    for (const e of [-1, 1]) c.oval(mx - 4 * face + e * 2, my - 6 - up, 2.2, 2.2, '#9a9288');
    c.paint();
    g.px(mx - 4 * face - 2, my - 6 - up, '#e0a8b0'); g.px(mx - 4 * face + 2, my - 6 - up, '#e0a8b0');
    g.px(mx - 7 * face, my - 3 - up, g.shade8('#e07a8a', 0.34)); g.px(mx - 10 * face, my - 2 - up, '#e07a8a');
  };
  const petMouse = pet && pet.kind === 'topo';
  const rt = (t / 1000) % 14, runX = rt < 2.2 ? 36 + (rt / 2.2) * 240 : null;
  if (petMouse) {
    /* se stava attraversando la stanza, il formaggio lo richiama: TORNA INDIETRO correndo fin lì (prima
       compariva di colpo accanto alla tana). Si ricorda da dove parte al primo fotogramma della coccola
       e la reazione si allunga del tempo della corsa. */
    if (pet.fromX == null) {
      pet.fromX = runX != null ? runX : 46;
      pet.run = Math.max(0, (pet.fromX - 46) / 150);            // secondi di corsa a 150 px/s
      pet.t += pet.run; pet.total = pet.t;
    }
    const el = pet.total - pet.t;
    if (el < pet.run) {
      const k = el / pet.run, x = Math.round(pet.fromX + (46 - pet.fromX) * k);
      mouseAt(x, 200 - (Math.floor(el * 12) % 2), 0, 1);
      g.rect(37, 197, 6, 5, g.shade8('#f2c53d', 0.34)); g.rect(38, 198, 4, 3, '#f2c53d'); g.px(39, 198, '#c9a227');
    } else {
      /* arrivato: si alza sulle zampine e sgranocchia il formaggio */
      const nib = Math.floor(pet.t * 8) % 2;
      mouseAt(46, 198, 1 + nib, 1);
      g.rect(37, 197, 6, 5, g.shade8('#f2c53d', 0.34)); g.rect(38, 198, 4, 3, '#f2c53d'); g.px(39, 198, '#c9a227');
      hearts(g, 43, 184, { t: Math.min(2.6, pet.t) });
    }
  } else if (Math.floor(t / 2200) % 3 !== 2) { g.px(27, 200, '#f2d080'); g.px(31, 200, '#f2d080'); }
  /* topolino che attraversa lungo il muro basso */
  if (runX != null && !petMouse) mouseAt(Math.round(runX), 200, 0, -1);
}

/* le finestre di ogni mestiere (x del vetro): dove non c'è nulla appeso */
export const SHOP_WINDOWS = {
  store: [36],
  inn: [64],
  barber: [62],
  tailor: [62],
  lab: [],
  furniture: [236],
};

/* ================= BOTTEGA D'ARREDO ================= */
export function drawFurnitureProps(g, rw, rh, time) {
  const t = time || 0;
  /* campionario di carte da parati appese a un'asta, dietro il bancone */
  const cx = rw / 2, x0 = cx - 54;
  g.rect(x0 - 4, 5, 116, 3, g.shade8('#8f9aa3', 0.34)); g.rect(x0 - 4, 5, 116, 1, '#8f9aa3'); g.rect(x0 - 6, 4, 3, 5, '#c9a227'); g.rect(x0 + 111, 4, 3, 5, '#c9a227');
  const carte = [
    ['#e7c9c4', 'rombi', '#d4a9a3'], ['#8fae7a', 'righe', '#7c9b68'], ['#bcd4de', 'fiocchi', '#f3ecda'],
    ['#e8dcc0', 'foglie', '#7ec069'], ['#c86a4a', 'blocchi', '#a8563a'], ['#5a5a9a', 'stelle', '#e8c34a'],
  ];
  carte.forEach(([c, motivo, c2], i) => {
    const sx = x0 + i * 18, h = 40 - (i % 2) * 6;
    g.rect(sx, 8, 16, h, g.shade8(c, 0.45)); g.rect(sx + 1, 8, 14, h - 1, c);
    for (let yy = 11; yy < 8 + h - 3; yy += 5) for (let xx = 3; xx < 14; xx += 5) {
      if (motivo === 'righe') g.rect(sx + xx, 9, 2, h - 3, c2);
      else if (motivo === 'rombi') { g.px(sx + xx, yy, c2); g.px(sx + xx - 1, yy + 1, c2); g.px(sx + xx + 1, yy + 1, c2); g.px(sx + xx, yy + 2, c2); }
      else if (motivo === 'blocchi') g.rect(sx + xx - 2, yy, 4, 3, c2);
      else if (motivo === 'foglie') { g.rect(sx + xx - 1, yy, 3, 2, c2); g.px(sx + xx, yy + 2, g.shade8(c2, 0.7)); }
      else g.px(sx + xx, yy + 1, c2);
    }
    /* il rotolo finisce ARROTOLATO e l'orlo ondeggia: erano quattordici pixel tagliati netti */
    g.rect(sx + 1, 8 + h - 3, 14, 3, g.shade8(c, 0.8));
    for (let k = 0; k < 14; k++) { const d = 1 + Math.round(Math.abs(Math.sin((k + i * 2) * 0.8)) * 2); g.rect(sx + 1 + k, 8 + h, 1, d, g.shade8(c, 0.62)); }
  });
  /* pannello degli attrezzi a sinistra: sega, martello, squadra, pialla */
  g.rect(18, 10, 70, 40, g.shade8('#b8955f', 0.34)); g.rect(19, 11, 68, 38, '#b8955f');
  for (let yy = 15; yy < 48; yy += 6) for (let xx = 23; xx < 86; xx += 6) g.px(xx, yy, '#8a6a3a');
  g.rect(24, 16, 22, 8, g.shade8('#c9ced3', 0.34)); g.rect(25, 17, 20, 6, '#c9ced3'); for (let i = 0; i < 20; i += 2) g.px(25 + i, 23, '#8f9aa3'); g.rect(44, 15, 6, 10, '#8a3f3a');   // sega
  g.rect(56, 14, 3, 20, '#6e4a2e'); g.rect(52, 13, 11, 5, g.shade8('#8f9aa3', 0.34)); g.rect(53, 14, 9, 3, '#8f9aa3');                                                                 // martello
  g.rect(68, 14, 2, 18, '#c9a227'); g.rect(68, 30, 14, 2, '#c9a227'); for (let i = 0; i < 16; i += 3) g.px(69, 16 + i, '#6b4f14');                                       // squadra
  g.rect(24, 34, 26, 9, g.shade8('#a97a4c', 0.34)); g.rect(25, 35, 24, 7, '#a97a4c'); g.rect(30, 32, 6, 4, '#6e4a2e'); g.rect(42, 33, 5, 3, '#8a3f3a');                                  // pialla
  g.rect(58, 38, 24, 4, '#e8c34a'); for (let i = 0; i < 24; i += 3) g.px(58 + i, 38, '#2a2016');                                                                        // metro
  /* orologio a muro in fondo a destra */
  g.rect(rw - 32, 12, 16, 16, g.shade8('#8a5f38', 0.34)); g.rect(rw - 31, 13, 14, 14, '#8a5f38'); g.rect(rw - 29, 15, 10, 10, '#f3ecda');
  const hh = Math.floor(t / 1000) % 4; g.rect(rw - 24, 17, 1, 4, '#2a2016'); g.rect(rw - 24 + (hh < 2 ? 0 : -3), 20, 4, 1, '#2a2016');
}
export function drawFurnitureFloorProps(g, rw, rh, time, _e, _r, pet) {
  const t = time || 0, cx = rw / 2;
  /* sul bancone: catalogo aperto, ventaglio di campioni di stoffa, matita, sedia in miniatura */
  g.rect(cx - 70, 62, 28, 9, g.shade8('#f3ecda', 0.34)); g.rect(cx - 69, 63, 13, 7, '#f3ecda'); g.rect(cx - 55, 63, 12, 7, '#e8dcc0'); g.rect(cx - 56, 62, 1, 9, '#8a3f3a');
  g.rect(cx - 67, 65, 5, 3, '#c65a54'); g.rect(cx - 61, 65, 4, 3, '#5a86c8'); g.rect(cx - 53, 65, 8, 1, '#8f887a'); g.rect(cx - 53, 67, 6, 1, '#8f887a');
  ['#c65a54', '#e8c34a', '#5fa04e', '#5a86c8', '#8a6ab0'].forEach((c, i) => { g.rect(cx - 30 + i * 4, 58 + Math.abs(2 - i), 6, 12 - Math.abs(2 - i), g.shade8(c, 0.55)); g.rect(cx - 29 + i * 4, 59 + Math.abs(2 - i), 4, 10 - Math.abs(2 - i), c); });
  g.rect(cx - 6, 66, 14, 2, '#e8c34a'); g.px(cx + 8, 66, g.shade8('#e8a0b8', 0.34)); g.px(cx - 6, 66, '#e8a0b8');
  g.rect(cx + 44, 56, 3, 14, '#6e4a2e'); g.rect(cx + 44, 62, 12, 3, '#a97a4c'); g.rect(cx + 53, 65, 3, 5, '#6e4a2e'); g.rect(cx + 44, 56, 3, 1, '#b07c4a');
  /* POLTRONA in esposizione su un tappeto, con lampada da terra (24..92 × 92..136) */
  boxr(g, 22, 112, 70, 26, '#b8574a', 4, { line: '#5c2a26', light: '#b8574a', dark: '#b8574a', piatto: true });
  boxr(g, 26, 116, 62, 18, '#a8453c', 3, { line: '#e0a24a', light: '#a8453c', dark: '#a8453c', piatto: true });
  for (let i = 25; i < 91; i += 3) { g.px(i, 111, '#e8dcc0'); g.px(i, 138, '#e8dcc0'); }
  g.shadow(48, 132, 20);
  boxr(g, 30, 91, 34, 25, '#5f9a52', 7, { line: '#2f4a2a', light: '#7ec069', dark: '#4a7f40' });   // schienale imbottito
  for (const bx of [39, 47, 55]) g.px(bx, 100, '#3f6a38');
  boxr(g, 26, 103, 9, 23, '#4f8a45', 4, { line: '#2f4a2a', light: '#7ec069' });                   // braccioli a rullo
  boxr(g, 60, 103, 9, 23, '#4f8a45', 4, { line: '#2f4a2a', light: '#7ec069' });
  boxr(g, 32, 111, 30, 13, '#6aa85c', 5, { line: '#2f4a2a', light: '#8fd07a', dark: '#4f8a45' }); // cuscino
  g.rect(28, 126, 4, 6, '#3a2a1c'); g.rect(62, 126, 4, 6, '#3a2a1c');
  boxr(g, 36, 88, 22, 6, '#f3ecda', 2); g.rect(44, 89, 6, 4, '#c9a227');                                        // cartellino del prezzo
  const on = Math.floor(t / 2000) % 5 !== 0;
  g.rect(80, 94, 1, 38, g.shade8('#8f887a', 0.34)); g.rect(81, 94, 1, 38, '#8f887a'); g.rect(75, 132, 12, 3, '#2a2016');
  /* PARALUME a tronco di cono: il rettangolo giallo sembrava una scatola accesa */
  for (let k = 0; k < 13; k++) { const w = 5 + k, y = 82 + k; g.rect(81 - w, y, w * 2, 1, g.shade8('#f6dc78', 0.34)); g.rect(81 - w + 1, y, w * 2 - 2, 1, k < 2 ? '#fff3c8' : (on ? '#f6dc78' : '#e8dcc0')); }
  if (on) g.rect(66, 96, 30, 14, 'rgba(255,230,150,.10)');
  /* BANCO DA FALEGNAME con morsa, pialla e trucioli (228..296 × 92..136) */
  g.shadow(262, 136, 36);
  gamba(g, 230, 108, 6, 28); gamba(g, 288, 108, 6, 28); g.rect(231, 126, 62, 3, '#4a3624');
  g.rect(226, 98, 72, 12, g.shade8('#c49a63', 0.34)); g.rect(227, 99, 70, 10, '#c49a63'); g.rect(227, 99, 70, 2, '#dcb880');
  for (let i = 0; i < 70; i += 12) g.rect(227 + i, 101, 1, 8, '#a97a4c');
  g.rect(222, 100, 8, 12, g.shade8('#5a5248', 0.34)); g.rect(223, 101, 6, 10, '#5a5248'); g.rect(218, 104, 5, 2, '#8f9aa3');                                    // morsa
  g.rect(236, 90, 30, 9, g.shade8('#e0b890', 0.34)); g.rect(237, 91, 28, 7, '#e0b890'); g.rect(237, 91, 28, 1, '#f3d8b0');                                     // asse sul banco
  g.rect(254, 84, 16, 8, g.shade8('#a97a4c', 0.34)); g.rect(255, 85, 14, 6, '#a97a4c'); g.rect(258, 82, 4, 3, '#6e4a2e');                                      // pialla
  const tr2 = Math.floor(t / 400) % 3;
  for (let i = 0; i < 3; i++) { const sx = 240 + i * 5 + tr2; g.rect(sx, 88 - i, 3, 1, '#f3d8b0'); g.px(sx + 3, 87 - i, '#e0b890'); }        // truciolo che esce
  g.rect(278, 88, 14, 10, g.shade8('#8a6ab0', 0.34)); g.rect(279, 89, 12, 8, '#8a6ab0'); g.rect(279, 89, 12, 2, '#a88ad0');                                     // barattolo di vernice
  g.rect(283, 80, 2, 10, '#6e4a2e'); g.rect(282, 78, 4, 3, '#e8dcc0');
  /* assi appoggiate al muro e trucioli sparsi */
  for (let i = 0; i < 3; i++) { g.rect(300 - i * 4, 150 + i * 2, 5, 50 - i * 2, g.shade8('#c49a63', 0.34)); g.rect(301 - i * 4, 151 + i * 2, 3, 48 - i * 2, ['#c49a63', '#a97a4c', '#dcb880'][i]); }
  for (let i = 0; i < 9; i++) { const x = 110 + (i * 41) % 110, y = 150 + (i * 29) % 44; g.rect(x, y, 3, 1, '#e0b890'); g.px(x + 3, y - 1, '#e0b890'); g.px(x - 1, y + 1, '#c49a63'); }
  /* SCOIATTOLO sul ceppo in basso a sinistra, con la ghianda: la coda a pennacchio; coccolato si alza e
     rigira la ghianda fra le zampine */
  {
    const t = time || 0, ps = pet && pet.kind === 'scoiattolo';
    g.shadow(38, 206, 16);
    g.rect(24, 190, 28, 16, g.shade8('#8a5f38', 0.34)); g.rect(25, 191, 26, 14, '#8a5f38'); g.rect(25, 189, 26, 4, g.shade8('#dcb880', 0.34)); g.rect(26, 190, 24, 2, '#dcb880'); g.rect(33, 190, 10, 2, '#c49a63');
    const up = ps ? 3 : 0, tw = Math.floor((ps ? pet.t * 8 : t / 700)) % 2;
    const c = critter(g, '#3a2418');
    c.oval(46, 174 - up - tw, 6, 11, tone3('#f0a060', '#d0742e', '#a8561e'));               // coda a pennacchio
    c.oval(48, 164 - up - tw, 4, 4, '#d0742e');                                               // ricciolo in cima
    c.oval(36, 182 - up, 6.5, 7, tone3('#d8803a', '#b55a26', '#8a4218'));                   // corpo
    c.oval(31, 172 - up, 5.5, 5, tone3('#d8803a', '#b55a26', '#8a4218'));                   // testa
    c.oval(28, 167 - up, 1.6, 2.2, '#b55a26'); c.oval(33, 166 - up, 1.6, 2.2, '#b55a26');     // orecchie
    c.paint();
    g.rect(34, 181 - up, 5, 7, '#f2d2a8');                                                    // pancia chiara
    g.rect(29, 171 - up, 2, 2, g.shade8('#ffffff', 0.34)); g.px(29, 171 - up, '#ffffff'); g.px(26, 174 - up, '#3a2418');
    const ax = ps ? 31 + (Math.floor(pet.t * 6) % 2) : 32;
    const a = critter(g, '#3a2418'); a.oval(ax + 2, 183 - up, 2.5, 3, '#b8843a'); a.paint(); g.rect(ax, 180 - up, 5, 2, '#6e4a2e');   // ghianda
    if (ps) hearts(g, 36, 156, pet);
  }
}

/* LA TARTARUGA DEL MUSEO — sta nell'atrio, accanto alla pianta: carapace a piastre, zampe
   corte, e quando la si coccola tira fuori il collo e sbatte gli occhi. Disegnata con lo
   stesso pennello degli altri animaletti (ovali e un contorno solo). Coordinate ASSOLUTE
   della galleria: chi chiama passa il punto dove poggia. */
export function drawMuseumPet(g, x, y, time, pet) {
  const t = time || 0, ps = pet && pet.kind === 'tartaruga';
  const resp = Math.round(Math.sin(t / 1400) * 1);                 // respiro lento
  const collo = ps ? 7 : 2 + Math.round(Math.sin(t / 1800) * 1);    // coccolata: allunga il collo
  g.shadow(x, y + 2, 16);
  const c = critter(g, '#3a2f1c');
  c.oval(x - collo - 12, y - 8 - resp, 4.5, 4, tone3('#a8c064', '#87a049', '#5f7a33'));      // testa, fuori dal guscio
  c.line(x - collo - 10, y - 8 - resp, x - 6, y - 8 - resp, 4, '#87a049');                    // collo
  c.oval(x, y - 10 - resp, 14, 8.5, tone3('#9a7a3a', '#7a5a26', '#553c18'));                 // carapace
  for (const dx of [-9, 9]) c.oval(x + dx, y - 2, 4, 2.6, tone3('#a8c064', '#87a049', '#5f7a33'));   // zampe
  c.oval(x + 13, y - 6, 3, 2, tone3('#a8c064', '#87a049', '#5f7a33'));                        // coda
  c.paint();
  /* piastre del carapace: esagoni scuri e bordo chiaro */
  for (const [dx, dy, r] of [[0, -12, 4], [-7, -10, 3], [7, -10, 3], [-3, -6, 3], [4, -6, 3]]) {
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      if (Math.abs(xx) + Math.abs(yy) > r + 1) continue;
      g.px(x + dx + xx, y + dy + yy - resp, Math.abs(xx) + Math.abs(yy) === r + 1 ? '#4a3418' : (xx + yy < -1 ? '#b08a44' : '#7a5a26'));
    }
  }
  /* occhio: chiuso quando sonnecchia, aperto quando la coccoli */
  const ex = x - collo - 13, ey = y - 9 - resp;
  if (ps && Math.floor(pet.t * 4) % 2) { g.rect(ex, ey, 2, 1, '#1a120a'); }
  else { g.rect(ex, ey - 1, 2, 2, g.shade8('#ffffff', 0.34)); g.px(ex, ey - 1, '#ffffff'); }
  if (ps) hearts(g, x - 4, y - 28, pet);
}
