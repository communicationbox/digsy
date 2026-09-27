/* LA CORTESIA FRA AMICI: dopo un «no» si aspetta, e ogni «no» in più si aspetta di più.
   Vale per gli inviti («vieni da me») e per le richieste («fammi entrare»), con UN conto solo
   per persona: chi ha detto no a uno non deve vedersi arrivare l'altro al suo posto.
   Il primo «no» non costa niente (si può aver toccato male, o era davvero un momento storto),
   poi 10 secondi, un minuto, cinque, e su fino a un'ora — mai oltre: un'amicizia non si
   chiude con un tetto, si rallenta. A richiesta: «così evitiamo lo spam».
   Sta nel dispositivo e non nel salvataggio (come la rubrica), e sopravvive al ricaricamento:
   un'attesa che si azzera ricaricando la pagina non ferma nessuno. Modulo puro, testabile. */
export const ATTESE = [0, 10e3, 60e3, 5 * 60e3, 15 * 60e3, 30 * 60e3, 60 * 60e3];
/* passato un giorno dall'ultimo «no» si ricomincia daccapo: ieri non è oggi */
export const DIMENTICA = 24 * 60 * 60e3;
const CHIAVE = 'digsy_cortesia';

function leggi() {
  try {
    const o = typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem(CHIAVE) || '{}');
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}
function scrivi(o) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(CHIAVE, JSON.stringify(o)); } catch (e) { /* pazienza */ } }
const chiave = c => String(c || '').toUpperCase();

/* quanto manca prima di poter chiedere di nuovo a `codice` (0 = subito) */
export function attesa(codice, now = Date.now()) {
  const r = leggi()[chiave(codice)];
  if (!r || typeof r.n !== 'number' || typeof r.t !== 'number') return 0;
  if (now - r.t > DIMENTICA) return 0;
  const passo = ATTESE[Math.min(Math.max(r.n - 1, 0), ATTESE.length - 1)];
  return Math.max(0, r.t + passo - now);
}
/* `codice` ha detto no: un passo in più */
export function rifiutato(codice, now = Date.now()) {
  const o = leggi(), k = chiave(codice); if (!k) return;
  const r = o[k];
  const n = (r && typeof r.n === 'number' && now - r.t <= DIMENTICA) ? r.n + 1 : 1;
  o[k] = { n, t: now }; scrivi(o);
}
/* un sì (o è lui a cercarci): si riparte da zero */
export function pace(codice) { const o = leggi(), k = chiave(codice); if (o[k]) { delete o[k]; scrivi(o); } }
/* «tra 40 s», «tra 5 min»: quanto manca detto come lo direbbe una persona */
export function traQuanto(ms, tr) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return tr('tra ', 'in ') + s + ' s';
  return tr('tra ', 'in ') + Math.ceil(s / 60) + ' min';
}
