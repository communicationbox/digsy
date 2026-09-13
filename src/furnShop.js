/* CATALOGO AL NEGOZIO — cosa c'è in vetrina OGGI e a che prezzo. Modulo puro, testabile.

   250 mobili tutti in vendita insieme sarebbero un elenco da scorrere, non un negozio. Ogni
   giorno, per ogni tema, sono in vetrina:
     · i pezzi BASE (sempre: per arredare una stanza non si deve aspettare la fortuna);
     · ROTAZIONE pezzi scelti dal giorno (domani altri: un motivo per ripassare).
   Nel negozio di una zona il tema DI CASA di quella zona (ZONE_THEME) è tutto in vetrina e
   costa un quarto in meno: le zone restano diverse anche per l'arredo, e viaggiare conviene. */
import { FURN_CATALOG, ZONE_THEME } from './furnCatalog.js';

export const ROTAZIONE = 6;
export const SCONTO_ZONA = 0.25;

/* hash intero → [0,1): stessa scelta per lo stesso giorno, diversa il giorno dopo */
function h01(a, b) {
  let x = Math.imul((a | 0) + 0x9e3779b9, 2654435761) ^ Math.imul(b | 0, 40503);
  x ^= x >>> 15; x = Math.imul(x, 2246822519); x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}
function themeSeed(theme) { let s = 0; for (const c of theme) s = (s * 31 + c.charCodeAt(0)) | 0; return s; }

/* i pezzi di un tema in vetrina il giorno `day` nel negozio della zona `zoneId` */
export function catalogToday(theme, day, zoneId) {
  const tutti = FURN_CATALOG.filter(f => f.theme === theme);
  if (ZONE_THEME[zoneId] === theme) return tutti.map(f => f.id);
  const base = tutti.filter(f => f.base);
  const altri = tutti.filter(f => !f.base)
    .map(f => ({ f, k: h01(day, themeSeed(theme) ^ themeSeed(f.id)) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, ROTAZIONE)
    .map(x => x.f);
  /* l'ordine del catalogo resta quello scritto (non quello estratto): i pezzi non ballano di
     posto da un giorno all'altro, cambiano solo quali ci sono */
  const scelti = new Set([...base, ...altri].map(f => f.id));
  return tutti.filter(f => scelti.has(f.id)).map(f => f.id);
}
/* prezzo nel negozio di quella zona: il tema di casa costa un quarto in meno */
export function catalogPrice(id, zoneId) {
  const f = FURN_CATALOG.find(x => x.id === id); if (!f) return 0;
  return ZONE_THEME[zoneId] === f.theme ? Math.max(1, Math.round(f.cost * (1 - SCONTO_ZONA))) : f.cost;
}
export function isZoneTheme(theme, zoneId) { return ZONE_THEME[zoneId] === theme; }
