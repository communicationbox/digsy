/* Dati statici di gioco: specie, parti, rarità, biomi, costi, palette look */
export const TS = 16;

/* ---------- zone del mondo (tipo biomi Minecraft: ripetibili, ampiezze variabili) ---------- */
export const ZONES = [
  { id: 'prati', name: 'Prati Dorati', icon: '🌾', tint: 'rgba(246,220,120,0.08)' },
  { id: 'dune', name: 'Dune Ossee', icon: '🏜️', tint: 'rgba(240,200,120,0.13)' },
  { id: 'boschi', name: 'Boschi Cinerei', icon: '🌲', tint: 'rgba(110,130,145,0.12)' },
  { id: 'terre', name: 'Terre Rosse', icon: '⛰️', tint: 'rgba(220,110,70,0.12)' },
  { id: 'palude', name: 'Palude Antica', icon: '🐸', tint: 'rgba(80,135,85,0.14)' },
  { id: 'ghiacci', name: 'Lande Gelide', icon: '🧊', tint: 'rgba(180,210,235,0.16)' },
];

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

/* colore pelliccia/pelle per le chimere rianimate: generato per specie (hue a passo aureo) */
function hsl2hex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + ((1 << 24) | (f(0) << 16) | (f(8) << 8) | f(4)).toString(16).slice(1);
}
export const spColor = Object.fromEntries(SPECIES.map((s, i) => [s.id, hsl2hex((i * 137.5) % 360, 42, 64)]));

export const CHIMERA_COST = 40;   // rianimare una chimera al Laboratorio
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

export const HAT_STYLES = [
  { id: 'explorer', label: 'Esploratore' },
  { id: 'cap', label: 'Berretto' },
  { id: 'beanie', label: 'Cuffia' },
];

export const DEFAULT_LOOK = {
  hat: '#d06b43', shirt: '#57a58f', pants: '#c88a44', skin: '#f3cfa0',
  hairStyle: 'short', hairColor: '#6e4a2a', hatStyle: 'explorer',
};
