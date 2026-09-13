/* INTERNI — le sei stanze a tema, la galleria del museo e gli NPC che ci vivono.
   Erano quasi 500 righe dentro render.js: qui stanno insieme perché condividono la stessa
   idea (una stanza a tile con arredi solidi e un NPC che pattuglia dietro il bancone) e
   nessuna di loro serve al mondo aperto. */
import { TS, spById, PARTS, ZONES, MUSEUM_ZONES, zonePools, FURN_BY_ID, PEDESTAL_ID, furnIsSolid, furnSize, furnPlace } from './data.js';
import { drawFurnPiece, drawGroundTile, drawPaperBand, furnRise, roomDefault } from './furnArt.js';
import { drawReturnPortal } from './render.js'; // ciclo sicuro: chiamata solo a runtime, come drawInteriorScene(render.js→interiors.js)
import { S, P } from './state.js';
import { ctx, view, hudPad } from './screen.js';
import { snap, px, rect, shadow, shade8, BRUSH } from './brush.js';
import { INT, NPCS, pedList, roomOrigin, ROOM_W, ROOM_H, GAL_DESK, MENTOR, CUT } from './interior.js';
import { CORR_W, CORR_H, ROOM_TILE_W, ROOM_TILE_H, houseGates, roomUnlocked, ATRIO_PORTAL, furnLayer, roomPaper, roomGround, isHolding, holdItem, holdPlacement, rotateHandleRect } from './house.js';
import { drawHero, applyLook } from './sprites.js';
import { composedPartsVox, shadeHex } from './bones.js';
import { zoneName, roomName } from './i18n.js';
import { zoneIdxAt } from './regions.js';
import { INT_WOOD, night } from './tiles.js';
import { drawSayBalloon } from './props.js';
import { vhash } from './noise.js';
import { egg as breedEgg, eggReady } from './breeding.js';

/* MAESTRO SCAVATORE: esploratore che passeggia nell'atrio del museo (nessun glifo sopra la testa) */
const MENTOR_LOOK = { hat: '#8a5a2a', shirt: '#b5622e', pants: '#4a3524', skin: '#e3b98a', hairStyle: 'short', hairColor: '#5a4636', hatStyle: 'explorer', eyeColor: '#33291f' };
export function drawMentor(x, y, dir, fr) {
  const saved = S.look; S.look = MENTOR_LOOK; applyLook();
  shadow(x, y + 12, 12);
  drawHero(null, snap(x - 16), snap(y - 20), dir, fr);
  S.look = saved; applyLook();
}

/* ---------- interni delle case ---------- */

/* NEGOZIO: scaffali di merci, casse, sacchi, botti, bilancia che oscilla, lanterna */
export function drawStoreRoom(rw, rh, time) {
  /* FASE 2: nativa — rw/rh arrivano già alla scala vera (niente più dimezzamento sotto
     scale(2,2)); ogni numero interno raddoppiato, con un quarto tono in più su casse/botti. */
  const shx = rw / 2 - 60;
  rect(shx, 10, 120, 36, '#6e5138'); rect(shx + 4, 14, 112, 10, '#8a6a4a'); rect(shx + 4, 30, 112, 10, '#8a6a4a');
  const goods = ['#e8c34a', '#c65a54', '#5a86c8', '#5fa04e', '#8d7ba0', '#e08aa8'];
  goods.forEach((c, i) => { rect(shx + 8 + i * 18, 16, 12, 8, c); rect(shx + 12 + ((i * 10) % 80), 32, 10, 8, goods[(i + 3) % 6]); });
  rect(shx + 100, 6, 16, 12, '#f6efdd'); px(shx + 104, 10, '#c65a54'); px(shx + 110, 10, '#c65a54'); // cartellino
  /* salami e erbe appesi al soffitto (dondolano) */
  const sw2 = Math.round(Math.sin(time / 700)) * 2;
  for (const [hx2, c] of [[60, '#8a3f3a'], [84, '#5fa04e'], [252, '#8a3f3a']]) {
    rect(hx2, 4, 2, 12, '#5c4229');
    rect(hx2 - 2 + sw2, 16, 6, 16, c); px(hx2 + sw2, 32, c);
  }
  /* bilancia che oscilla + monete + registro sul bancone */
  const bx = rw / 2 + 52, tilt = (Math.floor(time / 900) % 2 ? 1 : -1) * 2;
  rect(bx, 60, 4, 16, '#5a5248'); rect(bx - 12, 60, 28, 4, '#8f887a');
  rect(bx - 14, 64 + tilt, 10, 4, '#c9a06a'); rect(bx + 8, 64 - tilt, 10, 4, '#c9a06a');
  rect(rw / 2 - 60, 64, 12, 6, '#e8c34a'); rect(rw / 2 - 56, 60, 8, 4, '#e8c34a');     // pila di monete
  rect(rw / 2 - 36, 62, 20, 10, '#f6efdd'); rect(rw / 2 - 26, 62, 2, 10, '#8a5f38');   // registro aperto
  /* lanterna appesa (fiammella) */
  const lf = Math.floor(time / 300) % 2;
  rect(28, 8, 4, 12, '#5c4229'); rect(22, 20, 16, 18, '#5a5248'); rect(26, 24, 8, 10, lf ? '#f2c53d' : '#e8862e');
  /* casse, sacco di grano e GATTO che dorme (coda che si muove) */
  rect(28, 92, 32, 32, '#a97a4c'); rect(28, 92, 32, 6, '#c49a63'); rect(40, 104, 8, 8, '#6e5138');
  rect(28, 92, 4, 32, shade8('#a97a4c', 1.45)); rect(56, 92, 4, 32, shade8('#a97a4c', 0.6));
  rect(60, 100, 28, 28, '#8a5f38'); rect(64, 96, 20, 8, '#8a5f38');
  rect(60, 100, 4, 28, shade8('#8a5f38', 1.45)); rect(84, 100, 4, 28, shade8('#8a5f38', 0.6));
  rect(32, 124, 24, 16, '#d4b13c'); rect(36, 120, 16, 8, '#c9a06a'); px(42, 120, '#8a5f38');
  /* GATTO arancione a strisce che dorme (contorno scuro → stacca dal legno) */
  const cat = (Math.floor(time / 800) % 2) * 2;
  rect(60, 86, 24, 14, '#3a2a18'); rect(62, 88, 20, 10, '#e08a2c');                       // corpo + contorno
  rect(56, 82, 12, 10, '#3a2a18'); rect(58, 84, 8, 6, '#e08a2c');                          // testa
  px(64, 82, '#c65a1e'); px(58, 82, '#c65a1e');                                            // orecchie
  rect(66, 88, 2, 8, '#b5652a'); rect(72, 88, 2, 8, '#b5652a');                            // strisce
  px(60, 86, '#1a120a');                                                                   // occhio chiuso
  rect(80, 92 + cat, 10, 2, '#3a2a18'); rect(80, 90 + cat, 8, 2, '#e08a2c');               // coda
  /* botti + mele */
  for (const ox of [232, 268]) {
    rect(ox, 96, 28, 36, '#8a5f38'); rect(ox, 104, 28, 4, '#5c4229'); rect(ox, 120, 28, 4, '#5c4229');
    rect(ox + 8, 92, 12, 4, '#a97a4c');
    rect(ox, 96, 4, 36, shade8('#8a5f38', 1.45)); rect(ox + 24, 96, 4, 36, shade8('#8a5f38', 0.6));
  }
  rect(236, 88, 20, 8, '#c65a54'); px(240, 84, '#5fa04e');
  /* paglia sparsa sul pavimento */
  for (let i = 0; i < 6; i++) px(112 + (i * 34) % 100, 156 + (i * 22) % 44, '#d4b13c');
}

/* MUSEO — HALL: 6 porte tematiche (una per bioma), banco accoglienza, tappeto rosso */
/* MATERIALI DELLE CITTÀ per bioma: la pianta resta identica, cambiano tetti, lastricato e
   strade — così un borgo delle Lande Gelide non sembra uno delle Dune. */
const WING_COL = ['#d4b13c', '#d2b078', '#6f7f62', '#c06a48', '#5f7a52', '#8fd0e6', '#7d6fa8']; // + ala GROTTE
/* schiarisce/scurisce un colore #rrggbb (k<1 scuro, k>1 chiaro) */
/* sprite dell'esposizione: SOLO i pezzi consegnati, proiezione dello stesso modello voxel.
   Cache per specie+numero pezzi (i pezzi possono solo crescere). */
const exCache = new Map();
export function exhibitSprite(spId, parts) {
  const key = spId + ':' + parts.length;
  let cv = exCache.get(key); if (cv !== undefined) return cv;
  cv = null;
  try {
    cv = document.createElement('canvas'); cv.width = 72; cv.height = 64;
    const c2 = cv.getContext('2d');
    const vox = composedPartsVox(spId, parts);
    let mnx = 9e9, mxx = -9e9, mny = 9e9, mxy = -9e9, mnz = 9e9, mxz = -9e9;
    for (const v of vox) { mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x); mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y); mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z); }
    const ox = Math.floor((cv.width - (mxx - mnx + 1)) / 2), oy = Math.floor((cv.height - (mxy - mny + 1)) / 2);
    const zr = Math.max(1, mxz - mnz);
    for (const v of vox.slice().sort((a, b) => a.z - b.z)) {
      const zt = (v.z - mnz) / zr;
      c2.fillStyle = v.k === 'eye' ? '#201a14' : zt < 0.34 ? '#8f887a' : zt < 0.67 ? '#d6d0c2' : '#ffffff';
      c2.fillRect(ox + (v.x - mnx), oy + (mxy - v.y), 1, 1); // un pixel per voxel: il modello è già a risoluzione doppia (R in bones.js)
    }
    outlineSprite(cv, '#1c160f');
  } catch (e) { cv = null; /* stub nei test */ }
  exCache.set(key, cv); return cv;
}
/* contorno scuro AGGRAPPATO ALLA SAGOMA (non un rettangolo pieno dietro l'intera canvas):
   un mobile piccolo o sottile (lampada, vaso) in una canvas 30×30 quasi trasparente si
   ritrovava un enorme riquadro nero attorno — l'INGOMBRO della canvas, non la sua forma
   (segnalato: "bordo nero enorme"). Qui si legge il canale alpha vero e si accende solo il
   pixel VUOTO adiacente a uno pieno, come già fa creatureSprite per gli animali. */
function outlineSprite(cv, color) {
  const c2 = cv.getContext && cv.getContext('2d'); if (!c2) return;
  const w = cv.width, h = cv.height;
  const img = c2.getImageData(0, 0, w, h), a = img.data;
  const opaque = (x, y) => x >= 0 && x < w && y >= 0 && y < h && a[(y * w + x) * 4 + 3] > 0;
  const add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (opaque(x, y)) continue;
    if (opaque(x + 1, y) || opaque(x - 1, y) || opaque(x, y + 1) || opaque(x, y - 1)) add.push([x, y]);
  }
  c2.fillStyle = color;
  for (const [x, y] of add) c2.fillRect(x, y, 1, 1);
}
/* MUSEO — GALLERIA unica camminabile ed ELEGANTE: teche scure con cornice dorata
   (le ossa bianche risaltano), tappeto bordeaux, colonne, lampadari, piante.
   Camera che segue il player; 6 aree bioma; solo i pezzi consegnati. */
export function drawMuseumGallery(time) {
  const W = view.W, H = view.H, rw = INT.w * TS, rh = INT.h * TS;
  /* camera ancorata alla griglia dei pixel FISICI (come nel mondo): niente scatti */
  const camx = snap(rw <= W ? (rw - W) / 2 : Math.max(0, Math.min(rw - W, INT.x - W / 2)));
  /* cutscene: NIENTE clamp basso — alzo l'inquadratura così il player e la consegna
     stanno nella fascia visibile fra le bande cinema (il vuoto sotto è coperto dal parquet) */
  const camy = CUT.on
    ? snap(Math.max(0, INT.y - Math.round(H * 0.72))) // consegna a ~3/4: sopra la banda inferiore
    : snap(galleryCamY(H, rh));                       // stessa formula usata dal tocco
  ctx.save(); ctx.translate(-camx, -camy);
  rect(camx, camy, W, H, '#c2af88'); // base parquet a tutto schermo: nessun vuoto nero fuori dalla galleria
  const t0x = Math.max(0, Math.floor(camx / TS) - 1), t1x = Math.min(INT.w, Math.ceil((camx + W) / TS) + 1);
  const t0y = Math.max(0, Math.floor(camy / TS) - 1), t1y = Math.min(INT.h, Math.ceil((camy + H) / TS) + 1);
  /* parquet caldo a scacchi grandi 2×2, con rare venature (solo tile in vista) */
  for (let ty = t0y; ty < t1y; ty++) for (let tx = t0x; tx < t1x; tx++) {
    const sx = tx * TS, sy = ty * TS;
    rect(sx, sy, TS, TS, ((tx >> 1) + (ty >> 1)) % 2 ? '#cdbc98' : '#c2af88');
    if (!(tx % 2)) rect(sx, sy, 1, TS, '#b09d76'); if (!(ty % 2)) rect(sx, sy, TS, 1, '#b09d76');
    if (vhash(tx, ty, 91) < 0.12) { const px2 = sx + 4 + Math.floor(vhash(tx, ty, 92) * 24), py2 = sy + 5 + Math.floor(vhash(tx, ty, 93) * 22); rect(px2, py2, 2, 1, '#b09d76'); }
  }
  /* SALE per bioma: ognuna con tappeto del colore del bioma, cornice a mosaico,
     stendardo sulla parete di fondo, colonne agli angoli, panche e piante */
  MUSEUM_ZONES.forEach((z, zi) => {
    const { rx, ry } = roomOrigin(zi);
    const x0 = rx * TS, y0 = ry * TS, wpx = ROOM_W * TS, hpx = ROOM_H * TS;
    if (x0 - camx > W || x0 + wpx - camx < 0 || y0 - camy > H || y0 + hpx - camy < 0) return; // fuori vista
    const col = WING_COL[zi];
    /* tappeto grande della sala con bordo dorato + trama */
    rect(x0 + 6, y0 + 8, wpx - 12, hpx - 14, shade8(col, 0.5));
    rect(x0 + 6, y0 + 8, wpx - 12, 2, '#c9a227'); rect(x0 + 6, y0 + hpx - 8, wpx - 12, 2, '#c9a227');
    rect(x0 + 6, y0 + 8, 2, hpx - 14, '#c9a227'); rect(x0 + wpx - 8, y0 + 8, 2, hpx - 14, '#c9a227');
    for (let gx = x0 + 14; gx < x0 + wpx - 12; gx += 12) px(gx, y0 + hpx / 2, shade8(col, 0.72));
    /* parete di fondo della sala + stendardo del bioma con emblema */
    rect(x0, y0, wpx, 8, '#5f6f5c'); rect(x0, y0, wpx, 3, '#4c5a4a'); rect(x0, y0 + 7, wpx, 1, '#c9a227');
    const bx0 = x0 + wpx / 2 - 12;
    rect(bx0, y0 + 2, 24, 16, '#3a3a44'); rect(bx0, y0 + 2, 24, 2, col); rect(bx0 + 10, y0 + 18, 4, 3, col);
    for (let i = 0; i < 3; i++) px(bx0 + 8 + i * 4, y0 + 9, col);
    /* colonne ai 4 angoli */
    for (const cxo of [x0 + 5, x0 + wpx - 9]) {
      rect(cxo, y0 + 6, 4, hpx - 12, '#e3dcc8'); rect(cxo + 1, y0 + 6, 1, hpx - 12, '#f3ecda');
      rect(cxo - 1, y0 + 4, 6, 3, '#f3ecda'); rect(cxo - 1, y0 + hpx - 8, 6, 3, '#b8ac90');
    }
    /* lampadario centrale con alone caldo */
    const lx = x0 + wpx / 2;
    rect(lx - 6, y0 + 6, 12, 2, '#8a7118'); for (const fx of [-5, -1, 3]) { const fl = Math.floor(time / 260 + fx + zi) % 2; px(lx + fx, y0 + 4 + fl, '#ffd873'); }
    ctx.fillStyle = 'rgba(255,220,140,.06)'; ctx.fillRect(lx - 20, y0 + 4, 40, hpx - 10);
    /* due panche in fondo alla sala */
    for (const benchx of [x0 + wpx / 2 - 26, x0 + wpx / 2 + 12]) { rect(benchx, y0 + hpx - 16, 14, 5, '#8a5f38'); rect(benchx, y0 + hpx - 16, 14, 2, '#a97a4c'); rect(benchx + 1, y0 + hpx - 11, 2, 4, '#6e4a2e'); rect(benchx + 11, y0 + hpx - 11, 2, 4, '#6e4a2e'); }
    /* TARGA della sala: il nome del bioma e quante specie hai esposto. Senza, le sei sale
       sono indistinguibili e non si capisce a quale zona appartengano le teche. */
    {
      const pool = zonePools[z.id] || [];
      const done = pool.filter(sp => (S.museum[sp.id] || []).length === PARTS.length).length;
      const label = zoneName(z.id).toUpperCase(), sub = done + '/' + pool.length;
      ctx.font = '700 7px ui-monospace, Menlo, monospace'; ctx.textBaseline = 'top';
      /* measureText può non esserci (o non ritornare nulla) fuori dal browser: fallback sempre */
      const wOf = t => { const m = ctx.measureText && ctx.measureText(t); return Math.ceil((m && m.width) || t.length * 4.2); };
      /* la targa deve contenere NOME + spazio + CONTATORE: prima era dimensionata sul solo
         nome e i due testi si sovrapponevano nelle zone dal nome lungo */
      const PADL = 11, PADR = 9, GAP = 10;
      const wl = wOf(label), ws = wOf(sub);
      const bw2 = Math.max(72, PADL + wl + GAP + ws + PADR);
      const bx2 = x0 + wpx / 2 - bw2 / 2, by2 = y0 - 17;
      rect(bx2 - 1, by2 - 1, bw2 + 2, 16, '#241a10');            // bordo scuro
      rect(bx2, by2, bw2, 14, '#3a3a44'); rect(bx2, by2, bw2, 2, col);   // fascia del colore del bioma
      rect(bx2, by2 + 12, bw2, 2, shade8(col, 0.6));
      for (const hx of [bx2 + 3, bx2 + bw2 - 5]) rect(hx, by2 + 4, 2, 6, col); // bulloni laterali
      ctx.fillStyle = '#f3ecda'; ctx.fillText(label, bx2 + PADL, by2 + 3);
      ctx.fillStyle = done === pool.length && pool.length ? '#8fd06a' : '#c9a227';
      ctx.fillText(sub, bx2 + bw2 - PADR - ws, by2 + 3);
    }
  });
  /* pareti esterne + fregio dorato in alto */
  rect(0, 0, rw, 6, '#4c5a4a'); rect(0, 6, rw, 2, '#c9a227');
  rect(0, 0, 6, rh, '#4c5a4a'); rect(rw - 6, 0, 6, rh, '#4c5a4a');
  /* PARETE BASSA con un VARCO al centro: la porta si vede, e oltre la porta si vede la
     strada. Prima la parete era continua e per uscire bisognava camminare fuori dallo
     schermo: col solo mouse non c'era nulla da cliccare. */
  const doorW = 3 * TS, doorL = Math.round(rw / 2 - doorW / 2);
  rect(0, rh - 4, doorL, 4, '#4c5a4a');
  rect(doorL + doorW, rh - 4, rw - doorL - doorW, 4, '#4c5a4a');
  /* fuori: lastricato della piazza, zerbino e stipiti — è la zona su cui si clicca per uscire */
  for (let y = rh; y < rh + GAL_FOOT; y += TS) for (let x = 0; x < rw; x += TS) {
    const k = ((x / TS) * 7 + (y / TS) * 13) % 3;
    rect(x, y, TS, TS, k === 0 ? '#d8c49a' : k === 1 ? '#d2bd90' : '#dfcda6');
    px(x + 3, y + 5, '#c3ad7e'); px(x + 11, y + 10, '#c3ad7e');
  }
  rect(0, rh, rw, 1, '#8a7f66');                       // soglia
  rect(doorL - 4, rh - 4, 4, 4, '#3a4638'); rect(doorL + doorW, rh - 4, 4, 4, '#3a4638'); // stipiti
  /* COLONNATO visto dall'alto. Prima erano sei tondi piccoli e ravvicinati accanto alla
     porta: sembravano tombini. Un colonnato si legge dal RITMO — pochi elementi grandi,
     ben distanziati, su TUTTA la facciata — quindi qui sono quadrati (il rocchio squadrato
     dice "architettura", il cerchio dice "chiusino") con base a gradino. */
  {
    const colY = rh + 16, half = 9, step = 5 * TS;        // 80 px fra un asse e l'altro
    for (let cxp = Math.round(rw / 2 % step); cxp < rw; cxp += step) {
      if (Math.abs(cxp - rw / 2) < 2.2 * TS) continue;    // la porta resta sgombra
      /* ombra portata: luce da alto-sinistra come nel resto del gioco */
      rect(cxp - half + 3, colY - half + 4, half * 2, half * 2, 'rgba(58,48,34,.26)');
      /* PLINTO: il gradino di base, più largo del fusto — è ciò che dà l'altezza */
      rect(cxp - half - 2, colY - half - 2, (half + 2) * 2, (half + 2) * 2, '#b3aa93');
      rect(cxp - half - 2, colY - half - 2, (half + 2) * 2, 2, '#d9d2bd');
      /* fusto: marmo a tre toni netti */
      rect(cxp - half, colY - half, half * 2, half * 2, '#cec6ae');
      rect(cxp - half, colY - half, half * 2 - 3, half * 2 - 3, '#e9e2ce');
      rect(cxp + half - 3, colY - half + 3, 3, half * 2 - 3, '#a79e88');
      rect(cxp - half + 3, colY + half - 3, half * 2 - 3, 3, '#a79e88');
      /* scanalature: tre solchi verticali continui */
      for (const sx of [-5, 0, 5]) rect(cxp + sx, colY - half + 3, 1, half * 2 - 6, '#b8af99');
    }
  }
  /* zerbino davanti alla porta: dice "si esce di qui" senza scriverlo */
  const mx = Math.round(rw / 2 - 28), my = rh + 16;
  rect(mx, my, 56, 24, '#8a5f38'); rect(mx + 2, my + 2, 52, 20, '#a97a4c');
  for (let i = 0; i < 6; i++) rect(mx + 6 + i * 8, my + 6, 4, 12, '#8a5f38');
  /* TECHE: vetrina SCURA con cornice dorata — le ossa bianche risaltano */
  /* teca disegnata come funzione: entra nella lista ordinata per y (il pg ci passa DIETRO) */
  const drawCase = (pd) => {
    const bx = pd.tx * TS, by = pd.ty * TS;
    const parts = S.museum[pd.sp.id] || [];
    const full = parts.length === PARTS.length;
    shadow(bx + 16, by + 30, 18);
    rect(bx, by + 16, 32, 14, '#9a9285'); rect(bx, by + 16, 32, 4, '#b5ad9e'); rect(bx - 2, by + 26, 36, 4, '#7f776a');
    rect(bx, by + 20, 32, 2, '#c9a227');
    rect(bx - 8, by - 54, 48, 70, full ? '#e8c34a' : '#8a7118');           // cornice
    rect(bx - 6, by - 52, 44, 66, '#1b1626');                              // interno scuro
    rect(bx - 6, by - 52, 44, 2, '#494066');                               // luce alta
    const cv = parts.length ? exhibitSprite(pd.sp.id, parts) : null;
    if (cv) ctx.drawImage(cv, bx - 20, by - 50);
    else { rect(bx + 14, by - 28, 2, 2, '#4a4438'); rect(bx + 16, by - 28, 2, 2, '#4a4438'); rect(bx + 18, by - 26, 2, 2, '#4a4438'); rect(bx + 16, by - 22, 2, 2, '#4a4438'); rect(bx + 16, by - 16, 2, 2, '#4a4438'); }
    for (let i = 0; i < 9; i++) rect(bx + 28 - i * 2, by - 48 + i * 2, 2, 2, 'rgba(255,255,255,.14)'); // riflesso vetro
    ctx.fillStyle = 'rgba(255,235,180,.08)'; ctx.fillRect(bx - 4, by - 50, 40, 28);
    const rc = { comune: '#b8b0a2', raro: '#4e8d7c', eccezionale: '#d8973c', leggendario: '#8d6ac8' }[pd.sp.r];
    rect(bx + 4, by + 30, 24, 8, '#3a3a44'); rect(bx + 4, by + 30, 24, 2, '#c9a227'); rect(bx + 6, by + 34, 20, 2, rc);
    if (full) { const tw2 = Math.floor(time / 400) % 2; px(bx + (tw2 ? -4 : 34), by - 60, '#f2c53d'); px(bx + 16, by - 62 + tw2 * 2, '#f2c53d'); }
  };
  /* pianta in vaso come funzione (fronde alte: il pg passa dietro) */
  const drawPlant = (pxo) => {
    /* FASE 2: nativa — vaso/fronde raddoppiati, oscillazione ampiezza raddoppiata. */
    const vy = GAL_DESK.y1 - 4, sway = Math.round(Math.sin(time / 900 + pxo) * 2);
    shadow(pxo + 10, vy + 20, 12);
    rect(pxo + 2, vy, 16, 20, '#b5652a'); rect(pxo + 2, vy, 16, 4, '#d07d3c'); rect(pxo, vy - 2, 20, 4, '#8a4a1e'); // vaso
    rect(pxo + 4, vy + 6, 12, 2, '#8a4a1e');
    const cx3 = pxo + 10;
    rect(cx3, vy - 16, 2, 18, '#3f6b34');
    for (const [lx, ly, hh] of [[-8, -16, 12], [-4, -24, 16], [0, -30, 18], [4, -24, 16], [8, -16, 12]]) {
      for (let k = 0; k < hh; k += 2) rect(cx3 + Math.round(lx * (1 - k / hh)) + (k > hh - 6 ? sway : 0), vy + ly + k, 2, 2, k < 4 ? '#619a4c' : '#4e7a3d');
    }
    px(cx3 - 2, vy - 30 + sway, '#7fb862'); px(cx3 + 2, vy - 32 + sway, '#7fb862');
  };
  /* ATRIO d'ingresso: tappeto rosso dalla porta al bancone (sotto le entità) */
  const dx0 = (INT.w / 2) * TS;
  const deskCx = (GAL_DESK.x0 + GAL_DESK.x1) / 2;
  rect(dx0 - 12, GAL_DESK.y1, 24, rh - GAL_DESK.y1 - 4, '#7c2f34'); rect(dx0 - 10, GAL_DESK.y1, 20, rh - GAL_DESK.y1 - 4, '#a3494e');
  for (let x = dx0 - 8; x < dx0 + 8; x += 6) px(x, (GAL_DESK.y1 + rh) / 2, '#8a3f42');
  rect(dx0 - 10, rh - 6, 20, 6, '#3a2e20'); rect(dx0 - 8, rh - 4, 16, 4, '#c49a63'); // varco porta
  /* bancone: base+ripiano (statico, sta sotto); la parte alta/insegna resta qui */
  const dw = GAL_DESK.x1 - GAL_DESK.x0, dh = GAL_DESK.y1 - GAL_DESK.y0;
  const drawDesk = () => {
    rect(GAL_DESK.x0, GAL_DESK.y0, dw, dh, '#6e4a2e'); rect(GAL_DESK.x0, GAL_DESK.y0, dw, 3, '#8a5f38');
    rect(GAL_DESK.x0, GAL_DESK.y0 + 3, dw, 1, '#c9a227'); rect(GAL_DESK.x0, GAL_DESK.y1 - 2, dw, 2, '#4c3018');
    rect(deskCx - 10, GAL_DESK.y0 - 5, 8, 5, '#f6efdd'); px(deskCx - 6, GAL_DESK.y0 - 4, '#8a5f38');
    rect(deskCx + 4, GAL_DESK.y0 - 4, 5, 4, '#e8c34a'); px(deskCx + 6, GAL_DESK.y0 - 5, '#8a7118');
  };
  /* insegna "MUSEO" appesa (in alto, sempre dietro) */
  rect(deskCx - 20, GAL_DESK.y0 - 22, 40, 10, '#3a3a44'); rect(deskCx - 20, GAL_DESK.y0 - 22, 40, 2, '#c9a227');
  for (let i = 0; i < 5; i++) px(deskCx - 12 + i * 5, GAL_DESK.y0 - 17, '#e8c34a');
  /* ORDINAMENTO per y: teche, piante, bancone, curatore e player — chi è più in alto sta dietro */
  const ents = [];
  for (const pd of pedList()) {
    const bx = pd.tx * TS, by = pd.ty * TS;
    if (bx - camx < -3 * TS || bx - camx > W + 3 * TS || by - camy < -3 * TS || by - camy > H + 3 * TS) continue;
    ents.push({ y: by + 15, f: () => drawCase(pd) });
  }
  for (const pxo of [GAL_DESK.x0 - 16, GAL_DESK.x1 + 6]) ents.push({ y: GAL_DESK.y1 + 8, f: () => drawPlant(pxo) });
  ents.push({ y: GAL_DESK.y1 - 2, f: drawDesk });
  const npx = CUT.on ? CUT.x : deskCx;
  const npy = CUT.on ? CUT.y : GAL_DESK.y0 - 8;
  const paintNpc = () => {
    const hop = CUT.on && CUT.phase === 'give' ? -Math.abs(Math.round(Math.sin(time / 180) * 2)) : 0;
    const fdir = CUT.on ? (CUT.phase === 'back' ? 'up' : 'down') : null; // cutscene: posa fissa
    drawNpc(npx, npy + hop, 'museum', time, fdir);
    if (CUT.on && CUT.phase === 'give') { // il Libro si alza brillando sopra la testa
      const lift = Math.min(14, CUT.t * 12), bob = Math.round(Math.sin(time / 160) * 1.5);
      const by2 = npy - 6 - lift + bob;
      rect(npx - 5, by2, 11, 8, '#6e4a2e'); rect(npx - 4, by2 + 1, 9, 6, '#8a5f38');   // copertina
      rect(npx - 3, by2 + 2, 3, 4, '#f6efdd'); rect(npx + 1, by2 + 2, 3, 4, '#f1e2c4'); // pagine
      px(npx, by2 + 3, '#c9a227');                                                       // fibbia
      for (let i = 0; i < 4; i++) { // anello di scintille che ruota
        const a = time / 240 + i * Math.PI / 2;
        px(Math.round(npx + Math.cos(a) * 10), Math.round(by2 + 3 + Math.sin(a) * 6), i % 2 ? '#f2c53d' : '#fff2b8');
      }
    }
  };
  const paintHero = () => {
    const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
    const sx = snap(INT.x), sy = snap(INT.y);
    shadow(sx, sy + 12, 12);
    drawHero(null, sx - 16, sy - 20, INT.dir, fr);
  };
  ents.push({ y: npy + 16, f: paintNpc });
  /* MAESTRO SCAVATORE: fa il giro del museo (posizione/verso da interior.js, mai dal seno) */
  { const mx2 = snap(MENTOR.x), my2 = snap(MENTOR.y);
    const mfr = MENTOR.wait > 0 ? 0 : Math.floor(MENTOR.anim * 7) % 2;
    ents.push({ y: MENTOR.y + 16, f: () => drawMentor(mx2, my2, MENTOR.dir, mfr) }); }
  ents.push({ y: INT.y + 6, f: paintHero });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.f()); // chi ha y minore (più in alto) sta dietro
  /* dialoghi della cutscene: baloon in coord SCHERMO (la galleria è traslata di -cam) */
  /* UN SOLO baloon alla volta: se Digsy risponde, il Curatore tace */
  if (CUT.on && CUT.thanks) drawSayBalloon(INT.x - camx, INT.y - 14 - camy, CUT.thanks);
  else if (CUT.on && CUT.line) drawSayBalloon(npx - camx, npy - 12 - camy, CUT.line);
  ctx.restore();
}
/* LOCANDA: camino ACCESO, tavoli con boccali fumanti, botti, appendiabiti */
export function drawInnRoom(rw, rh, time) {
  /* FASE 2: nativa — rw/rh gia' alla scala vera, numeri interni raddoppiati (ampiezze di
     animazione comprese: fiamma/fumo/vapore/coda si muovono il doppio, non restano deboli). */
  const cx = rw / 2 - 28;
  rect(cx, 6, 56, 40, '#75695c'); rect(cx + 6, 12, 44, 28, '#3a3a44'); rect(cx - 4, 42, 64, 6, '#8f887a');
  const ff = Math.floor(time / 150) % 3, ff2 = ff * 2;
  rect(cx + 18, 24 + ff2, 20, 14 - ff2, '#e8862e'); rect(cx + 22, 28 + (ff % 2) * 2, 12, 10, '#f2c53d');
  px(cx + 26, 18 + ff2, '#f2c53d'); px(cx + 30, 16 + ((ff + 1) % 3) * 2, '#e8862e');
  rect(cx + 12, 38, 32, 4, '#5c4229');
  rect(cx + 16, 16, 24, 10, '#3f3a33'); rect(cx + 20, 12, 16, 4, '#5a5248');          // pentola appesa
  const stw = Math.floor(time / 350) % 2; px(cx + 22 + stw * 8, 14, '#d4b13c');       // stufato che sobbolle
  const sm = Math.floor(time / 500) % 3;
  px(cx + 26, Math.max(0, 4 - sm * 2), '#8f887a'); px(cx + 32, 2, sm === 1 ? '#b8b0a2' : '#8f887a'); // fumo
  /* bagliore caldo pulsante sul pavimento davanti al camino */
  const gl = 0.10 + 0.04 * (Math.floor(time / 400) % 2);
  ctx.fillStyle = 'rgba(240,160,60,' + gl + ')'; ctx.fillRect(cx - 12, 48, 80, 52);
  /* trofeo alle pareti + mensola boccali + appendiabiti */
  rect(32, 12, 20, 16, '#8a5f38'); rect(36, 16, 12, 8, '#ece5d2'); px(38, 18, '#201a14'); px(44, 18, '#201a14'); // cranio trofeo
  rect(rw - 88, 10, 52, 4, '#5c4229');
  for (let i = 0; i < 4; i++) rect(rw - 84 + i * 12, 14, 8, 10, i % 2 ? '#c9a06a' : '#8f887a'); // boccali
  rect(rw - 52, 24, 28, 24, '#8a5f38'); rect(rw - 52, 32, 28, 4, '#5c4229'); px(rw - 40, 52, '#e8c34a'); // botte
  /* tappeto al centro */
  rect(rw / 2 - 36, 148, 72, 36, '#8a3f3a'); rect(rw / 2 - 32, 152, 64, 28, '#c65a54'); rect(rw / 2 - 24, 160, 48, 12, '#8a3f3a');
  /* CANE che dorme accanto al camino (respira) */
  const brt = (Math.floor(time / 700) % 2) * 2;
  rect(188, 80 - brt, 24, 10 + brt, '#8a5f38'); rect(180, 84, 12, 8, '#8a5f38'); px(180, 82, '#8a5f38');
  px(182, 86, '#201a14'); rect(210, 86, 8, 4, '#6e4a2a');                             // coda
  /* tavoli in legno SCURO (staccano dal pavimento chiaro) con tovaglia, sgabelli, boccali, candela */
  for (const ox of [32, 228]) {
    rect(ox + 6, 128, 6, 10, '#3f2c18'); rect(ox + 56, 128, 6, 10, '#3f2c18');          // gambe
    rect(ox + 4, 100, 60, 28, '#5c3d22'); rect(ox + 4, 100, 60, 6, '#7a5636');          // piano scuro
    rect(ox + 10, 106, 48, 16, '#c9b58a'); rect(ox + 10, 106, 48, 4, '#ded0ab');        // tovaglia
    rect(ox, 110, 10, 12, '#4c3320'); rect(ox + 60, 110, 10, 12, '#4c3320');            // sgabelli
    rect(ox + 20, 92, 10, 12, '#d4a24a'); px(ox + 30, 94, '#d4a24a');                   // boccale
    const st = Math.floor(time / 400) % 3; px(ox + 24, 84 - st * 2, '#f6efdd');         // vapore
    rect(ox + 44, 92, 4, 10, '#f0e6cc'); px(ox + 44, 88, Math.floor(time / 250) % 2 ? '#f2c53d' : '#e8862e'); // candela
  }
}
/* BARBIERE: pavimento a scacchi, specchiera, poltrona, palo con strisce che SCORRONO */
export function drawBarberRoom(rw, rh, time) {
  /* FASE 2: nativa — rw/rh gia' alla scala vera, numeri interni e ampiezze raddoppiati. */
  const mx = rw / 2 - 44;
  rect(mx, 8, 88, 36, '#8a5f38'); rect(mx + 6, 12, 76, 26, '#bfe9f4');
  rect(mx + 10, 16, 20, 18, '#cfe8f2'); rect(mx + 56, 16, 16, 18, '#cfe8f2');
  const sh2 = Math.floor(time / 260) % 12;
  rect(mx + 8 + sh2 * 6, 14, 4, 22, '#e8f6fb');                                        // shine
  rect(mx - 4, 44, 96, 6, '#a97a4c');
  ['#5a86c8', '#e08aa8', '#5fa04e', '#e8c34a'].forEach((c, i) => rect(mx + 8 + i * 20, 34, 8, 10, c));
  rect(mx + 80, 36, 12, 6, '#f6efdd'); rect(mx + 80, 30, 12, 6, '#f6efdd');             // asciugamani
  /* OROLOGIO a pendolo (oscilla) */
  const pd = (Math.floor(time / 600) % 2 ? 2 : -2) * 2;
  rect(28, 8, 24, 28, '#8a5f38'); rect(32, 12, 16, 14, '#f6efdd'); px(38, 16, '#201a14'); px(38 + Math.sign(pd) * 2, 18, '#201a14');
  rect(38, 36, 2, 12, '#5a5248'); px(38 + pd, 48, '#e8c34a');                          // pendolo
  /* palo del barbiere: strisce che scorrono */
  const off = (Math.floor(time / 180) % 6) * 2;
  rect(rw - 40, 8, 20, 52, '#f3ecda'); rect(rw - 40, 4, 20, 4, '#5a5248'); rect(rw - 40, 60, 20, 4, '#5a5248');
  for (let yy = -12 + off; yy < 52; yy += 12) { if (yy >= 0 && yy < 48) rect(rw - 40, 8 + yy, 20, 6, yy % 24 < 12 ? '#c65a54' : '#5a86c8'); }
  /* POLTRONA DA BARBIERE: poggiatesta, schienale, braccioli, seduta, colonnina cromata,
     base tonda, poggiapiedi */
  const chx = 48;
  rect(chx + 6, 88, 16, 4, '#3a3a44');                                                   // poggiatesta
  rect(chx + 2, 92, 24, 20, '#8a3f3a'); rect(chx + 4, 94, 20, 16, '#c65a54');            // schienale
  rect(chx + 4, 94, 20, 2, '#e08a84'); rect(chx + 12, 98, 2, 12, '#a3494e');             // imbottitura/cucitura
  rect(chx - 2, 100, 6, 12, '#5a5248'); rect(chx + 24, 100, 6, 12, '#5a5248');           // braccioli
  rect(chx + 2, 112, 24, 6, '#c65a54'); rect(chx + 2, 112, 24, 2, '#e08a84');            // seduta
  rect(chx + 10, 118, 8, 10, '#cfc9bc'); rect(chx + 12, 118, 4, 10, '#e8e2d0');          // colonnina
  rect(chx + 4, 128, 20, 4, '#3a3a44'); rect(chx + 6, 124, 16, 2, '#8f887a');            // base + poggiapiedi
  /* CIUFFI di capelli tagliati a terra */
  const hairs = [['#33291f', 92, 140], ['#caa25a', 104, 144], ['#b5622e', 88, 148], ['#6e4a2a', 108, 140]];
  hairs.forEach(([c, hx2, hy2]) => { rect(hx2, hy2, 2, 2, c); rect(hx2 + 2, hy2, 2, 2, c); });
  /* scopa appoggiata + panca d'attesa + pianta */
  rect(120, 80, 4, 44, '#c9a06a'); rect(114, 120, 16, 10, '#d4b13c');
  rect(232, 104, 60, 16, '#a97a4c'); rect(236, 120, 8, 12, '#6e5138'); rect(280, 120, 8, 12, '#6e5138');
  rect(292, 84, 16, 16, '#4a9a55'); rect(296, 100, 8, 12, '#c65a54');
  rect(rw / 2 + 46, 62, 2, 2, '#8f887a'); rect(rw / 2 + 48, 64, 2, 2, '#8f887a'); rect(rw / 2 + 50, 62, 2, 2, '#8f887a');
}
/* SARTORIA: rotoli di stoffa, manichino vestito, macchina da cucire con ago ANIMATO */
export function drawTailorRoom(rw, rh, time) {
  /* FASE 2: nativa — rw/rh gia' alla scala vera, numeri interni e ampiezze raddoppiati. */
  const rx = rw / 2 - 56;
  rect(rx, 8, 112, 6, '#5c4229');
  ['#c65a54', '#5a86c8', '#5fa04e', '#e08aa8', '#e8c34a', '#8d7ba0'].forEach((c, i) => {
    rect(rx + 6 + i * 18, 14, 14, 28, c); rect(rx + 6 + i * 18, 14, 14, 4, '#f6efdd');
  });
  rect(24, 12, 24, 28, '#8a5f38'); rect(28, 16, 16, 20, '#f6efdd'); rect(32, 20, 8, 12, '#e08aa8'); // bozzetto abito
  rect(rw - 48, 12, 24, 28, '#8a5f38'); rect(rw - 44, 16, 16, 20, '#f6efdd'); rect(rw - 40, 20, 8, 6, '#5a86c8'); rect(rw - 42, 28, 12, 6, '#5a86c8');
  /* mensola dei rocchetti di filo colorato */
  rect(60, 48, 60, 4, '#5c4229');
  ['#c65a54', '#5fa04e', '#f6efdd'].forEach((c, i) => { rect(64 + i * 18, 36, 10, 12, c); px(68 + i * 18, 32, '#5a5248'); });
  /* manichino vestito + cesto di gomitoli */
  rect(48, 88, 16, 12, '#f3cfa0'); rect(40, 100, 32, 24, '#e08aa8'); rect(44, 100, 24, 6, '#c06a88');
  rect(54, 124, 4, 10, '#5a5248'); rect(48, 132, 16, 4, '#5a5248');
  rect(84, 116, 24, 16, '#c9a06a'); rect(88, 112, 16, 6, '#a97a4c');
  px(90, 110, '#c65a54'); px(96, 108, '#5a86c8'); px(102, 110, '#5fa04e');             // gomitoli
  /* MACCHINA DA CUCIRE riconoscibile: tavolino, corpo a "C" nero con filo dorato,
     volantino a destra che gira, ago su/giù, stoffa che avanza */
  rect(220, 108, 80, 8, '#8a5f38'); rect(220, 108, 80, 4, '#a97a4c');                  // piano del tavolino
  rect(224, 116, 6, 24, '#5c4229'); rect(290, 116, 6, 24, '#5c4229');                  // gambe
  rect(232, 80, 44, 12, '#2f2b26'); rect(232, 80, 44, 4, '#4a4640');                   // braccio superiore
  rect(232, 80, 10, 28, '#2f2b26');                                                    // colonna sinistra
  rect(232, 100, 52, 8, '#3a3630'); rect(232, 100, 52, 2, '#c9a227');                  // base con filo dorato
  px(240, 86, '#c9a227'); px(256, 86, '#e8c34a');                                      // dettagli oro
  /* ago che sale/scende sotto la testa */
  const ndl = (Math.floor(time / 180) % 2) * 2;
  rect(268, 92, 4, 6, '#2f2b26');                                                      // testa dell'ago
  rect(268, 98, 2, 6 + ndl, '#e8e2d0'); px(268, 104 + ndl, '#cfc9bc');                 // ago
  /* stoffa sotto l'ago con la cucitura che avanza (trattini netti) */
  rect(252, 104, 32, 4, '#5a86c8');
  for (let i = 0; i < 4; i++) rect(256 + i * 6, 106, 2, 2, (i + Math.floor(time / 200)) % 2 ? '#e8e2d0' : '#5a86c8'); // punti cuciti
  /* VOLANTINO a destra: ruota tonda con MANOVELLA che orbita (rotazione chiara) */
  const wcx = 292, wcy = 90, ang = time / 200;
  rect(wcx - 8, wcy - 8, 16, 16, '#3a3630'); rect(wcx - 6, wcy - 6, 12, 12, '#5a5248'); // corpo ruota
  px(wcx, wcy, '#c9a06a');                                                             // mozzo
  const hx = Math.round(wcx + Math.cos(ang) * 6), hy = Math.round(wcy + Math.sin(ang) * 6);
  px(hx, hy, '#c9a227'); px(hx, hy - 2, '#e8c34a');                                    // manovella che gira
  /* puntaspilli + ritagli di stoffa a terra */
  rect(236, 100, 8, 6, '#c65a54'); px(238, 98, '#8f887a'); px(242, 98, '#8f887a');
  for (let i = 0; i < 5; i++) rect(120 + (i * 38) % 88, 160 + (i * 26) % 40, 2, 2, ['#c65a54', '#5a86c8', '#e08aa8', '#5fa04e', '#e8c34a'][i]);
}
/* LABORATORIO: lavagna con scheletro, scaffale pozioni, alambicco con fiamma e bolle, banco studio */
/* TECA DI COVA: sta SEMPRE nella stanza, non solo nel pannello del Lab — spenta e vuota
   finché non deponi un uovo, poi ci galleggia dentro davvero (bagliore quando è pronto). */
function drawEggTank(x, y, time) {
  /* FASE 2: nativa — teca raddoppiata, bob/scintille con ampiezza raddoppiata. */
  const e = breedEgg(), ready = !!e && eggReady();
  const W = 28, H = 32;
  rect(x - 4, y + H, W + 8, 6, '#5c4229');                                   // piedistallo
  rect(x - 2, y - 2, W + 4, 4, '#5a5248');                                   // bocchetta
  rect(x, y, W, H, ready ? '#dff4e0' : (e ? '#cdeef2' : '#a8b4ad'));         // vetro/liquido (spento se vuota)
  rect(x + 2, y + 2, 4, H - 8, 'rgba(255,255,255,.30)');                     // riflesso sul vetro
  if (e) {
    const bob = Math.round(Math.sin(time / 480) * 3);
    const ex = x + W / 2 - 4, ey = y + H / 2 - 8 + bob;
    rect(ex, ey, 8, 2, '#d8973c'); rect(ex - 2, ey + 2, 12, 10, '#d8973c'); rect(ex, ey + 12, 8, 2, '#d8973c');
    px(ex, ey + 4, '#f2c53d');                                              // riflesso sul guscio
    if (ready) {
      const sp = (Math.floor(time / 200) % 2) * 2;
      px(ex - 6, ey + 2 + sp, '#f6efdd'); px(ex + 12, ey + 8 - sp, '#f6efdd'); // scintille
    }
  }
}
export function drawLabRoom(rw, rh, time) {
  /* FASE 2: nativa — rw/rh gia' alla scala vera, numeri interni e ampiezze raddoppiati. */
  const bx = rw / 2 - 52;
  rect(bx - 4, 6, 112, 4, '#5c4229'); rect(bx - 4, 42, 112, 4, '#5c4229');
  rect(bx, 10, 104, 32, '#2e3d33');
  rect(bx + 10, 16, 14, 12, '#e8e2d0'); px(bx + 14, 20, '#2e3d33'); px(bx + 20, 20, '#2e3d33');
  for (let i = 0; i < 7; i++) rect(bx + 28 + i * 6, 22 + (i % 2) * 2, 2, 2, '#e8e2d0');
  for (let i = 0; i < 3; i++) { rect(bx + 32 + i * 12, 26, 2, 2, '#cbbfa4'); rect(bx + 32 + i * 12, 28, 2, 2, '#cbbfa4'); }
  rect(bx + 76, 14, 18, 12, '#cbbfa4'); px(bx + 80, 18, '#2e3d33'); px(bx + 86, 18, '#2e3d33');
  rect(bx + 8, 36, 16, 4, '#f6efdd');
  /* barattoli con ESEMPLARI sospesi (bollicine) sotto la finestra sinistra */
  rect(24, 48, 60, 4, '#5c4229');
  for (let i = 0; i < 3; i++) {
    const jx = 28 + i * 20;
    rect(jx, 28, 14, 20, '#bfe9f4'); rect(jx, 26, 14, 2, '#5a5248');
    rect(jx + 4, 34, 6, 8, ['#5fa04e', '#c65a54', '#8d7ba0'][i]);                       // esemplare
    const jb = (Math.floor(time / 300) + i) % 4; px(jx + 2 + (i % 2) * 8, 44 - jb * 2, '#e8f6fb'); // bollicina
  }
  /* scaffale pozioni sotto la finestra destra */
  const shx = rw - 3.4 * TS;
  rect(shx - 4, 48, 80, 4, '#5c4229');
  const bots = [['#5a86c8', 14], ['#4e8d7c', 18], ['#c65a54', 12], ['#8d7ba0', 20], ['#e8c34a', 14]];
  bots.forEach(([c, hgt], i) => {
    const x = shx + i * 16;
    rect(x, 48 - hgt, 10, hgt, c); rect(x + 2, 44 - hgt, 6, 4, '#cfe8f2'); px(x + 2, 52 - hgt, '#f6efdd');
  });
  /* teca di cova: sul pavimento in basso a destra, fuori dal corridoio centrale porta→banco */
  drawEggTank(252, 148, time);
  /* postazione ALAMBICCO: bruciatore, storta con bolle, tubo con GOCCIA che cade, beuta */
  rect(24, 88, 72, 44, '#8a5f38'); rect(24, 88, 72, 6, '#a97a4c'); rect(28, 132, 8, 8, '#5c4229'); rect(84, 132, 8, 8, '#5c4229');
  const fl = Math.floor(time / 160) % 2;
  rect(38, 80, 16, 6, '#75695c');
  px(42 + fl * 2, 74, '#f2c53d'); px(44, 72 - fl * 2, '#e8862e'); px(46 - fl * 2, 74, '#f2c53d'); px(44, 76, '#e8862e');
  rect(34, 52, 24, 24, '#bfe9f4'); rect(36, 60, 20, 14, '#5fa04e');
  rect(40, 44, 8, 10, '#bfe9f4'); rect(38, 40, 12, 4, '#8fd0e6');
  const bb = Math.floor(time / 260) % 3;
  px(42, 70 - bb * 2, '#a4dd8c'); px(48, 66 - ((bb + 1) % 3) * 2, '#a4dd8c');
  for (let i = 0; i < 5; i++) px(58 + i * 4, 48 + i * 2, '#8fd0e6');
  const drop = Math.floor(time / 340) % 4;
  px(74, 58 + drop * 2, '#8fd0e6');                                                     // goccia che cade
  rect(76, 60, 14, 16, '#bfe9f4'); rect(78, 68, 10, 6, '#8d7ba0');
  px(80, 56 - fl * 2, '#cfe8f2');
  /* banco da studio: microscopio, teschio, libro, CANDELA accesa, fogli a terra */
  rect(224, 88, 72, 44, '#8a5f38'); rect(224, 88, 72, 6, '#a97a4c'); rect(228, 132, 8, 8, '#5c4229'); rect(284, 132, 8, 8, '#5c4229');
  rect(234, 68, 6, 20, '#5a5248'); rect(238, 64, 10, 6, '#3f3a33'); rect(232, 84, 18, 4, '#3f3a33');
  px(242, 72, '#8fd0e6');
  rect(258, 72, 16, 14, '#ece5d2'); px(262, 76, '#201a14'); px(268, 76, '#201a14'); rect(260, 82, 12, 2, '#cbbfa4');
  rect(278, 76, 18, 12, '#f6efdd'); rect(286, 76, 2, 12, '#8a5f38'); px(280, 80, '#8f887a'); px(290, 80, '#8f887a');
  rect(252, 64, 4, 10, '#f6efdd'); px(252, 60, Math.floor(time / 250) % 2 ? '#f2c53d' : '#e8862e'); // candela
  rect(200, 156, 14, 10, '#f6efdd'); rect(208, 168, 14, 10, '#ece5d2'); px(204, 160, '#8f887a');     // fogli caduti
  /* TOPOLINO grigio che sfreccia lungo la parete bassa */
  const rt = (time / 1000) % 14;
  if (rt < 2.2) {
    const rxp = 36 + (rt / 2.2) * 240;
    rect(rxp, 200, 10, 6, '#7a7268'); rect(rxp + 8, 200, 4, 4, '#7a7268');  // corpo + testa grigi
    px(rxp + 10, 198, '#e0a8b0');                               // orecchio rosa
    px(rxp + 10, 202, '#1a120a');                               // occhio
    rect(rxp - 6, 202, 6, 2, '#8a8278');                        // coda
  }
}
/* pattugliamento dietro il bancone: fermo → cammina a destra → fermo → attraversa → fermo → torna */
const NPC_SPAN = 44;
const NPC_SEGS = [[2.2, 0, 0], [1.5, 0, NPC_SPAN], [1.8, NPC_SPAN, NPC_SPAN], [3, NPC_SPAN, -NPC_SPAN], [1.8, -NPC_SPAN, -NPC_SPAN], [1.5, -NPC_SPAN, 0]];
const NPC_TOT = NPC_SEGS.reduce((a, s) => a + s[0], 0);
export function npcPose(time) {
  let t = (time / 1000) % NPC_TOT;
  for (const [d, a, b] of NPC_SEGS) {
    if (t < d) {
      const walk = a !== b;
      return { ox: a + (b - a) * (t / d), mov: walk, dir: walk ? (b > a ? 'right' : 'left') : 'down' };
    }
    t -= d;
  }
  return { ox: 0, mov: false, dir: 'down' };
}
export function drawNpc(x, y, type, time, forceDir) {
  const saved = S.look;
  S.look = { hat: '#d06b43', shirt: '#57a58f', pants: '#c88a44', skin: '#f3cfa0', ...((NPCS[type] || {}).look || {}) };
  applyLook();
  /* forceDir (cutscene): posa fissa, niente pattugliamento/sway */
  const p = forceDir ? { dir: forceDir, ox: 0, mov: true } : npcPose(time);
  const fr = p.mov ? Math.floor(time / 170) % 2 : 0;
  /* SNAP alla griglia dei pixel fisici (come il player): niente righe quando si muove */
  drawHero(null, snap(x - 16 + p.ox), snap(y - 24), p.dir, fr);
  S.look = saved; applyLook();
}
/* CAMERA della scena interna: la stessa formula usata per disegnare. Serve al "tocca dove
   andare", che deve convertire un punto dello schermo in un punto della stanza — senza,
   dentro gli edifici il tocco finiva su coordinate del mondo esterno. */
/* Margine sotto la parete bassa della galleria. Senza, la camera si ferma esattamente al
   bordo e la porta finisce sull'ultima riga di pixel: per uscire bisogna camminare OLTRE
   la soglia, ma oltre la soglia non c'è schermo da cliccare — col solo mouse era
   impossibile. Con questo margine il museo si comporta come tutti gli altri interni, dove
   la stanza è centrata e sotto la porta resta spazio. */
export const GAL_FOOT = 40;
export function galleryCamY(H, rh) {
  /* come nelle grotte: la camera sale oltre il bordo quanto è alta la barra dell'HUD,
     altrimenti in fondo alla galleria il giocatore finisce nascosto sotto i tag */
  const pad = hudPad();
  return rh <= H ? (rh - H) / 2 - pad : Math.max(-pad, Math.min(rh - H + GAL_FOOT, INT.y - H / 2));
}
export function interiorCam() {
  const W = view.W, H = view.H;
  const rw = INT.w * TS, rh = INT.h * TS;
  if (INT.b && INT.b.type === 'museum') {
    return {
      x: snap(rw <= W ? (rw - W) / 2 : Math.max(0, Math.min(rw - W, INT.x - W / 2))),
      y: snap(galleryCamY(H, rh)),
    };
  }
  /* la casa (atrio o una sua stanza, house.js) è una scena PICCOLA come i 6 interni a
     mestiere: nessuna camera che scorre, sta tutta centrata sullo schermo. */
  return { x: -Math.floor((W - rw) / 2), y: -Math.floor((H - rh) / 2) };
}
/* lucchetto disegnato a mano (arco + corpo): stesso oro dell'icona 🔒 (icons.js), stacca
   dal muro scuro del varco */
function drawPadlock(cx, cy) {
  rect(cx - 3, cy - 9, 2, 5, '#c9a227'); rect(cx + 1, cy - 9, 2, 5, '#c9a227'); rect(cx - 3, cy - 10, 6, 2, '#c9a227');
  rect(cx - 5, cy - 4, 10, 9, '#8a6a1e'); rect(cx - 5, cy - 4, 10, 2, '#c9a227');
  px(cx, cy, '#3a2e10');
}
/* etichetta sopra un punto (px SCENA): nome stanza, per riconoscerla dall'atrio senza
   doverci entrare (guardia lo stub dei test: niente ctx.fillText → niente crash, niente testo) */
function drawDoorLabel(cx, y, text) {
  if (!ctx.fillText) return;
  ctx.font = '600 6px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#f3ecda'; ctx.fillText(text, cx, y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
/* una porta di casa, disegnata come le porte degli edifici del mondo (stipite scuro +
   battente chiaro): stessa identità visiva, si riconosce a colpo d'occhio come "una porta". */
function drawHouseDoorSlab(x0, y0, w, h) {
  rect(x0, y0, w, h, '#3a2e20'); rect(x0 + 2, y0 + 2, w - 4, h - 4, '#c49a63');
}
/* ATRIO: un piccolo ingresso, non un corridoio — quanto basta per la porta di casa in basso
   e le porte delle 4 stanze sulle altre pareti (house.js: houseGates). Toni caldi come gli
   altri interni (wood di INT_WOOD), non un grigio istituzionale. */
export function drawHouseCorridor(time) {
  const rw = CORR_W * TS, rh = CORR_H * TS;
  const ox = Math.floor((view.W - rw) / 2), oy = Math.floor((view.H - rh) / 2);
  ctx.save(); ctx.translate(ox, oy);
  const wood = INT_WOOD[0];
  rect(0, 0, rw, rh, '#6e5138');                              // muro
  for (let ty = 0; ty < CORR_H; ty++) for (let tx = 0; tx < CORR_W; tx++) {
    if (tx === 0 || ty === 0 || tx === CORR_W - 1 || ty === CORR_H - 1) continue; // resta muro
    const sx = tx * TS, sy = ty * TS;
    rect(sx, sy, TS, TS, (tx + ty) % 2 ? wood[0] : wood[1]);
  }
  for (const g of houseGates()) {
    const onTop = g.wall === 'top', onLeft = g.wall === 'left';
    const w = onTop ? (g.x1 - g.x0) : TS + 4, h = onTop ? TS + 4 : (g.y1 - g.y0);
    const x0 = onTop ? g.x0 : (onLeft ? -2 : rw - w + 2);
    const y0 = onTop ? -2 : g.y0;
    drawHouseDoorSlab(x0, y0, w, h);
    /* punto "dentro l'atrio" davanti al varco: lucchetto + etichetta stanno lì, mai a
       cavallo della parete (fuori canvas per i varchi laterali) */
    const px2 = onTop ? g.cx : (onLeft ? 15 : rw - 15), py2 = onTop ? 16 : g.cy;
    if (!g.unlocked) drawPadlock(px2, py2 + 6);
    drawDoorLabel(px2, onTop ? 28 : py2 - (h / 2) - 3, roomName(g.id));
  }
  const dx = (CORR_W / 2) * TS;                               // porta d'ingresso, verso il mondo
  drawHouseDoorSlab(dx - 10, rh - 6, 20, 6);
  /* PORTALE DI RITORNO (goHome): in mezzo all'atrio, non fuori nel cortile — a richiesta
     esplicita: "il portale deve essere in mezzo al corridoio NON FUORI". */
  if (S.returnPortal) drawReturnPortal(ATRIO_PORTAL.x - 8, ATRIO_PORTAL.y - 8, time);
  const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
  shadow(Math.round(INT.x), Math.round(INT.y) + 12, 12);
  drawHero(null, Math.round(INT.x) - 16, Math.round(INT.y) - 20, INT.dir, fr);
  if (INT.say) drawSayBalloon(INT.x + ox, INT.y - 20 + oy, INT.say.text);
  ctx.restore();
}
/* ogni stanza si riconosce anche VUOTA, PRIMA di piazzarci l'arredo (che resta la vera
   decorazione): il fondo di serie sta in `ROOM_DEFAULT` (furnArt.js) — Sala e Cucina in assi,
   Bagno a mattonelle, Camera in legno scuro — e sopra ci vanno gli arredi fissi qui sotto. */
function drawRoomFixtures(id, rw) {
  if (id === 1) { // Cucina: piano cottura/credenza sagomati sulla parete di fondo
    rect(rw / 2 - 32, 1.3 * TS, 64, 20, '#8a5f38'); rect(rw / 2 - 32, 1.3 * TS, 64, 6, '#c98a2e');
    rect(rw / 2 - 32, 1.3 * TS, 4, 20, shade8('#8a5f38', 1.45)); rect(rw / 2 + 28, 1.3 * TS, 4, 20, shade8('#8a5f38', 0.6));
    for (const fx of [-18, 0, 18]) rect(rw / 2 + fx - 4, 1.3 * TS + 8, 8, 8, '#3a2e20');
  } else if (id === 2) { // Bagno: vasca/lavabo sulla parete di fondo
    rect(rw / 2 - 20, 1.3 * TS, 40, 20, '#dff0f7'); rect(rw / 2 - 20, 1.3 * TS, 40, 6, '#9fc4d0');
    rect(rw / 2 - 20, 1.3 * TS + 6, 4, 14, '#c3e4ee'); rect(rw / 2 + 16, 1.3 * TS + 6, 4, 14, shade8('#dff0f7', 0.65));
  } else if (id === 3) { // Camera: alcova del letto sulla parete di fondo
    rect(rw / 2 - 28, 1.3 * TS, 56, 16, '#5c4229');
    rect(rw / 2 - 28, 1.3 * TS, 4, 16, shade8('#5c4229', 1.5)); rect(rw / 2 + 24, 1.3 * TS, 4, 16, shade8('#5c4229', 0.6));
  }
}
/* maniglia per ruotare il mobile in mano: disco chiaro, contorno scuro, freccia circolare.
   Pulsa appena (fase dal tempo, mai dalle coordinate) per farsi notare la prima volta. */
function drawRotateHandle(x, y, d, time) {
  const r = d / 2, cx = x + r, cy = y + r;
  const puls = Math.floor(time / 400) % 2;
  for (let yy = -r; yy < r; yy++) for (let xx = -r; xx < r; xx++) {
    const q = (xx + 0.5) * (xx + 0.5) + (yy + 0.5) * (yy + 0.5);
    if (q <= r * r) px(cx + xx, cy + yy, q >= (r - 1.5) * (r - 1.5) ? '#2a2016' : (puls ? '#f6efdd' : '#fff8e6'));
  }
  /* freccia: arco di tre quarti + punta */
  const ar = r - 4;
  for (let a = 0.35; a < 5.2; a += 0.22) {
    px(Math.round(cx + Math.cos(a) * ar), Math.round(cy + Math.sin(a) * ar), '#a86e22');
  }
  const ex = Math.round(cx + Math.cos(0.35) * ar), ey = Math.round(cy + Math.sin(0.35) * ar);
  rect(ex - 1, ey - 3, 3, 1, '#a86e22'); rect(ex + 1, ey - 3, 1, 3, '#a86e22');
}
/* una STANZA della casa (Sala/Cucina/Bagno/Camera): scena PROPRIA, piccola come i 6 interni
   a mestiere — nessun NPC, un solo varco (in basso, verso l'atrio). L'arredo piazzato (M3/M4)
   si disegna in coordinate LOCALI dirette (gx,gy), niente più offset di una griglia condivisa. */
export function drawHouseRoomScene(time, id) {
  const rw = ROOM_TILE_W * TS, rh = ROOM_TILE_H * TS;
  const ox = Math.floor((view.W - rw) / 2), oy = Math.floor((view.H - rh) / 2);
  const WALL_H = Math.round(1.3 * TS);
  ctx.save(); ctx.translate(ox, oy);
  /* PAVIMENTO: quello scelto per la stanza (comprato al Negozio), altrimenti quello di serie.
     Il fondo è arredo anche lui: due stanze con gli stessi mobili e parati diversi sembrano
     due case, ed è la prima cosa che si vuole cambiare quando si arreda. */
  const def = roomDefault(id), gid = roomGround(id), pid = roomPaper(id);
  for (let ty = 0; ty < ROOM_TILE_H; ty++) for (let tx = 0; tx < ROOM_TILE_W; tx++)
    drawGroundTile(BRUSH, gid, tx * TS, ty * TS, tx, ty, def.ground);
  drawPaperBand(BRUSH, pid, 0, 0, rw, WALL_H, def.paper);
  rect(0, 0, 12, rh, '#6e5138'); rect(rw - 12, 0, 12, rh, '#6e5138'); rect(0, rh - 8, rw, 8, '#6e5138'); // laterali+bassa
  drawRoomFixtures(id, rw);
  /* finestra: un solo squarcio sulla parete di fondo, come negli altri interni */
  const wx = rw / 2 + (id % 2 ? -1 : 1) * 3 * TS;
  rect(wx, 12, TS, 24, night() > 0.4 ? '#2b3a55' : '#8fd0e6'); rect(wx, 12, TS, 4, '#5c4229'); rect(wx, 32, TS, 4, '#5c4229'); rect(wx + 14, 12, 4, 24, '#5c4229');
  /* ARREDO PIAZZATO. Tre strati, e in mezzo ci cammina il giocatore:
       1. quello che sta ALLA PARETE (quadri, mensole): sopra il muro, dietro a tutto il resto;
       2. quello STESO A TERRA (tappeti): sotto ai piedi di chiunque;
       3. i MOBILI e il giocatore, ordinati per profondità — così passando DIETRO a un letto
          ci si nasconde davvero dietro la testiera, invece di camminarci sopra come fantasmi.
     Il piedistallo con una specie assegnata mostra l'esposizione (`exhibitSprite`, STESSA
     sorgente del Museo), non il mobile vuoto. */
  const room = (S.house.rooms || [])[id];
  const placed = ((room && room.furn) || []).filter(f => FURN_BY_ID[f.itemId]);
  const cellsOf = f => { const sz = furnSize(f.itemId, f.rot || 0); return { x: f.gx * TS, y: f.gy * TS, w: sz.w * TS, h: sz.h * TS }; };
  for (const f of placed) if (furnLayer(f.itemId) === 'wall') {
    const r = cellsOf(f);
    drawFurnPiece(BRUSH, f.itemId, r.x, 2, r.w, WALL_H - 6, time);
  }
  for (const f of placed) if (furnLayer(f.itemId) === 'rug') {
    const r = cellsOf(f); drawFurnPiece(BRUSH, f.itemId, r.x, r.y, r.w, r.h, time);
  }
  /* profondità: chi ha la base più in alto si disegna prima. Il giocatore entra nella stessa
     fila, altrimenti resterebbe sempre davanti a tutto (o sempre dietro). */
  const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
  const depth = placed.filter(f => furnLayer(f.itemId) === 'floor')
    .map(f => { const r = cellsOf(f); return { y: r.y + r.h, draw: () => {
      if (f.itemId === PEDESTAL_ID && f.spId) {
        const cv = exhibitSprite(f.spId, S.museum[f.spId] || []);
        if (cv) { try { ctx.drawImage(cv, r.x - Math.floor((cv.width - r.w) / 2), r.y - (cv.height - r.h)); return; } catch (e) { /* stub */ } }
      }
      drawFurnPiece(BRUSH, f.itemId, r.x, r.y, r.w, r.h, time);
    } }; });
  depth.push({ y: Math.round(INT.y) + 12, draw: () => {
    shadow(Math.round(INT.x), Math.round(INT.y) + 12, 12);
    drawHero(null, Math.round(INT.x) - 16, Math.round(INT.y) - 20, INT.dir, fr);
  } });
  depth.sort((a, b) => a.y - b.y).forEach(d => d.draw());
  /* PEZZO IN MANO: l'anteprima sta NELLA STANZA, sulla casella dove finirebbe, e segue il
     puntatore (o i passi). Prima non c'era: si posava alla cieca sotto i piedi e per capire
     come stava bisognava prima posarlo e poi guardarlo — "devo vedere l'oggetto e poi
     draggarlo dove lo voglio così vedo come sta". Verde = ci sta, rosso = no; ruotando si
     aggiorna all'istante, perché è disegnata a ogni frame dallo stesso codice del mobile
     vero (non una seconda versione "simile" che può divergere). */
  if (isHolding()) {
    const hv = holdItem(), pl = holdPlacement(id);
    if (hv && pl) {
      const sz = furnSize(hv.itemId, hv.rot || 0);
      const parete = furnLayer(hv.itemId) === 'wall';
      const gx = pl.gx * TS, gy = parete ? 2 : pl.gy * TS;
      const gw = sz.w * TS, gh = parete ? WALL_H - 6 : sz.h * TS;
      const tinta = pl.ok ? 'rgba(126,192,105,.30)' : 'rgba(201,90,74,.34)';
      const bordo = pl.ok ? '#7ec069' : '#c95a4a';
      rect(gx, gy, gw, gh, tinta);                                   // la casella che occuperebbe
      ctx.globalAlpha = 0.72;
      drawFurnPiece(BRUSH, hv.itemId, gx, gy, gw, gh, time);
      ctx.globalAlpha = 1;
      const tratto = Math.floor(time / 120) % 2 ? 0 : 1;             // cornice che lampeggia piano
      for (let i = 0; i < gw; i += 4) { rect(gx + i + tratto, gy, 2, 1, bordo); rect(gx + i + tratto, gy + gh - 1, 2, 1, bordo); }
      for (let i = 0; i < gh; i += 4) { rect(gx, gy + i + tratto, 1, 2, bordo); rect(gx + gw - 1, gy + i + tratto, 1, 2, bordo); }
      /* MANIGLIA ↻: cerchio pieno col bordo scuro e una freccia che gira. Deve staccare da
         qualunque pavimento, quindi fondo chiaro e contorno scuro (REGOLA #13). */
      const hr = rotateHandleRect(id);
      if (hr) drawRotateHandle(hr.x, hr.y, hr.w, time);
    }
  }
  drawHouseDoorSlab(rw / 2 - 10, rh - 6, 20, 6);                 // varco in basso, verso l'atrio
  if (INT.say) drawSayBalloon(INT.x + ox, INT.y - 20 + oy, INT.say.text);
  ctx.restore();
}
export function drawHouseRooms(time) {
  if (INT.houseRoom == null) drawHouseCorridor(time); else drawHouseRoomScene(time, INT.houseRoom);
}
export function drawInteriorScene(time) {
  const W = view.W, H = view.H;
  ctx.setTransform(view.K, 0, 0, view.K, 0, 0);
  ctx.fillStyle = '#12100c'; ctx.fillRect(0, 0, W, H); // fuori: buio
  if (INT.b && INT.b.type === 'museum') { drawMuseumGallery(time); return; } // galleria con camera
  if (INT.b && INT.b.type === 'house') { drawHouseRooms(time); return; }     // atrio o una stanza (scene separate)
  const rw = INT.w * TS, rh = INT.h * TS;
  const ox = Math.floor((W - rw) / 2), oy = Math.floor((H - rh) / 2);
  ctx.save(); ctx.translate(ox, oy);
  const type = INT.b ? INT.b.type : 'store';
  /* pavimento a tema: pietra al laboratorio, assi di legno altrove */
  for (let ty = 0; ty < INT.h; ty++) for (let tx = 0; tx < INT.w; tx++) {
    const sx = tx * TS, sy = ty * TS;
    if (type === 'lab') {
      rect(sx, sy, TS, TS, (tx + ty) % 2 ? '#8f887a' : '#9a9285');
      rect(sx, sy, TS, 1, '#7f776a'); rect(sx, sy, 1, TS, '#7f776a');
      if ((tx * 7 + ty * 5) % 9 === 0) rect(sx + 18, sy + 20, 2, 2, '#75695c');
    } else if (type === 'museum') {
      rect(sx, sy, TS, TS, (tx + ty) % 2 ? '#ece5d2' : '#d9d0bb');
      rect(sx, sy, TS, 1, '#c4baa2'); rect(sx, sy, 1, TS, '#c4baa2');
    } else if (type === 'barber') {
      rect(sx, sy, TS, TS, (tx + ty) % 2 ? '#e8f2f5' : '#9fc4d0');
      rect(sx, sy, TS, 1, '#8fb0bd'); rect(sx, sy, 1, TS, '#8fb0bd');
    } else {
      /* assi del pavimento: il LEGNO è quello del bioma (chiaro nelle dune, scuro nei boschi) */
      const [w1, w2, w3] = INT_WOOD[INT.town ? zoneIdxAt(INT.town.C.x, INT.town.C.y) : 0] || INT_WOOD[0];
      rect(sx, sy, TS, TS, (tx + ty) % 2 ? w1 : w2);
      rect(sx, sy + 14, TS, 1, w3); rect(sx + ((ty % 2) * 16), sy, 1, TS, w3);
    }
  }
  /* parete di fondo + laterali */
  rect(0, 0, rw, 2 * TS, '#8a6a4a'); rect(0, 2 * TS - 6, rw, 6, '#6e5138');
  rect(0, 0, 12, rh, '#6e5138'); rect(rw - 12, 0, 12, rh, '#6e5138');
  rect(0, rh - 8, rw, 8, '#6e5138');
  if (type !== 'museum') {
    /* la CASA ha la sua scena dedicata (drawHouseRooms, N stanze affiancate): qui sotto restano
       solo i mestieri a stanza singola (lab/negozio/museo è già uscito sopra/locanda/barbiere/sartoria) */
    /* finestre sulla parete */
    for (const wx of [1.5 * TS, rw - 2.5 * TS]) {
      rect(wx, 12, TS, 24, night() > 0.4 ? '#2b3a55' : '#8fd0e6'); rect(wx, 12, TS, 4, '#5c4229'); rect(wx, 32, TS, 4, '#5c4229'); rect(wx + 14, 12, 4, 24, '#5c4229');
    }
    {
      /* bancone davanti all'NPC */
      rect(TS, 2.2 * TS, rw - 2 * TS, 20, '#8a5f38'); rect(TS, 2.2 * TS, rw - 2 * TS, 6, '#a97a4c');
      rect(TS, 2.2 * TS, 4, 20, shade8('#8a5f38', 1.45)); rect(rw - TS - 4, 2.2 * TS, 4, 20, shade8('#8a5f38', 0.6));
      /* NPC disegnato QUI (dopo il bancone, PRIMA dell'arredo): gli oggetti appoggiati
         sul bancone restano in primo piano → l'NPC non ci cammina davanti.
         La sartoria ha invece arredo sulla parete di FONDO (rastrelliera stoffe): là
         l'NPC va disegnato DOPO l'arredo, sennò le stoffe gli finiscono davanti. */
      /* Arredo in DUE passate con clip → profondità giusta dell'NPC:
         PARETE di fondo (fascia alta y<2·TS) prima → dietro l'NPC;
         BANCONE + PAVIMENTO (sotto) dopo → davanti (l'NPC non cammina davanti alla merce). */
      const drawRoom = () => {
        if (type === 'lab') drawLabRoom(rw, rh, time);
        else if (type === 'store') drawStoreRoom(rw, rh, time);
        else if (type === 'inn') drawInnRoom(rw, rh, time);
        else if (type === 'barber') drawBarberRoom(rw, rh, time);
        else if (type === 'tailor') drawTailorRoom(rw, rh, time);
      };
      const band = 2 * TS;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, rw, band); ctx.clip(); drawRoom(); ctx.restore();
      drawNpc(rw / 2, 1.9 * TS, type, time);
      ctx.save(); ctx.beginPath(); ctx.rect(0, band, rw, rh - band); ctx.clip(); drawRoom(); ctx.restore();
    }
  }
  /* varco della porta in basso */
  rect(rw / 2 - 20, rh - 12, 40, 12, '#3a2e20'); rect(rw / 2 - 16, rh - 8, 32, 8, '#c49a63');
  const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
  shadow(Math.round(INT.x), Math.round(INT.y) + 12, 12);
  drawHero(null, Math.round(INT.x) - 16, Math.round(INT.y) - 20, INT.dir, fr);
  if (INT.say) drawSayBalloon(ox + rw / 2, oy + 1.9 * TS - 10, INT.say.text); // coord SCHERMO (stanza centrata in ox,oy)
  ctx.restore();
}
