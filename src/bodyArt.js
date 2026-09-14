/* CORPO del personaggio disegnato in NATIVO (modulo puro), con il pennello di hatArt/hairArt.

   Il corpo era il disegno piccolo di sempre raddoppiato a blocchi 2×2: testa piatta, niente
   braccia, niente bocca, nessun bordo — e cappelli, capelli e segni di mestiere nativi ci stavano
   sopra come adesivi ("sono bruttini, falli meglio").
   Due ridisegni precedenti erano stati scartati, e le ragioni sono le regole di questo:
   - SPECCHIO ESATTO fra metà sinistra e destra (occhi compresi): ogni riga si scrive una volta,
     con la colonna di sinistra, e la destra è 31 - x. Un test lo misura.
   - la luce è un FILO (una colonna, un paio di pixel), mai una macchia che copre mezza faccia;
   - niente dither a scacchiera;
   - occhi alle righe 8-11, sotto ogni frangia (i capelli scendono al massimo alla riga 6 sul viso).
   Ingombri uguali a prima — testa 0-17, busto 18-25, gambe 26-31 — così cappelli, capelli,
   vestiti (styleLook) e accessori continuano a calzare. Il contorno scuro NON sta qui: lo aggiunge
   drawHero dopo aver dato la forma ai vestiti, così segue anche la gonna e la canottiera.

   Lettere: F/N/f pelle · S/T/s maglia · P/U/p pantaloni · E occhi · c guance · B/b scarpe e zaino. */
import { grid, finish } from './hatArt.js';

/* riga simmetrica: da x0 a 31-x0 */
const row = (g, y, x0, m, t = 1) => { for (let x = x0; x <= 31 - x0; x++) g.set(x, y, m, t); };
/* pixel e il suo specchio */
const pair = (g, x, y, m, tl = 1, tr = tl) => { g.set(x, y, m, tl); g.set(31 - x, y, m, tr); };

/* ---------------- POSE DELLE BRACCIA ----------------
   Per scavare, tagliare, spaccare e pedalare le mani devono TENERE qualcosa: con le braccia lungo i
   fianchi l'attrezzo galleggiava accanto all'omino. Ogni posa = segmenti spalla → mano (manica S
   larga 3, mano F 3×2) e GRIP, il punto in cui la mano stringe il manico (coordinate dello sprite,
   vista di profilo verso destra: a sinistra si specchia). */
const ARMS = {
  lift:   { down: [[[8, 20], [19, 19]], [[23, 20], [23, 16]]], side: [[[15, 19], [22, 16]]] },   // attrezzo alzato
  strike: { down: [[[8, 20], [13, 23]], [[23, 20], [18, 23]]], side: [[[16, 20], [25, 22]]] },   // colpo in avanti
  ride:   { down: [[[8, 20], [5, 18]], [[23, 20], [26, 18]]], side: [[[16, 20], [24, 17]]] },    // mani sul manubrio
};
export const GRIP = { lift: { down: [23, 16], side: [23, 15] }, strike: { down: [15.5, 23], side: [26, 22] }, ride: { down: [5, 18], side: [25, 17] } };
function arm(g, [x0, y0], [x1, y1]) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n - 2; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
    for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) g.set(x + dx, y + dy, 'S', dx < 0 ? 0 : dx > 0 ? 2 : 1);
  }
  for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) g.set(x1 + dx, y1 + dy, 'F', dy === 0 && dx < 1 ? 0 : 1);
}

/* ---------------- TESTA ---------------- */
/* "sembra un mostriciattolo": occhi piccoli sui bordi di una faccia larga, orecchie a sventola,
   sorriso e mascella scura. Un viso tenero ha gli occhi GRANDI e VICINI al centro, con un punto
   di luce, e niente altro: guance appena accennate, niente bocca, mento tondo. */
function headFront(g, face) {
  [[0, 11], [1, 9], [2, 8], [3, 7]].forEach(([y, x]) => row(g, y, x, 'F'));
  for (let y = 4; y <= 12; y++) row(g, y, 6, 'F');
  row(g, 13, 7, 'F'); row(g, 14, 8, 'F'); row(g, 15, 10, 'F'); row(g, 16, 12, 'F');
  row(g, 17, 13, 'F', 2);                                   // collo in ombra
  for (let y = 4; y <= 7; y++) g.set(7, y, 'F', 0);         // filo di luce sulla tempia
  for (let x = 11; x <= 13; x++) g.set(x, 1, 'F', 0);
  for (let y = 5; y <= 11; y++) g.set(25, y, 'F', 2);       // filo d'ombra sul lato destro
  g.set(24, 13, 'F', 2); g.set(23, 14, 'F', 2); g.set(21, 15, 'F', 2);
  if (!face) return;
  for (let y = 8; y <= 11; y++) { pair(g, 11, y, 'E'); pair(g, 12, y, 'E'); }
  g.set(12, 8, 'W', 1); g.set(20, 8, 'W', 1);               // punto di luce, stessa posizione nei due occhi
  pair(g, 9, 12, 'C');                                      // guance: un pixel
}
function headSide(g) {
  g.span(0, 12, 19, 'F', { t: 1 }); g.span(1, 10, 21, 'F', { t: 1 }); g.span(2, 9, 22, 'F', { t: 1 }); g.span(3, 8, 23, 'F', { t: 1 });
  for (let y = 4; y <= 12; y++) g.span(y, 8, 25, 'F', { t: 1 });
  g.span(13, 9, 24, 'F', { t: 1 }); g.span(14, 10, 23, 'F', { t: 1 }); g.span(15, 12, 21, 'F', { t: 1 }); g.span(16, 14, 19, 'F', { t: 1 });
  g.span(17, 14, 18, 'F', { t: 2 });
  g.set(26, 10, 'F', 1);                                    // naso: un pixel
  for (let y = 4; y <= 7; y++) g.set(9, y, 'F', 0);
  for (let x = 12; x <= 14; x++) g.set(x, 1, 'F', 0);
  g.fillBlock(13, 9, 14, 11, 'F', 2); g.set(13, 10, 'F', 1); // orecchio piccolo
  g.fillBlock(20, 8, 21, 11, 'E'); g.set(21, 8, 'W', 1);
  g.set(19, 12, 'C');
}

/* ---------------- BUSTO ---------------- */
/* braccia LUNGO I FIANCHI (a T sembravano artigli): manica sulla spalla, mano accanto al busto,
   con un pixel vuoto fra mano e busto che diventa contorno */
function torsoFront(g, back, pose) {
  row(g, 18, 10, 'S');
  for (let y = 19; y <= 21; y++) row(g, y, 9, 'S');
  for (let y = 22; y <= 25; y++) row(g, y, 10, 'S');
  /* braccio largo 3: manica fino alla riga 22, mano sotto, staccata dal busto da una colonna */
  for (let y = 19; y <= 22; y++) { pair(g, 6, y, 'S', 0, 2); pair(g, 7, y, 'S', 1, 2); pair(g, 8, y, 'S', 1, 2); }
  g.set(6, 19, 'S', 0); g.clear(6, 19); g.clear(25, 19);             // spalla arrotondata
  for (let y = 23; y <= 24; y++) { pair(g, 6, y, 'F', 0, 2); pair(g, 7, y, 'F', 1, 2); pair(g, 8, y, 'F', 1, 2); }
  g.clear(6, 24); g.clear(25, 24);                                   // mano tonda
  for (let y = 19; y <= 22; y++) { pair(g, 8, y, 'S', 2, 2); }       // piega fra manica e busto
  for (let y = 19; y <= 24; y++) { g.set(10, y, 'S', 0); g.set(21, y, 'S', 2); }
  row(g, 25, 10, 'S', 2);
  if (pose && ARMS[pose]) { for (let y = 19; y <= 24; y++) for (const x of [5, 6, 7, 8, 23, 24, 25, 26]) g.clear(x, y); for (const [a, b] of ARMS[pose].down) arm(g, a, b); }
  if (!back) { for (let x = 14; x <= 17; x++) g.set(x, 18, 'S', 2); return; }
  for (let y = 18; y <= 25; y++) g.span(y, 12, 19, 'B', { lit: 0.2, dark: 0.8 });
  g.span(18, 13, 18, 'B', { t: 0 });
  g.span(21, 12, 19, 'B', { t: 2 }); g.fillBlock(15, 22, 16, 22, 'W', 1);
  g.span(25, 12, 19, 'B', { t: 2 });
}
function torsoSide(g, fr, pose) {
  g.span(18, 13, 20, 'S');
  for (let y = 19; y <= 25; y++) g.span(y, 11, 21, 'S', { lit: 0.15, dark: 0.85 });
  g.span(25, 11, 21, 'S', { t: 2 });
  for (let y = 18; y <= 24; y++) g.span(y, 8, 10, 'B', { lit: 0.3, dark: 0.9 });   // zaino dietro
  g.span(18, 8, 10, 'B', { t: 0 });
  if (pose && ARMS[pose]) { for (const [a, b] of ARMS[pose].side) arm(g, a, b); return; }
  /* braccio lungo il fianco che oscilla appena col passo: largo 3, mano 2×2 */
  const ax = fr ? 13 : 15;
  for (let y = 19; y <= 23; y++) g.span(y, ax, ax + 2, 'S', { lit: 0.34, dark: 0.66 });
  g.fillBlock(ax, 24, ax + 2, 25, 'F', 1); g.set(ax, 24, 'F', 0); g.clear(ax + 2, 25);
  for (let y = 20; y <= 23; y++) g.set(ax - 1, y, 'S', 2);
}

/* ---------------- GAMBE ---------------- */
function legsFront(g, fr) {
  row(g, 26, 10, 'P');
  const legs = fr ? [[8, 12], [19, 23]] : [[10, 14], [17, 21]];
  for (const [a, b] of legs) {
    for (let y = 27; y <= 29; y++) g.span(y, a, b, 'P', { lit: 0.2, dark: 0.8 });
    g.span(30, a, b, 'B', { t: 1 });
    g.span(31, a, b, 'B', { t: 2 });
  }
  if (fr) { g.span(27, 10, 14, 'P'); g.span(27, 17, 21, 'P'); }
}
function legsSide(g, fr, pose) {
  if (pose === 'ride') {                                   // seduto in sella: coscia in avanti, stinco giù sul pedale
    g.span(26, 12, 20, 'P');
    for (let y = 26; y <= 27; y++) g.span(y, 14, 21, 'P', { lit: 0.2, dark: 0.85 });
    for (let y = 28; y <= 29; y++) g.span(y, 19 - fr, 21 - fr, 'P', { lit: 0.3, dark: 0.7 });
    g.span(30, 19 - fr, 23 - fr, 'B', { t: 1 }); g.span(31, 19 - fr, 23 - fr, 'B', { t: 2 });
    return;
  }
  g.span(26, 12, 20, 'P');
  const legs = fr ? [[13, 18]] : [[10, 14], [17, 21]];
  for (const [a, b] of legs) {
    for (let y = 27; y <= 29; y++) g.span(y, a, b, 'P', { lit: 0.2, dark: 0.8 });
    g.span(30, a, b + 1, 'B', { t: 1 });
    g.span(31, a, b + 1, 'B', { t: 2 });
  }
  if (!fr) g.span(27, 13, 18, 'P');
}

/* ---------------- tutto ---------------- */
function toRows(g) {
  const rows = Array.from({ length: 32 }, () => '.'.repeat(32));
  for (const [y, r] of finish(g, { noOutline: true })) if (y >= 0 && y < 32) rows[y] = r;
  return rows;
}
export function buildBody() {
  const out = { down: [], up: [], side: [] };
  for (const fr of [0, 1]) {
    let g = grid(); headFront(g, true); torsoFront(g, false); legsFront(g, fr); out.down.push(toRows(g));
    g = grid(); headFront(g, false); torsoFront(g, true); legsFront(g, fr); out.up.push(toRows(g));
    g = grid(); headSide(g); torsoSide(g, fr); legsSide(g, fr); out.side.push(toRows(g));
  }
  return out;
}
/* pose: { lift|strike|ride: { down:[passo0, passo1], up:[…], side:[…] } } */
export function buildPoses() {
  const out = {};
  for (const pose of Object.keys(ARMS)) {
    out[pose] = { down: [], up: [], side: [] };
    for (const fr of [0, 1]) {
      let g = grid(); headFront(g, true); torsoFront(g, false, pose); legsFront(g, pose === 'ride' ? 0 : fr); out[pose].down.push(toRows(g));
      g = grid(); headFront(g, false); torsoFront(g, true, pose); legsFront(g, pose === 'ride' ? 0 : fr); out[pose].up.push(toRows(g));
      g = grid(); headSide(g); torsoSide(g, fr, pose); legsSide(g, fr, pose); out[pose].side.push(toRows(g));
    }
  }
  return out;
}

/* contorno scuro attorno alla sagoma (dopo i vestiti): coppie [riga, 32 caratteri] da -1 a 32 */
export function outlineRows(rows) {
  const H = rows.length, Wd = rows[0].length;
  const on = (x, y) => y >= 0 && y < H && x >= 0 && x < Wd && rows[y][x] !== '.';
  const out = [];
  for (let y = -1; y <= H; y++) {
    let s = '', any = false;
    for (let x = 0; x < Wd; x++) {
      if (on(x, y)) { s += '.'; continue; }
      const edge = on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1);
      s += edge ? 'X' : '.'; if (edge) any = true;
    }
    if (any) out.push([y, s]);
  }
  return out;
}
