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

/* SAGOME TONDE, come nel resto del gioco: si compone la forma (rettangoli smussati, ellissi,
   capsule) e la si dipinge in un colpo solo — un contorno che segue il profilo, luce in alto a
   sinistra, ombra a destra. L'arredo urbano era tutto rettangoli sovrapposti: dove si toccavano
   la lineart spariva (segnalato sulla cassetta della posta). */
export const DR = (x, y, w, h, r = 0) => ({ k: 'r', x, y, w, h, r });
export const DE = (cx, cy, rx, ry) => ({ k: 'e', cx, cy, rx, ry });
export const DC = (x0, y0, x1, y1, r) => ({ k: 'c', x0, y0, x1, y1, r });
function dentroForma(s, x, y) {
  if (s.k === 'r') {
    const dx = Math.min(x - s.x, s.x + s.w - 1 - x), dy = Math.min(y - s.y, s.y + s.h - 1 - y);
    if (dx < 0 || dy < 0) return false;
    return !(dx < s.r && dy < s.r && (s.r - dx) ** 2 + (s.r - dy) ** 2 > s.r * s.r + s.r);
  }
  if (s.k === 'e') return ((x - s.cx) ** 2) / (s.rx * s.rx + 0.5) + ((y - s.cy) ** 2) / (s.ry * s.ry + 0.5) <= 1;
  const vx = s.x1 - s.x0, vy = s.y1 - s.y0, L2 = vx * vx + vy * vy || 1;
  let u = ((x - s.x0) * vx + (y - s.y0) * vy) / L2; u = Math.max(0, Math.min(1, u));
  const dx = x - (s.x0 + vx * u), dy = y - (s.y0 + vy * u);
  return dx * dx + dy * dy <= s.r * s.r + s.r;
}
export function volume(g, shapes, fill, light, dark, line = LN) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const s of shapes) {
    const b = s.k === 'r' ? [s.x, s.y, s.x + s.w, s.y + s.h]
      : s.k === 'e' ? [s.cx - s.rx, s.cy - s.ry, s.cx + s.rx + 1, s.cy + s.ry + 1]
        : [Math.min(s.x0, s.x1) - s.r, Math.min(s.y0, s.y1) - s.r, Math.max(s.x0, s.x1) + s.r + 1, Math.max(s.y0, s.y1) + s.r + 1];
    x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
  }
  const dentro = (x, y) => shapes.some(s => dentroForma(s, x, y));
  for (let y = Math.round(y0) - 1; y <= Math.round(y1) + 1; y++) for (let x = Math.round(x0) - 1; x <= Math.round(x1) + 1; x++) {
    if (!dentro(x, y)) { if (dentro(x + 1, y) || dentro(x - 1, y) || dentro(x, y + 1) || dentro(x, y - 1)) g.rect(x, y, 1, 1, line); continue; }
    const luce = !dentro(x - 1, y) || !dentro(x, y - 1), ombra = !dentro(x + 1, y) || !dentro(x, y + 1);
    g.rect(x, y, 1, 1, luce ? light : ombra ? dark : fill);
  }
  return dentro;
}

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
  /* PANCHINA: gambe di ferro tonde, assi con le teste smussate. Prima erano rettangoli
     sovrapposti e gli spigoli vivi la facevano sembrare una cassa. */
  shadowE(g, 16, 28, 14, 3);
  for (const lx of [5, 26]) volume(g, [DC(lx, 27, lx, 13, 1), DE(lx, 28, 3, 1)], '#4a4a52', '#6e6e78', '#2e2e36');   // gambe di ferro, sottili
  /* le ASSI sono legno segato: spigoli vivi. Si stonda solo il ferro battuto delle gambe e dei
     braccioli — dove non serve stondare, gli spigoli restano. */
  volume(g, [DR(2, 4, 28, 4)], '#c79a66', '#e0c090', '#a97a4c');           // schienale, asse alta
  volume(g, [DR(2, 9, 28, 4)], '#b8895a', '#d0a878', '#96683e');           // schienale, asse bassa
  volume(g, [DR(1, 15, 30, 5)], '#dcb27e', '#f0cc98', '#b8895a');          // seduta
  volume(g, [DR(1, 20, 30, 3)], '#c79a66', '#dcb27e', '#a97a4c');
  for (const ax of [1, 28]) volume(g, [DC(ax + 1, 10, ax + 1, 16, 1)], '#4a4a52', '#6e6e78', '#2e2e36');   // braccioli, sottili
  for (const x of [10, 22]) { g.px(x, 6, '#8a5f38'); g.px(x + 1, 17, '#a97a4c'); }                          // chiodi
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
  /* LAMPIONE: base tonda, palo cilindrico, braccio a ricciolo e lanterna con gli spigoli
     smussati — il ferro battuto non ha angoli vivi. */
  shadowE(g, 16, 30, 7, 2);
  volume(g, [DE(16, 29, 8, 3), DR(12, 24, 9, 5, 1)], '#5a5248', '#847a6c', '#3a342c');      // base
  volume(g, [DC(16, 26, 16, 2, 2)], '#5a5248', '#847a6c', '#3a342c');                        // palo
  volume(g, [DE(16, 15, 5, 2)], '#5a5248', '#847a6c', '#3a342c');                            // anello
  volume(g, [DR(9, -10, 15, 3), DR(15, -13, 4, 4)], '#5a5248', '#847a6c', '#3a342c');         // cappello: lamiera, squadrata
  const dentro = volume(g, [DR(10, -7, 13, 12, 1)], night ? '#ffe08a' : '#c9d6d8', night ? '#fff6c8' : '#e8f0f2', night ? '#e8b84a' : '#9aacae');   // lanterna a gabbia
  for (let y = -6; y < 4; y++) if (dentro(16, y)) g.rect(16, y, 1, 1, '#3a342c');             // montante del vetro
  if (!night) for (let y = -5; y < 2; y++) if (dentro(12, y)) g.rect(12, y, 2, 1, 'rgba(255,255,255,.7)');
  if (night) { ellipse(g, 16, -2, 13, 11, 'rgba(255,220,120,.18)'); g.rect(14, -4, 5, 5, '#fff6c8'); }
}

/* BACHECA delle missioni: tettuccio, cornice, fogli appuntati, una mappa e uno spillo rosso */
export function boardArt(g, time) {
  /* BACHECA: pali tondi, tettuccio con gli angoli smussati e cornice di legno; dentro il
     sughero coi fogli appuntati. */
  shadowE(g, 16, 30, 13, 3);
  for (const px0 of [7, 24]) volume(g, [DC(px0, 31, px0, 15, 2)], '#6e4a2a', '#8a5f38', '#54371f');   // pali
  volume(g, [DR(1, 1, 30, 19)], '#a97a4c', '#c49a63', '#7a5230');                                      // cornice di legno, squadrata
  volume(g, [DR(-1, -4, 34, 5)], '#8a5f38', '#b07c4a', '#5c3d22');                                     // tettuccio
  const dentro = volume(g, [DR(4, 4, 24, 13)], '#c9a06a', '#dcb88a', '#a97a4c');                        // sughero
  const dipingi = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (dentro(x, y)) g.rect(x, y, 1, 1, c); };
  dipingi(5, 5, 9, 11, '#f2ead8'); for (let r = 0; r < 4; r++) dipingi(6, 7 + r * 2, 7 - (r % 2) * 2, 1, '#8f887a');   // foglio scritto
  dipingi(16, 5, 10, 8, '#e8dcb8'); dipingi(17, 6, 8, 6, '#bfe3ef'); dipingi(18, 9, 5, 2, '#7ec069'); dipingi(22, 7, 2, 2, '#c65a54');   // mappa
  dipingi(9, 4, 2, 2, '#c65a54'); dipingi(20, 4, 2, 2, '#5a86c8');                                     // spilli
  dipingi(16, 14, 8, 3, '#f2ead8');
  if (Math.floor(time / 400) % 3 === 0) { g.rect(26, 1, 1, 5, '#fff3b0'); g.rect(24, 3, 5, 1, '#fff3b0'); }   // riflesso
}

/* STATUA DEL NONNO: tutta pietra, così si legge come monumento e non come un personaggio */
export function statueArt(g, time, envelope) {
  const D = '#3e3a34', P1 = '#7d766a', P2 = '#9a9384', P3 = '#b6ae9d', P4 = '#cfc7b4';
  shadowE(g, 16, 30, 15, 3);
  g.rect(1, 22, 30, 10, D); g.rect(2, 23, 28, 8, P1); g.rect(2, 23, 28, 2, P3);                                                    // gradino
  g.rect(6, 12, 20, 12, D); g.rect(7, 12, 18, 11, P2); g.rect(7, 12, 18, 2, P4); g.rect(22, 14, 3, 9, P1);                         // plinto
  g.rect(9, 16, 14, 5, '#6b5a2a'); g.rect(10, 17, 12, 3, '#c9a24a'); g.rect(10, 17, 12, 1, '#e8c86a');                             // targa
  if (Math.floor(time / 520) % 4 === 0) g.rect(11, 17, 3, 1, '#fff8e0');
  /* la BUSTA del nonno infilata dietro la targa, finché non la prendi: un angolo di carta che spunta e
     brilla, così la statua chiama il clic senza scriverlo */
  if (envelope) {
    g.rect(22, 18, 7, 5, D); g.rect(23, 19, 5, 3, '#f3ecda'); g.px(25, 20, '#c65a54');
    if (Math.floor(time / 380) % 3 === 0) { g.rect(28, 15, 1, 3, '#fff3a0'); g.rect(27, 16, 3, 1, '#fff3a0'); }
  }
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
  /* CASSETTA DELLA POSTA: più piccola e fatta di due volumi soli — il palo e la cassetta a
     cupola. Prima era un mucchio di rettangoli sovrapposti: dove si toccavano il contorno
     spariva e in mezzo restava un pasticcio (segnalato con foto). */
  shadowE(g, 16, 30, 8, 2);
  volume(g, [DC(16, 30, 16, 20, 2)], '#6e4a2a', '#8a5f38', '#54371f');                       // palo
  const dentro = volume(g, [DR(7, 12, 18, 10, 2), DE(16, 13, 9, 6)], '#3a8c85', '#57c0b6', '#2a6b64');   // cassetta a cupola
  for (let x = 9; x <= 23; x++) if (dentro(x, 15) && dentro(x, 16)) g.rect(x, 15, 1, 2, '#173e39');       // fessura per le lettere
  for (let y = 18; y <= 20; y++) for (let x = 10; x <= 15; x++) if (dentro(x, y)) g.rect(x, y, 1, 1, y === 18 ? '#ffffff' : '#eaf3f0');   // etichetta
  volume(g, [DR(24, 9, 2, 8, 0), DR(25, 8, 5, 4, 1)], '#e05a54', '#f2837c', '#a8332e');       // bandierina alzata
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
