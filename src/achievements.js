/* Traguardi (achievement): si sbloccano da soli quando lo stato li soddisfa.
   check(S) legge lo stato esistente; una volta sbloccati restano (S.achieved). */
import { S } from './state.js';
import { ALL_SPECIES } from './data.js';
import { tr } from './i18n.js';

/* Il catalogo COMPLETO: 60 di superficie + 6 di grotta. Il traguardo "le hai scoperte tutte"
   confrontava `codex.length` col numero 60 scritto a mano, ma nel codex finiscono anche le
   specie di grotta: bastava identificarne cinque per farlo scattare con cinque specie di
   superficie ancora mancanti. Il totale si chiede ai dati, non si ricopia. */
const SP_TOT = ALL_SPECIES.length;

export const ACHS = [
  { id: 'first_find', ic: '🦴', it: ['Prima scoperta', 'Scava o raccogli il primo reperto'], en: ['First discovery', 'Dig or collect your first find'], check: s => (s.codex || []).length >= 1 || (s.raw || []).length >= 1 || (s.items || []).length >= 1 },
  { id: 'ten', ic: '📖', it: ['Naturalista', 'Scopri 10 specie'], en: ['Naturalist', 'Discover 10 species'], check: s => (s.codex || []).length >= 10 },
  { id: 'thirty', ic: '📖', it: ['Esperto', 'Scopri 30 specie'], en: ['Expert', 'Discover 30 species'], check: s => (s.codex || []).length >= 30 },
  /* il totale sta nel segnaposto {n}, non nella stringa: concatenarlo qui cambierebbe la
     chiave del dizionario a ogni specie aggiunta e la traduzione sparirebbe */
  { id: 'all60', ic: '🏆', it: ['Enciclopedico', 'Scopri tutte le {n} specie'], en: ['Encyclopedic', 'Discover all {n} species'], check: s => (s.codex || []).length >= SP_TOT },
  { id: 'chimera', ic: '🐾', it: ['Creatore', 'Assembla la prima chimera'], en: ['Creator', 'Assemble your first chimera'], check: s => (s.creatures || []).length >= 1 },
  { id: 'awaken', ic: '🧬', it: ['Risvegliatore', 'Risveglia una specie'], en: ['Reviver', 'Awaken a species'], check: s => (s.awakened || []).length >= 1 },
  { id: 'cave', ic: '🕳️', it: ['Speleologo', 'Esplora una grotta'], en: ['Spelunker', 'Explore a cave'], check: s => s.caves && Object.keys(s.caves).length >= 1 },
  { id: 'case', ic: '🏛️', it: ['Mecenate', 'Completa una teca del museo'], en: ['Patron', 'Complete a museum case'], check: s => (s.donated || []).length >= 1 },
  { id: 'rich', ic: '🪙', it: ['Danaroso', 'Arriva a 500 monete'], en: ['Wealthy', 'Reach 500 coins'], check: s => (s.coins || 0) >= 500 },
  { id: 'level5', ic: '🎓', it: ['Archeologo provetto', 'Raggiungi il livello 5'], en: ['Seasoned archaeologist', 'Reach level 5'], check: s => (s.level || 1) >= 5 },
  { id: 'quests5', ic: '📋', it: ['Faccendiere', 'Completa 5 missioni'], en: ['Fixer', 'Complete 5 missions'], check: s => (s.questTotal || 0) >= 5 },
  { id: 'companion', ic: '🐾', it: ['Amico fedele', 'Scegli un compagno dal parco'], en: ['Loyal friend', 'Choose a companion at the park'], check: s => !!s.companion },
];
export function achLabel(a) { return tr(a.it[0], a.en[0]); }
export function achDesc(a) { return tr(a.it[1], a.en[1]).replace('{n}', SP_TOT); }
export function isAchieved(id) { return (S.achieved || []).includes(id); }

/* controlla e sblocca i nuovi traguardi; onUnlock(a) per il toast/banner */
export function checkAchievements(onUnlock) {
  if (!S.achieved) S.achieved = [];
  for (const a of ACHS) {
    if (!S.achieved.includes(a.id) && a.check(S)) {
      S.achieved.push(a.id);
      if (onUnlock) onUnlock(a);
    }
  }
}
