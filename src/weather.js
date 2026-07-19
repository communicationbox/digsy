/* Meteo dinamico per bioma: cambia ogni giorno (deterministico su giorno+zona).
   Effetti: visivi (render) + meccanici (la pioggia alza i drop). */
import { vhash } from './noise.js';
import { S } from './state.js';
import { tr } from './i18n.js';

/* ogni zona ha un meteo "tipico" oltre al sereno; palude/gelide lo prendono più spesso */
const ZONE_WX = {
  prati: ['clear', 'rain'],
  dune: ['clear', 'sandstorm'],
  boschi: ['clear', 'fog'],
  terre: ['clear', 'ash'],
  palude: ['rain', 'clear'],
  ghiacci: ['snow', 'clear'],
};
export function weatherAt(zoneId, day) {
  if (S && S.weatherOverride) return S.weatherOverride; // forzatura da console (cheat/test)
  const list = ZONE_WX[zoneId] || ['clear'];
  const r = vhash((day | 0) * 7 + 3, (day | 0) * 3 + 11, 500);
  return r < 0.45 ? list[0] : list[list.length - 1];
}
/* CROSSFADE meteo: la particellatura non compare/sparisce di colpo (cambio giorno o bioma),
   ma sfuma su ~3s. Stato runtime: meteo mostrato + livello 0..1. */
let curW = 'clear', lvl = 0, lastT = -1;
export function weatherStep(target, time) {
  const dt = lastT < 0 ? 0 : Math.min(0.06, Math.max(0, (time - lastT) / 1000)); lastT = time;
  const rate = dt / 3; // ~3s per dissolvenza piena
  if (target === curW) lvl = Math.min(1, lvl + rate);
  else { lvl = Math.max(0, lvl - rate); if (lvl <= 0) curW = target; }
  return { w: curW, level: lvl };
}
export const WEATHER_TYPES = ['clear', 'rain', 'sandstorm', 'fog', 'ash', 'snow'];
const WLAB = {
  rain: ['Pioggia', 'Rain'], sandstorm: ['Tempesta di sabbia', 'Sandstorm'],
  fog: ['Nebbia', 'Fog'], ash: ['Cenere', 'Ashfall'], snow: ['Neve', 'Snow'], clear: ['', ''],
};
export function weatherLabel(w) { const e = WLAB[w] || WLAB.clear; return tr(e[0], e[1]); }
/* moltiplicatore sui ritrovamenti (la pioggia "smuove" il terreno) */
export function weatherDropMul(w) { return w === 'rain' ? 1.1 : 1; }
