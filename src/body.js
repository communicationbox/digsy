/* IL CORPO DI DIGSY — dove sono i piedi, quanto è largo, quale casella sta pestando.
 *
 * Erano tre risposte diverse sparse in nove file, e due erano già in disaccordo:
 * nel mondo e in grotta la collisione usava i PIEDI (y+10..15), dentro gli edifici usava
 * y+0..5 — cioè il PETTO. Nello stesso file, la porta si "pestava" con y+13, un punto che
 * non stava dentro nessuna delle due scatole. Risultato: il personaggio urtava i mobili con
 * un rettangolo e attraversava le porte con un altro.
 *
 * Qui c'è una risposta sola. Modulo senza dipendenze: lo può importare chiunque, anche i
 * moduli di basso livello, senza creare anelli.
 */
import { TS } from './data.js';

/* Lo sprite è alto 30 px e disegnato con l'origine in alto: i piedi cadono 13 px sotto il
   punto (x, y) che il gioco chiama "posizione". Da questo numero dipendono scavo, bussola,
   mappa, porte, grotte e tocca-dove-andare. */
export const FOOT_DY = 13;

/* Scatola di collisione: solo la parte BASSA del corpo. Un personaggio alto che urtasse con
   la testa non potrebbe passare sotto niente, e in un gioco dall'alto la regola che si legge
   a occhio è "i piedi non entrano nel muro". */
export const BODY_HW = 5;    // mezza larghezza
export const BODY_Y0 = 10;   // dal ginocchio…
export const BODY_Y1 = 15;   // …alla pianta

/* La casella su cui poggiano i piedi. Accetta P, CAVE o INT: hanno tutti x/y compatibili. */
export function feetTile(pos) {
  return { tx: Math.floor(pos.x / TS), ty: Math.floor((pos.y + FOOT_DY) / TS) };
}
export function feetY(y) { return y + FOOT_DY; }

/* I quattro punti da provare contro i muri. Chi chiama decide COSA è solido; questa dice
   soltanto dove guardare. */
export function bodyPoints(x, y) {
  return [
    [x - BODY_HW, y + BODY_Y0], [x + BODY_HW, y + BODY_Y0],
    [x - BODY_HW, y + BODY_Y1], [x + BODY_HW, y + BODY_Y1],
  ];
}
/* true se uno dei quattro punti è dentro qualcosa di solido */
export function bodyHits(x, y, solidAt) {
  for (const [px, py] of bodyPoints(x, y)) if (solidAt(px, py)) return true;
  return false;
}

/* Posizione da dare al personaggio per metterlo IN PIEDI su una casella: i piedi al centro
   della casella, non il punto di disegno. Prima c'erano due convenzioni incompatibili
   (`ty * TS + 2` e `ty * TS + 10`) mescolate perfino nello stesso file: con i piedi a +13 la
   seconda depositava il giocatore una casella più in basso — a volte dentro un muro. */
export function placeOnTile(tx, ty) {
  return { x: tx * TS + TS / 2, y: ty * TS + TS / 2 - FOOT_DY };
}
