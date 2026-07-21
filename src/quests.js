/* Missioni giornaliere: un CARTELLO in città espone le richieste dei vari NPC.
   Ne accetti fino a MAX_ACTIVE, scadono a fine giornata, consegni al cartello quando hai il necessario. */
import { S } from './state.js';
import { gainXp, grantMap } from './gameplay.js';
import { vhash } from './noise.js';
import { PARTS, goodById } from './data.js';
import { seasonOf } from './daynight.js';
import { LANG, tr, partName, rarLabel } from './i18n.js';

export const FIREFLY_SEASON = 1;   // ESTATE (🌸0 ☀️1 🍂2 ❄️3): le lucciole escono solo d'estate

export const MAX_ACTIVE = 3;
const GIVERS = [['Curatore', 'Curator'], ['Mastro Ossa', 'Bone Master'], ['Perla', 'Pearl'], ['Cavatore', 'Digger'], ['Sarta', 'Tailor'], ['Oste', 'Innkeeper']];
const ALL_GOODS = Object.values(goodById);
export function giverName(i) { const g = GIVERS[i % GIVERS.length]; return tr(g[0], g[1]); }

/* stato per giornata: le missioni scadono e il cartello si rigenera ogni giorno */
export function ensureQuests(day) {
  if (!S.quests || S.quests.day !== day) S.quests = { day, active: [], done: [] };
  return S.quests;
}

/* offerte del cartello: deterministiche per (città, giorno) — 4 richieste */
export function boardOffers(cx, cy, day) {
  ensureQuests(day);
  const out = [];
  for (let i = 0; i < 4; i++) {
    const r = vhash(cx * 3 + i, cy * 5 + day, 400 + i);
    const gi = Math.floor(vhash(cx + i, cy + day, 410 + i) * GIVERS.length);
    const qid = cx + ',' + cy + ',' + day + ',' + i;
    let q;
    if (r < 0.40) { // reperti di una rarità
      const rar = ['comune', 'raro', 'eccezionale'][Math.floor(vhash(cx, cy + i, 420 + day) * 3)];
      const n = rar === 'comune' ? 3 : rar === 'raro' ? 2 : 1;
      const reward = ({ comune: 14, raro: 34, eccezionale: 80 })[rar] * n;
      q = { type: 'fossils', rar, n, reward };
    } else if (r < 0.68) { // oggetti di superficie
      const g = ALL_GOODS[Math.floor(vhash(cx + i, cy, 430 + day) * ALL_GOODS.length)];
      const n = 2 + Math.floor(vhash(cx, cy + i, 440 + day) * 4);
      const reward = Math.round(g.val * n * 1.5) + 6; // poco sopra la vendita diretta, non troppo
      q = { type: 'goods', goodId: g.id, n, reward };
    } else if (r < 0.84) { // pezzi (qualsiasi specie)
      const part = PARTS[Math.floor(vhash(cx + i, cy + i, 450 + day) * PARTS.length)].id;
      const n = 1 + Math.floor(vhash(cx, cy, 460 + day + i) * 2);
      const reward = Math.round(20 * ptById(part) * n) + 6;
      q = { type: 'part', part, n, reward };
    } else if (r >= 0.97 && seasonOf(day) === FIREFLY_SEASON) { // CATTURA LUCCIOLE: RARA (~3% del cartello)
      const n = 5 + Math.floor(vhash(cx, cy + i, 470 + day) * 6); // 5..10   e solo d'estate. Premio SPECIALE:
      q = { type: 'fireflies', n, reward: 0, prize: 'map', prizeRar: 'leggendario' }; // una mappa leggendaria
    } else { // fascia alta ordinaria (o fuori stagione): una richiesta di pezzi
      const part = PARTS[Math.floor(vhash(cx + i, cy + i, 450 + day) * PARTS.length)].id;
      const n = 1 + Math.floor(vhash(cx, cy, 460 + day + i) * 2);
      q = { type: 'part', part, n, reward: Math.round(20 * ptById(part) * n) + 6 };
    }
    q.qid = qid; q.giver = gi;
    out.push(q);
  }
  return out;
}
function ptById(id) { const p = PARTS.find(x => x.id === id); return p ? p.mult : 1; }

/* descrizione leggibile della richiesta */
export function questText(q) {
  if (q.type === 'fossils') return tr('Consegna ', 'Deliver ') + q.n + ' ' + tr('reperti', 'finds') + ' ' + rarLabel(q.rar);
  if (q.type === 'goods') { const g = goodById[q.goodId]; return tr('Porta ', 'Bring ') + q.n + '× ' + tr(g.it, g.en); }
  if (q.type === 'fireflies') return tr('Cattura ', 'Catch ') + q.n + ' ' + tr('lucciole (di notte, all\'aperto)', 'fireflies (at night, outdoors)');
  return tr('Porta ', 'Bring ') + q.n + '× ' + partName(q.part) + ' ' + tr('(di qualsiasi specie)', '(any species)');
}
/* etichetta del premio: monete di norma, MAPPA per la missione lucciole (premio speciale) */
export function questRewardText(q) {
  if (q.type === 'fireflies' && q.prize === 'map') return '🗺️ ' + tr('mappa ', 'map ') + rarLabel(q.prizeRar || 'leggendario');
  return '🪙 ' + q.reward;
}
/* quanti pezzi hai già verso la richiesta */
export function questHave(q) {
  if (q.type === 'fossils') return (S.items || []).filter(it => it.q === q.rar).length;
  if (q.type === 'goods') return (S.goods || []).filter(g => g.id === q.goodId).length;
  if (q.type === 'fireflies') return Math.max(0, (S.fireflies || 0) - (q.base != null ? q.base : (S.fireflies || 0))); // catturate da quando l'hai accettata
  return (S.items || []).filter(it => it.t === q.part).length;
}
/* la missione lucciole ATTIVA (se c'è): accende il minigioco notturno. null se non c'è. */
export function fireflyQuest() { return activeQuests().find(q => q.type === 'fireflies') || null; }
export function canComplete(q) { return questHave(q) >= q.n; }
export function isActive(qid) { return (S.quests && S.quests.active || []).some(q => q.qid === qid); }
export function isDone(qid) { return (S.quests && S.quests.done || []).includes(qid); }

export function acceptQuest(offer, day) {
  ensureQuests(day);
  if (isActive(offer.qid) || isDone(offer.qid)) return false;
  if (S.quests.active.length >= MAX_ACTIVE) return 'full';
  const q = { ...offer, day };
  if (q.type === 'fireflies') q.base = S.fireflies || 0; // conta le lucciole prese DA ORA
  S.quests.active.push(q);
  return true;
}
/* consegna: consuma i pezzi richiesti, accredita la ricompensa, sposta in "done" */
export function deliverQuest(qid) {
  const q = (S.quests && S.quests.active || []).find(x => x.qid === qid);
  if (!q || !canComplete(q)) return false;
  if (q.type === 'goods') removeN(S.goods, g => g.id === q.goodId, q.n);
  else if (q.type === 'fossils') removeN(S.items, it => it.q === q.rar, q.n);
  else if (q.type === 'part') removeN(S.items, it => it.t === q.part, q.n);
  // fireflies: niente da consumare, le hai già "spese" catturandole
  /* PREMIO SPECIALE lucciole: una mappa verso un fossile leggendario (niente monete) */
  if (q.type === 'fireflies' && q.prize === 'map') q.prizeMap = grantMap(q.prizeRar || 'leggendario');
  S.coins += q.reward;
  /* le missioni danno XP (il Maestro lo diceva già, il codice no) */
  gainXp(Math.max(4, Math.round(q.reward / 6)));
  S.questTotal = (S.questTotal || 0) + 1; // per i traguardi
  S.quests.active = S.quests.active.filter(x => x.qid !== qid);
  S.quests.done.push(qid);
  return q;
}
/* consuma i pezzi MENO preziosi fra quelli validi: una missione da 66🪙 non deve poterti
   portare via un cranio leggendario da 95🪙 solo perché era il primo della lista */
function removeN(arr, pred, n) {
  for (let k = 0; k < n; k++) {
    let best = -1, bestVal = Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (!pred(arr[i])) continue;
      const v = arr[i].val || 0;
      if (v < bestVal) { bestVal = v; best = i; }
    }
    if (best >= 0) arr.splice(best, 1);
  }
}
export function activeQuests() { return (S.quests && S.quests.active) || []; }
