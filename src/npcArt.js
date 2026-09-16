/* SEGNI DI MESTIERE dei personaggi (modulo puro, stesso pennello di hatArt/hairArt).

   Gli NPC erano tutti lo stesso omino ricolorato: cambiavano solo maglia e taglio, e il Professore
   non si distingueva dalla Bottegaia. Un mestiere si legge da UN oggetto: il camice e gli occhiali,
   il grembiule, i baffi, il papillon, il metro al collo.
   Due strati per accessorio, perché stanno a quote diverse:
     body → sopra maglia e pantaloni, SOTTO i capelli (camici, grembiuli, il metro);
     face → sopra i capelli, sotto il cappello (occhiali, baffi, monocolo, matita).
   Il corpo di Digsy non si tocca: il look del giocatore non ha `acc`.

   Corpo (colonne 0..31): collo righe 16-17; busto 18-25 (18-19 colonne 8-23, poi 6-25); gambe 26-31.
   Profilo verso destra: il busto è MISURATO, non a occhio — occupa le colonne 7..22 (largo 16),
   contro le 5..26 della vista frontale. I segni di mestiere seguivano i numeri del frontale e
   sbordavano di quattro pixel: i grembiuli sembravano salvagenti e il camice del Professore era
   enorme (segnalato). Di lato un grembiule si vede solo DAVANTI: è una striscia stretta contro
   il petto, non una fascia che gira tutt'intorno. Occhio colonne 22-23 riga 10. */
import { grid, finish } from './hatArt.js';

/* DI PROFILO il braccio sta DAVANTI, alle colonne 13..17 (righe 19..25, mano compresa: vedi
   bodyArt.armSide). Il grembiule va messo davanti al petto ma DIETRO al braccio, cioè dalla 18
   in poi, e il laccio in vita si spezza: passa dietro il braccio e riprende sul davanti — prima
   ci passava sopra come una cintura dipinta sul gomito (segnalato). */
const PROF_A = 18, PROF_B = 21, BRACCIO_A = 13, BRACCIO_B = 18;
/* laccio in vita di profilo: due tratti, uno per lato del braccio */
function laccioProfilo(g, m) { g.span(22, 8, BRACCIO_A - 1, m, { t: 2 }); g.span(22, BRACCIO_B, PROF_B, m, { t: 2 }); }

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
      side(g) {
        /* il camice è un capo lungo, ma la MANO resta fuori: dalla riga 24 il tessuto si apre
           attorno al braccio invece di passarci sopra */
        for (let y = 18; y <= 27; y++) {
          const a = y < 20 ? 10 : 9, b = y < 20 ? 20 : 21;
          if (y === 24 || y === 25) { g.span(y, a, BRACCIO_A - 1, 'W', { lit: 0.3, dark: 0.8 }); g.span(y, BRACCIO_B, b, 'W', { lit: 0.3, dark: 0.8 }); }   // qui esce la mano
          else g.span(y, a, b, 'W', { lit: 0.3, dark: 0.8 });
        }
        g.line(19, 19, 19, 23, 1, 'W', 2);
      },
    },
    face: {
      down(g) { ring(g, 11.5, 9.5); ring(g, 19.5, 9.5); g.span(9, 15, 16, 'K'); },
      up() {},
      side(g) { ring(g, 20.5, 9.5); g.span(9, 14, 17, 'K'); },
    },
  },
  /* Bottegaia: grembiule color crema con la tasca */
  store: {
    body: {
      down(g) { apron(g, 10, 21, 'W', { pocket: 'H' }); },
      up(g) { g.span(22, 6, 25, 'W', { t: 2 }); g.ball(15.5, 22, 1.5, 'W'); g.line(14, 23, 13, 26, 1, 'W', 2); g.line(17, 23, 18, 26, 1, 'W', 2); },
      side(g) { for (let y = 19; y <= 27; y++) g.span(y, y < 22 ? PROF_A + 1 : PROF_A, PROF_B, 'W', { lit: 0.2, dark: 0.85 }); laccioProfilo(g, 'W'); },
    },
  },
  /* Curatore: papillon e monocolo con la catenella */
  museum: {
    body: {
      down(g) { bow(g, 15.5, 17); },
      up() {},
      side(g) { g.fillBlock(19, 17, 20, 18, 'R', 1); g.set(21, 16, 'R', 0); g.set(21, 19, 'R', 2); },
    },
    face: {
      noOutline: true,   // il contorno cadrebbe DENTRO l'anello, sull'occhio
      down(g) { ring(g, 19.5, 9.5, 'Y'); g.line(22, 13, 22, 16, 1, 'Y', 2); },
      up() {},
      side(g) { ring(g, 20.5, 9.5, 'Y'); g.line(19, 13, 18, 16, 1, 'Y', 2); },
    },
  },
  /* Locandiera: grembiule a quadretti rossi */
  inn: {
    body: {
      down(g) { apron(g, 10, 21, 'W', { check: 'R', tie: 'W' }); },
      up(g) { g.span(22, 6, 25, 'W', { t: 2 }); g.ball(15.5, 22, 1.5, 'R'); g.line(14, 23, 13, 26, 1, 'W', 2); g.line(17, 23, 18, 26, 1, 'W', 2); },
      side(g) { for (let y = 19; y <= 27; y++) for (let x = y < 22 ? PROF_A + 1 : PROF_A; x <= PROF_B; x++) g.set(x, y, ((x >> 1) + (y >> 1)) % 2 ? 'W' : 'R', 1); laccioProfilo(g, 'W'); },
    },
  },
  /* Barbiere: baffi a manubrio e pettine nel taschino */
  barber: {
    body: {
      down(g) { g.fillBlock(19, 20, 21, 20, 'W', 1); g.fillBlock(19, 21, 21, 21, 'K'); },
      up() {},
      side(g) { g.fillBlock(18, 20, 20, 20, 'W', 1); g.fillBlock(18, 21, 20, 21, 'K'); },
    },
    face: {
      down(g) { g.span(13, 12, 19, 'K'); g.span(12, 10, 11, 'K'); g.span(12, 20, 21, 'K'); g.set(12, 12, 'K'); g.set(19, 12, 'K'); },   // baffi a manubrio: le punte salgono
      up() {},
      side(g) { g.span(13, 21, 25, 'K'); g.set(20, 12, 'K'); g.set(19, 12, 'K'); },
    },
  },
  /* Falegname: grembiule di cuoio con gli attrezzi e la matita dietro l'orecchio */
  furniture: {
    body: {
      down(g) { apron(g, 10, 21, 'B', { pocket: 'B' }); g.line(19, 23, 19, 26, 1, 'W', 1); g.set(19, 22, 'K'); g.fillBlock(12, 23, 12, 26, 'Y', 1); },
      up(g) { g.span(22, 6, 25, 'B', { t: 2 }); g.ball(15.5, 22, 1.5, 'B'); },
      side(g) { for (let y = 19; y <= 27; y++) g.span(y, y < 22 ? PROF_A + 1 : PROF_A, PROF_B, 'B', { lit: 0.2, dark: 0.85 }); laccioProfilo(g, 'B'); g.fillBlock(20, 23, 20, 26, 'Y', 1); },
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
      side(g) { tape(g, 19, 17, 25); g.span(17, 12, 21, 'Y', { t: 1 }); },
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
