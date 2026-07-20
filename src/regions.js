/* Zone stile Minecraft: 6 tipi, ripetibili, dimensioni variabili (noise a bassa frequenza).
   Cache per blocchi 4×4 tile. I confini sono DOMAIN-WARPED (serpeggiano, niente righello)
   con un filo di dithering: ai bordi le zone si mescolano a chiazze.
   COERENZA CLIMATICA: il primo noise è la "temperatura" divisa in 3 fasce
   (freddo → temperato → caldo), il secondo sceglie la zona dentro la fascia.
   Così Lande Gelide e Terre Rosse non possono mai toccarsi: nel mezzo c'è sempre
   una fascia temperata. */
import { fbm, vhash } from './noise.js';
import { ZONES } from './data.js';

/* [secco, umido] per fascia: 0 freddo → 1 temperato → 2 caldo */
export const BAND = [
  [5, 2], // Lande Gelide · Boschi Cinerei
  [0, 4], // Prati Dorati · Palude Antica
  [3, 1], // Terre Rosse  · Dune Ossee
];

const zcache = new Map();
export function zoneIdxAt(tx, ty) {
  const bx = tx >> 2, by = ty >> 2;
  const key = bx + ',' + by;
  let i = zcache.get(key);
  if (i !== undefined) return i;
  const cx = bx * 4 + 2, cy = by * 4 + 2; // centro blocco
  /* domain warp: campioniamo il clima in un punto SPOSTATO da un altro noise →
     i confini ondeggiano in modo organico invece di seguire le bande */
  const wx = (fbm(cx * 0.02 + 7, cy * 0.02 + 13, 63) - 0.5) * 70;
  const wy = (fbm(cx * 0.02 + 51, cy * 0.02 + 77, 64) - 0.5) * 70;
  /* dithering leggero per blocco: vicino ai confini qualche chiazza scavalla */
  const a = fbm((cx + wx) * 0.0045, (cy + wy) * 0.0045, 61) + (vhash(bx, by, 65) - 0.5) * 0.02;
  const b = fbm((cx + wx) * 0.0045 + 37, (cy + wy) * 0.0045 + 91, 62) + (vhash(bx, by, 66) - 0.5) * 0.02;
  const band = Math.max(0, Math.min(2, Math.floor((a - 0.2) / 0.6 * 3)));
  i = BAND[band][b > 0.5 ? 1 : 0];
  zcache.set(key, i);
  return i;
}
export function zoneAt(tx, ty) { return ZONES[zoneIdxAt(tx, ty)]; }
