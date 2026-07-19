/* MAPPA DEL MONDO che si scopre camminando.
   Il mondo è infinito: si tiene traccia dei BLOCCHI 8×8 tile già visti (`S.explored`), e la
   mappa disegna solo quelli. Le meraviglie rivelano interi cerchi di mappa (Menhir, Guglia). */
import { S, P, save } from './state.js';
import { FOOT_DY } from './body.js';
import { TS } from './data.js';

export const CH = 8;                       // lato del blocco di esplorazione, in tile
export function chunkKey(cx, cy) { return cx + ',' + cy; }
export function isExplored(tx, ty) {
  return !!(S.explored || {})[chunkKey(Math.floor(tx / CH), Math.floor(ty / CH))];
}
/* segna il blocco sotto i piedi e i suoi vicini (quello che vedi davvero dallo schermo) */
export function markExplored(tx, ty, r = 1) {
  if (!S.explored) S.explored = {};
  const cx = Math.floor(tx / CH), cy = Math.floor(ty / CH);
  let added = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const k = chunkKey(cx + dx, cy + dy);
    if (!S.explored[k]) { S.explored[k] = 1; added++; }
  }
  return added;
}
/* rivelazione in un raggio (in tile): il dono di Menhir e Guglia di Ghiaccio */
export function revealArea(tx, ty, radiusTiles) {
  if (!S.explored) S.explored = {};
  const cx = Math.floor(tx / CH), cy = Math.floor(ty / CH), r = Math.ceil(radiusTiles / CH);
  let added = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue;               // cerchio, non quadrato
    const k = chunkKey(cx + dx, cy + dy);
    if (!S.explored[k]) { S.explored[k] = 1; added++; }
  }
  save(); return added;
}
export function exploredCount() { return Object.keys(S.explored || {}).length; }
/* quanto mondo hai visto, in tile quadre (per la voce "esplorato" della mappa) */
export function exploredTiles() { return exploredCount() * CH * CH; }
/* il player, chiamato dal game loop */
export function trackPlayer() {
  return markExplored(Math.floor(P.x / TS), Math.floor((P.y + FOOT_DY) / TS), 1);
}

/* la compressione della mappa vive in packmap.js (nessuna dipendenza: la usa anche state.js) */
export { packExplored, unpackExplored } from './packmap.js';
