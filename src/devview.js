/* Vista di DEBUG — SOLO SVILUPPO. Forza una scena per poterla FOTOGRAFARE e correggere a occhio
   invece che a naso (le animazioni del mondo non hanno una vista `npm run shot`).
     ?mount=down|up|left|right       → cavalcatura volante attiva
     ?dig=terra|acqua|albero|roccia  → raccoglitore leggendario congelato AL LAVORO, nel posto
                                        GIUSTO (erba/acqua/albero/roccia veri) e camera centrata
   main.js lo importa SOLO sotto import.meta.env.DEV: in produzione il ramo è morto e questo
   modulo non finisce mai nel bundle. Escluso dai test/coverage (è uno strumento, non gioco). */
import { S, P, cam } from './state.js';
import { setPref } from './prefs.js';
import { setCompanion, COMP } from './companion.js';
import { CAVE_POOL, ALL_SPECIES, TS } from './data.js';
import { diggable, baseTerrain, townInfo, decoAt, CHOPPABLE, MINEABLE, WATER, DEEP } from './world.js';

function awakenPick(sp) {
  if (!S.awakened.includes(sp.id)) S.awakened.push(sp.id);
  setCompanion({ skull: sp.id, torso: sp.id, leg: sp.id, q: 'leggendario', key: 'sp' + sp.id, name: sp.name });
}
function findTile(pred) {
  const gx = Math.floor(P.x / TS), gy = Math.floor(P.y / TS);
  for (let r = 1; r < 80; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const tx = gx + dx, ty = gy + dy; if (pred(tx, ty)) return [tx, ty];
  }
  return null;
}
export function setupDebugView(params) {
  const mp = params.get('mount'), dg = params.get('dig');
  if (!mp && !dg) return;
  S.lookDone = true; S.introSeen = true; S.started = true; S.gift = true; setPref('tips', false);
  try { const h = document.getElementById('hud'), pr = document.getElementById('prompt'); if (h) h.style.display = 'none'; if (pr) pr.style.display = 'none'; } catch (e) { /* headless */ }
  if (mp) {
    awakenPick(CAVE_POOL.find(s => s.r === 'leggendario') || CAVE_POOL[0]);  // Abissodonte (legg. grotta)
    S.mounted = true; P.dir = ['up', 'down', 'left', 'right'].includes(mp) ? mp : 'down';
    return;
  }
  const type = ['terra', 'acqua', 'albero', 'roccia'].includes(dg) ? dg : 'terra';
  awakenPick(ALL_SPECIES.find(s => (s.src || 'terra') === type) || ALL_SPECIES[0]);
  /* cerca il BERSAGLIO giusto per il tipo, poi mette il compagno adiacente rivolto ad esso */
  let target, compTile;
  if (type === 'albero' || type === 'roccia') {
    const kinds = type === 'albero' ? CHOPPABLE : MINEABLE;
    target = findTile((x, y) => kinds.includes(decoAt(x, y)) && !townInfo(x, y));
    if (target) compTile = [target[0] - 1, target[1]];       // a sinistra del bersaglio, guarda a destra
  } else if (type === 'acqua') {
    target = findTile((x, y) => (baseTerrain(x, y) === WATER || baseTerrain(x, y) === DEEP) && !townInfo(x, y));
    compTile = target;
  } else {
    target = findTile((x, y) => diggable(baseTerrain(x, y)) && !townInfo(x, y) && !decoAt(x, y));
    compTile = target;
  }
  if (!compTile) compTile = [Math.floor(P.x / TS), Math.floor(P.y / TS)];
  COMP.x = compTile[0] * TS + 8; COMP.y = compTile[1] * TS + 8;
  /* la camera segue il PLAYER: lo metto 2 caselle a SINISTRA della scena, così compagno+bersaglio
     restano inquadrati a destra */
  P.x = (compTile[0] - 2) * TS + 8; P.y = compTile[1] * TS + 8; P.dir = 'right';
  cam.x = P.x; cam.y = P.y;
  COMP.init = true; COMP.face = 'right';
  const wx = target ? target[0] * TS + 8 : COMP.x + 16, wy = target ? target[1] * TS + 8 : COMP.y;
  COMP.job = { type, phase: 'work', t: 999, wx, wy, hit: -1 };  // congelato in 'work'
}
