/* INTERNI — le sei stanze a tema, la galleria del museo e gli NPC che ci vivono.
   Erano quasi 500 righe dentro render.js: qui stanno insieme perché condividono la stessa
   idea (una stanza a tile con arredi solidi e un NPC che pattuglia dietro il bancone) e
   nessuna di loro serve al mondo aperto. */
import { TS, spById, PARTS, ZONES, MUSEUM_ZONES, zonePools, FURN_BY_ID, PEDESTAL_ID, furnIsSolid, furnSize, furnPlace } from './data.js';
import { drawFurnPiece, drawGroundTile, drawPaperBand, furnRise, roomDefault, furnRotatable } from './furnArt.js';
import { drawReturnPortal } from './render.js'; // ciclo sicuro: chiamata solo a runtime, come drawInteriorScene(render.js→interiors.js)
import { S, P } from './state.js';
import { ctx, view, hudPad } from './screen.js';
import { snap, px, rect, shadow, shade8, BRUSH } from './brush.js';
import { INT, NPCS, pedList, roomOrigin, ROOM_W, ROOM_H, GAL_DESK, MENTOR, CUT } from './interior.js';
import { CORR_W, CORR_H, ROOM_TILE_W, ROOM_TILE_H, houseGates, roomUnlocked, ATRIO_PORTAL, furnLayer, roomPaper, roomGround, isHolding, holdItem, holdPlacement, rotateHandleRect } from './house.js';
import { drawHero, applyLook } from './sprites.js';
import { SHOP_WINDOWS, drawShopFloor, drawShopWall, drawShopShell, drawShopFront, drawCounter, drawStoreProps, drawStoreFloorProps, drawInnProps, drawInnFloorProps, drawBarberProps, drawBarberFloorProps, drawTailorProps, drawTailorFloorProps, drawLabProps, drawLabFloorProps } from './shopArt.js';
import { ATRIO_TOP, ATRIO_BOTTOM, ROOM_TOP, ROOM_BOTTOM, sceneShift, roomStyle, wallCap, drawCrown, drawWainscot, drawBaseboard, floorShadow, drawWindow, drawWindowLight, drawDoormat, drawRunner, drawBackDoor, drawSideDoor, drawFrontDoorway, drawSconce, drawFramedPicture, drawCoatHooks, drawWallPlant } from './houseArt.js';
import { composedPartsVox, shadeHex } from './bones.js';
import { zoneName } from './i18n.js';
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
  if (INT.b && INT.b.type === 'house') { const o = houseOrigin(W, H); return { x: -o.ox, y: -o.oy }; }
  return { x: -Math.floor((W - rw) / 2), y: -Math.floor((H - rh) / 2) };
}
/* dove sta, sullo schermo, la scena della casa attiva: centrata tenendo conto di TUTTO il
   disegno (la faccia del muro di fondo sale oltre la stanza). interiorCam usa questo stesso
   punto, altrimenti un tocco finirebbe qualche pixel più in là di dove si vede. */
export function houseOrigin(W, H) {
  const atrio = INT.houseRoom == null;
  const rw = (atrio ? CORR_W : ROOM_TILE_W) * TS, rh = (atrio ? CORR_H : ROOM_TILE_H) * TS;
  const shift = atrio ? sceneShift(ATRIO_TOP, ATRIO_BOTTOM) : sceneShift(ROOM_TOP, ROOM_BOTTOM);
  return { ox: Math.floor((W - rw) / 2), oy: Math.floor((H - rh) / 2) + shift };
}
/* ATRIO: l'ingresso di casa. Parete di fondo vera (cornice, intonaco, zoccolo a pannelli,
   battiscopa) con le porte della Sala e della Cucina, le porte del Bagno e della Camera nei
   muri laterali, la porta di casa in basso con lo zerbino e una guida rossa che porta in
   mezzo. Ogni porta ha la sua targhetta con l'icona della stanza; chiusa, ha il lucchetto.
   Il disegno sta in houseArt.js, la geometria (varchi e muri) in house.js. */
const ATRIO_FLOOR = { c1: '#b8894f', c2: '#a97a45', kind: 'plank' };
const ATRIO_STYLE = { accent: '#b8574a', accent2: '#e0a24a', wains: 'panel', wood: '#7a4f30' };
export function drawHouseCorridor(time) {
  const rw = CORR_W * TS, rh = CORR_H * TS;
  const { ox, oy } = houseOrigin(view.W, view.H);
  ctx.save(); ctx.translate(ox, oy);
  const g = BRUSH, FY0 = -26, FY1 = 14;
  for (let ty = 0; ty < CORR_H; ty++) for (let tx = 0; tx < CORR_W; tx++) drawGroundTile(g, null, tx * TS, ty * TS, tx, ty, ATRIO_FLOOR);
  drawRunner(g, rw / 2 - 16, 150, 32, 74);
  drawDoormat(g, rw / 2 - 18, rh - 26, 36, 14, '#8a6a3a');
  /* parete di fondo */
  rect(0, FY0, rw, FY1 - FY0, '#dcc6a0');
  rect(0, FY0 + 4, rw, 10, '#e6d3b0');
  for (let x = 20; x < rw; x += 44) rect(x, FY0 + 17, 30, 1, '#cbb28a');
  drawCrown(g, 0, FY0, rw);
  drawWainscot(g, 0, -1, rw, 11, ATRIO_STYLE);
  drawBaseboard(g, 0, 10, rw);
  wallCap(g, -14, FY0 - 10, rw + 28, 10, 'bottom');
  wallCap(g, -14, FY0 - 1, 22, rh - FY0 + 15, 'right');
  wallCap(g, rw - 8, FY0 - 1, 22, rh - FY0 + 15, 'left');
  /* le cose appese fra una porta e l'altra */
  drawCoatHooks(g, 9, -18);
  drawFramedPicture(g, rw / 2 - 12, -21, 24, 17);
  drawSconce(g, rw / 2 - 22, -6, time); drawSconce(g, rw / 2 + 22, -6, time);
  drawWallPlant(g, rw - 20, 13);
  floorShadow(g, 8, FY1 + 1, rw - 16, 0, 'down');
  floorShadow(g, 8, FY1, 0, rh - FY1, 'right');
  floorShadow(g, rw - 13, FY1, 5, rh - FY1, 'left');
  for (const gt of houseGates()) {
    const floorCol = roomDefault(gt.id).ground.c1;
    if (gt.wall === 'top') drawBackDoor(g, gt.x0, gt.x1, FY0, FY1, gt.unlocked, gt.id, floorCol);
    else drawSideDoor(g, gt.wall === 'left' ? -14 : rw - 8, 22, gt.y0, gt.y1, gt.wall, gt.unlocked, gt.id, floorCol);
  }
  /* PORTALE DI RITORNO (goHome): in mezzo all'atrio, non fuori nel cortile — a richiesta
     esplicita: "il portale deve essere in mezzo al corridoio NON FUORI". */
  if (S.returnPortal) drawReturnPortal(ATRIO_PORTAL.x - 8, ATRIO_PORTAL.y - 8, time);
  const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
  shadow(Math.round(INT.x), Math.round(INT.y) + 12, 12);
  drawHero(null, Math.round(INT.x) - 16, Math.round(INT.y) - 20, INT.dir, fr);
  /* muro davanti con la porta di casa: dopo il giocatore, che scendendo ci passa sotto */
  wallCap(g, -14, rh - 8, rw / 2 - 16 + 14 - 3, 22, 'top');
  wallCap(g, rw / 2 + 16 + 3, rh - 8, rw / 2 - 16 + 14 - 3, 22, 'top');
  drawFrontDoorway(g, rw / 2, rh - 8, 16, 22, true);
  if (INT.say) drawSayBalloon(INT.x + ox, INT.y - 20 + oy, INT.say.text);
  ctx.restore();
}
/* maniglia per ruotare il mobile in mano. Due tentativi disegnati da zero erano brutti
   ("la freccietta fa schifo!"): a 16px un'icona non si improvvisa. Qui c'è l'icona «reload»
   di pixelarticons — lo STESSO set di tutte le icone del gioco — ridotta a 12×12 senza
   perdere un pixel (il disegno originale ha tratti da 2 su una griglia da 24), dentro un
   disco chiaro col bordo scuro che stacca da ogni pavimento. */
const ROT_ICON = [
  '............',
  '.......#....',
  '.......##...',
  '..########..',
  '.#.....##...',
  '.#.....#....',
  '.#..#.....#.',
  '...##.....#.',
  '..########..',
  '...##.......',
  '....#.......',
  '............',
];
function drawRotateHandle(x, y, d, time) {
  const r = d / 2, cx = x + r, cy = y + r;
  for (let yy = 0; yy < d; yy++) for (let xx = 0; xx < d; xx++) {
    const dx = xx + 0.5 - r, dy = yy + 0.5 - r, q = dx * dx + dy * dy;
    if (q > r * r) continue;
    px(x + xx, y + yy, q > (r - 1.2) * (r - 1.2) ? '#2a2016' : '#f6efdd');
  }
  /* un respiro lento dell'inchiostro, fase dal tempo: si fa notare senza ballare */
  const ink = Math.floor(time / 600) % 2 ? '#3a2f1e' : '#6b4a22';
  const ox = x + Math.round((d - 12) / 2), oy = y + Math.round((d - 12) / 2);
  for (let rr = 0; rr < 12; rr++) for (let c = 0; c < 12; c++) if (ROT_ICON[rr][c] === '#') px(ox + c, oy + rr, ink);
}
/* una STANZA della casa (Sala/Cucina/Bagno/Camera): scena PROPRIA, piccola come i 6 interni
   a mestiere — nessun NPC, un solo varco (in basso, verso l'atrio). L'arredo piazzato (M3/M4)
   si disegna in coordinate LOCALI dirette (gx,gy), niente più offset di una griglia condivisa. */
export function drawHouseRoomScene(time, id) {
  const rw = ROOM_TILE_W * TS, rh = ROOM_TILE_H * TS;
  const { ox, oy } = houseOrigin(view.W, view.H);
  const WALL_H = Math.round(1.3 * TS);
  ctx.save(); ctx.translate(ox, oy);
  /* PAVIMENTO: quello scelto per la stanza (comprato al Negozio), altrimenti quello di serie.
     Il fondo è arredo anche lui: due stanze con gli stessi mobili e parati diversi sembrano
     due case, ed è la prima cosa che si vuole cambiare quando si arreda. */
  const def = roomDefault(id), gid = roomGround(id), pid = roomPaper(id);
  for (let ty = 0; ty < ROOM_TILE_H; ty++) for (let tx = 0; tx < ROOM_TILE_W; tx++)
    drawGroundTile(BRUSH, gid, tx * TS, ty * TS, tx, ty, def.ground);
  drawPaperBand(BRUSH, pid, 0, 0, rw, WALL_H, def.paper);
  /* ARCHITETTURA (houseArt.js): cornice in cima, zoccolo col carattere della stanza (pannelli
     in sala, cotto in cucina, piastrelle in bagno, perline in camera), battiscopa, la finestra
     con le tende del colore della stanza e la luce che cade sul pavimento, lo spessore dei muri
     e l'ombra dove il pavimento li incontra. */
  const st = roomStyle(id), g = BRUSH, nk = night();
  drawCrown(g, 0, 0, rw);
  drawWainscot(g, 0, 26, rw, 10, st);
  drawBaseboard(g, 0, 36, rw);
  const wx = rw / 2 + (id % 2 ? -1 : 1) * 3 * TS - 2;
  drawWindow(g, wx, 3, st, nk, time);
  drawWindowLight(g, wx, WALL_H, nk);
  floorShadow(g, 12, WALL_H, rw - 24, 0, 'down');
  floorShadow(g, 12, WALL_H, 0, rh - WALL_H, 'right');
  floorShadow(g, rw - 17, WALL_H, 5, rh - WALL_H, 'left');
  wallCap(g, 0, -ROOM_TOP, rw, ROOM_TOP, 'bottom');
  wallCap(g, 0, -1, 12, rh + 1, 'right');
  wallCap(g, rw - 12, -1, 12, rh + 1, 'left');
  drawDoormat(g, rw / 2 - 16, rh - 22, 32, 12, st.accent);
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
    const r = cellsOf(f); drawFurnPiece(BRUSH, f.itemId, r.x, r.y, r.w, r.h, time, f.rot || 0);
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
      drawFurnPiece(BRUSH, f.itemId, r.x, r.y, r.w, r.h, time, f.rot || 0);
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
      drawFurnPiece(BRUSH, hv.itemId, gx, gy, gw, gh, time, hv.rot || 0);
      ctx.globalAlpha = 1;
      const tratto = Math.floor(time / 120) % 2 ? 0 : 1;             // cornice che lampeggia piano
      for (let i = 0; i < gw; i += 4) { rect(gx + i + tratto, gy, 2, 1, bordo); rect(gx + i + tratto, gy + gh - 1, 2, 1, bordo); }
      for (let i = 0; i < gh; i += 4) { rect(gx, gy + i + tratto, 1, 2, bordo); rect(gx + gw - 1, gy + i + tratto, 1, 2, bordo); }
      /* MANIGLIA ↻: cerchio pieno col bordo scuro e una freccia che gira. Deve staccare da
         qualunque pavimento, quindi fondo chiaro e contorno scuro (REGOLA #13). */
      const hr = furnRotatable(hv.itemId) ? rotateHandleRect(id) : null;   // niente maniglia per chi è uguale da ogni lato
      if (hr) drawRotateHandle(hr.x, hr.y, hr.w, time);
    }
  }
  /* muro davanti col varco verso l'atrio: dopo mobili e giocatore */
  wallCap(g, 0, rh - 8, rw / 2 - 19, 8 + ROOM_BOTTOM, 'top');
  wallCap(g, rw / 2 + 19, rh - 8, rw / 2 - 19, 8 + ROOM_BOTTOM, 'top');
  drawFrontDoorway(g, rw / 2, rh - 8, 16, 8 + ROOM_BOTTOM, false);
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
  /* BOTTEGA (shopArt.js): lo stesso guscio della casa con i materiali del mestiere, il
     bancone vero e gli arredi ridisegnati. Gli ingombri (FURN in interior.js) non cambiano. */
  const g = BRUSH, nk = night(), wins = SHOP_WINDOWS[type] || [];
  const wood = INT_WOOD[INT.town ? zoneIdxAt(INT.town.C.x, INT.town.C.y) : 0] || INT_WOOD[0];
  drawShopFloor(g, type, rw, rh, wood, drawGroundTile);
  drawShopWall(g, type, rw, rh, nk, time, wins);
  drawShopShell(g, type, rw, rh, nk, wins);
  const wallProps = { store: drawStoreProps, inn: drawInnProps, barber: drawBarberProps, tailor: drawTailorProps, lab: drawLabProps }[type];
  const floorProps = { store: drawStoreFloorProps, inn: drawInnFloorProps, barber: drawBarberFloorProps, tailor: drawTailorFloorProps, lab: drawLabFloorProps }[type];
  if (wallProps) wallProps(g, rw, rh, time);
  /* bancone davanti all'NPC, poi l'NPC, poi quello che sta sul bancone e sul pavimento
     (davanti a lui: l'NPC non cammina davanti alla merce) */
  drawCounter(g, type, TS, Math.round(2.2 * TS), rw - 2 * TS, 20);
  drawNpc(rw / 2, 1.9 * TS, type, time);
  if (floorProps) { const e = type === 'lab' ? breedEgg() : null; floorProps(g, rw, rh, time, e, !!e && eggReady()); }
  const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
  shadow(Math.round(INT.x), Math.round(INT.y) + 12, 12);
  drawHero(null, Math.round(INT.x) - 16, Math.round(INT.y) - 20, INT.dir, fr);
  drawShopFront(BRUSH, rw, rh);
  if (INT.say) drawSayBalloon(ox + rw / 2, oy + 1.9 * TS - 10, INT.say.text); // coord SCHERMO (stanza centrata in ox,oy)
  ctx.restore();
}
