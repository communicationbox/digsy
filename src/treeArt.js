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

/* QUATTRO SAGOME PER OGNI SPECIE, scritte a mano — la regola del progetto per "N cose tutte
   diverse": ricette curate, non un parametro che sposta gli stessi grumi di due pixel. Prima
   le quattro varianti cambiavano solo di un soffio e un bosco sembrava un timbro ripetuto
   (segnalato: "pini, alberi e cactus sono tutti uguali, sembra una cosa cheap").
   Ognuna ha la sua chioma, la sua inclinazione del tronco e i suoi rami; e può essere
   specchiata, quindi in giro se ne vedono otto per specie.
     blobs [cx, cy, rx, ry]  ·  lean = quanto pende il tronco  ·  rami [x0,y0,x1,y1] */
const BROAD = [
  { blobs: [[32, 30, 20, 15], [19, 38, 11, 9], [45, 37, 12, 9], [32, 19, 13, 10]], lean: 0, rami: [[32, 44, 22, 34], [32, 42, 43, 33], [32, 40, 32, 28]] },
  { blobs: [[34, 24, 15, 17], [24, 33, 11, 10], [42, 34, 10, 8], [34, 11, 10, 8]], lean: 2, rami: [[32, 44, 26, 30], [32, 42, 40, 32]] },           // alta e stretta
  { blobs: [[22, 28, 13, 12], [44, 26, 14, 13], [33, 36, 14, 10]], lean: -1, rami: [[32, 44, 21, 30], [32, 44, 44, 28]] },                          // due cupole
  { blobs: [[32, 36, 23, 12], [20, 30, 10, 8], [44, 31, 11, 8], [32, 25, 9, 7]], lean: 1, rami: [[32, 46, 24, 38], [32, 45, 42, 37], [32, 43, 33, 32]] },  // bassa e panciuta
];
const ACACIA = [
  { blobs: [[32, 30, 26, 7], [22, 26, 14, 6], [42, 27, 15, 6], [32, 23, 12, 5]], lean: 0, rami: [[32, 40, 18, 28], [32, 38, 46, 27], [26, 34, 30, 25]] },
  { blobs: [[34, 26, 22, 6], [20, 31, 12, 5], [46, 30, 11, 5]], lean: 3, rami: [[32, 40, 20, 30], [32, 38, 46, 29]] },                              // ombrello alto e storto
  { blobs: [[32, 33, 28, 6], [32, 27, 18, 5]], lean: -2, rami: [[32, 42, 18, 33], [32, 42, 46, 33]] },                                              // due piani larghi
  { blobs: [[26, 29, 17, 6], [44, 32, 15, 6], [34, 24, 11, 5]], lean: 1, rami: [[32, 41, 22, 30], [32, 39, 44, 32]] },                              // sbilanciato dal vento
];
const WILLOW = [
  { blobs: [[32, 30, 22, 13], [32, 22, 14, 9]], lean: 0, rami: [[32, 40, 22, 30], [32, 38, 42, 29]], ciocche: [13, 12, 3.3, 14, 12] },
  { blobs: [[30, 27, 18, 11], [30, 19, 11, 8]], lean: 2, rami: [[32, 40, 23, 28]], ciocche: [16, 9, 3.6, 18, 10] },                                  // ciocche lunghe
  { blobs: [[34, 32, 24, 10]], lean: -2, rami: [[32, 42, 24, 33], [32, 41, 44, 32]], ciocche: [12, 14, 3.2, 10, 8] },                                // larga e bassa
  { blobs: [[32, 28, 16, 14], [22, 33, 9, 7], [42, 33, 9, 7]], lean: 1, rami: [[32, 40, 25, 31], [32, 39, 40, 31]], ciocche: [15, 10, 3.4, 16, 14] },
];
/* PINI: ogni ricetta è la sua PILA DI PIANI [mezza larghezza, base, altezza] */
const PINE = [
  { tiers: [[20, 58, 13], [17, 47, 12], [14, 36, 11], [10, 26, 10], [6, 16, 9]], cima: 5, lean: 0 },
  { tiers: [[15, 60, 15], [13, 46, 13], [10, 33, 12], [7, 22, 11], [4, 12, 8]], cima: 2, lean: 0 },     // snello e altissimo
  { tiers: [[24, 58, 12], [20, 48, 11], [16, 39, 10], [11, 30, 9]], cima: 20, lean: -1 },               // tozzo e largo, cima bassa
  { tiers: [[19, 59, 12], [16, 49, 11], [13, 39, 11], [9, 29, 9], [5, 20, 8]], cima: 10, lean: 2, buco: 2 },  // storto, con un piano rado
];
export const TREE_BP = { broad: BROAD, acacia: ACACIA, willow: WILLOW, pine: PINE };

/* la MASCHERA della chioma: dove ci sono foglie. La ricetta dice dove; il rumore muove il bordo. */
function canopyMask(kind, v, sway) {
  const M = new Uint8Array(TREE_W * TREE_H);
  const set = (x, y) => { if (x >= 0 && y >= 0 && x < TREE_W && y < TREE_H) M[y * TREE_W + x] = 1; };
  const bp = ricetta(kind, v), mir = (v & 2) ? -1 : 1;
  const MX = x => 32 + mir * (x - 32);
  const blob = (cx, cy, rx, ry, rough) => {
    for (let y = Math.floor(cy - ry - 3); y <= cy + ry + 3; y++) for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
      const e = ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);
      const jag = (hash(x >> 1, y >> 1, 7 + v) - 0.5) * rough;
      if (e < 1 + jag) set(MX(x) + sway, y);
    }
  };
  if (kind === 'pine') {
    bp.tiers.forEach(([w, yb, h], ti) => {
      if (bp.buco === ti) h -= 3;                                          // un piano più rado: il pino storto
      for (let r = 0; r < h; r++) {
        const ww = Math.round(w * ((r + 1) / h)) + (hash(r, yb, 9 + v) < 0.3 ? 1 : 0);
        const off = Math.round(bp.lean * (1 - yb / 60) * 2);
        for (let x = -ww; x <= ww; x++) set(MX(32 + x + off) + Math.round(sway * (1 - yb / 60)), yb - h + r);
      }
    });
    for (let k = 0; k < 3; k++) set(MX(32 + Math.round(bp.lean)), bp.cima + k);
    return M;
  }
  for (const [cx, cy, rx, ry] of bp.blobs) blob(cx, cy, rx, ry, kind === 'acacia' ? 0.7 : 0.5);
  if (kind === 'willow') {
    const [x0, n, passo, base, extra] = bp.ciocche;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * passo + (hash(i, v, 5) - 0.5) * 2, len = base + Math.floor(hash(i, v, 6) * extra);
      for (let k = 0; k < len; k++) set(MX(Math.round(x)) + Math.round(sway * (k / len)), 36 + k);
    }
  }
  return M;
}
function ricetta(kind, v) { const L = TREE_BP[kind] || BROAD; return L[((v % L.length) + L.length) % L.length]; }

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
  const bpT = ricetta(kind, v), mirT = (v & 2) ? -1 : 1;
  for (let y = trunkTop; y <= TREE_AY; y++) {
    const u = (y - trunkTop) / (TREE_AY - trunkTop), w = Math.round((kind === 'acacia' ? 3 : 4) + u * u * 4 + (u > 0.85 ? (u - 0.85) * 30 : 0));
    /* il tronco PENDE come dice la ricetta: dritto alla base, spostato in cima */
    const pend = Math.round(mirT * (bpT.lean || 0) * (1 - u));
    const x0 = TREE_AX - w + pend + (kind === 'acacia' ? Math.round(Math.sin(u * 3) * 1.5) : 0);
    rect(x0 - 1, y, w * 2 + 2, 1, '#1e140c'); rect(x0, y, w * 2, 1, bark); rect(x0, y, Math.max(1, w >> 1), 1, barkL); rect(x0 + w * 2 - 2, y, 2, 1, barkD);
    if (hash(y, v, 11) < 0.18) px(x0 + 1 + Math.floor(hash(y, v, 12) * (w * 2 - 2)), y, barkD);
  }
  const limb = (x0, y0, x1, y1, w) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); rect(x - (w >> 1) - 1, y, w + 2, 1, '#1e140c'); }
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); rect(x - (w >> 1), y, w, 1, bark); }
  };
  /* i rami sono quelli della RICETTA, specchiati come la chioma */
  { const bp = ricetta(kind, v), mir = (v & 2) ? -1 : 1, MX = x => 32 + mir * (x - 32);
    for (const [x0, y0, x1, y1] of (bp.rami || [])) limb(MX(x0), y0, MX(x1), y1, 3); }
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
