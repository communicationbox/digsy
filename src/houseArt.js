/* ARCHITETTURA DELLA CASA — muri, porte, finestre e soglie dell'atrio e delle quattro stanze.
   Modulo PURO come furnArt.js: disegna solo con il pennello che riceve (g.rect/px/shade8),
   niente stato di gioco, quindi i test lo possono chiamare su uno stub.

   Prima la casa era fatta di rettangoli marroni: una scacchiera per pavimento, porte che
   erano due rettangoli uno dentro l'altro, i nomi delle stanze scritti a 6px sul muro. Si
   capiva cosa fosse, ma non sembrava una casa. Qui ogni pezzo è ARCHITETTURA vista in 3/4,
   come il resto del gioco:
     · il MURO ha uno spessore (la cresta vista dall'alto) e una FACCIA (quella di fondo, dove
       si appoggia la carta da parati), con cornice in cima, zoccolo e battiscopa in basso;
     · le PORTE hanno stipiti, architrave, battente e soglia: aperte mostrano la stanza che c'è
       dietro, chiuse hanno le assi, la maniglia e il lucchetto;
     · ogni porta ha una TARGHETTA d'ottone con un'icona (divano, pentola, goccia, letto): si
       riconosce da lontano in ogni lingua, e il testo a 6px non si leggeva comunque.
   La geometria (dove si cammina, dove sono i varchi) resta tutta in house.js: qui si decide
   solo come appare. */

const TS = 32;
/* spessore e cresta dei muri: lo stesso legno scuro in tutta la casa */
export const WALL_CAP = '#5a4230', WALL_EDGE = '#7a5b40', WALL_LINE = '#2a1e14';
export const TRIM = '#6b4a2e', TRIM_LITE = '#9a6d45';
/* quanto la scena sfora SOPRA la sua stanza (la faccia del muro di fondo sale oltre y=0) e
   quanto sotto: servono per centrarla sullo schermo tenendo conto di tutto il disegno. Chi
   converte il tocco in coordinate (interiorCam) usa lo STESSO spostamento. */
export const ATRIO_TOP = 36, ATRIO_BOTTOM = 14;
export const ROOM_TOP = 10, ROOM_BOTTOM = 4;
export function sceneShift(top, bottom) { return Math.round((top - bottom) / 2); }

/* colori propri di ogni stanza: tende, targhetta, zerbino, zoccolo */
export const ROOM_STYLE = [
  { accent: '#b8574a', accent2: '#e0a24a', wains: 'panel', wood: '#7a4f30' },   // Sala: rosso e oro, pannelli
  { accent: '#5f9a52', accent2: '#e8dcc0', wains: 'tile', wood: '#c86a4a' },    // Cucina: verde, piastrelle in cotto
  { accent: '#4e8d9c', accent2: '#f3ecda', wains: 'bath', wood: '#e9f1f3' },    // Bagno: teal, piastrelle bianche
  { accent: '#5a5a9a', accent2: '#d8b23c', wains: 'boards', wood: '#4e3622' },  // Camera: indaco, perline scure
];
export function roomStyle(id) { return ROOM_STYLE[id] || ROOM_STYLE[0]; }

/* icone delle targhette, 7×5 */
export const ROOM_ICON = [
  ['.#####.', '.#####.', '#######', '#######', '#.....#'],   // Sala: divano
  ['...#...', '.#####.', '#######', '.#####.', '.#####.'],   // Cucina: pentola
  ['...#...', '..###..', '.#####.', '.#####.', '..###..'],   // Bagno: goccia
  ['#......', '#.##...', '#######', '#######', '#.....#'],   // Camera: letto
];

/* cresta del muro vista dall'alto: contorno, legno, filo di luce sul lato verso la stanza */
export function wallCap(g, x, y, w, h, lit) {
  if (w <= 0 || h <= 0) return;
  g.rect(x, y, w, h, WALL_LINE);
  if (w > 2 && h > 2) {
    g.rect(x + 1, y + 1, w - 2, h - 2, WALL_CAP);
    if (lit === 'bottom') g.rect(x + 1, y + h - 2, w - 2, 1, WALL_EDGE);
    else if (lit === 'right') g.rect(x + w - 2, y + 1, 1, h - 2, WALL_EDGE);
    else if (lit === 'left') g.rect(x + 1, y + 1, 1, h - 2, WALL_EDGE);
    else g.rect(x + 1, y + 1, w - 2, 1, WALL_EDGE);
  }
}

/* targhetta d'ottone con l'icona della stanza; spenta (ferro) se la stanza è ancora chiusa */
export function drawPlaque(g, cx, y, id, open) {
  const x = cx - 6;
  const face = open ? '#d8b23c' : '#8f9aa3', ink = open ? '#5a3f12' : '#3c4248';
  g.rect(x, y, 13, 9, open ? '#6b4f14' : '#3c4248');
  g.rect(x + 1, y + 1, 11, 7, face);
  g.rect(x + 1, y + 1, 11, 1, g.shade8(face, 1.25));
  const ic = ROOM_ICON[id] || ROOM_ICON[0];
  for (let r = 0; r < ic.length; r++) for (let c = 0; c < 7; c++) if (ic[r][c] === '#') g.px(x + 3 + c, y + 2 + r, ink);
}

/* lucchetto: arco d'acciaio, corpo d'ottone con la toppa */
export function drawPadlock(g, cx, cy) {
  g.rect(cx - 3, cy - 6, 6, 1, '#2a2016'); g.rect(cx - 3, cy - 5, 1, 4, '#2a2016'); g.rect(cx + 2, cy - 5, 1, 4, '#2a2016');
  g.rect(cx - 2, cy - 5, 4, 1, '#c9ced3');
  g.rect(cx - 4, cy - 2, 9, 8, '#2a2016');
  g.rect(cx - 3, cy - 1, 7, 6, '#c9a227');
  g.rect(cx - 3, cy - 1, 7, 1, '#f0d470');
  g.rect(cx - 3, cy + 4, 7, 1, '#8a6a1e');
  g.px(cx, cy + 1, '#2a2016'); g.px(cx, cy + 2, '#2a2016');
}

/* ---------- la FACCIA di un muro di fondo: cornice, intonaco/carta, zoccolo, battiscopa ----------
   `y0..y1` è l'altezza della faccia; la carta da parati (se c'è) è già stata disegnata sotto,
   qui si aggiungono le modanature, che sono ciò che rende "stanza" una fascia di colore. */
export function drawWainscot(g, x, y, w, h, style) {
  const s = style || ROOM_STYLE[0];
  if (s.wains === 'tile') {                                   // cucina: piastrelle in cotto e crema
    for (let r = 0; r < Math.ceil(h / 5); r++) for (let c = 0; c < Math.ceil(w / 6); c++) {
      const cx = x + c * 6, cy = y + r * 5, cw = Math.min(6, x + w - cx), ch = Math.min(5, y + h - cy);
      g.rect(cx, cy, cw, ch, (r + c) % 2 ? '#efe6cf' : s.wood);
      g.rect(cx, cy, cw, 1, 'rgba(255,255,255,.18)');
    }
    for (let c = 0; c <= w; c += 6) g.rect(x + c, y, 1, h, 'rgba(60,30,20,.25)');
  } else if (s.wains === 'bath') {                            // bagno: piastrelle bianche a mattoncino
    g.rect(x, y, w, h, s.wood);
    for (let r = 0; r < Math.ceil(h / 5); r++) {
      g.rect(x, y + r * 5, w, 1, '#b9ccd2');
      for (let c = (r % 2) * 5; c < w; c += 10) g.rect(x + c, y + r * 5, 1, 5, '#b9ccd2');
    }
    g.rect(x, y, w, 1, '#ffffff');
  } else if (s.wains === 'boards') {                          // camera: perline verticali
    g.rect(x, y, w, h, s.wood);
    for (let c = 0; c < w; c += 6) { g.rect(x + c, y, 1, h, g.shade8(s.wood, 0.7)); g.rect(x + c + 1, y, 1, h, g.shade8(s.wood, 1.18)); }
  } else {                                                    // sala e atrio: pannelli in rilievo
    g.rect(x, y, w, h, s.wood);
    for (let c = 4; c + 20 <= w; c += 26) {
      g.rect(x + c, y + 3, 20, h - 5, g.shade8(s.wood, 0.78));
      g.rect(x + c + 1, y + 4, 18, h - 7, g.shade8(s.wood, 1.08));
      g.rect(x + c + 1, y + 4, 18, 1, g.shade8(s.wood, 1.3));
    }
  }
  g.rect(x, y - 2, w, 2, TRIM_LITE);                          // corrimano sopra lo zoccolo
  g.rect(x, y - 2, w, 1, g.shade8(TRIM_LITE, 1.25));
}
/* battiscopa: la riga scura dove il muro tocca il pavimento */
export function drawBaseboard(g, x, y, w) {
  g.rect(x, y, w, 4, TRIM);
  g.rect(x, y, w, 1, TRIM_LITE);
  g.rect(x, y + 4, w, 1, WALL_LINE);
}
/* cornice in cima alla faccia del muro */
export function drawCrown(g, x, y, w) {
  g.rect(x, y, w, 3, '#efe2c4');
  g.rect(x, y + 3, w, 1, '#a88f6a');
}
/* ombra portata: dove il pavimento incontra un muro la luce cala — due righe trasparenti */
export function floorShadow(g, x, y, w, h, dir) {
  const a = 'rgba(30,18,8,.22)', b = 'rgba(30,18,8,.10)';
  if (dir === 'down') { g.rect(x, y, w, 3, a); g.rect(x, y + 3, w, 3, b); }
  else if (dir === 'right') { g.rect(x, y, 3, h, a); g.rect(x + 3, y, 2, h, b); }
  else { g.rect(x + w - 3, y, 3, h, a); g.rect(x + w - 5, y, 2, h, b); }
}

/* ---------- FINESTRA con tende, davanzale e cielo (giorno/notte) ---------- */
export function drawWindow(g, x, y, style, nightK, time) {
  const s = style || ROOM_STYLE[0];
  const W = 36, H = 20, notte = nightK > 0.4;
  g.rect(x - 1, y - 1, W + 2, H + 2, WALL_LINE);
  g.rect(x, y, W, H, TRIM);
  if (notte) {
    g.rect(x + 3, y + 3, W - 6, H - 6, '#1f2c47');
    g.rect(x + 3, y + 3, W - 6, 6, '#18223a');
    const tw = Math.floor((time || 0) / 700) % 3;
    g.px(x + 7, y + 6, tw === 0 ? '#ffffff' : '#9fb3d6'); g.px(x + 24, y + 9, tw === 1 ? '#ffffff' : '#9fb3d6'); g.px(x + 14, y + 15, '#9fb3d6');
    g.rect(x + 26, y + 11, 3, 3, '#f3ecc0');                  // luna
  } else {
    g.rect(x + 3, y + 3, W - 6, H - 6, '#9fd8ec');
    g.rect(x + 3, y + H - 9, W - 6, 6, '#c9ecf5');
    const cl = Math.floor((time || 0) / 900) % 24;            // nuvoletta che passa, fase dal tempo
    g.rect(x + 4 + (cl % 20), y + 8, 6, 2, '#ffffff'); g.rect(x + 5 + (cl % 20), y + 7, 3, 1, '#ffffff');
    g.rect(x + 4, y + 4, 2, H - 10, 'rgba(255,255,255,.55)'); // riflesso sul vetro
  }
  g.rect(x + W / 2 - 1, y + 3, 2, H - 6, TRIM);                // montante
  g.rect(x + 3, y + H / 2 - 1, W - 6, 2, TRIM);                // traverso
  g.rect(x, y, W, 1, TRIM_LITE);
  g.rect(x - 4, y + H, W + 8, 3, TRIM_LITE);                    // davanzale
  g.rect(x - 4, y + H + 3, W + 8, 1, WALL_LINE);
  /* tende legate ai lati, del colore della stanza */
  const c = s.accent;
  /* LE TENDE CADONO: stringono al fermatenda, si allargano sotto e l'orlo è ondulato. Due
     rettangoli verticali ai lati della finestra erano altre due righe a piombo. */
  for (const [tx, verso] of [[x - 7, -1], [x + W - 1, 1]]) {
    for (let k = 0; k < H + 3; k++) {
      const yy = y - 3 + k;
      const largo = k < 12 ? 8 - Math.round(k * 0.28) : 5 + Math.round((k - 12) * 0.45);   // stretta in vita, larga sotto
      const x0 = verso < 0 ? tx : tx + 8 - largo;
      if (k >= H - 1 && ((x0 + k) % 3 === 0)) continue;                                     // orlo mosso
      g.rect(x0, yy, largo, 1, g.shade8(c, 0.55));
      if (largo > 2) g.rect(x0 + 1, yy, largo - 2, 1, c);
      g.px(x0 + (verso < 0 ? 1 : largo - 2), yy, g.shade8(c, 1.25));
    }
    g.rect(tx, y + 9, 8, 2, s.accent2);                        // fermatenda
  }
  g.rect(x - 10, y - 5, W + 20, 2, '#3a2e20');                  // bastone
  g.px(x - 11, y - 5, '#d8b23c'); g.px(x + W + 10, y - 5, '#d8b23c');
}
/* la luce della finestra che cade sul pavimento (solo di giorno) */
export function drawWindowLight(g, x, y, nightK) {
  if (nightK > 0.4) return;
  for (let i = 0; i < 30; i += 2) g.rect(x + 2 - Math.floor(i / 3), y + i, 32, 2, i < 16 ? 'rgba(255,244,205,.13)' : 'rgba(255,244,205,.07)');
}

/* ---------- zerbino davanti a una porta ---------- */
export function drawDoormat(g, x, y, w, h, c) {
  g.rect(x, y, w, h, g.shade8(c, 0.5));
  g.rect(x + 1, y + 1, w - 2, h - 2, c);
  for (let i = 3; i < w - 3; i += 3) g.rect(x + i, y + 2, 1, h - 4, g.shade8(c, 0.8));
  g.rect(x + 2, y + 2, w - 4, 1, g.shade8(c, 1.2));
  for (let i = 1; i < w - 1; i += 2) { g.px(x + i, y - 1, g.shade8(c, 0.7)); g.px(x + i, y + h, g.shade8(c, 0.7)); } // frange
}
/* guida (tappeto lungo) dell'atrio: bordo d'oro, rombi al centro */
export function drawRunner(g, x, y, w, h) {
  g.rect(x, y, w, h, '#5c2a26');
  g.rect(x + 1, y + 1, w - 2, h - 2, '#a8453c');
  g.rect(x + 3, y + 3, w - 6, h - 6, '#d8b23c');
  g.rect(x + 4, y + 4, w - 8, h - 8, '#94382f');
  for (let yy = y + 12; yy < y + h - 10; yy += 16) {
    const cx = x + Math.floor(w / 2);
    for (let k = 0; k < 4; k++) { g.rect(cx - k, yy + k, 2 * k + 1, 1, '#e0a24a'); g.rect(cx - k, yy + 7 - k, 2 * k + 1, 1, '#e0a24a'); }
    g.px(cx, yy + 3, '#5c2a26'); g.px(cx, yy + 4, '#5c2a26');
  }
  for (let i = 2; i < w - 2; i += 2) { g.px(x + i, y - 1, '#e8dcc0'); g.px(x + i, y + h, '#e8dcc0'); }
}

/* ---------- PORTE ---------- */
/* battente chiuso visto di fronte: assi verticali, due traverse, maniglia */
function doorLeafFront(g, x, y, w, h) {
  g.rect(x, y, w, h, '#3a2a1c');
  g.rect(x + 1, y + 1, w - 2, h - 1, '#8a5f38');
  for (let i = 6; i < w - 2; i += 6) g.rect(x + i, y + 1, 1, h - 1, '#6e4a2e');
  g.rect(x + 1, y + 1, w - 2, 1, '#b07c4a');
  g.rect(x + 2, y + 5, w - 4, 3, '#6e4a2e'); g.rect(x + 2, y + h - 8, w - 4, 3, '#6e4a2e');
  g.rect(x + 2, y + 5, w - 4, 1, '#9a6d45'); g.rect(x + 2, y + h - 8, w - 4, 1, '#9a6d45');
  g.rect(x + w - 6, y + Math.floor(h / 2), 3, 2, '#e8c34a'); g.px(x + w - 6, y + Math.floor(h / 2), '#fff3c8');
}
/* porta sulla FACCIA del muro di fondo (x0..x1 larghezza del varco, faccia da fy0 a fy1).
   Aperta: si vede dentro la stanza (pavimento in luce, ombra in alto) col battente spalancato.
   Chiusa: battente con lucchetto. */
export function drawBackDoor(g, x0, x1, fy0, fy1, open, id, floorCol) {
  const ox = x0 + 7, ow = x1 - x0 - 14, oy = fy0 + 10, oh = fy1 - oy;
  /* stipiti e architrave */
  g.rect(ox - 5, oy - 5, ow + 10, oh + 5, WALL_LINE);
  g.rect(ox - 4, oy - 4, ow + 8, oh + 4, TRIM);
  g.rect(ox - 4, oy - 4, ow + 8, 1, TRIM_LITE);
  g.rect(ox - 4, oy - 4, 1, oh + 4, TRIM_LITE);
  g.rect(ox + ow + 3, oy - 4, 1, oh + 4, g.shade8(TRIM, 0.7));
  if (open) {
    g.rect(ox, oy, ow, oh, '#1c140d');
    g.rect(ox, oy + oh - 12, ow, 12, g.shade8(floorCol || '#b8894f', 0.62));    // il pavimento della stanza di là
    g.rect(ox, oy + oh - 12, ow, 1, g.shade8(floorCol || '#b8894f', 0.4));
    for (let i = 0; i < 4; i++) g.rect(ox + 4 + i * 2, oy + oh - 11 + i * 3, ow - 8 - i * 4, 3, 'rgba(255,236,190,.10)');
    /* battente spalancato verso l'interno, di scorcio sul lato sinistro */
    g.rect(ox, oy, 6, oh, g.shade8('#8a5f38', 0.34)); g.rect(ox + 1, oy + 1, 4, oh - 1, '#8a5f38'); g.rect(ox + 1, oy + 1, 1, oh - 1, '#b07c4a');
    g.px(ox + 4, oy + Math.floor(oh / 2), '#e8c34a');
  } else {
    doorLeafFront(g, ox, oy, ow, oh);
    drawPadlock(g, ox + Math.floor(ow / 2), oy + Math.floor(oh / 2) + 1);
  }
  g.rect(ox - 4, fy1 - 1, ow + 8, 3, '#9a9285');                  // soglia di pietra
  g.rect(ox - 4, fy1 - 1, ow + 8, 1, '#c4bdb0');
  drawPlaque(g, x0 + Math.floor((x1 - x0) / 2), oy - 12, id, open);
}
/* porta su un muro LATERALE (visto dall'alto: lo spessore del muro è interrotto). `side` è
   'left' o 'right'; (wx, ww) è lo spessore del muro, (y0, y1) il varco. */
export function drawSideDoor(g, wx, ww, y0, y1, side, open, id, floorCol) {
  const gy = y0 + 6, gh = y1 - y0 - 12;
  /* stipiti: due blocchetti di legno che chiudono lo spessore */
  g.rect(wx, gy - 4, ww, 4, WALL_LINE); g.rect(wx + 1, gy - 3, ww - 2, 2, TRIM_LITE);
  g.rect(wx, gy + gh, ww, 4, WALL_LINE); g.rect(wx + 1, gy + gh + 1, ww - 2, 2, TRIM);
  if (open) {
    /* il varco: pavimento della stanza di là che si perde nel buio */
    const fc = floorCol || '#b8894f';
    g.rect(wx, gy, ww, gh, g.shade8(fc, 0.7));
    g.rect(side === 'left' ? wx : wx + ww - 6, gy, 6, gh, g.shade8(fc, 0.42));
    g.rect(side === 'left' ? wx + ww - 2 : wx, gy, 2, gh, '#9a9285');      // soglia
    /* battente aperto, appoggiato allo stipite in alto, visto dall'alto */
    const lx = side === 'left' ? wx + 2 : wx + ww - 16;
    g.rect(lx, gy, 14, 4, g.shade8('#8a5f38', 0.34)); g.rect(lx + 1, gy + 1, 12, 2, '#8a5f38'); g.rect(lx + 1, gy + 1, 12, 1, '#b07c4a');
  } else {
    /* chiusa: soglia di pietra piena e il battente, una lama di legno lungo il varco */
    g.rect(wx, gy, ww, gh, '#8a8276');
    for (let i = 6; i < gh; i += 8) g.rect(wx, gy + i, ww, 1, '#6f685c');
    const lx = wx + Math.floor(ww / 2) - 4;
    g.rect(lx, gy, 8, gh, g.shade8('#8a5f38', 0.34)); g.rect(lx + 1, gy, 6, gh, '#8a5f38'); g.rect(lx + 1, gy, 2, gh, '#b07c4a');
    for (let i = 8; i < gh; i += 8) g.rect(lx + 1, gy + i, 6, 1, '#6e4a2e');
    drawPadlock(g, side === 'left' ? wx + ww + 6 : wx - 6, gy + Math.floor(gh / 2));
  }
  drawPlaque(g, wx + Math.floor(ww / 2), gy - 16, id, open);
}
/* uscio in BASSO (verso il mondo o verso l'atrio): varco nella cresta del muro davanti, con
   soglia e un filo di luce che entra da fuori */
export function drawFrontDoorway(g, cx, y, halfW, h, outdoor) {
  const x = cx - halfW, w = halfW * 2;
  g.rect(x - 3, y, 3, h, TRIM); g.rect(x - 3, y, 1, h, TRIM_LITE);
  g.rect(x + w, y, 3, h, TRIM); g.rect(x + w + 2, y, 1, h, WALL_LINE);
  g.rect(x, y, w, h, '#8a8276');
  g.rect(x, y, w, 1, '#c4bdb0');
  for (let i = 5; i < w; i += 8) g.rect(x + i, y + 1, 1, h - 1, '#6f685c');
  if (outdoor) for (let i = 0; i < 3; i++) g.rect(x + 2 + i * 2, y - 6 + i * 2, w - 4 - i * 4, 2, 'rgba(255,240,200,.10)');
}

/* ---------- piccole cose appese nell'atrio ---------- */
export function drawSconce(g, cx, y, time) {
  const f = Math.floor((time || 0) / 180) % 3;
  g.rect(cx - 4, y - 10, 9, 14, 'rgba(255,214,120,.10)');      // alone
  g.rect(cx - 1, y, 3, 5, '#3a2e20');
  g.rect(cx - 3, y - 1, 7, 2, '#c9a227');
  g.rect(cx - 1, y - 5 - (f === 1 ? 1 : 0), 3, 4 + (f === 1 ? 1 : 0), '#e8873a');
  g.px(cx, y - 3, '#fff3c8');
}
export function drawFramedPicture(g, x, y, w, h) {
  g.rect(x, y, w, h, WALL_LINE);
  g.rect(x + 1, y + 1, w - 2, h - 2, '#c9a227');
  g.rect(x + 3, y + 3, w - 6, h - 6, '#8fd0e6');
  g.rect(x + 3, y + h - 8, w - 6, 5, '#6aa35a');                // prato
  g.rect(x + 6, y + h - 12, 8, 4, '#7c8a96'); g.rect(x + 8, y + h - 14, 4, 2, '#eef7fa'); // monte
  g.rect(x + w - 9, y + 5, 3, 3, '#f6dc78');                     // sole
  g.rect(x + 1, y + 1, w - 2, 1, '#f0d470');
}
export function drawCoatHooks(g, x, y) {
  g.rect(x, y, 22, 3, TRIM); g.rect(x, y, 22, 1, TRIM_LITE);
  for (const hx of [3, 11, 19]) g.rect(x + hx, y + 3, 1, 2, '#c9a227');
  /* cappello da esploratore e sciarpa: è la casa di un archeologo */
  g.rect(x + 1, y + 5, 7, 3, '#8a5a2a'); g.rect(x, y + 8, 9, 1, '#5c3c1c'); g.rect(x + 2, y + 5, 5, 1, '#a8743a');
  g.rect(x + 17, y + 5, 4, 10, '#c65a54'); g.rect(x + 17, y + 13, 4, 2, '#e8dcc0');
}
export function drawWallPlant(g, cx, baseY) {
  g.rect(cx - 5, baseY - 8, 11, 8, g.shade8('#c86a4a', 0.34)); g.rect(cx - 4, baseY - 7, 9, 7, '#c86a4a'); g.rect(cx - 4, baseY - 7, 9, 2, '#e08a62');
  g.rect(cx - 7, baseY - 16, 6, 7, '#3f7a3a'); g.rect(cx + 2, baseY - 18, 6, 9, '#4f9a48'); g.rect(cx - 2, baseY - 22, 5, 12, '#5fae52');
  g.px(cx, baseY - 20, '#8fd07a'); g.px(cx + 4, baseY - 15, '#8fd07a');
}
