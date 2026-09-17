/* INTERNI — le sei stanze a tema, la galleria del museo e gli NPC che ci vivono.
   Erano quasi 500 righe dentro render.js: qui stanno insieme perché condividono la stessa
   idea (una stanza a tile con arredi solidi e un NPC che pattuglia dietro il bancone) e
   nessuna di loro serve al mondo aperto. */
import { TS, spById, PARTS, ZONES, MUSEUM_ZONES, zonePools, FURN_BY_ID, PEDESTAL_ID, furnIsSolid, furnSize, furnPlace } from './data.js';
import { drawFurnPiece, drawGroundTile, drawPaperBand, furnRise, roomDefault, furnRotatable } from './furnArt.js';
import { drawReturnPortal } from './render.js'; // ciclo sicuro: chiamata solo a runtime, come drawInteriorScene(render.js→interiors.js)
import { S, P } from './state.js';
import { isWall, areaAt, roomBox, roomDoor, ROT, ATRIO, CAVE_Y1 } from './museumPlan.js';
import { ctx, view, hudPad } from './screen.js';
import { snap, px, rect, shadow, shade8, BRUSH } from './brush.js';
import { INT, NPCS, FURN, benchList, pedList, roomOrigin, ROOM_W, ROOM_H, GAL_DESK, MENTOR, CUT, museumPetSpot, CENTRO, ATRIO_PLANTS } from './interior.js';
import { CORR_W, CORR_H, ROOM_TILE_W, ROOM_TILE_H, houseGates, roomUnlocked, ATRIO_PORTAL, furnLayer, roomPaper, roomGround, isHolding, holdItem, holdPlacement, rotateHandleRect } from './house.js';
import { drawHero, applyLook } from './sprites.js';
import { drawMarbleTile, drawParquetTile, drawRoomFloor, drawColumn, drawBench, drawCaseBack, drawCaseFront, drawRope, drawCentrepiece, drawDeskArt, drawGalleryTopWall, WINGS, drawWingFloor, drawWallTile, drawArch, drawSkylight } from './museumArt.js';
import { EMAP, iconPaths } from './icons.js';
import { SHOP_TOP, SHOP_WINDOWS, drawShopFloor, drawShopWall, drawShopShell, drawShopFront, drawCounter, drawStoreProps, drawStoreFloorProps, drawInnProps, drawInnFloorProps, drawBarberProps, drawBarberFloorProps, drawTailorProps, drawTailorFloorProps, drawLabProps, drawLabFloorProps, drawFurnitureProps, drawFurnitureFloorProps, drawMuseumPet} from './shopArt.js';
import { ATRIO_TOP, ATRIO_BOTTOM, ROOM_TOP, ROOM_BOTTOM, sceneShift, roomStyle, wallCap, drawCrown, drawWainscot, drawBaseboard, floorShadow, drawWindow, drawWindowLight, drawDoormat, drawRunner, drawBackDoor, drawSideDoor, drawFrontDoorway, drawSconce, drawFramedPicture, drawCoatHooks, drawWallPlant } from './houseArt.js';
import { composedPartsVox, shadeHex, buildVoxels, baseSpec } from './bones.js';
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
      c2.fillStyle = v.k === 'eye' ? '#3a352c' : zt < 0.34 ? '#8f887a' : zt < 0.67 ? '#d6d0c2' : '#ffffff';
      c2.fillRect(ox + (v.x - mnx), oy + (mxy - v.y), 1, 1); // un pixel per voxel: il modello è già a risoluzione doppia (R in bones.js)
    }
    outlineSprite(cv, '#5e574a');                              // contorno d'osso scuro, non nero
  } catch (e) { cv = null; /* stub nei test */ }
  exCache.set(key, cv); return cv;
}
/* LO SCHELETRO MONTATO dell'atrio: la specie LEGGENDARIA della zona in cui sta il museo,
   costruita con lo stesso `buildVoxels` del Libro e proiettata a voxel DOPPI, così si legge
   da lontano ed è alta il doppio del giocatore. Disegnare a mano un animale nuovo avrebbe
   voluto dire mettere in sala una bestia che nel gioco non esiste (sembrava un diplodoco, e
   qui di dinosauri non se ne scavano). Cache per specie: il modello non cambia mai. */
const cpCache = new Map();
export function centrepieceSprite() {
  const zi = zoneIdxAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
  const z = MUSEUM_ZONES[zi] || MUSEUM_ZONES[0];
  const pool = zonePools[z.id] || [];
  const sp = pool.find(s => s.r === 'leggendario') || pool[pool.length - 1];
  if (!sp) return null;
  let cv = cpCache.get(sp.id); if (cv !== undefined) return cv;
  cv = null;
  try {
    const vox = buildVoxels(baseSpec(sp)), S2 = 2;
    let mnx = 9e9, mxx = -9e9, mny = 9e9, mxy = -9e9, mnz = 9e9, mxz = -9e9;
    for (const v of vox) { mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x); mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y); mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z); }
    cv = document.createElement('canvas');
    cv.width = (mxx - mnx + 1) * S2 + 8; cv.height = (mxy - mny + 1) * S2 + 8;
    const c2 = cv.getContext('2d'); const zr = Math.max(1, mxz - mnz);
    for (const v of vox.slice().sort((a, b) => a.z - b.z)) {
      const zt = (v.z - mnz) / zr;
      c2.fillStyle = v.k === 'eye' ? '#3a352c' : zt < 0.34 ? '#9a9283' : zt < 0.67 ? '#ded7c7' : '#fffdf5';
      c2.fillRect(4 + (v.x - mnx) * S2, 4 + (mxy - v.y) * S2, S2, S2);
    }
    /* contorno D'OSSO, non nero, e una passata sola: due passate di nero davano una crosta
       scura tutt'attorno alla montatura, la prima cosa che si vedeva entrando (segnalato con
       foto). Un bruno caldo scuro stacca lo stesso dal marmo e non sembra un ritaglio. */
    outlineSprite(cv, '#57503f');
  } catch (e) { cv = null; /* stub nei test */ }
  cpCache.set(sp.id, cv); return cv;
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
/* icona del bioma sulla targa della sala (stesso set di icone del gioco) */
function drawZoneIcon(g, z, cx, cy) {
  const name = EMAP[z.icon] || 'globe';
  try {
    const ps = typeof Path2D === 'function' ? iconPaths(name).map(d => new Path2D(d)) : [];
    if (ps.length && ctx.fill) { ctx.save(); ctx.translate(cx - 8, cy - 8); ctx.scale(2 / 3, 2 / 3); ctx.fillStyle = '#e8c34a'; for (const p of ps) ctx.fill(p); ctx.restore(); return; }
  } catch (e) { /* stub */ }
  rect(cx - 4, cy - 4, 8, 8, '#e8c34a');
}
export function drawMuseumGallery(time) {
  const W = view.W, H = view.H, rw = INT.w * TS, rh = INT.h * TS;
  /* camera ancorata alla griglia dei pixel FISICI (come nel mondo): niente scatti */
  const camx = snap(rw <= W ? (rw - W) / 2 : Math.max(0, Math.min(rw - W, INT.x - W / 2)));
  /* cutscene: NIENTE clamp basso — alzo l'inquadratura così il player e la consegna
     stanno nella fascia visibile fra le bande cinema */
  const camy = CUT.on
    ? snap(Math.max(0, INT.y - Math.round(H * 0.72)))
    : snap(galleryCamY(H, rh));
  ctx.save(); ctx.translate(-camx, -camy);
  rect(camx, camy, W, H, '#1a1510');                  // fuori dall'edificio: buio, non parquet
  const t0x = Math.max(-1, Math.floor(camx / TS) - 1), t1x = Math.min(INT.w + 1, Math.ceil((camx + W) / TS) + 2);
  const t0y = Math.max(-1, Math.floor(camy / TS) - 1), t1y = Math.min(INT.h + 2, Math.ceil((camy + H) / TS) + 2);
  /* --------- PAVIMENTI: marmo negli spazi comuni, materiale proprio in ogni ala --------- */
  const wingOf = a => a.startsWith('sala') ? +a.slice(4) : a === 'grotte' ? 6 : -1;
  for (let ty = t0y; ty < t1y; ty++) for (let tx = t0x; tx < t1x; tx++) {
    const a = areaAt(tx, ty);
    if (a === 'muro') continue;
    const wi = wingOf(a);
    if (wi >= 0) drawWingFloor(BRUSH, tx, ty, wi); else drawMarbleTile(BRUSH, tx, ty);
  }
  /* passatoia rossa: dalla porta, attraverso la rotonda, su per il corridoio. È il filo che
     dice dove andare in un edificio grande. */
  { const cxg = Math.floor(INT.w / 2) * TS + TS / 2;
    /* due tratti: il corridoio delle sale e l'ingresso. Dentro la rotonda si ferma: là comanda
       il medaglione di marmo, una passatoia che lo taglia in due lo rovina. */
    const tratti = [[(CAVE_Y1 + 1) * TS, ROT.y0 * TS + TS], [ROT.y1 * TS, rh - TS]];
    for (const [y0r, y1r] of tratti) {
      rect(cxg - 22, y0r, 44, y1r - y0r, '#5c2a26'); rect(cxg - 20, y0r, 40, y1r - y0r, '#a8453c');
      rect(cxg - 16, y0r, 2, y1r - y0r, '#c9a227'); rect(cxg + 14, y0r, 2, y1r - y0r, '#c9a227');
    } }
  /* lucernari: rotonda e sale — il soffitto alto non si può disegnare, la luce sì */
  /* MEDAGLIONE della rotonda: un tondo di marmo intarsiato sotto lo scheletro. È il segno che
     dice "questo è il centro del museo" prima ancora di alzare gli occhi sul pezzo grosso.
     Disegnato a fasce PIENE (un anello di puntini si legge come sporco, non come intarsio). */
  { const mcx = CENTRO.x, mcy = CENTRO.y - 10, R = 5.4 * TS, K = 0.6;
    const disco = (rr, col) => { for (let dy = -Math.ceil(rr * K); dy <= rr * K; dy++) {
      const w2 = Math.round(rr * Math.sqrt(Math.max(0, 1 - (dy / (rr * K)) * (dy / (rr * K)))));
      rect(mcx - w2, mcy + dy, w2 * 2, 1, col);
    } };
    disco(R, '#b3a78c'); disco(R - 3, '#efe7d4'); disco(R - 26, '#c9a227'); disco(R - 29, '#dcd2b8'); disco(R - 52, '#e9e1cc');
    for (let a2 = 0; a2 < 360; a2 += 30) {                                 // raggi dell'intarsio
      const ca = Math.cos(a2 * Math.PI / 180), sa = Math.sin(a2 * Math.PI / 180) * K;
      for (let r2 = R - 50; r2 < R - 28; r2 += 2) rect(Math.round(mcx + ca * r2), Math.round(mcy + sa * r2), 2, 2, '#c4b99d');
    } }
  drawSkylight(BRUSH, Math.floor(INT.w / 2) * TS, (ROT.y0 + 7) * TS, 20 * TS, 11 * TS);
  MUSEUM_ZONES.forEach((z, zi) => {
    const b = roomBox(zi);
    drawSkylight(BRUSH, (b.rx + b.rw / 2) * TS, (b.ry + b.rh / 2) * TS, (b.rw - 4) * TS, (b.rh - 4) * TS);
  });
  /* --------- I MURI: gli stessi di museumPlan, quindi quello che si vede è quello che ferma.
     Entrano nella lista per profondità: l'alzata sfora in alto e il giocatore ci passa davanti. */
  const ents = [];
  /* il muro prende il colore dell'ala che chiude (così ogni sala ha le SUE pareti); negli
     spazi comuni è la pietra calda dell'atrio, più scura del marmo del pavimento */
  const wallCol = (tx, ty) => {
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const w = WINGS[wingOf(areaAt(tx + dx, ty + dy))];
      if (w) return w.wall;
    }
    return '#bdae90';
  };
  for (let ty = t0y; ty < t1y; ty++) for (let tx = t0x; tx < t1x; tx++) {
    if (!isWall(tx, ty)) continue;
    const col = wallCol(tx, ty);
    ents.push({ y: ty * TS + TS, f: () => drawWallTile(BRUSH, tx, ty, col, !isWall(tx, ty + 1), !isWall(tx, ty - 1)) });
  }
  /* --------- GLI ARCHI: ogni varco della pianta ha i suoi stipiti --------- */
  const cxm = Math.floor(INT.w / 2);
  const archi = [[cxm - 3, ROT.y1, 7, false], [cxm - 3, ROT.y0, 7, false], [cxm - 2, ATRIO.y1, 5, false]];
  for (let zi = 0; zi < 7; zi++) { const d = roomDoor(zi); archi.push([d.x, d.y, d.n, d.vert]); }
  for (const [ax, ay, an, av] of archi) {
    if (ax * TS - camx < -200 || ax * TS - camx > W + 200 || ay * TS - camy < -200 || ay * TS - camy > H + 200) continue;
    ents.push({ y: ay * TS + (av ? 0 : TS) - 1, f: () => drawArch(BRUSH, ax, ay, an, av, wallCol(ax, ay)) });
  }
  /* --------- LE SALE: targa sopra la porta, panche, cordoni --------- */
  MUSEUM_ZONES.forEach((z, zi) => {
    const b = roomBox(zi);
    const x0 = b.rx * TS, y0 = b.ry * TS, wpx = b.rw * TS, hpx = b.rh * TS;
    if (x0 - camx > W + 60 || x0 + wpx - camx < -60 || y0 - camy > H + 160 || y0 + hpx - camy < -60) return;
    const col = (WINGS[zi] || WINGS[0]).acc;
    /* due panche in mezzo alla sala: ci si siede e si guarda, come in un museo. Le coordinate
       vengono da benchList(), la STESSA lista che le rende solide: scritte solo qui, non
       fermavano nessuno e ci si passava attraverso (segnalato con foto). */
    for (const b2 of benchList()) if (b2.zi === zi) ents.push({ y: b2.y1 - 3, f: () => drawBench(BRUSH, b2.x0, b2.y0 + 2, col) });
    /* TARGA della sala APPESA AL MURO di fondo, centrata sulla sala. Stava di fianco alla porta,
       a mezza altezza: cioè in mezzo al pavimento, davanti alle teche (segnalato con foto). In un
       museo il nome della sala sta sopra, sul muro, e non copre niente. */
    /* le teche della fila alta sporgono 20px sopra il bordo della sala (CASE.Y): la targa va
       SOPRA di loro, o le taglia a metà */
    const tgx = x0 + wpx / 2, tgy = y0 - 50;
    /* ordinata DOPO il muro di fondo (che è un'entità anche lui) o ci finirebbe dietro */
    ents.push({ y: y0 + 2, f: () => drawWingPlate(z, zi, tgx, tgy, col) });
  });
  /* --------- ATRIO: bancone del Curatore a sinistra, insegna, zerbino, vasi --------- */
  const deskCx = (GAL_DESK.x0 + GAL_DESK.x1) / 2;
  const doorCx = cxm * TS + TS / 2;
  { const my = (ATRIO.y1 - 1) * TS + 4;                      // zerbino davanti alla porta
    rect(doorCx - 28, my, 56, 22, '#8a5f38'); rect(doorCx - 26, my + 2, 52, 18, '#a97a4c');
    for (let i = 0; i < 6; i++) rect(doorCx - 22 + i * 8, my + 6, 4, 10, '#8a5f38'); }
  /* NIENTE INSEGNA sopra il bancone: chi è dentro il museo sa già dov'è, e quel pannello
     appeso in aria sopra la testa del Curatore non si capiva cosa fosse (segnalato due volte). */
  ents.push({ y: GAL_DESK.y1 - 2, f: () => drawDeskArt(BRUSH, GAL_DESK.x0, GAL_DESK.y0, GAL_DESK.x1, GAL_DESK.y1, time) });
  for (const [ppx, ppy] of ATRIO_PLANTS) ents.push({ y: ppy + 18, f: () => drawPlantPot(ppx, ppy, time) });
  /* --------- LA ROTONDA: lo scheletro montato, al centro, con panche e cordoni attorno --------- */
  { const sk = centrepieceSprite(), px2 = CENTRO.x, py2 = CENTRO.y;
    ents.push({ y: py2 + 6, f: () => {
      drawCentrepiece(BRUSH, px2, py2, time, sk ? sk.width : 120);
      if (sk) { try { ctx.drawImage(sk, px2 - Math.floor(sk.width / 2), py2 - 14 - sk.height); } catch (e) { /* stub */ } }
      drawRope(BRUSH, px2 - 84, px2 - 40, py2 + 16, '#8a3f3a');
      drawRope(BRUSH, px2 + 40, px2 + 84, py2 + 16, '#8a3f3a');
    } });
    for (const b3 of benchList()) if (b3.rot) ents.push({ y: b3.y1 - 3, f: () => drawBench(BRUSH, b3.x0, b3.y0 + 2, '#c9a227') }); }
  /* --------- TECHE --------- */
  for (const pd of pedList()) {
    const bx = pd.tx * TS, by = pd.ty * TS;
    if (bx - camx < -3 * TS || bx - camx > W + 3 * TS || by - camy < -3 * TS || by - camy > H + 3 * TS) continue;
    ents.push({ y: by + 15, f: () => drawCase(pd, time) });
  }
  /* LA TARTARUGA: anche il Museo ha la sua bestiola da coccolare */
  { const tp = museumPetSpot(S.day);
    ents.push({ y: tp.y, f: () => drawMuseumPet(BRUSH, tp.x, tp.y, time, INT.pet) }); }
  /* --------- PERSONAGGI --------- */
  const npx = CUT.on ? CUT.x : deskCx;
  const npy = CUT.on ? CUT.y : GAL_DESK.y0 - 8;
  const paintNpc = () => {
    const hop = CUT.on && CUT.phase === 'give' ? -Math.abs(Math.round(Math.sin(time / 180) * 2)) : 0;
    /* mentre cammina guarda dove va e muove i piedi; fermo al banco resta girato verso il
       giocatore. Prima teneva la faccia in basso anche andando di lato: un granchio. */
    const camminando = CUT.on && (CUT.phase === 'walk' || CUT.phase === 'back');
    const fdir = CUT.on ? (camminando ? (CUT.dir || 'down') : 'down') : null;
    drawNpc(npx, npy + hop, 'museum', time, fdir, camminando ? Math.floor(CUT.step || 0) % 2 : 0);
    if (CUT.on && CUT.phase === 'give') { // il Libro si alza brillando sopra la testa
      const lift = Math.min(14, CUT.t * 12), bob = Math.round(Math.sin(time / 160) * 1.5);
      const by2 = npy - 6 - lift + bob;
      rect(npx - 5, by2, 11, 8, '#6e4a2e'); rect(npx - 4, by2 + 1, 9, 6, '#8a5f38');
      rect(npx - 3, by2 + 2, 3, 4, '#f6efdd'); rect(npx + 1, by2 + 2, 3, 4, '#f1e2c4');
      px(npx, by2 + 3, '#c9a227');
      for (let i = 0; i < 4; i++) {
        const a = time / 240 + i * Math.PI / 2;
        px(Math.round(npx + Math.cos(a) * 10), Math.round(by2 + 3 + Math.sin(a) * 6), i % 2 ? '#f2c53d' : '#fff2b8');
      }
    }
  };
  ents.push({ y: npy + 16, f: paintNpc });
  { const mx2 = snap(MENTOR.x), my2 = snap(MENTOR.y);
    const mfr = MENTOR.wait > 0 ? 0 : Math.floor(MENTOR.anim * 7) % 2;
    ents.push({ y: MENTOR.y + 16, f: () => drawMentor(mx2, my2, MENTOR.dir, mfr) }); }
  ents.push({ y: INT.y + 6, f: () => {
    const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
    const sx = snap(INT.x), sy = snap(INT.y);
    shadow(sx, sy + 12, 12);
    drawHero(null, sx - 16, sy - 20, INT.dir, fr);
  } });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.f()); // chi ha y minore (più in alto) sta dietro
  /* fuori dalla porta si vede la piazza: è la zona su cui si clicca per uscire */
  for (let y = rh; y < rh + GAL_FOOT; y += TS) for (let x = (cxm - 4) * TS; x < (cxm + 5) * TS; x += TS) {
    const k = ((x / TS) * 7 + (y / TS) * 13) % 3;
    rect(x, y, TS, TS, k === 0 ? '#d8c49a' : k === 1 ? '#d2bd90' : '#dfcda6');
    px(x + 3, y + 5, '#c3ad7e'); px(x + 11, y + 10, '#c3ad7e');
  }
  /* dialoghi della cutscene: baloon in coord SCHERMO (la galleria è traslata di -cam) */
  if (CUT.on && CUT.thanks) drawSayBalloon(INT.x - camx, INT.y - 14 - camy, CUT.thanks);
  else if (CUT.on && CUT.line) drawSayBalloon(npx - camx, npy - 12 - camy, CUT.line);
  ctx.restore();
}
/* la teca di un piedistallo: sfondo, i pezzi consegnati, il vetro davanti */
function drawCase(pd, time) {
  const bx = pd.tx * TS, by = pd.ty * TS;
  const parts = S.museum[pd.sp.id] || [];
  const full = parts.length === PARTS.length;
  const col = (WINGS[pd.zi] || WINGS[0]).acc;
  drawCaseBack(BRUSH, bx, by, col, full, time);
  const cv = parts.length ? exhibitSprite(pd.sp.id, parts) : null;
  if (cv) { try { ctx.drawImage(cv, bx - 20, by - 50); } catch (e) { /* stub */ } }
  else { rect(bx + 13, by - 30, 6, 6, 'rgba(255,255,255,.12)'); rect(bx + 15, by - 22, 2, 10, 'rgba(255,255,255,.12)'); }
  const rc = { comune: '#b8b0a2', raro: '#4e8d7c', eccezionale: '#d8973c', leggendario: '#8d6ac8' }[pd.sp.r] || '#b8b0a2';
  drawCaseFront(BRUSH, bx, by, rc, full, time, (S.amberDone || []).includes(pd.sp.id));
}
/* TARGA di una sala: icona del bioma, nome e quante specie sono esposte. Senza, le sette ali
   sono indistinguibili e non si capisce in quale si è entrati. */
function drawWingPlate(z, zi, cx, cy, col) {
  const pool = zonePools[z.id] || [];
  const done = pool.filter(sp => (S.museum[sp.id] || []).length === PARTS.length).length;
  const label = zoneName(z.id).toUpperCase(), sub = done + '/' + pool.length;
  ctx.font = '700 9px ui-monospace, Menlo, monospace'; ctx.textBaseline = 'top';
  const wOf = t => { const m = ctx.measureText && ctx.measureText(t); return Math.ceil((m && m.width) || t.length * 5.4); };
  const PADL = 30, PADR = 10, GAP = 12;
  const wl = wOf(label), ws = wOf(sub);
  const bw2 = Math.max(96, PADL + wl + GAP + ws + PADR);
  const bx2 = Math.round(cx - bw2 / 2), by2 = Math.round(cy);
  rect(bx2 + 3, by2 + 4, bw2, 22, 'rgba(30,20,10,.3)');
  rect(bx2 - 1, by2 - 1, bw2 + 2, 22, '#241a10');
  rect(bx2, by2, bw2, 20, '#3a3a44'); rect(bx2, by2, bw2, 3, col); rect(bx2, by2 + 17, bw2, 3, shade8(col, 0.6));
  rect(bx2 + 3, by2 + 5, bw2 - 6, 1, '#c9a227');
  drawZoneIcon(BRUSH, z, bx2 + 16, by2 + 10);
  ctx.fillStyle = '#f3ecda'; ctx.fillText(label, bx2 + PADL, by2 + 6);
  ctx.fillStyle = done === pool.length && pool.length ? '#8fd06a' : '#e8c34a';
  ctx.fillText(sub, bx2 + bw2 - PADR - ws, by2 + 6);
}
/* vaso con la pianta: le fronde sfiorano oltre la casella, il pg ci passa dietro */
function drawPlantPot(pxo, vy, time) {
  const sway = Math.round(Math.sin(time / 900 + pxo) * 2);
  shadow(pxo + 10, vy + 20, 12);
  rect(pxo + 2, vy, 16, 20, '#b5652a'); rect(pxo + 2, vy, 16, 4, '#d07d3c'); rect(pxo, vy - 2, 20, 4, '#8a4a1e');
  rect(pxo + 4, vy + 6, 12, 2, '#8a4a1e');
  const cx3 = pxo + 10;
  rect(cx3, vy - 16, 2, 18, '#3f6b34');
  for (const [lx, ly, hh] of [[-8, -16, 12], [-4, -24, 16], [0, -30, 18], [4, -24, 16], [8, -16, 12]]) {
    for (let k = 0; k < hh; k += 2) rect(cx3 + Math.round(lx * (1 - k / hh)) + (k > hh - 6 ? sway : 0), vy + ly + k, 2, 2, k < 4 ? '#619a4c' : '#4e7a3d');
  }
  px(cx3 - 2, vy - 30 + sway, '#7fb862'); px(cx3 + 2, vy - 32 + sway, '#7fb862');
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
export function drawNpc(x, y, type, time, forceDir, walkFrame) {
  const saved = S.look;
  S.look = { hat: '#d06b43', shirt: '#57a58f', pants: '#c88a44', skin: '#f3cfa0', ...((NPCS[type] || {}).look || {}) };
  applyLook();
  /* forceDir (cutscene): posa fissa, niente pattugliamento/sway */
  const p = forceDir ? { dir: forceDir, ox: 0, mov: true } : npcPose(time);
  /* `walkFrame` arriva dalla cutscene: il passo segue quanto ha camminato davvero, non un timer */
  const fr = walkFrame != null ? walkFrame : (p.mov ? Math.floor(time / 170) % 2 : 0);
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
  return { x: -Math.floor((W - rw) / 2), y: -sceneTop(H, SHOP_TOP, rh, 4) };
}
/* dove sta, sullo schermo, la scena della casa attiva: centrata tenendo conto di TUTTO il
   disegno (la faccia del muro di fondo sale oltre la stanza). interiorCam usa questo stesso
   punto, altrimenti un tocco finirebbe qualche pixel più in là di dove si vede. */
/* CENTRATURA VERTICALE di una scena piccola: nello spazio SOTTO la barra dell'HUD, quando ci
   sta. Centrata su tutto lo schermo, su un telefono in orizzontale la parte alta (le porte
   dell'atrio, il bancone) finiva sotto i tag. Se non ci sta, si centra su tutto lo schermo. */
export function sceneTop(H, top, h, bottom) {
  const pad = hudPad(), tot = top + h + bottom;
  if (tot <= H - pad) return pad + Math.floor((H - pad - tot) / 2) + top;
  return Math.floor((H - tot) / 2) + top;
}
export function houseOrigin(W, H) {
  const atrio = INT.houseRoom == null;
  const rw = (atrio ? CORR_W : ROOM_TILE_W) * TS, rh = (atrio ? CORR_H : ROOM_TILE_H) * TS;
  const oy = atrio ? sceneTop(H, ATRIO_TOP, rh, ATRIO_BOTTOM) : sceneTop(H, ROOM_TOP, rh, ROOM_BOTTOM);
  return { ox: Math.floor((W - rw) / 2), oy };
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
  /* il portale è un arco alto: chi gli passa DIETRO (piedi più in alto della sua base) deve
     restare coperto, chi gli sta davanti gli si disegna sopra */
  const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
  const eroe = () => { shadow(Math.round(INT.x), Math.round(INT.y) + 12, 12); drawHero(null, Math.round(INT.x) - 16, Math.round(INT.y) - 20, INT.dir, fr); };
  const dietro = S.returnPortal && INT.y < ATRIO_PORTAL.y;
  if (dietro) eroe();
  if (S.returnPortal) drawReturnPortal(ATRIO_PORTAL.x, ATRIO_PORTAL.y, time);   // centrato sul punto in cui si attiva
  if (!dietro) eroe();
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
    px(x + xx, y + yy, q > (r - 1.2) * (r - 1.2) ? shadeHex('#f6efdd', 0.42) : '#f6efdd');
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
/* un'ellisse morbida e schiacciata: due passate, la seconda più stretta, così sfuma */
function ombraArredo(cx, cy, rx) {
  for (const [k, a] of [[1, 0.07], [0.62, 0.07]]) {
    const r = Math.max(3, Math.round(rx * k));
    for (let i = -r; i <= r; i++) {
      const h = Math.round(3 * Math.sqrt(Math.max(0, 1 - (i * i) / (r * r))));
      if (h > 0) rect(Math.round(cx) + i, Math.round(cy) - h, 1, h * 2, 'rgba(15,25,15,' + a + ')');
    }
  }
}

export function drawInteriorScene(time) {
  const W = view.W, H = view.H;
  ctx.setTransform(view.PX, 0, 0, view.PX, 0, 0);
  ctx.fillStyle = '#12100c'; ctx.fillRect(0, 0, W, H); // fuori: buio
  if (INT.b && INT.b.type === 'museum') { drawMuseumGallery(time); return; } // galleria con camera
  if (INT.b && INT.b.type === 'house') { drawHouseRooms(time); return; }     // atrio o una stanza (scene separate)
  const rw = INT.w * TS, rh = INT.h * TS;
  const ox = Math.floor((W - rw) / 2), oy = sceneTop(H, SHOP_TOP, rh, 4);   // stesso punto di interiorCam
  ctx.save(); ctx.translate(ox, oy);
  const type = INT.b ? INT.b.type : 'store';
  /* BOTTEGA (shopArt.js): lo stesso guscio della casa con i materiali del mestiere, il
     bancone vero e gli arredi ridisegnati. Gli ingombri (FURN in interior.js) non cambiano. */
  const g = BRUSH, nk = night(), wins = SHOP_WINDOWS[type] || [];
  const wood = INT_WOOD[INT.town ? zoneIdxAt(INT.town.C.x, INT.town.C.y) : 0] || INT_WOOD[0];
  drawShopFloor(g, type, rw, rh, wood, drawGroundTile);
  drawShopWall(g, type, rw, rh, nk, time, wins);
  drawShopShell(g, type, rw, rh, nk, wins);
  const wallProps = { store: drawStoreProps, inn: drawInnProps, barber: drawBarberProps, tailor: drawTailorProps, lab: drawLabProps, furniture: drawFurnitureProps }[type];
  const floorProps = { store: drawStoreFloorProps, inn: drawInnFloorProps, barber: drawBarberFloorProps, tailor: drawTailorFloorProps, lab: drawLabFloorProps, furniture: drawFurnitureFloorProps }[type];
  /* OMBRA DI CONTATTO sotto ogni arredo, come ce l'ha Digsy: senza, i mobili sembrano
     appiccicati al muro invece che poggiati sul pavimento. Va sotto tutto quello che sta nella
     stanza, quindi si posa prima dei mobili. */
  for (const f of (FURN[type] || [])) ombraArredo((f.x0 + f.x1) / 2, f.y1 + 1, (f.x1 - f.x0) / 2 + 2);
  if (wallProps) wallProps(g, rw, rh, time);
  /* bancone davanti all'NPC, poi l'NPC, poi quello che sta sul bancone e sul pavimento
     (davanti a lui: l'NPC non cammina davanti alla merce) */
  drawCounter(g, type, TS, Math.round(2.2 * TS), rw - 2 * TS, 20);
  drawNpc(rw / 2, 1.9 * TS, type, time);
  if (floorProps) { const e = type === 'lab' ? breedEgg() : null; floorProps(g, rw, rh, time, e, !!e && eggReady(), INT.pet); }
  const fr = INT.moving ? (Math.floor(INT.anim * 7) % 2) : 0;
  shadow(Math.round(INT.x), Math.round(INT.y) + 12, 12);
  drawHero(null, Math.round(INT.x) - 16, Math.round(INT.y) - 20, INT.dir, fr);
  drawShopFront(BRUSH, rw, rh);
  if (INT.say) drawSayBalloon(ox + rw / 2, oy + 1.9 * TS - 10, INT.say.text); // coord SCHERMO (stanza centrata in ox,oy)
  ctx.restore();
}
