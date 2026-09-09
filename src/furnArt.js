/* ARREDO DELLA CASA — DISEGNO NATIVO a 32px, modulo puro (stesso schema di wonderart.js:
   riceve il pennello `g = {rect, px, shadow, shade8}` e non sa niente del resto del gioco).

   Prima i mobili erano cubetti voxel proiettati in isometrica sopra un pavimento disegnato in
   pianta: due proiezioni che litigano, e il risultato è che nessun pezzo "poggia" da nessuna
   parte — sembravano buttati lì. Qui ogni pezzo è disegnato nella STESSA vista del resto del
   gioco (di tre quarti dall'alto), con:
     · un'OMBRA DI CONTATTO alla base (senza, l'oggetto galleggia);
     · un lato in luce e uno in ombra (mai una tinta piatta);
     · un contorno più scuro del proprio colore, così stacca dal pavimento di qualsiasi zona;
     · l'ingombro VERO in caselle (un letto è 2×2) e un'altezza che sfora VERSO L'ALTO, come
       fa un mobile guardato da davanti.

   Le animazioni prendono la fase SOLO dal tempo (REGOLE FERREE #1): la fiamma del focolare e
   il bagliore delle lampade non devono correre insieme alla camera.

   La banca degli sprite (spritebank.js) ha la precedenza: `furn:<id>` disegnato a mano nello
   Sprite Studio sostituisce il procedurale, come per le meraviglie. */
import { FURN_BY_ID } from './data.js';
import { hasSprite, drawSprite } from './spritebank.js';
import { makeCanvasBrush as makeBrush } from './brush.js';

const TS = 32;

/* categoria = che FORMA ha, non che nome ha: i 6 set per zona sono lo stesso mobile in tinte
   diverse, e disegnarlo 6 volte vorrebbe dire sbagliarlo in 6 punti diversi. */
export function artCategory(id) {
  const it = FURN_BY_ID[id];
  if (!it) return 'box';
  if (it.place === 'wall') return 'wall';
  if (it.place === 'paper') return 'paper';
  if (it.place === 'ground') return 'ground';
  if (it.slot === 'pedestal') return 'pedestal';
  if (it.slot === 'tappeto') return 'rug';
  if (it.slot === 'letto') return 'bed';
  if (it.slot === 'tavolo') return 'table';
  if (/chair|throne/.test(id)) return 'chair';
  if (/chest/.test(id)) return 'chest';
  if (/hearth/.test(id)) return 'hearth';
  if (/crystal/.test(id)) return 'crystal';
  if (/cactus|vase/.test(id)) return 'plant';
  if (/lamp/.test(id)) return 'lamp';
  return 'box';
}

/* quanto un pezzo sfora VERSO L'ALTO oltre la sua casella (px). È ciò che dà l'altezza: un
   letto ha la testiera, una lampada è tutta in verticale, un tappeto è raso terra. */
const RISE = { rug: 0, bed: 14, table: 12, chair: 22, chest: 14, hearth: 20, crystal: 22, plant: 22, lamp: 30, pedestal: 26, box: 14, wall: 0, paper: 0, ground: 0 };
export function furnRise(id) { return RISE[artCategory(id)] ?? 14; }

/* palette di un pezzo dal suo colore: quattro toni veri (luce/base/ombra/contorno), non due
   sfumature vicine — a questa scala 0.85 e 1.15 dello stesso colore si fondono in una massa. */
function pal(g, col) {
  return {
    lite: g.shade8(col, 1.28),
    base: col,
    dark: g.shade8(col, 0.72),
    line: g.shade8(col, 0.42),
  };
}
/* legno/struttura: sempre lo stesso marrone, così i mobili di zone diverse restano parenti */
const WOOD = '#7a5636', WOOD_D = '#5c4027', WOOD_L = '#9a7048';

/* ---------- i pezzi ---------- */
/* TAPPETO: raso terra, bordo netto, trama interna e frange. Un rettangolo di colore piatto a
   32px si legge come una macchia (segnalato con foto): servono bordo, trama e frange. */
function drawRug(g, x, y, w, h, col) {
  const p = pal(g, col);
  /* un tappeto è un FONDO, non un mobile: tinte vicine e un bordo netto. Con l'interno a
     tutta luce rubava la scena ai mobili che ci stanno sopra. */
  g.rect(x + 2, y + 2, w - 4, h - 4, p.line);
  g.rect(x + 3, y + 3, w - 6, h - 6, p.dark);
  g.rect(x + 5, y + 5, w - 10, h - 10, p.base);
  g.rect(x + 8, y + 8, w - 16, h - 16, g.shade8(col, 0.9));
  /* rombo centrale: dà un centro alla stanza, che è a cosa serve un tappeto */
  const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 7;
  for (let i = -r; i <= r; i++) {                            // rombo di contorno, non pieno
    const sw = r - Math.abs(i);
    g.rect(Math.round(cx - sw), Math.round(cy + i), 2, 1, p.dark);
    g.rect(Math.round(cx + sw - 1), Math.round(cy + i), 2, 1, p.dark);
  }
  for (let fx = x + 4; fx < x + w - 4; fx += 4) {          // frange sui lati corti
    g.rect(fx, y + 1, 2, 1, p.dark); g.rect(fx, y + h - 2, 2, 1, p.dark);
  }
}
/* LETTO: materasso + coperta risvoltata + cuscino + testiera che sale sopra la casella */
function drawBed(g, x, y, w, h, col) {
  const p = pal(g, col), top = y - 14;
  g.rect(x + 2, top, w - 4, 16, WOOD_D);                    // testiera
  g.rect(x + 3, top + 1, w - 6, 12, WOOD);
  g.rect(x + 3, top + 1, w - 6, 3, WOOD_L);
  g.rect(x + 1, y + 2, w - 2, h - 4, WOOD_D);               // struttura
  g.rect(x + 2, y + 3, w - 4, h - 7, WOOD);
  g.rect(x + 4, y + 4, w - 8, h - 9, p.lite);               // lenzuolo
  g.rect(x + 4, y + h * 0.42, w - 8, h * 0.5, p.base);      // coperta
  g.rect(x + 4, y + h * 0.42, w - 8, 3, p.dark);            // risvolto
  g.rect(x + 4, y + h * 0.42 + 3, w - 8, 2, g.shade8(col, 1.12));
  for (let sx2 = x + 7; sx2 < x + w - 6; sx2 += 8)          // trapunta: cuciture
    g.rect(sx2, y + h * 0.55, 1, h * 0.3, p.dark);
  g.rect(x + 5, y + 5, w * 0.5, 11, '#efe6cf');             // cuscino
  g.rect(x + 5, y + 5, w * 0.5, 3, '#ffffff');
  g.rect(x + 5, y + 15, w * 0.5, 1, '#cdc0a4');
  g.rect(x + 2, y + h - 4, 3, 4, WOOD_D); g.rect(x + w - 5, y + h - 4, 3, 4, WOOD_D);  // piedi
}
/* TAVOLO: piano con filo di luce + quattro gambe visibili sotto (senza, è una lastra) */
function drawTable(g, x, y, w, h, col) {
  const p = pal(g, col), top = y - 12;
  g.rect(x + 4, top + 10, 4, h - 6, WOOD_D); g.rect(x + w - 8, top + 10, 4, h - 6, WOOD_D);
  g.rect(x + 1, top, w - 2, 12, p.line);
  g.rect(x + 2, top + 1, w - 4, 9, p.base);
  g.rect(x + 2, top + 1, w - 4, 3, p.lite);
  g.rect(x + 2, top + 9, w - 4, 2, p.dark);
}
/* SEDIA/POLTRONA/TRONO: seduta + schienale alto + BRACCIOLI che spuntano ai lati. Senza i
   braccioli la sagoma è una cassapanca (già segnalato sul modello voxel). */
function drawChair(g, x, y, w, h, col) {
  const p = pal(g, col), top = y - 22;
  /* i legni scuri (poltrona di corteccia, trono di pietra) hanno base, luce e ombra tutte
     scure: a questa scala si fondono in un blocco nero e la sagoma sparisce. Il CUSCINO
     prende un salto di tono vero — stoffa contro legno, come in un mobile vero. */
  const cush = g.shade8(col, 2.1);
  g.rect(x + 6, top, w - 12, 22, p.line);                   // schienale
  g.rect(x + 7, top + 1, w - 14, 19, p.base);
  g.rect(x + 7, top + 1, w - 14, 3, p.lite);
  g.rect(x + 9, top + 6, w - 18, 8, cush);                  // schienale imbottito
  g.rect(x + 3, top + 12, 4, 14, WOOD_D);                   // braccioli, più larghi della seduta
  g.rect(x + w - 7, top + 12, 4, 14, WOOD_D);
  g.rect(x + 4, y + 4, w - 8, h - 10, p.line);              // seduta
  g.rect(x + 5, y + 5, w - 10, h - 12, cush);
  g.rect(x + 5, y + 5, w - 10, 2, g.shade8(col, 2.6));
  g.rect(x + 5, y + h - 7, w - 10, 2, p.dark);
  g.rect(x + 5, y + h - 5, 3, 4, WOOD_D); g.rect(x + w - 8, y + h - 5, 3, 4, WOOD_D);
}
/* BAULE: cassa + coperchio bombato + serratura */
function drawChest(g, x, y, w, h, col) {
  const p = pal(g, col), top = y - 14;
  g.rect(x + 3, top + 4, w - 6, h + 6, p.line);
  g.rect(x + 4, top + 5, w - 8, h + 4, p.base);
  g.rect(x + 4, top, w - 8, 7, p.dark);                     // coperchio
  g.rect(x + 5, top + 1, w - 10, 4, p.lite);
  g.rect(x + 4, top + 8, w - 8, 2, WOOD_D);                 // cinghia
  g.rect(x + w / 2 - 2, top + 6, 4, 6, '#e8c34a');          // serratura d'ottone
  g.rect(x + w / 2 - 1, top + 8, 2, 2, '#6b5137');
}
/* FOCOLARE: pietre + fuoco ANIMATO (fase solo dal tempo) */
function drawHearth(g, x, y, w, h, col, t) {
  const p = pal(g, col), top = y - 20;
  g.rect(x + 2, top, w - 4, h + 18, p.line);
  g.rect(x + 3, top + 1, w - 6, h + 16, p.base);
  for (let sx = x + 5; sx < x + w - 6; sx += 7) {           // conci di pietra
    g.rect(sx, top + 3, 5, 4, p.lite); g.rect(sx + 2, top + 9, 5, 4, p.dark);
  }
  const mx = x + w / 2, my = y + h - 8;
  g.rect(mx - 9, my - 2, 18, 8, '#2a1c12');                 // bocca del camino
  const f = Math.sin(t * 6) * 0.5 + 0.5, fh = 6 + Math.round(f * 4);
  g.rect(mx - 6, my + 4 - fh, 12, fh, '#c9502a');
  g.rect(mx - 4, my + 4 - fh + 2, 8, fh - 2, '#e8873a');
  g.rect(mx - 2, my + 4 - fh + 4, 4, Math.max(1, fh - 5), '#f6dc78');
  g.rect(mx - 8, my + 4, 16, 2, '#5c3a22');                 // legna
}
/* CRISTALLO ORNAMENTALE: gruppo di punte + scintilla che pulsa */
function drawCrystal(g, x, y, w, h, col, t) {
  const p = pal(g, col), bx = x + w / 2, by = y + h - 4;
  g.rect(bx - 8, by - 3, 16, 5, '#4a3a2c');                 // base di roccia
  const spike = (dx, hh, wd, c1, c2) => {
    for (let i = 0; i < hh; i++) {
      const ww = Math.max(1, Math.round(wd * (1 - i / hh)));
      g.rect(Math.round(bx + dx - ww / 2), by - 3 - i, ww, 1, i < hh * 0.5 ? c2 : c1);
    }
  };
  spike(-5, 12, 6, p.dark, p.base);
  spike(5, 14, 6, p.dark, p.base);
  spike(0, 22, 8, p.base, p.lite);
  if (Math.sin(t * 3) > 0.3) g.rect(bx + 3, by - 22, 2, 2, '#ffffff');
}
/* PIANTA/CACTUS/VASO: vaso in cotto + chioma tondeggiante (non un parallelepipedo verde) */
function drawPlant(g, x, y, w, h, col) {
  const p = pal(g, col), bx = x + w / 2, by = y + h - 3;
  g.rect(bx - 7, by - 10, 14, 10, '#8a5a3a');               // vaso
  g.rect(bx - 7, by - 10, 14, 3, '#a9714a');
  g.rect(bx - 6, by - 1, 12, 2, '#5c3a22');
  g.rect(bx - 6, by - 24, 12, 14, p.base);                  // chioma
  g.rect(bx - 4, by - 26, 8, 4, p.base);
  g.rect(bx - 5, by - 23, 5, 8, p.lite);
  g.rect(bx + 1, by - 18, 4, 6, p.dark);
  g.rect(bx - 10, by - 20, 4, 7, p.base); g.rect(bx + 6, by - 18, 4, 6, p.base);   // bracci
}
/* LAMPADA: stelo + paralume + ALONE caldo che respira (una lampada spenta non è un decoro) */
function drawLamp(g, x, y, w, h, col, t) {
  const p = pal(g, col), bx = x + w / 2, by = y + h - 3;
  g.rect(bx - 5, by - 3, 10, 4, WOOD_D);                    // base
  g.rect(bx - 5, by - 3, 10, 2, WOOD);
  g.rect(bx - 2, by - 22, 4, 20, WOOD);                     // stelo
  g.rect(bx - 1, by - 22, 1, 20, WOOD_L);
  g.rect(bx - 8, by - 32, 16, 11, p.line);                  // paralume
  g.rect(bx - 7, by - 31, 14, 9, p.base);
  g.rect(bx - 7, by - 31, 14, 3, p.lite);
  const glow = 0.55 + 0.45 * (Math.sin(t * 2) * 0.5 + 0.5);
  g.rect(bx - 6, by - 21, 12, 2, g.shade8(p.lite, 0.7 + glow * 0.5));
}
/* PIEDISTALLO: base larga, colonna, ripiano — deve leggersi come "museo", non come sgabello */
function drawPedestal(g, x, y, w, h, col) {
  const p = pal(g, col), bx = x + w / 2, by = y + h - 2;
  g.rect(bx - 11, by - 6, 22, 6, p.line);                   // zoccolo a due gradini
  g.rect(bx - 10, by - 5, 20, 4, p.base);
  g.rect(bx - 10, by - 5, 20, 2, p.lite);
  g.rect(bx - 8, by - 10, 16, 5, p.line);
  g.rect(bx - 7, by - 9, 14, 3, p.base);
  g.rect(bx - 7, by - 24, 14, 15, p.line);                  // colonna
  g.rect(bx - 6, by - 23, 12, 14, p.dark);
  g.rect(bx - 6, by - 23, 4, 14, p.base);                   // lato in luce
  g.rect(bx - 5, by - 23, 1, 14, p.lite);
  g.rect(bx - 11, by - 29, 22, 6, p.line);                  // ripiano
  g.rect(bx - 10, by - 28, 20, 4, p.base);
  g.rect(bx - 10, by - 28, 20, 2, p.lite);
}
/* PEZZO DA PARETE: cornice + motivo per zona. Sta SULLA parete di fondo, quindi non ha ombra
   di contatto a terra ma un'ombra portata sul muro, come un quadro vero. */
function drawWallPiece(g, x, y, w, h, id, col) {
  const p = pal(g, col), cx = x + w / 2, cy = y + h / 2;
  g.rect(x + 5, y + 4, w - 8, h - 8, 'rgba(20,14,8,.22)');  // ombra portata sul muro
  g.rect(x + 3, y + 2, w - 8, h - 8, WOOD_D);               // cornice
  g.rect(x + 5, y + 4, w - 12, h - 12, p.base);
  if (/skull/.test(id)) {                                   // Dune: cranio appeso
    g.rect(cx - 7, cy - 8, 14, 11, '#e6dcc0'); g.rect(cx - 5, cy + 3, 10, 4, '#e6dcc0');
    g.rect(cx - 5, cy - 5, 3, 3, '#3a2e20'); g.rect(cx + 2, cy - 5, 3, 3, '#3a2e20');
  } else if (/shelf/.test(id) || /boschi/.test(id)) {       // Boschi: mensola con funghi
    g.rect(x + 5, cy + 3, w - 12, 3, WOOD);
    g.rect(cx - 6, cy - 3, 5, 6, '#c95a5a'); g.rect(cx - 7, cy - 4, 7, 3, '#e08a7a');
    g.rect(cx + 2, cy - 1, 4, 4, '#c95a5a'); g.rect(cx + 1, cy - 2, 6, 2, '#e08a7a');
  } else if (/ghiacci/.test(id)) {                          // Lande: specchio
    g.rect(x + 6, y + 5, w - 14, h - 14, '#dff0f7');
    g.rect(x + 7, y + 6, 4, h - 16, '#ffffff');
  } else if (/palude/.test(id)) {                           // Palude: ninfea appesa
    g.rect(cx - 7, cy - 2, 14, 7, '#5f8a5a'); g.rect(cx - 3, cy - 6, 6, 5, '#e8a0c0');
  } else if (/prati/.test(id)) {                            // Prati: ghirlanda di spighe
    for (let i = -6; i <= 6; i += 4) { g.rect(cx + i, cy - 6, 2, 12, '#c9a227'); g.rect(cx + i - 1, cy - 7, 4, 3, '#e8c86a'); }
  } else {                                                  // Terre: quadro d'argilla
    g.rect(x + 7, cy - 1, w - 16, 6, p.dark);
    g.rect(x + 7, cy - 6, w - 20, 5, p.lite);
  }
  g.rect(x + 3, y + 2, w - 8, 2, WOOD_L);                   // filo di luce sulla cornice
}

/* ---------- il pezzo, disegnato ---------- */
/* `x,y` = angolo alto-sinistro dell'INGOMBRO (px), `w,h` = ingombro in px. */
export function drawFurnPiece(g, id, x, y, w, h, time) {
  const it = FURN_BY_ID[id]; if (!it) return;
  const col = it.col || '#c8b078', cat = artCategory(id), t = (time || 0) / 1000;
  if (hasSprite('furn:' + id)) { drawSprite(g, 'furn:' + id, x + w / 2, y + h); return; }
  if (cat === 'wall') { drawWallPiece(g, x, y, w, h, id, col); return; }
  /* OMBRA DI CONTATTO: è la riga che fa poggiare il mobile sul pavimento invece di
     galleggiarci sopra. Sta prima del pezzo, larga come la sua base. */
  if (cat !== 'rug') g.shadow(Math.round(x + w / 2), Math.round(y + h - 2), Math.round(w / 2 - 2));
  if (cat === 'rug') drawRug(g, x, y, w, h, col);
  else if (cat === 'bed') drawBed(g, x, y, w, h, col);
  else if (cat === 'table') drawTable(g, x, y, w, h, col);
  else if (cat === 'chair') drawChair(g, x, y, w, h, col);
  else if (cat === 'chest') drawChest(g, x, y, w, h, col);
  else if (cat === 'hearth') drawHearth(g, x, y, w, h, col, t);
  else if (cat === 'crystal') drawCrystal(g, x, y, w, h, col, t);
  else if (cat === 'plant') drawPlant(g, x, y, w, h, col);
  else if (cat === 'lamp') drawLamp(g, x, y, w, h, col, t);
  else if (cat === 'pedestal') drawPedestal(g, x, y, w, h, col);
  else {                                                     // ripiego: cassa con volume
    const p = pal(g, col);
    g.rect(x + 3, y - 8, w - 6, h + 6, p.line);
    g.rect(x + 4, y - 7, w - 8, h + 4, p.base);
    g.rect(x + 4, y - 7, w - 8, 3, p.lite);
  }
}

/* ---------- il FONDO della stanza: pavimento e carta da parati ---------- */
/* Il fondo è arredo anche lui, ed è la leva che cambia una stanza più di ogni mobile: due
   stanze con gli stessi mobili ma parati diversi sembrano due case. */
export function drawGroundTile(g, id, sx, sy, tx, ty, def) {
  const it = FURN_BY_ID[id];
  const c1 = (it && it.col) || (def && def.c1) || '#c9a25a';
  const c2 = (it && it.col2) || (def && def.c2) || g.shade8(c1, 0.88);
  const kind = it ? (/ice|ghiacci/.test(id || '') ? 'slab' : /dune/.test(id || '') ? 'stone'
    : /terre/.test(id || '') ? 'tile' : 'plank') : ((def && def.kind) || 'plank');
  if (kind === 'slab') {                                     // lastre di ghiaccio: giunti chiari
    g.rect(sx, sy, TS, TS, (tx + ty) % 2 ? c1 : c2);
    g.rect(sx, sy, TS, 2, g.shade8(c1, 1.2)); g.rect(sx, sy, 2, TS, g.shade8(c1, 1.15));
    if ((tx * 5 + ty * 3) % 7 === 0) g.rect(sx + 8, sy + 10, 12, 1, g.shade8(c1, 1.3));
  } else if (kind === 'stone') {                              // arenaria: blocchi sfalsati
    g.rect(sx, sy, TS, TS, c1);
    g.rect(sx, sy + 15, TS, 2, g.shade8(c2, 0.85));
    const off = (ty % 2) * 16;
    g.rect(sx + off, sy, 2, 15, g.shade8(c2, 0.85)); g.rect(sx + ((off + 16) % 32), sy + 17, 2, 15, g.shade8(c2, 0.85));
  } else if (kind === 'tile') {                               // cotto: mattonelle con fuga
    g.rect(sx, sy, TS, TS, (tx + ty) % 2 ? c1 : c2);
    g.rect(sx, sy, TS, 1, g.shade8(c1, 0.7)); g.rect(sx, sy, 1, TS, g.shade8(c1, 0.7));
    g.rect(sx + 2, sy + 2, 10, 2, g.shade8(c1, 1.18));
  } else {                                                    // assi: fughe continue, giunti sfalsati
    const tono = (ty % 2) ? c1 : c2;
    g.rect(sx, sy, TS, TS, tono);
    g.rect(sx, sy, TS, 2, g.shade8(tono, 1.1));               // filo di luce in cima all'asse
    g.rect(sx, sy + TS - 2, TS, 2, g.shade8(tono, 0.78));     // fuga fra un'asse e l'altra
    /* GIUNTO VERTICALE RARO: un'asse è lunga, non quadrata. Uno per casella disegnava una
       griglia di quadrati e il pavimento tornava a sembrare una scacchiera. */
    if ((tx + ty * 2) % 3 === 0) {
      g.rect(sx + 6, sy, 2, TS, g.shade8(tono, 0.72));
      g.rect(sx + 8, sy, 1, TS, g.shade8(tono, 1.06));
    }
  }
}
/* carta da parati: la fascia alta della stanza. Righe/quadretti/fiocchi secondo la zona, con
   BATTISCOPA in basso — la riga scura che separa parete e pavimento è ciò che fa "stanza". */
export function drawPaperBand(g, id, x, y, w, hgt, def) {
  const it = FURN_BY_ID[id];
  const c1 = (it && it.col) || (def && def.c1) || '#8a6a4a';
  const c2 = (it && it.col2) || (def && def.c2) || g.shade8(c1, 0.82);
  g.rect(x, y, w, hgt, c1);
  const kind = it ? (/prati|dune/.test(id || '') ? 'stripe' : /boschi|palude/.test(id || '') ? 'leaf'
    : /terre/.test(id || '') ? 'block' : 'frost') : ((def && def.kind) || 'plain');
  if (kind === 'stripe') {
    for (let sx = x + 4; sx < x + w; sx += 12) g.rect(sx, y, 3, hgt - 6, c2);
  } else if (kind === 'leaf') {
    for (let sx = x + 6; sx < x + w; sx += 16) for (let sy = y + 6; sy < y + hgt - 8; sy += 12) {
      g.rect(sx, sy, 5, 2, c2); g.rect(sx + 1, sy - 2, 3, 2, c2); g.rect(sx + 1, sy + 2, 3, 2, c2);
    }
  } else if (kind === 'block') {
    for (let sy = y + 5; sy < y + hgt - 6; sy += 11) for (let sx = x + ((sy - y) % 22 ? 0 : 11); sx < x + w; sx += 22) {
      g.rect(sx, sy, 20, 9, c2); g.rect(sx, sy, 20, 2, g.shade8(c1, 1.12));
    }
  } else if (kind === 'plain') {
    /* intonaco di serie: non un rettangolo piatto — due toni orizzontali e qualche stacco,
       perché anche la stanza NON arredata deve sembrare una stanza */
    g.rect(x, y, w, Math.round(hgt * 0.45), g.shade8(c1, 1.06));
    for (let sx = x; sx < x + w; sx += 48) g.rect(sx, y + Math.round(hgt * 0.45), 48 - 4, 1, c2);
  } else {
    for (let sx = x + 8; sx < x + w; sx += 14) for (let sy = y + 7; sy < y + hgt - 8; sy += 13) {
      g.rect(sx, sy - 3, 1, 7, c2); g.rect(sx - 3, sy, 7, 1, c2); g.rect(sx - 2, sy - 2, 1, 1, c2); g.rect(sx + 2, sy + 2, 1, 1, c2);
    }
  }
  g.rect(x, y + hgt - 6, w, 6, g.shade8(c1, 0.55));           // battiscopa
  g.rect(x, y + hgt - 6, w, 2, g.shade8(c1, 0.75));
}

/* MINIATURA di un pezzo su una canvas piccola (negozio, vassoio, pezzo "in mano"): lo STESSO
   disegno della stanza, scalato per stare nel riquadro. Non un secondo disegno "simile": era
   proprio così che l'anteprima e il mobile vero finivano per non somigliarsi più. */
export function drawFurnThumb(cv, id, time) {
  const c2 = cv.getContext && cv.getContext('2d'); if (!c2) return false;
  c2.imageSmoothingEnabled = false;
  c2.clearRect(0, 0, cv.width, cv.height);
  const it = FURN_BY_ID[id]; if (!it) return false;
  const w = (it.w || 1) * TS, h = (it.h || 1) * TS, rise = furnRise(id);
  const cat = artCategory(id);
  /* i FONDI non sono oggetti: la loro anteprima è un pezzo di parete/pavimento, che è
     esattamente quello che si compra */
  if (cat === 'paper' || cat === 'ground') {
    const k = Math.max(1, Math.floor(Math.min(cv.width / TS, cv.height / TS)));
    c2.save(); c2.scale(k, k);
    if (cat === 'ground') for (let ty = 0; ty < Math.ceil(cv.height / (TS * k)) + 1; ty++)
      for (let tx = 0; tx < Math.ceil(cv.width / (TS * k)) + 1; tx++) drawGroundTile(makeBrush(c2), id, tx * TS, ty * TS, tx, ty);
    else drawPaperBand(makeBrush(c2), id, 0, 0, Math.ceil(cv.width / k), Math.ceil(cv.height / k));
    c2.restore();
    return true;
  }
  const totH = h + rise;
  const k = Math.max(1, Math.min(cv.width / (w + 6), cv.height / (totH + 4)));
  c2.save();
  c2.translate(Math.round((cv.width - w * k) / 2), Math.round((cv.height - totH * k) / 2 + rise * k));
  c2.scale(k, k);
  drawFurnPiece(makeBrush(c2), id, 0, 0, w, h, time);
  c2.restore();
  return true;
}

/* IL FONDO DI SERIE di ogni stanza, prima che si compri qualcosa: la Sala e la Cucina in
   assi, il Bagno a mattonelle, la Camera in legno scuro. Anche una stanza vuota deve
   sembrare una stanza: la scacchiera a due toni la faceva sembrare un livello di prova. */
export const ROOM_DEFAULT = [
  { ground: { c1: '#b8894f', c2: '#a97a45', kind: 'plank' }, paper: { c1: '#c8ab86', c2: '#a98a68' } },  // Sala
  { ground: { c1: '#bb9058', c2: '#a97f4a', kind: 'plank' }, paper: { c1: '#cbb391', c2: '#a89372' } },  // Cucina
  { ground: { c1: '#cfe2ea', c2: '#b6ced9', kind: 'tile' }, paper: { c1: '#bcd4de', c2: '#9cb6c2' } },   // Bagno
  { ground: { c1: '#8a6238', c2: '#77522e', kind: 'plank' }, paper: { c1: '#9a7b5c', c2: '#7d6146' } },  // Camera
];
export function roomDefault(id) { return ROOM_DEFAULT[id] || ROOM_DEFAULT[0]; }
