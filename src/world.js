/* Mondo procedurale: terreni, decorazioni, città (con parco), collisioni, spawn */
import { TS, GOODS } from './data.js';
import { vhash, fbm } from './noise.js';
import { zoneIdxAt } from './regions.js';
import { wonderWidth } from './wonders.js';
import { wonderSolidTile } from './wonderart.js';
import { choppedSet, minedSet, pickedSet } from './state.js';

/* ---------- terreni ---------- */
export const DEEP = 0, WATER = 1, SAND = 2, GRASS = 3, FOREST = 4, DIRT = 5, MTN = 6, FLOOR = 7, PARK = 8, ROAD = 9;

const terrCache = new Map();
export function baseTerrain(tx, ty) {
  const key = tx + ',' + ty; let c = terrCache.get(key); if (c !== undefined) return c;
  const e = fbm(tx * 0.055, ty * 0.055, 1), m = fbm(tx * 0.05 + 40, ty * 0.05 + 40, 2);
  let t;
  if (e < 0.30) t = DEEP; else if (e < 0.37) t = WATER; else if (e < 0.425) t = SAND;
  else if (e > 0.80) t = MTN;
  else { if (m > 0.62) t = FOREST; else if (m < 0.33 && e > 0.62) t = DIRT; else t = GRASS; }
  terrCache.set(key, t); return t;
}
export function terrBiome(t) { return t === SAND ? 'costa' : t === FOREST ? 'foresta' : t === DIRT ? 'roccia' : t === MTN ? 'roccia' : 'prato'; }
export function walkableGround(t) { return t === SAND || t === GRASS || t === FOREST || t === DIRT || t === FLOOR; }
export function diggable(t) { return t === SAND || t === GRASS || t === FOREST || t === DIRT; }
export const digChance = { 2: 0.46, 3: 0.2, 4: 0.32, 5: 0.4 }; // sabbia/prato/foresta/terra (più basse: scavo non banale)

/* alberi abbattibili con l'accetta, rocce spaccabili col piccone */
export const CHOPPABLE = ['tree', 'deadtree', 'cactus'];
export const MINEABLE = ['boulder', 'redspire', 'orecrystal', 'icecrystal', 'bonespire'];
/* decorazioni deterministiche FIRMATE PER ZONA: ogni bioma ha i suoi oggetti.
   Cache per tile (deterministica): decoAt gira ogni frame per ogni tile in vista. */
const decoCache = new Map();
/* decorazione NATURALE della casella, senza sapere nulla di grotte.
   Serve a spezzare una ricorsione vera: decoAt → caveClearingAt → caveEntranceAt →
   caveCompute → siteAt → siteForCell → decoAt → … Ogni anello tocca caselle diverse, quindi
   non è un ciclo infinito ma una catena che si allunga: con la cache fredda (arrivo in una
   zona mai vista, per esempio dopo un teletrasporto) arrivava a esaurire lo stack.
   Chi genera il mondo usa questa; chi disegna usa decoAt. */
export function decoNatural(tx, ty) {
  const key = tx + ',' + ty;
  if (choppedSet.has(key) || minedSet.has(key)) return null;
  const c = decoCache.get(key); if (c !== undefined) return c;
  const r = decoCompute(tx, ty);
  decoCache.set(key, r); return r;
}
export function decoAt(tx, ty) {
  const key = tx + ',' + ty;
  if (choppedSet.has(key) || minedSet.has(key)) return null; // abbattuto/spaccato (non cacheato)
  if (caveGuardAt(tx, ty)) return 'boulder';                 // masso che sigilla una grotta
  if (caveClearingAt(tx, ty)) return null;                   // spiazzo davanti alla grotta: sgombro
  return decoNatural(tx, ty);
}
function decoCompute(tx, ty) {
  const t = baseTerrain(tx, ty);
  if (townInfo(tx, ty)) return null; // niente decorazioni selvatiche in città
  const zi = zoneIdxAt(tx, ty);
  if (zi === 1) { // DUNE OSSEE: cactus, costole che affiorano, conchiglie
    if (t === SAND || t === GRASS || t === DIRT) {
      if (vhash(tx, ty, 7) < 0.04) return 'cactus';
      if (vhash(tx, ty, 8) < 0.025) return 'bonespire';
      if (vhash(tx, ty, 9) < 0.05) return 'shell';
    }
    if (t === MTN && vhash(tx, ty, 8) < 0.4) return 'boulder';
    return null;
  }
  if (zi === 2) { // BOSCHI CINEREI: alberi cupi, alberi morti, funghi, ceppi
    if (t === FOREST) {
      if (vhash(tx, ty, 7) < 0.19) return 'tree';
      if (vhash(tx, ty, 11) < 0.09) return 'deadtree';
      if (vhash(tx, ty, 12) < 0.06) return 'mushroom';
    }
    if (t === GRASS) {
      if (vhash(tx, ty, 7) < 0.08) return 'deadtree';
      if (vhash(tx, ty, 12) < 0.05) return 'mushroom';
      if (vhash(tx, ty, 13) < 0.035) return 'stump';
    }
    if ((t === MTN || t === DIRT) && vhash(tx, ty, 8) < 0.22) return 'boulder';
    return null;
  }
  if (zi === 3) { // TERRE ROSSE: guglie di roccia, cristalli, alberi secchi
    if (t === DIRT || t === GRASS) {
      if (vhash(tx, ty, 7) < 0.05) return 'redspire';
      if (vhash(tx, ty, 11) < 0.028) return 'orecrystal';
    }
    if (t === FOREST && vhash(tx, ty, 7) < 0.16) return 'tree';
    if (t === MTN && vhash(tx, ty, 8) < 0.45) return 'boulder';
    return null;
  }
  if (zi === 4) { // PALUDE ANTICA: canneti, alberi contorti
    if (t === GRASS) {
      if (vhash(tx, ty, 7) < 0.11) return 'reed';
      if (vhash(tx, ty, 11) < 0.05) return 'deadtree';
    }
    if (t === FOREST) {
      if (vhash(tx, ty, 7) < 0.22) return 'tree';
      if (vhash(tx, ty, 12) < 0.08) return 'reed';
    }
    if (t === MTN && vhash(tx, ty, 8) < 0.3) return 'boulder';
    return null;
  }
  if (zi === 5) { // LANDE GELIDE: cristalli di ghiaccio, pini innevati
    if (t === GRASS || t === DIRT) {
      if (vhash(tx, ty, 7) < 0.05) return 'icecrystal';
      if (vhash(tx, ty, 11) < 0.03) return 'tree';
    }
    if (t === FOREST && vhash(tx, ty, 7) < 0.22) return 'tree';
    if (t === MTN && vhash(tx, ty, 8) < 0.4) return 'boulder';
    return null;
  }
  // PRATI DORATI: alberi, fiori, balle di fieno
  if (t === FOREST && vhash(tx, ty, 7) < 0.25) return 'tree';
  if (t === GRASS && vhash(tx, ty, 7) < 0.045) return 'tree';
  if (t === GRASS && vhash(tx, ty, 14) < 0.016) return 'hay';
  if (t === DIRT && vhash(tx, ty, 8) < 0.11) return 'boulder';
  if (t === MTN && vhash(tx, ty, 8) < 0.4) return 'boulder';
  if (t === SAND && vhash(tx, ty, 9) < 0.05) return 'shell';
  if (t === GRASS && vhash(tx, ty, 10) < 0.06) return 'flower';
  return null;
}
/* Se una cosa sembra raccoglibile, deve esserlo: funghi, conchiglie, fiori e canne finivano
   per ingannare (il giocatore ci provava e non succedeva niente). Ora si raccolgono con E e
   danno l'oggetto corrispondente del bioma. */
export const HARVEST_DECO = { mushroom: 'funghetto', shell: 'conchiglia', flower: 'fiordaliso', reed: 'giunco' };
/* Solo una MINORANZA è matura e si raccoglie: il resto resta paesaggio (un campo di fiori
   deve restare un campo di fiori). Quelli maturi hanno ombra e stellina, così si riconoscono
   a colpo d'occhio e la promessa "se brilla, si raccoglie" resta vera. */
export const HARVEST_SHARE = 0.16;
export function harvestDecoAt(tx, ty) {
  const d = decoAt(tx, ty);
  if (!d || !HARVEST_DECO[d]) return null;
  return vhash(tx, ty, 71) < HARVEST_SHARE ? HARVEST_DECO[d] : null;
}
export function decoSolid(d) {
  return d === 'tree' || d === 'boulder' || d === 'cactus' || d === 'bonespire' || d === 'deadtree' ||
    d === 'stump' || d === 'redspire' || d === 'orecrystal' || d === 'icecrystal' || d === 'hay';
}

/* ---------- OGGETTI di superficie raccoglibili con E (oggetti VERI del bioma, da vendere) ----------
   sparsi su terreno camminabile, mai in città, mai sopra un ostacolo; deterministici; esaurimento in pickedSet.
   Ritorna l'ID dell'oggetto (es. 'conchiglia'): ciò che vedi è ciò che raccogli. */
const PICKUP_ZONES = ['prati', 'dune', 'boschi', 'terre', 'palude', 'ghiacci'];
export function pickupAt(tx, ty) {
  if (pickedSet.has(tx + ',' + ty)) return null;
  const t = baseTerrain(tx, ty);
  if (t === FLOOR || !walkableGround(t)) return null; // niente su pavimenti città/parco né acqua
  if (townInfo(tx, ty)) return null;
  const d = decoAt(tx, ty); if (d) return null;        // libero: mai sopra decorazioni/ostacoli
  /* DENSITÀ: la raccolta è il BOOTSTRAP (i primi 15🪙 per la pala), non una rendita che
     compete con lo scavo — quello costa energia e deve restare la fonte principale.
     0.8% dava ~200🪙 in 5 minuti camminando: più dell'intera giornata di scavi. */
  if (vhash(tx, ty, 21) >= 0.003) return null;          // ~0.3% delle caselle
  const list = GOODS[PICKUP_ZONES[zoneIdxAt(tx, ty)] || 'prati'];
  const k = vhash(tx, ty, 22);                          // 60/30/10: comune→raro (per valore)
  const idx = k < 0.6 ? 0 : k < 0.9 ? 1 : 2;
  return list[idx][0];                                  // id dell'oggetto (es. 'spiga','ambra',…)
}

/* ---------- città ---------- */
export const TCELL = 62;
/* taglie: borgo (2 edifici), paese (4), città (6 + parco); footprint edificio 3x2, porta in basso al centro */
export const TOWN_SIZES = [
  { id: 'borgo', w: [-6, 6], h: [-6, 3], defs: [['store', 'Negozio', -5, -5], ['inn', 'Locanda', 3, -5]] },
  {
    id: 'paese', w: [-8, 7], h: [-7, 4], defs: [
      ['store', 'Negozio', -7, -6], ['lab', 'Laboratorio', 3, -6],
      ['inn', 'Locanda', -7, 1], ['barber', 'Barbiere', 3, 1]]
  },
  {
    id: 'città', w: [-11, 13], h: [-7, 4], defs: [
      ['store', 'Negozio', -10, -6], ['lab', 'Laboratorio', -1, -6], ['museum', 'Museo', 8, -6],
      /* fila bassa sfalsata: il viale centrale (x=C.x) resta sempre libero */
      ['inn', 'Locanda', -10, 1], ['barber', 'Barbiere', -4, 1], ['tailor', 'Sartoria', 4, 1]]
  },
];
const TN_A = ['Ossa', 'Terra', 'Cava', 'Selce', 'Creta', 'Ambra', 'Tufo', 'Ghiaia', 'Argilla', 'Fossa', 'Sabbia', 'Rocca'];
const TN_B = ['bruna', 'dolce', 'fonda', 'vecchia', 'lieta', 'chiara', 'rossa', 'verde', 'antica', 'lenta', 'viva', 'muta'];
export function townName(cx, cy) {
  const a = TN_A[Math.floor(vhash(cx, cy, 120) * TN_A.length)];
  const b = TN_B[Math.floor(vhash(cx, cy, 121) * TN_B.length)];
  return /[aeiou]/.test(b[0]) && /[aeiou]$/.test(a) ? a.slice(0, -1) + b : a + b; // evita vocali doppie ("Terrantica")
}

const townCache = new Map();
export function townForCell(cx, cy) {
  const key = cx + ',' + cy; if (townCache.has(key)) return townCache.get(key);
  let town = null;
  if (vhash(cx, cy, 111) < 0.32) {
    const roll = vhash(cx, cy, 115);
    const size = TOWN_SIZES[roll < 0.4 ? 0 : roll < 0.75 ? 1 : 2];
    /* jitter dentro la cella con margini che contengono l'intera città (e il parco in basso) */
    const mx = Math.max(-size.w[0], size.w[1]) + 1;
    const jx = mx + Math.floor(vhash(cx, cy, 112) * (TCELL - 2 * mx));
    const jy = 8 + Math.floor(vhash(cx, cy, 113) * (TCELL - 20)); // città (e parco) sempre dentro la cella
    const C = { x: cx * TCELL + jx, y: cy * TCELL + jy };
    const bt = baseTerrain(C.x, C.y); // serve terra al centro
    if (bt !== DEEP && bt !== WATER && bt !== MTN) {
      const B = [];
      size.defs.forEach(([type, name, dx, dy], i) => {
        /* jitter ±1 per edificio: case meno in riga; fila bassa solo verso l'alto (porte mai sul recinto) */
        const jbx = Math.floor(vhash(cx, cy, 130 + i) * 3) - 1;
        const jby = dy < 0 ? Math.floor(vhash(cx, cy, 140 + i) * 3) - 1 : Math.floor(vhash(cx, cy, 140 + i) * 2) - 1;
        const bw = type === 'museum' ? 5 : 3; // il museo è GRANDE anche fuori
        const x0 = C.x + dx + jbx, y0 = C.y + dy + jby;
        B.push({ type, name, x0, y0, x1: x0 + bw - 1, y1: y0 + 1, doorx: x0 + (bw >> 1), doory: y0 + 1 });
      });
      town = {
        C, buildings: B, name: townName(cx, cy), size: size.id, key,
        x0: C.x + size.w[0], y0: C.y + size.h[0], x1: C.x + size.w[1], y1: C.y + size.h[1],
      };
      /* le città grandi hanno un parco recintato sotto la piazza (chimere risvegliate) */
      if (size.id === 'città') town.pen = { x0: C.x - 5, y0: C.y + 5, x1: C.x + 4, y1: C.y + 10 };
      /* strade sterrate: vialetto porta→strada per ogni casa, strada orizzontale davanti a
         ogni fila e viale centrale che scende a sud (fino al cancello del parco nelle città) */
      const roads = new Set();
      const rd = (x, y) => roads.add(x + ',' + y);
      const topRoad = C.y + Math.min(...size.defs.map(d => d[3])) + 3; // sempre sotto ogni porta (jitter incluso)
      const botB = B.filter(b => b.y0 >= C.y), topB = B.filter(b => b.y0 < C.y);
      const botRoad = botB.length ? C.y + 3 : null;
      for (const [grp, ry] of [[topB, topRoad], [botB, botRoad]]) {
        if (!grp.length) continue;
        const xs = grp.map(b => b.doorx);
        for (let x = Math.min(...xs); x <= Math.max(...xs); x++) rd(x, ry);
        for (const b of grp) for (let y = b.doory + 1; y <= ry; y++) rd(b.doorx, y);
      }
      const spineEnd = size.id === 'città' ? C.y + 4 : (botRoad !== null ? botRoad : C.y + 2);
      for (let y = topRoad; y <= spineEnd; y++) rd(C.x, y);
      town.roads = roads;
      /* arredo urbano: mai su edifici, davanti alle porte, sulle strade, sul corridoio del cancello o fuori piazza */
      const forb = (x, y) => {
        /* 3 blocchi liberi davanti a ogni porta: il pg esce senza restare bloccato */
        for (const b of B) { if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return true; if (x === b.doorx && y >= b.doory + 1 && y <= b.doory + 3) return true; }
        if (roads.has(x + ',' + y)) return true;
        if (town.pen && y === town.y1 && (x === C.x - 1 || x === C.x)) return true;
        return x < town.x0 || x > town.x1 || y < town.y0 || y > town.y1;
      };
      const decos = [];
      if (size.id !== 'borgo') { // fontana 2x2 (nei varchi tra le colonne di case, mai sul viale)
        const fx = size.id === 'città' ? C.x - 4 : C.x - 3, fy = size.id === 'città' ? C.y - 2 : C.y - 1;
        let ok = true;
        for (let xx = fx; xx <= fx + 1; xx++) for (let yy = fy; yy <= fy + 1; yy++) if (forb(xx, yy)) ok = false;
        if (ok) decos.push({ type: 'fountain', x: fx, y: fy });
      }
      /* più la città è grande, più arredo: borgo 1 panchina, paese 2-3, città 3-4 + lampioni */
      const occupiedByDeco = (x, y) => decos.some(d =>
        (d.type === 'fountain' && x >= d.x && x <= d.x + 1 && y >= d.y && y <= d.y + 1) || (d.x === x && d.y === y));
      const BCH = [[-4, -1], [3, -1], [-4, 2], [3, 2], [1, 3], [-3, 3], [-6, 0], [5, 0]];
      let nb = 0; const want = size.id === 'borgo' ? 1 : size.id === 'paese' ? 2 + (vhash(cx, cy, 151) < 0.5 ? 1 : 0) : 3 + (vhash(cx, cy, 151) < 0.5 ? 1 : 0);
      for (let i = 0; i < BCH.length && nb < want; i++) {
        if (vhash(cx, cy, 152 + i) < 0.35) continue; // varietà: qualche panchina salta
        const x = C.x + BCH[i][0], y = C.y + BCH[i][1];
        if (forb(x, y) || occupiedByDeco(x, y)) continue;
        decos.push({ type: 'bench', x, y }); nb++;
      }
      if (size.id === 'città') for (const [lx, ly] of [[5, -1], [-6, -1], [-6, 2], [5, 2]]) { // lampioni (accesi di notte)
        const x = C.x + lx, y = C.y + ly;
        if (!forb(x, y) && !occupiedByDeco(x, y)) decos.push({ type: 'lamp', x, y });
      }
      for (const [bx, by] of [[size.w[0] + 1, size.h[1]], [size.w[1] - 1, size.h[1]]]) { // cespugli agli angoli bassi
        const x = C.x + bx, y = C.y + by;
        if (vhash(cx, cy, 160 + bx) < 0.55 && !forb(x, y) && !occupiedByDeco(x, y)) decos.push({ type: 'bush', x, y });
      }
      /* CARTELLO delle missioni: prima tile libera vicino al centro della piazza (invita a tornare in città) */
      let board = null;
      for (const [bx, by] of [[-1, -1], [1, -1], [-2, 0], [2, 0], [-1, 0], [1, 0], [0, -2], [-2, -1], [2, -1]]) {
        const x = C.x + bx, y = C.y + by;
        if (!forb(x, y) && !occupiedByDeco(x, y)) { board = { x, y }; break; }
      }
      town.board = board;
      if (board) decos.push({ type: 'board', x: board.x, y: board.y });
      /* CASSETTA DELLA POSTA: solo nelle città SENZA Museo (borghi e paesi) — per spedire i
         reperti grezzi al Museo senza il viaggio. Prima tile libera vicino alla piazza. */
      if (size.id !== 'città') {
        for (const [bx, by] of [[2, -1], [-2, -1], [3, 0], [-3, 0], [2, 1], [-2, 1], [1, 1], [-1, 1]]) {
          const x = C.x + bx, y = C.y + by;
          if (!forb(x, y) && !occupiedByDeco(x, y)) { decos.push({ type: 'mailbox', x, y }); break; }
        }
      }
      town.decos = decos;
    }
  }
  townCache.set(key, town); return town;
}
export function townForTile(tx, ty) { return townForCell(Math.floor(tx / TCELL), Math.floor(ty / TCELL)); }

/* ritorna {solid|door|floor|fence|park|building} o null */
/* cache per tile: townInfo gira 2+ volte per tile per frame (render, collisioni, decorazioni)
   e ogni chiamata scandisce edifici, arredi e strade della città. */
const tiCache = new Map();
/* la città ha il Museo? È l'unico posto dove si identificano i reperti, si riempiono le teche
   e si comprano le fialette: sapere quali città ce l'hanno vale un segno a parte sulla mappa.
   Si guardano gli edifici veri, non la taglia: se un domani il museo comparisse altrove, la
   mappa lo segnala da sola. */
export function hasMuseum(town) {
  return !!town && (town.buildings || []).some(b => b.type === 'museum');
}
export function townInfo(tx, ty) {
  const k = tx + ',' + ty; const c = tiCache.get(k);
  if (c !== undefined) return c;
  const r = townInfoCompute(tx, ty);
  if (tiCache.size > 60000) tiCache.clear();     // tetto: partite lunghissime non gonfiano la RAM
  tiCache.set(k, r); return r;
}
function townInfoCompute(tx, ty) {
  const t = townForTile(tx, ty); if (!t) return null;
  for (const b of t.buildings) {
    if (tx >= b.x0 && tx <= b.x1 && ty >= b.y0 && ty <= b.y1) {
      if (tx === b.doorx && ty === b.doory) return { door: b, floor: true };
      return { solid: true, building: b };
    }
  }
  /* arredo urbano: solido, disegnato come entità (anchor = tile in alto a sinistra) */
  if (t.decos) for (const d of t.decos) {
    if (d.type === 'fountain') {
      if (tx >= d.x && tx <= d.x + 1 && ty >= d.y && ty <= d.y + 1) return { solid: true, deco: d, anchor: tx === d.x && ty === d.y };
    } else if (tx === d.x && ty === d.y) return { solid: true, deco: d, anchor: true };
  }
  /* strade sterrate: camminabili, disegnate come tile dedicata */
  if (t.roads && t.roads.has(tx + ',' + ty)) return { floor: true, road: true };
  /* parco recintato: staccionata solida, cancello in alto, prato interno */
  if (t.pen) {
    const p = t.pen;
    if (tx >= p.x0 && tx <= p.x1 && ty >= p.y0 && ty <= p.y1) {
      const gate = ty === p.y0 && (tx === t.C.x - 1 || tx === t.C.x);
      const edge = (tx === p.x0 || tx === p.x1 || ty === p.y0 || ty === p.y1) && !gate;
      if (edge) return { solid: true, fence: true, park: true };
      return { floor: true, park: true };
    }
  }
  if (tx >= t.x0 && tx <= t.x1 && ty >= t.y0 && ty <= t.y1) return { floor: true }; // piazza
  return null;
}
/* ingressi delle grotte: su una MONTAGNA con terra camminabile SOTTO (ci si avvicina da sud).
   Deterministico e raro; l'imbocco è CAMMINABILE (come una porta).
   REGOLA: ogni grotta ha uno SPIAZZO 3×3 sgombro davanti e un UNICO MASSO che la sigilla
   (caveGuardAt): serve il piccone per aprirla. Lo spiazzo non SELEZIONA le grotte (le
   renderebbe rarissime): le decorazioni lì dentro vengono semplicemente RIMOSSE da decoAt
   (caveClearingAt) — il terreno però deve essere camminabile, quello sì è un requisito. */
const caveCache = new Map();
export function caveEntranceAt(tx, ty) {
  const key = tx + ',' + ty;
  const c = caveCache.get(key); if (c !== undefined) return c;
  const r = caveCompute(tx, ty);
  caveCache.set(key, r); return r;
}
function caveCompute(tx, ty) {
  if (baseTerrain(tx, ty) !== MTN) return null;
  if (townInfo(tx, ty)) return null;
  if (!walkableGround(baseTerrain(tx, ty + 1)) || townInfo(tx, ty + 1)) return null;
  if (vhash(tx, ty, 77) >= 0.05) return null;
  /* spiazzo 3×3 davanti all'imbocco: il TERRENO dev'essere camminabile e fuori città */
  for (let dy = 1; dy <= 3; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = tx + dx, y = ty + dy;
    if (!walkableGround(baseTerrain(x, y))) return null;
    if (townInfo(x, y)) return null;
    if (siteAt(x, y)) return null;
  }
  return { tx, ty };
}
/* il MASSO che sigilla la grotta: una sola tile, subito davanti all'imbocco.
   È un 'boulder' normale → si spacca col piccone (tryMine) e sparisce per sempre (minedSet). */
export function caveGuardAt(tx, ty) { return !!caveEntranceAt(tx, ty - 1); }
/* le altre 8 tile dello spiazzo: niente decorazioni, così la grotta è sempre raggiungibile */
export function caveClearingAt(tx, ty) {
  for (let dy = 1; dy <= 3; dy++) for (let dx = -1; dx <= 1; dx++) if (caveEntranceAt(tx - dx, ty - dy)) return true;
  return false;
}
export function isSolidTile(tx, ty) {
  const ti = townInfo(tx, ty); if (ti) { if (ti.solid) return true; if (ti.floor) return false; }
  /* le MERAVIGLIE massicce (blocco di ghiaccio, piloni, tronchi) non si attraversano;
     sotto gli archi invece ci si passa: la maschera è in wonderart.js */
  { const lm = landmarkNear(tx, ty, 2); if (lm && wonderSolidTile(lm.type, lm.x, lm.y, tx, ty)) return true; }
  if (caveEntranceAt(tx, ty)) return false; // imbocco grotta: si cammina
  const t = baseTerrain(tx, ty);
  if (t === DEEP || t === WATER || t === MTN) return true;
  const d = decoAt(tx, ty); if (d && decoSolid(d)) return true;
  if (siteAt(tx, ty)) return true; // affioramento d'ossa
  return false;
}
export function solidPx(px, py) { return isSolidTile(Math.floor(px / TS), Math.floor(py / TS)); }

/* ---------- siti di scavo speciali: affioramenti d'ossa rari, 3-5 scavi pregiati ---------- */
export const SCELL = 30;
const siteCache = new Map();
export function siteForCell(cx, cy) {
  const key = cx + ',' + cy; if (siteCache.has(key)) return siteCache.get(key);
  let site = null;
  if (vhash(cx, cy, 171) < 0.22) {
    const x = cx * SCELL + 4 + Math.floor(vhash(cx, cy, 172) * (SCELL - 8));
    const y = cy * SCELL + 4 + Math.floor(vhash(cx, cy, 173) * (SCELL - 8));
    if (diggable(baseTerrain(x, y)) && !townInfo(x, y) && !decoNatural(x, y)) {
      site = { x, y, charges: 3 + Math.floor(vhash(cx, cy, 174) * 3), key }; // 3-5 scavi
    }
  }
  siteCache.set(key, site); return site;
}
export function siteAt(tx, ty) {
  const s = siteForCell(Math.floor(tx / SCELL), Math.floor(ty / SCELL));
  return s && s.x === tx && s.y === ty ? s : null;
}
/* ---------- LANDMARK endemici: strutture rare e UNICHE per bioma (rompono l'omogeneità) ----------
   deterministici, sparsi (~1 ogni 3 celle 46×46), su terreno camminabile fuori città. 3 per bioma. */
export const LCELL = 84;   // celle GRANDI: una meraviglia dev'essere un evento, non un incontro
export const LANDMARKS = [
  ['gianttree', 'menhir', 'haygiant'],     // Prati Dorati
  ['bonearch', 'oasis', 'ribcage'],        // Dune Ossee
  ['mushring', 'hollowstump', 'totem'],    // Boschi Cinerei
  ['geyser', 'redarch', 'orevein'],        // Terre Rosse
  ['willow', 'lilypad', 'bubblepool'],     // Palude Antica
  ['icespire', 'frozenbeast', 'aurora'],   // Lande Gelide
];
const ARCH_TYPES = ['bonearch', 'redarch'];
const landmarkCache = new Map();
/* ogni meraviglia vuole il SUO terreno: le ninfee stanno sull'acqua, non sul prato */
export function wonderTerrainOk(type, x, y) {
  if (townInfo(x, y)) return false;
  const t = baseTerrain(x, y);
  if (type === 'lilypad') {                       // specchio d'acqua vero: 3×3 tutto acqua
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t2 = baseTerrain(x + dx, y + dy);
      if (t2 !== WATER && t2 !== DEEP) return false;
    }
    return true;
  }
  return walkableGround(t) && t !== FLOOR;
}
function computeLandmark(cx, cy) {
  if (vhash(cx, cy, 191) >= 0.20) return null;   // e non tutte le celle ne hanno una
  const x0 = cx * LCELL + 6 + Math.floor(vhash(cx, cy, 192) * (LCELL - 12));
  const y0 = cy * LCELL + 6 + Math.floor(vhash(cx, cy, 193) * (LCELL - 12));
  const types = LANDMARKS[zoneIdxAt(x0, y0)] || LANDMARKS[0];
  let type = types[Math.floor(vhash(cx, cy, 194) * types.length)];
  /* GIANT TREE (Yggdrasil): SUPER SUPER raro — se esce, sopravvive solo con un secondo tiro rarissimo */
  if (type === 'gianttree' && vhash(cx, cy, 195) >= 0.05) type = 'menhir';
  /* se il punto non è adatto a QUESTA meraviglia, la si cerca lì attorno (le ninfee vogliono
     l'acqua, le altre la terra ferma): spirale corta dentro la cella, poi si rinuncia */
  /* DISTANZE MINIME: due meraviglie non devono mai capitare a due passi (e due ARCHI vicini
     renderebbero inutile il viaggio rapido). Si guardano solo le celle con indice MINORE:
     l'ordine è fisso, quindi niente ricorsione e il mondo resta deterministico. */
  const tooClose = (x, y) => {
    for (const [dx, dy] of [[-1, 0], [0, -1], [-1, -1], [1, -1], [-2, 0], [0, -2]]) {
      const other = landmarkForCell(cx + dx, cy + dy);
      if (!other) continue;
      const d = Math.hypot(other.x - x, other.y - y);
      if (d < 90) return true;                                   // mai due meraviglie ravvicinate
      if (ARCH_TYPES.includes(type) && ARCH_TYPES.includes(other.type) && d < 320) return true; // archi ben distanti
    }
    return false;
  };
  if (!wonderTerrainOk(type, x0, y0) || tooClose(x0, y0)) {
    for (let r = 1; r <= 9; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = x0 + dx, y = y0 + dy;
        if (x < cx * LCELL + 3 || x > (cx + 1) * LCELL - 4 || y < cy * LCELL + 3 || y > (cy + 1) * LCELL - 4) continue;
        if (wonderTerrainOk(type, x, y) && !tooClose(x, y)) return { x, y, type };
      }
    }
    return null;
  }
  return { x: x0, y: y0, type };
}
export function landmarkForCell(cx, cy) {
  const key = cx + ',' + cy;
  let lm = landmarkCache.get(key);
  if (lm === undefined) { lm = computeLandmark(cx, cy); landmarkCache.set(key, lm); }
  return lm;
}
export function landmarkAt(tx, ty) {
  const lm = landmarkForCell(Math.floor(tx / LCELL), Math.floor(ty / LCELL));
  return (lm && lm.x === tx && lm.y === ty) ? lm.type : null;
}
/* Le MERAVIGLIE sono grandi (5-9 tile): questa dice se la tile cade nel loro ingombro,
   e restituisce il landmark con la sua ancora — serve per scoperta, prompt e interazione. */
export function landmarkNear(tx, ty, extra = 0) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const lm = landmarkForCell(Math.floor(tx / LCELL) + dx, Math.floor(ty / LCELL) + dy);
    if (!lm) continue;
    const r = Math.floor(wonderWidth(lm.type) / 2) + extra;
    if (Math.abs(tx - lm.x) <= r && Math.abs(ty - lm.y) <= r + 1) return lm;
  }
  return null;
}
/* ---------- RELITTI in mare: come i siti ma solo in MARE ABBASTANZA GRANDE ---------- */
export const WCELL = 34;
const wreckCache = new Map();
export function wreckForCell(cx, cy) {
  const key = 'w' + cx + ',' + cy; if (wreckCache.has(key)) return wreckCache.get(key);
  let wr = null;
  if (vhash(cx, cy, 181) < 0.22) {
    const x = cx * WCELL + 5 + Math.floor(vhash(cx, cy, 182) * (WCELL - 10));
    const y = cy * WCELL + 5 + Math.floor(vhash(cx, cy, 183) * (WCELL - 10));
    let big = true; // mare grande: tutte le tile in un raggio 2 sono acqua
    for (let dy = -2; dy <= 2 && big; dy++) for (let dx = -2; dx <= 2 && big; dx++) {
      const t = baseTerrain(x + dx, y + dy);
      if (!(t === DEEP || t === WATER) || townInfo(x + dx, y + dy)) big = false;
    }
    if (big) wr = { x, y, charges: 3 + Math.floor(vhash(cx, cy, 184) * 3), key };
  }
  wreckCache.set(key, wr); return wr;
}
export function wreckAt(tx, ty) {
  const w = wreckForCell(Math.floor(tx / WCELL), Math.floor(ty / WCELL));
  return w && w.x === tx && w.y === ty ? w : null;
}
/* vero se da (tx,ty) si raggiungono almeno `need` caselle libere: mai spawn in una "prigione" di alberi */
export function openArea(tx, ty, need = 8) {
  if (isSolidTile(tx, ty)) return false;
  const seen = new Set([tx + ',' + ty]); const q = [[tx, ty]];
  let n = 0;
  while (q.length && n < need) {
    const [x, y] = q.shift(); n++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (seen.has(k)) continue; seen.add(k);
      if (!isSolidTile(nx, ny)) q.push([nx, ny]);
    }
  }
  return n >= need;
}
export function findStart() {
  /* si parte SEMPRE in una città GRANDE (quella col parco): piazza prima, parco come ripiego */
  for (let r = 0; r < 16; r++) {
    for (let cy = -r; cy <= r; cy++) for (let cx = -r; cx <= r; cx++) {
      if (Math.max(Math.abs(cx), Math.abs(cy)) !== r) continue;
      const t = townForCell(cx, cy);
      if (t && t.pen) {
        const sx = t.C.x;
        for (let yy = t.C.y + 3; yy >= t.C.y; yy--) { const ti = townInfo(sx, yy); if (ti && ti.floor && openArea(sx, yy)) return { x: sx * TS + 8, y: yy * TS + 2 }; }
        for (let yy = t.C.y + 5; yy < t.C.y + 10; yy++) { if (openArea(sx, yy)) return { x: sx * TS + 8, y: yy * TS + 2 }; }
      }
    }
  }
  for (let r = 0; r < 60; r++) for (let d = -r; d <= r; d++) {
    const cand = [[d, -r], [d, r], [-r, d], [r, d]];
    for (const [tx, ty] of cand) { if (walkableGround(baseTerrain(tx, ty)) && openArea(tx, ty)) return { x: tx * TS + 8, y: ty * TS + 2 }; }
  }
  return { x: 8, y: 8 };
}
