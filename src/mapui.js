/* MAPPA DEL MONDO — pergamena 8-bit che si scopre camminando: zoom con rotella, pinch o i
   tasti +/−, trascinamento, e i punti d'interesse si toccano per sapere cosa sono.
   Estratta da ui.js perché è una schermata a sé, con uno stato proprio (zoom, centro,
   trascinamento) che non c'entra con il resto dell'interfaccia. */
import { S, P, save } from './state.js';
import { vhash } from './noise.js';
import { FOOT_DY } from './body.js';
import { TS } from './data.js';
import { CH, isExplored, exploredTiles, revealArea } from './map.js';
import { townForCell, TCELL, landmarkForCell, LCELL, townInfo, townForTile, baseTerrain, hasMuseum, siteForCell, SCELL } from './world.js';
import { wonderName, isDiscovered, WONDERS } from './wonders.js';
import { withIcons, iconPaths } from './icons.js';
import { zoneIdxAt } from './regions.js';
import { tr } from './i18n.js';
import { playSfx } from './audio.js';
import { toast, setPromptFromMap as setPrompt, showBanner, openWonderBook } from './ui.js';
import { dirTo, goHome, siteRemaining } from './gameplay.js';
import { rarLabel, townSizeLabel } from './i18n.js';

let mapOpenFlag = false;
export function isMapOpen() { return mapOpenFlag; }

/* PULSAZIONE della stellina "sei qui". Due battiti al secondo, dal TEMPO e da nient'altro.
   La mappa si ridisegna solo quando la fase CAMBIA (due volte al secondo), non a ogni
   fotogramma: ridisegnarla sessanta volte al secondo vorrebbe dire ricampionare duecentomila
   celle di terreno per far battere una stella. */
let pulseRaf = null, pulseFase = 1;
export function fasePulsazione() { return pulseFase; }
function avviaPulsazione() {
  if (pulseRaf !== null || typeof requestAnimationFrame !== 'function') return;
  const giro = (t) => {
    if (!mapOpenFlag) { pulseRaf = null; return; }              // chiusa la mappa, il giro muore
    const f = Math.floor((t || 0) / 380) % 2;
    if (f !== pulseFase) { pulseFase = f; drawMapCanvas(); }
    pulseRaf = requestAnimationFrame(giro);
  };
  pulseRaf = requestAnimationFrame(giro);
}
export function closeMap() {
  mapOpenFlag = false;
  if (pulseRaf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(pulseRaf);
  pulseRaf = null;
  const o = document.getElementById('mapov'); if (o && o.classList) o.classList.remove('on');
}

/* ---------- MAPPA: pergamena che si scopre camminando. Zoom con rotella / pinch / +− e
   trascinamento col dito. Lo zoom è in PIXEL PER TILE (interi: la pixel-art non si sfoca). ---------- */
const MAP_TERR = ['#1d3b52', '#2f6b8f', '#d8c58a', '#5fa04e', '#2f6b3a', '#a9784a', '#8a8378', '#c9bda0', '#7fc46a', '#b09a72'];
/* colore della TERRA per BIOMA: sulla mappa due prati di zone diverse erano lo stesso verde e i
   biomi non si distinguevano. Un colore per zona (ordine = ZONES di data.js) + varianti per
   terreno (foresta/montagna più scure, sabbia tono spiaggia, acqua blu). */
const MAP_ZONE = ['#8fce76', '#e0cd97', '#6f8060', '#bf8b57', '#5a7a4e', '#dbe4ea']; // prati·dune·boschi·terre·palude·ghiacci
function mapShade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k)), g = Math.min(255, Math.round(((n >> 8) & 255) * k)), b = Math.min(255, Math.round((n & 255) * k));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
/* CARTA DA ESPLORATORE ("la mappa deve essere una mappa"): i colori del gioco si stendono come
   acquerello sulla pergamena — sfumati verso la carta, non pieni come pixel del mondo */
const PARCH = [217, 195, 147];
function onPaper(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v * (1 - k) + PARCH[i] * k));
  return '#' + ((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1);
}
function mapTerrColor(tx, ty) { return onPaper(mapTerrRaw(tx, ty), 0.38); }
function mapTerrRaw(tx, ty) {
  const t = baseTerrain(tx, ty);
  if (t === 0) return '#1d3b52';                                   // acqua profonda
  if (t === 1) return '#2f6b8f';                                   // acqua
  if (t === 2) return '#dccb92';                                   // sabbia (spiaggia/dune): tono riconoscibile
  const z = MAP_ZONE[zoneIdxAt(tx, ty)] || '#5fa04e';
  if (t === 6) return mapShade(z, 0.62);                           // montagna: bioma scurito
  if (t === 4) return mapShade(z, 0.78);                           // foresta
  if (t === 5) return mapShade(z, 0.9);                            // terra battuta
  return z;                                                        // erba = colore del bioma
}
/* zoom < 1 = zoom OUT (vista d'insieme): non si disegna mezza tile (sfocherebbe), si CAMPIONA —
   1 pixel ogni N tile (N intero). Così la pixel-art resta netta anche vedendo mezzo continente. */
const MAP_ZOOMS = [0.25, 0.5, 1, 2, 3, 4, 6]; // px per tile (sotto 1 = campionamento in zoom out)
/* Si APRE a ×3, non a ×1. A un pixel per tile si vedeva mezzo continente: bello da guardare e
   inutile per la domanda che si fa aprendo la mappa, che è «dove sono e cosa ho intorno».
   La città sotto i piedi era grande sei pixel e il segnalino ci si perdeva dentro. Chi vuole la
   vista d'insieme fa due clic su −, che è meno lavoro che cercarsi da capo ogni volta. */
const MAP_ZOOM_DEF = 3;
let mapPins = [];                         // punti cliccabili disegnati sull'ultima mappa
let mapZoom = MAP_ZOOM_DEF, mapOff = { x: 0, y: 0 }; // offset in tile rispetto al player
export function mapZoomBy(d) {
  const i = Math.max(0, Math.min(MAP_ZOOMS.length - 1, MAP_ZOOMS.indexOf(mapZoom) + d));
  if (MAP_ZOOMS[i] === mapZoom) return;
  mapZoom = MAP_ZOOMS[i]; drawMapCanvas();
}
export function mapReset() { mapZoom = MAP_ZOOM_DEF; mapOff = { x: 0, y: 0 }; drawMapCanvas(); }
/* DOVE SEI: uno SPILLO da mappa, con l'alone che pulsa a terra.
 *
 * Prima era un quadratino bianco disegnato dalla stessa funzione dei paesi e delle X del
 * tesoro: su una mappa piena di quadratini, l'unico che conta davvero non si distingueva da
 * quelli attorno. Poi ho provato una stella a quattro punte: a tre pixel per tile diventava
 * una macchia pallida senza forma, perché una stella ha bisogno di spazio per leggersi.
 * Lo spillo funziona in piccolo perché ha una SAGOMA: testa tonda, punta in basso, e la punta
 * cade esattamente sulla tua tile. È anche il simbolo che tutti leggono come "sei qui" senza
 * che nessuno lo spieghi, e non somiglia a niente altro sulla mappa.
 * L'alone pulsa fra due misure e non fra visibile e invisibile: un indicatore di posizione che
 * se ne va a intermittenza si cerca due volte invece di una.
 * La fase viene SOLO dal tempo (`fasePulsazione`), mai dalle coordinate: la mappa si trascina,
 * e una fase legata alla posizione farebbe battere l'alone a scatti mentre scorri.
 */
/* la goccia classica: semicerchio in cima, due fianchi che si chiudono sulla punta in basso.
   La punta cade ESATTAMENTE sulla tua tile, non il centro della testa: è l'unico punto dello
   spillo che indica un posto, e sbagliarlo sposta la tua posizione di mezzo centimetro. */
function sagomaSpillo(c, X, Y, r) {
  const cy = Y - r * 2.5;                       // centro della testa
  c.beginPath();
  c.moveTo(X, Y);
  c.quadraticCurveTo(X - r * 1.02, cy + r * 0.62, X - r, cy);
  c.arc(X, cy, r, Math.PI, 0, false);
  c.quadraticCurveTo(X + r * 1.02, cy + r * 0.62, X, Y);
  c.closePath();
  return cy;
}
function meStar(c, tx, ty, x0, y0, SC, cv) {
  const X = Math.round((tx - x0) * SC), Y = Math.round((ty - y0) * SC);
  if (X < -60 || Y < -60 || X > cv.width + 60 || Y > cv.height + 60) return;
  /* misura FISSA, non legata allo zoom: questo è interfaccia, non terreno. Scalandolo con SC
     era grande sette pixel nella vista d'insieme, cioè illeggibile proprio dove serve di più. */
  const r = 7 * RES;
  const acceso = fasePulsazione() === 1;
  /* LAMPEGGIA cambiando tinta, non sparendo e non cambiando misura: uno spillo che se ne va a
     intermittenza si cerca due volte, e uno che si gonfia e si sgonfia balla sulla pergamena.
     Due rossi, uno acceso e uno spento: si vede battere anche con la coda dell'occhio e la
     sagoma non si muove di un pixel. */
  /* alone chiaro sotto lo spillo: su un terreno scuro (foresta, acqua profonda) il rosso da
     solo si perdeva */
  sagomaSpillo(c, X, Y, r + 3);
  c.fillStyle = 'rgba(255,248,230,.85)'; c.fill();
  const cy = sagomaSpillo(c, X, Y, r);
  c.fillStyle = acceso ? '#f03b2e' : '#8f2018';
  c.fill();
  c.strokeStyle = '#241a10'; c.lineWidth = 2 * RES; c.lineJoin = 'round';
  c.stroke();                                    // contorno scuro: stacca da ogni terreno
  /* occhiello: senza, la testa è una macchia rossa piatta e lo spillo non si legge */
  c.fillStyle = acceso ? '#fff3ea' : '#d9b4ab';
  c.beginPath(); c.arc(X, cy, r * 0.38, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#241a10'; c.lineWidth = RES; c.stroke();
  mapPins.push({ x: X, y: cy, r: r + 6 * RES, kind: 'me' });
}

/* ---------- SEGNI della mappa ----------
   "Non si capisce cosa è cosa": i punti d'interesse erano quadratini di 3-4 pixel che si
   distinguevano solo per il colore, e la legenda li mostrava come quadratini diversi da quelli
   veri. Ora ogni luogo è un DISTINTIVO di misura fissa (non scala con lo zoom: è interfaccia)
   con dentro l'icona dello stesso set di tutto il gioco — il tempio per il Museo, la casetta
   per casa tua, le case per un paese. La legenda li disegna con la STESSA funzione, quindi
   quello che si vede sotto è esattamente quello che si cerca sopra. */
export const RES = 2;                        // pixel di canvas per unità: il testo dei nomi resta nitido
export const MAP_SIGNS = {
  museum: { bg: '#efe8d6', ink: '#3b2f1e', icon: 'museum', size: 50 },
  town: { bg: '#e8c34a', ink: '#3b2f1e', icon: 'village', size: 42 },
  village: { bg: '#e8c34a', ink: '#3b2f1e', icon: 'village', size: 34 },
  home: { bg: '#8fd0a0', ink: '#1f3a26', icon: 'home', size: 46 },
  wonder: { bg: '#c79bff', ink: '#2a1850', icon: 'star', size: 42 },
  arch: { bg: '#57e0d0', ink: '#10403a', icon: 'door', size: 42 },
  site: { bg: '#d9b98a', ink: '#3b2f1e', icon: 'bone', size: 32 },
};
const pathCache = new Map();
function pathsFor(name) {
  if (!pathCache.has(name)) {
    let ps = [];
    try { if (typeof Path2D === 'function') ps = iconPaths(name).map(d => new Path2D(d)); } catch (e) { ps = []; }
    pathCache.set(name, ps);
  }
  return pathCache.get(name);
}
/* un distintivo tondo col bordo scuro e l'icona dentro, centrato in (x, y) */
export function drawSign(c, kind, x, y, k0) {
  const sg = MAP_SIGNS[kind]; if (!sg) return 0;
  const R = (sg.size * (k0 || 1)) / 2;
  c.fillStyle = 'rgba(20,14,8,.35)';
  c.beginPath(); c.arc(x + 2, y + 3, R, 0, Math.PI * 2); c.fill();        // ombra: il distintivo sta SOPRA la carta
  c.fillStyle = '#241a10';
  c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
  c.fillStyle = sg.bg;
  c.beginPath(); c.arc(x, y, R - Math.max(2.5, R * 0.13), 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)';
  c.beginPath(); c.arc(x - R * 0.3, y - R * 0.35, R * 0.28, 0, Math.PI * 2); c.fill();
  const ps = pathsFor(sg.icon), k = (R * 2 * 0.6) / 24;
  c.fillStyle = sg.ink;
  if (ps.length) {
    c.save(); c.translate(Math.round(x - 12 * k), Math.round(y - 12 * k)); c.scale(k, k);
    for (const p2 of ps) c.fill(p2);
    c.restore();
  } else c.fillRect(Math.round(x - R * 0.3), Math.round(y - R * 0.3), Math.round(R * 0.6), Math.round(R * 0.6));
  return R;
}
/* X del tesoro: una croce rossa col bordo scuro, come sulle mappe dei pirati */
export function drawTreasureX(c, x, y, k0) {
  const k = k0 || 1, L = 13 * k;
  c.lineCap = 'round';
  c.strokeStyle = '#fff3ea'; c.lineWidth = 14 * k;
  c.beginPath(); c.moveTo(x - L, y - L); c.lineTo(x + L, y + L); c.moveTo(x + L, y - L); c.lineTo(x - L, y + L); c.stroke();
  c.strokeStyle = '#241a10'; c.lineWidth = 10 * k;
  c.stroke();
  c.strokeStyle = '#e4573d'; c.lineWidth = 5 * k;
  c.stroke();
  c.lineCap = 'butt';
}
/* nome di un luogo sotto il suo distintivo: scritta scura col bordo chiaro, si legge su ogni terreno */
function drawLabel(c, text, x, y, big, k0) {
  if (!c.fillText) return;
  c.font = (big ? '800 ' : '700 ') + Math.round((big ? 26 : 22) * (k0 || 1)) + 'px ui-monospace, Menlo, monospace';
  c.textAlign = 'center'; c.textBaseline = 'top';
  /* il nome resta tutto dentro la carta anche per un luogo sul bordo */
  const mt = c.measureText ? c.measureText(text) : null;
  const half = ((mt && mt.width) || text.length * 13) / 2 + 4;
  x = Math.max(half, Math.min(c.canvas ? c.canvas.width - half : x, x));
  c.lineJoin = 'round'; c.strokeStyle = 'rgba(243,236,218,.95)'; c.lineWidth = 6;
  c.strokeText(text, x, y); c.fillStyle = '#2a1e12'; c.fillText(text, x, y);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
}

function drawMapCanvas() {
  const cv = document.getElementById('mapcv'); if (!cv || !cv.getContext) return;
  /* zoom ≥ 1: `cell` px per tile (1 tile per cella). zoom < 1: 1px per cella ma OGNI cella copre
     `step` tile (campionamento). `SC` = px di CANVAS per tile (con RES), usato dai segni. */
  const step = mapZoom >= 1 ? 1 : Math.max(2, Math.round(1 / mapZoom));
  const cell = mapZoom >= 1 ? mapZoom : 1;
  const CP = cell * RES;                                                        // px di canvas per cella
  const SC = CP / step;
  const cellsW = Math.round(560 / cell), cellsH = Math.round(360 / cell);
  const VWt = cellsW * step, VHt = cellsH * step;                               // tile inquadrate
  cv.width = cellsW * CP; cv.height = cellsH * CP;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const px0 = Math.floor(P.x / TS) + Math.round(mapOff.x), py0 = Math.floor((P.y + FOOT_DY) / TS) + Math.round(mapOff.y);
  const x0 = px0 - (VWt >> 1), y0 = py0 - (VHt >> 1);
  c.fillStyle = '#c9b184'; c.fillRect(0, 0, cv.width, cv.height);               // carta non esplorata
  /* trama leggera sulla carta non esplorata: si capisce che è "ancora da scoprire", non un
     deserto color sabbia */
  c.fillStyle = 'rgba(120,90,50,.13)';
  for (let yy = 0; yy < cv.height; yy += 12) for (let xx = (yy / 12) % 2 ? 6 : 0; xx < cv.width; xx += 12) c.fillRect(xx, yy, 2, 2);
  const water = t => t === 0 || t === 1;
  for (let cyi = 0; cyi < cellsH; cyi++) for (let cxi = 0; cxi < cellsW; cxi++) {
    const tx = x0 + cxi * step, ty = y0 + cyi * step;                           // tile campionata della cella
    if (!isExplored(tx, ty)) continue;
    const ti = townInfo(tx, ty), X = cxi * CP, Y = cyi * CP;
    c.fillStyle = ti ? (ti.solid ? '#9a6a3e' : '#d9cba8') : mapTerrColor(tx, ty);
    c.fillRect(X, Y, CP, CP);
    if (ti || cell < 2) continue;
    const t = baseTerrain(tx, ty);
    /* COSTE: una riga scura dove la terra tocca l'acqua. Senza, sabbia chiara e ghiaccio
       bianco si confondevano col mare chiaro e non si vedeva dove finisse l'isola. */
    if (!water(t)) {
      c.fillStyle = '#1e2e3a';
      if (water(baseTerrain(tx, ty - step))) c.fillRect(X, Y, CP, RES);
      if (water(baseTerrain(tx, ty + step))) c.fillRect(X, Y + CP - RES, CP, RES);
      if (water(baseTerrain(tx - step, ty))) c.fillRect(X, Y, RES, CP);
      if (water(baseTerrain(tx + step, ty))) c.fillRect(X + CP - RES, Y, RES, CP);
    }
    /* SIMBOLI del terreno, come sulle mappe disegnate: alberelli nei boschi, picchi sui monti,
       onde nel mare aperto. Uno ogni poche tile, dalla posizione della tile (mai dallo schermo). */
    if (cell >= 3) {
      const h = Math.floor(vhash(tx, ty, 311) * 1000);
      /* mare a tratteggio d'inchiostro: onde corte in righe sfalsate */
      if ((t === 0 || t === 1) && (ty % 3 === 0) && ((tx + (ty % 6 === 0 ? 2 : 0)) % 4 === 0)) { c.fillStyle = 'rgba(30,50,70,.35)'; c.fillRect(X, Y + CP / 2, 2 * RES, RES); c.fillRect(X + 2 * RES, Y + CP / 2 - RES, RES, RES); }
      if (t === 4 && h % 14 === 0) { c.fillStyle = 'rgba(20,40,20,.5)'; c.fillRect(X + CP / 2 - RES, Y + RES, 2 * RES, RES); c.fillRect(X + CP / 2 - 2 * RES, Y + 2 * RES, 4 * RES, RES); c.fillRect(X + CP / 2 - RES / 2, Y + 3 * RES, RES, 2 * RES); }
      else if (t === 6 && h % 16 === 0) { c.fillStyle = 'rgba(30,24,20,.55)'; c.fillRect(X + CP / 2 - RES / 2, Y + RES, RES, RES); c.fillRect(X + CP / 2 - 1.5 * RES, Y + 2 * RES, 3 * RES, RES); c.fillRect(X + CP / 2 - 2.5 * RES, Y + 3 * RES, 5 * RES, RES); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(X + CP / 2 - RES / 2, Y + RES, RES, RES); }
      else if (t === 0 && h % 40 === 0) { c.fillStyle = 'rgba(140,190,220,.45)'; c.fillRect(X + RES, Y + CP / 2, 2 * RES, RES); c.fillRect(X + 3 * RES, Y + CP / 2 - RES, 2 * RES, RES); }
    }
    /* bordo dell'esplorato: una riga di matita dove finisce quello che hai visto */
    c.fillStyle = 'rgba(90,60,30,.55)';
    if (!isExplored(tx, ty - step)) c.fillRect(X, Y, CP, RES);
    if (!isExplored(tx, ty + step)) c.fillRect(X, Y + CP - RES, CP, RES);
    if (!isExplored(tx - step, ty)) c.fillRect(X, Y, RES, CP);
    if (!isExplored(tx + step, ty)) c.fillRect(X + CP - RES, Y, RES, CP);
  }
  mapPins = [];                                   // per il click: cosa c'è in quel punto
  /* i segni sono INTERFACCIA: devono avere la stessa misura sullo schermo, non sulla canvas.
     Su un telefono la carta si vede ridotta a metà e i distintivi diventavano puntini: quando
     la carta è mostrata più piccola del normale, segni e nomi crescono in proporzione. */
  const shown = cv.clientWidth || 0;
  const signK = shown > 0 ? Math.max(1, Math.min(2, (cv.width * 0.62) / shown)) : 1;
  const inView = (x, y) => x > -40 && y > -40 && x < cv.width + 40 && y < cv.height + 40;
  const sign = (kind, tx, ty, info, label, bigLabel) => {
    const x = Math.round((tx - x0) * SC + SC / 2), y = Math.round((ty - y0) * SC + SC / 2);
    if (!inView(x, y)) return;
    const R = drawSign(c, kind, x, y, signK);
    if (label) drawLabel(c, label, x, y + R + 30 * signK > cv.height ? y - R - 30 * signK : y + R + 3, bigLabel, signK);
    if (info) mapPins.push({ x, y, r: R + 8, ...info });
  };
  /* siti di scavo ancora attivi (ossa che affiorano): si torna lì a colpo sicuro */
  { const r2 = Math.ceil(Math.max(VWt, VHt) / SCELL / 2) + 1;
    for (let cy = -r2; cy <= r2; cy++) for (let cx = -r2; cx <= r2; cx++) {
      const st = siteForCell(Math.floor(px0 / SCELL) + cx, Math.floor(py0 / SCELL) + cy);
      if (!st || !isExplored(st.x, st.y) || siteRemaining(st) <= 0) continue;
      sign('site', st.x, st.y, { kind: 'site', tx: st.x, ty: st.y, left: siteRemaining(st) });
    } }
  const cellR = Math.ceil(Math.max(VWt, VHt) / LCELL) + 1;
  for (let cy = -cellR; cy <= cellR; cy++) for (let cx = -cellR; cx <= cellR; cx++) {
    const lm = landmarkForCell(Math.floor(px0 / LCELL) + cx, Math.floor(py0 / LCELL) + cy);
    if (!lm || !isDiscovered(lm.type) || !isExplored(lm.x, lm.y)) continue;
    const arco = ['bonearch', 'redarch'].includes(lm.type);
    sign(arco ? 'arch' : 'wonder', lm.x, lm.y, { kind: 'wonder', type: lm.type, tx: lm.x, ty: lm.y }, mapZoom >= 2 ? wonderName(lm.type) : null);
  }
  /* le CITTÀ esplorate, col nome. Il MUSEO è il motivo per cui si torna in città, ma ce l'hanno
     solo quelle grandi: prendono il distintivo col tempio, più grande, e il nome sempre scritto. */
  { const seen = new Set(), cstep = Math.max(1, Math.round(6 / step));   // campiona ~ogni 6 tile a ogni zoom
    for (let cyi = 0; cyi < cellsH; cyi += cstep) for (let cxi = 0; cxi < cellsW; cxi += cstep) {
      const tx = x0 + cxi * step, ty = y0 + cyi * step;
      if (!isExplored(tx, ty)) continue;
      const tw = townForTile(tx, ty); if (!tw || seen.has(tw.key)) continue;
      seen.add(tw.key);
      const museum = hasMuseum(tw);
      const kind = museum ? 'museum' : tw.size === 'borgo' ? 'village' : 'town';
      sign(kind, tw.C.x, tw.C.y, { kind: 'town', name: tw.name, size: tw.size, museum, tx: tw.C.x, ty: tw.C.y },
        museum || mapZoom >= 2 ? tw.name : null, museum);
    } }
  /* CASA: sempre cliccabile (teletrasporto istantaneo, vedi goHome) */
  if (S.home && isExplored(S.home.x, S.home.y)) sign('home', S.home.x, S.home.y, { kind: 'home', tx: S.home.x, ty: S.home.y }, tr('Casa', 'Home'), true);
  for (const m of S.maps || []) {
    const x = Math.round((m.x - x0) * SC + SC / 2), y = Math.round((m.y - y0) * SC + SC / 2);
    if (!inView(x, y)) continue;
    drawTreasureX(c, x, y, signK);
    mapPins.push({ x, y, r: 24 * signK, kind: 'map', rar: m.rar, tx: m.x, ty: m.y });
  }
  meStar(c, Math.floor(P.x / TS), Math.floor((P.y + FOOT_DY) / TS), x0, y0, SC, cv);  // dove sei
  paperFinish(c, cv.width, cv.height);
  const sub = document.getElementById('mp-sub');
  if (sub) sub.textContent = tr('meraviglie ', 'wonders ') + (S.wonders || []).length + '/' + Object.keys(WONDERS).length;   // un dato solo: zoom ed esplorato non servono a leggere la carta
}
/* RIFINITURE DA CARTA VERA, ferme sul foglio (non scorrono con la mappa): le due pieghe, i bordi
   bruciacchiati a gradini e la rosa dei venti nell'angolo */
function paperFinish(c, w, h) {
  c.fillStyle = 'rgba(80,55,25,.16)'; c.fillRect(Math.round(w / 2) - RES, 0, RES, h); c.fillRect(0, Math.round(h / 2) - RES, w, RES);
  c.fillStyle = 'rgba(255,245,220,.18)'; c.fillRect(Math.round(w / 2), 0, RES, h); c.fillRect(0, Math.round(h / 2), w, RES);
  for (let i = 0; i < 5; i++) {
    const a = [0.34, 0.24, 0.16, 0.1, 0.05][i], s = (i + 1) * RES * 2;
    c.fillStyle = `rgba(92,58,24,${a})`;
    c.fillRect(0, i * RES * 2, w, RES * 2); c.fillRect(0, h - s, w, RES * 2); c.fillRect(i * RES * 2, 0, RES * 2, h); c.fillRect(w - s, 0, RES * 2, h);
  }
  /* rosa dei venti */
  const R = 26 * RES, cx = w - R - 16 * RES, cy = R + 18 * RES, u = RES * 2;
  c.fillStyle = 'rgba(40,28,14,.12)'; for (let yy = -R; yy <= R; yy += u) { const ww = Math.round(Math.sqrt(R * R - yy * yy) / u) * u; c.fillRect(cx - ww, cy + yy, ww * 2, u); }
  const ray = (dx, dy, len, col) => { for (let k = 0; k < len; k += u) { const wdt = Math.max(u, Math.round((len - k) / 3 / u) * u); c.fillStyle = col; c.fillRect(cx + dx * k - (dy ? wdt / 2 : 0), cy + dy * k - (dx ? wdt / 2 : 0), dy ? wdt : u, dx ? wdt : u); } };
  ray(0, -1, R - u, '#7a2418'); ray(0, 1, R - u, '#3a2a18'); ray(-1, 0, R * 0.7, '#3a2a18'); ray(1, 0, R * 0.7, '#3a2a18');
  c.fillStyle = '#e8d6a8'; c.fillRect(cx - u, cy - u, u * 2, u * 2);
  c.fillStyle = '#3a2a18'; c.font = `bold ${7 * RES}px ui-monospace, monospace`; c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillText('N', cx, cy - R - RES); c.textAlign = 'start'; c.textBaseline = 'alphabetic';
}
/* la LEGENDA disegna i segni con le stesse funzioni della mappa: una canvas per voce */
function legendItem(kind, label) {
  return `<span class="mp-li"><canvas class="mp-sg" width="40" height="40" data-sign="${kind}"></canvas>${label}</span>`;
}
function paintLegend(root) {
  root.querySelectorAll('canvas[data-sign]').forEach(cv2 => {
    const c2 = cv2.getContext && cv2.getContext('2d'); if (!c2) return;
    c2.clearRect(0, 0, 40, 40);
    const k = cv2.dataset.sign;
    if (k === 'x') drawTreasureX(c2, 20, 20);
    else if (k === 'me') { sagomaSpillo(c2, 20, 34, 9); c2.fillStyle = '#f03b2e'; c2.fill(); c2.strokeStyle = '#241a10'; c2.lineWidth = 3; c2.stroke(); c2.fillStyle = '#fff3ea'; c2.beginPath(); c2.arc(20, 11.5, 3.4, 0, Math.PI * 2); c2.fill(); }
    else if (k === 'fog') { c2.fillStyle = '#241a10'; c2.fillRect(6, 6, 28, 28); c2.fillStyle = '#c9b184'; c2.fillRect(8, 8, 24, 24); c2.fillStyle = 'rgba(120,90,50,.3)'; for (let i = 10; i < 30; i += 6) c2.fillRect(i, i, 2, 2); }
    else if (k === 'water') { c2.fillStyle = '#241a10'; c2.fillRect(6, 6, 28, 28); c2.fillStyle = '#2f6b8f'; c2.fillRect(8, 8, 24, 24); c2.fillStyle = '#1d3b52'; c2.fillRect(8, 22, 24, 10); c2.fillStyle = 'rgba(140,190,220,.7)'; c2.fillRect(12, 14, 6, 2); c2.fillRect(18, 12, 6, 2); }
    else drawSign(c2, k, 20, 20);
  });
}
export function openMap() {
  const ov = document.getElementById('mapov'); const cv = document.getElementById('mapcv');
  if (!ov || !cv || !cv.getContext) return;
  mapOff = { x: 0, y: 0 };
  drawMapCanvas();
  avviaPulsazione();          // senza questa riga l'alone sta fermo: scritta e mai chiamata
  const tt = document.getElementById('mp-title'); if (tt) tt.textContent = tr('Carta del mondo', 'Map of the world');
  /* LEGENDA RIPIEGATA: un biglietto chiuso col "?". Aperta spiega tutti i segni; chiusa lascia la
     carta a chi la sta leggendo (undici voci sempre in vista la facevano sembrare un modulo) */
  const lb = document.getElementById('mp-legbtn'), lgn = document.getElementById('mp-legend');
  if (lb && lgn) { lb.textContent = '? ' + tr('Legenda', 'Legend'); lb.onclick = () => { lgn.classList.toggle('open'); lb.classList.toggle('open'); }; }
  /* TORNA A CASA: il teletrasporto verso casa esisteva (tocco sul segno della casetta) ma nessuno lo
     scopriva. Un bottone sotto la carta lo dice e lo fa; da casa un portale riporta dove eri */
  const gh = document.getElementById('mp-gohome');
  if (gh) {
    gh.hidden = !S.home;
    gh.textContent = '🏠 ' + tr('Teletrasporto a casa', 'Teleport home');
    gh.title = tr('Poi un portale ti riporta qui', 'A portal brings you back here');
    gh.onclick = () => { closeMap(); goHome(); };
  }
  const lg = document.getElementById('mp-legend');
  if (lg) {
    /* NIENTE NOMI DI BIOMA in legenda. Erano sei voci su quattordici, cioè metà della legenda
       spesa a dire che il verde è prato: una cosa che si impara camminando, e che il tag della
       zona nell'HUD dice già mentre ci sei dentro. Restano i SIMBOLI, che invece non si possono
       indovinare: chi ha il Museo, dov'è una meraviglia, quale X è la tua. */
    lg.innerHTML = legendItem('me', tr('sei qui', 'you are here')) + legendItem('home', tr('casa tua · toccala per andarci', 'your home · tap to go there'))
      + legendItem('museum', tr('città col Museo', 'city with Museum')) + legendItem('town', tr('paese', 'town'))
      + legendItem('village', tr('borgo', 'hamlet')) + legendItem('wonder', tr('meraviglia', 'wonder'))
      + legendItem('arch', tr('arco (viaggio)', 'arch (travel)')) + legendItem('site', tr('ossa da scavare', 'bones to dig'))
      + legendItem('x', tr('X del tesoro', 'treasure X')) + legendItem('water', tr('acqua', 'water'))
      + legendItem('fog', tr('da esplorare', 'unexplored'))
      + `<span class="mp-tip">${tr('Tocca un segno per sapere cos\'è.', 'Tap a sign to see what it is.')}</span>`;
    paintLegend(lg);
  }
  ov.classList.add('on'); mapOpenFlag = true; setPrompt(null);
  const x = document.getElementById('mp-close'); if (x) x.onclick = () => closeMap();
  const bi = document.getElementById('mp-in'); if (bi) bi.onclick = () => mapZoomBy(1);
  const bo = document.getElementById('mp-out'); if (bo) bo.onclick = () => mapZoomBy(-1);
  const bh = document.getElementById('mp-home'); if (bh) bh.onclick = () => mapReset();
  if (!ov._wired) { ov._wired = true; ov.addEventListener('click', e => { if (e.target === ov) closeMap(); }); }
  if (!cv._wired) {
    cv._wired = true;
    /* rotella del mouse = zoom */
    cv.addEventListener('wheel', e => { e.preventDefault(); mapZoomBy(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    /* trascinamento col dito/mouse = scorri la mappa */
    let drag = null;
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ok */ } });
    cv.addEventListener('pointermove', e => {
      if (!drag) return;
      const k = cv.clientWidth / cv.width;                       // px schermo → px canvas
      mapOff.x -= (e.clientX - drag.x) / (k * mapZoom * RES);
      mapOff.y -= (e.clientY - drag.y) / (k * mapZoom * RES);
      drag = { x: e.clientX, y: e.clientY }; drawMapCanvas();
    });
    const endD = () => { drag = null; };
    cv.addEventListener('pointerup', endD); cv.addEventListener('pointercancel', endD);
    /* CLICK su un punto di interesse: dice cos'è (e per le meraviglie apre la scheda) */
    cv.addEventListener('click', e => {
      const r2 = cv.getBoundingClientRect(), k = cv.width / r2.width;
      const mx = (e.clientX - r2.left) * k, my = (e.clientY - r2.top) * k;
      let best = null, bd = 1e9;
      for (const p2 of mapPins) { const d = Math.hypot(p2.x - mx, p2.y - my); if (d < p2.r && d < bd) { bd = d; best = p2; } }
      if (!best) return;
      if (best.kind === 'me') { toast('🧭 ' + tr('Sei qui', 'You are here')); return; }
      if (best.kind === 'town') {
        /* il Museo si dice a parole, non solo col colore: è il motivo per cui ci si torna */
        const mus = best.museum ? ' · ' + tr('col Museo', 'has a Museum') : '';
        toast('🏘️ ' + best.name + ' · ' + townSizeLabel(best.size) + mus + ' · ' + dirTo(best.tx, best.ty)); return;
      }
      if (best.kind === 'site') { toast('🦴 ' + tr('Ossa che affiorano', 'Bones showing') + ' · ' + tr('scavi rimasti: ', 'digs left: ') + best.left + ' · ' + dirTo(best.tx, best.ty)); return; }
      if (best.kind === 'map') { toast('🗺️ ' + tr('X del tesoro ', 'Treasure X ') + rarLabel(best.rar) + ' · ' + dirTo(best.tx, best.ty)); return; }
      if (best.kind === 'home') { closeMap(); goHome(); return; }
      if (best.kind === 'wonder') { closeMap(); openWonderBook(best.type); }
    });
    /* PINCH su mobile: due dita che si allontanano = zoom avanti */
    const pts = new Map(); let pd0 = 0;
    cv.addEventListener('pointerdown', e => { pts.set(e.pointerId, e); if (pts.size === 2) { drag = null; pd0 = pinchDist(pts); } });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e);
      if (pts.size === 2) {
        const d = pinchDist(pts);
        if (pd0 && Math.abs(d - pd0) > 42) { mapZoomBy(d > pd0 ? 1 : -1); pd0 = d; }
      }
    });
    const drop = e => { pts.delete(e.pointerId); if (pts.size < 2) pd0 = 0; };
    cv.addEventListener('pointerup', drop); cv.addEventListener('pointercancel', drop);
  }
}
function pinchDist(pts) { const [a, b] = [...pts.values()]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
/* rivelazione da meraviglia: mostra quanto mondo si è aperto */
export function revealMap(tx, ty, radius) {
  const n = revealArea(tx, ty, radius);
  playSfx('found');
  showBanner('🗺️ ' + tr('MAPPA RIVELATA', 'MAP REVEALED') + '<br><span style="font-size:.8em">' + (n * 64).toLocaleString() + tr(' caselle in più', ' more tiles') + '</span>');
  setTimeout(() => openMap(), 600);
}
