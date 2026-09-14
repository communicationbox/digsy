/* CAPELLI disegnati in NATIVO (modulo puro), con lo stesso metodo dei cappelli (hatArt.js).

   Prima erano mappe a 16 colonne raddoppiate a blocchi 2×2, più un anello d'ombra largo un pixel:
   la cresta di fronte era un rettangolo piantato sulla testa, riccio/afro/duna sembravano funghi.
   Ogni taglio ora è una MASSA (una cupola che avvolge la testa, un pixel più larga) da cui si
   RITAGLIA il viso con la linea dell'attaccatura: la frangia è quella linea, non un blocco.
   Sopra la massa: ciocche, riccioli, punte. Luce in alto a sinistra, un solo contorno esterno.

   Testa (colonne 0..31): righe 0-1 colonne 10-21, 2-3 colonne 8-23, dalla 4 in giù colonne 6-25,
   occhi a riga 10 (colonne 10-11 e 20-21). Profilo verso destra: testa 8-25, occhio 22-23, naso 26-27. */
import { grid, finish, rnd } from './hatArt.js';

const CX = 15.5;

/* massa: cupola dei capelli sulla testa */
function mass(g, cx, y0, y1, rx, top = 0.25) { g.dome(cx, y0, y1, rx, 'A', { top }); }
/* ritaglia dove NON ci sono capelli: keep(x, y) → true se il pixel resta */
function cut(g, keep) { for (let y = -14; y <= 30; y++) for (let x = 0; x < 32; x++) if (g.get(x, y) && !keep(x, y)) g.clear(x, y); }
/* ciocche: righe d'ombra che seguono la pettinata, solo dentro la massa */
function strands(g, list) {
  for (const [xa, ya, xb, yb] of list) {
    const n = Math.max(Math.abs(xb - xa), Math.abs(yb - ya));
    for (let i = 0; i <= n; i++) { const x = Math.round(xa + (xb - xa) * i / n), y = Math.round(ya + (yb - ya) * i / n); const c = g.get(x, y); if (c && c.m === 'A') g.set(x, y, 'A', 2); }
  }
}
/* nuca: sotto la curva della testa i capelli seguono il collo, non restano larghi come un fungo */
const napeKeep = (bottom) => (x, y) => y <= 5 || (y <= 8 && x >= 5 && x <= 26) || (y <= bottom && x >= 7 + (y - 8) * 0.5 && x <= 24 - (y - 8) * 0.5);
/* ricciolo: pallina di capelli con la sua luce */
function curl(g, x, y, r) { g.ball(x, y, r, 'A'); }
/* ciuffo appuntito che sale (punte, fiamme, ghiaccio): base larga w in (x, yb), cima in (xt, yt) */
function spike(g, x, yb, xt, yt, w) {
  const h = yb - yt;
  for (let i = 0; i <= h; i++) {
    const y = yb - i, k = i / h, cx = x + (xt - x) * k, hw = w * (1 - k);
    for (let xx = rnd(cx - hw); xx <= rnd(cx + hw); xx++) g.set(xx, y, 'A', xx < cx - hw * 0.2 ? 0 : xx > cx + hw * 0.5 ? 2 : 1);
  }
}
/* attaccatura di fronte: sotto fr(x) sul viso non ci sono capelli; ai lati si scende fino a side */
const frontKeep = (fr, sideLen = 9, x0 = 7, x1 = 24) => (x, y) => (x >= x0 && x <= x1) ? y <= fr(x) : y <= sideLen;
/* colonna riflessa sulla metà sinistra: le frange disegnate con m(x) restano simmetriche */
const m = x => Math.min(x, 31 - x);
/* profilo: il viso sta a destra di fx; dietro si scende fino a back */
/* davanti a fx comanda l'attaccatura; fra fx-5 e fx c'è l'ORECCHIO (colonne 12-13 del corpo): lì i
   capelli si fermano alla tempia; dietro scendono fino a back */
const sideKeep = (fr, back = 11, fx = 15) => (x, y) => x > fx ? y <= fr(x) : x > 11 ? y <= Math.min(back, 7) : y <= back;

const DRAW = {
  none: { down() {}, side() {}, up() {} },

  buzz: {
    /* RASATI: capelli cortissimi DIPINTI SUL CRANIO (non a zero): stanno dentro la sagoma della
       testa, un filo alle tempie, la nuca piena. Grana a puntini sparsi del tono scuro, così si
       legge "capelli rasati" e non "cuffia". */
    down(g) {
      [[0, 11], [1, 9], [2, 8]].forEach(([y, x]) => g.span(y, x, 31 - x, 'A', { lit: 0.3, dark: 0.75 }));
      g.span(3, 7, 9, 'A', { t: 1 }); g.span(3, 22, 24, 'A', { t: 2 });
      for (let y = 4; y <= 7; y++) { g.span(y, 6, 7, 'A', { t: 1 }); g.span(y, 24, 25, 'A', { t: 2 }); }
      stubble(g);
    },
    up(g) {
      [[0, 11], [1, 9], [2, 8], [3, 7]].forEach(([y, x]) => g.span(y, x, 31 - x, 'A', { lit: 0.3, dark: 0.75 }));
      for (let y = 4; y <= 11; y++) g.span(y, y > 9 ? 8 : 6, y > 9 ? 23 : 25, 'A', { lit: 0.25, dark: 0.75 });
      stubble(g);
    },
    side(g) {
      g.span(0, 12, 19, 'A'); g.span(1, 10, 20, 'A'); g.span(2, 9, 19, 'A'); g.span(3, 8, 17, 'A');
      for (let y = 4; y <= 11; y++) g.span(y, 8, y < 7 ? 12 : 11, 'A', { lit: 0.3, dark: 0.8 });
      g.span(4, 15, 16, 'A', { t: 2 }); g.span(5, 15, 16, 'A', { t: 2 });   // basetta corta
      stubble(g);
    },
  },

  short: {
    down(g) {
      mass(g, CX, -2, 9, 11);
      cut(g, frontKeep(x => m(x) < 10 ? 6 : m(x) >= 14 ? 5 : 4, 8));
      strands(g, [[12, -1, 9, 4], [17, -1, 15, 5], [21, 0, 22, 5]]);
    },
    up(g) {
      mass(g, CX, -2, 12, 11);
      cut(g, napeKeep(12));
      strands(g, [[15, -1, 12, 10], [16, 0, 19, 10], [10, 2, 8, 9], [22, 2, 24, 9]]);
    },
    side(g) {
      mass(g, 15, -2, 11, 10.5);
      cut(g, (x, y) => sideKeep(x => x > 21 ? 4 : 5, 11, 16)(x, y) && !(y > 7 && x < 7 + (y - 7)));
      strands(g, [[14, -1, 22, 3], [11, 1, 9, 9], [16, 2, 18, 6]]);
    },
  },

  long: {
    down(g) {
      mass(g, CX, -2, 19, 11);
      cut(g, (x, y) => {
        if (x >= 8 && x <= 23) return y <= ((x >= 13 && x <= 18) ? 4 : 5);
        if (y > 18) return false;
        return y < 17 || (m(x) + y) % 3 !== 0;      // punte sfrangiate
      });
      strands(g, [[13, -1, 9, 5], [18, -1, 22, 5], [6, 6, 6, 17], [25, 6, 25, 17]]);
    },
    up(g) {
      mass(g, CX, -2, 20, 11);
      cut(g, (x, y) => y < 19 || (m(x) + y) % 3 !== 0);
      strands(g, [[15, 0, 12, 18], [16, 0, 19, 18], [10, 3, 8, 17], [21, 3, 23, 17]]);
    },
    side(g) {
      mass(g, 14.5, -2, 20, 10.5);
      /* di profilo i capelli lunghi cadono DIETRO l'orecchio: prima scendevano a muro fino alla
         colonna 16, a un passo dall'occhio, e la frangia finiva dritta lasciando una colonna di
         fronte che sembrava un bozzo. Ora la frangia sale in diagonale verso la fronte e la
         tenda sta dietro l'orecchio (colonne 13-14) */
      cut(g, (x, y) => x > 16 ? y <= (x > 21 ? 4 : x > 19 ? 5 : 6) : x > 12 ? y <= 7 + (16 - x) : (y < 19 || (x + y) % 3 !== 0));
      strands(g, [[14, -1, 22, 3], [10, 3, 8, 18], [12, 4, 11, 18]]);
    },
  },

  curly: {
    down(g) {
      mass(g, CX, -1, 8, 10.5);
      for (const [x, y] of [[7, 2], [11, -1], [15.5, -2], [20, -1], [24, 2], [5, 6], [26, 6]]) curl(g, x, y, 2.6);
      cut(g, frontKeep(x => (m(x) % 4 < 2) ? 5 : 4, 9, 8, 23));
      for (const [x, y] of [[10, 5], [15, 5], [21, 5]]) g.set(x, y, 'A', 2);
    },
    up(g) {
      mass(g, CX, -1, 11, 10.5);
      for (const [x, y] of [[7, 2], [11, -1], [15.5, -2], [20, -1], [24, 2], [5, 7], [26, 7], [9, 10], [15.5, 11], [22, 10]]) curl(g, x, y, 2.6);
    },
    side(g) {
      mass(g, 14.5, -1, 10, 10);
      for (const [x, y] of [[8, 2], [12, -1], [17, -2], [21, 0], [6, 7], [9, 10], [24, 3]]) curl(g, x, y, 2.6);
      cut(g, sideKeep(x => x > 21 ? 5 : 6, 12, 18));
    },
  },

  punk: {
    /* cresta: di fronte si vede STRETTA e alta, a punte; i lati sono rasati (ombra corta) */
    down(g) {
      for (const [x, yt] of [[13.5, -7], [15.5, -9], [17.5, -7]]) spike(g, x, 1, x + (x - 15.5) * 0.3, yt, 2.2);
      g.fillBlock(13, 1, 18, 3, 'A', 1);
    },
    up(g) {
      for (const [x, yt] of [[13.5, -7], [15.5, -9], [17.5, -7]]) spike(g, x, 1, x + (x - 15.5) * 0.3, yt, 2.2);
      g.fillBlock(13, 1, 18, 14, 'A', 1); strands(g, [[15, 1, 15, 14]]);
    },
    /* di profilo la cresta è una PINNA che segue la curva della testa dalla fronte alla nuca, con
       punte che salgono all'indietro, più alte al centro. Prima era un pettine basso e piatto sopra
       la testa: di fianco non si capiva che fosse una cresta ("la cresta di fianco non si vede bene") */
    side(g) {
      const base = [[22, 2], [20, 0], [17, -1], [14, -1], [11, 0], [9, 2], [8, 5], [8, 8]];
      for (let i = 0; i < base.length - 1; i++) {
        const [x0, y0] = base[i], [x1, y1] = base[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; g.fillBlock(Math.round(x) - 1, Math.round(y), Math.round(x) + 1, Math.round(y) + 2, 'A', 1); }
      }
      for (const [x, yb, dx, h] of [[21, 1, -2, 6], [18, 0, -3, 9], [14, -1, -3, 11], [11, 0, -3, 9], [8, 3, -3, 6]]) spike(g, x, yb, x + dx, yb - h, 2.4);
    },
  },

  receding: {
    /* stempiato: niente in cima, ciuffi sopra le orecchie e la corona dietro */
    down(g) {
      for (const x of [5, 24]) { g.fillBlock(x, 4, x + 2, 10, 'A', x < 10 ? 0 : 2); g.set(x + (x < 10 ? 0 : 2), 11, 'A', 2); g.set(x + (x < 10 ? 2 : 0), 3, 'A', 1); }
    },
    up(g) {
      mass(g, CX, 3, 13, 11);
      cut(g, (x, y) => y >= 5 + Math.round(Math.abs(x - CX) < 6 ? 2 - Math.abs(x - CX) * 0.3 : 0) && napeKeep(13)(x, y));
      strands(g, [[10, 7, 12, 12], [20, 7, 19, 12]]);
    },
    side(g) { mass(g, 11, 3, 12, 5); cut(g, (x, y) => y >= 4); strands(g, [[10, 5, 9, 11]]); },
  },

  meadow: {
    /* Prati: taglio corto con due germogli verdi */
    down(g) { DRAW.short.down(g); sprout(g, 12, -2, -1); sprout(g, 19, -2, 1); },
    up(g) { DRAW.short.up(g); sprout(g, 12, -2, -1); sprout(g, 19, -2, 1); },
    side(g) { DRAW.short.side(g); sprout(g, 13, -2, -1); sprout(g, 18, -2, 1); },
  },

  dunespike: {
    /* Dune: tutto spazzato dal vento verso un lato, punte basse che escono oltre la testa */
    down(g) {
      mass(g, CX - 1, -1, 8, 11, 0.5);
      cut(g, frontKeep(x => 4 + Math.round((x - 7) * 0.12), 8));
      for (const y of [-1, 2, 5]) spike2(g, 22, y, 30, y + 1, 2);
      strands(g, [[8, 0, 22, 1], [8, 3, 22, 4]]);
    },
    up(g) {
      mass(g, CX + 1, -1, 11, 11, 0.5);
      for (const y of [-1, 2, 5]) spike2(g, 9, y, 1, y + 1, 2);
      strands(g, [[23, 0, 9, 1], [23, 4, 9, 5], [23, 8, 9, 9]]);
    },
    side(g) {
      mass(g, 15, -1, 10, 10.5, 0.5);
      cut(g, sideKeep(x => x > 21 ? 4 : 6, 10, 18));
      for (const y of [0, 3, 6]) spike2(g, 8, y, 1, y + 1, 2);
      strands(g, [[23, 1, 8, 2], [21, 4, 8, 5]]);
    },
  },

  afro: {
    /* Boschi: grande chioma tonda fatta di riccioli, non una palla liscia */
    down(g) {
      mass(g, CX, -6, 12, 13, 0.15);
      for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.05 + i * 0.09), x = CX + Math.cos(a) * 12, y = 3 + Math.sin(a) * 9; curl(g, x, y, 2.6); }
      for (const x of [3.5, 27.5]) { curl(g, x, 8, 2.4); curl(g, x, 11, 2.2); }
      cut(g, (x, y) => !(x >= 8 && x <= 23 && y >= 5) && y <= 13);
      for (const [x, y] of [[10, -2], [15, -4], [21, -1], [6, 3], [25, 4], [13, 1], [18, 2]]) { g.set(x, y, 'A', 2); g.set(x + 1, y, 'A', 0); }
    },
    up(g) {
      mass(g, CX, -6, 13, 13, 0.15);
      for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.05 + i * 0.09), x = CX + Math.cos(a) * 12, y = 3 + Math.sin(a) * 9; curl(g, x, y, 2.6); }
      for (const x of [3.5, 27.5]) { curl(g, x, 8, 2.4); curl(g, x, 11, 2.2); }
      for (const [x, y] of [[10, -2], [15, -4], [21, -1], [6, 3], [25, 4], [13, 1], [18, 2], [9, 8], [15, 7], [21, 9], [12, 11], [19, 12]]) { g.set(x, y, 'A', 2); g.set(x + 1, y, 'A', 0); }
    },
    side(g) {
      mass(g, 13, -6, 13, 12, 0.15);
      for (let i = 0; i <= 9; i++) { const a = Math.PI * (0.95 + i * 0.1), x = 13 + Math.cos(a) * 11, y = 3 + Math.sin(a) * 9; curl(g, x, y, 2.6); }
      curl(g, 2.5, 9, 2.4); curl(g, 4, 12, 2.2);
      cut(g, (x, y) => !(x >= 18 && y >= 5) && y <= 13);
      for (const [x, y] of [[8, -2], [13, -4], [18, -1], [5, 4], [10, 7], [13, 2]]) { g.set(x, y, 'A', 2); g.set(x + 1, y, 'A', 0); }
    },
  },

  ember: {
    /* Terre Rosse: ciuffo che sale come una fiamma, tre lingue */
    down(g) { DRAW.short.down(g); spike(g, 15.5, 0, 15.5, -10, 4); spike(g, 11, 0, 9, -6, 3); spike(g, 20, 0, 22, -6, 3); },
    up(g) { DRAW.short.up(g); spike(g, 15.5, 0, 15.5, -10, 4); spike(g, 11, 0, 9, -6, 3); spike(g, 20, 0, 22, -6, 3); },
    side(g) { DRAW.short.side(g); spike(g, 16, 0, 11, -10, 4); spike(g, 20, 1, 17, -5, 3); spike(g, 11, 1, 6, -5, 3); },
  },

  algae: {
    /* Palude: capelli lunghi a ciocche che gocciolano, lunghezze diverse */
    down(g) {
      mass(g, CX, -2, 8, 11);
      cut(g, frontKeep(x => (m(x) % 3 === 0) ? 5 : 4, 8));
      for (const [x, len] of [[5, 15], [7, 12], [23, 12], [25, 15]]) drip(g, x, 6, len);
    },
    up(g) {
      mass(g, CX, -2, 10, 11);
      for (const [x, len] of [[5, 15], [8, 13], [11, 16], [15, 14], [19, 16], [22, 13], [25, 15]]) drip(g, x, 8, len);
    },
    side(g) {
      mass(g, 15, -2, 9, 10.5);
      cut(g, sideKeep(x => x > 21 ? 4 : 6, 9, 17));
      for (const [x, len] of [[6, 15], [9, 17], [12, 13]]) drip(g, x, 7, len);
    },
  },

  frost: {
    /* Lande Gelide: cresta a punte di ghiaccio tutto intorno alla testa */
    down(g) { DRAW.short.down(g); for (const [x, xt, yt] of [[8, 5, -4], [12, 11, -7], [15.5, 15.5, -9], [19, 20, -7], [23, 26, -4]]) spike(g, x, 1, xt, yt, 2.4); },
    up(g) { DRAW.short.up(g); for (const [x, xt, yt] of [[8, 5, -4], [12, 11, -7], [15.5, 15.5, -9], [19, 20, -7], [23, 26, -4]]) spike(g, x, 1, xt, yt, 2.4); },
    side(g) { DRAW.short.side(g); for (const [x, xt, yt] of [[8, 4, -3], [12, 9, -7], [16, 14, -9], [20, 20, -6]]) spike(g, x, 1, xt, yt, 2.4); },
  },
};

/* grana dei rasati: puntini scuri sparsi dentro la massa */
function stubble(g) {
  for (const [y, row] of g.rows) row.forEach((c, x) => { if (c && c.m === 'A' && c.t !== 0) { let h = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); if (((h ^ (h >>> 16)) >>> 0) % 5 === 0) g.set(x, y, 'A', 2); } });   // a caso ma fisso: niente righe
}
/* germoglio: gambo e due foglioline verdi */
function sprout(g, x, y, s) {
  g.set(x, y, 'Q', 1); g.set(x, y - 1, 'Q', 1); g.set(x + s, y - 2, 'Q', 2);
  g.set(x + s, y - 3, 'Q', 0); g.set(x + 2 * s, y - 3, 'Q', 1); g.set(x - s, y - 3, 'Q', 0); g.set(x + s, y - 4, 'Q', 0);
}
/* punta orizzontale (vento): da (x0,y) a (x1,y1), spessa w alla base */
function spike2(g, x0, y0, x1, y1, w) {
  const n = Math.abs(x1 - x0), s = Math.sign(x1 - x0);
  for (let i = 0; i <= n; i++) {
    const k = i / n, hw = w * (1 - k), yc = y0 + (y1 - y0) * k, x = x0 + s * i;
    for (let yy = Math.round(yc - hw); yy <= Math.round(yc + hw); yy++) g.set(x, yy, 'A', yy < yc ? 0 : yy > yc ? 2 : 1);
  }
}
/* ciocca che scende e finisce con una goccia */
function drip(g, x, y0, y1) {
  for (let y = y0; y <= y1; y++) { g.set(x, y, 'A', 1); g.set(x + 1, y, 'A', 2); }
  g.set(x, y1 + 1, 'A', 1); g.set(x + 1, y1 + 1, 'A', 2); g.set(x < 16 ? x : x + 1, y1 + 2, 'A', 2);   // la goccia cade verso l'esterno, a specchio
}

export const HAIR_IDS = Object.keys(DRAW);
export function buildHair(id) {
  const d = DRAW[id]; if (!d) return null;
  const out = {};
  for (const v of ['down', 'side', 'up']) { const g = grid(); d[v](g); out[v] = finish(g); }
  return out;
}
