/* LA POSTA — scrivere a qualcuno che in questo momento non c'è.
 *
 * La chat esiste solo mentre si è insieme: se l'amico non è in linea non c'è niente da dirgli
 * e nessun posto dove lasciarglielo. La cassetta delle lettere serve a quello, ed è il motivo
 * per cui **costa**: una riga scritta a qualcuno che non c'è va portata, e portarla è un
 * servizio del paese, non una cosa che succede da sé. Cinque monete, dette prima (regola 7).
 *
 * COSA SUCCEDE OGGI, detto chiaro: la lettera si scrive, si paga e resta **in partenza**. Per
 * arrivare davvero serve il recapito, che è roba del server (MULTIPLAYER.md, fetta 3): finché
 * non c'è, la cassetta è una buca vera con dentro le tue lettere — non un pulsante che finge.
 * Il pannello lo dice, invece di far credere che sia arrivata.
 *
 * LE LETTERE STANNO NEL SALVATAGGIO, come il codice e la rubrica: sono roba tua e ti seguono
 * sul telefono. Il taccuino no, e la differenza è voluta — quello è una conversazione già
 * avvenuta, queste sono cose ancora da consegnare.
 */
import { S, save } from './state.js';
import { normalizza, valido } from './amici.js';

export const COSTO_LETTERA = 5;     // 🪙 per una lettera
export const MAX_LETTERA = 200;     // caratteri: una cartolina, non un romanzo
export const MAX_IN_PARTENZA = 20;  // oltre, la buca è piena: si aspetta la levata

export function inPartenza() { return (S && Array.isArray(S.posta)) ? S.posta : []; }

/* Scrivi. Torna il motivo del no invece di un `false` muto: il pannello deve poter dire
   PERCHÉ, e ogni no qui ha una ragione diversa da raccontare. */
export function scrivi(aCodice, testo, gratis) {
  const c = normalizza(aCodice);
  if (!valido(c)) return 'codice';
  if (S && c === S.codice) return 'me';                       // a sé stessi non si scrive
  const m = String(testo || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_LETTERA);
  if (!m) return 'vuota';
  if (!S.posta) S.posta = [];
  if (S.posta.length >= MAX_IN_PARTENZA) return 'piena';
  if (!gratis && (S.coins || 0) < COSTO_LETTERA) return 'monete';
  if (!gratis) S.coins -= COSTO_LETTERA;
  S.posta.push({ a: c, m, g: S.day || 1 });
  save();
  return 'ok';
}

/* Ritirare una lettera dalla buca prima che parta: è ancora tua. Non rende le monete — il
   francobollo è speso, come nella vita. */
export function ritira(i) {
  if (!S || !Array.isArray(S.posta)) return false;
  if (i < 0 || i >= S.posta.length) return false;
  S.posta.splice(i, 1);
  save();
  return true;
}
