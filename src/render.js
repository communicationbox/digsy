/* Rendering: tile, decorazioni, edifici, parco, eroe, indicatore bussola */
import { TS, spColor, spById } from './data.js';
import { FOOT_DY } from './body.js';
import { partParams, composedPartsVox, buildFleshVoxels, clampSpec, BP } from './bones.js';
import { ctx, view } from './screen.js';
import { snap, px, rect, shadow, shade8, BRUSH } from './brush.js';
export { BRUSH };
import { S, P, cam, dugSet } from './state.js';
import { DEEP, WATER, SAND, GRASS, FOREST, DIRT, MTN, FLOOR, PARK, ROAD, baseTerrain, diggable, decoAt, pickupAt, townInfo, townForTile, siteAt, wreckAt, caveEntranceAt, landmarkAt, harvestDecoAt } from './world.js';
import { CAVE, caveSolid, caveNodeAt, caveNodeDone, caveNodeReach, caveCam, CAVE_FOOT } from './cave.js';
import { COMP, companionDrawObj, companionAbility } from './companion.js';
import { weatherAt, weatherStep } from './weather.js';
import { siteRemaining, onBoat, footGear, waterTile } from './gameplay.js';
import { SEED, vhash } from './noise.js';
import { drawHero } from './sprites.js';
import { parks, visParks } from './park.js';
import { compass, playerInTown, octant } from './compass.js';
import { INT, NPCS, pedList, roomOrigin, ROOM_W, ROOM_H, GAL_DESK, MENTOR, CUT } from './interior.js';
import { zonePools, ZONES, MUSEUM_ZONES } from './data.js';
import { zoneName } from './i18n.js';
import { drawWonder } from './wonderart.js';
import { hasSprite, drawSprite, spriteDef } from './spritebank.js';
import { applyLook } from './sprites.js';
import { darknessAt, seasonOf, SEASON_LEN } from './daynight.js';
import { zoneAt, zoneIdxAt } from './regions.js';
import { goal as goalMark } from './tapmove.js';
import { pref as prefOf } from './prefs.js';
import { drawSayBalloon, drawTree, drawBoulder, drawFlower, drawShell, drawHole, drawPickup, glint, drawCactus, drawBonespire, drawDeadtree, drawMushroom, drawStump, drawRedspire, drawOrecrystal, drawReed, drawIcecrystal, drawHay } from './props.js';
import { drawInteriorScene } from './interiors.js';
import { groundTile, soilDetail, seaTile, seaTree, zoneTree, updateSeasonPalette, ZONE_TILES, BIOME_BUILD, biomeBuild, INT_WOOD, night, setNight, season, setSeason } from './tiles.js';

/* stato del frame: oscurità (0..1) e stagione corrente, letti dalle funzioni di disegno */

/* ---------- helper pixel ---------- */
/* aggancia una coordinata interna alla griglia dei pixel FISICI (multipli di 1/K):
   niente Math.round intero → niente oscillazione ±1px quando W/H sono dispari */

/* ---------- edifici / parco ---------- */
const roofCol = {
  store: ['#d8973c', '#a86e22'], lab: ['#5a86c8', '#3d5f97'], museum: ['#c98a5a', '#9c6636'],
  inn: ['#c65a54', '#9a3f3a'], barber: ['#8d7ba0', '#655a80'], tailor: ['#e08aa8', '#a85f7d'],
};
/* icona 5x5 dentro l'insegna: riconoscibilità immediata del tipo di edificio */
function drawSignIcon(type, cx, y) {
  switch (type) {
    case 'store': // moneta
      rect(cx - 1, y + 1, 3, 3, '#e8c34a'); px(cx - 2, y + 2, '#e8c34a'); px(cx + 2, y + 2, '#e8c34a'); px(cx, y + 2, '#a8842a'); break;
    case 'lab': // fiala
      rect(cx, y, 1, 2, '#cfe8f2'); rect(cx - 1, y + 2, 3, 2, '#5a86c8'); px(cx, y + 3, '#8fd0e6'); break;
    case 'museum': // osso
      px(cx - 2, y + 1, '#f3ecda'); px(cx - 2, y + 3, '#f3ecda'); px(cx + 2, y + 1, '#f3ecda'); px(cx + 2, y + 3, '#f3ecda');
      rect(cx - 2, y + 2, 5, 1, '#f3ecda'); break;
    case 'inn': // mezzaluna
      rect(cx - 1, y, 3, 4, '#f2dd7a'); rect(cx + 1, y, 2, 4, '#d9b98a'); px(cx - 1, y, '#d9b98a'); px(cx - 1, y + 3, '#d9b98a'); break;
    case 'barber': // palo rosso/bianco
      rect(cx - 1, y, 1, 5, '#e05a5a'); rect(cx, y, 1, 5, '#f3ecda'); rect(cx + 1, y, 1, 5, '#e05a5a'); break;
    case 'tailor': // maglietta
      rect(cx - 2, y + 1, 5, 1, '#e08aa8'); rect(cx - 1, y + 2, 3, 3, '#e08aa8'); px(cx - 2, y + 2, '#c06a88'); px(cx + 2, y + 2, '#c06a88'); break;
  }
}
function drawSign(type, cx, y) {
  px(cx, y - 1, '#5c4229'); // gancio
  rect(cx - 5, y, 11, 7, '#8a5f38'); rect(cx - 4, y + 1, 9, 5, '#d9b98a');
  drawSignIcon(type, cx, y + 1);
}
/* Edifici RICONOSCIBILI a colpo d'occhio: ogni mestiere ha la sua sagoma */
export function drawBuilding(b, sx, sy) {
  const w = (b.x1 - b.x0 + 1) * TS, h = (b.y1 - b.y0 + 1) * TS; // il museo è 5 tile largo
  const BB = biomeBuild(b.x0, b.y0);   // materiali del bioma (tetto, zoccolo, neve)
  const bv = vhash(b.x0, b.y0, 77), bw = vhash(b.x0, b.y0, 78), bc = vhash(b.x0, b.y0, 79);
  shadow(sx + w / 2, sy + h + 2, Math.floor(w / 2) - 2);
  const glass = night() > 0.4 ? '#ffdf8a' : '#8fd0e6';
  const snowCap = () => { if (!BB.snow) return; rect(sx, sy + 1, w, 2, '#eef7fa'); for (let i = 0; i < w; i += 5) px(sx + i + 2, sy + 3, '#dfeef2'); };
  const dcx = sx + w / 2;
  const door = (col1, col2) => { rect(dcx - 5, sy + h - 12, 10, 12, col1 || '#7a5a3a'); rect(dcx - 3, sy + h - 10, 6, 10, col2 || '#5c4229'); px(dcx + 1, sy + h - 6, '#d9b98a'); };

  if (b.type === 'museum') { /* TEMPIO: frontone triangolare + colonne elleniche */
    rect(sx + 1, sy + 12, w - 2, h - 10, '#e8e2d0'); rect(sx + 1, sy + h - 2, w - 2, 2, '#c4baa2');
    ctx.fillStyle = '#d9d0bb'; ctx.beginPath(); ctx.moveTo(sx - 2, sy + 12); ctx.lineTo(sx + w / 2, sy - 6); ctx.lineTo(sx + w + 2, sy + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#efe8d6'; ctx.beginPath(); ctx.moveTo(sx + 3, sy + 11); ctx.lineTo(sx + w / 2, sy - 3); ctx.lineTo(sx + w - 3, sy + 11); ctx.closePath(); ctx.fill();
    rect(sx - 2, sy + 11, w + 4, 3, '#c9a227'); // architrave dorato
    px(dcx - 1, sy + 3, '#8a7118'); px(dcx, sy + 3, '#8a7118'); px(dcx - 1, sy + 4, '#8a7118'); px(dcx, sy + 4, '#8a7118'); // osso nel timpano
    for (let i = 0; i < 6; i++) { // 6 colonne scanalate distribuite sulla facciata
      const cx2 = sx + 5 + Math.round(i * (w - 14) / 5);
      if (Math.abs(cx2 + 2 - (sx + w / 2)) < 8) continue; // varco del portale
      rect(cx2, sy + 14, 4, h - 14, '#efe8d6'); rect(cx2 + 1, sy + 14, 1, h - 14, '#cbbfa4');
      rect(cx2 - 1, sy + 13, 6, 2, '#d9d0bb'); rect(cx2 - 1, sy + h - 3, 6, 3, '#c4baa2');
    }
    rect(sx + 4, sy + h - 1, w - 8, 1, '#b8ac90'); // gradino
    rect(dcx - 5, sy + h - 12, 10, 12, '#3a3a44'); rect(dcx - 3, sy + h - 10, 6, 10, '#23232c'); // portale scuro
  } else if (b.type === 'store') { /* NEGOZIO: pareti VERDE SALVIA (staccano dal pavimento) + tenda a strisce */
    rect(sx + 2, sy + 8, w - 4, h - 6, '#7fa06a'); rect(sx + 2, sy + 8, w - 4, 2, '#93b47c'); rect(sx + 2, sy + h - 2, w - 4, 2, '#5f7d4c');
    rect(sx, sy + 2, w, 7, BB.roof); rect(sx, sy + 2, w, 2, BB.roof2);
    for (let i = 0; i < w; i += 8) { rect(sx + i, sy + 9, 4, 6, '#c65a54'); rect(sx + i + 4, sy + 9, 4, 6, '#f1e6cc'); px(sx + i + 1, sy + 15, '#a3494e'); px(sx + i + 5, sy + 15, '#cdbd97'); } // tenda
    rect(sx + 5, sy + 18, 9, 8, glass); rect(sx + 5, sy + 18, 9, 1, '#efe6cf'); rect(sx + 5, sy + 25, 9, 1, '#cdbd97'); // vetrina
    rect(sx + 6, sy + 22, 3, 3, '#b98d59'); rect(sx + 10, sy + 21, 3, 4, '#8a5f38'); // merci esposte
    rect(sx + w - 12, sy + h - 7, 7, 7, '#b98d59'); rect(sx + w - 12, sy + h - 7, 7, 2, '#d9b98a'); px(sx + w - 10, sy + h - 4, '#6e4a2e'); // cassa fuori
    snowCap(); door();
  } else if (b.type === 'inn') { /* LOCANDA: pareti MATTONE CALDO a due piani (staccano dal pavimento) */
    rect(sx + 2, sy - 2, w - 4, h + 2, '#c07a52'); rect(sx + 2, sy - 2, w - 4, 2, '#d0906a'); rect(sx + 2, sy + 10, w - 4, 2, '#7a4526'); // marcapiano
    rect(sx, sy - 8, w, 8, BB.roof); rect(sx, sy - 8, w, 2, BB.roof2); rect(sx - 1, sy - 1, w + 2, 2, shade8(BB.roof, 0.75)); // tetto alto
    rect(sx + 6, sy - 6, 4, 9, '#9a8874'); rect(sx + 6, sy - 6, 4, 2, '#7f6f5e'); // camino
    px(sx + 7, sy - 8 - (Math.floor(bv * 2)), '#cfcabf'); px(sx + 8, sy - 10, '#dcd8cf');
    for (const wx of [sx + 6, sx + w / 2 - 2, sx + w - 11]) { rect(wx, sy + 2, 5, 5, glass); rect(wx, sy + 6, 5, 1, '#cdbd97'); } // finestre piano alto
    rect(sx + 6, sy + 16, 5, 5, glass); rect(sx + w - 11, sy + 16, 5, 5, glass);
    rect(sx + w - 7, sy + 13, 2, 2, '#e8c34a'); px(sx + w - 6, sy + 12, '#8a5f38'); // lanterna
    door('#6e4a2e', '#4c3018');
  } else if (b.type === 'barber') { /* BARBIERE: palo a spirale + tenda blu */
    rect(sx + 2, sy + 8, w - 4, h - 6, '#eef4f6'); rect(sx + 2, sy + h - 2, w - 4, 2, '#b7c8cf');
    rect(sx, sy + 2, w, 8, '#5a86c8'); rect(sx, sy + 2, w, 2, '#7aa2dc'); rect(sx - 1, sy + 9, w + 2, 2, '#41639a');
    for (let i = 2; i < w - 2; i += 6) rect(sx + i, sy + 10, 3, 4, '#e8f2f5'); // frangia tenda
    rect(sx + 5, sy + 16, 7, 7, glass); rect(sx + 5, sy + 19, 7, 1, '#b7c8cf');
    /* palo del barbiere accanto alla porta */
    rect(dcx + 8, sy + h - 14, 3, 14, '#d9d0bb'); rect(dcx + 7, sy + h - 15, 5, 2, '#8fb0bd');
    for (let i = 0; i < 5; i++) { const yy = sy + h - 13 + i * 2; rect(dcx + 8, yy, 3, 1, i % 2 ? '#c65a54' : '#5a86c8'); }
    door('#5b7e99', '#3d5a72');
  } else if (b.type === 'tailor') { /* SARTORIA: vetrina col manichino + rullo di stoffa */
    rect(sx + 2, sy + 8, w - 4, h - 6, '#f2e4ea'); rect(sx + 2, sy + h - 2, w - 4, 2, '#cfb4c0');
    rect(sx, sy + 2, w, 8, '#b06a8c'); rect(sx, sy + 2, w, 2, '#c887a4'); rect(sx - 1, sy + 9, w + 2, 2, '#8c4e6c');
    rect(sx + 4, sy + 14, 11, 12, glass); rect(sx + 4, sy + 14, 11, 1, '#efe6cf'); rect(sx + 4, sy + 25, 11, 1, '#cfb4c0'); // vetrina grande
    rect(sx + 8, sy + 17, 3, 5, '#e08aa8'); px(sx + 9, sy + 16, '#f3cfa0'); rect(sx + 7, sy + 22, 5, 2, '#8a5f38'); // manichino vestito
    rect(sx + w - 10, sy + h - 8, 4, 8, '#8fd0a0'); rect(sx + w - 9, sy + h - 8, 1, 8, '#6faa80'); // rullo di stoffa
    door('#8c5a74', '#6a4056');
  } else { /* LABORATORIO: torretta con alambicco e fumo verde */
    rect(sx + 2, sy + 10, w - 4, h - 8, '#e0e4d4'); rect(sx + 2, sy + h - 2, w - 4, 2, '#b9c0a8');
    rect(sx, sy + 4, w, 8, '#5f7a52'); rect(sx, sy + 4, w, 2, '#78966a'); rect(sx - 1, sy + 11, w + 2, 2, '#485e3e');
    rect(sx + w - 14, sy - 6, 9, 12, '#9a9285'); rect(sx + w - 14, sy - 6, 9, 2, '#aaa294'); // torretta
    rect(sx + w - 12, sy - 3, 5, 5, glass); px(sx + w - 10, sy - 9, '#8fd0a0'); px(sx + w - 9, sy - 11, '#b2e4be'); // oblò + fumo verde
    rect(sx + 6, sy + 16, 5, 5, glass); rect(sx + 6, sy + 19, 5, 1, '#b9c0a8');
    rect(sx + w - 11, sy + 16, 5, 5, glass);
    door('#5f7a52', '#3f5434');
  }
  // insegna appesa sopra la porta (comunque utile da lontano)
  drawSign(b.type, dcx, sy + 12);
}
/* ---------- arredo urbano ---------- */
export function drawFountain(sx, sy, time) {
  shadow(sx + 16, sy + 31, 13);
  rect(sx + 2, sy + 10, 28, 20, '#aaa294');            // bordo esterno
  rect(sx + 3, sy + 11, 26, 18, '#9a9285');
  rect(sx + 5, sy + 13, 22, 14, '#4d8fb5');            // acqua
  rect(sx + 5, sy + 13, 22, 2, '#5cb6d6');
  const ph = Math.floor(time / 220);                   // riflessi che scorrono
  for (let i = 0; i < 3; i++) {
    rect(sx + 6 + ((ph + i * 3) % 9) * 2, sy + 16 + i * 4, 4, 1, '#83cfe6');
    px(sx + 8 + ((ph * 2 + i * 5) % 14), sy + 18 + i * 3, '#bfe9f4');
  }
  rect(sx + 12, sy + 15, 8, 3, '#9a9285');             // base colonna
  rect(sx + 14, sy + 6, 4, 10, '#aaa294'); rect(sx + 14, sy + 6, 4, 2, '#c9c2b4');
  const j = Math.floor(time / 160) % 4;                // zampilli e gocce
  px(sx + 15, sy + 3 - (j % 2), '#bfe9f4'); px(sx + 16, sy + 2 + (j % 2), '#e8f6fb');
  px(sx + 12 + (j & 1), sy + 6 + (j >> 1), '#bfe9f4'); px(sx + 19 - (j & 1), sy + 7 - (j >> 1), '#bfe9f4');
  px(sx + 10, sy + 9 + j, '#bfe9f4'); px(sx + 21, sy + 12 - j, '#bfe9f4');
}
export function drawBench(sx, sy) {
  shadow(sx + 8, sy + 14, 6);
  rect(sx + 2, sy + 4, 12, 2, '#c79a66'); px(sx + 2, sy + 4, '#a97a4c'); px(sx + 13, sy + 4, '#a97a4c'); // schienale
  rect(sx + 2, sy + 8, 12, 3, '#c79a66'); rect(sx + 2, sy + 8, 12, 1, '#dcb27e');                        // seduta
  rect(sx + 3, sy + 11, 2, 3, '#8a5f38'); rect(sx + 11, sy + 11, 2, 3, '#8a5f38');                       // gambe
}
export function drawBushDeco(sx, sy) {
  shadow(sx + 8, sy + 14, 6);
  rect(sx + 3, sy + 6, 10, 7, '#4a9a55'); rect(sx + 4, sy + 4, 8, 4, '#54ab5f');
  px(sx + 5, sy + 5, '#7cd07f'); px(sx + 9, sy + 4, '#7cd07f');
  px(sx + 6, sy + 9, '#e05a7a'); px(sx + 10, sy + 8, '#f2dd7a'); // bacche/fiori
  rect(sx + 3, sy + 12, 10, 1, '#2f6b3b');
}
export function drawLamp(sx, sy) {
  shadow(sx + 8, sy + 15, 4);
  rect(sx + 7, sy + 3, 2, 12, '#5a5248');                        // palo
  rect(sx + 5, sy, 6, 4, '#3f3a33'); rect(sx + 6, sy + 1, 4, 2, night() > 0.4 ? '#ffdf8a' : '#c9c2b4'); // lanterna
  if (night() > 0.4) { px(sx + 5, sy + 1, '#ffe9a0'); px(sx + 10, sy + 1, '#ffe9a0'); }
  rect(sx + 5, sy + 14, 6, 1, '#3f3a33');
}
/* affioramento d'ossa: cranio semisepolto + costole; scintilla se ha ancora scavi */
export function drawSite(sx, sy, remaining, time, tx, ty) {
  const ph = ((tx || 0) * 7 + (ty || 0) * 13); // fase STABILE per casella (mai sx: scatterebbe con la camera)
  shadow(sx + 8, sy + 14, 7);
  rect(sx + 2, sy + 9, 12, 5, '#c9a06a'); rect(sx + 3, sy + 8, 10, 2, '#d8b581'); // montarolo di terra
  const boneC = remaining > 0 ? '#ece5d2' : '#b8b0a2', boneD = remaining > 0 ? '#cbbfa4' : '#9a927f';
  for (let i = 0; i < 3; i++) { // costole ad arco
    const bx = sx + 4 + i * 3;
    px(bx, sy + 4 + i, boneC); px(bx + 1, sy + 3 + i, boneC); px(bx + 2, sy + 4 + i, boneD); px(bx, sy + 6 + i, boneD);
  }
  rect(sx + 10, sy + 7, 4, 3, boneC); px(sx + 11, sy + 8, '#3a3128'); px(sx + 13, sy + 8, '#3a3128'); // cranio
  if (remaining > 0) { // scintilla pulsante
    const a = (Math.sin(time / 300 + ph) + 1) / 2;
    if (a > 0.4) { px(sx + 2, sy + 2, '#fff6c8'); px(sx + 1, sy + 3, '#f6d95c'); px(sx + 3, sy + 3, '#f6d95c'); px(sx + 2, sy + 4, '#fff6c8'); }
  }
}
/* RELITTO in mare: scafo spezzato e albero pendente che affiorano dall'acqua (bob leggero) */
export function drawWreck(sx, sy, time, tx, ty) {
  const ph = ((tx || 0) * 7 + (ty || 0) * 13); // fase STABILE per casella (mai sx)
  const bob = Math.round(Math.sin(time / 500 + ph) * 1);
  const y = sy + bob;
  // scafo scuro inclinato
  rect(sx + 1, y + 6, 13, 5, '#4a382a'); rect(sx + 1, y + 6, 13, 1, '#6a5038');
  rect(sx + 2, y + 5, 11, 1, '#5c4630'); rect(sx + 1, y + 11, 13, 1, '#2f2418');
  for (let i = 0; i < 4; i++) px(sx + 3 + i * 3, y + 8, '#2f2418');            // fasciame (assi)
  // buco nello scafo
  rect(sx + 9, y + 8, 3, 3, '#20323f');
  // albero maestro pendente + vela strappata
  rect(sx + 4, y - 4, 1, 10, '#6a5038'); rect(sx + 4, y - 5, 1, 1, '#8a6a4a');
  rect(sx + 5, y - 3, 4, 4, '#c9bfa6'); px(sx + 7, y - 1, '#a89a78'); px(sx + 8, y, '#a89a78'); // vela lacera
  // increspature attorno
  ctx.fillStyle = 'rgba(200,235,245,.35)'; ctx.fillRect(sx - 1, y + 12, 4, 1); ctx.fillRect(sx + 12, y + 11, 4, 1);
}
function drawTownDeco(d, sx, sy, time) {
  if (d.type === 'fountain') drawFountain(sx, sy, time);
  else if (d.type === 'bench') drawBench(sx, sy);
  else if (d.type === 'lamp') drawLamp(sx, sy);
  else if (d.type === 'board') drawBoard(sx, sy, time);
  else drawBushDeco(sx, sy);
}
/* CARTELLO delle missioni: due pali + tabellone di legno con fogli e un pennino luccicante */
function drawBoard(sx, sy, time) {
  shadow(sx + 8, sy + 15, 6);
  rect(sx + 3, sy + 8, 2, 8, '#6e4a2a'); rect(sx + 11, sy + 8, 2, 8, '#6e4a2a');   // pali
  rect(sx + 1, sy + 1, 14, 9, '#8a5f38'); rect(sx + 1, sy + 1, 14, 1, '#a97a4c');   // tavola
  rect(sx + 2, sy + 2, 12, 7, '#c9a06a');                                            // fondo chiaro
  rect(sx + 3, sy + 3, 4, 5, '#f2ead8'); rect(sx + 9, sy + 3, 4, 4, '#f2ead8');      // fogli appesi
  rect(sx + 3, sy + 4, 4, 1, '#b8ad8c'); rect(sx + 3, sy + 6, 3, 1, '#b8ad8c'); rect(sx + 9, sy + 4, 4, 1, '#b8ad8c'); // righe di testo
  rect(sx + 1, sy, 14, 1, '#5c4229');                                                // cornice alta
  if (Math.floor(time / 400) % 3 === 0) { px(sx + 13, sy + 2, '#fff3b0'); px(sx + 14, sy + 1, '#fff8d0'); } // luccichio "novità"
}
/* glifo dell'ABILITÀ del compagno sopra la sua testa (sempre visibile → l'abilità è "attiva") */
function drawCompanionGlyph(ab, cx, cy, time) {
  if (!ab) return;
  const y = cy + (Math.sin(time / 300) < 0 ? -1 : 0);
  if (ab === 'sniff') { px(cx - 1, y, '#f6d95c'); px(cx + 1, y, '#f6d95c'); px(cx, y - 1, '#fff3b0'); px(cx, y + 1, '#e0a020'); }
  else if (ab === 'compass') { px(cx, y - 1, '#e4573d'); px(cx, y, '#c9cdd8'); px(cx, y + 1, '#c9cdd8'); }
  else { px(cx, y - 1, '#fff3b0'); px(cx - 1, y, '#f6d95c'); px(cx + 1, y, '#f6d95c'); px(cx, y + 1, '#fff3b0'); px(cx, y, '#fffbe0'); }
}
/* MERAVIGLIE: il disegno vive in wonderart.js (modulo puro) così si può guardare e
   rifinire anche fuori dal gioco, nella pagina /wonders. */
function drawLandmark(type, sx, sy, time) {
  /* ANCORATE alla griglia dei pixel fisici: senza snap, mentre il player cammina la camera
     scorre di frazioni di pixel e tutta la struttura VIBRA (sembra che l'animazione corra
     con te). Le fasi delle animazioni vengono SOLO dal tempo, mai dalle coordinate. */
  const x = snap(sx), y = snap(sy);
  /* il disegno rifinito a mano lo sceglie drawWonder stessa: così vale anche nel Libro e
     nelle pagine di prova, non solo qui */
  drawWonder(BRUSH, type, x, y, time);
}
export function drawFence(sx, sy) {
  rect(sx, sy + 7, TS, 2, '#a97a4c'); rect(sx, sy + 11, TS, 2, '#8a5f38');
  rect(sx + 2, sy + 3, 2, 11, '#8a5f38'); px(sx + 2, sy + 3, '#c79a66'); px(sx + 3, sy + 3, '#c79a66');
  rect(sx + 11, sy + 3, 2, 11, '#8a5f38'); px(sx + 11, sy + 3, '#c79a66'); px(sx + 12, sy + 3, '#c79a66');
}
/* chimera del parco: forma guidata dai parametri delle specie (taglia, becco/corni, ali, coda, serpente) */
/* creatura del parco = proiezione laterale dello STESSO modello voxel VIVO (come libro/museo),
   con CONTORNO scuro così stacca dallo sfondo (anche verde su verde). Cache per composizione. */
let sniffAt = -9e9, sniffKey = '', sniffBest = null;   // memoria del "fiuto" (vedi sopra)
const creCache = new Map();
function creatureSprite(a) {
  const key = a.c.skull + '|' + a.c.torso + '|' + a.c.leg;
  let cv = creCache.get(key); if (cv !== undefined) return cv;
  cv = null;
  try {
    const c = spById[a.c.skull], t = spById[a.c.torso], z = spById[a.c.leg];
    const spec = { heads: [{ sp: c, horns: partParams(c).horns }], chest: t, arms: [z, z], legs: [z, z], tails: [t] };
    const vox = buildFleshVoxels(clampSpec(spec));
    let mnx = 9e9, mxx = -9e9, mny = 9e9, mxy = -9e9, mnz = 9e9, mxz = -9e9;
    for (const v of vox) { mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x); mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y); mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z); }
    const spanX = mxx - mnx + 1, spanY = mxy - mny + 1, zr = Math.max(1, mxz - mnz);
    const pad = 1, cw = spanX + pad * 2, ch = spanY + pad * 2;
    cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d');
    const grid = {}; // occupazione per il contorno
    const cells = [];
    for (const v of vox.slice().sort((x, y) => x.z - y.z)) {
      const gx = pad + (v.x - mnx), gy = pad + (mxy - v.y);
      const zt = (v.z - mnz) / zr;
      let col = v.k === 'eye' ? '#201a14' : (v.col || '#c8b078');
      if (v.col) col = zt < 0.34 ? shade8(v.col, 0.7) : zt < 0.67 ? v.col : shade8(v.col, 1.18);
      grid[gx + ',' + gy] = 1; cells.push([gx, gy, col]);
    }
    /* contorno scuro attorno alla silhouette */
    g.fillStyle = '#20160f';
    for (const k in grid) { const [gx, gy] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = (gx + dx) + ',' + (gy + dy); if (!grid[nk]) g.fillRect(gx + dx, gy + dy, 1, 1); } }
    for (const [gx, gy, col] of cells) { g.fillStyle = col; g.fillRect(gx, gy, 1, 1); }
    cv._ax = spanX / 2 + pad; // ancoraggio orizzontale (centro)
  } catch (e) { cv = null; /* stub nei test */ }
  creCache.set(key, cv); return cv;
}
/* archetipo di movimento dalla specie delle ZAMPE (locomozione): vola/striscia/saltella/cammina */
function creatureArch(a) {
  const bp = BP[a.c.leg] || BP[a.c.torso] || {};
  if (bp.wings) return 'fly';
  if ((bp.legs && bp.legs[0] === 0) || bp.wave || bp.float) return 'snake';
  if (bp.tall || (bp.legs && bp.legs[0] <= 2)) return 'hop';
  return 'walk';
}
function drawCreature(a, sx, sy, swim) {
  const cv = creatureSprite(a);
  const arch = creatureArch(a);
  const ph = (a.anim || 0) * 7;              // fase (avanza col movimento)
  const idle = frameTime / 600;
  let hop = 0, sqX = 1, sqY = 1, skew = 0, lift = 0, sh = 5;
  if (arch === 'fly') {                       // VOLA: fluttua sempre, ali che sbattono (scaleY pulsante veloce)
    lift = 6 + Math.round(Math.sin(idle * 3) * 2);
    sqY = 1 + Math.sin(frameTime / 90) * 0.10; sqX = 1 - Math.sin(frameTime / 90) * 0.06;
    sh = 4;
  } else if (arch === 'snake') {              // STRISCIA: ondeggia orizzontale, quasi niente saltello
    skew = Math.sin(ph) * 0.22; sqY = 1 + Math.sin(idle * 2) * 0.03; hop = 0; sh = 6;
  } else if (arch === 'hop') {                // SALTELLA: salto ampio + schiacciata all'atterraggio
    const s = Math.abs(Math.sin(ph)); hop = -Math.round(s * 4); sqY = 1 - (1 - s) * 0.14; sqX = 1 + (1 - s) * 0.10;
    sh = Math.max(3, Math.round(6 - s * 3));
  } else {                                    // CAMMINA: trotto morbido + respiro
    const step = Math.sin(ph); hop = Math.round(-Math.abs(step) * 2);
    sqX = 1 - step * 0.05; sqY = 1 + step * 0.05 + Math.sin(idle) * 0.03;
  }
  /* IN ACQUA si NUOTA: niente saltelli né ombra a terra — il corpo affonda sotto il pelo
     dell'acqua (clip), galleggia col bob e lascia increspature. Fase dal TEMPO, mai da sx/sy. */
  if (swim) { hop = 0; lift = 0; skew = 0; sqX = 1; sqY = 1; }
  const bob = swim ? Math.round(Math.sin(frameTime / 520) * 1) : 0;
  if (!swim) shadow(sx + 8, sy + 13, sh);
  if (!cv) { const b = spColor[a.c.torso] || '#c8b078'; rect(sx + 4, sy + 5 + hop - lift + bob, 9, 6, b); return; }
  const d = a.dir < 0 ? -1 : 1;
  const w = cv.width * sqX, h = cv.height * sqY;
  const dx = sx + 8 - w / 2, dy = sy + 14 - h + hop - lift + bob;
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  const paint = () => {
    ctx.save();
    if (d < 0) { ctx.transform(sqX, 0, skew, sqY, dx, dy); }
    else { ctx.transform(-sqX, 0, skew, sqY, dx + w, dy); }
    ctx.drawImage(cv, 0, 0);
    ctx.restore();
  };
  if (swim) {
    const wl = sy + 9 + bob;                                   // pelo dell'acqua: sotto sparisce
    ctx.save(); ctx.beginPath(); ctx.rect(sx - 8, sy - 40, 32, wl - (sy - 40)); ctx.clip();
    paint(); ctx.restore();
    const ph2 = Math.floor(frameTime / 180) % 2;               // increspature attorno al corpo
    rect(sx + 2 - ph2, wl, 5, 1, '#bfe6f2'); rect(sx + 10 + ph2, wl, 4, 1, '#bfe6f2');
    rect(sx + 5, wl + 1, 6, 1, '#8fc9dd');
    if (ph2) { px(sx + 1, wl + 1, '#dff3fa'); px(sx + 13, wl + 1, '#dff3fa'); }
  } else paint();
  ctx.imageSmoothingEnabled = sm;
}

/* imbocco di grotta sulla montagna: arco scuro nella roccia, con qualche scintillio */
export function drawCaveEntrance(sx, sy, time) {
  shadow(sx + 8, sy + 15, 8);
  rect(sx + 1, sy + 2, 14, 14, '#6b6560'); rect(sx + 1, sy + 2, 14, 2, '#837c74');   // roccia
  rect(sx + 3, sy + 5, 10, 11, '#15131a'); rect(sx + 4, sy + 4, 8, 2, '#242030');    // arco buio
  px(sx + 3, sy + 3, '#7f776a'); px(sx + 12, sy + 3, '#7f776a');
  if (Math.floor(time / 500) % 2) { px(sx + 6, sy + 9, '#6fd6e0'); px(sx + 9, sy + 11, '#6fd6e0'); } // cristalli dentro
}
/* X della mappa del tesoro: dipinta sul terreno, scintilla che lampeggia */
function drawXmark(sx, sy, time) {
  for (let i = 0; i < 8; i++) {
    px(sx + 4 + i, sy + 4 + i, '#b8402e'); px(sx + 4 + i, sy + 5 + i, '#8e2f22');
    px(sx + 11 - i, sy + 4 + i, '#b8402e'); px(sx + 11 - i, sy + 5 + i, '#8e2f22');
  }
  if (Math.floor(time / 400) % 2) { px(sx + 8, sy + 1, '#ffe98a'); px(sx + 2, sy + 12, '#ffe98a'); }
}

/* SEGNALINO DELLA META ("tocca dove andare"): senza, non si capisce se il tocco è stato
   raccolto e si tocca due o tre volte. Anello che pulsa a scatti, mai una sfumatura.
   La fase viene dal TEMPO, non dalle coordinate schermo (REGOLE FERREE). */
function markerOn() { return prefOf('marker') !== false; }
function drawGoalMark(sx, sy, time) {
  const step = Math.floor(time / 220) % 3;          // 3 fotogrammi netti
  const r = 3 + step;
  const col = step === 2 ? '#f6efdd' : '#f2c53d';
  for (let a = 0; a < 8; a++) {                      // ottagono: un anello leggibile a 16px
    const ang = a * Math.PI / 4;
    px(sx + Math.round(Math.cos(ang) * r), sy + Math.round(Math.sin(ang) * r), col);
  }
  px(sx, sy, '#f6efdd');
  px(sx, sy + 1, '#8a5f38');
}

/* ---------- eroe (e barca) ---------- */
let frameTime = 0; // aggiornato da render(): serve alle animazioni del player
function drawPlayer() {
  const sx = snap(P.x - cam.x), sy = snap(P.y - cam.y);
  if (onBoat()) { (S.tools.motorboat ? drawMotorboat : drawBoat)(sx, sy); return; } // il migliore che possiedi
  shadow(sx, sy + 16, 7);
  if (P.digging) { drawDigging(sx, sy); return; }
  const fr = (P.moving ? (Math.floor(P.anim * 7) % 2) : 0); const bob = (P.moving && fr === 1) ? -1 : 0;
  const gear = footGear();
  const fb = gear === 'bike' && (P.dir === 'up' || P.dir === 'down'); // vista fronte/retro
  if (gear === 'bike' && !fb) drawBike(sx, sy + bob, P.moving);       // profilo: DIETRO l'eroe (ci "siede")
  drawHero(null, sx - 8, sy + bob, P.dir, fr);
  if (gear === 'skates') drawSkates(sx, sy + bob, fr);                // rotelle ai piedi DAVANTI
  if (fb) drawBikeFB(sx, sy + bob, P.moving, P.dir);                  // fronte/retro: DAVANTI (manubrio/ruota visibili)
}
/* rotelle da pattino sotto i piedi (4 ruote) */
function drawSkates(sx, sy, fr) {
  const wy = sy + 16 + (fr === 1 ? -1 : 0);
  for (const fx of [sx - 5, sx - 2, sx + 2, sx + 5]) { px(fx, wy, '#33291f'); px(fx, wy + 1, '#e0b040'); }
}
/* rotella di una bici (anello + mozzo + 2 raggi che girano se in movimento) */
function bikeWheel(wx, wy, rx, ry, moving) {
  for (let a = 0; a < 12; a++) px(Math.round(wx + Math.cos(a * Math.PI / 6) * rx), Math.round(wy + Math.sin(a * Math.PI / 6) * ry), '#2a2016');
  px(wx, wy, '#9a9285');
  const ang = moving ? frameTime / 70 : Math.PI / 4;
  px(Math.round(wx + Math.cos(ang) * (rx - 1)), Math.round(wy + Math.sin(ang) * (ry - 1)), '#c9c2b2');
  px(Math.round(wx - Math.cos(ang) * (rx - 1)), Math.round(wy - Math.sin(ang) * (ry - 1)), '#c9c2b2');
}
/* bicicletta di PROFILO (sinistra/destra): due ruote, telaio rosso, sella e manubrio. Centrata sotto l'eroe. */
function drawBike(sx, sy, moving) {
  const cx = sx - 1, wy = sy + 15;                                             // centro sotto il corpo
  bikeWheel(cx - 6, wy, 3.2, 3.2, moving); bikeWheel(cx + 6, wy, 3.2, 3.2, moving);
  rect(cx - 5, wy, 11, 1, '#c94f4a');                                          // barra inferiore
  for (let i = 0; i < 5; i++) { px(cx - 5 + i, wy - i, '#d1655f'); px(cx + 5 - i, wy - i, '#d1655f'); } // telaio a V
  rect(cx - 1, wy - 6, 2, 6, '#c94f4a');                                       // reggisella
  rect(cx - 4, wy - 7, 5, 1, '#33291f');                                       // sella
  rect(cx + 5, wy - 7, 1, 6, '#7a6a58'); rect(cx + 4, wy - 7, 3, 1, '#33291f'); // sterzo + manubrio
}
/* bici di FRONTE (giù) / RETRO (su): disegnata DAVANTI all'eroe così si vede.
   Fronte: manubrio largo + ruota di taglio tra i piedi. Retro: sella/catarifrangente + ruota. */
function drawBikeFB(sx, sy, moving, dir) {
  const cx = sx - 1, wy = sy + 16;
  bikeWheel(cx, wy, 1.6, 3.6, moving);                                         // ruota di taglio (ovale stretto)
  rect(cx, wy - 5, 1, 4, '#c94f4a');                                           // forcella/telaio verticale
  if (dir === 'down') { // FRONTE: manubrio a T con le due manopole
    rect(cx - 5, sy + 9, 11, 1, '#33291f'); px(cx - 5, sy + 8, '#33291f'); px(cx + 5, sy + 8, '#33291f');
    px(cx, sy + 10, '#7a6a58');                                               // piantone
    px(cx - 3, wy - 1, '#33291f'); px(cx + 3, wy - 1, '#33291f');             // pedali
  } else {              // RETRO: sella + catarifrangente rosso, portapacchi
    rect(cx - 2, sy + 8, 5, 1, '#5c4229'); rect(cx - 1, sy + 9, 3, 1, '#3a2a18');
    px(cx, wy - 5, '#c94f4a'); px(cx, wy - 4, '#f2c53d');                     // catarifrangente
  }
}
/* in barca: scafo che ondeggia, NIENTE camminata, scia quando ti muovi; pesca con lenza */
function drawBoat(sx, sy) {
  const bob = Math.round(Math.sin(frameTime / 320) * 1.5);
  const y0 = sy + bob;
  /* scia dietro la barca */
  if (P.moving) {
    const bx = P.dir === 'left' ? 12 : P.dir === 'right' ? -12 : 0;
    const by = P.dir === 'up' ? 12 : P.dir === 'down' ? -12 : 0;
    const w2 = Math.floor(frameTime / 140) % 3;
    px(sx + bx - 2 + w2, y0 + 14 + by, '#bfe9f4'); px(sx + bx + 2 - w2, y0 + 15 + by, '#e8f6fb');
    px(sx + bx, y0 + 13 + by, '#bfe9f4');
  }
  /* eroe a bordo PRIMA dello scafo: le gambe restano NASCOSTE dentro la barca (niente piedi sporgenti) */
  drawHero(null, sx - 8, y0 - 5, P.dir, 0);
  /* scafo di legno con prua e bordo chiaro (copre le gambe → l'eroe ci "siede") */
  rect(sx - 10, y0 + 8, 20, 6, '#8a5f38'); rect(sx - 10, y0 + 8, 20, 2, '#a97a4c');
  px(sx - 11, y0 + 9, '#8a5f38'); px(sx + 10, y0 + 9, '#8a5f38');
  rect(sx - 8, y0 + 14, 16, 1, '#5c4229');
  /* riflesso sull'acqua */
  px(sx - 6, y0 + 16, '#bfe9f4'); px(sx + 5, y0 + 16, '#bfe9f4');
  if (P.digging && P.digging.kind === 'fish') { // lenza + galleggiante con cerchi
    const d2 = P.dir === 'left' ? -1 : 1;
    rect(sx + d2 * 7, y0 - 6, 1, 2, '#8a5f38'); px(sx + d2 * 8, y0 - 7, '#8a5f38'); // canna
    for (let i = 1; i < 5; i++) px(sx + d2 * (8 + i), y0 - 7 + i * 2, '#e8e2d0');   // filo
    const bx2 = sx + d2 * 13, by2 = y0 + 3 + Math.round(Math.sin(frameTime / 260));
    px(bx2, by2, '#c65a54'); px(bx2, by2 - 1, '#f6efdd');                            // galleggiante
    const r2 = Math.floor((P.digging.t / P.digging.dur) * 3) + 1;                    // cerchi nell'acqua
    px(bx2 - r2, by2 + 1, '#bfe9f4'); px(bx2 + r2, by2 + 1, '#bfe9f4');
  }
}
/* MOTOSCAFO: scafo bianco/azzurro affusolato, parabrezza, motore fuoribordo, SCIA di spruzzi */
function drawMotorboat(sx, sy) {
  const bob = Math.round(Math.sin(frameTime / 300) * 1.2);
  const y0 = sy + bob;
  /* scia di spruzzi più marcata dietro (in movimento) */
  if (P.moving) {
    const bx = P.dir === 'left' ? 12 : P.dir === 'right' ? -12 : 0;
    const by = P.dir === 'up' ? 12 : P.dir === 'down' ? -12 : 0;
    const w2 = Math.floor(frameTime / 90) % 3;
    for (let i = 0; i < 3; i++) { px(sx + bx - 3 + i * 3 - w2, y0 + 14 + by, '#e8f6fb'); px(sx + bx - 2 + i * 3 + w2, y0 + 16 + by, '#bfe9f4'); }
  }
  /* eroe al timone PRIMA dello scafo: gambe nascoste dentro (niente piedi sporgenti) */
  drawHero(null, sx - 8, y0 - 4, P.dir, 0);
  /* scafo affusolato (bianco con banda azzurra) + prua appuntita (copre le gambe) */
  rect(sx - 10, y0 + 8, 20, 5, '#eef2f4'); rect(sx - 10, y0 + 11, 20, 2, '#3d8ba0'); // banda
  px(sx - 12, y0 + 10, '#eef2f4'); px(sx - 11, y0 + 9, '#eef2f4');                    // prua sinistra
  px(sx + 11, y0 + 10, '#eef2f4'); px(sx + 10, y0 + 9, '#eef2f4');                    // poppa
  rect(sx - 9, y0 + 13, 18, 1, '#2b6274');
  /* parabrezza + console */
  rect(sx - 2, y0 + 4, 5, 4, '#bfe9f4'); rect(sx - 2, y0 + 4, 5, 1, '#8fd0e6');
  rect(sx - 3, y0 + 7, 7, 1, '#9aa3a8');
  /* motore fuoribordo dietro (lato opposto alla direzione) */
  const md = P.dir === 'left' ? 1 : -1;
  rect(sx + md * 9, y0 + 7, 2, 5, '#33291f'); px(sx + md * 9, y0 + 12, '#20323f');
  /* riflesso */
  px(sx - 6, y0 + 15, '#bfe9f4'); px(sx + 5, y0 + 15, '#bfe9f4');
  if (P.digging && P.digging.kind === 'fish') {
    const d2 = P.dir === 'left' ? -1 : 1;
    rect(sx + d2 * 8, y0 - 5, 1, 2, '#8a5f38');
    for (let i = 1; i < 5; i++) px(sx + d2 * (9 + i), y0 - 6 + i * 2, '#e8e2d0');
    const bx2 = sx + d2 * 14, by2 = y0 + 4 + Math.round(Math.sin(frameTime / 260));
    px(bx2, by2, '#c65a54'); px(bx2, by2 - 1, '#f6efdd');
  }
}
/* animazione di scavo/abbattimento/spacco: due colpi, schegge a tema */
function drawDigging(sx, sy) {
  const d = P.digging, kind = d.kind || 'dig';
  const ph = d.t / d.dur;
  const struck = Math.floor(ph * 4) % 2 === 1;              // due colpi per scavata
  if (kind === 'dig') {
    drawHero(null, sx - 8, sy + (struck ? 1 : 0), 'down', 0); // chino sul colpo
    if (!struck) { // PALA alzata: manico + lama LARGA a cucchiaio (≠ piccone)
      rect(sx + 5, sy - 5, 2, 8, '#8a5f38');                                   // manico
      rect(sx + 2, sy - 9, 8, 4, '#b8b0a2'); rect(sx + 3, sy - 5, 6, 1, '#9a9285'); // lama larga
      px(sx + 2, sy - 9, '#d7d0c2'); px(sx + 9, sy - 9, '#d7d0c2');            // bordi lucidi
    } else {       // PALA piantata: lama larga a spatola tra i piedi
      rect(sx + 3, sy + 3, 2, 7, '#8a5f38');                                   // manico
      rect(sx, sy + 10, 8, 3, '#b8b0a2'); rect(sx + 1, sy + 13, 6, 1, '#9a9285'); px(sx + 3, sy + 14, '#7f776a');
    }
    if (struck) {  // terra che schizza AI PIEDI
      const t2 = (ph * 4) % 1;
      const OX = [-7, -4, -2, 2, 5, 8], H = [5, 7, 4, 6, 7, 4];
      const CC = ['#8a6a42', '#c9a06a', '#6d4f30', '#b98d59', '#8a6a42', '#c9a06a'];
      for (let i = 0; i < 6; i++) px(Math.round(sx + OX[i] * (0.4 + t2)), Math.round(sy + 14 - Math.sin(Math.PI * t2) * H[i]), CC[i]);
    }
    return;
  }
  /* accetta/piccone: colpo LATERALE verso la tile che guardi, schegge a tema */
  const dx2 = P.dir === 'left' ? -1 : 1;
  drawHero(null, sx - 8, sy + (struck ? 1 : 0), P.dir === 'up' ? 'down' : P.dir, 0);
  const headCol = kind === 'chop' ? '#b5622e' : '#9a9285';
  if (!struck) { // attrezzo alzato dietro la testa
    rect(sx + dx2 * 5, sy - 4, 2, 7, '#8a5f38');
    if (kind === 'chop') { // ACCETTA: testa a cuneo compatta
      rect(sx + dx2 * 3, sy - 6, 5, 3, headCol); px(sx + dx2 * 3, sy - 6, '#d98a4a');
    } else {               // PICCONE: testa lunga a DOPPIA PUNTA (≠ pala/accetta)
      rect(sx + dx2 * 2, sy - 6, 8, 1, headCol);
      px(sx + dx2 * 2, sy - 5, headCol); px(sx + dx2 * 9, sy - 5, headCol);
      px(sx + dx2 * 2, sy - 7, '#b8b0a2'); px(sx + dx2 * 9, sy - 7, '#b8b0a2');
    }
  } else {       // colpo in diagonale verso il bersaglio
    for (let i = 0; i < 5; i++) px(sx + dx2 * (2 + i), sy + 2 + i, '#8a5f38');
    if (kind === 'chop') rect(sx + dx2 * 7 - 1, sy + 7, 4, 3, headCol);
    else { rect(sx + dx2 * 6, sy + 7, 6, 1, headCol); px(sx + dx2 * 6, sy + 8, headCol); px(sx + dx2 * 11, sy + 8, headCol); } // piccone a doppia punta
  }
  if (struck) {  // schegge sulla tile davanti
    const fx = P.dir === 'left' ? -14 : P.dir === 'right' ? 14 : 0;
    const fy = P.dir === 'up' ? -12 : P.dir === 'down' ? 12 : 0;
    const t2 = (ph * 4) % 1;
    const OX = [-5, -2, 1, 4, 6], H = [5, 7, 4, 6, 5];
    const CC = kind === 'chop' ? ['#8a5f38', '#b98d59', '#4e7a3d', '#8a5f38', '#619a4c']
      : ['#9a9285', '#b8b0a2', '#7f776a', '#9a9285', '#b8b0a2'];
    for (let i = 0; i < 5; i++) px(Math.round(sx + fx + OX[i] * (0.4 + t2)), Math.round(sy + 10 + fy - Math.sin(Math.PI * t2) * H[i]), CC[i]);
  }
}

/* ---------- freccia bussola a bordo schermo ---------- */
function arrowPx(x, y, dx, dy) {
  for (let i = 0; i < 4; i++) {
    const bx = x - dx * i, by = y - dy * i;
    for (let j = -i; j <= i; j++) ctx.fillRect(bx - dy * j, by + dx * j, 1, 1);
  }
}
function drawCompassIndicator(time) {
  /* target: X della mappa seguita (freccia ROSSA) oppure città più vicina (gialla) */
  let tx, ty, col = '#f6d95c';
  if (compass.target) { tx = compass.target.x - cam.x; ty = compass.target.y - cam.y; col = '#e4573d'; }
  else {
    if (!compass.cityGuide) return; // niente cursore città se la BUSSOLA non è posseduta/attiva
    const t = compass.town; if (!t || playerInTown(t)) return;
    tx = t.C.x * TS + TS / 2 - cam.x; ty = t.C.y * TS + TS / 2 - cam.y;
  }
  const W = view.W, H = view.H;
  const L = 10, R = W - 10, T = 16, B = H - 12; // inset: HUD in alto
  if (tx >= L && tx <= R && ty >= T && ty <= B) return; // bersaglio già in vista
  const ax = Math.max(L, Math.min(R, tx)), ay = Math.max(T, Math.min(B, ty));
  const o = octant(tx - W / 2, ty - H / 2);
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const dx = DIRS[o][0], dy = DIRS[o][1];
  const pulse = Math.round(Math.sin(time / 280) + 1); // 0..2 lungo la direzione
  const cx0 = ax + dx * pulse, cy0 = ay + dy * pulse;
  ctx.fillStyle = 'rgba(20,15,8,.45)'; arrowPx(cx0 + 1, cy0 + 1, dx, dy);
  ctx.fillStyle = col; arrowPx(cx0, cy0, dx, dy);
}

/* ---------- GROTTA: area buia esplorabile, camera che segue, solo alone attorno al player ---------- */
function drawCaveScene(time) {
  const W = view.W, H = view.H, rw = CAVE.w * TS, rh = CAVE.h * TS;
  /* La camera la calcola caveCam(), NON questa funzione: la formula era copiata qui e le due
     hanno finito per divergere (il tocco puntava dove il disegno non guardava). Una sola. */
  const cam2 = caveCam();
  const camx = snap(cam2.x), camy = snap(cam2.y);
  ctx.setTransform(view.K, 0, 0, view.K, 0, 0);
  ctx.fillStyle = '#0a0a10'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(-camx, -camy);
  const t0x = Math.max(0, Math.floor(camx / TS) - 1), t1x = Math.min(CAVE.w, Math.ceil((camx + W) / TS) + 1);
  const t0y = Math.max(0, Math.floor(camy / TS) - 1), t1y = Math.min(CAVE.h, Math.ceil((camy + H) / TS) + 1);
  const pcx = Math.floor(CAVE.x / TS), pcy = Math.floor((CAVE.y + FOOT_DY) / TS);
  for (let ty = t0y; ty < t1y; ty++) for (let tx = t0x; tx < t1x; tx++) {
    const sx = tx * TS, sy = ty * TS;
    if (caveSolid(tx, ty)) { // PARETE = roccia FREDDA e scura, con CIMA illuminata e base in ombra
      rect(sx, sy, TS, TS, ((tx + ty) & 1) ? '#33304a' : '#2c2942');
      const openAbove = !caveSolid(tx, ty - 1);
      if (openAbove) { rect(sx, sy, TS, 4, '#7a72ad'); rect(sx, sy + 4, TS, 1, '#5a5488'); } // faccia superiore che prende luce
      else rect(sx, sy, TS, 2, '#3d3960');
      if (vhash(tx, ty, 71) < 0.3) px(sx + 6, sy + 9, '#26243a');                 // venature
      if (!caveSolid(tx, ty + 1)) { rect(sx, sy + TS - 2, TS, 2, '#1b1930'); }     // ombra alla base (stacca dal pavimento)
    } else { // PAVIMENTO = terra CALDA e chiara: qui si CAMMINA (leggibile a colpo d'occhio)
      rect(sx, sy, TS, TS, ((tx + ty) & 1) ? '#5a4d40' : '#524537');
      rect(sx, sy, TS, 1, '#4a3f32'); // giunto leggero tra le lastre
      if (vhash(tx, ty, 72) < 0.16) px(sx + 4 + Math.floor(vhash(tx, ty, 73) * 8), sy + 5 + Math.floor(vhash(tx, ty, 74) * 8), '#463a2e');
      if (vhash(tx, ty, 75) < 0.06) px(sx + 3 + Math.floor(vhash(tx, ty, 76) * 9), sy + 6, '#6a5c48'); // sassolino chiaro
    }
  }
  /* ORME sul pavimento (aiutano a ritrovare la strada), più sbiadite col tempo */
  for (const f of CAVE.trail) {
    const a = Math.max(0, 0.5 - f.t * 0.02); if (a <= 0.02) continue;
    ctx.fillStyle = 'rgba(150,140,170,' + a.toFixed(2) + ')';
    ctx.fillRect(Math.round(f.x) - 2, Math.round(f.y), 2, 1); ctx.fillRect(Math.round(f.x) + 1, Math.round(f.y) + 1, 2, 1);
  }
  /* GIACIMENTI: cristallo grande + anello di casella; GIALLO se raggiungibile (scavabile ora) */
  const reach = caveNodeReach();
  for (let ty = t0y; ty < t1y; ty++) for (let tx = t0x; tx < t1x; tx++) {
    if (!caveNodeAt(tx, ty) || caveNodeDone(tx, ty)) continue;
    const sx = tx * TS, sy = ty * TS, gl = Math.floor(time / 260) % 2, here = (reach && reach[0] === tx && reach[1] === ty);
    ctx.fillStyle = 'rgba(120,220,235,.14)'; ctx.fillRect(sx - 3, sy - 3, TS + 6, TS + 6);       // alone
    rect(sx + 2, sy + 12, 12, 3, '#2a3540'); rect(sx + 4, sy + 4, 8, 10, '#4fbccb');             // base + cristallo
    rect(sx + 5, sy + 3, 6, 3, '#a6ecf2'); rect(sx + 6, sy + 6, 3, 6, '#e8fbff'); px(sx + 8, sy + 5, '#ffffff');
    if (gl) { px(sx + 2, sy + 2, '#a6ecf2'); px(sx + 13, sy + 9, '#a6ecf2'); }
    /* contorno della casella (dove ci si mette per scavare): giallo se ci sei sopra */
    ctx.strokeStyle = here ? 'rgba(240,220,120,.9)' : 'rgba(120,220,235,.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(sx + .5, sy + .5, TS - 1, TS - 1);
  }
  /* player: stessi offset dell'overworld (feet allineati alla collisione: niente scarto di mezzo cubetto) */
  const fr = CAVE.moving ? (Math.floor(CAVE.anim * 7) % 2) : 0;
  const px0 = snap(CAVE.x), py0 = snap(CAVE.y);
  shadow(px0, py0 + 16, 6);
  if (CAVE.digging) { const st = Math.floor((CAVE.digging.t / CAVE.digging.dur) * 4) % 2; drawHero(null, px0 - 8, py0 + st, 'down', 0); rect(px0 + 4, py0 + (st ? 10 : 6), 2, 6, '#8a5f38'); rect(px0 + 2, py0 + (st ? 8 : 4), 6, 3, '#9a9285'); }
  else drawHero(null, px0 - 8, py0, CAVE.dir, fr);
  /* USCITA — un pezzo di MONDO ESTERNO oltre l'imbocco.
     Prima l'uscita era una linguetta di 4 pixel sull'ultima riga: con il solo mouse non
     c'era niente da cliccare "fuori" per uscire (lo stesso guaio della porta del museo), e
     al buio non si capiva nemmeno dove fosse. Adesso la camera scende di CAVE_FOOT e qui
     si disegna quello che si vede là sotto: terra illuminata dal giorno ed erba. */
  const ex = (CAVE.w >> 1) * TS;
  const gw = 3 * TS;                                    // larghezza del varco (3 caselle)
  rect(ex - gw / 2, rh - 2, gw, CAVE_FOOT + 2, '#8a7350');          // terra battuta del passaggio
  rect(ex - gw / 2, rh + 10, gw, CAVE_FOOT - 10, '#6f9a52');        // erba: si è già fuori
  rect(ex - gw / 2, rh + 10, gw, 2, '#82ad60');
  for (let i = 0; i < gw; i += 6) px(ex - gw / 2 + i + 2, rh + 16 + ((i / 6) & 1) * 5, '#87b566');
  /* stipiti di roccia ai lati del varco, così il passaggio si legge come un'apertura */
  rect(ex - gw / 2 - TS, rh - 2, TS, CAVE_FOOT + 2, '#2c2942');
  rect(ex + gw / 2, rh - 2, TS, CAVE_FOOT + 2, '#2c2942');
  rect(ex - gw / 2 - TS, rh - 2, TS, 3, '#3d3960');
  rect(ex + gw / 2, rh - 2, TS, 3, '#3d3960');
  /* alone di luce diurna che risale dentro la grotta: è il richiamo che dice "di qua si esce" */
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = 'rgba(240,232,190,' + (0.05 + i * 0.045) + ')';
    ctx.fillRect(ex - gw / 2 - 4 + i, rh - 34 + i * 7, gw + 8 - i * 2, 8);
  }

  /* BUIO: quasi nero ovunque tranne l'alone attorno al player (a scalini, 8-bit).
     L'uscita fa eccezione: da lì entra il giorno, quindi il buio si apre. Senza, il varco
     appena disegnato tornerebbe nero e non servirebbe a niente. */
  const exTx = CAVE.w >> 1;
  for (let ty = t0y; ty < t1y; ty++) for (let tx = t0x; tx < t1x; tx++) {
    const sx = tx * TS, sy = ty * TS;
    const tR = S.tools && S.tools.torch ? 1.7 : 1; // torcia = alone più ampio in grotta
    const d = (Math.hypot(sx + 8 - CAVE.x, sy + 8 - CAVE.y) / TS) / tR;
    let a = d < 2 ? 0 : d < 3.2 ? 0.4 : d < 4.4 ? 0.72 : d < 5.6 ? 0.9 : 0.98;
    /* vicinanza all'imbocco: quanto più si è in fondo e in mezzo, tanto più c'è luce */
    const dEx = Math.hypot(tx - exTx, ty - (CAVE.h - 1));
    if (dEx < 5) a = Math.min(a, dEx < 2 ? 0 : dEx < 3 ? 0.35 : dEx < 4 ? 0.7 : 0.88);
    if (a > 0) { ctx.fillStyle = 'rgba(4,4,8,' + a + ')'; ctx.fillRect(sx, sy, TS, TS); }
  }
  ctx.restore();
  /* FRECCIA verso l'USCITA a bordo schermo (per non perdersi) */
  const exX = (CAVE.w >> 1) * TS - camx, exY = (CAVE.h - 1) * TS - camy;
  const L = 12, R = W - 12, T = 16, B = H - 12;
  if (!(exX >= L && exX <= R && exY >= T && exY <= B)) {
    const o = octant(exX - W / 2, exY - H / 2), DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const dx = DIRS[o][0], dy = DIRS[o][1];
    const ax = Math.max(L, Math.min(R, exX)), ay = Math.max(T, Math.min(B, exY));
    ctx.fillStyle = 'rgba(0,0,0,.5)'; arrowPx(ax + 1, ay + 1, dx, dy);
    ctx.fillStyle = '#ffe38a'; arrowPx(ax, ay, dx, dy);
  }
}

/* ---------- frame ---------- */
export function render(time) {
  frameTime = time;
  if (CAVE.active) { drawCaveScene(time); return; }
  if (INT.active) { setNight(darknessAt(S.tod || 0)); drawInteriorScene(time); return; }
  const W = view.W, H = view.H, VW = view.VW, VH = view.VH;
  setNight(darknessAt(S.tod || 0));
  setSeason(updateSeasonPalette(S.day || 1, S.tod || 0));   // transizione GRADUALE tra stagioni
  /* camera ancorata alla griglia dei pixel FISICI (passi da 1/K): scroll fluido, niente scatti */
  cam.x = Math.round((P.x - W / 2) * view.K) / view.K;
  cam.y = Math.round((P.y - H / 2) * view.K) / view.K;
  const tx0 = Math.floor(cam.x / TS) - 1, ty0 = Math.floor(cam.y / TS) - 1;
  const LMARG = 6; // margine per le MERAVIGLIE (fino a 9 tile di larghezza e ~70px di altezza)
  const tx1 = tx0 + VW + 2, ty1 = ty0 + VH + 2;
  ctx.clearRect(0, 0, W, H);
  // UNICA passata tile: disegna il terreno E raccoglie le entità (townInfo 1× per tile)
  const ents = [];
  const lampGlows = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const sx = tx * TS - cam.x, sy = ty * TS - cam.y;
    const ti = townInfo(tx, ty);
    /* terreno */
    let t = ti ? (ti.park ? PARK : ti.road ? ROAD : FLOOR) : baseTerrain(tx, ty);
    groundTile(t, tx, ty, sx, sy, time, ti ? 0 : zoneIdxAt(tx, ty));
    if (dugSet.has(tx + ',' + ty) && !(ti && ti.floor)) drawHole(sx, sy);
    /* entità */
    if (ti) {
      if (ti.fence) ents.push({ y: sy + 12, f: () => drawFence(sx, sy) });
      else if (ti.deco && ti.anchor) {
        const d = ti.deco;
        const ey = d.type === 'fountain' ? sy + 30 : sy + 13;
        ents.push({ y: ey, f: () => drawTownDeco(d, sx, sy, time) });
        if (d.type === 'lamp') lampGlows.push({ x: sx + 8, y: sy + 2 });
      }
      else if (ti.building && tx === ti.building.x0 && ty === ti.building.y0) { const b = ti.building; ents.push({ y: (b.y1 + 1) * TS - cam.y, f: () => drawBuilding(b, b.x0 * TS - cam.x, b.y0 * TS - cam.y) }); }
      continue;
    }
    const st = siteAt(tx, ty);
    if (st) { ents.push({ y: sy + 14, f: () => drawSite(sx, sy, siteRemaining(st), time, tx, ty) }); continue; }
    const wk = wreckAt(tx, ty);
    if (wk) { ents.push({ y: sy + 14, f: () => drawWreck(sx, sy, time, tx, ty) }); continue; }
    if (caveEntranceAt(tx, ty)) { ents.push({ y: sy + 14, f: () => drawCaveEntrance(sx, sy, time) }); continue; }
    const lm = landmarkAt(tx, ty);
    if (lm) { ents.push({ y: sy + 15, f: () => drawLandmark(lm, sx, sy, time) }); continue; }
    const d = decoAt(tx, ty);
    if (!d) { const pk = pickupAt(tx, ty); if (pk) ents.push({ y: sy + 12, f: () => drawPickup(pk, sx, sy, time, tx, ty) }); continue; }
    if (d === 'tree') ents.push({ y: sy + 15, f: () => drawTree(sx, sy, time, tx, ty) });
    else if (d === 'boulder') ents.push({ y: sy + 13, f: () => drawBoulder(sx, sy) });
    else if (d === 'flower') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 2, f: () => { if (rip) shadow(sx + 8, sy + 13, 3); drawFlower(sx, sy, tx, ty, rip); if (rip) glint(sx + 12, sy + 3, time, tx, ty); } }); }
    else if (d === 'shell') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 2, f: () => { if (rip) shadow(sx + 8, sy + 13, 4); drawShell(sx, sy, rip); if (rip) glint(sx + 12, sy + 3, time, tx, ty); } }); }
    else if (d === 'cactus') ents.push({ y: sy + 15, f: () => drawCactus(sx, sy) });
    else if (d === 'bonespire') ents.push({ y: sy + 14, f: () => drawBonespire(sx, sy) });
    else if (d === 'deadtree') ents.push({ y: sy + 15, f: () => drawDeadtree(sx, sy) });
    else if (d === 'mushroom') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 8, f: () => { if (rip) shadow(sx + 8, sy + 12, 4); drawMushroom(sx, sy, time, tx, ty, rip); if (rip) glint(sx + 12, sy + 2, time, tx, ty); } }); }
    else if (d === 'stump') ents.push({ y: sy + 13, f: () => drawStump(sx, sy) });
    else if (d === 'redspire') ents.push({ y: sy + 15, f: () => drawRedspire(sx, sy) });
    else if (d === 'orecrystal') ents.push({ y: sy + 13, f: () => drawOrecrystal(sx, sy) });
    else if (d === 'reed') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 14, f: () => { if (rip) shadow(sx + 8, sy + 14, 4); drawReed(sx, sy, time, tx, ty, rip); if (rip) glint(sx + 12, sy + 1, time, tx, ty); } }); }
    else if (d === 'icecrystal') ents.push({ y: sy + 13, f: () => drawIcecrystal(sx, sy) });
    else if (d === 'hay') ents.push({ y: sy + 13, f: () => drawHay(sx, sy) });
  }
  // X delle mappe del tesoro in vista
  for (const m of (S.maps || [])) {
    const sx = m.x * TS - cam.x, sy = m.y * TS - cam.y;
    if (sx < -TS || sx > W + TS || sy < -TS || sy > H + TS) continue;
    ents.push({ y: sy + 2, f: () => drawXmark(sx, sy, time) });
  }
  // fossili/oggetti lasciati a TERRA (zaino pieno o scartati): riprendibili con E
  for (const d of (S.drops || [])) {
    const sx = d.tx * TS - cam.x, sy = d.ty * TS - cam.y;
    if (sx < -TS || sx > W + TS || sy < -TS || sy > H + TS) continue;
    const pid = d.kind === 'good' ? (d.payload && d.payload.id) : 'fossil';
    ents.push({ y: sy + 12, f: () => drawPickup(pid, sx, sy, time, d.tx, d.ty) });
  }
  // chimere nei parchi in vista
  for (const t of visParks) {
    for (const a of parks.get(t.key) || []) {
      const ax = snap(a.x - cam.x), ay = snap(a.y - cam.y);
      if (ax < -20 || ax > W + 20 || ay < -20 || ay > H + 20) continue;
      ents.push({ y: ay, f: () => drawCreature(a, ax - 8, ay - 13) });
    }
  }
  /* MERAVIGLIE fuori dal bordo: sono alte e larghe (fino a 9 tile e ~100px), quindi vanno
     disegnate anche quando la loro ancora è appena oltre lo schermo — altrimenti spariscono
     di colpo proprio mentre le stai guardando. */
  for (let ty = ty0 - LMARG; ty <= ty1 + LMARG; ty++) for (let tx = tx0 - LMARG; tx <= tx1 + LMARG; tx++) {
    if (tx >= tx0 && tx <= tx1 && ty >= ty0 && ty <= ty1) continue;   // già fatte sopra
    const lm2 = landmarkAt(tx, ty); if (!lm2) continue;
    const sx2 = tx * TS - cam.x, sy2 = ty * TS - cam.y;
    ents.push({ y: sy2 + 15, f: () => drawLandmark(lm2, sx2, sy2, time) });
  }
  /* la meta si disegna PRIMA di tutto il resto (sta a terra, sotto ai piedi di chiunque) */
  if (goalMark.on && markerOn()) {
    const gx = snap(goalMark.x - cam.x), gy = snap(goalMark.y - cam.y + FOOT_DY);
    ents.push({ y: -9e9, f: () => drawGoalMark(gx, gy, time) });
  }
  ents.push({ y: P.y - cam.y + 16, f: drawPlayer });
  /* COMPAGNO: chimera/risvegliato che insegue il player */
  const compObj = companionDrawObj();
  if (compObj) {
    const cxs = snap(COMP.x - cam.x), cys = snap(COMP.y - cam.y), ab = companionAbility();
    /* se il player va in barca il compagno lo segue sull'acqua: deve NUOTARE, non camminare */
    const cswim = waterTile(Math.floor(COMP.x / TS), Math.floor((COMP.y + FOOT_DY) / TS));
    ents.push({ y: COMP.y - cam.y + 15, f: () => { drawCreature(compObj, cxs - 8, cys - 13, cswim); drawCompanionGlyph(ab, cxs, cys - 16, time); } });
  }
  ents.sort((a, b) => a.y - b.y).forEach(e => e.f());
  /* FIUTO: il compagno segnala il reperto a terra più vicino entro pochi tile */
  if (compObj && companionAbility() === 'sniff') {
    const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
    /* la scansione 15×15 costava 225 pickupAt PER FRAME (e ognuna tocca terreno, città,
       decorazioni e zona): si rifà 4 volte al secondo, o quando cambi casella. */
    if (time - sniffAt > 250 || sniffKey !== ptx + ',' + pty) {
      sniffAt = time; sniffKey = ptx + ',' + pty; sniffBest = null;
      let bd0 = 8;
      for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
        const tx = ptx + dx, ty = pty + dy, dd = Math.abs(dx) + Math.abs(dy);
        if (dd > bd0) continue;
        if (pickupAt(tx, ty)) { sniffBest = [tx, ty]; bd0 = dd; }
      }
    }
    let best = sniffBest, bd = 8;
    if (best) {
      const mx = best[0] * TS - cam.x + 8, my = best[1] * TS - cam.y - 4 + (Math.sin(time / 220) < 0 ? -1 : 0);
      px(mx, my, '#fff3b0'); px(mx - 1, my + 1, '#f6d95c'); px(mx + 1, my + 1, '#f6d95c'); px(mx, my + 2, '#e0a020'); // pallino "fiuto"
    }
  }
  /* notte: fuori dalla luce quasi NERO; cono 8-bit attorno al player; le città restano illuminate */
  if (night() > 0.02) {
    const pxc = P.x - cam.x, pyc = P.y - cam.y + 8;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const sx = tx * TS - cam.x, sy = ty * TS - cam.y;
      const tR = S.tools && S.tools.torch ? 1.7 : 1; // torcia = alone più ampio
      const d = (Math.hypot(sx + 8 - pxc, sy + 8 - pyc) / TS) / tR;
      let base = d < 2.5 ? 0.15 : d < 4 ? 0.55 : d < 5.5 ? 0.85 : 0.96;
      /* città illuminata + ALONE graduale attorno (falloff su 5 tile, a scalini) */
      const tw = townForTile(tx, ty);
      if (tw) {
        const y1 = tw.pen ? tw.pen.y1 : tw.y1;
        const dxd = Math.max(tw.x0 - tx, 0, tx - tw.x1);
        const dyd = Math.max(tw.y0 - ty, 0, ty - y1);
        const dist = Math.max(dxd, dyd);
        const light = dist <= 0 ? 0.8 : dist < 5 ? 0.8 * (1 - dist / 5) : 0;
        base *= (1 - light);
      }
      ctx.fillStyle = 'rgba(8,9,24,' + (base * night()).toFixed(2) + ')';
      ctx.fillRect(sx, sy, TS, TS);
    }
    /* alone caldo dei lampioni */
    for (const g of lampGlows) {
      ctx.fillStyle = 'rgba(255,215,130,' + (0.10 * night()) + ')'; ctx.fillRect(g.x - 24, g.y - 20, 48, 44);
      ctx.fillStyle = 'rgba(255,215,130,' + (0.13 * night()) + ')'; ctx.fillRect(g.x - 14, g.y - 12, 28, 28);
      ctx.fillStyle = 'rgba(255,225,150,' + (0.16 * night()) + ')'; ctx.fillRect(g.x - 7, g.y - 6, 14, 16);
    }
  }
  { const tgt = weatherAt(zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS)).id, S.day); const st = weatherStep(tgt, time); drawWeather(st.w, time, st.level); }
  drawCompassIndicator(time);
}
/* overlay meteo a schermo (particelle in coordinate schermo). lvl 0..1 = intensità (crossfade). */
function drawWeather(w, time, lvl) {
  if (lvl === undefined) lvl = 1;
  if (!w || w === 'clear' || lvl <= 0.01) return;
  const W = view.W, H = view.H;
  if (w === 'rain') {
    ctx.strokeStyle = 'rgba(150,180,210,' + (0.5 * lvl).toFixed(2) + ')'; ctx.lineWidth = 1;
    const n = Math.round(60 * lvl);
    for (let i = 0; i < n; i++) {
      const x = (i * 53 + Math.floor(time / 6)) % (W + 20) - 10;
      const y = (i * 71 + Math.floor(time / 3)) % (H + 20) - 10;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y + 6); ctx.stroke(); // scia inclinata nel verso della deriva (→)
    }
    ctx.fillStyle = 'rgba(40,55,80,' + (0.10 * lvl).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H);
  } else if (w === 'snow') {
    ctx.fillStyle = 'rgba(240,250,255,' + (0.85 * lvl).toFixed(2) + ')';
    const n = Math.round(55 * lvl);
    for (let i = 0; i < n; i++) {
      const x = (i * 61 + Math.floor(Math.sin(time / 500 + i) * 6) + Math.floor(time / 22)) % (W + 12) - 6;
      const y = (i * 43 + Math.floor(time / 26)) % (H + 12) - 6;
      ctx.fillRect(x, y, 1, 1); if (i % 3 === 0) ctx.fillRect(x, y, 2, 2);
    }
  } else if (w === 'sandstorm') {
    ctx.fillStyle = 'rgba(200,160,90,' + (0.16 * lvl).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(215,180,110,' + (0.5 * lvl).toFixed(2) + ')';
    const n = Math.round(70 * lvl);
    for (let i = 0; i < n; i++) {
      const x = (i * 47 + Math.floor(time / 2)) % (W + 16) - 8;
      const y = (i * 89 + Math.floor(Math.sin(time / 300 + i) * 4)) % H;
      ctx.fillRect(x, y, 2, 1);
    }
  } else if (w === 'fog') {
    ctx.fillStyle = 'rgba(200,205,210,' + (0.14 * lvl).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(210,214,220,' + (0.10 * lvl).toFixed(2) + ')';
    for (let i = 0; i < 6; i++) { const x = (i * 140 + Math.floor(time / 40)) % (W + 120) - 60; ctx.fillRect(x, (i * 37) % H, 90, 22); }
  } else if (w === 'ash') {
    ctx.fillStyle = 'rgba(120,70,50,' + (0.10 * lvl).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(60,50,46,' + (0.7 * lvl).toFixed(2) + ')';
    const n = Math.round(45 * lvl);
    for (let i = 0; i < n; i++) {
      const x = (i * 59 + Math.floor(Math.sin(time / 400 + i) * 8)) % W;
      const y = (i * 67 + Math.floor(time / 30)) % (H + 10) - 5;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
