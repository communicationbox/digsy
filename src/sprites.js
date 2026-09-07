/* Sprite dell'eroe a layer: corpo (testa nuda) + capelli + cappello; palette pilotata da S.look */
import { ctx } from './screen.js';
import { S } from './state.js';

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
  PAL.H = L.hat; PAL.h = shade(L.hat, 0.65); PAL.L = shade(L.hat, 1.45);
  PAL.S = L.shirt; PAL.s = shade(L.shirt, 0.65); PAL.T = shade(L.shirt, 1.42);
  PAL.P = L.pants; PAL.p = shade(L.pants, 0.68); PAL.U = shade(L.pants, 1.4);
  PAL.F = L.skin; PAL.f = shade(L.skin, 0.78); PAL.N = shade(L.skin, 1.3);
  PAL.A = L.hairColor; PAL.a = shade(L.hairColor, 0.68); PAL.M = shade(L.hairColor, 1.48);
  PAL.E = L.eyeColor || '#33291f';
}

/* ---------- corpo a testa nuda (il cappello è un overlay) ---------- */
/* fronte: N=luce sulla fronte (alto-sx), T=luce sul petto, U=luce sulla coscia sx —
   TERZO tono oltre a base F/S/P e ombra f/s/p già esistenti (non solo un blocco piatto) */
const bDown = [".....FFFFFF.....", "....NFFFFFFF....", "...FNFFFFFFFF...", "...FFFFFFFFFF...", "...FFFFFFFFFF...", "...FFEFFFFEFF...", "...FFFFFFFFFF...", "....FfFFFFfF....", "....KFFFFFFK....", "....STSSSSSs....", "...SSTSSSSSss...", "...SSsSSSSsSS...", "...SSSSSSSSSS..."];
/* retro: nuca + zaino */
const bUp = [".....FFFFFF.....", "....NFFFFFFF....", "...FNFFFFFFFF...", "...FFFFFFFFFF...", "...FFFFFFFFFF...", "...FFFFFFFFFF...", "...FFFFFFFFFF...", "...FfFFFFFFfF...", "....KFFFFFFK....", "....SBBBBBBS....", "...SSBBBBBBSS...", "...SSBbbbbBSS...", "...SSBBBBBBSS..."];
/* profilo (guarda a destra; flip per sinistra): occhio singolo, naso */
const bSide = [".....FFFFFF.....", "....NFFFFFFF....", "....NFFFFFFFF...", "....FFFFFFFFF...", "....FFFFFFFFF...", "....FFFFFFFEFf..", "....FFFFFFFFF...", "....FfFFFFFFf...", ".....KFFFFFK....", ".....STSSSSSS...", "....SSTSSSSSSS..", "....SsSSSSSSSS..", "....SSSSSSSSSS.."];
/* gambe fronte/retro (aperte/chiuse): U = luce sul davanti della coscia sinistra */
const lA = ["....UPP..PpP....", "....PPP..PpP....", "....WW....WW...."];
const lB = ["....UPP..PpP....", "...PPP....PpP...", "...WW......WW..."];
/* gambe profilo: falcata (avanti/dietro) e passaggio (unite) */
const lsA = [".....UPP..PpP...", "....PPP....PpP..", "....WW......WW.."];
const lsB = ["......UPPPpP....", "......PPPPpP....", "......WWWW......"];

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
function litHat(v) {
  const d = ov => ditherBase(litOverlay(ov, 'H', 'L'), 'H', 'h');
  return { down: d(v.down), side: d(v.side), up: d(v.up) };
}
function litHair(v) {
  const d = ov => ditherBase(litOverlay(ov, 'A', 'M'), 'A', 'a');
  return { down: d(v.down), side: d(v.side), up: d(v.up) };
}

/* ---------- cappelli: overlay [riga, mappa] sopra corpo e capelli, per forma ---------- */
const HATS_RAW = {
  explorer: { // tesa larga da archeologo
    down: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "...HHHHHHHHHH..."], [3, "...HH......HH..."], [4, "...H........H..."], [5, "...H........H..."], [6, "...H........H..."], [7, "...H........H..."]],
    side: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "...HHHHHHHHHHH.."], [3, "....H..........."], [4, "....H..........."], [5, "....H..........."], [6, "....H..........."], [7, "....H..........."]],
    up: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "...HHHHHHHHHH..."], [3, "...HHHHHHHHHH..."], [4, "...HHHHHHHHHH..."], [5, "...HHHHHHHHHH..."], [6, "...HHHHHHHHHH..."], [7, "...HhHHHHHHhH..."], [8, ".....HHHHHH....."]],
  },
  cap: { // berretto con visiera
    down: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "....HHHHHHHH...."], [3, ".....hhhhhh....."]],
    side: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "....HHHHHHHHhh.."]],
    up: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "...HHHHHHHHHH..."], [3, "...hHHHHHHHHh..."]],
  },
  beanie: { // cuffia col POMPON bianco (disegnata a mano)
    down: [[-2, ".......WW......."], [-1, ".......WW......."], [0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "...HHHHHHHHHH..."], [3, "...hhhhhhhhhh..."]],
    side: [[-2, ".......WW......."], [-1, ".......WW......."], [0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "....HHHHHHHHH..."], [3, "....hhhhhhhhh..."]],
    up: [[-2, ".......WW......."], [-1, ".......WW......."], [0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "...HHHHHHHHHH..."], [3, "...hhhhhhhhhh..."]],
  },
  /* ---- CAPPELLI TEMATICI PER ZONA — silhouette DISTINTE, accenti W (chiaro) e K (scuro) ---- */
  flowercrown: { // Prati: coroncina disegnata a mano (fiori W a BLOCCHI 2×2 con altezze diverse —
    // i vecchi puntini singoli W/H alternati si leggevano come "rumore", non come fiori: revisione
    // estetica Gemini, "eliminare i pixel sparsi e usare blocchi 2x2 con altezze diverse")
    down: [[-3, "....WW....WW...."], [-2, "....WW.WW.WW...."], [-1, "...HHHHHHHHHHH.."], [0, "...HhHhHhHhHhH.."], [1, "...HHHHHHHHHH..."]],
    side: [[-2, "....W.W.W.W.W..."], [-1, "....H.H.H.H.H..."], [0, "....HhHhHhHhH..."], [1, "....HHHHHHHHH..."]],
    up: [[-3, "....WW....WW...."], [-2, "....WW.WW.WW...."], [-1, "...HHHHHHHHHHH.."], [0, "...HhHhHhHhHhH.."], [1, "...HHHHHHHHHH..."]],
  },
  bandana: { // Dune: fascia annodata disegnata a mano — coda ALLARGATA a 2px (prima erano
    // puntini isolati: "sembra solo una calotta piatta", revisione estetica Gemini)
    down: [[-1, "....HHHHHHHH...."], [0, "...HHHHHHHHHH..."], [1, "...HHHHHHHHHhh.."], [2, "...HHHHHHHHHKh.."], [3, "............Khh."], [4, ".............hh."]],
    side: [[-1, ".....HHHHHHH...."], [0, "....HHHHHHHHH..."], [1, "...hHHHHHHHHHH.."], [2, "..hKHHHHHHHHHH.."], [3, "..h..hh........."]],
    up: [[-1, "....HHHHHHHH...."], [0, "...HHHHHHHHHH..."], [1, "..HHHHHHHHHHHH.."], [2, "..HHHHHhhHHHHH.."], [3, "..HHHHhKKhHHHH.."], [4, "......h..h......"]],
  },
  hood: { // Boschi: cappuccio che drappeggia (disegnato a mano)
    down: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "...HHHHHHHHHH..."], [3, "..HHhhhhhhhhHH.."], [4, "..HhK......KhH.."], [5, "..H..........H.."]],
    side: [[0, ".....HHHHHHH...."], [1, "....HHHHHHHhh..."], [2, "...HHHHHHHh....."], [3, "..HHHHHHHhh....."], [4, "..HHHHHHh......."], [5, "..HHHHHhh......."], [6, "...HHHhh........"], [7, "...HHh.........."], [8, "....Hh.........."], [9, ".....H.........."]],
    up: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "...HHHHHHHHHH..."], [3, "..HHHHHHHHHHHH.."], [4, "..HHHHHHHHHHHH.."], [5, "...HHHHHHHHHH..."], [6, "...HHHHHHHHHH..."], [7, "...HHHHHHHHHH..."], [8, ".....HHHHHH....."], [9, "......HHHH......"]],
  },
  snorkel: { // Palude: maschera da sub disegnata a mano (lente W, boccaglio K che sale)
    down: [[-2, ".............K.."], [-1, ".............K.."], [0, ".............K.."], [1, ".............K.."], [2, ".............K.."], [3, "...HHHHHHHHHHK.."], [4, "...HWWWWWWWWHK.."], [5, "...HW.WWWW.WHK.."], [6, "...HWWWHHWWWHK.."], [7, "...HHHHHHHHHH..."]],
    side: [[-2, "..........K....."], [-1, "..........K....."], [3, "..........HHHH.."], [4, "....hhhhhhH..H.."], [5, "....hhhhhhH..H.."], [6, "..........H..H.."], [7, "..........HHHH.."]],
    up: [[-2, ".............K.."], [-1, ".............K.."], [0, ".............K.."], [1, ".............K.."], [2, ".............K.."], [3, ".............K.."], [4, "...hhhhhhhhhhK.."], [5, "...hhhhhhhhhhK.."], [6, ".............K.."]],
  },
  ushanka: { // Lande Gelide: colbacco di pelliccia con paraorecchie (disegnato a mano)
    down: [[0, "....HHHHHHHH...."], [1, "...HHHHHHHHHH..."], [2, "...HHHHHHHHHH..."], [3, "..hWW......WWh.."], [4, "..hW........Wh.."], [5, "..hW........Wh.."], [6, "..hW........Wh.."]],
    side: [[0, ".....HHHHHHH...."], [1, "....hHHHHHHHH..."], [2, "....hHHHhHHHH..."], [3, "....hHHhW......."], [4, "....hHHhW......."], [5, "....hHHhW......."], [6, "....hhhhW......."]],
    up: [[0, "....HHHHHHHH...."], [1, "...HHHHHHHHHH..."], [2, "...HHHHHHHHHH..."], [3, "..hHHHHHHHHHHh.."], [4, "..hW........Wh.."], [5, "..hW........Wh.."], [6, "..hW........Wh.."]],
  },
  vikingo: { // elmo vichingo con corna (disegnato a mano)
    down: [[-3, "..W..........W.."], [-2, "..W..........W.."], [-1, "..WW........WW.."], [0, "..WWWKHHHHKWWW.."], [1, "...WKHHHHHHKW..."], [2, "...KHHHHHHHHK..."], [3, "...hhhhhhhhhh..."], [4, "......WW........"]],
    side: [[-3, "........W......."], [-2, "........W......."], [-1, ".......WWW......"], [0, ".....HKWWWKH...."], [1, "....HHKWWWKHH..."], [2, "....HHHKKKHHH..."], [3, "....hhhhhhhhh..."]],
    up: [[-3, "..W..........W.."], [-2, "..W..........W.."], [-1, "..WW........WW.."], [0, "..WWWKHHHHKWWW.."], [1, "...WKHHHHHHKW..."], [2, "...KHHHHHHHHK..."], [3, "...hhhhhhhhhh..."]],
  },
  sombrero: { // tesa larga con banda decorativa (disegnato a mano)
    down: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "...hKWKWKWKWh..."], [3, ".HHHHHHHHHHHHHH."], [4, ".hHHHHHHHHHHHHh."], [5, "............h..."]],
    side: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "....HWKWKWKWH..."], [3, ".HHHHHHHHHHHHHHH"], [4, ".hHHHHHHHHHHHHHh"]],
    up: [[0, ".....HHHHHH....."], [1, "....HHHHHHHH...."], [2, "...hHHHHHHHHh..."], [3, ".HHHHHHHHHHHHHH."], [4, ".hHHHHHHHHHHHHh."]],
  },
  partyhat: { // cono da festa con pompon — base ALLARGATA di 1px per lato (era troppo magro,
    // sembrava uno spuntone: revisione estetica Gemini, "allarga la base per dare stabilità")
    down: [[-3, ".......WW......."], [-2, ".......HH......."], [-1, "......HhhH......"], [0, ".....HhHHhH....."], [1, "....HhHhhHhH...."], [2, "...HhHhHHhHhH..."], [3, "..hhhhhhhhhhhh.."]],
    side: [[-3, ".......WW......."], [-2, ".......HH......."], [-1, "......HhhH......"], [0, ".....HhHHhH....."], [1, "....HhHhhHhH...."], [2, "...HhHhHHhHhH..."], [3, "..hhhhhhhhhhhh.."]],
    up: [[-3, ".......WW......."], [-2, ".......HH......."], [-1, "......HhhH......"], [0, ".....HhHHhH....."], [1, "....HhHhhHhH...."], [2, "...HhHhHHhHhH..."], [3, "..hhhhhhhhhhhh.."]],
  },
  cowboy: { // cappello da cowboy con tesa curva (disegnato a mano)
    down: [[-1, ".....HHHHhh....."], [0, "....HHHHHHHH...."], [1, ".H.HHKHKHKHKH.H."], [2, ".HHHHHHHHHHHHHH."]],
    side: [[-1, ".....HHHHHH....."], [0, "....HhhHHHHH...."], [1, "..H.HhHHHHHHH.H."], [2, "..HHHHHHHHHHHHH."]],
    up: [[-1, ".....hhHHHH....."], [0, "....HHHHHHHH...."], [1, ".H.HHKHKHKHKH.H."], [2, ".HHHHHHHHHHHHHH."]],
  },
  santa: { // berretto di Babbo Natale — allargato di 1px per lato e la punta col pompon spostata
    // verso sinistra: era troppo stretto e dritto, "sembrava deforme" (revisione estetica Gemini,
    // "allarga la base e falla cadere lateralmente invece di stare dritta in cima")
    down: [[-3, "..........WW...."], [-2, "..........WW...."], [-1, "......HHHHHh...."], [0, "....HHHHHHHHH..."], [1, "...HHHHHHHHHH..."], [2, "..WWWWWWWWWWWW.."], [3, ".WWWWWWWWWWWWWW."]],
    side: [[-3, "...WW..........."], [-2, "...WW..........."], [-1, "....hhHHH......."], [0, "....hHHHHHHH...."], [1, "....HHHHHHHH...."], [2, "....HHHHHHHHH..."], [3, "..WWWWWWWWWWWW.."], [4, "..WWWWWWWWWWW..."]],
    up: [[-3, "..........WW...."], [-2, "..........WW...."], [-1, "......HHHHHh...."], [0, "....HHHHHHHHH..."], [1, "...HHHHHHHHHH..."], [2, "..HHHHHHHHHHHH.."], [3, "..WWWWWWWWWWWW.."], [4, ".WWWWWWWWWWWWWW."]],
  },
  /* ================= CAPPELLI-TROFEO (oro fisso G/g/Y). Sbloccati raggiungendo l'ORO di una traccia;
     al PLATINO la stessa forma si illumina di glitter (vedi glitterHats in drawHero). ================= */
  crownGold: { down: [[-1, "....G..G..G....."], [0, "...GGGGGGGGGG..."], [1, "...GgGRGGRgG...."], [2, "...gggggggggg..."]], side: [[-1, "....G..G..G....."], [0, "...GGGGGGGGGG..."], [1, "...GgGRGGRgG...."], [2, "...gggggggggg..."]], up: [[-1, "....G..G..G....."], [0, "...GGGGGGGGGG..."], [1, "...GgGGGGGGgG..."], [2, "...gggggggggg..."]] },
  gradGold: { down: [[-2, ".GGGGGGGGGGGGGG."], [-1, ".gggggggggggggY."], [0, ".......Y......Y."], [1, "...GGGGGGGGGG..."], [2, "...gggggggggg..."]], side: [[-2, "..GGGGGGGGGGGG.."], [-1, "..gggggggggggg.."], [0, ".......Y........"], [1, "...GGGGGGGGGG..."], [2, "...gggggggggg..."]], up: [[-2, ".GGGGGGGGGGGGGG."], [-1, ".gggggggggggggg."], [0, ".......Y........"], [1, "...GGGGGGGGGG..."], [2, "...gggggggggg..."]] },
  laurelGold: { down: [[-1, "...Q.Q.Q.Q.Q...."], [0, "...QGQGQGQGQG..."], [1, "...GGGGGGGGGG..."]], side: [[-1, "...Q.Q.Q.Q.Q...."], [0, "...QGQGQGQGQG..."], [1, "...GGGGGGGGGG..."]], up: [[-1, "...Q.Q.Q.Q.Q...."], [0, "...QGQGQGQGQG..."], [1, "...GGGGGGGGGG..."]] },
  gogglesGold: { down: [[0, "...GGGGGGGGGG..."], [1, "...GDDGGGDDG...."], [2, "...gGGGGGGGGg..."]], side: [[0, "...GGGGGGGGGG..."], [1, "...GDDGGGGGG...."], [2, "...gGGGGGGGGg..."]], up: [[0, "...GGGGGGGGGG..."], [1, "...GGGGGGGGGG..."], [2, "...gGGGGGGGGg..."]] },
  hornsGold: { down: [[-3, "..GG........GG.."], [-2, "...GG......GG..."], [-1, "...gG......Gg..."], [0, "...GGGGGGGGGG..."], [1, "...gGgGGGGgGg..."]], side: [[-3, "...GG..........."], [-2, "....GG.........."], [-1, "....gG.........."], [0, "...GGGGGGGGGG..."], [1, "...gGgGGGGgGg..."]], up: [[-3, "..GG........GG.."], [-2, "...GG......GG..."], [-1, "...gG......Gg..."], [0, "...GGGGGGGGGG..."], [1, "...gggggggggg..."]] },
  pithGold: { down: [[0, "....GGGGGG......"], [1, "...GGGGGGGG....."], [2, "..GGGGGGGGGG...."], [3, ".gGGGGGGGGGGg..."]], side: [[0, "....GGGGGG......"], [1, "...GGGGGGGGG...."], [2, "..GGGGGGGGGGG..."], [3, ".gGGGGGGGGGGg..."]], up: [[0, "....GGGGGG......"], [1, "...GGGGGGGG....."], [2, "..GGGGGGGGGG...."], [3, ".gGGGGGGGGGGg..."]] },
  /* piuma ISPESSITA a 2px e inclinata verso l'esterno (prima 1px dritto: "sembra un'antenna",
     revisione estetica Gemini — "spessa 2px alla base, inclinata di 45°, sporge oltre il bordo") */
  featherGold: { down: [[-3, ".............R.."], [-2, "............RR.."], [-1, "...........RGG.."], [0, "...GGGGGGGGh...."], [1, "...GgggggggG...."], [2, "...ggggggggg...."]], side: [[-3, ".............R.."], [-2, "............RR.."], [-1, "...........RGG.."], [0, "...GGGGGGGGh...."], [1, "...GgggggggG...."], [2, "...ggggggggg...."]], up: [[0, "...GGGGGGGGGG..."], [1, "...GgggggggG...."], [2, "...ggggggggg...."]] },
  hardhatGold: { down: [[0, "....GGGGGG......"], [1, "...GWWGGGGG....."], [2, "..GGGGGGGGGG...."], [3, ".GGGGGGGGGGGGGG."]], side: [[0, "....GGGGGG......"], [1, "...WWGGGGGG....."], [2, "..GGGGGGGGGGG..."], [3, ".GGGGGGGGGGGGG.."]], up: [[0, "....GGGGGG......"], [1, "...GGGGGGGG....."], [2, "..GGGGGGGGGG...."], [3, ".GGGGGGGGGGGGGG."]] },
  lampGold: { down: [[0, "...GGGWWGGGG...."], [1, "...GGGGGGGGGG..."], [2, "...gggggggggg..."]], side: [[0, "...WWGGGGGGGG..."], [1, "...GGGGGGGGGG..."], [2, "...gggggggggg..."]], up: [[0, "...GGGGGGGGGG..."], [1, "...GGGGGGGGGG..."], [2, "...gggggggggg..."]] },
};
/* i cappelli-trofeo (oro, ...Gold) hanno già un loro schema chiaro/scuro/luce (G/g/Y): non
   toccarli. Gli altri (in H/h) prendono il terzo tono qui, una volta sola al caricamento. */
export const HATS = Object.fromEntries(Object.entries(HATS_RAW).map(([k, v]) => [k, /Gold$/.test(k) ? v : litHat(v)]));
/* ultima riga di "corona" per forma: col cappello indossato i capelli NON si disegnano
   su queste righe (niente compenetrazioni); sotto restano frangia/lati/lunghezze */
export const HAT_CROWN = { explorer: 2, cap: 2, beanie: 3,
  flowercrown: 1, bandana: 2, hood: 5, snorkel: -1, ushanka: 6, vikingo: 4,
  sombrero: 4, partyhat: 3, cowboy: 2, santa: 3,
  crownGold: 2, gradGold: 2, laurelGold: 1, gogglesGold: 2, hornsGold: 1, pithGold: 3, featherGold: 2, hardhatGold: 3, lampGold: 2 };

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
    let s = rows[top].split(''); for (let x = Math.max(0, f - 1); x <= Math.min(15, l + 1); x++) s[x] = 'P'; s[Math.max(0, f - 1)] = 'p'; s[Math.min(15, l + 1)] = 'p';
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
    const sp = [[5, -1], [10, 0], [7, 1], [4, 1], [9, -1]];
    for (let i = 0; i < sp.length; i++) { if ((i + t) % 3 !== 0) continue; const [sx, sy] = sp[i]; g.fillStyle = (i % 2 ? '#ffffff' : '#f8dd82'); g.fillRect(x + (flip ? 15 - sx : sx), y + sy, 1, 1); }
  }
}
/* tempo per il twinkle del glitter (aggiornato da render); default 0 per test/anteprime statiche */
let heroTime = 0;
export function setHeroTime(t) { heroTime = t || 0; }
