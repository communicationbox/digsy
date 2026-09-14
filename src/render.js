/* Rendering: tile, decorazioni, edifici, parco, eroe, indicatore bussola */
import { TS, spColor, spById } from './data.js';
import { FOOT_DY } from './body.js';
import { partParams, composedPartsVox, buildFleshVoxels, clampSpec, BP } from './bones.js';
import { ctx, view } from './screen.js';
import { snap, px, rect, shadow, shade8, BRUSH } from './brush.js';
export { BRUSH };
import { S, P, cam, dugSet } from './state.js';
import { DEEP, WATER, SAND, GRASS, FOREST, DIRT, MTN, FLOOR, PARK, ROAD, baseTerrain, diggable, decoAt, pickupAt, townInfo, townForTile, siteAt, boneSiteAt, boneSitePitAt, wreckAt, caveEntranceAt, landmarkAt, harvestDecoAt, parkDeco, townForCell, TCELL, houseFootprint, yardInfo, yardRect } from './world.js';
import { CAVE, caveSolid, caveNodeAt, caveNodeDone, caveNodeReach, caveCam, CAVE_FOOT } from './cave.js';
import { COMP, companionDrawObj, companionType, companionSpec, companionHelps, companionLightBonus } from './companion.js';
import { weatherAt, weatherStep } from './weather.js';
import { siteRemaining, onBoat, footGear, waterTile, isMounted, PLAY_THROW, PLAY_CATCH, PLAY_PERFECT, boneSiteDug } from './gameplay.js';
import { SEED, vhash } from './noise.js';
import { drawHero, setHeroTime } from './sprites.js';
import { yardAnimals, yardNear, gateClosingProgress } from './park.js';
import { compass, playerInTown, octant } from './compass.js';
import { INT, NPCS, pedList, roomOrigin, ROOM_W, ROOM_H, GAL_DESK, MENTOR, CUT } from './interior.js';
import { zonePools, ZONES, MUSEUM_ZONES } from './data.js';
import { zoneName, bldName, tr } from './i18n.js';
import { drawWonder } from './wonderart.js';
import { hasSprite, drawSprite, spriteDef } from './spritebank.js';
import { applyLook } from './sprites.js';
import { darknessAt, seasonOf, SEASON_LEN } from './daynight.js';
import { zoneAt, zoneIdxAt } from './regions.js';
import { goal as goalMark } from './tapmove.js';
import { pref as prefOf } from './prefs.js';
import { tutActive, tutShowLabels, tutTarget, tutStepId, bldPurpose } from './tutorial.js';
import { alive } from './goal.js';
import { drawSayBalloon, drawTree, drawBoulder, drawFlower, drawShell, drawHole, drawPickup, glint, drawCactus, drawBonespire, drawDeadtree, drawMushroom, drawStump, drawRedspire, drawOrecrystal, drawReed, drawIcecrystal, drawHay } from './props.js';
import { drawInteriorScene } from './interiors.js';
import { FRONTS } from './townArt.js';
import { caveWall, caveFloor, caveCrystal } from './caveArt.js';
import { fountainArt, benchArt, bushArt, lampArt, boardArt, statueArt, mailboxArt, siteArt } from './decoArt.js';
import { updateFireflies, drawFireflies } from './firefly.js';
import { groundTile, soilDetail, seaTile, seaTree, zoneTree, updateSeasonPalette, ZONE_TILES, BIOME_BUILD, biomeBuild, INT_WOOD, night, setNight, season, setSeason } from './tiles.js';

/* stato del frame: oscurità (0..1) e stagione corrente, letti dalle funzioni di disegno */

/* ---------- helper pixel ---------- */
/* aggancia una coordinata interna alla griglia dei pixel FISICI (multipli di 1/K):
   niente Math.round intero → niente oscillazione ±1px quando W/H sono dispari */

/* ---------- edifici / parco ---------- */
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
    case 'furniture': // poltroncina
      rect(cx - 1, y, 3, 2, '#b07c4a'); rect(cx - 2, y + 1, 1, 3, '#8a5f38'); rect(cx + 2, y + 1, 1, 3, '#8a5f38');
      rect(cx - 1, y + 2, 3, 1, '#c98a5a'); px(cx - 2, y + 4, '#5c4229'); px(cx + 2, y + 4, '#5c4229'); break;
    case 'house': // casetta stilizzata
      px(cx, y, '#8a5f38'); px(cx - 1, y + 1, '#8a5f38'); px(cx + 1, y + 1, '#8a5f38');
      rect(cx - 2, y + 2, 5, 3, '#c98a5a'); px(cx, y + 3, '#6e4a2e'); break;
  }
}
function drawSign(type, cx, y) {
  px(cx, y - 1, '#5c4229'); // gancio
  rect(cx - 5, y, 11, 7, '#8a5f38'); rect(cx - 4, y + 1, 9, 5, '#d9b98a');
  drawSignIcon(type, cx, y + 1);
}
/* Edifici RICONOSCIBILI a colpo d'occhio: ogni mestiere ha la sua sagoma */
export function drawBuilding(b, sx, sy) {
  /* il disegno sta in townArt.js (materiali per mestiere, tetto della zona, porta col gradino);
     qui si decide solo dove, con quali materiali di bioma e se è notte */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const w = (b.x1 - b.x0 + 1) * TS, h = (b.y1 - b.y0 + 1) * TS; // il museo è 5 tile largo
  const BB = biomeBuild(b.x0, b.y0);   // materiali del bioma (tetto, zoccolo, neve)
  shadow(sx + w / 2, sy + h + 4, Math.floor(w / 2) - 4);
  const glass = night() > 0.4 ? '#ffdf8a' : '#8fd0e6';
  const dcx = sx + w / 2;
  /* ESTERNI (townArt.js): ogni mestiere coi suoi materiali, tetto della zona, porta col gradino */
  const front = FRONTS[b.type] || FRONTS.lab;
  front(BRUSH, w, h, BB, glass, night() > 0.4);
  const doorOff = { barber: -6, tailor: 6, furniture: 4 }[b.type] || 0;
  // insegna appesa sopra la porta (comunque utile da lontano)
  if (b.type !== 'museum') drawSign(b.type, dcx + doorOff, sy + 17);
  ctx.restore();
}
/* CASA del giocatore: un cottage piccolo e caldo (3×2, fuori dal sistema città), non un
   mestiere — pareti terracotta, una finestrella tonda, nessuna vetrina. */
export function drawHouse(hf, sx, sy) {
  /* FASE 2: nativa a piena scala, stesso trattamento di drawBuilding — porta a due
     pannelli con maniglia, finestrella col telaio a croce, tetto più ricco, seconda riga
     di tono sul muro. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const w = (hf.x1 - hf.x0 + 1) * TS, h = (hf.y1 - hf.y0 + 1) * TS;
  const BB = biomeBuild(hf.x0, hf.y0);
  const glass = night() > 0.4 ? '#ffdf8a' : '#8fd0e6';
  const dcx = sx + w / 2;
  FRONTS.house(BRUSH, w, h, BB, glass === '#ffdf8a' ? '#8fd0e6' : glass, night() > 0.4);
  drawSign('house', dcx, sy + 17);
  ctx.restore();
}
/* ---------- arredo urbano ---------- */
export function drawFountain(sx, sy, time) {
  /* disegno in decoArt.js */
  ctx.save(); ctx.translate(sx, sy); fountainArt(BRUSH, time); ctx.restore();
}
export function drawBench(sx, sy) {
  ctx.save(); ctx.translate(sx, sy); benchArt(BRUSH); ctx.restore();
}
export function drawBushDeco(sx, sy) {
  ctx.save(); ctx.translate(sx, sy); bushArt(BRUSH); ctx.restore();
}
export function drawLamp(sx, sy) {
  ctx.save(); ctx.translate(sx, sy); lampArt(BRUSH, night() > 0.4); ctx.restore();
}
/* affioramento d'ossa: cranio semisepolto + costole; scintilla se ha ancora scavi */
export function drawSite(sx, sy, remaining, time, tx, ty) {
  /* fase STABILE per casella (mai sx: scatterebbe con la camera) */
  ctx.save(); ctx.translate(sx, sy); siteArt(BRUSH, remaining, time, (tx || 0) * 7 + (ty || 0) * 13); ctx.restore();
}
/* SCHELETRO SEPOLTO — un VERO scavo archeologico, non un mucchietto d'ossa come i siti normali:
   terra smossa dentro un riquadro delimitato da paletti e corda (i segnali di ogni scavo vero),
   con le parti ADAGIATE nella terra invece che ammucchiate sopra. Deve leggersi da lontano come
   UN riquadro, non come 5 incontri sparsi — per questo il fondo si disegna su OGNI casella del
   bounding-box (anche quelle senza parte), non solo sulle 5 che si scavano. */
const BONE_BOX_R = { x0: -1, x1: 1, y0: -2, y1: 1 };
export function drawBonePit(sx, sy, rx, ry) {
  rect(sx, sy, TS, TS, (rx + ry) % 2 === 0 ? '#6b4a30' : '#5c3f28'); // terra smossa, gradoni a scacchiera lieve
  rect(sx, sy, TS, 4, '#7a5638');                                    // orlo chiaro in cima (luce dall'alto)
  const edgeX = rx === BONE_BOX_R.x0 || rx === BONE_BOX_R.x1, edgeY = ry === BONE_BOX_R.y0 || ry === BONE_BOX_R.y1;
  if (edgeX && edgeY) {                                              // PALETTO d'angolo, sporge in alto
    const px0 = sx + (rx < 0 ? 4 : 24);
    rect(px0, sy - 6, 4, 16, '#5c4228'); px(px0, sy - 6, '#8a5f38');
  } else if (edgeX) { for (let i = 2; i < TS; i += 8) px(sx + (rx < 0 ? 2 : 28), sy + i, '#d8c79c'); }   // corda verticale
  else if (edgeY) { for (let i = 2; i < TS; i += 8) px(sx + i, sy + (ry < 0 ? 2 : 28), '#d8c79c'); }    // corda orizzontale
}
/* le 5 parti, SAGOME DIVERSE (non lo stesso mucchietto ripetuto): si legge quale osso è quale
   anche prima di scavarlo. Ferme (la scintilla sola basta a dire "qui c'è ancora da scavare"). */
export function drawBonePart(sx, sy, part, time, tx, ty) {
  /* FASE 2: nativa — ogni sagoma con un tocco di quarto tono in più (osso al centro schiarito). */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const ph = ((tx || 0) * 7 + (ty || 0) * 13);
  const boneC = '#ece5d2', boneD = '#cbbfa4', boneL = shade8('#ece5d2', 1.15), dark = '#3a3128';
  shadow(sx + 16, sy + 26, 12);
  if (part === 'cranio') {
    rect(sx + 8, sy + 12, 16, 12, boneC); rect(sx + 4, sy + 16, 6, 6, boneC);       // cranio ovale + muso
    rect(sx + 10, sy + 14, 6, 2, boneL);                                            // quarto tono: luce sulla fronte
    px(sx + 12, sy + 16, dark); px(sx + 18, sy + 16, dark);                         // occhi
    rect(sx + 8, sy + 22, 16, 2, boneD);
  } else if (part === 'torace') {
    for (let i = 0; i < 3; i++) { const bx = sx + 6 + i * 6;                        // costole ad arco
      px(bx, sy + 10 + i * 2, boneC); px(bx + 2, sy + 8 + i * 2, boneC); px(bx + 4, sy + 10 + i * 2, boneD); px(bx, sy + 14 + i * 2, boneD); }
    rect(sx + 14, sy + 8, 2, 16, boneD); rect(sx + 14, sy + 8, 1, 16, boneL);        // colonna + filo di luce
  } else if (part === 'zampa') {
    rect(sx + 4, sy + 6, 6, 6, boneC); rect(sx + 8, sy + 10, 4, 12, boneD);          // osso lungo in diagonale
    rect(sx + 12, sy + 18, 4, 6, boneD); rect(sx + 16, sy + 22, 6, 6, boneC);
    px(sx + 5, sy + 7, boneL);                                                       // quarto tono: nocca in luce
  } else if (part === 'coda') {
    for (let i = 0; i < 5; i++) { const yy = sy + 6 + i * 4 - (i > 2 ? (i - 2) * 2 : 0); px(sx + 4 + i * 6, yy, boneC); px(sx + 6 + i * 6, yy, boneD); px(sx + 4 + i * 6, yy + 1, boneL); } // vertebre che si accorciano curvando
  } else { // corno
    for (let i = 0; i < 7; i++) px(sx + 10 + Math.floor(i / 2) * 2, sy + 26 - i * 2, i % 2 ? boneC : boneD);
    px(sx + 10, sy + 26, boneL); // punta in luce
  }
  const a = (Math.sin(time / 300 + ph) + 1) / 2;                                    // scintilla: c'è ancora da scavare, ampiezza raddoppiata
  if (a > 0.4) { px(sx + 16, sy + 2, '#fff6c8'); px(sx + 14, sy + 4, '#f6d95c'); px(sx + 18, sy + 4, '#f6d95c'); }
  ctx.restore();
}
/* RELITTO in mare: scafo spezzato e albero pendente che affiorano dall'acqua (bob leggero) */
export function drawWreck(sx, sy, time, tx, ty) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  /* FASE 2: nativa — assi dello scafo con quarto tono, vela con più stracci. */
  const ph = ((tx || 0) * 7 + (ty || 0) * 13); // fase STABILE per casella (mai sx)
  const bob = Math.round(Math.sin(time / 500 + ph) * 2);
  const y = sy + bob;
  // scafo scuro inclinato
  rect(sx + 2, y + 12, 26, 10, '#4a382a'); rect(sx + 2, y + 12, 26, 2, '#6a5038');
  rect(sx + 4, y + 10, 22, 2, '#5c4630'); rect(sx + 2, y + 22, 26, 2, '#2f2418');
  for (let i = 0; i < 4; i++) px(sx + 6 + i * 6, y + 16, '#2f2418');            // fasciame (assi)
  rect(sx + 4, y + 20, 20, 1, shade8('#4a382a', 0.75));                        // quarto tono: ombra bassa dello scafo
  // buco nello scafo
  rect(sx + 18, y + 16, 6, 6, '#20323f');
  // albero maestro pendente + vela strappata
  rect(sx + 8, y - 8, 2, 20, '#6a5038'); rect(sx + 8, y - 10, 2, 2, '#8a6a4a');
  rect(sx + 10, y - 6, 8, 8, '#c9bfa6'); px(sx + 14, y - 2, '#a89a78'); px(sx + 16, y, '#a89a78'); // vela lacera
  // increspature attorno
  ctx.fillStyle = 'rgba(200,235,245,.35)'; ctx.fillRect(sx - 2, y + 24, 8, 2); ctx.fillRect(sx + 24, y + 22, 8, 2);
  ctx.restore();
}
function drawTownDeco(d, sx, sy, time) {
  /* FASE 2: ogni tipo qui sotto è ORMAI nativo (drawFountain/Bench/Lamp/BushDeco/Mailbox/
     Statue/Board si scalano da sole al loro interno) — questo wrapper NON deve più
     raddoppiare, altrimenti li disegna a 4× (bug reale trovato e corretto: la cassetta
     della posta lo faceva già prima di questo giro). */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  if (d.type === 'fountain') drawFountain(sx, sy, time);
  else if (d.type === 'bench') drawBench(sx, sy);
  else if (d.type === 'lamp') drawLamp(sx, sy);
  else if (d.type === 'board') drawBoard(sx, sy, time);
  else if (d.type === 'mailbox') drawMailbox(sx, sy);
  else if (d.type === 'statue') drawStatue(sx, sy, time);
  else drawBushDeco(sx, sy);
  ctx.restore();
}
/* CARTELLO delle missioni: due pali + tabellone di legno con fogli e un pennino luccicante */
function drawBoard(sx, sy, time) {
  ctx.save(); ctx.translate(sx, sy); boardArt(BRUSH, time); ctx.restore();
}
/* STATUA DEL NONNO (solo città, accanto al Museo): piedistallo di pietra con targa d'ottone,
   il vecchio archeologo col cappello a tesa e la pala piantata a terra. Tutta in toni di PIETRA
   — è l'unica cosa in piazza senza colori vivi, così si legge come monumento e non come un NPC
   con cui parlare per sbaglio. La targa manda un riflesso ogni tanto: dice "qui c'è da leggere"
   senza scriverlo. */
function drawStatue(sx, sy, time) {
  ctx.save(); ctx.translate(sx, sy); statueArt(BRUSH, time); ctx.restore();
}
/* CASSETTA DELLA POSTA (borghi/paesi): buca delle lettere teal su palo, fessura, bandierina rossa */
export function drawMailbox(sx, sy) {
  ctx.save(); ctx.translate(sx, sy); mailboxArt(BRUSH); ctx.restore();
}
/* glifo del TIPO del compagno sopra la sua testa (sempre visibile → il potere è "attivo"):
   un diamantino 8-bit col colore-tema del tipo e nucleo chiaro per staccare dallo sfondo */
const GLYPH_COL = { terra: ['#b07a3c', '#e6c48a'], acqua: ['#3f9bdc', '#bfe6ff'], albero: ['#5fae4a', '#c8f0b0'], roccia: ['#9aa2ad', '#e2e7ef'], grotta: ['#e0a83c', '#ffe6a6'] };
function drawCompanionGlyph(type, cx, cy, time) {
  if (!type) return;
  /* FASE 2: nativa, blocchi 2×2 al posto del singolo pixel scalato meccanicamente. */
  const y = cy + (Math.sin(time / 300) < 0 ? -2 : 0);
  const [c, hi] = GLYPH_COL[type] || GLYPH_COL.terra;
  rect(cx - 1, y - 2, 2, 2, c); rect(cx - 2, y, 2, 2, c); rect(cx + 2, y, 2, 2, c); rect(cx - 1, y + 2, 2, 2, c); // diamante
  rect(cx - 1, y, 2, 2, hi);                                                                                     // nucleo chiaro
}
/* PESCA da ANIMALE (niente canna!): come le oche a testa in giù — sedere/coda fuori dall'acqua
   che si tuffa e riemerge, zampe palmate che remano, increspature e bollicine. Sostituisce il
   disegno normale della creatura durante il lavoro d'acqua. Colore dal torace della creatura. */
function drawCompanionDabble(cx, cyBase, time, obj) {
  /* FASE 2: nativa — posizioni/ampiezze raddoppiate (cx/cyBase arrivano già alla scala vera). */
  const body = (obj && spColor[obj.c.torso]) || '#c8b078';
  const dark = shade8(body, 0.7), light = shade8(body, 1.18);
  const wy = cyBase + 6;                                    // pelo dell'acqua
  const bob = Math.round(Math.sin(time / 260) * 4);         // il sedere si tuffa e riemerge
  const top = wy - 22 + bob;
  const rows = [1, 1, 2, 2, 3, 3, 4, 4, 4];                 // rump a goccia: stretto in cima (coda)
  for (let r = 0; r < rows.length; r++) { const yy = top + r * 2, hw = rows[r] * 2;
    for (let x = -hw; x <= hw; x++) rect(cx + x, yy, 1, 2, (x === -hw || x === hw) ? dark : yy >= wy - 6 ? light : body); }
  px(cx, top - 2, dark);
  const wag = Math.round(Math.sin(time / 130)) * 2;         // coda che scodinzola
  px(cx + wag, top - 2, body); px(cx + wag, top - 4, light);
  const pad = Math.floor(time / 160) % 2;                   // zampe palmate che remano
  px(cx - 10, wy + 2 - pad * 2, dark); px(cx - 12, wy + 2 - pad * 2, dark);
  px(cx + 10, wy + pad * 2, dark); px(cx + 12, wy + pad * 2, dark);
  rect(cx - 12, wy, 26, 4, '#4d8fb5'); rect(cx - 12, wy, 26, 2, '#83cfe6'); // acqua che copre la testa
  const rr = 1 + Math.floor((time / 200) % 3);              // increspature
  for (let a = 0; a < 8; a++) { const an = a / 8 * 6.283; px(Math.round(cx + Math.cos(an) * (rr + 2) * 2), Math.round(wy + 2 + Math.sin(an) * (rr + 1)), 'rgba(190,233,244,.45)'); }
  if (Math.floor(time / 300) % 2) { px(cx - 4, wy + 4, '#bfe9f4'); px(cx + 4, wy + 6, '#e8f6fb'); } // bollicine
}
/* SCAVO da ANIMALE (niente pala!): come un cane/talpa — testa nella buca, sedere/coda su che
   scodinzola, zampe che grattano e TERRA che schizza indietro a ondate, mucchietto che cresce
   dietro. Sostituisce il disegno normale della creatura. Colore dal torace. Fase dal TEMPO. */
function drawCompanionDig(cx, cyBase, time, obj, dir) {
  /* FASE 2: nativa — posizioni/ampiezze raddoppiate. */
  const body = (obj && spColor[obj.c.torso]) || '#c8b078';
  const dark = shade8(body, 0.7), light = shade8(body, 1.18);
  const gy = cyBase + 8, back = -dir;                       // la terra vola DIETRO (opposto al muso)
  for (let x = -8; x <= 8; x += 2) { const d = Math.round(4 * Math.sqrt(Math.max(0, 1 - x * x / 64))); if (d) rect(cx + x, gy - d + 2, 2, d, '#3a2a18'); } // buca
  rect(cx - 8, gy, 18, 2, '#5a4326');
  for (let x = -4; x <= 4; x += 2) { const h = Math.max(0, 6 - Math.abs(x)); for (let k = 0; k < h; k += 2) px(cx + back * 14 + x, gy - k, k >= h - 2 ? '#8a6a42' : '#6d4f30'); } // mucchietto dietro
  const bob = Math.round(Math.sin(time / 110)) * 2, rx = cx + back * 4, top = gy - 12 - bob; // sedere su, il muso NELLA buca (niente gap)
  const rows = [1, 1, 2, 2, 3, 3, 3];
  for (let r = 0; r < rows.length; r++) { const yy = top + r * 2, hw = rows[r] * 2; for (let x = -hw; x <= hw; x++) rect(rx + x, yy, 1, 2, (x === -hw || x === hw) ? dark : yy >= gy - 6 ? light : body); }
  const wag = Math.round(Math.sin(time / 85)) * 2;         // coda che scodinzola
  px(rx + wag, top - 2, body); px(rx + wag, top - 4, light);
  const scr = Math.floor(time / 70) % 2;                    // zampe davanti che grattano
  px(cx - dir * 4, gy - scr * 2, dark); px(cx - dir * 6, gy - 2 + scr * 2, dark);
  const beat = (time / 70) % 1;                             // TERRA a ondate indietro
  if (Math.floor(time / 70) % 2 === 0) {
    const OX = [4, 8, 12, 16], H = [12, 16, 12, 8], CC = ['#8a6a42', '#c9a06a', '#6d4f30', '#b98d59'];
    for (let i = 0; i < 4; i++) px(Math.round(cx + back * OX[i] * (0.6 + beat)), Math.round(gy - 4 - Math.sin(Math.PI * beat) * H[i]), CC[i]);
  }
}
/* TAGLIO ALBERO da ANIMALE (niente accetta!): la creatura ROSICCHIA il tronco come un castoro —
   resta rivolta all'albero, morsi ritmici che fanno una TACCA chiara e schizzano TRUCIOLI di
   legno, e dalla chioma cadono FOGLIE ondeggiando. La creatura è disegnata a parte (in piedi
   col morso in avanti); qui gli effetti. Fase dal TEMPO. */
function drawCompanionChop(cx, cy, time, dir) {
  /* FASE 2: nativa — posizioni/ampiezze raddoppiate. */
  const tx = cx + dir * 14, beat = (time / 90) % 1, bite = Math.floor(time / 90) % 2 === 0; // tronco davanti
  if (bite) {
    const OX = [0, 4, 8, 12], H = [6, 10, 8, 4], CC = ['#8a5f38', '#b98d59', '#6e4a2e', '#d9b98a'];
    for (let i = 0; i < 4; i++) px(Math.round(tx + dir * OX[i] * (0.5 + beat)), Math.round(cy - 2 - Math.sin(Math.PI * beat) * H[i]), CC[i]); // trucioli
    rect(tx, cy - 2, 2, 2, '#d9b98a'); rect(tx, cy, 2, 2, '#c79a66');               // tacca chiara sul tronco
  }
  for (let k = 0; k < 3; k++) {                                                     // foglie che cadono ondeggiando
    const t = ((time / 800) + k * 0.37) % 1;
    const fy = cy - 44 + t * 52, fx = cx + dir * 6 + Math.round(Math.sin((t * 5 + k) * 2) * 6);
    if (t < 0.9) { px(Math.round(fx), Math.round(fy), k % 2 ? '#4e7a3d' : '#619a4c'); if (t < 0.5) px(Math.round(fx) + dir * 2, Math.round(fy), '#3f6a32'); }
  }
}
/* ROTTURA ROCCIA da ANIMALE (niente piccone!): la creatura TESTA il masso come un ariete/capra —
   testate ritmiche con LAMPO d'impatto, scaglie di pietra che schizzano con qualche scintilla, e
   una CREPA pallida che si apre sul masso. La creatura è disegnata a parte (in piedi, testata in
   avanti); qui gli effetti. Fase dal TEMPO. */
function drawCompanionMine(cx, cy, time, dir) {
  /* FASE 2: nativa — posizioni/ampiezze raddoppiate, crepa e lampo a blocchi 2×2. */
  const rx = cx + dir * 14, beat = (time / 85) % 1, hit = Math.floor(time / 85) % 2 === 0; // punto d'impatto
  rect(rx, cy - 6, 2, 2, '#cbc4b6'); rect(rx + dir * 2, cy - 4, 2, 2, '#cbc4b6'); rect(rx, cy - 2, 2, 2, '#d8d2c6'); rect(rx - dir * 2, cy, 2, 2, '#cbc4b6'); rect(rx, cy + 2, 2, 2, '#cbc4b6'); // crepa che si apre
  if (hit) {
    rect(rx, cy - 2, 2, 2, '#ffffff'); rect(rx - 2, cy - 2, 2, 2, '#eef2f6'); rect(rx + 2, cy - 2, 2, 2, '#eef2f6'); rect(rx, cy - 4, 2, 2, '#eef2f6'); rect(rx, cy, 2, 2, '#eef2f6'); // LAMPO d'impatto
    const OX = [0, 4, 8, 12], H = [10, 14, 10, 6], CC = ['#9a9285', '#b8b0a2', '#e2e7ef', '#7f776a'];
    for (let i = 0; i < 4; i++) px(Math.round(rx + dir * OX[i] * (0.5 + beat)), Math.round(cy - 2 - Math.sin(Math.PI * beat) * H[i]), CC[i]); // scaglie
    if (Math.floor(time / 170) % 2) px(rx + dir * 6, cy - 4, '#ffe98a'); // scintilla gialla
  }
  px(cx + dir * 10, cy + 4, 'rgba(150,150,150,.45)'); // polverina alla base
}
/* RACCOGLITORE LEGGENDARIO: animazione del lavoro (fase 'work'). Gli ANIMALI non usano attrezzi:
   ACQUA = dabble d'oca · TERRA = scavo a testa in giù (cane) · ALBERO = rosicchia il tronco
   (castoro) · ROCCIA = testa il masso (ariete). Coordinate già snap. */
function drawCompanionWork(cxs, cys, time, obj) {
  /* FASE 2: le 4 funzioni sottostanti sono ormai native, questo dispatcher non deve più
     scalare (altrimenti le raddoppia una seconda volta). */
  const j = COMP.job; if (!j || j.phase !== 'work') return;
  const dir = j.wx >= COMP.x ? 1 : -1;
  if (j.type === 'acqua') { drawCompanionDabble(cxs, cys, time, obj); return; }
  if (j.type === 'terra') { drawCompanionDig(cxs, cys, time, obj, dir); return; }
  if (j.type === 'albero') { drawCompanionChop(cxs, cys, time, dir); return; }
  drawCompanionMine(cxs, cys, time, dir); // roccia
}
/* "+fossile" che sale dal raccoglitore quando trova qualcosa (contorno rarità) */
const COMP_RARCOL = { comune: '#cfc8b6', raro: '#7fbfe0', eccezionale: '#c79be6', leggendario: '#f0c86a' };
function drawCompanionFx(cam, time) {
  /* FASE 2: nativa — ossino a blocchi 2×2, ampiezza di risalita raddoppiata. */
  if (!COMP.fx || !COMP.fx.length) return;
  for (const p of COMP.fx) {
    const gx = snap(p.x - cam.x), gy = snap(p.y - cam.y - (1 - p.life) * 64), a = Math.max(0, p.life);
    const w = 'rgba(245,240,225,' + a.toFixed(2) + ')', w2 = 'rgba(245,240,225,' + (a * 0.7).toFixed(2) + ')';
    rect(gx - 1, gy - 1, 2, 2, w); rect(gx - 3, gy - 1, 2, 2, w2); rect(gx + 1, gy - 1, 2, 2, w2); rect(gx - 1, gy - 3, 2, 2, w2); // ossino "+"
    if (a > 0.4) rect(gx - 1, gy - 5, 2, 2, COMP_RARCOL[p.q] || '#e8d9b0');                                                        // scintilla rarità
  }
}
/* MINIGIOCO "gioca col compagno": pallina lanciata con un arco, ferma dove atterra finché il
   compagno non arriva, e la barra di TEMPISMO sopra la sua testa quando è il momento di
   prenderla al volo — la zona d'oro (dove scatta il bonus pieno) SI VEDE, un cursore bianco
   la attraversa: non è indovinare al buio, è leggere il momento giusto. Coordinate schermo
   (cxs/cys = compagno già -cam, come il resto del blocco che lo disegna). */
function drawCompanionPlay(cxs, cys, cam, time) {
  /* FASE 2: nativa — palla a blocchi 2×2, arco/soglia raddoppiati, barra di tempismo più larga. */
  const pl = COMP.play; if (!pl) return;
  let bx, by;
  if (pl.phase === 'throw') {
    const f = Math.min(1, pl.t / PLAY_THROW), arc = Math.sin(f * Math.PI) * 64;
    bx = snap(P.x + (pl.tx - P.x) * f - cam.x); by = snap(P.y + (pl.ty - P.y) * f - cam.y - arc);
  } else if (pl.phase === 'chase' || pl.phase === 'catch') {
    bx = snap(pl.tx - cam.x); by = snap(pl.ty - cam.y + (Math.sin(time / 140) > 0 ? -4 : 0)); // un filo di vita mentre aspetta
  } else { bx = cxs; by = cys - 72; } // 'return': il compagno se la porta dietro
  rect(bx - 1, by - 1, 2, 2, '#e8763c'); rect(bx - 3, by - 1, 2, 2, '#c65a2e'); rect(bx + 1, by - 1, 2, 2, '#c65a2e'); rect(bx - 1, by - 3, 2, 2, '#f2935c'); rect(bx - 1, by + 1, 2, 2, '#a8451f');
  if (pl.phase !== 'catch') return;
  const W = 64, H = 12, x0 = cxs - W / 2, y0 = cys - 104;
  rect(x0 - 4, y0 - 4, W + 8, H + 8, '#2a2115');                     // cornice
  rect(x0, y0, W, H, '#4a3a26');                                     // fondo
  rect(x0 + PLAY_PERFECT[0] * W, y0, (PLAY_PERFECT[1] - PLAY_PERFECT[0]) * W, H, '#c79a3c'); // zona d'oro
  const cur = x0 + Math.min(1, pl.t / PLAY_CATCH) * W;
  rect(Math.round(cur), y0 - 2, 2, H + 4, '#fff');                   // cursore: dove sei ORA
}
/* MERAVIGLIE: il disegno vive in wonderart.js (modulo puro) così si può guardare e
   rifinire anche fuori dal gioco, nella pagina /wonders. */
function drawLandmark(type, sx, sy, time) {
  ctx.save(); ctx.translate(sx, sy); ctx.scale(2, 2); sx = 0; sy = 0;
  /* ANCORATE alla griglia dei pixel fisici: senza snap, mentre il player cammina la camera
     scorre di frazioni di pixel e tutta la struttura VIBRA (sembra che l'animazione corra
     con te). Le fasi delle animazioni vengono SOLO dal tempo, mai dalle coordinate. */
  const x = snap(sx), y = snap(sy);
  /* il disegno rifinito a mano lo sceglie drawWonder stessa: così vale anche nel Libro e
     nelle pagine di prova, non solo qui */
  drawWonder(BRUSH, type, x, y, time);
  ctx.restore();
}
/* staccionata: parte ORIZZONTALE (assi che corrono in larghezza, per i lati sopra/sotto) e/o
   VERTICALE (assi in altezza, per i lati sinistro/destro). Un angolo ha entrambe → giunzione a L. */
export function drawFence(sx, sy, fv, fh) {
  /* FASE 2: nativa a piena TS (era scalata 2× disegnando su TS/2 come se fosse la vecchia
     tile da 16px — ora usa la tile vera). */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  if (fh === undefined) fh = true;                                    // compat: default orizzontale
  if (fh) {                                                           // assi orizzontali + montanti verticali
    rect(sx, sy + 14, TS, 4, '#a97a4c'); rect(sx, sy + 22, TS, 4, '#8a5f38');
    px(sx + 8, sy + 14, '#8a5f38'); px(sx + 20, sy + 24, '#6e4a2a'); // venatura del legno
    rect(sx + 4, sy + 6, 4, 22, '#8a5f38'); px(sx + 4, sy + 6, '#c79a66'); px(sx + 6, sy + 6, '#c79a66');
    rect(sx + 22, sy + 6, 4, 22, '#8a5f38'); px(sx + 22, sy + 6, '#c79a66'); px(sx + 24, sy + 6, '#c79a66');
  }
  if (fv) {                                                           // assi VERTICALI + traverse orizzontali
    rect(sx + 14, sy, 4, TS, '#a97a4c'); rect(sx + 22, sy, 4, TS, '#8a5f38');
    px(sx + 14, sy + 10, '#8a5f38'); px(sx + 24, sy + 20, '#6e4a2a'); // venatura del legno
    rect(sx + 6, sy + 4, 22, 4, '#8a5f38'); px(sx + 6, sy + 4, '#c79a66'); px(sx + 6, sy + 6, '#c79a66');
    rect(sx + 6, sy + 22, 22, 4, '#8a5f38'); px(sx + 6, sy + 22, '#c79a66'); px(sx + 6, sy + 24, '#c79a66');
  }
  ctx.restore();
}
/* CANCELLO del cortile: il varco di 2 caselle nella staccionata (a sud, lontano dalla porta)
   NON era altro che un buco — indistinguibile da "manca un pezzo di recinto". Due montanti
   più alti della staccionata normale + un architrave che li unisce lo rendono un varco
   VOLUTO (regola ferrea n.4, segnalato guardando lo screenshot).
   Si chiude visto da FUORI (appena si esce dal cortile), con un'ANIMAZIONE — non un flip
   istantaneo e NON una serranda che scende: sono due ANTE A BATTUTA, incernierate ognuna al
   proprio montante ESTERNO, che si chiudono ruotando verso il centro (`closeT` 0→1, vedi
   `gateClosingProgress()` in park.js) fino a toccarsi — a chiusura fatta compare un lucchetto
   nel punto in cui combaciano. `open=true` = ante spalancate, niente da disegnare oltre
   l'arco. Chiamata una volta per cella (`side` 'l'/'r'): il lucchetto lo disegna solo la 'r'
   (altrimenti comparirebbe due volte, una per anta). */
export function drawGate(sx, sy, side, open = true, closeT = 1) {
  /* FASE 2: nativa a piena TS (era su TS/2 sotto uno scale(2,2)). */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const post = '#8a5f38', cap = '#c79a66', beam = '#a97a4c', beamHi = '#e0b97c';
  const outer = side === 'l' ? sx + 2 : sx + TS - 8;       // montante sul lato ESTERNO del varco
  rect(outer, sy - 6, 6, TS + 6, post);                     // più alto della staccionata: si vede da lontano
  px(outer, sy - 6, cap); px(outer + 2, sy - 6, cap); px(outer + 4, sy - 6, cap);
  rect(sx, sy - 4, TS, 6, beam);                            // architrave: le due metà si toccano al centro
  rect(sx, sy - 4, TS, 2, beamHi);
  if (!open) {
    const t = Math.max(0, Math.min(1, closeT));
    const leaf = shade8(post, 1.12), edge = shade8(post, 0.8);
    const w = Math.round((TS - 8) * t); // l'anta CRESCE dal montante verso il centro, non scende dall'alto
    if (w > 0) {
      if (side === 'l') { rect(outer + 6, sy + 2, w, TS - 6, leaf); rect(outer + 4 + w, sy + 2, 2, TS - 6, edge); }
      else { const x0 = outer - w; rect(x0, sy + 2, w, TS - 6, leaf); rect(x0, sy + 2, 2, TS - 6, edge); }
    }
    if (side === 'r' && t >= 1) drawGateLock(sx, sy + 12); // lucchetto dove le due ante si toccano
  }
  ctx.restore();
}
function drawGateLock(sx, sy) {
  rect(sx - 4, sy, 8, 6, '#e0b97c'); px(sx - 4, sy - 2, '#e0b97c'); px(sx + 2, sy - 2, '#e0b97c'); // staffa
  rect(sx - 4, sy + 6, 8, 6, '#3a2e20');                                                             // corpo
}
/* STAGNO del parco (3×2): ACQUA VERA del gioco (stesse onde/riflessi del mondo) — ma è solo
   decorazione su una casella di parco, quindi NON ci si pesca. Riva scura tutt'attorno + ninfea. */
export function drawParkPond(sx, sy, ppx, ppy, tx, ty, time) {
  groundTile(WATER, tx, ty, sx, sy, time, 0);                         // acqua identica a quella del mondo (zona prati)
  if (ppx === 0) rect(sx, sy, 1, TS, '#3d7f97');                       // riva scura sui lati ESTERNI del 3×2
  if (ppx === 2) rect(sx + TS - 1, sy, 1, TS, '#3d7f97');
  if (ppy === 0) rect(sx, sy, TS, 1, '#3d7f97');
  if (ppy === 1) rect(sx, sy + TS - 1, TS, 1, '#3d7f97');
  if (ppx === 1 && ppy === 0) { rect(sx + 4, sy + 8, 6, 4, '#4faa5e'); px(sx + 6, sy + 9, '#7ed08a'); px(sx + 7, sy + 8, '#e88ab0'); } // ninfea + fiorellino
}
/* AIUOLA (piatta): zolla di terra con fiori fitti e colorati. */
export function drawFlowerbed(sx, sy, tx, ty) {
  /* FASE 2: nativa — 7 fiori invece di 5 (più densità nello spazio raddoppiato), a blocchi 2×2. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  rect(sx + 6, sy + 8, 20, 20, '#6b4a2e'); rect(sx + 4, sy + 12, 24, 12, '#6b4a2e'); rect(sx + 6, sy + 10, 24, 4, '#7d5838');
  const cols = ['#e08a8a', '#b79be6', '#f2dd7a', '#f6f2e4', '#8fc9e6'];
  for (let i = 0; i < 7; i++) {
    const fx = sx + 8 + Math.floor(vhash(tx, ty, 70 + i) * 16), fy = sy + 12 + Math.floor(vhash(tx, ty, 80 + i) * 12);
    const cc = cols[Math.floor(vhash(tx, ty, 90 + i) * cols.length)];
    rect(fx, fy - 2, 2, 2, cc); rect(fx - 2, fy, 2, 2, cc); rect(fx + 2, fy, 2, 2, cc); rect(fx, fy + 2, 2, 2, cc); rect(fx, fy, 2, 2, '#f2dd7a');
  }
  ctx.restore();
}
/* chimera del parco: forma guidata dai parametri delle specie (taglia, becco/corni, ali, coda, serpente) */
/* creatura del parco = proiezione laterale dello STESSO modello voxel VIVO (come libro/museo),
   con CONTORNO scuro così stacca dallo sfondo (anche verde su verde). Cache per composizione. */
let sniffAt = -9e9, sniffKey = '', sniffBest = null;   // memoria del "fiuto" (vedi sopra)
const creCache = new Map();
/* sprite della creatura in una VISTA: 'side' (di profilo, X orizzontale · Z profondità),
   'front'/'back' (di fronte/spalle, Z orizzontale · X profondità → head-on, più stretto).
   Front mostra gli occhi, back no: così muovendosi in su/giù il compagno "gira". */
function creatureSprite(a, view, opts) {
  view = view || 'side';
  const o = opts || {};
  const key = a.c.skull + '|' + a.c.torso + '|' + a.c.leg + '|' + view + (o.noLegs ? '|nl' : '') + (o.addWings ? '|w' + o.addWings.join('') : '') + (o.wingFlap ? '|f' + o.wingFlap : '');
  let cv = creCache.get(key); if (cv !== undefined) return cv;
  cv = null;
  try {
    const c = spById[a.c.skull], t = spById[a.c.torso], z = spById[a.c.leg];
    const spec = { heads: [{ sp: c, horns: partParams(c).horns }], chest: t, arms: [z, z], legs: [z, z], tails: [t] };
    const vox = buildFleshVoxels(clampSpec(spec), opts);
    /* asse orizzontale (h), profondità (d) per l'ordine pittore (far→near). La verticale è sempre y.
       FRONT: la TESTA (x piccolo) deve stare DAVANTI (vicina) → si vede la FACCIA; con la profondità
       non invertita il corpo copriva la testa e l'animale sembrava di spalle. BACK all'opposto. */
    const proj = view === 'side' ? v => [v.x, v.z]
      : view === 'front' ? v => [v.z, -v.x]         // testa vicina → faccia visibile
        : v => [v.z, v.x];                          // back: testa lontana (si vede la schiena)
    let mnh = 9e9, mxh = -9e9, mny = 9e9, mxy = -9e9, mnd = 9e9, mxd = -9e9;
    for (const v of vox) { const [h, d] = proj(v); mnh = Math.min(mnh, h); mxh = Math.max(mxh, h); mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y); mnd = Math.min(mnd, d); mxd = Math.max(mxd, d); }
    const spanH = mxh - mnh + 1, spanY = mxy - mny + 1, dr = Math.max(1, mxd - mnd);
    const pad = 1, cw = spanH + pad * 2, ch = spanY + pad * 2;
    /* UN pixel per voxel. Prima ne servivano due perché il modello era a risoluzione metà:
       la creatura veniva su grande come serve, ma coi pixel grossi il doppio di tutto il resto
       del gioco (segnalato con foto). Ora il modello stesso è a risoluzione doppia (`R` in
       bones.js), quindi la taglia resta questa e i pixel sono quelli del mondo. */
    const S2 = 1;
    cv = document.createElement('canvas'); cv.width = cw * S2; cv.height = ch * S2;
    const g = cv.getContext('2d');
    const grid = {}; const cells = [];
    for (const v of vox.slice().sort((p, q) => (proj(p)[1]) - (proj(q)[1]))) {  // lontano→vicino
      const [h, d] = proj(v);
      const gx = pad + (h - mnh), gy = pad + (mxy - v.y);
      const zt = (d - mnd) / dr;
      let col = v.k === 'eye' ? (view === 'back' ? (v.col || '#c8b078') : '#201a14') : (v.col || '#c8b078'); // di spalle niente occhi
      if (col !== '#201a14' && v.col) col = zt < 0.34 ? shade8(v.col, 0.7) : zt < 0.67 ? v.col : shade8(v.col, 1.18);
      grid[gx + ',' + gy] = 1; cells.push([gx, gy, col]);
    }
    /* contorno scuro attorno alla silhouette */
    g.fillStyle = '#20160f';
    for (const k in grid) { const [gx, gy] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nk = (gx + dx) + ',' + (gy + dy); if (!grid[nk]) g.fillRect((gx + dx) * S2, (gy + dy) * S2, S2, S2); } }
    for (const [gx, gy, col] of cells) { g.fillStyle = col; g.fillRect(gx * S2, gy * S2, S2, S2); }
    cv._ax = (spanH / 2 + pad) * S2; // ancoraggio orizzontale (centro)
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
function drawCreature(a, sx, sy, swim, noShadow, spriteOpts) {
  /* FASE 2: nativa — creatureSprite ora produce già una canvas a risoluzione doppia (vedi
     sopra), quindi qui basta raddoppiare le posizioni/ampiezze, non serve più scale(2,2). */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const face = a.face || (a.dir < 0 ? 'left' : 'right');
  const view = face === 'up' ? 'back' : face === 'down' ? 'front' : 'side';
  const cv = creatureSprite(a, view, spriteOpts);
  const arch = creatureArch(a);
  const ph = (a.anim || 0) * 7;              // fase (avanza col movimento)
  const idle = frameTime / 600;
  let hop = 0, sqX = 1, sqY = 1, skew = 0, lift = 0, sh = 10;
  if (arch === 'fly') {                       // VOLA: fluttua sempre, ali che sbattono (scaleY pulsante veloce)
    lift = 12 + Math.round(Math.sin(idle * 3) * 4);
    sqY = 1 + Math.sin(frameTime / 90) * 0.10; sqX = 1 - Math.sin(frameTime / 90) * 0.06;
    sh = 8;
  } else if (arch === 'snake') {              // STRISCIA: ondeggia orizzontale, quasi niente saltello
    skew = Math.sin(ph) * 0.22; sqY = 1 + Math.sin(idle * 2) * 0.03; hop = 0; sh = 12;
  } else if (arch === 'hop') {                // SALTELLA: salto ampio + schiacciata all'atterraggio
    const s = Math.abs(Math.sin(ph)); hop = -Math.round(s * 8); sqY = 1 - (1 - s) * 0.14; sqX = 1 + (1 - s) * 0.10;
    sh = Math.max(6, Math.round(12 - s * 6));
  } else {                                    // CAMMINA: trotto morbido + respiro
    const step = Math.sin(ph); hop = Math.round(-Math.abs(step) * 4);
    sqX = 1 - step * 0.05; sqY = 1 + step * 0.05 + Math.sin(idle) * 0.03;
  }
  if (swim || noShadow) { hop = 0; lift = 0; skew = 0; sqX = 1; sqY = 1; }
  const bob = swim ? Math.round(Math.sin(frameTime / 520) * 2) : 0;
  if (!swim && !noShadow) shadow(sx + 16, sy + 26, sh);
  if (!cv) { const b = spColor[a.c.torso] || '#c8b078'; rect(sx + 8, sy + 10 + hop - lift + bob, 18, 12, b); ctx.restore(); return; }
  const d = face === 'left' ? -1 : 1;   // specchio solo di profilo
  const w = cv.width * sqX, h = cv.height * sqY;
  const dx = sx + 16 - w / 2, dy = sy + 28 - h + hop - lift + bob;
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  const paint = () => {
    ctx.save();
    if (d < 0) { ctx.transform(sqX, 0, skew, sqY, dx, dy); }
    else { ctx.transform(-sqX, 0, skew, sqY, dx + w, dy); }
    ctx.drawImage(cv, 0, 0);
    ctx.restore();
  };
  if (swim) {
    const wl = sy + 18 + bob;                                  // pelo dell'acqua: sotto sparisce
    ctx.save(); ctx.beginPath(); ctx.rect(sx - 16, sy - 80, 64, wl - (sy - 80)); ctx.clip();
    paint(); ctx.restore();
    const ph2 = Math.floor(frameTime / 180) % 2;               // increspature attorno al corpo
    rect(sx + 4 - ph2 * 2, wl, 10, 2, '#bfe6f2'); rect(sx + 20 + ph2 * 2, wl, 8, 2, '#bfe6f2');
    rect(sx + 10, wl + 2, 12, 2, '#8fc9dd');
    if (ph2) { px(sx + 2, wl + 2, '#dff3fa'); px(sx + 26, wl + 2, '#dff3fa'); }
  } else paint();
  ctx.imageSmoothingEnabled = sm;
  ctx.restore();
}

/* imbocco di grotta sulla montagna: arco scuro nella roccia, con qualche scintillio */
export function drawCaveEntrance(sx, sy, time) {
  /* FASE 2: nativa — roccia con quarto tono in più, cristalli più leggibili. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  shadow(sx + 16, sy + 30, 16);
  rect(sx + 2, sy + 4, 28, 28, '#6b6560'); rect(sx + 2, sy + 4, 28, 4, '#837c74');   // roccia
  rect(sx + 2, sy + 4, 4, 28, shade8('#6b6560', 1.3)); rect(sx + 26, sy + 4, 4, 28, shade8('#6b6560', 0.65)); // volume: luce sx / ombra dx
  rect(sx + 6, sy + 10, 20, 22, '#15131a'); rect(sx + 8, sy + 8, 16, 4, '#242030');  // arco buio
  px(sx + 6, sy + 6, '#7f776a'); px(sx + 24, sy + 6, '#7f776a');
  px(sx + 6, sy + 12, '#2a2530'); px(sx + 24, sy + 12, '#1a1620'); // alone dell'arco: sinistra un filo di luce riflessa, destra buio pieno
  rect(sx + 4, sy + 6, 2, 8, shade8('#6b6560', 1.15)); // quarto tono: scaglia di roccia in luce
  if (Math.floor(time / 500) % 2) { px(sx + 12, sy + 18, '#6fd6e0'); px(sx + 18, sy + 22, '#6fd6e0'); } // cristalli dentro
  ctx.restore();
}
/* X della mappa del tesoro: dipinta sul terreno, scintilla che lampeggia */
function drawXmark(sx, sy, time) {
  /* FASE 2: nativa — tratti più spessi (2px), scintille più ampie. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  for (let i = 0; i < 8; i++) {
    rect(sx + 8 + i * 2, sy + 8 + i * 2, 2, 2, '#b8402e'); rect(sx + 8 + i * 2, sy + 10 + i * 2, 2, 2, '#8e2f22');
    rect(sx + 22 - i * 2, sy + 8 + i * 2, 2, 2, '#b8402e'); rect(sx + 22 - i * 2, sy + 10 + i * 2, 2, 2, '#8e2f22');
  }
  if (Math.floor(time / 400) % 2) { px(sx + 16, sy + 2, '#ffe98a'); px(sx + 4, sy + 24, '#ffe98a'); }
  ctx.restore();
}
/* PORTALE DI RITORNO (goHome): riporta dove eri, a uso singolo. Sta in mezzo all'atrio.
   Era un quadrato viola di 20 pixel con due puntini, e per giunta disegnato otto pixel più in
   là del punto in cui si attiva. Ora è una PORTA vera, centrata su quel punto (cx, cy):
     · un arco di pietra con la chiave di volta, e sulla chiave la casetta d'oro — dice "ritorno"
       senza scriverlo;
     · dentro, un vortice a spirale che gira (colore dal raggio e dall'angolo, fase dal TEMPO:
       REGOLE FERREE #1), con l'orlo chiaro che brilla;
     · a terra un anello di pietra con le rune che si accendono una dopo l'altra e un alone;
     · scintille che salgono dal centro.
   Contorno scuro ovunque, perché stacchi dal parquet (REGOLE FERREE #4). */
const PORTAL_SPIRAL = ['#1c1030', '#3a2470', '#6a4fa0', '#9a7ee0', '#c7b6f2'];
export function drawReturnPortal(cx, cy, time) {
  ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); 
  const base = 12;                                   // riga del pavimento sotto il portale
  const t = (time || 0) / 1000;
  /* alone a terra che respira */
  const glow = 0.22 + 0.08 * (Math.floor((time || 0) / 400) % 2);
  for (let yy = -9; yy <= 9; yy++) {
    const w = Math.round(30 * Math.sqrt(1 - (yy * yy) / 90));
    rect(-w, base + yy, w * 2, 1, 'rgba(214,200,255,' + glow.toFixed(2) + ')');
  }
  /* anello di pietra con 8 rune */
  for (let a = 0; a < 64; a++) {
    const ang = (a / 64) * Math.PI * 2, x = Math.round(Math.cos(ang) * 22), y = Math.round(Math.sin(ang) * 8);
    rect(x, base + y, 2, 2, Math.sin(ang) < 0 ? '#5c5470' : '#3a3040');
    px(x, base + y, Math.sin(ang) < 0 ? '#9a92a8' : '#6c6480');
  }
  const accesa = Math.floor((time || 0) / 180) % 8;
  for (let r = 0; r < 8; r++) {
    const ang = (r / 8) * Math.PI * 2 + Math.PI / 8, x = Math.round(Math.cos(ang) * 22), y = Math.round(Math.sin(ang) * 8);
    const on = r === accesa || r === (accesa + 7) % 8;
    rect(x - 1, base + y - 1, 2, 2, on ? '#f3ecda' : '#9a7ee0');
  }
  /* ombra dell'arco sul pavimento */
  rect(-19, base - 1, 38, 2, 'rgba(20,12,30,.25)');
  /* ARCO: due pilastri e la volta, pietra a conci */
  const top = base - 50;
  for (const sx of [-20, 13]) {
    rect(sx, top + 14, 8, base - top - 13, '#241c2c');
    rect(sx + 1, top + 15, 6, base - top - 15, '#7a7288');
    rect(sx + 1, top + 15, 2, base - top - 15, '#9a92a8');
    rect(sx + 6, top + 15, 1, base - top - 15, '#5c5470');
    for (let yy = top + 22; yy < base; yy += 8) rect(sx + 1, yy, 6, 1, '#5c5470');
    rect(sx - 1, base - 3, 10, 4, '#241c2c'); rect(sx, base - 2, 8, 2, '#8a82a0');                   // basamento
  }
  for (let a = 0; a <= 20; a++) {                                                                   // volta a semicerchio
    const ang = Math.PI + (a / 20) * Math.PI, x = Math.round(Math.cos(ang) * 16.5), y = Math.round(Math.sin(ang) * 14);
    rect(x - 4, top + 15 + y - 3, 8, 7, '#241c2c');
  }
  for (let a = 0; a <= 20; a++) {
    const ang = Math.PI + (a / 20) * Math.PI, x = Math.round(Math.cos(ang) * 16.5), y = Math.round(Math.sin(ang) * 14);
    rect(x - 3, top + 15 + y - 2, 6, 5, a % 4 === 0 ? '#5c5470' : '#7a7288');
    px(x - 2, top + 15 + y - 2, '#9a92a8');
  }
  /* VORTICE: spirale dentro l'arco */
  const vy = top + 30, RX = 12, RY = 20;
  for (let yy = -RY; yy <= RY; yy++) for (let xx = -RX; xx <= RX; xx++) {
    const nx = xx / RX, ny = yy / RY, rn = Math.sqrt(nx * nx + ny * ny);
    if (rn > 1) continue;
    const ang = Math.atan2(ny, nx);
    const band = Math.floor(((ang / (Math.PI * 2)) * 3 + rn * 3.2 - t * 1.6) * 2);
    let k = ((band % 3) + 3) % 3 + (rn < 0.45 ? 2 : rn < 0.75 ? 1 : 0);
    if (rn > 0.86) k = (Math.floor(t * 4 + ang * 2) & 1) ? 4 : 3;                                  // orlo che brilla
    px(xx, vy + yy, PORTAL_SPIRAL[Math.min(4, k)]);
  }
  rect(-2, vy - 3, 4, 6, '#f3ecda'); rect(-1, vy - 4, 2, 8, '#ffffff');                               // cuore di luce
  /* chiave di volta con la casetta d'oro */
  rect(-6, top - 1, 12, 11, '#241c2c'); rect(-5, top, 10, 9, '#8a82a0'); rect(-5, top, 10, 1, '#b0a8c0');
  px(0, top + 2, '#e8c34a'); rect(-1, top + 3, 3, 1, '#e8c34a'); rect(-2, top + 4, 5, 1, '#e8c34a');
  rect(-2, top + 5, 5, 3, '#e8c34a'); px(0, top + 6, '#6b4f14'); px(0, top + 7, '#6b4f14');
  /* scintille che salgono dal vortice */
  for (let i = 0; i < 6; i++) {
    const life = ((time || 0) / 28 + i * 23) % 46;
    const x = Math.round(Math.sin(i * 2.1 + life / 9) * (4 + i)), y = Math.round(vy + 14 - life);
    if (y < top - 4) continue;
    rect(x, y, i % 2 ? 1 : 2, i % 2 ? 1 : 2, life < 30 ? '#f3ecda' : '#c7b6f2');
  }
  ctx.restore();
}

/* SEGNALINO DELLA META ("tocca dove andare"): senza, non si capisce se il tocco è stato
   raccolto e si tocca due o tre volte. Anello che pulsa a scatti, mai una sfumatura.
   La fase viene dal TEMPO, non dalle coordinate schermo (REGOLE FERREE). */
function markerOn() { return prefOf('marker') !== false; }
function drawGoalMark(sx, sy, time) {
  /* FASE 2: nativa — anello a blocchi 2×2, raggio raddoppiato. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const step = Math.floor(time / 220) % 3;          // 3 fotogrammi netti
  const r = (3 + step) * 2;
  const col = step === 2 ? '#f6efdd' : '#f2c53d';
  for (let a = 0; a < 8; a++) {                      // ottagono: un anello leggibile
    const ang = a * Math.PI / 4;
    rect(sx + Math.round(Math.cos(ang) * r) - 1, sy + Math.round(Math.sin(ang) * r) - 1, 2, 2, col);
  }
  rect(sx - 1, sy - 1, 2, 2, '#f6efdd');
  rect(sx - 1, sy + 1, 2, 2, '#8a5f38');
  ctx.restore();
}

/* ---------- eroe (e barca) ---------- */
let frameTime = 0; // aggiornato da render(): serve alle animazioni del player
/* AURA del PLATINO: scintille dorate che orbitano attorno al player, twinkle dal TEMPO (mai da sx/sy).
   Attiva se hai ALMENO un trofeo al Platino. */
function drawPlatinumAura(sx, sy) {
  /* FASE 2: nativa — orbita più ampia, scintille a blocchi 2×2. */
  if (!(S.trophies && Object.values(S.trophies).some(t => t >= 4))) return;
  const cy = sy + 12;
  for (let i = 0; i < 6; i++) {
    const ph = frameTime / 800 + i * (Math.PI / 3), r = 22 + Math.sin(frameTime / 320 + i) * 4;
    const gx = Math.round(sx + Math.cos(ph) * r), gy = Math.round(cy + Math.sin(ph) * r * 0.62);
    const tw = Math.floor(frameTime / 150 + i) % 3;
    if (tw === 0) rect(gx - 1, gy - 1, 2, 2, '#fff8d0'); else if (tw === 1) rect(gx - 1, gy - 1, 2, 2, '#f6d24a');
  }
}
/* MEZZI RIFINITI A MANO (banca sprite): il disegno porta SOLO il VEICOLO (scafo, telaio, rotelle)
   — l'EROE resta quello VIVO del gioco (look, cappello, animazione). Gli sprite usano una CORNICE
   FISSA (VEH_FRAME): l'ancora cade sull'ORIGINE del player (colonna VEH_OX = sx, riga VEH_OY = y0),
   così drawSprite li posa esattamente a (sx, y0) — WYSIWYG con l'editor, e spostare un pixel al
   bordo non riancora più nulla. 'side' vale per left/right (a sinistra si specchia). */
const VEH_FRAME = { w: 32, h: 34, ox: 16, oy: 12 };
/* I MEZZI DISEGNATI A MANO SONO A SCALA VECCHIA. Motoscafo, bici e pattini in banca sono
   stati disegnati quando Digsy era alto 16px: dentro la cornice 32×34 occupano una dozzina di
   pixel, e col personaggio ridisegnato a 32 il mezzo diventa un giocattolo sotto la pancia,
   con le gambe che spuntano fuori (segnalato con foto). Finché restano così si disegnano
   RADDOPPIATI, che è la loro taglia vera; appena verranno ridisegnati a piena cornice nello
   Sprite Studio, il raddoppio si spegne da solo e si torna al pixel nativo. */
const vehFit = new Map();
function vehSpriteScale(id) {
  if (vehFit.has(id)) return vehFit.get(id);
  const d = spriteDef(id);
  let k = 1;
  if (d) {
    let mn = 9e9, mx = -9e9;
    d.rows.forEach(row => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') { mn = Math.min(mn, x); mx = Math.max(mx, x); } });
    if (mx >= mn && mx - mn + 1 < 24) k = 2;                 // più stretto del corpo di Digsy: è mezza scala
  }
  vehFit.set(id, k);
  return k;
}
function bankVeh(kind, sx, y0) {
  const view = P.dir === 'up' ? 'up' : P.dir === 'down' ? 'down' : 'side';
  const id = 'vehicle:' + kind + ':' + view;
  if (!hasSprite(id)) return false;
  const k = vehSpriteScale(id);
  const flip = P.dir === 'left';
  ctx.save();
  if (flip) { ctx.translate(sx * 2, 0); ctx.scale(-1, 1); }
  if (k !== 1) { ctx.translate(sx, y0); ctx.scale(k, k); drawSprite({ rect }, id, 0, 0); }
  else drawSprite({ rect }, id, sx, y0);
  ctx.restore();
  return true;
}
function drawPlayer() {
  const sx = snap(P.x - cam.x), sy = snap(P.y - cam.y);
  if (isMounted()) { drawFlyingMount(sx, sy); return; }                              // cavalcatura volante di grotta
  if (onBoat()) { (S.tools.motorboat ? drawMotorboat : drawBoat)(sx, sy); return; } // barca/motoscafo (la banca è dentro)
  shadow(sx, sy + 32, 14);
  if (P.digging) { drawDigging(sx, sy); return; }
  drawPlatinumAura(sx, sy);                                             // AURA dorata glitterata: premio del PLATINO
  const fr = (P.moving ? (Math.floor(P.anim * 7) % 2) : 0); const bob = (P.moving && fr === 1) ? -2 : 0;
  const gear = footGear();
  const bank = gear && hasSprite('vehicle:' + gear + ':' + (P.dir === 'up' ? 'up' : P.dir === 'down' ? 'down' : 'side'));
  const fb = gear === 'bike' && (P.dir === 'up' || P.dir === 'down'); // vista fronte/retro
  if (gear === 'bike' && !fb && !bank) drawBike(sx, sy + bob, P.moving); // profilo procedurale: DIETRO l'eroe
  drawHero(null, sx - 16, sy + bob, P.dir, fr);
  if (bank && gear === 'skates') drawBankSkates(sx, sy + bob, fr);    // pattini a mano ANIMATI, ATTACCATI ai piedi (bob incluso; l'animazione è orizzontale, non si annulla col bob)
  else if (bank) bankVeh(gear, sx, sy + bob);                        // disegno a mano di bici (SOPRA l'eroe)
  else if (gear === 'skates') drawSkates(sx, sy + bob, fr);           // rotelle ai piedi DAVANTI
  else if (fb) drawBikeFB(sx, sy + bob, P.moving, P.dir);             // fronte/retro: DAVANTI (manubrio/ruota visibili)
}
/* PATTINI a mano ANIMATI: disegna lo sprite della banca spezzato in due (piede sinistro cols<ox,
   destro cols>=ox); i due pattini si ALTERNANO su/giù col frame di camminata (fr), sincronizzati
   coi piedi dell'eroe. Fermi quando non ci si muove. `y0` porta già il bob dell'eroe. */
export function drawBankSkates(sx, y0, fr) {
  /* FASE 2: nativo — lo sprite di banca (spriteDef) resta alla sua griglia propria (un
     formato dati a parte, non un disegno a numeri qui dentro), quindi qui basta raddoppiare
     lo SPAZIO in cui viene proiettato: un pixel del disegno diventa un blocco 2×2 nativo. */
  ctx.save(); ctx.translate(sx, y0); sx = 0; y0 = 0;
  const view = P.dir === 'up' ? 'up' : P.dir === 'down' ? 'down' : 'side';
  const d = spriteDef('vehicle:skates:' + view);
  if (!d) { ctx.restore(); return false; }
  const ox = VEH_FRAME.ox, oy = VEH_FRAME.oy;
  let sL = 0, nL = 0, sR = 0, nR = 0;
  for (let r = 0; r < d.rows.length; r++) for (let c = 0; c < d.rows[r].length; c++) {
    if (d.rows[r][c] === '.') continue; const rel = c - ox;
    if (c < ox) { sL += rel; nL++; } else { sR += rel; nR++; }
  }
  const restL = nL ? sL / nL : -3.5, restR = nR ? sR / nR : 3.5;
  const FEET = { down: [[-3.5, 2.5], [-4.5, 3.5]], up: [[-3.5, 2.5], [-4.5, 3.5]], side: [[-3.5, 4.5], [-1, 0]] };
  const foot = P.moving ? FEET[view][fr] : [restL, restR];
  const dxL = Math.round(foot[0] - restL) * 2, dxR = Math.round(foot[1] - restR) * 2;
  const flip = P.dir === 'left';
  if (flip) { ctx.save(); ctx.translate(sx * 2, 0); ctx.scale(-1, 1); }
  for (let r = 0; r < d.rows.length; r++) {
    const row = d.rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]; if (ch === '.') continue;
      const col = d.pal[ch]; if (!col) continue;
      rect(sx - ox * 2 + c * 2 + (c < ox ? dxL : dxR), y0 - oy * 2 + r * 2, 2, 2, col);
    }
  }
  if (flip) ctx.restore();
  ctx.restore(); return true;
}
/* per lo SPRITE STUDIO (/sprites): rende un mezzo (eroe + veicolo) in una direzione, statico.
   NON usato in gioco — è solo la base procedurale da rifinire a mano. */
export function drawVehiclePreview(kind, sx, sy, dir) {
  const sd = P.dir, sm = P.moving, sg = P.digging;
  P.dir = dir; P.moving = false; P.digging = null;
  /* l'EROE è disegnato a parte e PROTETTO: se il suo disegno fallisce (stato incompleto nella
     pagina di editing) il VEICOLO si vede lo stesso, invece di lasciare la casella tutta nera. */
  const hero = (hx, hy) => { try { drawHero(null, hx, hy, dir, 0); } catch (e) { /* preview: il mezzo resta */ } };
  try {
    const fb = dir === 'up' || dir === 'down';
    if (kind === 'boat') { hero(sx - 16, sy - 10); drawBoat(sx, sy, true); }
    else if (kind === 'motorboat') { hero(sx - 16, sy - 8); drawMotorboat(sx, sy, true); }
    else if (kind === 'mount') { try { drawFlyingMount(sx, sy); } catch (e) { /* preview */ } }
    else if (kind === 'bike') { if (!fb) drawBike(sx, sy, false); hero(sx - 16, sy); if (fb) drawBikeFB(sx, sy, false, dir); }
    else if (kind === 'skates') { hero(sx - 16, sy); drawSkates(sx, sy, 0); }
  } finally { P.dir = sd; P.moving = sm; P.digging = sg; }
}
/* cornice fissa dei mezzi (per lo Sprite Studio): l'ancora del disegno cade su (ox, oy). */
export { VEH_FRAME };
/* SOLO il veicolo (niente eroe) a (sx, sy), per SEMINARE l'editor di un verso nuovo. */
export function drawVehicleBody(kind, sx, sy, dir) {
  const sd = P.dir, sm = P.moving, sg = P.digging;
  P.dir = dir; P.moving = false; P.digging = null;
  try {
    const fb = dir === 'up' || dir === 'down';
    if (kind === 'boat') drawBoat(sx, sy, true);
    else if (kind === 'motorboat') drawMotorboat(sx, sy, true);
    else if (kind === 'mount') drawFlyingMount(sx, sy);
    else if (kind === 'bike') { if (!fb) drawBike(sx, sy, false); else drawBikeFB(sx, sy, false, dir); }
    else if (kind === 'skates') drawSkates(sx, sy, 0);
  } finally { P.dir = sd; P.moving = sm; P.digging = sg; }
}
/* rotelle da pattino sotto i piedi (4 ruote) */
export function drawSkates(sx, sy, fr) {
  /* FASE 2: nativo — ruote più grandi con un cerchio vero (non un puntino), asse distinto. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const wy = sy + 32 + (fr === 1 ? -2 : 0);
  for (const fx of [sx - 10, sx - 4, sx + 4, sx + 10]) {
    rect(fx - 1, wy, 2, 2, '#33291f'); rect(fx - 1, wy + 2, 2, 2, '#e0b040'); px(fx - 1, wy, shade8('#33291f', 1.5)); // asse con un filo di luce
  }
  ctx.restore();
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
export function drawBike(sx, sy, moving) {
  /* FASE 2: nativo — telaio a doppio spessore (non 1px), sella con imbottitura, manubrio
     con manopola distinta. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx - 2, wy = sy + 30;                                             // centro sotto il corpo
  bikeWheel(cx - 12, wy, 6.4, 6.4, moving); bikeWheel(cx + 12, wy, 6.4, 6.4, moving);
  rect(cx - 10, wy, 22, 2, '#c94f4a'); rect(cx - 10, wy, 22, 1, shade8('#c94f4a', 1.2)); // barra inferiore, con filo di luce sopra
  for (let i = 0; i < 10; i++) { px(cx - 10 + i, wy - i, '#d1655f'); px(cx + 10 - i, wy - i, '#d1655f'); } // telaio a V
  rect(cx - 1, wy - 12, 2, 12, '#c94f4a'); rect(cx - 1, wy - 12, 1, 12, shade8('#c94f4a', 1.2)); // reggisella
  rect(cx - 8, wy - 14, 10, 2, '#33291f'); rect(cx - 8, wy - 14, 10, 1, shade8('#33291f', 1.6)); // sella con imbottitura
  rect(cx + 10, wy - 14, 2, 12, '#7a6a58'); rect(cx + 8, wy - 14, 6, 2, '#33291f'); px(cx + 8, wy - 14, shade8('#33291f', 1.6)); // sterzo + manubrio con manopola
  ctx.restore();
}
/* bici di FRONTE (giù) / RETRO (su): disegnata DAVANTI all'eroe così si vede.
   Fronte: manubrio largo + ruota di taglio tra i piedi. Retro: sella/catarifrangente + ruota. */
export function drawBikeFB(sx, sy, moving, dir) {
  /* FASE 2: nativo — manopole distinte, portapacchi con due assi visibili. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const cx = sx - 2, wy = sy + 32;
  bikeWheel(cx, wy, 3.2, 7.2, moving);                                         // ruota di taglio (ovale stretto)
  rect(cx, wy - 10, 2, 8, '#c94f4a');                                           // forcella/telaio verticale
  if (dir === 'down') { // FRONTE: manubrio a T con le due manopole
    rect(cx - 10, sy + 18, 22, 2, '#33291f'); rect(cx - 10, sy + 16, 2, 2, '#33291f'); rect(cx + 8, sy + 16, 2, 2, '#33291f');
    px(cx, sy + 20, '#7a6a58');                                               // piantone
    rect(cx - 6, wy - 2, 2, 2, '#33291f'); rect(cx + 4, wy - 2, 2, 2, '#33291f');             // pedali
  } else {              // RETRO: sella + catarifrangente rosso, portapacchi
    rect(cx - 4, sy + 16, 10, 2, '#5c4229'); rect(cx - 2, sy + 18, 6, 2, '#3a2a18');
    rect(cx - 6, sy + 16, 1, 8, '#7a6a58'); rect(cx + 5, sy + 16, 1, 8, '#7a6a58'); // portapacchi: due assi
    rect(cx - 1, wy - 10, 2, 2, '#c94f4a'); rect(cx - 1, wy - 8, 2, 2, '#f2c53d');                     // catarifrangente
  }
  ctx.restore();
}
/* in barca: scafo che ondeggia, NIENTE camminata, scia quando ti muovi; pesca con lenza */
/* CAVALCATURA VOLANTE (grotta leggendario): fossile alato con l'eroe in groppa, in volo sopra
   la mappa. Ombra a terra STACCATA (dà l'altezza), ali che sbattono (fase dal tempo), bob
   d'aria, scia di scintille in movimento. Contorni scuri per staccare dallo sfondo. */
/* ALI della cavalcatura, sbattono (fase dal tempo). Di PROFILO: UNA grande ala dietro (verso la
   coda) che spazza su/indietro. Di FRONTE/SPALLE: aperte ai due lati, a ventaglio. */
/* CAVALCATURA VOLANTE dedicata: un rettile alato grande (l'Abissodonte), disegnato a mano in
   codice — corpo, collo+testa con corna, ali membranose che sbattono, coda con pinna, l'eroe
   SEDUTO in groppa (busto, gambe in sella). Colore dalla creatura + contorno scuro. 4 direzioni. */
/* eroe SEDUTO in groppa: busto+testa (gambe tagliate dal clip = in sella), all'altezza `topY` */
function seatHero(sx, topY, dir) {
  /* FASE 2: drawFlyingMount è ora nativa anche lei (niente più 2x ambiente da annullare):
     chiamata diretta, stessa unità di misura di tutto il resto. */
  ctx.save(); ctx.beginPath(); ctx.rect(sx - 20, topY - 16, 40, 40); ctx.clip();
  drawHero(null, sx - 16, topY, dir, 0);
  ctx.restore();
}
/* ALA in stile VOXEL: colonne PIENE a ventaglio (niente membrana liscia coi buchi), 3 toni +
   contorno scuro come la creatura, così è coerente e ATTACCATA al dorso. `out`=+1/-1 il verso in
   cui si apre; `flap` -1..1 il battito (fase dal TEMPO). */
function voxWing(rx, ry, out, flap, base) {
  /* FASE 2: nativa (drawFlyingMount è nativa, questa cella cresce di conseguenza: raggio
     raddoppiato, 14 colonne invece di 7, così l'ala copre lo stesso spazio reale di prima). */
  const M = base, L = shade8(base, 1.22), Dk = shade8(base, 0.66), LN = '#20160f';
  const n = 14, cells = [];
  for (let i = 0; i <= n; i++) {
    const cx = rx + out * i;
    const rise = Math.round(i * 1.35) + Math.round(flap * 4 * (i / n));   // il bordo d'attacco sale/scende
    const top = ry - rise, bot = ry + 4 - Math.round(i * 0.4);
    for (let y = top; y <= bot; y++) cells.push([cx, y, y === top ? L : (y === bot ? Dk : M)]);
  }
  const set = new Set(cells.map(c => c[0] + ',' + c[1]));                 // contorno scuro attorno alla sagoma
  for (const [cx, cy] of cells) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (cx + ox) + ',' + (cy + oy); if (!set.has(k)) px(cx + ox, cy + oy, LN); }
  for (const [cx, cy, col] of cells) px(cx, cy, col);
}
export function drawFlyingMount(sx, sy) {
  /* FASE 2: nativa, niente più wrapper 2x. drawCreature resta FUORI ambito (non ridisegnata):
     riceve un'ancora in pixel nativi e si scala già da sola internamente, quindi va chiamata
     diretta (né controscala né raddoppio) — esattamente come seatHero chiama drawHero. */
  ctx.save();
  const mview = P.dir === 'up' ? 'up' : P.dir === 'down' ? 'down' : 'side';
  if (hasSprite('vehicle:mount:' + mview)) {
    shadow(sx, sy + 34, 12);
    const flip = P.dir === 'left';
    if (flip) { ctx.save(); ctx.translate(sx * 2, 0); ctx.scale(-1, 1); }
    drawSprite({ rect }, 'vehicle:mount:' + mview, sx, sy);
    if (flip) ctx.restore();
    ctx.restore(); return;
  }
  const obj = companionDrawObj();
  if (obj) obj.face = P.dir;                                  // STESSA creatura del parco/libro, ruota col player
  const spec = companionSpec();
  const base = (spec && spColor[spec.torso]) || '#8a6ab0';
  const LEG = shade8(base, 0.6), LEGD = shade8(base, 0.4);
  const dir = P.dir === 'left' ? -1 : 1;
  const view = P.dir === 'up' ? 'back' : P.dir === 'down' ? 'front' : 'side';
  /* la creatura del mount = STESSO Abissodonte, zampe raccolte (noLegs). Le ali le disegno in stile
     voxel dietro il corpo (attaccate al dorso), così restano coerenti e visibili in ogni vista. */
  const mopts = { noLegs: true };
  const cv = creatureSprite(obj, view, mopts);
  const cvH = cv ? cv.height : 32;                            // creatureSprite è già in pixel nativi (fuori ambito)
  const bob = Math.round(Math.sin(frameTime / 300) * 4);
  const creatureY = sy - 12 - bob;                           // in volo, staccata da terra (fondo = creatureY+28)
  const backTop = Math.round(creatureY + 28 - cvH);          // cima della schiena su schermo
  const bellyY = creatureY + 24;                             // sotto la pancia (dove si raccolgono le zampe)
  const flap = Math.sin(frameTime / 130);                    // battito (fase dal TEMPO)
  shadow(sx, sy + 34, 12);                                   // ombra a terra: dà l'altezza
  /* ALI (stile voxel) DIETRO il corpo → sembrano attaccate al dorso, spuntano da sotto l'eroe */
  const wingRootY = backTop + 12;
  if (view === 'side') voxWing(sx - dir * 6, wingRootY, -dir, flap, base);          // una grande ala, si apre verso la coda
  else { voxWing(sx - 10, wingRootY, -1, flap, base); voxWing(sx + 10, wingRootY, 1, flap, base); } // due ali ai lati
  /* GAMBE PIEGATE sotto la pancia (raccolte in volo): coscia + piede rivolto in dentro, con volume */
  const leg = (hx, s) => {
    rect(hx, bellyY - 4, 4, 6, LEG); px(hx + (s > 0 ? 2 : 0), bellyY - 6, LEGD);
    rect(hx + (s > 0 ? -2 : 2), bellyY, 4, 4, LEG); px(hx + (s > 0 ? -2 : 4), bellyY + 2, LEGD);
    px(hx + (s > 0 ? 0 : 3), bellyY - 3, shade8(LEG, 1.2));
  };
  if (view === 'side') { leg(sx - 8, -1); leg(sx + 4, 1); }
  else { leg(sx - 10, -1); leg(sx + 6, 1); }
  /* la CREATURA VERA senza zampe (uguale all'animale base), SOPRA le radici delle ali (attaccate) */
  if (obj) drawCreature(obj, sx - 16, creatureY, false, true, mopts);
  /* SELLA: prolunga il dorso (stesso colore) sotto l'eroe → nessun pixel vuoto fra busto e creatura */
  rect(sx - 12, backTop - 2, 24, 10, base); rect(sx - 12, backTop - 2, 24, 2, shade8(base, 1.2));
  rect(sx - 12, backTop + 6, 24, 2, shade8(base, 0.7));
  px(sx - 14, backTop, '#20160f'); px(sx - 14, backTop + 2, '#20160f'); px(sx + 12, backTop, '#20160f'); px(sx + 12, backTop + 2, '#20160f');
  /* EROE ben SEDUTO sulla schiena: busto+testa, gambe in sella (tagliate dal clip) */
  seatHero(sx, backTop - 12, P.dir);
  if (P.moving) { const tx = sx - dir * 22, ty = backTop + 16, w2 = Math.floor(frameTime / 120) % 3; px(tx + w2 * 2, ty, 'rgba(224,206,255,.6)'); px(tx - w2 * 2, ty + 4, 'rgba(198,178,236,.4)'); }
  ctx.restore();
}
/* barca vista di PRUA/POPPA (su/giù): scafo compatto e più stretto del profilo. `up`=si allontana. */
export function drawBoatFB(sx, y0, up) {
  /* FASE 2: nativo (chiamata da drawBoat, ora anche lei nativa) — bordo con filo di luce
     vero oltre allo scafo, non solo due tinte piatte. */
  /* IL BORDO ARRIVA ALLA VITA. Con il personaggio ridisegnato a 32px le gambe finiscono più
     in alto di prima: lo scafo che partiva da +16 ne lasciava scoperti quattro pixel e si
     vedevano i polpacci spuntare dallo scafo (segnalato con foto). Ed è largo quanto il
     personaggio, non meno: di prua un busto più largo della barca sembra seduto sull'acqua. */
  rect(sx - 14, y0 + 12, 30, 16, '#8a5f38'); rect(sx - 14, y0 + 12, 30, 4, '#a97a4c'); // scafo
  rect(sx - 14, y0 + 16, 4, 10, shade8('#8a5f38', 1.15)); rect(sx + 12, y0 + 16, 4, 10, shade8('#8a5f38', 0.75)); // fiancata con volume
  px(sx - 16, y0 + 16, '#8a5f38'); px(sx + 16, y0 + 16, '#8a5f38');
  rect(sx - 12, y0 + 28, 26, 2, '#5c4229');
  if (up) { rect(sx - 5, y0 + 10, 12, 2, '#a97a4c'); px(sx, y0 + 8, '#a97a4c'); }   // prua a punta in alto (si allontana)
  else { rect(sx - 8, y0 + 28, 18, 2, '#8a5f38'); rect(sx - 5, y0 + 30, 12, 2, '#5c4229'); px(sx, y0 + 32, '#5c4229'); } // poppa verso di noi
  px(sx - 10, y0 + 34, '#bfe9f4'); px(sx + 8, y0 + 34, '#bfe9f4');                  // riflesso
}
export function drawBoat(sx, sy, noHero) {
  /* FASE 2: nativo — niente più contro-scala per l'eroe (drawHero è già nativa, qui non
     c'è più nessun 2x ambiente da annullare: si chiama diretta). */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const bob = Math.round(Math.sin(frameTime / 320) * 3);
  const y0 = sy + bob;
  /* scia dietro la barca */
  if (P.moving) {
    const bx = P.dir === 'left' ? 24 : P.dir === 'right' ? -24 : 0;
    const by = P.dir === 'up' ? 24 : P.dir === 'down' ? -24 : 0;
    const w2 = Math.floor(frameTime / 140) % 3;
    rect(sx + bx - 4 + w2 * 2, y0 + 28 + by, 2, 2, '#bfe9f4'); rect(sx + bx + 4 - w2 * 2, y0 + 30 + by, 2, 2, '#e8f6fb');
    rect(sx + bx, y0 + 26 + by, 2, 2, '#bfe9f4');
  }
  /* eroe a bordo PRIMA dello scafo: le gambe restano NASCOSTE dentro la barca (niente piedi sporgenti) */
  if (!noHero) drawHero(null, sx - 16, y0 - 10, P.dir, 0);
  if (!bankVeh('boat', sx, y0)) {                                     // scafo: disegno a mano se c'è, altrimenti procedurale
    if (P.dir === 'up' || P.dir === 'down') drawBoatFB(sx, y0, P.dir === 'up'); // fronte/retro: scafo di prua/poppa
    else {
      /* scafo di legno di PROFILO (laterali) con prua e bordo chiaro (copre le gambe → l'eroe ci "siede") */
      rect(sx - 20, y0 + 12, 40, 16, '#8a5f38'); rect(sx - 20, y0 + 12, 40, 4, '#a97a4c');
      rect(sx - 20, y0 + 16, 6, 12, shade8('#8a5f38', 1.15)); rect(sx + 14, y0 + 16, 6, 12, shade8('#8a5f38', 0.7)); // fiancata: luce a prua / ombra a poppa
      rect(sx - 6, y0 + 24, 12, 2, shade8('#8a5f38', 0.85)); // linea di galleggiamento
      px(sx - 22, y0 + 15, '#8a5f38'); px(sx + 20, y0 + 15, '#8a5f38');
      rect(sx - 16, y0 + 28, 32, 2, '#5c4229'); rect(sx - 16, y0 + 28, 32, 1, shade8('#5c4229', 1.3)); // bordo di poppa con un filo di luce
      px(sx - 12, y0 + 32, '#bfe9f4'); px(sx + 10, y0 + 32, '#bfe9f4'); // riflesso sull'acqua
    }
  }
  if ((P.dir === 'left' || P.dir === 'right') && P.digging && P.digging.kind === 'fish') { // lenza + galleggiante con cerchi
    const d2 = P.dir === 'left' ? -1 : 1;
    rect(sx + d2 * 14, y0 - 12, 2, 4, '#8a5f38'); px(sx + d2 * 16, y0 - 14, '#8a5f38'); // canna
    for (let i = 1; i < 5; i++) px(sx + d2 * (16 + i * 2), y0 - 14 + i * 4, '#e8e2d0');   // filo
    const bx2 = sx + d2 * 26, by2 = y0 + 6 + Math.round(Math.sin(frameTime / 260) * 2);
    px(bx2, by2, '#c65a54'); px(bx2, by2 - 2, '#f6efdd');                            // galleggiante
    const r2 = Math.floor((P.digging.t / P.digging.dur) * 3) + 1;                    // cerchi nell'acqua
    px(bx2 - r2 * 2, by2 + 2, '#bfe9f4'); px(bx2 + r2 * 2, by2 + 2, '#bfe9f4');
  }
  ctx.restore();
}
/* motoscafo di PRUA/POPPA (su/giù): scafo bianco compatto + parabrezza/motore secondo il verso. */
export function drawMotorboatFB(sx, y0, up) {
  /* FASE 2: nativo — scafo con volume laterale, non solo scafo+banda piatti. */
  rect(sx - 14, y0 + 12, 30, 14, '#eef2f4'); rect(sx - 14, y0 + 22, 30, 4, '#3d8ba0'); // scafo + banda (bordo alla vita)
  rect(sx - 14, y0 + 14, 4, 10, shade8('#eef2f4', 0.92)); rect(sx + 12, y0 + 14, 4, 10, shade8('#eef2f4', 0.85)); // fiancata con volume
  px(sx - 16, y0 + 16, '#eef2f4'); px(sx + 16, y0 + 16, '#eef2f4');
  rect(sx - 12, y0 + 26, 26, 2, '#2b6274');
  /* il MOTORE è a POPPA: si vede quando ti ALLONTANI (di spalle), non quando vieni verso l'utente */
  if (up) { rect(sx - 4, y0 + 26, 10, 6, '#33291f'); px(sx, y0 + 32, '#20323f'); }  // di spalle: motore fuoribordo verso di noi
  else { rect(sx - 4, y0 + 24, 10, 4, '#bfe9f4'); rect(sx - 4, y0 + 24, 10, 2, '#8fd0e6'); rect(sx - 4, y0 + 28, 10, 2, '#eef2f4'); px(sx, y0 + 30, '#eef2f4'); } // di fronte: parabrezza + prua verso di noi
  px(sx - 8, y0 + 32, '#bfe9f4'); px(sx + 6, y0 + 32, '#bfe9f4');
}
/* MOTOSCAFO: scafo bianco/azzurro affusolato, parabrezza, motore fuoribordo, SCIA di spruzzi */
export function drawMotorboat(sx, sy, noHero) {
  /* FASE 2: nativo — niente più contro-scala per l'eroe. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const bob = Math.round(Math.sin(frameTime / 300) * 2.4);
  const y0 = sy + bob;
  /* scia di spruzzi più marcata dietro (in movimento) */
  if (P.moving) {
    const bx = P.dir === 'left' ? 24 : P.dir === 'right' ? -24 : 0;
    const by = P.dir === 'up' ? 24 : P.dir === 'down' ? -24 : 0;
    const w2 = Math.floor(frameTime / 90) % 3;
    for (let i = 0; i < 3; i++) { rect(sx + bx - 6 + i * 6 - w2 * 2, y0 + 28 + by, 2, 2, '#e8f6fb'); rect(sx + bx - 4 + i * 6 + w2 * 2, y0 + 32 + by, 2, 2, '#bfe9f4'); }
  }
  /* eroe al timone PRIMA dello scafo: gambe nascoste dentro (niente piedi sporgenti) */
  if (!noHero) drawHero(null, sx - 16, y0 - 8, P.dir, 0);
  if (!bankVeh('motorboat', sx, y0)) {                                // scafo: disegno a mano se c'è, altrimenti procedurale
    if (P.dir === 'up' || P.dir === 'down') drawMotorboatFB(sx, y0, P.dir === 'up'); // fronte/retro
    else {
      /* scafo affusolato (bianco con banda azzurra) + prua appuntita (copre le gambe) — laterali */
      rect(sx - 20, y0 + 12, 40, 14, '#eef2f4'); rect(sx - 20, y0 + 22, 40, 4, '#3d8ba0'); // banda (bordo alla vita)
      px(sx - 24, y0 + 18, '#eef2f4'); px(sx - 22, y0 + 15, '#eef2f4');                    // prua sinistra
      px(sx + 22, y0 + 18, '#eef2f4'); px(sx + 20, y0 + 15, '#eef2f4');                    // poppa
      rect(sx - 18, y0 + 26, 36, 2, '#2b6274');
      rect(sx - 4, y0 + 8, 10, 8, '#bfe9f4'); rect(sx - 4, y0 + 8, 10, 2, '#8fd0e6');       // parabrezza + console
      rect(sx - 6, y0 + 14, 14, 2, '#9aa3a8');
      const md = P.dir === 'left' ? 1 : -1;                                               // motore fuoribordo dietro
      rect(sx + md * 18, y0 + 14, 4, 10, '#33291f'); px(sx + md * 18, y0 + 24, '#20323f');
      px(sx - 12, y0 + 30, '#bfe9f4'); px(sx + 10, y0 + 30, '#bfe9f4');                     // riflesso
    }
  }
  if ((P.dir === 'left' || P.dir === 'right') && P.digging && P.digging.kind === 'fish') {
    const d2 = P.dir === 'left' ? -1 : 1;
    rect(sx + d2 * 16, y0 - 10, 2, 4, '#8a5f38');
    for (let i = 1; i < 5; i++) px(sx + d2 * (18 + i * 2), y0 - 12 + i * 4, '#e8e2d0');
    const bx2 = sx + d2 * 28, by2 = y0 + 8 + Math.round(Math.sin(frameTime / 260) * 2);
    px(bx2, by2, '#c65a54'); px(bx2, by2 - 2, '#f6efdd');
  }
  ctx.restore();
}
/* animazione di scavo/abbattimento/spacco: due colpi, schegge a tema */
function drawDigging(sx, sy) {
  /* FASE 2: nativa — drawHero è già nativo (niente più contro-scala 0.5), attrezzo/schegge
     con posizioni e ampiezze raddoppiate. */
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const d = P.digging, kind = d.kind || 'dig';
  const ph = d.t / d.dur;
  const struck = Math.floor(ph * 4) % 2 === 1;              // due colpi per scavata
  if (kind === 'dig') {
    drawHero(null, sx - 16, sy + (struck ? 2 : 0), 'down', 0); // chino sul colpo
    if (!struck) { // PALA alzata: manico + lama LARGA a cucchiaio (≠ piccone)
      rect(sx + 10, sy - 10, 4, 16, '#8a5f38');                                   // manico
      rect(sx + 4, sy - 18, 16, 8, '#b8b0a2'); rect(sx + 6, sy - 10, 12, 2, '#9a9285'); // lama larga
      px(sx + 4, sy - 18, '#d7d0c2'); px(sx + 18, sy - 18, '#d7d0c2');            // bordi lucidi
    } else {       // PALA piantata: lama larga a spatola tra i piedi
      rect(sx + 6, sy + 6, 4, 14, '#8a5f38');                                   // manico
      rect(sx, sy + 20, 16, 6, '#b8b0a2'); rect(sx + 2, sy + 26, 12, 2, '#9a9285'); px(sx + 6, sy + 28, '#7f776a');
    }
    if (struck) {  // terra che schizza AI PIEDI
      const t2 = (ph * 4) % 1;
      const OX = [-14, -8, -4, 4, 10, 16], H = [10, 14, 8, 12, 14, 8];
      const CC = ['#8a6a42', '#c9a06a', '#6d4f30', '#b98d59', '#8a6a42', '#c9a06a'];
      for (let i = 0; i < 6; i++) px(Math.round(sx + OX[i] * (0.4 + t2)), Math.round(sy + 28 - Math.sin(Math.PI * t2) * H[i]), CC[i]);
    }
    ctx.restore(); return;
  }
  /* accetta/piccone: colpo LATERALE verso la tile che guardi, schegge a tema */
  const dx2 = P.dir === 'left' ? -1 : 1;
  drawHero(null, sx - 16, sy + (struck ? 2 : 0), P.dir === 'up' ? 'down' : P.dir, 0);
  const headCol = kind === 'chop' ? '#b5622e' : '#9a9285';
  if (!struck) { // attrezzo alzato dietro la testa
    rect(sx + dx2 * 10, sy - 8, 4, 14, '#8a5f38');
    if (kind === 'chop') { // ACCETTA: testa a cuneo compatta
      rect(sx + dx2 * 6, sy - 12, 10, 6, headCol); px(sx + dx2 * 6, sy - 12, '#d98a4a');
    } else {               // PICCONE: testa lunga a DOPPIA PUNTA (≠ pala/accetta)
      rect(sx + dx2 * 4, sy - 12, 16, 2, headCol);
      px(sx + dx2 * 4, sy - 10, headCol); px(sx + dx2 * 18, sy - 10, headCol);
      px(sx + dx2 * 4, sy - 14, '#b8b0a2'); px(sx + dx2 * 18, sy - 14, '#b8b0a2');
    }
  } else {       // colpo in diagonale verso il bersaglio
    for (let i = 0; i < 5; i++) px(sx + dx2 * (4 + i * 2), sy + 4 + i * 2, '#8a5f38');
    if (kind === 'chop') rect(sx + dx2 * 14 - 2, sy + 14, 8, 6, headCol);
    else { rect(sx + dx2 * 12, sy + 14, 12, 2, headCol); px(sx + dx2 * 12, sy + 16, headCol); px(sx + dx2 * 22, sy + 16, headCol); } // piccone a doppia punta
  }
  if (struck) {  // schegge sulla tile davanti
    const fx = P.dir === 'left' ? -28 : P.dir === 'right' ? 28 : 0;
    const fy = P.dir === 'up' ? -24 : P.dir === 'down' ? 24 : 0;
    const t2 = (ph * 4) % 1;
    const OX = [-10, -4, 2, 8, 12], H = [10, 14, 8, 12, 10];
    const CC = kind === 'chop' ? ['#8a5f38', '#b98d59', '#4e7a3d', '#8a5f38', '#619a4c']
      : ['#9a9285', '#b8b0a2', '#7f776a', '#9a9285', '#b8b0a2'];
    for (let i = 0; i < 5; i++) px(Math.round(sx + fx + OX[i] * (0.4 + t2)), Math.round(sy + 20 + fy - Math.sin(Math.PI * t2) * H[i]), CC[i]);
  }
  ctx.restore();
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
/* quello che il disegno della grotta deve sapere, senza importare la logica dentro caveArt */
const CAVE_INFO = {
  solid: (x, y) => caveSolid(x, y),
  nodeNear: (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (caveNodeAt(x + dx, y + dy) && !caveNodeDone(x + dx, y + dy)) return true; return false; },
  nearEntrance: (x, y) => y >= CAVE.h - 9 && Math.abs(x - (CAVE.w >> 1)) <= 4,
};
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
    /* disegno in caveArt.js: roccia con cresta, bordi e parete a strati; pavimento con le
       decorazioni dove hanno senso (sotto le stalattiti, contro le pareti, nelle zone umide) */
    if (caveSolid(tx, ty)) caveWall(BRUSH, tx, ty, sx, sy, CAVE_INFO, time);
    else caveFloor(BRUSH, tx, ty, sx, sy, CAVE_INFO, time);
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
    const sx = tx * TS, sy = ty * TS, here = !!(reach && reach[0] === tx && reach[1] === ty);
    caveCrystal(BRUSH, sx, sy, time, here);
  }
  /* player: stessi offset dell'overworld (feet allineati alla collisione: niente scarto di mezzo cubetto) */
  const fr = CAVE.moving ? (Math.floor(CAVE.anim * 7) % 2) : 0;
  const px0 = snap(CAVE.x), py0 = snap(CAVE.y);
  shadow(px0, py0 + 32, 12);
  if (CAVE.digging) { const st = Math.floor((CAVE.digging.t / CAVE.digging.dur) * 4) % 2; drawHero(null, px0 - 16, py0 + st * 2, 'down', 0); rect(px0 + 8, py0 + (st ? 20 : 12), 4, 12, '#8a5f38'); rect(px0 + 4, py0 + (st ? 16 : 8), 12, 6, '#9a9285'); }
  else drawHero(null, px0 - 16, py0, CAVE.dir, fr);
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
  rect(ex - gw / 2 - TS, rh - 2, TS, CAVE_FOOT + 2, '#4a4239');
  rect(ex + gw / 2, rh - 2, TS, CAVE_FOOT + 2, '#4a4239');
  rect(ex - gw / 2 - TS, rh - 2, TS, 3, '#6d6356');
  rect(ex + gw / 2, rh - 2, TS, 3, '#6d6356');
  rect(ex - gw / 2 - 1, rh - 2, 1, CAVE_FOOT + 2, '#15110d'); rect(ex + gw / 2, rh - 2, 1, CAVE_FOOT + 2, '#15110d');
  /* alone di luce diurna che risale dentro la grotta: è il richiamo che dice "di qua si esce" */
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = 'rgba(240,232,190,' + (0.05 + i * 0.045) + ')';
    ctx.fillRect(ex - gw / 2 - 4 + i, rh - 34 + i * 7, gw + 8 - i * 2, 8);
  }

  /* BUIO: quasi nero ovunque tranne l'alone attorno al player (a scalini, 8-bit).
     L'uscita fa eccezione: da lì entra il giorno, quindi il buio si apre. Senza, il varco
     appena disegnato tornerebbe nero e non servirebbe a niente. */
  const exTx = CAVE.w >> 1;
  const caveR = (S.tools && S.tools.torch ? 1.7 : 1) + companionLightBonus(); // torcia + compagno LANTERNA
  /* a quarti di casella (non caselle intere): il cerchio di luce resta a gradini 8-bit ma non
     è più fatto di quadrotti grandi quanto Digsy */
  const HC = TS >> 1;
  /* `__digsyNoDark` esiste solo per le foto di prova (npm run shot): spegne il buio per guardare il disegno */
  const noDark = typeof window !== 'undefined' && window.__digsyNoDark;
  if (!noDark) for (let ty = t0y; ty < t1y; ty++) for (let tx = t0x; tx < t1x; tx++) for (let q = 0; q < 4; q++) {
    const sx = tx * TS + (q & 1) * HC, sy = ty * TS + (q >> 1) * HC;
    const tR = caveR;
    const d = (Math.hypot(sx + HC / 2 - CAVE.x, sy + HC / 2 - (CAVE.y + 16)) / TS) / tR;
    let a = d < 2 ? 0 : d < 3.2 ? 0.4 : d < 4.4 ? 0.72 : d < 5.6 ? 0.9 : 0.98;
    /* vicinanza all'imbocco: quanto più si è in fondo e in mezzo, tanto più c'è luce */
    const dEx = Math.hypot(tx - exTx, ty - (CAVE.h - 1));
    if (dEx < 5) a = Math.min(a, dEx < 2 ? 0 : dEx < 3 ? 0.35 : dEx < 4 ? 0.7 : 0.88);
    if (a > 0) { ctx.fillStyle = 'rgba(4,4,8,' + a + ')'; ctx.fillRect(sx, sy, HC, HC); }
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
  frameTime = time; setHeroTime(time); // twinkle del glitter dei cappelli platino
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
  const hf = houseFootprint(); // CASA del giocatore: un solo edificio, fuori dal sistema città
  /* CANCELLO: chiuso quando lo si vede da FUORI (usciti dal cortile), aperto quando si è
     dentro (o proprio sul varco) — è solo l'ASPETTO, il varco resta sempre percorribile
     (non è ancora la meccanica di chiusura vera, quella sarà un'altra cosa). Un giro solo per
     frame, non per le due caselle del cancello. */
  const yrNow = yardRect();
  const gateOpenNow = !yrNow || (() => {
    const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
    return ptx >= yrNow.x0 && ptx <= yrNow.x1 && pty >= yrNow.y0 && pty <= yrNow.y1;
  })();
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const sx = tx * TS - cam.x, sy = ty * TS - cam.y;
    const ti = townInfo(tx, ty);
    const yd = ti ? null : yardInfo(tx, ty); // CORTILE di casa: fuori dal sistema città, un solo rettangolo fisso
    /* terreno */
    let t = ti ? (ti.road ? ROAD : FLOOR) : yd ? (yd.path ? ROAD : PARK) : baseTerrain(tx, ty);
    /* i vicini servono ai BORDI fra terreni (riva, schiuma, erba sulla sabbia); solo per il terreno naturale */
    const nb = (ti || yd) ? null : [baseTerrain(tx, ty - 1), baseTerrain(tx + 1, ty), baseTerrain(tx, ty + 1), baseTerrain(tx - 1, ty)];
    groundTile(t, tx, ty, sx, sy, time, (ti || yd) ? 0 : zoneIdxAt(tx, ty), nb);
    if (dugSet.has(tx + ',' + ty) && !(ti && ti.floor)) drawHole(sx, sy, tx, ty);
    if (!ti && !yd) { const pit = boneSitePitAt(tx, ty); if (pit) drawBonePit(sx, sy, tx - pit.x, ty - pit.y); }
    /* CASA: un edificio 3×2 fuori dal sistema città — niente decorazioni/siti sotto */
    if (!ti && !yd && hf && tx >= hf.x0 && tx <= hf.x1 && ty >= hf.y0 && ty <= hf.y1) {
      if (tx === hf.x0 && ty === hf.y0) ents.push({ y: (hf.y1 + 1) * TS - cam.y, f: () => drawHouse(hf, sx, sy) });
      continue;
    }
    /* entità */
    if (ti) {
      if (ti.deco && ti.anchor) {
        const d = ti.deco;
        const ey = d.type === 'fountain' ? sy + 30 : sy + 13;
        ents.push({ y: ey, f: () => drawTownDeco(d, sx, sy, time) });
        if (d.type === 'lamp') lampGlows.push({ x: sx + 8, y: sy + 2 });
      }
      else if (ti.building && tx === ti.building.x0 && ty === ti.building.y0) { const b = ti.building; ents.push({ y: (b.y1 + 1) * TS - cam.y, f: () => drawBuilding(b, b.x0 * TS - cam.x, b.y0 * TS - cam.y) }); }
      continue;
    }
    if (yd) {                                                           // CORTILE: stesso arredo/staccionata del vecchio parco cittadino
      if (yd.path) { /* vialetto: solo terreno ROAD, già disegnato sopra */ }
      else if (yd.gate) { ents.push({ y: sy + 12, f: () => drawGate(sx, sy, yd.gateSide, yd.gateOpen !== false && gateOpenNow, yd.gateOpen === false ? 1 : gateClosingProgress()) }); }
      else if (yd.floor) {
        const yr = yardRect(), pd = yr && parkDeco(yr, yr.cx, tx, ty, alive());
        if (pd) {
          if (pd.kind === 'pond') drawParkPond(sx, sy, pd.px, pd.py, tx, ty, time);
          else if (pd.kind === 'flowerbed') drawFlowerbed(sx, sy, tx, ty);
          else if (pd.kind === 'tree') ents.push({ y: sy + 15, f: () => drawTree(sx, sy, time, tx, ty) });
          else if (pd.kind === 'bush') ents.push({ y: sy + 13, f: () => drawBushDeco(sx, sy) });
          else if (pd.kind === 'rock') ents.push({ y: sy + 13, f: () => drawBoulder(sx, sy, tx, ty) });
        }
      } else if (yd.fence) { const fv = yd.fv, fh = yd.fh; ents.push({ y: sy + 12, f: () => drawFence(sx, sy, fv, fh) }); }
      continue;
    }
    const st = siteAt(tx, ty);
    if (st) { ents.push({ y: sy + 14, f: () => drawSite(sx, sy, siteRemaining(st), time, tx, ty) }); continue; }
    const bs = boneSiteAt(tx, ty);
    if (bs) {
      const dug = boneSiteDug(bs.site, bs.part);
      ents.push({ y: sy + 14, f: () => dug ? drawHole(sx, sy, tx, ty) : drawBonePart(sx, sy, bs.part, time, tx, ty) });
      continue;
    }
    const wk = wreckAt(tx, ty);
    if (wk) { ents.push({ y: sy + 14, f: () => drawWreck(sx, sy, time, tx, ty) }); continue; }
    if (caveEntranceAt(tx, ty)) { ents.push({ y: sy + 14, f: () => drawCaveEntrance(sx, sy, time) }); continue; }
    const lm = landmarkAt(tx, ty);
    if (lm) { ents.push({ y: sy + 15, f: () => drawLandmark(lm, sx, sy, time) }); continue; }
    const d = decoAt(tx, ty);
    if (!d) { const pk = pickupAt(tx, ty); if (pk) ents.push({ y: sy + 12, f: () => drawPickup(pk, sx, sy, time, tx, ty) }); continue; }
    if (d === 'tree') ents.push({ y: sy + 15, f: () => drawTree(sx, sy, time, tx, ty) });
    else if (d === 'boulder') ents.push({ y: sy + 13, f: () => drawBoulder(sx, sy, tx, ty) });
    else if (d === 'flower') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 2, f: () => { if (rip) shadow(sx + 8, sy + 13, 3); drawFlower(sx, sy, tx, ty, rip); if (rip) glint(sx + 12, sy + 3, time, tx, ty); } }); }
    else if (d === 'shell') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 2, f: () => { if (rip) shadow(sx + 8, sy + 13, 4); drawShell(sx, sy, rip); if (rip) glint(sx + 12, sy + 3, time, tx, ty); } }); }
    else if (d === 'cactus') ents.push({ y: sy + 15, f: () => drawCactus(sx, sy, tx, ty) });
    else if (d === 'bonespire') ents.push({ y: sy + 14, f: () => drawBonespire(sx, sy, tx, ty) });
    else if (d === 'deadtree') ents.push({ y: sy + 15, f: () => drawDeadtree(sx, sy, tx, ty) });
    else if (d === 'mushroom') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 8, f: () => { if (rip) shadow(sx + 8, sy + 12, 4); drawMushroom(sx, sy, time, tx, ty, rip); if (rip) glint(sx + 12, sy + 2, time, tx, ty); } }); }
    else if (d === 'stump') ents.push({ y: sy + 13, f: () => drawStump(sx, sy, tx, ty) });
    else if (d === 'redspire') ents.push({ y: sy + 15, f: () => drawRedspire(sx, sy, tx, ty) });
    else if (d === 'orecrystal') ents.push({ y: sy + 13, f: () => drawOrecrystal(sx, sy, tx, ty) });
    else if (d === 'reed') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 14, f: () => { if (rip) shadow(sx + 8, sy + 14, 4); drawReed(sx, sy, time, tx, ty, rip); if (rip) glint(sx + 12, sy + 1, time, tx, ty); } }); }
    else if (d === 'icecrystal') ents.push({ y: sy + 13, f: () => drawIcecrystal(sx, sy, tx, ty) });
    else if (d === 'hay') ents.push({ y: sy + 13, f: () => drawHay(sx, sy, tx, ty) });
  }
  // X delle mappe del tesoro in vista
  for (const m of (S.maps || [])) {
    const sx = m.x * TS - cam.x, sy = m.y * TS - cam.y;
    if (sx < -TS || sx > W + TS || sy < -TS || sy > H + TS) continue;
    ents.push({ y: sy + 2, f: () => drawXmark(sx, sy, time) });
  }
  // il portale di ritorno (goHome) sta DENTRO l'atrio, non qui nel mondo — vedi drawHouseCorridor
  // fossili/oggetti lasciati a TERRA (zaino pieno o scartati): riprendibili con E
  for (const d of (S.drops || [])) {
    const sx = d.tx * TS - cam.x, sy = d.ty * TS - cam.y;
    if (sx < -TS || sx > W + TS || sy < -TS || sy > H + TS) continue;
    const pid = d.kind === 'good' ? (d.payload && d.payload.id) : 'fossil';
    ents.push({ y: sy + 12, f: () => drawPickup(pid, sx, sy, time, d.tx, d.ty) });
  }
  // chimere nel cortile in vista (NUOTANO se sono nello stagno)
  if (yardNear) {
    const yr = yardRect();
    for (const a of yardAnimals) {
      const ax = snap(a.x - cam.x), ay = snap(a.y - cam.y);
      if (ax < -20 || ax > W + 20 || ay < -20 || ay > H + 20) continue;
      /* stesso `alive()` del disegno: senza, una creatura nuoterebbe in uno stagno che non
         è ancora comparso */
      const pd = yr && parkDeco(yr, yr.cx, Math.floor(a.x / TS), Math.floor(a.y / TS), alive());
      if (pd && pd.kind === 'pond') {
        ents.push({ y: ay, f: () => {                            // in acqua: metà sotto la linea d'acqua + increspature
          const wl = ay - 6;                                     // linea d'acqua (sotto = sommerso)
          ctx.save(); ctx.beginPath(); ctx.rect(ax - 32, ay - 60, 64, wl - (ay - 60)); ctx.clip();
          drawCreature(a, ax - 16, ay - 26);
          ctx.restore();
          const w2 = Math.floor(time / 260 + a.x) % 2;
          px(ax - 12 + w2 * 2, wl, '#bfe9f4'); px(ax + 10 - w2 * 2, wl, '#bfe9f4'); px(ax - 4, wl + 2, '#e8f6fb'); px(ax + 4, wl + 2, '#e8f6fb');
        } });
      } else ents.push({ y: ay, f: () => drawCreature(a, ax - 16, ay - 26) });
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
  ents.push({ y: P.y - cam.y + TS, f: drawPlayer });
  /* COMPAGNO: chimera/risvegliato che insegue il player — MA non quando lo si cavalca (in volo
     il compagno È la cavalcatura sotto l'eroe: disegnarlo anche qui lo sdoppiava) */
  const compObj = companionDrawObj();
  if (compObj && !isMounted()) {
    /* `cys` = i PIEDI del compagno sullo schermo, con la stessa convenzione di Digsy (ancora +
       FOOT_DY). Veniva disegnato con la base sull'ancora, cioè 26px sopra i suoi piedi veri —
       un resto del mondo a 16px: stando dietro a Digsy davanti a una porta sembrava dentro la
       casa, sulla facciata o sul tetto (segnalato con foto: "il buddy si compenetra"). */
    const cxs = snap(COMP.x - cam.x), cys = snap(COMP.y + FOOT_DY - cam.y), ctype = companionType(companionSpec());
    /* se il player va in barca il compagno lo segue sull'acqua: deve NUOTARE, non camminare */
    const cswim = waterTile(Math.floor(COMP.x / TS), Math.floor((COMP.y + FOOT_DY) / TS));
    /* chiave di profondità: la STESSA di Digsy (ancora + una casella), così i due si ordinano
       fra loro e con le case con la stessa regola */
    ents.push({ y: COMP.y - cam.y + TS, f: () => {
      const j = COMP.job, working = j && j.phase === 'work';
      const pose = working && (j.type === 'acqua' || j.type === 'terra'); // acqua=dabble, terra=scavo a testa giù → creatura ridisegnata dal lavoro
      if (!pose) {
        let lx = 0;                                    // albero/roccia: affondo verso la casella sul colpo
        if (working) { const ph = 1 - j.t / 1.3; if (Math.floor(ph * 4) % 2 === 1) lx = Math.round(Math.sin(Math.PI * ((ph * 4) % 1)) * 6) * (j.wx >= COMP.x ? 1 : -1); }
        drawCreature(compObj, cxs - 16 + lx, cys - 26, cswim);
      }
      drawCompanionGlyph(ctype, cxs, cys - 32, time);
      drawCompanionWork(cxs, cys, time, compObj);
      drawCompanionPlay(cxs, cys, cam, time);
    } });
  }
  drawCompanionFx(cam, time);   // "+fossile" che salgono dal raccoglitore (sopra tutto)
  ents.sort((a, b) => a.y - b.y).forEach(e => e.f());
  /* FIUTO: il compagno segnala il reperto a terra più vicino entro pochi tile */
  if (compObj && companionHelps()) {
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
      const mx = best[0] * TS - cam.x + TS / 2, my = best[1] * TS - cam.y - TS / 4 + (Math.sin(time / 220) < 0 ? -1 : 0);
      px(mx, my, '#fff3b0'); px(mx - 1, my + 1, '#f6d95c'); px(mx + 1, my + 1, '#f6d95c'); px(mx, my + 2, '#e0a020'); // pallino "fiuto"
    }
  }
  /* notte: fuori dalla luce quasi NERO; cono 8-bit attorno al player; le città restano illuminate */
  if (night() > 0.02) {
    const pxc = P.x - cam.x, pyc = P.y - cam.y + TS / 2;
    const tR = (S.tools && S.tools.torch ? 1.7 : 1) + companionLightBonus(); // torcia + compagno LANTERNA (grotta)
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const sx = tx * TS - cam.x, sy = ty * TS - cam.y;
      const d = (Math.hypot(sx + TS / 2 - pxc, sy + TS / 2 - pyc) / TS) / tR;
      let base = d < 2.5 ? 0.15 : d < 4 ? 0.55 : d < 5.5 ? 0.85 : 0.96;
      /* città illuminata + ALONE graduale attorno (falloff su 5 tile, a scalini) */
      const tw = townForTile(tx, ty);
      if (tw) {
        const dxd = Math.max(tw.x0 - tx, 0, tx - tw.x1);
        const dyd = Math.max(tw.y0 - ty, 0, ty - tw.y1);
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
  /* LUCCIOLE (#5): di notte, all'aperto, luci che si raccolgono passandoci vicino. Sopra il
     buio (così brillano), sotto meteo e bussola. */
  updateFireflies(time, night());
  drawFireflies(ctx, cam.x, cam.y);
  { const tgt = weatherAt(zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS)).id, S.day); const st = weatherStep(tgt, time); drawWeather(st.w, time, st.level); }
  drawCompassIndicator(time);
  drawTutorialGuide(time);
  drawGateCutbars(W, H);
}
/* BARRE CINEMATOGRAFICHE 16:9: il fermo-immagine + svolta mentre il cancello chiude durava
   solo mezzo secondo e sembrava un lag, non una scena voluta (a richiesta: "fai comparire le
   barre 16/9 per far capire che è un'animazione") — le stesse barre nere sopra e sotto che
   segnalano un momento fuori dal controllo diretto, per tutta la durata del fermo (vedi
   P.gateTurnUntil, impostato in park.js insieme al blocco del movimento in main.js). */
function drawGateCutbars(W, H) {
  if (!P.gateTurnUntil || Date.now() >= P.gateTurnUntil) return;
  const barH = Math.round(H * 0.09);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, barH);
  ctx.fillRect(0, H - barH, W, barH);
}

/* ---------- TUTORIAL: le targhe sulle case e la freccia verso l'obiettivo ----------
   La parte che rende attraversabile l'apertura invece che frustrante. Misurando lo spawn:
   zero oggetti raccoglibili entro dieci caselle, e i 15 🪙 della pala arrivano solo dopo una
   trentina. Senza un'indicazione, "raccogli roba da terra" è un rastrellamento alla cieca. */
function plate(sx, sy, name, sub, hot) {
  if (!ctx.fillText) return;                       // stub dei test: niente testo, niente crash
  /* l'ancora fuori schermo NON si disegna: una targa agganciata a una casa che non si vede
     finirebbe schiacciata contro il bordo, indicando il vuoto */
  if (sx < -8 || sx > view.W + 8 || sy < -8 || sy > view.H + 20) return;
  ctx.save();
  /* 5px e non 6: il fumetto di dialogo di props.js sta a 6 perché compare da solo e per pochi
     secondi; qui le targhe sono SEI e restano accese, e a 6px coprivano mezza piazza. */
  ctx.font = '600 5px ui-monospace, Menlo, monospace';
  ctx.textBaseline = 'top';
  const meas = s => { const m = ctx.measureText && ctx.measureText(s); return (m && m.width) || s.length * 3; };
  const lines = sub ? [name, sub] : [name];
  let mw = 0; for (const l of lines) mw = Math.max(mw, meas(l));
  const w = Math.ceil(mw) + 6, h = lines.length * 6 + 4;
  const { bx, by } = plateBox(sx, sy, w, h);
  const tip = Math.max(bx + 3, Math.min(bx + w - 3, snap(sx)));
  ctx.fillStyle = '#241a10'; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
  ctx.fillStyle = hot ? '#f0c674' : '#f6efdd'; ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = '#241a10'; ctx.fillRect(tip - 1, by + h, 2, 2);              // codina in giù
  ctx.fillStyle = '#2a2016';
  lines.forEach((l, i) => ctx.fillText(l, snap(bx + (w - meas(l)) / 2), by + 2 + i * 6));
  ctx.restore();
}
/* DOVE si appoggia la targa. Sta fuori da `plate` per una ragione sola: è la parte che si può
   sbagliare in silenzio, e così un test la può misurare.
   Le coordinate si arrotondano con `snap` (griglia dei PIXEL FISICI, passo 1/K) e MAI con
   Math.round (griglia dei pixel di GIOCO, passo 1). Sono due griglie diverse: la casa scorre
   di 1/K a ogni frame e una targa arrotondata al pixel di gioco resta ferma per K frame e poi
   scatta di un pixel intero. È il tremolio che si vede camminando — la regola ferrea n.2 del
   progetto, e questa è l'ennesima volta che la si viola. */
export function plateBox(sx, sy, w, h) {
  const bx = Math.max(2, Math.min(view.W - w - 2, snap(sx - w / 2)));   // sempre dentro lo schermo
  /* MAI SOTTO LA BARRA: l'HUD è alto ~56 px di schermo, che in px di gioco dipende dalla
     scala. Senza, la targa dell'edificio più in alto finiva dietro ai tag ("…oratorio"). */
  const topSafe = Math.ceil(56 / view.K) + 2;
  return { bx, by: Math.max(topSafe, snap(sy - h)) };
}
function drawTutorialGuide(time) {
  if (!tutActive()) return;
  /* le TARGHE: solo la città che si sta guardando, e solo quando il passo è entrare in una casa */
  const want = tutStepId() === 'shop' ? 'store' : tutStepId() === 'museum' ? 'museum' : null;
  if (tutShowLabels()) {
    const pt = Math.floor(P.x / TS), py2 = Math.floor((P.y + FOOT_DY) / TS);
    const t = townForTile(pt, py2) || townForCell(Math.floor(pt / TCELL), Math.floor(py2 / TCELL));
    /* la casa dove si deve andare per ULTIMA, sopra le altre: se due targhe si toccano, quella
       che conta non deve finire sotto */
    if (t) for (const b of [...(t.buildings || [])].sort((a, c) => (a.type === want) - (c.type === want))) {
      const sx = (b.doorx + 0.5) * TS - cam.x, sy = b.y0 * TS - cam.y - 4;
      plate(snap(sx), snap(sy), bldName(b.type), bldPurpose(b.type), b.type === want);
    }
  }
  /* la FRECCIA: dove devi andare adesso. In vista = un mirino che pulsa sulla cosa; fuori
     vista = la stessa freccia a bordo schermo della bussola, in ambra per non confondersi
     con la città (gialla) e con la mappa del tesoro (rossa). */
  const g = tutTarget(P.x, P.y); if (!g) return;
  const gx = (g.x + 0.5) * TS - cam.x, gy = (g.y + 0.5) * TS - cam.y;
  const W = view.W, H = view.H, L = 10, R = W - 10, T = 16, B = H - 12;
  const pulse = (Math.sin(time / 300) + 1) / 2;
  if (gx >= L && gx <= R && gy >= T && gy <= B) {
    const r = Math.round(6 + pulse * 3);
    ctx.fillStyle = 'rgba(216,151,60,' + (0.35 + pulse * 0.35).toFixed(2) + ')';
    ctx.fillRect(snap(gx - r), snap(gy - 1), r * 2, 2); ctx.fillRect(snap(gx - 1), snap(gy - r), 2, r * 2);
    return;
  }
  const ax = Math.max(L, Math.min(R, gx)), ay = Math.max(T, Math.min(B, gy));
  const o = octant(gx - W / 2, gy - H / 2);
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const dx = DIRS[o][0], dy = DIRS[o][1], step = Math.round(pulse * 2);
  ctx.fillStyle = 'rgba(20,15,8,.45)'; arrowPx(ax + dx * step + 1, ay + dy * step + 1, dx, dy);
  ctx.fillStyle = '#d8973c'; arrowPx(ax + dx * step, ay + dy * step, dx, dy);
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
