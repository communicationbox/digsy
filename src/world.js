/* Mondo procedurale: terreni, decorazioni, città (con parco), collisioni, spawn */
import { TS } from './data.js';
import { vhash, fbm } from './noise.js';
import { zoneIdxAt } from './regions.js';

/* ---------- terreni ---------- */
export const DEEP = 0, WATER = 1, SAND = 2, GRASS = 3, FOREST = 4, DIRT = 5, MTN = 6, FLOOR = 7, PARK = 8;

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
export const digChance = { 2: 0.72, 3: 0.35, 4: 0.5, 5: 0.6 };

/* decorazioni deterministiche FIRMATE PER ZONA: ogni bioma ha i suoi oggetti */
export function decoAt(tx, ty) {
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
      if (vhash(tx, ty, 7) < 0.26) return 'tree';
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
      if (vhash(tx, ty, 7) < 0.3) return 'tree';
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
    if (t === FOREST && vhash(tx, ty, 7) < 0.3) return 'tree';
    if (t === MTN && vhash(tx, ty, 8) < 0.4) return 'boulder';
    return null;
  }
  // PRATI DORATI: alberi, fiori, balle di fieno
  if (t === FOREST && vhash(tx, ty, 7) < 0.34) return 'tree';
  if (t === GRASS && vhash(tx, ty, 7) < 0.045) return 'tree';
  if (t === GRASS && vhash(tx, ty, 14) < 0.016) return 'hay';
  if (t === DIRT && vhash(tx, ty, 8) < 0.11) return 'boulder';
  if (t === MTN && vhash(tx, ty, 8) < 0.4) return 'boulder';
  if (t === SAND && vhash(tx, ty, 9) < 0.05) return 'shell';
  if (t === GRASS && vhash(tx, ty, 10) < 0.06) return 'flower';
  return null;
}
export function decoSolid(d) {
  return d === 'tree' || d === 'boulder' || d === 'cactus' || d === 'bonespire' || d === 'deadtree' ||
    d === 'stump' || d === 'redspire' || d === 'orecrystal' || d === 'icecrystal' || d === 'hay';
}

/* ---------- città ---------- */
export const TCELL = 40;
/* taglie: borgo (2 edifici), paese (4), città (6 + parco); footprint edificio 3x2, porta in basso al centro */
export const TOWN_SIZES = [
  { id: 'borgo', w: [-5, 4], h: [-5, 2], defs: [['lab', 'Laboratorio', -4, -4], ['store', 'Negozio', 1, -4]] },
  {
    id: 'paese', w: [-6, 5], h: [-5, 3], defs: [
      ['store', 'Negozio', -5, -4], ['lab', 'Laboratorio', 2, -4],
      ['inn', 'Locanda', -5, 1], ['barber', 'Barbiere', 2, 1]]
  },
  {
    id: 'città', w: [-9, 9], h: [-5, 3], defs: [
      ['store', 'Negozio', -8, -4], ['lab', 'Laboratorio', -1, -4], ['museum', 'Museo', 6, -4],
      ['inn', 'Locanda', -8, 1], ['barber', 'Barbiere', -1, 1], ['tailor', 'Sartoria', 6, 1]]
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
  if (vhash(cx, cy, 111) < 0.45) {
    const roll = vhash(cx, cy, 115);
    const size = TOWN_SIZES[roll < 0.4 ? 0 : roll < 0.75 ? 1 : 2];
    /* jitter dentro la cella con margini che contengono l'intera città (e il parco in basso) */
    const mx = Math.max(-size.w[0], size.w[1]) + 1;
    const jx = mx + Math.floor(vhash(cx, cy, 112) * (TCELL - 2 * mx));
    const jy = 6 + Math.floor(vhash(cx, cy, 113) * (TCELL - 16));
    const C = { x: cx * TCELL + jx, y: cy * TCELL + jy };
    const bt = baseTerrain(C.x, C.y); // serve terra al centro
    if (bt !== DEEP && bt !== WATER && bt !== MTN) {
      const B = [];
      size.defs.forEach(([type, name, dx, dy], i) => {
        /* jitter ±1 per edificio: case meno in riga; fila bassa solo verso l'alto (porte mai sul recinto) */
        const jbx = Math.floor(vhash(cx, cy, 130 + i) * 3) - 1;
        const jby = dy < 0 ? Math.floor(vhash(cx, cy, 140 + i) * 3) - 1 : Math.floor(vhash(cx, cy, 140 + i) * 2) - 1;
        const x0 = C.x + dx + jbx, y0 = C.y + dy + jby;
        B.push({ type, name, x0, y0, x1: x0 + 2, y1: y0 + 1, doorx: x0 + 1, doory: y0 + 1 });
      });
      town = {
        C, buildings: B, name: townName(cx, cy), size: size.id, key,
        x0: C.x + size.w[0], y0: C.y + size.h[0], x1: C.x + size.w[1], y1: C.y + size.h[1],
      };
      /* le città grandi hanno un parco recintato sotto la piazza (chimere rianimate) */
      if (size.id === 'città') town.pen = { x0: C.x - 5, y0: C.y + 4, x1: C.x + 4, y1: C.y + 9 };
      /* arredo urbano: mai su edifici, davanti alle porte, sul corridoio del cancello o fuori piazza */
      const forb = (x, y) => {
        for (const b of B) { if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return true; if (x === b.doorx && y === b.doory + 1) return true; }
        if (town.pen && y === town.y1 && (x === C.x - 1 || x === C.x)) return true;
        return x < town.x0 || x > town.x1 || y < town.y0 || y > town.y1;
      };
      const decos = [];
      if (size.id !== 'borgo') { // fontana 2x2 (nei varchi tra le colonne di case)
        const fx = size.id === 'città' ? C.x - 4 : C.x - 1, fy = C.y - 1;
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
      if (size.id === 'città') for (const [lx, ly] of [[4, -1], [4, 2], [-6, 2]]) { // lampioni (accesi di notte)
        const x = C.x + lx, y = C.y + ly;
        if (!forb(x, y) && !occupiedByDeco(x, y)) decos.push({ type: 'lamp', x, y });
      }
      for (const [bx, by] of [[size.w[0] + 1, size.h[1]], [size.w[1] - 1, size.h[1]]]) { // cespugli agli angoli bassi
        const x = C.x + bx, y = C.y + by;
        if (vhash(cx, cy, 160 + bx) < 0.55 && !forb(x, y) && !occupiedByDeco(x, y)) decos.push({ type: 'bush', x, y });
      }
      town.decos = decos;
    }
  }
  townCache.set(key, town); return town;
}
export function townForTile(tx, ty) { return townForCell(Math.floor(tx / TCELL), Math.floor(ty / TCELL)); }

/* ritorna {solid|door|floor|fence|park|building} o null */
export function townInfo(tx, ty) {
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
export function isSolidTile(tx, ty) {
  const ti = townInfo(tx, ty); if (ti) { if (ti.solid) return true; if (ti.floor) return false; }
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
    if (diggable(baseTerrain(x, y)) && !townInfo(x, y) && !decoAt(x, y)) {
      site = { x, y, charges: 3 + Math.floor(vhash(cx, cy, 174) * 3), key }; // 3-5 scavi
    }
  }
  siteCache.set(key, site); return site;
}
export function siteAt(tx, ty) {
  const s = siteForCell(Math.floor(tx / SCELL), Math.floor(ty / SCELL));
  return s && s.x === tx && s.y === ty ? s : null;
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
        for (let yy = t.C.y + 4; yy < t.C.y + 9; yy++) { if (openArea(sx, yy)) return { x: sx * TS + 8, y: yy * TS + 2 }; }
      }
    }
  }
  for (let r = 0; r < 60; r++) for (let d = -r; d <= r; d++) {
    const cand = [[d, -r], [d, r], [-r, d], [r, d]];
    for (const [tx, ty] of cand) { if (walkableGround(baseTerrain(tx, ty)) && openArea(tx, ty)) return { x: tx * TS + 8, y: ty * TS + 2 }; }
  }
  return { x: 8, y: 8 };
}
