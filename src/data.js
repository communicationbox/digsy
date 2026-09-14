import { FURN_CATALOG } from './furnCatalog.js';
/* Dati statici di gioco: specie, parti, rarità, biomi, costi, palette look */
export const TS = 32;

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
/* il drago di cristallo delle grotte (la cavalcatura) ha il suo colore scelto: indaco notte, non il lilla del giro dei colori */
spColor.abissodonte = '#4e64b4';

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
  { id: 'none', label: 'Rasato a zero' },
  { id: 'buzz', label: 'Rasati' },
  { id: 'short', label: 'Caschetto' },
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
   Provabili GRATIS in anteprima; si sbloccano solo alla Conferma (scala i 🪙).
   `lvl` = livello archeologo minimo perché il cappello compaia in Sartoria: prima di
   allora l'XP dava solo numeri invisibili (scavo più veloce, più rari) — questo dà un
   traguardo che si VEDE, in più al prezzo che già c'era (non lo sostituisce). */
export const PREMIUM_HATS = [
  { id: 'partyhat', cost: 130, lvl: 5 },
  { id: 'sombrero', cost: 160, lvl: 10 },
  { id: 'cowboy', cost: 180, lvl: 15 },
  { id: 'vikingo', cost: 220, lvl: 20 },
  { id: 'santa', cost: 260, lvl: 25 },
];
export const PREMIUM_HAT_COST = Object.fromEntries(PREMIUM_HATS.map(h => [h.id, h.cost]));

/* CASA DEL GIOCATORE — stanze: la 0 è quella di partenza (gratis, sempre sbloccata),
   le altre si comprano dietro una porta a lucchetto (house.js). Crescenti: la seconda
   stanza costa poco, l'ultima è un traguardo. */
export const ROOM_PRICES = [0, 150, 400, 900];

/* ARREDO DELLA CASA: 6 set, uno per zona (M3). Venduto SOLO nel Negozio di quella zona
   (`renderStore`), sbloccato per livello come `PREMIUM_HATS`. `slot` è un'etichetta libera
   (letto/tavolo/tappeto/decoro), non applica vincoli. `col` = colore del rettangolo
   segnaposto (vero mobile voxel/3D in M4). */
/* Un pezzo di arredo ha:
     `place` = DOVE vive. 'floor' mobile vero (blocca il passo) · 'rug' steso a terra (ci si
       cammina sopra) · 'wall' appeso alla parete di fondo · 'paper' carta da parati e
       'ground' pavimento (non si piazzano: si APPLICANO alla stanza, sono il fondo).
     `w`/`h` = quante caselle occupa. Erano tutti 1×1 e un letto risultava grande quanto una
       lampada: senza differenza di taglia la stanza non ha gerarchia e l'arredo sembra sparso.
   `col` è la tinta del pezzo (l'arte la disegna a mano in furnArt.js, non è un rettangolo). */
export const FURN_SETS = {
  prati: [
    { id: 'prati_paper', zone: 'prati', slot: 'parato', place: 'paper', lvl: 1, cost: 60, icon: '🌾', col: '#e6d9a6', col2: '#cbb87e' },
    { id: 'prati_ground', zone: 'prati', slot: 'pavimento', place: 'ground', lvl: 2, cost: 80, icon: '🌾', col: '#c9a25a', col2: '#b08c48' },
    { id: 'prati_rug', zone: 'prati', slot: 'tappeto', place: 'rug', w: 2, h: 2, lvl: 1, cost: 40, icon: '🌾', col: '#e8d27a' },
    { id: 'prati_bed', zone: 'prati', slot: 'letto', place: 'floor', w: 2, h: 2, lvl: 3, cost: 90, icon: '🛏️', col: '#f2a6b8' },
    { id: 'prati_table', zone: 'prati', slot: 'tavolo', place: 'floor', w: 2, h: 1, lvl: 6, cost: 150, icon: '🌾', col: '#c9a25a' },
    { id: 'prati_lamp', zone: 'prati', slot: 'decoro', place: 'floor', lvl: 10, cost: 240, icon: '✨', col: '#f6dc78' },
    { id: 'prati_art', zone: 'prati', slot: 'parete', place: 'wall', lvl: 8, cost: 120, icon: '🌾', col: '#e8c86a' },
  ],
  dune: [
    { id: 'dune_paper', zone: 'dune', slot: 'parato', place: 'paper', lvl: 1, cost: 60, icon: '🏜️', col: '#e3cfa4', col2: '#c7ab78' },
    { id: 'dune_ground', zone: 'dune', slot: 'pavimento', place: 'ground', lvl: 2, cost: 80, icon: '🏜️', col: '#d9c496', col2: '#c2a97a' },
    { id: 'dune_rug', zone: 'dune', slot: 'tappeto', place: 'rug', w: 2, h: 2, lvl: 1, cost: 40, icon: '🏜️', col: '#e0c184' },
    { id: 'dune_bed', zone: 'dune', slot: 'letto', place: 'floor', w: 2, h: 2, lvl: 3, cost: 90, icon: '🛏️', col: '#caa15f' },
    { id: 'dune_chest', zone: 'dune', slot: 'decoro', place: 'floor', lvl: 6, cost: 150, icon: '🦴', col: '#d8c9a0' },
    { id: 'dune_cactus', zone: 'dune', slot: 'decoro', place: 'rug', lvl: 10, cost: 240, icon: '🌲', col: '#5c8a52' },
    { id: 'dune_art', zone: 'dune', slot: 'parete', place: 'wall', lvl: 8, cost: 120, icon: '🦴', col: '#e6dcc0' },
  ],
  boschi: [
    { id: 'boschi_paper', zone: 'boschi', slot: 'parato', place: 'paper', lvl: 1, cost: 60, icon: '🌲', col: '#9fae92', col2: '#7d8c72' },
    { id: 'boschi_ground', zone: 'boschi', slot: 'pavimento', place: 'ground', lvl: 2, cost: 80, icon: '🌲', col: '#7a5a3c', col2: '#66492f' },
    { id: 'boschi_rug', zone: 'boschi', slot: 'tappeto', place: 'rug', w: 2, h: 2, lvl: 1, cost: 40, icon: '🌲', col: '#7a8f6e' },
    { id: 'boschi_bed', zone: 'boschi', slot: 'letto', place: 'floor', w: 2, h: 2, lvl: 3, cost: 90, icon: '🛏️', col: '#8a6a4a' },
    { id: 'boschi_chair', zone: 'boschi', slot: 'decoro', place: 'floor', lvl: 6, cost: 150, icon: '🌲', col: '#5c4a34' },
    { id: 'boschi_lamp', zone: 'boschi', slot: 'decoro', place: 'floor', lvl: 10, cost: 240, icon: '🍄', col: '#c95a5a' },
    { id: 'boschi_art', zone: 'boschi', slot: 'parete', place: 'wall', lvl: 8, cost: 120, icon: '🍄', col: '#b8724a' },
  ],
  terre: [
    { id: 'terre_paper', zone: 'terre', slot: 'parato', place: 'paper', lvl: 1, cost: 60, icon: '⛰️', col: '#c98a6a', col2: '#a96b4e' },
    { id: 'terre_ground', zone: 'terre', slot: 'pavimento', place: 'ground', lvl: 2, cost: 80, icon: '⛰️', col: '#a9603f', col2: '#8e4c30' },
    { id: 'terre_rug', zone: 'terre', slot: 'tappeto', place: 'rug', w: 2, h: 2, lvl: 1, cost: 40, icon: '⛰️', col: '#c86a4a' },
    { id: 'terre_bed', zone: 'terre', slot: 'letto', place: 'floor', w: 2, h: 2, lvl: 3, cost: 90, icon: '🛏️', col: '#a9502f' },
    { id: 'terre_throne', zone: 'terre', slot: 'decoro', place: 'floor', lvl: 6, cost: 150, icon: '⛰️', col: '#8a4028' },
    { id: 'terre_crystal', zone: 'terre', slot: 'decoro', place: 'floor', lvl: 10, cost: 240, icon: '💎', col: '#e0846a' },
    { id: 'terre_art', zone: 'terre', slot: 'parete', place: 'wall', lvl: 8, cost: 120, icon: '💎', col: '#d9704f' },
  ],
  palude: [
    { id: 'palude_paper', zone: 'palude', slot: 'parato', place: 'paper', lvl: 1, cost: 60, icon: '🐸', col: '#7fa07a', col2: '#5f7f5c' },
    { id: 'palude_ground', zone: 'palude', slot: 'pavimento', place: 'ground', lvl: 2, cost: 80, icon: '🐸', col: '#6b7a52', col2: '#576643' },
    { id: 'palude_rug', zone: 'palude', slot: 'tappeto', place: 'rug', w: 2, h: 2, lvl: 1, cost: 40, icon: '🐸', col: '#5f8a5a' },
    { id: 'palude_bed', zone: 'palude', slot: 'letto', place: 'floor', w: 2, h: 2, lvl: 3, cost: 90, icon: '🛏️', col: '#3f6a52' },
    { id: 'palude_vase', zone: 'palude', slot: 'decoro', place: 'rug', lvl: 6, cost: 150, icon: '🌸', col: '#8ec488' },
    { id: 'palude_lamp', zone: 'palude', slot: 'decoro', place: 'floor', lvl: 10, cost: 240, icon: '✨', col: '#a6e0a0' },
    { id: 'palude_art', zone: 'palude', slot: 'parete', place: 'wall', lvl: 8, cost: 120, icon: '🌸', col: '#8ec488' },
  ],
  ghiacci: [
    { id: 'ghiacci_paper', zone: 'ghiacci', slot: 'parato', place: 'paper', lvl: 1, cost: 60, icon: '🧊', col: '#cfe4ef', col2: '#adc8d8' },
    { id: 'ghiacci_ground', zone: 'ghiacci', slot: 'pavimento', place: 'ground', lvl: 2, cost: 80, icon: '🧊', col: '#b6cfdd', col2: '#9fbccb' },
    { id: 'ghiacci_rug', zone: 'ghiacci', slot: 'tappeto', place: 'rug', w: 2, h: 2, lvl: 1, cost: 40, icon: '🧊', col: '#dff0f7' },
    { id: 'ghiacci_bed', zone: 'ghiacci', slot: 'letto', place: 'floor', w: 2, h: 2, lvl: 3, cost: 90, icon: '🛏️', col: '#bcdcec' },
    { id: 'ghiacci_hearth', zone: 'ghiacci', slot: 'decoro', place: 'floor', w: 2, h: 1, lvl: 6, cost: 150, icon: '🔥', col: '#8fb8d0' },
    { id: 'ghiacci_lamp', zone: 'ghiacci', slot: 'decoro', place: 'floor', lvl: 10, cost: 240, icon: '✨', col: '#c8e6f2' },
    { id: 'ghiacci_art', zone: 'ghiacci', slot: 'parete', place: 'wall', lvl: 8, cost: 120, icon: '🧊', col: '#a9d4e6' },
  ],
};
export const FURN_BY_ID = Object.fromEntries(Object.values(FURN_SETS).flat().map(f => [f.id, f]));
/* il CATALOGO per temi (furnCatalog.js): stessi campi dei set di zona, più `theme` e la ricetta
   del disegno. Entra nello stesso indice, così piazzamento, vassoio, comodità e salvataggio
   non devono sapere da dove arriva un pezzo. */
for (const f of FURN_CATALOG) FURN_BY_ID[f.id] = { zone: 'any', slot: f.place === 'wall' ? 'parete' : f.place === 'rug' ? 'tappeto' : 'decoro', icon: '🎨', col: f.m || '#c8b078', ...f };
/* PIEDISTALLO (M4): pezzo speciale, non venduto (regalato una volta sola in state.js), che
   in casa non arreda e basta ma espone uno scheletro consegnato al Museo (house.js gestisce
   l'assegnazione). `slot:'pedestal'` lo distingue dagli arredi normali nel tray/interazione. */
export const PEDESTAL_ID = 'pedestal';
export const PEDESTAL_ITEM = { id: PEDESTAL_ID, zone: 'any', slot: 'pedestal', place: 'pedestal', lvl: 1, cost: 0, icon: '🏛️', col: '#c9a227' };
FURN_BY_ID[PEDESTAL_ID] = PEDESTAL_ITEM;

/* DOVE vive un pezzo e QUANTO occupa — una funzione sola, così chi disegna, chi piazza e chi
   calcola le collisioni non possono più divergere (è già successo con la scala dei mobili).
   `rot` dispari gira il pezzo di un quarto: un letto 2×1 messo lungo la parete è 1×2. */
export function furnPlace(id) { const it = FURN_BY_ID[id]; return (it && it.place) || 'floor'; }
export function furnSize(id, rot) {
  const it = FURN_BY_ID[id] || {};
  const w = it.w || 1, h = it.h || 1;
  return (((rot | 0) % 2) + 2) % 2 ? { w: h, h: w } : { w, h };
}
/* SOLIDO = blocca il passo. Tappeti, piante piccole e quadri no: un oggetto più piccolo di una
   casella che però la occupa tutta si segnalava da solo ("non ci cammino attorno"). */
export function furnIsSolid(id) { const p = furnPlace(id); return p === 'floor' || p === 'pedestal'; }
/* FONDO della stanza (carta da parati / pavimento): non si piazza su una casella, si applica
   alla stanza intera. È la leva che cambia una stanza più di qualsiasi mobile. */
export function furnIsBackdrop(id) { const p = furnPlace(id); return p === 'paper' || p === 'ground'; }

/* POLTRONA DI PARTENZA (M6, tutorial): regalata una volta sola in state.js, come il
   piedistallo — serve al passo `armchair` (piazzarla in Sala insegna il piazzamento
   dell'arredo PRIMA ancora dello scavo). Riuso `boschi_chair` (già "Poltrona di
   corteccia"/"Bark armchair" in i18n.js): è già la sedia generica del set, niente da
   inventare — regalarla ignora il suo `lvl` normale (il dono bypassa `buyFurniture`). */
export const STARTER_FURN_ID = 'boschi_chair';
export const STARTER_PLANT_ID = 'giardino_monstera';

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
