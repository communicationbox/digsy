/* SEGNI DI MESTIERE dei personaggi (modulo puro, stesso pennello di hatArt/hairArt).

   Gli NPC erano tutti lo stesso omino ricolorato: cambiavano solo maglia e taglio, e il Professore
   non si distingueva dalla Bottegaia. Un mestiere si legge da UN oggetto: il camice e gli occhiali,
   il grembiule, i baffi, il papillon, il metro al collo.
   Due strati per accessorio, perché stanno a quote diverse:
     body → sopra maglia e pantaloni, SOTTO i capelli (camici, grembiuli, il metro);
     face → sopra i capelli, sotto il cappello (occhiali, baffi, monocolo, matita).
   Il corpo di Digsy non si tocca: il look del giocatore non ha `acc`.

   Corpo (colonne 0..31): collo righe 16-17; busto 18-25 (18-19 colonne 8-23, poi 6-25); gambe 26-31.
   Profilo verso destra: busto 18-19 colonne 10-25, poi 8-27; occhio colonne 22-23 riga 10. */
import { grid, finish } from './hatArt.js';

/* grembiule: pettorina, lacci al collo e in vita, tasca; m = materiale, check = quadretti */
function apron(g, x0, x1, m, opt = {}) {
  const cx = (x0 + x1) / 2;
  g.line(cx - 3, 16, cx - 3, 18, 1, m, 2); g.line(cx + 3, 16, cx + 3, 18, 1, m, 2);   // lacci al collo
  for (let y = 19; y <= 27; y++) {
    const a = y < 22 ? cx - 3 : x0 + (y > 25 ? 1 : 0), b = y < 22 ? cx + 3 : x1 - (y > 25 ? 1 : 0);
    g.span(y, a, b, m, { lit: 0.25, dark: 0.8 });
  }
  if (opt.check) for (let y = 19; y <= 27; y++) for (let x = 0; x < 32; x++) { const c = g.get(x, y); if (c && c.m === m && ((x >> 1) + (y >> 1)) % 2 === 0) g.set(x, y, opt.check, 1); }
  g.span(22, x0 - 1, x1 + 1, opt.tie || m, { t: 2 });                                 // laccio in vita
  if (opt.pocket) { g.fillBlock(cx - 2, 24, cx + 1, 25, opt.pocket, 2); g.span(24, cx - 2, cx + 1, opt.pocket, { t: 0 }); }
}

const ACC = {
  /* Professore: camice bianco aperto sulla maglia, occhiali tondi */
  lab: {
    body: {
      down(g) { for (let y = 18; y <= 27; y++) { const w = y < 20 ? 8 : 6; g.span(y, w, 12, 'W', { lit: 0.4, dark: 0.95 }); g.span(y, 19, 31 - w, 'W', { lit: 0, dark: 0.6 }); } g.line(12, 18, 14, 22, 1, 'W', 2); g.line(19, 18, 17, 22, 1, 'W', 2); g.fillBlock(8, 23, 10, 24, 'D', 1); },
      up(g) { for (let y = 18; y <= 27; y++) g.span(y, y < 20 ? 8 : 6, y < 20 ? 23 : 25, 'W', { lit: 0.3, dark: 0.75 }); g.line(15.5, 22, 15.5, 27, 1, 'W', 2); },
      side(g) { for (let y = 18; y <= 27; y++) g.span(y, y < 20 ? 10 : 8, y < 20 ? 22 : 24, 'W', { lit: 0.3, dark: 0.8 }); g.line(21, 19, 21, 27, 1, 'W', 2); },
    },
    face: {
      down(g) { ring(g, 10.5, 10.5); ring(g, 20.5, 10.5); g.span(10, 14, 17, 'K'); },
      up() {},
      side(g) { ring(g, 22.5, 10.5); g.span(10, 14, 20, 'K'); },
    },
  },
  /* Bottegaia: grembiule color crema con la tasca */
  store: {
    body: {
      down(g) { apron(g, 10, 21, 'W', { pocket: 'H' }); },
      up(g) { g.span(22, 6, 25, 'W', { t: 2 }); g.ball(15.5, 22, 1.5, 'W'); g.line(14, 23, 13, 26, 1, 'W', 2); g.line(17, 23, 18, 26, 1, 'W', 2); },
      side(g) { for (let y = 19; y <= 27; y++) g.span(y, y < 22 ? 22 : 20, 26, 'W', { lit: 0.2, dark: 0.85 }); g.span(22, 9, 26, 'W', { t: 2 }); },
    },
  },
  /* Curatore: papillon e monocolo con la catenella */
  museum: {
    body: {
      down(g) { bow(g, 15.5, 17); },
      up() {},
      side(g) { g.fillBlock(23, 17, 24, 18, 'R', 1); g.set(25, 16, 'R', 0); g.set(25, 19, 'R', 2); },
    },
    face: {
      noOutline: true,   // il contorno cadrebbe DENTRO l'anello, sull'occhio
      down(g) { mono(g, 19, 9); g.line(22, 13, 22, 15, 1, 'Y', 2); },
      up() {},
      side(g) { mono(g, 21, 9); g.line(21, 13, 20, 15, 1, 'Y', 2); },
    },
  },
  /* Locandiera: grembiule a quadretti rossi */
  inn: {
    body: {
      down(g) { apron(g, 10, 21, 'W', { check: 'R', tie: 'W' }); },
      up(g) { g.span(22, 6, 25, 'W', { t: 2 }); g.ball(15.5, 22, 1.5, 'R'); g.line(14, 23, 13, 26, 1, 'W', 2); g.line(17, 23, 18, 26, 1, 'W', 2); },
      side(g) { for (let y = 19; y <= 27; y++) for (let x = y < 22 ? 22 : 20; x <= 26; x++) g.set(x, y, ((x >> 1) + (y >> 1)) % 2 ? 'W' : 'R', 1); g.span(22, 9, 26, 'W', { t: 2 }); },
    },
  },
  /* Barbiere: baffi a manubrio e pettine nel taschino */
  barber: {
    body: {
      down(g) { g.fillBlock(19, 20, 21, 20, 'W', 1); g.fillBlock(19, 21, 21, 21, 'K'); },
      up() {},
      side(g) { g.fillBlock(22, 20, 24, 20, 'W', 1); g.fillBlock(22, 21, 24, 21, 'K'); },
    },
    face: {
      down(g) { g.span(13, 11, 20, 'K'); g.span(14, 12, 14, 'K'); g.span(14, 17, 19, 'K'); g.set(10, 12, 'K'); g.set(21, 12, 'K'); g.set(9, 11, 'K'); g.set(22, 11, 'K'); },
      up() {},
      side(g) { g.span(13, 22, 27, 'K'); g.set(22, 14, 'K'); g.set(21, 12, 'K'); g.set(20, 11, 'K'); },
    },
  },
  /* Falegname: grembiule di cuoio con gli attrezzi e la matita dietro l'orecchio */
  furniture: {
    body: {
      down(g) { apron(g, 10, 21, 'B', { pocket: 'B' }); g.line(19, 23, 19, 26, 1, 'W', 1); g.set(19, 22, 'K'); g.fillBlock(12, 23, 12, 26, 'Y', 1); },
      up(g) { g.span(22, 6, 25, 'B', { t: 2 }); g.ball(15.5, 22, 1.5, 'B'); },
      side(g) { for (let y = 19; y <= 27; y++) g.span(y, y < 22 ? 22 : 20, 26, 'B', { lit: 0.2, dark: 0.85 }); g.span(22, 9, 26, 'B', { t: 2 }); g.fillBlock(23, 23, 23, 26, 'Y', 1); },
    },
    face: {
      down(g) { g.line(24, 4, 27, 7, 1, 'Y', 1); g.set(28, 8, 'K'); },
      up(g) { g.line(7, 4, 4, 7, 1, 'Y', 1); g.set(3, 8, 'K'); },
      side(g) { g.line(15, 4, 12, 8, 1, 'Y', 1); g.set(11, 9, 'K'); },
    },
  },
  /* Sarta: metro giallo al collo con le tacche, i due capi che pendono */
  tailor: {
    body: {
      down(g) { tape(g, 10, 17, 26); tape(g, 21, 17, 23); g.span(17, 10, 21, 'Y', { t: 1 }); },
      up(g) { g.span(17, 9, 22, 'Y', { t: 1 }); },
      side(g) { tape(g, 22, 17, 25); g.span(17, 14, 22, 'Y', { t: 1 }); },
    },
  },
  /* il nonno dell'intro: baffoni bianchi */
  grandpa: {
    face: {
      down(g) { g.span(13, 10, 21, 'W', { lit: 0.3, dark: 0.8 }); g.span(14, 11, 14, 'W', { t: 2 }); g.span(14, 17, 20, 'W', { t: 2 }); },
      up() {},
      side(g) { g.span(13, 21, 27, 'W', { lit: 0.3, dark: 0.8 }); g.span(14, 21, 24, 'W', { t: 2 }); },
    },
  },
};

/* montatura tonda attorno all'occhio (l'occhio resta visibile nel mezzo) */
function ring(g, cx, cy, m = 'K') {
  for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]]) g.set(Math.floor(cx) + dx + (dx > 0 ? 1 : 0), Math.floor(cy) + dy + (dy > 0 ? 1 : 0), m, 1);
}
/* monocolo: anello 4×4 attorno all'occhio (x0,y0 = angolo in alto a sinistra) */
function mono(g, x0, y0) { for (let i = 0; i < 4; i++) { g.set(x0 + i, y0, 'Y', 0); g.set(x0 + i, y0 + 3, 'Y', 2); g.set(x0, y0 + i, 'Y', 0); g.set(x0 + 3, y0 + i, 'Y', 2); } }
function bow(g, cx, cy) {
  g.fillBlock(cx - 4, cy - 1, cx - 2, cy + 1, 'R', 0); g.fillBlock(cx + 2, cy - 1, cx + 4, cy + 1, 'R', 2);
  g.fillBlock(cx - 1, cy - 1, cx + 1, cy + 1, 'R', 1); g.set(cx - 5, cy, 'R', 0); g.set(cx + 5, cy, 'R', 2);
}
/* capo del metro che pende: giallo con una tacca scura ogni due pixel */
function tape(g, x, y0, y1) { for (let y = y0; y <= y1; y++) { g.set(x, y, 'Y', 1); g.set(x + 1, y, 'Y', 2); if (y % 2 === 0) g.set(x, y, 'K'); } }

const cache = new Map();
/* strato di un accessorio in una vista: [[riga, "32 caratteri"], …] oppure null */
export function accLayer(id, layer, view) {
  const k = id + '|' + layer + '|' + view;
  if (cache.has(k)) return cache.get(k);
  const d = ACC[id] && ACC[id][layer] && ACC[id][layer][view];
  let out = null;
  if (d) { const g = grid(); d(g); out = finish(g, { noOutline: !!ACC[id][layer].noOutline }); if (!out.length) out = null; }
  cache.set(k, out);
  return out;
}
export const ACC_IDS = Object.keys(ACC);
