/* Stato di gioco (salvato in localStorage) + player/camera runtime */
import { setSeed } from './noise.js';
import { DEFAULT_LOOK } from './data.js';

export const SK = 'ossa_world_pixel_v1';

export let S = null;
export let dugSet = new Set();

export const P = { x: 0, y: 0, dir: 'down', moving: false, anim: 0, speed: 46, digging: null };
export const cam = { x: 0, y: 0 };

export function fresh() {
  return {
    seed: (Math.random() * 1e9) | 0, coins: 0, energy: 30, maxEnergy: 30, day: 1,
    raw: [], items: [], codex: [], donated: [], dug: [], creatures: [],
    uid: 1, px: 0, py: 0, started: false, lastTown: null, tod: 0.25, book: {}, sites: {}, awakened: [], museum: {},
    look: { ...DEFAULT_LOOK }, lookDone: false,
  };
}
export function save() {
  try { S.px = P.x; S.py = P.y; S.started = true; localStorage.setItem(SK, JSON.stringify(S)); } catch (e) { /* quota/priv */ }
}
export function load() {
  try { const r = localStorage.getItem(SK); if (r) return JSON.parse(r); } catch (e) { /* corrotto */ }
  return null;
}

/* ---------- slot di salvataggio manuali (il boot legge sempre SK) ---------- */
export const SLOTS = 3;
function slotKey(n) { return SK + '_slot' + n; }
export function slotInfo(n) {
  try { const r = localStorage.getItem(slotKey(n)); if (!r) return null; return JSON.parse(r); } catch (e) { return null; }
}
export function saveToSlot(n) {
  save();
  try { localStorage.setItem(slotKey(n), JSON.stringify({ ...S, savedAt: Date.now() })); return true; } catch (e) { return false; }
}
/* copia lo slot nella chiave principale: al reload il boot riparte da lì */
export function loadFromSlot(n) {
  try { const r = localStorage.getItem(slotKey(n)); if (!r) return false; localStorage.setItem(SK, r); return true; } catch (e) { return false; }
}
export function newGame() { try { localStorage.removeItem(SK); } catch (e) { /* ok */ } }

/* Carica (o crea) lo stato, applica default per i save vecchi. Ritorna true se caricato. */
export function initState() {
  const loaded = load(); S = loaded || fresh();
  if (!S.raw) S.raw = []; if (!S.items) S.items = []; if (!S.codex) S.codex = [];
  if (!S.donated) S.donated = []; if (!S.dug) S.dug = []; if (!S.creatures) S.creatures = [];
  if (!S.look) S.look = { ...DEFAULT_LOOK };
  if (S.look.hairStyle === undefined) { S.look.hairStyle = DEFAULT_LOOK.hairStyle; S.look.hairColor = DEFAULT_LOOK.hairColor; }
  /* migrazione: hatOn (bool) → hatStyle ('none' | forma) */
  if (S.look.hatStyle === undefined) S.look.hatStyle = S.look.hatOn === false ? 'none' : 'explorer';
  if (S.tod === undefined) S.tod = 0.25;
  if (!S.book) S.book = {};
  if (!S.sites) S.sites = {};
  if (!S.awakened) S.awakened = [];
  if (!S.museum) S.museum = {};
  setSeed(S.seed || 1);
  dugSet = new Set(S.dug);
  return !!loaded;
}
