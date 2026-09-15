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
import { TS } from './data.js';
import { FOOT_DY } from './body.js';
import { isSolidTile, baseTerrain, townInfo, houseDoorAt, DEEP, WATER } from './world.js';

/* job/cool/fx pilotati dal raccoglitore leggendario (gameplay.companionWorkTick, Fase 1):
   job = lavoro in corso · cool = pausa fra un fossile e l'altro · fx = "+fossile" che sale. */
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
export function updateCompanion(dt, mounted) {
  /* effetti "+fossile" del raccoglitore: salgono e svaniscono in ~0,9 s */
  if (COMP.fx.length) { for (const p of COMP.fx) p.life -= dt / 0.9; COMP.fx = COMP.fx.filter(p => p.life > 0); }
  const c = S.companion; if (!c) { COMP.job = null; return; }
  /* IN VOLO la cavalcatura È il player: tienila INCOLLATA a lui. Senza, il compagno resta indietro
     (segue a 90px/s mentre voli ×3) e all'atterraggio "torna" dal punto di decollo (segnalato). */
  if (mounted) { COMP.x = P.x; COMP.y = P.y; COMP.job = null; return; }
  if (COMP.job) return;               // durante il lavoro guida il movimento gameplay.companionWorkTick
  /* SEGUE LA SCIA DEI PASSI, non un punto fisso accanto a Digsy. Il vecchio bersaglio stava
     16px dietro al verso in cui si guardava: uscendo da una casa verso il basso "dietro"
     voleva dire DENTRO la casa, e il compagno ci finiva in mezzo, sul tetto (segnalato con
     foto: "il buddy si compenetra"). La scia passa solo dove Digsy ha camminato davvero, quindi
     il compagno non può entrare in un muro, in una staccionata o in una porta. */
  const d0 = trail.length ? Math.hypot(P.x - trail[trail.length - 1].x, P.y - trail[trail.length - 1].y) : 0;
  if (!COMP.init || d0 > TS * 2) {
    /* SALTO (appena scelto, uscito da un edificio, teletrasporto): la scia vecchia non vale più,
       e il compagno ricompare su una casella LIBERA accanto, mai dentro un edificio */
    trail.length = 0;
    trail.push({ x: P.x, y: P.y });
    if (!COMP.init || Math.hypot(COMP.x - P.x, COMP.y - P.y) > TS * 2) {
      const f = freeSpotNear(P.x, P.y);
      COMP.x = f.x; COMP.y = f.y;
    }
    COMP.init = true;
  } else if (d0 > 2) {
    trail.push({ x: P.x, y: P.y });
    if (trail.length > TRAIL_MAX) trail.shift();
  }
  const t = trailPointBehind(FOLLOW_PX);
  /* scia troppo corta (Digsy fermo o appena arrivato): si resta dove si è, invece di
     avvicinarsi fino a sovrapporsi a lui */
  let tx = t ? t.x : COMP.x, ty = t ? t.y : COMP.y;
  /* ANDANDO SU O GIÙ la scia mette il compagno in colonna con Digsy: una creatura alta (o una che
     vola, sollevata da terra) gli finiva sopra la testa o davanti al corpo ("ogni tanto si
     sovrappone", con foto). In verticale si segue la scia spostati di lato di mezza casella e
     poco più, dalla parte dove già si sta; se lì c'è un ostacolo si resta in colonna. */
  if (t && Math.abs(P.y - t.y) > Math.abs(P.x - t.x) * 1.5) {
    const side = COMP.x < P.x - 2 ? -1 : 1, sx2 = tx + side * 22;
    if (!compBlocked(sx2, ty)) tx = sx2;
    else if (!compBlocked(tx - side * 22, ty)) tx -= side * 22;
  }
  const dx = tx - COMP.x, dy = ty - COMP.y, d = Math.hypot(dx, dy);
  /* segue SEMPRE, con passo min(d, velocità): tocca il bersaglio senza scavalcarlo. La vecchia
     deadzone `d > 2` faceva stop-and-go attorno al bersaglio mentre il player camminava → la
     posizione oscillava e lo snap la faceva TREMARE. Ora è morbido (regola: niente tremolii).
     Più veloce quando resta indietro, così non perde la scia. */
  if (d > 0.01) {
    const sp = Math.min(d, (d > TS * 3 ? 180 : 90) * dt);
    const nx = COMP.x + dx / d * sp, ny = COMP.y + dy / d * sp;
    /* un passo che finirebbe in un solido non si fa (può succedere solo tagliando un angolo
       fra due punti della scia): si prova un asse per volta, altrimenti si resta */
    if (!compBlocked(nx, ny)) { COMP.x = nx; COMP.y = ny; }
    else if (!compBlocked(nx, COMP.y)) COMP.x = nx;
    else if (!compBlocked(COMP.x, ny)) COMP.y = ny;
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
/* ---------- la scia ---------- */
const trail = [];
const TRAIL_MAX = 80;
/* a che distanza (di cammino, non in linea d'aria) sta il compagno: poco più di una casella,
   così non si sovrappone a Digsy ma resta vicino */
export const FOLLOW_PX = 40;
export function resetCompanionTrail() { trail.length = 0; COMP.init = false; }
function trailPointBehind(dist) {
  let acc = 0;
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i], b = trail[i - 1];
    const seg = Math.hypot(a.x - b.x, a.y - b.y);
    if (acc + seg >= dist) {
      const k = (dist - acc) / seg;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    acc += seg;
  }
  return null;
}
/* dove il compagno NON può stare: solidi, porte (stare sulla soglia = dentro l'edificio
   disegnato) — ma l'ACQUA sì, ci nuota quando Digsy va in barca */
function compBlocked(x, y) {
  const tx = Math.floor(x / TS), ty = Math.floor((y + FOOT_DY) / TS);
  const t = baseTerrain(tx, ty);
  if ((t === DEEP || t === WATER) && !townInfo(tx, ty)) return false;
  if (houseDoorAt(tx, ty)) return true;
  const ti = townInfo(tx, ty); if (ti && ti.door) return true;
  /* nemmeno sullo SCALINO davanti alla porta: una creatura alta il doppio di una casella, ferma
     lì, si disegna sopra la facciata e sembra dentro la casa (visto nella foto di prova) */
  if (houseDoorAt(tx, ty - 1)) return true;
  const tu = townInfo(tx, ty - 1); if (tu && tu.door) return true;
  return isSolidTile(tx, ty);
}
/* una casella libera accanto a Digsy: prima dietro/ai lati, mai dentro un edificio */
function freeSpotNear(x, y) {
  const opz = [[0, 1], [-1, 0], [1, 0], [-1, 1], [1, 1], [0, -1], [-1, -1], [1, -1], [0, 2], [-2, 0], [2, 0]];
  for (const [ox, oy] of opz) {
    const cx = x + ox * TS, cy = y + oy * TS;
    if (!compBlocked(cx, cy)) return { x: cx, y: cy };
  }
  return { x, y };
}
/* spec per drawCreature: { c:{skull,torso,leg,q}, anim, dir, face } */
export function companionDrawObj() {
  const c = S.companion; if (!c) return null;
  return { c: { skull: c.skull, torso: c.torso, leg: c.leg, q: c.q }, anim: COMP.anim, dir: COMP.dir, face: COMP.face };
}
