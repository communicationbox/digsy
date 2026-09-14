/* Sprite dell'eroe a layer: corpo (testa nuda) + capelli + cappello; palette pilotata da S.look */
import { ctx } from './screen.js';
import { S } from './state.js';
import { buildHat, hatCrown, HAT_IDS } from './hatArt.js';

/* H/S/P/F (+ombre h/s/p/f) e A/a (capelli) vengono aggiornati da applyLook() */
export const PAL = {
  '.': null, 'K': '#33291f', 'F': '#f3cfa0', 'f': '#d7a377', 'H': '#d06b43', 'h': '#a04a2c',
  'S': '#57a58f', 's': '#3d7a68', 'P': '#c88a44', 'p': '#96622e', 'W': '#f2ead8', 'E': '#33291f',
  'B': '#8a5f38', 'b': '#6e4a2a', 'A': '#6e4a2a', 'a': '#523620',
  /* terzo tono: LUCE (non solo base+ombra). N pelle · T maglia · U pantaloni · L cappello · M capelli —
     shading vero a 3 bande invece del blocco piatto di prima (vedi CLAUDE.md, feedback sull'HD fasullo) */
  'N': '#f9dfb8', 'T': '#6ebba3', 'U': '#d9a05c', 'L': '#e0865c', 'M': '#8a6248',
  /* ORO fisso per i CAPPELLI-TROFEO (non seguono il colore scelto): G oro · g ombra · Y luce ·
     R gemma rossa · D ciano platino · Q verde alloro */
  'G': '#e8b93c', 'g': '#a8842a', 'Y': '#f8dd82', 'R': '#c65a54', 'D': '#8fe7dd', 'Q': '#5fa04e',
  /* contorni e ombre dei cappelli nativi: J contorno del colore scelto (applyLook), j contorno
     dell'oro, V/v ombra e contorno del bianco, q/r/d ombre di alloro, gemma e vetro */
  'J': '#6e3a24', 'j': '#6b4a14', 'V': '#cdc3b0', 'v': '#6e665a', 'q': '#3e7234', 'r': '#8c3a35', 'd': '#4a9c96',
};
/* schiarisce/scurisce un hex, CLAMPATO (k>1 senza clamp sfora il byte e il colore vira, es.
   arancio→verde: bug reale trovato e corretto qui, non solo nell'esperimento HD abbandonato) */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const cl = v => Math.max(0, Math.min(255, Math.round(v)));
  const r = cl(((n >> 16) & 255) * k), g = cl(((n >> 8) & 255) * k), b = cl((n & 255) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
export function applyLook() {
  const L = S.look;
  PAL.H = L.hat; PAL.h = shade(L.hat, 0.65); PAL.L = shade(L.hat, 1.45); PAL.J = shade(L.hat, 0.38);
  PAL.S = L.shirt; PAL.s = shade(L.shirt, 0.65); PAL.T = shade(L.shirt, 1.42);
  PAL.P = L.pants; PAL.p = shade(L.pants, 0.68); PAL.U = shade(L.pants, 1.4);
  PAL.F = L.skin; PAL.f = shade(L.skin, 0.78); PAL.N = shade(L.skin, 1.3);
  PAL.A = L.hairColor; PAL.a = shade(L.hairColor, 0.68); PAL.M = shade(L.hairColor, 1.48);
  PAL.E = L.eyeColor || '#33291f';
}

/* ---------- corpo a testa nuda (il cappello è un overlay) ---------- */
/* Tornati al corpo "vecchio" su richiesta esplicita: due tentativi di ridisegno
   nativo a 32×26 non hanno convinto (il primo con difetti reali di simmetria/
   dither, il secondo con gli occhi ancora mal posizionati sotto la frangia dei
   capelli). Questo è il disegno storico (quello mai criticato in questa sessione,
   commit 3b3ef55) raddoppiato MECCANICAMENTE — ogni pixel diventa un blocco 2×2 —
   non ridisegnato: stessa scala del mondo (TS=32), stesso identico aspetto di
   sempre, senza inventare proporzioni nuove che rischiano di sbagliare di nuovo. */
const bDown = ["..........FFFFFFFFFFFF..........", "..........FFFFFFFFFFFF..........", "........NNFFFFFFFFFFFFFF........", "........NNFFFFFFFFFFFFFF........", "......FFNNFFFFFFFFFFFFFFFF......", "......FFNNFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFEEFFFFFFFFEEFFFF......", "......FFFFEEFFFFFFFFEEFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "........FFffFFFFFFFFffFF........", "........FFffFFFFFFFFffFF........", "........KKFFFFFFFFFFFFKK........", "........KKFFFFFFFFFFFFKK........", "........SSTTSSSSSSSSSSss........", "........SSTTSSSSSSSSSSss........", "......SSSSTTSSSSSSSSSSssss......", "......SSSSTTSSSSSSSSSSssss......", "......SSSSssSSSSSSSSssSSSS......", "......SSSSssSSSSSSSSssSSSS......", "......SSSSSSSSSSSSSSSSSSSS......", "......SSSSSSSSSSSSSSSSSSSS......"];
/* retro: nuca + zaino */
const bUp = ["..........FFFFFFFFFFFF..........", "..........FFFFFFFFFFFF..........", "........NNFFFFFFFFFFFFFF........", "........NNFFFFFFFFFFFFFF........", "......FFNNFFFFFFFFFFFFFFFF......", "......FFNNFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFFFFFFFFFFFFFFFFFFF......", "......FFffFFFFFFFFFFFFffFF......", "......FFffFFFFFFFFFFFFffFF......", "........KKFFFFFFFFFFFFKK........", "........KKFFFFFFFFFFFFKK........", "........SSBBBBBBBBBBBBSS........", "........SSBBBBBBBBBBBBSS........", "......SSSSBBBBBBBBBBBBSSSS......", "......SSSSBBBBBBBBBBBBSSSS......", "......SSSSBBbbbbbbbbBBSSSS......", "......SSSSBBbbbbbbbbBBSSSS......", "......SSSSBBBBBBBBBBBBSSSS......", "......SSSSBBBBBBBBBBBBSSSS......"];
/* profilo (guarda a destra; flip per sinistra): occhio singolo, naso */
const bSide = ["..........FFFFFFFFFFFF..........", "..........FFFFFFFFFFFF..........", "........NNFFFFFFFFFFFFFF........", "........NNFFFFFFFFFFFFFF........", "........NNFFFFFFFFFFFFFFFF......", "........NNFFFFFFFFFFFFFFFF......", "........FFFFFFFFFFFFFFFFFF......", "........FFFFFFFFFFFFFFFFFF......", "........FFFFFFFFFFFFFFFFFF......", "........FFFFFFFFFFFFFFFFFF......", "........FFFFFFFFFFFFFFEEFFff....", "........FFFFFFFFFFFFFFEEFFff....", "........FFFFFFFFFFFFFFFFFF......", "........FFFFFFFFFFFFFFFFFF......", "........FFffFFFFFFFFFFFFff......", "........FFffFFFFFFFFFFFFff......", "..........KKFFFFFFFFFFKK........", "..........KKFFFFFFFFFFKK........", "..........SSTTSSSSSSSSSSSS......", "..........SSTTSSSSSSSSSSSS......", "........SSSSTTSSSSSSSSSSSSSS....", "........SSSSTTSSSSSSSSSSSSSS....", "........SSssSSSSSSSSSSSSSSSS....", "........SSssSSSSSSSSSSSSSSSS....", "........SSSSSSSSSSSSSSSSSSSS....", "........SSSSSSSSSSSSSSSSSSSS...."];
/* gambe fronte/retro (aperte/chiuse): U = luce sul davanti della coscia sinistra */
const lA = ["........UUPPPP....PPppPP........", "........UUPPPP....PPppPP........", "........PPPPPP....PPppPP........", "........PPPPPP....PPppPP........", "........WWWW........WWWW........", "........WWWW........WWWW........"];
const lB = ["........UUPPPP....PPppPP........", "........UUPPPP....PPppPP........", "......PPPPPP........PPppPP......", "......PPPPPP........PPppPP......", "......WWWW............WWWW......", "......WWWW............WWWW......"];
/* gambe profilo: falcata (avanti/dietro) e passaggio (unite) */
const lsA = ["..........UUPPPP....PPppPP......", "..........UUPPPP....PPppPP......", "........PPPPPP........PPppPP....", "........PPPPPP........PPppPP....", "........WWWW............WWWW....", "........WWWW............WWWW...."];
const lsB = ["............UUPPPPPPppPP........", "............UUPPPPPPppPP........", "............PPPPPPPPppPP........", "............PPPPPPPPppPP........", "............WWWWWWWW............", "............WWWWWWWW............"];

export const SPR = {
  down: [bDown.concat(lA), bDown.concat(lB)],
  up: [bUp.concat(lA), bUp.concat(lB)],
  side: [bSide.concat(lsA), bSide.concat(lsB)],
};

/* terzo tono su cappelli/capelli: schiarisce il TERZO centrale della riga più alta della
   silhouette (segue la forma, non il tile intero — niente riga piatta bordo a bordo come
   nel tentativo precedente). mapChar→hiChar, es. 'H'→'L' cappello, 'A'→'M' capelli. */
function litOverlay(ov, mapChar, hiChar) {
  if (!ov || !ov.length) return ov;
  const minRow = Math.min(...ov.map(p => p[0]));
  return ov.map(([row, s]) => {
    if (row !== minRow) return [row, s];
    const idxs = []; for (let i = 0; i < s.length; i++) if (s[i] === mapChar) idxs.push(i);
    if (!idxs.length) return [row, s];
    const lo = idxs[0], hi = idxs[idxs.length - 1], span = hi - lo;
    const a = lo + Math.floor(span / 4), b = hi - Math.floor(span / 4);
    let arr = s.split('');
    for (let i = a; i <= b; i++) if (arr[i] === mapChar) arr[i] = hiChar;
    return [row, arr.join('')];
  });
}
/* dither al bordo BASSO della sagoma (scacchiera base/ombra): dà volume rotondo senza
   ridisegnare i 15 stili a mano — un pixel sì e uno no verso l'ombra, non una riga piatta */
function ditherBase(ov, mapChar, loChar) {
  if (!ov || !ov.length) return ov;
  const maxRow = Math.max(...ov.map(p => p[0]));
  return ov.map(([row, s]) => {
    if (row !== maxRow) return [row, s];
    const idxs = []; for (let i = 0; i < s.length; i++) if (s[i] === mapChar) idxs.push(i);
    if (!idxs.length) return [row, s];
    const lo = idxs[0], hi = idxs[idxs.length - 1], mid = (lo + hi) / 2;
    let arr = s.split('');
    /* scacchiera SIMMETRICA rispetto al centro della sagoma (non alla colonna assoluta):
       la distanza dal centro determina la fase, così specchiando fronte/retro resta simmetrico */
    for (const i of idxs) if (Math.floor(Math.abs(i - mid)) % 2 === 1) arr[i] = loChar;
    return [row, arr.join('')];
  });
}
/* raddoppia un overlay [riga,mappa] a risoluzione doppia: ogni riga diventa 2 righe,
   ogni carattere diventa 2 caratteri — stessa sagoma, il doppio dei pixel per poterci
   passare sopra litOverlay/ditherBase con più margine (dithering più fine, non a scacchi
   larghi). Punto di partenza onesto: non è ancora un ridisegno a mano dei 15+3 stili
   (troppo rischioso farlo su tutti in un colpo solo, vedi nota nel report), ma con più
   pixel disponibili il dithering condiviso produce una sfumatura via via più morbida
   invece di un blocco piatto raddoppiato — un vero passo avanti sul piano precedente. */
function expand2x(ov) {
  if (!ov || !ov.length) return ov;
  const out = [];
  for (const [row, s] of ov) {
    let wide = ''; for (const ch of s) wide += ch + ch;
    out.push([row * 2, wide]); out.push([row * 2 + 1, wide]);
  }
  return out;
}
/* CRESCE la sagoma di un anello di 1 pixel (nativo) tutt'intorno, riempito col tono
   d'ombra: dopo il raddoppio del corpo (fase 2) le vecchie sagome di capelli/cappelli —
   pensate per la testa piccola di prima — restavano CONTENUTE dentro la nuova testa più
   grande invece di sporgerne: si leggevano come "più capelli", non come un cappello
   distinto (segnalato: "si confondono con la testa"). Un anello d'ombra tutt'intorno le fa
   sporgere DAVVERO e insieme dà un bordo/rilievo leggero — una sola operazione condivisa,
   non 36 ridisegni a mano. Gira sull'INTERA sagoma già rifinita (luce+dither), quindi non
   tocca le bande già piazzate: aggiunge solo dove prima c'era il vuoto. */
function dilateOverlay(ov, fillChar) {
  if (!ov || !ov.length) return ov;
  const W = ov[0][1].length;
  const byRow = new Map(ov.map(([r, s]) => [r, s.split('')]));
  const filled = (r, c) => { const a = byRow.get(r); return !!a && c >= 0 && c < W && a[c] !== '.'; };
  const rows = [...byRow.keys()];
  const minR = Math.min(...rows), maxR = Math.max(...rows);
  const additions = [];
  for (let r = minR - 1; r <= maxR + 1; r++) {
    for (let c = 0; c < W; c++) {
      if (filled(r, c)) continue;
      if (filled(r - 1, c) || filled(r + 1, c) || filled(r, c - 1) || filled(r, c + 1)) additions.push([r, c]);
    }
  }
  for (const [r, c] of additions) {
    if (!byRow.has(r)) byRow.set(r, new Array(W).fill('.'));
    byRow.get(r)[c] = fillChar;
  }
  return [...byRow.keys()].sort((a, b) => a - b).map(r => [r, byRow.get(r).join('')]);
}
function litHair(v) {
  const d = ov => dilateOverlay(ditherBase(litOverlay(expand2x(ov), 'A', 'M'), 'A', 'a'), 'a');
  return { down: d(v.down), side: d(v.side), up: d(v.up) };
}

/* ---------- cappelli: disegnati in nativo da hatArt.js (forme, luce, un solo contorno) ---------- */
export const HATS = Object.fromEntries(HAT_IDS.map(id => [id, buildHat(id)]));
/* ultima riga di "corona" per forma: col cappello indossato i capelli NON si disegnano
   su queste righe (niente compenetrazioni); sotto restano frangia/lati/lunghezze */
export const HAT_CROWN = Object.fromEntries(HAT_IDS.map(id => [id, hatCrown(id, HATS[id])]));

/* ---------- capelli: overlay a testa piena (il cappello, se indossato, copre la parte alta) ---------- */
const HAIRS_RAW = {
  none: { down: [], side: [], up: [] }, // Rasato
  short: {
    down: [[0, ".....AAAAAA....."], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAAAAAAAAA..."], [4, "...AA......AA..."]],
    side: [[0, ".....AAAAAA....."], [1, "....AAAAAAAA...."], [2, "....AAAAAAAAA..."], [3, "....AAAA...AA..."], [4, ".....A.........."]],
    up: [[0, ".....AAAAAA....."], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAAAAAAAAA..."], [4, "...AAAAAAAAAA..."], [5, "...AAAAAAAAAA..."], [6, "...AAAAAAAAAA..."], [7, "...AAAAAAAAAA..."], [8, ".....AAAAAA....."]],
  },
  long: {
    down: [[0, ".....AAAAAA....."], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAAAAAAAAA..."], [4, "...AA......AA..."], [5, "...A........A..."], [6, "...A........A..."], [7, "...A........A..."], [8, "...A........A..."], [9, "...A........A..."]],
    side: [[0, ".....AAAAAA....."], [1, "....AAAAAAAA...."], [2, "....AAAAAAAAA..."], [3, "....AAAA...AA..."], [4, "....AA.........."], [5, "....AA.........."], [6, "....AA.........."], [7, "....AA.........."], [8, "....AA.........."], [9, "....AA.........."]],
    up: [[0, ".....AAAAAA....."], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAAAAAAAAA..."], [4, "...AAAAAAAAAA..."], [5, "...AAAAAAAAAA..."], [6, "...AAAAAAAAAA..."], [7, "...AAAAAAAAAA..."], [8, "....AAAAAAAA...."], [9, "...AA......AA..."], [10, "...A........A..."], [11, "...A........A..."]],
  },
  curly: {
    down: [[0, "....AAAAAAAA...."], [1, "...AAAAAAAAAA..."], [2, "..AAAAAAAAAAAA.."], [3, "...AAAAAAAAAA..."], [4, "..AA........AA.."]],
    side: [[0, "....AAAAAAAA...."], [1, "...AAAAAAAAAA..."], [2, "...AAAAAAAAAA..."], [3, "...AAAA....AA..."], [4, "...AAA.........."], [5, "....AA.........."]],
    up: [[0, "....AAAAAAAA...."], [1, "...AAAAAAAAAA..."], [2, "..AAAAAAAAAAAA.."], [3, "..AAAAAAAAAAAA.."], [4, "...AAAAAAAAAA..."], [5, "...AAAAAAAAAA..."], [6, "...AAAAAAAAAA..."], [7, "...AAAAAAAAAA..."], [8, "....AAAAAAAA...."]],
  },
  punk: { // cresta centrata sulla testa (testa: colonne 4–9 → cresta 5–8)
    down: [[0, "......AAAA......"], [1, "......AAAA......"], [2, "......AAAA......"], [3, "......AAAA......"]],
    side: [[0, ".....AAAAAAAA..."], [1, ".....AAAAAAAA..."], [2, "......AAAA......"]],
    up: [[0, "......AAAA......"], [1, "......AAAA......"], [2, "......AAAA......"], [3, "......AAAA......"], [4, "......AAAA......"], [5, "......AAAA......"], [6, "......AAAA......"], [7, "......AAAA......"], [8, "......AAAA......"]],
  },
  receding: { // stempiato con pelata: solo lati e nuca
    down: [[2, "...AA......AA..."], [3, "...AA......AA..."], [4, "...A........A..."]],
    side: [[2, "....AA.........."], [3, "....AAA........."], [4, "....AA.........."]],
    up: [[2, "...AA......AA..."], [3, "...AA......AA..."], [4, "...AA......AA..."], [5, "...AAAAAAAAAA..."], [6, "...AAAAAAAAAA..."], [7, "...AAAAAAAAAA..."], [8, ".....AAAAAA....."]],
  },
  /* ---- TAGLI TEMATICI PER ZONA (sbloccabili al barbiere della zona) — righe 16, fronte/retro simmetriche ---- */
  meadow: { // Prati: chioma con due germogli che spuntano
    down: [[0, ".....A....A....."], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAAAAAAAAA..."], [4, "...AA......AA..."]],
    side: [[0, ".....AAAAAA....."], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAAA...AA...."], [4, "...AA..........."]],
    up: [[0, ".....AAAAAA....."], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAAAAAAAAA..."], [4, "...AAAAAAAAAA..."], [5, "....AAAAAAAA...."]],
  },
  dunespike: { // Dune: chioma bassa e larga battuta dal vento
    down: [[0, "...AAAAAAAAAA..."], [1, "..AAAAAAAAAAAA.."], [2, "...AAAAAAAAAA..."]],
    side: [[0, "...AAAAAAAAAAA.."], [1, "..AAAAAAAAAAAA.."], [2, "....AAAAAAAA...."]],
    up: [[0, "...AAAAAAAAAA..."], [1, "..AAAAAAAAAAAA.."], [2, "..AAAAAAAAAAAA.."], [3, "...AAAAAAAAAA..."]],
  },
  afro: { // Boschi: gran chioma tonda
    down: [[0, "....AAAAAAAA...."], [1, "..AAAAAAAAAAAA.."], [2, "..AAAAAAAAAAAA.."], [3, "..AAAAAAAAAAAA.."], [4, "..AA........AA.."]],
    side: [[0, "....AAAAAAAA...."], [1, "..AAAAAAAAAAAA.."], [2, "..AAAAAAAAAAAA.."], [3, "..AAAA....AA...."], [4, "..AAA..........."]],
    up: [[0, "....AAAAAAAA...."], [1, "..AAAAAAAAAAAA.."], [2, "..AAAAAAAAAAAA.."], [3, "..AAAAAAAAAAAA.."], [4, "..AAAAAAAAAAAA.."], [5, "...AAAAAAAAAA..."]],
  },
  ember: { // Terre: ciuffo alto all'insù come fiamma
    down: [[0, "......AAAA......"], [1, ".....AAAAAA....."], [2, "....AAAAAAAA...."], [3, "...AAAAAAAAAA..."], [4, "...AA......AA..."]],
    side: [[0, ".....AAAA......."], [1, "....AAAAAA......"], [2, "...AAAAAAAA....."], [3, "...AAAA........."], [4, "...AA..........."]],
    up: [[0, "......AAAA......"], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAAAAAAAAA..."], [4, "...AAAAAAAAAA..."]],
  },
  algae: { // Palude: capelli lunghi che gocciolano
    down: [[0, "....AAAAAAAA...."], [1, "...AAAAAAAAAA..."], [2, "...AAAAAAAAAA..."], [3, "...A.AA..AA.A..."], [4, "...A..A..A..A..."], [5, "......A..A......"]],
    side: [[0, "....AAAAAAAA...."], [1, "...AAAAAAAAAA..."], [2, "...AAAAAAAAAA..."], [3, "...AA.A..AA....."], [4, "...A..A........."], [5, "......A........."]],
    up: [[0, "....AAAAAAAA...."], [1, "...AAAAAAAAAA..."], [2, "...AAAAAAAAAA..."], [3, "...AAAAAAAAAA..."], [4, "...AAAAAAAAAA..."], [5, "...A..A..A..A..."]],
  },
  frost: { // Lande Gelide: cresta appuntita ghiacciata
    down: [[0, "....A..AA..A...."], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAAAAAAAAA..."]],
    side: [[0, "....A..AA..A...."], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAA.........."]],
    up: [[0, "....A..AA..A...."], [1, "....AAAAAAAA...."], [2, "...AAAAAAAAAA..."], [3, "...AAAAAAAAAA..."], [4, "...AAAAAAAAAA..."]],
  },
};
export const HAIRS = Object.fromEntries(Object.entries(HAIRS_RAW).map(([k, v]) => [k, litHair(v)]));

/* ---------- blit ---------- */
/* larghezza NON più fissa a 16: dal raddoppio geometrico il corpo è 32 colonne, ma
   blit/blitPairs restano generiche (usate anche da anteprime più piccole nello Sprite
   Studio) — la larghezza si legge dalla riga stessa, non si assume mai un numero fisso. */
export function blit(rows, px, py, flip, tctx) {
  const c = tctx || ctx;
  for (let y = 0; y < rows.length; y++) {
    const r = rows[y]; const w = r.length;
    for (let x = 0; x < w; x++) {
      const col = PAL[r[x]]; if (!col) continue;
      c.fillStyle = col; c.fillRect(px + (flip ? w - 1 - x : x), py + y, 1, 1);
    }
  }
}
export function blitPairs(pairs, px, py, flip, tctx) {
  const c = tctx || ctx;
  for (const [y, r] of pairs) {
    const w = r.length;
    for (let x = 0; x < w; x++) {
      const col = PAL[r[x]]; if (!col) continue;
      c.fillStyle = col; c.fillRect(px + (flip ? w - 1 - x : x), py + y, 1, 1);
    }
  }
}
/* FORME di maglia/pantaloni: trasformano le righe del CORPO (torso = righe con S, gambe = righe con
   P). Dinamico → si adatta a ogni vista e frame senza griglie separate. Lettere: S/s maglia,
   P/p pantaloni, F pelle, K scuro, W chiaro. */
function setAt(r, i, ch) { return i < 0 || i >= r.length ? r : r.slice(0, i) + ch + r.slice(i + 1); }
export function styleLook(rows, shirtStyle, pantsStyle) {
  rows = rows.slice();
  const torso = [], legs = [], span = {};
  for (let y = 0; y < rows.length; y++) {
    if (rows[y].includes('S')) { torso.push(y); span[y] = [rows[y].indexOf('S'), rows[y].lastIndexOf('S')]; }
    if (rows[y].includes('P')) legs.push(y);
  }
  /* `span` è la larghezza del torso PRIMA di toccare la maglia, e va misurata qui.
     Le forme si applicano in fila — prima la maglia, poi i pantaloni — e la salopette cercava
     la maglia per appoggiarci le bretelle. Con la CANOTTIERA, però, di spalle le spalle
     diventano pelle e nella riga non resta una sola 'S': `indexOf` tornava -1, la bretella
     finiva a -1+1 = 0 e comparivano quattro pixel staccati in colonna 0, sul bordo sinistro
     dello sprite (segnalato con foto). La guardia di `setAt` ferma i negativi, non lo zero.
     Agganciandole al corpo invece che a quel che resta della maglia, le bretelle stanno al
     posto giusto anche sopra la pelle nuda — che è poi come si porta una salopette. */
  /* ---- MAGLIE ---- */
  if (shirtStyle === 'tank' && torso.length) {           // canottiera: spalle/braccia scoperte + bretelline
    for (const y of torso) { let r = rows[y]; const f = r.indexOf('S'), l = r.lastIndexOf('S');
      r = setAt(r, f, 'F'); r = setAt(r, l, 'F');
      if (l - f >= 6) { r = setAt(r, f + 1, 'F'); r = setAt(r, l - 1, 'F'); }
      rows[y] = r; }
    const topT = torso[0], ft = rows[topT].indexOf('S'), lt = rows[topT].lastIndexOf('S');
    if (ft >= 0) rows[topT] = setAt(rows[topT], ft, 'T');           // orlo bretellina: filo di luce
    if (lt >= 0) rows[topT] = setAt(rows[topT], lt, 'T');
  } else if (shirtStyle === 'shirt' && torso.length) {   // camicia: colletto aperto (2 pixel chiari al collo) + abbottonatura scura al centro — SOLO sul davanti (non sullo zaino)
    const top = torso[0], c0 = Math.round((rows[top].indexOf('S') + rows[top].lastIndexOf('S')) / 2);
    if (rows[top][c0] === 'S') rows[top] = setAt(rows[top], c0, 'W');
    if (rows[top][c0 - 1] === 'S') rows[top] = setAt(rows[top], c0 - 1, 'W');
    for (let i = 1; i < torso.length; i++) { const y = torso[i], c = Math.round((rows[y].indexOf('S') + rows[y].lastIndexOf('S')) / 2); if (rows[y][c] === 'S') rows[y] = setAt(rows[y], c, 'K'); }
    const hem = torso[torso.length - 1], hf = rows[hem].indexOf('S'), hl = rows[hem].lastIndexOf('S');
    if (hf >= 0) rows[hem] = setAt(rows[hem], hf, 's');             // orlo: ombra dove la camicia finisce
    if (hl >= 0) rows[hem] = setAt(rows[hem], hl, 's');
  } else if (shirtStyle === 'hoodie' && torso.length) {  // felpa: cappuccio (drappo che avvolge il collo) + cordini; tasca a marsupio SOLO sul davanti
    const top = torso[0], f = rows[top].indexOf('S'), l = rows[top].lastIndexOf('S');
    if (top > 0 && rows[top - 1]) { let h = rows[top - 1].split(''); for (let x = f; x <= l; x++) if (h[x] === '.' || h[x] === 'F' || h[x] === 'f' || h[x] === 'K') h[x] = (x === f || x === l) ? 'K' : 's'; rows[top - 1] = h.join(''); }
    const c = Math.round((f + l) / 2);
    if (rows[top][c] === 'S') { rows[top] = setAt(rows[top], c, 'K'); rows[top] = setAt(rows[top], c + 1, 'K'); } // cordini
    const bot = torso[torso.length - 1], cb = Math.round((rows[bot].indexOf('S') + rows[bot].lastIndexOf('S')) / 2);
    if (rows[bot][cb] === 'S') { rows[bot] = setAt(rows[bot], cb - 1, 'K'); rows[bot] = setAt(rows[bot], cb, 's'); rows[bot] = setAt(rows[bot], cb + 1, 'K'); } // tasca
    if (torso.length >= 2) { const pt = torso[torso.length - 2], pf = rows[pt].indexOf('S'); if (pf >= 0) rows[pt] = setAt(rows[pt], pf, 's'); } // cucitura sopra la tasca
  }
  /* ---- PANTALONI ---- */
  if (pantsStyle === 'shorts' && legs.length >= 2) {     // pantaloncini: stinco scoperto (ultima riga di pantalone → pelle)
    const shin = legs[legs.length - 1]; rows[shin] = rows[shin].replace(/[Pp]/g, 'F');
    if (legs.length >= 3) { const cuff = legs[legs.length - 2], cf = rows[cuff].indexOf('P'), cl = rows[cuff].lastIndexOf('P');
      if (cf >= 0) rows[cuff] = setAt(rows[cuff], cf, 'p'); if (cl >= 0) rows[cuff] = setAt(rows[cuff], cl, 'p'); } // orlo: ombra dove il tessuto finisce
  } else if (pantsStyle === 'skirt' && legs.length) {    // gonna: svasata sulla prima riga, gambe scoperte sotto
    const top = legs[0]; const f = rows[top].indexOf('P'), l = rows[top].lastIndexOf('P');
    const wMax = rows[top].length - 1;
    let s = rows[top].split(''); for (let x = Math.max(0, f - 1); x <= Math.min(wMax, l + 1); x++) s[x] = 'P'; s[Math.max(0, f - 1)] = 'p'; s[Math.min(wMax, l + 1)] = 'p';
    for (let x = f; x <= l; x += 2) if (s[x] === 'P') s[x] = 'p';   // pieghe: scacchiera verticale, non un blocco piatto
    rows[top] = s.join('');
    for (let i = 1; i < legs.length; i++) rows[legs[i]] = rows[legs[i]].replace(/P/g, 'F');
  } else if (pantsStyle === 'overall' && torso.length && legs.length) { // salopette: bretelle di pantalone sul torso
    for (const y of torso) {
      const [f, l] = span[y]; const a = f + 1, b = l - 1;
      if (a > b) continue;                       // torso troppo stretto: non ci sta una bretella
      rows[y] = setAt(setAt(rows[y], a, 'P'), b, 'P');
    }
    const topO = torso[0], [fo, lo] = span[topO] || [-1, -1];
    if (fo >= 0 && fo + 1 <= lo - 1) { rows[topO] = setAt(rows[topO], fo + 1, 'U'); rows[topO] = setAt(rows[topO], lo - 1, 'U'); } // fibbia: luce sulla bretella
  }
  return rows;
}
/* VESTITI RIFINITI A MANO. `styleLook` qui sopra ricava maglie e pantaloni trasformando le
   righe del corpo: si adatta a tutto da solo, ma è una regola, non un disegno — e certe forme
   (la felpa col cappuccio, la gonna svasata) una regola non le fa belle.
   Queste due tabelle sono la via d'uscita, con lo stesso patto della banca degli sprite:
   ADDITIVE. Finché una casella è vuota si vede il procedurale di sempre; appena la disegni
   nello Sprite Studio (scheda Vestiti) prende il posto SOLO di quel capo, e l'altro resta
   procedurale — maglia e pantaloni restano mescolabili a piacere.
   Formato identico a HAIRS/HATS: vista → [[riga, "mappa di 16 caratteri"], …].

   I PANTALONI HANNO UNA CHIAVE PER PASSO ('skirt:0', 'skirt:1'), le maglie no. Non è una
   stranezza: fra i due fotogrammi di camminata il TORSO è identico in tutte e tre le viste,
   le GAMBE no (una riga di fronte e di dietro, due di profilo). Un pantalone disegnato una
   volta sola si incollerebbe alla gamba e la camminata si spegnerebbe. */
export const SHIRTS = {};   // stile → { down:[…], side:[…], up:[…] }
export const PANTS = {};    // stile:passo → { down:[…], side:[…], up:[…] }
export function shirtOverlay(style, view) {
  const d = SHIRTS[style]; const r = d && d[view];
  return (r && r.length) ? r : null;
}
export function pantsOverlay(style, view, frame) {
  const d = PANTS[style + ':' + (frame ? 1 : 0)]; const r = d && d[view];
  return (r && r.length) ? r : null;
}
/* COSA INDOSSA il personaggio in questo fotogramma: quale forma dare al corpo procedurale e
   quali overlay disegnarci sopra. Sta fuori da drawHero perché è la parte che si può sbagliare
   in silenzio — un capo a mano che si somma alla regola invece di sostituirla si vede solo
   guardando il pixel giusto, mentre qui un test lo misura.
   La regola: se il capo è disegnato a mano, il corpo sotto va disegnato NEUTRO. Altrimenti
   l'overlay finirebbe sopra una silhouette già trasformata — la gonna a mano sopra le gambe
   che la gonna procedurale aveva già scoperto. */
export function heroClothes(look, view, frame) {
  const L = look || {};
  const shirt = L.shirtStyle || 'tshirt', pants = L.pantsStyle || 'long';
  const shOv = shirtOverlay(shirt, view), ptOv = pantsOverlay(pants, view, frame);
  return { shOv, ptOv, shirt: shOv ? 'tshirt' : shirt, pants: ptOv ? 'long' : pants };
}

/* eroe completo: corpo → capelli → cappello (se indossato); noHat per l'anteprima dal barbiere */
export function drawHero(tctx, x, y, dir, frame, noHat) {
  /* niente più ctx.scale(2,2) qui: il corpo è ORA disegnato nativamente a 32×26,
     non più 16×13 raddoppiato meccanicamente — vero dettaglio, non blocchi 2×2. */
  const key = (dir === 'left' || dir === 'right') ? 'side' : dir;
  const flip = dir === 'left';
  const c = heroClothes(S.look, key, frame);
  blit(styleLook(SPR[key][frame], c.shirt, c.pants), x, y, flip, tctx);
  if (c.shOv) blitPairs(c.shOv, x, y, flip, tctx);
  if (c.ptOv) blitPairs(c.ptOv, x, y, flip, tctx);
  const hs = HAIRS[S.look.hairStyle] || HAIRS.none;
  const hat = !noHat ? HATS[S.look.hatStyle] : null;
  const crown = hat ? HAT_CROWN[S.look.hatStyle] : -1;
  blitPairs(hat ? hs[key].filter(p => p[0] > crown) : hs[key], x, y, flip, tctx);
  if (hat) blitPairs(hat[key], x, y, flip, tctx);
  /* GLITTER del cappello PLATINO: qualche scintilla brillante sulla forma (twinkle dal tempo). */
  if (hat && S.glitterHats && S.glitterHats.indexOf(S.look.hatStyle) >= 0) {
    const g = tctx || ctx, t = Math.floor(heroTime / 260) % 3;
    const sp = [[10, -2], [20, 0], [14, 2], [8, 2], [18, -2]];
    for (let i = 0; i < sp.length; i++) { if ((i + t) % 3 !== 0) continue; const [sx, sy] = sp[i]; g.fillStyle = (i % 2 ? '#ffffff' : '#f8dd82'); g.fillRect(x + (flip ? 31 - sx : sx), y + sy, 1, 1); }
  }
}
/* tempo per il twinkle del glitter (aggiornato da render); default 0 per test/anteprime statiche */
let heroTime = 0;
export function setHeroTime(t) { heroTime = t || 0; }
