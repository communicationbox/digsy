/* Icone 8-bit: set PIXELARTICONS (MIT, npm) + 6 custom nello stesso stile (griglia 24,
   currentColor → si colorano col testo). withIcons(html) sostituisce OGNI emoji nota. */

/* eslint-disable */
/* Vite sostituisce la CHIAMATA a compile-time; in Node (test) lancia → catch → registro vuoto */
let files = {};
try { files = import.meta.glob('./pxicons/*.svg', { query: '?raw', import: 'default', eager: true }); } catch (e) { files = {}; }
const SVGS = {};
for (const [p, raw] of Object.entries(files)) SVGS[p.split('/').pop().replace('.svg', '')] = raw;

export const ICON_NAMES = ["arD", "arDL", "arDR", "arL", "arR", "arU", "arUL", "arUR", "axe", "bag", "barber", "bed", "bike", "bolt", "bone", "book", "bread", "bug", "cal", "cave", "chartdown", "chartup", "check", "close", "coin", "compass", "cloud", "dice", "discord", "dna", "door", "dune", "egg", "fire", "fish", "flower", "gear", "gem", "star", "bulb", "gift", "target", "warn", "mail", "tree", "village", "human", "info", "frog", "globe", "hat", "home", "horn", "ice", "lab", "leaf", "lock", "map", "menu", "moon", "mount", "museum", "note", "palette", "paw", "pick", "pine", "rib", "save", "scroll", "shell", "shirt", "ship", "shovel", "skate", "skull", "snow", "sofa", "sparkle", "spiral", "sprout", "stats", "store", "sun", "torch", "trash", "wheat"];


/* colore tematico per icona (fill=currentColor eredita da style) */
const ICOL = {
  /* bag: era #8a5f38, cuoio scuro — sul fondo scuro dell'HUD dava 2,1:1, sotto la soglia
     di leggibilità. Cuoio CHIARO: si legge sul chip e resta in tinta col resto. */
  coin: '#e8b93c', bolt: '#f2c53d', cal: '#c65a54', compass: '#c65a54', bag: '#c9a06a', bug: '#c65a54',
  moon: '#e8e2d0', flower: '#e08aa8', sun: '#e8b93c', leaf: '#c98a2e', snow: '#8fd0e6',
  wheat: '#d4b13c', dune: '#c9a06a', pine: '#3f8a4c', mount: '#c65a54', frog: '#5a86c8', ice: '#8fd0e6',
  store: '#d8973c', lab: '#8d7ba0', museum: '#9a9285', bed: '#c65a54', barber: '#c65a54', shirt: '#e08aa8', home: '#c98a5a', sofa: '#c98a5a',
  skull: '#b89b62', rib: '#b89b62', bone: '#b89b62', spiral: '#b89b62', horn: '#b89b62', paw: '#c9a06a',
  sparkle: '#e8b93c', dna: '#8d7ba0', palette: '#d8973c', hat: '#d8973c', book: '#8a5f38', map: '#5a86c8',
  pick: '#8f887a', menu: '#e6dcc4', sprout: '#5fa04e', save: '#5a86c8', note: '#8d7ba0', globe: '#4e8d7c', bread: '#c98a5a',
  axe: '#b5622e', shovel: '#c9a06a', ship: '#5a86c8', fish: '#4e8d7c', check: '#5fa04e',
  skate: '#d8973c', bike: '#5a86c8', torch: '#f2c53d', scroll: '#c9a06a', shell: '#e0a86a', dice: '#d8973c', info: '#8fd0e6', discord: '#8d9bf0', cloud: '#8fd0e6',
  lock: '#8a6a1e', chartup: '#5fa04e', chartdown: '#c65a54', fire: '#e0722e', egg: '#e8dcc0',
  /* close: NIENTE colore fisso → eredita currentColor del bottone (chiaro o scuro) */
  arU: '#e8b93c', arUR: '#e8b93c', arR: '#e8b93c', arDR: '#e8b93c', arD: '#e8b93c', arDL: '#e8b93c', arL: '#e8b93c', arUL: '#e8b93c',
};

/* i TRACCIATI di un'icona (griglia 24), per disegnarla su una canvas con Path2D: la mappa usa
   gli stessi simboli del resto del gioco invece di quadratini colorati. I <rect> diventano
   percorsi. In Node il registro è vuoto e si torna un elenco vuoto. */
export function iconPaths(name) {
  const raw = SVGS[name]; if (!raw) return [];
  const out = [];
  raw.replace(/<path[^>]*\sd="([^"]+)"/g, (m, d) => { out.push(d); return m; });
  raw.replace(/<rect[^>]*>/g, (m) => {
    const a = k => +((m.match(new RegExp('\\s' + k + '="([^"]+)"')) || [])[1] || 0);
    out.push('M' + a('x') + ' ' + a('y') + 'h' + a('width') + 'v' + a('height') + 'h' + (-a('width')) + 'z');
    return m;
  });
  return out;
}
export function icon(name, cls) {
  const raw = SVGS[name];
  if (!raw) return '';
  return raw.replace('<svg ', `<svg class="pxi${cls ? ' ' + cls : ''}" style="color:${ICOL[name] || 'currentColor'}" `);
}

/* mappa emoji → icona: withIcons() ripulisce OGNI stringa mostrata */
const EMAP = {
  '🪙': 'coin', '⚡': 'bolt', '📅': 'cal', '🧭': 'compass', '🎒': 'bag', '🐞': 'bug', '🌙': 'moon', '😴': 'moon',
  '🌸': 'flower', '☀️': 'sun', '🍂': 'leaf', '❄️': 'snow',
  '🌾': 'wheat', '🏜️': 'dune', '🌲': 'pine', '⛰️': 'mount', '🐸': 'frog', '🧊': 'ice',
  '🏪': 'store', '🔬': 'lab', '🏛️': 'museum', '🛏️': 'bed', '💈': 'barber', '👕': 'shirt', '🏠': 'home', '🛋️': 'sofa',
  '💀': 'skull', '🫁': 'rib', '🦴': 'bone', '🌀': 'spiral', '🪶': 'horn', '🐾': 'paw',
  '💫': 'sparkle', '✨': 'sparkle', '🎨': 'palette', '🤠': 'hat', '📖': 'book', '🗺️': 'map', '🧬': 'dna', '🎲': 'dice', 'ℹ️': 'info', 'ℹ': 'info',
  '⛏️': 'pick', '🌱': 'sprout', '💾': 'save', '🎵': 'note', '🌍': 'globe', '🍞': 'bread', '🌐': 'globe',
  '🪓': 'axe', '🪏': 'shovel', '⛵': 'ship', '🚤': 'ship', '🎣': 'fish', '🌊': 'fish', '🕳️': 'cave', '🕳': 'cave',
  '🛼': 'skate', '🚲': 'bike', '🔦': 'torch', '📜': 'scroll', '🐚': 'shell', '🧰': 'pick',
  '🗑️': 'trash', '🗑': 'trash', '⚙️': 'gear', '⚙': 'gear', '🚪': 'door', '💬': 'discord', '☁️': 'cloud', '☁': 'cloud',
  /* icone aggiunte quando il test ha trovato le emoji che restavano mute */
  '💎': 'gem', '⭐': 'star', '💡': 'bulb', '🎁': 'gift', '🎯': 'target', '⚠️': 'warn', '⚠': 'warn',
  '✉️': 'mail', '✉': 'mail', '📮': 'mail', '📭': 'mail', '📨': 'mail', '📇': 'human', '📦': 'bag', '🌳': 'tree', '🏘️': 'village', '🏘': 'village', '🚶': 'human', '🏃': 'human',
  '❔': 'info', '❓': 'info', '⚗️': 'lab', '⚗': 'lab', '🕊️': 'sparkle', '🕊': 'sparkle',
  '⛲': 'fish', '💨': 'ice', '🫧': 'fish', '🍄': 'flower', '🌌': 'moon', '🚢': 'ship',
  '📋': 'scroll', '📌': 'scroll', '✅': 'check', '🚫': 'close', '🏆': 'sparkle', '🎓': 'sprout', '🌦️': 'ice', '🌧️': 'ice', '🗿': 'mount', '📝': 'book', '📊': 'stats',
  '↑': 'arU', '↗': 'arUR', '→': 'arR', '↘': 'arDR', '↓': 'arD', '↙': 'arDL', '←': 'arL', '↖': 'arUL',
  '☰': 'menu', '▲': 'arU', '▼': 'arD', '◀': 'arL', '▶': 'arR',
  '✕': 'close', '✗': 'close', '✓': 'check', '☑': 'check',
  '🔒': 'lock', '🔓': 'lock', '📈': 'chartup', '📉': 'chartdown', '🔥': 'fire', '🥚': 'egg', '🎬': 'sparkle',
};
export { EMAP };
const EKEYS = Object.keys(EMAP).sort((a, b) => b.length - a.length);
const STRIP = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]\u{FE0F}?/gu; // emoji sconosciute: via
export function withIcons(str) {
  let s = String(str);
  for (const k of EKEYS) if (s.includes(k)) s = s.split(k).join(icon(EMAP[k]));
  return s.replace(STRIP, '');
}
/* idrata i nodi statici (HUD, d-pad, debugtag) al boot */
export function hydrateIcons() {
  document.querySelectorAll('#hud .tag, .db, #abtn, .st .x, #bk-close').forEach(el => { el.innerHTML = withIcons(el.innerHTML); });
}
