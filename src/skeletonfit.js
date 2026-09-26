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

/* LA SAGOMA SOTTO I SOCKET. Senza, la tavola è un fondo nero con cinque cerchietti in fila e
   non c'è modo di sapere che quello in basso a destra è la CODA e quello a sinistra la ZAMPA —
   «non si capisce dove va la coda, o dove vanno gli altri pezzi» (segnalato). Con lo scheletro
   disegnato sotto, ogni socket sta su un pezzo di animale e la domanda non si pone più.
   Segmenti in FRAZIONI della tavola (x, y, larghezza, altezza), come i socket: la tavola
   cambia misura con lo schermo e una sagoma in pixel ci si scollerebbe. Modulo puro: si
   misura che ogni socket caschi davvero sopra un pezzo di sagoma. */
export const FIG = [
  /* corna: due tratti che salgono dal cranio */
  [0.455, 0.075, 0.020, 0.055], [0.525, 0.075, 0.020, 0.055],
  [0.470, 0.060, 0.020, 0.030], [0.510, 0.060, 0.020, 0.030],
  /* cranio: calotta e muso */
  [0.440, 0.240, 0.120, 0.060], [0.455, 0.225, 0.090, 0.020], [0.470, 0.295, 0.060, 0.022],
  /* collo: tre vertebre fra cranio e torace */
  [0.482, 0.325, 0.036, 0.030], [0.482, 0.360, 0.036, 0.030], [0.482, 0.395, 0.036, 0.030],
  /* torace: colonna e quattro costole per lato */
  [0.484, 0.430, 0.032, 0.180],
  [0.400, 0.450, 0.084, 0.018], [0.516, 0.450, 0.084, 0.018],
  [0.390, 0.490, 0.094, 0.018], [0.516, 0.490, 0.094, 0.018],
  [0.395, 0.530, 0.089, 0.018], [0.516, 0.530, 0.089, 0.018],
  [0.412, 0.570, 0.072, 0.018], [0.516, 0.570, 0.072, 0.018],
  /* bacino */
  [0.430, 0.620, 0.140, 0.040],
  /* zampa: femore, stinco, piede — scende a SINISTRA e SPORGE dal suo socket, o la sagoma
     finisce tutta sotto il cerchio e non si vede più */
  [0.355, 0.655, 0.080, 0.028], [0.312, 0.685, 0.034, 0.090], [0.262, 0.870, 0.096, 0.028],
  [0.312, 0.770, 0.034, 0.110],
  /* coda: segmenti che scendono a DESTRA e si assottigliano, fino oltre il cerchio */
  [0.565, 0.650, 0.070, 0.028], [0.620, 0.688, 0.060, 0.026],
  [0.664, 0.728, 0.052, 0.024], [0.700, 0.772, 0.046, 0.022],
  [0.730, 0.818, 0.040, 0.020], [0.756, 0.862, 0.034, 0.018],
];

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
