/* OGGETTI DEL MONDO — alberi, sassi, fiori, funghi, oggetti a terra, decorazioni di bioma.
   Estratto da render.js: qui sta il "cosa c'è per terra", non il "come si compone la scena".

   REGOLA che vale per tutto questo file: ciò che si RACCOGLIE ha ombra di contatto + stellina
   e un disegno diverso da quello scenografico. Ciò che è solo decorazione è piatto e spento.
   Le fasi delle animazioni vengono dal TEMPO o dalle coordinate TILE, mai da sx/sy. */
import { TS, spColor } from './data.js';
import { vhash } from './noise.js';
import { px, rect, shadow, shade8 } from './brush.js';
import { ctx, view } from './screen.js';
import { seaTree, zoneTree } from './tiles.js';
import { zoneIdxAt } from './regions.js';

export function drawTree(sx, sy, time, tx, ty) {
  const zi = zoneIdxAt(tx, ty);
  const T = zoneTree(zi);
  const sw = vhash(tx, ty, 41) < 0.35 ? Math.round(Math.sin(time / 850 + tx * 1.7 + ty * 2.3)) : 0;
  const cx = sx + 8, base = sy + 15; shadow(cx, base, 7); rect(cx - 2, base - 6, 4, 6, '#7c4f2e'); px(cx - 2, base - 6, '#5f3c22');
  const k = cx + sw;
  rect(k - 7, base - 16, 14, 9, T[0]); rect(k - 8, base - 14, 16, 6, T[1]); rect(k - 6, base - 19, 12, 6, T[2]); rect(k - 4, base - 21, 8, 5, T[3]);
  rect(k - 3, base - 19, 3, 2, T[4]); px(k + 2, base - 17, T[4]); px(k - 8, base - 9, T[5]); px(k + 7, base - 9, T[5]);
}
export function drawBoulder(sx, sy) { const cx = sx + 8, base = sy + 13; shadow(cx, base, 6); rect(cx - 6, base - 7, 12, 7, '#9a9285'); rect(cx - 5, base - 9, 10, 3, '#aaa294'); px(cx - 2, base - 7, '#b8b0a2'); rect(cx - 4, base - 4, 4, 2, '#b8b0a2'); rect(cx - 6, base - 1, 12, 1, '#75695c'); }
/* FIORE — versione scenografica (piatta, a terra) e versione MATURA (alta, azzurra, col
   gambo: la stessa forma dell'oggetto 'fiordaliso' che finisce nello zaino). Le due non si
   confondono: se è raccoglibile lo si vede dalla forma, non solo dalla stellina. */
export function drawFlower(sx, sy, tx, ty, ripe) {
  const bx = sx + 8, by = sy + 9;
  if (ripe) {                                        // fiordaliso maturo: stelo + corolla azzurra
    const y = sy + 12;
    rect(bx, y - 1, 1, 4, '#3f7a44'); px(bx - 1, y, '#3f7a44'); px(bx + 1, y + 1, '#3f7a44');
    px(bx, y - 5, '#6f92dd'); px(bx - 1, y - 4, '#6f92dd'); px(bx + 1, y - 4, '#6f92dd');
    px(bx - 2, y - 3, '#6f92dd'); px(bx + 2, y - 3, '#6f92dd'); px(bx, y - 2, '#6f92dd');
    px(bx - 1, y - 3, '#3f5fb0'); px(bx + 1, y - 3, '#3f5fb0'); px(bx, y - 3, '#f2d24a');
    return;
  }
  const k = (((tx * 5 + ty * 3) % 3) + 3) % 3;
  const petal = k === 0 ? '#f0a5c0' : k === 1 ? '#f2dd7a' : '#f3ece0';
  px(bx, by - 2, petal); px(bx - 2, by, petal); px(bx + 2, by, petal); px(bx, by + 2, petal); px(bx, by, '#d98a3c'); px(bx, by + 4, '#4a8f4f');
}
/* CONCHIGLIA — la scenografia è una valva rotta appiattita nella sabbia; quella raccoglibile
   è intera, a ventaglio, con le costole e la cerniera in basso. */
export function drawShell(sx, sy, ripe) {
  const bx = sx + 8, by = sy + 9;
  if (ripe) {
    const base = sy + 12;
    rect(bx - 4, base - 4, 9, 4, '#f2c9c4'); rect(bx - 3, base - 6, 7, 2, '#f2c9c4');
    px(bx, base - 7, '#f2c9c4');
    for (const ox of [-3, 0, 3]) { px(bx + ox, base - 5, '#d99a97'); px(bx + ox, base - 3, '#d99a97'); }
    px(bx - 2, base - 6, '#fbeae7'); px(bx + 1, base - 6, '#fbeae7');
    rect(bx - 1, base - 1, 3, 1, '#c98481');
    return;
  }
  rect(bx - 2, by - 2, 4, 4, '#e7c6a0'); px(bx - 1, by - 1, '#f5e4cf'); px(bx, by - 3, '#d3a97f');
}
export function drawHole(sx, sy) { const cx = sx + 8, cy = sy + 10; ctx.fillStyle = '#6d4f30'; ctx.fillRect(cx - 5, cy - 3, 10, 6); ctx.fillStyle = '#4d371f'; px(cx - 4, cy - 2, '#4d371f'); px(cx + 4, cy - 2, '#4d371f'); px(cx, cy + 1, '#4d371f'); }
/* OGGETTI di superficie: sprite VERI riconoscibili (non quadrati), FERMI (niente rimbalzo).
   Ogni tanto una stellina appare sopra per attirare l'occhio (fase stabile per tile). */
export function drawPickup(id, sx, sy, time, tx, ty) {
  const cx = sx + 8, y = sy + 12;   // posato a terra, fermo
  shadow(cx, sy + 13, 4);
  const gem = () => {};              // niente glint continuo: ci pensa la stellina
  switch (id) {
    /* ---- PRATI ---- */
    case 'fiordaliso': { rect(cx, y - 1, 1, 4, '#3f7a44'); px(cx - 1, y, '#3f7a44'); px(cx + 1, y + 1, '#3f7a44'); // stelo+foglie
      px(cx, y - 5, '#6f92dd'); px(cx - 1, y - 4, '#6f92dd'); px(cx + 1, y - 4, '#6f92dd'); px(cx - 2, y - 3, '#6f92dd'); px(cx + 2, y - 3, '#6f92dd'); px(cx, y - 2, '#6f92dd'); // petali
      px(cx - 1, y - 3, '#3f5fb0'); px(cx + 1, y - 3, '#3f5fb0'); px(cx, y - 3, '#f2d24a'); break; } // cuore giallo
    case 'spiga': { rect(cx, y - 6, 1, 8, '#c9a24a'); px(cx, y - 7, '#e8c860'); // stelo lungo
      for (let i = 0; i < 5; i++) { px(cx - 1, y - 6 + i * 2, '#e8c860'); px(cx + 1, y - 5 + i * 2, '#d8b450'); } // chicchi a spiga
      px(cx - 2, y - 5, '#c9a24a'); px(cx + 2, y - 3, '#c9a24a'); break; } // reste
    case 'ambra': { px(cx, y - 4, '#f0b451'); rect(cx - 1, y - 3, 3, 2, '#e0932e'); rect(cx - 1, y - 1, 3, 1, '#c9761e'); px(cx, y, '#c9761e'); // goccia
      px(cx, y - 3, '#ffe6a8'); px(cx + 1, y - 2, '#a85e14'); gem(); break; }
    /* ---- DUNE ---- */
    case 'conchiglia': { // ventaglio con coste che partono dalla punta in basso
      px(cx, y - 4, '#f8e6d4'); px(cx - 1, y - 3, '#f0c0a0'); px(cx, y - 3, '#f8e6d4'); px(cx + 1, y - 3, '#f0c0a0');
      px(cx - 2, y - 2, '#f0c0a0'); px(cx - 1, y - 2, '#f8e6d4'); px(cx, y - 2, '#f0c0a0'); px(cx + 1, y - 2, '#f8e6d4'); px(cx + 2, y - 2, '#f0c0a0');
      px(cx - 2, y - 1, '#d89570'); px(cx - 1, y - 1, '#f0c0a0'); px(cx, y - 1, '#d89570'); px(cx + 1, y - 1, '#f0c0a0'); px(cx + 2, y - 1, '#d89570');
      px(cx, y, '#c07a55'); break; }
    case 'vetro': { rect(cx - 2, y - 2, 4, 3, '#6fc0b0'); px(cx - 2, y - 2, '#4e9a8a'); px(cx + 1, y, '#4e9a8a'); px(cx - 1, y - 2, '#bfeee0'); gem(); break; }
    case 'scarabeo': { rect(cx - 2, y - 2, 4, 3, '#e6dcc0'); px(cx, y - 2, '#b8ad8c'); px(cx, y - 1, '#b8ad8c'); px(cx, y, '#b8ad8c');
      px(cx - 2, y - 3, '#b8ad8c'); px(cx + 1, y - 3, '#b8ad8c'); px(cx - 3, y, '#b8ad8c'); px(cx + 2, y, '#b8ad8c'); break; }
    /* ---- BOSCHI ---- */
    case 'ghianda': { rect(cx - 1, y - 2, 3, 3, '#c68a4a'); px(cx - 1, y + 1, '#8a5a2a'); px(cx + 1, y + 1, '#8a5a2a');
      rect(cx - 1, y - 3, 3, 1, '#6e4a2a'); px(cx, y - 4, '#6e4a2a'); break; }
    case 'funghetto': { rect(cx - 2, y - 2, 5, 2, '#d0453a'); px(cx - 2, y - 1, '#a83329'); px(cx + 2, y - 1, '#a83329');
      px(cx - 1, y - 2, '#f2ead8'); px(cx + 1, y - 2, '#f2ead8'); rect(cx, y, 1, 2, '#f2ead8'); break; }
    case 'resina': { rect(cx - 1, y - 2, 3, 3, '#7a3f1e'); px(cx, y - 3, '#7a3f1e'); px(cx, y + 1, '#5a2c12'); px(cx - 1, y - 2, '#b5713a'); break; }
    /* ---- TERRE ---- */
    case 'sassorosso': { rect(cx - 2, y - 1, 5, 2, '#b5623a'); px(cx - 2, y, '#8a4326'); px(cx + 2, y, '#8a4326');
      px(cx - 1, y - 2, '#b5623a'); px(cx + 1, y - 2, '#b5623a'); px(cx - 1, y - 1, '#d08a5a'); break; }
    case 'ferro': { px(cx - 1, y - 2, '#9aa0a6'); rect(cx - 2, y - 1, 4, 2, '#9aa0a6'); px(cx + 2, y, '#6a7076'); px(cx - 2, y, '#6a7076'); px(cx - 1, y - 1, '#c8cdd2'); break; }
    case 'granato': { rect(cx - 1, y - 2, 3, 3, '#8a2434'); px(cx - 1, y - 2, '#5a1420'); px(cx + 1, y, '#5a1420'); px(cx, y - 1, '#c0405a'); px(cx - 1, y - 1, '#e06078'); gem(); break; }
    /* ---- PALUDE ---- */
    case 'giunco': { rect(cx - 1, y - 4, 1, 6, '#4e8d5a'); rect(cx + 1, y - 3, 1, 5, '#3a6a44'); rect(cx, y - 5, 1, 7, '#4e8d5a');
      px(cx - 1, y - 5, '#8a5a3a'); px(cx, y - 6, '#8a5a3a'); break; }
    case 'lumaca': { rect(cx - 2, y - 2, 4, 3, '#c69a5a'); px(cx - 2, y, '#8a5a2a'); px(cx + 1, y - 2, '#8a5a2a');
      px(cx, y - 1, '#e0b878'); px(cx - 1, y - 1, '#8a5a2a'); px(cx, y - 2, '#8a5a2a'); px(cx + 2, y + 1, '#8a5a2a'); break; }
    case 'ninfea': { rect(cx - 2, y + 1, 5, 1, '#4e8d5a'); px(cx, y - 2, '#e08ab0'); px(cx - 1, y - 1, '#e08ab0'); px(cx + 1, y - 1, '#e08ab0'); px(cx, y - 1, '#f6d0e0'); px(cx, y - 3, '#c06a90'); break; }
    /* ---- LANDE GELIDE ---- */
    case 'scheggia': { rect(cx, y - 4, 1, 6, '#9fe0ee'); px(cx - 1, y - 2, '#9fe0ee'); px(cx + 1, y - 1, '#6fb8cc'); px(cx, y - 4, '#eafcff'); px(cx, y - 1, '#6fb8cc'); gem(); break; }
    case 'pigna': { rect(cx - 1, y - 3, 3, 4, '#8a5a2a'); px(cx - 1, y - 3, '#6e4420'); px(cx + 1, y - 3, '#6e4420'); px(cx, y - 2, '#a8763a'); px(cx, y + 1, '#6e4420'); px(cx - 1, y - 1, '#6e4420'); px(cx + 1, y - 1, '#6e4420'); break; }
    case 'zaffiro': { rect(cx - 1, y - 2, 3, 3, '#3a6ad0'); px(cx - 1, y - 2, '#244a9a'); px(cx + 1, y, '#244a9a'); px(cx, y - 1, '#8ab0ff'); px(cx - 1, y - 1, '#c0d8ff'); gem(); break; }
    /* ---- fossile lasciato a terra (drop) ---- */
    case 'fossil': { rect(cx - 2, y - 1, 5, 2, '#e9e2cf'); px(cx - 3, y - 2, '#f4eeda'); px(cx + 2, y - 2, '#f4eeda'); px(cx - 3, y + 1, '#f4eeda'); px(cx + 2, y + 1, '#f4eeda'); px(cx, y, '#bcb39a'); break; }
    default: { rect(cx - 1, y - 1, 2, 2, '#e2b24a'); }
  }
  glint(cx + 3, y - 9, time, tx, ty);
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
export function drawCactus(sx, sy) {
  const cx = sx + 8, base = sy + 15; shadow(cx, base, 5);
  rect(cx - 2, base - 12, 4, 12, '#4a9a55'); rect(cx - 1, base - 12, 1, 12, '#5fb768');
  rect(cx - 6, base - 9, 4, 2, '#4a9a55'); rect(cx - 6, base - 9, 2, 5, '#4a9a55');
  rect(cx + 2, base - 7, 4, 2, '#4a9a55'); rect(cx + 4, base - 11, 2, 6, '#4a9a55');
  px(cx - 3, base - 10, '#2f6b3b'); px(cx + 1, base - 5, '#2f6b3b'); px(cx, base - 13, '#e08aa8');
}
export function drawBonespire(sx, sy) {
  const cx = sx + 8, base = sy + 14; shadow(cx, base, 6);
  for (const [ox, h] of [[-5, 7], [0, 10], [5, 6]]) {
    rect(cx + ox - 1, base - h, 2, h, '#ece5d2'); px(cx + ox - 2, base - h, '#ece5d2'); px(cx + ox + 1, base - h + 1, '#cbbfa4');
  }
  rect(cx - 6, base - 2, 12, 2, '#cbbfa4');
}
export function drawDeadtree(sx, sy) {
  const cx = sx + 8, base = sy + 15; shadow(cx, base, 5);
  rect(cx - 1, base - 13, 3, 13, '#6e5138'); px(cx - 1, base - 13, '#5c4229');
  rect(cx - 6, base - 11, 5, 2, '#6e5138'); px(cx - 6, base - 13, '#6e5138');
  rect(cx + 2, base - 9, 6, 2, '#6e5138'); px(cx + 7, base - 11, '#6e5138');
  px(cx + 1, base - 15, '#6e5138'); px(cx - 3, base - 6, '#6e5138');
}
/* FUNGO — la scenografia è un fungo bruno piccolo e spento (non si raccoglie mai); quello
   maturo è grosso, rosso acceso, a pois bianchi, su gambo chiaro. Differenza leggibile a
   colpo d'occhio: nessuno prova a raccogliere quelli marroni. */
export function drawMushroom(sx, sy, time, tx, ty, ripe) {
  const bx = sx + 8, by = sy + 11;
  if (ripe) {
    rect(bx - 1, by - 3, 3, 4, '#f2e6c8'); px(bx - 2, by, '#d9c9a4');
    rect(bx - 4, by - 7, 9, 4, '#d8443c'); rect(bx - 3, by - 8, 7, 1, '#e05a50'); px(bx, by - 9, '#e05a50');
    px(bx - 2, by - 7, '#fdf3e0'); px(bx + 2, by - 6, '#fdf3e0'); px(bx, by - 8, '#fdf3e0'); px(bx + 3, by - 4, '#fdf3e0');
    rect(bx - 4, by - 4, 9, 1, '#a5302c');
    return;
  }
  rect(bx, by - 2, 2, 3, '#b8ab8e');
  rect(bx - 2, by - 4, 6, 2, '#8f7350'); px(bx - 1, by - 5, '#8f7350'); px(bx + 2, by - 5, '#8f7350');
  px(bx - 2, by - 3, '#6f5a3e');
}
export function drawStump(sx, sy) {
  const cx = sx + 8, base = sy + 13; shadow(cx, base, 5);
  rect(cx - 4, base - 5, 8, 5, '#8a5f38'); rect(cx - 4, base - 6, 8, 2, '#c9a06a');
  px(cx - 1, base - 6, '#a97a4c'); px(cx + 1, base - 5, '#a97a4c'); px(cx - 5, base - 3, '#6e5138');
}
export function drawRedspire(sx, sy) {
  const cx = sx + 8, base = sy + 15; shadow(cx, base, 6);
  rect(cx - 3, base - 14, 6, 14, '#b05e3e'); rect(cx - 4, base - 8, 8, 8, '#c06a48');
  rect(cx - 2, base - 14, 2, 14, '#cc7854'); px(cx - 1, base - 16, '#b05e3e'); px(cx + 3, base - 6, '#8a3f2e');
}
export function drawOrecrystal(sx, sy) {
  const cx = sx + 8, base = sy + 13; shadow(cx, base, 5);
  for (const [ox, h, c] of [[-4, 6, '#8d7ba0'], [0, 9, '#9ad0c8'], [4, 5, '#8d7ba0']]) {
    rect(cx + ox - 1, base - h, 3, h, c); px(cx + ox, base - h - 1, c); px(cx + ox - 1, base - h + 1, '#e8f6fb');
  }
}
/* CANNE — quelle di scenario sono steli verdi nudi; il giunco maturo ha il pennacchio bruno
   gonfio in cima (ed è l'unico che si raccoglie). */
export function drawReed(sx, sy, time, tx, ty, ripe) {
  const cx = sx + 8, base = sy + 14;
  const sw2 = Math.round(Math.sin(time / 800 + tx * 2.1 + ty) * 1);
  for (const ox of [-4, 0, 4]) {
    rect(cx + ox, base - 9, 1, 9, '#4a6340');
    px(cx + ox + sw2, base - 10, '#4a6340');
  }
  if (ripe) {                                        // pennacchio: solo sul giunco maturo
    rect(cx - 1 + sw2, base - 15, 3, 5, '#8a5f38'); px(cx + sw2, base - 16, '#a97a4c');
    px(cx - 1 + sw2, base - 14, '#a97a4c'); px(cx + 1 + sw2, base - 12, '#6e4a2c');
  }
}
export function drawIcecrystal(sx, sy) {
  const cx = sx + 8, base = sy + 13; shadow(cx, base, 5);
  for (const [ox, h] of [[-4, 6], [0, 10], [4, 7]]) {
    rect(cx + ox - 1, base - h, 3, h, '#bfe9f4'); px(cx + ox, base - h - 1, '#e8f6fb'); px(cx + ox - 1, base - h + 2, '#8fd0e6');
  }
}
export function drawHay(sx, sy) {
  const cx = sx + 8, base = sy + 13; shadow(cx, base, 6);
  rect(cx - 6, base - 8, 12, 8, '#d4b13c'); rect(cx - 6, base - 8, 12, 2, '#e0c25c');
  rect(cx - 6, base - 5, 12, 1, '#b99b2e'); px(cx - 4, base - 3, '#b99b2e'); px(cx + 3, base - 6, '#e0c25c');
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
