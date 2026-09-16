/* MUSEO — l'aspetto della galleria camminabile. Modulo puro: disegna col pennello che riceve
   (g.rect/px/shade8, g.ctx per le icone), la geometria (sale, teche, bancone, muri) resta in
   interior.js e non cambia.

   La galleria era rimasta alla vecchia scala da 16 pixel: panchine grandi come un sasso,
   pareti delle sale di otto pixel, teche piatte, un parquet uguale dappertutto. Accanto alla
   casa e alle botteghe ridisegnate sembrava un altro gioco. Qui ogni pezzo è a 32 px per
   casella con lo stesso trattamento: contorno, luce e ombra, materiali veri — marmo nei
   corridoi, parquet e tappeto nelle sale, vetrine col faretto, colonne che si girano attorno. */
import { iconPaths } from './icons.js';

const TS = 32;
const h32 = (a, b, s) => { let x = Math.imul((a | 0) + 0x9e3779b9, 2654435761) ^ Math.imul((b | 0) + (s | 0) * 97, 40503); x ^= x >>> 15; x = Math.imul(x, 2246822519); x ^= x >>> 13; return (x >>> 0) / 4294967296; };

/* ---------- pavimento ---------- */
/* MARMO dei corridoi: lastre 2×2 caselle a due toni, giunti col bisello, venature rade */
export function drawMarbleTile(g, tx, ty) {
  /* MARMO dei corridoi: lastre 2×2 caselle a due toni con il giunto biselvato, un TASSELLO
     scuro agli incroci (l'intarsio dei musei veri) e venature rade. Prima era una scacchiera
     piatta e slavata. */
  const sx = tx * TS, sy = ty * TS, big = ((tx >> 1) + (ty >> 1)) % 2;
  const c = big ? '#e6ddc8' : '#d8cdb6';
  g.rect(sx, sy, TS, TS, c);
  if (!(tx % 2)) { g.rect(sx, sy, 1, TS, '#b3a78c'); g.rect(sx + 1, sy, 1, TS, '#f6f1e4'); }
  if (!(ty % 2)) { g.rect(sx, sy, TS, 1, '#b3a78c'); g.rect(sx, sy + 1, TS, 1, '#f6f1e4'); }
  if (!(tx % 2) && !(ty % 2)) {                                  // tassello nero agli incroci
    g.rect(sx - 3, sy - 3, 6, 6, '#8f8670'); g.rect(sx - 2, sy - 2, 4, 4, '#4a4436');
    g.rect(sx - 1, sy - 1, 2, 1, '#6a6252');
  }
  if (h32(tx, ty, 1) < 0.16) {                                   // venatura che attraversa la casella
    let x = sx + Math.floor(h32(tx, ty, 2) * 22) + 5, y = sy + 2;
    for (let k = 0; k < 14; k++) { g.rect(x, y, 1, 2, big ? '#cfc4ab' : '#c2b69c'); x += h32(tx, ty, k + 3) < 0.5 ? 1 : -1; y += 2; }
  }
  if (h32(tx, ty, 7) < 0.05) g.rect(sx + 12, sy + 18, 3, 1, '#c8bda3');   // piccolo segno d'usura
}
export function drawParquetTile(g, tx, ty) {
  /* PAVIMENTO IN ASSI LUNGHE: file alte 8 px, giunti sfalsati da una fila all'altra, filo di
     luce sul bordo alto e venature. La spina di pesce a quadrotti si leggeva come un muro di
     mattoni (si vede nelle foto della galleria): con le assi lunghe si capisce che è legno. */
  const sx = tx * TS, sy = ty * TS;
  const tones = ['#a8784a', '#a07246', '#ae7e50', '#9a6c42'];
  for (let r = 0; r < 4; r++) {
    const gy = ty * 4 + r, y = sy + r * 8;
    const off = ((gy * 13) % 4) * 8;                       // sfalsamento dei giunti, fila per fila
    g.rect(sx, y, TS, 8, tones[(gy * 5 + tx) % tones.length]);
    g.rect(sx, y, TS, 1, '#7a5230');                       // giunto fra le file
    g.rect(sx, y + 1, TS, 1, shadeHex(tones[(gy * 5 + tx) % tones.length], 1.09));
    for (let x = -off; x < TS; x += 32) if (x >= 0) g.rect(sx + x, y, 1, 8, '#7a5230');   // testa dell'asse
    for (let k = 0; k < 2; k++) {                          // venature
      const vx = sx + ((gy * 17 + k * 23 + tx * 7) % 28) + 2;
      g.rect(vx, y + 3 + k * 2, 5, 1, shadeHex(tones[(gy * 5 + tx) % tones.length], 0.92));
    }
  }
}
function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + ((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}

/* ---------- la SALA: gradino di marmo e tappeto del bioma ---------- */
export function drawRoomFloor(g, x0, y0, w, h, col, time) {
  /* LA SALA: cornice di marmo tutt'attorno, parquet a vista e una PASSATOIA stretta in mezzo.
     Prima un tappetone del colore del bioma copriva quasi tutto il pavimento: da lontano la
     sala era una macchia sola e il parquet non si vedeva mai. Ora il colore del bioma resta
     come accento — la passatoia e i bordi — e il museo sembra un museo. */
  const dark = shadeHex(col, 0.42), mid = shadeHex(col, 0.62), lite = shadeHex(col, 0.95);
  /* cornice: un gradino di marmo, luce sopra e ombra sotto */
  g.rect(x0 - 4, y0 - 4, w + 8, 4, '#f4eedf'); g.rect(x0 - 4, y0 + h, w + 8, 4, '#a89c82');
  g.rect(x0 - 4, y0, 4, h, '#efe7d4'); g.rect(x0 + w, y0, 4, h, '#b8ac92');
  g.rect(x0, y0, w, 3, 'rgba(40,24,10,.25)'); g.rect(x0, y0, 3, h, 'rgba(40,24,10,.15)');
  /* intarsio: un filo scuro e uno d'oro corrono lungo il bordo della sala */
  g.rect(x0 + 10, y0 + 10, w - 20, 2, dark); g.rect(x0 + 10, y0 + h - 12, w - 20, 2, dark);
  g.rect(x0 + 10, y0 + 10, 2, h - 22, dark); g.rect(x0 + w - 12, y0 + 10, 2, h - 22, dark);
  g.rect(x0 + 13, y0 + 13, w - 26, 1, '#c9a227'); g.rect(x0 + 13, y0 + h - 14, w - 26, 1, '#c9a227');
  /* PASSATOIA centrale: dal corridoio fino in fondo alla sala */
  const rw = 5 * TS, rx = Math.round(x0 + w / 2 - rw / 2), ry = y0 + 44, rh = h - 96;
  g.rect(rx - 2, ry - 2, rw + 4, rh + 4, dark);
  g.rect(rx, ry, rw, rh, mid);
  g.rect(rx + 4, ry + 4, rw - 8, 1, '#c9a227'); g.rect(rx + 4, ry + rh - 5, rw - 8, 1, '#c9a227');
  g.rect(rx + 4, ry + 4, 1, rh - 8, '#c9a227'); g.rect(rx + rw - 5, ry + 4, 1, rh - 8, '#c9a227');
  for (let y = ry + 16; y < ry + rh - 12; y += 26) {                     // rombi radi, non un tappeto a fiori
    const cxm = rx + rw / 2;
    for (let k = 0; k < 5; k++) { g.rect(cxm - k, y + k, k * 2 + 1, 1, lite); g.rect(cxm - k, y + 10 - k, k * 2 + 1, 1, lite); }
  }
  /* frange ai due capi */
  for (let x = rx + 2; x < rx + rw - 2; x += 4) { g.rect(x, ry - 5, 2, 3, lite); g.rect(x, ry + rh + 2, 2, 3, lite); }
}
/* ---------- COLONNA in 3/4: si disegna in ordine di profondità ---------- */
export function drawColumn(g, cx, baseY) {
  const H = 84, W = 18;
  g.rect(cx - 14, baseY - 2, 28, 6, 'rgba(40,30,20,.25)');
  g.rect(cx - 13, baseY - 10, 26, 10, '#8f8670'); g.rect(cx - 12, baseY - 10, 24, 8, '#d9d0bb'); g.rect(cx - 12, baseY - 10, 24, 2, '#f4eedf');   // plinto
  g.rect(cx - W / 2 - 1, baseY - H, W + 2, H - 10, '#8f8670');
  g.rect(cx - W / 2, baseY - H, W, H - 10, '#e9e2ce');
  g.rect(cx - W / 2, baseY - H, 4, H - 10, '#f8f3e6'); g.rect(cx + W / 2 - 4, baseY - H, 4, H - 10, '#b8ae96');
  for (const f of [-4, 0, 4]) g.rect(cx + f, baseY - H + 4, 1, H - 18, '#c9c0a8');                                                               // scanalature
  g.rect(cx - 13, baseY - H - 8, 26, 9, '#8f8670'); g.rect(cx - 12, baseY - H - 8, 24, 7, '#e9e2ce'); g.rect(cx - 12, baseY - H - 8, 24, 2, '#fbf8ef');  // capitello
  g.rect(cx - 15, baseY - H - 12, 30, 4, '#c9a227'); g.rect(cx - 15, baseY - H - 12, 30, 1, '#f0d470');
}

/* ---------- PANCA di velluto ---------- */
export function drawBench(g, x, y, col) {
  /* PANCA da museo: seduta di velluto imbottita, cornice di legno e gambe tornite. Prima era
     una lastra piatta col bordo scuro: da lontano sembrava una tavola buttata a terra. */
  const scuro = shadeHex(col, 0.55), medio = shadeHex(col, 0.78), chiaro = shadeHex(col, 1.0);
  g.rect(x + 3, y + 15, 42, 4, 'rgba(40,30,20,.22)');                     // ombra
  for (const lx of [x + 5, x + 37]) {                                     // gambe tornite
    g.rect(lx, y + 7, 6, 10, '#2a1e14'); g.rect(lx + 1, y + 7, 4, 9, '#6e4a2e'); g.rect(lx + 1, y + 7, 1, 9, '#8a5f38');
    g.rect(lx - 1, y + 10, 8, 2, '#5c3d22'); g.rect(lx, y + 16, 6, 2, '#2a1e14');
  }
  g.rect(x, y + 4, 48, 7, '#2a1e14');                                     // cornice di legno
  g.rect(x + 1, y + 5, 46, 5, '#6e4a2e'); g.rect(x + 1, y + 5, 46, 1, '#8a5f38');
  g.rect(x, y - 1, 48, 6, '#2a1e14');                                     // cuscino
  g.rect(x + 1, y, 46, 4, medio); g.rect(x + 1, y, 46, 2, chiaro); g.rect(x + 1, y + 3, 46, 1, scuro);
  for (const bx of [x + 12, x + 24, x + 36]) { g.px(bx, y + 2, '#c9a227'); g.px(bx, y + 3, scuro); }   // bottoni della capitonné
}

/* ---------- VETRINA con piedistallo di marmo ---------- */
/* (bx, by) = angolo della casella del piedistallo, come in pedList. `sprite` = canvas dei
   pezzi consegnati (o null), disegnata da chi chiama in (bx-20, by-50). */
/* LA VETRINA in due passate: prima il FONDO (plinto e interno, dietro al fossile), poi il
   FRONTE (vetro, telaio, targhetta). Prima sembrava un quadro appeso: una cornice dorata alta
   e piatta. Ora è una teca vera — plinto di pietra, cassa di vetro col telaio d'ottone sottile,
   il fossile dentro e il faretto che lo prende dall'alto. */
const CASE = { X: -10, Y: -52, W: 52, H: 58, PH: 22 };     // scatola e plinto, rispetto a (bx, by)
export function drawCaseBack(g, bx, by, col, full, time) {
  const X = bx + CASE.X, Y = by + CASE.Y, W = CASE.W, H = CASE.H;
  g.rect(X + 2, by + CASE.PH + 6, W - 4, 5, 'rgba(40,30,20,.28)');                 // ombra a terra
  /* PLINTO di pietra: piano chiaro, fronte con la fascia scura e lo zoccolo */
  g.rect(X + 1, by + 2, W - 2, CASE.PH, '#8f8670');
  g.rect(X + 2, by + 3, W - 4, 5, '#f4eedf');
  g.rect(X + 2, by + 8, W - 4, CASE.PH - 7, '#d9d0bb');
  g.rect(X + 2, by + 8, 5, CASE.PH - 7, '#e9e2ce'); g.rect(X + W - 7, by + 8, 5, CASE.PH - 7, '#b8ae96');
  g.rect(X + 2, by + CASE.PH, W - 4, 3, '#a89c82');
  /* INTERNO della teca: velluto del bioma, più scuro in basso */
  g.rect(X, Y, W, H, shadeHex(col, 0.30));
  g.rect(X + 2, Y + 2, W - 4, Math.round(H * 0.5), shadeHex(col, 0.40));
  g.rect(X + 2, Y + H - 10, W - 4, 8, shadeHex(col, 0.24));
  /* FARETTO dall'alto: un cono di luce che si allarga sul fondo */
  for (let k = 0; k < H - 8; k += 2) {
    const ww = 10 + k * 0.5;
    g.rect(Math.round(bx + 16 - ww / 2), Y + 4 + k, Math.round(ww), 2, 'rgba(255,240,200,' + Math.max(0, 0.11 - k * 0.0013).toFixed(3) + ')');
  }
}
export function drawCaseFront(g, bx, by, rarCol, full, time, amber) {
  const X = bx + CASE.X, Y = by + CASE.Y, W = CASE.W, H = CASE.H;
  const gold = amber ? '#e0873a' : full ? '#e8c34a' : '#a8842a', goldL = amber ? '#ffc27a' : full ? '#fff0a0' : '#d8b23c';
  /* VETRO: un velo appena azzurro e due riflessi diagonali */
  g.rect(X + 2, Y + 2, W - 4, H - 4, 'rgba(200,230,240,.10)');
  for (let i = 0; i < 10; i++) g.rect(X + W - 16 - i * 2, Y + 5 + i * 3, 2, 3, 'rgba(255,255,255,.14)');
  for (let i = 0; i < 5; i++) g.rect(X + 6 + i, Y + 8 + i * 3, 2, 2, 'rgba(255,255,255,.10)');
  if (amber) g.rect(X + 2, Y + 2, W - 4, H - 4, 'rgba(255,160,50,.22)');
  /* TELAIO d'ottone: sottile, con i montanti agli angoli e il cappello sopra. Il contorno si
     disegna a FILO (quattro righe), non con un rettangolo pieno: quello copriva il fossile. */
  g.rect(X - 1, Y - 1, W + 2, 1, '#241a10'); g.rect(X - 1, Y + H, W + 2, 1, '#241a10');
  g.rect(X - 1, Y, 1, H, '#241a10'); g.rect(X + W, Y, 1, H, '#241a10');
  g.rect(X, Y, W, 2, gold); g.rect(X, Y, W, 1, goldL);
  g.rect(X, Y + H - 2, W, 2, gold);
  g.rect(X, Y, 2, H, gold); g.rect(X + W - 2, Y, 2, H, gold); g.rect(X, Y, 1, H, goldL);
  for (const cy of [Y + 3, Y + H - 7]) { g.rect(X + 1, cy, 3, 4, goldL); g.rect(X + W - 4, cy, 3, 4, goldL); }   // angolari
  g.rect(X - 3, Y - 5, W + 6, 5, '#241a10'); g.rect(X - 2, Y - 4, W + 4, 3, gold); g.rect(X - 2, Y - 4, W + 4, 1, goldL);
  /* TARGHETTA d'ottone sul plinto, col filo della rarità */
  g.rect(bx + 2, by + 12, 28, 9, '#241a10');
  g.rect(bx + 3, by + 13, 26, 7, '#b99a4a'); g.rect(bx + 3, by + 13, 26, 2, '#e8c96a');
  g.rect(bx + 5, by + 16, 22, 2, rarCol);
  if (amber) {                                   // teca d'ambra: scintille calde
    const ta = Math.floor(time / 300) % 4;
    for (const [sx, sy, k] of [[X + 8, Y + 14, 0], [X + W - 9, Y + 30, 1], [X + 14, Y + H - 14, 2], [X + W - 14, Y + 8, 3]]) if (k === ta) { g.rect(sx - 2, sy, 5, 1, '#ffb347'); g.rect(sx, sy - 2, 1, 5, '#ffb347'); }
  }
  if (full) {                                    // teca completa: un luccichio che gira
    const tw = Math.floor(time / 400) % 3;
    for (const [sx, sy, k] of [[X - 3, Y + 10, 0], [X + W + 2, Y + 24, 1], [X + W / 2, Y - 9, 2]]) if (k === tw) { g.rect(sx - 2, sy, 5, 1, '#fff3a0'); g.rect(sx, sy - 2, 1, 5, '#fff3a0'); }
  }
}

/* ---------- BANCONE del Curatore ---------- */
export function drawDeskArt(g, x0, y0, x1, y1, time) {
  const w = x1 - x0;
  g.rect(x0 + 4, y1, w - 8, 5, 'rgba(40,30,20,.25)');
  g.rect(x0 - 1, y0 - 6, w + 2, y1 - y0 + 7, '#241a10');
  g.rect(x0, y0 + 2, w, y1 - y0 - 2, '#5c3d22');
  for (let px = x0 + 8; px + 30 <= x1 - 6; px += 38) { g.rect(px, y0 + 6, 30, y1 - y0 - 12, '#4a3018'); g.rect(px + 1, y0 + 7, 28, y1 - y0 - 14, '#6e4a2e'); g.rect(px + 1, y0 + 7, 28, 1, '#8a5f38'); g.rect(px + 13, y0 + 12, 4, 4, '#c9a227'); }
  g.rect(x0, y1 - 4, w, 4, '#3a2616');
  g.rect(x0 - 3, y0 - 6, w + 6, 8, '#8f8670'); g.rect(x0 - 2, y0 - 5, w + 4, 6, '#ece5d2'); g.rect(x0 - 2, y0 - 5, w + 4, 1, '#fbf8ef');   // piano di marmo
  g.rect(x0 - 2, y0 + 1, w + 4, 2, '#c9a227');
  /* sul bancone: registro aperto, campanello, lente, un piccolo fossile */
  const cx = x0 + w / 2;
  g.rect(cx - 40, y0 - 12, 24, 8, '#241a10'); g.rect(cx - 39, y0 - 11, 11, 6, '#f3ecda'); g.rect(cx - 27, y0 - 11, 10, 6, '#e8dcc0'); g.rect(cx - 28, y0 - 12, 1, 8, '#8a3f3a');
  const shine = Math.floor(time / 900) % 4 === 0;
  g.rect(cx + 20, y0 - 8, 12, 3, '#6b4f14'); g.rect(cx + 22, y0 - 14, 8, 7, '#241a10'); g.rect(cx + 23, y0 - 13, 6, 6, '#e8c34a'); g.rect(cx + 25, y0 - 16, 2, 2, '#6b4f14');
  if (shine) g.rect(cx + 24, y0 - 12, 2, 2, '#fff8d0');
  g.rect(cx - 8, y0 - 11, 10, 7, '#241a10'); g.rect(cx - 7, y0 - 10, 8, 5, '#ece5d2'); g.rect(cx - 5, y0 - 9, 2, 2, '#8a8070'); g.rect(cx - 2, y0 - 9, 2, 2, '#8a8070');
  g.rect(cx + 44, y0 - 12, 9, 9, '#241a10'); g.rect(cx + 45, y0 - 11, 7, 7, '#bfe3ef'); g.rect(cx + 51, y0 - 5, 8, 3, '#8a5f38');
}
/* insegna del Museo sopra il bancone: tabella scura col tempio d'oro */
export function drawMuseumSign(g, cx, y) {
  g.rect(cx - 1, y - 12, 2, 12, '#3a2a1c'); g.rect(cx - 40, y - 12, 80, 2, '#3a2a1c');
  g.rect(cx - 37, y - 10, 2, 10, '#3a2a1c'); g.rect(cx + 35, y - 10, 2, 10, '#3a2a1c');
  g.rect(cx - 42, y, 84, 22, '#241a10'); g.rect(cx - 41, y + 1, 82, 20, '#3a3a44'); g.rect(cx - 41, y + 1, 82, 2, '#c9a227'); g.rect(cx - 41, y + 19, 82, 2, '#8a6a1e');
  let drew = false;
  try {
    const ps = typeof Path2D === 'function' ? iconPaths('museum').map(d => new Path2D(d)) : [];
    if (ps.length && g.ctx && g.ctx.fill) { const c = g.ctx; c.save(); c.translate(cx - 9, y + 2); c.scale(0.75, 0.75); c.fillStyle = '#e8c34a'; for (const p of ps) c.fill(p); c.restore(); drew = true; }
  } catch (e) { drew = false; }
  if (!drew) g.rect(cx - 6, y + 5, 12, 12, '#e8c34a');
  for (const sx of [cx - 32, cx + 20]) for (let i = 0; i < 3; i++) g.rect(sx + i * 4, y + 10, 2, 2, '#c9a227');
}

/* ---------- MURO di fondo della galleria ---------- */
export function drawGalleryTopWall(g, x0, x1, H) {
  const w = x1 - x0;
  g.rect(x0, 0, w, H, '#3f5448');
  for (let x = x0 + 6; x < x1; x += 16) for (let y = 8; y < H - 24; y += 14) { g.rect(x, y, 2, 1, '#4f6658'); g.rect(x - 1, y + 1, 4, 1, '#4f6658'); g.rect(x, y + 2, 2, 1, '#4f6658'); }
  g.rect(x0, 0, w, 4, '#efe2c4'); g.rect(x0, 4, w, 2, '#c9a227');
  g.rect(x0, H - 22, w, 16, '#6e4a2e');
  for (let x = x0 + 4; x + 26 <= x1; x += 32) { g.rect(x, H - 19, 26, 10, '#5c3d22'); g.rect(x + 1, H - 18, 24, 8, '#7a5236'); g.rect(x + 1, H - 18, 24, 1, '#9a6d45'); }
  g.rect(x0, H - 24, w, 2, '#c9a227');
  g.rect(x0, H - 6, w, 5, '#3a2616'); g.rect(x0, H - 6, w, 1, '#8a5f38');
  g.rect(x0, H, w, 4, 'rgba(30,20,10,.25)');
}
