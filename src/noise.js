/* Value-noise deterministico (seed globale del mondo) */
export let SEED = 1;
export function setSeed(v) { SEED = v; }

export function vhash(ix, iy, salt) {
  let h = Math.imul(ix | 0, 1836311903) ^ Math.imul(iy | 0, 2971215073) ^ Math.imul(SEED, 127) ^ ((salt || 0) * 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function smooth(x, y, salt) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const a = vhash(x0, y0, salt), b = vhash(x0 + 1, y0, salt), c = vhash(x0, y0 + 1, salt), d = vhash(x0 + 1, y0 + 1, salt);
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
export function fbm(x, y, salt) {
  return 0.6 * smooth(x, y, salt) + 0.3 * smooth(x * 2 + 5.2, y * 2 + 1.3, salt) + 0.1 * smooth(x * 4 + 9.7, y * 4 + 7.1, salt);
}
