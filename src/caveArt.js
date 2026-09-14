/* GROTTE — l'aspetto dell'interno. Modulo puro: disegna col pennello che riceve; quello che
   serve sapere della grotta (dove c'è roccia, dove un giacimento, dov'è l'ingresso) arriva da
   `info`, così qui non si importa la logica.

   Seconda versione. La prima aveva le pareti viola e le decorazioni tirate a sorte casella per
   casella: "tante cose messe lì a caso senza senso". Ora:
     · la ROCCIA è pietra grigio-bruna: cresta irregolare vista dall'alto, bordo frastagliato, e
       dove guarda il pavimento una parete a strati con le stalattiti che gocciolano;
     · ogni decorazione ha un MOTIVO per stare dov'è: stalagmiti e pozze solo sotto le
       stalattiti (lì cade l'acqua), detriti ai piedi delle pareti, funghi luminosi a gruppi nelle
       zone umide, ossa fossili incastrate nella roccia, vene di cristallo solo vicino ai
       giacimenti, radici e muschio vicino all'ingresso dove arriva la luce;
     · il pavimento in mezzo resta quasi pulito: si legge subito dove si cammina. */
import { vhash, smooth } from './noise.js';

const TS = 32;
const LN = '#15110d';
const ROCK = { top: ['#5e554b', '#665c51', '#6f6558'], lite: '#8a7f70', dark: '#3a332c', face: '#4a4239', faceD: '#352f29', faceL: '#6d6356' };
const EARTH = ['#3b332b', '#40372e', '#463c32'];

/* alone tondo a scalini (non un quadrato): tre ellissi sempre più chiare verso il centro */
function glowE(g, cx, cy, rx, ry, rgb, a) {
  for (const [k, al] of [[1, a * 0.45], [0.66, a * 0.75], [0.36, a]]) {
    const RX = Math.round(rx * k), RY = Math.max(1, Math.round(ry * k));
    for (let y = -RY; y <= RY; y++) { const w = Math.round(RX * Math.sqrt(Math.max(0, 1 - (y * y) / (RY * RY)))); if (w > 0) g.rect(cx - w, cy + y, w * 2, 1, 'rgba(' + rgb + ',' + al.toFixed(3) + ')'); }
  }
}
function mixL(c) { const n = parseInt(c.slice(1), 16), f = v => Math.min(255, Math.round(v * 1.12)); return '#' + ((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1); }
/* zone umide: un rumore largo decide dove la grotta gocciola (pozze, funghi, muschio) */
export function damp(tx, ty) { return smooth(tx * 0.12 + 50, ty * 0.12 + 50, 311) > 0.58; }

/* ---------- ROCCIA ---------- */
export function caveWall(g, tx, ty, sx, sy, info, time) {
  const open = { above: !info.solid(tx, ty - 1), below: !info.solid(tx, ty + 1), left: !info.solid(tx - 1, ty), right: !info.solid(tx + 1, ty) };
  /* cresta vista dall'alto: massi a grumi, niente scacchiera */
  const H = TS >> 1;
  for (let q = 0; q < 4; q++) {
    const qx = q & 1, qy = q >> 1, n = smooth((tx + qx * 0.5) * 0.4, (ty + qy * 0.5) * 0.4, 303);
    g.rect(sx + qx * H, sy + qy * H, H, H, ROCK.top[n < 0.4 ? 0 : n < 0.68 ? 1 : 2]);
  }
  for (let k = 0; k < 3; k++) {                                                   // massi: grumo chiaro con l'ombra sotto
    if (vhash(tx, ty, 410 + k) > 0.6) continue;
    const x = sx + 4 + Math.floor(vhash(tx, ty, 420 + k) * 20), y = sy + 4 + Math.floor(vhash(tx, ty, 430 + k) * 18), r = 3 + Math.floor(vhash(tx, ty, 440 + k) * 4);
    g.rect(x - r, y + 1, r * 2, 2, ROCK.dark); g.rect(x - r + 1, y - r + 2, r * 2 - 2, r, ROCK.top[2]); g.rect(x - r + 1, y - r + 2, r, 1, ROCK.lite);
  }
  if (vhash(tx, ty, 450) < 0.5) { const x = sx + 3 + Math.floor(vhash(tx, ty, 451) * 22); g.rect(x, sy + 4, 1, 8, LN); g.rect(x + 1, sy + 11, 1, 7, LN); g.rect(x + 2, sy + 17, 1, 5, LN); g.rect(x + 1, sy + 4, 1, 6, ROCK.lite); }   // spaccatura
  /* la cresta si scurisce verso il bordo: si legge come roccia che sale, non come pavimento */
  if (open.left) g.rect(sx, sy, 6, TS, 'rgba(20,16,12,.18)');
  if (open.right) g.rect(sx + TS - 6, sy, 6, TS, 'rgba(20,16,12,.28)');
  if (open.below) g.rect(sx, sy + TS - 26, TS, 6, 'rgba(20,16,12,.2)');
  /* bordi frastagliati verso il pavimento: a tratti di 4px di spessore diverso */
  const jag = (i, k) => 1 + Math.floor(vhash(tx * 8 + k, ty * 8 + i, 460) * 3);
  if (open.left) for (let k = 0; k < TS; k += 4) { const d = jag(0, k); g.rect(sx, sy + k, d, 4, EARTH[1]); g.rect(sx + d, sy + k, 1, 4, LN); g.rect(sx + d + 1, sy + k, 1, 4, ROCK.lite); }
  if (open.right) for (let k = 0; k < TS; k += 4) { const d = jag(1, k); g.rect(sx + TS - d, sy + k, d, 4, EARTH[1]); g.rect(sx + TS - d - 1, sy + k, 1, 4, LN); g.rect(sx + TS - d - 2, sy + k, 1, 4, ROCK.dark); }
  if (open.above) for (let k = 0; k < TS; k += 4) { const d = jag(2, k); g.rect(sx + k, sy, 4, d, EARTH[0]); g.rect(sx + k, sy + d, 4, 1, LN); g.rect(sx + k, sy + d + 1, 4, 1, ROCK.lite); }
  if (!open.below) return;
  /* PARETE che guarda il pavimento: un ammasso di MASSI tondeggianti su due file sfalsate, ognuno
     col suo contorno, la luce in alto a sinistra e il buio nelle fessure. Le versioni a fasce e a
     lastroni verticali sembravano uno scaffale e una staccionata. */
  const FH = 22, y0 = sy + TS - FH;
  g.rect(sx, y0, TS, FH, '#1f1a15');                                          // fessure fra i massi
  const boulder = (cx, cy, rx, ry, seed) => {
    const t2 = vhash(tx * 13 + seed, ty, 505);
    const base = t2 < 0.35 ? ROCK.faceL : t2 < 0.75 ? ROCK.face : '#554c42';
    for (let y = -ry - 1; y <= ry + 1; y++) { const w = Math.round((rx + 1) * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 1) * (ry + 1))))); if (w > 0) g.rect(cx - w, cy + y, w * 2, 1, LN); }
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); if (w <= 0) continue;
      g.rect(cx - w, cy + y, w * 2, 1, y > ry * 0.35 ? ROCK.faceD : base);
      g.rect(cx - w, cy + y, Math.max(1, Math.round(w * 0.5)), 1, y < ry * 0.4 ? mixL(base) : base);   // lato sinistro in luce
    }
    g.rect(cx - Math.round(rx * 0.5), cy - ry + 1, Math.max(2, Math.round(rx * 0.6)), 1, ROCK.lite);    // spigolo alto
    g.px(cx - Math.round(rx * 0.4), cy - ry + 2, '#a89c8a');
  };
  /* fila di dietro (più in alto) e fila davanti, con larghezze diverse per casella */
  for (const [row, cy, ry] of [[0, y0 + 6, 6], [1, y0 + 15, 6]]) {
    let x = sx - 4 + (row ? 5 : 0) - Math.floor(vhash(tx, ty, 506 + row) * 6);
    let i = 0;
    while (x < sx + TS + 4) {
      const rx = 5 + Math.floor(vhash(tx * 5 + i, ty, 507 + row) * 4);
      boulder(x + rx, cy + Math.floor(vhash(tx * 5 + i, ty, 508 + row) * 3) - 1, rx, ry - Math.floor(vhash(tx * 5 + i, ty, 509) * 2), i * 3 + row * 11);
      x += rx * 2 - 1; i++;
    }
  }
  g.rect(sx, sy + TS - 2, TS, 2, '#1f1a15');
  g.rect(sx, sy + TS, TS, 3, 'rgba(8,6,4,.35)');                              // ombra di contatto
  /* ossa fossili incastrate nella roccia: la grotta è piena di storia */
  if (vhash(tx, ty, 470) < 0.12) {
    const x = sx + 7 + Math.floor(vhash(tx, ty, 471) * 12), y = sy + TS - 12;
    g.rect(x - 3, y - 3, 18, 8, LN);
    g.rect(x, y - 1, 12, 3, '#d8cfb8'); g.rect(x - 2, y - 2, 4, 5, '#e6dfcb'); g.rect(x + 10, y - 2, 4, 5, '#e6dfcb');
    g.px(x - 1, y - 2, '#f6f1e4'); g.rect(x + 2, y + 1, 8, 1, '#b8ad92');
  }
  /* vene di cristallo SOLO vicino a un giacimento: piccoli prismi che spuntano dalla crepa */
  if (info.nodeNear(tx, ty, 3)) {
    const x = sx + 6 + Math.floor(vhash(tx, ty, 480) * 18), y = sy + TS - 6;
    for (const [dx, h, lean] of [[0, 8, -1], [4, 11, 0], [8, 6, 1]]) for (let k = 0; k < h; k++) {
      const w = k > h - 3 ? 1 : 2, xx = x + dx + Math.round(lean * k / 4);
      g.rect(xx - 1, y - k, w + 2, 1, '#123840'); g.rect(xx, y - k, w, 1, k % 3 ? '#4fbccb' : '#a6ecf2');
    }
  }

}

/* ---------- PAVIMENTO ---------- */
export function caveFloor(g, tx, ty, sx, sy, info, time) {
  const H = TS >> 1;
  for (let q = 0; q < 4; q++) {
    const qx = q & 1, qy = q >> 1, n = smooth((tx + qx * 0.5) * 0.3, (ty + qy * 0.5) * 0.3, 304);
    g.rect(sx + qx * H, sy + qy * H, H, H, EARTH[n < 0.4 ? 0 : n < 0.7 ? 1 : 2]);
  }
  const wallAbove = info.solid(tx, ty - 1), wallL = info.solid(tx - 1, ty), wallR = info.solid(tx + 1, ty), wallBelow = info.solid(tx, ty + 1);
  const nearWall = wallAbove || wallL || wallR || wallBelow;
  const wet = damp(tx, ty);
  if (wallAbove) g.rect(sx, sy, TS, 6, 'rgba(8,6,4,.35)');                        // ombra ai piedi della parete
  /* in mezzo: solo qualche sassolino e una crepa rara */
  if (!nearWall) {
    if (vhash(tx, ty, 500) < 0.25) { const x = sx + 4 + Math.floor(vhash(tx, ty, 501) * 22), y = sy + 6 + Math.floor(vhash(tx, ty, 502) * 20); g.rect(x, y, 2, 1, '#56493d'); }
    if (vhash(tx, ty, 503) < 0.06) { const x = sx + 4 + Math.floor(vhash(tx, ty, 504) * 16); g.rect(x, sy + 14, 8, 1, '#2e2720'); g.rect(x + 8, sy + 15, 5, 1, '#2e2720'); }
  } else {
    /* ai piedi delle pareti: detriti caduti */
    const side = wallAbove ? 0 : wallL ? 1 : wallR ? 2 : 3;
    for (let k = 0; k < 4; k++) {
      if (vhash(tx, ty, 510 + k) > 0.55) continue;
      const a = 3 + Math.floor(vhash(tx, ty, 520 + k) * 24), b = 3 + Math.floor(vhash(tx, ty, 530 + k) * 8), r = 1 + Math.floor(vhash(tx, ty, 540 + k) * 3);
      const x = side === 0 ? sx + a : side === 1 ? sx + b : side === 2 ? sx + TS - b : sx + a;
      const y = side === 0 ? sy + b + 4 : side === 3 ? sy + TS - b : sy + a;
      g.rect(x - r, y, r * 2 + 1, r + 1, LN); g.rect(x - r, y - 1, r * 2, r + 1, '#6a5f52'); g.px(x - r, y - 1, '#8a7f70');
    }
  }
  /* STALATTITI che pendono dal bordo della parete sopra, con la goccia che cade. Stanno qui e non
     nella parete: la casella di pavimento si disegna dopo e le copriva. */
  if (wallAbove && vhash(tx, ty - 1, 490) < 0.45) {
    const x = sx + 6 + Math.floor(vhash(tx, ty - 1, 491) * 18), len = 6 + Math.floor(vhash(tx, ty - 1, 492) * 6);
    for (let k = 0; k < len; k++) { const w = Math.max(1, Math.round(3 * (1 - k / len))); g.rect(x - w - 1, sy + k, w * 2 + 2, 1, LN); g.rect(x - w, sy + k, w * 2, 1, ROCK.face); g.px(x - w, sy + k, ROCK.faceL); }
    const fall = (time / 1400 + vhash(tx, ty - 1, 493)) % 1;
    if (fall < 0.7) g.rect(x - 1, sy + len + Math.round(fall * 12), 1, 2, '#9fc4d8');
  }
  /* sotto una stalattite: stalagmite o pozza, dove cade davvero la goccia */
  if (wallAbove && vhash(tx, ty - 1, 490) < 0.45) {
    const x = sx + 6 + Math.floor(vhash(tx, ty - 1, 491) * 18);
    if (wet) {
      const cy = sy + 20;
      for (let y = -4; y <= 4; y++) { const w = Math.round(10 * Math.sqrt(1 - (y * y) / 20)); g.rect(x - w, cy + y, w * 2, 1, y < -1 ? '#23303a' : '#2c3c48'); }
      const ring = (time / 1400 + vhash(tx, ty - 1, 493)) % 1;
      if (ring > 0.7) { const rr = Math.round((ring - 0.7) * 25); g.rect(x - rr, cy, rr * 2, 1, 'rgba(160,200,220,.6)'); }
      g.rect(x - 5, cy - 2, 3, 1, '#6f8fa4');
    } else if (vhash(tx, ty, 550) < 0.7) {
      const b = sy + 24, hgt = 8 + Math.floor(vhash(tx, ty, 551) * 8);
      g.rect(x - 6, b, 12, 2, 'rgba(0,0,0,.35)');
      /* STALAGMITE: cono arrotondato con i gradini di calcare, luce a sinistra e punta chiara */
      for (let k = 0; k < hgt; k++) {
        const u = k / hgt, w = Math.max(1, Math.round(6 * Math.pow(1 - u, 0.8))) + (k % 4 === 0 && u < 0.7 ? 1 : 0);
        g.rect(x - w - 1, b - k, w * 2 + 2, 1, LN);
        g.rect(x - w, b - k, w * 2, 1, ROCK.face);
        g.rect(x - w, b - k, Math.max(1, Math.round(w * 0.7)), 1, ROCK.faceL);
        g.rect(x - w, b - k, 1, 1, ROCK.lite);
        g.rect(x + w - 1, b - k, 1, 1, ROCK.faceD);
      }
      g.rect(x - 1, b - hgt, 2, 1, '#c8bca8');
    }
  }
  /* funghi luminosi: a gruppi, solo nelle zone umide e contro una parete */
  if (wet && nearWall && vhash(tx, ty, 560) < 0.4) {
    const glow = 0.16 + 0.07 * Math.sin(time / 1100 + tx * 0.7 + ty);
    const bx = sx + 6 + Math.floor(vhash(tx, ty, 561) * 14), by = sy + (wallAbove ? 12 : 18);
    glowE(g, bx + 7, by + 1, 20, 12, '110,230,200', glow);
    for (const [dx, h] of [[0, 5], [5, 8], [10, 4], [14, 6]]) {
      g.rect(bx + dx, by + 6 - h, 1, h, '#cfeee4');
      g.rect(bx + dx - 2, by + 4 - h, 5, 3, LN); g.rect(bx + dx - 1, by + 4 - h, 3, 2, '#6fe0c8'); g.px(bx + dx, by + 4 - h, '#e0fff6');
    }
  }
  /* muschio nelle zone umide vicino alle pareti */
  if (wet && nearWall && vhash(tx, ty, 570) < 0.5) { const x = sx + Math.floor(vhash(tx, ty, 571) * 20); g.rect(x, sy + (wallAbove ? 6 : 26), 10, 2, '#3f5a3a'); g.rect(x + 2, sy + (wallAbove ? 5 : 25), 5, 1, '#5a7a4e'); }
  /* vicino all'ingresso: radici che scendono e un filo di verde, dove arriva la luce */
  if (info.nearEntrance(tx, ty) && wallAbove) {
    for (let k = 0; k < 3; k++) { const x = sx + 5 + k * 9 + Math.floor(vhash(tx, ty, 580 + k) * 4), len = 6 + Math.floor(vhash(tx, ty, 590 + k) * 10); for (let j = 0; j < len; j++) g.rect(x + (j % 5 === 4 ? 1 : 0), sy + j, 1, 1, '#6a5238'); }
    g.rect(sx + 2, sy + 1, TS - 4, 2, '#4f6a3a');
  }
}

/* ---------- GIACIMENTO: grappolo di cristalli che spunta dalla roccia smossa ---------- */
export function caveCrystal(g, sx, sy, time, here) {
  const pulse = 0.14 + 0.06 * Math.sin(time / 700);
  glowE(g, sx + 16, sy + 16, 30, 24, '120,220,235', pulse);
  for (let y = -5; y <= 5; y++) { const w = Math.round(14 * Math.sqrt(1 - (y * y) / 30)); g.rect(sx + 16 - w, sy + 25 + y, w * 2, 1, y < 0 ? '#5a5048' : '#463e36'); }
  for (const [x, y] of [[4, 27], [26, 24], [8, 22]]) { g.rect(sx + x, sy + y, 3, 2, LN); g.rect(sx + x, sy + y - 1, 3, 2, '#6e6358'); }
  const prism = (x, h, w, lean) => {
    for (let k = 0; k < h; k++) {
      const u = k / h, ww = u > 0.72 ? Math.max(1, Math.round(w * (1 - u) * 3.6)) : w, xx = x + Math.round(lean * k), y = sy + 25 - k;
      g.rect(xx - (ww >> 1) - 1, y, ww + 2, 1, '#123840');
      g.rect(xx - (ww >> 1), y, ww >> 1, 1, '#a6ecf2');
      g.rect(xx, y, ww - (ww >> 1), 1, '#4fbccb');
      g.px(xx - (ww >> 1), y, '#e8fbff');
    }
  };
  prism(sx + 9, 13, 7, -0.35); prism(sx + 23, 11, 6, 0.4); prism(sx + 16, 23, 10, 0.02); prism(sx + 12, 8, 5, -0.12);
  const tw = Math.floor(time / 450) % 4;
  const sp = [[sx + 15, sy + 6], [sx + 6, sy + 16], [sx + 26, sy + 14], [sx + 18, sy + 12]][tw];
  g.rect(sp[0] - 2, sp[1], 5, 1, '#ffffff'); g.rect(sp[0], sp[1] - 2, 1, 5, '#ffffff');
  /* il segno "qui si scava": angoli della casella, gialli se ci sei sopra */
  const c = here ? 'rgba(240,220,120,.95)' : 'rgba(150,225,235,.55)';
  for (const [x, y, dx, dy] of [[sx, sy, 1, 1], [sx + TS - 1, sy, -1, 1], [sx, sy + TS - 1, 1, -1], [sx + TS - 1, sy + TS - 1, -1, -1]]) {
    g.rect(Math.min(x, x + dx * 5), y, 6, 1, c); g.rect(x, Math.min(y, y + dy * 5), 1, 6, c);
  }
}
