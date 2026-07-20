/* Meccaniche: scavo, economia, chimere, collisioni, interazione */
import { TS, PARTS, RAR, ptById, spById, zonePools, SPECIES, ALL_SPECIES, CHIMERA_COST, GOODS, goodById, availableNow, hasWindow } from './data.js';
import { fusibleGroups, fuse, NEEDED as FUSE_NEEDED } from './fuse.js';
import { fits } from './path.js';
import { bodyHits, feetTile, FOOT_DY } from './body.js';
import { S, P, save, spendEnergy, dugSet, choppedSet, minedSet, pickedSet, compactGoods, GOOD_STACK } from './state.js';
import { baseTerrain, diggable, digChance, townInfo, townForTile, townForCell, openArea, TCELL, solidPx, siteForCell, siteAt, wreckForCell, WCELL, decoAt, pickupAt, SCELL, DEEP, WATER, CHOPPABLE, MINEABLE } from './world.js';
import { compass } from './compass.js';
import { landmarkNear, harvestDecoAt } from './world.js';
import { vhash as vhashW } from './noise.js';
import { discoverWonder, wonderReadyIn, wonderStatusText, markWonderUsed, rememberArch, addBuff, useBuff } from './wonders.js';
import { zoneAt } from './regions.js';
import { isDebug } from './debug.js';
import { toast, updateHUD, openBuilding, openExhibit, openQuestBoard, openCompanionPicker, openMentor, openWonder, showTip } from './ui.js';
import { companionAbility } from './companion.js';
import { addXp, XP_BY_RAR, digDurationMul, rareBonus } from './progress.js';
import { weatherAt, weatherDropMul } from './weather.js';
import { playSfx } from './audio.js';
import { INT, nearNpc, nearCase, nearMentorInt } from './interior.js';
import { CAVE, digCave } from './cave.js';
import { isNight, seasonOf } from './daynight.js';
import { tr, actKey, LANG, partName, rarLabel, seasonName } from './i18n.js';

/* momento attuale del mondo, per le finestre di presenza delle specie */
function availableNow2() { return { night: isNight(), season: seasonOf(S.day) }; }
/* elenco delle specie che escono SOLO adesso (usato dai testi: "stanotte si sente il Grillosso") */
export function windowSpeciesNow(zoneId) {
  const now = availableNow2();
  return (zonePools[zoneId] || []).filter(s => hasWindow(s) && availableNow(s, now.night, now.season));
}
/* ---------- scavo ---------- */
/* gradiente di esplorazione: più lontano dall'origine → più peso a rari e leggendari */
/* PESI DI RARITÀ — tarati sui numeri dei giochi di riferimento (vedi BILANCIAMENTO.md):
   comune 75 · raro 17.5 · eccezionale 6 · leggendario 1.5 sul totale dei ritrovamenti, che con
   una resa di scavo del 40% dà per SCAVO: ~30% comune, ~7% raro, ~2.5% ecc., ~0.6% leggendario
   (Stardew: Dinosaur Egg 0.6%, Genshin 5★ base 0.6%). La distanza dall'origine sposta i pesi
   verso l'alto senza mai raddoppiarli. */
export function rarWeights(dist) {
  const g = 1 + Math.min(1.6, (dist || 0) / 900); // in tile
  const rb = rareBonus(); // livello archeologo: più chance di rari/leggendari
  return { comune: 75 / g, raro: 17.5, eccezionale: 6 * g * rb, leggendario: 1.5 * g * rb };
}
/* XP con toast di livello (chiamato quando ottieni un reperto/oggetto) */
export function gainXp(n) { if (useBuff('xpX2')) n *= 2; addXp(n, lv => { toast('🎓 ' + tr('Livello archeologo ', 'Archaeologist level ') + lv + '! +5 ⚡'); playSfx('found'); updateHUD(); }); }
/* reperto della ZONA: specie pescata con peso = rarità intrinseca (× gradiente distanza) */
/* src: da dove si estrae — 'terra' (default), 'albero', 'roccia', 'acqua', 'any' (siti/fontana/mappe) */
export function makeRaw(zoneId, dist, forceRar, src = 'terra') {
  const zPool = zonePools[zoneId] || zonePools.prati;
  const bySrc = src === 'any' ? zPool : zPool.filter(s => (s.src || 'terra') === src);
  /* finestre di presenza: le specie notturne/stagionali non escono fuori dal loro momento.
     Se il filtro svuota il paniere si torna indietro (meglio un doppione che nessun reperto). */
  const now = availableNow2();
  const pool = bySrc.filter(s => availableNow(s, now.night, now.season));
  /* niente fallback: fuori dalla sua finestra la specie NON c'è. Con 'terra'/'any' il paniere
     non si svuota mai (c'è sempre una specie senza finestra per ogni rarità), quindi il null
     capita solo pescando di giorno o minando fuori stagione — dove è il comportamento voluto. */
  if (!pool.length) return null;
  let sp;
  if (forceRar) {
    const cand = pool.filter(s => s.r === forceRar);
    sp = cand[Math.floor(Math.random() * cand.length)] || pool[0] || zPool[0];
  } else if (pool.length === 1) sp = pool[0];
  else if (pityRar()) {                       // sfortuna prolungata: rarità garantita
    const want = pityRar();
    const cand = pool.filter(s => s.r === want);
    sp = pickNeeded(cand.length ? cand : pool);
  } else {
    /* prima si estrae la RARITÀ coi pesi dichiarati, poi una specie fra quelle di quella
       rarità. Pesando direttamente le specie i comuni (4 su 10) uscivano l'85% delle volte
       invece del 58%, e i leggendari l'1,1% invece del 3%. */
    const w = rarWeights(dist);
    const kinds = ['comune', 'raro', 'eccezionale', 'leggendario'].filter(q => pool.some(s => s.r === q));
    const tot = kinds.reduce((a, q) => a + w[q], 0);
    let r = Math.random() * tot, pick = kinds[0];
    for (const q of kinds) { r -= w[q]; if (r <= 0) { pick = q; break; } }
    const cand = pool.filter(s => s.r === pick);
    sp = pickNeeded(cand.length ? cand : pool) || pool[0] || zPool[0];
  }
  notePity(sp.r);                             // aggiorna i contatori di sfortuna
  const part = pickPart(sp.id);
  const val = Math.max(2, Math.round(7 * ptById[part].mult * RAR.find(r => r.id === sp.r).mult * (1 + (dist || 0) / 900)));
  return { uid: S.uid++, s: sp.id, t: part, q: sp.r, val };
}

/* ---------- PITY TIMER e ANTI-DOPPIONE ----------
   Senza protezione, con lo 0.6% di leggendari il 10% dei giocatori resta a secco per centinaia
   di scavi (e con 5 pezzi per specie i doppioni diventano il muro finale). Due protezioni:
   1) rarità garantita dopo N scavi sfortunati (Genshin/Hearthstone);
   2) a parità di rarità si pesca prima ciò che ti MANCA (Hearthstone no-duplicate). */
export const PITY = { raro: 30, eccezionale: 90, leggendario: 280 };
function pityCount(q) { return (S.pity || {})[q] || 0; }
function pityRar() {
  if (pityCount('leggendario') >= PITY.leggendario) return 'leggendario';
  if (pityCount('eccezionale') >= PITY.eccezionale) return 'eccezionale';
  if (pityCount('raro') >= PITY.raro) return 'raro';
  /* soft pity: oltre il 70% della soglia leggendaria la probabilità sale davvero */
  const soft = pityCount('leggendario') - Math.round(PITY.leggendario * 0.7);
  if (soft > 0 && Math.random() < soft * 0.01) return 'leggendario';
  return null;
}
function notePity(got) {
  if (!S.pity) S.pity = {};
  const order = ['raro', 'eccezionale', 'leggendario'];
  const gi = order.indexOf(got);
  for (let i = 0; i < order.length; i++) {
    if (gi >= i) S.pity[order[i]] = 0;                 // hai avuto qualcosa di pari o meglio
    else S.pity[order[i]] = (S.pity[order[i]] || 0) + 1;
  }
}
/* fra le specie candidate preferisce quelle che ti mancano: mai completate ×3, mai viste ×5 */
function pickNeeded(cand) {
  if (!cand || !cand.length) return null;
  const w = cand.map(s => {
    const have = (S.museum && S.museum[s.id] || []).length;
    if (!S.codex.includes(s.id)) return 5;             // mai vista
    if (have < 5) return 3;                            // teca incompleta
    return 1;
  });
  const tot = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot;
  for (let i = 0; i < cand.length; i++) { r -= w[i]; if (r <= 0) return cand[i]; }
  return cand[cand.length - 1];
}
/* la PARTE: si preferisce un pezzo che manca alla teca di quella specie */
function pickPart(spId) {
  const owned = new Set([...(S.museum && S.museum[spId] || []),
    ...S.raw.filter(it => it.s === spId).map(it => it.t),
    ...S.items.filter(it => it.s === spId).map(it => it.t)]);
  const miss = PARTS.filter(p => !owned.has(p.id));
  const pool = miss.length && Math.random() < 0.75 ? miss : PARTS;   // 75%: colma i buchi
  return pool[Math.floor(Math.random() * pool.length)].id;
}
/* ---------- ZAINO: capacità limitata di FOSSILI; l'eccesso resta a TERRA (S.drops) ----------
   zaini più grandi (Negozio) alzano la capacità. I fossili a terra si riprendono con E. */
/* Capienza e costi TARATI SULLA PRIMA ORA. Con 10 slot iniziali lo zaino si riempiva in
   ~25 scavi, cioè un paio di minuti, e si tornava al Museo di continuo — proprio quando non
   si hanno ancora monete per ingrandirlo, perché i GREZZI non si vendono e le prime monete
   arrivano solo dopo il primo Museo. 14 slot e un primo salto più economico allentano quel
   nodo senza toccare la generazione del mondo (i salvataggi restano validi). */
export const BAG_CAPS = [14, 22, 30, 40];               // capacità per livello
export const BAG_UPCOST = [30, 100, 240];               // costo per salire di livello
export function bagCap() { return S.bagCap || BAG_CAPS[0]; }
export function bagLevel() { return Math.max(0, BAG_CAPS.indexOf(bagCap())); }
export function fossilCount() { return S.raw.length + S.items.length; }
export function bagFull() { return !isDebug() && fossilCount() >= bagCap(); }
export function dropAt(tx, ty, kind, payload) { if (!S.drops) S.drops = []; S.drops.push({ uid: S.uid++, tx, ty, kind, payload }); }
/* aggiunge un fossile grezzo: in zaino se c'è posto, altrimenti a TERRA sulla tile (tx,ty) */
export function addFossil(raw, tx, ty) {
  gainXp(XP_BY_RAR[raw.q] || 4); // trovare un reperto dà XP (anche se lo lasci a terra)
  if (bagFull()) { dropAt(tx, ty, 'raw', raw); toast('🎒 ' + tr('Zaino pieno: reperto lasciato a terra', 'Bag full: find left on the ground')); playSfx('nope'); showTip('bagfull'); return false; }
  S.raw.push(raw); return true;
}
export function nextBagCost() { const l = bagLevel(); return l < BAG_UPCOST.length ? BAG_UPCOST[l] : null; }
export function buyBag() {
  const l = bagLevel(), cost = nextBagCost();
  if (cost == null) { toast(tr('Hai già lo zaino più grande', 'You already have the biggest bag')); return false; }
  if (S.coins < cost && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + cost); return false; }
  if (!isDebug()) S.coins -= cost;
  S.bagCap = BAG_CAPS[l + 1]; playSfx('coin');
  toast('🎒 ' + tr('Zaino più grande! Capienza ', 'Bigger bag! Capacity ') + S.bagCap);
  save(); updateHUD(); return true;
}
/* ---------- animazione di scavo: i controlli subito, l'esito a fine colpi ---------- */
function beginDig(dur, cb, kind) { if (P.digging) return false; P.digging = { t: 0, dur: dur * digDurationMul(), cb, kind: kind || 'dig' }; return true; }
/* chiamato dal game loop: avanza l'animazione e risolve alla fine */
export function stepDig(dt) {
  const d = P.digging; if (!d) return;
  d.t += dt;
  if (d.t >= d.dur) { P.digging = null; d.cb(); }
}
/* si scava la casella VERSO CUI si guarda */
/* si scava sempre SOTTO I PIEDI: mai il cubetto sbagliato.
   P.x/P.y è l'ancora ALTA dello sprite: i piedi stanno a +13 (vedi collide) */
export function digTarget() {
  return { tx: Math.floor(P.x / TS), ty: Math.floor((P.y + FOOT_DY) / TS) };
}
export function tryDig() {
  const { tx, ty } = digTarget();
  const key = tx + ',' + ty;
  const t = baseTerrain(tx, ty);
  const ti = townInfo(tx, ty);
  if (ti) { toast(tr('Non si scava in città', 'No digging in town')); return; } // vale anche SOTTO gli edifici
  if (!S.tools.spade && !isDebug()) { toast('🪏 ' + tr('Serve la pala (Negozio)', 'You need a spade (Shop)')); return; }
  if (!diggable(t)) { toast(tr('Qui non si può scavare', 'You can\'t dig here')); return; }
  if (dugSet.has(key)) { toast(tr('Già scavato qui', 'Already dug here')); return; }
  if (S.energy <= 0 && !isDebug()) { toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn')); playSfx('nope'); showTip('energy'); return; }
  beginDig(0.45, () => {
    if (!isDebug()) spendEnergy(1);
    dugSet.add(key); S.dug.push(key);
    const mp = mapAt(tx, ty);
    if (mp) { // la X della mappa: reperto GARANTITO della rarità comprata
      S.maps = S.maps.filter(m => m !== mp);
      if (S.trackMap === mp.uid) S.trackMap = null; // la bussola torna alla città
      const raw = makeRaw(zoneAt(tx, ty).id, Math.hypot(tx, ty), mp.rar, 'any');
      if (addFossil(raw, tx, ty)) toast('🗺️ ✨ ' + tr('La X non mentiva! Reperto ', 'The X was true! A ') + rarLabel(mp.rar) + tr(' (da identificare)', ' find (needs identifying)'));
      playSfx('found');
    } else {
      let ch = digChance[t] || 0.2;
      if (useBuff('digX2')) ch *= 2;                                       // spore del Cerchio di Funghi
      if (S.shovel > 0) { ch *= 1.4; S.shovel--; }                         // pala fortunata (60 cariche)
      if (companionAbility() === 'luck') ch *= 1.12;                        // compagno fortunato
      ch *= weatherDropMul(weatherAt(zoneAt(tx, ty).id, S.day));            // pioggia: un po' più ritrovamenti
      ch = Math.min(0.8, ch);                                              // cap totale: mai troppo facile
      if (Math.random() < ch) {
        const raw = makeRaw(zoneAt(tx, ty).id, Math.hypot(tx, ty));
        if (addFossil(raw, tx, ty)) { toast(tr('Reperto grezzo trovato! (da identificare)', 'Raw find unearthed! (needs identifying)')); showTip('raw'); }
        playSfx('found');
      } else { toast(tr('…solo terra', '…just dirt')); playSfx('dig'); }
      if (S.shovel === 0 && S.shovelWarn) { S.shovelWarn = false; toast('🪏 ' + tr('La pala fortunata si è consumata', 'The lucky shovel wore out')); }
    }
    save(); updateHUD();
  });
}

/* ---------- attrezzi: accetta (alberi), piccone (rocce), pala fortunata, barca ---------- */
/* scala ×2.3-2.5 per gradino, come gli upgrade di Stardew (2000→5000→10000→25000) */
export const TOOL_COST = { spade: 15, shovel: 45, axe: 90, pick: 200, boat: 460, skates: 130, bike: 500, motorboat: 1100, torch: 110, compass: 70 };
const TOOL_MSG = {
  spade: () => '🪏 ' + tr('Pala: ora puoi scavare la terra ', 'Spade: now you can dig the ground ') + actKey(),
  axe: () => '🪓 ' + tr('Accetta: abbatti gli alberi ', 'Hatchet: chop trees ') + actKey(),
  pick: () => '⛏️ ' + tr('Piccone: spacca massi e guglie ', 'Pickaxe: break boulders and spires ') + actKey(),
  boat: () => '⛵ ' + tr('Barca: cammina verso l\'acqua e salpa! (E per pescare)', 'Boat: walk onto water and sail! (E to fish)'),
  skates: () => '🛼 ' + tr('Pattini: corri al doppio della velocità', 'Skates: move at double speed'),
  bike: () => '🚲 ' + tr('Bicicletta: velocità tripla a piedi', 'Bicycle: triple speed on foot'),
  motorboat: () => '🚤 ' + tr('Motoscafo: velocità tripla sull\'acqua', 'Motorboat: triple speed on water'),
  torch: () => '🔦 ' + tr('Torcia: alone di luce più ampio (notte e grotte)', 'Torch: wider light halo (night and caves)'),
};
export function buyTool(t) {
  const cost = TOOL_COST[t]; if (cost === undefined) return false;
  if (t !== 'shovel' && S.tools[t]) { toast(tr('Ce l\'hai già', 'You already own it')); return false; }
  if (t === 'motorboat' && !S.tools.boat && !isDebug()) { toast('⛵ ' + tr('Prima serve la barca', 'You need the boat first')); return false; }
  if (S.coins < cost && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + cost); return false; }
  if (!isDebug()) S.coins -= cost;
  if (t === 'shovel') { S.shovel = (S.shovel || 0) + 60; S.shovelWarn = true; toast('🪏 ' + tr('Pala fortunata: +60 scavi col boost', 'Lucky shovel: +60 boosted digs')); }
  else { S.tools[t] = true; if (t === 'skates' || t === 'bike') S.gear = t; if (t === 'compass') S.compassOn = true; toast((TOOL_MSG[t] || (() => tr('Comprato', 'Bought')))()); }
  playSfx('coin'); save(); updateHUD();
  return true;
}
/* BUSSOLA come oggetto acquistabile e ATTIVABILE: guida verso la città solo se posseduta e accesa */
export function compassActive() { return !!(S.tools && S.tools.compass && S.compassOn); }
export function toggleCompass() { if (!S.tools || !S.tools.compass) return false; S.compassOn = !S.compassOn; save(); updateHUD(); return S.compassOn; }
/* MEZZI. L'acqua è AUTOMATICA: se hai una barca ci sali da solo entrandoci (e se hai anche
   il motoscafo parte quello, il migliore). Niente pulsante Attiva per i natanti.
   A terra invece scegli tu: S.gear = 'skates' | 'bike' | null, e la scelta RESTA — scendendo
   dalla barca o uscendo da un edificio il mezzo terrestre riparte da solo. */
export const GEARS = ['skates', 'bike'];
export function boatKind() { return S.tools.motorboat ? 'motorboat' : S.tools.boat ? 'boat' : null; }
export function hasBoat() { return !!(S.tools.boat || S.tools.motorboat); }
export function gearActive(g) { return (g === 'boat' || g === 'motorboat') ? boatKind() === g : (!!S.tools[g] && S.gear === g); }
export function activeGear() { return S.gear || null; }
export function toggleGear(g) {
  if (!S.tools[g] || !GEARS.includes(g)) return false;   // i natanti non si attivano a mano
  if (onBoat()) { toast('⛵ ' + tr('Sei in acqua: prima torna a riva', 'You are on the water: get back to shore first')); return false; }
  S.gear = S.gear === g ? null : g;
  playSfx('click'); save(); updateHUD(); return true;
}
/* mezzo a piedi attualmente attivo (per lo sprite) */
export function footGear() { return (S.gear === 'bike' && S.tools.bike) ? 'bike' : (S.gear === 'skates' && S.tools.skates) ? 'skates' : null; }
/* moltiplicatore di velocità (a piedi: bici ×3 / pattini ×2; in acqua: motoscafo ×3, barca ×1) */
export function gearSpeedMul() {
  if (onBoat()) return S.tools.motorboat ? 3 : 1;
  if (S.gear === 'bike' && S.tools.bike) return 3;
  if (S.gear === 'skates' && S.tools.skates) return 2;
  return 1;
}
/* ---------- teletrasporto: pergamena consumabile → città più vicina ---------- */
export const TELEPORT_COST = 25;
export function buyTeleport() {
  if (S.coins < TELEPORT_COST && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + TELEPORT_COST); return false; }
  if (!isDebug()) S.coins -= TELEPORT_COST;
  S.teleports = (S.teleports || 0) + 1; playSfx('coin');
  toast('📜 ' + tr('Pergamena di ritorno nello zaino', 'Return scroll in your bag'));
  save(); updateHUD(); return true;
}
/* usa una pergamena: salta alla città più vicina (qualsiasi taglia) */
export function useTeleport() {
  if (!(S.teleports > 0) && !isDebug()) { toast(tr('Nessuna pergamena', 'No scrolls')); return false; }
  const ccx = Math.floor(P.x / (TS * TCELL)), ccy = Math.floor(P.y / (TS * TCELL));
  for (let r = 0; r <= 30; r++) {
    for (let cy = ccy - r; cy <= ccy + r; cy++) for (let cx = ccx - r; cx <= ccx + r; cx++) {
      if (Math.max(Math.abs(cx - ccx), Math.abs(cy - ccy)) !== r) continue;
      const t = townForCell(cx, cy); if (!t || !t.pen) continue; // solo CITTÀ col MUSEO (il parco `pen` c'è solo nelle città grandi)
      const sx = t.C.x;
      for (let yy = t.C.y + 4; yy < t.C.y + 12; yy++) if (openArea(sx, yy)) {
        if (INT.active) { INT.active = false; INT.justLeft = true; } // se sei dentro una struttura, esci e teletrasporta comunque
        if (CAVE.active) CAVE.active = false;
        P.x = sx * TS + 8; P.y = yy * TS + 2;
        if (!isDebug()) S.teleports--;
        playSfx('found'); toast('📜 ' + tr('Teletrasportato a ', 'Teleported to ') + t.name);
        save(); updateHUD(); return true;
      }
    }
  }
  toast(tr('Nessuna città col museo trovata vicino', 'No museum city found nearby')); return false;
}
/* la tile davanti ai piedi (per abbattere/spaccare quello che guardi) */
export function facingTile() {
  const fx = P.dir === 'left' ? -1 : P.dir === 'right' ? 1 : 0;
  const fy = P.dir === 'up' ? -1 : P.dir === 'down' ? 1 : 0;
  return { tx: Math.floor(P.x / TS) + fx, ty: Math.floor((P.y + FOOT_DY) / TS) + fy };
}
function harvestDeco(kindList, tool, setAdd, arr, src, kind, okMsg, missMsg) {
  const { tx, ty } = facingTile();
  const d = decoAt(tx, ty);
  if (!d || !kindList.includes(d)) return false;
  if (!S.tools[tool]) { toast(missMsg); return true; } // consumato l'input: serve l'attrezzo
  if (S.energy <= 0 && !isDebug()) { toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn')); return true; }
  beginDig(0.5, () => {
    if (!isDebug()) spendEnergy(1);
    setAdd.add(tx + ',' + ty); arr.push(tx + ',' + ty);
    if (Math.random() < 0.5) {
      const raw = makeRaw(zoneAt(tx, ty).id, Math.hypot(tx, ty), null, src);
      if (raw && addFossil(raw, tx, ty)) toast(okMsg);
      else if (!raw) toast(src === 'roccia' ? tr('…la vena è muta in questa stagione', '…the vein is silent this season') : tr('…niente', '…nothing'));
    } else {
      /* stessa cortesia della pesca: se la vena di questa zona si apre in un'altra stagione,
         lo si dice invece di lasciar credere che sia sfortuna */
      let msg = src === 'albero' ? tr('…solo schegge di legno', '…just wood chips') : tr('…solo pietrisco', '…just rubble');
      if (src === 'roccia') {
        const sp = (zonePools[zoneAt(tx, ty).id] || []).find(x => x.src === 'roccia' && x.when && x.when.season != null);
        if (sp && sp.when.season !== seasonOf(S.day) && Math.random() < 0.5) {
          msg = tr('…solo pietrisco. Questa vena si apre in ', '…just rubble. This vein opens in ') + seasonName(sp.when.season);
        }
      }
      toast(msg);
    }
    playSfx(kind === 'chop' ? 'chop' : 'mine');
    save(); updateHUD();
  }, kind);
  return true;
}
export function tryChop() {
  return harvestDeco(CHOPPABLE, 'axe', choppedSet, S.chopped, 'albero', 'chop',
    '🌲 ' + tr('Tra le radici: un reperto! (da identificare)', 'Among the roots: a find! (needs identifying)'),
    '🪓 ' + tr('Serve l\'accetta (Negozio)', 'You need the hatchet (Shop)'));
}
export function tryMine() {
  return harvestDeco(MINEABLE, 'pick', minedSet, S.mined, 'roccia', 'mine',
    '⛰️ ' + tr('Dentro la roccia: un reperto! (da identificare)', 'Inside the rock: a find! (needs identifying)'),
    '⛏️ ' + tr('Serve il piccone (Negozio)', 'You need the pickaxe (Shop)'));
}

/* ---------- barca: sull'acqua si naviga (mai a piedi) e si PESCA ---------- */
export function waterTile(tx, ty) {
  const t = baseTerrain(tx, ty);
  return (t === DEEP || t === WATER) && !townInfo(tx, ty);
}
export function onBoat() {
  return hasBoat() && waterTile(Math.floor(P.x / TS), Math.floor((P.y + FOOT_DY) / TS));
}
export function tryFish() {
  if (S.energy <= 0 && !isDebug()) { toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn')); playSfx('nope'); return; }
  beginDig(0.9, () => {
    if (!isDebug()) spendEnergy(1);
    const tx = Math.floor(P.x / TS), ty = Math.floor((P.y + FOOT_DY) / TS);
    const raw = Math.random() < 0.4 ? makeRaw(zoneAt(tx, ty).id, Math.hypot(tx, ty), null, 'acqua') : null;
    if (raw) {
      if (addFossil(raw, tx, ty)) toast('🎣 ' + tr('Un fossile acquatico! (da identificare)', 'An aquatic fossil! (needs identifying)'));
      playSfx('found');
    } else {
      /* indizio, non frustrazione: se qui c'è una specie notturna, il gioco lo lascia capire */
      const hint = !isNight() && (zonePools[zoneAt(tx, ty).id] || []).some(sp => sp.src === 'acqua' && sp.when && sp.when.night);
      toast('🎣 ' + (hint && Math.random() < 0.5
        ? tr('…niente. Di notte, però, qui l\'acqua si muove diversamente', '…nothing. At night, though, this water stirs differently')
        : tr('…non abbocca niente', '…nothing bites')));
      playSfx('fish');
    }
    save(); updateHUD();
  }, 'fish');
}

/* ---------- interazione ---------- */
export function nearbyDoor() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const ti = townInfo(ptx + dx, pty + dy);
    if (ti && ti.door) return ti.door;
  }
  return null;
}
export function nearbyFountain() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const ti = townInfo(ptx + dx, pty + dy);
    if (ti && ti.deco && ti.deco.type === 'fountain') return ti.deco;
  }
  return null;
}
/* cartello delle missioni a portata (E) */
export function nearbyBoard() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const ti = townInfo(ptx + dx, pty + dy);
    if (ti && ti.deco && ti.deco.type === 'board') return ti.deco;
  }
  return null;
}
/* dentro (o al bordo del) parco recintato: da qui si sceglie il compagno */
export function nearbyPark() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  const tw = townForTile(ptx, pty);
  if (tw && tw.pen) { const p = tw.pen; if (ptx >= p.x0 - 1 && ptx <= p.x1 + 1 && pty >= p.y0 - 1 && pty <= p.y1 + 1) return tw; }
  return null;
}
/* lancia 1 🪙 nella fontana: quasi sempre nulla, a salire fino al leggendario (molto raro).
   MAX 10 lanci per città: poi la fontana "riposa" e si ricarica dopo 10 giorni */
export const FOUNTAIN_MAX = 10, FOUNTAIN_REST = 10, FOUNTAIN_COST = 3;
export function fountainState() {
  const t = townForTile(Math.floor(P.x / TS), Math.floor(P.y / TS));
  if (!t) return null;
  if (!S.fountains) S.fountains = {};
  let f = S.fountains[t.key];
  if (!f || S.day - f.d0 >= FOUNTAIN_REST) f = S.fountains[t.key] = { n: 0, d0: S.day }; // ricarica
  return f;
}
/* MINIGIOCO DI MIRA (#3): fermare il cursore sulla zona d'oro dà FORTUNA (0..1), che sposta
   le probabilità verso i rari. Puro e testabile. tossLuck: quanto sei vicino al bersaglio. */
export function tossLuck(markerPos, targetPos) { return Math.max(0, Math.min(1, 1 - Math.abs(markerPos - targetPos) / 0.35)); }
/* probabilità interpolate con la fortuna. A fortuna 0 sono le stesse di sempre
   (60% nulla · 25% comune · 10% raro · 4% eccezionale · 1% leggendario). */
export function tossRarity(luck, roll) {
  const L = Math.max(0, Math.min(1, luck));
  let a = 0.60 - 0.40 * L; if (roll < a) return null;         // nulla:  .60 → .20
  a += 0.25 + 0.05 * L; if (roll < a) return 'comune';        // comune: .25 → .30
  a += 0.10 + 0.18 * L; if (roll < a) return 'raro';          // raro:   .10 → .28
  a += 0.04 + 0.11 * L; if (roll < a) return 'eccezionale';   // ecc:    .04 → .15
  return 'leggendario';                                       // legg:   .01 → .07
}
/* assegna l'esito del lancio con la fortuna del timing (la moneta l'ha già scalata tossCoin) */
export function grantToss(luck) {
  const rar = tossRarity(luck, Math.random());
  if (!rar) {
    toast(tr('🪙 Plin! …solo cerchi nell\'acqua', '🪙 Plink! …just ripples'));
  } else {
    const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
    /* GREZZO come ogni altro ritrovamento: si identifica al Museo e rispetta il limite zaino */
    const it = makeRaw(zoneAt(ptx, pty).id, Math.hypot(ptx, pty), rar, 'any');
    if (addFossil(it, ptx, pty)) { playSfx('found');
      toast(tr('✨ La fontana ti dona un reperto ', '✨ The fountain grants you a ') + rarLabel(rar) + tr(' (da identificare)', ' find (needs identifying)'));
    }
  }
  save(); updateHUD();
}
export function tossCoin() {
  const f = fountainState();
  if (f && f.n >= FOUNTAIN_MAX && !isDebug()) {
    const left = FOUNTAIN_REST - (S.day - f.d0);
    toast(tr('⛲ La fontana riposa — torna tra ' + left + ' giorni', '⛲ The fountain is resting — come back in ' + left + ' days'));
    return;
  }
  if (S.coins < FOUNTAIN_COST && !isDebug()) { toast(tr('Servono ' + FOUNTAIN_COST + ' 🪙 da lanciare', 'You need ' + FOUNTAIN_COST + ' 🪙 to toss')); return; }
  if (!isDebug()) S.coins -= FOUNTAIN_COST;
  playSfx('coin');
  if (f) { if (f.n === 0) f.d0 = S.day; f.n++; } // la finestra dei 10 gg parte dal 1° lancio
  save(); updateHUD();
  /* apre il minigioco di mira; alla fine grantToss con la fortuna. Se l'UI non c'è → fortuna 0. */
  import('./ui.js').then(u => { if (u.openToss) u.openToss(luck => grantToss(luck)); else grantToss(0); }).catch(() => grantToss(0));
}
/* ---------- mappe del tesoro: X lontana, scavo garantito della rarità comprata ---------- */
export const MAP_COST = { raro: 30, eccezionale: 90, leggendario: 260 };
export const MAP_DIST = { raro: [140, 240], eccezionale: [300, 450], leggendario: [550, 800] };
const DIRN = [['E', 'E'], ['SE', 'SE'], ['S', 'S'], ['SO', 'SW'], ['O', 'W'], ['NO', 'NW'], ['N', 'N'], ['NE', 'NE']];
export function dirTo(tx, ty) {
  const dx = tx * TS + 8 - P.x, dy = ty * TS + 8 - P.y;
  const oct = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
  return Math.round(Math.hypot(dx, dy) / TS) + tr(' passi a ', ' steps ') + tr(DIRN[oct][0], DIRN[oct][1]);
}
/* punto scavabile a distanza giusta: angolo casuale + spirale corta di aggiustamento */
function mapSpot(rar) {
  const [d0, d1] = MAP_DIST[rar];
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  for (let tries = 0; tries < 40; tries++) {
    const a = Math.random() * Math.PI * 2, d = d0 + Math.random() * (d1 - d0);
    const cx = Math.round(ptx + Math.cos(a) * d), cy = Math.round(pty + Math.sin(a) * d);
    for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy;
      if (!diggable(baseTerrain(x, y)) || townInfo(x, y) || decoAt(x, y) || dugSet.has(x + ',' + y)) continue;
      /* nessun sito nel 3×3: altrimenti il tasto E scava il sito, non la X (mai cliccabile) */
      let nearSite = false;
      for (let sy = -1; sy <= 1 && !nearSite; sy++) for (let sx = -1; sx <= 1; sx++) if (siteAt(x + sx, y + sy)) nearSite = true;
      if (!nearSite) return { x, y };
    }
  }
  return null;
}
export function buyMap(rar) {
  const cost = MAP_COST[rar];
  if (S.coins < cost && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + cost); return false; }
  const t = mapSpot(rar);
  if (!t) { toast(tr('Il cartografo non trova nulla…', 'The cartographer finds nothing…')); return false; }
  if (!isDebug()) S.coins -= cost;
  playSfx('coin');
  if (!S.maps) S.maps = [];
  S.maps.push({ x: t.x, y: t.y, rar, uid: S.uid++ });
  toast('🗺️ ' + tr('X segnata: ', 'X marked: ') + dirTo(t.x, t.y));
  save(); updateHUD();
  return true;
}
export function mapAt(tx, ty) { return (S.maps || []).find(m => m.x === tx && m.y === ty) || null; }

/* ---------- siti di scavo speciali ---------- */
export function siteRemaining(site) { return site.charges - (S.sites[site.key] || 0); }
export function nearbySite() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  const ccx = Math.floor(ptx / SCELL), ccy = Math.floor(pty / SCELL);
  for (let cy = ccy - 1; cy <= ccy + 1; cy++) for (let cx = ccx - 1; cx <= ccx + 1; cx++) {
    const s = siteForCell(cx, cy);
    if (s && Math.max(Math.abs(s.x - ptx), Math.abs(s.y - pty)) <= 1) return s;
  }
  return null;
}
/* al sito niente "solo terra": sempre un pezzo pregiato (mai comune), gradiente sulla distanza */
export function siteRarWeights(dist) {
  const g = 1 + Math.min(2, (dist || 0) / 600);
  return { raro: 50, eccezionale: 33 * g, leggendario: 12 * g };
}
export function digSite() {
  const s = nearbySite(); if (!s) return;
  const rem = siteRemaining(s);
  if (rem <= 0) { toast(tr('Sito esaurito: solo ossa sbriciolate', 'Site exhausted: only crumbled bones')); return; }
  if (!S.tools.spade && !isDebug()) { toast('🪏 ' + tr('Serve la pala (Negozio)', 'You need a spade (Shop)')); return; }
  if (S.energy <= 0 && !isDebug()) { toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn')); playSfx('nope'); return; }
  beginDig(0.55, () => {
    if (!isDebug()) spendEnergy(1);
    S.sites[s.key] = (S.sites[s.key] || 0) + 1;
    const dist = Math.hypot(s.x, s.y);
    const w = siteRarWeights(dist);
    const tot = w.raro + w.eccezionale + w.leggendario;
    let r = Math.random() * tot, rar = 'raro';
    for (const q of ['raro', 'eccezionale', 'leggendario']) { r -= w[q]; if (r <= 0) { rar = q; break; } }
    const raw = makeRaw(zoneAt(s.x, s.y).id, dist, rar, 'any');
    if (addFossil(raw, s.x, s.y)) toast(tr('⛏️✨ Reperto pregiato dal sito! (', '⛏️✨ Precious find from the site! (') + (rem - 1) + tr(' rimasti)', ' left)'));
    save(); updateHUD();
  });
}
/* oggetto di superficie a portata (tile sotto i piedi o adiacente) */
export function nearbyPickup() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const tx = ptx + dx, ty = pty + dy;
    if (pickupAt(tx, ty)) return { tx, ty };
  }
  return null;
}
/* fossile/oggetto lasciato a TERRA (drop) a portata */
export function nearbyDrop() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  return (S.drops || []).find(d => Math.max(Math.abs(d.tx - ptx), Math.abs(d.ty - pty)) <= 1) || null;
}
/* c'è qualcosa da raccogliere con E qui vicino? (drop o oggetto di superficie) */
export function nearbyGround() { return nearbyDrop() || nearbyHarvest() || nearbyPickup(); }
/* decorazione raccoglibile sotto i piedi o a un passo */
export function nearbyHarvest() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const id = harvestDecoAt(ptx + dx, pty + dy);
    if (id) return { tx: ptx + dx, ty: pty + dy, id };
  }
  return null;
}
function pickDeco(h) {
  const key = h.tx + ',' + h.ty;
  pickedSet.add(key); if (!S.picked) S.picked = []; S.picked.push(key);
  choppedSet.add(key); if (!S.chopped) S.chopped = []; S.chopped.push(key);  // sparisce dalla mappa
  const g = makeGoodById(h.id); if (companionAbility() === 'luck') g.val += 1;
  addGood(g); gainXp(1);
  toast('✨ ' + tr('Raccolto: ', 'Picked up: ') + goodName(h.id) + ' (🪙' + g.val + ')'); playSfx('found');
  save(); updateHUD(); return true;
}
/* riprende un drop da terra (rispetta la capacità per i fossili) */
function collectDrop(dr) {
  if (dr.kind === 'good') { if (!S.goods) S.goods = []; S.goods.push(dr.payload); compactGoods(); } // rientra nello stack
  else { // 'raw' | 'item' = fossile: serve posto in zaino
    if (bagFull()) { toast('🎒 ' + tr('Zaino pieno: libera spazio prima', 'Bag full: free some space first')); return true; }
    (dr.kind === 'item' ? S.items : S.raw).push(dr.payload);
  }
  S.drops = S.drops.filter(x => x.uid !== dr.uid);
  toast('✨ ' + tr('Raccolto da terra', 'Picked up from the ground')); playSfx('found');
  save(); updateHUD(); return true;
}
/* oggetto di superficie (NON un fossile): rarità implicita → valore, pescato per zona */
export function makeGood(zoneId) {
  const list = GOODS[zoneId] || GOODS.prati;
  const w = [60, 30, 10], tot = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot, idx = 0;
  for (let i = 0; i < list.length; i++) { r -= w[i] || 0; if (r <= 0) { idx = i; break; } }
  const g = list[idx];
  return { uid: S.uid++, id: g[0], val: g[3], good: true };
}
export function goodName(id) { const g = goodById[id]; return g ? tr(g.it, g.en) : id; }
export function makeGoodById(id) { const g = goodById[id]; return { uid: S.uid++, id, val: g ? g.val : 3, good: true }; }
/* aggiunge UNA unità di good impilandola: cerca uno stack dello stesso id non ancora pieno
   (< 64) e ne alza quantità e valore totale; altrimenti apre una pila nuova. */
export function addGood(g) {
  if (!S.goods) S.goods = [];
  const st = S.goods.find(x => x.id === g.id && (x.n || 1) < GOOD_STACK);
  if (st) { st.n = (st.n || 1) + 1; st.val += g.val; }
  else S.goods.push({ uid: g.uid, id: g.id, val: g.val, n: 1, good: true });
}
/* raccogli con E: prima i drop a terra, poi l'OGGETTO VERO che vedi disegnato a terra. */
export function collectPickup() {
  const dr = nearbyDrop(); if (dr) return collectDrop(dr);
  /* funghi, conchiglie, fiori e canne: si raccolgono come gli altri oggetti (prima erano
     solo decorazione e il giocatore ci provava invano) */
  { const h = nearbyHarvest(); if (h) return pickDeco(h); }
  const p = nearbyPickup(); if (!p) return false;
  const id = pickupAt(p.tx, p.ty); if (!id) return false;    // esattamente ciò che è disegnato
  pickedSet.add(p.tx + ',' + p.ty); S.picked.push(p.tx + ',' + p.ty);
  const g = makeGoodById(id); if (companionAbility() === 'luck') g.val += 1; addGood(g); // compagno fortunato: +valore
  gainXp(1);
  toast('✨ ' + tr('Raccolto: ', 'Picked up: ') + goodName(id) + ' (🪙' + g.val + ')'); playSfx('found');
  save(); updateHUD(); return true;
}
/* scarta un oggetto/fossile dallo zaino trascinandolo fuori → finisce a TERRA (riprendibile con E) */
export function discardToGround(uid, kind) {
  const arr = kind === 'item' ? S.items : kind === 'good' ? S.goods : S.raw;
  const i = (arr || []).findIndex(x => x.uid === uid); if (i < 0) return false;
  const payload = arr.splice(i, 1)[0];
  dropAt(Math.floor(P.x / TS), Math.floor((P.y + FOOT_DY) / TS), kind, payload);
  toast('🎒 ' + tr('Lasciato a terra', 'Left on the ground')); save(); updateHUD(); return true;
}
/* vendita oggetti (non fossili) al Negozio */
export function sellGood(uid) { const i = (S.goods || []).findIndex(x => x.uid === uid); if (i < 0) return; S.coins += S.goods[i].val; S.goods.splice(i, 1); playSfx('coin'); save(); updateHUD(); }
export function sellAllGoods() { let g = 0, n = 0; (S.goods || []).forEach(x => { g += x.val; n += (x.n || 1); }); S.coins += g; const had = (S.goods || []).length; S.goods = []; if (had) playSfx('coin'); save(); updateHUD(); return { g, n }; }
/* ---------- RELITTI in mare: si frugano dalla barca (E), reperti garantiti mai comuni ---------- */
export function nearbyWreck() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  const cx = Math.floor(ptx / WCELL), cy = Math.floor(pty / WCELL);
  for (let yy = cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) {
    const w = wreckForCell(xx, yy);
    if (w && Math.max(Math.abs(w.x - ptx), Math.abs(w.y - pty)) <= 2) return w;
  }
  return null;
}
export function wreckRemaining(w) { return w.charges - (S.wrecks && S.wrecks[w.key] || 0); }
export function digWreck() {
  const w = nearbyWreck(); if (!w) return;
  const rem = wreckRemaining(w);
  if (rem <= 0) { toast('🚢 ' + tr('Relitto ripulito', 'Wreck picked clean')); return; }
  if (S.energy <= 0 && !isDebug()) { toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn')); playSfx('nope'); return; }
  beginDig(0.6, () => {
    if (!isDebug()) spendEnergy(1);
    if (!S.wrecks) S.wrecks = {}; S.wrecks[w.key] = (S.wrecks[w.key] || 0) + 1;
    const dist = Math.hypot(w.x, w.y), wt = siteRarWeights(dist);
    const tot = wt.raro + wt.eccezionale + wt.leggendario;
    let r = Math.random() * tot, rar = 'raro';
    for (const q of ['raro', 'eccezionale', 'leggendario']) { r -= wt[q]; if (r <= 0) { rar = q; break; } }
    const raw = makeRaw(zoneAt(w.x, w.y).id, dist, rar, 'any');
    if (addFossil(raw, w.x, w.y)) toast('🚢✨ ' + tr('Reperto dal relitto! (', 'Find from the wreck! (') + (rem - 1) + tr(' rimasti)', ' left)'));
    playSfx('found'); save(); updateHUD();
  }, 'fish');
}
export function act() {
  if (P.digging) return; // un colpo alla volta
  if (CAVE.active) { // in grotta: scava i giacimenti luminosi
    const r = digCave();
    if (r === 'nopick') toast('⛏️ ' + tr('Serve il piccone per staccare i cristalli (Negozio)', 'You need the pickaxe to break the crystals (Shop)'));
    else if (r === 'noenergy') toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn'));
    else if (r === 'bagfull') { toast('🎒 ' + tr('Zaino pieno: il cristallo resta qui, torna a prenderlo', 'Bag full: the crystal stays here, come back for it')); playSfx('nope'); }
    else if (r === false) toast(tr('Avvicinati a un giacimento luminoso', 'Get close to a glowing deposit'));
    return;
  }
  if (INT.active) { // parla con l'NPC o leggi l'etichetta di un'esposizione
    if (nearMentorInt()) { openMentor(); return; } // Maestro Scavatore: spiega i livelli
    if (nearNpc()) { openBuilding(INT.b); return; }
    const nc = nearCase(); if (nc) { openExhibit(nc.sp.id); return; }
    return;
  }
  { const w = nearbyWonder(); if (w) { openWonder(w); return; } } // meraviglia: pannello col suo dono
  if (nearbyBoard()) { openQuestBoard(); return; } // cartello delle missioni
  if (nearbyPark()) { openCompanionPicker(); return; } // parco: scegli il compagno
  if (nearbySite()) { digSite(); return; }
  if (nearbyFountain()) { tossCoin(); return; }
  if (collectPickup()) return;                 // oggetto di superficie a portata
  if (onBoat()) { if (nearbyWreck()) digWreck(); else tryFish(); return; } // relitto o pesca
  if (tryChop()) return;                       // albero davanti + accetta
  if (tryMine()) return;                       // roccia davanti + piccone
  tryDig();
}


/* ---------- MERAVIGLIE: scoperta e poteri ----------
   Ci si avvicina e la meraviglia si SCOPRE da sola (banner + pagina nel Libro). Con E si usa
   il suo dono, che poi riposa per qualche giorno (il tempo che manca è sempre scritto). */
export function nearbyWonder() {
  /* si interagisce da VICINO: 2 tile attorno alla base, non l'intero ingombro della struttura
     (una meraviglia da 9 tile dava un'area di interazione larga mezzo schermo) */
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  const lm = landmarkNear(ptx, pty, 2);
  if (!lm) return null;
  return (Math.abs(ptx - lm.x) <= 2 && pty >= lm.y - 1 && pty <= lm.y + 2) ? lm : null;
}
/* chiamata dal game loop: la prima volta che ci passi vicino, la scopri */
export function checkWonderDiscovery() {
  const lm = nearbyWonder(); if (!lm) return null;
  rememberArch(lm.type, lm.x, lm.y);            // gli archi si ricordano per il viaggio
  if (!discoverWonder(lm.type)) return null;
  playSfx('found'); gainXp(20); showTip('wonder');
  return lm;
}
/* esito dei poteri: stringa da mostrare (o null se non è successo niente) */
export function useWonder(lm) {
  if (!lm) return null;
  const t = lm.type;
  if (wonderReadyIn(t, lm.x, lm.y) > 0) return wonderStatusText(t, lm.x, lm.y);
  const zid = zoneAt(lm.x, lm.y).id, dist = Math.hypot(lm.x, lm.y);
  const give = (rar, src, n, msg) => {
    let got = 0;
    for (let i = 0; i < n; i++) { const raw = makeRaw(zid, dist, rar, src); if (addFossil(raw, lm.x, lm.y)) got++; }
    playSfx('found'); return msg + (got < n ? tr(' (zaino pieno: il resto è a terra)', ' (bag full: the rest is on the ground)') : '');
  };
  let out = null;
  switch (t) {
    case 'gianttree': case 'oasis':
      S.energy = S.maxEnergy; out = '⚡ ' + tr('Riposato: energia al massimo', 'Rested: energy restored'); playSfx('found'); break;
    case 'haygiant':
      S.snacks = (S.snacks || 0) + 3; out = '🍞 ' + tr('3 ristori nello zaino', '3 snacks in your bag'); playSfx('coin'); break;
    case 'ribcage': out = give(null, 'any', 3, '🦴 ' + tr('Sotto le costole: 3 reperti!', 'Under the ribs: 3 finds!')); break;
    case 'geyser': out = give(null, 'any', 2, '💨 ' + tr('L\'eruzione sputa fuori 2 reperti!', 'The eruption spits out 2 finds!')); break;
    case 'hollowstump': out = give('raro', 'any', 1, '🌳 ' + tr('Nel cavo c\'era un reperto raro!', 'A rare find was in the hollow!')); break;
    case 'bubblepool': out = give(null, 'any', 1, '🫧 ' + tr('La palude restituisce un reperto', 'The marsh gives a find back')); break;
    case 'lilypad': out = give(null, 'acqua', 2, '🎣 ' + tr('Acque pescose: 2 reperti d\'acqua', 'Rich waters: 2 water finds')); break;
    case 'orevein':
      if (!S.tools.pick && !isDebug()) return '⛏️ ' + tr('Serve il piccone', 'You need the pickaxe');
      out = give(null, 'roccia', 3, '⛏️ ' + tr('Il filone cede 3 reperti!', 'The vein yields 3 finds!')); break;
    case 'frozenbeast': {
      /* la bestia è UNA specie sola: ogni visita libera un pezzo diverso della stessa */
      const sp = beastSpecies(lm);
      const owned = (S.raw.concat(S.items)).filter(it => it.s === sp.id).map(it => it.t);
      const miss = PARTS.map(p => p.id).filter(p => !owned.includes(p));
      const part = (miss.length ? miss : PARTS.map(p => p.id))[0];
      const val = Math.max(2, Math.round(7 * ptById[part].mult * RAR.find(r => r.id === sp.r).mult * (1 + dist / 900)));
      const raw = { uid: S.uid++, s: sp.id, t: part, q: sp.r, val };
      addFossil(raw, lm.x, lm.y); gainXp(XP_BY_RAR[raw.q] || 4); playSfx('found');
      out = '🧊 ' + tr('Liberi ', 'You free ') + partName(part) + tr(' di ', ' of ') + sp.name + tr(' dal ghiaccio!', ' from the ice!');
      break;
    }
    case 'mushring': addBuff('digX2', 10); out = '🍄 ' + tr('Spore fortunate: 10 scavi con drop doppio', 'Lucky spores: 10 digs with doubled finds'); playSfx('found'); break;
    case 'totem': addBuff('xpX2', 10); out = '🗿 ' + tr('Benedizione: 10 scavi con XP doppia', 'Blessing: 10 digs with double XP'); playSfx('found'); break;
    case 'willow': out = 'sleep'; break;                 // gestito da chi chiama (dorme)
    case 'menhir': case 'icespire': out = 'reveal'; break; // rivelazione mappa (vedi ui/map)
    case 'aurora': out = 'aurora'; break;
    case 'bonearch': case 'redarch': out = 'travel'; break;
    default: out = tr('Non succede nulla', 'Nothing happens');
  }
  if (out && !['travel', 'reveal', 'sleep', 'aurora'].includes(out)) { markWonderUsed(t, lm.x, lm.y); save(); updateHUD(); }
  return out;
}
/* la specie intrappolata nel ghiaccio: deterministica per posizione (sempre la stessa) */
export function beastSpecies(lm) {
  const pool = zonePools[zoneAt(lm.x, lm.y).id] || zonePools.ghiacci;
  const good = pool.filter(s => s.r === 'eccezionale' || s.r === 'leggendario');
  const list = good.length ? good : pool;
  return list[Math.floor(vhashW(lm.x, lm.y, 61) * list.length) % list.length];
}

/* ---------- economia ---------- */
export function identifyAll() {
  if (!S.raw.length) { toast(tr('Niente da identificare', 'Nothing to identify')); return []; }
  const revealed = S.raw.slice();
  S.raw.forEach(it => { S.items.push(it); if (!S.codex.includes(it.s)) S.codex.push(it.s); });
  S.raw = []; save(); updateHUD(); return revealed;
}
/* DONO DEL NONNO: all'avvio (dopo l'intro) ricevi un fossile LEGGENDARIO già identificato,
   il "primo tesoro" della storia. Una volta sola (S.gift). */
export function grantStarterGift() {
  if (S.gift) return;
  S.gift = true;
  const it = makeRaw('prati', 0, 'leggendario', 'any');
  S.raw.push(it); // GREZZO (non identificato): lo consegni al museo per imparare il riconoscimento
  save(); updateHUD();
  toast('✨ ' + tr('Il dono del nonno: un fossile leggendario da identificare al museo!', "Grandpa's gift: a legendary fossil to identify at the museum!"));
}
export function sellItem(uid) { const i = S.items.findIndex(x => x.uid === uid); if (i < 0) return; const it = S.items[i]; S.coins += it.val; S.items.splice(i, 1); playSfx('coin'); save(); updateHUD(); }
export function sellAll() { let g = 0; S.items.forEach(it => g += it.val); S.coins += g; const n = S.items.length; S.items = []; if (n) playSfx('coin'); save(); updateHUD(); return { g, n }; }
/* ---------- museo: consegni i GREZZI, gli esperti identificano in 1 giorno ----------
   Al ritiro: i pezzi che il museo HA GIÀ tornano a te (identificati, vendibili);
   i pezzi NUOVI vengono esposti (niente monete). Teca completa 5/5 → FIALETTA DNA
   intera (S.dna +2 mezze), da usare al Laboratorio. Debug: ritiro immediato. */
export function museumDeposit() {
  if (S.museumJob) { toast(tr('Gli esperti stanno già lavorando', 'The experts are already at work')); return false; }
  if (!S.raw.length) { toast(tr('Niente reperti grezzi da consegnare', 'No raw finds to hand in')); return false; }
  S.museumJob = { items: S.raw.splice(0), ready: S.day }; // identificazione ISTANTANEA (ritiro subito)
  save(); updateHUD();
  return true;
}
export function museumJobReady() { return !!S.museumJob && (isDebug() || S.day >= S.museumJob.ready); }
export function museumCollect() {
  if (!museumJobReady()) return null;
  const back = [], shown = [], vials = [], left = [];
  for (const it of S.museumJob.items) {
    if (!S.codex.includes(it.s)) S.codex.push(it.s); // identificato in ogni caso
    const col = S.museum[it.s] || (S.museum[it.s] = []);
    if (col.includes(it.t)) {
      /* doppione: torna a te — ma solo se ci sta. Depositare svuota lo zaino (i pezzi in
         lavorazione non contano), quindi si poteva riempirlo di nuovo e al ritiro sfondare
         la capienza: era l'unico punto del gioco che aggiungeva reperti senza guardarla.
         Quello che non entra RESTA al museo e si ritira al prossimo giro. */
      if (bagFull()) { left.push(it); continue; }
      S.items.push(it); back.push(it);
    } else {
      col.push(it.t); shown.push(it); // pezzo nuovo: esposto
      if (col.length === PARTS.length) {
        if (!S.donated.includes(it.s)) S.donated.push(it.s);
        S.dna[it.s] = (S.dna[it.s] || 0) + 1; vials.push(it.s); // 🧬 una fialetta in premio
      }
    }
  }
  /* se qualcosa è rimasto al museo la commessa resta aperta: si torna a ritirarlo */
  S.museumJob = left.length ? { items: left, ready: S.day } : null;
  if (left.length) toast('🎒 ' + tr('Zaino pieno: ', 'Bag full: ') + left.length + tr(' pezzi restano al Museo, torna a ritirarli', ' pieces stay at the Museum, come back for them'));
  save(); updateHUD();
  return { back, shown, vials, left };
}
/* Sonno alternato: metà-giornata = giorno [0,0.5) o notte [0.5,1). halfIndex monotòno crescente. */
function curHalf() { return S.day * 2 + (isNight() ? 1 : 0); }
/* si può dormire solo dopo aver passato almeno una metà sveglio (niente due sonni di fila) */
export function canSleep() { return isDebug() || S.sleepBlockHalf == null || curHalf() >= S.sleepBlockHalf; }
export function sleepBlocked() { return !canSleep(); }
/* dormire di GIORNO → ci si sveglia di NOTTE (stesso giorno);
   dormire di NOTTE → alba del giorno dopo. Poi va passata una metà sveglio. */
export function restInn() {
  if (!canSleep()) { toast(tr('Prima devi passare sveglio almeno mezza giornata', 'Spend at least half a day awake first')); return false; }
  const night = isNight();
  if (night) { S.day++; S.tod = 0.02; }   // notte → alba del giorno dopo
  else { S.tod = 0.60; }                   // giorno → notte fonda dello stesso giorno
  S.energy = S.maxEnergy;
  S.sleepBlockHalf = curHalf() + 1;        // sblocco solo dopo una metà passata sveglio
  save(); updateHUD();
  toast(night ? (tr('Alba del giorno ', 'Dawn of day ') + S.day + tr('! Energia piena', '! Full energy'))
    : tr('Cala la notte. Energia piena', 'Night falls. Full energy'));
  return true;
}
/* RISTORI — l'energia era una risorsa finta: 15🪙 fissi e ristori illimitati significavano
   che nessuna giornata poteva mai andare storta. Ora il fornaio ne ha pochi al giorno e il
   prezzo sale a ogni acquisto: la seconda metà di giornata va pianificata, non comprata. */
export const SNACK_BASE = 15, SNACK_STEP = 12, SNACK_MAX_DAY = 4;
function snackDayReset() { if (S.snackDay !== S.day) { S.snackDay = S.day; S.snackBought = 0; } }
export function snacksLeftToday() { snackDayReset(); return Math.max(0, SNACK_MAX_DAY - (S.snackBought || 0)); }
export function snackPrice() { snackDayReset(); return SNACK_BASE + SNACK_STEP * (S.snackBought || 0); }
export function buyEnergy() {
  snackDayReset();
  if (snacksLeftToday() <= 0 && !isDebug()) {
    toast(tr('Il fornaio ha finito i ristori per oggi: torna domani', 'The baker is out of snacks for today: come back tomorrow'));
    return;
  }
  const cost = snackPrice();
  if (S.coins < cost && !isDebug()) { toast(tr('Servono ', 'You need ') + cost + ' 🪙'); return; }
  if (!isDebug()) { S.coins -= cost; S.snackBought = (S.snackBought || 0) + 1; }
  playSfx('coin');
  S.snacks = (S.snacks || 0) + 1;
  toast('🍞 ' + tr('Ristoro nello zaino (I per usarlo)', 'Snack in your bag (I to use it)'));
  save(); updateHUD();
}
export function eatSnack() {
  if (!(S.snacks > 0)) { toast(tr('Niente ristori nello zaino', 'No snacks in your bag')); return false; }
  if (S.energy >= S.maxEnergy) { toast(tr('Energia già piena', 'Energy already full')); return false; }
  S.snacks--; S.energy = Math.min(S.maxEnergy, S.energy + 15);
  toast('🍞 +15 ⚡'); save(); updateHUD();
  return true;
}

/* ---------- chimere ---------- */
/* nome portmanteau: attacco del nome-cranio + finale del nome-zampa ("Gastro"+"donte") */
/* NOME DELLA CHIMERA — portmanteau: la testa dà l'inizio, le zampe la fine.
   Su 4.356 accoppiate il solo taglio a due sillabe produceva 693 nomi identici e oltre mille
   coppie che differivano per UNA lettera ("Grillosso" e "Grillolosso"): due creature diverse
   nel parco con lo stesso nome. La soluzione non è un nome globalmente unico — al giocatore
   importa solo che le SUE chimere si distinguano, e ne avrà decine, non migliaia. Quindi si
   prova il taglio bello (2 sillabe) e, solo se cozza con una chimera già posseduta, si
   allunga il prefisso o il suffisso di una sillaba. Misurato: 199 nomi su 200 restano quelli
   base, nessuno resta ambiguo. */
const SYL2_PRE = /^[^aeiou]*[aeiou]+[^aeiou]+[aeiou]/i;
const SYL3_PRE = /^[^aeiou]*[aeiou]+[^aeiou]+[aeiou]+[^aeiou]+[aeiou]/i;
const SYL2_SUF = /[^aeiou]?[aeiou][^aeiou]+[aeiou]+$/i;
const SYL3_SUF = /[^aeiou]?[aeiou][^aeiou]+[aeiou]+[^aeiou]+[aeiou]+$/i;
/* distanza di edit: due nomi a distanza 1 si leggono come lo stesso nome scritto male */
export function nameDistance(a, b) {
  a = (a || '').toLowerCase(); b = (b || '').toLowerCase();
  const m = [...Array(a.length + 1)].map((_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}
export function chimeraName(skullSp, legSp, taken) {
  const cut = (name, re, fallback) => (name.match(re) || [fallback])[0];
  const p2 = cut(skullSp.name, SYL2_PRE, skullSp.name.slice(0, 5));
  const p3 = cut(skullSp.name, SYL3_PRE, p2);
  const s2 = cut(legSp.name, SYL2_SUF, legSp.name.slice(-5));
  const s3 = cut(legSp.name, SYL3_SUF, s2);
  /* niente vocale doppia alla giuntura: "Prato"+"osso" fa Pratosso, non Pratoosso */
  const join = (p, s) => (/[aeiou]$/i.test(p) && /^[aeiou]/i.test(s) ? p + s.replace(/^[aeiou]+/i, '') : p + s);
  const cands = [join(p2, s2), join(p3, s2), join(p2, s3), join(p3, s3)];
  const have = Array.isArray(taken) ? taken : [];
  for (const c of cands) if (!have.some(t => nameDistance(t, c) <= 1)) return c;
  return cands[0];   // tutte troppo simili: meglio un doppione che un nome storpiato
}
/* eventi importanti: suono di festa + banner. Prima erano muti (le due azioni più costose
   del gioco non davano alcun feedback). */
function bigMoment(title, sub) {
  playSfx('fanfare');
  if (typeof document !== 'undefined') import('./ui.js').then(u => u.showBanner(title + (sub ? '<br><span style="font-size:.8em">' + sub + '</span>' : ''), 2800));
}
/* FUSIONE dei doppioni al Laboratorio: 3 pezzi uguali → 1 di rarità superiore, stessa zona.
   Non costa monete (il costo sono i tre pezzi) e non può riempire lo zaino: ne toglie tre
   e ne mette uno. */
export function fuseDupes(spId, part) {
  const groups = fusibleGroups(S.items);
  const g = groups.find(x => x.spId === spId && x.part === part);
  if (!g) { toast(tr('Servono 3 pezzi uguali', 'You need 3 identical pieces')); return null; }
  const out = fuse(S.items, g, S.uid++);
  if (!out) return null;
  S.items.push(out);
  if (!S.codex.includes(out.s)) S.codex.push(out.s);   // fondere fa SCOPRIRE la specie
  S.fused = (S.fused || 0) + 1;
  gainXp(6);
  playSfx('fanfare');
  save(); updateHUD();
  return out;
}
export function assembleChimera(uidC, uidT, uidZ) {
  if (S.coins < CHIMERA_COST && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + CHIMERA_COST); return false; }
  const pick = u => S.items.find(x => x.uid === u);
  const c = pick(uidC), t = pick(uidT), z = pick(uidZ);
  if (!c || !t || !z || c.t !== 'cranio' || t.t !== 'torace' || z.t !== 'zampa') return false;
  /* 1 fialetta DNA per ogni specie DISTINTA usata (ricariche al museo, teca 5/5) */
  const species = [...new Set([c.s, t.s, z.s])];
  if (!isDebug()) {
    const missing = species.filter(sp => dnaOf(sp) < 1);
    if (missing.length) {
      toast('🧬 ' + tr('Manca il DNA di: ', 'Missing DNA of: ') + missing.map(sp => spById[sp].name).join(', ') + tr(' (museo, teca 5/5)', ' (museum, case 5/5)'));
      return false;
    }
    for (const sp of species) S.dna[sp] = dnaOf(sp) - 1; // una fialetta ciascuna
  }
  if (!isDebug()) S.coins -= CHIMERA_COST;
  [uidC, uidT, uidZ].forEach(u => { const i = S.items.findIndex(x => x.uid === u); S.items.splice(i, 1); });
  const ri = Math.max(...[c, t, z].map(it => RAR.findIndex(r => r.id === it.q)));
  const cr = { uid: S.uid++, name: chimeraName(spById[c.s], spById[z.s], (S.creatures || []).map(x => x.name)), skull: c.s, torso: t.s, leg: z.s, q: RAR[ri].id };
  S.creatures.push(cr); save(); updateHUD();
  bigMoment('🐾 ' + tr('CHIMERA CREATA', 'CHIMERA CREATED'), cr.name);
  toast('✨ ' + cr.name + tr(' si è risvegliato! Passeggia nel parco delle città grandi', ' has woken up! It roams the big-city park'));
  return true;
}

/* ---------- DNA (FIALETTE INTERE, niente mezze) ----------
   2 fialette = 1 risveglio · 1 fialetta = 1 chimera (per specie usata). Prezzi dimezzati. */
export const DNA_COST = { comune: 15, raro: 40, eccezionale: 75, leggendario: 150 };
export function dnaOf(spId) { return S.dna[spId] || 0; }
export function buyDna(spId) {
  if ((S.museum[spId] || []).length !== PARTS.length) return false; // solo teche complete
  const cost = DNA_COST[spById[spId].r] || 50;
  if (S.coins < cost && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + cost); return false; }
  if (!isDebug()) S.coins -= cost;
  playSfx('coin');
  S.dna[spId] = dnaOf(spId) + 1; // una fialetta
  toast('🧬 ' + spById[spId].name + ' +1'); save(); updateHUD();
  return true;
}
export function awakenReady(spId) { return isDebug() || dnaOf(spId) >= 2; } // 2 fialette
export function awakenSpecies(spId) {
  if (S.awakened.includes(spId) || !awakenReady(spId)) return false;
  if (!isDebug()) S.dna[spId] = dnaOf(spId) - 2; // 2 fialette consumate
  S.awakened.push(spId);
  bigMoment('🧬 ' + tr('SPECIE RISVEGLIATA', 'SPECIES AWAKENED'), spById[spId] ? spById[spId].name : '');
  gainXp(25);
  save(); updateHUD();
  toast('🧬 ' + spById[spId].name + tr(' è stato risvegliato! Guardalo VIVO nel Libro (L)', ' has been awakened! See it ALIVE in the Book (L)'));
  return true;
}

/* ---------- cosmetici tematici: scopri (sblocca) il taglio/cappello della zona ---------- */
export function unlockCosmetic(kind, id, cost) {
  const arr = kind === 'hat' ? S.unlocked.hats : S.unlocked.hairs;
  if (arr.includes(id)) return true;
  if (S.coins < cost && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + cost); return false; }
  if (!isDebug()) S.coins -= cost;
  arr.push(id); save(); updateHUD();
  return true;
}

/* ---------- DEBUG: spawna TUTTI i fossili (ogni pezzo di ogni specie, identificati) ---------- */
export function debugSpawnAll() {
  if (!isDebug()) return false;
  for (const sp of ALL_SPECIES) {          // grotte comprese
    if (!S.codex.includes(sp.id)) S.codex.push(sp.id);
    for (const pt of PARTS) S.items.push({ uid: S.uid++, s: sp.id, t: pt.id, q: sp.r, val: Math.max(2, Math.round(7 * ptById[pt.id].mult * RAR.find(r => r.id === sp.r).mult)) });
  }
  save(); updateHUD();
  return true;
}

/* ---------- collisione player (4 angoli dei piedi) ---------- */
function passable(px2, py2) {
  if (!solidPx(px2, py2)) return true;
  // l'acqua è percorribile se possiedi un natante: ci sali da solo (niente attivazione)
  if (!hasBoat()) return false;
  const tx = Math.floor(px2 / TS), ty = Math.floor(py2 / TS);
  return waterTile(tx, ty) && !decoAt(tx, ty) && !siteAt(tx, ty);
}
/* una CASELLA è attraversabile? Il percorso ragiona a caselle, la collisione a pixel: si
   prova il punto dove finirebbero i piedi E i due fianchi, perché il personaggio è largo
   (col solo centro il percorso prometteva passaggi in cui poi ci si incastrava). */
export function tileBlocked(tx, ty) { return !fits(tx, ty, TS, collide); }
export function collide(x, y) { if (P.fly) return false; return bodyHits(x, y, (px, py) => !passable(px, py)); }
