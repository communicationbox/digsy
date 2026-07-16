/* Sprite dell'eroe a layer: corpo (testa nuda) + capelli + cappello; palette pilotata da S.look */
import { ctx } from './screen.js';
import { S } from './state.js';

/* H/S/P/F (+ombre h/s/p/f) e A/a (capelli) vengono aggiornati da applyLook() */
export const PAL = {
  '.': null, 'K': '#33291f', 'F': '#f3cfa0', 'f': '#d7a377', 'H': '#d06b43', 'h': '#a04a2c',
  'S': '#57a58f', 's': '#3d7a68', 'P': '#c88a44', 'p': '#96622e', 'W': '#f2ead8', 'E': '#33291f',
  'B': '#8a5f38', 'b': '#6e4a2a', 'A': '#6e4a2a', 'a': '#523620',
};
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
export function applyLook() {
  const L = S.look;
  PAL.H = L.hat; PAL.h = shade(L.hat, 0.72);
  PAL.S = L.shirt; PAL.s = shade(L.shirt, 0.72);
  PAL.P = L.pants; PAL.p = shade(L.pants, 0.74);
  PAL.F = L.skin; PAL.f = shade(L.skin, 0.85);
  PAL.A = L.hairColor; PAL.a = shade(L.hairColor, 0.75);
}

/* ---------- corpo a testa nuda (il cappello è un overlay) ---------- */
/* fronte */
const bDown = ["....FFFFFF......", "...FFFFFFFF.....", "..FFFFFFFFFF....", "..FFFFFFFFFF....", "..FFFFFFFFFF....", "..FFEFFFFEFF....", "..FFFFFFFFFF....", "..FFfFFFFfFF....", "...KFFFFFFK.....", "...SSSSSSSS.....", "..SSSSSSSSSS....", "..SSsSSSSsSS....", "..SSSSSSSSSS...."];
/* retro: nuca + zaino */
const bUp = ["....FFFFFF......", "...FFFFFFFF.....", "..FFFFFFFFFF....", "..FFFFFFFFFF....", "..FFFFFFFFFF....", "..FFFFFFFFFF....", "..FFFFFFFFFF....", "..FfFFFFFFfF....", "...KFFFFFFK.....", "...SBBBBBBS.....", "..SSBBBBBBSS....", "..SSBbbbbBSS....", "..SSBBBBBBSS...."];
/* profilo (guarda a destra; flip per sinistra): occhio singolo, naso */
const bSide = ["....FFFFFF......", "...FFFFFFFF.....", "...FFFFFFFFF....", "...FFFFFFFFF....", "...FFFFFFFFFf...", "...FFFFFFFEF....", "...FFFFFFFFF....", "...FfFFFFFFf....", "....KFFFFFK.....", "....SSSSSSSS....", "...SSSSSSSSSS...", "...SsSSSSSSSS...", "...SSSSSSSSSS..."];
/* gambe fronte/retro (aperte/chiuse) */
const lA = ["...PPP..PPP.....", "...PPP..PPP.....", "...WW....WW....."];
const lB = ["...PPP..PPP.....", "..PPP....PPP....", "..WW......WW...."];
/* gambe profilo: falcata (avanti/dietro) e passaggio (unite) */
const lsA = ["....PPP..PPP....", "...PPP....PPP...", "...WW......WW..."];
const lsB = [".....PPPPPP.....", ".....PPPPPP.....", ".....WWWW......."];

export const SPR = {
  down: [bDown.concat(lA), bDown.concat(lB)],
  up: [bUp.concat(lA), bUp.concat(lB)],
  side: [bSide.concat(lsA), bSide.concat(lsB)],
};

/* ---------- cappelli: overlay [riga, mappa] sopra corpo e capelli, per forma ---------- */
export const HATS = {
  explorer: { // tesa larga da archeologo
    down: [[0, "....HHHHHH......"], [1, "...HHHHHHHH....."], [2, "..HHHHHHHHHH...."], [3, "..HH......HH...."], [4, "..H........H...."], [5, "..H........H...."], [6, "..H........H...."], [7, "..H........H...."]],
    side: [[0, "....HHHHHH......"], [1, "...HHHHHHHH....."], [2, "..HHHHHHHHHHH..."], [3, "...H............"], [4, "...H............"], [5, "...H............"], [6, "...H............"], [7, "...H............"]],
    up: [[0, "....HHHHHH......"], [1, "...HHHHHHHH....."], [2, "..HHHHHHHHHH...."], [3, "..HHHHHHHHHH...."], [4, "..HHHHHHHHHH...."], [5, "..HHHHHHHHHH...."], [6, "..HHHHHHHHHH...."], [7, "..HhHHHHHHhH...."], [8, "....HHHHHH......"]],
  },
  cap: { // berretto con visiera
    down: [[0, "....HHHHHH......"], [1, "...HHHHHHHH....."], [2, "...HHHHHHHH....."], [3, "....hhhhhh......"]],
    side: [[0, "....HHHHHH......"], [1, "...HHHHHHHH....."], [2, "...HHHHHHHHhh..."]],
    up: [[0, "....HHHHHH......"], [1, "...HHHHHHHH....."], [2, "..HHHHHHHHHH...."], [3, "..hHHHHHHHHh...."]],
  },
  beanie: { // cuffia aderente con risvolto
    down: [[0, "....HHHHHH......"], [1, "...HHHHHHHH....."], [2, "..HHHHHHHHHH...."], [3, "..hhhhhhhhhh...."]],
    side: [[0, "....HHHHHH......"], [1, "...HHHHHHHH....."], [2, "...HHHHHHHHH...."], [3, "...hhhhhhhhh...."]],
    up: [[0, "....HHHHHH......"], [1, "...HHHHHHHH....."], [2, "..HHHHHHHHHH...."], [3, "..hhhhhhhhhh...."]],
  },
};
/* ultima riga di "corona" per forma: col cappello indossato i capelli NON si disegnano
   su queste righe (niente compenetrazioni); sotto restano frangia/lati/lunghezze */
export const HAT_CROWN = { explorer: 2, cap: 2, beanie: 3 };

/* ---------- capelli: overlay a testa piena (il cappello, se indossato, copre la parte alta) ---------- */
export const HAIRS = {
  none: { down: [], side: [], up: [] }, // Rasato
  short: {
    down: [[0, "....AAAAAA......"], [1, "...AAAAAAAA....."], [2, "..AAAAAAAAAA...."], [3, "..AAAAAAAAAA...."], [4, "..AA......AA...."]],
    side: [[0, "....AAAAAA......"], [1, "...AAAAAAAA....."], [2, "...AAAAAAAAA...."], [3, "...AAAA...AA...."], [4, "....A..........."]],
    up: [[0, "....AAAAAA......"], [1, "...AAAAAAAA....."], [2, "..AAAAAAAAAA...."], [3, "..AAAAAAAAAA...."], [4, "..AAAAAAAAAA...."], [5, "..AAAAAAAAAA...."], [6, "..AAAAAAAAAA...."], [7, "..AAAAAAAAAA...."], [8, "....AAAAAA......"]],
  },
  long: {
    down: [[0, "....AAAAAA......"], [1, "...AAAAAAAA....."], [2, "..AAAAAAAAAA...."], [3, "..AAAAAAAAAA...."], [4, "..AA......AA...."], [5, "..A........A...."], [6, "..A........A...."], [7, "..A........A...."], [8, "..A........A...."], [9, "..A........A...."]],
    side: [[0, "....AAAAAA......"], [1, "...AAAAAAAA....."], [2, "...AAAAAAAAA...."], [3, "...AAAA...AA...."], [4, "...AA..........."], [5, "...AA..........."], [6, "...AA..........."], [7, "...AA..........."], [8, "...AA..........."], [9, "...AA..........."]],
    up: [[0, "....AAAAAA......"], [1, "...AAAAAAAA....."], [2, "..AAAAAAAAAA...."], [3, "..AAAAAAAAAA...."], [4, "..AAAAAAAAAA...."], [5, "..AAAAAAAAAA...."], [6, "..AAAAAAAAAA...."], [7, "..AAAAAAAAAA...."], [8, "...AAAAAAAA....."], [9, "..AA......AA...."], [10, "..A........A...."], [11, "..A........A...."]],
  },
  curly: {
    down: [[0, "...AAAAAAAA....."], [1, "..AAAAAAAAAA...."], [2, ".AAAAAAAAAAAA..."], [3, "..AAAAAAAAAA...."], [4, ".AA........AA..."]],
    side: [[0, "...AAAAAAAA....."], [1, "..AAAAAAAAAA...."], [2, "..AAAAAAAAAA...."], [3, "..AAAA....AA...."], [4, "..AAA..........."], [5, "...AA..........."]],
    up: [[0, "...AAAAAAAA....."], [1, "..AAAAAAAAAA...."], [2, ".AAAAAAAAAAAA..."], [3, ".AAAAAAAAAAAA..."], [4, "..AAAAAAAAAA...."], [5, "..AAAAAAAAAA...."], [6, "..AAAAAAAAAA...."], [7, "..AAAAAAAAAA...."], [8, "...AAAAAAAA....."]],
  },
  punk: { // cresta centrata sulla testa (testa: colonne 4–9 → cresta 5–8)
    down: [[0, ".....AAAA......."], [1, ".....AAAA......."], [2, ".....AAAA......."], [3, ".....AAAA......."]],
    side: [[0, "....AAAAAAAA...."], [1, "....AAAAAAAA...."], [2, ".....AAAA......."]],
    up: [[0, ".....AAAA......."], [1, ".....AAAA......."], [2, ".....AAAA......."], [3, ".....AAAA......."], [4, ".....AAAA......."], [5, ".....AAAA......."], [6, ".....AAAA......."], [7, ".....AAAA......."], [8, ".....AAAA......."]],
  },
  receding: { // stempiato con pelata: solo lati e nuca
    down: [[2, "..AA......AA...."], [3, "..AA......AA...."], [4, "..A........A...."]],
    side: [[2, "...AA..........."], [3, "...AAA.........."], [4, "...AA..........."]],
    up: [[2, "..AA......AA...."], [3, "..AA......AA...."], [4, "..AA......AA...."], [5, "..AAAAAAAAAA...."], [6, "..AAAAAAAAAA...."], [7, "..AAAAAAAAAA...."], [8, "....AAAAAA......"]],
  },
};

/* ---------- blit ---------- */
export function blit(rows, px, py, flip, tctx) {
  const c = tctx || ctx;
  for (let y = 0; y < rows.length; y++) {
    const r = rows[y];
    for (let x = 0; x < 16; x++) {
      const col = PAL[r[x]]; if (!col) continue;
      c.fillStyle = col; c.fillRect(px + (flip ? 15 - x : x), py + y, 1, 1);
    }
  }
}
export function blitPairs(pairs, px, py, flip, tctx) {
  const c = tctx || ctx;
  for (const [y, r] of pairs) {
    for (let x = 0; x < 16; x++) {
      const col = PAL[r[x]]; if (!col) continue;
      c.fillStyle = col; c.fillRect(px + (flip ? 15 - x : x), py + y, 1, 1);
    }
  }
}
/* eroe completo: corpo → capelli → cappello (se indossato); noHat per l'anteprima dal barbiere */
export function drawHero(tctx, x, y, dir, frame, noHat) {
  const key = (dir === 'left' || dir === 'right') ? 'side' : dir;
  const flip = dir === 'left';
  blit(SPR[key][frame], x, y, flip, tctx);
  const hs = HAIRS[S.look.hairStyle] || HAIRS.none;
  const hat = !noHat ? HATS[S.look.hatStyle] : null;
  const crown = hat ? HAT_CROWN[S.look.hatStyle] : -1;
  blitPairs(hat ? hs[key].filter(p => p[0] > crown) : hs[key], x, y, flip, tctx);
  if (hat) blitPairs(hat[key], x, y, flip, tctx);
}
