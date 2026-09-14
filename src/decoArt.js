/* ARREDO URBANO E RITROVAMENTI — fontana, panchina, cespuglio, lampione, bacheca, statua del
   nonno, cassetta della posta, affioramento d'ossa. Modulo puro: disegna col pennello che riceve.

   Erano i primi disegni "nativi" del gioco, fatti raddoppiando i numeri di quelli a 16 pixel:
   giusti di scala ma con due toni e senza contorno, e accanto alle case nuove sembravano
   segnaposto. Qui hanno contorno scuro, luce e ombra, materiali (pietra, ferro battuto,
   legno) e l'appoggio a terra. Coordinate: (0,0) = angolo in alto a sinistra della casella;
   il disegno può salire sopra la casella, non allargarsi oltre le sue colonne. */

const LN = '#241a10';
function disc(g, cx, cy, r, c) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); g.rect(cx - w, cy + y, w * 2 + 1, 1, c); } }
function ellipse(g, cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); if (w > 0) g.rect(cx - w, cy + y, w * 2, 1, c); } }
function shadowE(g, cx, cy, rx, ry) { ellipse(g, cx, cy, rx, ry, 'rgba(20,16,10,.18)'); }

/* FONTANA (2×2 caselle): vasca tonda di pietra, zampillo a coppa, riflessi, monetine */
export function fountainArt(g, time) {
  const cx = 32, cy = 42;
  shadowE(g, cx + 2, 60, 30, 5);
  ellipse(g, cx, cy + 4, 31, 17, LN); ellipse(g, cx, cy + 3, 30, 16, '#8f887a'); ellipse(g, cx, cy + 1, 30, 15, '#b8b0a2');           // bordo
  ellipse(g, cx - 4, cy - 3, 20, 5, '#d6cfbf');
  ellipse(g, cx, cy + 2, 24, 11, LN); ellipse(g, cx, cy + 2, 23, 10, '#3f7fa8'); ellipse(g, cx, cy + 3, 21, 8, '#4d8fb5'); ellipse(g, cx + 2, cy + 5, 15, 5, '#5ca6c8');  // acqua
  const t = time / 1000;
  for (let i = 0; i < 3; i++) {                                                          // cerchi che si allargano
    const k = (t * 0.22 + i / 3) % 1, rx = 4 + Math.round(k * 16), ry = 2 + Math.round(k * 6), a = (0.6 * (1 - k)).toFixed(2);
    for (let q = 0; q < 20; q++) { const ang = (q / 20) * Math.PI * 2; g.rect(cx + Math.round(Math.cos(ang) * rx), cy + 3 + Math.round(Math.sin(ang) * ry), 2, 1, 'rgba(210,240,250,' + a + ')'); }
  }
  for (const [x, y] of [[cx - 12, cy + 6], [cx + 10, cy + 8], [cx + 4, cy - 1]]) { g.rect(x, y, 3, 2, '#c9a227'); if (Math.floor(time / 600 + x) % 3 === 0) g.px(x, y, '#fff3a0'); }   // monetine
  /* colonna con la coppa */
  g.rect(cx - 5, cy - 16, 10, 20, LN); g.rect(cx - 4, cy - 16, 8, 19, '#b8b0a2'); g.rect(cx - 4, cy - 16, 3, 19, '#d6cfbf'); g.rect(cx + 2, cy - 16, 2, 19, '#8f887a');
  ellipse(g, cx, cy - 18, 12, 4, LN); ellipse(g, cx, cy - 19, 11, 3, '#b8b0a2'); ellipse(g, cx, cy - 19, 8, 2, '#4d8fb5');
  g.rect(cx - 2, cy - 30, 4, 10, LN); g.rect(cx - 1, cy - 30, 2, 10, '#c9c2b4');
  /* zampilli che ricadono nella vasca */
  const j = (time / 2200) % 1;                                                      // lento: una fontana, non un idrante
  for (const side of [-1, 1]) for (let k = 0; k < 14; k++) {
    const u = ((k / 14) + j) % 1, x = cx + side * Math.round(u * 16), y = cy - 32 + Math.round(u * u * 34);
    g.rect(x, y, 2, 2, u < 0.5 ? '#e8f6fb' : '#bfe9f4');
  }
  g.rect(cx - 1, cy - 36, 2, 6, '#e8f6fb');
}

/* PANCHINA: assi di legno su gambe di ferro battuto */
export function benchArt(g) {
  shadowE(g, 16, 28, 14, 3);
  for (const lx of [4, 25]) { g.rect(lx, 12, 3, 17, LN); g.rect(lx, 25, 5, 3, LN); }                                             // gambe e piedi di ferro
  g.rect(2, 4, 28, 9, LN); g.rect(3, 5, 26, 3, '#c79a66'); g.rect(3, 9, 26, 3, '#b8895a'); g.rect(3, 5, 26, 1, '#e0c090');       // schienale a due assi
  g.rect(1, 15, 30, 9, LN); g.rect(2, 16, 28, 3, '#dcb27e'); g.rect(2, 20, 28, 3, '#c79a66'); g.rect(2, 16, 28, 1, '#f0cc98');   // seduta a due assi
  for (const x of [10, 22]) { g.px(x, 6, '#8a5f38'); g.px(x + 1, 17, '#a97a4c'); }
  for (const ax of [1, 28]) { g.rect(ax, 9, 3, 2, LN); g.rect(ax, 11, 3, 5, LN); }                                               // braccioli
}

/* CESPUGLIO: grumi tondi con luce, bacche */
export function bushArt(g) {
  shadowE(g, 16, 28, 13, 3);
  const blobs = [[10, 20, 8], [22, 20, 8], [16, 13, 9], [9, 14, 6], [23, 14, 6]];
  for (const [x, y, r] of blobs) disc(g, x, y, r + 1, '#1f4a26');
  for (const [x, y, r] of blobs) { disc(g, x, y, r, '#3f8a4a'); disc(g, x - 2, y - 2, Math.round(r * 0.6), '#54ab5f'); disc(g, x - 3, y - 4, Math.round(r * 0.25), '#7cd07f'); }
  for (const [x, y, c] of [[12, 18, '#e05a7a'], [20, 14, '#f2dd7a'], [8, 13, '#e05a7a'], [24, 20, '#e05a7a']]) { g.rect(x, y, 2, 2, c); g.px(x, y, '#ffffff'); }
}

/* LAMPIONE di ferro battuto: base, palo scanalato, braccio a ricciolo, lanterna a gabbia */
export function lampArt(g, night) {
  shadowE(g, 16, 30, 7, 2);
  g.rect(11, 26, 10, 5, LN); g.rect(12, 26, 8, 3, '#5a5248');
  g.rect(14, 2, 5, 25, LN); g.rect(15, 2, 3, 24, '#5a5248'); g.rect(15, 2, 1, 24, '#847a6c');
  g.rect(12, 14, 9, 2, LN);                                                                                                        // anello
  g.rect(9, -10, 15, 3, LN); g.rect(10, -9, 13, 1, '#847a6c');                                                                     // cappello
  g.rect(15, -12, 3, 3, LN);
  g.rect(10, -7, 13, 11, LN);
  g.rect(11, -6, 11, 9, night ? '#ffe08a' : '#c9d6d8');
  if (!night) g.rect(12, -5, 2, 7, 'rgba(255,255,255,.7)');
  g.rect(16, -6, 1, 9, LN);
  g.rect(10, 4, 13, 2, LN);
  if (night) { ellipse(g, 16, -2, 12, 10, 'rgba(255,220,120,.18)'); g.rect(14, -4, 5, 5, '#fff6c8'); }
}

/* BACHECA delle missioni: tettuccio, cornice, fogli appuntati, una mappa e uno spillo rosso */
export function boardArt(g, time) {
  shadowE(g, 16, 30, 13, 3);
  for (const px0 of [5, 23]) { g.rect(px0, 14, 5, 18, LN); g.rect(px0 + 1, 14, 3, 17, '#6e4a2a'); g.rect(px0 + 1, 14, 1, 17, '#8a5f38'); }
  g.rect(-1, -4, 34, 5, LN); g.rect(0, -3, 32, 3, '#8a5f38'); g.rect(0, -3, 32, 1, '#b07c4a');                                     // tettuccio
  g.rect(1, 1, 30, 19, LN); g.rect(2, 2, 28, 17, '#a97a4c'); g.rect(4, 4, 24, 13, '#c9a06a');
  g.rect(5, 5, 9, 11, '#f2ead8'); for (let r = 0; r < 4; r++) g.rect(6, 7 + r * 2, 7 - (r % 2) * 2, 1, '#8f887a');
  g.rect(16, 5, 10, 8, '#e8dcb8'); g.rect(17, 6, 8, 6, '#bfe3ef'); g.rect(18, 9, 5, 2, '#7ec069'); g.rect(22, 7, 2, 2, '#c65a54');   // mappa
  g.rect(9, 4, 2, 2, '#c65a54'); g.rect(20, 4, 2, 2, '#5a86c8');                                                                    // spilli
  g.rect(16, 14, 8, 3, '#f2ead8');
  if (Math.floor(time / 400) % 3 === 0) { g.rect(26, 1, 1, 5, '#fff3b0'); g.rect(24, 3, 5, 1, '#fff3b0'); }
}

/* STATUA DEL NONNO: tutta pietra, così si legge come monumento e non come un personaggio */
export function statueArt(g, time) {
  const D = '#3e3a34', P1 = '#7d766a', P2 = '#9a9384', P3 = '#b6ae9d', P4 = '#cfc7b4';
  shadowE(g, 16, 30, 15, 3);
  g.rect(1, 22, 30, 10, D); g.rect(2, 23, 28, 8, P1); g.rect(2, 23, 28, 2, P3);                                                    // gradino
  g.rect(6, 12, 20, 12, D); g.rect(7, 12, 18, 11, P2); g.rect(7, 12, 18, 2, P4); g.rect(22, 14, 3, 9, P1);                         // plinto
  g.rect(9, 16, 14, 5, '#6b5a2a'); g.rect(10, 17, 12, 3, '#c9a24a'); g.rect(10, 17, 12, 1, '#e8c86a');                             // targa
  if (Math.floor(time / 520) % 4 === 0) g.rect(11, 17, 3, 1, '#fff8e0');
  /* il nonno: cappotto lungo che si allarga in fondo, spalle, braccio sulla pala, barba a
     punta e cappello da esploratore a tesa larga */
  for (let y = -10; y < 12; y++) { const w = 12 + Math.round(((y + 10) / 22) * 6); g.rect(16 - (w >> 1) - 1, y, w + 2, 1, D); g.rect(16 - (w >> 1), y, w, 1, y < -6 ? P3 : P2); g.rect(16 - (w >> 1), y, 3, 1, P3); g.rect(16 + (w >> 1) - 3, y, 3, 1, P1); }
  g.rect(15, -8, 2, 19, P1);                                                                                                        // abbottonatura
  g.rect(6, -9, 5, 12, D); g.rect(7, -8, 3, 10, P2);                                                                                // braccio sinistro lungo il fianco
  g.rect(21, -9, 5, 6, D); g.rect(22, -8, 3, 4, P2); g.rect(24, -4, 4, 4, D); g.rect(24, -3, 3, 2, P3);                             // braccio destro sulla pala
  g.rect(12, -19, 9, 10, D); g.rect(13, -18, 7, 5, P3); g.px(14, -16, D); g.px(18, -16, D);                                         // viso con gli occhi
  for (let k = 0; k < 6; k++) g.rect(14 + (k >> 1), -13 + k, 5 - k, 1, P4);                                                          // barba a punta
  g.rect(6, -22, 21, 4, D); g.rect(7, -21, 19, 2, P3);                                                                              // tesa larga
  g.rect(11, -28, 11, 7, D); g.rect(12, -27, 9, 5, P2); g.rect(12, -27, 9, 1, P4); g.rect(12, -23, 9, 1, P1);                       // cupola con la fascia
  g.rect(27, -16, 3, 29, D); g.rect(28, -15, 1, 27, P3);                                                                            // manico della pala
  g.rect(25, -24, 7, 8, D); g.rect(26, -23, 5, 6, P3); g.rect(26, -23, 1, 6, P4);                                                   // lama
  g.rect(3, 26, 4, 2, '#5f7a4a'); g.rect(24, 28, 5, 2, '#5f7a4a');                                                                  // muschio
}

/* CASSETTA DELLA POSTA: cassetta tonda su palo, fessura, bandierina */
export function mailboxArt(g) {
  shadowE(g, 16, 30, 9, 2);
  g.rect(13, 18, 6, 14, LN); g.rect(14, 18, 4, 13, '#6e4a2a'); g.rect(14, 18, 1, 13, '#8a5f38');
  g.rect(4, 5, 24, 16, LN); disc(g, 16, 7, 11, LN);
  g.rect(5, 7, 22, 13, '#3a8c85'); for (let y = -9; y <= 0; y++) { const w = Math.round(Math.sqrt(100 - y * y)); g.rect(16 - w, 7 + y, w * 2, 1, '#3a8c85'); }
  g.rect(6, 1, 6, 18, '#57c0b6'); g.rect(22, 3, 5, 17, '#2a6b64');
  g.rect(10, 8, 12, 2, '#173e39');
  g.rect(9, 12, 7, 5, '#eaf3f0');
  g.rect(27, 4, 2, 10, LN); g.rect(28, 3, 5, 5, LN); g.rect(28, 4, 4, 3, '#e05a54');
}

/* AFFIORAMENTO D'OSSA: montarolo di terra con il cranio e le costole che spuntano */
export function siteArt(g, remaining, time, phase) {
  shadowE(g, 16, 28, 14, 3);
  ellipse(g, 16, 23, 15, 8, LN); ellipse(g, 16, 22, 14, 7, '#a8824e'); ellipse(g, 14, 19, 10, 4, '#c9a06a'); ellipse(g, 12, 17, 5, 2, '#dcbc88');
  const C = remaining > 0 ? '#ece5d2' : '#b8b0a2', S = remaining > 0 ? '#c3b79a' : '#8f887a';
  for (let i = 0; i < 3; i++) {                                                                  // tre costole ad arco, larghe e pulite
    const x0 = 5 + i * 5;
    for (let k = 0; k <= 10; k++) { const x = x0 + k, y = 21 - Math.round(Math.sin((k / 10) * Math.PI) * (8 - i)); g.rect(x, y, 2, 3, LN); }
    for (let k = 0; k <= 10; k++) { const x = x0 + k, y = 21 - Math.round(Math.sin((k / 10) * Math.PI) * (8 - i)); g.rect(x, y, 2, 2, C); }
  }
  g.rect(19, 10, 11, 10, LN); g.rect(20, 11, 9, 8, C); g.rect(20, 11, 9, 2, '#fbf6ea'); g.rect(20, 17, 9, 2, S);                   // cranio
  g.rect(22, 13, 2, 2, '#2e2618'); g.rect(26, 13, 2, 2, '#2e2618');
  for (const [x, y] of [[4, 26], [27, 25], [9, 28]]) { g.rect(x, y, 3, 2, '#7a6e58'); g.px(x, y, '#b5a982'); }
  if (remaining > 0) {
    const a = (Math.sin(time / 300 + phase) + 1) / 2;
    if (a > 0.4) { g.rect(3, 3, 1, 5, '#fff6c8'); g.rect(1, 5, 5, 1, '#fff6c8'); g.px(3, 5, '#ffffff'); }
  }
}
