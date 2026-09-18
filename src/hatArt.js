/* CAPPELLI disegnati in NATIVO (modulo puro).

   Prima erano mappe a 16 colonne raddoppiate a blocchi 2×2, con un anello d'ombra largo un pixel
   aggiunto dopo per farle sporgere dalla testa: blocchi grossi, un bordo sottile che non c'entrava
   niente, nessun volume ("i cappelli fanno un po' schifo", con foto della Sartoria).
   Ora ogni cappello si COSTRUISCE con poche forme — cupola, tesa, fascia, cono, corno — a 32
   colonne, sulla stessa griglia del corpo. Ogni forma si ombreggia da sola (luce in alto a
   sinistra, ombra a destra e sotto), e alla fine un unico contorno scuro gira attorno alla sagoma:
   è quello che la stacca dalla testa e dai capelli.

   Uscita nello stesso formato di sempre: vista → [[riga, "32 caratteri"], …], colori da PAL
   (H/L/h seguono il colore scelto, J è il suo contorno; G/Y/g è l'oro dei trofei).

   Testa del corpo (colonne 0..31): righe 0-1 colonne 10-21, righe 2-3 colonne 8-23, dalla 4 in giù
   colonne 6-25; occhi a riga 10. Di profilo guarda a destra: testa 8-25, naso 26-27. */

const W = 32;
/* toni per materiale: [luce, base, ombra] */
const TONES = {
  H: ['L', 'H', 'h'], J: ['J', 'J', 'J'], G: ['Y', 'G', 'g'], Y: ['Y', 'Y', 'G'],
  W: ['W', 'W', 'V'], Q: ['Q', 'Q', 'q'], R: ['R', 'R', 'r'], D: ['W', 'D', 'd'], K: ['K', 'K', 'K'],
  A: ['M', 'A', 'a'],
  B: ['B', 'B', 'b'],
  /* viso (faceArt.js): Z barba, O montatura degli occhiali — colori propri, scelti dal
     giocatore come i capelli, non toni presi in prestito da un altro materiale */
  Z: ['n', 'Z', 'm'], O: ['l', 'O', 'o'],
  /* corpo (bodyArt.js): pelle, maglia, pantaloni, occhi, guance */
  F: ['N', 'F', 'f'], S: ['T', 'S', 's'], P: ['U', 'P', 'p'], E: ['E', 'E', 'E'], C: ['c', 'c', 'c'],   // cuoio (grembiule del falegname, npcArt.js)   // capelli (hairArt.js): luce, base, ombra del colore scelto
};
/* contorno per materiale (vince il primo trovato in quest'ordine: il più scuro) */
/* Nell'elenco vanno anche i toni di LUCE e di OMBRA, non solo il tono base: i capelli sul
   bordo della sagoma sono spesso il tono d'ombra ('a') o di luce ('M'), e quei pixel
   restavano senza contorno — il profilo si apriva proprio lì (trovato misurando Digsy di
   spalle). Stessa cosa per il cappello ('h', 'L'). */
const OUTLINE_ORDER = ['H', 'h', 'L', 'J', 'A', 'a', 'M', 'B', 'G', 'Y', 'R', 'Q', 'D', 'W'];
const OUTLINE = { H: 'J', h: 'J', L: 'J', J: 'J', A: 'I', a: 'I', M: 'I', B: 'w', G: 'j', Y: 'j', R: 'r', Q: 'q', D: 'd', W: 'v' };

/* arrotondamento SIMMETRICO: un mezzo pixel va verso il centro della testa (15.5), non sempre a
   destra — con Math.round le due metà di una forma centrata non erano più una lo specchio dell'altra */
export function rnd(v) { const f = v - Math.floor(v); return Math.abs(f - 0.5) < 1e-9 ? (v < 15.5 ? Math.ceil(v) : Math.floor(v)) : Math.round(v); }

export function grid() {
  const rows = new Map();
  const g = {
    get(x, y) { const r = rows.get(y); return r && x >= 0 && x < W ? r[x] : null; },
    set(x, y, m, t) {
      x = rnd(x); y = Math.round(y);
      if (x < 0 || x >= W) return;
      if (!rows.has(y)) rows.set(y, new Array(W).fill(null));
      rows.get(y)[x] = { m, t: t == null ? 1 : t };
    },
    /* riga orizzontale con tono per posizione: luce a sinistra, ombra a destra */
    span(y, x0, x1, m, opt = {}) {
      const lo = rnd(x0), hi = rnd(x1), n = Math.max(1, hi - lo);
      for (let x = lo; x <= hi; x++) {
        const u = (x - lo) / n;
        let t = opt.t != null ? opt.t : (u < (opt.lit ?? 0.3) ? 0 : u > (opt.dark ?? 0.72) ? 2 : 1);
        g.set(x, y, m, t);
      }
    },
    fillBlock(x0, y0, x1, y1, m, t) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.set(x, y, m, t); },
    /* CUPOLA: da y0 (cima) a y1 (base), mezza larghezza che cresce come un'ellisse fino a rx */
    dome(cx, y0, y1, rx, m, opt = {}) {
      /* `top` = quanto è piatta la cima (0 tonda, 1 squadrata): la parte alta si arrotonda come un
         quarto d'ellisse, sotto i fianchi scendono dritti */
      const h = y1 - y0 + 1, round = 1 - (opt.top ?? 0.45) * 0.5;
      for (let y = y0; y <= y1; y++) {
        const v = (y - y0 + 0.5) / h, e = Math.min(1, v / round);
        const w = rx * Math.sqrt(1 - (1 - e) * (1 - e));
        const lo = rnd(cx - w), hi = rnd(cx + w), n = Math.max(1, hi - lo);
        for (let x = lo; x <= hi; x++) {
          const u = (x - lo) / n;
          let t = 1;
          if (u < 0.34 && v < 0.75) t = 0;
          if (y === y0 && u < 0.7) t = 0;
          if (u > 0.74 || (y === y1 && opt.shadeBase)) t = 2;
          g.set(x, y, m, t);
        }
      }
    },
    /* TESA vista di fronte: riga alta in luce, righe basse (il sotto) in ombra */
    brim(y, x0, x1, rows, m) {
      for (let i = 0; i < rows; i++) {
        const inset = i === rows - 1 && rows > 1 ? 1 : 0;
        g.span(y + i, x0 + inset, x1 - inset, m, i === 0 ? { lit: 0.62, dark: 0.9 } : { t: 2 });
      }
    },
    /* segmento spesso (corna, piume, nappe) */
    line(xa, ya, xb, yb, w, m, t) {
      const n = Math.max(1, Math.round(Math.max(Math.abs(xb - xa), Math.abs(yb - ya))));
      for (let i = 0; i <= n; i++) {
        const x = xa + (xb - xa) * i / n, y = ya + (yb - ya) * i / n;
        for (let k = 0; k < w; k++) g.set(x + k - (w >> 1), y, m, t);
      }
    },
    /* pallina (pompon, gemme): tonda, luce in alto a sinistra */
    ball(cx, cy, r, m) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy > r * r + 0.3) continue;
        g.set(x, y, m, dx + dy < -r * 0.5 ? 0 : dx + dy > r * 0.6 ? 2 : 1);
      }
    },
    clear(x, y) { const r = rows.get(y); if (r && x >= 0 && x < W) r[x] = null; },
    rows,
  };
  return g;
}

/* dal disegno ai caratteri: contorno esterno + toni */
export function finish(g, opt = {}) {
  const out = new Map();
  const ys = [...g.rows.keys()];
  if (!ys.length) return [];
  const y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
  for (let y = y0; y <= y1; y++) {
    const line = new Array(W).fill('.');
    let any = false;
    for (let x = 0; x < W; x++) {
      const c = g.get(x, y);
      if (c) { line[x] = TONES[c.m][c.t]; any = true; continue; }
      if (opt.noOutline) continue;
      const nb = [g.get(x - 1, y), g.get(x + 1, y), g.get(x, y - 1), g.get(x, y + 1)].filter(Boolean);
      if (!nb.length) continue;
      const m = OUTLINE_ORDER.find(k => nb.some(n => n.m === k));
      if (m) { line[x] = OUTLINE[m]; any = true; }
    }
    if (any) out.set(y, line.join(''));
  }
  return [...out.entries()].sort((a, b) => a[0] - b[0]);
}

/* testa del cappuccio: cupola tonda e stoffa che scende ai lati del viso fino alle spalle */
function hoodHead(g, cx, rx, [x0, x1]) {
  g.dome(cx, -4, 6, rx, 'H', { top: 0.15 });
  for (let y = 7; y <= 16; y++) g.span(y, x0, x1, 'H', { lit: 0.22, dark: 0.78 });
}
/* mantellina corta: copre solo le spalle (sotto si vede la maglia), orlo a punte morbide e una piega */
function hoodCape(g, x0, x1) {
  for (let y = 17; y <= 19; y++) g.span(y, x0 - (y - 17), x1 + (y - 17), 'H', { lit: 0.2, dark: 0.8 });
  for (let x = x0 - 2; x <= x1 + 2; x++) if (((x - x0 + 2) % 5) < 3) g.set(x, 20, 'H', 2);
  for (let y = 18; y <= 20; y++) { g.set(x0 + 3, y, 'H', 2); g.set(x1 - 3, y, 'H', 2); }
}
function carve(g, inside) { for (let y = -4; y <= 23; y++) for (let x = 0; x < 32; x++) if (inside(x, y)) g.clear(x, y); }
/* bordo interno dell'apertura in ombra: la stoffa ha spessore */
function rim(g, inside) {
  for (let y = -4; y <= 23; y++) for (let x = 0; x < 32; x++)
    if (g.get(x, y) && !inside(x, y) && (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1))) g.set(x, y, 'H', 2);
}

function santa(g, cx, s) {
  for (let y = 2; y >= -7; y--) {
    const k = 2 - y, w = 9.5 - k * 0.95, c = cx + s * k * k * 0.085;
    const lo = Math.round(c - w), hi = Math.round(c + w), n = Math.max(1, hi - lo);
    for (let x = lo; x <= hi; x++) { const u = (x - lo) / n; g.set(x, y, 'H', u < 0.3 ? 0 : u > 0.72 ? 2 : 1); }
  }
  const tx = Math.round(cx + s * 7.5);
  g.line(tx, -7, tx + s * 2, -5, 2, 'H', 2); g.line(tx + s * 2, -5, tx + s * 3, -2, 2, 'H', 2);
  for (let y = 2; y <= 5; y++) for (let x = 4; x <= 27; x++) g.set(x, y, 'W', (x * 5 + y * 3) % 6 === 0 ? 2 : y === 2 && x < 16 ? 0 : 1);
  g.ball(tx + s * 3, -1, 2.3, 'W');
}

/* specchio per le viste di fronte/retro disegnate solo a metà: non serve, ma teniamo il centro */
const CX = 15.5, SX = 16.5;   // centro testa di fronte / di profilo

/* ================= le forme ================= */
const DRAW = {
  explorer: {
    down(g) { g.dome(CX, -6, 1, 7, 'H'); g.span(0, 9, 22, 'J'); g.span(1, 9, 22, 'J'); g.brim(2, 3, 28, 3, 'H'); },
    up(g) { g.dome(CX, -6, 1, 7, 'H'); g.span(0, 9, 22, 'J'); g.span(1, 9, 22, 'J'); g.brim(2, 3, 28, 3, 'H'); },
    side(g) { g.dome(SX - 1, -6, 1, 7, 'H'); g.span(0, 9, 22, 'J'); g.span(1, 9, 22, 'J'); g.span(2, 3, 30, 'H', { lit: 0.6, dark: 0.92 }); g.span(3, 4, 30, 'H', { t: 2 }); },
  },
  cap: {
    down(g) { g.dome(CX, -3, 3, 10, 'H', { top: 0.6 }); g.line(15.5, -3, 15.5, 2, 1, 'H', 2); g.set(15, -4, 'H', 0); g.set(16, -4, 'H', 1); g.span(4, 7, 24, 'H', { t: 0 }); g.span(5, 8, 23, 'H', { t: 2 }); },
    up(g) { g.dome(CX, -3, 4, 10, 'H', { top: 0.6 }); g.line(15.5, -3, 15.5, 2, 1, 'H', 2); g.set(15, -4, 'H', 0); g.set(16, -4, 'H', 1); g.fillBlock(13, 3, 18, 4, 'J'); },
    side(g) { g.dome(SX - 1, -3, 3, 9, 'H', { top: 0.6 }); g.set(15, -4, 'H', 0); g.span(3, 22, 30, 'H', { t: 0 }); g.span(4, 22, 30, 'H', { t: 2 }); },
  },
  beanie: {
    down(g) { g.dome(CX, -5, 2, 10, 'H', { top: 0.55 }); for (let x = 6; x <= 25; x++) for (let y = 2; y <= 4; y++) g.set(x, y, 'H', x % 2 ? (x > 21 ? 2 : 1) : (x < 12 ? 0 : 2)); g.ball(CX, -8, 2.6, 'W'); },
    up(g) { DRAW.beanie.down(g); },
    side(g) { g.dome(SX - 1, -5, 2, 9.5, 'H', { top: 0.55 }); for (let x = 7; x <= 25; x++) for (let y = 2; y <= 4; y++) g.set(x, y, 'H', x % 2 ? (x > 21 ? 2 : 1) : (x < 12 ? 0 : 2)); g.ball(SX - 3, -8, 2.6, 'W'); },
  },
  flowercrown: {
    down(g) {
      for (let x = 5; x <= 26; x++) g.set(x, 0, 'Q', x % 3 === 0 ? 0 : x % 3 === 1 ? 1 : 2);
      for (let x = 6; x <= 25; x += 2) g.set(x, -1, 'Q', 1);
      const flower = (x, y, m) => { g.set(x, y - 1, m, 0); g.set(x - 1, y, m, 0); g.set(x + 1, y, m, 2); g.set(x, y + 1, m, 2); g.set(x, y, 'Y', 1); };
      flower(7, -2, 'W'); flower(12, -3, 'H'); flower(CX + 0.5 - 0.5, -3, 'W'); flower(20, -3, 'H'); flower(24, -2, 'W');
    },
    up(g) { for (let x = 5; x <= 26; x++) g.set(x, 0, 'Q', x % 3 === 0 ? 0 : x % 3 === 1 ? 1 : 2); for (let x = 6; x <= 25; x += 2) g.set(x, -1, 'Q', 1); const f = (x, y, m) => { g.set(x, y - 1, m, 0); g.set(x - 1, y, m, 0); g.set(x + 1, y, m, 2); g.set(x, y + 1, m, 2); g.set(x, y, 'Y', 1); }; f(9, -2, 'H'); f(22, -2, 'H'); },
    side(g) { for (let x = 7; x <= 25; x++) g.set(x, 0, 'Q', x % 3 === 0 ? 0 : x % 3 === 1 ? 1 : 2); for (let x = 8; x <= 24; x += 2) g.set(x, -1, 'Q', 1); const f = (x, y, m) => { g.set(x, y - 1, m, 0); g.set(x - 1, y, m, 0); g.set(x + 1, y, m, 2); g.set(x, y + 1, m, 2); g.set(x, y, 'Y', 1); }; f(11, -2, 'H'); f(17, -3, 'W'); f(23, -2, 'H'); },
  },
  bandana: {
    down(g) { g.dome(CX, -2, 4, 10.5, 'H', { top: 0.7 }); g.span(4, 6, 25, 'H', { t: 2 }); for (const [x, y] of [[10, 0], [15, 2], [20, 0], [13, -2], [22, 3], [8, 3]]) g.set(x, y, 'W', 1); },
    up(g) { g.dome(CX, -2, 4, 10.5, 'H', { top: 0.7 }); for (const [x, y] of [[10, 0], [20, 1], [15, -1]]) g.set(x, y, 'W', 1); g.ball(CX, 5, 1.6, 'H'); g.line(14, 6, 11, 11, 2, 'H', 1); g.line(17, 6, 20, 11, 2, 'H', 2); },
    side(g) { g.dome(SX - 1, -2, 4, 10, 'H', { top: 0.7 }); g.span(4, 7, 25, 'H', { t: 2 }); for (const [x, y] of [[12, 0], [18, 2], [21, -1]]) g.set(x, y, 'W', 1); g.ball(6, 3, 1.6, 'H'); g.line(5, 4, 2, 9, 2, 'H', 1); g.line(6, 5, 5, 10, 2, 'H', 2); },
  },
  hood: {
    /* "sembra un casco da faraone": finiva al mento, dritto come un elmo. Un cappuccio si riconosce
       dall'apertura TONDA attorno al viso, dalla stoffa che si allarga sulle spalle e dalla punta
       molle che ricade dietro. */
    down(g) {
      hoodHead(g, CX, 11.5, [4, 27]);
      hoodCape(g, 5, 26);
      carve(g, (x, y) => ((x - CX) / 8.2) ** 2 + ((y - 9.5) / 8) ** 2 < 1 && y <= 16);
      rim(g, (x, y) => ((x - CX) / 8.2) ** 2 + ((y - 9.5) / 8) ** 2 < 1 && y <= 16);
      g.span(2, 12, 19, 'J'); g.span(3, 10, 21, 'J'); g.set(9, 4, 'J'); g.set(22, 4, 'J');    // buio sotto la stoffa
      g.set(15, 17, 'Y', 0); g.set(16, 17, 'Y', 1); g.set(15, 18, 'Y', 2); g.set(16, 18, 'Y', 2);  // fermaglio
    },
    up(g) {
      hoodHead(g, CX, 11.5, [4, 27]);
      hoodCape(g, 5, 26);
      /* la punta: dalla nuca scende a goccia sulla schiena */
      for (let y = 6; y <= 22; y++) { const w = Math.max(0.5, 3.5 - Math.max(0, y - 13) * 0.38); g.span(y, CX - w, CX + w, 'H', { lit: 0.3, dark: 0.65 }); g.set(Math.round(CX - w) - 1, y, 'H', 2); }
    },
    side(g) {
      hoodHead(g, SX - 1.5, 11, [5, 21]);
      hoodCape(g, 7, 24);
      const face = (x, y) => ((x - 25) / 7) ** 2 + ((y - 9.5) / 8) ** 2 < 1 && y <= 17;
      carve(g, face); rim(g, face);
      g.span(3, 21, 24, 'J'); g.set(19, 5, 'J'); g.set(19, 6, 'J');
      /* la punta ricade dietro la nuca */
      g.line(6, 2, 2, 8, 3, 'H', 1); g.line(2, 8, 1, 13, 2, 'H', 2); g.set(1, 14, 'H', 2);
    },
  },
  snorkel: {
    down(g) {
      g.span(8, 4, 27, 'J'); g.span(9, 4, 27, 'J');
      for (let y = 6; y <= 13; y++) g.span(y, 8, 23, 'H', { lit: 0.2, dark: 0.85 });
      for (let y = 7; y <= 12; y++) g.span(y, 10, 21, 'D', { t: 1 });
      g.span(7, 10, 21, 'D', { t: 2 }); g.set(11, 8, 'D', 0); g.set(12, 8, 'D', 0); g.set(11, 9, 'D', 0);
      g.fillBlock(15, 8, 16, 12, 'H', 1);
      g.line(27.5, -5, 27.5, 13, 3, 'H', 1); g.fillBlock(26, -8, 29, -6, 'W', 0); g.line(26, 14, 22, 14, 2, 'H', 2);
    },
    up(g) { g.span(8, 4, 27, 'J'); g.span(9, 4, 27, 'J'); g.line(4.5, -5, 4.5, 9, 3, 'H', 1); g.fillBlock(3, -8, 6, -6, 'W', 0); },
    side(g) {
      g.span(8, 8, 21, 'J'); g.span(9, 8, 21, 'J');
      for (let y = 6; y <= 13; y++) g.span(y, 21, 28, 'H', { lit: 0.2, dark: 0.8 });
      for (let y = 7; y <= 12; y++) g.span(y, 24, 28, 'D', { t: 1 }); g.set(25, 8, 'D', 0);
      g.line(13.5, -5, 13.5, 9, 3, 'H', 1); g.fillBlock(12, -8, 15, -6, 'W', 0);
    },
  },
  ushanka: {
    down(g) {
      g.dome(CX, -6, 1, 9.5, 'H', { top: 0.75 });
      for (let y = 1; y <= 4; y++) for (let x = 4; x <= 27; x++) g.set(x, y, 'W', (x * 3 + y * 5) % 7 === 0 ? 2 : y === 1 && x < 15 ? 0 : 1);
      for (let y = 5; y <= 14; y++) { g.span(y, 3, 7, 'H', { t: y === 14 ? 2 : 1 }); g.span(y, 24, 28, 'H', { t: 2 }); g.set(3, y, 'W', 1); g.set(28, y, 'W', 2); }
      g.span(15, 4, 6, 'W', { t: 2 }); g.span(15, 25, 27, 'W', { t: 2 });
    },
    up(g) {
      g.dome(CX, -6, 1, 9.5, 'H', { top: 0.75 });
      for (let y = 1; y <= 8; y++) for (let x = 4; x <= 27; x++) g.set(x, y, 'W', (x * 3 + y * 5) % 7 === 0 ? 2 : 1);
      for (let y = 9; y <= 14; y++) { g.span(y, 3, 7, 'H'); g.span(y, 24, 28, 'H', { t: 2 }); }
    },
    side(g) {
      g.dome(SX - 1, -6, 1, 9.5, 'H', { top: 0.75 });
      for (let y = 1; y <= 4; y++) for (let x = 6; x <= 26; x++) g.set(x, y, 'W', (x * 3 + y * 5) % 7 === 0 ? 2 : 1);
      for (let y = 5; y <= 14; y++) { g.span(y, 10, 15, 'H', { t: y === 14 ? 2 : 1 }); g.set(15, y, 'W', 2); }
      for (let y = 5; y <= 9; y++) g.span(y, 5, 9, 'W', { t: 2 });
    },
  },
  vikingo: {
    down(g) {
      g.dome(CX, -5, 3, 10, 'H', { top: 0.5 });
      g.line(15.5, -5, 15.5, 2, 2, 'H', 0);
      g.span(3, 5, 26, 'W', { lit: 0.4 }); g.span(4, 5, 26, 'W', { t: 2 });
      for (let x = 8; x <= 24; x += 4) g.set(x, 3, 'J', 1);
      g.fillBlock(15, 5, 16, 10, 'W', 1); g.set(16, 6, 'W', 2);
      const horn = s => { const bx = s < 0 ? 6 : 25; g.line(bx, 1, bx + 3 * s, -2, 3, 'W', 0); g.line(bx + 3 * s, -2, bx + 5 * s, -6, 2, 'W', 1); g.line(bx + 5 * s, -6, bx + 5 * s, -9, 1, 'W', 2); };
      horn(-1); horn(1);
    },
    up(g) {
      g.dome(CX, -5, 3, 10, 'H', { top: 0.5 }); g.line(15.5, -5, 15.5, 2, 2, 'H', 2);
      g.span(3, 5, 26, 'W', { lit: 0.4 }); g.span(4, 5, 26, 'W', { t: 2 });
      const horn = s => { const bx = s < 0 ? 6 : 25; g.line(bx, 1, bx + 3 * s, -2, 3, 'W', 0); g.line(bx + 3 * s, -2, bx + 5 * s, -6, 2, 'W', 1); g.line(bx + 5 * s, -6, bx + 5 * s, -9, 1, 'W', 2); };
      horn(-1); horn(1);
    },
    side(g) {
      g.dome(SX - 1, -5, 3, 9.5, 'H', { top: 0.5 });
      g.span(3, 6, 26, 'W', { lit: 0.4 }); g.span(4, 6, 26, 'W', { t: 2 });
      for (let x = 9; x <= 24; x += 4) g.set(x, 3, 'J', 1);
      g.line(13, -1, 10, -4, 3, 'W', 0); g.line(10, -4, 9, -8, 2, 'W', 1); g.line(9, -8, 10, -10, 1, 'W', 2);
      g.fillBlock(24, 5, 25, 9, 'W', 1);
    },
  },
  sombrero: {
    down(g) {
      g.dome(CX, -8, 0, 6.5, 'H', { top: 0.3 });
      for (let x = 10; x <= 21; x++) { g.set(x, -1, x % 2 ? 'R' : 'W', 1); g.set(x, 0, x % 2 ? 'W' : 'R', 1); }
      g.span(1, 1, 30, 'H', { lit: 0.6, dark: 0.9 }); g.span(2, 0, 31, 'H', { lit: 0.5, dark: 0.9 }); g.span(3, 1, 30, 'H', { t: 2 });
      g.set(0, 1, 'H', 0); g.set(31, 1, 'H', 2); g.set(0, 0, 'H', 0); g.set(31, 0, 'H', 2);
      for (let x = 3; x <= 28; x += 5) g.set(x, 2, 'Y', 1);
    },
    up(g) { g.dome(CX, -8, 0, 6.5, 'H', { top: 0.3 }); for (let x = 10; x <= 21; x++) { g.set(x, -1, x % 2 ? 'R' : 'W', 1); g.set(x, 0, x % 2 ? 'W' : 'R', 1); } g.span(1, 1, 30, 'H', { lit: 0.6, dark: 0.9 }); g.span(2, 0, 31, 'H', { lit: 0.5, dark: 0.9 }); g.span(3, 1, 30, 'H', { t: 2 }); g.set(0, 0, 'H', 0); g.set(31, 0, 'H', 2); },
    side(g) { g.dome(SX - 1, -8, 0, 6, 'H', { top: 0.3 }); for (let x = 10; x <= 21; x++) { g.set(x, -1, x % 2 ? 'R' : 'W', 1); g.set(x, 0, x % 2 ? 'W' : 'R', 1); } g.span(1, 1, 31, 'H', { lit: 0.6, dark: 0.9 }); g.span(2, 0, 31, 'H', { t: 2 }); g.set(0, 0, 'H', 0); g.set(31, 0, 'H', 2); },
  },
  partyhat: {
    down(g) {
      for (let y = -9; y <= 2; y++) {
        const w = (y + 10) * 0.72;
        const lo = Math.round(CX - w), hi = Math.round(CX + w);
        for (let x = lo; x <= hi; x++) {
          const stripe = ((x - y * 1) >> 2) % 2 === 0;
          const u = (x - lo) / Math.max(1, hi - lo);
          g.set(x, y, stripe ? 'W' : 'H', u < 0.3 ? 0 : u > 0.7 ? 2 : 1);
        }
      }
      g.ball(CX, -11, 2.2, 'Y');
    },
    up(g) { DRAW.partyhat.down(g); },
    side(g) { DRAW.partyhat.down(g); },
  },
  cowboy: {
    down(g) {
      g.dome(CX, -7, 0, 7, 'H', { top: 1.3 });
      g.clear(15, -7); g.clear(16, -7); g.set(15, -6, 'H', 2); g.set(16, -6, 'H', 2);
      g.span(-1, 9, 22, 'J'); g.span(0, 9, 22, 'J');
      g.span(1, 3, 28, 'H', { lit: 0.6, dark: 0.9 }); g.span(2, 4, 27, 'H', { t: 2 });
      g.fillBlock(1, -2, 2, 1, 'H', 0); g.set(0, -3, 'H', 0); g.fillBlock(29, -2, 30, 1, 'H', 2); g.set(31, -3, 'H', 2);
      g.set(11, 0, 'Y', 1);
    },
    up(g) { DRAW.cowboy.down(g); g.clear(11, 0); g.set(11, 0, 'J'); },
    side(g) {
      g.dome(SX - 1, -7, 0, 7, 'H', { top: 1.3 }); g.set(11, -6, 'H', 2);
      g.span(-1, 9, 22, 'J'); g.span(0, 9, 22, 'J');
      g.span(1, 2, 30, 'H', { lit: 0.6, dark: 0.9 }); g.span(2, 4, 30, 'H', { t: 2 });
      g.set(1, 0, 'H', 0); g.set(0, -1, 'H', 0); g.set(31, 2, 'H', 2);
    },
  },
  santa: {
    /* cono morbido che si piega su un lato e ricade col pompon: s = verso della punta */
    down(g) { santa(g, CX, 1); },
    up(g) { santa(g, CX, -1); },
    side(g) { santa(g, SX - 1, -1); },
  },
  /* ============ trofei (oro) ============ */
  crownGold: {
    down(g) {
      for (let y = -1; y <= 3; y++) g.span(y, 6, 25, 'G', y === 3 ? { t: 2 } : {});
      for (const cx of [7, 15.5, 24]) { const w = cx === 15.5 ? 2 : 1; for (let y = -5; y <= -2; y++) g.span(y, Math.round(cx - w + (y + 5) * 0.0), Math.round(cx + w), 'G'); g.ball(cx, -6.5, 1.2, 'Y'); }
      g.ball(11, 1, 1.1, 'R'); g.ball(20, 1, 1.1, 'R'); g.fillBlock(15, 0, 16, 1, 'D', 1); g.set(15, 0, 'D', 0);
    },
    up(g) { for (let y = -1; y <= 3; y++) g.span(y, 6, 25, 'G', y === 3 ? { t: 2 } : {}); for (const cx of [7, 15.5, 24]) { const w = cx === 15.5 ? 2 : 1; for (let y = -5; y <= -2; y++) g.span(y, Math.round(cx - w), Math.round(cx + w), 'G'); g.ball(cx, -6.5, 1.2, 'Y'); } g.ball(15.5, 1, 1.1, 'R'); },
    side(g) { for (let y = -1; y <= 3; y++) g.span(y, 7, 25, 'G', y === 3 ? { t: 2 } : {}); for (const cx of [9, 16, 23]) { for (let y = -5; y <= -2; y++) g.span(y, cx - 1, cx + 1, 'G'); g.ball(cx, -6.5, 1.2, 'Y'); } g.ball(22, 1, 1.1, 'R'); g.ball(12, 1, 1.1, 'D'); },
  },
  gradGold: {
    down(g) {
      g.dome(CX, -2, 3, 9.5, 'G', { top: 0.8 });
      g.span(-5, 7, 24, 'Y'); g.span(-4, 2, 29, 'G', { lit: 0.45 }); g.span(-3, 5, 26, 'G', { t: 2 });
      g.set(15, -5, 'K'); g.set(16, -5, 'K');
      g.line(17, -5, 27, -5, 1, 'Y', 1); g.line(28, -4, 28, 2, 1, 'Y', 1); g.fillBlock(27, 3, 29, 5, 'Y', 1); g.set(29, 5, 'Y', 2);
    },
    up(g) { g.dome(CX, -2, 3, 9.5, 'G', { top: 0.8 }); g.span(-5, 7, 24, 'Y'); g.span(-4, 2, 29, 'G', { lit: 0.45 }); g.span(-3, 5, 26, 'G', { t: 2 }); g.line(3, -4, 3, 2, 1, 'Y', 1); g.fillBlock(2, 3, 4, 5, 'Y', 1); },
    side(g) { g.dome(SX - 1, -2, 3, 9, 'G', { top: 0.8 }); g.span(-5, 5, 26, 'Y'); g.span(-4, 3, 28, 'G', { t: 2 }); g.line(8, -3, 8, 2, 1, 'Y', 1); g.fillBlock(7, 3, 9, 5, 'Y', 1); },
  },
  laurelGold: {
    /* due rami di foglie a goccia (2×3, inclinate) che salgono dai lati e si incontrano sulla fronte */
    down(g) {
      g.span(2, 6, 25, 'G'); g.span(3, 7, 24, 'G', { t: 2 });
      const leaf = (x, y, s) => { g.set(x, y, 'Q', s < 0 ? 0 : 1); g.set(x + s, y - 1, 'Q', s < 0 ? 0 : 1); g.set(x, y - 1, 'Q', 1); g.set(x + s, y - 2, 'Q', 2); };
      for (let i = 0; i < 4; i++) { leaf(6 + i * 2.5, 1 - i * 0.7, -1); leaf(25 - i * 2.5, 1 - i * 0.7, 1); }
      g.ball(CX, -2, 1.1, 'Y');
    },
    up(g) { g.span(2, 6, 25, 'G'); g.span(3, 7, 24, 'G', { t: 2 }); const leaf = (x, y, s) => { g.set(x, y, 'Q', 1); g.set(x + s, y - 1, 'Q', 1); g.set(x, y - 1, 'Q', 0); g.set(x + s, y - 2, 'Q', 2); }; for (let i = 0; i < 4; i++) { leaf(6 + i * 2.5, 1 - i * 0.7, 1); leaf(25 - i * 2.5, 1 - i * 0.7, -1); } g.fillBlock(14, 4, 17, 5, 'R', 1); },
    side(g) { g.span(2, 7, 25, 'G'); g.span(3, 8, 24, 'G', { t: 2 }); const leaf = (x, y) => { g.set(x, y, 'Q', 1); g.set(x + 1, y - 1, 'Q', 0); g.set(x, y - 1, 'Q', 1); g.set(x + 1, y - 2, 'Q', 2); }; for (let i = 0; i < 7; i++) leaf(8 + i * 2.6, 1 - (i % 2)); },
  },
  gogglesGold: {
    down(g) {
      g.span(2, 5, 26, 'G'); g.span(3, 5, 26, 'G', { t: 2 });
      for (const cx of [11, 20]) { g.ball(cx, 1, 3.4, 'G'); g.ball(cx, 1, 2.1, 'D'); g.set(cx - 1, 0, 'D', 0); }
      g.fillBlock(15, 1, 16, 2, 'G', 1);
    },
    up(g) { g.span(2, 5, 26, 'G'); g.span(3, 5, 26, 'G', { t: 2 }); g.fillBlock(14, 1, 17, 4, 'G', 0); g.fillBlock(15, 2, 16, 3, 'K'); },
    side(g) { g.span(2, 8, 25, 'G'); g.span(3, 8, 25, 'G', { t: 2 }); g.ball(21, 1, 3.4, 'G'); g.ball(21.5, 1, 2.1, 'D'); g.set(21, 0, 'D', 0); },
  },
  hornsGold: {
    down(g) {
      g.dome(CX, -3, 3, 10, 'G', { top: 0.5 }); g.span(3, 6, 25, 'G', { t: 2 });
      const horn = s => { const bx = s < 0 ? 8 : 23; g.line(bx, -1, bx + 2 * s, -5, 3, 'G', s < 0 ? 0 : 2); g.line(bx + 2 * s, -5, bx + 1 * s, -9, 2, 'Y', 1); g.set(bx, -11, 'Y', 1); };
      horn(-1); horn(1); g.ball(CX, 0, 1.2, 'R');
    },
    up(g) { g.dome(CX, -3, 3, 10, 'G', { top: 0.5 }); g.span(3, 6, 25, 'G', { t: 2 }); const horn = s => { const bx = s < 0 ? 8 : 23; g.line(bx, -1, bx + 2 * s, -5, 3, 'G', 1); g.line(bx + 2 * s, -5, bx + 1 * s, -9, 2, 'Y', 1); g.set(bx, -11, 'Y', 1); }; horn(-1); horn(1); },
    side(g) { g.dome(SX - 1, -3, 3, 9.5, 'G', { top: 0.5 }); g.span(3, 7, 25, 'G', { t: 2 }); g.line(18, -2, 16, -6, 3, 'G', 0); g.line(16, -6, 17, -10, 2, 'Y', 1); g.ball(23, 0, 1.2, 'R'); },
  },
  pithGold: {
    down(g) { g.dome(CX, -7, 1, 8, 'G', { top: 0.85 }); g.line(15.5, -7, 15.5, 1, 1, 'G', 2); g.ball(CX, -8, 1, 'Y'); g.span(1, 8, 23, 'G', { t: 2 }); g.brim(2, 4, 27, 3, 'G'); },
    up(g) { DRAW.pithGold.down(g); },
    side(g) { g.dome(SX - 1, -7, 1, 8, 'G', { top: 0.85 }); g.ball(SX - 1, -8, 1, 'Y'); g.span(1, 8, 24, 'G', { t: 2 }); g.span(2, 3, 30, 'G', { lit: 0.6, dark: 0.9 }); g.span(3, 5, 30, 'G', { t: 2 }); },
  },
  featherGold: {
    down(g) {
      g.dome(CX - 1, -4, 3, 11, 'G', { top: 0.6 }); g.span(3, 5, 25, 'G', { t: 2 }); g.set(15, -5, 'Y', 1);
      g.line(22, 0, 25, -4, 2, 'R', 1); g.line(25, -4, 28, -9, 2, 'R', 0); g.line(28, -9, 29, -12, 1, 'R', 0);
      for (const [x, y] of [[26, -4], [27, -6], [28, -8], [23, -1]]) g.set(x, y, 'R', 2);
      g.ball(21, 1, 1.3, 'Y');
    },
    up(g) { g.dome(CX + 1, -4, 3, 11, 'G', { top: 0.6 }); g.span(3, 6, 26, 'G', { t: 2 }); g.line(9, 0, 6, -4, 2, 'R', 1); g.line(6, -4, 3, -9, 2, 'R', 0); g.line(3, -9, 2, -12, 1, 'R', 2); },
    side(g) { g.dome(SX - 1, -4, 3, 10.5, 'G', { top: 0.6 }); g.span(3, 7, 26, 'G', { t: 2 }); g.line(11, 0, 8, -4, 2, 'R', 1); g.line(8, -4, 5, -9, 2, 'R', 0); g.line(5, -9, 4, -12, 1, 'R', 2); g.ball(12, 1, 1.3, 'Y'); },
  },
  hardhatGold: {
    down(g) { g.dome(CX, -6, 2, 9, 'G', { top: 0.45 }); g.fillBlock(14, -6, 17, 2, 'Y', 1); g.fillBlock(17, -5, 17, 2, 'G', 2); g.span(3, 3, 28, 'G', { lit: 0.55, dark: 0.9 }); g.span(4, 4, 27, 'G', { t: 2 }); },
    up(g) { g.dome(CX, -6, 2, 9, 'G', { top: 0.45 }); g.fillBlock(14, -6, 17, 2, 'Y', 1); g.span(3, 4, 27, 'G', { lit: 0.55, dark: 0.9 }); g.span(4, 5, 26, 'G', { t: 2 }); },
    side(g) { g.dome(SX - 1, -6, 2, 9, 'G', { top: 0.45 }); g.line(8, -3, 21, -6, 2, 'Y', 1); g.span(3, 5, 31, 'G', { lit: 0.55, dark: 0.9 }); g.span(4, 7, 31, 'G', { t: 2 }); },
  },
  lampGold: {
    down(g) { g.dome(CX, -5, 3, 10, 'G', { top: 0.55 }); g.span(3, 6, 25, 'G', { t: 2 }); g.fillBlock(12, -3, 19, 3, 'K'); g.ball(CX, 0, 2.4, 'Y'); g.fillBlock(15, -1, 16, 0, 'W', 1); },
    up(g) { g.dome(CX, -5, 3, 10, 'G', { top: 0.55 }); g.span(3, 6, 25, 'G', { t: 2 }); g.fillBlock(13, 1, 18, 4, 'K'); g.fillBlock(14, 2, 17, 3, 'G', 2); },
    side(g) { g.dome(SX - 1, -5, 3, 9.5, 'G', { top: 0.55 }); g.span(3, 7, 25, 'G', { t: 2 }); g.fillBlock(24, -3, 28, 3, 'K'); g.fillBlock(27, -2, 29, 2, 'Y', 1); g.set(28, -1, 'W', 1); },
  },
};

/* quanto il cappello scende sulla testa: berretti e caschi si calzano, non si appoggiano in cima */
const DY = { cap: 2, beanie: 2, bandana: 1, santa: 2, ushanka: 1, vikingo: 1, hornsGold: 1, lampGold: 1, featherGold: 1, crownGold: 1, hardhatGold: 1, pithGold: 1 };

export const HAT_IDS = Object.keys(DRAW);

/* le tre viste di un cappello */
export function buildHat(id) {
  const d = DRAW[id]; if (!d) return null;
  const out = {};
  const dy = DY[id] || 0;
  for (const v of ['down', 'side', 'up']) { const g = grid(); d[v](g); out[v] = finish(g).map(([y, r]) => [y + dy, r]); }
  return out;
}

/* fin dove il cappello copre la testa: sopra questa riga i capelli non si disegnano.
   È l'ultima riga in cui il cappello copre il centro della testa (colonne 10..21), presa nella vista
   dove finisce PIÙ IN ALTO: la soglia vale per tutte e tre le viste, e presa di fronte (dove la tesa
   è più spessa) di profilo lasciava una riga di pelle fra la tesa e i capelli (segnalato con foto).
   Dove il cappello scende di più, i capelli sotto restano coperti dal cappello stesso, disegnato dopo.
   Chi lascia vedere i capelli (coroncine, maschera, occhialoni) lo dichiara a mano. */
const CROWN_OVERRIDE = { partyhat: -3, flowercrown: -2, laurelGold: -2, snorkel: -1, gogglesGold: -1, hood: 17 };
export function hatCrown(id, hat) {
  if (id in CROWN_OVERRIDE) return CROWN_OVERRIDE[id];
  let crown = Infinity;
  for (const v of ['down', 'side', 'up']) {
    let last = -1;
    for (const [y, r] of hat[v]) {
      let cov = 0; for (let x = 10; x <= 21; x++) if (r[x] !== '.') cov++;
      if (cov >= 10 && y > last) last = y;
    }
    crown = Math.min(crown, last);
  }
  return crown;
}
