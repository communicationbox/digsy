/* Compagno: una chimera o un fossile risvegliato scelto dal PARCO ti segue e AIUTA.
   Il POTERE dipende dai TRATTI, non più da un hash a caso:
     - TIPO   = la FONTE della specie (per le chimere: la specie del CRANIO):
                terra→Scavatore · acqua→Pescatore · albero→Boscaiolo · roccia→Minatore · grotta→Speleologo.
                Ogni tipo potenzia la resa della SUA attività di raccolta.
     - POTENZA = scala con la RARITÀ (comune<raro<eccezionale<leggendario).
   In più OGNI compagno, a prescindere, dà due comodità universali: FIUTO (segnala i reperti a
   terra vicini) e BUSSOLA (HUD sempre acceso). I LEGGENDARI avranno poteri ATTIVI a sé
   (raccoglitore autonomo / cavalcatura volante di grotta) — vedi le fasi successive. */
import { S, P } from './state.js';
import { save } from './state.js';
import { spById } from './data.js';
import { parkPopulation } from './park.js';

/* job/cool/fx pilotati dal raccoglitore leggendario (gameplay.companionWorkTick, Fase 1):
   job = lavoro in corso · cool = pausa fra un fossile e l'altro · fx = "+fossile" che sale */
export const COMP = { x: 0, y: 0, dir: -1, face: 'right', anim: 0, init: false, job: null, cool: 0, fx: [] };

/* i cinque tipi (fonti). 'any'/assente → terra (lo Scavatore è il default sempre valido) */
export const COMP_TYPES = ['terra', 'acqua', 'albero', 'roccia', 'grotta'];
/* potenza per rarità (numeri d'esempio, da tarare ai playtest) */
const POWER = { comune: 0.08, raro: 0.15, eccezionale: 0.22, leggendario: 0.30 };

export function companionSpec() { return S.companion || null; }
/* TIPO del compagno = fonte della specie che lo definisce (skull vale per chimere E risvegliati:
   in parkPopulation i risvegliati hanno skull=torso=leg=specie) */
export function companionType(spec) {
  const sp = spec && spById[spec.skull];
  const s = sp && sp.src;
  return (s === 'acqua' || s === 'albero' || s === 'roccia' || s === 'grotta') ? s : 'terra';
}
export function companionPower(spec) { return spec ? (POWER[spec.q] || POWER.comune) : 0; }
/* moltiplicatore di resa per l'attività data: 1+potenza se il tipo combacia, altrimenti 1 */
export function companionYieldMul(activitySrc) {
  const c = S.companion; if (!c) return 1;
  return companionType(c) === activitySrc ? 1 + companionPower(c) : 1;
}
/* comodità universali: ogni compagno fiuta i reperti a terra e tiene la bussola accesa */
export function companionHelps() { return !!S.companion; }

export function setCompanion(spec) { S.companion = spec || null; COMP.init = false; save(); }
export function clearCompanion() { setCompanion(null); }

/* Candidati: esattamente CHI VIVE NEL PARCO — si sceglie il compagno fra le creature che si
   vedono passeggiare là dentro. Lista unica in park.js: quando le due erano scritte a mano in
   due posti sono divergute, e le specie risvegliate comparivano qui ma non nel recinto. */
export function companionCandidates() { return parkPopulation(); }
export function isCurrentCompanion(key) { return !!S.companion && S.companion.key === key; }

/* il compagno insegue il player restando un po' indietro rispetto al verso di marcia */
export function updateCompanion(dt) {
  /* effetti "+fossile" del raccoglitore: salgono e svaniscono in ~0,9 s */
  if (COMP.fx.length) { for (const p of COMP.fx) p.life -= dt / 0.9; COMP.fx = COMP.fx.filter(p => p.life > 0); }
  const c = S.companion; if (!c) { COMP.job = null; return; }
  if (COMP.job) return;               // durante il lavoro guida il movimento gameplay.companionWorkTick
  if (!COMP.init) { COMP.x = P.x - 16; COMP.y = P.y + 6; COMP.init = true; }
  const off = P.dir === 'left' ? 16 : P.dir === 'right' ? -16 : 0;
  const offy = P.dir === 'up' ? 16 : P.dir === 'down' ? -14 : 8;
  const tx = P.x + off, ty = P.y + offy;
  const dx = tx - COMP.x, dy = ty - COMP.y, d = Math.hypot(dx, dy);
  /* segue SEMPRE, con passo min(d, velocità): tocca il bersaglio senza scavalcarlo. La vecchia
     deadzone `d > 2` faceva stop-and-go attorno al bersaglio mentre il player camminava → la
     posizione oscillava e lo snap la faceva TREMARE. Ora è morbido (regola: niente tremolii). */
  if (d > 0.01) {
    const sp = Math.min(d, 90 * dt);
    COMP.x += dx / d * sp; COMP.y += dy / d * sp;
    if (d > 0.5) {                         // anima/gira solo quando si muove davvero (niente flicker da fermo)
      COMP.anim += dt;
      if (Math.abs(dx) >= Math.abs(dy)) { COMP.face = dx < 0 ? 'left' : 'right'; COMP.dir = dx < 0 ? -1 : 1; }
      else COMP.face = dy < 0 ? 'up' : 'down';
    }
  }
}
/* spec per drawCreature: { c:{skull,torso,leg,q}, anim, dir, face } */
export function companionDrawObj() {
  const c = S.companion; if (!c) return null;
  return { c: { skull: c.skull, torso: c.torso, leg: c.leg, q: c.q }, anim: COMP.anim, dir: COMP.dir, face: COMP.face };
}
