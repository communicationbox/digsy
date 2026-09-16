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
    g.rect(x - 3, y + 4, 7, 4, g.shade8('#8a6a1e', 0.34)); g.rect(x - 2, y + 5, 5, 2, '#8a6a1e');   // base
    g.rect(x - 1, y - 12, 4, 17, g.shade8('#c9a227', 0.34)); g.rect(x, y - 12, 2, 16, '#c9a227'); g.rect(x, y - 12, 1, 16, '#f0d470');
    g.rect(x - 2, y - 15, 6, 4, g.shade8('#e8c34a', 0.34)); g.rect(x - 1, y - 14, 4, 2, '#e8c34a');  // pomello
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
    g.rect(lx, y + 7, 6, 10, g.shade8('#6e4a2e', 0.34)); g.rect(lx + 1, y + 7, 4, 9, '#6e4a2e'); g.rect(lx + 1, y + 7, 1, 9, '#8a5f38');
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
  g.rect(cx + 22, y0 - 13, 10, 8, g.shade8('#e8c34a', 0.34)); g.rect(cx + 23, y0 - 12, 8, 6, '#e8c34a'); g.rect(cx + 23, y0 - 12, 8, 2, '#f8e08a');
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
  /* SOPRA IL BANCONE: un FRONTONE di marmo col timpano e le colonnine, e l'emblema del museo
     in mezzo. Prima era una tabella scura con dei puntini: nessuno capiva cosa fosse (segnalato).
     La forma è la stessa della facciata del Museo là fuori, così si riconosce al volo. */
  const W = 92, X = cx - W / 2, H = 26;
  g.rect(X - 2, y + 4, W + 4, H, g.shade8('#e6ddc8', 0.46));                 // contorno: marmo scurito, non nero
  g.rect(X - 1, y + 5, W + 2, H - 2, '#e6ddc8');                             // fascia di marmo
  g.rect(X - 1, y + 5, W + 2, 2, '#f6f1e4'); g.rect(X - 1, y + H + 1, W + 2, 2, '#b3a78c');
  for (let k = 0; k < 5; k++) {                                              // timpano: un triangolo di lastre
    const w2 = W - k * 16, x2 = Math.round(cx - w2 / 2), y2 = y + 3 - k * 3;
    if (w2 <= 6) break;
    g.rect(x2 - 1, y2 - 1, w2 + 2, 4, '#241a10');
    g.rect(x2, y2, w2, 3, k % 2 ? '#dcd2bb' : '#e6ddc8'); g.rect(x2, y2, w2, 1, '#f6f1e4');
  }
  for (const dx of [-W / 2 + 6, W / 2 - 10]) {                               // due colonnine
    g.rect(cx + dx - 1, y + 8, 6, H - 6, '#241a10');
    g.rect(cx + dx, y + 8, 4, H - 7, '#efe7d4'); g.rect(cx + dx, y + 8, 1, H - 7, '#fbf8ef');
    g.rect(cx + dx - 2, y + 6, 8, 3, '#d9d0bb'); g.rect(cx + dx - 2, y + H, 8, 3, '#d9d0bb');
  }
  /* emblema: un osso incrociato al martelletto, in ottone */
  g.rect(cx - 16, y + 12, 32, 10, '#8f8670'); g.rect(cx - 15, y + 13, 30, 8, '#c9a227'); g.rect(cx - 15, y + 13, 30, 2, '#f0d470');
  g.rect(cx - 10, y + 15, 20, 2, '#6b4f14'); g.rect(cx - 12, y + 14, 4, 4, '#6b4f14'); g.rect(cx + 8, y + 14, 4, 4, '#6b4f14');
  g.rect(cx - 2, y + 11, 4, 12, '#6b4f14'); g.rect(cx - 1, y + 12, 2, 10, '#f0d470');
}
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

/* ---------- IL PEZZO FORTE: lo scheletro montato in mezzo all'atrio ----------
   Il museo era grande e vuoto: si entrava e non c'era niente da guardare ("super dispersivo,
   manca l'effetto wow"). Qui c'è il pezzo che tutti i musei hanno davvero: uno scheletro
   intero montato su una pedana di marmo, sotto il faretto, col cordone attorno e la targa.
   NON è un dinosauro disegnato a mano: è la LEGGENDARIA della zona, lo stesso modello voxel
   del Libro e delle teche, montato grande. Qui sotto c'è solo l'allestimento; l'animale lo
   passa chi chiama (`skel`, una canvas già pronta). */
export function drawCentrepiece(g, cx, baseY, time, skW) {
  const HW = Math.max(56, Math.round((skW || 120) / 2) + 22);   // la pedana segue l'animale
  /* faretto dall'alto */
  for (let k = 0; k < 120; k += 4) {
    const ww = 14 + k * 0.52;
    g.rect(Math.round(cx - ww / 2), baseY - 126 + k, Math.round(ww), 4, 'rgba(255,238,190,' + Math.max(0, 0.05 - k * 0.0004).toFixed(3) + ')');
  }
  /* ombra dell'animale sulla pedana: senza, la montatura galleggia */
  for (let dy = -5; dy <= 5; dy++) {
    const w2 = Math.round((HW - 26) * Math.sqrt(Math.max(0, 1 - (dy / 5) * (dy / 5))));
    g.rect(cx - w2, baseY - 18 + dy, w2 * 2, 1, 'rgba(70,58,40,.18)');
  }
  /* PEDANA di marmo a due gradini */
  g.rect(cx - HW, baseY - 6, HW * 2, 14, '#8f8670');
  g.rect(cx - HW + 2, baseY - 5, HW * 2 - 4, 11, '#e6ddc8'); g.rect(cx - HW + 2, baseY - 5, HW * 2 - 4, 3, '#f6f1e4');
  g.rect(cx - HW + 2, baseY + 3, HW * 2 - 4, 3, '#b3a78c');
  g.rect(cx - HW + 12, baseY - 12, HW * 2 - 24, 8, '#8f8670');
  g.rect(cx - HW + 14, baseY - 11, HW * 2 - 28, 6, '#efe7d4'); g.rect(cx - HW + 14, baseY - 11, HW * 2 - 28, 2, '#fbf8ef');
  /* TARGA sul gradino basso */
  g.rect(cx - 16, baseY - 3, 32, 9, '#241a10');
  g.rect(cx - 15, baseY - 2, 30, 7, '#b99a4a'); g.rect(cx - 15, baseY - 2, 30, 2, '#e8c96a');
  /* un luccichio che gira sull'ottone */
  const tw = Math.floor(time / 500) % 3;
  for (const [sx2, sy2, k] of [[cx - HW + 20, baseY - 8, 0], [cx + HW - 20, baseY - 8, 1], [cx, baseY - 14, 2]]) if (k === tw) {
    g.rect(sx2 - 2, sy2, 5, 1, '#fff3a0'); g.rect(sx2, sy2 - 2, 1, 5, '#fff3a0');
  }
}

/* ===================== L'EDIFICIO: MURI, ARCHI, SALE A TEMA =====================
   Il museo era un unico stanzone e delle macchie di pavimento facevano da "sale": senza muri
   non si legge un museo, si legge un capannone. Qui c'è il materiale da costruzione. */

/* Ogni ala ha il SUO ambiente, non solo un tappeto di colore diverso: pavimento, zoccolo e
   parete cambiano materiale. Indici = MUSEUM_ZONES (prati, dune, boschi, terre, palude,
   ghiacci, grotte). */
export const WINGS = [
  { key: 'prati',   floor: 'parquet', f1: '#c8a86a', f2: '#b8975a', wall: '#d9d0b4', trim: '#c9a227', acc: '#d4b13c' },
  { key: 'dune',    floor: 'lastre',  f1: '#ddcaa0', f2: '#cfbb8e', wall: '#e2d4ae', trim: '#c2a06a', acc: '#d2b078' },
  { key: 'boschi',  floor: 'assi',    f1: '#7d7f6f', f2: '#6e7061', wall: '#b9bdae', trim: '#7f8c6d', acc: '#6f7f62' },
  { key: 'terre',   floor: 'cotto',   f1: '#b06a4a', f2: '#9c5a3e', wall: '#dbb9a4', trim: '#a8512f', acc: '#c06a48' },
  { key: 'palude',  floor: 'mosaico', f1: '#5f7a52', f2: '#52694a', wall: '#b2bfa6', trim: '#4e7a3d', acc: '#5f7a52' },
  { key: 'ghiacci', floor: 'ghiaccio', f1: '#a9c6d8', f2: '#98b6ca', wall: '#cfe0ea', trim: '#6f9ab5', acc: '#8fd0e6' },
  { key: 'grotte',  floor: 'roccia',  f1: '#6b6270', f2: '#5c5462', wall: '#aaa0b4', trim: '#7d6fa8', acc: '#7d6fa8' },
];
/* pavimento di una sala: un disegno per materiale, sempre a casella intera e sempre
   deterministico (la fase viene dalle coordinate TILE, mai dallo schermo) */
export function drawWingFloor(g, tx, ty, wi) {
  const w = WINGS[wi] || WINGS[0], x = tx * 32, y = ty * 32;
  const h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0, r = (h % 1000) / 1000;
  g.rect(x, y, 32, 32, r < 0.5 ? w.f1 : w.f2);
  const d = g.shade8(w.f1, 0.86), l = g.shade8(w.f1, 1.1);
  switch (w.floor) {
    case 'parquet':                                   // tavole lunghe in verticale
      for (const bx of [0, 8, 16, 24]) g.rect(x + bx, y, 1, 32, d);
      if ((tx + ty) % 3 === 0) g.rect(x, y + (h % 3) * 10, 32, 1, d);
      for (let i = 0; i < 4; i++) g.rect(x + 2 + ((h >> i) % 6), y + i * 8 + 2, 4, 1, l);
      break;
    case 'lastre':                                    // grandi lastre sfalsate
      g.rect(x, y, 32, 1, d); g.rect(x + ((ty % 2) ? 0 : 16), y, 1, 32, d);
      g.rect(x + 2, y + 2, 12, 1, l);
      break;
    case 'assi':                                      // assi orizzontali larghe
      for (const by of [0, 11, 22]) g.rect(x, y + by, 32, 1, d);
      g.rect(x + (h % 30), y + 4, 6, 1, l);
      break;
    case 'cotto': {                                   // mattonelle a losanga
      for (let i = 0; i < 16; i++) { g.rect(x + i * 2, y + 16 - i * 2, 2, 2, d); g.rect(x + i * 2, y + i * 2, 2, 2, d); }
      g.rect(x + 14, y + 14, 4, 4, l); break;
    }
    case 'mosaico':                                   // tesserine
      for (let iy = 0; iy < 4; iy++) for (let ix = 0; ix < 4; ix++)
        if (((ix + iy + h) % 3) === 0) g.rect(x + ix * 8 + 1, y + iy * 8 + 1, 6, 6, l);
      for (const k of [0, 8, 16, 24]) { g.rect(x + k, y, 1, 32, d); g.rect(x, y + k, 32, 1, d); }
      break;
    case 'ghiaccio':                                  // lastre lucide con crepe
      g.rect(x, y, 32, 1, l); g.rect(x, y, 1, 32, l);
      if (h % 4 === 0) { g.rect(x + 6, y + 8, 12, 1, d); g.rect(x + 16, y + 9, 1, 6, d); }
      g.rect(x + 20, y + 4, 6, 2, '#eaf6ff');
      break;
    default:                                          // roccia levigata
      for (let i = 0; i < 5; i++) g.rect(x + ((h >> i) % 28), y + ((h >> (i + 5)) % 28), 3, 2, d);
      g.rect(x + 4, y + 22, 8, 1, l);
  }
}
/* MURO in 3/4. La casella di muro si legge in due metà, come in ogni gioco dall'alto:
   sopra la CIMASA (la sommità del muro, vista da sopra: pietra scura) e sotto la FACCIA
   (l'intonaco che guarda il visitatore, con lo zoccolo e il filo d'oro). Senza la cimasa
   scura il muro aveva lo stesso valore del marmo del pavimento e spariva: il museo tornava
   a sembrare uno stanzone. */
export function drawWallTile(g, tx, ty, col, giuLibero, suLibero) {
  const x = tx * 32, y = ty * 32;
  const cima = g.shade8(col, 0.42), cimaL = g.shade8(col, 0.55);
  const faccia = g.shade8(col, 1.02), zocc = g.shade8(col, 0.7);
  /* CIMASA: metà alta della casella */
  g.rect(x, y, 32, 17, cima);
  g.rect(x, y, 32, 2, cimaL);
  g.rect(x, y + 15, 32, 2, g.shade8(col, 0.3));
  const h = ((tx * 83492791) ^ (ty * 29849663)) >>> 0;
  if (h % 3 === 0) g.rect(x + (h % 18) + 4, y + 6, 8, 1, cimaL);          // conci
  if (!suLibero) g.rect(x, y, 32, 4, g.shade8(col, 0.34));                // continua il muro sopra
  /* FACCIA: metà bassa, intonaco chiaro, cornice d'oro e zoccolo */
  g.rect(x, y + 17, 32, 15, faccia);
  g.rect(x, y + 17, 32, 2, g.shade8(col, 1.14));
  g.rect(x, y + 20, 32, 1, '#c9a227');
  g.rect(x, y + 26, 32, 6, zocc);
  g.rect(x, y + 26, 32, 1, g.shade8(col, 0.9));
  /* ombra portata sul pavimento: senza, il muro galleggia sopra le lastre */
  if (giuLibero) { g.rect(x, y + 32, 32, 3, 'rgba(38,30,18,.32)'); g.rect(x, y + 35, 32, 2, 'rgba(38,30,18,.15)'); }
}
/* PORTALE di passaggio: stipiti squadrati e architrave DRITTO. L'arco a tutto sesto stonava
   — nel resto del gioco si stonda solo dove serve, e una porta di museo è un rettangolo di
   pietra. Il varco non si annerisce: il pavimento prosegue, si mette solo l'ombra dello
   spessore del muro, come sotto una porta vera. */
export function drawArch(g, tx, ty, n, vert, col) {
  const x = tx * 32, y = ty * 32;
  const scuro = g.shade8(col, 0.45), chiaro = g.shade8(col, 1.14), faccia = g.shade8(col, 1.0);
  if (vert) {                                         // varco in un muro VERTICALE
    const hgt = n * 32;
    /* ombra dello spessore del muro sui due lati del passaggio: il pavimento della sala si
       vede attraverso, se no il varco sembra una serranda chiusa */
    g.rect(x + 2, y, 7, hgt, 'rgba(34,26,16,.26)');
    g.rect(x + 23, y, 7, hgt, 'rgba(34,26,16,.18)');
    g.rect(x + 9, y, 14, hgt, 'rgba(34,26,16,.07)');
    for (const sy of [y - 10, y + hgt - 4]) {         // spallette squadrate sopra e sotto
      g.rect(x, sy, 32, 14, faccia);
      g.rect(x, sy, 32, 3, chiaro); g.rect(x, sy + 11, 32, 3, scuro);
      g.rect(x, sy + 6, 32, 1, '#c9a227');
    }
    g.rect(x + 2, y, 3, hgt, scuro); g.rect(x + 27, y, 3, hgt, scuro);
  } else {                                            // varco in un muro ORIZZONTALE
    const w = n * 32;
    /* ARCHITRAVE: una trave dritta di pietra sopra la luce, con la cimasa e il filo d'oro */
    g.rect(x - 8, y - 15, w + 16, 15, g.shade8(col, 0.5));
    g.rect(x - 8, y - 15, w + 16, 3, g.shade8(col, 0.66));
    g.rect(x - 8, y - 4, w + 16, 4, faccia);
    g.rect(x - 8, y - 2, w + 16, 1, '#c9a227');
    /* STIPITI: due pilastri squadrati che scendono a terra ai lati */
    for (const sx of [x - 8, x + w]) {
      g.rect(sx, y - 15, 8, 47, faccia);
      g.rect(sx, y - 15, 3, 47, chiaro); g.rect(sx + 6, y - 15, 2, 47, scuro);
      g.rect(sx, y + 14, 8, 2, '#c9a227');
      g.rect(sx, y + 28, 8, 4, scuro); g.rect(sx, y + 32, 8, 3, 'rgba(38,30,18,.3)');
    }
    g.rect(x, y, w, 12, 'rgba(34,26,16,.3)');         // ombra sotto l'architrave
    g.rect(x, y, w, 3, 'rgba(34,26,16,.26)');
  }
}
/* LUCERNARIO: la luce che scende dall'alto in un ambiente grande. È quello che fa sembrare
   alto il soffitto senza poterlo disegnare. */
export function drawSkylight(g, cx, cy, w, h) {
  for (let i = 0; i < 5; i++) {
    const k = i / 5;
    g.rect(Math.round(cx - w / 2 * (1 - k * 0.2)), Math.round(cy - h / 2 * (1 - k * 0.2)),
      Math.round(w * (1 - k * 0.2)), Math.round(h * (1 - k * 0.2)), 'rgba(255,244,214,.045)');
  }
}
