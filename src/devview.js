/* Vista di DEBUG — SOLO SVILUPPO. Forza una scena per poterla FOTOGRAFARE e correggere a occhio
   invece che a naso (le animazioni del mondo non hanno una vista `npm run shot`).
     ?mount=down|up|left|right       → cavalcatura volante attiva
     ?dig=terra|acqua|albero|roccia  → raccoglitore leggendario congelato AL LAVORO, su erba
   main.js lo importa SOLO sotto import.meta.env.DEV: in produzione il ramo è morto e questo
   modulo non finisce mai nel bundle. Escluso dai test/coverage (è uno strumento, non gioco). */
import { S, P, cam } from './state.js';
import { setPref } from './prefs.js';
import { setCompanion, COMP } from './companion.js';
import { CAVE_POOL, ALL_SPECIES, TS } from './data.js';
import { diggable, baseTerrain, townInfo, decoAt } from './world.js';

function awakenPick(sp) {
  if (!S.awakened.includes(sp.id)) S.awakened.push(sp.id);
  setCompanion({ skull: sp.id, torso: sp.id, leg: sp.id, q: 'leggendario', key: 'sp' + sp.id, name: sp.name });
}
export function setupDebugView(params) {
  const mp = params.get('mount'), dg = params.get('dig');
  if (!mp && !dg) return;
  S.lookDone = true; S.introSeen = true; S.started = true; S.gift = true; setPref('tips', false); // salta editor/intro/regalo/tip
  try { const h = document.getElementById('hud'), pr = document.getElementById('prompt'); if (h) h.style.display = 'none'; if (pr) pr.style.display = 'none'; } catch (e) { /* headless */ }
  if (mp) {
    awakenPick(CAVE_POOL[0]);
    S.mounted = true; P.dir = ['up', 'down', 'left', 'right'].includes(mp) ? mp : 'down';
    return;
  }
  const type = ['terra', 'acqua', 'albero', 'roccia'].includes(dg) ? dg : 'terra';
  awakenPick(ALL_SPECIES.find(s => (s.src || 'terra') === type) || ALL_SPECIES[0]);
  /* sposta il player su ERBA libera così lo scavo si vede (in città è lastricato) */
  const gx = Math.floor(P.x / TS), gy = Math.floor(P.y / TS);
  for (let r = 1; r < 40; r++) {
    let done = false;
    for (let dy = -r; dy <= r && !done; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = gx + dx, ty = gy + dy;
      if (diggable(baseTerrain(tx, ty)) && !townInfo(tx, ty) && !decoAt(tx, ty)) { P.x = tx * TS + 8; P.y = ty * TS + 8; done = true; break; }
    }
    if (done) break;
  }
  cam.x = P.x; cam.y = P.y;
  COMP.x = P.x + 20; COMP.y = P.y; COMP.init = true; COMP.face = 'right';
  COMP.job = { type, phase: 'work', t: 999, wx: COMP.x + 16, wy: COMP.y, hit: -1 }; // congelato in 'work'
}
