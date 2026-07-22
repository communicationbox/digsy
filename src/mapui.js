/* MAPPA DEL MONDO — pergamena 8-bit che si scopre camminando: zoom con rotella, pinch o i
   tasti +/−, trascinamento, e i punti d'interesse si toccano per sapere cosa sono.
   Estratta da ui.js perché è una schermata a sé, con uno stato proprio (zoom, centro,
   trascinamento) che non c'entra con il resto dell'interfaccia. */
import { S, P, save } from './state.js';
import { FOOT_DY } from './body.js';
import { TS } from './data.js';
import { CH, isExplored, exploredTiles, revealArea } from './map.js';
import { townForCell, TCELL, landmarkForCell, LCELL, townInfo, townForTile, baseTerrain, hasMuseum } from './world.js';
import { wonderName, isDiscovered, WONDERS } from './wonders.js';
import { withIcons } from './icons.js';
import { tr } from './i18n.js';
import { playSfx } from './audio.js';
import { toast, setPromptFromMap as setPrompt, showBanner, openWonderBook } from './ui.js';
import { dirTo } from './gameplay.js';
import { rarLabel, townSizeLabel } from './i18n.js';

let mapOpenFlag = false;
export function isMapOpen() { return mapOpenFlag; }
export function closeMap() {
  mapOpenFlag = false;
  const o = document.getElementById('mapov'); if (o && o.classList) o.classList.remove('on');
}

/* ---------- MAPPA: pergamena che si scopre camminando. Zoom con rotella / pinch / +− e
   trascinamento col dito. Lo zoom è in PIXEL PER TILE (interi: la pixel-art non si sfoca). ---------- */
const MAP_TERR = ['#1d3b52', '#2f6b8f', '#d8c58a', '#5fa04e', '#2f6b3a', '#a9784a', '#8a8378', '#c9bda0', '#7fc46a', '#b09a72'];
/* zoom < 1 = zoom OUT (vista d'insieme): non si disegna mezza tile (sfocherebbe), si CAMPIONA —
   1 pixel ogni N tile (N intero). Così la pixel-art resta netta anche vedendo mezzo continente. */
const MAP_ZOOMS = [0.25, 0.5, 1, 2, 3, 4, 6]; // px per tile (sotto 1 = campionamento in zoom out)
let mapPins = [];                         // punti cliccabili disegnati sull'ultima mappa
let mapZoom = 1, mapOff = { x: 0, y: 0 }; // offset in tile rispetto al player
export function mapZoomBy(d) {
  const i = Math.max(0, Math.min(MAP_ZOOMS.length - 1, MAP_ZOOMS.indexOf(mapZoom) + d));
  if (MAP_ZOOMS[i] === mapZoom) return;
  mapZoom = MAP_ZOOMS[i]; drawMapCanvas();
}
export function mapReset() { mapZoom = 1; mapOff = { x: 0, y: 0 }; drawMapCanvas(); }
function drawMapCanvas() {
  const cv = document.getElementById('mapcv'); if (!cv || !cv.getContext) return;
  /* zoom ≥ 1: `cell` px per tile (1 tile per cella). zoom < 1: 1px per cella ma OGNI cella copre
     `step` tile (campionamento). `SC` = px per TILE su schermo (≈ mapZoom), usato dai pin. */
  const step = mapZoom >= 1 ? 1 : Math.max(2, Math.round(1 / mapZoom));
  const cell = mapZoom >= 1 ? mapZoom : 1;
  const SC = cell / step;
  const cellsW = Math.round(560 / cell), cellsH = Math.round(360 / cell);
  const VWt = cellsW * step, VHt = cellsH * step;                               // tile inquadrate
  cv.width = cellsW * cell; cv.height = cellsH * cell;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const px0 = Math.floor(P.x / TS) + Math.round(mapOff.x), py0 = Math.floor((P.y + FOOT_DY) / TS) + Math.round(mapOff.y);
  const x0 = px0 - (VWt >> 1), y0 = py0 - (VHt >> 1);
  c.fillStyle = '#c9b184'; c.fillRect(0, 0, cv.width, cv.height);               // carta non esplorata
  for (let cyi = 0; cyi < cellsH; cyi++) for (let cxi = 0; cxi < cellsW; cxi++) {
    const tx = x0 + cxi * step, ty = y0 + cyi * step;                           // tile campionata della cella
    if (!isExplored(tx, ty)) continue;
    const ti = townInfo(tx, ty);
    c.fillStyle = ti ? (ti.solid ? '#e8c34a' : '#d9cba8') : MAP_TERR[baseTerrain(tx, ty)] || '#555';
    c.fillRect(cxi * cell, cyi * cell, cell, cell);
  }
  mapPins = [];                                   // per il click: cosa c'è in quel punto
  const mark = (tx, ty, col, big, info) => {
    const x = (tx - x0) * SC, y = (ty - y0) * SC, r = Math.max(2, SC + (big ? 2 : 0));
    if (x < -8 || y < -8 || x > cv.width + 8 || y > cv.height + 8) return;
    c.fillStyle = '#241a10'; c.fillRect(x - r - 1, y - r - 1, r * 2 + 3, r * 2 + 3);
    c.fillStyle = col; c.fillRect(x - r, y - r, r * 2 + 1, r * 2 + 1);
    if (info) mapPins.push({ x, y, r: r + 4, ...info });
  };
  const cellR = Math.ceil(Math.max(VWt, VHt) / LCELL) + 1;
  for (let cy = -cellR; cy <= cellR; cy++) for (let cx = -cellR; cx <= cellR; cx++) {
    const lm = landmarkForCell(Math.floor(px0 / LCELL) + cx, Math.floor(py0 / LCELL) + cy);
    if (!lm || !isDiscovered(lm.type) || !isExplored(lm.x, lm.y)) continue;
    mark(lm.x, lm.y, ['bonearch', 'redarch'].includes(lm.type) ? '#57e0d0' : '#c79bff', true,
      { kind: 'wonder', type: lm.type, tx: lm.x, ty: lm.y });
  }
  for (const m of S.maps || []) mark(m.x, m.y, '#e4573d', false, { kind: 'map', rar: m.rar, tx: m.x, ty: m.y });
  /* le CITTÀ esplorate: un pin con il nome.
     Il MUSEO è l'unico posto dove si fanno identificare i reperti, si riempiono le teche e si
     comprano le fialette di DNA — cioè il motivo per cui si torna in città. Ma ce l'hanno solo
     le città grandi, e sulla mappa erano un puntino giallo identico a quello di un borgo: per
     sapere dove tornare bisognava andarci. Qui prendono un pin loro: avorio come il marmo, col
     FRONTONE del tempio sopra. Si riconosce anche a due pixel, e senza leggere il nome. */
  const museumPin = (tx, ty) => {
    const x = (tx - x0) * SC, y = (ty - y0) * SC, r = Math.max(2, SC + 2);
    if (x < -8 || y < -8 || x > cv.width + 8 || y > cv.height + 8) return;
    const w = r * 2 + 1, top = y - r - 1;
    /* timpano BASSO e LARGO: alto come un tetto, non come una torre — altrimenti a zoom 1
       il pin sembra un lampione invece che un tempio */
    const hh = Math.max(2, Math.round(r * 0.8)), hw = r + 2;
    c.fillStyle = '#241a10';
    c.beginPath(); c.moveTo(x - hw - 1, top); c.lineTo(x, top - hh - 1); c.lineTo(x + hw + 1, top); c.closePath(); c.fill();
    c.fillStyle = '#efe8d6';
    c.beginPath(); c.moveTo(x - hw, top - 1); c.lineTo(x, top - hh); c.lineTo(x + hw, top - 1); c.closePath(); c.fill();
    /* colonne: due tacche scure sul corpo del pin, così non è un quadrato liscio */
    c.fillStyle = '#8d7f61';
    c.fillRect(Math.round(x - r + 1), y - r + 1, 1, w - 2);
    c.fillRect(Math.round(x + r - 1), y - r + 1, 1, w - 2);
  };
  { const seen = new Set(), cstep = Math.max(1, Math.round(6 / step));   // campiona ~ogni 6 tile a ogni zoom
    for (let cyi = 0; cyi < cellsH; cyi += cstep) for (let cxi = 0; cxi < cellsW; cxi += cstep) {
      const tx = x0 + cxi * step, ty = y0 + cyi * step;
      if (!isExplored(tx, ty)) continue;
      const tw = townForTile(tx, ty); if (!tw || seen.has(tw.key)) continue;
      seen.add(tw.key);
      const museum = hasMuseum(tw);
      mark(tw.C.x, tw.C.y, museum ? '#efe8d6' : '#e8c34a', true,
        { kind: 'town', name: tw.name, size: tw.size, museum, tx: tw.C.x, ty: tw.C.y });
      if (museum) museumPin(tw.C.x, tw.C.y);
    } }
  mark(Math.floor(P.x / TS), Math.floor((P.y + FOOT_DY) / TS), '#ffffff', true, { kind: 'me' }); // dove sei
  const sub = document.getElementById('mp-sub');
  if (sub) sub.textContent = 'zoom ×' + mapZoom + ' · ' + tr('esplorato ', 'explored ') + exploredTiles().toLocaleString() +
    ' · ' + tr('meraviglie ', 'wonders ') + (S.wonders || []).length + '/' + Object.keys(WONDERS).length;
}
export function openMap() {
  const ov = document.getElementById('mapov'); const cv = document.getElementById('mapcv');
  if (!ov || !cv || !cv.getContext) return;
  mapOff = { x: 0, y: 0 };
  drawMapCanvas();
  const tt = document.getElementById('mp-title'); if (tt) tt.textContent = tr('MAPPA DEL MONDO', 'WORLD MAP');
  const lg = document.getElementById('mp-legend');
  if (lg) lg.innerHTML = withIcons(`<span><i style="background:#e8c34a"></i>${tr('paese', 'town')}</span><span><i style="background:#efe8d6;clip-path:polygon(50% 0,100% 45%,100% 100%,0 100%,0 45%)"></i>${tr('museo', 'museum')}</span><span><i style="background:#c79bff"></i>${tr('meraviglia', 'wonder')}</span><span><i style="background:#57e0d0"></i>${tr('arco (viaggio)', 'arch (travel)')}</span><span><i style="background:#e4573d"></i>${tr('X del tesoro', 'treasure X')}</span><span><i style="background:#fff"></i>${tr('sei qui', 'you are here')}</span><span><i style="background:#c9b184"></i>${tr('da esplorare', 'unexplored')}</span>`);
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
      mapOff.x -= (e.clientX - drag.x) / (k * mapZoom);
      mapOff.y -= (e.clientY - drag.y) / (k * mapZoom);
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
      if (best.kind === 'map') { toast('🗺️ ' + tr('X del tesoro ', 'Treasure X ') + rarLabel(best.rar) + ' · ' + dirTo(best.tx, best.ty)); return; }
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
