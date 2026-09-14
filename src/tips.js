/* SUGGERIMENTI AL PRIMO INCONTRO.
   Prima tutto l'insegnamento stava in due toast da 2,6 secondi nei primi 5 secondi di gioco
   (su mobile ne restava UNO). Qui ogni meccanica si spiega quando la incontri davvero, una
   volta sola, e resta rileggibile nella Guida (zaino → ❔). */
import { S, save } from './state.js';
import { tr, keys } from './i18n.js';

/* id → [titolo, testo]. L'ordine è quello della Guida. */
export const TIPS = {
  dig: () => [tr('Scavare', 'Digging'), tr('{act} scava sotto i piedi: 1 ⚡ a colpo. Le caselle si esauriscono: spostati.', '{act} digs under your feet: 1 ⚡ each. Tiles run out: move on.')],
  raw: () => [tr('Reperti grezzi', 'Raw finds'), tr('I grezzi non si vendono: il <b>Museo</b> li identifica e ti rende i doppioni.', 'Raw finds can\'t be sold: the <b>Museum</b> identifies them and returns duplicates.')],
  energy: () => [tr('Energia', 'Energy'), tr('Senza ⚡ non scavi: dormi alla <b>Locanda</b> (gratis) o mangia uno spuntino (+15 ⚡).', 'No ⚡, no digging: sleep at the <b>Inn</b> (free) or eat a snack (+15 ⚡).')],
  bagfull: () => [tr('Zaino pieno', 'Bag full'), tr('Zaino pieno? I reperti restano <b>a terra</b> ({act} per riprenderli). Il Negozio vende zaini più grandi.', 'Bag full? Finds stay <b>on the ground</b> ({act} to pick up). The Shop sells bigger bags.')],
  water: () => [tr('Acqua', 'Water'), tr('Con la <b>barca</b> (Negozio) entri in acqua e navighi. {act} sull\'acqua per pescare.', 'With a <b>boat</b> (Shop) you sail by walking into water. {act} on water to fish.')],
  cave: () => [tr('Grotte', 'Caves'), tr('Serve il <b>piccone</b> per aprire le grotte e staccare i cristalli: dentro, 6 specie uniche.', 'The <b>pickaxe</b> opens caves and breaks crystals: 6 unique species inside.')],
  wonder: () => [tr('Meraviglie', 'Wonders'), tr('18 meraviglie, 3 per bioma: ognuna fa un dono e poi riposa qualche giorno. Gli archi collegano.', '18 wonders, 3 per biome: each gives a gift, then rests a few days. Arches link them.')],
  map: () => [tr('Mappa', 'Map'), tr('La mappa{key:M} si svela camminando. Tocca un segno per sapere cos\'è.', 'The map{key:M} fills in as you walk. Tap a pin to see what it is.')],
  dna: () => [tr('DNA e chimere', 'DNA and chimeras'), tr('Teca completa (5 pezzi) = <b>fialetta DNA</b>. Con <b>2</b> il Lab risveglia la specie. Le chimere nascono da DUE creature.', 'Full case (5 pieces) = <b>DNA vial</b>. <b>2</b> let the Lab awaken the species. Chimeras come from TWO creatures.')],
  quest: () => [tr('Missioni', 'Missions'), tr('Il cartello in città ha le richieste del giorno: monete ed esperienza.', 'The town board has today\'s requests: coins and experience.')],
  night: () => [tr('Notte e stagioni', 'Night and seasons'), tr('Un giorno = 20 minuti. Di notte la <b>torcia</b> allarga la luce. Stagione nuova ogni 3 giorni.', 'A day = 20 minutes. At night the <b>torch</b> widens your light. New season every 3 days.')],
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
