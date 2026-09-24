/* LA CHAT — nuvolette sopra la testa, e un TACCUINO che si rilegge.
 *
 * Due cose, non una (decisione di progetto, MULTIPLAYER.md 18): quello che uno dice compare
 * sopra la sua testa per qualche secondo — come parlano già gli NPC — e resta scritto nel
 * taccuino, una pagina per persona, che si rilegge quando si vuole.
 *
 * IL TACCUINO STA SUL DISPOSITIVO, in una chiave sua, **fuori dal salvataggio**. Due ragioni:
 * il salvataggio va anche in cloud e ha un tetto di dimensione contro cui il gioco ha già
 * sbattuto una volta (per questo la mappa esplorata viaggia compressa); e soprattutto perché
 * così le conversazioni non diventano mai roba di nessun server. Funziona perché la chat
 * avviene solo mentre si è insieme: non esistono messaggi da recapitare a chi non c'è, quindi
 * non c'è niente da custodire altrove.
 *
 * Un taccuino è una cosa che sta in tasca, non in archivio.
 */
import { MAX_CHAT } from './net.js';

export const CHIAVE = 'digsy_taccuino';
export const BOLLA_MS = 6000;      // quanto resta la nuvoletta sopra la testa
export const PER_PERSONA = 200;    // righe tenute per ciascuno: un taccuino, non un archivio
export const MAX_PAGINE = 50;      // persone diverse di cui si tiene memoria

/* le nuvolette vive in questo momento: id → { testo, t } */
const bolle = new Map();
export const CHAT = { scrivo: false };

/* ---------- il taccuino ---------- */

function leggi() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(CHIAVE);
    const o = raw ? JSON.parse(raw) : null;
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }      // taccuino illeggibile: si riparte da bianco, non si esplode
}
function scrivi(o) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(CHIAVE, JSON.stringify(o)); return true; }
  catch (e) { return false; }     // spazio finito: pazienza, la partita non si ferma per una riga di chat
}

/* L'ORA DI UNA RIGA, e non può mai essere uguale a quella di prima. Tre messaggi nello stesso
   millisecondo — che capita: due che si rispondono, o un test — renderebbero l'ordine del
   taccuino casuale, e "con chi ho parlato per ultimo" è proprio il modo in cui si cerca una
   conversazione. Resta un orario vero, solo mai due volte lo stesso. */
let ultimoT = 0;
function adesso() { const t = Math.max(Date.now(), ultimoT + 1); ultimoT = t; return t; }

/* Segna una riga sulla pagina di una persona. `io` distingue chi ha parlato senza salvare due
   volte lo stesso nome. */
export function segna(chi, testo, io, quando) {
  const nome = String(chi || '?').slice(0, 20);
  const m = String(testo || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_CHAT);
  if (!m) return false;
  const o = leggi();
  const pagina = o[nome] || (o[nome] = []);
  pagina.push({ m, io: !!io, t: quando || adesso() });
  /* si pota QUI, a ogni riga: una potatura fatta "ogni tanto" è una potatura che non avviene */
  if (pagina.length > PER_PERSONA) pagina.splice(0, pagina.length - PER_PERSONA);
  const nomi = Object.keys(o);
  if (nomi.length > MAX_PAGINE) {
    /* si butta la pagina con la riga più vecchia: chi non si sente da più tempo */
    nomi.sort((a, b) => ultimaOra(o[a]) - ultimaOra(o[b]));
    for (const n of nomi.slice(0, nomi.length - MAX_PAGINE)) delete o[n];
  }
  return scrivi(o);
}
function ultimaOra(p) { return (p && p.length) ? p[p.length - 1].t : 0; }

/* la pagina di una persona, dalla più vecchia alla più recente */
export function pagina(chi) { return leggi()[String(chi || '').slice(0, 20)] || []; }
/* con chi si è parlato, chi più di recente per primo */
export function pagine() {
  const o = leggi();
  return Object.keys(o).sort((a, b) => ultimaOra(o[b]) - ultimaOra(o[a]));
}
export function dimentica(chi) { const o = leggi(); delete o[String(chi || '')]; return scrivi(o); }
export function dimenticaTutto() { return scrivi({}); }

/* ---------- le nuvolette ---------- */

/* è arrivata una riga: nuvoletta sopra la testa di chi ha parlato, e riga sul taccuino */
export function arrivato(id, chi, testo, now) {
  const m = String(testo || '').trim().slice(0, MAX_CHAT);
  if (!m) return false;
  bolle.set(id, { testo: m, t: now || 0 });
  segna(chi, m, false);
  return true;
}
/* l'ho detta io: nuvoletta sopra la MIA testa e riga sulla pagina di chi mi ascolta */
export function detto(testo, aChi, now) {
  const m = String(testo || '').trim().slice(0, MAX_CHAT);
  if (!m) return false;
  bolle.set('io', { testo: m, t: now || 0 });
  for (const chi of (Array.isArray(aChi) ? aChi : [aChi])) if (chi) segna(chi, m, true);
  return true;
}
/* cosa c'è scritto sopra la testa di uno, adesso — o null se ha smesso di parlare */
export function bolla(id, now) {
  const b = bolle.get(id);
  if (!b) return null;
  if ((now || 0) - b.t > BOLLA_MS) { bolle.delete(id); return null; }
  return b.testo;
}
export function zittiTutti() { bolle.clear(); }

/* ---------- mentre si scrive ----------
   La tastiera di sistema si prende i tasti, e il gioco li userebbe per camminare: finché la
   riga è aperta i comandi si spengono. Il mondo no — quello non si ferma mai quando c'è gente
   (regola 5). */
export function apriRiga() { CHAT.scrivo = true; }
export function chiudiRiga() { CHAT.scrivo = false; }
export function staScrivendo() { return CHAT.scrivo; }
