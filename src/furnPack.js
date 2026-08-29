/* Decodifica del pacchetto arredo importato (vedi furnPackData.js): base64 → voxel veri.
   Un pezzo per categoria si sceglie in modo DETERMINISTICO dall'id del mobile del gioco
   (hash della stringa), così lo stesso oggetto in negozio mostra sempre lo stesso modello. */
import { FURN_PACK } from './furnPackData.js';

const cache = new Map();
export function packVoxels(id) {
  if (cache.has(id)) return cache.get(id);
  const e = FURN_PACK[id];
  let out = null;
  if (e) {
    const bin = typeof atob === 'function' ? atob(e.data) : Buffer.from(e.data, 'base64').toString('binary');
    out = [];
    for (let i = 0; i < bin.length; i += 4) {
      out.push({ x: bin.charCodeAt(i), y: bin.charCodeAt(i + 1), z: bin.charCodeAt(i + 2), col: e.pal[bin.charCodeAt(i + 3)] });
    }
  }
  cache.set(id, out);
  return out;
}

/* pool per categoria — solo pezzi a INGOMBRO CONTENUTO (una cella di stanza è una tile sola):
   i tavoli lunghi 2x1/3x1 e il tavolo grande 2x2 restano fuori, sarebbero enormi su una tile. */
export const PACK_POOL = {
  chair: ['chair_01', 'chair_02', 'chair_03', 'chair_04', 'chair_05', 'chair_06', 'chair_07', 'chair_08', 'chair_09', 'chair_10', 'chair_11', 'chair_12', 'chair_13', 'couch_01', 'couch_02', 'couch_03'],
  bed: ['bed_single_01', 'bed_single_02', 'bed_single_03', 'bed_single_04', 'bed_single_05', 'bed_single_06', 'bed_double_01', 'bed_double_02'],
  table: ['table_sidetable_small_01', 'table_sidetable_small_02', 'table_sidetable_small_03', 'table_sidetable_small_04', 'table_sidetable_small_05', 'table_coffee_type01_01', 'table_coffee_type01_02', 'table_coffee_type01_03', 'table_coffee_type02_01', 'table_coffee_type02_02', 'table_coffee_type02_03', 'table_sidetable_big_01', 'table_sidetable_big_02', 'table_sidetable_big_03', 'table_sidetable_big_04'],
  plant: ['misc_plant_01', 'misc_plant_02', 'misc_plant_03', 'misc_plant_04', 'misc_plant_05', 'misc_plant_06'],
  shelf: ['misc_shelf_01', 'misc_shelf_02'],
  closet: ['misc_closet_01', 'misc_closet_02'],
  clock: ['misc_clock_01', 'misc_clock_02'],
};

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
export function packVoxelsForCategory(cat, seedStr) {
  const pool = PACK_POOL[cat]; if (!pool) return null;
  return packVoxels(pool[hashStr(seedStr) % pool.length]);
}
