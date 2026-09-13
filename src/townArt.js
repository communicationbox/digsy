/* ESTERNI DEGLI EDIFICI — le sette botteghe della città e la casa del giocatore, viste da fuori.
   Modulo puro: disegna col pennello che riceve (g.rect/px/shade8), la geometria (ingombro,
   porta, solidi) resta in world.js.

   Dopo aver ridisegnato gli interni, le meraviglie e il museo, gli esterni erano la cosa più
   vecchia sullo schermo: pareti di un colore, tetti di quattordici pixel, finestrelle da dieci.
   Qui ogni edificio ha le stesse regole del resto: materiali veri (intonaco, assi, pietra,
   graticcio, marmo), tetto con la gronda e il materiale della zona, zoccolo di pietra che lo
   appoggia a terra, finestre con telaio, davanzale e persiane, porta con gradino.

   Coordinate: (0,0) = angolo in alto a sinistra dell'ingombro; w, h in pixel (h = 64). Il
   disegno può salire sopra l'ingombro (tetti, comignoli, torretta), mai scendere sotto. */

const LN = '#241a10';
function sh(g, c, k) { return g.shade8(c, k); }

/* ---------- materiali della parete ---------- */
export function wallFace(g, x, y, w, h, base, kind) {
  g.rect(x - 1, y, w + 2, h, LN);
  g.rect(x, y, w, h, base);
  if (kind === 'planks') {
    for (let i = 0; i < w; i += 8) { g.rect(x + i, y, 1, h, sh(g, base, 0.74)); g.rect(x + i + 1, y, 1, h, sh(g, base, 1.1)); if ((i * 7) % 5 === 1) g.rect(x + i + 4, y + 6 + (i % 13), 2, 2, sh(g, base, 0.7)); }
  } else if (kind === 'stone') {
    for (let r = 0; r * 9 < h; r++) for (let c = -1; c * 16 < w; c++) {
      const bx = x + c * 16 + (r % 2) * 8, by = y + r * 9, bw = Math.min(15, x + w - bx), bx0 = Math.max(x, bx);
      if (bw <= 0) continue;
      const col = sh(g, base, [1, 0.92, 1.06][(r + c + 3) % 3]);
      g.rect(bx0, by, Math.min(15, x + w - bx0), 8, col); g.rect(bx0, by, Math.min(15, x + w - bx0), 1, sh(g, col, 1.15));
    }
    for (let r = 1; r * 9 < h; r++) g.rect(x, y + r * 9 - 1, w, 1, sh(g, base, 0.66));
  } else if (kind === 'timber') {                                  // graticcio: intonaco chiaro e travi scure
    for (const bx of [0, Math.round(w / 3), Math.round(2 * w / 3), w - 5]) g.rect(x + bx, y, 5, h, '#5c3d22');
    g.rect(x, y, w, 4, '#5c3d22'); g.rect(x, y + Math.round(h / 2) - 2, w, 4, '#5c3d22');
    for (let k = 0; k < Math.round(h / 2) - 4; k++) { g.rect(x + 5 + k, y + 4 + k, 3, 1, '#5c3d22'); g.rect(x + w - 8 - k, y + 4 + k, 3, 1, '#5c3d22'); }
  } else if (kind === 'tiles') {                                   // piastrelline chiare
    for (let r = 0; r * 6 < h; r++) g.rect(x, y + r * 6, w, 1, sh(g, base, 0.86));
    for (let r = 0; r * 6 < h; r++) for (let c = (r % 2) * 6; c < w; c += 12) g.rect(x + c, y + r * 6, 1, 6, sh(g, base, 0.86));
  } else if (kind === 'marble') {
    for (let r = 0; r * 16 < h; r++) g.rect(x, y + r * 16, w, 1, sh(g, base, 0.86));
  } else {                                                          // intonaco con qualche macchia
    for (let i = 0; i < 9; i++) g.rect(x + ((i * 37) % Math.max(1, w - 8)), y + ((i * 23) % Math.max(1, h - 6)), 6, 3, sh(g, base, i % 2 ? 0.95 : 1.05));
  }
  g.rect(x, y, 4, h, 'rgba(255,245,220,.18)'); g.rect(x + w - 6, y, 6, h, 'rgba(30,20,10,.20)');
}
/* zoccolo di pietra: la riga che appoggia l'edificio a terra */
export function foundation(g, x, y, w) {
  g.rect(x - 2, y, w + 4, 8, LN);
  for (let i = 0; i < w + 2; i += 10) { const c = ['#8f887a', '#9a9285', '#7f776a'][(i / 10) % 3]; g.rect(x - 1 + i, y + 1, Math.min(9, w + 2 - i), 6, c); g.rect(x - 1 + i, y + 1, Math.min(9, w + 2 - i), 1, '#b5ad9e'); }
}
/* ---------- tetto visto di fronte, con la gronda che sporge ---------- */
export function roof(g0, x, y, w, h, BB) {
  /* il motivo delle tegole si ripete a passo fisso: tutto resta dentro la falda */
  const L = x - 6, Rr = x + w + 6;
  const g = { shade8: g0.shade8, px: (px2, py2, c) => { if (px2 >= L && px2 < Rr) g0.px(px2, py2, c); },
    rect: (rx, ry, rw, rh, c) => { const a = Math.max(rx, L - 1), b = Math.min(rx + rw, Rr + 1); if (b > a) g0.rect(a, ry, b - a, rh, c); } };
  const r1 = BB.roof, r2 = BB.roof2 || sh(g, BB.roof, 1.2);
  g.rect(x - 7, y + h, w + 14, 4, 'rgba(20,12,6,.35)');              // ombra della gronda sul muro
  g.rect(x - 7, y - 1, w + 14, h + 2, LN);
  g.rect(x - 6, y, w + 12, h, r1);
  const d = sh(g, r1, 0.72), l = sh(g, r2, 1.1);
  switch (BB.mat) {
    case 'coppi': for (let r = 0; r * 6 < h; r++) for (let i = (r % 2) * 5; i < w + 12; i += 10) { g.rect(x - 6 + i, y + r * 6 + 3, 7, 3, d); g.rect(x - 6 + i, y + r * 6, 7, 2, l); } break;
    case 'stone': for (let r = 0; r * 7 < h; r++) { g.rect(x - 6, y + r * 7 + 6, w + 12, 1, d); for (let i = (r % 2) * 7; i < w + 12; i += 14) g.rect(x - 6 + i, y + r * 7, 1, 6, d); } break;
    case 'shingle': for (let r = 0; r * 5 < h; r++) { g.rect(x - 6, y + r * 5 + 4, w + 12, 1, d); for (let i = (r % 2) * 4; i < w + 12; i += 8) { g.rect(x - 6 + i, y + r * 5, 1, 4, d); g.px(x - 5 + i, y + r * 5, l); } } break;
    case 'tile': for (let r = 0; r * 6 < h; r++) { g.rect(x - 6, y + r * 6 + 5, w + 12, 1, d); for (let i = 0; i < w + 12; i += 6) g.rect(x - 6 + i, y + r * 6, 1, 5, d); } break;
    case 'slate': for (let r = 0; r * 6 < h; r++) { g.rect(x - 6, y + r * 6 + 5, w + 12, 1, d); for (let i = (r & 1) * 9; i < w + 12; i += 18) g.rect(x - 6 + i, y + r * 6, 1, 5, d); g.px(x - 2 + ((r * 7) % (w + 4)), y + r * 6 + 1, l); } break;
    case 'thatch': for (let i = 0; i < w + 12; i += 3) { g.rect(x - 6 + i, y, 2, h + (i % 9 ? 0 : 3), i % 6 ? d : l); } break;
    default: for (let r = 0; r * 6 < h; r++) g.rect(x - 6, y + r * 6 + 5, w + 12, 1, d);
  }
  g.rect(x - 6, y, w + 12, 3, l); g.rect(x - 6, y, w + 12, 1, sh(g, l, 1.15));                    // colmo
  g.rect(x - 6, y + h - 3, w + 12, 3, sh(g, r1, 0.55));                                           // gronda
  if (BB.snow) { g.rect(x - 8, y - 3, w + 16, 5, '#eef7fa'); for (let i = 0; i < w + 12; i += 9) g.rect(x - 6 + i, y + 2, 4, 2 + (i % 3), '#dfeef2'); }
}
/* ---------- finestra con telaio, davanzale, persiane ---------- */
export function windowBox(g, x, y, w, h, glass, shutter, night) {
  if (shutter) for (const sx of [x - 7, x + w + 1]) { g.rect(sx, y - 1, 6, h + 2, LN); g.rect(sx + 1, y, 4, h, shutter); for (let k = 3; k < h; k += 4) g.rect(sx + 1, y + k, 4, 1, sh(g, shutter, 0.7)); }
  g.rect(x - 1, y - 1, w + 2, h + 2, LN);
  g.rect(x, y, w, h, '#f3ecda');
  g.rect(x + 2, y + 2, w - 4, h - 4, glass);
  if (night) g.rect(x + 2, y + 2, w - 4, h - 4, 'rgba(255,220,120,.35)');
  else { g.rect(x + 3, y + 3, 2, h - 7, 'rgba(255,255,255,.7)'); g.rect(x + 6, y + 3, 1, 3, 'rgba(255,255,255,.6)'); }
  g.rect(x + (w >> 1) - 1, y + 2, 2, h - 4, '#f3ecda'); g.rect(x + 2, y + (h >> 1) - 1, w - 4, 2, '#f3ecda');
  g.rect(x - 3, y + h, w + 6, 3, '#8f887a'); g.rect(x - 3, y + h, w + 6, 1, '#c4bdb0');
}
/* fioriera sotto una finestra */
export function flowerBox(g, x, y, w, flowers) {
  g.rect(x - 1, y, w + 2, 6, LN); g.rect(x, y + 1, w, 4, '#8a5f38'); g.rect(x, y + 1, w, 1, '#b07c4a');
  for (let i = 2; i < w - 2; i += 4) { g.rect(x + i, y - 3, 3, 3, '#4e8d3f'); g.px(x + i + 1, y - 4, (flowers || ['#e2604f', '#f2c53d', '#e8a0b8'])[(i >> 2) % 3]); }
}
/* ---------- porta con telaio, gradino, maniglia ---------- */
export function door(g, cx, bottom, c1, c2, arched) {
  const w = 22, h = 30, x = cx - w / 2, y = bottom - h - 3;
  g.rect(x - 4, y - 4, w + 8, h + 4, LN); g.rect(x - 3, y - 3, w + 6, h + 3, '#8f887a'); g.rect(x - 3, y - 3, w + 6, 1, '#c4bdb0');   // stipite di pietra
  if (arched) { g.rect(x - 1, y - 6, w + 2, 4, LN); g.rect(x, y - 5, w, 3, '#8f887a'); }
  g.rect(x, y, w, h, c1);
  g.rect(x + 2, y + 2, w - 4, h - 2, c2);
  g.rect(x + 4, y + 4, (w >> 1) - 5, 10, sh(g, c2, 1.2)); g.rect(x + (w >> 1) + 1, y + 4, (w >> 1) - 5, 10, sh(g, c2, 1.2));
  g.rect(x + 4, y + 17, (w >> 1) - 5, 9, sh(g, c2, 1.2)); g.rect(x + (w >> 1) + 1, y + 17, (w >> 1) - 5, 9, sh(g, c2, 1.2));
  g.rect(x + (w >> 1) - 1, y + 2, 2, h - 2, sh(g, c2, 0.7));
  g.rect(x + w - 6, y + 15, 3, 3, '#e8c34a'); g.px(x + w - 6, y + 15, '#fff3c8');
  g.rect(x - 5, bottom - 3, w + 10, 3, '#7f776a'); g.rect(x - 5, bottom - 3, w + 10, 1, '#b5ad9e');                                  // gradino
}
/* tenda a strisce con la frangia */
export function awning(g, x, y, w, c1, c2) {
  g.rect(x - 3, y - 1, w + 6, 12, LN);
  for (let i = 0; i < w + 4; i += 8) { g.rect(x - 2 + i, y, 4, 10, c1); g.rect(x + 2 + i, y, 4, 10, c2); }
  g.rect(x - 2, y, w + 4, 2, 'rgba(255,255,255,.25)');
  for (let i = 0; i < w + 4; i += 8) { g.rect(x - 2 + i, y + 10, 4, 3, sh(g, c1, 0.8)); g.rect(x + 2 + i, y + 10, 4, 2, sh(g, c2, 0.85)); }
}
/* lanterna a muro */
export function wallLamp(g, x, y, night) {
  g.rect(x, y, 6, 2, LN); g.rect(x + 1, y + 2, 4, 7, LN); g.rect(x + 2, y + 3, 2, 5, night ? '#ffe08a' : '#e8c34a');
  if (night) g.rect(x - 4, y - 2, 14, 14, 'rgba(255,220,120,.2)');
}
/* insegna appesa a una staffa, con l'icona del mestiere (disegnata da chi chiama) */
export function hangingSign(g, x, y) {
  g.rect(x - 2, y, 20, 2, LN); g.rect(x + 2, y + 2, 1, 4, LN); g.rect(x + 13, y + 2, 1, 4, LN);
  g.rect(x - 1, y + 6, 18, 14, LN); g.rect(x, y + 7, 16, 12, '#d9b98a'); g.rect(x, y + 7, 16, 2, '#efe0bd');
}

/* ================= gli edifici ================= */
function base(g, w, h, wallCol, kind, BB, top) {
  g.rect(4, h - 2, w - 8, 6, 'rgba(20,14,8,.25)');
  wallFace(g, 3, top, w - 6, h - top - 6, wallCol, kind);
  foundation(g, 3, h - 8, w - 6);
}

export function drawStoreFront(g, w, h, BB, glass, night) {
  base(g, w, h, '#7fa06a', 'planks', BB, 18);
  roof(g, 3, -6, w - 6, 22, BB);
  awning(g, 6, 20, w - 12, '#c65a54', '#f1e6cc');
  windowBox(g, 10, 36, 22, 16, glass, null, night);
  g.rect(12, 46, 6, 6, '#b98d59'); g.rect(20, 44, 6, 8, '#8a5f38'); g.rect(26, 47, 4, 5, '#e8c34a');
  door(g, w / 2, h - 5, '#6e4a2e', '#5c3d22');
  /* cassette di frutta e un sacco fuori */
  g.rect(w - 30, h - 20, 16, 12, LN); g.rect(w - 29, h - 19, 14, 10, '#b98d59'); g.rect(w - 29, h - 19, 14, 2, '#d9b98a');
  for (let i = 0; i < 3; i++) { g.rect(w - 28 + i * 4, h - 23, 4, 4, ['#c65a54', '#e8c34a', '#7ec069'][i]); }
  g.rect(w - 12, h - 18, 9, 11, LN); g.rect(w - 11, h - 17, 7, 9, '#d8b58a'); g.rect(w - 10, h - 20, 5, 3, '#c9a06a');
  wallLamp(g, w / 2 + 16, 30, night);
}
export function drawInnFront(g, w, h, BB, glass, night) {
  base(g, w, h, '#efe2c4', 'timber', BB, -8);
  roof(g, 3, -28, w - 6, 22, BB);
  g.rect(12, -44, 10, 20, LN); g.rect(13, -43, 8, 18, '#9a8874'); g.rect(13, -43, 8, 3, '#b5a592');                                 // comignolo
  g.rect(15, -50, 4, 4, 'rgba(220,215,205,.6)'); g.rect(18, -56, 5, 5, 'rgba(230,225,215,.45)');
  for (const wx of [12, w / 2 - 9, w - 30]) { windowBox(g, wx, 2, 18, 13, glass, '#8a3f3a', night); flowerBox(g, wx - 1, 18, 20); }
  windowBox(g, 12, 34, 16, 14, glass, null, night); windowBox(g, w - 28, 34, 16, 14, glass, null, night);
  door(g, w / 2, h - 5, '#5c3d22', '#4c3018', true);
  wallLamp(g, w / 2 + 16, 32, night);
  /* insegna col boccale su una staffa */
  g.rect(w - 10, 24, 12, 2, LN); g.rect(w - 2, 26, 1, 4, LN);
  g.rect(w - 10, 30, 14, 12, LN); g.rect(w - 9, 31, 12, 10, '#d9b98a'); g.rect(w - 6, 33, 5, 6, '#c9a06a'); g.rect(w - 6, 33, 5, 2, '#f3ecda');
}
export function drawBarberFront(g, w, h, BB, glass, night) {
  base(g, w, h, '#eef4f6', 'tiles', BB, 18);
  roof(g, 3, -6, w - 6, 22, BB);
  awning(g, 6, 20, w - 12, '#5a86c8', '#f3ecda');
  windowBox(g, 9, 36, 22, 16, glass, null, night);
  g.rect(15, 44, 10, 6, '#c65a54'); g.rect(17, 40, 6, 4, '#c65a54'); g.rect(19, 50, 2, 2, '#8f9aa3');                               // poltrona in vetrina
  door(g, w / 2 - 6, h - 5, '#5b7e99', '#3d5a72');
  /* il palo del barbiere accanto alla porta */
  const px0 = w / 2 + 12;
  g.rect(px0 - 1, h - 42, 10, 36, LN); g.rect(px0, h - 41, 8, 34, '#f3ecda');
  for (let i = 0; i < 34; i += 6) { g.rect(px0, h - 41 + i, 8, 3, '#c65a54'); g.rect(px0, h - 38 + i, 4, 2, '#5a86c8'); }
  g.rect(px0 - 2, h - 44, 12, 4, '#8f9aa3'); g.rect(px0 - 2, h - 8, 12, 3, '#8f9aa3'); g.rect(px0 + 2, h - 47, 4, 3, '#c9a227');
}
export function drawTailorFront(g, w, h, BB, glass, night) {
  base(g, w, h, '#f2e4ea', 'plaster', BB, 18);
  roof(g, 3, -6, w - 6, 22, BB);
  /* tenda a smerlo */
  g.rect(4, 19, w - 8, 8, LN); g.rect(5, 20, w - 10, 6, '#b06a8c');
  for (let i = 5; i < w - 6; i += 8) { g.rect(i, 26, 8, 3, '#b06a8c'); g.rect(i + 2, 29, 4, 1, '#8c4e6c'); }
  /* vetrina a bovindo col manichino */
  g.rect(7, 33, 30, 24, LN); g.rect(8, 34, 28, 22, '#f3ecda'); g.rect(10, 36, 24, 18, glass);
  g.rect(19, 38, 6, 3, '#e0c49a'); g.rect(17, 41, 10, 10, '#e8a0b8'); g.rect(21, 51, 2, 3, '#5a5248');
  if (!night) g.rect(11, 37, 2, 14, 'rgba(255,255,255,.7)');
  g.rect(6, 56, 32, 3, '#8f887a');
  door(g, w / 2 + 6, h - 5, '#8c5a74', '#6a4056');
  /* rotoli di stoffa fuori */
  for (let i = 0; i < 3; i++) { g.rect(w - 22 + i * 6, h - 30 + i * 2, 6, 22 - i * 2, LN); g.rect(w - 21 + i * 6, h - 29 + i * 2, 4, 20 - i * 2, ['#8fd0a0', '#e2604f', '#5a86c8'][i]); }
}
export function drawLabFront(g, w, h, BB, glass, night) {
  base(g, w, h, '#b7b7a8', 'stone', BB, 20);
  roof(g, 3, -2, w - 6, 22, { ...BB, roof: '#5f7a52', roof2: '#78966a', mat: 'tile' });
  /* torretta tonda con l'osservatorio */
  const tx = w - 30;
  g.rect(tx - 1, -30, 24, 34, LN); wallFace(g, tx, -30, 22, 34, '#a8a898', 'stone');
  g.rect(tx - 4, -38, 30, 9, LN); g.rect(tx - 3, -37, 28, 7, '#5f7a52'); g.rect(tx - 3, -37, 28, 2, '#78966a');
  g.rect(tx + 5, -24, 12, 12, LN); g.rect(tx + 6, -23, 10, 10, night ? '#ffe08a' : '#8fd0e6'); g.rect(tx + 10, -23, 2, 10, '#5a5248'); g.rect(tx + 6, -19, 10, 2, '#5a5248');
  g.rect(tx + 8, -50, 4, 12, LN); g.rect(tx + 9, -49, 2, 10, '#8f9aa3');                                                              // antenna
  g.rect(12, -18, 8, 20, LN); g.rect(13, -17, 6, 18, '#8f887a'); g.rect(14, -26, 5, 6, 'rgba(160,230,170,.6)'); g.rect(17, -34, 6, 6, 'rgba(180,240,190,.45)');  // camino col fumo verde
  windowBox(g, 10, 34, 16, 14, glass, null, night);
  door(g, w / 2, h - 5, '#5f7a52', '#3f5434', true);
  /* casse di fiale fuori */
  g.rect(w - 22, h - 18, 16, 10, LN); g.rect(w - 21, h - 17, 14, 8, '#a97a4c');
  for (let i = 0; i < 3; i++) { g.rect(w - 19 + i * 4, h - 22, 3, 6, LN); g.rect(w - 19 + i * 4, h - 21, 2, 4, ['#5fa04e', '#5a86c8', '#c65a54'][i]); }
}
export function drawFurnitureFront(g, w, h, BB, glass, night) {
  base(g, w, h, '#c9a07a', 'planks', BB, 18);
  roof(g, 3, -6, w - 6, 22, BB);
  g.rect(6, 26, 30, 28, LN); g.rect(7, 27, 28, 26, '#6e4a2e'); g.rect(9, 29, 24, 22, glass);
  g.rect(13, 38, 16, 9, '#5f9a52'); g.rect(12, 40, 3, 9, '#4f8a45'); g.rect(27, 40, 3, 9, '#4f8a45'); g.rect(15, 43, 12, 4, '#7ec069');
  if (!night) g.rect(10, 30, 2, 18, 'rgba(255,255,255,.7)');
  g.rect(5, 53, 32, 3, '#8f887a');
  door(g, w / 2 + 4, h - 5, '#6e4a2e', '#5c3d22');
  for (let i = 0; i < 3; i++) { g.rect(w - 14 + i * 3, h - 36 + i * 2, 4, 30 - i * 2, LN); g.rect(w - 13 + i * 3, h - 35 + i * 2, 2, 28 - i * 2, ['#b07c4a', '#8a5f38', '#d0ae82'][i]); }
  g.rect(w - 28, h - 18, 12, 3, '#8a5f38'); g.rect(w - 28, h - 15, 2, 8, '#5c4229'); g.rect(w - 18, h - 15, 2, 8, '#5c4229'); g.rect(w - 28, h - 28, 2, 10, '#5c4229');
}
export function drawMuseumFront(g, w, h, BB, glass, night) {
  g.rect(4, h - 2, w - 8, 6, 'rgba(20,14,8,.25)');
  wallFace(g, 6, 22, w - 12, h - 30, '#e8e2d0', 'marble');
  /* scalinata */
  for (let i = 0; i < 3; i++) { g.rect(2 + i * 3, h - 8 + i * 3, w - 4 - i * 6, 3, LN); g.rect(3 + i * 3, h - 8 + i * 3, w - 6 - i * 6, 2, ['#d9d0bb', '#e8e2d0', '#f4eedf'][i]); }
  /* frontone */
  for (let k = 0; k < 30; k++) { const ww = Math.round((w + 10) * (k / 30)); g.rect(Math.round(w / 2 - ww / 2), -10 + k, ww, 1, k === 29 ? LN : k < 2 ? LN : '#e8e2d0'); }
  for (let k = 4; k < 26; k++) { const ww = Math.round((w - 14) * ((k - 4) / 22)); g.rect(Math.round(w / 2 - ww / 2), -10 + k + 2, ww, 1, '#d9d0bb'); }
  g.rect(w / 2 - 12, 6, 24, 6, '#c9a227'); g.rect(w / 2 - 14, 7, 4, 4, '#c9a227'); g.rect(w / 2 + 10, 7, 4, 4, '#c9a227');             // osso in rilievo
  g.rect(-4, 18, w + 8, 7, LN); g.rect(-3, 19, w + 6, 5, '#c9a227'); g.rect(-3, 19, w + 6, 1, '#f0d470');                             // architrave d'oro
  if (BB.snow) { g.rect(-4, 15, w + 8, 3, '#eef7fa'); }
  /* colonne scanalate */
  for (let i = 0; i < 6; i++) {
    const cx = 14 + Math.round(i * (w - 28) / 5);
    if (Math.abs(cx - w / 2) < 18) continue;
    g.rect(cx - 6, 25, 12, h - 33, LN); g.rect(cx - 5, 25, 10, h - 33, '#f4eedf');
    g.rect(cx - 5, 25, 3, h - 33, '#fbf8ef'); g.rect(cx + 3, 25, 2, h - 33, '#c9c0a8');
    for (const f of [-2, 1]) g.rect(cx + f, 29, 1, h - 41, '#d9d0bb');
    g.rect(cx - 7, 24, 14, 4, '#d9d0bb'); g.rect(cx - 7, h - 12, 14, 4, '#c4baa2');
  }
  /* portale */
  g.rect(w / 2 - 14, h - 40, 28, 32, LN); g.rect(w / 2 - 12, h - 38, 24, 30, '#23232c'); g.rect(w / 2 - 12, h - 38, 24, 3, '#3a3a44');
  if (night) g.rect(w / 2 - 12, h - 30, 24, 22, 'rgba(255,220,140,.25)');
  /* stendardi ai lati del portale */
  for (const bx of [w / 2 - 26, w / 2 + 20]) { g.rect(bx - 1, 28, 8, 20, LN); g.rect(bx, 29, 6, 18, '#8a3f3a'); g.rect(bx + 2, 34, 2, 6, '#c9a227'); }
}
export function drawHouseFront(g, w, h, BB, glass, night) {
  base(g, w, h, '#d8a878', 'plaster', BB, 18);
  roof(g, 3, -8, w - 6, 26, BB);
  g.rect(w - 26, -24, 10, 18, LN); g.rect(w - 25, -23, 8, 16, '#9a8874'); g.rect(w - 25, -23, 8, 3, '#b5a592');
  g.rect(w - 23, -30, 4, 4, 'rgba(220,215,205,.6)');
  /* finestra tonda */
  const rx = w - 24, ry = 38;
  for (let yy = -8; yy <= 8; yy++) { const ww = Math.round(Math.sqrt(64 - yy * yy)); g.rect(rx - ww - 1, ry + yy, ww * 2 + 3, 1, LN); }
  for (let yy = -7; yy <= 7; yy++) { const ww = Math.round(Math.sqrt(49 - yy * yy)); g.rect(rx - ww, ry + yy, ww * 2 + 1, 1, '#f3ecda'); }
  for (let yy = -5; yy <= 5; yy++) { const ww = Math.round(Math.sqrt(25 - yy * yy)); g.rect(rx - ww, ry + yy, ww * 2 + 1, 1, night ? '#ffdf8a' : glass); }
  g.rect(rx - 5, ry, 11, 1, '#f3ecda'); g.rect(rx, ry - 5, 1, 11, '#f3ecda');
  windowBox(g, 12, 32, 16, 13, glass, '#5f7a52', night); flowerBox(g, 10, 48, 20);
  door(g, w / 2, h - 5, '#8a5f38', '#6e4a2e', true);
  wallLamp(g, w / 2 - 22, 28, night);
}

export const FRONTS = {
  store: drawStoreFront, inn: drawInnFront, barber: drawBarberFront, tailor: drawTailorFront,
  lab: drawLabFront, furniture: drawFurnitureFront, museum: drawMuseumFront, house: drawHouseFront,
};
