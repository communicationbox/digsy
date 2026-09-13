/* GROTTE — l'aspetto dell'interno. Modulo puro: disegna col pennello che riceve.

   Le pareti erano caselle viola a scacchiera con una riga chiara in cima, il pavimento una
   scacchiera marrone: al buio si capiva dove camminare, ma non sembrava una grotta. Qui la
   roccia ha una FACCIA (dove una parete guarda il pavimento, vista in 3/4) e una CRESTA sopra,
   il pavimento è fatto di lastre, ghiaia, pozzanghere e qualche fungo luminoso, e i giacimenti
   sono grappoli di cristalli sfaccettati. Le posizioni vengono dalla casella (vhash), le
   animazioni dal tempo. */
import { vhash, smooth } from './noise.js';

const TS = 32;
const LN = '#0e0c16';

/* PARETE: `below`/`above`/`left`/`right` = c'è pavimento da quel lato */
export function caveWall(g, tx, ty, sx, sy, open) {
  const n = smooth(tx * 0.3, ty * 0.3, 301);
  const top = n < 0.4 ? '#2a2640' : n < 0.7 ? '#302b48' : '#352f50';
  g.rect(sx, sy, TS, TS, top);
  for (let k = 0; k < 3; k++) if (vhash(tx, ty, 310 + k) < 0.5) {                           // grana della roccia
    const x = sx + 3 + Math.floor(vhash(tx, ty, 320 + k) * 24), y = sy + 3 + Math.floor(vhash(tx, ty, 330 + k) * 24);
    g.rect(x, y, 4, 2, '#231f36'); g.rect(x + 1, y - 1, 2, 1, '#3d3760');
  }
  if (open.left) { g.rect(sx, sy, 2, TS, '#4a4378'); g.rect(sx + 2, sy, 1, TS, LN); }
  if (open.right) { g.rect(sx + TS - 2, sy, 2, TS, '#1c1930'); }
  if (open.above) { g.rect(sx, sy, TS, 3, '#6d64a4'); g.rect(sx, sy + 3, TS, 1, '#4a4378'); }
  if (open.below) {
    /* FACCIA della parete che guarda il pavimento: strati verticali, più scura in basso */
    const H = 18, y0 = sy + TS - H;
    g.rect(sx, y0 - 1, TS, 1, LN);
    g.rect(sx, y0, TS, H, '#3e3858');
    g.rect(sx, y0, TS, 3, '#5a5288');
    for (let i = 2; i < TS; i += 5 + Math.floor(vhash(tx, ty, 340 + i) * 4)) g.rect(sx + i, y0 + 3, 1, H - 5, '#2c2842');
    g.rect(sx, y0 + H - 5, TS, 5, '#2a2640'); g.rect(sx, sy + TS - 1, TS, 1, LN);
    if (vhash(tx, ty, 350) < 0.25) { const x = sx + 6 + Math.floor(vhash(tx, ty, 351) * 18); g.rect(x, y0 + 4, 3, 7, '#6fd6e0'); g.rect(x, y0 + 4, 1, 7, '#c8f6fa'); }   // venatura di cristallo
  }
}

/* PAVIMENTO: lastre di pietra a due toni, ghiaia, crepe, pozzanghere, funghi luminosi */
export function caveFloor(g, tx, ty, sx, sy, time, wallAbove) {
  const H = TS >> 1;
  for (let q = 0; q < 4; q++) {
    const qx = q & 1, qy = q >> 1, n = smooth((tx + qx * 0.5) * 0.35, (ty + qy * 0.5) * 0.35, 302);
    g.rect(sx + qx * H, sy + qy * H, H, H, n < 0.38 ? '#4a3f34' : n < 0.66 ? '#544839' : '#5c4f3f');
  }
  if (vhash(tx, ty, 360) < 0.5) { const x = sx + Math.floor(vhash(tx, ty, 361) * 20), y = sy + Math.floor(vhash(tx, ty, 362) * 24); g.rect(x, y, 10, 1, '#3e342a'); g.rect(x + 10, y + 1, 5, 1, '#3e342a'); }   // crepa
  for (let k = 0; k < 4; k++) if (vhash(tx, ty, 370 + k) < 0.45) { const x = sx + 2 + Math.floor(vhash(tx, ty, 380 + k) * 27), y = sy + 2 + Math.floor(vhash(tx, ty, 390 + k) * 27); g.rect(x, y, 2, 2, '#6e604c'); g.px(x, y, '#8a7a62'); }   // ghiaia
  if (wallAbove) g.rect(sx, sy, TS, 4, 'rgba(8,6,14,.35)');                                 // ombra ai piedi della parete
  const r = vhash(tx, ty, 400);
  if (r < 0.05) {                                                                            // pozzanghera
    const cx = sx + 16, cy = sy + 18;
    for (let y = -4; y <= 4; y++) { const w = Math.round(9 * Math.sqrt(1 - (y * y) / 20)); g.rect(cx - w, cy + y, w * 2, 1, y < 0 ? '#2e3a4a' : '#35465a'); }
    if (Math.sin(time / 700 + tx + ty) > 0.5) g.rect(cx - 3, cy - 1, 4, 1, '#8fb8d0');
  } else if (r < 0.08) {                                                                     // funghi luminosi
    const glow = 0.18 + 0.08 * Math.sin(time / 900 + tx * 1.3 + ty);
    g.rect(sx + 6, sy + 10, 20, 16, 'rgba(120,230,210,' + glow.toFixed(2) + ')');
    for (const [dx, dy, h] of [[10, 22, 5], [16, 20, 7], [21, 23, 4]]) {
      g.rect(sx + dx, sy + dy - h, 2, h, '#bfe8dc');
      g.rect(sx + dx - 2, sy + dy - h - 2, 6, 3, LN); g.rect(sx + dx - 1, sy + dy - h - 2, 4, 2, '#6fe0c8'); g.px(sx + dx, sy + dy - h - 2, '#d8fff4');
    }
  } else if (r < 0.1) {                                                                      // stalagmite
    const cx = sx + 16, b = sy + 26;
    g.rect(cx - 7, b - 1, 14, 3, 'rgba(0,0,0,.3)');
    for (let k = 0; k < 18; k++) { const w = Math.max(1, Math.round(7 * (1 - k / 20))); g.rect(cx - w - 1, b - k, w * 2 + 2, 1, '#2a241c'); g.rect(cx - w, b - k, w * 2, 1, '#8a7a66'); g.rect(cx - w, b - k, Math.max(1, w >> 1) + 1, 1, '#b0a088'); g.rect(cx + w - 2, b - k, 2, 1, '#6a5c4c'); }
    g.px(cx - 1, b - 17, '#d0c0a8');
  }
}

/* GIACIMENTO: grappolo di cristalli sfaccettati con l'alone; l'anello dice se ci sei sopra */
export function caveCrystal(g, sx, sy, time, here) {
  const pulse = 0.12 + 0.06 * Math.sin(time / 500);
  g.rect(sx - 6, sy - 6, TS + 12, TS + 12, 'rgba(120,220,235,' + pulse.toFixed(2) + ')');
  for (let y = -4; y <= 4; y++) { const w = Math.round(13 * Math.sqrt(1 - (y * y) / 20)); g.rect(sx + 16 - w, sy + 26 + y, w * 2, 1, y < 0 ? '#2a3540' : '#1e2730'); }
  const prism = (x, h, w, lean) => {
    for (let k = 0; k < h; k++) {
      const u = k / h, ww = u > 0.72 ? Math.max(1, Math.round(w * (1 - u) * 3.6)) : w, xx = x + Math.round(lean * k), y = sy + 26 - k;
      g.rect(xx - (ww >> 1) - 1, y, ww + 2, 1, '#123840');
      g.rect(xx - (ww >> 1), y, ww >> 1, 1, '#a6ecf2');
      g.rect(xx, y, ww - (ww >> 1), 1, '#4fbccb');
      g.px(xx - (ww >> 1), y, '#e8fbff');
    }
  };
  prism(sx + 8, 14, 7, -0.3); prism(sx + 24, 12, 6, 0.35); prism(sx + 16, 24, 10, 0.02); prism(sx + 12, 9, 5, -0.1);
  const tw = Math.floor(time / 300) % 4;
  const sp = [[sx + 15, sy + 6], [sx + 6, sy + 16], [sx + 26, sy + 14], [sx + 18, sy + 12]][tw];
  g.rect(sp[0] - 2, sp[1], 5, 1, '#ffffff'); g.rect(sp[0], sp[1] - 2, 1, 5, '#ffffff');
  g.rect(sx, sy, TS, 1, here ? 'rgba(240,220,120,.9)' : 'rgba(120,220,235,.45)');
  g.rect(sx, sy + TS - 1, TS, 1, here ? 'rgba(240,220,120,.9)' : 'rgba(120,220,235,.45)');
  g.rect(sx, sy, 1, TS, here ? 'rgba(240,220,120,.9)' : 'rgba(120,220,235,.45)');
  g.rect(sx + TS - 1, sy, 1, TS, here ? 'rgba(240,220,120,.9)' : 'rgba(120,220,235,.45)');
}
