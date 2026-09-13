/* RICETTE DI DISEGNO dell'arredo del catalogo — modulo puro.

   Duecentocinquanta mobili non si disegnano con duecentocinquanta funzioni, e nemmeno con
   una funzione e dei parametri: con i parametri escono ricolori della stessa sagoma, e la
   regola del progetto per "N cose tutte diverse" è la varietà CURATA (una ricetta a mano per
   pezzo, un test che pretende che siano uniche). Qui ogni pezzo è una manciata di righe
   scritte a mano, e questo modulo le traduce in pixel con lo stile di tutto l'arredo:
   contorno più scuro del proprio colore, filo di luce sopra, ombra sotto, volumi in 3/4.

   Una riga = un pezzo di disegno, coordinate in px dentro l'ingombro (0,0 = angolo in alto a
   sinistra; si può salire fino a -12 sopra la casella, non oltre: coprirebbe la faccia di Digsy).
     B x y w h c        scatola: contorno, colore, luce sopra, ombra sotto
     R x y w h c        rettangolo col contorno, senza bande
     F x y w h c        tinta piatta
     C x y w h c        cilindro verticale: luce a sinistra, ombra a destra, tappo chiaro
     O cx cy r c        disco col contorno e un punto di luce
     E cx cy rx ry c    ellisse piena
     T x y w h c        triangolo con la punta in alto
     V x y w h c        triangolo con la punta in basso
     L x1 y1 x2 y2 c    linea da un pixel
     D x y c            un pixel
     G x y w h          vetro: azzurro, contorno, riflesso
     Q x y              fiammella animata (fase dal tempo, REGOLE FERREE #1)
     S x y              scintilla che pulsa
   Colori: un nome della tavolozza qui sotto, `m`/`n` (i due colori del pezzo), oppure #rrggbb;
   `+` schiarisce e `-` scurisce (`W+`, `m-`, `ST--`). */

export const FURN_PALETTE = {
  W: '#8a5f38', WL: '#b07c4a', WD: '#5c4027', ST: '#9a9285', SD: '#6f685c', ME: '#8f9aa3',
  GO: '#d8b23c', RE: '#c65a54', BL: '#5a86c8', GR: '#5f9a52', YE: '#e8c34a', PK: '#e8a0b8',
  WH: '#f3ecda', BK: '#2a2016', BR: '#7a5636', OR: '#e0873a', PU: '#8a6ab0', TE: '#4e8d7c',
  IC: '#bfe3ef', CR: '#e8dcc0', CL: '#c86a4a', LF: '#7ec069', NV: '#3f5a86', SN: '#f6f6f2',
};

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  return '#' + ((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}
/* risolve un colore della ricetta: `W`, `m+`, `#aabbcc`, `ST--` */
export function resolveColor(tok, pal) {
  let base = tok, k = 1;
  while (base.endsWith('+')) { base = base.slice(0, -1); k *= 1.22; }
  while (base.endsWith('-')) { base = base.slice(0, -1); k *= 0.74; }
  let hex = base.startsWith('#') ? base : (base === 'm' || base === 'n') ? (pal && pal[base]) || '#c8b078' : FURN_PALETTE[base];
  if (!hex) hex = '#ff00ff';                        // colore sconosciuto: si vede subito (il test lo vieta)
  return k === 1 ? hex : shade(hex, k);
}

/* ricetta → istruzioni, una volta sola per testo (una stanza piena disegna trenta pezzi a
   frame: ri-analizzare le righe ogni volta sarebbe spreco puro) */
const parsed = new Map();
export function parseRecipe(src) {
  if (parsed.has(src)) return parsed.get(src);
  const out = [];
  for (const raw of String(src).split(/\n|;/)) {
    const line = raw.trim(); if (!line) continue;
    const p = line.split(/\s+/);
    const op = p[0];
    const nums = p.slice(1).map(v => (/^-?\d+(\.\d+)?$/.test(v) ? +v : v));
    out.push({ op, a: nums });
  }
  parsed.set(src, out);
  return out;
}
/* i COLORI usati da una ricetta (per il test: nessun colore sconosciuto) */
export function recipeColors(src) {
  const cols = [];
  for (const s of parseRecipe(src)) {
    const c = s.a[s.a.length - 1];
    if (typeof c === 'string' && !['G', 'Q', 'S'].includes(s.op)) cols.push(c);
  }
  return cols;
}
/* il rettangolo toccato dalla ricetta (in px dell'ingombro): serve a garantire che nessun
   pezzo esca dalla sua casella di lato o salga oltre il limite */
export function recipeBounds(src) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const add = (ax, ay, bx, by) => { x0 = Math.min(x0, ax); y0 = Math.min(y0, ay); x1 = Math.max(x1, bx); y1 = Math.max(y1, by); };
  for (const { op, a } of parseRecipe(src)) {
    if ('BRFCTVG'.includes(op)) add(a[0], a[1], a[0] + a[2], a[1] + a[3]);
    else if (op === 'O') add(a[0] - a[2], a[1] - a[2], a[0] + a[2] + 1, a[1] + a[2] + 1);
    else if (op === 'E') add(a[0] - a[2], a[1] - a[3], a[0] + a[2] + 1, a[1] + a[3] + 1);
    else if (op === 'L') add(Math.min(a[0], a[2]), Math.min(a[1], a[3]), Math.max(a[0], a[2]) + 1, Math.max(a[1], a[3]) + 1);
    else if (op === 'D' || op === 'S') add(a[0], a[1], a[0] + 1, a[1] + 1);
    else if (op === 'Q') add(a[0] - 3, a[1] - 7, a[0] + 4, a[1] + 1);
  }
  return { x0, y0, x1, y1 };
}
/* la FIRMA di una sagoma: le forme e le loro misure, senza i colori. Due pezzi con la stessa
   firma sono lo stesso mobile ricolorato — proprio quello che il catalogo non deve contenere. */
export function recipeShape(src) {
  return parseRecipe(src).map(({ op, a }) => op + a.filter(v => typeof v === 'number').join(',')).join('|');
}

/* ---------- il disegno ---------- */
export function drawRecipe(g, src, x, y, pal, time) {
  const t = (time || 0) / 1000;
  const col = c => resolveColor(String(c), pal);
  const R = (rx, ry, rw, rh, c) => { if (rw > 0 && rh > 0) g.rect(x + rx, y + ry, rw, rh, c); };
  for (const { op, a } of parseRecipe(src)) {
    switch (op) {
      case 'F': R(a[0], a[1], a[2], a[3], col(a[4])); break;
      case 'R': { const c = col(a[4]); R(a[0], a[1], a[2], a[3], shade(c, 0.42)); R(a[0] + 1, a[1] + 1, a[2] - 2, a[3] - 2, c); break; }
      case 'B': {
        const c = col(a[4]), [bx, by, bw, bh] = a;
        R(bx, by, bw, bh, shade(c, 0.42));
        R(bx + 1, by + 1, bw - 2, bh - 2, c);
        R(bx + 1, by + 1, bw - 2, Math.min(3, bh - 2), shade(c, 1.25));
        if (bh > 6) R(bx + 1, by + bh - 3, bw - 2, 2, shade(c, 0.74));
        break;
      }
      case 'C': {
        const c = col(a[4]), [bx, by, bw, bh] = a;
        R(bx, by, bw, bh, shade(c, 0.42));
        R(bx + 1, by + 1, bw - 2, bh - 2, c);
        if (bw > 4) { R(bx + 1, by + 1, 2, bh - 2, shade(c, 1.22)); R(bx + bw - 3, by + 1, 2, bh - 2, shade(c, 0.72)); }
        R(bx + 1, by + 1, bw - 2, Math.min(3, bh - 2), shade(c, 1.35));
        break;
      }
      case 'O': {
        const c = col(a[3]), [cx, cy, r] = a;
        for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
          const q = xx * xx + yy * yy;
          if (q > r * r + r) continue;
          R(cx + xx, cy + yy, 1, 1, q > (r - 1) * (r - 1) + (r - 1) ? shade(c, 0.42) : c);
        }
        if (r >= 2) R(cx - Math.ceil(r / 2), cy - Math.ceil(r / 2), 1, 1, shade(c, 1.4));
        break;
      }
      case 'E': {
        const c = col(a[4]), [cx, cy, rx, ry] = a;
        for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) {
          if ((xx * xx) / (rx * rx + 0.5) + (yy * yy) / (ry * ry + 0.5) <= 1) R(cx + xx, cy + yy, 1, 1, c);
        }
        break;
      }
      case 'T': case 'V': {
        const c = col(a[4]), [bx, by, bw, bh] = a;
        for (let i = 0; i < bh; i++) {
          const k = op === 'T' ? (i + 1) / bh : (bh - i) / bh;
          const ww = Math.max(1, Math.round(bw * k)), xx = bx + Math.floor((bw - ww) / 2);
          R(xx, by + i, ww, 1, shade(c, 0.42));
          if (ww > 2) R(xx + 1, by + i, ww - 2, 1, c);
        }
        break;
      }
      case 'L': {
        const c = col(a[4]);
        let [x0, y0, x1, y1] = a;
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy, guard = 0;
        for (;;) {
          R(x0, y0, 1, 1, c);
          if ((x0 === x1 && y0 === y1) || guard++ > 200) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
        break;
      }
      case 'D': R(a[0], a[1], 1, 1, col(a[2])); break;
      case 'G': {
        const [bx, by, bw, bh] = a;
        R(bx, by, bw, bh, '#3f5a6a');
        R(bx + 1, by + 1, bw - 2, bh - 2, '#bfe3ef');
        R(bx + 2, by + 2, Math.max(1, Math.floor(bw / 4)), Math.max(1, bh - 5), '#eef8fb');
        break;
      }
      case 'Q': {
        const [qx, qy] = a, f = Math.sin(t * 7 + qx) * 0.5 + 0.5, fh = 4 + Math.round(f * 3);
        R(qx - 2, qy - fh, 5, fh, '#c9502a');
        R(qx - 1, qy - fh + 1, 3, fh - 1, '#e8873a');
        R(qx, qy - fh + 2, 1, Math.max(1, fh - 3), '#f6dc78');
        break;
      }
      case 'S': {
        const [sx2, sy2] = a;
        if (Math.sin(t * 3 + sx2 * 0.7) > 0.2) { R(sx2, sy2 - 1, 1, 3, '#ffffff'); R(sx2 - 1, sy2, 3, 1, '#ffffff'); }
        break;
      }
      default: break;
    }
  }
}
