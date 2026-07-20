/* PREPARAZIONE DEL REPERTO — il secondo verbo del gioco, ora un vero RESTAURO.
   Il reperto grezzo arriva incrostato: lo si SPAZZOLA per scoprirlo. Ma l'osso è FRAGILE —
   insistere con la spazzola larga sull'osso GIÀ scoperto lo scheggia. Per i bordi c'è la
   STECCA fine (gentile, non rovina). Due misure: PULIZIA (quanto osso hai scoperto) e
   INTEGRITÀ (quanto è intatto); il grado le pesa entrambe.

   Regola cozy: la preparazione è un BONUS, mai una penalità. Chi consegna direttamente prende
   quello che prendeva prima; le schegge tolgono solo un po' del bonus, non il valore base.

   Modulo PURO (niente DOM): crosta, maschera dell'osso e punteggi si testano da soli. La
   maschera dell'osso (quali celle sono fossile) arriva dal chiamante, dalla proiezione voxel;
   senza maschera si usa una forma ovale di ripiego, così il modulo resta testabile da solo. */

export const W = 14, H = 12;            // celle di crosta (la canvas le scala)
export const REVEAL = 0.15;             // sotto questa terra la cella è "scoperta"

function hash(i, seed) {
  const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
/* osso di ripiego (ovale) se non arriva una maschera vera */
function defaultBone() {
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = ((x + 0.5) / W - 0.5) / 0.34, dy = ((y + 0.5) / H - 0.5) / 0.4;
    if (dx * dx + dy * dy <= 1) m[y * W + x] = 1;
  }
  return m;
}

/* crosta iniziale: terra piena (dirt=1) tranne un paio di scaglie già staccate, così si capisce
   subito che sotto c'è qualcosa. Deterministica per seed. boneMask = 0/1 per cella (opzionale). */
export function newBoard(seed = 0, boneMask = null) {
  const dirt = new Array(W * H).fill(1);
  const chip = new Array(W * H).fill(0);
  const bone = boneMask && boneMask.length === W * H ? Uint8Array.from(boneMask) : defaultBone();
  for (let i = 0; i < W * H; i++) if (hash(i, seed) < 0.05) dirt[i] = 0; // scaglie già via
  return { dirt, chip, bone, seed, strokes: 0 };
}

/* passata di attrezzo. opts = { r, gentle } (o un numero = raggio, per compat).
   Toglie terra in modo GRADUALE (float); sull'osso già scoperto la spazzola (non gentile)
   lo scheggia. Ritorna il "lavoro" fatto (terra tolta) per gli effetti sonori. */
export function brush(board, cx, cy, opts) {
  if (!board) return 0;
  const o = typeof opts === 'number' ? { r: opts } : (opts || {});
  const r = o.r != null ? o.r : 1.6, gentle = !!o.gentle, power = gentle ? 0.34 : 0.5;
  let work = 0;
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot(x - cx, y - cy); if (d > r) continue;
    const i = y * W + x, fall = 1 - d / r;
    if (board.dirt[i] > 0) { const dd = Math.min(board.dirt[i], power * fall); board.dirt[i] -= dd; work += dd; }
    else if (board.bone[i] && !gentle) { board.chip[i] = Math.min(1, board.chip[i] + 0.34 * fall); } // osso scoperto + spazzola = scheggia
  }
  if (work > 0.01) board.strokes++;
  return work;
}

/* PULIZIA = quanto osso hai scoperto (se non c'è maschera, quanta crosta hai tolto). */
export function cleanPct(board) {
  if (!board) return 0;
  let tot = 0, rev = 0;
  for (let i = 0; i < W * H; i++) if (board.bone[i]) { tot++; if (board.dirt[i] < REVEAL) rev++; }
  if (tot) return rev / tot;
  let c = 0; for (const v of board.dirt) if (v < REVEAL) c++; return c / board.dirt.length;
}
/* INTEGRITÀ = quanto è intatto l'osso (1 = perfetto). Non scende sotto 0.4: cozy, mai un disastro. */
export function integrity(board) {
  if (!board) return 1;
  let tot = 0, ch = 0;
  for (let i = 0; i < W * H; i++) if (board.bone[i]) { tot++; ch += board.chip[i]; }
  return tot ? Math.max(0.4, 1 - ch / tot * 2.2) : 1;
}

/* GRADI — pesano pulizia (di più) e integrità. Il perfetto chiede entrambe alte. */
export const GRADES = [
  { id: 'perfetto', mult: 1.5, xp: 12 },
  { id: 'buono', mult: 1.25, xp: 6 },
  { id: 'grezzo', mult: 1.1, xp: 2 },
  { id: 'niente', mult: 1, xp: 0 },
];
export function gradeFor(clean, integ) {
  if (integ == null) integ = 1;                    // compat: gradeFor(pct) singolo argomento
  if (clean >= 0.9 && integ >= 0.9) return GRADES[0];
  const q = clean * 0.65 + integ * 0.35;
  if (q >= 0.75) return GRADES[1];
  if (q >= 0.4) return GRADES[2];
  return GRADES[3];
}

/* applica l'esito al reperto: alza il valore e lascia il marchio (per i testi e per non
   poterlo preparare due volte). */
export function applyPrep(item, clean, integ) {
  if (!item || item.prep != null) return null;
  const g = gradeFor(clean, integ);
  item.prep = Math.round(clean * 100);
  item.prepInteg = Math.round((integ == null ? 1 : integ) * 100);
  item.val = Math.max(1, Math.round((item.val || 1) * g.mult));
  return g;
}
export function isPrepped(item) { return !!item && item.prep != null; }
