/* STATISTICHE DELLA PARTITA — quello che hai fatto finora, in una schermata.
 *
 * Tutto si ricava da dati che il salvataggio ha GIÀ: nessun contatore nuovo da mantenere
 * (l'unico è `playSec`, le ore di gioco, che nessun altro campo poteva dedurre). Un contatore
 * in più è un campo che può sbagliare, restare indietro o non essere migrato dai salvataggi
 * vecchi; una statistica calcolata dallo stato è sempre vera per costruzione.
 *
 * Funzione PURA: prende lo stato e restituisce righe da disegnare. Così i casi difficili —
 * partita appena nata, salvataggio vecchio senza certi campi — si provano in un test invece
 * di scoprirli con la partita di qualcuno.
 */
import { ALL_SPECIES, PARTS } from './data.js';
import { WONDERS } from './wonders.js';
import { tr } from './i18n.js';

/* "3h 24m", "45m", "2m" — mai "0h 0m", che sembra un guasto. I secondi non interessano a
   nessuno se non nei primi minuti, dove invece sono l'unica cosa che si muove. */
export function playTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return h + 'h ' + m + 'm';
  if (m > 0) return m + 'm';
  return s + 's';
}

/* quante teche del museo sono complete (5 pezzi su 5) */
export function completeCases(st) {
  const mus = (st && st.museum) || {};
  let n = 0;
  for (const k of Object.keys(mus)) if ((mus[k] || []).length >= PARTS.length) n++;
  return n;
}

/* Le righe della schermata. `value` è già una stringa pronta: la formattazione di un numero
   è parte di cosa quel numero significa (12/66 dice molto più di 12). */
export function gameStats(st) {
  const s = st || {};
  const arr = (k) => (Array.isArray(s[k]) ? s[k] : []);
  return [
    { id: 'time', icon: '📅', label: tr('Tempo di gioco', 'Time played'), value: playTime(s.playSec) },
    { id: 'day', icon: '☀️', label: tr('Giorno', 'Day'), value: String(s.day || 1) },
    { id: 'level', icon: '⭐', label: tr('Livello', 'Level'), value: String(s.level || 1) },
    { id: 'coins', icon: '🪙', label: tr('Monete', 'Coins'), value: String(s.coins || 0) },
    { id: 'codex', icon: '📖', label: tr('Specie scoperte', 'Species discovered'),
      value: arr('codex').length + '/' + ALL_SPECIES.length },
    { id: 'cases', icon: '🏛️', label: tr('Teche complete', 'Complete cases'),
      value: completeCases(s) + '/' + ALL_SPECIES.length },
    { id: 'awake', icon: '🧬', label: tr('Specie risvegliate', 'Species awakened'),
      value: arr('awakened').length + '/' + ALL_SPECIES.length },
    { id: 'chimeras', icon: '🐾', label: tr('Chimere create', 'Chimeras created'),
      value: String(arr('creatures').length) },
    { id: 'wonders', icon: '✨', label: tr('Meraviglie trovate', 'Wonders found'),
      value: arr('wonders').length + '/' + Object.keys(WONDERS).length },
    { id: 'caves', icon: '🕳️', label: tr('Grotte esplorate', 'Caves explored'),
      value: String(Object.keys((s.caves && typeof s.caves === 'object') ? s.caves : {}).length) },
    { id: 'dug', icon: '⛏️', label: tr('Caselle scavate', 'Tiles dug'), value: String(arr('dug').length) },
    { id: 'quests', icon: '📋', label: tr('Missioni consegnate', 'Missions delivered'),
      value: String(s.questTotal || 0) },
  ];
}

/* Una riga sola per il riassunto in cima: quello che si racconterebbe a voce.
   Il totale è ALL_SPECIES (66), non le 60 di superficie: nel codex finiscono anche quelle di
   grotta, e un rapporto su un totale sbagliato è peggio di nessun rapporto. */
export function statsHeadline(st) {
  const s = st || {};
  const cod = Array.isArray(s.codex) ? s.codex.length : 0;
  return playTime(s.playSec) + ' · ' + tr('giorno', 'day') + ' ' + (s.day || 1)
    + ' · ' + cod + '/' + ALL_SPECIES.length + ' ' + tr('specie', 'species');
}
