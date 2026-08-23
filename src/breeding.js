/* ALLEVAMENTO — dalle chimere che hai GIÀ nasce la prossima, invece che solo dalle ossa morte.
   Scegli DUE genitori (qualunque cosa in S.creatures: chimere o risvegli puri) e per OGNI
   parte (skull/torso/leg) decidi da QUALE dei due la eredita — 8 combinazioni per coppia, una
   scelta vera, non un tiro di dadi. Deponi un UOVO (costa energia + i 3 doppioni MENO
   preziosi che hai: terza strada per i doppioni oltre a vendita e fusione) che matura in
   EGG_DAYS giorni di gioco. Piccola chance di MUTAZIONE per parte (esce una specie IMPARENTATA
   — stessa fonte, es. un altro Pescatore — invece di quella scelta) e di un gradino di RARITÀ in più:
   entrambe salgono se il cibo dato era pregiato. Un uovo alla volta (garnish bounded, come il
   parco che rende): non è un allevamento a batteria.

   Modulo PURO come commission.js/fuse.js: niente DOM, tutto testabile. */
import { S, save, spendEnergy } from './state.js';
import { SPECIES, spById, RAR } from './data.js';
import { chimeraName } from './gameplay.js';
import { isDebug } from './debug.js';

export const EGG_FOOD = 3;             // doppioni da dare in pasto (come il "3" della fusione)
export const EGG_DAYS = 2;             // pronto EGG_DAYS giorni dopo la deposizione
export const EGG_ENERGY = 10;
const ORDER = ['comune', 'raro', 'eccezionale', 'leggendario'];
export const MUT_BASE = 0.08, MUT_FOOD_BONUS = 0.12;    // chance di mutazione: base + fino a +12% col cibo pregiato
export const BUMP_BASE = 0.05, BUMP_FOOD_BONUS = 0.15;  // chance di un gradino di rarità in più

export function egg() { return S.egg || null; }
export function eggReady(day = S.day) { const e = egg(); return !!e && day >= e.readyDay; }
export function eggDaysLeft(day = S.day) { const e = egg(); return e ? Math.max(0, e.readyDay - day) : 0; }

/* i 3 doppioni che si "spenderebbero" ORA: i MENO preziosi che hai (protegge il resto da
   solo — stessa regola della commissione: mai portarti via il pezzo che tenevi da parte) */
export function foodPreview() {
  return [...(S.items || [])].sort((a, b) => (a.val || 0) - (b.val || 0)).slice(0, EGG_FOOD);
}
function avgRarIdx(food) {
  if (!food.length) return 0;
  return food.reduce((a, it) => a + Math.max(0, ORDER.indexOf(it.q)), 0) / food.length / (ORDER.length - 1); // 0..1
}
export function mutationChance(food = foodPreview()) { return MUT_BASE + MUT_FOOD_BONUS * avgRarIdx(food); }
export function bumpChance(food = foodPreview()) { return BUMP_BASE + BUMP_FOOD_BONUS * avgRarIdx(food); }

/* la base GARANTITA (senza mutazione): da quale genitore viene ogni parte. `inherit` =
   {skull:1|2, torso:1|2, leg:1|2}. Pura, per l'anteprima live prima di deporre. */
export function previewOffspring(p1, p2, inherit) {
  if (!p1 || !p2) return null;
  const pick = (g) => (inherit[g] === 2 ? p2 : p1)[g];
  return { skull: pick('skull'), torso: pick('torso'), leg: pick('leg') };
}
/* specie IMPARENTATA per una mutazione: stessa FONTE (acqua/albero/roccia/grotta/terra), non
   necessariamente la stessa zona — ogni zona ha UNA sola specie per fonte non-terra (il raro
   d'acqua, quello d'albero, l'eccezionale di roccia): "stessa zona" da sola avrebbe lasciato
   la mutazione senza scelte per 3 fonti su 5. "Stessa fonte ovunque" tiene il TIPO coerente
   (un Pescatore muta in un altro Pescatore, mai in uno Scavatore) e ha sempre candidati. */
function relatedPool(spId) {
  const sp = spById[spId]; if (!sp) return [];
  return SPECIES.filter(s => s.id !== spId && (s.src || 'terra') === (sp.src || 'terra'));
}

export function canLay(p1uid, p2uid) {
  if (egg()) return { ok: false, why: 'busy' };
  const p1 = (S.creatures || []).find(c => c.uid === p1uid), p2 = (S.creatures || []).find(c => c.uid === p2uid);
  if (!p1 || !p2 || p1uid === p2uid) return { ok: false, why: 'parents' };
  if (isDebug()) return { ok: true, p1, p2 };
  if ((S.items || []).length < EGG_FOOD) return { ok: false, why: 'food' };
  if ((S.energy || 0) < EGG_ENERGY) return { ok: false, why: 'energy' };
  return { ok: true, p1, p2 };
}
/* depone l'uovo: consuma cibo+energia, TIRA I DADI SUBITO (mutazione/rarità) e li ricorda
   nell'uovo — la schiusa più avanti si limita a materializzare, la sorpresa resta comunque
   del giocatore perché non gli si mostra il risultato finché non lo ritira. */
export function layEgg(p1uid, p2uid, inherit, day = S.day) {
  const chk = canLay(p1uid, p2uid); if (!chk.ok) return chk;
  const { p1, p2 } = chk;
  const base = previewOffspring(p1, p2, inherit);
  const food = foodPreview();
  const mut = mutationChance(food), bump = bumpChance(food);
  const spec = {};
  for (const g of ['skull', 'torso', 'leg']) {
    let spId = base[g];
    if (Math.random() < mut) { const pool = relatedPool(spId); if (pool.length) spId = pool[Math.floor(Math.random() * pool.length)].id; }
    spec[g] = spId;
  }
  let qi = Math.max(ORDER.indexOf(p1.q), ORDER.indexOf(p2.q));
  if (Math.random() < bump && qi < ORDER.length - 1) qi++;
  if (!isDebug()) {
    for (const it of food) { const i = S.items.findIndex(x => x.uid === it.uid); if (i >= 0) S.items.splice(i, 1); }
    spendEnergy(EGG_ENERGY);
  }
  S.egg = { uid: S.uid++, skull: spec.skull, torso: spec.torso, leg: spec.leg, q: ORDER[qi],
    p1: p1.name, p2: p2.name, laidDay: day, readyDay: day + EGG_DAYS };
  save();
  return { ok: true, egg: S.egg };
}
/* schiusa: materializza la creatura (già decisa alla deposizione) in S.creatures */
export function hatchEgg(day = S.day) {
  if (!eggReady(day)) return null;
  const e = S.egg;
  const cr = { uid: e.uid, name: chimeraName(spById[e.skull], spById[e.leg], (S.creatures || []).map(x => x.name)),
    skull: e.skull, torso: e.torso, leg: e.leg, q: e.q };
  S.creatures.push(cr);
  S.egg = null;
  save();
  return cr;
}
