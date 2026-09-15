/* LA SCENETTA DELL'ANGOLO nel menu del titolo (solo computer).
   "Qualcosa inerente agli scheletri che puoi scavare, mezzo nel menu in un angolo e mezzo fuori",
   e poi "qualcosa di un po' più dinamico di una immagine buttata lì": un cranio di tirannosauro
   mezzo sepolto in un cumulo di terra, qualche costola che affiora, e Digsy sopra il cumulo che lo
   libera a colpi di piccone. Ogni colpo solleva polvere e fa rotolare sassolini fuori dalla
   finestra; ogni tanto un luccichio corre sui denti.
   Tutto disegnato a pixel su una tela piccola (W×H) ingrandita dal CSS a scala intera.
   La fase viene SOLO dal tempo. */
import { GRIP } from './bodyArt.js';

export const SCENE_W = 150, SCENE_H = 100;

const OUT = '#20170f', B1 = '#f1e8d2', B2 = '#d6c9a8', B3 = '#a89a7c', B4 = '#76694f';
const D1 = '#a8805a', D2 = '#8a6440', D3 = '#6b4a2e', D4 = '#4f3520';

function hash(i, s) { let h = Math.imul(i | 0, 374761393) ^ Math.imul(s | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

/* cumulo di terra a strati: una COLLINETTA che scende fino a zero sui due lati (la tela non deve
   vedersi) e appoggia su un fondo con gli angoli a gradini; bordo alto mosso, sassi */
/* il mucchio occupa solo la META' centrale della finestrella: prima era una collina larga quanto
   tutta la tela e mangiava l'angolo del menu */
export const MOUND_X0 = 38, MOUND_W = 74;
export function moundTop(x) {
  const u = (x - MOUND_X0) / MOUND_W;
  if (u <= 0 || u >= 1) return SCENE_H;                       // fuori dal mucchio: niente terra
  return Math.round(SCENE_H - 8 - Math.pow(Math.sin(Math.PI * u), 0.4) * 24 + (hash(x >> 2, 3) - 0.5) * 3);
}
function mound(c) {
  for (let x = MOUND_X0; x < MOUND_X0 + MOUND_W; x++) {
    const top = moundTop(x), edge = Math.min(x - MOUND_X0, MOUND_X0 + MOUND_W - 1 - x), bottom = SCENE_H - 4 - (edge < 4 ? 4 - edge : 0);
    if (top >= bottom) continue;
    c.fillStyle = OUT; c.fillRect(x, top - 1, 1, 1); c.fillRect(x, bottom, 1, 1);
    for (let y = top; y < bottom; y++) {
      const d = y - top;
      c.fillStyle = d < 2 ? D1 : ((y + (hash(x >> 3, 5) * 4 | 0)) % 14 < 2) ? D4 : d < 12 ? D2 : D3;
      c.fillRect(x, y, 1, 1);
    }
  }
  /* qualche zolla scura sulla terra smossa: i sassolini chiari sembravano cartacce */
  for (let i = 0; i < 5; i++) {
    const x = MOUND_X0 + 10 + Math.floor(hash(i, 7) * (MOUND_W - 20)), y = Math.max(moundTop(x) + 6, 82 + Math.floor(hash(i, 8) * 8));
    c.fillStyle = D4; c.fillRect(x, y, 3, 2); c.fillStyle = D3; c.fillRect(x, y, 3, 1);
  }
}
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
const SWING = 1200;

/* LA SCENETTA: Digsy scava sulla collinetta, un colpo di piccone dopo l'altro, con un po' di
   polvere. Basta così: è una finestrella di 150 × 100 px in un angolo del menu, e il cranio di
   tirannosauro che stava qui prima (110 px, sepolto sotto sei zolle da spaccare) se la mangiava
   tutta. Il piccone sta NELLE MANI: la presa è `GRIP` di bodyArt, la stessa che usa il gioco
   quando si scava davvero. La fase viene SOLO dal tempo (REGOLE FERREE #1). */
export function drawCornerScene(c, t, drawHero) {
  c.clearRect(0, 0, SCENE_W, SCENE_H);
  mound(c);
  const hx = MOUND_X0 + MOUND_W - 34, hy0 = moundTop(hx + 16) - 29;    // in piedi sul mucchio
  const u = (t % SWING) / SWING;
  /* IL PICCONE RUOTA ATTORNO ALLA MANO, senza salti: carica lenta all'indietro, colpo veloce in
     avanti, poi resta piantato un attimo. Prima erano tre posizioni staccate e il braccio andava
     per conto suo (segnalato). Angolo in gradi: 0 = verso destra, cresce verso il basso. */
  let ang, pose, bob = 0;
  if (u < 0.55) { const k = u / 0.55; ang = -28 - 34 * k; pose = 'lift'; bob = k > 0.8 ? -1 : 0; }        // si carica, sopra la spalla
  else if (u < 0.72) { const k = (u - 0.55) / 0.17; ang = -62 - 142 * (k * k * (3 - 2 * k)); pose = k < 0.3 ? 'lift' : 'strike'; }   // cala, prendendo velocità
  else { ang = -204; pose = 'strike'; bob = 1; }                                                          // piantato
  const oy = hy0 + bob;
  const [gx, gy] = GRIP[pose].side;                       // la mano, in coordinate dello sprite
  const handX = hx + (31 - gx), handY = oy + gy;          // guarda a sinistra: lo sprite si specchia
  const rad = ang * Math.PI / 180, L = 15;
  drawHero(c, hx, oy, 'left', 0, false, pose);
  pick(c, handX, handY, Math.round(handX + Math.cos(rad) * L), Math.round(handY + Math.sin(rad) * L));   // l'attrezzo sta DAVANTI a lui, come in gioco
  if (u >= 0.72) {                                        // polvere: pochi puntini dove batte
    const k = (u - 0.72) / 0.28, ix = handX + Math.cos(rad) * L, iy = handY + Math.sin(rad) * L;
    for (let i = 0; i < 7; i++) {
      if (hash(i, 41) < k * 0.8) continue;
      const a2 = Math.PI + hash(i, 42) * Math.PI, r = 2 + k * (7 + hash(i, 43) * 7);
      c.fillStyle = i % 3 ? '#e6d6b2' : '#c9b48c';
      c.fillRect(Math.round(ix + Math.cos(a2) * r), Math.round(iy + Math.sin(a2) * r * 0.5 - k * 4), 1, 1);
    }
  }
}
