/* COMMISSIONE DEL MUSEO — l'unico impegno del gioco che dura più di una giornata.
   Le missioni del cartello scadono all'alba: nessuna ti dà un motivo per accendere il gioco
   domani. Qui il Curatore firma un incarico da 3 giorni, uno alla volta, con una ricompensa
   che vale il viaggio. Se scade non succede niente di brutto (il gioco resta cozy): ne firmi
   un'altra. Ma se la porti a casa, è la cosa più redditizia della giornata.

   Modulo PURO come bones.js: nessun DOM, tutto testabile. */
import { S, save } from './state.js';
import { vhash } from './noise.js';
import { ALL_SPECIES, spById, PARTS, RAR } from './data.js';
import { tr, rarLabel, partName } from './i18n.js';

export const DURATION = 3;              // giorni di tempo, inclusa la giornata in cui la firmi

/* La proposta del giorno è deterministica: stessa giornata → stessa offerta, anche se esci
   e rientri dal museo. Cambia domani, o quando ne concludi una. */
export function offerFor(day, seedN = 0) {
  const known = ALL_SPECIES.filter(s => (S.codex || []).includes(s.id));
  const r = vhash(day * 7 + seedN, day * 13 + 3, 900);
  /* "porta N pezzi di QUELLA specie": manda in un bioma preciso, ed è il motivo per uscire */
  if (known.length && r < 0.62) {
    const sp = known[Math.floor(vhash(day, seedN + 1, 901) * known.length)];
    const n = 2 + Math.floor(vhash(day + 2, seedN, 902) * 2);      // 2 o 3
    const mult = (RAR.find(r => r.id === sp.r) || { mult: 1 }).mult;
    return norm({
      kind: 'species', spId: sp.id, n,
      reward: Math.round((70 + 40 * n) * mult), xp: 30 + 15 * n, dna: sp.id,
    }, day, seedN);
  }
  /* ripiego (o variante): una rarità precisa, indipendente dalla specie */
  const rar = vhash(day, seedN + 5, 903) < 0.6 ? 'raro' : 'eccezionale';
  const n = rar === 'raro' ? 3 : 2;
  return norm({
    kind: 'rarity', rar, n,
    reward: rar === 'raro' ? 190 : 380, xp: 55, dna: null,
  }, day, seedN);
}
function norm(q, day, seedN) {
  q.id = day + ':' + seedN;
  q.day0 = day; q.due = day + DURATION - 1;
  return q;
}

export function active() { return S.commission || null; }
export function daysLeft(day = S.day) { const c = active(); return c ? c.due - day + 1 : 0; }
export function expired(day = S.day) { const c = active(); return !!c && day > c.due; }
/* pulizia all'alba: una commissione scaduta sparisce (e lascia il posto alla prossima) */
export function pruneExpired(day = S.day) {
  if (expired(day)) { S.commission = null; S.commissionMissed = (S.commissionMissed || 0) + 1; save(); return true; }
  return false;
}
export function accept(offer, day = S.day) {
  if (active()) return false;
  S.commission = { ...offer, day0: day, due: day + DURATION - 1 };
  save();
  return true;
}

/* quanti pezzi validi hai in mano ORA (solo identificati: i grezzi vanno prima al banco) */
export function have(c = active()) {
  if (!c) return 0;
  const items = S.items || [];
  if (c.kind === 'species') return items.filter(it => it.s === c.spId).length;
  return items.filter(it => it.q === c.rar).length;
}
export function canDeliver(c = active()) { return !!c && have(c) >= c.n; }

/* consegna: consuma i pezzi MENO preziosi fra quelli validi (stessa regola del cartello:
   una commissione non deve portarti via il cranio leggendario se andava bene una zampa) */
export function deliver(day = S.day) {
  const c = active();
  if (!c || !canDeliver(c) || day > c.due) return null;
  const items = S.items || [];
  const ok = c.kind === 'species' ? (it => it.s === c.spId) : (it => it.q === c.rar);
  for (let k = 0; k < c.n; k++) {
    let best = -1, bestVal = Infinity;
    for (let i = 0; i < items.length; i++) {
      if (!ok(items[i])) continue;
      const v = items[i].val || 0;
      if (v < bestVal) { bestVal = v; best = i; }
    }
    if (best >= 0) items.splice(best, 1);
  }
  S.coins += c.reward;
  if (c.dna) S.dna[c.dna] = (S.dna[c.dna] || 0) + 1;   // fialetta INTERA: vale un risveglio
  S.commissionDone = (S.commissionDone || 0) + 1;
  S.commission = null;
  save();
  return c;
}

/* testo della richiesta, sempre esplicito su cosa serve e quanto tempo resta */
export function text(c) {
  if (!c) return '';
  if (c.kind === 'species') {
    const sp = spById[c.spId];
    return c.n + ' ' + tr('pezzi di ', 'pieces of ') + (sp ? sp.name : c.spId);
  }
  return c.n + ' ' + tr('reperti', 'finds') + ' ' + rarLabel(c.rar);
}
export function rewardText(c) {
  if (!c) return '';
  const bits = ['🪙 ' + c.reward, '⭐ ' + c.xp + ' XP'];
  if (c.dna) bits.push('🧬 ' + tr('1 fialetta di ', '1 vial of ') + (spById[c.dna] ? spById[c.dna].name : c.dna));
  return bits.join(' · ');
}
export function dueText(c, day = S.day) {
  if (!c) return '';
  const d = c.due - day + 1;
  if (d <= 0) return tr('scaduta', 'expired');
  if (d === 1) return tr('ultimo giorno', 'last day');
  return tr('ancora ', '') + d + tr(' giorni', ' days left');
}
/* usato dai test e dal Libro: le parti servono solo come etichetta leggibile */
export function partsHint(c) { return c && c.kind === 'species' ? PARTS.map(p => partName(p.id)).join(' · ') : ''; }
