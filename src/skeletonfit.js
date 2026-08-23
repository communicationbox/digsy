/* RICOMPONI LO SCHELETRO — minigioco al Museo: quando un pezzo NUOVO va esposto (museumCollect),
   lo trascini nel socket giusto di una tavola generica (stessa tavola per ogni specie: il gioco
   non prova a essere anatomicamente accurato, è un gesto di assemblaggio). Ricompensa: XP BONUS
   sopra quello già dato dal ritrovamento, a scaglioni sulla velocità. MAI un fallimento vero
   (cozy, senza game over): un socket sbagliato rimanda indietro il pezzo, il tempo continua a
   correre. Sempre SALTABILE (principio dei minigiochi: mai una tassa sul loop base).

   Modulo PURO (niente DOM): socket, punteggio e hit-test si testano da soli. */
import { PARTS } from './data.js';

/* posizioni FISSE dei 5 socket sulla tavola (percentuale 0-1 dentro il riquadro), stesse per
   ogni specie: non è un puzzle di deduzione, è un gesto rapido di trascinamento. */
export const SOCKETS = [
  { id: 'corno', x: 0.50, y: 0.10 },
  { id: 'cranio', x: 0.50, y: 0.28 },
  { id: 'torace', x: 0.50, y: 0.52 },
  { id: 'zampa', x: 0.30, y: 0.80 },
  { id: 'coda', x: 0.70, y: 0.80 },
];
export function socketFor(partId) { return SOCKETS.find(s => s.id === partId) || null; }

/* raggio di presa, in frazione della stessa scala x/y dei socket (0-1) */
export const HIT_R = 0.10;
/* il socket più vicino al punto di rilascio, se dentro il raggio di presa */
export function nearestSocket(px, py, r = HIT_R) {
  let best = null, bd = Infinity;
  for (const s of SOCKETS) {
    const d = Math.hypot(px - s.x, py - s.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best && bd <= r ? best : null;
}

/* scaglioni di XP bonus sul tempo (ms) impiegato a trovare il socket GIUSTO.
   Numeri sulla stessa scala del restauro (prepare.js: 12/6/2/0). */
export const GRADES = [
  { id: 'perfetto', maxMs: 2200, xp: 10 },
  { id: 'buono', maxMs: 4500, xp: 5 },
  { id: 'ok', maxMs: Infinity, xp: 2 },
];
export function gradeForTime(ms) { return GRADES.find(g => ms <= g.maxMs) || GRADES[GRADES.length - 1]; }
/* saltato: nessun bonus, ma niente penalità (principio "mai una tassa") */
export const SKIP_GRADE = { id: 'saltato', xp: 0 };

export function partLabel(partId) { const p = PARTS.find(x => x.id === partId); return p ? p.emoji : ''; }
