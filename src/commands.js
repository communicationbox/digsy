/* Console comandi (tipo Minecraft): si apre col tasto \ .
   Due forme: `chiave=valore` (money, energy, day, goto) e comandi secchi
   (godmode, goddna, goditem, heal, help). Aggiungerne di nuovi qui. */
import { S, P, save, restoreState, setCheatLock, isCheatLock, dugSet, stashCheatSnapshot, readCheatSnapshot, clearCheatSnapshot } from './state.js';
import { FOOT_DY } from './body.js';
import { packExplored, resetExploredPack, packDug, resetDugPack } from './packmap.js';
import { WONDERS } from './wonders.js';
import { allLetters } from './letters.js';
import { TIP_IDS } from './tips.js';
import * as breed from './breeding.js';
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

/* i comandi cheat sono ANNULLABILI ma NON congelano più il save: al primo cheat si fa lo snapshot
   pre-cheat (PERSISTITO in localStorage) e si accende il tag; da lì tutto si salva normalmente, così
   testare non fa perdere i progressi al refresh. `vanilla` ripristina lo snapshot (anche dopo un
   refresh, perché è persistito) e torna alla partita normale. */
function enterCheat() {
  if (isCheatLock()) return;
  stashCheatSnapshot();               // snapshot pre-cheat PERSISTITO (solo la prima volta)
  setCheatLock(true);
  toast('🐞 ' + tr('Cheat attivi · `vanilla` per tornare com\'era', 'Cheats on · `vanilla` to undo'));
}
function exitCheat() {
  const snap = readCheatSnapshot();
  if (snap) { restoreState(snap); P.x = S.px; P.y = S.py; }   // ripristina stato + posizione pre-cheat
  clearCheatSnapshot(); setCheatLock(false);
  setDebug(false); P.speedMul = 1; P.fly = false;             // via anche il volo di godmode
  save();                                                     // persisti la partita ripristinata
}
import { updateHUD, toast } from './ui.js';
import { tr, seasonName, partName, rarLabel } from './i18n.js';
import { seasonOf, SEASON_LEN, SEASONS } from './daynight.js';
import { TS, ZONES, SPECIES, ALL_SPECIES, MUSEUM_ZONES, PARTS, zonePools, THEMED_HAIR, THEMED_HAT, PREMIUM_HATS, spById, ptById, RAR, CAVE_POOL, FURN_BY_ID } from './data.js';
import { isDebug, setDebug } from './debug.js';
import { vhash } from './noise.js';
import { TRACKS, TROPHY_HATS } from './achievements.js';
import { debugSpawnAll, chimeraName, companionRides, isMounted, toggleMount, companionGathers } from './gameplay.js';
import { setCompanion, COMP } from './companion.js';
import { zoneAt } from './regions.js';
import { baseTerrain, walkableGround, townInfo, townForCell, openArea, TCELL, caveEntranceAt, siteForCell, SCELL, wreckForCell, WCELL, landmarkAt, LCELL, boneSiteForCell, BCELL, isSolidTile, yardRect, hasMuseum } from './world.js';
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
function unlockAllCosmetics() { S.unlocked.hats = [...THEMED_HAT, ...PREMIUM_HATS.map(h => h.id), ...TROPHY_HATS]; S.unlocked.hairs = [...THEMED_HAIR]; S.glitterHats = [...TROPHY_HATS]; }
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

/* compagno di prova: una specie della FONTE `type` (grotta = specie di grotta), risvegliata
   così è un candidato legittimo del parco, scelta come compagno con la rarità voluta.
   Serve a provare i poteri (per tipo/rarità), il raccoglitore leggendario e la cavalcatura. */
function spawnCompanion(type, rar) {
  const pool = type === 'grotta' ? CAVE_POOL : ALL_SPECIES.filter(s => (s.src || 'terra') === type);
  const sp = pool.find(s => s.r === rar) || pool[0];   // la specie GIUSTA per rarità (grotta+legg = Abissodonte)
  if (!sp) return null;
  if (!S.codex.includes(sp.id)) S.codex.push(sp.id);
  if (!S.awakened.includes(sp.id)) S.awakened.push(sp.id);
  setCompanion({ skull: sp.id, torso: sp.id, leg: sp.id, q: rar, key: 'sp' + sp.id, name: sp.name });
  return sp;
}

/* teletrasporto DENTRO il bioma `zid`, cercato a spirale attorno al player.
 *
 * "Dentro" e non "la prima tile utile": cercando a spirale la prima tile che risponde è per
 * forza sul CONFINE, e chi chiedeva `goto=ghiacci` si ritrovava con mezzo schermo di ghiaccio e
 * mezzo del bioma da cui veniva — inutile sia per provare il bioma sia per fotografarlo. Si
 * pretende quindi che anche i quattro punti a 8 tile di distanza siano dello stesso bioma; se
 * in tutta la spirale non ne esce uno, si ripiega sulla prima tile buona (meglio il confine che
 * niente: un bioma può essere una lingua stretta). */
function teleportToZone(zid) {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  const ok = (x, y) => zoneAt(x, y).id === zid && walkableGround(baseTerrain(x, y)) && !townInfo(x, y) && openArea(x, y);
  const dentro = (x, y) => [[8, 0], [-8, 0], [0, 8], [0, -8]].every(([dx, dy]) => zoneAt(x + dx, y + dy).id === zid);
  let ripiego = null;
  for (let r = 0; r <= 900; r += 2) {
    for (let a = -r; a <= r; a += 2) {
      for (const [x, y] of [[ptx + a, pty - r], [ptx + a, pty + r], [ptx - r, pty + a], [ptx + r, pty + a]]) {
        if (!ok(x, y)) continue;
        if (!ripiego) ripiego = [x, y];
        if (!dentro(x, y)) continue;
        P.x = x * TS + 8; P.y = y * TS + 2; return true;
      }
    }
  }
  if (ripiego) { P.x = ripiego[0] * TS + 8; P.y = ripiego[1] * TS + 2; return true; }
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
/* città GRANDE (col Museo) più vicina al player */
function teleportToCity() {
  const ccx = Math.floor(P.x / (TS * TCELL)), ccy = Math.floor(P.y / (TS * TCELL));
  for (let r = 0; r <= 24; r++) {
    for (let cy = ccy - r; cy <= ccy + r; cy++) for (let cx = ccx - r; cx <= ccx + r; cx++) {
      if (Math.max(Math.abs(cx - ccx), Math.abs(cy - ccy)) !== r) continue;
      const t = townForCell(cx, cy);
      if (t && hasMuseum(t)) {
        const sx = t.C.x;
        for (let yy = t.C.y + 4; yy <= t.y1; yy++) if (openArea(sx, yy)) { P.x = sx * TS + 8; P.y = yy * TS + 2; return t.name; }
      }
    }
  }
  return null;
}

/* teletrasporto DENTRO il cortile recintato di casa (M5: non più il parco per città — ce
   n'è uno solo, a casa). `goto=city` lascia sulla piazza, e il posto dove il gioco promette
   che "tornano a vivere" era irraggiungibile di proposito, né per provarlo né per fotografarlo. */
function teleportToPark() {
  const p = yardRect(); if (!p) return null;
  // il centro del rettangolo ora è la CASA (M6, il cortile la circonda): si finisce sul
  // prato aperto a sud, fra la porta e il cancello, dove si vede il cortile intero
  const mx = p.cx, my = p.y1 - 1;
  P.x = mx * TS + 8; P.y = my * TS + 2;
  return 'home';
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
/* punto libero adiacente a (x,y): NON basta il terreno giusto, la casella non deve essere
   SOLIDA — con 5 parti impacchettate vicine (corno e cranio distano UNA casella) un vicino
   di una parte è spesso un'ALTRA parte dello stesso scheletro, e lì si finiva TELETRASPORTATI
   DENTRO un monticello solido: bloccati, non un passo possibile (segnalato). */
function freeSpotNear(x, y) {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (walkableGround(baseTerrain(nx, ny)) && !townInfo(nx, ny) && !isSolidTile(nx, ny)) return { x: nx, y: ny };
  }
  return null;
}
/* teletrasporto allo SCHELETRO SEPOLTO più vicino (adiacente a una parte QUALSIASI: se quella
   più vicina è circondata dalle altre 4, si prova la successiva) */
function teleportToBoneSite() {
  const ccx = Math.floor(P.x / (TS * BCELL)), ccy = Math.floor(P.y / (TS * BCELL));
  for (let r = 0; r <= 24; r++) for (let cy = ccy - r; cy <= ccy + r; cy++) for (let cx = ccx - r; cx <= ccx + r; cx++) {
    if (Math.max(Math.abs(cx - ccx), Math.abs(cy - ccy)) !== r) continue;
    const s = boneSiteForCell(cx, cy); if (!s) continue;
    for (const part in s.parts) {
      const spot = freeSpotNear(s.parts[part].x, s.parts[part].y);
      if (spot) { P.x = spot.x * TS + 8; P.y = spot.y * TS + 2; return s; }
    }
  }
  return null;
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
/* `go=wonder` porta sempre a una meraviglia NUOVA: prima quelle di un tipo che non è ancora
   nel Libro (S.wonders), e solo quando il Libro è pieno si ricomincia il giro per posizione.
   Prima saltava alla più vicina mai visitata in questa sessione, quindi rimandava per mezz'ora
   sulle stesse tre che si avevano già. */
function teleportToLandmark() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  const viste = new Set(S.wonders || []);
  const cerca = (soloNuove) => {
    for (let r = 1; r <= LCELL * 10; r += 2) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = ptx + dx, y = pty + dy, t = landmarkAt(x, y);
      if (!t) continue;
      if (soloNuove && viste.has(t)) continue;                 // questa è già nel Libro
      const k = x + ',' + y;
      if (!soloNuove && landmarkSeen.has(k)) continue;         // Libro pieno: si gira in tondo, una per volta
      landmarkSeen.add(k); P.x = x * TS + 8; P.y = (y + 1) * TS + 2;
      return t;
    }
    return null;
  };
  const nuova = cerca(true); if (nuova) return nuova;          // 1. una che manca nel Libro
  const altra = cerca(false); if (altra) return altra;         // 2. finite: si ricomincia il giro
  landmarkSeen.clear();                                        // 3. viste tutte anche stavolta: si riparte
  return cerca(false);
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
        const bcx = Math.floor(x / BCELL), bcy = Math.floor(y / BCELL), bs = boneSiteForCell(bcx, bcy);
        if (bs) { const k = 'B' + bcx + ',' + bcy; if (!toured.has(k)) { for (const part in bs.parts) { const spot = freeSpotNear(bs.parts[part].x, bs.parts[part].y); if (spot) { toured.add(k); P.x = spot.x * TS + 8; P.y = spot.y * TS + 2; const sp = spById[bs.sp]; return '🦴 ' + (sp ? sp.name : bs.sp); } } } }
        const wcx = Math.floor(x / WCELL), wcy = Math.floor(y / WCELL), w = wreckForCell(wcx, wcy);
        if (w) { const k = 'W' + wcx + ',' + wcy; if (!toured.has(k)) { toured.add(k); if (!S.tools) S.tools = {}; S.tools.boat = true; S.gear = 'boat'; P.x = (w.x + 1) * TS + 8; P.y = w.y * TS + 2; return '🚢 ' + tr('Relitto (E per frugare)', 'Wreck (E to search)'); } }
      }
    }
  }
  return null;
}

/* i comandi di prima, ancora raggiungibili dai loro nomi (vedi LEGACY sotto): il registro pubblico
   è COMMANDS, più corto e tutto nella stessa lingua */
const OLD = {
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
  godmode: { aliases: ['god'], type: 'action', cheat: true, help: 'godmode — sblocca e completa tutto (goditem+goddna+trofei), infinito, ×5, volo',
    run: () => { setDebug(true); setSpeed(5); giveAllItems(); giveAllDna(); unlockAllCosmetics(); completeMuseumAndBook(); S.trophies = Object.fromEntries(TRACKS.map(t => [t.id, 4])); P.fly = true; return '🐞 ' + tr('GODMODE: tutto sbloccato (trofei al Platino: aura + glitter), infinito, ×5, volo', 'GODMODE: all unlocked (trophies at Platinum: aura + glitter), infinite, ×5, fly'); } },
  godletters: { aliases: ['letters', 'lettere'], type: 'action', cheat: true,
    help: 'godletters — sblocca tutte le lettere del nonno (finale compreso)',
    run: () => {
      S.letters = allLetters();
      return '✉ ' + tr('Tutte le lettere del nonno sbloccate (', "All of Grandpa's letters unlocked (") + S.letters.length + ') — ' + tr('zaino → Lettere', 'bag → Letters');
    } },
  goddna: { type: 'action', cheat: true, help: 'goddna — DNA di tutte le specie, infinito',
    run: () => { giveAllDna(); return '🧬 ' + tr('DNA infinito per tutte le specie', 'Infinite DNA for all species'); } },
  /* AMBRA: riempie la teca d'ambra di metà delle specie con la teca completa (per vederle accanto alle altre) */
  godamber: { aliases: ['ambra', 'amber'], type: 'action', cheat: true, help: "godamber — teca d'ambra a metà delle specie complete",
    run: () => {
      if (!S.amber) S.amber = {}; if (!S.amberDone) S.amberDone = [];
      const full = Object.keys(S.museum || {}).filter(id => (S.museum[id] || []).length === PARTS.length);
      full.forEach((id, i) => { if (i % 2) return; S.amber[id] = PARTS.map(p => p.id); if (!S.amberDone.includes(id)) S.amberDone.push(id); });
      return '✨ ' + tr("Teche d'ambra: ", 'Amber cases: ') + S.amberDone.length;
    } },
  goditem: { type: 'action', cheat: true, help: 'goditem — ogni pezzo di ogni specie, identificato',
    run: () => { giveAllItems(); return '🦴 ' + tr('Tutti i fossili nello zaino', 'All fossils in your bag'); } },
  godfurn: { aliases: ['furniture', 'arredo'], type: 'action', cheat: true,
    help: 'godfurn — ogni mobile di ogni zona nel vassoio, gratis',
    run: () => {
      if (!S.furnOwned) S.furnOwned = [];
      let n = 0;
      for (const id in FURN_BY_ID) if (!S.furnOwned.includes(id)) { S.furnOwned.push(id); n++; }
      return '🎨 ' + n + ' ' + tr('mobili aggiunti al vassoio: piazzali in casa', 'furniture pieces added to your tray: place them at home');
    } },
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
      resetExploredPack();                                   // riempito a mano: l'impacchettato va rifatto
      /* caselle scavate: la lista che cresce e non si svuota mai */
      for (let i = 0; i < CHUNKS; i++) { const k = (cx0 + (i % 500)) + ',' + (cy0 + Math.floor(i / 500)); dugSet.add(k); }
      resetDugPack();
      const bytes = JSON.stringify({ ...S, explored: packExplored(S.explored), dug: packDug(dugSet) }).length;
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
  /* provare il tavolo NEL FLUSSO VERO: grezzi raro+ in zaino + vai alla città col Museo */
  museo: { aliases: ['museum', 'gotomuseum'], type: 'action', cheat: true,
    help: 'museo — 3 doppioni raro+ GIÀ consegnati + vai alla città col Museo (premi «Ritira» per la proposta di restauro)',
    run: () => {
      if (!S.museum) S.museum = {};
      const items = [];
      for (const rar of ['raro', 'eccezionale', 'leggendario']) {
        const pool = ALL_SPECIES.filter(sp => sp.r === rar);
        const sp = pool[Math.floor(Math.random() * pool.length)] || ALL_SPECIES[0];
        const part = PARTS[Math.floor(Math.random() * PARTS.length)];
        if (!S.museum[sp.id]) S.museum[sp.id] = [];
        if (!S.museum[sp.id].includes(part.id)) S.museum[sp.id].push(part.id); // il museo ce l'ha → torna DOPPIONE
        if (!S.codex.includes(sp.id)) S.codex.push(sp.id);
        items.push({ uid: S.uid++, s: sp.id, t: part.id, q: rar, val: Math.max(2, Math.round(7 * ptById[part.id].mult * RAR.find(r => r.id === rar).mult)) });
      }
      S.museumJob = { items, ready: S.day, prepOk: true };   // già consegnati (≥3 raro+): al Museo premi «Ritira»
      const n = teleportToCity();
      if (!n) return tr('Nessuna città grande trovata', 'No big city found');
      return '🏛️ ' + n + ' — ' + tr('già consegnati: al Museo premi «Ritira», poi il Curatore propone il restauro', 'already handed in: at the Museum press «Collect», then the Curator offers the restoration');
    } },
  /* MINIGIOCO fontana (#3): lo apre ovunque, per provarlo senza cercare una città */
  toss: { aliases: ['fontana', 'fountain'], type: 'action', cheat: true, help: 'toss — apre il minigioco della fontana (mira)',
    run: () => {
      Promise.all([import('./ui.js'), import('./gameplay.js')]).then(([u, g]) => { if (u.openToss) u.openToss(luck => g.grantToss(luck)); });
      return '⛲ ' + tr('Fontana: ferma il cursore sulla zona d\'oro', 'Fountain: stop the marker on the golden zone');
    } },
  /* MINIGIOCO ricomponi lo scheletro (#2): lo apre ovunque, su un pezzo NUOVO (non doppione)
     di una specie a caso — serve a provare il trascinamento senza cercare un museo e un
     grezzo di specie mai esposta */
  skfit: { aliases: ['scheletro', 'montaggio'], type: 'action', cheat: true, help: 'skfit — apre il minigioco «ricomponi lo scheletro»',
    run: () => {
      const sp = ALL_SPECIES[Math.floor(Math.random() * ALL_SPECIES.length)];
      const part = PARTS[Math.floor(Math.random() * PARTS.length)];
      if (!S.museum) S.museum = {};
      S.museum[sp.id] = (S.museum[sp.id] || []).filter(p => p !== part.id);   // GARANTISCE che sia un pezzo NUOVO
      const item = { uid: S.uid++, s: sp.id, t: part.id, q: 'raro', val: Math.max(2, Math.round(7 * ptById[part.id].mult * RAR.find(r => r.id === 'raro').mult)) };
      import('./ui.js').then(u => u.openSkeletonFit([item], () => toast('🦴 ' + tr('Piedistallo aggiornato', 'Pedestal updated'))));
      return '🦴 ' + tr('Ricomponi lo scheletro: trascina il pezzo nel socket giusto', 'Rebuild the skeleton: drag the piece into the right socket');
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
  /* COMPAGNI (poteri per tipo/rarità): scegli al volo un compagno per provare i poteri, il
     raccoglitore leggendario e la cavalcatura volante — senza cercarne uno nel parco. */
  companion: { aliases: ['compagno', 'buddy'], type: 'str', cheat: true,
    help: 'companion=grotta[ leggendario] — compagno di quel TIPO/rarità (terra/acqua/albero/roccia/grotta)',
    suggest: p => ['terra', 'acqua', 'albero', 'roccia', 'grotta'].filter(t => t.startsWith(p)),
    run: v => {
      const [type, r] = String(v).split(/\s+/);
      const TYPES = ['terra', 'acqua', 'albero', 'roccia', 'grotta'];
      if (!TYPES.includes(type)) return tr('Tipi: ', 'Types: ') + TYPES.join(', ');
      const rar = ['comune', 'raro', 'eccezionale', 'leggendario'].includes(r) ? r : 'leggendario';
      const sp = spawnCompanion(type, rar);
      if (!sp) return tr('Nessuna specie di quel tipo', 'No species of that type');
      const extra = rar !== 'leggendario' ? '' : type === 'grotta'
        ? ' · ' + tr('cavalcabile (dallo zaino)', 'rideable (from the bag)')
        : ' · ' + tr('raccoglie da solo', 'auto-gathers');
      return '🐾 ' + sp.name + ' — ' + tr('compagno ', 'companion ') + type + ' (' + rarLabel(rar) + ')' + extra;
    } },
  compinfo: { aliases: ['comp?', 'buddyinfo'], type: 'action',
    help: 'compinfo — stato REALE del compagno (debug: rarità, se raccoglie, job attivo)',
    run: () => {
      const c = S.companion;
      if (!c) return '🐾 ' + tr('Nessun compagno', 'No companion');
      return '🐾 ' + c.name + ' · ' + rarLabel(c.q) + ' [' + c.q + ']  key=' + c.key +
        '\n   ' + tr('raccoglie', 'gathers') + '=' + companionGathers() +
        '  job=' + (COMP.job ? COMP.job.phase : 'null') +
        '  mounted=' + isMounted() + '  cheatLock=' + isCheatLock();
    } },
  mount: { aliases: ['cavalca', 'ride'], type: 'action', cheat: true,
    help: 'mount — compagno di grotta leggendario e SU in volo (in grotta non si vola)',
    run: () => {
      const sp = spawnCompanion('grotta', 'leggendario');
      const ok = isMounted() ? true : toggleMount();
      return ok ? '🐾 ' + tr('In groppa a ', 'Riding ') + sp.name + ' — ' + tr('vola sulla mappa (dallo zaino per scendere)', 'fly over the map (land from the bag)')
        : '🕳️ ' + tr('In grotta non si vola: esci prima', 'No flying in caves: leave first');
    } },
  chimera: { aliases: ['chimere'], type: 'action', cheat: true,
    help: 'chimera — crea una chimera di prova (parco + scelta come compagno)',
    run: () => {
      const pick = () => ALL_SPECIES[Math.floor(vhash(S.uid, S.day, 700 + (S.creatures || []).length) * ALL_SPECIES.length)];
      const a = pick(), b = pick(), c = pick();
      if (!S.creatures) S.creatures = [];
      const name = chimeraName(a, c, S.creatures.map(x => x.name));
      S.creatures.push({ uid: S.uid++, name, skull: a.id, torso: b.id, leg: c.id, q: 'raro' });
      return '🐾 ' + name + ' — ' + tr('chimera creata: passeggia nel parco (sceglila come compagno)', 'chimera created: it roams the park (pick it as companion)');
    } },
  /* ALLEVAMENTO: due genitori (ne crea se mancano) + doppioni + energia, poi depone davvero —
     stessa strada di un giocatore vero, solo senza dover scavare o cercare i pezzi a mano */
  layegg: { aliases: ['uovo', 'breed'], type: 'action', cheat: true, help: 'layegg — depone un uovo (crea genitori/doppioni/energia se mancano)',
    run: () => {
      if (!S.creatures) S.creatures = [];
      while (S.creatures.length < 2) {
        const pick = () => ALL_SPECIES[Math.floor(vhash(S.uid, S.day, 750 + S.creatures.length) * ALL_SPECIES.length)];
        const a = pick(), b = pick(), c = pick();
        S.creatures.push({ uid: S.uid++, name: chimeraName(a, c, S.creatures.map(x => x.name)), skull: a.id, torso: b.id, leg: c.id, q: 'raro' });
      }
      if (!S.items) S.items = [];
      while (S.items.length < breed.EGG_FOOD) { const sp = ALL_SPECIES[0]; S.items.push({ uid: S.uid++, s: sp.id, t: 'coda', q: 'comune', val: 3 }); }
      S.energy = Math.max(S.energy || 0, breed.EGG_ENERGY);
      const [p1, p2] = S.creatures;
      const r = breed.layEgg(p1.uid, p2.uid, { skull: 1, torso: 2, leg: 1 });
      return r.ok ? '🥚 ' + tr('Uovo deposto: ', 'Egg laid: ') + p1.name + ' × ' + p2.name : tr('Non è stato possibile deporre l\'uovo', 'Could not lay the egg');
    } },
  hatchegg: { aliases: ['schiudi'], type: 'action', cheat: true, help: 'hatchegg — l\'uovo in cova è pronto SUBITO',
    run: () => {
      if (!S.egg) return tr('Nessun uovo in cova', 'No egg incubating');
      S.egg.readyDay = S.day;
      const cr = breed.hatchEgg(S.day);
      return cr ? '🥚 ' + tr('Schiuso: ', 'Hatched: ') + cr.name : tr('Non ancora pronto', 'Not ready yet');
    } },
  /* NOTTE/ALBA: per provare le LUCCIOLE (#5), che compaiono solo di notte, all'aperto */
  night: { aliases: ['notte'], type: 'action', cheat: true, help: 'night — notte fonda + missione lucciole attiva (per provarle)',
    run: () => {
      S.tod = 0.85;
      if (!S.quests) S.quests = { day: S.day, active: [], done: [] };
      if (!S.quests.active.some(q => q.type === 'fireflies')) S.quests.active.push({ type: 'fireflies', n: 6, base: S.fireflies || 0, reward: 0, prize: 'map', prizeRar: 'leggendario', qid: 'cheat-ff', day: S.day });
      return tr('Notte fonda + missione lucciole attiva — esci all\'aperto', 'Deep night + fireflies quest active — go outdoors');
    } },
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
  gotopark: { aliases: ['parco', 'park', 'cortile'], type: 'action', help: 'gotopark — vai DENTRO il cortile di casa (dove vivono chimere e risvegliate)',
    run: () => { const n = teleportToPark(); return n ? '🌳 ' + tr('Cortile', 'Yard') : tr('Casa non ancora trovata', 'Home not found yet'); } },
  gotosite: { type: 'action', help: 'gotosite — vai al sito di scavo più vicino',
    run: () => teleportToSite() ? '⛏️ ' + tr('Sito di scavo', 'Dig site') : tr('Nessun sito trovato vicino', 'No site found nearby') },
  /* IN ACQUA, per davvero: la barca compare da sola sull'acqua, quindi per guardarla (o
     fotografarla) serviva prima trovare il mare a occhio. `gotowreck` non basta: lascia a
     riva. */
  gotowater: { aliases: ['acqua', 'mare', 'water'], type: 'action', help: 'gotowater — vai sull\'acqua (la barca compare da sola)',
    run: () => {
      const t0x = Math.floor(P.x / TS), t0y = Math.floor(P.y / TS);
      for (let r = 1; r < 220; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = t0x + dx, ty = t0y + dy;
          const t = baseTerrain(tx, ty);
          if ((t === 0 || t === 1) && !townInfo(tx, ty)) { P.x = tx * TS + 8; P.y = ty * TS + 2; return '⛵ ' + tr('In acqua', 'On the water'); }
        }
      }
      return tr('Nessuna acqua qui intorno', 'No water around here');
    } },
  gotowreck: { type: 'action', help: 'gotowreck — vai al relitto in mare più vicino (attiva la barca)',
    run: () => teleportToWreck() ? '🚢 ' + tr('Relitto (E per frugare)', 'Wreck (E to search)') : tr('Nessun relitto trovato vicino', 'No wreck found nearby') },
  gotolandmark: { aliases: ['goland'], type: 'action', help: 'gotolandmark — vai al landmark più vicino',
    run: () => { const t = teleportToLandmark(); return t ? '🗿 ' + t : tr('Nessun landmark trovato vicino', 'No landmark found nearby'); } },
  gotobone: { aliases: ['bonesite', 'sepolto'], type: 'action', help: 'gotobone — vai allo scheletro sepolto più vicino',
    run: () => { const s = teleportToBoneSite(); if (!s) return tr('Nessuno scheletro sepolto trovato vicino', 'No buried skeleton found nearby'); const sp = spById[s.sp]; return '🦴 ' + (sp ? sp.name : s.sp) + ' — ' + tr('5 parti da scavare', '5 parts to dig'); } },
  tour: { aliases: ['explore', 'esplora'], type: 'action', help: 'tour — vai alla prossima cosa speciale NON ancora vista (landmark/grotta/sito/relitto)',
    run: () => { const m = tourNext(); if (m) return m; toured.clear(); return '🧭 ' + tr('Hai visitato tutto qui intorno — riparto da capo, ripeti tour', 'Seen everything around — reset, run tour again'); } },
  intro: { aliases: ['storia', 'story'], type: 'action', help: 'intro — rivedi il filmato introduttivo (nonno + bimbo)',
    run: () => { playIntro(() => {}); return '📖 ' + tr('Riparte l\'intro…', 'Replaying intro…'); } },
  achall: { aliases: ['achievements', 'traguardi'], type: 'action', help: 'achall — completa tutti i traguardi',
    run: () => { S.trophies = Object.fromEntries(TRACKS.map(t => [t.id, 4])); S.unlocked.hats = [...new Set([...S.unlocked.hats, ...TROPHY_HATS])]; S.glitterHats = [...TROPHY_HATS]; return '🏆 ' + tr('Tutti i trofei al PLATINO! (9 cappelli glitter + aura)', 'All trophies at PLATINUM! (9 glitter hats + aura)'); } },
  weather: { aliases: ['meteo'], type: 'str', help: 'weather=pioggia — forza il meteo (pioggia/sabbia/nebbia/cenere/neve/sereno/off)',
    suggest: p => ['pioggia', 'sabbia', 'nebbia', 'cenere', 'neve', 'sereno', 'off'].filter(s => s.startsWith(p)),
    run: v => {
      if (v === 'off' || v === 'auto') { S.weatherOverride = null; return '🌦️ ' + tr('meteo automatico', 'auto weather'); }
      const map = { pioggia: 'rain', sabbia: 'sandstorm', nebbia: 'fog', cenere: 'ash', neve: 'snow', sereno: 'clear' };
      const w = map[v] || (WEATHER_TYPES.includes(v) ? v : null);
      if (!w) return tr('meteo: pioggia/sabbia/nebbia/cenere/neve/sereno/off', 'weather: rain/sandstorm/fog/ash/snow/clear/off');
      S.weatherOverride = w; return '🌦️ ' + w;
    } },
  market: { aliases: ['mercato'], type: 'str', help: 'market=alto — forza la fascia di mercato per tutte le specie (basso/normale/alto/record/off)',
    suggest: p => ['basso', 'normale', 'alto', 'record', 'off'].filter(s => s.startsWith(p)),
    run: v => {
      if (v === 'off' || v === 'auto') { S.marketOverride = null; return '📈 ' + tr('mercato automatico (per specie, cambia col giorno)', 'auto market (per species, changes by day)'); }
      if (!['basso', 'normale', 'alto', 'record'].includes(v)) return tr('mercato: basso/normale/alto/record/off', 'market: basso/normale/alto/record/off');
      S.marketOverride = v; return '📈 ' + v;
    } },
  fly: { type: 'action', cheat: true, help: 'fly — attraversa gli ostacoli (on/off)',
    run: () => { P.fly = !P.fly; return (P.fly ? '🕊 ' + tr('Volo ON', 'Fly ON') : tr('Volo OFF', 'Fly OFF')); } },
  vanilla: { aliases: ['reset', 'ungod'], type: 'action', help: 'vanilla — togli i cheat e ripristina il salvataggio',
    run: () => { exitCheat(); return '✅ ' + tr('Vanilla: cheat rimossi, salvataggio ripristinato', 'Vanilla: cheats removed, save restored'); } },
  help: { type: 'action', help: 'help — elenco comandi',
    run: () => tr('Comandi disponibili:\n', 'Available commands:\n') + commandHelp().map(t => '  ' + t).join('\n') },
};

/* ============ LA CONSOLE, RIORDINATA ============
   Prima: 42 comandi, nomi un po' in italiano e un po' in inglese (museo, gotopark, dawn, skfit),
   aiuto scritto solo in italiano. Ora pochi comandi in inglese corto, raggruppati per cosa fanno
   (`god=`, `go=`, `play=`, `time=`), l'aiuto nella lingua del gioco, e i VALORI accettati in
   entrambe le lingue (`weather=pioggia` e `weather=rain`). I nomi vecchi funzionano ancora (LEGACY),
   ma non affollano l'elenco. */
const pick = (map, v) => { const k = String(v || '').toLowerCase(); for (const [id, names] of Object.entries(map)) if (names.includes(k)) return id; return null; };
const SEASON_V = { 0: ['spring', 'primavera', '0'], 1: ['summer', 'estate', '1'], 2: ['autumn', 'fall', 'autunno', '2'], 3: ['winter', 'inverno', '3'] };
const GOD_V = { all: ['', 'all', 'tutto'], items: ['items', 'oggetti', 'fossili'], dna: ['dna'], amber: ['amber', 'ambra'], letters: ['letters', 'lettere'], furn: ['furniture', 'furn', 'arredo'], trophies: ['trophies', 'trofei', 'traguardi'] };
const GO_V = { city: ['city', 'città', 'citta', 'museum', 'museo'], park: ['park', 'yard', 'home', 'parco', 'cortile', 'casa'], site: ['site', 'sito'], water: ['water', 'acqua', 'mare'], wreck: ['wreck', 'relitto'], wonder: ['wonder', 'meraviglia', 'landmark'], bones: ['bones', 'ossa', 'scheletro'], cave: ['cave', 'grotta'], next: ['next', 'tour', 'prossimo'] };
const PLAY_V = { prep: ['prep', 'restauro'], restore: ['restore', 'ritiro'], toss: ['toss', 'fountain', 'fontana'], skeleton: ['skeleton', 'scheletro'], egg: ['egg', 'uovo'], hatch: ['hatch', 'schiudi'], fuse: ['fuse', 'fondi', 'doppioni'] };
const TIME_V = { night: ['night', 'notte'], dawn: ['dawn', 'alba'], day: ['day', 'giorno', 'noon', 'mezzogiorno'] };
const WEATHER_V = { rain: ['rain', 'pioggia'], sandstorm: ['sandstorm', 'sabbia'], fog: ['fog', 'nebbia'], ash: ['ash', 'cenere'], snow: ['snow', 'neve'], clear: ['clear', 'sereno'], off: ['off', 'auto'] };
const MARKET_V = { basso: ['low', 'basso'], normale: ['normal', 'normale'], alto: ['high', 'alto'], record: ['record'], off: ['off', 'auto'] };
const BUDDY_V = { terra: ['earth', 'terra'], acqua: ['water', 'acqua'], albero: ['tree', 'albero'], roccia: ['rock', 'roccia'], grotta: ['cave', 'grotta'] };
const RAR_V = { comune: ['common', 'comune'], raro: ['rare', 'raro'], eccezionale: ['epic', 'exceptional', 'eccezionale'], leggendario: ['legendary', 'leggendario'] };
const words = m => Object.values(m).map(n => n[0]).filter(Boolean).join('|');
const H = (name, it, en) => name + ' — ' + tr(it, en);

export const COMMANDS = {
  money: { type: 'num', cheat: true, help: H('money=500', 'monete', 'coins'), run: OLD.money.run },
  energy: { type: 'num', cheat: true, help: H('energy=60', 'energia', 'energy'), run: OLD.energy.run },
  heal: { type: 'action', cheat: true, help: H('heal', 'energia piena', 'full energy'), run: OLD.heal.run },
  day: { type: 'num', cheat: true, help: H('day=10', 'giorno', 'day'), run: OLD.day.run },
  speed: { type: 'num', cheat: true, help: H('speed=5', 'velocità 1-20', 'speed 1-20'), run: OLD.speed.run },
  season: { type: 'str', help: H('season=' + words(SEASON_V), 'stagione', 'season'), suggest: p => ['spring', 'summer', 'autumn', 'winter'].filter(x => x.startsWith(p)),
    run: v => { const k = pick(SEASON_V, v); return k == null ? tr('Stagioni: ', 'Seasons: ') + words(SEASON_V) : OLD.season.run(String(k)); } },
  time: { type: 'str', cheat: true, help: H('time=' + words(TIME_V), 'ora del giorno (di notte ci sono le lucciole)', 'time of day (fireflies at night)'), suggest: p => Object.keys(TIME_V).filter(x => x.startsWith(p)),
    run: v => { const k = pick(TIME_V, v); if (k === 'night') return OLD.night.run(); if (k === 'dawn') return OLD.dawn.run(); if (k === 'day') { S.tod = 0.3; return '☀️ ' + tr('Giorno', 'Day'); } return tr('Ore: ', 'Times: ') + words(TIME_V); } },
  weather: { type: 'str', help: H('weather=' + words(WEATHER_V), 'meteo', 'weather'), suggest: p => Object.keys(WEATHER_V).filter(x => x.startsWith(p)),
    run: v => { const k = pick(WEATHER_V, v); if (!k) return tr('Meteo: ', 'Weather: ') + words(WEATHER_V); if (k === 'off') { S.weatherOverride = null; return '🌦️ ' + tr('meteo automatico', 'auto weather'); } S.weatherOverride = k; return '🌦️ ' + k; } },
  market: { type: 'str', help: H('market=' + words(MARKET_V), 'prezzi del Negozio', 'Shop prices'), suggest: p => ['low', 'normal', 'high', 'record', 'off'].filter(x => x.startsWith(p)),
    run: v => { const k = pick(MARKET_V, v); return k ? OLD.market.run(k) : tr('Mercato: ', 'Market: ') + words(MARKET_V); } },
  god: { type: 'both', cheat: true, help: H('god[=' + words(GOD_V).replace(/^\|/, '') + ']', 'sblocca tutto, o solo una parte', 'unlock everything, or just one part'),
    suggest: p => Object.keys(GOD_V).filter(x => x !== 'all' && x.startsWith(p)),
    run: v => {
      const k = pick(GOD_V, v == null ? '' : v);
      const f = { all: OLD.godmode, items: OLD.goditem, dna: OLD.goddna, amber: OLD.godamber, letters: OLD.godletters, furn: OLD.godfurn, trophies: OLD.achall }[k];
      return f ? f.run() : tr('Parti: ', 'Parts: ') + words(GOD_V);
    } },
  go: { type: 'str', help: H('go=' + words(GO_V) + '|' + ZONES.map(z => z.id).join('|'), 'teletrasporto', 'teleport'),
    suggest: p => [...Object.keys(GO_V), ...ZONES.map(z => z.id)].filter(x => x.startsWith(p)),
    run: v => {
      const k = pick(GO_V, v);
      if (k === 'city' || k === 'cave') return OLD.goto.run(k === 'city' ? 'city' : 'grotta');
      const f = { park: OLD.gotopark, site: OLD.gotosite, water: OLD.gotowater, wreck: OLD.gotowreck, wonder: OLD.gotolandmark, bones: OLD.gotobone, next: OLD.tour }[k];
      if (f) return f.run();
      const z = ZONES.find(zz => zz.id === String(v).toLowerCase());
      return z ? OLD.goto.run(z.id) : tr('Mete: ', 'Targets: ') + words(GO_V) + '|' + ZONES.map(zz => zz.id).join('|');
    } },
  play: { type: 'str', cheat: true, help: H('play=' + words(PLAY_V), 'prova un minigioco o un sistema subito', 'try a minigame or system right away'),
    suggest: p => Object.keys(PLAY_V).filter(x => x.startsWith(p)),
    run: v => {
      const [w, extra] = String(v).split(/\s+/);
      const k = pick(PLAY_V, w), rar = pick(RAR_V, extra);
      const f = { prep: OLD.prep, restore: OLD.museo, toss: OLD.toss, skeleton: OLD.skfit, egg: OLD.layegg, hatch: OLD.hatchegg, fuse: OLD.dupes }[k];
      return f ? f.run(rar || undefined) : tr('Prove: ', 'Tries: ') + words(PLAY_V);
    } },
  buddy: { type: 'str', cheat: true, help: H('buddy=' + words(BUDDY_V) + ' [rarity]', 'compagno di quel tipo (leggendario se non dici)', 'companion of that type (legendary by default)'),
    suggest: p => Object.keys(BUDDY_V).map(k => BUDDY_V[k][0]).filter(x => x.startsWith(p)),
    run: v => { const [w, r] = String(v).split(/\s+/); const t = pick(BUDDY_V, w); const q = pick(RAR_V, r); return t ? OLD.companion.run(t + (q ? ' ' + q : '')) : tr('Tipi: ', 'Types: ') + words(BUDDY_V); } },
  mount: { type: 'action', cheat: true, help: H('mount', 'drago di cristallo e su in volo', 'crystal dragon, straight into the air'), run: OLD.mount.run },
  chimera: { type: 'action', cheat: true, help: H('chimera', 'una chimera di prova nel cortile', 'a test chimera in your yard'), run: OLD.chimera.run },
  fly: { type: 'action', cheat: true, help: H('fly', 'attraversa gli ostacoli (on/off)', 'walk through obstacles (on/off)'), run: OLD.fly.run },
  stress: { type: 'both', cheat: true, help: H('stress=1-5', 'riempie il gioco e misura i frame', 'fills the game and measures frames'), run: OLD.stress.run },
  info: { type: 'action', help: H('info', 'stato del compagno (debug)', 'companion state (debug)'), run: OLD.compinfo.run },
  intro: { type: 'action', help: H('intro', 'rivedi il filmato iniziale', 'replay the intro'), run: OLD.intro.run },
  vanilla: { type: 'action', help: H('vanilla', 'togli i cheat e torna alla partita di prima', 'remove cheats and restore your game'), run: OLD.vanilla.run },
  help: { type: 'action', help: H('help', 'questo elenco', 'this list'), run: () => tr('Comandi:\n', 'Commands:\n') + commandHelp().map(t => '  ' + t).join('\n') },
};
/* NOMI VECCHI → comando nuovo. `$` = il valore scritto dopo l'uguale */
const LEGACY = {
  godmode: 'god', goto: 'go=$', companion: 'buddy=$',
  coins: 'money=$', monete: 'money=$', en: 'energy=$', energia: 'energy=$', meteo: 'weather=$', mercato: 'market=$',
  goditem: 'god=items', goddna: 'god=dna', godamber: 'god=amber', ambra: 'god=amber', amber: 'god=amber', godletters: 'god=letters', letters: 'god=letters', lettere: 'god=letters',
  godfurn: 'god=furn', furniture: 'god=furn', arredo: 'god=furn', achall: 'god=trophies', achievements: 'god=trophies', traguardi: 'god=trophies',
  gotopark: 'go=park', parco: 'go=park', park: 'go=park', cortile: 'go=park', gotosite: 'go=site', gotowater: 'go=water', acqua: 'go=water', mare: 'go=water', water: 'go=water',
  gotowreck: 'go=wreck', gotolandmark: 'go=wonder', goland: 'go=wonder', gotobone: 'go=bones', bonesite: 'go=bones', sepolto: 'go=bones', tour: 'go=next', explore: 'go=next', esplora: 'go=next',
  museo: 'play=restore', museum: 'play=restore', gotomuseum: 'play=restore', prep: 'play=prep $', minigioco: 'play=prep $', minigame: 'play=prep $', tavolo: 'play=prep $',
  toss: 'play=toss', fontana: 'play=toss', fountain: 'play=toss', skfit: 'play=skeleton', scheletro: 'play=skeleton', montaggio: 'play=skeleton',
  dupes: 'play=fuse $', doppioni: 'play=fuse $', fuse: 'play=fuse $', fondi: 'play=fuse $',
  layegg: 'play=egg', uovo: 'play=egg', breed: 'play=egg', hatchegg: 'play=hatch', schiudi: 'play=hatch',
  night: 'time=night', notte: 'time=night', dawn: 'time=dawn', alba: 'time=dawn', compagno: 'buddy=$', buddyinfo: 'info', compinfo: 'info', 'comp?': 'info',
  cavalca: 'mount', ride: 'mount', chimere: 'chimera', reset: 'vanilla', ungod: 'vanilla', storia: 'intro', story: 'intro', gotocity: 'go=city',
};

/* l'elenco dei comandi, usato sia da `help` sia dalla pagina Comandi del menu: un posto
   solo, così non possono divergere. In ordine alfabetico. */
export function commandHelp() {
  return Object.values(COMMANDS).map(c => c.help)
    .sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}

const INDEX = {};
for (const [name, c] of Object.entries(COMMANDS)) { INDEX[name] = c; c._name = name; for (const a of c.aliases || []) INDEX[a] = c; }

export function runCommand(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  /* nome vecchio: si riscrive col comando nuovo e si esegue quello */
  { const m = s.match(/^([\w?]+)\s*(?:=\s*(.+?))?\s*$/); const leg = m && !INDEX[m[1].toLowerCase()] && LEGACY[m[1].toLowerCase()];
    if (leg) return runCommand(leg.replace(/\s*\$$/, m[2] ? ' ' + m[2] : '').replace('=$', m[2] ? '=' + m[2] : '').replace(/=$/, '')); }
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
  if (cmd.cheat) enterCheat();        // primo comando cheat: snapshot pre-cheat PERSISTITO + tag (il save NON si congela)
  const msg = cmd.run(val);
  save(); updateHUD();                 // tutto persiste (anche coi comandi attivi); `vanilla` annulla via snapshot
  return msg;
}

/* suggerimenti per l'autocompletamento della console (es. `goto=pal` → goto=palude) */
export function suggest(raw) {
  const s = (raw || '').trim(); if (!s) return Object.keys(COMMANDS).map(k => COMMANDS[k].type === 'action' ? k : k + '=');
  const eq = s.match(/^(\w+)\s*=\s*(.*)$/);
  if (eq) { const cmd = INDEX[eq[1].toLowerCase()]; if (cmd && cmd.suggest) return cmd.suggest(eq[2].toLowerCase()).map(v => cmd._name + '=' + v); return []; }
  return Object.keys(INDEX).filter(k => k.startsWith(s.toLowerCase())).map(k => INDEX[k].type === 'action' ? k : k + '=');
}
