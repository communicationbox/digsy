/* MERAVIGLIE DEL MONDO (i landmark).
   Non sono più soprammobili: ognuna è GRANDE, si SCOPRE (banner + pagina nel Libro con una
   riga del nonno che l'aveva già vista) e fa QUALCOSA — un dono diverso per tipo, riutilizzabile
   dopo un tot di giorni. Il cooldown è sempre scritto nel pannello, mai nascosto. */
import { S, P, save } from './state.js';
import { TS } from './data.js';
import { LANG, tr } from './i18n.js';

/* w = larghezza in tile dell'ingombro (dispari: la meraviglia è centrata sulla sua tile),
   cd = giorni di riposo fra due usi (0 = sempre disponibile), gp = la riga del nonno. */
export const WONDERS = {
  /* --- PRATI DORATI --- */
  gianttree: { w: 9, cd: 1, zone: 'prati',
    n: ['Yggdrasil', 'Yggdrasil'],
    d: ['Un albero così alto che le nuvole gli si impigliano nei rami.', 'A tree so tall the clouds snag in its branches.'],
    gp: ['Ci ho dormito sotto per una settimana. Non ho mai riposato meglio.', 'I slept under it for a week. I never rested better.'],
    p: ['Riposo delle radici: energia al massimo.', 'Root rest: energy fully restored.'] },
  menhir: { w: 7, cd: 3, zone: 'prati',
    n: ['Cerchio dei Menhir', 'The Menhir Circle'],
    d: ['Pietre alte il doppio di te, piantate in cerchio da mani antiche.', 'Stones twice your height, set in a ring by ancient hands.'],
    gp: ['Le pietre indicano altre pietre. Provaci: ascolta dove tirano.', 'The stones point to other stones. Try it: listen to where they pull.'],
    p: ['Eco di pietra: rivela le meraviglie vicine sulla mappa.', 'Stone echo: reveals nearby wonders on the map.'] },
  haygiant: { w: 5, cd: 3, zone: 'prati',
    n: ['Gigante di Fieno', 'The Hay Giant'],
    d: ['Un colosso di covoni con due mele al posto degli occhi.', 'A colossus of hay bales with two apples for eyes.'],
    gp: ['I contadini lo rifanno ogni anno. Dentro ci nascondono il pranzo.', 'The farmers rebuild it every year. They hide lunch inside.'],
    p: ['Provviste della festa: 3 ristori nello zaino.', 'Feast supplies: 3 snacks in your bag.'] },
  /* --- DUNE OSSEE --- */
  bonearch: { w: 9, cd: 0, zone: 'dune',
    n: ['Arco d\'Ossa', 'The Bone Arch'],
    d: ['Due costole grandi come alberi, incrociate in un arco sotto cui si passa.', 'Two ribs the size of trees, crossed into an arch you can walk under.'],
    gp: ['Gli archi si chiamano fra loro. Attraversane uno pensando a un altro.', 'The arches call to each other. Walk through one thinking of another.'],
    p: ['Passaggio: viaggia verso un altro arco scoperto.', 'Passage: travel to another discovered arch.'] },
  oasis: { w: 7, cd: 1, zone: 'dune',
    n: ['Oasi Ossea', 'The Bone Oasis'],
    d: ['Acqua dolce fra le dune, palme e un teschio enorme che fa ombra.', 'Fresh water among the dunes, palms and a huge skull casting shade.'],
    gp: ['Bevi, riempi la borraccia e riposa. Il deserto non perdona la fretta.', 'Drink, fill your flask and rest. The desert does not forgive haste.'],
    p: ['Acqua fresca: energia al massimo.', 'Fresh water: energy fully restored.'] },
  ribcage: { w: 9, cd: 4, zone: 'dune',
    n: ['Costolame', 'The Great Ribcage'],
    d: ['La gabbia toracica di una creatura immensa, mezza sepolta nella sabbia.', 'The ribcage of an immense creature, half buried in the sand.'],
    gp: ['Sotto le costole la sabbia è vergine: lì i reperti sono sempre buoni.', 'Under the ribs the sand is untouched: the finds there are always good.'],
    p: ['Scavo protetto: 3 reperti pregiati.', 'Sheltered dig: 3 fine finds.'] },
  /* --- BOSCHI CINEREI --- */
  mushring: { w: 7, cd: 3, zone: 'boschi',
    n: ['Cerchio di Funghi', 'The Fairy Ring'],
    d: ['Un anello perfetto di funghi che di notte brillano di verde.', 'A perfect ring of mushrooms that glow green at night.'],
    gp: ['Le spore attaccate alla pala portano fortuna. Non chiedermi perché.', 'Spores on your spade bring luck. Do not ask me why.'],
    p: ['Spore fortunate: ritrovamenti raddoppiati per 10 scavi.', 'Lucky spores: doubled finds for 10 digs.'] },
  hollowstump: { w: 5, cd: 5, zone: 'boschi',
    n: ['Ceppo Cavo', 'The Hollow Stump'],
    d: ['Il moncone di un albero enorme: dentro ci stai in piedi.', 'The stump of an enormous tree: you can stand inside it.'],
    gp: ['Ci nascondevo le cose che non volevo perdere. Guarda bene nel cavo.', 'I hid things there I did not want to lose. Look well inside the hollow.'],
    p: ['Nascondiglio: un reperto raro dimenticato.', 'Hiding place: a forgotten rare find.'] },
  totem: { w: 5, cd: 3, zone: 'boschi',
    n: ['Totem Cinereo', 'The Ashen Totem'],
    d: ['Un palo scolpito con i musi di creature che non esistono più.', 'A pole carved with the faces of creatures that no longer exist.'],
    gp: ['Chi l\'ha intagliato le aveva viste. Guarda i musi: sono giusti.', 'Whoever carved it had seen them. Look at the faces: they are accurate.'],
    p: ['Benedizione: esperienza doppia per 10 scavi.', 'Blessing: double experience for 10 digs.'] },
  /* --- TERRE ROSSE --- */
  geyser: { w: 7, cd: 3, zone: 'terre',
    n: ['Geyser Rosso', 'The Red Geyser'],
    d: ['Uno sbuffo di vapore bollente che scaglia sassi in cielo.', 'A blast of scalding steam that hurls stones into the sky.'],
    gp: ['Quando erutta porta su le cose sepolte. Basta essere lì al momento giusto.', 'When it erupts it brings up buried things. You just have to be there.'],
    p: ['Eruzione: sputa fuori 2 reperti dal profondo.', 'Eruption: spits out 2 finds from deep down.'] },
  redarch: { w: 9, cd: 0, zone: 'terre',
    n: ['Arco Rosso', 'The Red Arch'],
    d: ['Roccia scavata dal vento fino a diventare una porta sul cielo.', 'Rock carved by the wind into a doorway onto the sky.'],
    gp: ['Anche questo è un arco. Anche questo ti porta lontano.', 'This one is an arch too. This one takes you far as well.'],
    p: ['Passaggio: viaggia verso un altro arco scoperto.', 'Passage: travel to another discovered arch.'] },
  orevein: { w: 5, cd: 4, zone: 'terre',
    n: ['Filone Lucente', 'The Bright Vein'],
    d: ['Una vena di cristalli che attraversa la roccia come un lampo fermo.', 'A vein of crystal crossing the rock like frozen lightning.'],
    gp: ['Il piccone qui canta. Tre colpi e poi lascia riposare la pietra.', 'The pickaxe sings here. Three strikes, then let the stone rest.'],
    p: ['Filone: 3 reperti di roccia (serve il piccone).', 'Vein: 3 rock finds (pickaxe needed).'] },
  /* --- PALUDE ANTICA --- */
  willow: { w: 9, cd: 1, zone: 'palude',
    n: ['Salice Antico', 'The Ancient Willow'],
    d: ['Rami che toccano l\'acqua come una tenda verde.', 'Branches touching the water like a green curtain.'],
    gp: ['Sotto quel salice ho dormito e sognato le creature vive.', 'Under that willow I slept and dreamed the creatures alive.'],
    p: ['Sonno del salice: dormi fino all\'alba.', 'Willow sleep: sleep until dawn.'] },
  lilypad: { w: 7, cd: 3, zone: 'palude',
    n: ['Ninfee Giganti', 'The Giant Lily Pads'],
    d: ['Foglie larghe come zattere, ferme sull\'acqua nera.', 'Leaves as wide as rafts, still on the black water.'],
    gp: ['Sotto le foglie l\'acqua brulica. Cala la lenza e aspetta.', 'Under the leaves the water teems. Cast your line and wait.'],
    p: ['Acque pescose: 2 reperti d\'acqua.', 'Rich waters: 2 water finds.'] },
  bubblepool: { w: 5, cd: 2, zone: 'palude',
    n: ['Pozza Gorgogliante', 'The Bubbling Pool'],
    d: ['Bolle che salgono dal fondo e scoppiano con un odore antico.', 'Bubbles rising from the depths, popping with an ancient smell.'],
    gp: ['Ogni tanto la palude restituisce qualcosa. Non chiederle come.', 'Every so often the marsh gives something back. Do not ask how.'],
    p: ['Rigurgito: un reperto dal fondo.', 'Upwelling: a find from the bottom.'] },
  /* --- LANDE GELIDE --- */
  icespire: { w: 7, cd: 4, zone: 'ghiacci',
    n: ['Guglia di Ghiaccio', 'The Ice Spire'],
    d: ['Una lama di ghiaccio azzurro alta come una torre.', 'A blade of blue ice as tall as a tower.'],
    gp: ['Dalla cima si vede lontanissimo. Sali con calma e guarda.', 'From the top you can see very far. Climb slowly and look.'],
    p: ['Vedetta: rivela una vasta porzione di mappa.', 'Lookout: reveals a wide portion of the map.'] },
  frozenbeast: { w: 9, cd: 2, zone: 'ghiacci',
    n: ['Bestia nel Ghiaccio', 'The Beast in the Ice'],
    d: ['Una creatura intera, intatta, sospesa dentro il ghiaccio azzurro.', 'A whole creature, intact, suspended inside the blue ice.'],
    gp: ['Non ho fatto in tempo a liberarla. Falla uscire tu, un pezzo per volta.', 'I never managed to free it. You do it, one piece at a time.'],
    p: ['Liberala: un pezzo della stessa specie ogni volta.', 'Free it: one piece of the same species each time.'] },
  aurora: { w: 9, cd: 5, zone: 'ghiacci',
    n: ['Aurora', 'The Aurora'],
    d: ['Nastri di luce verde che ondeggiano sopra la neve.', 'Ribbons of green light waving above the snow.'],
    gp: ['Sotto l\'aurora ho capito quale creatura cercare dopo. Guarda in alto.', 'Under the aurora I understood which creature to seek next. Look up.'],
    p: ['Visione: rivela nel Libro una specie mai vista (solo di notte).', 'Vision: reveals an unseen species in the Book (at night only).'] },
};
export const WONDER_IDS = Object.keys(WONDERS);
export function wonderName(t) { const w = WONDERS[t]; return w ? tr(w.n[0], w.n[1]) : t; }
export function wonderDesc(t) { const w = WONDERS[t]; return w ? tr(w.d[0], w.d[1]) : ''; }
export function wonderGrandpa(t) { const w = WONDERS[t]; return w ? tr(w.gp[0], w.gp[1]) : ''; }
export function wonderPower(t) { const w = WONDERS[t]; return w ? tr(w.p[0], w.p[1]) : ''; }
export function wonderWidth(t) { return (WONDERS[t] && WONDERS[t].w) || 5; }
export function wonderCd(t) { return WONDERS[t] ? WONDERS[t].cd : 0; }

/* ---------- scoperta ---------- */
export function isDiscovered(t) { return (S.wonders || []).includes(t); }
export function discoverWonder(t) {
  if (!WONDERS[t] || isDiscovered(t)) return false;
  if (!S.wonders) S.wonders = [];
  S.wonders.push(t); save();
  return true;
}
export function discoveredCount() { return (S.wonders || []).length; }

/* ---------- uso e riposo ---------- */
/* chiave per singola meraviglia sulla mappa (tipo + posizione): due archi diversi hanno
   cooldown indipendenti */
export function wonderKey(type, tx, ty) { return type + '@' + tx + ',' + ty; }
export function wonderReadyIn(type, tx, ty) {
  const cd = wonderCd(type); if (!cd) return 0;
  const used = (S.wonderUse || {})[wonderKey(type, tx, ty)];
  if (used === undefined) return 0;
  return Math.max(0, cd - (S.day - used));
}
export function markWonderUsed(type, tx, ty) {
  if (!S.wonderUse) S.wonderUse = {};
  S.wonderUse[wonderKey(type, tx, ty)] = S.day; save();
}
/* testo sempre visibile: "pronta" oppure "riposa ancora N giorni" */
export function wonderStatusText(type, tx, ty) {
  const left = wonderReadyIn(type, tx, ty);
  if (!left) return tr('pronta', 'ready');
  return left === 1 ? tr('riposa: torna domani', 'resting: come back tomorrow')
    : tr('riposa ancora ' + left + ' giorni', 'resting for ' + left + ' more days');
}
/* ---------- archi: rete di viaggio rapido ---------- */
export const ARCHES = ['bonearch', 'redarch'];
export function isArch(t) { return ARCHES.includes(t); }
/* archi visitati: {key: {x, y, type}} — servono per viaggiare fra loro */
export function rememberArch(type, tx, ty) {
  if (!isArch(type)) return;
  if (!S.arches) S.arches = {};
  S.arches[wonderKey(type, tx, ty)] = { x: tx, y: ty, t: type }; save();
}
export function archList() { return Object.entries(S.arches || {}).map(([k, a]) => ({ key: k, ...a })); }
export function travelToArch(key) {
  const a = (S.arches || {})[key]; if (!a) return false;
  P.x = a.x * TS + 8; P.y = (a.y + 2) * TS + 2;   // si esce SOTTO l'arco, mai dentro la struttura
  save(); return true;
}
/* ---------- effetti temporanei (spore, benedizione) ---------- */
export function addBuff(kind, n) {
  if (!S.buffs) S.buffs = {};
  S.buffs[kind] = (S.buffs[kind] || 0) + n; save();
}
export function buffLeft(kind) { return (S.buffs || {})[kind] || 0; }
export function useBuff(kind) {
  if (!S.buffs || !S.buffs[kind]) return false;
  S.buffs[kind]--; if (S.buffs[kind] <= 0) delete S.buffs[kind];
  return true;
}
