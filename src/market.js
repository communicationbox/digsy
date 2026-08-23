/* MERCATO A PREZZI VARIABILI — la richiesta di ogni specie cambia col giorno, deterministica
   come il meteo (stesso vhash, stesso spirito: si legge, non si subisce). Vale SOLO al momento
   della VENDITA (sellItem/sellAll in gameplay.js): il valore base (`it.val`) resta quello che
   già guida commissioni, restauro e la lista del Museo — il mercato è una scelta IN PIÙ
   ("vendo ora o aspetto?"), non un sistema che sostituisce quello che c'era.

   Quattro fasce, quella più alta rara apposta — l'emozione è azzeccare il momento, non vedersela
   ogni giorno. */
import { vhash } from './noise.js';
import { ALL_SPECIES } from './data.js';
import { S } from './state.js';
import { tr } from './i18n.js';

const SP_IDX = Object.fromEntries(ALL_SPECIES.map((s, i) => [s.id, i]));

export const MARKET_TIERS = [
  { id: 'basso', max: 0.15, mul: 0.7 },
  { id: 'normale', max: 0.65, mul: 1.0 },
  { id: 'alto', max: 0.90, mul: 1.3 },
  { id: 'record', max: 1.01, mul: 1.7 },
];
/* fascia del giorno per quella specie. `marketOverride` (console: market=alto) forza una
   fascia per tutte le specie, per provare/fotografare senza aspettare il giorno giusto. */
export function marketTier(spId, day) {
  if (S && S.marketOverride) return MARKET_TIERS.find(t => t.id === S.marketOverride) || MARKET_TIERS[1];
  const idx = SP_IDX[spId];
  if (idx == null) return MARKET_TIERS[1];
  const r = vhash((day | 0) * 11 + idx, idx * 7 + 3, 900);
  return MARKET_TIERS.find(t => r < t.max) || MARKET_TIERS[1];
}
export function marketMul(spId, day) { return marketTier(spId, day).mul; }
export function marketPrice(baseVal, spId, day) { return Math.max(1, Math.round(baseVal * marketMul(spId, day))); }

const LABEL = {
  basso: ['📉 richiesta bassa', '📉 low demand'],
  normale: ['', ''],
  alto: ['📈 richiesta alta', '📈 high demand'],
  record: ['🔥 richiesta alle stelle', '🔥 sky-high demand'],
};
export function marketLabel(spId, day) { const e = LABEL[marketTier(spId, day).id]; return tr(e[0], e[1]); }
