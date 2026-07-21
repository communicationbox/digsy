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
const POWER = { pennello: 1, scalpello: 0.45, spatola: 0.45 };   // pennello spolvera in un colpo (veloce); precisi più graduali
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

/* cella centrale sotto il cursore (il punto che controlli): dove si valuta il DANNO */
export function centerCell(cx, cy) {
  const x = Math.floor(cx), y = Math.floor(cy);
  return (x < 0 || y < 0 || x >= W || y >= H) ? -1 : y * W + x;
}
/* applica l'ATTREZZO su un QUADRATO di celle (mezzo-lato hs). L'area RIMUOVE (uniforme, così ciò
   che vedi = ciò che agisce); il DANNO è SOLO sulla cella CENTRALE, così è preciso: sbagli solo
   se metti il centro sull'osso. Ritorna {work, harm}.
   - pennello: toglie POLVERE, mai danni.
   - scalpello: toglie ROCCIA (matrice); centro sull'OSSO = scheggia.
   - spatola: toglie CROSTA (osso); il danno da grattare fermi sta in scrape(). */
export function work(board, tool, cx, cy, hs) {
  if (!board) return { work: 0, harm: 0 };
  let done = 0, harm = 0;
  const cxi = Math.floor(cx), cyi = Math.floor(cy);
  for (let y = Math.max(0, cyi - hs); y <= Math.min(H - 1, cyi + hs); y++)
    for (let x = Math.max(0, cxi - hs); x <= Math.min(W - 1, cxi + hs); x++) {
      const i = y * W + x;
      if (tool === 'pennello') { if (board.dust[i] > 0) { const dd = Math.min(board.dust[i], POWER.pennello); board.dust[i] -= dd; done += dd; } }
      else if (tool === 'scalpello') { if (board.dust[i] <= 0.5 && !board.bone[i] && board.rock[i] > 0) { const dd = Math.min(board.rock[i], POWER.scalpello); board.rock[i] -= dd; done += dd; } }
      else if (tool === 'spatola') { if (board.dust[i] <= 0.5 && board.bone[i] && board.crust[i] > 0) { const dd = Math.min(board.crust[i], POWER.spatola); board.crust[i] -= dd; done += dd; } }
    }
  if (tool === 'scalpello') {                            // danno SOLO al centro
    const ci = centerCell(cx, cy);
    if (ci >= 0 && board.bone[ci] && board.dust[ci] <= 0.5) { board.chip[ci] = Math.min(1, board.chip[ci] + HARM.scalpello); harm += HARM.scalpello; }
  }
  return { work: done, harm };
}

/* GRATTARE fermi con la spatola: UNA volta per movimento (non per sotto-passo), rovina SOLO la
   cella CENTRALE se è osso GIÀ PULITO. Passarci sopra pulendo è sicuro; insistere fermi no. */
export function scrape(board, cx, cy) {
  if (!board) return 0;
  const ci = centerCell(cx, cy);
  if (ci < 0 || !board.bone[ci] || board.crust[ci] > 0.001 || board.dust[ci] > 0.5 || board.chip[ci] >= 1) return 0;
  board.chip[ci] = Math.min(1, board.chip[ci] + SCRAPE); return SCRAPE;
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
