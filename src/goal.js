/* LO SCOPO DEL GIOCO, in un posto solo.
 *
 * Digsy World aveva un finale — sette sale del Museo, sette lettere del nonno, un congedo — e
 * non aveva uno scopo. Non è la stessa cosa. Il finale è dove si arriva; lo scopo è la ragione
 * per cui uno ci vuole arrivare, e va detta all'inizio o non serve a niente.
 *
 * Lo scopo dichiarato era "riempi il museo". Un museo è dove si mettono le cose morte, e
 * riempirlo è una lista della spesa: conti oggetti. Intanto la cosa più bella che il gioco sa
 * fare — una creatura che hai dissotterrato che CAMMINA VIVA nel parco — era un effetto
 * collaterale. Nessuno te la chiedeva, nessuno la contava, e il parco non cambiava.
 *
 * Lo scopo è quello. Il nonno lo scrive già nella sua ultima lettera:
 *   "le cercavo perché nessuno le ricordava, e una cosa dimenticata è come se non fosse mai
 *    esistita."
 * Lui ha passato la vita a dimostrare che ESISTEVANO. Il giocatore fa la cosa che a lui non è
 * riuscita: le fa TORNARE. Il Museo resta il mezzo (identifica, completa le teche, dà il DNA),
 * il parco è il fine.
 *
 * Qui dentro non c'è nessun contatore nuovo: `S.awakened` esiste da sempre e il parco lo
 * legge già (parkPopulation). Cambia solo che adesso qualcuno lo chiama traguardo.
 *
 * Modulo PURO: prende lo stato, torna numeri. Chi disegna sta altrove.
 */
import { S } from './state.js';
import { ALL_SPECIES } from './data.js';
import { tr } from './i18n.js';

/* quante ne hai riportate in vita, e quante ce ne sono in tutto */
export function alive(st) { const s = st || S; return ((s && s.awakened) || []).length; }
export function aliveTotal() { return ALL_SPECIES.length; }
export function goalDone(st) { return alive(st) >= aliveTotal(); }

/* LE SOGLIE. Servono perché un traguardo da 66 è troppo lontano per tirare: la prima creatura
   che torna a camminare deve valere qualcosa di suo, o si molla al terzo scavo.
   Sono anche gli appigli a cui aggancerò il parco che cresce (il passo dopo): a ogni soglia il
   posto cambia, così il progresso lo cammini invece di leggerlo. */
export const MILESTONES = [1, 5, 15, 30, 50, 66];
export function nextMilestone(st) {
  const n = alive(st);
  return MILESTONES.find(m => m > n) || null;
}
/* quante ne mancano alla prossima soglia (0 se non ce ne sono più) */
export function toNextMilestone(st) {
  const m = nextMilestone(st);
  return m === null ? 0 : m - alive(st);
}
export function milestoneReached(st) {
  const n = alive(st);
  return MILESTONES.includes(n) ? n : null;
}
/* COSA CAMBIA NEL PARCO a ogni soglia. Il parco cresce già da solo (parkDeco lo legge dal
   conteggio), ma se nessuno lo DICE il giocatore non collega le due cose: torna al recinto
   settimane dopo e pensa che sia sempre stato così. La soglia va annunciata nell'istante in
   cui scatta, nominando la cosa comparsa — è l'unico modo perché "5 di 66" smetta di essere
   un numero e diventi un posto che è cambiato per merito suo. */
export function milestoneGift(n) {
  if (n === 1) return tr('Il parco ha il suo primo albero.', 'The park has its first tree.');
  if (n === 5) return tr('Si è riempito lo stagno.', 'The pond has filled.');
  if (n === 15) return tr('Cespugli e sassi lungo il recinto.', 'Bushes and rocks along the fence.');
  if (n === 30) return tr('Sono spuntate le aiuole fiorite.', 'Flower beds have come up.');
  if (n === 50) return tr('Alberi ovunque: è un bosco.', 'Trees everywhere: it\'s a forest.');
  if (n === aliveTotal()) return tr('Tutte! Il mondo del nonno cammina di nuovo.', 'All of them! Grandpa\'s world walks again.');
  return '';
}
/* la riga che dice DOVE PORTA tutto questo. Serve dall'inizio: senza, "0 / 66" è un contatore
   e non un traguardo — non dice cosa succede quando arrivi in fondo. */
export function goalEnd() {
  /* il numero NON si concatena dentro tr(): la chiave del dizionario diventerebbe una stringa
     composta a runtime, il traduttore non la troverebbe mai e la voce russa resterebbe orfana
     (è successo scrivendo questa riga). Si spezza in due pezzi letterali, come altrove. */
  return tr('Riportale tutte e ', 'Bring back all ') + aliveTotal()
    + tr(' e il parco prenderà vita.',
      ' and the park comes alive.');
}

/* la riga che dice lo scopo. Sta qui e non nelle schermate perché va scritta UNA volta: tre
   copie a mano prima o poi divergono, e allora il gioco dice due cose diverse sullo stesso
   traguardo. */
export function goalLine(st) { return alive(st) + ' / ' + aliveTotal(); }
export function goalTitle() { return tr('Riportate in vita', 'Brought back to life'); }
export function goalHint(st) {
  if (goalDone(st)) return tr('Tutte. Il mondo del nonno cammina di nuovo.', 'All of them. Your grandparent\'s world walks again.');
  if (alive(st) === 0) {
    return tr('Teca completa al Museo, poi risveglio al Lab.',
      'Full case at the Museum, then awaken at the Lab.');
  }
  const m = toNextMilestone(st);
  return m === 1
    ? tr('Ne manca 1 al prossimo traguardo.', '1 more to the next milestone.')
    : tr('Ne mancano ', '') + m + tr(' al prossimo traguardo.', ' more to the next milestone.');
}
