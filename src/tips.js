/* SUGGERIMENTI AL PRIMO INCONTRO.
   Prima tutto l'insegnamento stava in due toast da 2,6 secondi nei primi 5 secondi di gioco
   (su mobile ne restava UNO). Qui ogni meccanica si spiega quando la incontri davvero, una
   volta sola, e resta rileggibile nella Guida (zaino → ❔). */
import { S, save } from './state.js';
import { tr, keys } from './i18n.js';

/* id → [titolo, testo]. L'ordine è quello della Guida. */
export const TIPS = {
  dig: () => [tr('Scavare', 'Digging'), tr('{act} scava: 1 ⚡. Le caselle finiscono: spostati.', '{act} digs: 1 ⚡. Tiles run out: move on.')],
  raw: () => [tr('Reperti grezzi', 'Raw finds'), tr('I grezzi vanno al <b>Museo</b>: li identifica.', 'Raw finds go to the <b>Museum</b> to be identified.')],
  energy: () => [tr('Energia', 'Energy'), tr('Senza ⚡: dormi alla <b>Locanda</b> o mangia un ristoro (+15 ⚡).', 'No ⚡: sleep at the <b>Inn</b> or eat a snack (+15 ⚡).')],
  bagfull: () => [tr('Zaino pieno', 'Bag full'), tr('Zaino pieno: i reperti restano <b>a terra</b>. Zaini più grandi al Negozio.', 'Bag full: finds stay <b>on the ground</b>. Bigger bags at the Shop.')],
  water: () => [tr('Acqua', 'Water'), tr('<b>Barca</b> (Negozio): entra in acqua. {act} per pescare.', '<b>Boat</b> (Shop): walk into water. {act} to fish.')],
  cave: () => [tr('Grotte', 'Caves'), tr('Il <b>piccone</b> apre le grotte: 6 specie uniche.', 'The <b>pickaxe</b> opens caves: 6 unique species.')],
  wonder: () => [tr('Meraviglie', 'Wonders'), tr('Ogni meraviglia fa un dono, poi riposa qualche giorno.', 'Each wonder gives a gift, then rests a few days.')],
  map: () => [tr('Mappa', 'Map'), tr('La mappa{key:M} si svela camminando.', 'The map{key:M} fills in as you walk.')],
  dna: () => [tr('DNA e chimere', 'DNA and chimeras'), tr('5 pezzi = <b>fialetta DNA</b>. <b>2</b> fialette = specie viva al Lab.', '5 pieces = <b>DNA vial</b>. <b>2</b> vials = species alive at the Lab.')],
  quest: () => [tr('Missioni', 'Missions'), tr('Il cartello 📋 dà missioni: monete ed XP.', 'The board 📋 gives missions: coins and XP.')],
  amber: () => [tr('Ambra', 'Amber'), tr('Con la teca completa arrivano i pezzi <b>d\'ambra</b> ✨: una seconda teca da riempire.', 'Once a case is full, <b>amber</b> pieces ✨ appear: a second case to fill.')],
  night: () => [tr('Notte e stagioni', 'Night and seasons'), tr('Un giorno = 20 minuti. Di notte serve la <b>torcia</b>.', 'A day = 20 minutes. At night use the <b>torch</b>.')],
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
