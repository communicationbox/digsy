/* SUGGERIMENTI AL PRIMO INCONTRO.
   Prima tutto l'insegnamento stava in due toast da 2,6 secondi nei primi 5 secondi di gioco
   (su mobile ne restava UNO). Qui ogni meccanica si spiega quando la incontri davvero, una
   volta sola, e resta rileggibile nella Guida (zaino → ❔). */
import { S, save } from './state.js';
import { tr, keys } from './i18n.js';

/* id → [titolo, testo]. L'ordine è quello della Guida. */
export const TIPS = {
  dig: () => [tr('Scavare', 'Digging'), tr('Premi {act} per scavare la casella sotto i piedi. Ogni scavo costa 1 ⚡ e ogni casella si esaurisce: cammina un po\' e riprova.', 'Press {act} to dig the tile under your feet. Each dig costs 1 ⚡ and every tile runs out: walk a bit and try again.')],
  raw: () => [tr('Reperti grezzi', 'Raw finds'), tr('Un reperto grezzo non si può vendere: portalo al <b>Museo</b> e il Curatore lo identifica. I doppioni tornano a te, i pezzi nuovi restano esposti.', 'A raw find cannot be sold: bring it to the <b>Museum</b> and the Curator identifies it. Duplicates come back to you, new pieces stay on display.')],
  energy: () => [tr('Energia', 'Energy'), tr('Quando ⚡ finisce non si scava più. Dormi alla <b>Locanda</b> (gratis) o usa uno spuntino dallo zaino (+15 ⚡).', 'When ⚡ runs out you cannot dig. Sleep at the <b>Inn</b> (free) or eat a snack from your bag (+15 ⚡).')],
  bagfull: () => [tr('Zaino pieno', 'Bag full'), tr('Lo zaino ha una capienza: i reperti in più restano <b>a terra</b> e si riprendono con {act}. Al Negozio puoi comprarne uno più grande.', 'Your bag has a limit: extra finds stay <b>on the ground</b> and can be picked up with {act}. The Shop sells bigger bags.')],
  water: () => [tr('Acqua', 'Water'), tr('Serve una <b>barca</b> (Negozio) per navigare: dopo averla comprata ci sali da solo entrando in acqua. Con {act} sull\'acqua si pesca.', 'You need a <b>boat</b> (Shop) to sail: once bought you board it automatically by stepping into the water. Press {act} on water to fish.')],
  cave: () => [tr('Grotte', 'Caves'), tr('Le grotte sono sigillate da un masso: serve il <b>piccone</b> per aprirle, entrarci e staccare i cristalli. Dentro ci sono 6 specie che non esistono in superficie.', 'Caves are sealed by a boulder: you need the <b>pickaxe</b> to open one, get in and break the crystals. Inside live 6 species found nowhere else.')],
  wonder: () => [tr('Meraviglie', 'Wonders'), tr('Le meraviglie sono 18, tre per bioma. Ognuna fa un dono diverso e poi riposa per qualche giorno: il tempo che manca è sempre scritto. Gli archi ti fanno viaggiare da uno all\'altro.', 'There are 18 wonders, three per biome. Each grants a different gift then rests for a few days: the time left is always written. Arches let you travel between them.')],
  map: () => [tr('Mappa', 'Map'), tr('La mappa{key:M} si scopre camminando. Puoi zoomare con la rotella o due dita, trascinarla, e toccare un punto per sapere cos\'è.', 'The map{key:M} is revealed by walking. Zoom with the wheel or two fingers, drag it around, and tap a pin to see what it is.')],
  dna: () => [tr('DNA e chimere', 'DNA and chimeras'), tr('Completa una teca del Museo (5 pezzi della stessa specie) e ottieni una <b>fialetta di DNA</b>. Al Laboratorio ne servono <b>2</b> per risvegliare la specie, <b>1</b> per usarla in una chimera.', 'Complete a Museum case (5 pieces of one species) to get a <b>DNA vial</b>. The Laboratory needs <b>2</b> to awaken the species, <b>1</b> to use it in a chimera.')],
  quest: () => [tr('Missioni', 'Missions'), tr('Il cartello in città espone le richieste del giorno. Scadono a fine giornata e danno monete ed esperienza.', 'The town board shows the requests of the day. They expire at day\'s end and pay coins and experience.')],
  night: () => [tr('Notte e stagioni', 'Night and seasons'), tr('La giornata dura 20 minuti reali. Di notte ci si vede poco fuori dalle città: la <b>torcia</b> allarga l\'alone. Ogni 3 giorni cambia stagione.', 'A day lasts 20 real minutes. At night you can barely see outside towns: the <b>torch</b> widens your halo. The season changes every 3 days.')],
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
