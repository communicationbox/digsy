/* Compagno: una chimera o un fossile risvegliato scelto dal PARCO ti segue e AIUTA.
   Abilità (dall'hash del compagno): fiuto (segnala i reperti a terra vicini),
   bussola (mostra sempre passi/nome anche da lontano), fortuna (+scavo, +valore oggetti). */
import { S, P } from './state.js';
import { save } from './state.js';
import { parkPopulation } from './park.js';

export const COMP = { x: 0, y: 0, dir: -1, anim: 0, init: false };

function hashStr(s) { let h = 0; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
export function companionSpec() { return S.companion || null; }
export const ABILITIES = ['sniff', 'compass', 'luck'];
export function abilityOf(spec) { return spec ? ABILITIES[hashStr(spec.key || spec.name) % ABILITIES.length] : null; }
export function companionAbility() { return abilityOf(S.companion); }
export function setCompanion(spec) { S.companion = spec || null; COMP.init = false; save(); }
export function clearCompanion() { setCompanion(null); }

/* Candidati: esattamente CHI VIVE NEL PARCO — si sceglie il compagno fra le creature che si
   vedono passeggiare là dentro. Lista unica in park.js: quando le due erano scritte a mano in
   due posti sono divergute, e le specie risvegliate comparivano qui ma non nel recinto. */
export function companionCandidates() { return parkPopulation(); }
export function isCurrentCompanion(key) { return !!S.companion && S.companion.key === key; }

/* il compagno insegue il player restando un po' indietro rispetto al verso di marcia */
export function updateCompanion(dt) {
  const c = S.companion; if (!c) return;
  if (!COMP.init) { COMP.x = P.x - 16; COMP.y = P.y + 6; COMP.init = true; }
  const off = P.dir === 'left' ? 16 : P.dir === 'right' ? -16 : 0;
  const offy = P.dir === 'up' ? 16 : P.dir === 'down' ? -14 : 8;
  const tx = P.x + off, ty = P.y + offy;
  const dx = tx - COMP.x, dy = ty - COMP.y, d = Math.hypot(dx, dy);
  const sp = Math.min(d, 90 * dt);
  if (d > 2) { COMP.x += dx / d * sp; COMP.y += dy / d * sp; COMP.anim += dt; if (Math.abs(dx) > 0.5) COMP.dir = dx < 0 ? -1 : 1; }
}
/* spec per drawCreature: { c:{skull,torso,leg,q}, anim, dir } */
export function companionDrawObj() {
  const c = S.companion; if (!c) return null;
  return { c: { skull: c.skull, torso: c.torso, leg: c.leg, q: c.q }, anim: COMP.anim, dir: COMP.dir };
}
