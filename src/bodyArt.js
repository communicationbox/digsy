/* CORPO del personaggio disegnato in NATIVO (modulo puro), con il pennello di hatArt/hairArt.

   Il corpo era il disegno piccolo di sempre raddoppiato a blocchi 2×2: testa piatta, niente
   braccia, niente bocca, nessun bordo — e cappelli, capelli e segni di mestiere nativi ci stavano
   sopra come adesivi ("sono bruttini, falli meglio").
   Due ridisegni precedenti erano stati scartati, e le ragioni sono le regole di questo:
   - SPECCHIO ESATTO fra metà sinistra e destra (occhi compresi): ogni riga si scrive una volta,
     con la colonna di sinistra, e la destra è 31 - x. Un test lo misura.
   - la luce è un FILO (una colonna, un paio di pixel), mai una macchia che copre mezza faccia;
   - niente dither a scacchiera;
   - occhi alle righe 9-11, sotto ogni frangia (i capelli scendono al massimo alla riga 6 sul viso).
   Ingombri uguali a prima — testa 0-17, busto 18-25, gambe 26-31 — così cappelli, capelli,
   vestiti (styleLook) e accessori continuano a calzare. Il contorno scuro NON sta qui: lo aggiunge
   drawHero dopo aver dato la forma ai vestiti, così segue anche la gonna e la canottiera.

   Lettere: F/N/f pelle · S/T/s maglia · P/U/p pantaloni · E occhi · c guance · B/b scarpe e zaino. */
import { grid, finish } from './hatArt.js';

/* riga simmetrica: da x0 a 31-x0 */
const row = (g, y, x0, m, t = 1) => { for (let x = x0; x <= 31 - x0; x++) g.set(x, y, m, t); };
/* pixel e il suo specchio */
const pair = (g, x, y, m, tl = 1, tr = tl) => { g.set(x, y, m, tl); g.set(31 - x, y, m, tr); };

/* ---------------- TESTA ---------------- */
function headFront(g, face) {
  [[0, 11], [1, 9], [2, 8], [3, 7]].forEach(([y, x]) => row(g, y, x, 'F'));
  for (let y = 4; y <= 13; y++) row(g, y, 6, 'F');
  row(g, 14, 7, 'F'); row(g, 15, 8, 'F'); row(g, 16, 10, 'F');
  row(g, 17, 12, 'F', 2);                                   // collo in ombra
  for (let y = 9; y <= 11; y++) pair(g, 5, y, 'F', 1, 2);   // orecchie
  /* luce: un filo sulla tempia sinistra e sulla cima; ombra: filo sul lato destro e sotto il mento */
  for (let y = 4; y <= 8; y++) g.set(7, y, 'F', 0);
  for (let x = 11; x <= 13; x++) g.set(x, 1, 'F', 0);
  for (let y = 4; y <= 13; y++) g.set(25, y, 'F', 2);
  g.set(24, 14, 'F', 2); g.set(23, 15, 'F', 2); g.set(8, 15, 'F', 2); g.set(10, 16, 'F', 2); g.set(21, 16, 'F', 2);
  if (!face) return;
  for (let y = 9; y <= 11; y++) { pair(g, 10, y, 'E'); pair(g, 11, y, 'E'); }
  pair(g, 8, 12, 'C'); pair(g, 9, 12, 'C');                // guance
  pair(g, 14, 13, 'F', 2); pair(g, 15, 14, 'F', 2);        // sorriso
}
function headSide(g) {
  g.span(0, 12, 19, 'F', { t: 1 }); g.span(1, 10, 21, 'F', { t: 1 }); g.span(2, 9, 22, 'F', { t: 1 }); g.span(3, 8, 23, 'F', { t: 1 });
  for (let y = 4; y <= 13; y++) g.span(y, 8, 25, 'F', { t: 1 });
  g.span(14, 9, 24, 'F', { t: 1 }); g.span(15, 10, 23, 'F', { t: 1 }); g.span(16, 13, 21, 'F', { t: 1 });
  g.span(17, 14, 19, 'F', { t: 2 });
  g.fillBlock(26, 10, 26, 11, 'F', 1);                     // naso
  for (let y = 4; y <= 8; y++) g.set(9, y, 'F', 0);
  for (let x = 12; x <= 14; x++) g.set(x, 1, 'F', 0);
  g.fillBlock(12, 9, 13, 11, 'F', 2); g.set(12, 10, 'F', 1); // orecchio
  g.span(15, 10, 12, 'F', { t: 2 }); g.set(13, 16, 'F', 2);
  g.fillBlock(21, 9, 22, 11, 'E');
  g.fillBlock(20, 12, 21, 12, 'C');
  g.set(24, 13, 'F', 2); g.set(23, 14, 'F', 2);
}

/* ---------------- BUSTO ---------------- */
/* braccia staccate dal busto da un pixel vuoto all'altezza delle mani: si leggono come braccia */
function torsoFront(g, back) {
  row(g, 18, 10, 'S');
  row(g, 19, 7, 'S');
  for (let y = 20; y <= 25; y++) row(g, y, 8, 'S');
  for (let y = 20; y <= 21; y++) { pair(g, 6, y, 'S', 0, 2); pair(g, 7, y, 'S', 1, 2); }   // maniche
  for (let y = 22; y <= 24; y++) { pair(g, 5, y, 'F', 0, 2); pair(g, 6, y, 'F', 1, 2); }   // avambracci e mani
  g.set(5, 20, 'S', 0); g.set(26, 20, 'S', 2);
  for (let y = 20; y <= 24; y++) { g.set(9, y, 'S', 0); g.set(22, y, 'S', 2); g.set(23, y, 'S', 2); }
  row(g, 25, 8, 'S', 2);                                   // orlo in ombra
  if (!back) { for (let x = 14; x <= 17; x++) g.set(x, 18, 'S', 2); return; }
  /* di spalle: lo zaino, con la patta e le cinghie; ai lati resta la maglia (styleLook la cerca) */
  for (let y = 18; y <= 25; y++) g.span(y, 11, 20, 'B', { lit: 0.2, dark: 0.8 });
  g.span(18, 12, 19, 'B', { t: 0 });
  g.span(21, 11, 20, 'B', { t: 2 }); g.fillBlock(15, 22, 16, 22, 'W', 1);
  g.span(25, 11, 20, 'B', { t: 2 });
}
function torsoSide(g, fr) {
  g.span(18, 12, 21, 'S');
  for (let y = 19; y <= 25; y++) g.span(y, 10, 22, 'S', { lit: 0.15, dark: 0.85 });
  g.span(25, 10, 22, 'S', { t: 2 });
  for (let y = 18; y <= 24; y++) g.span(y, 6, 9, 'B', { lit: 0.3, dark: 0.9 });   // zaino dietro
  g.span(18, 7, 9, 'B', { t: 0 });
  /* braccio che oscilla: avanti al passo 0, indietro al passo 1 */
  const ax = fr ? 13 : 16, hx = fr ? 12 : 18;
  for (let y = 19; y <= 21; y++) g.span(y, ax, ax + 3, 'S', { lit: 0.3, dark: 0.7 });
  for (let y = 19; y <= 22; y++) g.set(ax - 1, y, 'S', 2);
  g.fillBlock(hx, 22, hx + 2, 24, 'F', 1); g.set(hx, 22, 'F', 0); g.set(hx + 2, 24, 'F', 2);
}

/* ---------------- GAMBE ---------------- */
function legsFront(g, fr) {
  row(g, 26, 9, 'P');
  const legs = fr ? [[7, 12], [19, 24]] : [[9, 14], [17, 22]];
  for (const [a, b] of legs) {
    for (let y = 27; y <= 29; y++) g.span(y, a, b, 'P', { lit: 0.2, dark: 0.8 });
    const s0 = a < 16 ? a - 1 : a, s1 = a < 16 ? b : b + 1;   // la punta esce verso l'esterno, a specchio
    g.span(30, s0, s1, 'B', { lit: 0.3, dark: 0.8 });
    g.span(31, s0, s1, 'B', { t: 2 });
  }
  if (fr) { g.span(27, 9, 14, 'P'); g.span(27, 17, 22, 'P'); }   // attaccatura delle gambe, anche a gambe aperte
}
function legsSide(g, fr) {
  g.span(26, 11, 21, 'P');
  const legs = fr ? [[13, 18]] : [[9, 13], [18, 22]];
  for (const [a, b] of legs) {
    for (let y = 27; y <= 29; y++) g.span(y, a, b, 'P', { lit: 0.2, dark: 0.8 });
    g.span(30, a, b + 2, 'B', { lit: 0.3, dark: 0.8 });
    g.span(31, a, b + 2, 'B', { t: 2 });
  }
  if (!fr) g.span(27, 12, 19, 'P');
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
