/* IL CODICE E LA RUBRICA — chi sei per gli altri, e chi sono gli altri per te.
 *
 * Prima si entrava in una stanza con una parola inventata lì per lì. Funzionava, ma non è un
 * modo di invitare qualcuno: bisogna mettersi d'accordo ogni volta, due persone possono
 * scegliere la stessa parola senza saperlo, e non resta niente — domani si ricomincia da capo.
 *
 * Adesso **ognuno ha un codice suo**, che non cambia mai. Lo si dà una volta, l'amico se lo
 * segna in rubrica, e da lì in poi si entra col suo nome, non con una parola da ricordare.
 *
 * IL CODICE È LA CHIAVE DI CASA TUA: la stanza in cui si gioca porta il codice di chi ospita
 * (`stanzaDi`). Non c'è niente da inventare e niente da concordare — chi ha il tuo codice può
 * entrare nel tuo mondo, quindi lo si dà a chi si vuole e a nessun altro.
 *
 * DOVE VIVE. Nel salvataggio, non nelle preferenze del dispositivo: il salvataggio va anche
 * in cloud, quindi codice e rubrica ti seguono quando giochi dal telefono. È il contrario del
 * taccuino, che sta sul dispositivo apposta (le conversazioni non devono viaggiare).
 *
 * L'ALFABETO NON HA LETTERE AMBIGUE. Un codice si detta a voce o si scrive in una chat: con
 * O/0 e I/1/L dentro, un amico su dieci sbaglia a copiarlo e non capisce perché non entra.
 */
import { S, save } from './state.js';

/* 30 segni, niente 0/O, 1/I/L, 5/S, 8/B: dieci di questi fanno ~49 bit, abbastanza perché due
   persone non si ritrovino lo stesso codice nemmeno per sbaglio */
const ALFABETO = '234679ACDEFGHJKMNPQRTUVWXYZ';
export const LUNGHEZZA = 10;

function a_caso(n) {
  let out = '';
  const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(n)) : null;
  for (let i = 0; i < n; i++) {
    const v = c ? c[i] : Math.floor(Math.random() * 256);
    out += ALFABETO[v % ALFABETO.length];
  }
  return out;
}

/* IL MIO CODICE. Nasce alla prima richiesta e non cambia più: è un indirizzo, e un indirizzo
   che cambia non serve a niente — gli amici che se lo sono segnato non ti troverebbero più. */
export function mioCodice() {
  if (!S) return '';
  if (!S.codice || !valido(S.codice)) { S.codice = a_caso(LUNGHEZZA); save(); }
  return S.codice;
}

/* COME SI SCRIVE e come si legge. Dentro è una stringa sola; a schermo si spezza a metà,
   perché dieci segni di fila non si copiano a occhio senza perdere il segno. */
export function formatta(c) {
  const s = String(c || '').toUpperCase();
  return s.length === LUNGHEZZA ? s.slice(0, 5) + '-' + s.slice(5) : s;
}
/* QUELLO CHE ARRIVA DA FUORI si ripulisce: un codice copiato da una chat arriva con spazi,
   trattini e minuscole. Ma i segni che NON sono dell'alfabeto si buttano e basta — mai
   «corretti» in qualcos'altro: una O scambiata per uno zero, «riparata» in silenzio, darebbe
   un codice valido che è di un'altra persona. Meglio dire che non è un codice. */
export function normalizza(v) {
  return [...String(v || '').toUpperCase()].filter(c => ALFABETO.includes(c)).join('').slice(0, LUNGHEZZA);
}
export function valido(c) {
  const s = String(c || '');
  return s.length === LUNGHEZZA && [...s].every(x => ALFABETO.includes(x));
}

/* LA STANZA DI UNO. Il nome non è il codice nudo: `w-` davanti dice "il mondo di", e lascia
   spazio ad altri usi della stessa linea senza che si accavallino. */
export function stanzaDi(codice) { return 'w-' + normalizza(codice); }

/* ---------- la rubrica ---------- */

export function amici() { return (S && Array.isArray(S.amici)) ? S.amici : []; }

/* Aggiunge (o rinomina) un amico. Il nome è quello che scrivi tu: il suo nome vero arriva
   quando lo incontri, e sovrascriverlo sarebbe sgarbato — in rubrica ci sono i TUOI nomi. */
export function aggiungiAmico(codice, nome) {
  const c = normalizza(codice);
  if (!valido(c)) return false;
  if (S && c === S.codice) return false;          // sé stessi non si invitano
  if (!S.amici) S.amici = [];
  const n = String(nome || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 20) || formatta(c);
  const g = S.amici.find(x => x.c === c);
  if (g) g.n = n; else S.amici.push({ c, n });
  save();
  return true;
}
export function dimenticaAmico(codice) {
  const c = normalizza(codice);
  if (!S || !Array.isArray(S.amici)) return false;
  const prima = S.amici.length;
  S.amici = S.amici.filter(x => x.c !== c);
  save();
  return S.amici.length !== prima;
}
export function nomeDi(codice) {
  const c = normalizza(codice);
  const g = amici().find(x => x.c === c);
  return g ? g.n : formatta(c);
}
