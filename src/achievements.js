/* Traguardi a LIVELLI (Bronzo/Argento/Oro/Platino). Ogni TRACCIA misura un valore dello stato e
   sale di gradino al superare le sue 4 soglie. I gradini si sbloccano da soli e restano
   (S.trophies[trackId] = gradino massimo raggiunto, 0..4). ORO e PLATINO daranno un cosmetico
   unico (Fase 2); il PLATINO è il regalo speciale, dorato/glitterato. */
import { S } from './state.js';
import { ALL_SPECIES } from './data.js';
import { tr } from './i18n.js';

const SP_TOT = ALL_SPECIES.length;   // 66: il totale si CHIEDE ai dati, non si ricopia

export const TIERS = ['bronze', 'silver', 'gold', 'platinum'];
export const TIER_LABEL = { bronze: ['Bronzo', 'Bronze'], silver: ['Argento', 'Silver'], gold: ['Oro', 'Gold'], platinum: ['Platino', 'Platinum'] };
export const TIER_COL = { bronze: '#cd7f32', silver: '#c7ccd1', gold: '#e8b93c', platinum: '#8fe7dd' }; // platino = ciano lucente
export function tierLabel(i) { const k = TIERS[i - 1]; return k ? tr(TIER_LABEL[k][0], TIER_LABEL[k][1]) : ''; }
export function tierCol(i) { return TIER_COL[TIERS[i - 1]] || '#8a755a'; }

/* le 9 tracce: metric(S) → valore corrente; tiers = [bronzo, argento, oro, platino];
   reward = cappello-TROFEO d'oro sbloccato all'ORO (al PLATINO la stessa forma diventa glitter). */
export const TRACKS = [
  { id: 'discover', ic: '📖', it: 'Scopritore', en: 'Discoverer', dit: 'Specie scoperte', den: 'Species discovered', metric: s => (s.codex || []).length, tiers: [10, 25, 45, SP_TOT], reward: 'pithGold' },
  { id: 'cases', ic: '🏛️', it: 'Collezionista', en: 'Collector', dit: 'Teche complete', den: 'Complete cases', metric: s => (s.donated || []).length, tiers: [1, 5, 20, SP_TOT], reward: 'laurelGold' },
  { id: 'awaken', ic: '🧬', it: 'Genetista', en: 'Geneticist', dit: 'Specie risvegliate', den: 'Species awakened', metric: s => (s.awakened || []).length, tiers: [1, 10, 30, SP_TOT], reward: 'gogglesGold' },
  { id: 'chimera', ic: '🐾', it: 'Creatore', en: 'Creator', dit: 'Chimere assemblate', den: 'Chimeras assembled', metric: s => (s.creatures || []).length, tiers: [1, 5, 15, 30], reward: 'hornsGold' },
  { id: 'coins', ic: '🪙', it: 'Danaroso', en: 'Wealthy', dit: 'Monete accumulate', den: 'Coins amassed', metric: s => s.coins || 0, tiers: [500, 2500, 10000, 40000], reward: 'crownGold' },
  { id: 'level', ic: '🎓', it: 'Archeologo', en: 'Archaeologist', dit: 'Livello archeologo', den: 'Archaeologist level', metric: s => s.level || 1, tiers: [5, 10, 20, 30], reward: 'gradGold' },
  { id: 'quests', ic: '📋', it: 'Faccendiere', en: 'Fixer', dit: 'Missioni completate', den: 'Missions completed', metric: s => s.questTotal || 0, tiers: [5, 15, 40, 100], reward: 'featherGold' },
  { id: 'finds', ic: '🦴', it: 'Scavatore', en: 'Digger', dit: 'Reperti trovati', den: 'Fossils found', metric: s => s.findsTotal || 0, tiers: [25, 150, 800, 3000], reward: 'hardhatGold' },
  { id: 'caves', ic: '🕳️', it: 'Speleologo', en: 'Spelunker', dit: 'Grotte esplorate', den: 'Caves explored', metric: s => Object.keys(s.caves || {}).length, tiers: [1, 3, 8, 20], reward: 'lampGold' },
];
export const TROPHY_HATS = TRACKS.map(t => t.reward);   // i 9 cappelli-trofeo (per Sartoria/anteprima/test)
export const TIER_TOTAL = TRACKS.length * TIERS.length; // 36 gradini totali

export function trackLabel(t) { return tr(t.it, t.en); }
export function trackGoal(t) { return tr(t.dit, t.den); }
/* gradino RAGGIUNTO ORA da una traccia sullo stato s: 0 (nessuno) .. 4 (platino) */
export function trackTier(t, s) { let n = 0; const v = t.metric(s); for (const th of t.tiers) if (v >= th) n++; return n; }
/* gradino già SBLOCCATO (salvato) */
export function trophyTier(id) { return (S.trophies || {})[id] || 0; }
/* quanti gradini in totale hai (per il "X/36") */
export function trophyCount() { let n = 0; for (const t of TRACKS) n += trophyTier(t.id); return n; }
/* prossima soglia da raggiungere per una traccia (o null se al platino) */
export function nextThreshold(t) { const cur = trackTier(t, S); return cur >= 4 ? null : t.tiers[cur]; }

/* controlla e sblocca i NUOVI gradini; onUnlock(track, tier) per toast/banner/cosmetico */
export function checkAchievements(onUnlock) {
  if (!S.trophies) S.trophies = {};
  for (const t of TRACKS) {
    const have = S.trophies[t.id] || 0, now = trackTier(t, S);
    if (now > have) {
      for (let tier = have + 1; tier <= now; tier++) { S.trophies[t.id] = tier; if (onUnlock) onUnlock(t, tier); }
    }
  }
}
