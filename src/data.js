/* Dati statici di gioco: specie, parti, rarità, biomi, costi, palette look */
export const TS = 16;

/* ---------- zone del mondo (tipo biomi Minecraft: ripetibili, ampiezze variabili) ---------- */
/* LE ZONE: UN ELENCO SOLO.
 *
 * Le informazioni su una zona vivevano in sei tabelle sparse fra tre file, metà indicizzate
 * per POSIZIONE (ZONE_TILES, ZONE_TREE, BAND) e metà per ID (ZONE_COSMETICS, zonePools).
 * Aggiungere o riordinare una zona voleva dire ricordarsele tutte, e THEMED_HAT si era già
 * ritrovata con cinque voci contro sei zone senza che niente lo segnalasse.
 *
 * `ZONE_LIST` è l'ordine ufficiale: chi indicizza per posizione DEVE seguirlo, e un test
 * pretende che ogni zona abbia ogni campo. `ZONES` resta il nome storico (lo importano in
 * venti punti) ed è la stessa cosa. */
export const ZONES = [
  { id: 'prati', name: 'Prati Dorati', icon: '🌾', tint: 'rgba(246,220,120,0.08)' },
  { id: 'dune', name: 'Dune Ossee', icon: '🏜️', tint: 'rgba(240,200,120,0.13)' },
  { id: 'boschi', name: 'Boschi Cinerei', icon: '🌲', tint: 'rgba(110,130,145,0.12)' },
  { id: 'terre', name: 'Terre Rosse', icon: '⛰️', tint: 'rgba(220,110,70,0.12)' },
  { id: 'palude', name: 'Palude Antica', icon: '🐸', tint: 'rgba(80,135,85,0.14)' },
  { id: 'ghiacci', name: 'Lande Gelide', icon: '🧊', tint: 'rgba(180,210,235,0.16)' },
];
/* stesso elenco, nome che dice cosa garantisce: l'ORDINE */
export const ZONE_LIST = ZONES;
export const ZONE_IDS = ZONES.map(z => z.id);

/* ---------- specie: 10 per zona — 4 comuni, 3 rare, 2 eccezionali, 1 LEGGENDARIA ---------- */
const ZDEF = [
  [['prato', 'Pratocorno'], ['lepre', 'Saltalepre'], ['erbadonte', 'Erbadonte'], ['rugiadino', 'Rugiadino'], ['fienotauro', 'Fienotauro'], ['spigacervo', 'Spigacervo'], ['grillosso', 'Grillosso'], ['talpaurea', 'Talpaurea'], ['falcedorso', 'Falcedorso'], ['soleburo', 'Soleburo']],
  [['gastro', 'Gastrolingo'], ['pinna', 'Pinnavolvo'], ['sabbiodonte', 'Sabbiodonte'], ['conchigliante', 'Conchigliante'], ['dunavespa', 'Dunavespa'], ['scorpisabbia', 'Scorpisabbia'], ['miraggiolo', 'Miraggiolo'], ['cactodonte', 'Cactodonte'], ['ossidraco', 'Ossidraco'], ['duneterno', 'Duneterno']],
  [['alce', 'Cortalce'], ['muschio', 'Muschiante'], ['corteccino', 'Corteccino'], ['fungorso', 'Fungorso'], ['gufo', 'Gufombra'], ['cinervo', 'Cinervo'], ['radicante', 'Radicante'], ['brumavolpe', 'Brumavolpe'], ['ramarrospino', 'Ramarrospino'], ['cinerarca', 'Cinerarca']],
  [['cristallo', 'Cristallosauro'], ['scorpio', 'Scorpietra'], ['gessolino', 'Gessolino'], ['ocralince', 'Ocralince'], ['magma', 'Magmadonte'], ['ferrodonte', 'Ferrodonte'], ['bronzotauro', 'Bronzotauro'], ['lavalupo', 'Lavalupo'], ['vulcanide', 'Vulcanide'], ['magmarex', 'Magmarex']],
  [['fangodonte', 'Fangodonte'], ['girinosso', 'Girinosso'], ['limosalta', 'Limosalta'], ['salicervo', 'Salicervo'], ['ninfeasauro', 'Ninfeasauro'], ['torbalupo', 'Torbalupo'], ['zanzarone', 'Zanzarone'], ['melmalince', 'Melmalince'], ['brontorana', 'Brontorana'], ['pantanarca', 'Pantanarca']],
  [['gelodonte', 'Gelodonte'], ['brinalepre', 'Brinalepre'], ['nevosauro', 'Nevosauro'], ['slavinotto', 'Slavinotto'], ['ghiacciolupo', 'Ghiacciolupo'], ['boreacervo', 'Boreacervo'], ['cristalgufo', 'Cristalgufo'], ['permafrosso', 'Permafrosso'], ['auroralce', 'Auroralce'], ['eternoglacio', 'Eternoglacio']],
];
export const SPECIES = [];
ZDEF.forEach((row, zi) => row.forEach(([id, name], i) => {
  SPECIES.push({
    id, name, zone: ZONES[zi].id, zi, idx: SPECIES.length, emoji: ZONES[zi].icon,
    r: i < 4 ? 'comune' : i < 7 ? 'raro' : i < 9 ? 'eccezionale' : 'leggendario',
  });
}));
export const spById = Object.fromEntries(SPECIES.map(s => [s.id, s]));
export const zonePools = Object.fromEntries(ZONES.map(z => [z.id, SPECIES.filter(s => s.zone === z.id)]));
/* FONTI speciali: in ogni zona il 1° raro vive negli ALBERI, il 2° raro in ACQUA,
   il 1° eccezionale nelle ROCCE. Scavando la terra NON escono: servono accetta/piccone/barca.
   (src undefined = terra) */
for (const z of ZONES) {
  const pool = zonePools[z.id];
  const rari = pool.filter(s => s.r === 'raro'), ecc = pool.filter(s => s.r === 'eccezionale');
  if (rari[0]) rari[0].src = 'albero';
  if (rari[1]) rari[1].src = 'acqua';
  if (ecc[0]) ecc[0].src = 'roccia';
}
export const SRC_ICON = { albero: '🌲', roccia: '⛰️', acqua: '🌊' };

/* FINESTRE DI PRESENZA — non tutte le specie sono lì ad aspettarti sempre.
   In ogni zona: il raro d'ACQUA si pesca solo DI NOTTE, l'eccezionale di ROCCIA si stacca solo
   in UNA STAGIONE. Serve a dare un motivo per tornare, e a dare un senso a uscire di notte.
   Le finestre stanno di proposito sulle specie che hanno GIÀ una fonte dedicata (barca,
   piccone): così ogni rarità resta comunque raggiungibile scavando la terra a qualsiasi ora,
   e il pity timer non può restare a secco. */
for (const [zi, z] of ZONES.entries()) {
  const pool = zonePools[z.id];
  const acq = pool.find(s => s.src === 'acqua'), roc = pool.find(s => s.src === 'roccia');
  if (acq) acq.when = { night: true };
  if (roc) roc.when = { season: zi % 4 };
}
/* la specie è pescabile adesso? (night/season arrivano da chi chiama: data.js resta puro) */
export function availableNow(sp, night, season) {
  const w = sp && sp.when; if (!w) return true;
  if (w.night && !night) return false;
  if (w.season != null && w.season !== season) return false;
  return true;
}
export function hasWindow(sp) { return !!(sp && sp.when); }

export const PARTS = [
  { id: 'cranio', name: 'Cranio', emoji: '💀', mult: 1.5 },
  { id: 'torace', name: 'Torace', emoji: '🫁', mult: 1.2 },
  { id: 'zampa', name: 'Zampa', emoji: '🦴', mult: 0.8 },
  { id: 'coda', name: 'Coda', emoji: '🌀', mult: 0.7 },
  { id: 'corno', name: 'Corno', emoji: '🪶', mult: 1.0 },
];
export const ptById = Object.fromEntries(PARTS.map(p => [p.id, p]));

export const RAR = [
  { id: 'comune', label: 'Comune', mult: 1, w: 58 },
  { id: 'raro', label: 'Raro', mult: 2.2, w: 27 },
  { id: 'eccezionale', label: 'Eccezionale', mult: 4.5, w: 12 },
  { id: 'leggendario', label: 'Leggendario', mult: 9, w: 3 },
];

/* colore pelliccia/pelle per le chimere risvegliate: generato per specie (hue a passo aureo) */
function hsl2hex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + ((1 << 24) | (f(0) << 16) | (f(8) << 8) | f(4)).toString(16).slice(1);
}
/* ---------- GROTTE: 6 specie esclusive (fuori dalle 60, non in una zona-museo) ---------- */
export const CAVE_SPECIES = [
  ['cavernide', 'Cavernide', 'comune'], ['luceverme', 'Luceverme', 'comune'],
  ['stalattodonte', 'Stalattodonte', 'raro'], ['pipistrosso', 'Pipistrosso', 'raro'],
  ['cristallugo', 'Cristallugo', 'eccezionale'], ['abissodonte', 'Abissodonte', 'leggendario'],
].map(([id, name, r], i) => ({ id, name, r, zone: 'grotta', zi: 6, idx: 60 + i, emoji: '🦴', src: 'grotta' }));
/* aggiunte a spById/spColor per lookup e sprite voxel (SPECIES resta a 60) */
for (const s of CAVE_SPECIES) spById[s.id] = s;
export const CAVE_POOL = CAVE_SPECIES;
/* Le grotte sono la SETTIMA ala del museo: le loro 6 specie hanno teca, pagina del Libro e
   risveglio come le altre. SPECIES resta a 60 (le zone di superficie), ALL_SPECIES è il
   catalogo completo usato da museo/Libro/DNA. */
export const CAVE_ZONE = { id: 'grotta', name: 'Grotte Profonde', icon: '🕳️', tint: 'rgba(120,150,190,0.10)' };
export const MUSEUM_ZONES = ZONES.concat([CAVE_ZONE]);
export const ALL_SPECIES = SPECIES.concat(CAVE_SPECIES);
zonePools[CAVE_ZONE.id] = CAVE_SPECIES;

export const spColor = Object.fromEntries(SPECIES.concat(CAVE_SPECIES).map((s, i) => [s.id, hsl2hex((i * 137.5) % 360, 42, 64)]));

/* OGGETTI di superficie (NON fossili): si raccolgono a vista con E in overworld e si vendono
   al Negozio per pochi 🪙 (i primi soldi). Rarità implicita = valore. [id, it, en, val] */
export const GOODS = {
  prati: [['fiordaliso', 'Fiordaliso secco', 'Dried cornflower', 1], ['spiga', 'Spiga dorata', 'Golden ear', 2], ['ambra', "Goccia d'ambra", 'Amber drop', 4]],
  dune: [['conchiglia', 'Conchiglia', 'Seashell', 1], ['vetro', 'Vetro levigato', 'Sea glass', 2], ['scarabeo', "Scarabeo d'osso", 'Bone scarab', 4]],
  boschi: [['ghianda', 'Ghianda', 'Acorn', 1], ['funghetto', 'Fungo secco', 'Dried mushroom', 2], ['resina', 'Resina scura', 'Dark resin', 4]],
  terre: [['sassorosso', 'Sasso rosso', 'Red pebble', 1], ['ferro', 'Scaglia di ferro', 'Iron flake', 2], ['granato', 'Granato grezzo', 'Rough garnet', 5]],
  palude: [['giunco', 'Giunco', 'Reed bundle', 1], ['lumaca', 'Guscio di lumaca', 'Snail shell', 2], ['ninfea', 'Fiore di ninfea', 'Water lily', 4]],
  ghiacci: [['scheggia', 'Scheggia di ghiaccio', 'Ice shard', 2], ['pigna', 'Pigna innevata', 'Snowy pinecone', 2], ['zaffiro', 'Zaffiro gelato', 'Frozen sapphire', 5]],
};
export const goodById = {};
for (const z in GOODS) for (const g of GOODS[z]) goodById[g[0]] = { id: g[0], it: g[1], en: g[2], val: g[3] };

export const CHIMERA_COST = 40;   // risvegliare una chimera al Laboratorio
export const SERVICE_COST = 8;    // barbiere / sartoria, per modifica

/* palette scelte per l'editor / negozi */
export const LOOKS = {
  hat: ['#d06b43', '#c65a54', '#5a86c8', '#4e8d7c', '#d8973c', '#8d7ba0', '#6b5137', '#e2d7bd'],
  shirt: ['#57a58f', '#c65a54', '#5a86c8', '#d8973c', '#8d7ba0', '#7ec069', '#b5622e', '#e2d7bd'],
  pants: ['#c88a44', '#6b5137', '#5a6a8a', '#8a5f38', '#3d5f4a'],
  skin: ['#f3cfa0', '#e3b98a', '#c9995f', '#a3744a', '#7a5232'],
};
export const LOOK_LABELS = { hat: 'Cappello', shirt: 'Maglia', pants: 'Pantaloni', skin: 'Pelle' };

export const HAIR_STYLES = [
  { id: 'none', label: 'Rasato' },
  { id: 'short', label: 'Corto' },
  { id: 'long', label: 'Lungo' },
  { id: 'curly', label: 'Riccio' },
  { id: 'punk', label: 'Punk' },
  { id: 'receding', label: 'Stempiato' },
];
export const HAIR_COLORS = [
  '#33291f', '#6e4a2a', '#a3744a', '#caa25a', '#e8d29a', '#b5622e',
  '#d8793a', '#8a8a8a', '#e8e4da', '#57648f', '#4e8d7c', '#d98ab0',
];
export const EYE_COLORS = [
  '#33291f', '#5a3b22', '#3a6a8c', '#3d7a54', '#8a5a2a', '#6b5a7a', '#5a5a5a', '#a83a3a',
];

export const HAT_STYLES = [
  { id: 'explorer', label: 'Esploratore' },
  { id: 'cap', label: 'Berretto' },
  { id: 'beanie', label: 'Cuffia' },
];
/* FORME di MAGLIA (torso/braccia) e PANTALONI (gambe): come i cappelli, una FORMA + il colore.
   La forma è un overlay disegnato sul corpo (vedi SHIRTS/PANTS in sprites.js). */
export const SHIRT_STYLES = [
  { id: 'tshirt', label: 'Maglietta' },
  { id: 'tank', label: 'Canottiera' },
  { id: 'shirt', label: 'Camicia' },
  { id: 'hoodie', label: 'Felpa' },
];
export const PANTS_STYLES = [
  { id: 'long', label: 'Pantaloni' },
  { id: 'shorts', label: 'Pantaloncini' },
  { id: 'skirt', label: 'Gonna' },
  { id: 'overall', label: 'Salopette' },
];

/* CAPPELLI PREMIUM: rari, sbloccabili a parte in Sartoria pagando tanto.
   Provabili GRATIS in anteprima; si sbloccano solo alla Conferma (scala i 🪙). */
export const PREMIUM_HATS = [
  { id: 'vikingo', cost: 220 },
  { id: 'cowboy', cost: 180 },
  { id: 'sombrero', cost: 160 },
  { id: 'partyhat', cost: 130 },
  { id: 'santa', cost: 260 },
];
export const PREMIUM_HAT_COST = Object.fromEntries(PREMIUM_HATS.map(h => [h.id, h.cost]));

/* COSMETICI TEMATICI: ogni zona ha un taglio (barbiere) e un cappello (sarto)
   scopribili solo visitando il negozio IN quella zona; una volta sbloccati
   restano scegliibili ovunque. Costo di scoperta = SERVICE_COST × 3. */
export const ZONE_COSMETICS = {
  prati: { hair: 'meadow', hat: 'flowercrown' },
  dune: { hair: 'dunespike', hat: 'bandana' },
  boschi: { hair: 'afro', hat: 'hood' },
  /* Le Terre Rosse NON hanno un cappello esclusivo: l'elmetto da minatore è stato tolto dal
     gioco (vedi REMOVED_HATS in state.js, che lo ripulisce anche dai salvataggi vecchi).
     Il `null` è scritto APPOSTA: una chiave che manca è un buco che nessuno nota, una chiave
     a null è una decisione che si legge. Il test pretende la chiave, non il valore. */
  terre: { hair: 'ember', hat: null },
  palude: { hair: 'algae', hat: 'snorkel' },
  ghiacci: { hair: 'frost', hat: 'ushanka' },
};
/* Gli elenchi piatti si DERIVANO, non si riscrivono: erano due liste a mano accanto alla
   tabella che le contiene già, e la seconda aveva 5 voci per 6 zone. Nessuno se n'era
   accorto perché niente le confrontava. */
export const THEMED_HAIR = ZONE_LIST.map(z => ZONE_COSMETICS[z.id].hair).filter(Boolean);
export const THEMED_HAT = ZONE_LIST.map(z => ZONE_COSMETICS[z.id].hat).filter(Boolean);

/* Nomi propri per il personaggio (l'editor ne pesca uno a caso, modificabile). */
export const NAMES = [
  'Digsy', 'Nell', 'Pip', 'Milo', 'Ada', 'Ondi', 'Tobi', 'Suki', 'Remy', 'Juno',
  'Bea', 'Cato', 'Wren', 'Enzo', 'Lila', 'Otto', 'Fenn', 'Maya', 'Ciro', 'Vera',
  'Bruno', 'Ivo', 'Nina', 'Gigi', 'Teo', 'Zoe', 'Lupo', 'Mimi', 'Nico', 'Elsi',
];
export function randomName() { return NAMES[Math.floor(Math.random() * NAMES.length)]; }

export const DEFAULT_LOOK = {
  hat: '#d06b43', shirt: '#57a58f', pants: '#c88a44', skin: '#f3cfa0',
  hairStyle: 'short', hairColor: '#6e4a2a', hatStyle: 'explorer', eyeColor: '#33291f',
  shirtStyle: 'tshirt', pantsStyle: 'long',
};
