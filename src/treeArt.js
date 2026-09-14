/* ALBERI — sprite generati una volta e tenuti in cache.

   La prima versione nativa disegnava la chioma come tre o quattro dischi, ognuno col suo
   contorno: sembravano lecca-lecca ("gli alberi sono proprio brutti"). Un albero si legge dalla
   SILHOUETTE: bordo frastagliato di foglie, un solo contorno esterno, luce che viene da in alto
   a sinistra, grana di foglie a grumi, rami che si vedono dove la chioma si apre, ombra sotto.
   Fare tutto questo pixel per pixel a ogni frame costerebbe troppo: ogni albero si disegna UNA
   volta su una tela e poi si copia (chiave = forma, variante, colori, oscillazione).

   Forme: latifoglia (Prati, colori della stagione), pino (Boschi Cinerei), abete innevato
   (Lande), acacia a ombrello (Terre Rosse), salice (Palude). */

export const TREE_W = 64, TREE_H = 76, TREE_AX = 32, TREE_AY = 70;   // l'ancora è la base del tronco

function hash(x, y, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function css(r, g, b) { return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }
function mul(c, k) { const [r, g, b] = hex(c); return css(Math.min(255, r * k), Math.min(255, g * k), Math.min(255, b * k)); }

/* la MASCHERA della chioma: dove ci sono foglie. Ellissi col bordo mosso dal rumore. */
function canopyMask(kind, v, sway) {
  const M = new Uint8Array(TREE_W * TREE_H);
  const set = (x, y) => { if (x >= 0 && y >= 0 && x < TREE_W && y < TREE_H) M[y * TREE_W + x] = 1; };
  const blob = (cx, cy, rx, ry, rough) => {
    for (let y = Math.floor(cy - ry - 3); y <= cy + ry + 3; y++) for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
      const e = ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);
      const jag = (hash(x >> 1, y >> 1, 7 + v) - 0.5) * rough;
      if (e < 1 + jag) set(x + sway, y);
    }
  };
  const vx = (hash(v, 1, 3) - 0.5) * 6;
  if (kind === 'broad') {
    blob(32 + vx, 30, 20, 15, 0.5); blob(19 + vx, 38, 11, 9, 0.6); blob(45 + vx, 37, 12, 9, 0.6); blob(32, 20, 13, 10, 0.5);
    if (v % 2) blob(26, 16, 8, 7, 0.6);
  } else if (kind === 'acacia') {
    blob(32 + vx, 30, 26, 7, 0.7); blob(22 + vx, 26, 14, 6, 0.7); blob(42 + vx, 27, 15, 6, 0.7); blob(32, 23, 12, 5, 0.7);
  } else if (kind === 'willow') {
    blob(32, 30, 22, 13, 0.5); blob(32, 22, 14, 9, 0.5);
    for (let i = 0; i < 12; i++) {                                         // ciocche che pendono
      const x = 13 + i * 3.3 + (hash(i, v, 5) - 0.5) * 2, len = 14 + Math.floor(hash(i, v, 6) * 12);
      for (let k = 0; k < len; k++) set(Math.round(x + sway * (k / len)), 36 + k);
    }
  } else {                                                                 // pino e abete: piani a triangolo col bordo a punte
    const tiers = [[20, 58, 13], [17, 47, 12], [14, 36, 11], [10, 26, 10], [6, 16, 9]];
    for (const [w, yb, h] of tiers) for (let r = 0; r < h; r++) {
      const ww = Math.round(w * ((r + 1) / h)) + (hash(r, yb, 9 + v) < 0.3 ? 1 : 0);
      for (let x = -ww; x <= ww; x++) set(32 + x + Math.round(sway * (1 - yb / 60)), yb - h + r);
    }
    set(32, 6); set(32, 5);
  }
  return M;
}

/* genera lo sprite su una tela; T = [base, mid, alto, cima, luce, ombra] come zoneTree */
export function buildTree(c, kind, v, T, sway, snow) {
  const M = canopyMask(kind, v, sway);
  const at = (x, y) => x >= 0 && y >= 0 && x < TREE_W && y < TREE_H && M[y * TREE_W + x] === 1;
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  /* ombra a terra */
  c.fillStyle = 'rgba(20,16,10,.22)';
  for (let y = -3; y <= 3; y++) { const w = Math.round(16 * Math.sqrt(1 - (y * y) / 12)); c.fillRect(TREE_AX - w, TREE_AY + y, w * 2, 1); }
  /* TRONCO: si allarga alle radici, luce a sinistra, e i rami che entrano nella chioma */
  const bark = kind === 'pine' ? '#5c4430' : '#7a4f2e', barkL = kind === 'pine' ? '#7a5c40' : '#9a6a40', barkD = '#4a3020';
  const trunkTop = kind === 'broad' ? 36 : kind === 'acacia' ? 30 : kind === 'willow' ? 34 : 56;
  for (let y = trunkTop; y <= TREE_AY; y++) {
    const u = (y - trunkTop) / (TREE_AY - trunkTop), w = Math.round((kind === 'acacia' ? 3 : 4) + u * u * 4 + (u > 0.85 ? (u - 0.85) * 30 : 0));
    const x0 = TREE_AX - w + (kind === 'acacia' ? Math.round(Math.sin(u * 3) * 1.5) : 0);
    rect(x0 - 1, y, w * 2 + 2, 1, '#1e140c'); rect(x0, y, w * 2, 1, bark); rect(x0, y, Math.max(1, w >> 1), 1, barkL); rect(x0 + w * 2 - 2, y, 2, 1, barkD);
    if (hash(y, v, 11) < 0.18) px(x0 + 1 + Math.floor(hash(y, v, 12) * (w * 2 - 2)), y, barkD);
  }
  const limb = (x0, y0, x1, y1, w) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); rect(x - (w >> 1) - 1, y, w + 2, 1, '#1e140c'); }
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); rect(x - (w >> 1), y, w, 1, bark); }
  };
  if (kind === 'broad') { limb(32, 44, 22, 34, 3); limb(32, 42, 43, 33, 3); limb(32, 40, 32, 28, 3); }
  if (kind === 'acacia') { limb(32, 40, 18, 28, 3); limb(32, 38, 46, 27, 3); limb(26, 34, 30, 25, 2); }
  if (kind === 'willow') { limb(32, 40, 22, 30, 3); limb(32, 38, 42, 29, 3); }
  /* CHIOMA: contorno solo esterno, tono dalla luce (alto-sinistra) e grana a grumi di foglie */
  const cols = [T[5] || mul(T[0], 0.7), T[0], T[1], T[2], T[3], T[4]];
  let minY = TREE_H, maxY = 0;
  for (let y = 0; y < TREE_H; y++) for (let x = 0; x < TREE_W; x++) if (at(x, y)) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const cy = (minY + maxY) / 2, hh = Math.max(1, (maxY - minY) / 2);
  for (let y = 0; y < TREE_H; y++) for (let x = 0; x < TREE_W; x++) {
    if (!at(x, y)) {
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) px(x, y, mul(cols[0], 0.55));
      continue;
    }
    const light = -(y - cy) / hh * 0.9 - (x - 32) / 24 * 0.45;             // in alto a sinistra più chiaro
    const grain = (hash(x >> 2, y >> 2, 21 + v) - 0.5) * 1.6 + (hash(x, y, 31) - 0.5) * 0.5;
    let k = Math.round(2.3 + light * 1.6 + grain);
    if (!at(x, y + 2) || !at(x, y + 1)) k = Math.min(k, 1);                 // bordo inferiore in ombra
    if (!at(x, y - 1) && light > -0.2) k = Math.max(k, 4);                  // bordo superiore che prende luce
    k = Math.max(0, Math.min(5, k));
    px(x, y, cols[k]);
    if (snow && !at(x, y - 1)) { px(x, y, '#ffffff'); if (at(x, y + 1)) px(x, y + 1, '#e6f2f6'); }   // neve sui piani dell'abete
  }
  if (kind === 'broad' && v % 3 === 0) for (const [x, y] of [[22, 30], [38, 24], [44, 36]]) if (at(x, y)) { px(x, y, '#c65a54'); px(x + 1, y, '#a0403a'); px(x, y - 1, '#f08a80'); }  // frutti
}

/* cache: una tela per combinazione; si svuota se cresce troppo (le stagioni cambiano i colori) */
const CACHE = new Map();
export function treeSprite(kind, v, T, sway, snow) {
  const key = kind + v + sway + (snow ? 's' : '') + T.join('');
  let cv = CACHE.get(key);
  if (cv !== undefined) return cv;
  cv = null;
  try {
    if (typeof document !== 'undefined' && document.createElement) {
      const c2 = document.createElement('canvas'); c2.width = TREE_W; c2.height = TREE_H;
      const g = c2.getContext && c2.getContext('2d');
      if (g && g.fillRect) { buildTree(g, kind, v, T, sway, snow); cv = c2; }
    }
  } catch (e) { cv = null; }
  if (CACHE.size > 500) CACHE.clear();
  CACHE.set(key, cv);
  return cv;
}
export function treeKind(zi) { return zi === 2 ? 'pine' : zi === 5 ? 'pine' : zi === 3 ? 'acacia' : zi === 4 ? 'willow' : 'broad'; }
