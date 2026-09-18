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
import { COMP, companionDrawObj, companionHelps, companionLightBonus } from './companion.js';
import { weatherAt, weatherStep } from './weather.js';
import { siteRemaining, onBoat, footGear, waterTile, isMounted, boneSiteDug } from './gameplay.js';
import { SEED, vhash } from './noise.js';
import { drawHero, setHeroTime } from './sprites.js';
import { GRIP } from './bodyArt.js';
import { yardAnimals, yardNear, gateClosingProgress, gateHeldOpen } from './park.js';
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
import { drawSayBalloon, drawTree, drawBoulder, drawFlower, drawShell, drawHole, drawPickup, glint, drawCactus, drawSandspire, drawDeadtree, drawMushroom, drawRedspire, drawOrecrystal, drawReed, drawIcecrystal } from './props.js';
import { drawInteriorScene } from './interiors.js';
import { FRONTS } from './townArt.js';
import { hasLetter } from './letters.js';
import { caveWall, caveFloor, caveCrystal } from './caveArt.js';
import { fountainArt, benchArt, bushArt, lampArt, boardArt, statueArt, STATUE_FEET, mailboxArt, siteArt } from './decoArt.js';
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
  front(BRUSH, w, h, BB, glass, night() > 0.4, { t: frameTime, ph: (b.x0 * 7 + b.y0 * 13) & 1023 });   // fase dalle caselle, mai dai pixel
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
  FRONTS.house(BRUSH, w, h, BB, glass === '#ffdf8a' ? '#8fd0e6' : glass, night() > 0.4, { t: frameTime, ph: (hf.x0 * 7 + hf.y0 * 13) & 1023 });
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
  /* un'ombra scura sotto ogni osso (spostata di un pixel): stacca dalla terra smossa senza aggiungere dettagli */
  rect(sx + 6, sy + 24, 20, 2, 'rgba(20,12,6,.35)');
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
  /* RELITTO: prua spezzata di fasciame che affiora, albero inclinato con lo straccio della vela,
     acqua che gli gira attorno. Dondola appena (fase dal tempo e dalla casella). */
  ctx.save(); ctx.translate(sx, sy);
  const ph = ((tx || 0) * 7 + (ty || 0) * 13);
  const y = Math.round(Math.sin(time / 700 + ph) * 1);
  const L = '#1e1610';
  ctx.fillStyle = 'rgba(210,240,248,.35)'; ctx.fillRect(0, 22 + y, 32, 2); ctx.fillRect(4, 25 + y, 24, 1);
  for (let r = 0; r < 4; r++) {                                               // fasciame spezzato e inclinato: la prua esce, il resto è sott'acqua
    const w = 22 - r * 4, x0 = 4 + r * 2, yy = 8 + r * 4 + y;
    for (let k = 0; k < w; k++) { const dy = Math.round(k * 0.18); rect(x0 + k, yy + dy - 1, 1, 4, L); rect(x0 + k, yy + dy, 1, 2, r % 2 ? '#6a5038' : '#5a4430'); px(x0 + k, yy + dy, '#8a6a4a'); }
    rect(x0 + w - 2, yy + Math.round(w * 0.18) - 2, 3, 5, L);                    // estremità rotta
  }
  ctx.fillStyle = 'rgba(90,170,200,.55)'; ctx.fillRect(0, 20 + y, 32, 10);        // la metà sott'acqua si vede appena
  for (let k = 0; k < 22; k++) { const x = 9 + Math.round(k * 0.25), yy = 14 - k + y; rect(x - 1, yy, 4, 1, L); rect(x, yy, 2, 1, '#7a5c40'); }   // albero pendente
  rect(12, -5 + y, 10, 9, L); rect(13, -4 + y, 8, 7, '#c9bfa6'); rect(13, -4 + y, 2, 7, '#e0d8c4'); rect(17, 1 + y, 4, 2, '#a89a78');                  // vela strappata
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
const STATUE_LOOK = { acc: 'grandpa', hat: '#b6ae9d', shirt: '#9a9384', pants: '#8a8376', skin: '#c6bfae',
  hairStyle: 'short', hairColor: '#d6cfbe', hatStyle: 'explorer', eyeColor: '#3e3a34' };
/* LA STATUA È LO SPRITE DEL GIOCO, ma scolpito: si disegna il personaggio su una tela a parte e
   poi si RIDIPINGE — dentro restano solo tre toni di pietra (secondo quanto era chiaro il pixel
   di partenza) e il contorno scuro rimane SOLO sul bordo esterno. Con le linee interne dello
   sprite sembrava un personaggio colorato di grigio (segnalato); così sembra scolpito.
   La tela si costruisce una volta sola: il monumento non cambia mai. */
let statueCv = null;
function statueSprite() {
  if (statueCv !== null) return statueCv;
  statueCv = false;                                    // se qualcosa manca, si rinuncia una volta per tutte
  try {
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 34;
    const c2 = cv.getContext('2d'); if (!c2 || !c2.getImageData) return statueCv;
    c2.imageSmoothingEnabled = false;
    const keep = S.look;
    S.look = STATUE_LOOK; applyLook();
    try { drawHero(c2, 0, 2, 'down', 0, false, 'lift'); } finally { S.look = keep; applyLook(); }
    const im = c2.getImageData(0, 0, 32, 34), d = im.data;
    const op = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 34 && d[(y * 32 + x) * 4 + 3] > 40;
    const out = c2.createImageData(32, 34), o = out.data;
    const TONI = [[62, 58, 52], [125, 118, 106], [154, 147, 132], [182, 174, 157], [207, 199, 180]];
    for (let y = 0; y < 34; y++) for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4;
      if (!op(x, y)) continue;
      const bordo = !op(x - 1, y) || !op(x + 1, y) || !op(x, y - 1) || !op(x, y + 1);
      let t;
      if (bordo) t = 0;                                 // contorno: solo il bordo esterno
      else {
        const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;   // quanto era chiaro
        const luce = !op(x - 1, y - 1) || !op(x - 2, y);                       // spalla verso la luce
        t = luce ? 4 : lum > 0.62 ? 3 : lum > 0.42 ? 2 : 1;
      }
      o[i] = TONI[t][0]; o[i + 1] = TONI[t][1]; o[i + 2] = TONI[t][2]; o[i + 3] = 255;
    }
    c2.putImageData(out, 0, 0);
    statueCv = cv;
  } catch (e) { statueCv = false; }
  return statueCv;
}
export function drawStatue(sx, sy, time) {
  ctx.save(); ctx.translate(sx, sy);
  statueArt(BRUSH, time, !hasLetter('statua'));
  const cv = statueSprite();
  if (cv) ctx.drawImage(cv, STATUE_FEET.x - 16, STATUE_FEET.y - 34);
  else {                                               // senza tela a parte: almeno la figura c'è
    const keep = S.look; S.look = STATUE_LOOK; applyLook();
    try { drawHero(null, STATUE_FEET.x - 16, STATUE_FEET.y - 32, 'down', 0, false, 'lift'); } finally { S.look = keep; applyLook(); }
  }
  /* IL PICCONE DI PIETRA, TENUTO IN MANO. Prima stava piantato accanto alla figura e sembrava
     che volasse (segnalato con foto): un attrezzo appoggiato nel vuoto non lo regge nessuno.
     Il punto dove passa il manico è la PRESA VERA dello sprite (GRIP della posa 'lift', la
     stessa che usa il gioco), quindi la mano ci finisce sopra per costruzione; poi sopra il
     manico si rimettono due dita di pietra, ed è quello che fa leggere «lo tiene». */
  const [gx, gy] = GRIP.lift.down;
  const hx = STATUE_FEET.x - 16 + gx, hy = STATUE_FEET.y - 34 + gy;
  /* manico: dalla mano verso il basso fino a terra, e un pezzo che spunta sopra */
  /* corto: la testa sta POCO sopra la mano. Alto com'era, il piccone arrivava all'altezza del
     cappello e si leggeva come un oggetto per conto suo appeso sopra la spalla. */
  rect(hx - 2, hy - 10, 4, 27, '#3e3a34');
  rect(hx - 1, hy - 9, 2, 26, '#9a9384'); rect(hx - 1, hy - 9, 1, 26, '#c6bfae');
  /* LA TESTA È LA STESSA DEL PICCONE VERO: una lama CURVA a due punte che si piega verso il
     manico (la formula è quella di toolHeadAt). Con una barra dritta e due dentini restava un
     tergicristallo — detto due volte, e aveva ragione: un piccone si riconosce dalla curva. */
  {
    const tp = new Map();
    for (let q = -6.5; q <= 6.5; q += 0.5) {
      const bend = -(q * q) * 0.075, th = Math.abs(q) > 4.5 ? 0.5 : 1.5;
      for (let t2 = -th; t2 <= th; t2 += 0.5) {
        const x = Math.round(hx + q), y = Math.round(hy - 10 - (bend + t2));
        tp.set(x + ',' + y, Math.abs(q) > 5 ? '#6f685c' : t2 < 0 ? '#d8d1c0' : '#9a9384');
      }
    }
    for (let t2 = -1.5; t2 <= 1.5; t2 += 0.5) for (let w = -1.5; w <= 1.5; w += 0.5)  // occhio del manico
      tp.set(Math.round(hx + w) + ',' + Math.round(hy - 10 + t2), '#8b8474');
    for (const k of tp.keys()) { const [x, y] = k.split(',').map(Number); for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!tp.has((x + ex) + ',' + (y + ey))) rect(x + ex, y + ey, 1, 1, '#3e3a34'); }
    for (const [k, c] of tp) { const [x, y] = k.split(',').map(Number); rect(x, y, 1, 1, c); }
  }
  /* LE DITA sopra il manico: due pixel di pietra chiara col loro contorno */
  rect(hx - 3, hy - 1, 6, 4, '#3e3a34');
  rect(hx - 2, hy, 4, 2, '#b6ae9d'); rect(hx - 2, hy, 4, 1, '#d8d1c0');
  rect(hx - 2, hy + 2, 4, 1, '#8b8474');
  ctx.restore();
}
/* CASSETTA DELLA POSTA (borghi/paesi): buca delle lettere teal su palo, fessura, bandierina rossa */
export function drawMailbox(sx, sy) {
  ctx.save(); ctx.translate(sx, sy); mailboxArt(BRUSH); ctx.restore();
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
  /* STACCIONATA: pali col cappuccio, due assi con la luce sopra e l'ombra sotto, contorno scuro.
     Toni del legno tenui: è un bordo, non deve rubare l'occhio alle creature. */
  ctx.save(); ctx.translate(sx, sy);
  if (fh === undefined) fh = true;
  /* SENZA CONTORNO SCURO: alla staccionata non si fa niente (il cancello è un'altra cosa e ce
     l'ha). Resta staccata dall'erba con toni di legno più cupi e l'ombra a terra — stessa
     regola di rotoballe, ceppi e panchine. */
  const L = '#7a5230', W = '#9a6c42', WL = '#b8895a', WD = '#6f4a28';
  const post = (x, y, h) => { rect(x - 1, y - 1, 7, h + 1, L); rect(x, y, 5, h, WD); rect(x, y, 2, h, W); rect(x - 1, y - 2, 7, 3, L); rect(x, y - 1, 5, 1, WL); };
  if (fh) {
    for (const y of [11, 20]) { rect(0, y - 1, TS, 6, L); rect(0, y, TS, 4, W); rect(0, y, TS, 1, WL); rect(0, y + 3, TS, 1, WD); }
    post(5, 6, 23); post(22, 6, 23);
    rect(4, 29, 9, 2, 'rgba(20,14,8,.2)'); rect(21, 29, 9, 2, 'rgba(20,14,8,.2)');
  }
  if (fv) {
    for (const x of [12, 20]) { rect(x - 1, 0, 6, TS, L); rect(x, 0, 4, TS, W); rect(x, 0, 1, TS, WL); rect(x + 3, 0, 1, TS, WD); }
    post(14, 4, 8); post(14, 21, 8);
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
  /* CANCELLO: due montanti alti col cappuccio e l'architrave che li unisce; da fuori le due ante
     si chiudono ruotando verso il centro e dove combaciano compare il lucchetto */
  ctx.save(); ctx.translate(sx, sy);
  const L = '#3a2818', post = '#8a5f38', cap = '#c79a66', beam = '#a97a4c', beamHi = '#e0b97c';
  const outer = side === 'l' ? 2 : TS - 9;
  rect(outer - 1, -8, 9, TS + 8, L); rect(outer, -7, 7, TS + 6, post); rect(outer, -7, 3, TS + 6, beam);
  rect(outer - 2, -11, 11, 4, L); rect(outer - 1, -10, 9, 2, cap);
  rect(0, -5, TS, 8, L); rect(0, -4, TS, 6, beam); rect(0, -4, TS, 2, beamHi); rect(0, 1, TS, 1, '#7a5230');
  if (!open) {
    const t = Math.max(0, Math.min(1, closeT));
    const w = Math.round((TS - 9) * t);
    if (w > 0) {
      const x0 = side === 'l' ? outer + 7 : outer - w;
      rect(x0, 4, w, TS - 8, L); rect(x0 + 1, 5, Math.max(0, w - 2), TS - 10, '#9a6a40');
      for (let yy = 9; yy < TS - 6; yy += 7) rect(x0 + 1, yy, Math.max(0, w - 2), 1, '#7a5230');
    }
    if (side === 'r' && t >= 1) drawGateLock(0, 12);
  }
  ctx.restore();
}
function drawGateLock(sx, sy) {
  rect(sx - 3, sy - 3, 6, 1, '#2a2016'); rect(sx - 3, sy - 2, 1, 3, '#2a2016'); rect(sx + 2, sy - 2, 1, 3, '#2a2016');
  rect(sx - 4, sy + 1, 9, 8, shade8('#c9a227', 0.34)); rect(sx - 3, sy + 2, 7, 6, '#c9a227'); rect(sx - 3, sy + 2, 7, 1, '#f0d470'); px(sx, sy + 4, '#2a2016');
}
/* STAGNO del parco (3×2): ACQUA VERA del gioco (stesse onde/riflessi del mondo) — ma è solo
   decorazione su una casella di parco, quindi NON ci si pesca. Riva scura tutt'attorno + ninfea. */
export function drawParkPond(sx, sy, ppx, ppy, tx, ty, time) {
  /* STAGNO del cortile: acqua del gioco con una riva di sassi tondi tutt'attorno e una ninfea */
  groundTile(WATER, tx, ty, sx, sy, time, 0);
  const stones = (x, y, horiz) => {
    for (let k = 0; k < TS; k += 7) {
      const r = 2 + (((tx * 7 + ty * 3 + k) % 3) + 3) % 3, cx = horiz ? sx + k + 3 : x, cy = horiz ? y : sy + k + 3;
      rect(cx - r - 1, cy - r, r * 2 + 2, r * 2 + 1, '#4a4438'); rect(cx - r, cy - r, r * 2, r * 2 - 1, '#a39c8e'); rect(cx - r, cy - r, r, 1, '#c4bdb0');
    }
  };
  if (ppy === 0) stones(0, sy + 2, true);
  if (ppy === 1) stones(0, sy + TS - 3, true);
  if (ppx === 0) stones(sx + 2, 0, false);
  if (ppx === 2) stones(sx + TS - 3, 0, false);
  if (ppx === 1 && ppy === 1) { rect(sx + 8, sy + 10, 10, 5, '#2f6a3a'); rect(sx + 9, sy + 10, 8, 4, '#4faa5e'); rect(sx + 12, sy + 10, 1, 4, '#2f6a3a'); rect(sx + 14, sy + 8, 3, 3, '#e88ab0'); px(sx + 15, sy + 9, '#f2d24a'); }
}
/* AIUOLA (piatta): zolla di terra con fiori fitti e colorati. */
export function drawFlowerbed(sx, sy, tx, ty) {
  /* AIUOLA: terra smossa bordata di sassolini, piantine con le foglie e fiori di pochi colori */
  ctx.save(); ctx.translate(sx, sy);
  rect(3, 9, 26, 19, '#4a3420'); rect(4, 10, 24, 17, '#6b4a2e'); rect(4, 10, 24, 2, '#7d5838');
  for (let x = 3; x < 29; x += 4) { rect(x, 27, 3, 2, '#8f887a'); rect(x + 1, 8, 3, 2, '#9a9285'); }
  const cols = ['#e08a8a', '#f2dd7a', '#b79be6'];
  for (let i = 0; i < 5; i++) {
    const fx = 7 + Math.floor(vhash(tx, ty, 70 + i) * 18), fy = 14 + Math.floor(vhash(tx, ty, 80 + i) * 9);
    const cc = cols[Math.floor(vhash(tx, ty, 90 + i) * cols.length)];
    rect(fx, fy, 1, 5, '#3f7a44'); rect(fx - 2, fy + 2, 2, 1, '#4f9a48'); rect(fx + 1, fy + 3, 2, 1, '#4f9a48');
    rect(fx - 1, fy - 2, 3, 3, cc); px(fx, fy - 1, '#fff3c8');
  }
  ctx.restore();
}
/* chimera del parco: forma guidata dai parametri delle specie (taglia, becco/corni, ali, coda, serpente) */
/* creatura del parco = proiezione laterale dello STESSO modello voxel VIVO (come libro/museo),
   con CONTORNO scuro così stacca dallo sfondo (anche verde su verde). Cache per composizione. */
function mixHex(a, b, k) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = sh => Math.round(((A >> sh) & 255) * (1 - k) + ((B >> sh) & 255) * k);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
let sniffAt = -9e9, sniffKey = '', sniffBest = null;   // memoria del "fiuto" (vedi sopra)
const creCache = new Map();
/* sprite della creatura in una VISTA: 'side' (di profilo, X orizzontale · Z profondità),
   'front'/'back' (di fronte/spalle, Z orizzontale · X profondità → head-on, più stretto).
   Front mostra gli occhi, back no: così muovendosi in su/giù il compagno "gira". */
export function creatureSprite(a, view, opts) {
  view = view || 'side';
  const o = opts || {};
  const key = a.c.skull + '|' + a.c.torso + '|' + a.c.leg + '|' + view + (o.noLegs ? '|nl' : '') + (o.tuckLegs ? '|tl' : '') + (o.res ? '|r' + o.res : '') + (o.addWings ? '|w' + o.addWings.join('') : '') + (o.wingFlap ? '|f' + o.wingFlap : '');
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
    /* BUFFER di profondità: per ogni pixel il voxel più VICINO (colore, profondità, tipo).
       Da qui si ricava tutto il resto — prima ogni voxel veniva dipinto col suo tono a bande di
       profondità, e la creatura usciva piatta: niente luce, ventre come la schiena, zampe e testa
       fuse col corpo in un'unica macchia. */
    const buf = new Map();
    for (const v of vox) {
      const [h, d] = proj(v);
      const gx = pad + (h - mnh), gy = pad + (mxy - v.y), k = gx + ',' + gy;
      const cur = buf.get(k);
      if (!cur || d > cur.d) buf.set(k, { d, col: v.col || '#c8b078', eye: v.k === 'eye', nearWing: !!v.wing && view === 'side' && v.z > 0 });
    }
    const at = (x, y) => buf.get(x + ',' + y);
    /* altezza del corpo per il ventre chiaro: dall'alto al basso della sagoma, per colonna */
    const colTop = {}, colBot = {};
    for (const k of buf.keys()) { const [x, y] = k.split(',').map(Number); colTop[x] = Math.min(colTop[x] ?? 9e9, y); colBot[x] = Math.max(colBot[x] ?? -9e9, y); }
    const sid = String(a.c.torso || ''), hsh = [...sid].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const pattern = hsh % 3;                                   // 0 niente · 1 macchie · 2 strisce sul dorso
    const cells = [];
    for (const [k, p] of buf) {
      const [x, y] = k.split(',').map(Number);
      if (p.eye) {
        if (view === 'back') { cells.push([x, y, shade8(p.col, 0.9)]); continue; }
        const up = at(x, y - 1), lf = at(x - 1, y);
        cells.push([x, y, (up && up.eye) || (lf && lf.eye) ? '#1a1410' : '#f6f0e0']);   // punto di luce in alto a sinistra dell'occhio
        continue;
      }
      const up = at(x, y - 1), dn = at(x, y + 1), lf = at(x - 1, y), rt = at(x + 1, y);
      const DJ = (o.res || 2) + (view === 'side' ? 0 : 2);   // salto di profondità = parte davanti a un'altra (di fronte i segmenti del corpo fanno gradini, non parti)
      let t = 0.5 + (p.d - mnd) / dr * 0.12;                   // le parti più vicine un filo più chiare
      if (!up || up.d < p.d - DJ) t += 0.32;                   // bordo in alto: prende luce
      if (!dn || dn.d < p.d - DJ) t -= 0.3;                    // bordo in basso: ombra
      if (!lf) t += 0.1;
      if (!rt) t -= 0.12;
      let col = p.col;
      const bh = Math.max(1, colBot[x] - colTop[x]), vy = (y - colTop[x]) / bh;
      if (vy > 0.62 && bh > 6) col = mixHex(col, '#f4e8cc', 0.28);                 // ventre più chiaro
      if (pattern === 1 && vy < 0.45 && ((x * 7 + y * 13 + hsh) % 11) === 0) t -= 0.28;   // macchie sul dorso
      if (pattern === 2 && vy < 0.5 && ((x + (hsh & 7)) % 5) === 0) t -= 0.2;          // strisce
      /* linea interna: il vicino DIETRO è molto più lontano → si scurisce il bordo di chi sta dietro */
      for (const nb of [up, dn, lf, rt]) if (nb && nb.d > p.d + DJ + 1) { t = Math.min(t, 0.12); break; }
      const f = t > 0.78 ? 1.2 : t > 0.52 ? 1.0 : t > 0.28 ? 0.82 : t > 0.08 ? 0.66 : 0.52;
      cells.push([x, y, shade8(col, f)]);
    }
    /* contorno: scuro, ma del colore di chi lo tocca (non un nero uniforme) */
    const seen = new Set();
    for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, nk = nx + ',' + ny;
      if (buf.has(nk) || seen.has(nk)) continue; seen.add(nk);
      g.fillStyle = shade8(buf.get(x + ',' + y).col, 0.3); g.fillRect(nx * S2, ny * S2, S2, S2);
    }
    for (const [x, y, col] of cells) { g.fillStyle = col; g.fillRect(x * S2, y * S2, S2, S2); }
    /* ALA VICINA a parte (solo cavalcatura, di profilo): si ridisegna SOPRA il pilota, altrimenti l'ala
       che sta dalla nostra parte sembrava dietro l'omino */
    if (o.wingFlap != null && view === 'side') {
      const fcv = document.createElement('canvas'); fcv.width = cw * S2; fcv.height = ch * S2;
      const fg = fcv.getContext('2d'), near = new Set();
      for (const [x, y] of cells) if (buf.get(x + ',' + y).nearWing) near.add(x + ',' + y);
      for (const k of near) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = (x + dx) + ',' + (y + dy); if (near.has(nk)) continue;
        fg.fillStyle = shade8(buf.get(k).col, 0.3); fg.fillRect((x + dx) * S2, (y + dy) * S2, S2, S2);
      } }
      for (const [x, y, col] of cells) if (near.has(x + ',' + y)) { fg.fillStyle = col; fg.fillRect(x * S2, y * S2, S2, S2); }
      cv._front = near.size ? fcv : null;
    }
    const grid = {}; for (const k of buf.keys()) grid[k] = 1;
    const cellsXY = cells.map(([x, y]) => [x, y]);
    cv._ax = (spanH / 2 + pad) * S2; // ancoraggio orizzontale (centro)
    /* cima della schiena vicino al centro del corpo (per sella e cavaliere): si scartano teste e
       colli, cercando la colonna più bassa fra le tre centrali */
    let back = -1; const mid = Math.round(spanH / 2 + pad);
    for (let dx = -2; dx <= 2; dx++) { const tpy = colTop[mid + dx]; if (tpy !== undefined && tpy > back) back = tpy; }
    cv._back = back < 0 ? 0 : back;
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
  /* IMBOCCO: sperone di roccia con la bocca buia ad arco, stalattiti sul bordo, sassi ai piedi
     e un luccichio di cristallo in fondo. Stessa pietra della grotta, così si capisce che è lei. */
  ctx.save(); ctx.translate(sx, sy);
  shadow(16, 30, 16);
  const L = '#3a3129';   // contorno della roccia, non nero: il nero resta al BUIO dentro l'imbocco
  for (let y = -6; y < 30; y++) {                                           // sagoma della roccia, più larga alla base
    const u = (y + 6) / 36, w = Math.round(9 + u * 7 + Math.sin(y * 0.9) * 1);
    rect(16 - w - 1, y, w * 2 + 2, 1, L); rect(16 - w, y, w * 2, 1, y < 2 ? '#8a7f70' : '#6e6358'); rect(16 - w, y, 3, 1, '#8a7f70'); rect(16 + w - 3, y, 3, 1, '#4a4239');
  }
  for (const [x, y, r] of [[9, 2, 3], [22, 4, 3], [15, -2, 2]]) { rect(x - r, y, r * 2, 2, '#4a4239'); rect(x - r + 1, y - r + 1, r * 2 - 2, r, '#8a7f70'); }
  for (let y = 10; y < 30; y++) {                                           // bocca ad arco, buio più fitto in fondo
    const w = Math.round(8 * Math.sqrt(Math.max(0, 1 - ((y - 10 - 10) / 12) ** 2 * (y < 20 ? 1 : 0))));
    if (w <= 0) continue;
    rect(16 - w - 1, y, w * 2 + 2, 1, '#2e2720'); rect(16 - w, y, w * 2, 1, y < 16 ? '#0e0c12' : '#08070b');
  }
  for (const x of [11, 16, 21]) { rect(x - 1, 10, 3, 2, '#4a4239'); px(x, 12, '#4a4239'); }
  if (Math.floor(time / 700) % 3 === 0) { px(14, 24, '#a6ecf2'); px(19, 21, '#6fd6e0'); }
  for (const [x, r] of [[3, 3], [28, 2], [8, 2]]) { rect(x - r, 28, r * 2 + 1, r + 1, L); rect(x - r, 27, r * 2, r, '#6e6358'); }
  ctx.restore();
}
/* X della mappa del tesoro: dipinta sul terreno, scintilla che lampeggia */
export function drawXmark(sx, sy, time) {
  /* X del tesoro dipinta a terra: due pennellate rosse, ruvide ai bordi, e un luccichio raro */
  ctx.save(); ctx.translate(sx, sy);
  for (let i = 0; i < 16; i++) {
    const j = (i * 7) % 3 === 0 ? 1 : 0;
    rect(7 + i, 7 + i + j, 4, 3, '#6e2418'); rect(8 + i, 7 + i, 2, 2, '#c24a34');
    rect(22 - i, 7 + i + j, 4, 3, '#6e2418'); rect(23 - i, 7 + i, 2, 2, '#c24a34');
  }
  if (Math.floor(time / 1600) % 4 === 0) { px(16, 3, '#fff3b0'); px(15, 4, '#ffe98a'); px(17, 4, '#ffe98a'); }
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
/* MEZZI DISEGNATI A MANO, IN NATIVO. Bici, motoscafo e pattini sono disegni dello Sprite Studio
   a mezza scala: raddoppiati avevano i pixel grossi il doppio di Digsy e del mondo. Qui il disegno
   a mano resta la base, e se ne ricava la versione a piena risoluzione:
     · Scale2x (l'ingrandimento da pixel art): smussa le diagonali senza inventare forme nuove;
     · un filo di luce sui pixel con il vuoto sopra e un'ombra su quelli con il vuoto sotto,
       lo stesso trattamento di tutto il resto — ma solo sui colori chiari, i contorni restano netti.
   Si genera una volta per vista e si tiene in cache. */
const vehNativeCache = new Map();
function vehNative(id) {
  if (vehNativeCache.has(id)) return vehNativeCache.get(id);
  let out = null;
  try {
    const d = spriteDef(id);
    if (d && typeof document !== 'undefined') {
      const W = d.w, H = d.rows.length, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '.' : (d.rows[y][x] || '.');
      const W2 = W * 2, H2 = H * 2, big = new Array(W2 * H2).fill('.');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const P0 = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
        big[y * 2 * W2 + x * 2] = (C === A && C !== D && A !== B) ? A : P0;
        big[y * 2 * W2 + x * 2 + 1] = (A === B && A !== C && B !== D) ? B : P0;
        big[(y * 2 + 1) * W2 + x * 2] = (D === C && D !== B && C !== A) ? C : P0;
        big[(y * 2 + 1) * W2 + x * 2 + 1] = (B === D && B !== A && D !== C) ? D : P0;
      }
      const cv = document.createElement('canvas'); cv.width = W2; cv.height = H2;
      const c = cv.getContext && cv.getContext('2d');
      if (c && c.fillRect && c !== ctx) {                              // tela vera e distinta (nei test la tela finta è sempre la stessa)
        const luma = hex => { const n = parseInt(hex.slice(1), 16); return 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255); };
        for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
          const ch = big[y * W2 + x]; if (ch === '.') continue;
          let col = d.pal[ch]; if (!col) continue;
          if (luma(col) > 70) {
            if (y > 0 && big[(y - 1) * W2 + x] === '.') col = shade8(col, 1.18);
            else if (y < H2 - 1 && big[(y + 1) * W2 + x] === '.') col = shade8(col, 0.78);
          }
          c.fillStyle = col; c.fillRect(x, y, 1, 1);
        }
        out = { cv, ax: d.ax * 2, ay: d.ay * 2 };
      }
    }
  } catch (e) { out = null; }
  vehNativeCache.set(id, out);
  return out;
}
function bankVeh(kind, sx, y0) {
  const view = P.dir === 'up' ? 'up' : P.dir === 'down' ? 'down' : 'side';
  const id = 'vehicle:' + kind + ':' + view;
  if (!hasSprite(id)) return false;
  const k = vehSpriteScale(id);
  const flip = P.dir === 'left';
  ctx.save();
  if (flip) { ctx.translate(sx * 2, 0); ctx.scale(-1, 1); }
  if (k !== 1) {
    /* sprite a mezza scala: la versione NATIVA ricavata dal disegno a mano (vehNative) */
    const nv = vehNative(id);
    if (nv) { try { ctx.drawImage(nv.cv, snap(sx - nv.ax), snap(y0 - nv.ay)); ctx.restore(); return true; } catch (e) { /* stub dei test */ } }
    ctx.translate(sx, y0); ctx.scale(k, k); drawSprite({ rect }, id, 0, 0);
  }
  else drawSprite({ rect }, id, sx, y0);
  ctx.restore();
  return true;
}
function drawPlayer() { drawPlayerAt(snap(P.x - cam.x), snap(P.y - cam.y)); }
/* il giocatore in un punto dello schermo, con tutto il suo stato (mezzo, scavo, volo): usato dal
   ciclo e dalla galleria delle pose (npm run shot -- pose) */
export function drawPlayerAt(sx, sy) {
  if (isMounted()) { drawFlyingMount(sx, sy); return; }                              // cavalcatura volante di grotta
  if (onBoat()) { (S.tools.motorboat ? drawMotorboat : drawBoat)(sx, sy); return; } // barca/motoscafo (la banca è dentro)
  shadow(sx, sy + 32, 14);
  if (P.digging) { drawDigging(sx, sy); return; }
  drawPlatinumAura(sx, sy);                                             // AURA dorata glitterata: premio del PLATINO
  const fr = (P.moving ? (Math.floor(P.anim * 7) % 2) : 0); const bob = (P.moving && fr === 1) ? -2 : 0;
  const gear = footGear();
  /* la bici è sempre quella costruita attorno all'omino seduto: lo sprite a mano era fatto per il corpo vecchio */
  const bank = gear === 'skates';                                     // pattini nativi agganciati alle scarpe
  const fb = gear === 'bike' && (P.dir === 'up' || P.dir === 'down'); // vista fronte/retro
  const ride = gear === 'bike';
  if (ride && !fb) drawBike(sx, sy + bob, P.moving);                  // profilo: tutta DIETRO l'omino seduto
  if (ride && fb) drawBikeFB(sx, sy + bob, P.moving, P.dir, 'behind');
  drawHero(null, sx - 16, sy + bob, P.dir, fr, false, ride ? 'ride' : undefined);
  if (bank && gear === 'skates') drawBankSkates(sx, sy + bob, fr);    // pattini a mano ANIMATI, ATTACCATI ai piedi (bob incluso; l'animazione è orizzontale, non si annulla col bob)
  else if (gear === 'skates') drawSkates(sx, sy + bob, fr);           // rotelle ai piedi DAVANTI
  else if (fb) drawBikeFB(sx, sy + bob, P.moving, P.dir);             // fronte/retro: manubrio e ruota DAVANTI
}
/* PATTINI disegnati in nativo e AGGANCIATI ALLE SCARPE del corpo (bodyArt: piedi alle righe 30-31).
   Erano il disegno a mano del corpo vecchio raddoppiato a blocchi: grossi, staccati dai piedi
   ("i pattini sono terribili"). Ogni scarpa diventa uno stivaletto rosso col filo bianco, sotto una
   piastra scura e le rotelle gialle; le rotelle girano solo se ci si muove (fase dal tempo).
   Le posizioni dei piedi sono le stesse dei due passi del corpo: il pattino segue la gamba. */
const SKATE_FEET = {
  down: [[[10, 14], [17, 21]], [[8, 12], [19, 23]]], up: [[[10, 14], [17, 21]], [[8, 12], [19, 23]]],
  side: [[[10, 15], [17, 22]], [[13, 19]]],
};
export function drawBankSkates(sx, y0, fr) {
  const view = P.dir === 'up' ? 'up' : P.dir === 'down' ? 'down' : 'side', flip = P.dir === 'left';
  const ox = sx - 16, X = (x, w) => ox + (flip ? 32 - x - w : x);
  const spin = P.moving ? Math.floor(frameTime / 90) % 2 : 0;
  for (const [a, b] of SKATE_FEET[view][fr ? 1 : 0]) {
    const w = b - a + 1;
    rect(X(a, w), y0 + 29, w, 3, '#c9473f'); rect(X(a, w), y0 + 29, w, 1, '#e46a5e');      // stivaletto rosso, larga quanto la scarpa
    rect(X(a, w), y0 + 31, w, 1, '#f2ead8');                                              // filo bianco sopra la suola
    rect(X(a, 1), y0 + 29, 1, 3, '#8e2f29'); rect(X(b, 1), y0 + 29, 1, 3, '#8e2f29');       // fianchi in ombra: i due stivaletti restano due
    rect(X(a, w), y0 + 32, w, 1, '#3a3a44');                                              // piastra
    const wheels = view === 'side' ? [a - 1, Math.round((a + b) / 2) - 1, b] : [a, b - 1];
    for (const wx of wheels) {
      rect(X(wx, 2), y0 + 33, 2, 2, '#e0b040');
      px(X(wx + spin, 1), y0 + 33 + spin, '#8a6a20');                                      // mozzo che gira
    }
  }
  return true;
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
    else if (kind === 'bike') { if (!fb) drawBike(sx, sy, false); else drawBikeFB(sx, sy, false, dir, 'behind'); try { drawHero(null, sx - 16, sy, dir, 0, false, 'ride'); } catch (e) { /* preview */ } if (fb) drawBikeFB(sx, sy, false, dir); }
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
/* BICICLETTA disegnata a celle col contorno scuro sulla sagoma (come il motoscafo): gomme spesse con
   la luce sul battistrada, cerchio in metallo, otto raggi che girano, telaio rosso a tubi col filo
   di luce, sella, corona con la catena, pedivella che gira col pedale, manubrio con le manopole e un
   cestino di vimini davanti. Era fatta di anelli da un pixel e una linea rossa ("la bici è la più
   indietro"). Coordinate dello sprite (0..31, stesso spazio di drawHero); `flip` per la sinistra. */
const BK = { tire: '#2a2622', tread: '#4d463e', rim: '#c3cad0', spoke: '#8f989e', hub: '#6d757b', red: '#c94f4a', redHi: '#e27a70', redDk: '#8e3530',
  seat: '#2f2722', seatHi: '#4a4038', metal: '#9aa2a8', chain: '#5a5550', grip: '#3a2f28', bask: '#c89b5a', baskDk: '#9a7040', baskHi: '#e2bf82', out: '#40211d' };   // contorno: il rosso del telaio scurito, non il nero
function bikePaint(ox, oy, flip, cells) {
  const has = new Set(cells.map(([x, y]) => x + ',' + y));
  const X = x => ox + (flip ? 31 - x : x);
  for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!has.has((x + dx) + ',' + (y + dy))) rect(X(x + dx), oy + y + dy, 1, 1, BK.out);
  for (const [x, y, c] of cells) rect(X(x), oy + y, 1, 1, c);
}
function bikeCellsSide(moving) {
  const m = new Map(), put = (x, y, c) => m.set(Math.round(x) + ',' + Math.round(y), [Math.round(x), Math.round(y), c]);
  const ang = moving ? frameTime / 90 : 0.4;
  const wheel = (cx, cy) => {
    for (let a = 0; a < 64; a++) {
      const t = a * Math.PI / 32, c = Math.cos(t), sn = Math.sin(t);
      put(cx + c * 6.5, cy + sn * 6.5, c < -0.3 && sn < -0.2 ? BK.tread : BK.tire);
      put(cx + c * 5.6, cy + sn * 5.6, BK.tire);
    }
    for (let a = 0; a < 48; a++) { const t = a * Math.PI / 24; put(cx + Math.cos(t) * 4.7, cy + Math.sin(t) * 4.7, BK.rim); }
    /* quattro raggi soli: coi pixel fitti la ruota diventava un disco grigio pieno */
    for (let k = 0; k < 2; k++) { const t = ang + k * Math.PI / 2; for (let r = 1; r <= 3; r++) { put(cx + Math.cos(t) * r, cy + Math.sin(t) * r, BK.spoke); put(cx - Math.cos(t) * r, cy - Math.sin(t) * r, BK.spoke); } }
    put(cx, cy, BK.hub); put(cx + 1, cy, BK.hub);
  };
  const tube = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; put(x, y, BK.redHi); put(x, y + 1, BK.red); put(x + 0.5, y + 1.5, BK.redDk); }
  };
  wheel(5, 27); wheel(27, 27);
  /* catena dalla corona al mozzo dietro */
  for (let x = 6; x <= 16; x += 2) { put(x, 26, BK.chain); put(x + 1, 29, BK.chain); }
  tube(5, 26, 17, 27);                                  // fodero basso
  tube(5, 26, 13, 21);                                  // fodero alto
  tube(13, 20, 17, 27);                                 // piantone
  tube(13, 20, 24, 18);                                 // canna
  tube(17, 27, 24, 19);                                 // obliquo
  for (let y = 18; y <= 27; y++) { put(24 + (y - 18) * 0.33, y, BK.metal); }   // forcella
  /* corona e pedivella che gira col pedale */
  for (let a = 0; a < 16; a++) { const t = a * Math.PI / 8; put(17 + Math.cos(t) * 2, 27.5 + Math.sin(t) * 2, BK.metal); }
  const cr = moving ? frameTime / 130 : 1.2, px2 = 17 + Math.cos(cr) * 3.5, py2 = 27.5 + Math.sin(cr) * 3.5;
  for (let i = 0; i <= 3; i++) put(17 + (px2 - 17) * i / 3, 27.5 + (py2 - 27.5) * i / 3, BK.metal);
  put(px2 - 1, py2, BK.grip); put(px2, py2, BK.grip); put(px2 + 1, py2, BK.grip);
  /* sella sul piantone */
  put(13, 19, BK.metal);
  for (let x = 10; x <= 15; x++) { put(x, 18, x < 12 ? BK.seatHi : BK.seat); put(x, 17, x > 10 && x < 15 ? BK.seat : BK.seat); }
  /* attacco, manubrio e manopola */
  put(24, 17, BK.metal); put(24, 16, BK.metal); put(25, 15, BK.metal); put(26, 15, BK.grip); put(27, 15, BK.grip);
  /* cestino di vimini davanti al manubrio, con una margherita */
  for (let y = 17; y <= 21; y++) for (let x = 27; x <= 31; x++) put(x, y, (x + y) % 2 ? BK.bask : BK.baskDk);
  for (let x = 26; x <= 31; x++) put(x, 16, BK.baskHi);
  put(29, 15, '#f6f2e4'); put(30, 14, '#f6f2e4'); put(28, 14, '#f6f2e4'); put(29, 13, '#f6f2e4'); put(29, 14, '#f2c53d');
  return [...m.values()];
}
export function drawBike(sx, sy, moving) {
  bikePaint(sx - 16, sy, P.dir === 'left', bikeCellsSide(moving));
}
/* bici di FRONTE (giù) / di SPALLE (su). Di fronte: manopole sotto le mani (prima dell'omino),
   manubrio, cestino e ruota davanti a lui (dopo). Di spalle: ruota dietro, parafango, catarifrangente. */
export function drawBikeFB(sx, sy, moving, dir, layer) {
  const ox = sx - 16, oy = sy;
  const m = new Map(), put = (x, y, c) => m.set(x + ',' + y, [x, y, c]);
  const tire = (top, bottom) => {
    const spin = moving ? Math.floor(frameTime / 90) % 3 : 0;
    for (let y = top; y <= bottom; y++) for (let x = 14; x <= 17; x++) {
      const edge = x === 14 || x === 17;
      put(x, y, edge ? BK.tire : ((y + spin) % 3 === 0 ? BK.tread : BK.tire));
    }
    for (let y = top + 1; y < bottom; y++) put(15, y, y % 2 ? BK.rim : BK.spoke);
  };
  if (dir === 'down') {
    if (layer === 'behind') { for (const gx of [3, 25]) for (let x = gx; x < gx + 4; x++) for (let y = 17; y <= 18; y++) put(x, y, BK.grip); bikePaint(ox, oy, false, [...m.values()]); return; }
    for (let x = 6; x <= 25; x++) { put(x, 18, BK.metal); put(x, 19, x > 6 && x < 25 ? BK.hub : BK.metal); }
    for (let y = 19; y <= 25; y++) { put(15, y, BK.red); put(16, y, BK.redDk); }
    tire(24, 32);
    /* cestino davanti, sotto il manubrio */
    for (let y = 20; y <= 24; y++) for (let x = 11; x <= 20; x++) put(x, y, (x + y) % 2 ? BK.bask : BK.baskDk);
    for (let x = 10; x <= 21; x++) put(x, 20, BK.baskHi);
    put(13, 19, '#f6f2e4'); put(14, 18, '#f6f2e4'); put(12, 18, '#f6f2e4'); put(13, 17, '#f6f2e4'); put(13, 18, '#f2c53d');
    bikePaint(ox, oy, false, [...m.values()]);
    for (const [x, y] of [[10, 30], [20, 30]]) { rect(ox + x, oy + y, 3, 2, BK.out); rect(ox + x, oy + y, 3, 1, BK.grip); }   // pedali
    return;
  }
  if (layer === 'behind') { for (let x = 4; x <= 27; x++) { put(x, 17, BK.metal); put(x, 18, BK.hub); } bikePaint(ox, oy, false, [...m.values()]); return; }
  tire(23, 32);
  for (let y = 21; y <= 24; y++) for (let x = 13; x <= 18; x++) put(x, y, y === 21 ? BK.redHi : y === 24 ? BK.redDk : BK.red);   // parafango
  put(15, 25, '#f2c53d'); put(16, 25, '#f2c53d'); put(15, 26, '#e0873a'); put(16, 26, '#e0873a');               // catarifrangente
  bikePaint(ox, oy, false, [...m.values()]);
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
  /* LE GAMBE SI VEDONO, e sono PIEGATE (posa 'ride' in bodyArt): prima il ritaglio si fermava
     alla vita e il cavaliere sembrava un busto appoggiato sul drago (segnalato con foto). Il
     ritaglio resta, ma arriva sotto i piedi: serve ancora a tenere fuori quello che sborda. */
  ctx.save(); ctx.beginPath(); ctx.rect(sx - 24, topY - 20, 48, 62); ctx.clip();
  drawHero(null, sx - 16, topY, dir, 0, false, 'ride');
  ctx.restore();
}
/* CAVALCATURA VOLANTE = la STESSA creatura voxel del compagno (libro, parco, cortile), costruita a
   risoluzione 3 senza zampe e con le ali DEL MODELLO che battono: quattro pose di `wingFlap`, in
   cache. Prima le ali erano triangoli disegnati a parte sopra la creatura ("buttati lì a caso"), e
   un drago disegnato a mano non c'entrava niente con gli altri animali del gioco. */
export function drawFlyingMount(sx, sy) {
  const obj = companionDrawObj();
  if (obj) obj.face = P.dir;
  const dir = P.dir === 'left' ? -1 : 1;
  const view = P.dir === 'up' ? 'back' : P.dir === 'down' ? 'front' : 'side';
  const flap = Math.floor(frameTime / 140) % 4;
  /* con le zampe (senza, di fronte e di spalle era un disco) ma RACCOLTE: in volo una bestia
     non tiene le gambe dritte in giù, le ripiega sotto la pancia (segnalato con foto) */
  const mo = f => ({ res: 3, addWings: [2, 'm'], wingFlap: f, tuckLegs: true });
  const cv = obj ? creatureSprite(obj, view, mo(flap)) : null;
  /* il DORSO si misura sulla posa a ali distese, sempre la stessa: le punte che salgono cambiano
     l'altezza della sagoma, e il pilota misurato su ogni posa saltellava col battito */
  const rest = obj ? creatureSprite(obj, view, mo(1)) : null;
  const cvW = cv ? cv.width : 56, cvH = cv ? cv.height : 36;
  const bob = Math.round(Math.sin(frameTime / 420) * 1.5);            // pilota e drago salgono e scendono INSIEME, piano
  const bottom = sy + 30 + bob;
  const top = bottom - cvH;
  const backTop = rest ? bottom - rest.height + rest._back : top + 10;
  shadow(sx, sy + 40, 18);
  if (cv) {
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    const x0 = snap(sx - (cv._ax || cvW / 2));
    if (P.dir !== 'left' && view === 'side') { ctx.save(); ctx.translate(x0 + cvW, snap(top)); ctx.scale(-1, 1); ctx.drawImage(cv, 0, 0); ctx.restore(); }
    else ctx.drawImage(cv, x0, snap(top));
    ctx.imageSmoothingEnabled = sm;
  }
  /* SELLA PRIMA DEL CAVALIERE: i lembi di cuoio stanno FRA la bestia e la gamba, non davanti.
     Disegnati dopo passavano sopra gli stinchi e si riprendevano le gambe appena rese visibili. */
  for (const s2 of [-1, 1]) { const x = s2 < 0 ? sx - 13 : sx + 8; rect(x, backTop - 1, 5, 8, '#20160f'); rect(x + 1, backTop, 3, 6, '#8a5f38'); rect(x + 1, backTop, 3, 1, '#b07c4a'); }
  /* CAVALIERE seduto: vita sulla sella, mani avanti, GAMBE PIEGATE lungo il fianco (posa 'ride'
     in bodyArt). Prima il ritaglio si fermava alla vita e il cavaliere era un busto appoggiato
     sul drago (segnalato con foto). Il ritaglio resta — serve a tenere fuori quello che sborda —
     ma arriva sotto i piedi. */
  seatHero(sx, backTop - 24, P.dir);
  /* l'ala dalla nostra parte passa DAVANTI al pilota */
  if (cv && cv._front) {
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    const x0 = snap(sx - (cv._ax || cvW / 2));
    if (P.dir !== 'left') { ctx.save(); ctx.translate(x0 + cvW, snap(top)); ctx.scale(-1, 1); ctx.drawImage(cv._front, 0, 0); ctx.restore(); }
    else ctx.drawImage(cv._front, x0, snap(top));
    ctx.imageSmoothingEnabled = sm;
  }
  if (P.moving) { const tx = sx - dir * 22, ty = backTop + 16, w2 = Math.floor(frameTime / 120) % 3; px(tx + w2 * 2, ty, 'rgba(224,206,255,.6)'); px(tx - w2 * 2, ty + 4, 'rgba(198,178,236,.4)'); }
}
/* barca vista di PRUA/POPPA (su/giù): scafo compatto e più stretto del profilo. `up`=si allontana. */
export function drawBoatFB(sx, y0, up) {
  /* di prua o di poppa: scafo a U largo quanto il personaggio, bordo alla vita (le gambe restano
     nascoste), contorno scuro, punta verso l'alto se si allontana e poppa piatta se viene verso di noi */
  const L = '#2a1a10';
  for (let y = 12; y < 30; y++) {
    const u = (y - 12) / 18, w = Math.round(16 - Math.pow(u, 2.2) * 9);
    rect(sx - w - 1, y0 + y, w * 2 + 2, 1, L);
    rect(sx - w, y0 + y, w * 2, 1, y < 14 ? '#c49a63' : '#8a5f38');
    rect(sx - w, y0 + y, 3, 1, '#a97a4c'); rect(sx + w - 3, y0 + y, 3, 1, '#6e4a2e');
    if (y === 19 || y === 24) rect(sx - w + 2, y0 + y, w * 2 - 4, 1, '#6e4a2e');
  }
  if (up) { for (let k = 0; k < 5; k++) { rect(sx - 4 + k, y0 + 11 - k, 8 - k * 2, 1, L); rect(sx - 3 + k, y0 + 11 - k, Math.max(1, 6 - k * 2), 1, '#c49a63'); } }
  else { rect(sx - 10, y0 + 12, 20, 3, L); rect(sx - 9, y0 + 12, 18, 2, '#a97a4c'); }
  ctx.fillStyle = 'rgba(200,235,245,.55)'; ctx.fillRect(sx - 16, y0 + 28, 32, 1); ctx.fillRect(sx - 10, y0 + 31, 20, 1);
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
  const fishing = (P.dir === 'left' || P.dir === 'right') && P.digging && P.digging.kind === 'fish';
  if (!noHero) drawHero(null, sx - 16, y0 - 10, P.dir, 0, false, fishing ? 'lift' : undefined);   // pescando: mano alta sopra il bordo, la canna in mano
  if (!bankVeh('boat', sx, y0)) {                                     // scafo: disegno a mano se c'è, altrimenti procedurale
    if (P.dir === 'up' || P.dir === 'down') drawBoatFB(sx, y0, P.dir === 'up'); // fronte/retro: scafo di prua/poppa
    else {
      /* scafo di PROFILO: chiglia curva con la prua che sale, fasciame a tre corsi, bordo chiaro
         alla vita di Digsy, remo appoggiato, contorno scuro e la linea dell'acqua */
      const d = P.dir === 'left' ? -1 : 1, L = '#2a1a10';
      rect(sx - 18, y0 + 13, 36, 13, '#8a5f38');                          // corpo pieno: le gambe restano sempre coperte
      for (let x = -22; x <= 22; x++) {
        const u = (x * d + 22) / 44, top = y0 + 12 - Math.round(Math.max(0, u - 0.72) * 22), bot = y0 + 27 - Math.round(Math.pow(Math.abs(x) / 22, 3) * 9);
        rect(sx + x, top - 1, 1, bot - top + 2, L);
        rect(sx + x, top, 1, bot - top, '#8a5f38');
        rect(sx + x, top, 1, 2, '#c49a63');
        for (const k of [6, 11]) if (top + k < bot) rect(sx + x, top + k, 1, 1, '#6e4a2e');
        if (bot - 3 > top) rect(sx + x, bot - 3, 1, 3, '#6e4a2e');
      }
      rect(sx - 10 * d - 2, y0 + 8, 3, 18, L); rect(sx - 10 * d - 1, y0 + 9, 1, 16, '#b07c4a');     // remo
      rect(sx - 10 * d - 3, y0 + 22, 5, 6, L); rect(sx - 10 * d - 2, y0 + 23, 3, 4, '#a97a4c');
      ctx.fillStyle = 'rgba(200,235,245,.55)'; ctx.fillRect(sx - 20, y0 + 26, 40, 1); ctx.fillRect(sx - 14, y0 + 29, 28, 1);
    }
  }
  if ((P.dir === 'left' || P.dir === 'right') && P.digging && P.digging.kind === 'fish') { // lenza + galleggiante con cerchi
    const d2 = P.dir === 'left' ? -1 : 1;
    /* canna che parte dalla mano (GRIP della posa 'lift', sopra il bordo della barca) e sale in avanti */
    const [gx, gy] = GRIP.lift.side, hx0 = sx - 16 + (d2 < 0 ? 31 - gx : gx), hy0 = y0 - 10 + gy;
    for (let i = 0; i <= 8; i++) rect(hx0 + d2 * i, hy0 - Math.round(i * 1.4), 2, 1, '#8a5f38');
    const tipX = hx0 + d2 * 8, tipY = hy0 - 11;
    for (let i = 1; i < 6; i++) px(tipX + d2 * i, tipY + i * 3, '#e8e2d0');                // filo
    const bx2 = sx + d2 * 26, by2 = y0 + 6 + Math.round(Math.sin(frameTime / 260) * 2);
    px(bx2, by2, '#c65a54'); px(bx2, by2 - 2, '#f6efdd');                            // galleggiante
    const r2 = Math.floor((P.digging.t / P.digging.dur) * 3) + 1;                    // cerchi nell'acqua
    px(bx2 - r2 * 2, by2 + 2, '#bfe9f4'); px(bx2 + r2 * 2, by2 + 2, '#bfe9f4');
  }
  ctx.restore();
}
/* MOTOSCAFO disegnato a celle: si raccolgono i pixel in una mappa, si aggiunge UN contorno scuro
   attorno alla sagoma e si stende riga per riga a tratti dello stesso colore. Era fatto di cinque
   rettangoli piatti senza bordo: una saponetta bianca con un blocco nero attaccato. */
const MB = {
  out: '#17252d', white: '#f4f7f8', whiteMid: '#dfe7ea', whiteDk: '#b9c6cc', stripe: '#2f95ad', stripeDk: '#1d5f72',
  bottom: '#2b4b5e', bottomDk: '#1f3746', glass: '#8fd3e8', glassHi: '#e6f8ff', glassDk: '#5aa9c2', frame: '#3b4a52',
  cowl: '#3c444b', cowlHi: '#6f7a82', cowlDk: '#262c31', accent: '#d8553f', chrome: '#c9d2d6', foam: '#f2fbfd', foamDk: '#bfe6f1',
};
function cellPainter() {
  const m = new Map();
  const put = (x, y, c) => m.set(x + ',' + y, [x, y, c]);
  const paint = () => {
    const rows = new Map();
    const has = (x, y) => m.has(x + ',' + y);
    const add = (x, y, c) => { if (!rows.has(y)) rows.set(y, new Map()); rows.get(y).set(x, c); };
    for (const [x, y] of m.values()) {
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!has(x + ox, y + oy)) add(x + ox, y + oy, MB.out);
    }
    for (const [x, y, c] of m.values()) add(x, y, c);
    for (const [y, r] of rows) {
      const xs = [...r.keys()].sort((a2, b2) => a2 - b2);
      let i = 0;
      while (i < xs.length) {
        let j = i; const c = r.get(xs[i]);
        while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1 && r.get(xs[j + 1]) === c) j++;
        rect(xs[i], y, xs[j] - xs[i] + 1, 1, c);
        i = j + 1;
      }
    }
  };
  return { put, paint };
}
/* motoscafo di PRUA (verso di noi) o di POPPA (si allontana, motore in vista) */
export function drawMotorboatFB(sx, y0, up) {
  if (up) rect(sx - 11, y0 + 15, 22, 11, MB.white); else rect(sx - 8, y0 + 15, 16, 10, MB.white); // corpo pieno: le gambe restano coperte
  const g = cellPainter();
  const TOP = 14, BOT = up ? 27 : 29;
  for (let y = TOP; y <= BOT; y++) {
    const v = (y - TOP) / (BOT - TOP);
    const w = up ? Math.round(17 - Math.pow(v, 3) * 6) : Math.round(17 - Math.pow(v, 1.5) * 14);
    for (let x = -w; x < w; x++) {
      const side = x < -w + 3 ? 0 : x >= w - 3 ? 2 : 1;
      let c = side === 0 ? MB.white : side === 2 ? MB.whiteDk : MB.whiteMid;
      if (y === TOP) c = MB.chrome;                                    // bordo del ponte
      else if (y === TOP + 1) c = side === 2 ? MB.whiteMid : MB.white;
      else if (y === TOP + 6 || y === TOP + 7) c = y === TOP + 6 ? MB.stripe : MB.stripeDk;
      else if (y >= BOT - 3) c = side === 2 ? MB.bottomDk : MB.bottom;
      if (!up && x >= -1 && x <= 0 && y > TOP + 1 && y < BOT - 3 && c !== MB.stripe && c !== MB.stripeDk) c = MB.whiteDk; // spigolo della prua
      g.put(sx + x, y0 + y, c);
    }
  }
  if (up) {
    /* POPPA: specchio piatto con il fuoribordo al centro, luce di via e scaletta */
    for (let y = 11; y <= 22; y++) for (let x = -5; x < 5; x++) {
      const c = y === 11 ? MB.cowlHi : y === 14 ? MB.accent : x < -3 ? MB.cowlHi : x >= 3 ? MB.cowlDk : MB.cowl;
      g.put(sx + x, y0 + y, c);
    }
    for (let y = 23; y <= 31; y++) for (let x = -1; x < 1; x++) g.put(sx + x, y0 + y, y === 31 ? MB.chrome : MB.cowlDk);
    for (let x = -4; x < 4; x++) g.put(sx + x, y0 + 30, MB.chrome);   // elica
    g.put(sx - 14, y0 + TOP + 2, MB.accent); g.put(sx + 13, y0 + TOP + 2, '#7bd66a');
    for (let y = 16; y <= 20; y += 2) for (let x = 9; x < 12; x++) g.put(sx + x, y0 + y, MB.chrome);
  } else {
    /* PRUA: parabrezza a trapezio davanti al pilota, con il riflesso in diagonale */
    for (let y = 10; y <= 13; y++) {                                  // basso: sotto il mento, non sul viso
      const w = 12 + (y - 10);
      for (let x = -w; x < w; x++) {
        let c = (y === 10 || x === -w || x === w - 1) ? MB.frame : MB.glass;
        if (c === MB.glass && (x - (y - 10)) >= -8 && (x - (y - 10)) <= -6) c = MB.glassHi;
        if (c === MB.glass && y === 13) c = MB.glassDk;
        g.put(sx + x, y0 + y, c);
      }
    }
    g.put(sx - 1, y0 + 30, MB.whiteDk); g.put(sx, y0 + 30, MB.whiteDk);
  }
  g.paint();
}
/* MOTOSCAFO: scafo bianco affusolato con la prua che sale, fascia azzurra, carena scura,
   parabrezza inclinato, fuoribordo con la calandra, schiuma a prua e scia a poppa */
export function drawMotorboat(sx, sy, noHero) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const bob = Math.round(Math.sin(frameTime / 300) * 2);
  const y0 = sy + bob;
  const side = P.dir === 'left' || P.dir === 'right';
  const d = P.dir === 'left' ? -1 : 1;
  const w2 = Math.floor(frameTime / 110) % 4;                         // fase della schiuma: solo dal tempo
  /* scia DIETRO lo scafo (in movimento): due strisce di schiuma che si allargano */
  if (P.moving) {
    if (side) {
      for (let i = 0; i < 4; i++) {
        const x = -d * (30 + i * 7 + w2), spread = 1 + i;
        rect(x, y0 + 25 - spread, 4 - (i > 2 ? 1 : 0), 1, i % 2 ? MB.foamDk : MB.foam);
        rect(x - d * 2, y0 + 27 + spread, 4, 1, MB.foamDk);
      }
    } else {
      const by = P.dir === 'up' ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        const y = y0 + (by > 0 ? 32 + i * 4 : 8 - i * 4) + (w2 % 2);
        rect(-10 - i * 3, y, 4, 1, MB.foam); rect(7 + i * 3, y, 4, 1, MB.foam);
        rect(-2, y + 1, 4, 1, MB.foamDk);
      }
    }
  }
  /* eroe al timone PRIMA dello scafo: gambe nascoste dentro; pescando la mano tiene la canna */
  const fishing = side && P.digging && P.digging.kind === 'fish';
  if (!noHero) drawHero(null, sx - 16, y0 - 8, P.dir, 0, false, fishing ? 'lift' : undefined);
  /* il disegno in banca (vehicle:motorboat:*) resta come riserva, come per la bici: era piatto e senza
     contorno, e vinceva sempre su questo ("miglioriamo il motoscafo?") */
  {
    if (!side) drawMotorboatFB(sx, y0, P.dir === 'up');
    else {
      rect(-18, y0 + 15, 28, 8, MB.white);                           // corpo pieno: le gambe restano coperte
      const g = cellPainter();
      for (let x = -24; x <= 26; x++) {
        const u = (x + 24) / 50;                                       // 0 poppa, 1 prua (disegno verso destra)
        const top = 14 - Math.round(Math.max(0, u - 0.55) * 11);
        const bot = 26 - Math.round(Math.pow(Math.max(0, u - 0.5) * 2, 1.7) * 13);
        if (bot < top + 1) continue;
        for (let y = top; y <= bot; y++) {
          let c = MB.white;
          const k = y - top, fromBot = bot - y;
          if (k === 0) c = MB.chrome;                                  // bordo del ponte
          else if (k === 1) c = MB.whiteMid;
          else if (y === 19 || y === 20) c = y === 19 ? MB.stripe : MB.stripeDk;   // fascia dritta sulla fiancata
          else if (fromBot <= 2 && y >= 22) c = fromBot === 0 ? MB.bottomDk : MB.bottom;
          else if (k >= 2 && y > 20) c = MB.whiteDk;
          if (u < 0.02) c = k === 0 ? MB.chrome : MB.whiteDk;           // specchio di poppa in ombra
          g.put(d * x - (d < 0 ? 1 : 0), y0 + y, c);
        }
      }
      /* parabrezza inclinato all'indietro, davanti al pilota */
      for (let y = 9; y <= 13; y++) {
        const x0 = 9 - Math.round((13 - y) * 0.8), x1 = x0 + 4;
        for (let x = x0; x <= x1; x++) {
          let c = (x === x1 || y === 9) ? MB.frame : MB.glass;
          if (c === MB.glass && x === x0 + 1) c = MB.glassHi;
          g.put(d * x - (d < 0 ? 1 : 0), y0 + y, c);
        }
      }
      /* fuoribordo a poppa: calandra arrotondata con la riga rossa, gambo, elica */
      for (let y = 10; y <= 18; y++) {
        const round = (y === 10) ? 1 : 0;
        for (let x = -30 + round; x <= -25 - round; x++) {
          let c = x === -30 || y === 11 ? MB.cowlHi : x === -25 ? MB.cowlDk : MB.cowl;
          if (y === 14) c = MB.accent;
          g.put(d * x - (d < 0 ? 1 : 0), y0 + y, c);
        }
      }
      for (let y = 19; y <= 28; y++) for (let x = -29; x <= -28; x++) g.put(d * x - (d < 0 ? 1 : 0), y0 + y, MB.cowlDk);
      for (let y = 25; y <= 28; y++) g.put(d * -30 - (d < 0 ? 1 : 0), y0 + y, MB.chrome);
      g.paint();
      /* schiuma che si apre sulla prua (in movimento), linea dell'acqua */
      if (P.moving) for (let i = 0; i < 3; i++) { const fx = d * (25 + i * 2 + (w2 % 2)); rect(fx, y0 + 24 - i * 2, 2, 1, i ? MB.foamDk : MB.foam); }
      ctx.fillStyle = 'rgba(200,235,245,.55)'; ctx.fillRect(-22, y0 + 27, 44, 1); ctx.fillRect(-15, y0 + 30, 30, 1);
    }
  }
  if (fishing) {
    const [gx, gy] = GRIP.lift.side, hx0 = sx - 16 + (d < 0 ? 31 - gx : gx), hy0 = y0 - 8 + gy;
    for (let i = 0; i <= 8; i++) rect(hx0 + d * i, hy0 - Math.round(i * 1.4), 2, 1, '#8a5f38');
    const tipX = hx0 + d * 8, tipY = hy0 - 11;
    for (let i = 1; i < 6; i++) px(tipX + d * i, tipY + i * 3, '#e8e2d0');
    const bx2 = sx + d * 34, by2 = y0 + 8 + Math.round(Math.sin(frameTime / 260) * 2);
    px(bx2, by2, '#c65a54'); px(bx2, by2 - 2, '#f6efdd');
  }
  ctx.restore();
}
/* animazione di scavo/abbattimento/spacco: due colpi per azione, ognuno in tre tempi —
   CARICA (attrezzo alzato), FENDENTE (a metà strada), IMPATTO (schegge, lampo).
   L'attrezzo sta NELLE MANI (pose 'lift'/'strike' di bodyArt, presa GRIP) e il personaggio resta
   girato verso quello che colpisce: prima, di spalle, si voltava sempre verso lo schermo anche
   se l'albero o il masso erano dietro ("se sono di spalle si gira sempre di fronte"). */
const TOOL_OUT = '#241a12';
function tpx(ox, oy, flip, x, y, col) { rect(ox + (flip ? 31 - Math.round(x) : Math.round(x)), oy + Math.round(y), 1, 1, col); }
/* manico di legno, spesso 2, con fascia di presa più scura sotto la mano */
function toolHandle(ox, oy, flip, gx, gy, hx, hy) {
  const n = Math.max(1, Math.round(Math.hypot(hx - gx, hy - gy)));
  const dx = (hx - gx) / n, dy = (hy - gy) / n, nx = -dy, ny = dx;
  for (let i = -2; i <= n; i++) {
    const x = gx + dx * i, y = gy + dy * i;
    tpx(ox, oy, flip, x + nx * 1.5, y + ny * 1.5, TOOL_OUT); tpx(ox, oy, flip, x - nx * 1.5, y - ny * 1.5, TOOL_OUT);
    const grip = i < 3;
    tpx(ox, oy, flip, x + nx * 0.5, y + ny * 0.5, grip ? '#5c4229' : '#b07c4a'); tpx(ox, oy, flip, x - nx * 0.5, y - ny * 0.5, grip ? '#4a3420' : '#8a5f38');
  }
  return { dx, dy, nx, ny };
}
/* testa dell'attrezzo in (hx, hy), orientata col manico (dx, dy) e la sua perpendicolare (nx, ny) */
function toolHeadAt(ox, oy, flip, kind, hx, hy, v, target) {
  const { dx, dy } = v;
  /* la LAMA guarda il bersaglio: fra le due perpendicolari al manico si prende quella rivolta verso
     ciò che si colpisce ("occhio alla direzione della lama") */
  let { nx, ny } = v;
  if (target && nx * target[0] + ny * target[1] < 0) { nx = -nx; ny = -ny; }
  const pts = [];
  if (kind === 'mine') {
    /* PICCONE: lama curva a due punte, perpendicolare al manico, che si piega verso di esso */
    for (let s2 = -8; s2 <= 8; s2 += 0.5) {
      const bend = -(s2 * s2) * 0.045, th = Math.abs(s2) > 6 ? 0.5 : 1.5;
      for (let t = -th; t <= th; t += 0.5) pts.push([hx + nx * s2 + dx * (bend + t), hy + ny * s2 + dy * (bend + t), Math.abs(s2) > 6.5 ? '#6f685c' : t < 0 ? '#d7d0c2' : '#9a9285']);
    }
    for (let t = -2; t <= 2; t += 0.5) for (let w = -1.5; w <= 1.5; w += 0.5) pts.push([hx + dx * t + nx * w, hy + dy * t + ny * w, '#7f776a']);   // occhio del manico
  } else if (kind === 'chop') {
    /* ACCETTA: cuneo color ruggine con il filo d'acciaio verso il bersaglio */
    for (let s2 = 0; s2 <= 6; s2 += 0.5) for (let t = -2.5; t <= 2.5; t += 0.5) {
      const w = 2.5 + s2 * 0.35; if (Math.abs(t) > w) continue;
      pts.push([hx + nx * s2 + dx * t, hy + ny * s2 + dy * t, s2 > 5 ? '#dfe3e6' : s2 < 1 ? '#8a4a24' : '#b5622e']);
    }
  } else {
    /* PALA: lama larga a cucchiaio in fondo al manico */
    for (let t = 0; t <= 7; t += 0.5) for (let w = -4; w <= 4; w += 0.5) {
      const ww = t > 5 ? 4 - (t - 5) * 1.2 : 4; if (Math.abs(w) > ww) continue;
      pts.push([hx + dx * t + nx * w, hy + dy * t + ny * w, t < 1.5 ? '#d7d0c2' : Math.abs(w) > ww - 1 ? '#8f887b' : '#b8b0a2']);
    }
  }
  const key = new Map(pts.map(([x, y, c]) => [Math.round(x) + ',' + Math.round(y), c]));
  for (const k of key.keys()) { const [x, y] = k.split(',').map(Number); for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!key.has((x + ex) + ',' + (y + ey))) tpx(ox, oy, flip, x + ex, y + ey, TOOL_OUT); }
  for (const [k, c] of key) { const [x, y] = k.split(',').map(Number); tpx(ox, oy, flip, x, y, c); }
}
function drawDigging(sx, sy) {
  ctx.save(); ctx.translate(sx, sy); sx = 0; sy = 0;
  const d = P.digging, kind = d.kind || 'dig';
  const ph = d.t / d.dur;
  const u = (ph * 2) % 1;                                   // fase del colpo in corso (due per azione)
  const stage = u < 0.42 ? 'carica' : u < 0.58 ? 'fendente' : 'impatto';
  const dir = P.dir;                                        // resta girato verso il bersaglio, anche di spalle
  const view = dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'side', flip = dir === 'left';
  const pose = stage === 'carica' ? 'lift' : 'strike';
  const bob = stage === 'carica' ? -1 : stage === 'impatto' ? 2 : 0;
  const ox = sx - 16, oy = sy + bob;
  const [gx, gy] = GRIP[pose][view === 'up' ? 'down' : view];
  /* dove sta la testa dell'attrezzo in ogni tempo (coordinate dello sprite) */
  let hx, hy;
  if (view === 'side') {
    if (stage === 'carica') { hx = gx - 5; hy = gy - 18; }        // alzato sopra la testa
    else if (stage === 'fendente') { hx = gx + 11; hy = gy - 6; }  // a metà arco, davanti
    else { hx = gx + 7; hy = gy + 9; }                            // piantato davanti ai piedi
  } else if (view === 'down') {
    if (stage === 'carica') { hx = gx + 2; hy = gy - 17; }
    else if (stage === 'fendente') { hx = gx + 1; hy = gy + 2; }
    else { hx = gx; hy = gy + 10; }
  } else {                                                          // di spalle: colpisce verso l'alto dello schermo
    if (stage === 'carica') { hx = gx + 6; hy = gy - 10; }          // sulla spalla, spunta accanto alla testa
    else if (stage === 'fendente') { hx = gx - 3; hy = gy - 28; }   // sopra il cappello
    else { hx = gx - 6; hy = gy - 23; }
  }
  const target = view === 'side' ? [1, 0] : view === 'down' ? [0, 1] : [0, -1];   // coordinate dello sprite (a sinistra si specchia)
  const tool = () => { const v = toolHandle(ox, oy, flip, gx, gy, hx, hy); toolHeadAt(ox, oy, flip, kind, hx, hy, v, target); };
  const behind = view === 'up';                                    // di spalle l'attrezzo sta davanti a lui, cioè dietro sullo schermo
  if (behind) tool();
  drawHero(null, ox, oy, dir, 0, false, pose);
  if (!behind) tool();
  if (stage === 'impatto') {
    const t2 = (u - 0.58) / 0.42;
    const fx = view === 'side' ? (flip ? -(hx - 16) : hx - 16) : view === 'down' ? 0 : -6;
    const fy = view === 'up' ? -24 : view === 'down' ? 14 : 12;
    const bx = sx + fx, by = sy + 12 + fy;
    if (t2 < 0.25) {                                               // lampo dell'impatto
      const L = kind === 'mine' ? '#fff6c8' : '#f4ead8';
      rect(bx - 1, by - 4, 2, 8, L); rect(bx - 4, by - 1, 8, 2, L); px(bx, by, '#ffffff');
    }
    const OX = [-12, -7, -3, 3, 8, 12], H = [9, 13, 7, 11, 13, 8];
    const CC = kind === 'chop' ? ['#8a5f38', '#b98d59', '#4e7a3d', '#8a5f38', '#619a4c', '#b98d59']
      : kind === 'mine' ? ['#9a9285', '#c9c2b2', '#7f776a', '#9a9285', '#c9c2b2', '#7f776a']
      : ['#8a6a42', '#c9a06a', '#6d4f30', '#b98d59', '#8a6a42', '#c9a06a'];
    for (let i = 0; i < 6; i++) rect(Math.round(bx + OX[i] * (0.3 + t2)), Math.round(by - Math.sin(Math.PI * t2) * H[i]), 2, 2, CC[i]);
    if (kind === 'mine' && t2 < 0.5) for (const [a2, b2] of [[-5, -6], [6, -5], [-2, -9]]) px(Math.round(bx + a2 * (1 + t2 * 2)), Math.round(by + b2 * (1 + t2)), '#ffe27a');   // scintille
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
  ctx.setTransform(view.PX, 0, 0, view.PX, 0, 0);
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
  if (CAVE.digging) {                                  // stesso colpo di piccone del mondo: attrezzo in mano
    const sd = P.digging, sdir = P.dir;
    P.digging = { kind: 'mine', t: CAVE.digging.t, dur: CAVE.digging.dur }; P.dir = CAVE.dir || 'down';
    try { drawDigging(px0, py0); } finally { P.digging = sd; P.dir = sdir; }
  }
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
  cam.x = Math.round((P.x - W / 2) * view.PX) / view.PX;
  cam.y = Math.round((P.y - H / 2) * view.PX) / view.PX;
  /* MARGINE attorno allo schermo: alberi, lampioni ed edifici sono più alti o larghi della loro
     casella, e raccolti solo sulle caselle in vista comparivano DI COLPO al bordo ("voglio evitare
     il pop up delle strutture, devono precaricarsi prima di entrare nel monitor"). Si raccolgono
     anche 2 caselle a sinistra/destra/sopra e 3 sotto (le chiome salgono di due caselle). */
  const tx0 = Math.floor(cam.x / TS) - 3, ty0 = Math.floor(cam.y / TS) - 3;
  const LMARG = 6; // margine per le MERAVIGLIE (fino a 9 tile di larghezza e ~70px di altezza)
  const tx1 = tx0 + VW + 6, ty1 = ty0 + VH + 7;
  /* OGNI SCENA SI RIMETTE LA SUA SCALA, come già fanno grotta e interni qui sopra. Il mondo
     aperto era l'unico a fidarsi di quella lasciata da `fit()`, e l'intro disegna con una scala
     tutta sua (view.PX × Z, Z fino a 2-3 sugli schermi grandi): finita l'intro senza passare
     da una stanza — cioè quando non si entra in casa — il primo fotogramma del mondo usciva
     ingrandito del doppio, con Digsy fuori dall'inquadratura. Sembrava "omino invisibile e
     super zoom", e capitava solo su certe finestre perché su quelle piccole Z vale 1 e la
     scala sbagliata è identica a quella giusta (segnalato con foto). */
  ctx.setTransform(view.PX, 0, 0, view.PX, 0, 0);
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
  const gateOpenNow = !yrNow || gateHeldOpen() || (() => {
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
    /* le zone dei VICINI: servono alla fascia di mescolanza fra due biomi (tiles.zoneBlend),
       che fa mordere l'una dentro l'altra invece di tagliare netto fra una casella e la
       successiva. Quattro letture in più per casella, tutte già in cache a blocchi. */
    const ziQui = (ti || yd) ? 0 : zoneIdxAt(tx, ty);
    const nbz = (ti || yd) ? null : [zoneIdxAt(tx, ty - 1), zoneIdxAt(tx + 1, ty), zoneIdxAt(tx, ty + 1), zoneIdxAt(tx - 1, ty)];
    groundTile(t, tx, ty, sx, sy, time, ziQui, nb, nbz);
    if (dugSet.has(tx + ',' + ty) && !(ti && ti.floor)) drawHole(sx, sy, tx, ty);
    if (!ti && !yd) { const pit = boneSitePitAt(tx, ty); if (pit) drawBonePit(sx, sy, tx - pit.x, ty - pit.y); }
    /* CASA: un edificio 3×2 fuori dal sistema città — niente decorazioni/siti sotto */
    if (!ti && !yd && hf && tx >= hf.x0 && tx <= hf.x1 && ty >= hf.y0 && ty <= hf.y1) {
      /* dalla PRIMA casella visibile, non dall'angolo: con l'angolo fuori schermo la casa non c'era */
      if (tx === Math.max(hf.x0, tx0) && ty === Math.max(hf.y0, ty0)) { const hsx = hf.x0 * TS - cam.x, hsy = hf.y0 * TS - cam.y; ents.push({ y: (hf.y1 + 1) * TS - cam.y, f: () => drawHouse(hf, hsx, hsy) }); }
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
      else if (ti.building && tx === Math.max(ti.building.x0, tx0) && ty === Math.max(ti.building.y0, ty0)) { const b = ti.building; ents.push({ y: (b.y1 + 1) * TS - cam.y, f: () => drawBuilding(b, b.x0 * TS - cam.x, b.y0 * TS - cam.y) }); }
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
    else if (d === 'shell') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 2, f: () => { if (rip) shadow(sx + 8, sy + 13, 4); drawShell(sx, sy, rip, tx, ty); if (rip) glint(sx + 12, sy + 3, time, tx, ty); } }); }
    else if (d === 'cactus') ents.push({ y: sy + 15, f: () => drawCactus(sx, sy, tx, ty) });
    else if (d === 'sandspire') ents.push({ y: sy + 15, f: () => drawSandspire(sx, sy, tx, ty) });
    else if (d === 'deadtree') ents.push({ y: sy + 15, f: () => drawDeadtree(sx, sy, tx, ty) });
    else if (d === 'mushroom') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 8, f: () => { if (rip) shadow(sx + 8, sy + 12, 4); drawMushroom(sx, sy, time, tx, ty, rip); if (rip) glint(sx + 12, sy + 2, time, tx, ty); } }); }
    else if (d === 'redspire') ents.push({ y: sy + 15, f: () => drawRedspire(sx, sy, tx, ty) });
    else if (d === 'orecrystal') ents.push({ y: sy + 13, f: () => drawOrecrystal(sx, sy, tx, ty) });
    else if (d === 'reed') { const rip = !!harvestDecoAt(tx, ty); ents.push({ y: sy + 14, f: () => { if (rip) shadow(sx + 8, sy + 14, 4); drawReed(sx, sy, time, tx, ty, rip); if (rip) glint(sx + 12, sy + 1, time, tx, ty); } }); }
    else if (d === 'icecrystal') ents.push({ y: sy + 13, f: () => drawIcecrystal(sx, sy, tx, ty) });
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
  /* IN VOLO si sta SOPRA a tutto: ordinato coi piedi come a terra, passando davanti a una casa la
     cavalcatura spariva dietro il tetto e sembrava attraversarla ("con il volo passo in mezzo agli
     oggetti e agli edifici"). L'ombra resta a terra, quindi si capisce dove si sorvola. */
  ents.push({ y: isMounted() ? 9e8 : P.y - cam.y + TS, f: drawPlayer });
  /* COMPAGNO: chimera/risvegliato che insegue il player — MA non quando lo si cavalca (in volo
     il compagno È la cavalcatura sotto l'eroe: disegnarlo anche qui lo sdoppiava) */
  const compObj = companionDrawObj();
  if (compObj && !isMounted()) {
    /* `cys` = i PIEDI del compagno sullo schermo, con la stessa convenzione di Digsy (ancora +
       FOOT_DY). Veniva disegnato con la base sull'ancora, cioè 26px sopra i suoi piedi veri —
       un resto del mondo a 16px: stando dietro a Digsy davanti a una porta sembrava dentro la
       casa, sulla facciata o sul tetto (segnalato con foto: "il buddy si compenetra"). */
    const cxs = snap(COMP.x - cam.x), cys = snap(COMP.y + FOOT_DY - cam.y);
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
      drawCompanionWork(cxs, cys, time, compObj);
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
  if (!P.gateWalk && (!P.gateTurnUntil || Date.now() >= P.gateTurnUntil)) return;
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
