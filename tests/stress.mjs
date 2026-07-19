/* STRESS TEST — dove si rompe il gioco.
   La suite normale prova che le cose FUNZIONANO; questa prova a farle CADERE: mappe
   esplorate enormi, migliaia di caselle scavate, centinaia di creature a schermo, salvataggi
   giganti. Serve a sapere i limiti veri prima che li trovi un giocatore.

   `npm run stress` — stampa tempi, memoria e dimensione del salvataggio. */
import { installStubs } from './stub.mjs';
installStubs();

const state = await import('../src/state.js');
state.initState();
const S = state.S, P = state.P;
const { TS } = await import('../src/data.js');

const MB = 1024 * 1024;
const mem = () => process.memoryUsage().heapUsed / MB;
const ms = (t0) => (performance.now() - t0);
function row(label, val, note) {
  console.log('  ' + label.padEnd(42) + String(val).padStart(12) + (note ? '   ' + note : ''));
}
function head(t) { console.log('\n' + t + '\n' + '─'.repeat(72)); }

/* ---------- 1. MAPPA ESPLORATA (fog of war a chunk 8×8) ---------- */
head('1. MAPPA ESPLORATA — quante caselle regge la nebbia di guerra');
{
  const map = await import('../src/map.js');
  const { packExplored } = await import('../src/packmap.js');
  const CH = 8, perChunk = CH * CH;
  for (const tiles of [1e5, 1e6, 1e7]) {
    S.explored = {};
    const chunks = Math.ceil(tiles / perChunk);
    const t0 = performance.now();
    const side = Math.ceil(Math.sqrt(chunks));
    for (let i = 0; i < chunks; i++) map.markExplored((i % side) * CH * TS, Math.floor(i / side) * CH * TS);
    const tMark = ms(t0);
    const t1 = performance.now();
    const raw = JSON.stringify(S.explored);
    const packed = JSON.stringify(packExplored(S.explored));
    const tSer = ms(t1);
    row(tiles.toLocaleString('it') + ' caselle (' + chunks.toLocaleString('it') + ' blocchi)',
      (packed.length / MB).toFixed(3) + ' MB',
      'in chiaro sarebbe ' + (raw.length / MB).toFixed(1) + ' MB (×' + (raw.length / packed.length).toFixed(0) + ') · scoperta '
      + tMark.toFixed(0) + 'ms · comprime ' + tSer.toFixed(0) + 'ms');
    /* il limite VERO non è la RAM: è localStorage, ~5 MB per dominio */
    if (packed.length / MB > 5) row('  → oltre il limite di localStorage (~5 MB)', 'SALVATAGGIO IMPOSSIBILE', '');
  }
  /* quanto cammino serve davvero per arrivarci? */
  const tilesPerHour = 3600 / 0.18 * 0.5;   // ~1 tile ogni 0,18 s a velocità normale, metà utile
  row('caselle nuove in un\'ora di gioco (stima)', Math.round(tilesPerHour).toLocaleString('it'), '');
  S.explored = {};
}

/* ---------- 2. CASELLE SCAVATE (dugSet) ---------- */
head('2. CASELLE SCAVATE — la lista cresce e non si svuota mai');
{
  for (const n of [1e4, 1e5, 1e6]) {
    state.dugSet.clear(); S.dug = [];
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { const k = (i % 4000) + ',' + Math.floor(i / 4000); state.dugSet.add(k); S.dug.push(k); }
    const tAdd = ms(t0);
    const t1 = performance.now();
    const json = JSON.stringify(S.dug);
    const tSer = ms(t1);
    const t2 = performance.now();
    for (let i = 0; i < 10000; i++) state.dugSet.has('123,45');
    const tLook = ms(t2);
    row(n.toLocaleString('it') + ' caselle scavate', (json.length / MB).toFixed(2) + ' MB',
      'inserimento ' + tAdd.toFixed(0) + 'ms · serializza ' + tSer.toFixed(0) + 'ms · 10k ricerche ' + tLook.toFixed(1) + 'ms');
  }
  state.dugSet.clear(); S.dug = [];
}

/* ---------- 3. SALVATAGGIO GRANDE ---------- */
head('3. SALVATAGGIO — scrittura, rilettura e limite del browser');
{
  const { PARTS, ALL_SPECIES } = await import('../src/data.js');
  for (const n of [500, 5000, 50000]) {
    S.items = [];
    for (let i = 0; i < n; i++) S.items.push({ uid: i, s: ALL_SPECIES[i % ALL_SPECIES.length].id, t: PARTS[i % 5].id, q: 'comune', val: 7 });
    const t0 = performance.now();
    const ok = state.save();
    const tSave = ms(t0);
    const raw = localStorage.getItem(state.SK) || '';
    const t1 = performance.now();
    JSON.parse(raw);
    const tLoad = ms(t1);
    row(n.toLocaleString('it') + ' reperti nello zaino', (raw.length / MB).toFixed(2) + ' MB',
      'salva ' + tSave.toFixed(0) + 'ms · rilegge ' + tLoad.toFixed(0) + 'ms · esito ' + (ok ? 'ok' : 'FALLITO'));
  }
  S.items = [];
  state.save();
}

/* ---------- 4. CREATURE NEL PARCO ---------- */
head('4. CREATURE — quante ne reggono simulazione e disegno');
{
  const park = await import('../src/park.js');
  const render = (await import('../src/render.js')).render;
  const { fit } = await import('../src/screen.js');
  fit();
  const { cam } = state;
  /* il player va messo DENTRO un parco, altrimenti non c'è nulla da simulare né da disegnare
     e il test misura il vuoto (prima diceva "1000 creature a 0,9 ms": non ne disegnava una) */
  const world = await import('../src/world.js');
  let town = null;
  for (let cx = -14; cx < 14 && !town; cx++) for (let cy = -14; cy < 14 && !town; cy++) {
    const t = world.townForCell(cx, cy); if (t && t.pen) town = t;
  }
  if (!town) { console.log('  (nessuna città col parco trovata)'); }
  else { P.x = (town.pen.x0 + 2) * TS; P.y = (town.pen.y0 + 2) * TS; }
  const mk = (i) => ({ uid: i, name: 'Test' + i, skull: 'lepre', torso: 'lepre', leg: 'lepre', q: 'comune' });
  for (const n of [10, 50, 200, 1000]) {
    S.creatures = Array.from({ length: n }, (_, i) => mk(i));
    park.parks.clear();
    park.refreshVisParks();
    const t0 = performance.now();
    for (const t of park.visParks) for (let f = 0; f < 60; f++) park.updatePark(t, 1 / 60);
    const tSim = ms(t0);
    cam.x = P.x; cam.y = P.y;
    const t1 = performance.now();
    for (let f = 0; f < 10; f++) render(1000 + f * 16);
    const tDraw = ms(t1) / 10;
    const drawn = park.visParks.length ? park.parkList(park.visParks[0]).length : 0;
    row(n.toLocaleString('it') + ' creature (' + drawn + ' nel parco)', tDraw.toFixed(1) + ' ms/frame',
      'simulazione 60 passi ' + tSim.toFixed(0) + 'ms · ' + (tDraw < 16.7 ? '60 fps ok' : tDraw < 33 ? '30 fps' : 'SOTTO i 30 fps'));
  }
  S.creatures = [];
}

/* ---------- 5. MONDO LONTANISSIMO (numeri grandi) ---------- */
head('5. LONTANO DALL\'ORIGINE — il mondo è infinito, i numeri no');
{
  const world = await import('../src/world.js');
  const regions = await import('../src/regions.js');
  for (const d of [1e3, 1e6, 1e9, 1e12]) {
    const tx = Math.round(d), ty = Math.round(d);
    const t0 = performance.now();
    let terr = null, zone = null, ok = true;
    try {
      terr = world.baseTerrain(tx, ty);
      zone = regions.zoneAt(tx, ty);
      world.townForCell(Math.floor(tx / 40), Math.floor(ty / 40));
    } catch (e) { ok = false; }
    row('a ' + d.toExponential(0) + ' caselle dall\'origine',
      ok ? (terr !== null && zone ? 'ok' : 'vuoto') : 'ERRORE',
      'terreno=' + terr + ' zona=' + (zone && zone.id) + ' · ' + ms(t0).toFixed(1) + 'ms');
  }
}

console.log('\n' + '─'.repeat(72));
console.log('  heap finale: ' + mem().toFixed(0) + ' MB\n');
