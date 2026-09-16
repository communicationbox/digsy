/* SUGGERIMENTI AL PRIMO INCONTRO.
   Prima tutto l'insegnamento stava in due toast da 2,6 secondi nei primi 5 secondi di gioco
   (su mobile ne restava UNO). Qui ogni meccanica si spiega quando la incontri davvero, una
   volta sola, e resta rileggibile nella Guida (zaino → ❔). */
import { S, save } from './state.js';
import { tr, keys } from './i18n.js';

/* id → [titolo, testo]. L'ordine è quello della Guida, e segue il gioco: prima scavare e il Museo,
   poi DNA e ambra, infine quello che si incontra esplorando. */
/* UNA RIGA A TESTA. Prima ogni voce erano due o tre frasi, e la Guida su un telefono era un
   muro di testo da scorrere: nessuno lo legge, e chi lo legge non si ricorda niente. Qui c'è
   il gesto e basta — il resto lo insegna il gioco. */
export const TIPS = {
  dig: () => [tr('Scavare', 'Digging'), tr('{act} per scavare: costa 1 ⚡, un punto una volta sola.', '{act} to dig: costs 1 ⚡, one spot only once.')],
  raw: () => [tr('Reperti grezzi', 'Raw finds'), tr('I grezzi si identificano al <b>Museo</b>.', 'Raw finds get identified at the <b>Museum</b>.')],
  energy: () => [tr('Energia', 'Energy'), tr('Finita l\'energia: dormi, o mangia un ristoro (+15 ⚡).', 'Out of energy: sleep, or eat a snack (+15 ⚡).')],
  bagfull: () => [tr('Zaino pieno', 'Bag full'), tr('Zaino pieno: i reperti restano <b>a terra</b>. Zaini più grandi al Negozio.', 'Bag full: finds stay <b>on the ground</b>. Bigger bags at the Shop.')],
  map: () => [tr('Mappa', 'Map'), tr('La mappa{key:M} si svela camminando.', 'The map{key:M} reveals itself as you walk.')],
  dna: () => [tr('DNA e risveglio', 'DNA and awakening'), tr('Teca completa = 1 fialetta di DNA. Con 2 risvegli la specie al Lab.', 'Complete case = 1 DNA vial. With 2 you awaken the species at the Lab.')],
  amber: () => [tr('Ambra', 'Amber'), tr('Dopo una teca completa escono i pezzi <b>d\'ambra</b> ✨: una seconda teca.', 'After a complete case, <b>amber</b> pieces ✨ turn up: a second case.')],
  quest: () => [tr('Missioni', 'Missions'), tr('Al cartello 📋 ci sono missioni che pagano.', 'The board 📋 has missions that pay.')],
  wonder: () => [tr('Meraviglie', 'Wonders'), tr('Ogni meraviglia fa un dono, poi riposa qualche giorno.', 'Each wonder gives a gift, then rests a few days.')],
  water: () => [tr('Acqua', 'Water'), tr('Con la <b>barca</b> si va sull\'acqua: {act} per pescare.', 'The <b>boat</b> takes you on the water: {act} to fish.')],
  cave: () => [tr('Grotte', 'Caves'), tr('Le grotte si aprono col <b>piccone</b>: 6 specie solo lì.', 'Caves open with the <b>pickaxe</b>: 6 species only there.')],
  night: () => [tr('Notte e stagioni', 'Night and seasons'), tr('Un giorno dura 20 minuti; la stagione cambia ogni 3.', 'A day lasts 20 minutes; the season changes every 3.')],
};
export const TIP_IDS = Object.keys(TIPS);
export function tipSeen(id) { return !!(S.tips || {})[id]; }
/* segna un suggerimento come visto; ritorna true solo la PRIMA volta */
export function markTip(id) {
  if (!TIPS[id] || tipSeen(id)) return false;
  if (!S.tips) S.tips = {};
  S.tips[id] = 1; save();
  return true;
}
export function tipTitle(id) { return TIPS[id] ? keys(TIPS[id]()[0]) : id; }
export function tipText(id) { return TIPS[id] ? keys(TIPS[id]()[1]) : ''; }
export function tipsSeenCount() { return TIP_IDS.filter(tipSeen).length; }
