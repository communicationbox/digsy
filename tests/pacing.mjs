/* RITMO DI GIOCO — quante ore reali servono per arrivare ai traguardi della collezione.
   `npm run pacing` (opzionale: `-- 40` giocatori simulati).

   Non gioca "a caso": usa le funzioni VERE del gioco per tutto quello che decide la fortuna
   (makeRaw coi pesi di rarità, pity timer e anti-doppione, livelli e XP, finestre di notte e
   stagione) e un modello di TEMPO dichiarato qui sotto per quello che nessun test può misurare
   (quanto si cammina fra uno scavo e l'altro, quanto si perde in viaggi e menu). I numeri del
   modello sono volutamente PRUDENTI: un giocatore vero è più lento, non più veloce.

   Serve a rispondere con una misura a "quante ore dura il gioco?", e a vedere dove la curva ha
   un muro (troppe ore senza un traguardo nuovo) o un buco (traguardi che arrivano tutti insieme). */
import { installStubs } from './stub.mjs';
installStubs();
const state = await import('../src/state.js');
state.initState();
const { S } = state;
const data = await import('../src/data.js');
const gp = await import('../src/gameplay.js');
const prog = await import('../src/progress.js');

const N = Math.max(1, +(process.argv[2] || 24));
/* ---- modello del tempo (secondi reali) ---- */
const WALK = 1.6;                 // spostarsi sulla casella successiva (le caselle si esauriscono)
const DIG = 0.5;                  // animazione di scavo a livello 1 (× digDurationMul)
const OVERHEAD = 0.30;            // viaggi al Museo, negozi, menu, cortile: 30% del tempo di gioco
const DAY_SEC = 1200;             // un giorno = 20 minuti
const FIND = 0.42;                // resa media per scavo fra i terreni (erba .30 · sabbia .62 · terra .52)
const ZONE_EVERY_H = 1.25;        // una zona nuova raggiunta ogni ~75 minuti di gioco
const TOOLS_AT_H = { albero: 1.0, roccia: 2.0, acqua: 3.5, grotta: 2.5 };   // accetta, piccone, barca, grotte

const ZONES = data.ZONE_LIST || data.ZONES;
const ALL = data.ALL_SPECIES;
const PIECES = ALL.length * data.PARTS.length;

function runOne(seed) {
  let rnd = seed * 9301 + 49297;
  const orig = Math.random;
  Math.random = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
  Object.assign(S, { museum: {}, codex: [], raw: [], items: [], pity: {}, level: 1, xp: 0, maxEnergy: 30, day: 1, tod: 0.25, awakened: [], dna: {}, amber: {}, amberDone: [] });
  const t = { sec: 0, digs: 0 };
  const hit = {};
  const mark = (k, cond) => { if (!hit[k] && cond) hit[k] = t.sec / 3600; };
  let coins = 0, earned = 0;
  while (t.sec < 3600 * 120) {
    const h = t.sec / 3600;
    /* energia: in teoria 6 dormite l'ora (mezza giornata sveglio), in pratica per dormire si torna alla
       Locanda o a casa: 3 dormite l'ora più un paio di ristori */
    const perDig = WALK + DIG * prog.digDurationMul(S.level);
    const energyPerHour = 3 * S.maxEnergy + 60;
    const digsPerHour = Math.min(3600 * (1 - OVERHEAD) / perDig, energyPerHour);
    const step = 3600 / digsPerHour;
    t.sec += step; t.digs++;
    S.day = 1 + Math.floor(t.sec / DAY_SEC); S.tod = (t.sec % DAY_SEC) / DAY_SEC;
    if (Math.random() > FIND) continue;
    const nz = Math.min(ZONES.length, 1 + Math.floor(h / ZONE_EVERY_H));
    let zone = ZONES[Math.floor(Math.random() * nz)].id;
    /* fonti: 70% terra, il resto dagli attrezzi che si hanno a quest'ora */
    const r = Math.random();
    let src = 'terra';
    if (r < 0.1 && h >= TOOLS_AT_H.albero) src = 'albero';
    else if (r < 0.2 && h >= TOOLS_AT_H.roccia) src = 'roccia';
    else if (r < 0.28 && h >= TOOLS_AT_H.acqua) src = 'acqua';
    else if (r < 0.36 && h >= TOOLS_AT_H.grotta) { zone = 'grotta'; src = 'grotta'; }
    const dist = 200 + h * 60;
    const raw = gp.makeRaw(zone, dist, null, zone === 'grotta' ? 'any' : src);
    if (!raw) continue;
    prog.addXp(prog.XP_BY_RAR[raw.q] || 4);
    if (raw.amber) {
      const am = S.amber[raw.s] || (S.amber[raw.s] = []);
      if (!am.includes(raw.t)) { am.push(raw.t); if (am.length === 5) S.amberDone.push(raw.s); } else { coins += raw.val; earned += raw.val; }
      mark('prima teca d\'ambra', S.amberDone.length > 0);
      mark('metà delle teche d\'ambra', S.amberDone.length >= ALL.length / 2);
      mark('tutte le teche d\'ambra', S.amberDone.length >= ALL.length);
      continue;
    }
    const have = S.museum[raw.s] || (S.museum[raw.s] = []);
    if (!S.codex.includes(raw.s)) S.codex.push(raw.s);
    if (!have.includes(raw.t)) have.push(raw.t); else { coins += raw.val; earned += raw.val; }
    if (have.length === 5 && !S.dna[raw.s]) S.dna[raw.s] = 1;
    /* il secondo flacone si compra al Museo appena ci sono le monete */
    for (const sp of Object.keys(S.dna)) {
      const cost = (data.DNA_COST || {})[data.spById[sp].r] || 100;
      if (!S.awakened.includes(sp) && S.dna[sp] === 1 && coins >= cost) { coins -= cost; S.awakened.push(sp); }
    }
    const pieces = Object.values(S.museum).reduce((a, p) => a + p.length, 0);
    const roomFull = z => (data.zonePools[z] || []).every(sp => (S.museum[sp.id] || []).length > 0);
    if (!hit._c5 && h >= 5) hit._c5 = earned;
    if (!hit._c10 && h >= 10) hit._c10 = earned;
    mark('primo reperto raro', raw.q === 'raro');
    mark('primo leggendario', raw.q === 'leggendario');
    mark('prima sala piena (lettera)', ZONES.some(z => roomFull(z.id)));
    mark('prima teca completa', Object.values(S.museum).some(p => p.length === 5));
    mark('primo risveglio', S.awakened.length > 0);
    mark('livello 10', S.level >= 10);
    mark('25% dei pezzi', pieces >= PIECES * 0.25);
    mark('metà dei pezzi', pieces >= PIECES * 0.5);
    mark('tutte le sale piene', ZONES.every(z => roomFull(z.id)) && roomFull('grotta'));
    mark('livello 20', S.level >= 20);
    mark('75% dei pezzi', pieces >= PIECES * 0.75);
    mark('metà delle specie risvegliate', S.awakened.length >= ALL.length / 2);
    mark('tutti i 330 pezzi', pieces >= PIECES);
    mark('tutte le specie risvegliate', S.awakened.length >= ALL.length);
    if (hit['tutte le specie risvegliate'] && hit['tutti i 330 pezzi'] && hit._c10 && hit["tutte le teche d'ambra"]) break;
  }
  Math.random = orig;
  return hit;
}

const runs = Array.from({ length: N }, (_, i) => runOne(i + 1));
const keys = ['primo reperto raro', 'prima sala piena (lettera)', 'prima teca completa', 'primo risveglio', 'primo leggendario', '25% dei pezzi',
  'livello 10', 'metà dei pezzi', 'tutte le sale piene', 'metà delle specie risvegliate', 'livello 20', '75% dei pezzi', 'tutti i 330 pezzi', 'tutte le specie risvegliate', "prima teca d'ambra", "metà delle teche d'ambra", "tutte le teche d'ambra"];
const med = a => { const s = a.filter(x => x != null).sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : null; };
const fmt = x => x == null ? '  —  ' : (x < 1 ? Math.round(x * 60) + ' min' : x.toFixed(1) + ' h');
console.log(`\nRITMO DI GIOCO — ${N} giocatori simulati (mediana · 10% più fortunato · 10% più sfortunato)\n`);
for (const k of keys) {
  const v = runs.map(r => r[k]).filter(x => x != null).sort((p, q) => p - q);
  const p10 = v[Math.floor(v.length * 0.1)], p90 = v[Math.floor(v.length * 0.9)] ?? v[v.length - 1];
  console.log('  ' + k.padEnd(34) + fmt(med(v)).padStart(8) + '   ' + fmt(p10).padStart(8) + ' – ' + fmt(p90).padEnd(8) + (v.length < N ? `  (${N - v.length} non ci arrivano in 120 h)` : ''));
}

console.log('\n  monete dai doppioni: ~' + Math.round(med(runs.map(r => r._c5)) / 5) + '/h nelle prime 5 ore · ~' + Math.round((med(runs.map(r => r._c10)) - med(runs.map(r => r._c5))) / 5) + '/h fra la 5ª e la 10ª');
