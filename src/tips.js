/* SUGGERIMENTI AL PRIMO INCONTRO.
   Prima tutto l'insegnamento stava in due toast da 2,6 secondi nei primi 5 secondi di gioco
   (su mobile ne restava UNO). Qui ogni meccanica si spiega quando la incontri davvero, una
   volta sola, e resta rileggibile nella Guida (zaino → ❔). */
import { S, save } from './state.js';
import { tr, keys } from './i18n.js';

/* id → [titolo, testo]. L'ordine è quello della Guida, e segue il gioco: prima scavare e il Museo,
   poi DNA e ambra, infine quello che si incontra esplorando. */
export const TIPS = {
  dig: () => [tr('Scavare', 'Digging'), tr('Premi {act} per scavare: costa 1 ⚡. Ogni punto si scava una volta sola, poi spostati.', 'Press {act} to dig: it costs 1 ⚡. Each spot can be dug only once, then move on.')],
  raw: () => [tr('Reperti grezzi', 'Raw finds'), tr('Porta i reperti grezzi al <b>Museo</b>: lì li identificano.', 'Take raw finds to the <b>Museum</b>: they identify them there.')],
  energy: () => [tr('Energia', 'Energy'), tr('Ogni scavo consuma energia ⚡. Quando finisce, dormi alla <b>Locanda</b> o mangia un ristoro (+15 ⚡).', 'Every dig uses energy ⚡. When it runs out, sleep at the <b>Inn</b> or eat a snack (+15 ⚡).')],
  bagfull: () => [tr('Zaino pieno', 'Bag full'), tr('Quando lo zaino è pieno, i nuovi reperti restano <b>a terra</b>. Al Negozio trovi zaini più grandi.', 'When your bag is full, new finds stay <b>on the ground</b>. The Shop sells bigger bags.')],
  map: () => [tr('Mappa', 'Map'), tr('La mappa{key:M} si svela man mano che cammini.', 'The map{key:M} reveals itself as you walk.')],
  dna: () => [tr('DNA e risveglio', 'DNA and awakening'), tr('Una teca completa al Museo ti dà una <b>fialetta di DNA</b>. Con <b>2</b> fialette risvegli la specie al Lab.', 'A complete case at the Museum gives you a <b>DNA vial</b>. With <b>2</b> vials you awaken the species at the Lab.')],
  amber: () => [tr('Ambra', 'Amber'), tr('Quando una teca è completa, possono uscire i pezzi <b>d\'ambra</b> ✨ di quella specie: c\'è una seconda teca da riempire.', 'Once a case is complete, <b>amber</b> pieces ✨ of that species can turn up: a second case to fill.')],
  quest: () => [tr('Missioni', 'Missions'), tr('Al cartello 📋 trovi missioni che pagano monete ed esperienza.', 'The board 📋 has missions that pay coins and experience.')],
  wonder: () => [tr('Meraviglie', 'Wonders'), tr('Ogni meraviglia ti fa un dono, poi deve riposare qualche giorno.', 'Each wonder gives you a gift, then needs to rest a few days.')],
  water: () => [tr('Acqua', 'Water'), tr('Con la <b>barca</b> del Negozio vai sull\'acqua. Premi {act} per pescare.', 'With the Shop\'s <b>boat</b> you can go on the water. Press {act} to fish.')],
  cave: () => [tr('Grotte', 'Caves'), tr('Per entrare nelle grotte serve il <b>piccone</b>. Dentro vivono 6 specie che non trovi altrove.', 'You need the <b>pickaxe</b> to enter caves. Inside live 6 species found nowhere else.')],
  night: () => [tr('Notte e stagioni', 'Night and seasons'), tr('Un giorno dura 20 minuti e la stagione cambia ogni 3 giorni. Di notte la <b>torcia</b> ti fa vedere più lontano.', 'A day lasts 20 minutes and the season changes every 3 days. At night the <b>torch</b> lets you see farther.')],
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
