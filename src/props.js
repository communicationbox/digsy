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
  /* FASE 2: nativo a piena scala, non più raddoppio meccanico. Tronco con corteccia a
     righe verticali vere, chioma con più bande e macchie di fogliame (lo spazio in più
     ospita dettaglio che nella vecchia griglia 16px non ci stava). */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const zi = zoneIdxAt(tx, ty);
  const T = zoneTree(zi);
  const sw = vhash(tx, ty, 41) < 0.35 ? Math.round(Math.sin(time / 850 + tx * 1.7 + ty * 2.3)) * 2 : 0;
  const cx = sx + 16, base = sy + 30; shadow(cx, base, 14);
  rect(cx - 4, base - 12, 8, 12, '#7c4f2e'); px(cx - 4, base - 12, '#5f3c22');
  px(cx - 4, base - 10, shade8('#7c4f2e', 1.3)); px(cx - 3, base - 6, shade8('#7c4f2e', 1.2)); // luce sx
  px(cx + 2, base - 4, shade8('#7c4f2e', 0.7)); px(cx + 3, base - 8, shade8('#7c4f2e', 0.65)); // ombra dx
  rect(cx - 1, base - 11, 1, 10, shade8('#7c4f2e', 0.85)); // venatura verticale della corteccia
  const k = cx + sw;
  rect(k - 14, base - 32, 28, 18, T[0]); rect(k - 16, base - 28, 32, 12, T[1]); rect(k - 12, base - 38, 24, 12, T[2]); rect(k - 8, base - 42, 16, 10, T[3]);
  rect(k - 6, base - 38, 6, 4, T[4]); px(k + 4, base - 34, T[4]); px(k + 5, base - 35, T[4]); px(k - 16, base - 18, T[5]); px(k - 17, base - 17, T[5]); px(k + 14, base - 18, T[5]); px(k + 15, base - 17, T[5]);
  rect(k - 4, base - 42, 3, 2, shade8(T[3], 1.45)); rect(k - 1, base - 41, 2, 2, shade8(T[3], 1.45)); // luce in cima alla chioma
  rect(k - 14, base - 18, 28, 2, shade8(T[0], 0.55)); // terzo tono: ombra interna sotto la chioma
  rect(k - 16, base - 16, 6, 2, shade8(T[0], 0.68)); rect(k + 10, base - 16, 6, 2, shade8(T[0], 0.68)); // contorno leggero sul bordo basso
  /* fogliame moteggiato: grumi di tono chiaro/scuro sparsi sulla chioma, ora 3 invece di 2
     (spazio in più) — posizione per albero, così una fila non sembra la stessa chioma */
  const lx1 = k - 12 + Math.floor(vhash(tx, ty, 42) * 24), ly1 = base - 34 + Math.floor(vhash(tx, ty, 43) * 12);
  rect(lx1, ly1, 2, 2, shade8(T[1], 1.15));
  const lx2 = k - 10 + Math.floor(vhash(tx, ty, 44) * 20), ly2 = base - 26 + Math.floor(vhash(tx, ty, 45) * 10);
  if (vhash(tx, ty, 46) < 0.6) rect(lx2, ly2, 2, 2, shade8(T[0], 0.8));
  const lx3 = k - 8 + Math.floor(vhash(tx, ty, 47) * 16), ly3 = base - 30 + Math.floor(vhash(tx, ty, 48) * 8);
  if (vhash(tx, ty, 49) < 0.5) px(lx3, ly3, shade8(T[2], 1.2));
  ctx.restore();
}
export function drawBoulder(sx, sy, tx = 0, ty = 0) {
  /* FASE 2: nativo, sagoma a faccette vere (non un blob ovale) — ogni faccetta il suo tono,
     non solo luce/ombra ai bordi di un unico blocco. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, base = sy + 26; shadow(cx, base, 12);
  rect(cx - 12, base - 14, 24, 14, '#9a9285'); rect(cx - 10, base - 18, 20, 6, '#aaa294'); px(cx - 4, base - 14, '#b8b0a2'); rect(cx - 8, base - 8, 8, 4, '#b8b0a2'); rect(cx - 12, base - 2, 24, 2, '#75695c');
  px(cx - 8, base - 16, '#d0c8ba'); rect(cx - 7, base - 16, 3, 1, '#d0c8ba'); // sprazzo di luce alto-sx
  rect(cx + 4, base - 4, 8, 2, '#5f574c'); // ombra propria bassa-dx
  rect(cx + 6, base - 12, 6, 4, shade8('#9a9285', 0.8)); // faccetta in ombra sul fianco destro
  rect(cx - 2, base - 10, 4, 3, shade8('#aaa294', 1.12)); // faccetta in luce al centro-alto: sagoma sfaccettata, non un blob
  rect(cx - 10, base - 8, 4, 4, shade8('#9a9285', 0.9)); // faccetta laterale sx, un tono in meno della base
  /* screpolature: 2-3 macchie di muschio/lichene, posizione diversa per masso così due
     copie vicine non sembrano lo stesso identico sasso timbrato */
  const mx = cx - 8 + Math.floor(vhash(tx, ty, 81) * 18), my = base - 12 + Math.floor(vhash(tx, ty, 82) * 8);
  rect(mx, my, 2, 2, '#7f776a');
  if (vhash(tx, ty, 83) < 0.5) rect(mx + 2, my, 2, 2, '#8f947c');
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
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, cy = sy + 20;
  ctx.fillStyle = '#6d4f30'; ctx.fillRect(cx - 10, cy - 6, 20, 12);
  ctx.fillStyle = '#4d371f'; rect(cx - 8, cy - 4, 2, 2, '#4d371f'); rect(cx + 6, cy - 4, 2, 2, '#4d371f'); rect(cx - 1, cy + 2, 2, 2, '#4d371f');
  rect(cx - 10 + Math.floor(vhash(tx, ty, 104) * 6), cy - 6, 3, 1, '#8a6448'); // orlo chiaro: dove la terra è stata smossa da poco
  rect(cx + 6 - Math.floor(vhash(tx, ty, 105) * 6), cy + 4, 3, 2, '#3a291a'); // fondo più scuro, non piatto
  rect(cx - 3, cy - 1, 6, 2, shade8('#4d371f', 0.75)); // profondità: incavo scuro al centro, non un ovale uniforme
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
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, base = sy + 30; shadow(cx, base, 10);
  rect(cx - 4, base - 24, 8, 24, '#4a9a55'); rect(cx - 2, base - 24, 2, 24, '#5fb768');
  rect(cx - 12, base - 18, 8, 4, '#4a9a55'); rect(cx - 12, base - 18, 4, 10, '#4a9a55');
  rect(cx + 4, base - 14, 8, 4, '#4a9a55'); rect(cx + 8, base - 22, 4, 12, '#4a9a55');
  px(cx - 6, base - 20, '#2f6b3b'); px(cx + 2, base - 10, '#2f6b3b'); rect(cx, base - 26, 2, 2, '#e08aa8');
  rect(cx - 2, base - 24, 2, 4, '#7fd489'); // luce in cima al fusto principale
  rect(cx - 4, base - 2, 8, 2, '#2f6b3b'); // ombra propria alla base
  rect(cx, base - 22, 2, 20, shade8('#4a9a55', 0.75)); // ombra sul fianco destro del fusto
  rect(cx + 9, base - 20, 2, 8, shade8('#4a9a55', 0.75)); rect(cx - 11, base - 16, 2, 6, shade8('#4a9a55', 1.15)); // braccia: anche loro con volume, non due bande piatte
  /* spine: punti chiari sparsi sul fusto, posizione per esemplare (non un timbro identico) */
  rect(cx - 4 + Math.floor(vhash(tx, ty, 84) * 6), base - 8 - Math.floor(vhash(tx, ty, 85) * 12), 2, 1, '#e0f0d8');
  rect(cx + Math.floor(vhash(tx, ty, 86) * 4), base - 18 - Math.floor(vhash(tx, ty, 87) * 6), 2, 1, '#e0f0d8');
  rect(cx - 10 + Math.floor(vhash(tx, ty, 108) * 4), base - 16 - Math.floor(vhash(tx, ty, 109) * 4), 2, 1, '#e0f0d8');
  ctx.restore();
}
export function drawBonespire(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, base = sy + 28; shadow(cx, base, 12);
  let i = 0;
  for (const [ox, h] of [[-10, 14], [0, 20], [10, 12]]) {
    rect(cx + ox - 2, base - h, 4, h, '#ece5d2'); px(cx + ox - 4, base - h, '#ece5d2'); rect(cx + ox + 2, base - h + 2, 2, h - 2, '#cbbfa4');
    rect(cx + ox - 2, base - h, 2, 2, '#fbf6e8'); // punta più chiara: luce dall'alto
    if (vhash(tx, ty, 88 + i) < 0.5) rect(cx + ox, base - Math.floor(h / 2), 2, 2, '#d6cdb4'); // vena/crepa, non su ogni guglia
    rect(cx + ox - 3, base - Math.floor(h * 0.3), 1, Math.floor(h * 0.4), shade8('#ece5d2', 0.85)); // scanalatura verticale: vero rilievo, non due bande piatte
    i++;
  }
  rect(cx - 12, base - 4, 24, 4, '#cbbfa4'); rect(cx - 12, base - 2, 24, 2, '#9a927f'); // ombra propria alla base
  ctx.restore();
}
export function drawDeadtree(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, base = sy + 30; shadow(cx, base, 10);
  rect(cx - 2, base - 26, 6, 26, '#6e5138'); px(cx - 2, base - 26, '#5c4229');
  rect(cx - 12, base - 22, 10, 4, '#6e5138'); px(cx - 12, base - 26, '#6e5138');
  rect(cx + 4, base - 18, 12, 4, '#6e5138'); px(cx + 14, base - 22, '#6e5138');
  px(cx + 2, base - 30, '#6e5138'); px(cx - 6, base - 12, '#6e5138');
  rect(cx, base - 26, 2, 4, '#9a7550'); rect(cx, base - 16, 2, 4, '#9a7550'); // striscia di luce sul tronco (lato sx)
  rect(cx + 2, base - 12, 2, 4, shade8('#6e5138', 0.7)); // ombra sul fianco destro
  rect(cx - 1, base - 2, 6, 2, '#4a3620'); // ombra propria alla base
  rect(cx - 1, base - 20, 1, 8, shade8('#6e5138', 0.85)); // venatura verticale: vero rilievo di corteccia
  if (vhash(tx, ty, 89) < 0.45) rect(cx, base - 20 - Math.floor(vhash(tx, ty, 90) * 6), 2, 2, '#3f2c1a'); // nodo del legno, non su ogni esemplare
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
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, base = sy + 26; shadow(cx, base, 10);
  rect(cx - 8, base - 10, 16, 10, '#8a5f38'); rect(cx - 8, base - 12, 16, 4, '#c9a06a');
  rect(cx - 2, base - 12, 2, 2, '#a97a4c'); rect(cx + 2, base - 10, 2, 2, '#a97a4c'); px(cx - 10, base - 6, '#6e5138');
  rect(cx - 6, base - 12, 2, 2, '#e0be8c'); rect(cx + 4, base - 4, 4, 2, '#5c4229'); // luce sull'anello + ombra propria
  rect(cx + 2, base - 10, 2, 6, shade8('#8a5f38', 0.75)); // fianco destro in ombra
  rect(cx - 8, base - 10, 2, 10, shade8('#8a5f38', 1.15)); // fianco sinistro in luce: la superficie tagliata ha volume
  if (vhash(tx, ty, 91) < 0.5) rect(cx, base - 10, 2, 2, '#a97a4c'); // secondo anello, non su ogni ceppo
  ctx.restore();
}
export function drawRedspire(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, base = sy + 30; shadow(cx, base, 12);
  rect(cx - 6, base - 28, 12, 28, '#b05e3e'); rect(cx - 8, base - 16, 16, 16, '#c06a48');
  rect(cx - 4, base - 28, 4, 28, '#cc7854'); px(cx - 2, base - 32, '#b05e3e'); rect(cx + 6, base - 12, 2, 2, '#8a3f2e');
  rect(cx - 4, base - 28, 2, 2, '#e0a37e'); rect(cx + 2, base - 4, 4, 2, '#7a3324'); // luce in punta + ombra propria
  rect(cx + 4, base - 20, 2, 10, shade8('#c06a48', 0.8)); // fianco destro della base in ombra: rilievo vero, non solo venature sparse
  rect(cx - 6 + Math.floor(vhash(tx, ty, 92) * 10), base - 20 - Math.floor(vhash(tx, ty, 93) * 8), 2, 2, '#8a3f2e'); // venatura scura sparsa
  ctx.restore();
}
export function drawOrecrystal(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, base = sy + 26; shadow(cx, base, 10);
  let i = 0;
  for (const [ox, h, c] of [[-8, 12, '#8d7ba0'], [0, 18, '#9ad0c8'], [8, 10, '#8d7ba0']]) {
    rect(cx + ox - 2, base - h, 6, h, c); px(cx + ox, base - h - 2, c); rect(cx + ox - 2, base - h + 2, 2, 2, '#e8f6fb');
    rect(cx + ox, base - 4, 2, 2, shade8(c, 0.55)); // ombra propria alla base del cristallo
    rect(cx + ox + 2, base - Math.floor(h * 0.6), 2, Math.floor(h * 0.4), shade8(c, 0.7)); // faccetta in ombra sul lato destro: rilievo vero
    if (vhash(tx, ty, 94 + i) < 0.5) rect(cx + ox, base - Math.floor(h / 2), 2, 2, shade8(c, 1.25)); // faccetta interna in luce, non su ogni cristallo
    i++;
  }
  ctx.restore();
}
/* CANNE — quelle di scenario sono steli verdi nudi; il giunco maturo ha il pennacchio bruno
   gonfio in cima (ed è l'unico che si raccoglie). */
export function drawReed(sx, sy, time, tx, ty, ripe) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, base = sy + 28;
  const sw2 = Math.round(Math.sin(time / 800 + tx * 2.1 + ty) * 2);
  for (const ox of [-8, 0, 8]) {
    rect(cx + ox, base - 18, 2, 18, '#4a6340');
    px(cx + ox + sw2, base - 20, '#4a6340');
    rect(cx + ox, base - 14, 2, 4, shade8('#4a6340', 1.3)); // filo di luce sullo stelo
    rect(cx + ox + 1, base - 10, 1, 6, shade8('#4a6340', 0.75)); // ombra sul fianco destro: vero rilievo, non un colore piatto
  }
  if (ripe) {                                        // pennacchio: solo sul giunco maturo
    rect(cx - 2 + sw2, base - 30, 6, 10, '#8a5f38'); px(cx + sw2, base - 32, '#a97a4c');
    rect(cx - 2 + sw2, base - 28, 2, 2, '#a97a4c'); rect(cx + 2 + sw2, base - 24, 2, 2, '#6e4a2c');
    rect(cx + 2 + sw2, base - 28, 2, 4, shade8('#8a5f38', 0.75)); // ombra sul pennacchio: quarto tono
  }
  ctx.restore();
}
export function drawIcecrystal(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, base = sy + 26; shadow(cx, base, 10);
  let i = 0;
  for (const [ox, h] of [[-8, 12], [0, 20], [8, 14]]) {
    rect(cx + ox - 2, base - h, 6, h, '#bfe9f4'); rect(cx + ox, base - h - 2, 2, 2, '#e8f6fb'); rect(cx + ox - 2, base - h + 4, 2, 2, '#8fd0e6');
    rect(cx + ox, base - 4, 2, 2, '#5fa8bc'); // ombra propria alla base
    rect(cx + ox + 2, base - Math.floor(h * 0.6), 2, Math.floor(h * 0.4), shade8('#bfe9f4', 0.75)); // faccetta in ombra sul fianco destro: rilievo vero
    if (vhash(tx, ty, 98 + i) < 0.5) rect(cx + ox, base - Math.floor(h / 2), 2, 2, '#e8f6fb'); // riflesso interno, non su ogni cristallo
    i++;
  }
  ctx.restore();
}
export function drawHay(sx, sy, tx = 0, ty = 0) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx + 16, base = sy + 26; shadow(cx, base, 12);
  rect(cx - 12, base - 16, 24, 16, '#d4b13c'); rect(cx - 12, base - 16, 24, 4, '#e0c25c');
  rect(cx - 12, base - 10, 24, 2, '#b99b2e'); rect(cx - 8, base - 6, 2, 2, '#b99b2e'); rect(cx + 6, base - 12, 2, 2, '#e0c25c');
  rect(cx - 10, base - 14, 2, 2, '#f0d888'); rect(cx - 12, base - 2, 24, 2, '#8f7724'); // luce in cima + ombra propria alla base
  rect(cx + 6, base - 12, 6, 6, shade8('#d4b13c', 0.8)); // fianco destro in ombra: quarto tono
  rect(cx - 12, base - 16, 3, 16, shade8('#d4b13c', 1.1)); // fianco sinistro in luce: il covone ha volume, non due bande piatte
  for (let j = 0; j < 4; j++) { // fili di paglia sparsi che spuntano dal bordo, non solo uno
    const fx = cx - 10 + Math.floor(vhash(tx, ty, 102 + j) * 20), fy = base - 8 - Math.floor(vhash(tx, ty, 103 + j) * 6);
    px(fx, fy, j % 2 ? '#b99b2e' : '#f0d888');
  }
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
