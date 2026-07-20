/* INTERNI — le sei stanze a tema, la galleria del museo e gli NPC che ci vivono.
   Erano quasi 500 righe dentro render.js: qui stanno insieme perché condividono la stessa
   idea (una stanza a tile con arredi solidi e un NPC che pattuglia dietro il bancone) e
   nessuna di loro serve al mondo aperto. */
import { TS, spById, PARTS, ZONES, MUSEUM_ZONES, zonePools } from './data.js';
import { S, P } from './state.js';
import { ctx, view, hudPad } from './screen.js';
import { snap, px, rect, shadow, shade8 } from './brush.js';
import { INT, NPCS, pedList, roomOrigin, ROOM_W, ROOM_H, GAL_DESK, MENTOR, CUT } from './interior.js';
import { drawHero, applyLook } from './sprites.js';
import { composedPartsVox } from './bones.js';
import { zoneName } from './i18n.js';
import { zoneIdxAt } from './regions.js';
import { INT_WOOD, night } from './tiles.js';
import { drawSayBalloon } from './props.js';
import { vhash } from './noise.js';

/* MAESTRO SCAVATORE: esploratore che passeggia nell'atrio del museo (nessun glifo sopra la testa) */
const MENTOR_LOOK = { hat: '#8a5a2a', shirt: '#b5622e', pants: '#4a3524', skin: '#e3b98a', hairStyle: 'short', hairColor: '#5a4636', hatStyle: 'explorer', eyeColor: '#33291f' };
export function drawMentor(x, y, dir, fr) {
  const saved = S.look; S.look = MENTOR_LOOK; applyLook();
  shadow(x, y + 6, 6);
  drawHero(null, snap(x - 8), snap(y - 10), dir, fr);
  S.look = saved; applyLook();
}

/* ---------- interni delle case ---------- */

/* NEGOZIO: scaffali di merci, casse, sacchi, botti, bilancia che oscilla, lanterna */
export function drawStoreRoom(rw, rh, time) {
  /* scaffale merci sulla parete + cartellino prezzi */
  const shx = rw / 2 - 30;
  rect(shx, 5, 60, 18, '#6e5138'); rect(shx + 2, 7, 56, 5, '#8a6a4a'); rect(shx + 2, 15, 56, 5, '#8a6a4a');
  const goods = ['#e8c34a', '#c65a54', '#5a86c8', '#5fa04e', '#8d7ba0', '#e08aa8'];
  goods.forEach((c, i) => { rect(shx + 4 + i * 9, 8, 6, 4, c); rect(shx + 6 + ((i * 5) % 40), 16, 5, 4, goods[(i + 3) % 6]); });
  rect(shx + 50, 3, 8, 6, '#f6efdd'); px(shx + 52, 5, '#c65a54'); px(shx + 55, 5, '#c65a54'); // cartellino
  /* salami e erbe appesi al soffitto (dondolano) */
  const sw2 = Math.round(Math.sin(time / 700));
  for (const [hx2, c] of [[30, '#8a3f3a'], [42, '#5fa04e'], [126, '#8a3f3a']]) {
    rect(hx2, 2, 1, 6, '#5c4229');
    rect(hx2 - 1 + sw2, 8, 3, 8, c); px(hx2 + sw2, 16, c);
  }
  /* bilancia che oscilla + monete + registro sul bancone */
  const bx = rw / 2 + 26, tilt = Math.floor(time / 900) % 2 ? 1 : -1;
  rect(bx, 30, 2, 8, '#5a5248'); rect(bx - 6, 30, 14, 2, '#8f887a');
  rect(bx - 7, 32 + tilt, 5, 2, '#c9a06a'); rect(bx + 4, 32 - tilt, 5, 2, '#c9a06a');
  rect(rw / 2 - 30, 32, 6, 3, '#e8c34a'); rect(rw / 2 - 28, 30, 4, 2, '#e8c34a');     // pila di monete
  rect(rw / 2 - 18, 31, 10, 5, '#f6efdd'); rect(rw / 2 - 13, 31, 1, 5, '#8a5f38');    // registro aperto
  /* lanterna appesa (fiammella) */
  const lf = Math.floor(time / 300) % 2;
  rect(14, 4, 2, 6, '#5c4229'); rect(11, 10, 8, 9, '#5a5248'); rect(13, 12, 4, 5, lf ? '#f2c53d' : '#e8862e');
  /* casse, sacco di grano e GATTO che dorme (coda che si muove) */
  rect(14, 46, 16, 16, '#a97a4c'); rect(14, 46, 16, 3, '#c49a63'); rect(20, 52, 4, 4, '#6e5138');
  rect(30, 50, 14, 14, '#8a5f38'); rect(32, 48, 10, 4, '#8a5f38');
  rect(16, 62, 12, 8, '#d4b13c'); rect(18, 60, 8, 4, '#c9a06a'); px(21, 60, '#8a5f38');
  /* GATTO arancione a strisce che dorme (contorno scuro → stacca dal legno) */
  const cat = Math.floor(time / 800) % 2;
  rect(30, 43, 12, 7, '#3a2a18'); rect(31, 44, 10, 5, '#e08a2c');                       // corpo + contorno
  rect(28, 41, 6, 5, '#3a2a18'); rect(29, 42, 4, 3, '#e08a2c');                          // testa
  px(32, 41, '#c65a1e'); px(29, 41, '#c65a1e');                                          // orecchie
  rect(33, 44, 1, 4, '#b5652a'); rect(36, 44, 1, 4, '#b5652a');                          // strisce
  px(30, 43, '#1a120a');                                                                 // occhio chiuso
  rect(40, 46 + cat, 5, 1, '#3a2a18'); rect(40, 45 + cat, 4, 1, '#e08a2c');              // coda
  /* botti + mele */
  for (const ox of [116, 134]) {
    rect(ox, 48, 14, 18, '#8a5f38'); rect(ox, 52, 14, 2, '#5c4229'); rect(ox, 60, 14, 2, '#5c4229');
    rect(ox + 4, 46, 6, 2, '#a97a4c');
  }
  rect(118, 44, 10, 4, '#c65a54'); px(120, 42, '#5fa04e');
  /* paglia sparsa sul pavimento */
  for (let i = 0; i < 6; i++) px(56 + (i * 17) % 50, 78 + (i * 11) % 22, '#d4b13c');
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
    cv = document.createElement('canvas'); cv.width = 36; cv.height = 32;
    const c2 = cv.getContext('2d');
    const vox = composedPartsVox(spId, parts);
    let mnx = 9e9, mxx = -9e9, mny = 9e9, mxy = -9e9, mnz = 9e9, mxz = -9e9;
    for (const v of vox) { mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x); mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y); mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z); }
    const ox = Math.floor((36 - (mxx - mnx + 1)) / 2), oy = Math.floor((32 - (mxy - mny + 1)) / 2);
    const zr = Math.max(1, mxz - mnz);
    for (const v of vox.slice().sort((a, b) => a.z - b.z)) {
      const zt = (v.z - mnz) / zr;
      c2.fillStyle = v.k === 'eye' ? '#201a14' : zt < 0.34 ? '#8f887a' : zt < 0.67 ? '#d6d0c2' : '#ffffff';
      c2.fillRect(ox + (v.x - mnx), oy + (mxy - v.y), 1, 1);
    }
  } catch (e) { cv = null; /* stub nei test */ }
  exCache.set(key, cv); return cv;
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
    if (vhash(tx, ty, 91) < 0.12) px(sx + 4 + Math.floor(vhash(tx, ty, 92) * 8), sy + 5 + Math.floor(vhash(tx, ty, 93) * 7), '#b09d76');
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
  const mx = Math.round(rw / 2 - 14), my = rh + 8;
  rect(mx, my, 28, 12, '#8a5f38'); rect(mx + 1, my + 1, 26, 10, '#a97a4c');
  for (let i = 0; i < 6; i++) rect(mx + 3 + i * 4, my + 3, 2, 6, '#8a5f38');
  /* TECHE: vetrina SCURA con cornice dorata — le ossa bianche risaltano */
  /* teca disegnata come funzione: entra nella lista ordinata per y (il pg ci passa DIETRO) */
  const drawCase = (pd) => {
    const bx = pd.tx * TS, by = pd.ty * TS;
    const parts = S.museum[pd.sp.id] || [];
    const full = parts.length === PARTS.length;
    shadow(bx + 8, by + 15, 9);
    rect(bx, by + 8, 16, 7, '#9a9285'); rect(bx, by + 8, 16, 2, '#b5ad9e'); rect(bx - 1, by + 13, 18, 2, '#7f776a');
    rect(bx, by + 10, 16, 1, '#c9a227');
    rect(bx - 4, by - 27, 24, 35, full ? '#e8c34a' : '#8a7118');           // cornice
    rect(bx - 3, by - 26, 22, 33, '#1b1626');                              // interno scuro
    rect(bx - 3, by - 26, 22, 1, '#494066');                               // luce alta
    const cv = parts.length ? exhibitSprite(pd.sp.id, parts) : null;
    if (cv) ctx.drawImage(cv, bx - 10, by - 25);
    else { px(bx + 7, by - 14, '#4a4438'); px(bx + 8, by - 14, '#4a4438'); px(bx + 9, by - 13, '#4a4438'); px(bx + 8, by - 11, '#4a4438'); px(bx + 8, by - 8, '#4a4438'); }
    for (let i = 0; i < 9; i++) px(bx + 14 - i, by - 24 + i, 'rgba(255,255,255,.14)'); // riflesso vetro
    ctx.fillStyle = 'rgba(255,235,180,.08)'; ctx.fillRect(bx - 2, by - 25, 20, 14);
    const rc = { comune: '#b8b0a2', raro: '#4e8d7c', eccezionale: '#d8973c', leggendario: '#8d6ac8' }[pd.sp.r];
    rect(bx + 2, by + 15, 12, 4, '#3a3a44'); rect(bx + 2, by + 15, 12, 1, '#c9a227'); rect(bx + 3, by + 17, 10, 1, rc);
    if (full) { const tw2 = Math.floor(time / 400) % 2; px(bx + (tw2 ? -2 : 17), by - 30, '#f2c53d'); px(bx + 8, by - 31 + tw2, '#f2c53d'); }
  };
  /* pianta in vaso come funzione (fronde alte: il pg passa dietro) */
  const drawPlant = (pxo) => {
    const vy = GAL_DESK.y1 - 2, sway = Math.round(Math.sin(time / 900 + pxo) * 1);
    shadow(pxo + 5, vy + 10, 6);
    rect(pxo + 1, vy, 8, 10, '#b5652a'); rect(pxo + 1, vy, 8, 2, '#d07d3c'); rect(pxo, vy - 1, 10, 2, '#8a4a1e'); // vaso
    rect(pxo + 2, vy + 3, 6, 1, '#8a4a1e');
    const cx3 = pxo + 5;
    rect(cx3, vy - 8, 1, 9, '#3f6b34');
    for (const [lx, ly, hh] of [[-4, -8, 6], [-2, -12, 8], [0, -15, 9], [2, -12, 8], [4, -8, 6]]) {
      for (let k = 0; k < hh; k++) px(cx3 + Math.round(lx * (1 - k / hh)) + (k > hh - 3 ? sway : 0), vy + ly + k, k < 2 ? '#619a4c' : '#4e7a3d');
    }
    px(cx3 - 1, vy - 15 + sway, '#7fb862'); px(cx3 + 1, vy - 16 + sway, '#7fb862');
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
    shadow(sx, sy + 6, 6);
    drawHero(null, sx - 8, sy - 10, INT.dir, fr);
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
  /* camino con fuoco, PENTOLA di stufato che bolle e fumo che sale */
  const cx = rw / 2 - 14;
  rect(cx, 3, 28, 20, '#75695c'); rect(cx + 3, 6, 22, 14, '#3a3a44'); rect(cx - 2, 21, 32, 3, '#8f887a');
  const ff = Math.floor(time / 150) % 3;
  rect(cx + 9, 12 + ff, 10, 7 - ff, '#e8862e'); rect(cx + 11, 14 + (ff % 2), 6, 5, '#f2c53d');
  px(cx + 13, 9 + ff, '#f2c53d'); px(cx + 15, 8 + ((ff + 1) % 3), '#e8862e');
  rect(cx + 6, 19, 16, 2, '#5c4229');
  rect(cx + 8, 8, 12, 5, '#3f3a33'); rect(cx + 10, 6, 8, 2, '#5a5248');               // pentola appesa
  const stw = Math.floor(time / 350) % 2; px(cx + 11 + stw * 4, 7, '#d4b13c');        // stufato che sobbolle
  const sm = Math.floor(time / 500) % 3;
  px(cx + 13, 2 - sm < 0 ? 0 : 2 - sm, '#8f887a'); px(cx + 16, 1, sm === 1 ? '#b8b0a2' : '#8f887a'); // fumo
  /* bagliore caldo pulsante sul pavimento davanti al camino */
  const gl = 0.10 + 0.04 * (Math.floor(time / 400) % 2);
  ctx.fillStyle = 'rgba(240,160,60,' + gl + ')'; ctx.fillRect(cx - 6, 24, 40, 26);
  /* trofeo alle pareti + mensola boccali + appendiabiti */
  rect(16, 6, 10, 8, '#8a5f38'); rect(18, 8, 6, 4, '#ece5d2'); px(19, 9, '#201a14'); px(22, 9, '#201a14'); // cranio trofeo
  rect(rw - 44, 5, 26, 2, '#5c4229');
  for (let i = 0; i < 4; i++) rect(rw - 42 + i * 6, 7, 4, 5, i % 2 ? '#c9a06a' : '#8f887a'); // boccali
  rect(rw - 26, 12, 14, 12, '#8a5f38'); rect(rw - 26, 16, 14, 2, '#5c4229'); px(rw - 20, 26, '#e8c34a'); // botte
  /* tappeto al centro */
  rect(rw / 2 - 18, 74, 36, 18, '#8a3f3a'); rect(rw / 2 - 16, 76, 32, 14, '#c65a54'); rect(rw / 2 - 12, 80, 24, 6, '#8a3f3a');
  /* CANE che dorme accanto al camino (respira) */
  const brt = Math.floor(time / 700) % 2;
  rect(94, 40 - brt, 12, 5 + brt, '#8a5f38'); rect(90, 42, 6, 4, '#8a5f38'); px(90, 41, '#8a5f38');
  px(91, 43, '#201a14'); rect(105, 43, 4, 2, '#6e4a2a');                               // coda
  /* tavoli in legno SCURO (staccano dal pavimento chiaro) con tovaglia, sgabelli, boccali, candela */
  for (const ox of [16, 114]) {
    rect(ox + 3, 64, 3, 5, '#3f2c18'); rect(ox + 28, 64, 3, 5, '#3f2c18');              // gambe
    rect(ox + 2, 50, 30, 14, '#5c3d22'); rect(ox + 2, 50, 30, 3, '#7a5636');            // piano scuro
    rect(ox + 5, 53, 24, 8, '#c9b58a'); rect(ox + 5, 53, 24, 2, '#ded0ab');             // tovaglia
    rect(ox, 55, 5, 6, '#4c3320'); rect(ox + 30, 55, 5, 6, '#4c3320');                  // sgabelli
    rect(ox + 10, 46, 5, 6, '#d4a24a'); px(ox + 15, 47, '#d4a24a');                     // boccale
    const st = Math.floor(time / 400) % 3; px(ox + 12, 42 - st, '#f6efdd');             // vapore
    rect(ox + 22, 46, 2, 5, '#f0e6cc'); px(ox + 22, 44, Math.floor(time / 250) % 2 ? '#f2c53d' : '#e8862e'); // candela
  }
}
/* BARBIERE: pavimento a scacchi, specchiera, poltrona, palo con strisce che SCORRONO */
export function drawBarberRoom(rw, rh, time) {
  /* specchiera: riflessi + BAGLIORE che scorre sul vetro */
  const mx = rw / 2 - 22;
  rect(mx, 4, 44, 18, '#8a5f38'); rect(mx + 3, 6, 38, 13, '#bfe9f4');
  rect(mx + 5, 8, 10, 9, '#cfe8f2'); rect(mx + 28, 8, 8, 9, '#cfe8f2');
  const sh2 = Math.floor(time / 260) % 12;
  rect(mx + 4 + sh2 * 3, 7, 2, 11, '#e8f6fb');                                        // shine
  rect(mx - 2, 22, 48, 3, '#a97a4c');
  ['#5a86c8', '#e08aa8', '#5fa04e', '#e8c34a'].forEach((c, i) => rect(mx + 4 + i * 10, 17, 4, 5, c));
  rect(mx + 40, 18, 6, 3, '#f6efdd'); rect(mx + 40, 15, 6, 3, '#f6efdd');             // asciugamani
  /* OROLOGIO a pendolo (oscilla) */
  const pd = Math.floor(time / 600) % 2 ? 2 : -2;
  rect(14, 4, 12, 14, '#8a5f38'); rect(16, 6, 8, 7, '#f6efdd'); px(19, 8, '#201a14'); px(19 + Math.sign(pd), 9, '#201a14');
  rect(19, 18, 1, 6, '#5a5248'); px(19 + pd, 24, '#e8c34a');                          // pendolo
  /* palo del barbiere: strisce che scorrono */
  const off = Math.floor(time / 180) % 6;
  rect(rw - 20, 4, 10, 26, '#f3ecda'); rect(rw - 20, 2, 10, 2, '#5a5248'); rect(rw - 20, 30, 10, 2, '#5a5248');
  for (let yy = -6 + off; yy < 26; yy += 6) { if (yy >= 0 && yy < 24) rect(rw - 20, 4 + yy, 10, 3, yy % 12 < 6 ? '#c65a54' : '#5a86c8'); }
  /* POLTRONA DA BARBIERE compatta (~13×22px): poggiatesta, schienale, braccioli,
     seduta, colonnina cromata, base tonda, poggiapiedi */
  const chx = 24;
  rect(chx + 3, 44, 8, 2, '#3a3a44');                                                   // poggiatesta
  rect(chx + 1, 46, 12, 10, '#8a3f3a'); rect(chx + 2, 47, 10, 8, '#c65a54');            // schienale
  rect(chx + 2, 47, 10, 1, '#e08a84'); rect(chx + 6, 49, 1, 6, '#a3494e');              // imbottitura/cucitura
  rect(chx - 1, 50, 3, 6, '#5a5248'); rect(chx + 12, 50, 3, 6, '#5a5248');              // braccioli
  rect(chx + 1, 56, 12, 3, '#c65a54'); rect(chx + 1, 56, 12, 1, '#e08a84');             // seduta
  rect(chx + 5, 59, 4, 5, '#cfc9bc'); rect(chx + 6, 59, 2, 5, '#e8e2d0');               // colonnina
  rect(chx + 2, 64, 10, 2, '#3a3a44'); rect(chx + 3, 62, 8, 1, '#8f887a');              // base + poggiapiedi
  /* CIUFFI di capelli tagliati a terra */
  const hairs = [['#33291f', 46, 70], ['#caa25a', 52, 72], ['#b5622e', 44, 74], ['#6e4a2a', 54, 70]];
  hairs.forEach(([c, hx2, hy2]) => { px(hx2, hy2, c); px(hx2 + 1, hy2, c); });
  /* scopa appoggiata + panca d'attesa + pianta */
  rect(60, 40, 2, 22, '#c9a06a'); rect(57, 60, 8, 5, '#d4b13c');
  rect(116, 52, 30, 8, '#a97a4c'); rect(118, 60, 4, 6, '#6e5138'); rect(140, 60, 4, 6, '#6e5138');
  rect(146, 42, 8, 8, '#4a9a55'); rect(148, 50, 4, 6, '#c65a54');
  px(rw / 2 + 24, 32, '#8f887a'); px(rw / 2 + 25, 33, '#8f887a'); px(rw / 2 + 26, 32, '#8f887a');
}
/* SARTORIA: rotoli di stoffa, manichino vestito, macchina da cucire con ago ANIMATO */
export function drawTailorRoom(rw, rh, time) {
  /* rastrelliera di stoffe + bozzetti incorniciati */
  const rx = rw / 2 - 28;
  rect(rx, 4, 56, 3, '#5c4229');
  ['#c65a54', '#5a86c8', '#5fa04e', '#e08aa8', '#e8c34a', '#8d7ba0'].forEach((c, i) => {
    rect(rx + 3 + i * 9, 7, 7, 14, c); rect(rx + 3 + i * 9, 7, 7, 2, '#f6efdd');
  });
  rect(12, 6, 12, 14, '#8a5f38'); rect(14, 8, 8, 10, '#f6efdd'); rect(16, 10, 4, 6, '#e08aa8'); // bozzetto abito
  rect(rw - 24, 6, 12, 14, '#8a5f38'); rect(rw - 22, 8, 8, 10, '#f6efdd'); rect(rw - 20, 10, 4, 3, '#5a86c8'); rect(rw - 21, 14, 6, 3, '#5a86c8');
  /* mensola dei rocchetti di filo colorato */
  rect(30, 24, 30, 2, '#5c4229');
  ['#c65a54', '#5fa04e', '#f6efdd'].forEach((c, i) => { rect(32 + i * 9, 18, 5, 6, c); px(34 + i * 9, 16, '#5a5248'); });
  /* manichino vestito + cesto di gomitoli */
  rect(24, 44, 8, 6, '#f3cfa0'); rect(20, 50, 16, 12, '#e08aa8'); rect(22, 50, 12, 3, '#c06a88');
  rect(27, 62, 2, 5, '#5a5248'); rect(24, 66, 8, 2, '#5a5248');
  rect(42, 58, 12, 8, '#c9a06a'); rect(44, 56, 8, 3, '#a97a4c');
  px(45, 55, '#c65a54'); px(48, 54, '#5a86c8'); px(51, 55, '#5fa04e');                 // gomitoli
  /* MACCHINA DA CUCIRE riconoscibile: tavolino, corpo a "C" nero con filo dorato,
     volantino a destra che gira, ago su/giù, stoffa che avanza */
  rect(110, 54, 40, 4, '#8a5f38'); rect(110, 54, 40, 2, '#a97a4c');                    // piano del tavolino
  rect(112, 58, 3, 12, '#5c4229'); rect(145, 58, 3, 12, '#5c4229');                    // gambe
  rect(116, 40, 22, 6, '#2f2b26'); rect(116, 40, 22, 2, '#4a4640');                    // braccio superiore
  rect(116, 40, 5, 14, '#2f2b26');                                                     // colonna sinistra
  rect(116, 50, 26, 4, '#3a3630'); rect(116, 50, 26, 1, '#c9a227');                    // base con filo dorato
  px(120, 43, '#c9a227'); px(128, 43, '#e8c34a');                                      // dettagli oro
  /* ago che sale/scende sotto la testa */
  const ndl = Math.floor(time / 180) % 2;
  rect(134, 46, 2, 3, '#2f2b26');                                                      // testa dell'ago
  rect(134, 49, 1, 3 + ndl, '#e8e2d0'); px(134, 52 + ndl, '#cfc9bc');                  // ago
  /* stoffa sotto l'ago con la cucitura che avanza (trattini netti) */
  rect(126, 52, 16, 2, '#5a86c8');
  for (let i = 0; i < 4; i++) px(128 + i * 3, 53, (i + Math.floor(time / 200)) % 2 ? '#e8e2d0' : '#5a86c8'); // punti cuciti
  /* VOLANTINO a destra: ruota tonda con MANOVELLA che orbita (rotazione chiara) */
  const wcx = 146, wcy = 45, ang = time / 200;
  rect(wcx - 4, wcy - 4, 8, 8, '#3a3630'); rect(wcx - 3, wcy - 3, 6, 6, '#5a5248');    // corpo ruota
  px(wcx, wcy, '#c9a06a');                                                             // mozzo
  const hx = Math.round(wcx + Math.cos(ang) * 3), hy = Math.round(wcy + Math.sin(ang) * 3);
  px(hx, hy, '#c9a227'); px(hx, hy - 1, '#e8c34a');                                    // manovella che gira
  /* puntaspilli + ritagli di stoffa a terra */
  rect(118, 50, 4, 3, '#c65a54'); px(119, 49, '#8f887a'); px(121, 49, '#8f887a');
  for (let i = 0; i < 5; i++) px(60 + (i * 19) % 44, 80 + (i * 13) % 20, ['#c65a54', '#5a86c8', '#e08aa8', '#5fa04e', '#e8c34a'][i]);
}
/* LABORATORIO: lavagna con scheletro, scaffale pozioni, alambicco con fiamma e bolle, banco studio */
export function drawLabRoom(rw, rh, time) {
  /* lavagna al centro della parete */
  const bx = rw / 2 - 26;
  rect(bx - 2, 3, 56, 2, '#5c4229'); rect(bx - 2, 21, 56, 2, '#5c4229');
  rect(bx, 5, 52, 16, '#2e3d33');
  rect(bx + 5, 8, 7, 6, '#e8e2d0'); px(bx + 7, 10, '#2e3d33'); px(bx + 10, 10, '#2e3d33');
  for (let i = 0; i < 7; i++) px(bx + 14 + i * 3, 11 + (i % 2), '#e8e2d0');
  for (let i = 0; i < 3; i++) { px(bx + 16 + i * 6, 13, '#cbbfa4'); px(bx + 16 + i * 6, 14, '#cbbfa4'); }
  rect(bx + 38, 7, 9, 6, '#cbbfa4'); px(bx + 40, 9, '#2e3d33'); px(bx + 43, 9, '#2e3d33');
  rect(bx + 4, 18, 8, 2, '#f6efdd');
  /* barattoli con ESEMPLARI sospesi (bollicine) sotto la finestra sinistra */
  rect(12, 24, 30, 2, '#5c4229');
  for (let i = 0; i < 3; i++) {
    const jx = 14 + i * 10;
    rect(jx, 14, 7, 10, '#bfe9f4'); rect(jx, 13, 7, 1, '#5a5248');
    rect(jx + 2, 17, 3, 4, ['#5fa04e', '#c65a54', '#8d7ba0'][i]);                       // esemplare
    const jb = (Math.floor(time / 300) + i) % 4; px(jx + 1 + (i % 2) * 4, 22 - jb, '#e8f6fb'); // bollicina
  }
  /* scaffale pozioni sotto la finestra destra */
  const shx = rw - 3.4 * TS;
  rect(shx - 2, 24, 40, 2, '#5c4229');
  const bots = [['#5a86c8', 7], ['#4e8d7c', 9], ['#c65a54', 6], ['#8d7ba0', 10], ['#e8c34a', 7]];
  bots.forEach(([c, hgt], i) => {
    const x = shx + i * 8;
    rect(x, 24 - hgt, 5, hgt, c); rect(x + 1, 24 - hgt - 2, 3, 2, '#cfe8f2'); px(x + 1, 26 - hgt, '#f6efdd');
  });
  /* postazione ALAMBICCO: bruciatore, storta con bolle, tubo con GOCCIA che cade, beuta */
  rect(12, 44, 36, 22, '#8a5f38'); rect(12, 44, 36, 3, '#a97a4c'); rect(14, 66, 4, 4, '#5c4229'); rect(42, 66, 4, 4, '#5c4229');
  const fl = Math.floor(time / 160) % 2;
  rect(19, 40, 8, 3, '#75695c');
  px(21 + fl, 37, '#f2c53d'); px(22, 36 - fl, '#e8862e'); px(23 - fl, 37, '#f2c53d'); px(22, 38, '#e8862e');
  rect(17, 26, 12, 12, '#bfe9f4'); rect(18, 30, 10, 7, '#5fa04e');
  rect(20, 22, 4, 5, '#bfe9f4'); rect(19, 20, 6, 2, '#8fd0e6');
  const bb = Math.floor(time / 260) % 3;
  px(21, 35 - bb, '#a4dd8c'); px(24, 33 - ((bb + 1) % 3), '#a4dd8c');
  for (let i = 0; i < 5; i++) px(29 + i * 2, 24 + i, '#8fd0e6');
  const drop = Math.floor(time / 340) % 4;
  px(37, 29 + drop, '#8fd0e6');                                                         // goccia che cade
  rect(38, 30, 7, 8, '#bfe9f4'); rect(39, 34, 5, 3, '#8d7ba0');
  px(40, 28 - fl, '#cfe8f2');
  /* banco da studio: microscopio, teschio, libro, CANDELA accesa, fogli a terra */
  rect(112, 44, 36, 22, '#8a5f38'); rect(112, 44, 36, 3, '#a97a4c'); rect(114, 66, 4, 4, '#5c4229'); rect(142, 66, 4, 4, '#5c4229');
  rect(117, 34, 3, 10, '#5a5248'); rect(119, 32, 5, 3, '#3f3a33'); rect(116, 42, 9, 2, '#3f3a33');
  px(121, 36, '#8fd0e6');
  rect(129, 36, 8, 7, '#ece5d2'); px(131, 38, '#201a14'); px(134, 38, '#201a14'); rect(130, 41, 6, 1, '#cbbfa4');
  rect(139, 38, 9, 6, '#f6efdd'); rect(143, 38, 1, 6, '#8a5f38'); px(140, 40, '#8f887a'); px(145, 40, '#8f887a');
  rect(126, 32, 2, 5, '#f6efdd'); px(126, 30, Math.floor(time / 250) % 2 ? '#f2c53d' : '#e8862e'); // candela
  rect(100, 78, 7, 5, '#f6efdd'); rect(104, 84, 7, 5, '#ece5d2'); px(102, 80, '#8f887a');           // fogli caduti
  /* TOPOLINO grigio che sfreccia lungo la parete bassa */
  const rt = (time / 1000) % 14;
  if (rt < 2.2) {
    const rxp = 18 + (rt / 2.2) * 120;
    rect(rxp, 100, 5, 3, '#7a7268'); rect(rxp + 4, 100, 2, 2, '#7a7268');  // corpo + testa grigi
    px(rxp + 5, 99, '#e0a8b0');                                // orecchio rosa
    px(rxp + 5, 101, '#1a120a');                               // occhio
    rect(rxp - 3, 101, 3, 1, '#8a8278');                       // coda
  }
}
/* pattugliamento dietro il bancone: fermo → cammina a destra → fermo → attraversa → fermo → torna */
const NPC_SPAN = 22;
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
  drawHero(null, snap(x - 8 + p.ox), snap(y - 12), p.dir, fr);
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
  return { x: -Math.floor((W - rw) / 2), y: -Math.floor((H - rh) / 2) };
}
export function drawInteriorScene(time) {
  const W = view.W, H = view.H;
  ctx.setTransform(view.K, 0, 0, view.K, 0, 0);
  ctx.fillStyle = '#12100c'; ctx.fillRect(0, 0, W, H); // fuori: buio
  if (INT.b && INT.b.type === 'museum') { drawMuseumGallery(time); return; } // galleria con camera
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
      if ((tx * 7 + ty * 5) % 9 === 0) px(sx + 9, sy + 10, '#75695c');
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
      rect(sx, sy + 7, TS, 1, w3); rect(sx + ((ty % 2) * 8), sy, 1, TS, w3);
    }
  }
  /* parete di fondo + laterali */
  rect(0, 0, rw, 2 * TS, '#8a6a4a'); rect(0, 2 * TS - 3, rw, 3, '#6e5138');
  rect(0, 0, 6, rh, '#6e5138'); rect(rw - 6, 0, 6, rh, '#6e5138');
  rect(0, rh - 4, rw, 4, '#6e5138');
  if (type !== 'museum') {
    /* finestre sulla parete */
    for (const wx of [1.5 * TS, rw - 2.5 * TS]) {
      rect(wx, 6, TS, 12, night() > 0.4 ? '#2b3a55' : '#8fd0e6'); rect(wx, 6, TS, 2, '#5c4229'); rect(wx, 16, TS, 2, '#5c4229'); rect(wx + 7, 6, 2, 12, '#5c4229');
    }
    /* bancone davanti all'NPC */
    rect(TS, 2.2 * TS, rw - 2 * TS, 10, '#8a5f38'); rect(TS, 2.2 * TS, rw - 2 * TS, 3, '#a97a4c');
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
  /* varco della porta in basso */
  rect(rw / 2 - 10, rh - 6, 20, 6, '#3a2e20'); rect(rw / 2 - 8, rh - 4, 16, 4, '#c49a63');
  const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
  shadow(Math.round(INT.x), Math.round(INT.y) + 6, 6);
  drawHero(null, Math.round(INT.x) - 8, Math.round(INT.y) - 10, INT.dir, fr);
  if (INT.say) drawSayBalloon(ox + rw / 2, oy + 1.9 * TS - 10, INT.say.text); // coord SCHERMO (stanza centrata in ox,oy)
  ctx.restore();
}
