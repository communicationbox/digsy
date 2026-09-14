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

/* la scena intera; drawHero viene da fuori (sprites.js), così questo modulo resta disegno puro */
export function drawCornerScene(c, t, drawHero) {
  c.clearRect(0, 0, SCENE_W, SCENE_H);
  mound(c);
  ribs(c);
  skull(c, t);
  /* DIGSY sopra il cumulo, a destra del cranio, che picchia verso sinistra: carica e colpo */
  const beat = (t / 900) % 1, strike = beat > 0.6;
  const hx = 100, hy = moundTop(116) - 31 + (strike ? 2 : 0);   // i piedi (riga 31 dello sprite) sul bordo della terra
  /* piccone: manico dalla mano alla testa, a sinistra del personaggio */
  const handX = strike ? hx + 16 - 10 : hx + 16 - 7, handY = strike ? hy + 22 : hy + 15;
  const headX = strike ? handX - 12 : handX - 2, headY = strike ? handY + 6 : handY - 14;
  drawHero(c, hx, hy, 'left', 0, false, strike ? 'strike' : 'lift');
  const n = Math.max(Math.abs(headX - handX), Math.abs(headY - handY));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(handX + (headX - handX) * i / n), y = Math.round(handY + (headY - handY) * i / n);
    c.fillStyle = OUT; c.fillRect(x - 1, y - 1, 3, 3);
  }
  for (let i = 0; i <= n; i++) {
    const x = Math.round(handX + (headX - handX) * i / n), y = Math.round(handY + (headY - handY) * i / n);
    c.fillStyle = '#b07c4a'; c.fillRect(x, y, 1, 1);
  }
  const ang = Math.atan2(headY - handY, headX - handX), nx = -Math.sin(ang), ny = Math.cos(ang);
  for (let s = -6; s <= 6; s++) {
    const bend = -(s * s) * 0.06;
    const x = Math.round(headX + nx * s + Math.cos(ang) * bend), y = Math.round(headY + ny * s + Math.sin(ang) * bend);
    c.fillStyle = OUT; c.fillRect(x - 1, y - 1, 3, 3);
  }
  for (let s = -6; s <= 6; s++) {
    const bend = -(s * s) * 0.06;
    const x = Math.round(headX + nx * s + Math.cos(ang) * bend), y = Math.round(headY + ny * s + Math.sin(ang) * bend);
    c.fillStyle = Math.abs(s) > 4 ? '#7f776a' : '#c9c2b2'; c.fillRect(x, y, 1, 1);
  }
  /* COLPO: polvere e sassolini che rotolano via verso sinistra, fuori dalla finestra */
  if (strike) {
    const u = (beat - 0.6) / 0.4;
    for (let i = 0; i < 7; i++) {
      const dx = -Math.round((6 + hash(i, 11) * 30) * u), dy = Math.round(-Math.sin(Math.PI * Math.min(1, u * 1.4)) * (4 + hash(i, 12) * 10) + u * u * 14);
      const x = headX - 4 + dx, y = headY + 2 + dy;
      c.fillStyle = i % 3 ? D1 : PEB2; c.fillRect(x, y, 2, 2);
    }
    if (u < 0.3) { c.fillStyle = '#fff6c8'; c.fillRect(headX - 5, headY - 1, 3, 3); }
    for (let i = 0; i < 4; i++) {                                     // nuvoletta di polvere
      const r = Math.round(2 + u * 6), x = headX - 6 - i * 4, y = headY + 4 - Math.round(u * 4) - i;
      c.fillStyle = `rgba(214,196,160,${(0.55 * (1 - u)).toFixed(2)})`; c.fillRect(x - r, y - 1, r * 2, 3);
    }
  }
}
