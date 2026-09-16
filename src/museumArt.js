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
  /* ASSI IN VERTICALE, larghe 8 px e lunghe tre caselle: le file orizzontali, per quanto
     lunghe, continuavano a leggersi come un muro di mattoni (si vede nelle foto). Girate
     nell'altro verso il legno si capisce subito, e il pavimento "va verso il fondo" della sala. */
  const sx = tx * TS, sy = ty * TS;
  const tones = ['#a8784a', '#a47448', '#ab7b4d', '#a17046'];
  for (let q = 0; q < 4; q++) {
    const gx = tx * 4 + q, x = sx + q * 8;
    const c = tones[(gx * 5 + (ty >> 1)) % tones.length];
    g.rect(x, sy, 8, TS, c);
    g.rect(x, sy, 1, TS, '#6b4728');                                  // giunto fra le assi
    g.rect(x + 1, sy, 1, TS, shadeHex(c, 1.06));
    const tail = (gx * 37) % 96;                                      // testa dell'asse, sfalsata
    for (let y = -tail; y < TS; y += 96) if (y >= 0) g.rect(x, sy + y, 8, 1, '#6b4728');
    if ((gx * 7 + ty * 11) % 5 === 0) g.rect(x + 3, sy + ((gx * 13 + ty * 7) % 24), 2, 6, shadeHex(c, 0.94));   // venatura
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

/* CORDONE DA MUSEO: paletti d'ottone e fune di velluto che scende a curva. È il segno che si
   legge da lontano — "qui non si passa, si guarda" — e dà alla sala il carattere che le
   mancava. */
export function drawRope(g, x0, x1, y, col) {
  const scuro = shadeHex(col, 0.5), chiaro = shadeHex(col, 0.95);
  for (const x of [x0, x1]) {
    g.rect(x - 4, y + 6, 9, 3, 'rgba(40,30,20,.22)');                       // ombra
    g.rect(x - 3, y + 4, 7, 4, '#241a10'); g.rect(x - 2, y + 5, 5, 2, '#8a6a1e');   // base
    g.rect(x - 1, y - 12, 4, 17, '#241a10'); g.rect(x, y - 12, 2, 16, '#c9a227'); g.rect(x, y - 12, 1, 16, '#f0d470');
    g.rect(x - 2, y - 15, 6, 4, '#241a10'); g.rect(x - 1, y - 14, 4, 2, '#e8c34a');  // pomello
  }
  const n = Math.max(1, x1 - x0);
  for (let i = 0; i <= n; i++) {                                            // la fune scende a catenaria
    const u = i / n, x = Math.round(x0 + (x1 - x0) * u);
    const y2 = Math.round(y - 12 + Math.sin(u * Math.PI) * 7);
    g.rect(x, y2, 1, 3, '#241a10'); g.rect(x, y2 + 1, 1, 2, scuro); g.rect(x, y2 + 1, 1, 1, chiaro);
  }
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
  /* BANCONE DEL CURATORE: mobile di noce con i pannelli incorniciati, piano di marmo che
     sporge, bordo d'ottone e zoccolo. Prima erano tre rettangoli marroni con una riga d'oro.
     Sopra: il registro aperto, il campanello, la lente e una cassetta di reperti. */
  const w = x1 - x0, h = y1 - y0;
  g.rect(x0 + 4, y1, w - 8, 5, 'rgba(40,30,20,.25)');                    // ombra a terra
  g.rect(x0 - 1, y0 - 6, w + 2, h + 7, '#241a10');                       // contorno
  g.rect(x0, y0 + 2, w, h - 2, '#5c3d22');                               // corpo
  g.rect(x0, y0 + 2, 3, h - 2, '#7a5230'); g.rect(x0 + w - 3, y0 + 2, 3, h - 2, '#4a3018');   // spigoli del mobile
  for (let px = x0 + 8; px + 30 <= x1 - 6; px += 38) {                   // pannelli incorniciati
    g.rect(px, y0 + 6, 30, h - 12, '#4a3018');
    g.rect(px + 2, y0 + 8, 26, h - 16, '#6e4a2e');
    g.rect(px + 2, y0 + 8, 26, 1, '#8a5f38'); g.rect(px + 2, y0 + h - 9, 26, 1, '#3a2616');
    g.rect(px + 13, y0 + 8 + Math.round((h - 16) / 2) - 1, 4, 3, '#c9a227');   // maniglietta d'ottone
  }
  g.rect(x0, y1 - 5, w, 5, '#3a2616'); g.rect(x0, y1 - 5, w, 1, '#7a5230');    // zoccolo
  /* PIANO DI MARMO che sporge, con il filo d'ottone sotto */
  g.rect(x0 - 4, y0 - 7, w + 8, 9, '#8f8670');
  g.rect(x0 - 3, y0 - 6, w + 6, 7, '#ece5d2'); g.rect(x0 - 3, y0 - 6, w + 6, 2, '#fbf8ef');
  g.rect(x0 - 3, y0 - 1, w + 6, 1, '#b8ae96');
  g.rect(x0 - 2, y0 + 1, w + 4, 2, '#c9a227'); g.rect(x0 - 2, y0 + 1, w + 4, 1, '#f0d470');
  /* SUL BANCONE: registro aperto, campanello d'ottone, lente, cassetta di reperti */
  const cx = x0 + w / 2;
  g.rect(cx - 41, y0 - 13, 26, 9, '#241a10');                                   // registro
  g.rect(cx - 40, y0 - 12, 12, 7, '#f3ecda'); g.rect(cx - 27, y0 - 12, 11, 7, '#e8dcc0');
  g.rect(cx - 28, y0 - 13, 1, 9, '#8a3f3a');
  for (let r = 0; r < 3; r++) { g.rect(cx - 38, y0 - 10 + r * 2, 8, 1, '#b9ad91'); g.rect(cx - 25, y0 - 10 + r * 2, 7, 1, '#b9ad91'); }
  const shine = Math.floor(time / 900) % 4 === 0;
  g.rect(cx + 20, y0 - 6, 14, 2, '#6b4f14');                                    // base del campanello
  g.rect(cx + 22, y0 - 13, 10, 8, '#241a10'); g.rect(cx + 23, y0 - 12, 8, 6, '#e8c34a'); g.rect(cx + 23, y0 - 12, 8, 2, '#f8e08a');
  g.rect(cx + 26, y0 - 16, 2, 3, '#6b4f14');
  if (shine) g.rect(cx + 25, y0 - 11, 2, 2, '#fff8d0');
  g.rect(cx - 9, y0 - 12, 12, 8, '#241a10');                                    // lente
  g.rect(cx - 8, y0 - 11, 10, 6, '#bfe3ef'); g.rect(cx - 7, y0 - 10, 3, 2, '#eef8fb');
  g.rect(cx + 2, y0 - 6, 6, 2, '#8a5f38');
  g.rect(cx + 42, y0 - 13, 14, 9, '#241a10');                                   // cassetta dei reperti
  g.rect(cx + 43, y0 - 12, 12, 7, '#8a5f38'); g.rect(cx + 43, y0 - 12, 12, 2, '#b07c4a');
  g.rect(cx + 45, y0 - 10, 3, 3, '#e8dcc0'); g.rect(cx + 50, y0 - 9, 3, 2, '#d8ccb0');
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
  /* LA PARETE IN FONDO alla galleria: zoccolo di marmo, intonaco chiaro, cornice d'oro in alto
     e i quadri appesi con la loro lampadina. Prima era una fascia verde scuro a puntini con
     tre rettangoli marroni: la parte che si vede entrando, ed era la più vecchia di tutte. */
  const w = x1 - x0;
  g.rect(x0, 0, w, H, '#dcd2bb');                                        // intonaco
  for (let x = x0; x < x1; x += 7) g.rect(x, 6 + ((x * 13) % 9), 3, 1, '#d2c7ae');   // grana
  g.rect(x0, 0, w, 5, '#f6f1e4'); g.rect(x0, 5, w, 2, '#c9a227'); g.rect(x0, 7, w, 1, '#8a6a1e');   // cornice d'oro
  /* ZOCCOLO di marmo con il filo scuro */
  g.rect(x0, H - 26, w, 20, '#e6ddc8');
  g.rect(x0, H - 26, w, 2, '#b3a78c'); g.rect(x0, H - 24, w, 1, '#f6f1e4');
  for (let x = x0 + 4; x < x1; x += 48) { g.rect(x, H - 22, 1, 14, '#c8bda3'); g.rect(x + 1, H - 22, 1, 14, '#f2ece0'); }
  g.rect(x0, H - 8, w, 6, '#8f8670'); g.rect(x0, H - 8, w, 1, '#b8ae96');
  g.rect(x0, H, w, 4, 'rgba(30,20,10,.25)');                             // ombra sul pavimento
  /* QUADRI appesi, uno ogni due caselle, con la lampadina sopra */
  for (let x = x0 + 12; x + 40 <= x1; x += 64) {
    g.rect(x + 16, 10, 8, 4, '#c9a227'); g.rect(x + 18, 12, 4, 3, '#fff3c8');        // lampadina
    g.rect(x + 8, 16, 2, 4, '#8a6a1e'); g.rect(x + 30, 16, 2, 4, '#8a6a1e');          // cavetti
    g.rect(x, 20, 40, 26, '#241a10');
    g.rect(x + 1, 21, 38, 24, '#c9a227'); g.rect(x + 2, 22, 36, 22, '#8a6a1e');       // cornice dorata
    const tela = ['#6f8a9a', '#8a7a6a', '#7a8a6a'][(x / 64 | 0) % 3];
    g.rect(x + 4, 24, 32, 18, tela); g.rect(x + 4, 24, 32, 6, shadeHex(tela, 1.15));
    g.rect(x + 8, 34, 24, 8, shadeHex(tela, 0.8));                                    // paesaggio dipinto
    g.rect(x + 12, 30, 6, 6, shadeHex(tela, 1.3)); g.rect(x + 22, 32, 8, 5, shadeHex(tela, 0.7));
    g.rect(x + 4, 24, 32, 1, 'rgba(255,255,255,.25)');
  }
}
