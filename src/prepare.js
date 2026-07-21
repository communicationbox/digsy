/* PREPARAZIONE DEL REPERTO — un RESTAURO in TRE PASSI, uno per attrezzo. È il secondo verbo del
   gioco: qui si fa il mestiere dell'archeologo invece di guardarlo fare.

   1) PENNELLO — spolveri e il fossile COMPARE. Nessun danno: è la scoperta, e ti fa vedere
      DOVE sta l'osso (ti serve nei passi dopo).
   2) SCALPELLO — stacchi il fossile dalla ROCCIA attorno. Preciso: se colpisci l'OSSO, lo scheggi.
   3) SPATOLA — rifinisci la crosta SOPRA l'osso. Preciso: se raschi l'osso già pulito, lo rovini.

   Due misure: PULIZIA (quanto hai completato) e INTEGRITÀ (quanto è intatto). Il grado le pesa
   entrambe. Cozy: le schegge tolgono un po' del bonus, mai il valore base — chi non se la sente
   consegna direttamente e prende quello di prima.

   Modulo PURO (niente DOM): strati e punteggi si testano da soli. La maschera dell'osso (quali
   celle sono fossile) arriva dal chiamante, dalla proiezione voxel; senza, una forma di ripiego. */

export const W = 28, H = 24;                     // celle FINI (così anche le parti piccole del fossile si vedono)
export const TOOLS = ['pennello', 'scalpello', 'spatola'];
const POWER = { pennello: 0.5, scalpello: 0.45, spatola: 0.45 }; // quanto rimuove per passata
const HARM = { scalpello: 0.05 };                               // scalpello sull'osso: danno per passata (evitabile, l'osso si vede)
export const SCRAPE = 0.03;                                      // spatola: danno da GRATTARE fermi (una volta per movimento)

function hash(i, seed) { const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x); }
function defaultBone() {
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = ((x + 0.5) / W - 0.5) / 0.34, dy = ((y + 0.5) / H - 0.5) / 0.4;
    if (dx * dx + dy * dy <= 1) m[y * W + x] = 1;
  }
  return m;
}

/* stato iniziale: tutto coperto di POLVERE; ROCCIA sulle celle di matrice (non-osso), CROSTA
   sulle celle d'osso. Deterministico per seed. boneMask = 0/1 per cella (opzionale). */
export function newBoard(seed = 0, boneMask = null) {
  const bone = boneMask && boneMask.length === W * H ? Uint8Array.from(boneMask) : defaultBone();
  const dust = new Array(W * H).fill(1), rock = new Array(W * H), crust = new Array(W * H), chip = new Array(W * H).fill(0);
  for (let i = 0; i < W * H; i++) { rock[i] = bone[i] ? 0 : 1; crust[i] = bone[i] ? 1 : 0; }
  /* un filo di polvere già via, così si intuisce che sotto c'è qualcosa */
  for (let i = 0; i < W * H; i++) if (hash(i, seed) < 0.05) dust[i] = 0.4;
  return { dust, rock, crust, chip, bone, seed };
}

/* applica l'ATTREZZO del passo corrente nel raggio r. Ritorna {work, harm} (lavoro fatto, danno).
   - pennello: toglie POLVERE ovunque, mai danni.
   - scalpello: toglie ROCCIA sulla matrice; se centri l'OSSO lo scheggi (harm).
   - spatola: toglie CROSTA sull'osso; se raschi l'osso GIÀ pulito lo rovini (harm). */
export function work(board, tool, cx, cy, r) {
  if (!board) return { work: 0, harm: 0 };
  let done = 0, harm = 0;
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot(x - cx, y - cy); if (d > r) continue;
    const i = y * W + x, fall = 1 - d / r;
    if (tool === 'pennello') {
      if (board.dust[i] > 0) { const dd = Math.min(board.dust[i], POWER.pennello * fall); board.dust[i] -= dd; done += dd; }
    } else if (tool === 'scalpello') {
      if (board.dust[i] > 0.5) continue;                 // prima si spolvera: la roccia si stacca dopo
      if (!board.bone[i]) { if (board.rock[i] > 0) { const dd = Math.min(board.rock[i], POWER.scalpello * fall); board.rock[i] -= dd; done += dd; } }
      else { const h = HARM.scalpello * fall; board.chip[i] = Math.min(1, board.chip[i] + h); harm += h; } // colpito il fossile
    } else if (tool === 'spatola') {
      if (board.dust[i] > 0.5) continue;
      if (board.bone[i] && board.crust[i] > 0) { const dd = Math.min(board.crust[i], POWER.spatola * fall); board.crust[i] -= dd; done += dd; } // pulire è SEMPRE sicuro
    }
  }
  return { work: done, harm };
}

/* GRATTARE fermi con la spatola: si chiama UNA volta per movimento (non per sotto-passo), rovina
   solo l'osso GIÀ PULITO (crosta finita). Passarci sopra pulendo è sicuro; insistere fermi no. */
export function scrape(board, cx, cy, r = 1.6) {
  if (!board) return 0;
  let harm = 0;
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot(x - cx, y - cy); if (d > r) continue;
    const i = y * W + x;
    if (board.bone[i] && board.crust[i] <= 0.001 && board.dust[i] <= 0.5 && board.chip[i] < 1) {
      const h = SCRAPE * (1 - d / r); board.chip[i] = Math.min(1, board.chip[i] + h); harm += h;
    }
  }
  return harm;
}

/* avanzamento dei tre passi (frazione COMPLETATA, 0..1) */
export function dustPct(board) { if (!board) return 0; let s = 0; for (const v of board.dust) s += 1 - v; return s / (W * H); }
export function rockPct(board) { if (!board) return 1; let t = 0, s = 0; for (let i = 0; i < W * H; i++) if (!board.bone[i]) { t++; s += 1 - board.rock[i]; } return t ? s / t : 1; }
export function crustPct(board) { if (!board) return 1; let t = 0, s = 0; for (let i = 0; i < W * H; i++) if (board.bone[i]) { t++; s += 1 - board.crust[i]; } return t ? s / t : 1; }
export const PHASES = [
  { tool: 'pennello', pct: dustPct, need: 0.92 },
  { tool: 'scalpello', pct: rockPct, need: 0.90 },
  { tool: 'spatola', pct: crustPct, need: 0.90 },
];

/* PULIZIA = media dei tre passi. INTEGRITÀ = quanto è intatto l'osso (fondo 0.4, mai un disastro). */
export function cleanPct(board) { return (dustPct(board) + rockPct(board) + crustPct(board)) / 3; }
export function integrity(board) {
  if (!board) return 1;
  let t = 0, ch = 0; for (let i = 0; i < W * H; i++) if (board.bone[i]) { t++; ch += board.chip[i]; }
  return t ? Math.max(0.4, 1 - ch / t * 1.5) : 1;
}

/* GRADI — pulizia pesa di più; il perfetto chiede entrambe alte. */
export const GRADES = [
  { id: 'perfetto', mult: 1.5, xp: 12 }, { id: 'buono', mult: 1.25, xp: 6 },
  { id: 'grezzo', mult: 1.1, xp: 2 }, { id: 'niente', mult: 1, xp: 0 },
];
export function gradeFor(clean, integ) {
  if (integ == null) integ = 1;
  if (clean >= 0.9 && integ >= 0.9) return GRADES[0];
  const q = clean * 0.65 + integ * 0.35;
  if (q >= 0.75) return GRADES[1];
  if (q >= 0.4) return GRADES[2];
  return GRADES[3];
}
export function applyPrep(item, clean, integ) {
  if (!item || item.prep != null) return null;
  const g = gradeFor(clean, integ);
  item.prep = Math.round(clean * 100);
  item.prepInteg = Math.round((integ == null ? 1 : integ) * 100);
  item.val = Math.max(1, Math.round((item.val || 1) * g.mult));
  return g;
}
export function isPrepped(item) { return !!item && item.prep != null; }
