/* LA SCENETTA DELL'ANGOLO nel menu del titolo (solo computer).
   "Qualcosa inerente agli scheletri che puoi scavare, mezzo nel menu in un angolo e mezzo fuori",
   e poi "qualcosa di un po' più dinamico di una immagine buttata lì": un cranio di tirannosauro
   mezzo sepolto in un cumulo di terra, qualche costola che affiora, e Digsy sopra il cumulo che lo
   libera a colpi di piccone. Ogni colpo solleva polvere e fa rotolare sassolini fuori dalla
   finestra; ogni tanto un luccichio corre sui denti.
   Tutto disegnato a pixel su una tela piccola (W×H) ingrandita dal CSS a scala intera.
   La fase viene SOLO dal tempo. */
export const SCENE_W = 150, SCENE_H = 100;

const OUT = '#20170f', B1 = '#f1e8d2', B2 = '#d6c9a8', B3 = '#a89a7c', B4 = '#76694f';
const D1 = '#a8805a', D2 = '#8a6440', D3 = '#6b4a2e', D4 = '#4f3520', PEB = '#9a9285', PEB2 = '#c9c2b2';

function hash(i, s) { let h = Math.imul(i | 0, 374761393) ^ Math.imul(s | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

/* cumulo di terra a strati: una COLLINETTA che scende fino a zero sui due lati (la tela non deve
   vedersi) e appoggia su un fondo con gli angoli a gradini; bordo alto mosso, sassi */
export function moundTop(x) { return Math.round(SCENE_H - 8 - Math.pow(Math.sin(Math.PI * x / SCENE_W), 0.32) * 46 + (hash(x >> 2, 3) - 0.5) * 3); }
function mound(c) {
  for (let x = 0; x < SCENE_W; x++) {
    const top = moundTop(x), edge = Math.min(x, SCENE_W - 1 - x), bottom = SCENE_H - 4 - (edge < 4 ? 4 - edge : 0);
    if (top >= bottom) continue;
    c.fillStyle = OUT; c.fillRect(x, top - 1, 1, 1); c.fillRect(x, bottom, 1, 1);
    for (let y = top; y < bottom; y++) {
      const d = y - top;
      c.fillStyle = d < 2 ? D1 : ((y + (hash(x >> 3, 5) * 4 | 0)) % 14 < 2) ? D4 : d < 12 ? D2 : D3;
      c.fillRect(x, y, 1, 1);
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = 10 + Math.floor(hash(i, 7) * (SCENE_W - 20)), y = Math.max(moundTop(x) + 6, 60 + Math.floor(hash(i, 8) * 30)), r = 1 + Math.floor(hash(i, 9) * 2);
    if (y > SCENE_H - 8) continue;
    c.fillStyle = OUT; c.fillRect(x - r - 1, y - r, r * 2 + 2, r * 2 + 1);
    c.fillStyle = PEB; c.fillRect(x - r, y - r, r * 2, r * 2); c.fillStyle = PEB2; c.fillRect(x - r, y - r, r, 1);
  }
}
/* CRANIO di tirannosauro di profilo (guarda a destra), la mandibola resta sotto terra */
function skull(c, t) {
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  const inside = (x, y) => {
    /* cranio: ellisse allungata + muso che si affusola */
    const e1 = ((x - 42) / 26) ** 2 + ((y - 44) / 15) ** 2 < 1;
    const snout = x >= 55 && x <= 96 && y >= 40 - (96 - x) * 0.12 && y <= 56;
    const tip = ((x - 95) / 5) ** 2 + ((y - 49) / 7) ** 2 < 1;
    return (e1 || snout || tip) && y <= 58;
  };
  for (let y = 26; y <= 59; y++) for (let x = 14; x <= 102; x++) {
    if (!inside(x, y)) { if (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1)) px(x, y, OUT); continue; }
    const top = !inside(x, y - 2), bot = !inside(x, y + 2);
    px(x, y, top ? B1 : bot ? B3 : (x + y) % 9 === 0 ? B3 : B2);
  }
  /* aperture del cranio: orbita, finestre temporali, narice */
  const hole = (cx, cy, rx, ry) => { for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) px(x, y, y < cy - ry * 0.3 ? OUT : '#3a2c1e'); };
  hole(48, 40, 5, 6); hole(30, 42, 7, 5); hole(70, 44, 7, 4); hole(89, 45, 3, 2);
  for (let x = 18; x <= 90; x += 3) px(x, 30 + Math.round(Math.abs(x - 42) * 0.12), B4);   // cresta
  /* denti lungo la mascella: triangoli bianchi che scendono nella terra */
  for (let x = 54; x <= 96; x += 5) { const h = x < 80 ? 5 : 4; for (let k = 0; k < h; k++) { px(x - 1 + Math.floor(k / 2), 58 + k, OUT); px(x + 2 - Math.floor(k / 2), 58 + k, OUT); for (let w = Math.floor(k / 2); w <= 2 - Math.floor(k / 2); w++) px(x - 1 + w + 1 - 1, 58 + k, k < 2 ? B1 : B2); } }
  /* LUCCICHIO che corre sui denti ogni ~3 secondi */
  const g = (t / 3200) % 1;
  if (g < 0.35) {
    const gx = Math.round(20 + g / 0.35 * 80);
    for (let y = 30; y <= 60; y++) { const x = gx + Math.round((y - 30) * 0.3); if (inside(x, y)) px(x, y, '#ffffff'); }
  }
}
/* costole che affiorano a sinistra */
function ribs(c) {
  for (const [bx, h] of [[4, 18], [12, 22], [20, 16]]) {
    for (let k = 0; k <= h; k++) {
      const x = bx + Math.round(Math.sin(k / h * 1.3) * 5), y = 72 - k;
      c.fillStyle = OUT; c.fillRect(x - 1, y, 4, 1);
      c.fillStyle = k > h - 3 ? B1 : B2; c.fillRect(x, y, 2, 1);
    }
  }
}

/* ZOLLE che coprono il cranio: una si stacca a ogni colpo */
const CLODS = [[90, 49, 20, 14], [72, 42, 22, 16], [53, 38, 22, 17], [34, 40, 22, 18], [19, 46, 18, 15], [58, 55, 34, 10]];   // grandi e sovrapposte: all'inizio il cranio è quasi tutto sotto terra
function clod(c, x, y, w, h, k) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const e = ((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2; if (e > 1) continue;
    c.fillStyle = e > 0.72 ? OUT : yy < h * 0.35 ? D1 : (hash(xx * 31 + yy, k + 50) < 0.12 ? D4 : D2); c.fillRect(x - (w >> 1) + xx, y - (h >> 1) + yy, 1, 1);
  }
}
/* piccone in mano: manico dalla mano alla testa curva */
function pick(c, hx, hy, tx, ty) {
  const n = Math.max(1, Math.max(Math.abs(tx - hx), Math.abs(ty - hy)));
  for (const pass of [0, 1]) for (let i = 0; i <= n; i++) {
    const x = Math.round(hx + (tx - hx) * i / n), y = Math.round(hy + (ty - hy) * i / n);
    c.fillStyle = pass ? '#b07c4a' : OUT; c.fillRect(x - (pass ? 0 : 1), y - (pass ? 0 : 1), pass ? 1 : 3, pass ? 1 : 3);
  }
  const ang = Math.atan2(ty - hy, tx - hx), nx = -Math.sin(ang), ny = Math.cos(ang);
  for (const pass of [0, 1]) for (let s2 = -6; s2 <= 6; s2++) {
    const bend = -(s2 * s2) * 0.06, x = Math.round(tx + nx * s2 + Math.cos(ang) * bend), y = Math.round(ty + ny * s2 + Math.sin(ang) * bend);
    c.fillStyle = pass ? (Math.abs(s2) > 4 ? '#7f776a' : '#c9c2b2') : OUT; c.fillRect(x - (pass ? 0 : 1), y - (pass ? 0 : 1), pass ? 1 : 3, pass ? 1 : 3);
  }
}
const CYCLE = 13000, STRIKE = 1100, NSTRIKES = CLODS.length;

/* la scena intera; drawHero viene da fuori (sprites.js), così questo modulo resta disegno puro.
   Un CICLO: sei colpi (ognuno stacca una zolla dal cranio e fa rotolare sassi giù dal cumulo),
   poi Digsy saltella contento col cranio liberato che luccica, poi la terra torna e si ricomincia. */
export function drawCornerScene(c, t, drawHero) {
  c.clearRect(0, 0, SCENE_W, SCENE_H);
  const ct = t % CYCLE, digEnd = NSTRIKES * STRIKE, joyEnd = digEnd + 3200;
  const hits = ct < digEnd ? Math.floor(ct / STRIKE) : NSTRIKES;              // zolle già staccate
  mound(c);
  ribs(c);
  skull(c, ct > digEnd ? t : -1e9);                                           // luccica solo quando è libero
  /* zolle ancora sopra; nel ritorno tornano giù a gradini */
  for (let i = 0; i < NSTRIKES; i++) {
    const back = ct > joyEnd ? Math.floor((ct - joyEnd) / ((CYCLE - joyEnd) / NSTRIKES)) : -1;
    if (i >= hits || i <= back) { const [x, y, w, h] = CLODS[i]; clod(c, x, y, w, h, i); }
  }
  const hx = 100, base = moundTop(116) - 31;
  if (ct < digEnd) {
    const u = (ct % STRIKE) / STRIKE;
    const stage = u < 0.5 ? 'carica' : u < 0.62 ? 'fendente' : 'impatto';
    const hy = base + (stage === 'impatto' ? 2 : stage === 'carica' ? -1 : 0);
    /* il piccone ha una LUNGHEZZA sola e colpisce sempre il muso, accanto a Digsy: la zolla lontana
       la fa saltare la crepa che corre lungo l'osso (un manico lungo quanto il cranio era una spada) */
    const handX = hx + (stage === 'carica' ? 9 : stage === 'fendente' ? 6 : 5), handY = hy + (stage === 'carica' ? 14 : stage === 'fendente' ? 17 : 22);
    const head = stage === 'carica' ? [handX + 2, handY - 15] : stage === 'fendente' ? [handX - 12, handY - 8] : [handX - 11, handY + 5];
    drawHero(c, hx, hy, 'left', 0, false, stage === 'carica' ? 'lift' : 'strike');
    pick(c, handX, handY, head[0], head[1]);
    if (stage === 'impatto') {
      const k = (u - 0.62) / 0.38;
      if (k < 0.25) { c.fillStyle = '#fff6c8'; c.fillRect(head[0] - 6, head[1] - 1, 5, 3); c.fillRect(head[0] - 5, head[1] - 3, 3, 7); }
      /* la zolla che si stacca vola via e i sassi rotolano giù dal cumulo, rimbalzando */
      const [cx0, cy0, cw, ch] = CLODS[Math.floor(ct / STRIKE)];
      /* CREPA luminosa che corre sull'osso dal punto colpito alla zolla */
      const cr = Math.min(1, k * 2.5), ex = head[0] + (cx0 - head[0]) * cr, ey = head[1] + (cy0 - head[1]) * cr;
      const steps = Math.max(1, Math.round(Math.abs(ex - head[0])));
      for (let i = 0; i <= steps; i++) { const x = Math.round(head[0] + (ex - head[0]) * i / steps), y = Math.round(head[1] + (ey - head[1]) * i / steps + ((i >> 1) % 2)); c.fillStyle = k < 0.5 ? '#fff6c8' : B3; c.fillRect(x, y, 1, 1); }
      if (k > 0.35) { const k2 = (k - 0.35) / 0.65; clod(c, Math.round(cx0 - k2 * 26), Math.round(cy0 - Math.sin(Math.PI * Math.min(1, k2 * 1.3)) * 12 + k2 * k2 * 30), Math.max(3, cw - Math.round(k2 * 8)), Math.max(3, ch - Math.round(k2 * 6)), 9); }
      for (let i = 0; i < 6; i++) {
        const sx = cx0 - Math.round((10 + hash(i, 21) * 50) * k), ground = moundTop(Math.max(0, Math.min(SCENE_W - 1, sx))) - 2;
        const sy = Math.min(ground, Math.round(cy0 - Math.abs(Math.sin(k * Math.PI * (1.5 + hash(i, 22)))) * (10 + hash(i, 23) * 8) * (1 - k) + k * 40));
        c.fillStyle = OUT; c.fillRect(sx - 1, sy - 1, 4, 4); c.fillStyle = i % 2 ? PEB2 : D1; c.fillRect(sx, sy, 2, 2);
      }
      for (let i = 0; i < 16; i++) {                                          // polvere a puntini che si allarga e si dirada
        if (hash(i, 41) < k * 0.9) continue;
        const ang = hash(i, 42) * Math.PI * 2, r = 3 + k * (8 + hash(i, 43) * 10);
        c.fillStyle = i % 3 ? '#e6d6b2' : '#c9b48c'; c.fillRect(Math.round(cx0 + Math.cos(ang) * r), Math.round(cy0 - 3 + Math.sin(ang) * r * 0.6 - k * 5), 1, 1);
      }
    }
  } else if (ct < joyEnd) {
    /* CRANIO LIBERATO: saltelli di gioia e stelline */
    const j = (ct - digEnd) / 3200, hop = Math.abs(Math.sin(j * Math.PI * 4)) * 8;
    drawHero(c, hx, base - Math.round(hop), 'left', Math.floor(j * 8) % 2, false, 'lift');
    pick(c, hx + 9, base - Math.round(hop) + 14, hx + 11, base - Math.round(hop) - 1);
    for (let i = 0; i < 6; i++) {
      const ph = (j * 3 + i / 6) % 1, sx = 20 + Math.round(hash(i, 31) * 80), sy = 34 - Math.round(ph * 18);
      if (ph > 0.8) continue;
      c.fillStyle = i % 2 ? '#fff6c8' : '#ffe27a'; c.fillRect(sx, sy - 2, 1, 5); c.fillRect(sx - 2, sy, 5, 1);
    }
  } else {
    drawHero(c, hx, base, 'left', 0, false);
  }
}
