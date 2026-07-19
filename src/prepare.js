/* PREPARAZIONE DEL REPERTO — il secondo verbo del gioco.
   Fino a qui esisteva un gesto solo (`E`): scavare, tagliare, minare, pescare erano lo stesso
   tasto su bersagli diversi, e il museo era un'attesa passiva. Qui il reperto grezzo arriva
   incrostato di terra e lo si SPAZZOLA a mano prima di consegnarlo: venti secondi in cui si
   fa il mestiere dell'archeologo invece di guardarlo fare.

   Regola cozy: la preparazione è un BONUS, mai una penalità. Chi non ha voglia consegna
   direttamente e prende quello che prendeva prima; chi pulisce bene guadagna di più.

   Modulo PURO (niente DOM): la griglia di crosta e i punteggi si testano da soli. */

export const W = 14, H = 12;            // celle di crosta (la canvas le scala)

/* crosta iniziale: tutta sporca tranne un paio di crepe già aperte, così si capisce subito
   che sotto c'è qualcosa. Deterministica per (specie, parte): stesso reperto, stessa crosta. */
export function newBoard(seed = 0) {
  const cells = new Array(W * H).fill(1);
  for (let i = 0; i < W * H; i++) {
    const h = hash(i, seed);
    if (h < 0.06) cells[i] = 0;         // scaglie già staccate
  }
  return { cells, seed, strokes: 0 };
}
function hash(i, seed) {
  const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/* passata di spazzola: pulisce le celle entro il raggio, ritorna quante ne ha tolte davvero.
   (cx, cy) sono in coordinate CELLA, anche frazionarie. */
export function brush(board, cx, cy, r = 1.6) {
  if (!board) return 0;
  let n = 0;
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (Math.hypot(x - cx, y - cy) > r) continue;
    const i = y * W + x;
    if (board.cells[i]) { board.cells[i] = 0; n++; }
  }
  if (n) board.strokes++;
  return n;
}

export function cleanPct(board) {
  if (!board) return 0;
  let c = 0;
  for (const v of board.cells) if (!v) c++;
  return c / board.cells.length;
}

/* GRADI — soglie basse di proposito: il gesto deve gratificare, non esaminare.
   mult moltiplica il valore del pezzo, xp è l'esperienza in più. */
export const GRADES = [
  { id: 'perfetto', min: 0.92, mult: 1.5, xp: 12 },
  { id: 'buono', min: 0.7, mult: 1.25, xp: 6 },
  { id: 'grezzo', min: 0.35, mult: 1.1, xp: 2 },
  { id: 'niente', min: 0, mult: 1, xp: 0 },
];
export function gradeFor(pct) { return GRADES.find(g => pct >= g.min) || GRADES[GRADES.length - 1]; }

/* applica l'esito al reperto: alza il valore e lascia il marchio (serve ai testi e a non
   poterlo preparare due volte) */
export function applyPrep(item, pct) {
  const g = gradeFor(pct);
  if (!item || item.prep != null) return null;
  item.prep = Math.round(pct * 100);
  item.val = Math.max(1, Math.round((item.val || 1) * g.mult));
  return g;
}
export function isPrepped(item) { return !!item && item.prep != null; }
