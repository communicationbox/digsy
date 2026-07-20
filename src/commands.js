/* Console comandi (tipo Minecraft): si apre col tasto \ .
   Due forme: `chiave=valore` (money, energy, day, goto) e comandi secchi
   (godmode, goddna, goditem, heal, help). Aggiungerne di nuovi qui. */
import { S, P, save, snapshotState, restoreState, setCheatLock, isCheatLock, dugSet } from './state.js';
import { FOOT_DY } from './body.js';
import { packExplored } from './packmap.js';
import { WONDERS } from './wonders.js';
import { allLetters } from './letters.js';
import { TIP_IDS } from './tips.js';
/* misura i frame VERI per 2 secondi e richiama con la media (serve al comando `stress`) */
function measureFps(cb) {
  if (typeof requestAnimationFrame !== 'function' || typeof performance === 'undefined') { cb(0); return; }
  let n = 0; const t0 = performance.now();
  const tick = () => {
    n++;
    if (performance.now() - t0 >= 2000) { cb(n / ((performance.now() - t0) / 1000)); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* moltiplicatore velocità runtime (comando speed=, non salvato) */
function setSpeed(n) { P.speedMul = Math.max(1, Math.min(20, n)); }

/* i cheat sono NON DISTRUTTIVI: al primo cheat si fa lo snapshot del salvataggio e si
   congela il save; `vanilla` ripristina lo snapshot e riprende i salvataggi. */
let cheatBackup = null;
function enterCheat() {
  if (isCheatLock()) return;
  cheatBackup = snapshotState(); setCheatLock(true);
  /* AVVISO FORTE: da qui in poi il gioco NON salva più. Senza questo avviso si gioca per
     ore e al primo refresh si torna al save pre-cheat (soldi/attrezzi "spariti"). */
  toast('⚠️ ' + tr('CHEAT attivi: il salvataggio è CONGELATO. Scrivi `vanilla` per tornare normale.',
                   'CHEATS on: saving is FROZEN. Type `vanilla` to go back to normal.'));
}
function exitCheat() {
  if (isCheatLock()) {
    if (cheatBackup) { restoreState(cheatBackup); P.x = S.px; P.y = S.py; } // ripristina anche la posizione
    cheatBackup = null; setCheatLock(false);
  }
  setDebug(false); P.speedMul = 1; P.fly = false; // via anche il volo di godmode
}
import { updateHUD, toast } from './ui.js';
import { tr, seasonName, partName, rarLabel } from './i18n.js';
import { seasonOf, SEASON_LEN, SEASONS } from './daynight.js';
import { TS, ZONES, SPECIES, ALL_SPECIES, MUSEUM_ZONES, PARTS, zonePools, THEMED_HAIR, THEMED_HAT, PREMIUM_HATS, spById, ptById, RAR } from './data.js';
import { isDebug, setDebug } from './debug.js';
import { vhash } from './noise.js';
import { ACHS } from './achievements.js';
import { debugSpawnAll } from './gameplay.js';
import { zoneAt } from './regions.js';
import { baseTerrain, walkableGround, townInfo, townForCell, openArea, TCELL, caveEntranceAt, siteForCell, SCELL, wreckForCell, WCELL, landmarkAt, LCELL } from './world.js';
import { enterCave } from './cave.js';
import { WEATHER_TYPES } from './weather.js';
import { playIntro } from './intro.js';

/* ---- helper contenuti ---- */
function giveAllDna() { for (const sp of ALL_SPECIES) S.dna[sp.id] = Math.max(S.dna[sp.id] || 0, 999); }
function giveAllItems() {
  for (const sp of ALL_SPECIES) {          // 60 di superficie + 6 di GROTTA
    if (!S.codex.includes(sp.id)) S.codex.push(sp.id);
    for (const pt of PARTS) S.items.push({ uid: S.uid++, s: sp.id, t: pt.id, q: sp.r, val: Math.max(2, Math.round(7 * ptById[pt.id].mult * RAR.find(r => r.id === sp.r).mult)) });
  }
  /* attrezzi, barca, mezzi, torcia, consumabili, mappe di ogni rarità */
  S.tools = { spade: true, axe: true, pick: true, boat: true, skates: true, bike: true, motorboat: true, torch: true };
  S.shovel = Math.max(S.shovel || 0, 999);
  S.snacks = Math.max(S.snacks || 0, 99);
  S.teleports = Math.max(S.teleports || 0, 99);
  for (const rar of ['raro', 'eccezionale', 'leggendario']) S.maps.push({ x: Math.floor(P.x / TS) + 50, y: Math.floor(P.y / TS), rar, uid: S.uid++ });
}
function unlockAllCosmetics() { S.unlocked.hats = [...THEMED_HAT, ...PREMIUM_HATS.map(h => h.id)]; S.unlocked.hairs = [...THEMED_HAIR]; }
/* "tutto" vuol dire TUTTO: le 7 ali del museo (grotte comprese), le meraviglie scoperte con
   i loro archi, e le lettere del nonno che spettano alle sale piene. */
function completeMuseumAndBook() {
  for (const z of MUSEUM_ZONES) {
    S.book[z.id] = true;
    for (const sp of zonePools[z.id]) {
      S.museum[sp.id] = PARTS.map(p => p.id);
      if (!S.donated.includes(sp.id)) S.donated.push(sp.id);
      if (!S.awakened.includes(sp.id)) S.awakened.push(sp.id);
      if (!S.codex.includes(sp.id)) S.codex.push(sp.id);
    }
  }
  if (!S.caves) S.caves = {}; S.caves.god = true;        // l'ala delle grotte risulta visitata
  S.wonders = Object.keys(WONDERS);                       // tutte le meraviglie scoperte
  S.letters = allLetters();                               // tutte le lettere già consegnate
  S.tips = Object.fromEntries(TIP_IDS.map(id => [id, 1])); // guida già letta: niente pop-up
}

/* teletrasporto: prima tile CAMMINABILE del bioma `zid`, cercata a spirale attorno al player */
function teleportToZone(zid) {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  for (let r = 0; r <= 900; r += 2) {
    for (let a = -r; a <= r; a += 2) {
      for (const [x, y] of [[ptx + a, pty - r], [ptx + a, pty + r], [ptx - r, pty + a], [ptx + r, pty + a]]) {
        if (zoneAt(x, y).id !== zid) continue;
        if (!walkableGround(baseTerrain(x, y)) || townInfo(x, y)) continue;
        if (!openArea(x, y)) continue;
        P.x = x * TS + 8; P.y = y * TS + 2; return true;
      }
    }
  }
  return false;
}
/* imbocco di grotta più vicino al player (a spirale sulle montagne) */
function findCaveEntrance() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  for (let r = 0; r <= 700; r += 2) for (let a = -r; a <= r; a += 2) {
    for (const [x, y] of [[ptx + a, pty - r], [ptx + a, pty + r], [ptx - r, pty + a], [ptx + r, pty + a]]) {
      if (caveEntranceAt(x, y)) return [x, y];
    }
  }
  return null;
}
/* città GRANDE (col parco) più vicina al player */
function teleportToCity() {
  const ccx = Math.floor(P.x / (TS * TCELL)), ccy = Math.floor(P.y / (TS * TCELL));
  for (let r = 0; r <= 24; r++) {
    for (let cy = ccy - r; cy <= ccy + r; cy++) for (let cx = ccx - r; cx <= ccx + r; cx++) {
      if (Math.max(Math.abs(cx - ccx), Math.abs(cy - ccy)) !== r) continue;
      const t = townForCell(cx, cy);
      if (t && t.pen) {
        const sx = t.C.x;
        for (let yy = t.C.y + 4; yy < t.C.y + 10; yy++) if (openArea(sx, yy)) { P.x = sx * TS + 8; P.y = yy * TS + 2; return t.name; }
      }
    }
  }
  return null;
}

/* teletrasporto al SITO di scavo più vicino (ci si mette adiacente, tile libera) */
function teleportToSite() {
  const ccx = Math.floor(P.x / (TS * SCELL)), ccy = Math.floor(P.y / (TS * SCELL));
  for (let r = 0; r <= 24; r++) for (let cy = ccy - r; cy <= ccy + r; cy++) for (let cx = ccx - r; cx <= ccx + r; cx++) {
    if (Math.max(Math.abs(cx - ccx), Math.abs(cy - ccy)) !== r) continue;
    const s = siteForCell(cx, cy); if (!s) continue;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (walkableGround(baseTerrain(s.x + dx, s.y + dy)) && !townInfo(s.x + dx, s.y + dy)) { P.x = (s.x + dx) * TS + 8; P.y = (s.y + dy) * TS + 2; return true; }
  }
  return false;
}
/* teletrasporto al RELITTO più vicino (attiva la barca e ti mette sull'acqua accanto) */
function teleportToWreck() {
  const ccx = Math.floor(P.x / (TS * WCELL)), ccy = Math.floor(P.y / (TS * WCELL));
  for (let r = 0; r <= 24; r++) for (let cy = ccy - r; cy <= ccy + r; cy++) for (let cx = ccx - r; cx <= ccx + r; cx++) {
    if (Math.max(Math.abs(cx - ccx), Math.abs(cy - ccy)) !== r) continue;
    const w = wreckForCell(cx, cy); if (!w) continue;
    if (!S.tools) S.tools = {}; S.tools.boat = true; S.gear = 'boat';
    P.x = (w.x + 1) * TS + 8; P.y = (w.y) * TS + 2; return true;
  }
  return false;
}
/* teletrasporto al LANDMARK più vicino NON ancora visitato (cicla su tutti, non sempre lo stesso) */
const landmarkSeen = new Set();
function teleportToLandmark() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  for (let r = 1; r <= LCELL * 8; r += 2) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = ptx + dx, y = pty + dy, t = landmarkAt(x, y);
    if (t) { const k = x + ',' + y; if (landmarkSeen.has(k)) continue; landmarkSeen.add(k); P.x = x * TS + 8; P.y = (y + 1) * TS + 2; return t; }
  }
  landmarkSeen.clear(); // visti tutti qui intorno → ricomincia il giro al prossimo uso
  return null;
}

/* TOUR: salta alla "cosa speciale" più vicina NON ancora visitata (landmark, grotta,
   sito di scavo, relitto). Ogni chiamata segna quella come vista → il press successivo
   porta alla prossima. `toured` è per-sessione (comodo per provare il gioco). */
const toured = new Set();
function tourNext() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  for (let r = 0; r <= 600; r += 2) {
    for (let a = -r; a <= r; a += 2) {
      for (const [x, y] of [[ptx + a, pty - r], [ptx + a, pty + r], [ptx - r, pty + a], [ptx + r, pty + a]]) {
        const lm = landmarkAt(x, y);
        if (lm) { const k = 'L' + x + ',' + y; if (!toured.has(k)) { toured.add(k); P.x = x * TS + 8; P.y = (y + 1) * TS + 2; return '🗿 ' + lm; } }
        if (caveEntranceAt(x, y)) { const k = 'C' + x + ',' + y; if (!toured.has(k)) { toured.add(k); P.x = x * TS + 8; P.y = (y + 1) * TS + 10; enterCave((x + y) | 0, x, y); return '🕳️ ' + tr('Grotta', 'Cave'); } }
        const scx = Math.floor(x / SCELL), scy = Math.floor(y / SCELL), s = siteForCell(scx, scy);
        if (s) { const k = 'S' + scx + ',' + scy; if (!toured.has(k)) { for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (walkableGround(baseTerrain(s.x + dx, s.y + dy)) && !townInfo(s.x + dx, s.y + dy)) { toured.add(k); P.x = (s.x + dx) * TS + 8; P.y = (s.y + dy) * TS + 2; return '⛏️ ' + tr('Sito di scavo', 'Dig site'); } } }
        const wcx = Math.floor(x / WCELL), wcy = Math.floor(y / WCELL), w = wreckForCell(wcx, wcy);
        if (w) { const k = 'W' + wcx + ',' + wcy; if (!toured.has(k)) { toured.add(k); if (!S.tools) S.tools = {}; S.tools.boat = true; S.gear = 'boat'; P.x = (w.x + 1) * TS + 8; P.y = w.y * TS + 2; return '🚢 ' + tr('Relitto (E per frugare)', 'Wreck (E to search)'); } }
      }
    }
  }
  return null;
}

export const COMMANDS = {
  money: { aliases: ['coins', 'monete'], type: 'num', cheat: true, help: 'money=40 — imposta le monete',
    run: v => { S.coins = Math.max(0, v); return '🪙 ' + tr('Monete: ', 'Coins: ') + S.coins; } },
  energy: { aliases: ['en', 'energia'], type: 'num', cheat: true, help: 'energy=40 — imposta l\'energia',
    run: v => { v = Math.max(0, v); S.maxEnergy = Math.max(S.maxEnergy, v); S.energy = v; return '⚡ ' + tr('Energia: ', 'Energy: ') + S.energy + '/' + S.maxEnergy; } },
  day: { type: 'num', cheat: true, help: 'day=10 — imposta il giorno',
    run: v => { S.day = Math.max(1, v); return '📅 ' + tr('Giorno ', 'Day ') + S.day; } },
  season: { type: 'str', help: 'season=inverno — cambia stagione (primavera/estate/autunno/inverno o 0-3)',
    suggest: p => ['primavera', 'estate', 'autunno', 'inverno'].filter(s => s.startsWith(p)),
    run: v => {
      const names = ['primavera', 'estate', 'autunno', 'inverno'];
      let idx = names.indexOf(v); if (idx < 0 && /^[0-3]$/.test(v)) idx = +v;
      if (idx < 0) return tr('Stagioni: primavera, estate, autunno, inverno (0-3)', 'Seasons: spring, summer, autumn, winter (0-3)');
      let nd = S.day + (idx - seasonOf(S.day)) * SEASON_LEN;
      while (nd < 1) nd += 4 * SEASON_LEN;
      S.day = nd;
      return SEASONS[idx].icon + ' ' + seasonName(idx);
    } },
  speed: { type: 'num', cheat: true, help: 'speed=5 — velocità di movimento (1–20)',
    run: v => { setSpeed(v); return '🏃 ' + tr('Velocità ×', 'Speed ×') + P.speedMul; } },
  godmode: { aliases: ['god'], type: 'action', cheat: true, help: 'godmode — sblocca e completa tutto (goditem+goddna), infinito, ×5, volo',
    run: () => { setDebug(true); setSpeed(5); giveAllItems(); giveAllDna(); unlockAllCosmetics(); completeMuseumAndBook(); P.fly = true; return '🐞 ' + tr('GODMODE: tutto sbloccato, infinito, ×5, volo', 'GODMODE: all unlocked, infinite, ×5, fly'); } },
  godletters: { aliases: ['letters', 'lettere'], type: 'action', cheat: true,
    help: 'godletters — sblocca tutte le lettere del nonno (finale compreso)',
    run: () => {
      S.letters = allLetters();
      return '✉ ' + tr('Tutte le lettere del nonno sbloccate (', "All of Grandpa's letters unlocked (") + S.letters.length + ') — ' + tr('zaino → Lettere', 'bag → Letters');
    } },
  goddna: { type: 'action', cheat: true, help: 'goddna — DNA di tutte le specie, infinito',
    run: () => { giveAllDna(); return '🧬 ' + tr('DNA infinito per tutte le specie', 'Infinite DNA for all species'); } },
  goditem: { type: 'action', cheat: true, help: 'goditem — ogni pezzo di ogni specie, identificato',
    run: () => { giveAllItems(); return '🦴 ' + tr('Tutti i fossili nello zaino', 'All fossils in your bag'); } },
  /* STRESS: carica il gioco per DAVVERO, sul dispositivo che si ha in mano. Serve a vedere
     i cali di frame veri, non quelli stimati su una macchina da sviluppo.
     `stress` = livello medio · `stress=3` = livello scelto (1-5). */
  stress: { type: 'both', cheat: true, help: 'stress=1..5 — riempie il gioco (creature, mappa, scavi) e misura i frame',
    run: (v) => {
      const lv = Math.max(1, Math.min(5, Number(v) || 2));
      const N = [0, 50, 200, 600, 1500, 4000][lv];
      const CHUNKS = [0, 2e3, 2e4, 1e5, 4e5, 1e6][lv];
      /* creature nel parco: la chimera è finta ma il modello 3D è quello vero */
      const pool = ALL_SPECIES.map(sp => sp.id);
      S.creatures = Array.from({ length: N }, (_, i) => ({
        uid: 900000 + i, name: 'Stress' + i, q: 'comune',
        skull: pool[i % pool.length], torso: pool[(i * 7) % pool.length], leg: pool[(i * 13) % pool.length],
      }));
      /* mappa esplorata: blocchi contigui attorno al giocatore, come una vera camminata */
      if (!S.explored) S.explored = {};
      const cx0 = Math.floor(P.x / TS / 8), cy0 = Math.floor(P.y / TS / 8);
      const side = Math.ceil(Math.sqrt(CHUNKS)), half = Math.floor(side / 2);
      /* half INTERO: con `side/2` frazionario il troncamento faceva collassare due colonne
         in una e i blocchi generati erano meno di quelli dichiarati */
      for (let i = 0; i < CHUNKS; i++) S.explored[(cx0 + (i % side) - half) + ',' + (cy0 + Math.floor(i / side) - half)] = 1;
      /* caselle scavate: la lista che cresce e non si svuota mai */
      for (let i = 0; i < CHUNKS; i++) { const k = (cx0 + (i % 500)) + ',' + (cy0 + Math.floor(i / 500)); dugSet.add(k); }
      const bytes = JSON.stringify({ ...S, explored: packExplored(S.explored), dug: [...dugSet] }).length;
      measureFps(fps => {
        toast('🐞 ' + tr('Frame misurati: ', 'Measured frames: ') + fps.toFixed(0) + ' fps');
      });
      return '🐞 ' + tr('Stress livello ', 'Stress level ') + lv + ': ' + N + tr(' creature · ', ' creatures · ')
        + CHUNKS.toLocaleString() + tr(' blocchi di mappa · ', ' map blocks · ') + dugSet.size.toLocaleString() + tr(' scavi', ' digs')
        + '\n' + tr('salvataggio compresso: ', 'compressed save: ') + (bytes / 1048576).toFixed(2) + ' MB'
        + '\n' + tr('vai in un parco di città per vedere le creature · `vanilla` per tornare normale',
                    'go to a city park to see the creatures · `vanilla` to go back to normal');
    } },
  /* apre il TAVOLO DI PREPARAZIONE senza dover cercare un museo e avere il pezzo giusto:
     serve a provare (e a mostrare) il minigioco in due secondi. Se non hai un reperto adatto
     te ne mette uno finto in mano — il bonus finisce comunque su quel pezzo. */
  prep: { aliases: ['minigioco', 'minigame', 'tavolo'], type: 'both', cheat: true,
    help: 'prep[=raro|eccezionale|leggendario] — apre il tavolo di preparazione',
    run: (v) => {
      const rar = ['raro', 'eccezionale', 'leggendario'].includes(String(v)) ? String(v) : 'eccezionale';
      if (!S.raw) S.raw = [];
      let cand = S.raw.find(it => it.prep == null && ['raro', 'eccezionale', 'leggendario'].includes(it.q));
      if (!cand) {
        const sp = ALL_SPECIES[Math.floor(Math.random() * ALL_SPECIES.length)];
        const part = PARTS[Math.floor(Math.random() * PARTS.length)];
        cand = { uid: S.uid++, s: sp.id, t: part.id, q: rar,
          val: Math.max(2, Math.round(7 * ptById[part.id].mult * RAR.find(r => r.id === rar).mult)) };
        S.raw.push(cand);
      }
      const before = cand.val;
      import('./ui.js').then(u => u.openPrepare(cand, () => {
        toast('🪶 ' + tr('Valore: ', 'Value: ') + before + ' → ' + cand.val + ' 🪙');
      }));
      return '🪶 ' + tr('Tavolo di preparazione: spazzola il reperto trascinando il dito (o il mouse).',
                        'Preparation table: brush the find by dragging your finger (or the mouse).')
        + '\n' + tr('In gioco si apre al MUSEO, su UN pezzo per consegna e solo da raro in su.',
                    'In game it opens at the MUSEUM, on ONE piece per hand-in and only from rare upwards.');
    } },
  /* MINIGIOCO fontana (#3): lo apre ovunque, per provarlo senza cercare una città */
  toss: { aliases: ['fontana', 'fountain'], type: 'action', cheat: true, help: 'toss — apre il minigioco della fontana (mira)',
    run: () => {
      Promise.all([import('./ui.js'), import('./gameplay.js')]).then(([u, g]) => { if (u.openToss) u.openToss(luck => g.grantToss(luck)); });
      return '⛲ ' + tr('Fontana: ferma il cursore sulla zona d\'oro', 'Fountain: stop the marker on the golden zone');
    } },
  /* doppioni pronti da fondere: serve a provare la fusione senza scavare per mezz'ora */
  dupes: { aliases: ['doppioni', 'fuse', 'fondi'], type: 'both', cheat: true,
    help: 'dupes[=comune|raro|eccezionale] — 3 pezzi uguali per provare la fusione',
    run: (v) => {
      const rar = ['comune', 'raro', 'eccezionale'].includes(String(v)) ? String(v) : 'comune';
      const zid = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS)).id;
      const pool = (zonePools[zid] || zonePools.prati).filter(sp => sp.r === rar);
      const sp = pool[Math.floor(vhash(S.day, S.uid, 313) * pool.length)] || pool[0];
      if (!sp) return tr('Niente specie di quella rarità qui', 'No species of that rarity here');
      const part = PARTS[Math.floor(vhash(S.uid, S.day, 314) * PARTS.length)];
      const val = Math.max(2, Math.round(7 * ptById[part.id].mult * RAR.find(r => r.id === sp.r).mult));
      for (let i = 0; i < 3; i++) S.items.push({ uid: S.uid++, s: sp.id, t: part.id, q: sp.r, val });
      if (!S.codex.includes(sp.id)) S.codex.push(sp.id);
      return '⚗️ ' + tr('3 × ', '3 × ') + partName(part.id) + ' ' + tr('di', 'of') + ' ' + sp.name
        + ' (' + rarLabel(sp.r) + ') — ' + tr('vai al Laboratorio e premi «Fondi 3»', 'go to the Laboratory and press «Fuse 3»');
    } },
  heal: { type: 'action', cheat: true, help: 'heal — energia al massimo',
    run: () => { S.energy = S.maxEnergy; return '⚡ ' + tr('Energia piena', 'Full energy'); } },
  /* NOTTE/ALBA: per provare le LUCCIOLE (#5), che compaiono solo di notte, all'aperto */
  night: { aliases: ['notte'], type: 'action', cheat: true, help: 'night — notte fonda (per le lucciole)',
    run: () => { S.tod = 0.85; return tr('Notte fonda — esci all\'aperto e cammina fra le lucciole', 'Deep night — go outdoors and walk among the fireflies'); } },
  dawn: { aliases: ['alba'], type: 'action', cheat: true, help: 'dawn — riporta all\'alba',
    run: () => { S.tod = 0.05; return tr('Alba', 'Dawn'); } },
  goto: { type: 'str', help: 'goto=palude — vai al bioma, alla grotta o alla città (goto=city)', suggest: p => ['grotta', 'city', ...ZONES.map(z => z.id)].filter(id => id.startsWith(p)),
    run: v => {
      if (v === 'grotta' || v === 'cave') {
        const e = findCaveEntrance();                 // porta a un imbocco VERO → all'uscita ci torni
        if (e) { P.x = e[0] * TS + 8; P.y = (e[1] + 1) * TS + 10; enterCave((e[0] + e[1]) | 0, e[0], e[1]); }
        else enterCave((P.x / TS + P.y / TS) | 0, Math.floor(P.x / TS), Math.floor((P.y + FOOT_DY) / TS));
        return '🕳️ ' + tr('Grotta', 'Cave');
      }
      if (v === 'city' || v === 'città' || v === 'citta') {
        const n = teleportToCity(); return n ? '🏛️ ' + n : tr('Nessuna città grande trovata', 'No big city found');
      }
      const z = ZONES.find(z => z.id === v || z.name.toLowerCase() === v);
      if (!z) return tr('Mete: ', 'Targets: ') + ['grotta', 'city', ...ZONES.map(z => z.id)].join(', ');
      return teleportToZone(z.id) ? '🌍 ' + z.name : tr('Bioma non trovato vicino', 'Biome not found nearby');
    } },
  gotosite: { type: 'action', help: 'gotosite — vai al sito di scavo più vicino',
    run: () => teleportToSite() ? '⛏️ ' + tr('Sito di scavo', 'Dig site') : tr('Nessun sito trovato vicino', 'No site found nearby') },
  gotowreck: { type: 'action', help: 'gotowreck — vai al relitto in mare più vicino (attiva la barca)',
    run: () => teleportToWreck() ? '🚢 ' + tr('Relitto (E per frugare)', 'Wreck (E to search)') : tr('Nessun relitto trovato vicino', 'No wreck found nearby') },
  gotolandmark: { aliases: ['goland'], type: 'action', help: 'gotolandmark — vai al landmark più vicino',
    run: () => { const t = teleportToLandmark(); return t ? '🗿 ' + t : tr('Nessun landmark trovato vicino', 'No landmark found nearby'); } },
  tour: { aliases: ['explore', 'esplora'], type: 'action', help: 'tour — vai alla prossima cosa speciale NON ancora vista (landmark/grotta/sito/relitto)',
    run: () => { const m = tourNext(); if (m) return m; toured.clear(); return '🧭 ' + tr('Hai visitato tutto qui intorno — riparto da capo, ripeti tour', 'Seen everything around — reset, run tour again'); } },
  intro: { aliases: ['storia', 'story'], type: 'action', help: 'intro — rivedi il filmato introduttivo (nonno + bimbo)',
    run: () => { playIntro(() => {}); return '📖 ' + tr('Riparte l\'intro…', 'Replaying intro…'); } },
  achall: { aliases: ['achievements', 'traguardi'], type: 'action', help: 'achall — completa tutti i traguardi',
    run: () => { S.achieved = ACHS.map(a => a.id); return '🏆 ' + tr('Tutti i traguardi sbloccati!', 'All achievements unlocked!'); } },
  weather: { aliases: ['meteo'], type: 'str', help: 'weather=pioggia — forza il meteo (pioggia/sabbia/nebbia/cenere/neve/sereno/off)',
    suggest: p => ['pioggia', 'sabbia', 'nebbia', 'cenere', 'neve', 'sereno', 'off'].filter(s => s.startsWith(p)),
    run: v => {
      if (v === 'off' || v === 'auto') { S.weatherOverride = null; return '🌦️ ' + tr('meteo automatico', 'auto weather'); }
      const map = { pioggia: 'rain', sabbia: 'sandstorm', nebbia: 'fog', cenere: 'ash', neve: 'snow', sereno: 'clear' };
      const w = map[v] || (WEATHER_TYPES.includes(v) ? v : null);
      if (!w) return tr('meteo: pioggia/sabbia/nebbia/cenere/neve/sereno/off', 'weather: rain/sandstorm/fog/ash/snow/clear/off');
      S.weatherOverride = w; return '🌦️ ' + w;
    } },
  fly: { type: 'action', cheat: true, help: 'fly — attraversa gli ostacoli (on/off)',
    run: () => { P.fly = !P.fly; return (P.fly ? '🕊 ' + tr('Volo ON', 'Fly ON') : tr('Volo OFF', 'Fly OFF')); } },
  vanilla: { aliases: ['reset', 'ungod'], type: 'action', help: 'vanilla — togli i cheat e ripristina il salvataggio',
    run: () => { exitCheat(); return '✅ ' + tr('Vanilla: cheat rimossi, salvataggio ripristinato', 'Vanilla: cheats removed, save restored'); } },
  help: { type: 'action', help: 'help — elenco comandi',
    run: () => tr('Comandi disponibili:\n', 'Available commands:\n') + commandHelp().map(t => '  ' + t).join('\n') },
};

/* l'elenco dei comandi, usato sia da `help` sia dalla pagina Comandi del menu: un posto
   solo, così non possono divergere. IN ORDINE ALFABETICO: sono una trentina, e cercarne
   uno in un elenco disordinato è una piccola tortura. */
export function commandHelp() {
  return Object.values(COMMANDS).map(c => c.help)
    .sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}

const INDEX = {};
for (const [name, c] of Object.entries(COMMANDS)) { INDEX[name] = c; c._name = name; for (const a of c.aliases || []) INDEX[a] = c; }

export function runCommand(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  const eq = s.match(/^(\w+)\s*=\s*(.+?)\s*$/);
  let cmd, val;
  if (eq) {
    cmd = INDEX[eq[1].toLowerCase()]; val = eq[2];
    if (!cmd) return tr('Comando sconosciuto: ', 'Unknown command: ') + s;
    if (cmd.type === 'action') return tr('Usa: ', 'Use: ') + cmd.help;
    if (cmd.type === 'num') { if (!/^-?\d+$/.test(val)) return tr('Valore numerico atteso', 'Number expected'); val = parseInt(val, 10); }
    else val = val.toLowerCase();
  } else {
    cmd = INDEX[s.toLowerCase()];
    if (!cmd) return tr('Comando sconosciuto: ', 'Unknown command: ') + s;
    /* 'both' = si può dare secco o con un valore (`stress` e `stress=3` sono entrambi validi) */
    if (cmd.type !== 'action' && cmd.type !== 'both') return tr('Usa: ', 'Use: ') + cmd.help;
  }
  if (cmd.cheat) enterCheat();        // primo cheat: snapshot + congela il save (non distruttivo)
  const msg = cmd.run(val);
  save(); updateHUD();                 // save() è no-op mentre i cheat sono attivi
  return msg;
}

/* suggerimenti per l'autocompletamento della console (es. `goto=pal` → goto=palude) */
export function suggest(raw) {
  const s = (raw || '').trim(); if (!s) return Object.keys(COMMANDS).map(k => COMMANDS[k].type === 'action' ? k : k + '=');
  const eq = s.match(/^(\w+)\s*=\s*(.*)$/);
  if (eq) { const cmd = INDEX[eq[1].toLowerCase()]; if (cmd && cmd.suggest) return cmd.suggest(eq[2].toLowerCase()).map(v => cmd._name + '=' + v); return []; }
  return Object.keys(INDEX).filter(k => k.startsWith(s.toLowerCase())).map(k => INDEX[k].type === 'action' ? k : k + '=');
}
