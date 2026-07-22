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
/* potenza per rarità. PIENA = un risveglio (o una chimera focalizzata, stesse estremità).
   RIDOTTA = ognuno dei DUE poteri di una chimera con estremità DIVERSE: da soli valgono meno di
   un risveglio, ma sono due (~0,6× la piena, arrotondati). Numeri da tarare ai playtest. */
const FULL = { comune: 0.08, raro: 0.15, eccezionale: 0.22, leggendario: 0.30 };
const HALF = { comune: 0.05, raro: 0.09, eccezionale: 0.13, leggendario: 0.18 };

export function companionSpec() { return S.companion || null; }
function srcOf(id) { const sp = spById[id], s = sp && sp.src; return (s === 'acqua' || s === 'albero' || s === 'roccia' || s === 'grotta') ? s : 'terra'; }
/* TIPO PRIMARIO del compagno = fonte del CRANIO (glifo sopra la testa, gating dello speciale
   leggendario). Per i risvegliati skull=torso=leg=specie. */
export function companionType(spec) { return spec ? srcOf(spec.skull) : 'terra'; }
/* i POTERI del compagno: le due estremità sono CRANIO e ZAMPA.
   - RISVEGLIO (cranio=torace=zampa, stessa specie) → UN potere PIENO (mai battuto da una chimera);
   - CHIMERA → SEMPRE DUE poteri RIDOTTI:
       · estremità di tipo DIVERSO → un potere per fonte (es. Scavatore ½ + Pescatore ½);
       · estremità dello STESSO tipo → quel tipo ½ + un bonus UNIVERSALE ½ ('all' = resa su TUTTE
         le raccolte) → ogni chimera è versatile, come chiesto. */
export function companionPowers(spec) {
  if (!spec) return [];
  const q = spec.q, a = srcOf(spec.skull), b = srcOf(spec.leg);
  const isChimera = !(spec.skull === spec.torso && spec.torso === spec.leg);
  if (!isChimera) return [{ type: a, mag: FULL[q] || FULL.comune }];
  if (a !== b) return [{ type: a, mag: HALF[q] || HALF.comune }, { type: b, mag: HALF[q] || HALF.comune }];
  return [{ type: a, mag: HALF[q] || HALF.comune }, { type: 'all', mag: HALF[q] || HALF.comune }];
}
/* potenza del potere PRINCIPALE (compat: etichette, test) */
export function companionPower(spec) { const p = companionPowers(spec); return p.length ? p[0].mag : 0; }
/* moltiplicatore di resa per l'attività: il MIGLIORE dei poteri che vi si applicano (il tipo giusto
   o il bonus universale 'all'). MAX e non somma: così l'universale non raddoppia il potere del tipo
   e nessuna chimera (½) batte mai un risveglio (pieno) sulla sua attività. */
export function companionYieldMul(activitySrc) {
  const c = S.companion; if (!c) return 1;
  let best = 0;
  for (const p of companionPowers(c)) if (p.type === activitySrc || p.type === 'all') best = Math.max(best, p.mag);
  return 1 + best;
}
/* LANTERNA: il compagno di GROTTA fa luce — alone più ampio di notte (all'aperto) e in grotta.
   Così il suo potere serve anche in superficie, non solo fra i cristalli. Scala con la potenza
   del suo potere grotta (per le chimere è ridotto, come gli altri poteri). 0 se non è grotta. */
export function companionLightBonus() {
  const c = S.companion; if (!c) return 0;
  for (const p of companionPowers(c)) if (p.type === 'grotta') return p.mag * 2.5;
  return 0;
}
/* comodità universali: ogni compagno fiuta i reperti a terra e tiene la bussola accesa */
export function companionHelps() { return !!S.companion; }

export function setCompanion(spec) {
  S.companion = spec || null;
  COMP.init = false; COMP.job = null; COMP.cool = 0; COMP.fx = [];   // reset del lavoro: cambiando compagno NON deve restare a scavare il job del vecchio (es. dopo un raccoglitore leggendario)
  save();
}
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
      /* ISTERESI sul verso: cambio SOLO se un asse domina di ×1.3. In diagonale dx≈dy: senza
         isteresi la condizione |dx|>=|dy| oscillava ogni frame e il verso flippava profilo↔fronte
         all'infinito. Nella fascia quasi-diagonale si tiene il verso attuale. */
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (adx > ady * 1.3) { COMP.face = dx < 0 ? 'left' : 'right'; COMP.dir = dx < 0 ? -1 : 1; }
      else if (ady > adx * 1.3) COMP.face = dy < 0 ? 'up' : 'down';
    }
  }
}
/* spec per drawCreature: { c:{skull,torso,leg,q}, anim, dir, face } */
export function companionDrawObj() {
  const c = S.companion; if (!c) return null;
  return { c: { skull: c.skull, torso: c.torso, leg: c.leg, q: c.q }, anim: COMP.anim, dir: COMP.dir, face: COMP.face };
}
