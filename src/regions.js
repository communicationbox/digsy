/* Zone stile Minecraft: 6 tipi, ripetibili, dimensioni variabili (noise a bassa frequenza).
   Cache per blocchi 8×8 tile: confini "chunky" leggibili e lookup economico. */
import { fbm } from './noise.js';
import { ZONES } from './data.js';

const zcache = new Map();
export function zoneIdxAt(tx, ty) {
  const bx = tx >> 3, by = ty >> 3;
  const key = bx + ',' + by;
  let i = zcache.get(key);
  if (i !== undefined) return i;
  const cx = bx * 8 + 4, cy = by * 8 + 4; // centro blocco
  const a = fbm(cx * 0.0045, cy * 0.0045, 61);
  const b = fbm(cx * 0.0045 + 37, cy * 0.0045 + 91, 62);
  const band = Math.max(0, Math.min(2, Math.floor((a - 0.2) / 0.6 * 3)));
  i = band * 2 + (b > 0.5 ? 1 : 0);
  zcache.set(key, i);
  return i;
}
export function zoneAt(tx, ty) { return ZONES[zoneIdxAt(tx, ty)]; }
