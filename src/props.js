/* OGGETTI DEL MONDO — alberi, sassi, fiori, funghi, oggetti a terra, decorazioni di bioma.
   Estratto da render.js: qui sta il "cosa c'è per terra", non il "come si compone la scena".

   REGOLA che vale per tutto questo file: ciò che si RACCOGLIE ha ombra di contatto + stellina
   e un disegno diverso da quello scenografico. Ciò che è solo decorazione è piatto e spento.
   Le fasi delle animazioni vengono dal TEMPO o dalle coordinate TILE, mai da sx/sy. */
import { TS, spColor } from './data.js';
import { vhash } from './noise.js';
import { px, rect, shadow, shade8, snap, BRUSH, makeCanvasBrush } from './brush.js';
import { ctx, view } from './screen.js';
import { seaTree, zoneTree } from './tiles.js';
import { zoneIdxAt } from './regions.js';
import { treeSprite, treeKind, TREE_AX, TREE_AY } from './treeArt.js';
import { HOLES, holeRuns } from './holeArt.js';
/* abete delle Lande: verde scuro sotto la neve (la palette di zona è tutta bianca) */
const FIR = ['#2f5a44', '#3a6a50', '#467a5c', '#528a68', '#6aa07c', '#223f30'];


/* ---------- primitive per la natura ---------- */
/* CIUFFI D'ERBA alla base: il segno di ciò che NON si raccoglie. Quello che si raccoglie non
   ha erba attorno e ha il suo luccichio (render.js), così a colpo d'occhio si capisce cosa
   vale la pena toccare — il fungo marrone sembrava raccoglibile (segnalato con foto). */
function erbetta(x0, x1, base, tx = 0, ty = 0, c1 = '#5f8f47', c2 = '#4a7a38') {
  for (let x = x0; x < x1; x += 3) {
    const j = Math.floor(vhash(tx + x, ty, 121) * 4);
    if (j === 0) continue;
    const h = 2 + j;
    rect(x, base - h, 1, h, j % 2 ? c1 : c2);
    px(x + 1, base - h + 1, j % 2 ? c2 : c1);
  }
}
const LN = '#1e1a12';
function disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); rect(cx - w, cy + y, w * 2 + 1, 1, c); } }
function ellipseF(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); if (w > 0) rect(cx - w, cy + y, w * 2, 1, c); } }
/* una CHIOMA fatta di grumi: contorno, massa, ombra sotto, luce in alto a sinistra */
function canopy(blobs, T) {
  /* il contorno della chioma è un VERDE molto scuro, non il nero: con la linea nera ogni
     albero sembrava un adesivo appiccicato sul prato */
  const lineaC = shade8(T[1] || T[0], 0.34);
  for (const [x, y, r] of blobs) disc(x, y + 1, r + 1, lineaC);
  for (const [x, y, r] of blobs) disc(x, y + 2, r, T[5] || shade8(T[0], 0.7));
  for (const [x, y, r] of blobs) disc(x - 1, y, r - 1, T[1]);
  for (const [x, y, r] of blobs) disc(x - Math.round(r * 0.3), y - Math.round(r * 0.35), Math.max(1, Math.round(r * 0.55)), T[3]);
  for (const [x, y, r] of blobs) { rect(x - Math.round(r * 0.5), y - Math.round(r * 0.6), 2, 2, T[4]); }
}

export function drawTree(sx, sy, time, tx, ty) {
  /* ALBERO con la forma della sua zona (treeArt.js): lo sprite si genera una volta e si copia.
     Solo un albero su tre ondeggia, e la fase viene dal tempo e dalla casella. */
  const zi = zoneIdxAt(tx, ty);
  const kind = treeKind(zi), snow = zi === 5;
  const T = snow ? FIR : zoneTree(zi);
  const sw = vhash(tx, ty, 41) < 0.35 ? Math.round(Math.sin(time / 850 + tx * 1.7 + ty * 2.3)) : 0;
  const v = Math.floor(vhash(tx, ty, 50) * 4);
  const spr = treeSprite(kind, v, T, sw, snow);
  /* snap alla griglia dei pixel FISICI, non Math.round al pixel di gioco: la camera scorre a
     frazioni e un albero arrotondato all'intero tremava camminando (REGOLE FERREE #2) */
  if (spr) { try { ctx.drawImage(spr, snap(sx + 16 - TREE_AX), snap(sy + 30 - TREE_AY)); return; } catch (e) { /* stub dei test */ } }
  /* ripiego senza tela (test): tronco e chioma essenziali */
  shadow(sx + 16, sy + 30, 14);
  rect(sx + 13, sy + 18, 6, 12, '#7c4f2e');
  rect(sx + 2, sy - 6, 28, 24, T[1]); rect(sx + 4, sy - 8, 20, 6, T[3]);
}
export function drawBoulder(sx, sy, tx = 0, ty = 0) {
  /* MASSO: un sasso, non una scatola con lo spigolo. La sagoma nasce da tre gobbe sovrapposte
     (mai simmetriche: il masso tondo e regolare "sembrava un sedere", segnalato con foto), poi
     si dipinge in un colpo solo — faccia di sopra chiara, fianco destro in ombra, una scheggia
     piatta e una crepa fuori centro. */
  ctx.save(); ctx.translate(sx, sy);
  const v = vhash(tx, ty, 81), flip = v < 0.5 ? 1 : -1;
  shadow(16, 27, 13);
  const gobbe = [
    ['ell', 16 + flip * 2, 19, 13, 9],
    ['ell', 16 - flip * 6, 21, 8, 6],
    ['ell', 16 + flip * 7, 20, 7, 7],
    ['ell', 16 + flip * 3, 14, 9, 5],
  ];
  const dentro = paintMask(roundMask(gobbe), '#8f887b', '#b3ab9d', '#6f685d');
  /* faccia di sopra: schiarita fin dove la pietra "guarda il cielo" */
  for (let y = 8; y <= 15; y++) for (let x = 2; x < 30; x++)
    if (dentro(x, y) && dentro(x - 1, y) && dentro(x + 1, y) && dentro(x, y + 1)) px(x, y, y < 12 ? '#c4bdb0' : '#a39c90');
  for (let k = 0; k < 8; k++) { const x = 16 + flip * (2 + k), y = 14 + k; if (dentro(x, y)) px(x, y, '#55504a'); }   // crepa di traverso
  for (let k = 0; k < 5; k++) { const x = 16 - flip * (6 + k), y = 17 + Math.round(k * 0.6); if (dentro(x, y)) px(x, y, '#7d766a'); }   // scheggia piatta
  if (vhash(tx, ty, 83) < 0.45) for (let x = 4; x < 11; x++) for (let y = 21; y < 25; y++)   // muschio nella parte bassa
    if (dentro(x, y)) px(x, y, y < 22 ? '#8aa86a' : '#6f8a52');
  if (vhash(tx, ty, 84) < 0.4) {                                                             // sassolino accanto
    const qx = flip > 0 ? 27 : 5;
    paintMask(roundMask([['ell', qx, 25, 4, 3]]), '#a39c90', '#c4bdb0', '#7d766a');
  }
  ctx.restore();
}
/* FIORE — versione scenografica (piatta, a terra) e versione MATURA (alta, azzurra, col
   gambo: la stessa forma dell'oggetto 'fiordaliso' che finisce nello zaino). Le due non si
   confondono: se è raccoglibile lo si vede dalla forma, non solo dalla stellina. */
export function drawFlower(sx, sy, tx, ty, ripe) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const bx = sx + 16, by = sy + 18;
  if (ripe) {                                        // fiordaliso maturo: stelo + corolla azzurra
    const y = sy + 24;
    rect(bx, y - 2, 2, 8, '#3f7a44'); px(bx - 2, y, '#3f7a44'); px(bx + 2, y + 2, '#3f7a44'); px(bx, y + 4, shade8('#3f7a44', 1.2));
    rect(bx, y - 10, 2, 2, '#6f92dd'); rect(bx - 2, y - 8, 2, 2, '#6f92dd'); rect(bx + 2, y - 8, 2, 2, '#6f92dd');
    rect(bx - 4, y - 6, 2, 2, '#6f92dd'); rect(bx + 4, y - 6, 2, 2, '#6f92dd'); rect(bx, y - 4, 2, 2, '#6f92dd');
    rect(bx - 2, y - 6, 2, 2, '#3f5fb0'); rect(bx + 2, y - 6, 2, 2, '#3f5fb0'); rect(bx, y - 6, 2, 2, '#f2d24a');
    px(bx - 1, y - 9, shade8('#6f92dd', 1.3)); // petalo alto con un filo di luce
    /* CONTORNO della corolla: il fiordaliso si raccoglie, i fiori del prato no. Senza linea
       i due si somigliano troppo e il giocatore prova su quello sbagliato */
    const LNF = '#26356b';
    for (const [ox, oy] of [[-1, -10], [1, -10], [-3, -9], [3, -9], [-5, -7], [5, -7], [-5, -4], [5, -4], [-3, -2], [3, -2], [-1, -2], [1, -2], [-1, -11], [1, -11]])
      px(bx + ox, y + oy, LNF);
    ctx.restore(); return;
  }
  const k = (((tx * 5 + ty * 3) % 3) + 3) % 3;
  const petal = k === 0 ? '#f0a5c0' : k === 1 ? '#f2dd7a' : '#f3ece0';
  rect(bx, by - 4, 2, 2, petal); rect(bx - 4, by, 2, 2, petal); rect(bx + 4, by, 2, 2, petal); rect(bx, by + 4, 2, 2, petal);
  rect(bx, by, 2, 2, '#d98a3c'); px(bx, by + 1, shade8('#d98a3c', 1.2)); rect(bx, by + 8, 2, 2, '#4a8f4f');
  ctx.restore();
}
/* CONCHIGLIA — la scenografia è una valva rotta appiattita nella sabbia; quella raccoglibile
   è intera, a ventaglio, con le costole e la cerniera in basso. */
export function drawShell(sx, sy, ripe) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const bx = sx + 16, by = sy + 18;
  if (ripe) {
    const base = sy + 24;
    /* CONTORNO: la conchiglia intera si raccoglie, quella rotta no. La linea attorno è il
       segno che lo dice, prima ancora della stellina */
    const LNC = '#8a4f4c';
    rect(bx - 9, base - 9, 20, 10, LNC); rect(bx - 7, base - 13, 16, 6, LNC); rect(bx - 1, base - 15, 4, 4, LNC);
    rect(bx - 8, base - 8, 18, 8, '#f2c9c4'); rect(bx - 6, base - 12, 14, 4, '#f2c9c4');
    rect(bx, base - 14, 2, 2, '#f2c9c4');
    for (const ox of [-6, 0, 6]) { rect(bx + ox, base - 10, 2, 2, '#d99a97'); rect(bx + ox, base - 6, 2, 2, '#d99a97'); }
    rect(bx - 4, base - 12, 2, 2, '#fbeae7'); rect(bx + 2, base - 12, 2, 2, '#fbeae7');
    rect(bx - 2, base - 2, 6, 2, '#c98481'); rect(bx - 2, base - 2, 6, 1, shade8('#c98481', 0.8)); // cerniera con un filo d'ombra sotto
    ctx.restore(); return;
  }
  rect(bx - 4, by - 4, 8, 8, '#e7c6a0'); rect(bx - 2, by - 2, 3, 3, '#f5e4cf'); rect(bx, by - 6, 2, 2, '#d3a97f'); px(bx + 2, by + 2, shade8('#e7c6a0', 0.8));
  ctx.restore();
}
export function drawHole(sx, sy, tx = 0, ty = 0) {
  /* BUCA scavata: una delle dieci forme di holeArt, scelta per casella, specchiata e spostata
     di qualche pixel, così un campo scavato non è un timbro ripetuto */
  const i = Math.floor(vhash(tx, ty, 104) * HOLES.length) % HOLES.length;
  const flip = vhash(tx, ty, 105) < 0.5;
  const ox = Math.round((vhash(tx, ty, 106) - 0.5) * 6), oy = Math.round((vhash(tx, ty, 107) - 0.5) * 4);
  ctx.save(); ctx.translate(sx + ox, sy + oy);
  for (const [x, y, w, c] of holeRuns(i, flip)) rect(x, y, w, 1, c);
  ctx.restore();
}
/* OGGETTI di superficie: sprite VERI riconoscibili (non quadrati), FERMI (niente rimbalzo).
   Ogni tanto una stellina appare sopra per attirare l'occhio (fase stabile per tile). */
/* IL DISEGNO di un oggetto raccoglibile, su un pennello qualsiasi (`g`), con la base in
   (cx, y). Sta a parte perché lo stesso disegno serve due volte: qui e nello sprite con il
   contorno (vedi `pickupSprite`). */
export function paintPickup(g, id, cx, y) {
  const gem = () => {};              // niente glint continuo: ci pensa la stellina
  switch (id) {
    /* ---- PRATI ---- */
    case 'fiordaliso': { g.rect(cx, y - 2, 2, 8, '#3f7a44'); g.px(cx - 2, y, '#3f7a44'); g.px(cx + 2, y + 2, '#3f7a44'); // stelo+foglie
      g.rect(cx, y - 10, 2, 2, '#6f92dd'); g.rect(cx - 2, y - 8, 2, 2, '#6f92dd'); g.rect(cx + 2, y - 8, 2, 2, '#6f92dd'); g.rect(cx - 4, y - 6, 2, 2, '#6f92dd'); g.rect(cx + 4, y - 6, 2, 2, '#6f92dd'); g.rect(cx, y - 4, 2, 2, '#6f92dd'); // petali
      g.rect(cx - 2, y - 6, 2, 2, '#3f5fb0'); g.rect(cx + 2, y - 6, 2, 2, '#3f5fb0'); g.rect(cx, y - 6, 2, 2, '#f2d24a'); g.px(cx - 1, y - 9, g.shade8('#6f92dd', 1.3)); break; } // cuore giallo + filo di luce
    case 'spiga': { g.rect(cx, y - 12, 2, 16, '#c9a24a'); g.px(cx, y - 14, '#e8c860'); // stelo lungo
      for (let i = 0; i < 5; i++) { g.rect(cx - 2, y - 12 + i * 4, 2, 2, '#e8c860'); g.rect(cx + 2, y - 10 + i * 4, 2, 2, '#d8b450'); } // chicchi a spiga
      g.px(cx - 4, y - 10, '#c9a24a'); g.px(cx + 4, y - 6, '#c9a24a'); break; } // reste
    case 'ambra': { g.px(cx, y - 8, '#f0b451'); g.rect(cx - 2, y - 6, 6, 4, '#e0932e'); g.rect(cx - 2, y - 2, 6, 2, '#c9761e'); g.px(cx, y, '#c9761e'); // goccia
      g.rect(cx, y - 6, 2, 2, '#ffe6a8'); g.px(cx + 2, y - 4, '#a85e14'); gem(); break; }
    /* ---- DUNE ---- */
    case 'conchiglia': { // ventaglio con coste che partono dalla punta in basso
      g.rect(cx, y - 8, 2, 2, '#f8e6d4'); g.rect(cx - 2, y - 6, 2, 2, '#f0c0a0'); g.rect(cx, y - 6, 2, 2, '#f8e6d4'); g.rect(cx + 2, y - 6, 2, 2, '#f0c0a0');
      g.rect(cx - 4, y - 4, 2, 2, '#f0c0a0'); g.rect(cx - 2, y - 4, 2, 2, '#f8e6d4'); g.rect(cx, y - 4, 2, 2, '#f0c0a0'); g.rect(cx + 2, y - 4, 2, 2, '#f8e6d4'); g.rect(cx + 4, y - 4, 2, 2, '#f0c0a0');
      g.rect(cx - 4, y - 2, 2, 2, '#d89570'); g.rect(cx - 2, y - 2, 2, 2, '#f0c0a0'); g.rect(cx, y - 2, 2, 2, '#d89570'); g.rect(cx + 2, y - 2, 2, 2, '#f0c0a0'); g.rect(cx + 4, y - 2, 2, 2, '#d89570');
      g.rect(cx, y, 2, 2, '#c07a55'); break; }
    case 'vetro': { g.rect(cx - 4, y - 4, 8, 6, '#6fc0b0'); g.px(cx - 4, y - 4, '#4e9a8a'); g.px(cx + 2, y, '#4e9a8a'); g.rect(cx - 2, y - 4, 2, 2, '#bfeee0'); gem(); break; }
    case 'scarabeo': { g.rect(cx - 4, y - 4, 8, 6, '#e6dcc0'); g.rect(cx, y - 4, 2, 2, '#b8ad8c'); g.rect(cx, y - 2, 2, 2, '#b8ad8c'); g.rect(cx, y, 2, 2, '#b8ad8c');
      g.rect(cx - 4, y - 6, 2, 2, '#b8ad8c'); g.rect(cx + 2, y - 6, 2, 2, '#b8ad8c'); g.rect(cx - 6, y, 2, 2, '#b8ad8c'); g.rect(cx + 4, y, 2, 2, '#b8ad8c'); break; }
    /* ---- BOSCHI ---- */
    case 'ghianda': { g.rect(cx - 2, y - 4, 6, 6, '#c68a4a'); g.px(cx - 2, y + 2, '#8a5a2a'); g.px(cx + 2, y + 2, '#8a5a2a');
      g.rect(cx - 2, y - 6, 6, 2, '#6e4a2a'); g.px(cx, y - 8, '#6e4a2a'); g.px(cx - 1, y - 3, g.shade8('#c68a4a', 1.2)); break; }
    case 'funghetto': { g.rect(cx - 4, y - 4, 10, 4, '#d0453a'); g.px(cx - 4, y - 2, '#a83329'); g.px(cx + 4, y - 2, '#a83329');
      g.rect(cx - 2, y - 4, 2, 2, '#f2ead8'); g.rect(cx + 2, y - 4, 2, 2, '#f2ead8'); g.rect(cx, y, 2, 4, '#f2ead8'); g.px(cx - 1, y - 3, g.shade8('#d0453a', 1.25)); break; }
    case 'resina': { g.rect(cx - 2, y - 4, 6, 6, '#7a3f1e'); g.px(cx, y - 6, '#7a3f1e'); g.px(cx, y + 2, '#5a2c12'); g.rect(cx - 2, y - 4, 2, 2, '#b5713a'); break; }
    /* ---- TERRE ---- */
    case 'sassorosso': { g.rect(cx - 4, y - 2, 10, 4, '#b5623a'); g.px(cx - 4, y, '#8a4326'); g.px(cx + 4, y, '#8a4326');
      g.rect(cx - 2, y - 4, 2, 2, '#b5623a'); g.rect(cx + 2, y - 4, 2, 2, '#b5623a'); g.rect(cx - 2, y - 2, 2, 2, '#d08a5a'); break; }
    case 'ferro': { g.px(cx - 2, y - 4, '#9aa0a6'); g.rect(cx - 4, y - 2, 8, 4, '#9aa0a6'); g.px(cx + 4, y, '#6a7076'); g.px(cx - 4, y, '#6a7076'); g.rect(cx - 2, y - 2, 2, 2, '#c8cdd2'); break; }
    /* il granato era quasi nero: sulla terra rossa delle Terre spariva, e il contorno scuro
       non aveva più niente da cui staccare. Alzato di tono: resta un rosso cupo, ma si vede */
    case 'granato': { g.rect(cx - 2, y - 4, 6, 6, '#a8304a'); g.px(cx - 2, y - 4, '#6f1a2c'); g.px(cx + 2, y, '#6f1a2c'); g.rect(cx, y - 2, 2, 2, '#d4526e'); g.rect(cx - 2, y - 2, 2, 2, '#f07890'); gem(); break; }
    /* ---- PALUDE ---- */
    case 'giunco': { g.rect(cx - 2, y - 8, 2, 12, '#4e8d5a'); g.rect(cx + 2, y - 6, 2, 10, '#3a6a44'); g.rect(cx, y - 10, 2, 14, '#4e8d5a');
      g.px(cx - 2, y - 10, '#8a5a3a'); g.px(cx, y - 12, '#8a5a3a'); g.px(cx, y - 6, g.shade8('#4e8d5a', 1.3)); break; }
    case 'lumaca': { g.rect(cx - 4, y - 4, 8, 6, '#c69a5a'); g.px(cx - 4, y, '#8a5a2a'); g.px(cx + 2, y - 4, '#8a5a2a');
      g.rect(cx, y - 2, 2, 2, '#e0b878'); g.px(cx - 2, y - 2, '#8a5a2a'); g.px(cx, y - 4, '#8a5a2a'); g.px(cx + 4, y + 2, '#8a5a2a'); break; }
    case 'ninfea': { g.rect(cx - 4, y + 2, 10, 2, '#4e8d5a'); g.rect(cx, y - 4, 2, 2, '#e08ab0'); g.rect(cx - 2, y - 2, 2, 2, '#e08ab0'); g.rect(cx + 2, y - 2, 2, 2, '#e08ab0'); g.rect(cx, y - 2, 2, 2, '#f6d0e0'); g.px(cx, y - 6, '#c06a90'); break; }
    /* ---- LANDE GELIDE ---- */
    case 'scheggia': { g.rect(cx, y - 8, 2, 12, '#9fe0ee'); g.px(cx - 2, y - 4, '#9fe0ee'); g.px(cx + 2, y - 2, '#6fb8cc'); g.rect(cx, y - 8, 2, 2, '#eafcff'); g.px(cx, y - 2, '#6fb8cc'); gem(); break; }
    case 'pigna': { g.rect(cx - 2, y - 6, 6, 8, '#8a5a2a'); g.px(cx - 2, y - 6, '#6e4420'); g.px(cx + 4, y - 6, '#6e4420'); g.rect(cx, y - 4, 2, 2, '#a8763a'); g.px(cx, y + 2, '#6e4420'); g.px(cx - 2, y - 2, '#6e4420'); g.px(cx + 2, y - 2, '#6e4420'); break; }
    case 'zaffiro': { g.rect(cx - 2, y - 4, 6, 6, '#3a6ad0'); g.px(cx - 2, y - 4, '#244a9a'); g.px(cx + 2, y, '#244a9a'); g.rect(cx, y - 2, 2, 2, '#8ab0ff'); g.rect(cx - 2, y - 2, 2, 2, '#c0d8ff'); gem(); break; }
    /* ---- fossile lasciato a terra (drop) ---- */
    case 'fossil': { g.rect(cx - 4, y - 2, 10, 4, '#e9e2cf'); g.px(cx - 6, y - 4, '#f4eeda'); g.px(cx + 4, y - 4, '#f4eeda'); g.px(cx - 6, y + 2, '#f4eeda'); g.px(cx + 4, y + 2, '#f4eeda'); g.rect(cx, y, 2, 2, '#bcb39a'); break; }
    default: { g.rect(cx - 2, y - 2, 4, 4, '#e2b24a'); }
  }
}
/* SPRITE di un raccoglibile, col CONTORNO SCURO attorno. Gli oggetti a terra si raccolgono
   con {act}: per la regola del gioco devono avere la lineart, o si confondono col paesaggio.
   Sono fatti di una ventina di rettangolini ciascuno, e contornarli a mano uno per uno
   sarebbe una ventina di occasioni di sbagliare: si disegnano una volta su una tela a parte,
   si traccia il contorno leggendo la sagoma vera, e si tiene in cache. */
const pkCache = new Map();
function pickupSprite(id) {
  let cv = pkCache.get(id); if (cv !== undefined) return cv;
  cv = null;
  try {
    cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
    paintPickup(makeCanvasBrush(cv.getContext('2d')), id, 16, 24);
    /* il contorno prende la tinta MEDIA dell'oggetto, non un grigio-nero fisso: una spiga
       dorata cerchiata di nero sembra un adesivo, e con venti oggetti diversi si vedeva */
    outlinePx(cv, tintaMedia(cv, 0.34));
  } catch (e) { cv = null; /* stub nei test */ }
  pkCache.set(id, cv); return cv;
}
export function drawPickup(id, sx, sy, time, tx, ty) {
  const cv = pickupSprite(id);
  shadow(sx + 16, sy + 26, 8);
  if (cv) { try { ctx.drawImage(cv, sx, sy); } catch (e) { /* stub */ } }
  else { ctx.save(); ctx.translate(sx, sy); paintPickup(BRUSH, id, 16, 24); ctx.restore(); }
  glint(sx + 22, sy + 6, time, tx, ty);
  ctx.restore();
}
/* la tinta media dei pixel pieni di una canvas, scurita: serve a dare a ogni oggetto un
   contorno del SUO colore invece di un nero buono per tutti */
function tintaMedia(cv, k) {
  try {
    const c2 = cv.getContext('2d'); const d = c2.getImageData(0, 0, cv.width, cv.height).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    if (!n) return '#2a2118';
    const f = v => Math.max(0, Math.min(255, Math.round((v / n) * k)));
    return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
  } catch (e) { return '#2a2118'; }
}
/* CONTORNO AGGRAPPATO ALLA SAGOMA di una canvas: si legge il canale alpha e si accende solo
   il pixel VUOTO adiacente a uno pieno. Un riquadro attorno alla tela darebbe una cornice
   nera grande quanto la canvas, non una lineart. */
function outlinePx(cv, col) {
  const c2 = cv.getContext('2d'); if (!c2 || !c2.getImageData) return;
  const im = c2.getImageData(0, 0, cv.width, cv.height), d = im.data, W2 = cv.width, H2 = cv.height;
  const pieno = (x, y) => x >= 0 && y >= 0 && x < W2 && y < H2 && d[(y * W2 + x) * 4 + 3] > 40;
  const n = parseInt(col.slice(1), 16), R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
  const out = new Uint8ClampedArray(d);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
    if (pieno(x, y)) continue;
    if (!(pieno(x + 1, y) || pieno(x - 1, y) || pieno(x, y + 1) || pieno(x, y - 1))) continue;
    const o = (y * W2 + x) * 4; out[o] = R; out[o + 1] = G; out[o + 2] = B; out[o + 3] = 255;
  }
  im.data.set(out); c2.putImageData(im, 0, 0);
}
/* SEGNALE DI RACCOGLIBILE: stellina che appare ogni tanto (fase sfalsata per tile, così non
   lampeggiano tutte insieme). Chi la porta si raccoglie con E: è la promessa che facciamo al
   giocatore, e vale anche per funghi, conchiglie, fiori e canne. */
export function glint(sx2, sy2, time, tx, ty) {
  const ph = (time / 900 + ((((tx || 0) * 13 + (ty || 0) * 7) % 23) + 23) % 23) % 8;
  if (ph >= 0.42) return;
  px(sx2, sy2, '#fff8d0'); px(sx2 - 1, sy2, '#fff3b0'); px(sx2 + 1, sy2, '#fff3b0');
  px(sx2, sy2 - 1, '#fff3b0'); px(sx2, sy2 + 1, '#fff3b0');
}


/* ---------- decorazioni di zona ---------- */
/* SAGOME TONDE — lo stile del saguaro, buono per tutto quello che nel mondo è fatto di
   volumi morbidi (ceppi, rotoballe, funghi, guglie). Si compone una MASCHERA con rettangoli
   dagli angoli smussati e dischi, poi si dipinge una volta sola: il contorno segue il profilo,
   un filo di luce resta sul lato illuminato e l'ombra sull'altro. Disegnare le stesse forme a
   colpi di rettangoli lasciava spigoli vivi e doppi bordi nei punti in cui si toccano.
   Quello che è spigoloso PER NATURA — massi, cristalli, ossa — resta com'è: tondo, il masso
   sembrava un sedere (segnalato). */
const MW = 32, MH = 32;
export function roundMask(shapes, w = MW, h = MH) {
  const m = new Uint8Array(w * h);
  const set = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) m[y * w + x] = 1; };
  for (const sh of shapes) {
    if (sh[0] === 'disc') { const [, cx, cy, r] = sh; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) set(cx + x, cy + y); continue; }
    if (sh[0] === 'ell') { const [, cx, cy, rx, ry] = sh; for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) set(cx + x, cy + y); continue; }
    if (sh[0] === 'cap') {                       // CAPSULA fra due punti: tronchi, rami, radici
      const [, ax, ay, bx, by, r] = sh, vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
      const x0 = Math.min(ax, bx) - r, x1 = Math.max(ax, bx) + r, y0 = Math.min(ay, by) - r, y1 = Math.max(ay, by) + r;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        let u = ((x - ax) * vx + (y - ay) * vy) / L2; u = Math.max(0, Math.min(1, u));
        const dx = x - (ax + vx * u), dy = y - (ay + vy * u);
        if (dx * dx + dy * dy <= r * r + r) set(x, y);
      }
      continue;
    }
    const [x0, y0, sw, shh, r = 0] = sh;
    for (let y = 0; y < shh; y++) for (let x = 0; x < sw; x++) {
      const dx = Math.min(x, sw - 1 - x), dy = Math.min(y, shh - 1 - y);
      if (dx < r && dy < r && (r - dx) ** 2 + (r - dy) ** 2 > r * r + r) continue;   // angolo smussato
      set(x0 + x, y0 + y);
    }
  }
  return m;
}
/* dipinge la maschera: contorno, corpo, luce a sinistra, ombra a destra */
/* `line = null` = NIENTE CONTORNO: è il segno del paesaggio. Nel gioco il contorno scuro vuol
   dire "ci puoi fare qualcosa" (si raccoglie, si spacca, si abbatte); quello che è solo
   scenografia — balle di fieno, ceppi, funghetti marroni — resta senza, come i fiori del prato,
   e non invita a premere niente (segnalato). */
export function paintMask(m, fill, light, dark, w = MW, h = MH, line) {
  /* CONTORNO A COLORE. Non deve essere nero: è la stessa tinta dell'oggetto, molto più
     scura. Il nero piatto attorno a tutto appiattiva il mondo e faceva sembrare ogni cosa
     ritagliata e incollata; un contorno che porta il colore del corpo tiene la sagoma
     staccata lo stesso e resta caldo. `null` = nessun contorno (paesaggio). */
  if (line === undefined) line = shade8(fill, 0.42);
  const dentro = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!dentro(x, y)) {
      if (line && (dentro(x + 1, y) || dentro(x - 1, y) || dentro(x, y + 1) || dentro(x, y - 1))) px(x, y, line);
      continue;
    }
    const bordoL = !dentro(x - 1, y) || !dentro(x - 2, y), bordoR = !dentro(x + 1, y);
    px(x, y, bordoL ? light : bordoR ? dark : fill);
  }
  return dentro;
}
/* QUATTRO CACTUS, e non sono quattro saguari. La colonna nuda, senza braccia, era solo un
   cilindro verde: brutto e ambiguo (segnalato). Due sono saguari con le braccia, gli altri due
   sono piante di forma completamente diversa — il fico d'India a pale e il cactus a barile —
   così nelle Dune non si vede mai la stessa sagoma due volte di fila. */
const CACTI = [
  { tipo: 'saguaro', h: 28, bracci: [[1, 19, 9], [-1, 14, 8]] },      // due braccia sfalsate
  { tipo: 'saguaro', h: 30, bracci: [[-1, 21, 12]] },                  // alto con un braccio lungo
  { tipo: 'pale' },                                                    // fico d'India: pale piatte
  { tipo: 'barile' },                                                  // barile basso a costole, col fiore
];
export function drawCactus(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 30; shadow(cx, base, 9);
  const flip = vhash(tx, ty, 84) < 0.5 ? 1 : -1, W = 32, H = 32;
  const MXC = x => (flip > 0 ? x : 31 - x);
  const bp = CACTI[Math.floor(vhash(tx, ty, 174) * CACTI.length) % CACTI.length];
  const V = '#4a9a55', VL = '#6fbf78', VD = '#357a42';
  let dentro;
  if (bp.tipo === 'pale') {
    /* FICO D'INDIA: pale ovali piatte, una che spunta dall'altra. Si riconosce a colpo d'occhio
       e non somiglia a nessun'altra cosa del gioco. */
    const pale = [['ell', MXC(cx - 1), base - 7, 6, 7], ['ell', MXC(cx + 7), base - 13, 5, 6], ['ell', MXC(cx - 8), base - 12, 4, 5], ['ell', MXC(cx + 2), base - 19, 4, 5]];
    dentro = paintMask(roundMask(pale, W, H), V, VL, VD, W, H);
    for (const [, pcx, pcy] of pale) for (let i = 0; i < 5; i++) {      // areole a righe sulle pale
      const ax = pcx - 2 + (i % 3) * 2, ay = pcy - 3 + Math.floor(i / 3) * 4;
      if (dentro(ax, ay)) px(ax, ay, '#e0f0d8');
    }
    if (vhash(tx, ty, 175) < 0.5) { rect(MXC(cx + 2) - 1, base - 25, 3, 3, '#efc23a'); px(MXC(cx + 2), base - 26, '#fbe79a');   /* giallo del fiore, NON quello del segnalino di meta */ }   // fiore giallo
  } else if (bp.tipo === 'barile') {
    /* BARILE: tozzo e tondo, costole verticali e la corona di fiori sopra */
    dentro = paintMask(roundMask([['ell', MXC(cx), base - 9, 9, 10]], W, H), V, VL, VD, W, H);
    for (const ox of [-6, -3, 0, 3, 6]) for (let y = base - 18; y < base - 1; y++) if (dentro(MXC(cx + ox), y)) px(MXC(cx + ox), y, '#3d8a48');
    for (let i = 0; i < 7; i++) { const x = MXC(cx - 6 + i * 2), y = base - 18 + (i % 2); if (dentro(x, y + 1)) px(x, y, '#e0f0d8'); }
    for (const ox of [-4, 0, 4]) if (vhash(tx + ox, ty, 175) < 0.7) { rect(MXC(cx + ox) - 1, base - 21, 3, 2, '#e8607a'); px(MXC(cx + ox), base - 22, '#f6a0b4'); }
  } else {
    /* il braccio finisce con una PUNTA TONDA: con il solo rettangolo la cima usciva squadrata
       e sembrava tagliata di netto (segnalato con foto) */
    const braccio = (dir, y0, alt) => ([
      [dir < 0 ? cx - 12 : cx + 4, base - y0, 8, 6, 3],                 // spalla
      [dir < 0 ? cx - 13 : cx + 9, base - y0 - alt, 5, alt + 6, 2],     // braccio che sale
      ['disc', (dir < 0 ? cx - 11 : cx + 11), base - y0 - alt + 2, 2],  // punta arrotondata
    ]);
    let shapes = [[cx - 5, base - bp.h, 10, bp.h, 5]];                  // fusto
    for (const [dir, y0, alt] of bp.bracci) shapes = shapes.concat(braccio(dir, y0, alt));
    if (flip < 0) shapes = shapes.map(sh => sh[0] === 'disc' ? ['disc', W - 1 - sh[1], sh[2], sh[3]] : [W - (sh[0] + sh[2]), sh[1], sh[2], sh[3], sh[4]]);
    dentro = paintMask(roundMask(shapes, W, H), V, VL, VD, W, H);
    for (const cxr of [cx - 2, cx + 1]) for (let y = base - bp.h + 3; y < base - 3; y++) if (dentro(cxr, y)) px(cxr, y, '#3d8a48');   // coste
    for (let i = 0; i < 6; i++) { const x = cx - 4 + ((i * 7) % 9), y = base - bp.h + 4 + i * 4; if (dentro(x, y)) px(x, y, '#e0f0d8'); }   // spine
    if (vhash(tx, ty, 175) < 0.4) { rect(cx - 2, base - bp.h - 3, 4, 3, '#e08aa8'); px(cx - 1, base - bp.h - 4, '#f6c0d4'); }
  }
  erbetta(cx - 10, cx + 9, base + 1, tx, ty, '#8a9a5a', '#6f7f45');
  ctx.restore();
}
/* ROCCE DELLE DUNE — quattro guglie d'arenaria scolpite dal vento, da spaccare col piccone.
   Prima qui c'erano delle OSSA che affioravano, e sbagliavano due volte: le ossa sono quello
   che si SCAVA (il premio), non l'ostacolo, e messe in piedi sembravano fossili già dissotterrati
   (segnalato). La regola del gioco è una sola e vale per tutti i biomi: i fossili vengono dalla
   TERRA, dalle ROCCE e dalle PIANTE — nelle Dune la pianta è il saguaro, la roccia è questa.
   Ognuna ha la sua sagoma e si può specchiare: otto guglie in giro per la sabbia. */
export function drawSandspire(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 30; shadow(cx, base, 12);
  const flip = vhash(tx, ty, 176) < 0.5 ? 1 : -1, X = x => (flip > 0 ? x : 31 - x);
  const v = Math.floor(vhash(tx, ty, 177) * 4) % 4;
  const R = '#c98f52', RL = '#e8b87c', RD = '#8a5a30', LN2 = '#5e3a1e';
  const m = new Uint8Array(32 * 32);
  const set = (x, y) => { if (x >= 0 && y >= 0 && x < 32 && y < 32) m[y * 32 + x] = 1; };
  const disco = (cxd, cyd, rx, ry) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) set(cxd + x, cyd + y); };
  const blocco = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y); };
  /* LARGHE, NON COLONNE. Il primo giro le aveva fatte alte e sottili e sembravano tutt'altro
     (segnalato due volte). Una roccia del deserto si legge dal MASSICCIO: un arco scavato dal
     vento, una mesa a strati, una pila di massi, una lama piegata. */
  let alt = 18;
  if (v === 0) {                                             // ARCO scavato dal vento
    alt = 20;
    blocco(X(4), base - 20, 6, 20); blocco(X(21), base - 20, 6, 20);
    for (let x = 4; x <= 27; x++) { const y = base - 20 - Math.round(Math.sin((x - 4) / 23 * Math.PI) * 3); for (let k = 0; k < 6; k++) set(X(x), y + k); }
  } else if (v === 1) {                                      // MESA a strati: larga e piatta
    alt = 15;
    for (let y = 0; y < 15; y++) { const w = 12 - Math.round(y / 5); for (let x = -w; x <= w; x++) set(X(cx + x), base - y - 1); }
    disco(X(cx), base - 16, 9, 3);
  } else if (v === 2) {                                      // PILA DI MASSI, uno sull'altro
    alt = 19;
    disco(X(cx), base - 5, 10, 5); disco(X(cx + 2), base - 13, 7, 5); disco(X(cx - 2), base - 19, 4, 4);
  } else {                                                   // LAMA piegata, larga alla base
    alt = 18;
    for (let y = 0; y < 18; y++) {
      const w = Math.max(3, 10 - Math.round(y * 0.45)), off = Math.round(Math.sin(y / 10) * 4);
      for (let x = -w; x <= w; x++) set(X(cx + x + off), base - y - 1);
    }
  }
  const dentro = paintMask(m, R, RL, RD, 32, 32, LN2);
  /* STRATI di sedimento: righe orizzontali chiare e scure, la firma dell'arenaria */
  for (let y = 2; y < alt; y += 3) {
    const c = (y % 6) ? '#d9a468' : '#b57a45';
    for (let x = 1; x < 31; x++) if (dentro(x, base - y) && dentro(x - 1, base - y) && dentro(x + 1, base - y)) px(x, base - y, c);
  }
  /* qualche buco scavato dal vento */
  for (let k = 0; k < 3; k++) {
    const hx = X(cx - 6 + k * 6), hy = base - 5 - k * 4;
    if (vhash(tx + k, ty, 178) < 0.45 && dentro(hx, hy) && dentro(hx + 1, hy) && dentro(hx - 1, hy)) { px(hx, hy, '#6e4326'); px(hx + 1, hy, '#8a5a30'); px(hx, hy + 1, '#8a5a30'); }
  }
  ellipseF(cx, base - 1, 13, 3, '#d8c9a0'); ellipseF(cx - 3, base - 2, 7, 1, '#e8dcb8');
  ctx.restore();
}
/* QUATTRO ALBERI SECCHI DIVERSI, scritti a mano (la regola del progetto per "N cose tutte
   diverse": ricette curate, non parametri che ricolorano la stessa sagoma). Ognuno ha il suo
   tronco e i suoi rami — uno storto a sinistra, uno con la forca alta, uno mozzato con un solo
   braccio, uno basso e panciuto — e ognuno può essere specchiato: otto sagome in giro per il
   bosco invece di un copia-incolla. Coordinate relative alla base (cx = 16, base = 30).
   [x0, y0, x1, y1, r0, r1] con y in negativo verso l'alto. */
const DEAD_TREES = [
  [ // 1. alto e dritto, forca a Y in cima
    [0, 0, 1, -19, 3, 2], [1, -13, -8, -23, 2, 1], [1, -14, 9, -24, 2, 1], [1, -19, 2, -26, 2, 1],
  ],
  [ // 2. piegato dal vento: un ramo lungo e basso, uno spezzato in cima
    [0, 0, -3, -11, 3, 2], [-3, -11, 2, -22, 2, 2], [-2, -14, -12, -12, 2, 1], [2, -18, 10, -22, 2, 1],
  ],
  [ // 3. spezzato: tronco tozzo col cimo rotto e un braccio solo
    [0, 0, 1, -14, 4, 3], [1, -14, 3, -17, 3, 2], [1, -11, 11, -19, 2, 1], [9, -17, 12, -24, 1, 1],
  ],
  [ // 4. due braccia opposte, tronco sottile
    [0, 0, 0, -21, 3, 1], [0, -12, -11, -18, 2, 1], [0, -16, 10, -24, 2, 1],
  ],
];
export function drawDeadtree(sx, sy, tx = 0, ty = 0) {
  /* ALBERO SECCO: tronco e rami sono UN volume solo — capsule che si assottigliano salendo,
     con un contorno unico che segue la sagoma. Prima erano segmenti dritti disegnati uno sopra
     l'altro: si vedevano i blocchi attaccati e i gomiti avevano il bordo doppio (segnalato). */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 30; shadow(cx, base, 10);
  const f = vhash(tx, ty, 89) < 0.5 ? 1 : -1;
  const bp = DEAD_TREES[Math.floor(vhash(tx, ty, 173) * DEAD_TREES.length) % DEAD_TREES.length];
  const ramo = (x0, y0, x1, y1, r0, r1) => {                 // ramo che si assottiglia: tre capsule
    const out = [];
    for (let k = 0; k < 3; k++) {
      const a = k / 3, b = (k + 1) / 3;
      out.push(['cap', Math.round(x0 + (x1 - x0) * a), Math.round(y0 + (y1 - y0) * a),
        Math.round(x0 + (x1 - x0) * b), Math.round(y0 + (y1 - y0) * b), Math.max(1, Math.round(r0 + (r1 - r0) * b))]);
    }
    return out;
  };
  const shapes = [['ell', cx, base - 2, 6, 3]];               // il piede allargato
  for (const [x0, y0, x1, y1, r0, r1] of bp) shapes.push(...ramo(cx + f * x0, base + y0, cx + f * x1, base + y1, r0, r1));
  const dentro = paintMask(roundMask(shapes), '#6e5138', '#8a6a48', '#4a3520');
  for (let y = base - 18; y < base - 2; y += 4) for (let x = cx - 5; x <= cx + 5; x++)   // venature della corteccia
    if (dentro(x, y) && dentro(x - 1, y) && dentro(x + 1, y)) px(x, y, '#5c4229');
  erbetta(cx - 8, cx + 8, base + 1, tx, ty);
  if (dentro(cx, base - 9)) { px(cx, base - 9, '#2a1e12'); px(cx - 1, base - 8, '#2a1e12'); px(cx, base - 8, '#2a1e12'); px(cx + 1, base - 9, '#3a2a18'); }   // nodo cavo
  ctx.restore();
}
/* FUNGO — la scenografia è un fungo bruno piccolo e spento (non si raccoglie mai); quello
   maturo è grosso, rosso acceso, a pois bianchi, su gambo chiaro. Differenza leggibile a
   colpo d'occhio: nessuno prova a raccogliere quelli marroni. */
export function drawMushroom(sx, sy, time, tx, ty, ripe) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const bx = sx + 16, by = sy + 22;
  if (ripe) {
    /* CUPOLA ROSSA e gambo, nella stessa sagoma tonda del resto del mondo */
    const mr = new Uint8Array(32 * 32), setr = (x, y) => { const lx = x - sx, ly = y - sy; if (lx >= 0 && ly >= 0 && lx < 32 && ly < 32) mr[ly * 32 + lx] = 1; };
    for (let y = -5; y <= 4; y++) for (let x = -3; x <= 3; x++) if (Math.abs(x) < 3 || Math.abs(y) < 4) setr(bx + x, by - 2 + y);      // gambo
    for (let y = -8; y <= 0; y++) for (let x = -9; x <= 9; x++) if ((x * x) / 81 + (y * y) / 64 <= 1) setr(bx + x, by - 8 + y);        // cappello
    paintMask(mr, '#d8443c', '#e05a50', '#a5302c');
    for (let y = -5; y <= 3; y++) for (let x = -2; x <= 2; x++) if (Math.abs(x) < 2) px(bx + x, by - 2 + y, x < 0 ? '#f2e6c8' : '#d9c9a4');   // il gambo è chiaro
    rect(bx - 7, by - 8, 15, 1, '#a5302c');                                     // il bordo sotto il cappello
    for (const [dx, dy] of [[-4, -12], [3, -10], [0, -14], [6, -9]]) rect(bx + dx, by + dy, 2, 2, '#fdf3e0');   // i puntini
    ctx.restore(); return;
  }
  /* FUNGO DI SCENA: piccolo, spento e mezzo nascosto nell'erba — non si raccoglie e si deve
     vedere. Quello buono è rosso, grosso e luccica. */
  const mm = new Uint8Array(32 * 32), setm = (x, y) => { const lx = x - sx, ly = y - sy; if (lx >= 0 && ly >= 0 && lx < 32 && ly < 32) mm[ly * 32 + lx] = 1; };
  for (let y = -2; y <= 3; y++) for (let x = -1; x <= 1; x++) setm(bx + x, by - 1 + y);                                   // gambo
  for (let y = -4; y <= 0; y++) for (let x = -5; x <= 5; x++) if ((x * x) / 25 + (y * y) / 16 <= 1) setm(bx + x, by - 4 + y);   // cupola
  paintMask(mm, '#7a6448', '#8f7a5a', '#5f4d36', 32, 32, null);   // paesaggio: niente contorno
  rect(bx - 4, by - 4, 9, 1, '#5f4d36');                                           // il bordo sotto il cappello
  erbetta(bx - 7, bx + 8, by + 3, tx, ty);
  ctx.restore();
}
export function drawStump(sx, sy, tx = 0, ty = 0) {
  /* CEPPO: faccia tagliata con gli anelli, corteccia, radici */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 27; shadow(cx, base, 11);
  /* corpo e radici in una sagoma sola, con gli angoli smussati (stile del saguaro) */
  paintMask(roundMask([[cx - 9, base - 12, 18, 12, 4], [cx - 13, base - 5, 6, 5, 2], [cx + 7, base - 5, 6, 5, 2]]),
    '#7a5230', '#9a6a40', '#5c3d22', 32, 32, null);   // paesaggio: niente contorno
  for (let i = -6; i < 7; i += 4) rect(cx + i, base - 8, 1, 7, '#5c3d22');       // solchi della corteccia
  ellipseF(cx, base - 12, 10, 4, '#5c3d22'); ellipseF(cx, base - 12, 9, 3, '#d8b582');
  ellipseF(cx, base - 12, 6, 2, '#c49a63'); ellipseF(cx, base - 12, 3, 1, '#d8b582'); px(cx, base - 12, '#8a5f38');
  if (vhash(tx, ty, 91) < 0.5) { rect(cx + 4, base - 8, 4, 3, '#6f8a52'); }   // muschio sul taglio
  erbetta(cx - 13, cx + 12, base + 1, tx, ty);
  ctx.restore();
}
export function drawRedspire(sx, sy, tx = 0, ty = 0) {
  /* CAMINO DI FATA delle Terre Rosse: colonna d'arenaria a strati con il cappello di roccia */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 30; shadow(cx, base, 11);
  /* il profilo è una curva, non una scala di rettangoli: la maschera si costruisce riga per
     riga e il contorno la seghe */
  const m = new Uint8Array(32 * 32);
  /* la sagoma deve stare DENTRO la casella con un pixel di margine: il cappello arrivava
     sopra il bordo e lì il contorno non ci stava — la guglia risultava tagliata in cima e
     senza linea proprio dove si guarda per prima cosa */
  for (let y = 0; y < 24; y++) {
    const w = 6 + Math.round(Math.sin(y / 4.2) * 1.6) + (y < 5 ? 4 - y : 0), yy = base - y - 1;
    for (let x = cx - w; x <= cx + w; x++) if (x >= 0 && x < 32 && yy >= 0 && yy < 32) m[yy * 32 + x] = 1;
  }
  for (let y = -4; y <= 3; y++) for (let x = -9; x <= 9; x++) {            // il cappello di roccia, tondo
    const yy = base - 25 + y; if ((x * x) / 81 + (y * y) / 16 > 1 || yy < 1 || yy > 31) continue;
    m[yy * 32 + cx + x] = 1;
  }
  const dentroSp = paintMask(m, '#c06a48', '#e0a37e', '#8a3f2e');
  /* strati e cappello si fermano UN PIXEL PRIMA del bordo: dipinti fin sopra il profilo
     cancellavano il contorno, e una guglia picconabile senza contorno sembra paesaggio */
  const internoSp = (x, y) => dentroSp(x, y) && dentroSp(x - 1, y) && dentroSp(x + 1, y) && dentroSp(x, y - 1) && dentroSp(x, y + 1);
  for (let y = 0; y < 23; y += 5) { const c = (y / 5) % 2 ? '#cc7854' : '#b05e3e';   // strati d'arenaria, chiari e scuri
    for (let x = cx - 8; x <= cx + 8; x++) if (internoSp(x, base - y - 1)) px(x, base - y - 1, c); }
  for (let y = -3; y <= 2; y++) for (let x = -8; x <= 8; x++) if (internoSp(cx + x, base - 25 + y) && (x * x) / 64 + (y * y) / 9 <= 1) px(cx + x, base - 25 + y, y < -1 ? '#a8887a' : '#8a6a58');
  if (vhash(tx, ty, 92) < 0.5) rect(cx - 2, base - 14, 3, 3, '#6e2f1e');
  ctx.restore();
}
export function drawOrecrystal(sx, sy, tx = 0, ty = 0) {
  /* CRISTALLI di minerale su un sasso: prismi sfaccettati con la punta */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 27; shadow(cx, base, 10);
  const LNO = '#2d2a34';                                   // viola-grigio scuro: il tono del cristallo, non il nero
  ellipseF(cx, base - 3, 12, 4, LNO); ellipseF(cx, base - 4, 11, 3, '#6f685c');
  const prism = (x, h, w, c, lean) => {
    for (let k = 0; k < h; k++) { const u = k / h, ww = u > 0.75 ? Math.max(1, Math.round(w * (1 - u) * 4)) : w, xx = x + Math.round(lean * k); rect(xx - (ww >> 1) - 1, base - 4 - k, ww + 2, 1, shade8(c, 0.32)); rect(xx - (ww >> 1), base - 4 - k, ww, 1, c); rect(xx - (ww >> 1), base - 4 - k, Math.max(1, ww >> 2), 1, '#eaf6fa'); rect(xx + (ww >> 1) - 1, base - 4 - k, 1, 1, shade8(c, 0.65)); }
  };
  prism(cx - 7, 12, 6, '#8d7ba0', -0.2); prism(cx + 6, 10, 6, '#8d7ba0', 0.25); prism(cx, 19, 8, '#9ad0c8', 0.05);
  if (vhash(tx, ty, 94) < 0.5) { rect(cx + 1, base - 16, 1, 3, '#ffffff'); rect(cx, base - 15, 3, 1, '#ffffff'); }
  ctx.restore();
}
/* CANNE — quelle di scenario sono steli verdi nudi; il giunco maturo ha il pennacchio bruno
   gonfio in cima (ed è l'unico che si raccoglie). */
export function drawReed(sx, sy, time, tx, ty, ripe) {
  /* CANNE: steli di altezze diverse che ondeggiano; il giunco MATURO ha la tifa bruna in cima */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 29;
  const sw2 = Math.sin(time / 800 + tx * 2.1 + ty);
  [[-9, 17], [-4, 22], [2, 19], [7, 24], [11, 15]].forEach(([ox, h], i) => {
    for (let k = 0; k < h; k++) { const x = cx + ox + Math.round(sw2 * 2 * (k / h) * (i % 2 ? 1 : 0.7)); rect(x, base - k, 2, 1, k > h - 5 ? '#6f8a4a' : '#4a6340'); px(x, base - k, k % 5 === 0 ? '#86a86c' : '#5a7a4a'); }
    if (i === 1 || i === 3) { const x = cx + ox + Math.round(sw2 * 2); rect(x - 3, base - h + 6, 3, 1, '#4a6340'); }
  });
  if (ripe) {
    const x = cx + 2 + Math.round(sw2 * 2);
    rect(x - 2, base - 31, 6, 11, shade8('#8a5f38', 0.34)); rect(x - 1, base - 30, 4, 9, '#8a5f38'); rect(x - 1, base - 30, 1, 9, '#a97a4c'); rect(x, base - 34, 2, 4, '#6f8a4a');
  }
  ctx.restore();
}
/* QUATTRO GRUPPI DI SCHEGGE DI GHIACCIO, scritti a mano. Prima era sempre lo stesso gruppo —
   una lama alta in mezzo e due basse ai lati — e in una landa gelata se ne vedono venti di
   fila: sembrava un timbro (segnalato). Ogni ricetta è un elenco di schegge
   [x, altezza, larghezza, inclinazione], e si può specchiare. */
const ICE = [
  [[-8, 12, 6, -0.25], [8, 14, 6, 0.3], [0, 22, 8, 0]],                        // gruppo classico: la lama alta in mezzo
  [[2, 26, 7, 0.18], [-7, 9, 5, -0.3], [-2, 6, 4, 0]],                          // una lama sola, altissima e storta
  [[-10, 8, 4, -0.4], [-4, 12, 5, -0.15], [2, 11, 5, 0.1], [8, 9, 4, 0.35], [13, 6, 3, 0.5]],   // ventaglio di schegge basse
  [[-5, 16, 9, 0], [6, 10, 7, 0.12]],                                           // due blocchi tozzi, spaccati
];
export function drawIcecrystal(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 27; shadow(cx, base, 10);
  const flip = vhash(tx, ty, 96) < 0.5 ? 1 : -1;
  const bp = ICE[Math.floor(vhash(tx, ty, 97) * ICE.length) % ICE.length];
  /* la brina alla base: c'è sempre, ed è quello che tiene insieme il gruppo */
  ellipseF(cx, base - 1, 13, 4, '#2c5568'); ellipseF(cx, base - 1, 12, 3, '#eef7fa'); rect(cx - 8, base - 2, 16, 1, '#ffffff');
  const scheggia = (x, h, w, lean) => {
    for (let k = 0; k < h; k++) {
      const u = k / h, ww = u > 0.68 ? Math.max(1, Math.round(w * (1 - u) * 3.1)) : w;
      const xx = Math.round(x + lean * k);
      rect(xx - (ww >> 1) - 1, base - 2 - k, ww + 2, 1, '#3f7890');            // contorno: si piccona
      rect(xx - (ww >> 1), base - 2 - k, ww >> 1, 1, '#e8f6fb');               // faccia in luce
      rect(xx, base - 2 - k, ww - (ww >> 1), 1, '#9fd4e6');                    // faccia in ombra
      if (k === h - 1) px(xx, base - 2 - k, '#ffffff');                        // la punta brilla
    }
  };
  /* dalla più bassa alla più alta: quelle davanti coprono, e il gruppo prende profondità */
  const ordinate = bp.slice().sort((p1, p2) => p1[1] - p2[1]);
  for (const [ox, h, w, lean] of ordinate) scheggia(cx + flip * ox, h, w, lean * flip);
  if (vhash(tx, ty, 98) < 0.5) { const [ox, h] = ordinate[ordinate.length - 1]; rect(cx + flip * ox, base - h, 1, 4, '#ffffff'); rect(cx + flip * ox - 2, base - h + 2, 5, 1, '#ffffff'); }
  ctx.restore();
}
export function drawHay(sx, sy, tx = 0, ty = 0) {
  /* ROTOBALLA di fieno: il cerchio della spirale sul fronte, i fili che spuntano */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 27; shadow(cx, base, 12);
  paintMask(roundMask([[cx - 12, base - 18, 21, 18, 7]]), '#c3a03a', '#d9bb62', '#a8862a', 32, 32, null);   // paesaggio: senza contorno
  for (let i = 3; i < 19; i += 3) rect(cx - 12 + i, base - 14, 1, 11, '#b08a20');   // i fili stretti in tondo
  disc(cx + 8, base - 9, 9, '#a8862a'); disc(cx + 8, base - 9, 8, '#d9bb62');   // la spirale sul fronte, senza contorno nero
  for (let q = 0; q < 40; q++) { const a = q * 0.45, r = 7 - q * 0.17; if (r < 1) break; px(cx + 8 + Math.round(Math.cos(a) * r), base - 9 + Math.round(Math.sin(a) * r), '#b08a20'); }
  for (let j = 0; j < 5; j++) { const fx = cx - 12 + Math.floor(vhash(tx, ty, 102 + j) * 28), fy = base - 18 - Math.floor(vhash(tx, ty, 103 + j) * 3); rect(fx, fy, 1, 3, '#f0d888'); }
  erbetta(cx - 14, cx + 12, base + 1, tx, ty);   // sta nel prato: non è roba da raccogliere
  ctx.restore();
}

/* fumetto di dialogo. sx,sy = coordinate SCHERMO (game-px) di chi parla (testa).
   Disegna in coordinate schermo (reset del transform): così il clamp è corretto SEMPRE,
   indipendente dalle traslazioni della scena (centratura stanza / camera). Il baloon sta
   SOPRA chi parla, resta DENTRO lo schermo e MAI sotto la HUD in alto (topSafe da view.K). */
export function drawSayBalloon(sx, sy, text) {
  ctx.save();
  ctx.setTransform(view.PX, 0, 0, view.PX, 0, 0); // schermo puro
  ctx.font = '600 6px ui-monospace, Menlo, monospace';
  ctx.textBaseline = 'top';
  const measure = s => { const m = ctx.measureText && ctx.measureText(s); return (m && m.width) || s.length * 3.6; };
  const M = 6, maxW = Math.min(view.W - M * 2, 150); // largo, ma sempre dentro lo schermo
  const words = String(text).split(' '), lines = []; let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (line && measure(test) > maxW) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line);
  let maxw = 0; for (const l of lines) maxw = Math.max(maxw, measure(l));
  const padX = 5, padY = 4, lh = 7, bw = Math.ceil(maxw) + padX * 2, bh = lines.length * lh + padY * 2;
  let bx = Math.round(sx - bw / 2); bx = Math.max(M, Math.min(view.W - bw - M, bx));
  const topSafe = Math.ceil(56 / view.K) + 4; // altezza HUD (~56px schermo) in game-px
  let by = Math.round(sy - bh - 6);            // sopra la testa
  by = Math.max(topSafe, Math.min(view.H - bh - M, by)); // dentro lo schermo, sotto la HUD
  const tcx = Math.max(bx + 4, Math.min(bx + bw - 4, Math.round(sx)));
  ctx.fillStyle = '#241a10'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);   // bordo
  ctx.fillStyle = '#f6efdd'; ctx.fillRect(bx, by, bw, bh);                    // carta
  ctx.fillStyle = shade8('#f6efdd', 0.34); ctx.fillRect(tcx - 2, by + bh, 4, 3); ctx.fillStyle = '#f6efdd'; ctx.fillRect(tcx - 1, by + bh, 2, 2); // codina verso il basso
  ctx.fillStyle = '#2a2016';
  lines.forEach((l, i) => ctx.fillText(l, bx + padX, by + padY + i * lh));
  ctx.restore();
}

/* specchiare una sagoma: per un PUNTO basta 31-x, ma per un rettangolo va ribaltato tutto
   l'ingombro (x0 → 32-(x0+w)) — specchiando solo il lato sinistro il rettangolo scivolava
   fuori dalla casella e metà disegno spariva. */
const MX = (flip, x) => (flip > 0 ? x : 31 - x);
const MR = (flip, x0, w) => (flip > 0 ? x0 : 32 - (x0 + w));

/* ============================ OSTACOLI DI PAESAGGIO ============================
   Nei Prati c'era UNA cosa sola a rompere il prato — la rotoballa — e ripetuta ogni pochi
   passi faceva sembrare il mondo un timbro (segnalato con foto: "è tutto troppo monotono").
   Qui ci sono sei ingombri nuovi, uno o due per bioma, tutti PAESAGGIO: solidi, ma senza
   contorno, perché non ci si fa niente — la regola del gioco è che la lineart significa
   "ci puoi fare qualcosa". Ognuno ha due o tre sagome scritte a mano e può essere
   specchiato, così in giro non si vede il copia-incolla. */

/* TRONCO CADUTO: un fusto lungo a terra, la testa tagliata con gli anelli da una parte e i
   monconi dei rami dall'altra. Boschi e Palude. */
export function drawLogfall(sx, sy, tx = 0, ty = 0, palude = false) {
  ctx.save(); ctx.translate(sx, sy);
  const base = 24, flip = vhash(tx, ty, 190) < 0.5 ? 1 : -1;
  const v = Math.floor(vhash(tx, ty, 191) * 3) % 3;
  const inc = [2, -1, 0][v];                                   // quanto è inclinato
  const X = x => MX(flip, x);
  shadow(16, base + 5, 13);
  const y0 = base - 6 + inc, y1 = base - 6 - inc;
  const corpo = [['cap', X(3), y0, X(28), y1, 5]];
  if (v === 2) corpo.push(['cap', X(20), y1 + 1, X(26), y1 - 6, 2]);   // un moncone che si alza
  const fill = palude ? '#5e5a42' : '#7a5230';
  const dentro = paintMask(roundMask(corpo), fill, shade8(fill, 1.28), shade8(fill, 0.68), 32, 32, null);
  /* corteccia: solchi lungo il fusto, non a caso */
  for (let k = 0; k < 7; k++) {
    const x = X(6 + k * 3), y = Math.round(y0 + (y1 - y0) * (k / 7));
    for (let j = 1; j <= 4; j++) if (dentro(x, y + j)) px(x, y + j, shade8(fill, 0.78));   // il solco si ferma DENTRO il tronco
  }
  /* la testa tagliata: anelli concentrici, sempre dal lato del piede */
  const cxT = X(4), cyT = y0;
  ellipseF(cxT, cyT, 3, 5, shade8(fill, 0.8));
  ellipseF(cxT, cyT, 2, 4, palude ? '#8f8a66' : '#c49a63');
  ellipseF(cxT, cyT, 1, 2, palude ? '#a9a37c' : '#d8b582');
  /* muschio o alghe sopra, a chiazze */
  const verde = palude ? '#4f7a4a' : '#6f8a52';
  for (let k = 0; k < 4; k++) if (vhash(tx, ty, 192 + k) < 0.7) {
    const x = X(8 + k * 5), y = Math.round(y0 + (y1 - y0) * ((k + 1) / 6)) - 4;
    if (dentro(x, y + 1)) { rect(x, y, 4, 2, verde); px(x + 1, y - 1, shade8(verde, 1.2)); }
  }
  if (palude) { for (let k = 0; k < 3; k++) rect(X(9 + k * 7), base + 1, 3, 1, '#4a6340'); }   // acqua bassa attorno
  else erbetta(3, 28, base + 2, tx, ty);
  ctx.restore();
}
/* MASSO PIATTO COL MUSCHIO: una lastra bassa e larga, il cappello di muschio sopra e
   qualche sasso appoggiato. Prati e Boschi. */
export function drawMossrock(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy);
  const base = 26, flip = vhash(tx, ty, 194) < 0.5 ? 1 : -1;
  const v = Math.floor(vhash(tx, ty, 195) * 3) % 3;
  const X = x => MX(flip, x);
  shadow(16, base + 3, 12);
  const sagome = [
    [['ell', X(15), base - 6, 12, 6], ['ell', X(23), base - 4, 5, 3]],
    [['ell', X(16), base - 7, 11, 7], ['ell', X(8), base - 3, 5, 3]],
    [[MR(flip, 4, 22), base - 12, 22, 12, 6], ['ell', X(24), base - 5, 4, 3]],
  ];
  const dentro = paintMask(roundMask(sagome[v]), '#8a8578', '#a8a396', '#63604f', 32, 32, null);
  /* venature della pietra: righe corte che seguono la lastra */
  for (let k = 0; k < 5; k++) { const x = X(7 + k * 4), y = base - 8 + (k % 2); if (dentro(x, y)) rect(x, y, 3, 1, '#6f6b5c'); }
  /* MUSCHIO: solo sul dorso, dove batte la luce */
  /* MUSCHIO sul dorso: una fascia continua che segue il profilo (prima erano tre puntini
     e il masso restava un sasso grigio qualunque) */
  for (let x = 2; x < 30; x++) {
    let y = base - 14;
    while (y < base && !dentro(X(x), y)) y++;                   // trova il dorso in questa colonna
    if (y >= base) continue;
    const sp = 2 + Math.floor(vhash(tx + x, ty, 196) * 3);      // spessore della zolla
    for (let j = 0; j < sp; j++) if (dentro(X(x), y + j)) px(X(x), y + j, j === 0 ? '#6f9e52' : '#4f7f3c');
    if (vhash(tx + x, ty, 197) < 0.22) px(X(x), y - 1, '#86b466');   // ciuffetto che sporge
  }
  erbetta(3, 28, base + 1, tx, ty);
  ctx.restore();
}
/* TUMULO D'ARGILLA SCREPOLATA: la terra secca delle Terre Rosse che si alza a gobba e si
   spacca. Nessun cristallo, nessuna guglia: solo terra. */
export function drawClaymound(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy);
  const base = 27, flip = vhash(tx, ty, 200) < 0.5 ? 1 : -1;
  const v = Math.floor(vhash(tx, ty, 201) * 3) % 3;
  const X = x => MX(flip, x);
  shadow(16, base + 3, 12);
  const sagome = [
    [['ell', X(14), base - 7, 12, 8], ['ell', X(24), base - 4, 6, 4]],
    [['ell', X(16), base - 9, 10, 9]],
    [['ell', X(11), base - 5, 8, 5], ['ell', X(20), base - 8, 9, 7]],
  ];
  const dentro = paintMask(roundMask(sagome[v]), '#a8613f', '#bb7a53', '#8d5136', 32, 32, null);
  /* CREPE: scendono dal dorso come acqua, mai a righello */
  for (let k = 0; k < 3; k++) {
    let x = X(9 + k * 7), y = base - 13 + k;
    for (let s = 0; s < 9; s++) {
      if (dentro(x, y)) px(x, y, '#6a3823');
      x += vhash(tx + s, ty + k, 202) < 0.5 ? 1 : -1; y++;
    }
  }
  for (let k = 0; k < 5; k++) { const x = X(6 + k * 5); if (dentro(x, base - 3)) rect(x, base - 3, 2, 1, '#8a4a30'); }
  ctx.restore();
}
/* TUMULO DI TORBA: la palude che si gonfia in un'isoletta, con i ciuffi d'erba alta sopra e
   l'acqua scura che la circonda. */
export function drawPeatmound(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy);
  const base = 26, flip = vhash(tx, ty, 203) < 0.5 ? 1 : -1;
  const v = Math.floor(vhash(tx, ty, 204) * 3) % 3;
  const X = x => MX(flip, x);
  ellipseF(16, base + 1, 14, 4, 'rgba(30,46,34,.35)');                      // acqua scura attorno
  const sagome = [
    [['ell', X(15), base - 6, 12, 7]],
    [['ell', X(13), base - 5, 9, 5], ['ell', X(22), base - 7, 7, 6]],
    [[MR(flip, 5, 21), base - 12, 21, 12, 7]],
  ];
  const dentro = paintMask(roundMask(sagome[v]), '#4e4634', '#5d553f', '#3e392a', 32, 32, null);
  for (let k = 0; k < 6; k++) { const x = X(6 + k * 4), y = base - 5 + (k % 2); if (dentro(x, y)) rect(x, y, 3, 1, '#3d3826'); }   // strati di torba
  /* CIUFFI d'erba alta sul dorso: la cosa che si vede da lontano */
  for (let k = 0; k < 9; k++) {
    const x = X(5 + k * 3);
    let y = base - 14;
    while (y < base && !dentro(x, y)) y++;
    if (y >= base) continue;
    const h = 7 + Math.floor(vhash(tx + k, ty, 205) * 7);
    const piega = k % 2 ? 1 : -1;
    for (let j = 0; j < h; j++) {
      const xx = x + (j > h - 4 ? piega : 0) + (j > h - 2 ? piega : 0);
      px(xx, y - j, j > h - 4 ? '#8aa86c' : j > h - 8 ? '#6d8f56' : '#5f7a4a');
    }
  }
  ctx.restore();
}
