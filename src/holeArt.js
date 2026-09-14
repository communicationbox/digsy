/* BUCHE dello scavo: dieci forme scelte a mano (modulo puro).

   Era sempre la stessa ellisse con il mucchietto di terra a destra o a sinistra: in un campo scavato
   le buche facevano un motivo a timbro ("si possono generare una decina di buchi di forme diverse
   per evitare il pattern di buchi per terra tutti uguali?").
   Ogni forma è un elenco curato di LOBI (ellissi che insieme fanno la buca) e di MUCCHI di terra
   smossa, più qualche zolla, un sasso o una radice. Per casella si sceglie forma, specchio e un
   piccolo spostamento; la forma si trasforma una volta in "corse" di pixel dello stesso colore e
   si ridisegna con pochi rettangoli. */

const C = {
  rimL: '#8a6448', rimD: '#6d4d33', wall: '#5a3f28', dark: '#3a291a', deep: '#2a1d12',
  pileL: '#a07a54', pileD: '#7d5838', clod: '#b8906a', stone: '#9a9285', stoneL: '#c9c2b2', root: '#6b4a2a',
};

/* lobi [dx, dy, rx, ry] attorno al centro (16, 20); mucchi [dx, dy, rx, ry]; zolle [dx, dy] */
export const HOLES = [
  { name: 'tonda', lobes: [[0, 0, 8, 6]], piles: [[10, 4, 5, 3]], clods: [[7, 7], [14, 1]] },
  { name: 'ovale lunga', lobes: [[0, 0, 11, 5]], piles: [[-12, 4, 4, 3], [12, -3, 3, 2]], clods: [[-7, 6]] },
  { name: 'due buche', lobes: [[-5, -1, 5, 4], [6, 2, 4, 3]], piles: [[0, 7, 6, 2]], clods: [[11, -3], [-10, 4]] },
  { name: 'fagiolo', lobes: [[-3, 0, 7, 5], [5, -2, 5, 4]], piles: [[-11, 3, 4, 3]], clods: [[9, 4], [-6, -6]] },
  { name: 'tre lobi', lobes: [[0, -2, 6, 4], [-5, 2, 4, 3], [5, 2, 4, 3]], piles: [[11, 5, 4, 2]], clods: [[-11, 0], [2, 8]] },
  { name: 'trincea', lobes: [[0, 0, 12, 3]], piles: [[0, -6, 10, 2]], clods: [[-13, 3], [13, 3]] },
  { name: 'diagonale', lobes: [[-4, -2, 5, 4], [0, 1, 5, 4], [4, 4, 4, 3]], piles: [[-10, 5, 4, 3]], clods: [[10, -3]] },
  { name: 'piccola profonda', lobes: [[0, 1, 5, 4]], piles: [[-8, -2, 4, 3], [8, -1, 3, 2]], clods: [[0, 8], [-10, 4], [10, 5]] },
  { name: 'con radice', lobes: [[0, 0, 9, 5]], piles: [[-11, 5, 4, 2]], clods: [[12, 4]], root: [[-3, -5], [0, -2], [3, -1], [5, 1]] },
  { name: 'con sasso', lobes: [[-1, 0, 8, 5]], piles: [[10, 3, 5, 3]], clods: [[-10, 5]], stone: [11, 1] },
];

const inside = (lobes, x, y) => { let best = Infinity; for (const [dx, dy, rx, ry] of lobes) { const e = ((x - 16 - dx) / rx) ** 2 + ((y - 20 - dy) / ry) ** 2; if (e < best) best = e; } return best; };

/* pixel della forma i: Map "x,y" → colore */
function pixels(h) {
  const out = new Map();
  const put = (x, y, c) => { if (x >= 0 && x < 32 && y >= 4 && y < 32) out.set(x + ',' + y, c); };
  /* mucchi di terra: prima, così il bordo della buca ci passa sopra */
  for (const [dx, dy, rx, ry] of h.piles) for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    if ((x / rx) ** 2 + (y / ry) ** 2 > 1) continue;
    put(16 + dx + x, 20 + dy + y, y < 0 || (y === 0 && x < 0) ? C.pileL : C.pileD);
  }
  for (const [dx, dy, rx, ry] of h.piles) put(16 + dx - Math.round(rx / 2), 20 + dy - ry + 1, C.clod);
  /* buca: bordo di terra rialzata, parete lontana illuminata, fondo scuro */
  for (let y = 4; y < 32; y++) for (let x = 0; x < 32; x++) {
    const e = inside(h.lobes, x, y);
    if (e < 1) {
      const eUp = inside(h.lobes, x, y - 2);
      put(x, y, e < 0.4 ? C.deep : eUp >= 1 ? C.wall : e < 0.7 ? C.dark : (inside(h.lobes, x, y + 2) >= 1 ? C.dark : C.wall));
    } else if (e < 1.5) {
      put(x, y, inside(h.lobes, x, y + 1) < 1 ? C.rimL : C.rimD);
    }
  }
  for (const [dx, dy] of h.clods) { put(16 + dx, 20 + dy, C.clod); put(17 + dx, 20 + dy, C.pileD); }
  if (h.stone) { const [dx, dy] = h.stone; for (let y = -1; y <= 1; y++) for (let x = -2; x <= 1; x++) put(16 + dx + x, 20 + dy + y, y < 0 && x < 0 ? C.stoneL : C.stone); put(14 + dx, 20 + dy, '#6f685c'); }
  if (h.root) for (const [dx, dy] of h.root) { put(16 + dx, 20 + dy, C.root); put(17 + dx, 20 + dy, C.root); }
  return out;
}

/* corse orizzontali dello stesso colore: [x, y, w, colore] */
const RUNS = new Map();
export function holeRuns(i, flip) {
  const k = i + (flip ? 'f' : '');
  let r = RUNS.get(k);
  if (r) return r;
  const px = pixels(HOLES[i]);
  r = [];
  for (let y = 0; y < 32; y++) {
    let x = 0;
    while (x < 32) {
      const sx = flip ? 31 - x : x, c = px.get(sx + ',' + y);
      if (!c) { x++; continue; }
      let w = 1;
      while (x + w < 32 && px.get((flip ? 31 - (x + w) : x + w) + ',' + y) === c) w++;
      r.push([x, y, w, c]); x += w;
    }
  }
  RUNS.set(k, r);
  return r;
}
