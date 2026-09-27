/* RICOMPONI LO SCHELETRO — minigioco al Museo: quando un pezzo NUOVO va esposto (museumCollect),
   lo trascini nel socket giusto di una tavola generica (stessa tavola per ogni specie: il gioco
   non prova a essere anatomicamente accurato, è un gesto di assemblaggio). Ricompensa: XP BONUS
   sopra quello già dato dal ritrovamento, a scaglioni sulla velocità. MAI un fallimento vero
   (cozy, senza game over): un socket sbagliato rimanda indietro il pezzo, il tempo continua a
   correre. Sempre SALTABILE (principio dei minigiochi: mai una tassa sul loop base).

   Modulo PURO (niente DOM): socket, punteggio e hit-test si testano da soli. */
import { PARTS } from './data.js';

/* LA TAVOLA È ORIZZONTALE E LO SCHELETRO È DI PROFILO, come un montaggio da museo: cranio a
   sinistra, collo, gabbia toracica, bacino, coda che si assottiglia a destra, zampa che scende
   sotto, corna che salgono dalla fronte. In verticale erano cinque cerchi incolonnati e due
   affiancati in fondo, e non c'era verso di sapere quale fosse la coda e quale la zampa —
   «non si capisce dove va la coda» (segnalato due volte). Di profilo la domanda non si pone:
   la coda sta dove sta una coda.
   Posizioni FISSE (frazioni 0-1 dentro il riquadro), le stesse per ogni specie: non è un
   puzzle di deduzione, è un gesto rapido di trascinamento — il punteggio è sul tempo. */
export const SOCKETS = [
  { id: 'corno', x: 0.19, y: 0.18 },
  { id: 'cranio', x: 0.22, y: 0.44 },
  { id: 'torace', x: 0.52, y: 0.42 },
  { id: 'zampa', x: 0.60, y: 0.72 },
  { id: 'coda', x: 0.86, y: 0.36 },
];
/* da dove parte il pezzo da trascinare: in basso a SINISTRA, nel vuoto sotto il cranio — al
   centro finiva addosso al cerchio della zampa */
export const HOME = { x: 0.28, y: 0.88 };
export function socketFor(partId) { return SOCKETS.find(s => s.id === partId) || null; }

/* LA SAGOMA SOTTO I SOCKET. Senza, la tavola è un fondo nero con cinque cerchietti in fila e
   non c'è modo di sapere che quello in basso a destra è la CODA e quello a sinistra la ZAMPA —
   «non si capisce dove va la coda, o dove vanno gli altri pezzi» (segnalato). Con lo scheletro
   disegnato sotto, ogni socket sta su un pezzo di animale e la domanda non si pone più.
   Segmenti in FRAZIONI della tavola (x, y, larghezza, altezza), come i socket: la tavola
   cambia misura con lo schermo e una sagoma in pixel ci si scollerebbe. Modulo puro: si
   misura che ogni socket caschi davvero sopra un pezzo di sagoma. */
export const FIG = [
  /* CORNA: due che salgono dalla fronte */
  [0.180, 0.150, 0.022, 0.210], [0.228, 0.190, 0.022, 0.175],
  /* CRANIO di profilo: calotta, muso allungato a sinistra, mandibola */
  [0.168, 0.355, 0.105, 0.095], [0.098, 0.395, 0.078, 0.048], [0.118, 0.452, 0.100, 0.026],
  /* COLLO: vertebre dal cranio alla colonna */
  [0.275, 0.372, 0.048, 0.036], [0.322, 0.378, 0.048, 0.036], [0.368, 0.382, 0.048, 0.036],
  /* TORACE: colonna, costole che scendono, sterno */
  [0.408, 0.378, 0.230, 0.040],
  [0.428, 0.415, 0.022, 0.155], [0.468, 0.415, 0.022, 0.175], [0.508, 0.415, 0.022, 0.175],
  [0.548, 0.415, 0.022, 0.155], [0.588, 0.415, 0.022, 0.120],
  [0.424, 0.565, 0.190, 0.028],
  /* BACINO */
  [0.620, 0.352, 0.090, 0.082],
  /* ZAMPA: femore, stinco, piede — scende SOTTO il bacino */
  [0.612, 0.425, 0.040, 0.120], [0.578, 0.535, 0.036, 0.150], [0.536, 0.675, 0.092, 0.032],
  /* CODA: segmenti che si assottigliano verso DESTRA */
  [0.700, 0.360, 0.062, 0.038], [0.756, 0.355, 0.056, 0.035], [0.806, 0.352, 0.050, 0.032],
  [0.850, 0.350, 0.045, 0.029], [0.889, 0.348, 0.040, 0.026], [0.923, 0.346, 0.034, 0.023],
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
