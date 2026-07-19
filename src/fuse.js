/* FUSIONE DEI DOPPIONI — tre pezzi uguali diventano un pezzo di rarità superiore.
   Nasce da un problema misurato: tutto il comprabile costa ~2.720 monete, e un pezzo ne
   vale ~15. Dopo un paio di centinaia di doppioni venduti le monete non servono più, ma di
   doppioni continui a trovarne a centinaia — diventano rumore. Qui la sfortuna accumulata
   torna a essere progresso: chi ha scavato tanto senza fortuna può COSTRUIRSI la rarità.

   Regole, tutte volutamente semplici da spiegare in una riga:
   - 3 pezzi IDENTICI (stessa specie, stessa parte) → 1 pezzo della STESSA PARTE, rarità
     successiva, di una specie della STESSA ZONA;
   - i leggendari non si fondono: sono già il tetto;
   - non costa monete. Il costo sono i tre pezzi.

   Modulo PURO: riceve gli oggetti e il catalogo, non tocca DOM né stato globale. */
import { PARTS, RAR, ptById, spById, zonePools } from './data.js';

export const NEEDED = 3;                       // quanti pezzi uguali servono
const ORDER = ['comune', 'raro', 'eccezionale', 'leggendario'];

export function nextRarity(r) {
  const i = ORDER.indexOf(r);
  return i < 0 || i >= ORDER.length - 1 ? null : ORDER[i + 1];
}

/* i gruppi fondibili presenti nello zaino, dal più prezioso al meno */
export function fusibleGroups(items) {
  const by = new Map();
  for (const it of items || []) {
    if (!nextRarity(it.q)) continue;             // leggendario: niente da salire
    const k = it.s + '|' + it.t;
    const g = by.get(k) || { spId: it.s, part: it.t, q: it.q, uids: [] };
    g.uids.push(it.uid);
    by.set(k, g);
  }
  return [...by.values()]
    .filter(g => g.uids.length >= NEEDED)
    .sort((a, b) => ORDER.indexOf(b.q) - ORDER.indexOf(a.q) || b.uids.length - a.uids.length);
}

/* valore di un pezzo, con la stessa formula del resto del gioco */
export function partValue(part, rar) {
  const m = RAR.find(r => r.id === rar);
  return Math.max(2, Math.round(7 * ptById[part].mult * (m ? m.mult : 1)));
}

/* che cosa esce da un gruppo: stessa parte, rarità sopra, specie della stessa zona.
   `pick` decide quale specie (di serie a caso; i test ne passano una fissa). */
export function fuseResult(group, pick = arr => arr[Math.floor(Math.random() * arr.length)]) {
  const up = nextRarity(group.q); if (!up) return null;
  const sp = spById[group.spId]; if (!sp) return null;
  const pool = (zonePools[sp.zone] || []).filter(s => s.r === up);
  if (!pool.length) return null;
  const out = pick(pool);
  return { spId: out.id, part: group.part, q: up, val: partValue(group.part, up) };
}

/* Esegue la fusione: toglie i 3 pezzi da `items` e restituisce il nuovo (senza inserirlo,
   così chi chiama decide dove metterlo e può rifiutarlo se lo zaino è pieno). */
export function fuse(items, group, nextUid, pick) {
  if (!group || group.uids.length < NEEDED) return null;
  const res = fuseResult(group, pick); if (!res) return null;
  const take = group.uids.slice(0, NEEDED);
  for (const uid of take) {
    const i = items.findIndex(x => x.uid === uid);
    if (i >= 0) items.splice(i, 1);
  }
  return { uid: nextUid, s: res.spId, t: res.part, q: res.q, val: res.val };
}

/* etichetta leggibile del gruppo, per l'interfaccia e per i test */
export function groupLabel(g) {
  const p = PARTS.find(x => x.id === g.part);
  const sp = spById[g.spId];
  return (p ? p.name : g.part) + ' · ' + (sp ? sp.name : g.spId);
}
