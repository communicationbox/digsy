/* OGGETTI DEL MONDO — alberi, sassi, fiori, funghi, oggetti a terra, decorazioni di bioma.
   Estratto da render.js: qui sta il "cosa c'è per terra", non il "come si compone la scena".

   REGOLA che vale per tutto questo file: ciò che si RACCOGLIE ha ombra di contatto + stellina
   e un disegno diverso da quello scenografico. Ciò che è solo decorazione è piatto e spento.
   Le fasi delle animazioni vengono dal TEMPO o dalle coordinate TILE, mai da sx/sy. */
import { TS, spColor } from './data.js';
import { vhash } from './noise.js';
import { px, rect, shadow, shade8, snap } from './brush.js';
import { ctx, view } from './screen.js';
import { seaTree, zoneTree } from './tiles.js';
import { zoneIdxAt } from './regions.js';
import { treeSprite, treeKind, TREE_AX, TREE_AY } from './treeArt.js';
/* abete delle Lande: verde scuro sotto la neve (la palette di zona è tutta bianca) */
const FIR = ['#2f5a44', '#3a6a50', '#467a5c', '#528a68', '#6aa07c', '#223f30'];


/* ---------- primitive per la natura ---------- */
const LN = '#1e1a12';
function disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); rect(cx - w, cy + y, w * 2 + 1, 1, c); } }
function ellipseF(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); if (w > 0) rect(cx - w, cy + y, w * 2, 1, c); } }
/* una CHIOMA fatta di grumi: contorno, massa, ombra sotto, luce in alto a sinistra */
function canopy(blobs, T) {
  for (const [x, y, r] of blobs) disc(x, y + 1, r + 1, LN);
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
  /* MASSO spigoloso: sagoma a poligono irregolare, faccia di sopra piatta e chiara, facce di
     lato in ombra, una crepa di traverso. La versione tonda con la crepa al centro sembrava un
     sedere (segnalato con foto): niente rotondità simmetriche e niente segni verticali in mezzo. */
  ctx.save(); ctx.translate(sx, sy);
  const v = vhash(tx, ty, 81), flip = v < 0.5 ? 1 : -1;
  shadow(16, 27, 13);
  /* sagoma: per ogni riga, bordo sinistro e destro presi da una spezzata irregolare */
  const L = [[-12, 26], [-13, 20], [-10, 12], [-5, 7], [3, 6], [9, 9], [13, 16], [12, 24], [8, 27]];
  const left = y => { let best = -12; for (const [x, yy] of L) if (x < 0 && Math.abs(yy - y) < 5) best = Math.min(best, x); return best; };
  const edgeAt = (y, side) => {
    const pts = side < 0 ? [[-8, 6], [-11, 10], [-13, 17], [-12, 24], [-9, 27]] : [[4, 5], [10, 8], [13, 15], [12, 22], [8, 27]];
    for (let k = 0; k < pts.length - 1; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1]; if (y >= y0 && y <= y1) return Math.round(x0 + (x1 - x0) * ((y - y0) / Math.max(1, y1 - y0))); }
    return side < 0 ? -8 : 4;
  };
  for (let y = 5; y <= 27; y++) {
    const xl = 16 + flip * edgeAt(y, -flip) * -flip, xr = 16 + flip * edgeAt(y, flip) * flip;
    const a0 = Math.min(16 + edgeAt(y, -1) * (flip), 16 + edgeAt(y, 1) * (flip)), a1 = Math.max(16 + edgeAt(y, -1) * (flip), 16 + edgeAt(y, 1) * (flip));
    const x0 = Math.min(a0, a1), x1 = Math.max(a0, a1);
    rect(x0 - 1, y, x1 - x0 + 2, 1, LN);
    const topFace = y < 13, w = x1 - x0;
    rect(x0, y, w, 1, topFace ? '#b3ab9d' : '#8f887b');                                     // faccia di sopra chiara, fianco medio
    if (!topFace) { rect(flip > 0 ? x1 - Math.round(w * 0.38) : x0, y, Math.round(w * 0.38), 1, '#6f685d'); }   // fianco in ombra
    if (y === 12) rect(x0, y, w, 1, '#d0c9bb');                                              // spigolo fra le facce
  }
  const cx = 16 + flip * 3;                                                                   // crepa di traverso, fuori centro
  for (let k = 0; k < 7; k++) px(cx + flip * k, 15 + k, '#55504a');
  if (vhash(tx, ty, 83) < 0.45) { rect(4, 22, 7, 4, '#6f8a52'); rect(5, 21, 4, 1, '#8aa86a'); }                                 // muschio
  if (vhash(tx, ty, 84) < 0.4) {                                                                                                // sassolino accanto
    const qx = flip > 0 ? 27 : 4;
    rect(qx - 3, 23, 7, 5, LN); rect(qx - 2, 23, 5, 3, '#a39c90'); rect(qx - 2, 23, 5, 1, '#c4bdb0');
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
  /* BUCA scavata: incavo scuro ovale e la terra smossa ammucchiata sul bordo */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, cy = 20, side = vhash(tx, ty, 104) < 0.5 ? -1 : 1;
  for (let y = -6; y <= 6; y++) { const w = Math.round(11 * Math.sqrt(1 - (y * y) / 42)); rect(cx - w, cy + y, w * 2, 1, y < -3 ? '#8a6448' : y < 0 ? '#5a3f28' : '#3a291a'); }
  for (let y = -3; y <= 3; y++) { const w = Math.round(6 * Math.sqrt(1 - (y * y) / 12)); rect(cx - w, cy + y + 1, w * 2, 1, '#2a1d12'); }
  for (let y = -3; y <= 2; y++) { const w = Math.round(5 * Math.sqrt(1 - (y * y) / 10)); rect(cx + side * 12 - w, cy + 5 + y, w * 2, 1, y < 0 ? '#a07a54' : '#7d5838'); }
  px(cx + side * 10, cy + 3, '#b8906a');
  ctx.restore();
}
/* OGGETTI di superficie: sprite VERI riconoscibili (non quadrati), FERMI (niente rimbalzo).
   Ogni tanto una stellina appare sopra per attirare l'occhio (fase stabile per tile). */
export function drawPickup(id, sx, sy, time, tx, ty) {
  /* FASE 2: nativo, coordinate raddoppiate a mano (non uno scale automatico) — icone
     piccole e transitorie, ma ognuna riceve almeno un tocco di luce/ombra in più oltre al
     semplice raddoppio, usando lo spazio ora disponibile. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, y = sy + 24;   // posato a terra, fermo
  shadow(cx, sy + 26, 8);
  const gem = () => {};              // niente glint continuo: ci pensa la stellina
  switch (id) {
    /* ---- PRATI ---- */
    case 'fiordaliso': { rect(cx, y - 2, 2, 8, '#3f7a44'); px(cx - 2, y, '#3f7a44'); px(cx + 2, y + 2, '#3f7a44'); // stelo+foglie
      rect(cx, y - 10, 2, 2, '#6f92dd'); rect(cx - 2, y - 8, 2, 2, '#6f92dd'); rect(cx + 2, y - 8, 2, 2, '#6f92dd'); rect(cx - 4, y - 6, 2, 2, '#6f92dd'); rect(cx + 4, y - 6, 2, 2, '#6f92dd'); rect(cx, y - 4, 2, 2, '#6f92dd'); // petali
      rect(cx - 2, y - 6, 2, 2, '#3f5fb0'); rect(cx + 2, y - 6, 2, 2, '#3f5fb0'); rect(cx, y - 6, 2, 2, '#f2d24a'); px(cx - 1, y - 9, shade8('#6f92dd', 1.3)); break; } // cuore giallo + filo di luce
    case 'spiga': { rect(cx, y - 12, 2, 16, '#c9a24a'); px(cx, y - 14, '#e8c860'); // stelo lungo
      for (let i = 0; i < 5; i++) { rect(cx - 2, y - 12 + i * 4, 2, 2, '#e8c860'); rect(cx + 2, y - 10 + i * 4, 2, 2, '#d8b450'); } // chicchi a spiga
      px(cx - 4, y - 10, '#c9a24a'); px(cx + 4, y - 6, '#c9a24a'); break; } // reste
    case 'ambra': { px(cx, y - 8, '#f0b451'); rect(cx - 2, y - 6, 6, 4, '#e0932e'); rect(cx - 2, y - 2, 6, 2, '#c9761e'); px(cx, y, '#c9761e'); // goccia
      rect(cx, y - 6, 2, 2, '#ffe6a8'); px(cx + 2, y - 4, '#a85e14'); gem(); break; }
    /* ---- DUNE ---- */
    case 'conchiglia': { // ventaglio con coste che partono dalla punta in basso
      rect(cx, y - 8, 2, 2, '#f8e6d4'); rect(cx - 2, y - 6, 2, 2, '#f0c0a0'); rect(cx, y - 6, 2, 2, '#f8e6d4'); rect(cx + 2, y - 6, 2, 2, '#f0c0a0');
      rect(cx - 4, y - 4, 2, 2, '#f0c0a0'); rect(cx - 2, y - 4, 2, 2, '#f8e6d4'); rect(cx, y - 4, 2, 2, '#f0c0a0'); rect(cx + 2, y - 4, 2, 2, '#f8e6d4'); rect(cx + 4, y - 4, 2, 2, '#f0c0a0');
      rect(cx - 4, y - 2, 2, 2, '#d89570'); rect(cx - 2, y - 2, 2, 2, '#f0c0a0'); rect(cx, y - 2, 2, 2, '#d89570'); rect(cx + 2, y - 2, 2, 2, '#f0c0a0'); rect(cx + 4, y - 2, 2, 2, '#d89570');
      rect(cx, y, 2, 2, '#c07a55'); break; }
    case 'vetro': { rect(cx - 4, y - 4, 8, 6, '#6fc0b0'); px(cx - 4, y - 4, '#4e9a8a'); px(cx + 2, y, '#4e9a8a'); rect(cx - 2, y - 4, 2, 2, '#bfeee0'); gem(); break; }
    case 'scarabeo': { rect(cx - 4, y - 4, 8, 6, '#e6dcc0'); rect(cx, y - 4, 2, 2, '#b8ad8c'); rect(cx, y - 2, 2, 2, '#b8ad8c'); rect(cx, y, 2, 2, '#b8ad8c');
      rect(cx - 4, y - 6, 2, 2, '#b8ad8c'); rect(cx + 2, y - 6, 2, 2, '#b8ad8c'); rect(cx - 6, y, 2, 2, '#b8ad8c'); rect(cx + 4, y, 2, 2, '#b8ad8c'); break; }
    /* ---- BOSCHI ---- */
    case 'ghianda': { rect(cx - 2, y - 4, 6, 6, '#c68a4a'); px(cx - 2, y + 2, '#8a5a2a'); px(cx + 2, y + 2, '#8a5a2a');
      rect(cx - 2, y - 6, 6, 2, '#6e4a2a'); px(cx, y - 8, '#6e4a2a'); px(cx - 1, y - 3, shade8('#c68a4a', 1.2)); break; }
    case 'funghetto': { rect(cx - 4, y - 4, 10, 4, '#d0453a'); px(cx - 4, y - 2, '#a83329'); px(cx + 4, y - 2, '#a83329');
      rect(cx - 2, y - 4, 2, 2, '#f2ead8'); rect(cx + 2, y - 4, 2, 2, '#f2ead8'); rect(cx, y, 2, 4, '#f2ead8'); px(cx - 1, y - 3, shade8('#d0453a', 1.25)); break; }
    case 'resina': { rect(cx - 2, y - 4, 6, 6, '#7a3f1e'); px(cx, y - 6, '#7a3f1e'); px(cx, y + 2, '#5a2c12'); rect(cx - 2, y - 4, 2, 2, '#b5713a'); break; }
    /* ---- TERRE ---- */
    case 'sassorosso': { rect(cx - 4, y - 2, 10, 4, '#b5623a'); px(cx - 4, y, '#8a4326'); px(cx + 4, y, '#8a4326');
      rect(cx - 2, y - 4, 2, 2, '#b5623a'); rect(cx + 2, y - 4, 2, 2, '#b5623a'); rect(cx - 2, y - 2, 2, 2, '#d08a5a'); break; }
    case 'ferro': { px(cx - 2, y - 4, '#9aa0a6'); rect(cx - 4, y - 2, 8, 4, '#9aa0a6'); px(cx + 4, y, '#6a7076'); px(cx - 4, y, '#6a7076'); rect(cx - 2, y - 2, 2, 2, '#c8cdd2'); break; }
    case 'granato': { rect(cx - 2, y - 4, 6, 6, '#8a2434'); px(cx - 2, y - 4, '#5a1420'); px(cx + 2, y, '#5a1420'); rect(cx, y - 2, 2, 2, '#c0405a'); rect(cx - 2, y - 2, 2, 2, '#e06078'); gem(); break; }
    /* ---- PALUDE ---- */
    case 'giunco': { rect(cx - 2, y - 8, 2, 12, '#4e8d5a'); rect(cx + 2, y - 6, 2, 10, '#3a6a44'); rect(cx, y - 10, 2, 14, '#4e8d5a');
      px(cx - 2, y - 10, '#8a5a3a'); px(cx, y - 12, '#8a5a3a'); px(cx, y - 6, shade8('#4e8d5a', 1.3)); break; }
    case 'lumaca': { rect(cx - 4, y - 4, 8, 6, '#c69a5a'); px(cx - 4, y, '#8a5a2a'); px(cx + 2, y - 4, '#8a5a2a');
      rect(cx, y - 2, 2, 2, '#e0b878'); px(cx - 2, y - 2, '#8a5a2a'); px(cx, y - 4, '#8a5a2a'); px(cx + 4, y + 2, '#8a5a2a'); break; }
    case 'ninfea': { rect(cx - 4, y + 2, 10, 2, '#4e8d5a'); rect(cx, y - 4, 2, 2, '#e08ab0'); rect(cx - 2, y - 2, 2, 2, '#e08ab0'); rect(cx + 2, y - 2, 2, 2, '#e08ab0'); rect(cx, y - 2, 2, 2, '#f6d0e0'); px(cx, y - 6, '#c06a90'); break; }
    /* ---- LANDE GELIDE ---- */
    case 'scheggia': { rect(cx, y - 8, 2, 12, '#9fe0ee'); px(cx - 2, y - 4, '#9fe0ee'); px(cx + 2, y - 2, '#6fb8cc'); rect(cx, y - 8, 2, 2, '#eafcff'); px(cx, y - 2, '#6fb8cc'); gem(); break; }
    case 'pigna': { rect(cx - 2, y - 6, 6, 8, '#8a5a2a'); px(cx - 2, y - 6, '#6e4420'); px(cx + 4, y - 6, '#6e4420'); rect(cx, y - 4, 2, 2, '#a8763a'); px(cx, y + 2, '#6e4420'); px(cx - 2, y - 2, '#6e4420'); px(cx + 2, y - 2, '#6e4420'); break; }
    case 'zaffiro': { rect(cx - 2, y - 4, 6, 6, '#3a6ad0'); px(cx - 2, y - 4, '#244a9a'); px(cx + 2, y, '#244a9a'); rect(cx, y - 2, 2, 2, '#8ab0ff'); rect(cx - 2, y - 2, 2, 2, '#c0d8ff'); gem(); break; }
    /* ---- fossile lasciato a terra (drop) ---- */
    case 'fossil': { rect(cx - 4, y - 2, 10, 4, '#e9e2cf'); px(cx - 6, y - 4, '#f4eeda'); px(cx + 4, y - 4, '#f4eeda'); px(cx - 6, y + 2, '#f4eeda'); px(cx + 4, y + 2, '#f4eeda'); rect(cx, y, 2, 2, '#bcb39a'); break; }
    default: { rect(cx - 2, y - 2, 4, 4, '#e2b24a'); }
  }
  glint(cx + 6, y - 18, time, tx, ty);
  ctx.restore();
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
export function drawCactus(sx, sy, tx = 0, ty = 0) {
  /* SAGUARO: fusto a coste con due braccia, spine e un fiore in cima */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 30; shadow(cx, base, 9);
  const arm = (x, y, w, h) => { rect(x - 1, y - 1, w + 2, h + 2, LN); rect(x, y, w, h, '#4a9a55'); rect(x, y, 2, h, '#6fbf78'); rect(x + w - 2, y, 2, h, '#357a42'); };
  const flip = vhash(tx, ty, 84) < 0.5;
  arm(cx - 5, base - 28, 10, 28);
  for (const cxr of [cx - 2, cx + 2]) rect(cxr, base - 26, 1, 24, '#3d8a48');
  arm(flip ? cx - 13 : cx + 5, base - 18, 8, 4); arm(flip ? cx - 13 : cx + 9, base - 26, 4, 10);
  arm(flip ? cx + 5 : cx - 13, base - 13, 8, 4); arm(flip ? cx + 9 : cx - 13, base - 20, 4, 9);
  for (let i = 0; i < 6; i++) px(cx - 4 + ((i * 7) % 9), base - 24 + i * 4, '#e0f0d8');
  rect(cx - 2, base - 31, 4, 3, '#e08aa8'); px(cx - 1, base - 32, '#f6c0d4');
  ctx.restore();
}
export function drawBonespire(sx, sy, tx = 0, ty = 0) {
  /* COSTOLE che affiorano dalla sabbia: tre archi d'osso che si piegano, con la sabbia ammucchiata */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 28; shadow(cx, base, 12);
  [[-9, 14, -1], [0, 21, 1], [9, 12, 1]].forEach(([ox, h, bend], i) => {
    for (let k = 0; k < h; k++) { const x = cx + ox + Math.round(Math.sin((k / h) * 1.6) * 3 * bend), y = base - 2 - k, w = k > h - 4 ? 2 : 4; rect(x - (w >> 1) - 1, y, w + 2, 1, '#4a4234'); rect(x - (w >> 1), y, w, 1, '#ece5d2'); px(x - (w >> 1), y, '#fbf6e8'); }
    if (vhash(tx, ty, 88 + i) < 0.5) rect(cx + ox - 1, base - Math.floor(h / 2), 3, 1, '#c9bd9f');
  });
  ellipseF(cx, base - 1, 14, 3, '#d8c9a0'); ellipseF(cx - 3, base - 2, 8, 1, '#e8dcb8');
  ctx.restore();
}
export function drawDeadtree(sx, sy, tx = 0, ty = 0) {
  /* ALBERO SECCO nodoso: tronco storto, rami che si biforcano, un nodo cavo */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 30; shadow(cx, base, 10);
  const limb = (x0, y0, x1, y1, w) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); rect(x - (w >> 1) - 1, y - 1, w + 2, 3, LN); }
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); rect(x - (w >> 1), y, w, 1, '#6e5138'); if (w > 2) px(x - (w >> 1), y, '#9a7550'); }
  };
  const f = vhash(tx, ty, 89) < 0.5 ? 1 : -1;
  limb(cx, base, cx + f * 2, base - 18, 6);
  limb(cx + f * 2, base - 16, cx - f * 12, base - 26, 3); limb(cx - f * 8, base - 23, cx - f * 12, base - 31, 2);
  limb(cx + f * 2, base - 18, cx + f * 10, base - 30, 3); limb(cx + f * 7, base - 26, cx + f * 14, base - 28, 2);
  limb(cx + f * 2, base - 18, cx + f * 2, base - 32, 2);
  rect(cx - 5, base - 3, 12, 3, LN); rect(cx - 4, base - 3, 10, 2, '#5c4229');
  rect(cx - 1, base - 11, 3, 3, '#2a1e12');
  ctx.restore();
}
/* FUNGO — la scenografia è un fungo bruno piccolo e spento (non si raccoglie mai); quello
   maturo è grosso, rosso acceso, a pois bianchi, su gambo chiaro. Differenza leggibile a
   colpo d'occhio: nessuno prova a raccogliere quelli marroni. */
export function drawMushroom(sx, sy, time, tx, ty, ripe) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const bx = sx + 16, by = sy + 22;
  if (ripe) {
    rect(bx - 2, by - 6, 6, 8, '#f2e6c8'); px(bx - 4, by, '#d9c9a4'); rect(bx - 1, by - 4, 2, 4, shade8('#f2e6c8', 0.9)); // gambo con un filo d'ombra
    rect(bx - 8, by - 14, 18, 8, '#d8443c'); rect(bx - 6, by - 16, 14, 2, '#e05a50'); px(bx, by - 18, '#e05a50');
    rect(bx - 4, by - 14, 2, 2, '#fdf3e0'); rect(bx + 4, by - 12, 2, 2, '#fdf3e0'); rect(bx, by - 16, 2, 2, '#fdf3e0'); rect(bx + 6, by - 8, 2, 2, '#fdf3e0');
    rect(bx - 8, by - 8, 18, 2, '#a5302c'); rect(bx - 8, by - 14, 4, 4, shade8('#d8443c', 0.8)); // ombra sotto il bordo del cappello
    ctx.restore(); return;
  }
  rect(bx, by - 4, 4, 6, '#b8ab8e'); rect(bx, by - 2, 2, 4, shade8('#b8ab8e', 0.85));
  rect(bx - 4, by - 8, 12, 4, '#8f7350'); px(bx - 2, by - 10, '#8f7350'); px(bx + 4, by - 10, '#8f7350');
  rect(bx - 4, by - 6, 2, 2, '#6f5a3e'); rect(bx - 2, by - 8, 2, 2, '#ab8c62'); // luce sul cappello, lato sx
  rect(bx + 6, by - 6, 2, 2, shade8('#8f7350', 0.7)); // ombra sul cappello, lato dx
  ctx.restore();
}
export function drawStump(sx, sy, tx = 0, ty = 0) {
  /* CEPPO: faccia tagliata con gli anelli, corteccia, radici */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 27; shadow(cx, base, 11);
  rect(cx - 10, base - 12, 20, 12, LN); rect(cx - 9, base - 12, 18, 11, '#7a5230'); rect(cx - 9, base - 12, 4, 11, '#9a6a40'); rect(cx + 5, base - 12, 4, 11, '#5c3d22');
  for (let i = -8; i < 9; i += 4) rect(cx + i, base - 9, 1, 8, '#5c3d22');
  ellipseF(cx, base - 12, 10, 4, LN); ellipseF(cx, base - 12, 9, 3, '#d8b582');
  ellipseF(cx, base - 12, 6, 2, '#c49a63'); ellipseF(cx, base - 12, 3, 1, '#d8b582'); px(cx, base - 12, '#8a5f38');
  rect(cx - 13, base - 3, 5, 3, LN); rect(cx + 8, base - 3, 5, 3, LN); rect(cx - 12, base - 3, 3, 2, '#6a4428'); rect(cx + 9, base - 3, 3, 2, '#6a4428');
  if (vhash(tx, ty, 91) < 0.5) { rect(cx + 4, base - 8, 4, 3, '#6f8a52'); }
  ctx.restore();
}
export function drawRedspire(sx, sy, tx = 0, ty = 0) {
  /* CAMINO DI FATA delle Terre Rosse: colonna d'arenaria a strati con il cappello di roccia */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 30; shadow(cx, base, 11);
  for (let y = 0; y < 26; y++) {
    const w = 7 + Math.round(Math.sin(y / 4.2) * 1.5) + (y < 5 ? 4 - y : 0), yy = base - y - 1;
    const c = ['#c06a48', '#b05e3e', '#cc7854'][Math.floor(y / 5) % 3];
    rect(cx - w - 1, yy, w * 2 + 2, 1, LN); rect(cx - w, yy, w * 2, 1, c); rect(cx - w, yy, 2, 1, '#e0a37e'); rect(cx + w - 2, yy, 2, 1, '#8a3f2e');
  }
  ellipseF(cx, base - 28, 9, 4, LN); ellipseF(cx, base - 28, 8, 3, '#8a6a58'); rect(cx - 5, base - 31, 6, 1, '#b09080');
  if (vhash(tx, ty, 92) < 0.5) rect(cx - 2, base - 14, 3, 3, '#6e2f1e');
  ctx.restore();
}
export function drawOrecrystal(sx, sy, tx = 0, ty = 0) {
  /* CRISTALLI di minerale su un sasso: prismi sfaccettati con la punta */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 27; shadow(cx, base, 10);
  ellipseF(cx, base - 3, 12, 4, LN); ellipseF(cx, base - 4, 11, 3, '#6f685c');
  const prism = (x, h, w, c, lean) => {
    for (let k = 0; k < h; k++) { const u = k / h, ww = u > 0.75 ? Math.max(1, Math.round(w * (1 - u) * 4)) : w, xx = x + Math.round(lean * k); rect(xx - (ww >> 1) - 1, base - 4 - k, ww + 2, 1, LN); rect(xx - (ww >> 1), base - 4 - k, ww, 1, c); rect(xx - (ww >> 1), base - 4 - k, Math.max(1, ww >> 2), 1, '#eaf6fa'); rect(xx + (ww >> 1) - 1, base - 4 - k, 1, 1, shade8(c, 0.65)); }
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
    rect(x - 2, base - 31, 6, 11, '#2a1e12'); rect(x - 1, base - 30, 4, 9, '#8a5f38'); rect(x - 1, base - 30, 1, 9, '#a97a4c'); rect(x, base - 34, 2, 4, '#6f8a4a');
  }
  ctx.restore();
}
export function drawIcecrystal(sx, sy, tx = 0, ty = 0) {
  /* SCHEGGE DI GHIACCIO: prismi trasparenti con la faccia in luce e la brina alla base */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 27; shadow(cx, base, 10);
  const prism = (x, h, w, lean) => {
    for (let k = 0; k < h; k++) { const u = k / h, ww = u > 0.7 ? Math.max(1, Math.round(w * (1 - u) * 3.3)) : w, xx = x + Math.round(lean * k); rect(xx - (ww >> 1) - 1, base - 2 - k, ww + 2, 1, '#3f7890'); rect(xx - (ww >> 1), base - 2 - k, ww >> 1, 1, '#e8f6fb'); rect(xx, base - 2 - k, ww - (ww >> 1), 1, '#9fd4e6'); }
  };
  prism(cx - 8, 12, 6, -0.25); prism(cx + 8, 14, 6, 0.3); prism(cx, 22, 8, 0);
  ellipseF(cx, base - 1, 12, 3, '#eef7fa'); rect(cx - 8, base - 2, 16, 1, '#ffffff');
  if (vhash(tx, ty, 98) < 0.5) { rect(cx, base - 18, 1, 5, '#ffffff'); rect(cx - 2, base - 16, 5, 1, '#ffffff'); }
  ctx.restore();
}
export function drawHay(sx, sy, tx = 0, ty = 0) {
  /* ROTOBALLA di fieno: il cerchio della spirale sul fronte, i fili che spuntano */
  ctx.save(); ctx.translate(sx, sy);
  const cx = 16, base = 27; shadow(cx, base, 12);
  rect(cx - 13, base - 18, 22, 18, LN); rect(cx - 12, base - 17, 20, 16, '#c9a227'); rect(cx - 12, base - 17, 20, 3, '#e0c25c');
  for (let i = 0; i < 20; i += 3) rect(cx - 12 + i, base - 14, 1, 12, '#b08a20');
  disc(cx + 8, base - 9, 9, LN); disc(cx + 8, base - 9, 8, '#e0c25c');
  for (let q = 0; q < 40; q++) { const a = q * 0.45, r = 7 - q * 0.17; if (r < 1) break; px(cx + 8 + Math.round(Math.cos(a) * r), base - 9 + Math.round(Math.sin(a) * r), '#b08a20'); }
  for (let j = 0; j < 5; j++) { const fx = cx - 12 + Math.floor(vhash(tx, ty, 102 + j) * 28), fy = base - 18 - Math.floor(vhash(tx, ty, 103 + j) * 3); rect(fx, fy, 1, 3, '#f0d888'); }
  ctx.restore();
}

/* fumetto di dialogo. sx,sy = coordinate SCHERMO (game-px) di chi parla (testa).
   Disegna in coordinate schermo (reset del transform): così il clamp è corretto SEMPRE,
   indipendente dalle traslazioni della scena (centratura stanza / camera). Il baloon sta
   SOPRA chi parla, resta DENTRO lo schermo e MAI sotto la HUD in alto (topSafe da view.K). */
export function drawSayBalloon(sx, sy, text) {
  ctx.save();
  ctx.setTransform(view.K, 0, 0, view.K, 0, 0); // schermo puro
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
  ctx.fillStyle = '#241a10'; ctx.fillRect(tcx - 2, by + bh, 4, 3); ctx.fillStyle = '#f6efdd'; ctx.fillRect(tcx - 1, by + bh, 2, 2); // codina verso il basso
  ctx.fillStyle = '#2a2016';
  lines.forEach((l, i) => ctx.fillText(l, bx + padX, by + padY + i * lh));
  ctx.restore();
}
