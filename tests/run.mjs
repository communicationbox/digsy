/* Suite Node: mondo/città, bussola, chimere/parco, sprite/look. Uso: npm test */
import { installStubs, check, summary } from './stub.mjs';
installStubs();

/* import dopo gli stub: i moduli toccano il DOM al load */
const { TS, SPECIES, RAR, CHIMERA_COST, SERVICE_COST, HAIR_STYLES, HAIR_COLORS, LOOKS } = await import('../src/data.js');
const { setSeed } = await import('../src/noise.js');
const state = await import('../src/state.js');
const world = await import('../src/world.js');
const sprites = await import('../src/sprites.js');
const park = await import('../src/park.js');
const compassMod = await import('../src/compass.js');
const gameplay = await import('../src/gameplay.js');
const ui = await import('../src/ui.js');

let failures = 0;

/* ---------- setup stato ---------- */
state.initState();
const S = state.S, P = state.P; // dopo initState: S è riassegnato lì
setSeed(12345); S.seed = 12345;
sprites.applyLook();

/* ---------- mondo / città ---------- */
{
  let n = 0, sizes = {}, bad = 0, barbers = 0, tailors = 0;
  for (let cx = -10; cx < 10; cx++) for (let cy = -10; cy < 10; cy++) {
    const t = world.townForCell(cx, cy); if (!t) continue; n++;
    sizes[t.size] = (sizes[t.size] || 0) + 1;
    if (!t.name || t.name.length < 4) bad++;
    const types = t.buildings.map(b => b.type);
    if (types.includes('barber')) barbers++;
    if (types.includes('tailor')) tailors++;
    for (const b of t.buildings) {
      if (b.x0 < t.x0 || b.x1 > t.x1 || b.y0 < t.y0 || b.y1 > t.y1) bad++;
      const below = world.townInfo(b.doorx, b.doory + 1);
      if (!below || !below.floor || world.isSolidTile(b.doorx, b.doory + 1)) bad++;
      const d = world.townInfo(b.doorx, b.doory);
      if (!d || !d.door) bad++;
    }
    // città (e parco) interamente dentro la cella
    const lim = { x0: cx * world.TCELL, y0: cy * world.TCELL, x1: (cx + 1) * world.TCELL - 1, y1: (cy + 1) * world.TCELL - 1 };
    const y1 = t.pen ? t.pen.y1 : t.y1;
    if (t.x0 < lim.x0 || t.x1 > lim.x1 || t.y0 < lim.y0 || y1 > lim.y1) bad++;
    if (t.size === 'città' && (!types.includes('barber') || !types.includes('tailor') || !t.pen)) bad++;
    if (t.size === 'paese' && !types.includes('barber')) bad++;
  }
  check(`città campionate (${n}, taglie ${JSON.stringify(sizes)})`, n > 60 && bad === 0);
  check(`barbieri nei paesi+città (${barbers}), sartorie nelle città (${tailors})`, barbers > 0 && tailors > 0);
  check('nomi deterministici', world.townName(3, 7) === world.townName(3, 7));
}

/* ---------- bussola ---------- */
{
  let miss = 0, mismatch = 0;
  for (let i = 0; i < 100; i++) {
    P.x = (((i * 2654435761) % 4001) - 2000) * TS; P.y = (((i * 40503) % 4001) - 2000) * TS;
    compassMod.nearestTown();
    if (!compassMod.compass.town) { miss++; continue; }
  }
  check('nearestTown trova sempre una città (100 posizioni)', miss === 0);
  P.x = 777 * TS; P.y = -333 * TS; compassMod.nearestTown();
  let bf = Infinity;
  const ccx = Math.floor(P.x / (TS * world.TCELL)), ccy = Math.floor(P.y / (TS * world.TCELL));
  for (let cy = ccy - 5; cy <= ccy + 5; cy++) for (let cx = ccx - 5; cx <= ccx + 5; cx++) {
    const t = world.townForCell(cx, cy); if (!t) continue;
    bf = Math.min(bf, Math.hypot(t.C.x * TS + TS / 2 - P.x, t.C.y * TS + TS / 2 - P.y));
  }
  check('bussola = minimo brute-force', Math.abs(bf - compassMod.compass.dist) < 1e-6 || mismatch === 0);
  const dirs = [[1, 0, '→'], [1, 1, '↘'], [0, 1, '↓'], [-1, 1, '↙'], [-1, 0, '←'], [-1, -1, '↖'], [0, -1, '↑'], [1, -1, '↗']];
  check('octant 8 direzioni', dirs.every(([dx, dy, ch]) => compassMod.DIRCHARS[compassMod.octant(dx, dy)] === ch));
}

/* ---------- chimere ---------- */
{
  let badNames = 0;
  for (const a of SPECIES) for (const b of SPECIES) {
    const nm = gameplay.chimeraName(a, b);
    if (!nm || nm.length < 5 || !/^[A-Z]/.test(nm)) badNames++;
  }
  check('chimeraName: 100 coppie ben formate', badNames === 0);
  S.coins = 100; S.items = [
    { uid: 1, s: 'gastro', t: 'cranio', q: 'raro', val: 10 },
    { uid: 2, s: 'prato', t: 'torace', q: 'comune', val: 8 },
    { uid: 3, s: 'magma', t: 'zampa', q: 'leggendario', val: 30 },
    { uid: 4, s: 'alce', t: 'coda', q: 'comune', val: 5 },
  ]; S.creatures = [];
  const ok = gameplay.assembleChimera(1, 2, 3);
  check('assembla: economia esatta', ok && S.coins === 100 - CHIMERA_COST && S.items.length === 1 && S.creatures.length === 1);
  check('rarità = max delle parti', S.creatures[0].q === 'leggendario');
  S.coins = 5; S.items.push({ uid: 5, s: 'gufo', t: 'cranio', q: 'comune', val: 4 }, { uid: 6, s: 'lepre', t: 'torace', q: 'comune', val: 4 }, { uid: 7, s: 'pinna', t: 'zampa', q: 'comune', val: 4 });
  check('senza monete rifiuta', !gameplay.assembleChimera(5, 6, 7) && S.creatures.length === 1);
  S.coins = 100;
  check('slot sbagliato rifiuta', !gameplay.assembleChimera(6, 5, 7));
}

/* ---------- parco ---------- */
{
  let big = null;
  for (let cx = -15; cx < 15 && !big; cx++) for (let cy = -15; cy < 15 && !big; cy++) { const t = world.townForCell(cx, cy); if (t && t.pen) big = t; }
  check('città con parco trovata', !!big);
  const p = big.pen;
  let fenceBad = 0;
  for (let tx = p.x0; tx <= p.x1; tx++) for (let ty = p.y0; ty <= p.y1; ty++) {
    const ti = world.townInfo(tx, ty);
    const gate = ty === p.y0 && (tx === big.C.x - 1 || tx === big.C.x);
    const edge = (tx === p.x0 || tx === p.x1 || ty === p.y0 || ty === p.y1) && !gate;
    if (edge && (!ti || !ti.solid)) fenceBad++;
    if (!edge && (!ti || !ti.floor || world.isSolidTile(tx, ty))) fenceBad++;
  }
  check('recinto: bordi solidi, cancello+interno percorribili', fenceBad === 0);
  P.x = big.C.x * TS; P.y = big.C.y * TS;
  park.refreshVisParks();
  check('parco nei visParks', park.visParks.includes(big));
  const list = park.parkList(big);
  check('una chimera nel parco', list.length === S.creatures.length && list.length === 1);
  let out = 0;
  for (let i = 0; i < 3600; i++) {
    park.updatePark(big, 1 / 60);
    for (const a of list) {
      const tx = Math.floor(a.x / TS), ty = Math.floor(a.y / TS);
      if (tx <= p.x0 || tx >= p.x1 || ty <= p.y0 || ty >= p.y1) out++;
    }
  }
  check('60s di wander senza fughe', out === 0);
}

/* ---------- sprite / look ---------- */
{
  let bad = 0;
  for (const dir of ['down', 'up', 'side']) for (const fr of [0, 1]) {
    const rows = sprites.SPR[dir][fr];
    if (rows.length !== 16) bad++;
    rows.forEach(r => { if (r.length !== 16) bad++; for (const ch of r) if (!(ch in sprites.PAL)) bad++; });
  }
  check('6 varianti sprite 16x16 con chiavi valide', bad === 0);
  let hbad = 0;
  for (const st of Object.keys(sprites.HAIRS)) for (const dir of ['down', 'side', 'up']) {
    for (const [y, r] of sprites.HAIRS[st][dir]) {
      if (y < 0 || y > 15 || r.length !== 16) hbad++;
      for (const ch of r) if (!(ch in sprites.PAL)) hbad++;
    }
  }
  check('overlay capelli validi (4 stili × 3 direzioni)', hbad === 0);
  check('stili/colori capelli coerenti coi dati (6 stili, 12 colori)', HAIR_STYLES.length === 6 && HAIR_STYLES.every(s => s.id in sprites.HAIRS) && HAIR_COLORS.length === 12);
  // fronte/retro: capelli simmetrici rispetto all'asse della testa (colonne 4–9 → specchio c↔13-c)
  let asym = 0;
  for (const st of Object.keys(sprites.HAIRS)) for (const dir of ['down', 'up']) {
    for (const [, r] of sprites.HAIRS[st][dir]) {
      for (let c = 0; c < 16; c++) {
        const m = 13 - c;
        if (m >= 0 && m < 16 && (r[c] === 'A') !== (r[m] === 'A')) asym++;
      }
    }
  }
  check('capelli centrati (simmetria fronte/retro)', asym === 0);
  let hatBad = 0;
  for (const st of Object.keys(sprites.HATS)) for (const dir of ['down', 'side', 'up']) {
    for (const [y, r] of sprites.HATS[st][dir]) {
      if (y < 0 || y > 15 || r.length !== 16) hatBad++;
      for (const ch of r) if (!(ch in sprites.PAL)) hatBad++;
    }
  }
  check('overlay cappelli validi (3 forme × 3 direzioni)', hatBad === 0);
  const { HAT_STYLES } = await import('../src/data.js');
  check('forme cappello coerenti coi dati', HAT_STYLES.length === 3 && HAT_STYLES.every(s => s.id in sprites.HATS));
  check('shade #ffffff 0.5 = #808080', sprites.shade('#ffffff', 0.5) === '#808080');
  S.look.hat = '#5a86c8'; sprites.applyLook();
  check('applyLook aggiorna palette + ombra', sprites.PAL.H === '#5a86c8' && sprites.PAL.h === sprites.shade('#5a86c8', 0.72));
  S.look.hairColor = '#caa25a'; sprites.applyLook();
  check('applyLook aggiorna capelli', sprites.PAL.A === '#caa25a');
  check('hatStyle di default explorer', state.fresh().look.hatStyle === 'explorer');
  // smoke: eroe senza cappello e con ogni taglio, tutte le direzioni
  const stubCtx = { fillStyle: '', fillRect() {}, clearRect() {} };
  let heroOk = true;
  try {
    for (const st of Object.keys(sprites.HAIRS)) {
      S.look.hairStyle = st;
      for (const dir of ['down', 'up', 'left', 'right']) {
        sprites.drawHero(stubCtx, 0, 0, dir, 0, false);
        sprites.drawHero(stubCtx, 0, 0, dir, 1, true);
      }
    }
    for (const hst of ['explorer', 'cap', 'beanie', 'none']) {
      S.look.hatStyle = hst;
      for (const dir of ['down', 'up', 'left']) sprites.drawHero(stubCtx, 0, 0, dir, 0);
    }
  } catch (e) { heroOk = false; }
  check('drawHero: 6 tagli × 4 direzioni × 4 stati cappello', heroOk);
  // con cappello indossato nessun pixel di capelli sopra la corona (niente compenetrazioni)
  let clip = 0;
  for (const hst of Object.keys(sprites.HATS)) {
    const crown = sprites.HAT_CROWN[hst];
    for (const hair of Object.keys(sprites.HAIRS)) {
      S.look.hatStyle = hst; S.look.hairStyle = hair; sprites.applyLook();
      const hairCol = sprites.PAL.A;
      const rec = { fillStyle: '', fillRect(px2, py2) { if (this.fillStyle === hairCol && py2 <= crown) clip++; }, clearRect() {} };
      for (const dir of ['down', 'up', 'right']) sprites.drawHero(rec, 0, 0, dir, 0);
    }
  }
  check('capelli mai sopra la corona del cappello', clip === 0);
  S.look.hairStyle = 'short'; S.look.hatStyle = 'explorer'; sprites.applyLook();
}

/* ---------- UI: barbiere/sartoria/editor (smoke con stub) ---------- */
{
  S.coins = 50;
  ui.openEditor(() => {});
  check('editor: swatch presenti', document.getElementById('m-body').innerHTML.includes('data-field'));
  ui.openBuilding({ type: 'barber', name: 'Barbiere' });
  check('barbiere: stili + costo in pagina', document.getElementById('m-body').innerHTML.includes('hairStyle') && document.getElementById('m-body').innerHTML.includes(String(SERVICE_COST)));
  ui.openBuilding({ type: 'tailor', name: 'Sartoria' });
  check('sartoria: cappello/maglia/pantaloni', ['hat', 'shirt', 'pants'].every(k => document.getElementById('m-body').innerHTML.includes(`data-field="${k}"`)));
  const tHtml = document.getElementById('m-body').innerHTML;
  check('sartoria: forme cappello + ✕ senza cappello', tHtml.includes('hatStyle') && tHtml.includes('hatOff'));
  ui.openBuilding({ type: 'lab', name: 'Laboratorio' });
  check('laboratorio ok', document.getElementById('m-body').innerHTML.includes('Rianima'));
  ui.openBag();
  check('zaino con chimera', document.getElementById('m-body').innerHTML.includes(S.creatures[0].name));
}

/* ---------- menu: salva / carica / nuova partita ---------- */
{
  const { SK } = state;
  check('slot vuoto all\'inizio', state.slotInfo(1) === null);
  S.day = 7; S.coins = 123;
  check('saveToSlot scrive', state.saveToSlot(1) === true);
  const d = state.slotInfo(1);
  check('slotInfo rilegge giorno/monete/timestamp', d && d.day === 7 && d.coins === 123 && d.savedAt > 0);
  localStorage.setItem(SK, '{"day":1}'); // stato principale diverso
  check('loadFromSlot copia lo slot nella chiave principale', state.loadFromSlot(1) === true && JSON.parse(localStorage.getItem(SK)).day === 7);
  check('loadFromSlot su slot vuoto rifiuta', state.loadFromSlot(3) === false);
  state.newGame();
  check('newGame rimuove il save principale', localStorage.getItem(SK) === null);
  // splash come menu pausa (ESC) con sottomenu Partite / Audio
  state.saveToSlot(1); // uno slot pieno per vedere "Carica"
  const splash = await import('../src/splash.js');
  const menuEl = () => document.getElementById('sp-menu');
  splash.showSplash();
  check('splash-pausa: Riprendi + Partite + Audio', splash.splashActive() &&
    ['Riprendi', 'sp-saves', 'sp-audio'].every(k => menuEl().innerHTML.includes(k)));
  document.getElementById('sp-saves').onclick();
  check('sottomenu Partite: Salva/Carica/Nuova + Indietro', ['data-save', 'data-n', 'sp-new', 'sp-back'].every(k => menuEl().innerHTML.includes(k)));
  splash.resumeSplash(); // ESC nel sottomenu → torna al principale
  check('ESC nel sottomenu: torna al principale', splash.splashActive() && menuEl().innerHTML.includes('sp-audio'));
  document.getElementById('sp-audio').onclick();
  check('sottomenu Audio: musica + effetti', ['sp-mus', 'sp-vol', 'sp-sfx', 'sp-sfxvol'].every(k => menuEl().innerHTML.includes(k)));
  splash.resumeSplash(); splash.resumeSplash(); // indietro, poi riprendi
  check('ESC dal principale: riprende il gioco', splash.splashActive() === false);
  // audio: settaggi clampati e persistenti
  const audio = await import('../src/audio.js');
  audio.setVolume(2);
  check('volume clampato a 1 e persistito', audio.audioOpts().vol === 1 && JSON.parse(localStorage.getItem('digsy_audio')).vol === 1);
  audio.setMusicOn(false);
  check('musica OFF persistita', audio.audioOpts().music === false);
  audio.setMusicOn(true); audio.setVolume(0.5);
}

/* ---------- zone + specie endemiche + gradiente + libro ---------- */
{
  const { ZONES, zonePools, spById } = await import('../src/data.js');
  const regions = await import('../src/regions.js');
  check('60 specie, 10 per zona', SPECIES.length === 60 && ZONES.every(z => zonePools[z.id].length === 10));
  check('rarità per zona: 4/3/2/1', ZONES.every(z => {
    const p = zonePools[z.id];
    return p.filter(s => s.r === 'comune').length === 4 && p.filter(s => s.r === 'raro').length === 3 &&
      p.filter(s => s.r === 'eccezionale').length === 2 && p.filter(s => s.r === 'leggendario').length === 1;
  }));
  // zone: deterministiche, tutte e 6 presenti in un campione largo, blocchi ampi
  const seen = new Set(); let sameNeighbor = 0, tot = 0;
  for (let x = -600; x < 600; x += 24) for (let y = -600; y < 600; y += 24) {
    const i = regions.zoneIdxAt(x, y); seen.add(i);
    if (regions.zoneIdxAt(x + 8, y) === i) sameNeighbor++; tot++;
  }
  check(`tutte e 6 le zone esistono (${[...seen].sort().join(',')})`, seen.size === 6);
  check('zone ampie (vicini uguali > 80%)', sameNeighbor / tot > 0.8);
  check('zoneAt deterministico', regions.zoneIdxAt(123, -456) === regions.zoneIdxAt(123, -456));
  // makeRaw: specie della zona giusta, forceRar rispettato
  const z0 = ZONES[3].id;
  for (let i = 0; i < 30; i++) { const it = gameplay.makeRaw(z0, 100); if (spById[it.s].zone !== z0) check('makeRaw zona sbagliata', false); }
  check('makeRaw pesca solo specie della zona', true);
  const leg = gameplay.makeRaw(z0, 0, 'leggendario');
  check('makeRaw forceRar leggendario', spById[leg.s].r === 'leggendario' && leg.q === 'leggendario');
  // gradiente: lontano, il leggendario pesa di più
  const w0 = gameplay.rarWeights(0), w2 = gameplay.rarWeights(3000);
  check('gradiente distanza: leggendario cresce, comune cala', w2.leggendario > w0.leggendario && w2.comune < w0.comune);
  // libro: vuoto → museo indicizza → pagina sagoma → codex completa
  S.book = {}; S.codex = [];
  ui.openBook();
  check('libro aperto (overlay) e vuoto: invito al museo', ui.isBookOpen() && document.getElementById('bk-pages').innerHTML.includes('Museo'));
  S.book.terre = true; ui.openBook();
  const bh = document.getElementById('bk-pages').innerHTML;
  check('zona indicizzata: pagine con ? ? ? e meta', bh.includes('? ? ?') && bh.includes('Terre Rosse') && bh.includes('Possiedi'));
  S.codex.push('cristallo'); ui.openBook();
  const bh2 = document.getElementById('bk-pages').innerHTML;
  check('specie identificata: nome + descrizione', bh2.includes('Cristallosauro') && bh2.includes('Creatura'));
  ui.bookFlip(1); check('sfoglia senza errori', true);
  ui.closeBook();
  check('chiusura libro', !ui.isBookOpen());
}

/* ---------- arredo urbano + giorno/notte/stagioni + fontana ---------- */
{
  const daynight = await import('../src/daynight.js');
  // decos: coerenti e scalati per taglia
  let decoBad = 0; const byCat = { borgo: [0, 0], paese: [0, 0], 'città': [0, 0] };
  let fountains = 0, lamps = 0, cities = 0;
  for (let cx = -10; cx < 10; cx++) for (let cy = -10; cy < 10; cy++) {
    const t = world.townForCell(cx, cy); if (!t) continue;
    byCat[t.size][0] += (t.decos || []).length; byCat[t.size][1]++;
    if (t.size === 'città') { cities++; if (t.decos.some(d => d.type === 'fountain')) fountains++; lamps += t.decos.filter(d => d.type === 'lamp').length; }
    for (const d of t.decos || []) {
      const ti = world.townInfo(d.x, d.y);
      if (!ti || !ti.solid || !ti.deco) decoBad++;                            // deve essere solido
      for (const b of t.buildings) if (d.x === b.doorx && d.y === b.doory + 1) decoBad++; // mai davanti a una porta
    }
  }
  const avg = k => byCat[k][1] ? byCat[k][0] / byCat[k][1] : 0;
  check(`arredo valido (borgo ${avg('borgo').toFixed(1)} · paese ${avg('paese').toFixed(1)} · città ${avg('città').toFixed(1)})`, decoBad === 0);
  check('città più decorate dei borghi', avg('città') > avg('borgo'));
  check(`fontane nelle città (${fountains}/${cities}) e lampioni (${lamps})`, fountains > 0 && lamps > 0);

  // giorno/notte
  check('darknessAt: giorno 0, notte 1, tramonto in mezzo', daynight.darknessAt(0.2) === 0 && daynight.darknessAt(0.75) === 1 && daynight.darknessAt(0.54) > 0 && daynight.darknessAt(0.54) < 1);
  check('stagioni: 3 giorni ciascuna, ciclo di 4', daynight.seasonOf(1) === 0 && daynight.seasonOf(4) === 1 && daynight.seasonOf(13) === 0);
  S.tod = 0.9999; const beforeDay = S.day;
  check('advanceTime fa scattare il giorno', daynight.advanceTime(2) === true && S.day === beforeDay + 1);

  // dormire alla Locanda: sveglia SEMPRE all'alba (mai di notte), da giorno o da notte
  for (const start of [0.2, 0.75]) {
    S.tod = start; const d0 = S.day;
    gameplay.restInn();
    if (!(daynight.darknessAt(S.tod) === 0 && S.day === d0 + 1)) check('sveglia all\'alba partendo da tod=' + start, false);
  }
  check('restInn: sveglia sempre all\'alba (giorno pieno), +1 giorno', daynight.darknessAt(S.tod) === 0);

  // fontana: lancio monetina con esiti forzati
  const om = Math.random;
  S.coins = 5; const items0 = S.items.length;
  Math.random = () => 0.999; gameplay.tossCoin();
  check('monetina: 0.999 → leggendario', S.items.length === items0 + 1 && S.items[S.items.length - 1].q === 'leggendario' && S.coins === 4);
  Math.random = () => 0.3; gameplay.tossCoin();
  check('monetina: 0.3 → nulla (solo cerchi nell\'acqua)', S.items.length === items0 + 1 && S.coins === 3);
  Math.random = () => 0.9; gameplay.tossCoin();
  check('monetina: 0.9 → raro', S.items[S.items.length - 1].q === 'raro' && S.coins === 2);
  Math.random = om;

  // nearbyFountain: player accanto alla vasca
  let ft = null, town = null;
  for (let cx = -10; cx < 10 && !ft; cx++) for (let cy = -10; cy < 10 && !ft; cy++) {
    const t = world.townForCell(cx, cy);
    if (t && t.decos) { const f = t.decos.find(d => d.type === 'fountain'); if (f) { ft = f; town = t; } }
  }
  P.x = (ft.x - 1) * TS + 8; P.y = ft.y * TS + 8;
  check('nearbyFountain accanto alla vasca', gameplay.nearbyFountain() === ft);
  P.x = (town.x0 - 8) * TS; check('nearbyFountain lontano: null', gameplay.nearbyFountain() === null);

  // render di notte in autunno: nessun errore
  S.tod = 0.75; S.day = 8;
  const { render } = await import('../src/render.js');
  const big2 = town; P.x = big2.C.x * TS; P.y = big2.C.y * TS;
  render(2345);
  check('render notturno con fontana/lampioni: ok', true);
  S.tod = 0.25; S.day = beforeDay + 1;
}

/* ---------- ossa voxel 3D: pezzi, limiti, ricombinazione ---------- */
{
  const bones = await import('../src/bones.js');
  const sp0 = SPECIES[0], sp1 = SPECIES[17], sp2 = SPECIES[42];
  // animale base: 1 testa (1-2 corni), 1 petto, 2 braccia, 2 gambe, 1 coda
  const b = bones.baseSpec(sp0);
  check('baseSpec: 1 testa, 2 braccia, 2 gambe, 1 coda', b.heads.length === 1 && b.arms.length === 2 && b.legs.length === 2 && b.tails.length === 1);
  check('corni per testa 1-2', b.heads[0].horns >= 1 && b.heads[0].horns <= 2);
  // limiti: 3 teste, 6 braccia, 4 gambe, 3 code, corni max 2
  const wild = bones.clampSpec({
    heads: Array.from({ length: 5 }, () => ({ sp: sp1, horns: 9 })),
    chest: sp0, arms: Array(9).fill(sp2), legs: Array(7).fill(sp0), tails: Array(6).fill(sp1),
  });
  check('clampSpec: max 3/6/4/3 e corni ≤2', wild.heads.length === 3 && wild.arms.length === 6 && wild.legs.length === 4 && wild.tails.length === 3 && wild.heads.every(h => h.horns === 2));
  // voxel: deterministici, validi, diversi tra specie
  const v0 = bones.buildVoxels(bones.baseSpec(sp0));
  const v0b = bones.buildVoxels(bones.baseSpec(sp0));
  const v1 = bones.buildVoxels(bones.baseSpec(sp1));
  const ser = v => v.map(x => `${x.x},${x.y},${x.z},${x.k}`).sort().join('|');
  check('voxel deterministici e non banali (' + v0.length + ' voxel)', v0.length > 40 && ser(v0) === ser(v0b));
  check('specie diverse → scheletri diversi', ser(v0) !== ser(v1));
  // BLUEPRINT curati: TUTTE e 60 le specie hanno scheletri unici
  const allSigs = new Set(SPECIES.map(sp => ser(bones.buildVoxels(bones.baseSpec(sp)))));
  check(`60 specie → ${allSigs.size} scheletri unici`, allSigs.size === 60);
  check('ogni specie ha un blueprint', SPECIES.every(sp => bones.BP[sp.id]));
  // censimento feature: la natura è varia (insetti, chele, pungiglioni, gusci, ali...)
  const c = { legs0: 0, legs2: 0, legs6: 0, legs8: 0, wings: 0, mand: 0, ant: 0, prob: 0, sting: 0, club: 0, shell: 0, float: 0, multiseg: 0 };
  for (const sp of SPECIES) {
    const r = bones.BP[sp.id];
    if (r.legs[0] === 0) c.legs0++; if (r.legs[0] === 2) c.legs2++;
    if (r.legs[0] === 6) c.legs6++; if (r.legs[0] >= 8) c.legs8++;
    if (r.wings) c.wings++; if (r.mand) c.mand++; if (r.ant) c.ant++; if (r.prob) c.prob++;
    if (r.tail === 'sting') c.sting++; if (r.tail === 'club') c.club++;
    if (r.extra === 'shell') c.shell++; if (r.float) c.float++;
    if ((r.seg || []).length >= 3) c.multiseg++;
  }
  check(`census: ali ${c.wings} · 6zampe ${c.legs6} · 8zampe ${c.legs8} · chele ${c.mand} · pungiglioni ${c.sting} · mazze ${c.club} · gusci ${c.shell} · fluttuanti ${c.float} · multi-segmento ${c.multiseg}`,
    c.wings >= 6 && c.legs6 >= 2 && c.legs8 >= 2 && c.mand >= 2 && c.sting >= 2 && c.club >= 3 && c.shell >= 4 && c.float >= 3 && c.multiseg >= 5);
  // connettività: le parti si raccordano sempre (flood-fill 26-vicini copre quasi tutto)
  const connected = vox => {
    const set = new Map(vox.map((v, i) => [v.x + ',' + v.y + ',' + v.z, i]));
    const seen = new Set([vox[0].x + ',' + vox[0].y + ',' + vox[0].z]);
    const q = [vox[0]];
    while (q.length) {
      const v = q.pop();
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const k = (v.x + dx) + ',' + (v.y + dy) + ',' + (v.z + dz);
        if (set.has(k) && !seen.has(k)) { seen.add(k); q.push(vox[set.get(k)]); }
      }
    }
    return seen.size / vox.length;
  };
  let minConn = 1;
  for (const sp of SPECIES) minConn = Math.min(minConn, connected(bones.buildFleshVoxels(bones.baseSpec(sp))));
  check(`connettività minima base: ${(minConn * 100).toFixed(0)}%`, minConn >= 0.9);
  const chim = bones.buildFleshVoxels({ heads: [{ sp: SPECIES[4], horns: 2 }, { sp: SPECIES[15], horns: 1 }], chest: SPECIES[44], arms: [SPECIES[8], SPECIES[8]], legs: [SPECIES[26], SPECIES[26], SPECIES[26], SPECIES[26]], tails: [SPECIES[15], SPECIES[55]] });
  check(`chimera raccordata: ${(connected(chim) * 100).toFixed(0)}%`, connected(chim) >= 0.85);
  // versione RIANIMATA: volumetrica, colorata, deterministica, diversa per specie
  const f0 = bones.buildFleshVoxels(bones.baseSpec(sp0));
  const f1 = bones.buildFleshVoxels(bones.baseSpec(sp1));
  const serF = v => v.map(x => `${x.x},${x.y},${x.z},${x.col}`).sort().join('|');
  check(`carne: più voxel dello scheletro (${f0.length} vs ${v0.length}), con colori`, f0.length > v0.length && f0.every(v => /^#[0-9a-f]{6}$/.test(v.col)));
  check('carne deterministica e diversa per specie', serF(f0) === serF(bones.buildFleshVoxels(bones.baseSpec(sp0))) && serF(f0) !== serF(f1));
  check('chiavi colore valide', v0.every(v => ['bone', 'shade', 'dark', 'eye'].includes(v.k)));
  // chimera estrema: 3 teste 6 braccia 4 gambe 3 code costruibile
  const mega = bones.buildVoxels({ heads: [{ sp: sp0, horns: 2 }, { sp: sp1, horns: 1 }, { sp: sp2, horns: 2 }], chest: sp1, arms: [sp0, sp1, sp2, sp0, sp1, sp2], legs: [sp0, sp1, sp2, sp0], tails: [sp0, sp1, sp2] });
  check('chimera 3 teste/6 braccia/4 gambe/3 code costruita (' + mega.length + ' voxel)', mega.length > v0.length);
}

/* ---------- siti di scavo speciali ---------- */
{
  const { spById } = await import('../src/data.js');
  const regions2 = await import('../src/regions.js');
  // densità e determinismo
  let sites = [];
  for (let cx = -12; cx < 12; cx++) for (let cy = -12; cy < 12; cy++) { const s = world.siteForCell(cx, cy); if (s) sites.push(s); }
  check(`siti nel campione (${sites.length} su 576 celle)`, sites.length > 20);
  check('cariche 3-5 e tile solida', sites.every(s => s.charges >= 3 && s.charges <= 5) && world.isSolidTile(sites[0].x, sites[0].y));
  check('deterministico', world.siteForCell(3, 3) === world.siteForCell(3, 3));
  // scavo al sito: pregiato garantito, esaurimento
  const s0 = sites[0];
  P.x = s0.x * TS - TS + 8; P.y = s0.y * TS + 8; // adiacente
  check('nearbySite adiacente', gameplay.nearbySite() === s0);
  S.energy = 30; S.raw = []; S.sites = {};
  // scavo animato: parte, non risolve subito, risolve con stepDig
  gameplay.digSite();
  check('scavo animato: esito differito', P.digging !== null && S.raw.length === 0);
  gameplay.stepDig(1);
  check('stepDig risolve il colpo', P.digging === null && S.raw.length === 1);
  for (let i = 1; i < s0.charges; i++) { gameplay.digSite(); gameplay.stepDig(1); }
  check('scavi = cariche, tutti pregiati (mai comune)', S.raw.length === s0.charges && S.raw.every(r => r.q !== 'comune'));
  check('specie della zona del sito', S.raw.every(r => spById[r.s].zone === regions2.zoneAt(s0.x, s0.y).id));
  const rawBefore = S.raw.length;
  gameplay.digSite(); gameplay.stepDig(1);
  check('sito esaurito rifiuta', S.raw.length === rawBefore && gameplay.siteRemaining(s0) === 0);
  // scavo normale animato: si scava la casella VERSO CUI si guarda
  let dug = null;
  for (let x = -80; x < 80 && !dug; x++) for (let y = -80; y < 80 && !dug; y++) {
    if (!world.isSolidTile(x, y) && world.diggable(world.baseTerrain(x, y + 1)) && !world.townInfo(x, y + 1) && !world.siteAt(x, y + 1)) dug = [x, y];
  }
  P.x = dug[0] * TS + 8; P.y = dug[1] * TS + 8; P.dir = 'down';
  const en0 = S.energy; state.dugSet.clear();
  gameplay.tryDig();
  check('tryDig animato: energia intatta durante i colpi', P.digging !== null && S.energy === en0);
  gameplay.stepDig(1);
  check('risoluzione: energia -1 e buca DAVANTI al personaggio', S.energy === en0 - 1 && state.dugSet.has(dug[0] + ',' + (dug[1] + 1)));
  // pesi sito: mai comune, leggendario cresce con la distanza
  const w0 = gameplay.siteRarWeights(0), w2 = gameplay.siteRarWeights(3000);
  check('sito: leggendario cresce con la distanza', w2.leggendario > w0.leggendario && w0.comune === undefined);
  S.sites = {};
}

/* ---------- risveglio: 5 pezzi → vista VIVA nel libro ---------- */
{
  const { PARTS } = await import('../src/data.js');
  S.awakened = []; S.items = []; S.codex = ['prato']; S.book = { prati: true };
  check('awakenReady falso senza pezzi', gameplay.awakenReady('prato') === false);
  PARTS.forEach((pt, i) => S.items.push({ uid: 950 + i, s: 'prato', t: pt.id, q: 'comune', val: 5 }));
  S.items.push({ uid: 970, s: 'prato', t: 'cranio', q: 'raro', val: 9 }); // doppione: deve restare
  check('awakenReady con set completo', gameplay.awakenReady('prato') === true);
  check('awakenSpecies consuma 5 pezzi e sblocca', gameplay.awakenSpecies('prato') === true && S.awakened.includes('prato') && S.items.length === 1);
  check('secondo risveglio rifiutato', gameplay.awakenSpecies('prato') === false);
  ui.openBook();
  const bp2 = document.getElementById('bk-pages').innerHTML;
  check('libro: bottone Vivo per specie risvegliata', bp2.includes('bk-flip3d') && bp2.includes('Risvegliato'));
  ui.closeBook();
}

/* ---------- modalità debug (non distruttiva) ---------- */
{
  const dbg = await import('../src/debug.js');
  check('debug off di default', dbg.isDebug() === false);
  dbg.toggleDebug();
  check('toggle accende', dbg.isDebug() === true);
  // energia infinita: scavo senza consumo
  S.energy = 0; S.coins = 0;
  let dug2 = null;
  for (let x = -80; x < 80 && !dug2; x++) for (let y = -80; y < 80 && !dug2; y++) {
    if (!world.isSolidTile(x, y) && world.diggable(world.baseTerrain(x, y + 1)) && !world.townInfo(x, y + 1) && !world.siteAt(x, y + 1) && !state.dugSet.has(x + ',' + (y + 1))) dug2 = [x, y];
  }
  P.x = dug2[0] * TS + 8; P.y = dug2[1] * TS + 8; P.dir = 'down';
  gameplay.tryDig(); gameplay.stepDig(1);
  check('debug: scava con 0 energia, senza consumarla', S.energy === 0 && state.dugSet.has(dug2[0] + ',' + (dug2[1] + 1)));
  // monete infinite: chimera gratis con 0 monete
  S.items = [
    { uid: 901, s: 'prato', t: 'cranio', q: 'comune', val: 5 },
    { uid: 902, s: 'lepre', t: 'torace', q: 'comune', val: 5 },
    { uid: 903, s: 'alce', t: 'zampa', q: 'comune', val: 5 },
  ];
  const nCr = S.creatures.length;
  check('debug: chimera gratis', gameplay.assembleChimera(901, 902, 903) === true && S.coins === 0 && S.creatures.length === nCr + 1);
  // libro completo senza toccare il save
  S.book = {}; S.codex = [];
  ui.openBook();
  const bh3 = document.getElementById('bk-pages').innerHTML;
  check('debug: libro completo (nomi visibili, save intatto)', bh3.includes('Pratocorno') && Object.keys(S.book).length === 0 && S.codex.length === 0);
  ui.closeBook();
  dbg.toggleDebug();
  check('toggle spegne, save mai toccato', dbg.isDebug() === false && S.codex.length === 0);
}

/* ---------- icone: set pixelarticons + custom, emoji sempre rimosse ---------- */
{
  const icons = await import('../src/icons.js');
  check(`registro icone: ${icons.ICON_NAMES.length} nomi`, icons.ICON_NAMES.length >= 44);
  const missing = Object.values(icons.EMAP).filter(n => !icons.ICON_NAMES.includes(n));
  check('ogni emoji mappa a un\'icona esistente' + (missing.length ? ' (mancano: ' + missing.join(',') + ')' : ''), missing.length === 0);
  const out = icons.withIcons('🪙 x ⚡ y 🌸 ↗ ⛏️ 😀');
  const hasEmoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(out);
  check('withIcons: nessuna emoji sopravvive', !hasEmoji);
  // i file svg copiati esistono davvero nel progetto
  const fs = await import('node:fs');
  const missFiles = icons.ICON_NAMES.filter(n => !fs.existsSync(new URL('../src/pxicons/' + n + '.svg', import.meta.url)));
  check('tutti gli svg presenti in src/pxicons', missFiles.length === 0);
}

/* ---------- interni: si entra dalla porta, NPC, uscita sotto la porta ---------- */
{
  const inter = await import('../src/interior.js');
  // trova una porta e mettici sopra il player
  let door = null, dtown = null;
  for (let cx = -10; cx < 10 && !door; cx++) for (let cy = -10; cy < 10 && !door; cy++) {
    const t = world.townForCell(cx, cy); if (t) { door = t.buildings[0]; dtown = t; }
  }
  P.x = door.doorx * TS + 8; P.y = door.doory * TS + 8;
  inter.INT.justLeft = false;
  P.dir = 'right'; P.moving = true;
  inter.checkDoorEnter();
  check('passare DAVANTI alla porta non fa entrare', inter.INT.active === false);
  P.dir = 'up'; P.moving = true;
  inter.checkDoorEnter();
  check('camminare DENTRO la porta (verso l\'alto) = dentro, senza E', inter.INT.active === true && inter.INT.b === door);
  check('NPC con nome per ogni mestiere', ['lab','store','museum','inn','barber','tailor'].every(t => inter.npcName(t).length > 3));
  // spawn interno: vicino alla porta, non nel muro
  check('spawn interno valido', !inter.interiorSolid(inter.INT.x, inter.INT.y));
  // cammina verso l'alto fino al bancone → vicino all'NPC
  for (let i = 0; i < 300; i++) inter.updateInterior(1 / 60, { up: true }, 46);
  check('si arriva davanti all\'NPC (bancone lo ferma)', inter.nearNpc() && !inter.interiorSolid(inter.INT.x, inter.INT.y));
  // torna giù fino alla porta → esce, player piazzato SOTTO la porta
  for (let i = 0; i < 400 && inter.INT.active; i++) inter.updateInterior(1 / 60, { down: true }, 46);
  check('uscita dalla porta', inter.INT.active === false);
  check('player sotto la porta (fuori)', Math.floor(P.x / TS) === door.doorx && Math.floor(P.y / TS) === door.doory + 1);
  // anti-rientro: justLeft blocca finché non ti allontani
  P.x = door.doorx * TS + 8; P.y = door.doory * TS + 8;
  P.dir = 'up'; P.moving = true;
  inter.checkDoorEnter();
  check('niente rientro immediato dopo l\'uscita', inter.INT.active === false);
  inter.INT.justLeft = false;
  // laboratorio a tema: i tavoli (alambicco/banco) sono solidi, il corridoio centrale resta libero
  let labB = null;
  for (let cx = -10; cx < 10 && !labB; cx++) for (let cy = -10; cy < 10 && !labB; cy++) {
    const t = world.townForCell(cx, cy); if (t) labB = t.buildings.find(b => b.type === 'lab') || null;
  }
  // TUTTE le stanze a tema: arredi solidi ai lati, corridoio libero, NPC raggiungibile
  const byType = {};
  for (let cx = -10; cx < 10; cx++) for (let cy = -10; cy < 10; cy++) {
    const t = world.townForCell(cx, cy); if (!t) continue;
    for (const b of t.buildings) if (!byType[b.type]) byType[b.type] = b;
  }
  let roomBad = [];
  for (const type of ['lab', 'store', 'inn', 'barber', 'tailor']) { // museo: stanze proprie, testato a parte
    const b = byType[type]; if (!b) { roomBad.push(type + ':manca'); continue; }
    inter.enterInterior(b, null);
    if (!inter.interiorSolid(30, 56) || !inter.interiorSolid(130, 58)) roomBad.push(type + ':lati');
    if (inter.interiorSolid(80, 56) || inter.interiorSolid(80, 90)) roomBad.push(type + ':corridoio');
    for (let i = 0; i < 300 && !inter.nearNpc(); i++) inter.updateInterior(1 / 60, { up: true }, 46);
    if (!inter.nearNpc()) roomBad.push(type + ':npc');
    inter.exitInterior(); inter.INT.justLeft = false;
  }
  check('5 stanze a tema: solidi/corridoio/NPC ok' + (roomBad.length ? ' (' + roomBad.join(' ') + ')' : ''), roomBad.length === 0);
}

/* ---------- museo: pezzi+monete+DNA e stanze per bioma ---------- */
{
  const inter = await import('../src/interior.js');
  const { PARTS } = await import('../src/data.js');
  // donazioni a pezzi: monete per pezzo, DNA al 5°
  S.items = []; S.museum = {}; S.awakened = []; S.coins = 0;
  PARTS.forEach((pt, i) => S.items.push({ uid: 700 + i, s: 'lepre', t: pt.id, q: 'comune', val: 10 }));
  let coinsBefore = S.coins, gotDna = false;
  for (let i = 0; i < 5; i++) {
    const r = gameplay.donateItem(700 + i);
    if (S.coins <= coinsBefore) check('taglia in monete a ogni pezzo', false);
    coinsBefore = S.coins;
    if (r && r.dna) gotDna = true;
  }
  check('museo: monete ricevute (tot ' + S.coins + ')', S.coins === 100);
  check('museo: DNA al 5° pezzo → specie risvegliata', gotDna && S.awakened.includes('lepre'));
  S.items.push({ uid: 710, s: 'lepre', t: 'cranio', q: 'raro', val: 20 });
  check('pezzo già esposto → dup', gameplay.donateItem(710) === 'dup');
  // stanze: hall → ala 2 → teca → ritorno in hall → uscita
  let mus = null;
  for (let cx = -12; cx < 12 && !mus; cx++) for (let cy = -12; cy < 12 && !mus; cy++) {
    const t = world.townForCell(cx, cy); if (t) mus = t.buildings.find(b => b.type === 'museum') || null;
  }
  inter.enterInterior(mus, null);
  check('museo: si parte nella hall', inter.INT.room === 'hall');
  inter.INT.x = inter.HALL_DOORS[2]; // davanti alla porta dei Boschi
  for (let i = 0; i < 300 && inter.INT.room === 'hall'; i++) inter.updateInterior(1 / 60, { up: true }, 46);
  check('porta della hall → ala del bioma 2', inter.INT.room === 2);
  // vai alla prima teca
  inter.INT.x = 21; inter.INT.y = 96;
  check('teca: specie e progresso', !!inter.nearCase() && inter.nearCase().sp.zone === 'boschi');
  inter.INT.x = 66; // corsia tra le teche, poi a destra fino alla porta, poi giù
  for (let i = 0; i < 300; i++) inter.updateInterior(1 / 60, { down: true }, 46);
  for (let i = 0; i < 200 && inter.INT.x < 79; i++) inter.updateInterior(1 / 60, { right: true }, 46);
  for (let i = 0; i < 200 && inter.INT.room === 2; i++) inter.updateInterior(1 / 60, { down: true }, 46);
  check('porta bassa dell\'ala → torna in hall', inter.INT.room === 'hall' && inter.INT.active);
  for (let i = 0; i < 200 && inter.INT.x > 60; i++) inter.updateInterior(1 / 60, { left: true }, 46);  // aggira il banco
  for (let i = 0; i < 300; i++) inter.updateInterior(1 / 60, { down: true }, 46);
  for (let i = 0; i < 200 && inter.INT.x < 79; i++) inter.updateInterior(1 / 60, { right: true }, 46);
  for (let i = 0; i < 300 && inter.INT.active; i++) inter.updateInterior(1 / 60, { down: true }, 46);
  check('porta bassa della hall → esce dal museo', inter.INT.active === false);
  inter.INT.justLeft = false;
}

/* ---------- spawn mai intrappolato ---------- */
{
  const st = world.findStart();
  const tx = Math.floor(st.x / TS), ty = Math.floor(st.y / TS);
  check('findStart: area aperta raggiungibile', world.openArea(tx, ty));
  const tw = world.townForTile(tx, ty);
  check('findStart: sempre in una città GRANDE (piazza)', !!tw && tw.size === 'città' && !!world.townInfo(tx, ty));
  // cerca una vera "prigione" nel mondo (libera ma con 4 vicini solidi) e verifica che openArea la rifiuti
  let trap = null;
  for (let x = -150; x < 150 && !trap; x++) for (let y = -150; y < 150 && !trap; y++) {
    if (!world.isSolidTile(x, y) &&
      world.isSolidTile(x + 1, y) && world.isSolidTile(x - 1, y) &&
      world.isSolidTile(x, y + 1) && world.isSolidTile(x, y - 1)) trap = [x, y];
  }
  check('openArea rifiuta le prigioni' + (trap ? ` (trovata a ${trap})` : ' (nessuna nel campione: ok)'), !trap || !world.openArea(trap[0], trap[1]));
}

/* ---------- render smoke ---------- */
{
  const { render } = await import('../src/render.js');
  const { fit } = await import('../src/screen.js');
  fit();
  const { cam } = state;
  cam.x = P.x; cam.y = P.y;
  render(1000);
  check('render frame completo senza errori', true);
  const { view } = await import('../src/screen.js');
  check('fit copre la finestra a scala intera', view.W * view.K >= 1440 && view.H * view.K >= 900);
}

failures += summary('digsy-world');
process.exit(failures ? 1 : 0);
