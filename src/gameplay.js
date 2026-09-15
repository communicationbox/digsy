/* Meccaniche: scavo, economia, chimere, collisioni, interazione */
import { TS, PARTS, RAR, ptById, spById, zonePools, SPECIES, ALL_SPECIES, GOODS, goodById, availableNow, hasWindow, PREMIUM_HATS, PEDESTAL_ID, FURN_BY_ID } from './data.js';
import { fusibleGroups, fuse, NEEDED as FUSE_NEEDED } from './fuse.js';
import { fits } from './path.js';
import { bodyHits, feetTile, FOOT_DY } from './body.js';
import { S, P, save, spendEnergy, dugSet, choppedSet, minedSet, pickedSet, compactGoods, GOOD_STACK } from './state.js';
import { baseTerrain, diggable, digChance, townInfo, townForTile, townForCell, openArea, TCELL, solidPx, siteForCell, siteAt, wreckForCell, WCELL, decoAt, pickupAt, SCELL, DEEP, WATER, CHOPPABLE, MINEABLE, boneSiteForCell, boneSiteAt, BCELL, hasMuseum, yardRect, yardInfo } from './world.js';
import { compass } from './compass.js';
import { landmarkNear, harvestDecoAt } from './world.js';
import { vhash as vhashW } from './noise.js';
import { discoverWonder, wonderReadyIn, wonderStatusText, markWonderUsed, rememberArch, addBuff, useBuff } from './wonders.js';
import { marketPrice } from './market.js';
import { zoneAt } from './regions.js';
import { isDebug } from './debug.js';
import { toast, updateHUD, openBuilding, openExhibit, openQuestBoard, openCompanionPicker, openMentor, openWonder, openMailbox, openStatue, openRoomLock, openFurnitureTray, openPedestal, openBed, showTip, announceTutStep } from './ui.js';
import { companionYieldMul, companionType, companionSpec, COMP } from './companion.js';
import { addXp, XP_BY_RAR, digDurationMul, rareBonus } from './progress.js';
import { weatherAt, weatherDropMul } from './weather.js';
import { playSfx } from './audio.js';
import { INT, nearNpc, nearCase, nearMentorInt, nearLockedGate, houseFloorHere, enterInterior, nudgeOffFurniture, CUT , nearPet, petAnimal } from './interior.js';
import { ensureHouseState, ATRIO_PORTAL, isHolding, pickUpFurniture, placeHold, isFloorCell, furnAt, roomUnlocked, restFreeFor, holdTarget, setHoldTarget } from './house.js';
import { CAVE, digCave } from './cave.js';
import { tryCatchFireflies } from './firefly.js';
import { isNight, seasonOf } from './daynight.js';
import { expireQuests, questExpiryText } from './quests.js';
import { tutBump, tutStepId } from './tutorial.js';
import { goalLine, goalTitle, alive, aliveTotal, milestoneReached, milestoneGift } from './goal.js';
import { tr, actKey, keys, LANG, partName, rarLabel, seasonName, hatLabel, furnLabel } from './i18n.js';
import { noteDug } from './packmap.js';

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
export function gainXp(n) {
  if (useBuff('xpX2')) n *= 2;
  addXp(n, lv => {
    toast('🎓 ' + tr('Livello archeologo ', 'Archaeologist level ') + lv + '! +5 ⚡'); playSfx('found'); updateHUD();
    /* traguardo che si VEDE: un cappello premium in più oltre a scavo/rarità (numeri invisibili) */
    const hat = PREMIUM_HATS.find(p => p.lvl === lv);
    if (hat) toast('🤠 ' + tr('Nuovo cappello in Sartoria: ', 'New hat at the Tailor: ') + hatLabel(hat.id) + '!');
  });
}
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
    /* rarità GARANTITA (mappa/sito/fontana): se nessuna specie di quella rarità è disponibile ORA
       (finestra notte/stagione chiusa), si IGNORA la finestra e si pesca dal pool completo della
       zona — meglio una leggendaria "fuori orario" che tradire la rarità promessa dalla X. */
    let cand = pool.filter(s => s.r === forceRar);
    if (!cand.length) cand = (bySrc.length ? bySrc : zPool).filter(s => s.r === forceRar);
    if (!cand.length) cand = zPool.filter(s => s.r === forceRar);
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
  /* PEZZO D'AMBRA: solo per le specie con la teca GIÀ completa, così arriva quando la prima
     collezione di quella specie è finita e i suoi doppioni smetterebbero di servire */
  const amber = (S.museum && (S.museum[sp.id] || []).length === PARTS.length) && Math.random() < (AMBER_CHANCE[sp.r] || 0.1);
  const part = amber ? pickAmberPart(sp.id) : pickPart(sp.id);
  const val = Math.max(2, Math.round(7 * ptById[part].mult * RAR.find(r => r.id === sp.r).mult * (1 + (dist || 0) / 900)));
  const it = { uid: S.uid++, s: sp.id, t: part, q: sp.r, val: amber ? val * 3 : val };
  if (amber) it.amber = true;
  return it;
}

/* ---------- PITY TIMER e ANTI-DOPPIONE ----------
   Senza protezione, con lo 0.6% di leggendari il 10% dei giocatori resta a secco per centinaia
   di scavi (e con 5 pezzi per specie i doppioni diventano il muro finale). Due protezioni:
   1) rarità garantita dopo N scavi sfortunati (Genshin/Hearthstone);
   2) a parità di rarità si pesca prima ciò che ti MANCA (Hearthstone no-duplicate). */
export const PITY = { raro: 30, eccezionale: 90, leggendario: 280 };
/* AMBRA: la seconda collezione, a lungo termine. Ogni specie con la teca completa ha una seconda
   fila di cinque pezzi d'ambra da trovare; completarla accende la teca d'oro e paga bene. */
/* più rara la specie, più facile che il suo pezzo sia d'ambra: le leggendarie escono di rado, e con
   la stessa probabilità di tutte la loro teca d'ambra chiedeva da sola decine di ore (misurato con
   `node tests/pacing.mjs`) */
export const AMBER_CHANCE = { comune: 0.10, raro: 0.18, eccezionale: 0.3, leggendario: 0.5 };
export function amberCount(spId) { return ((S.amber || {})[spId] || []).length; }
export function amberReward(spId) { const r = (spById[spId] || {}).r; return { comune: 60, raro: 120, eccezionale: 220, leggendario: 400 }[r] || 60; }
function pickAmberPart(spId) {
  const have = new Set([...((S.amber || {})[spId] || []), ...S.raw.filter(it => it.s === spId && it.amber).map(it => it.t)]);
  const miss = PARTS.filter(p => !have.has(p.id));
  const pool = miss.length && Math.random() < 0.75 ? miss : PARTS;
  return pool[Math.floor(Math.random() * pool.length)].id;
}
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
export function addFossil(raw, tx, ty, opts) {
  /* `{ xp: false }`: il reperto entra ma NON fa livellare. Serve al raccoglitore leggendario,
     che lavora da solo — l'XP è la ricompensa di chi scava, non di chi guarda scavare. */
  if (!opts || opts.xp !== false) gainXp(XP_BY_RAR[raw.q] || 4); // trovare un reperto dà XP (anche se lo lasci a terra)
  S.findsTotal = (S.findsTotal || 0) + 1; // contatore lifetime per il trofeo "Scavatore"
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
   P.x/P.y è l'ancora ALTA dello sprite: i piedi stanno a +FOOT_DY (vedi collide) */
export function digTarget() {
  return { tx: Math.floor(P.x / TS), ty: Math.floor((P.y + FOOT_DY) / TS) };
}
export function tryDig() {
  const { tx, ty } = digTarget();
  const key = tx + ',' + ty;
  const t = baseTerrain(tx, ty);
  const ti = townInfo(tx, ty);
  if (ti) { toast(tr('Non si scava in città', 'No digging in town')); return; } // vale anche SOTTO gli edifici
  if (yardInfo(tx, ty)) { toast(tr('Qui non si può scavare', 'You can\'t dig here')); return; } // cortile di casa
  if (!S.tools.spade && !isDebug()) { toast('🪏 ' + tr('Serve la pala (Negozio)', 'You need a spade (Shop)')); return; }
  if (!diggable(t)) { toast(tr('Qui non si può scavare', 'You can\'t dig here')); return; }
  if (dugSet.has(key)) { toast(tr('Già scavato qui', 'Already dug here')); return; }
  if (S.energy <= 0 && !isDebug()) { toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn')); playSfx('nope'); showTip('energy'); return; }
  beginDig(0.45, () => {
    if (!isDebug()) spendEnergy(1);
    dugSet.add(key); S.dug.push(key); noteDug(dugSet, key);
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
      ch *= companionYieldMul('terra');                                    // compagno Scavatore: +resa per rarità
      ch *= weatherDropMul(weatherAt(zoneAt(tx, ty).id, S.day));            // pioggia: un po' più ritrovamenti
      ch = Math.min(0.8, ch);                                              // cap totale: mai troppo facile
      /* IL PRIMO SCAVO DEL TUTORIAL NON VA MAI A VUOTO. Una casella d'erba rende .30: sette
         giocatori su dieci avrebbero visto "…solo terra" al primissimo colpo della loro vita,
         subito dopo aver faticato per comprare la pala — e il passo successivo del tutorial
         dice di portare il reperto al Museo. Garantendolo si arriva al banco con DUE grezzi
         (il dono del nonno e il proprio) e il ciclo si chiude per intero la prima volta.
         Vale solo finché il passo in corso è lo scavo: `tutBump` lo chiude subito dopo. */
      const primoGarantito = tutStepId() === 'dig';
      if (primoGarantito || Math.random() < ch) {
        const raw = makeRaw(zoneAt(tx, ty).id, Math.hypot(tx, ty));
        if (addFossil(raw, tx, ty)) { toast(tr('Reperto grezzo! (da identificare)', 'Raw find! (to identify)')); showTip('raw'); }
        playSfx('found');
      } else { toast(tr('…solo terra', '…just dirt')); playSfx('dig'); }
      if (S.shovel === 0 && S.shovelWarn) { S.shovelWarn = false; toast('🪏 ' + tr('La pala fortunata si è consumata', 'The lucky shovel wore out')); }
    }
    /* il tutorial spunta il COLPO, non il ritrovamento: scavare a vuoto è il risultato più
       probabile (una casella d'erba rende .30) e un passo che si sblocca solo con la fortuna
       si legge come un tutorial rotto. */
    if (tutBump('dig') === 'step') announceTutStep();
    save(); updateHUD();
  });
}

/* ---------- attrezzi: accetta (alberi), piccone (rocce), pala fortunata, barca ---------- */
/* scala ×2.3-2.5 per gradino, come gli upgrade di Stardew (2000→5000→10000→25000) */
export const TOOL_COST = { spade: 15, shovel: 45, axe: 90, pick: 200, boat: 460, skates: 130, bike: 500, motorboat: 1100, torch: 110, compass: 70 };
const TOOL_MSG = {
  spade: () => '🪏 ' + tr('Pala: ora puoi scavare ', 'Spade: now you can dig ') + actKey(),
  axe: () => '🪓 ' + tr('Accetta: abbatti gli alberi ', 'Hatchet: chop trees ') + actKey(),
  pick: () => '⛏️ ' + tr('Piccone: spacca massi ', 'Pickaxe: breaks boulders ') + actKey(),
  boat: () => '⛵ ' + tr('Barca: entra in acqua per salire', 'Boat: walk into water to board'),
  skates: () => '🛼 ' + tr('Pattini: corri al doppio della velocità', 'Skates: move at double speed'),
  bike: () => '🚲 ' + tr('Bicicletta: velocità tripla a piedi', 'Bicycle: triple speed on foot'),
  motorboat: () => '🚤 ' + tr('Motoscafo: velocità tripla sull\'acqua', 'Motorboat: triple speed on water'),
  torch: () => '🔦 ' + tr('Torcia: più luce al buio', 'Torch: more light in the dark'),
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
  if (onBoat()) { toast('⛵ ' + tr('Prima torna a riva', 'Get back to shore first')); return false; }
  S.gear = S.gear === g ? null : g;
  playSfx('click'); save(); updateHUD(); return true;
}
/* mezzo a piedi attualmente attivo (per lo sprite) */
export function footGear() { return (S.gear === 'bike' && S.tools.bike) ? 'bike' : (S.gear === 'skates' && S.tools.skates) ? 'skates' : null; }
/* moltiplicatore di velocità (a piedi: bici ×3 / pattini ×2; in acqua: motoscafo ×3, barca ×1) */
export function gearSpeedMul() {
  if (isMounted()) return 3;                    // in volo: viaggio veloce sopra la mappa
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
      const t = townForCell(cx, cy); if (!t || !hasMuseum(t)) continue; // solo CITTÀ col MUSEO
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
/* ---------- casa: teleport gratuito verso S.home, illimitato ---------- */
/* COCCOLE agli animali delle botteghe (interior.js): reazione, suono, e la prima del giorno +1 ⚡ */
export function petShopAnimal() {
  const r = petAnimal(S.day); if (!r) return false;
  if (!S.petDay) S.petDay = {};
  const first = S.petDay[r.kind] !== S.day;
  if (first) { S.petDay[r.kind] = S.day; S.energy = Math.min(S.maxEnergy, S.energy + 1); updateHUD(); save(); }
  const msg = r.kind === 'gatto' ? tr('Il gatto fa le fusa', 'The cat purrs')
    : r.kind === 'cane' ? tr('Il cane scodinzola felice', 'The dog wags happily')
      : r.kind === 'topo' ? tr('Squit! Il topolino si gode il formaggio', 'Squeak! The mouse enjoys the cheese')
        : r.kind === 'pappagallo' ? tr('Il pappagallo fischietta contento', 'The parrot whistles happily')
          : r.kind === 'coniglio' ? tr('Il coniglietto saltella', 'The bunny hops around')
            : tr('Lo scoiattolo ti mostra la sua ghianda', 'The squirrel shows you its acorn');
  toast('🐾 ' + msg + (first ? ' · +1 ⚡' : ''));
  playSfx('found');
  return true;
}
export function goHome() {
  if (!S.home) { toast(tr('Casa non ancora trovata', 'Home not found yet')); return false; }
  const htx = Math.floor(P.x / TS), hty = Math.floor((P.y + FOOT_DY) / TS);
  if (Math.abs(htx - S.home.x) <= 2 && Math.abs(hty - S.home.y) <= 3) {
    toast('🏠 ' + tr('Sei già a casa', "You're already home")); return false;
  }
  S.teleportBack = { x: P.x, y: P.y }; // sovrascrive sempre: mai più di un ritorno attivo
  if (INT.active) { INT.active = false; INT.justLeft = true; } // se sei dentro, esci e teletrasporta comunque
  if (CAVE.active) CAVE.active = false;
  const cands = [[0, 2], [0, 3], [-1, 2], [1, 2], [-1, 3], [1, 3], [0, 4], [-2, 2], [2, 2]];
  let placed = false;
  for (const [dx, dy] of cands) {
    const x = (S.home.x + dx) * TS + 8, y = (S.home.y + dy) * TS + 10;
    if (!solidPx(x, y) && openArea(Math.floor(x / TS), Math.floor(y / TS), 5)) { P.x = x; P.y = y; placed = true; break; }
  }
  if (!placed) { P.x = S.home.x * TS + 8; P.y = (S.home.y + 2) * TS + 10; }
  S.returnPortal = { x: Math.floor(P.x / TS), y: Math.floor((P.y + FOOT_DY) / TS) };
  /* si arriva DENTRO, nel corridoio (atrio) — non fuori nel cortile: "il portale mi deve
     portare NON nel cortile ma nel corridoio di casa". P.x/P.y restano quelli appena trovati
     fuori dalla porta: è lì che si ricompare uscendo di nuovo, ed è lì che aspetta il
     portale di ritorno (S.returnPortal, sopra). */
  enterInterior({ type: 'house', doorx: S.home.x, doory: S.home.y }, null);
  playSfx('found');
  toast('🏠 ' + tr('Sei a casa: il portale ti riporta indietro', "You're home: the portal takes you back"));
  /* teletrasportarsi salta il cancello a piedi: da fuori resta chiuso a chiave (S.gateLocked,
     persistente) finché non si trova un modo per riaprirlo. Il tono NON si dice qui (si è
     ancora nel corridoio, il cancello non si vede) — arriva quando ci si arriva davvero
     vicino da dentro il cortile, vedi checkGateNotice(). */
  if (!S.gateLocked) { S.gateLocked = true; gateNoticeShown = false; }
  save(); updateHUD(); return true;
}
/* si azzera ogni volta che il cancello torna chiuso a chiave (sopra) o si riapre (sotto):
   NON salvato, vive solo per questa sessione di gioco — un semplice "l'ho già detto?". */
let gateNoticeShown = false;
/* il tono "è chiuso dall'esterno" arriva quando il giocatore, DENTRO il cortile, si avvicina
   davvero al cancello — non appena teletrasportato (è ancora nel corridoio, il cancello non
   si vede da lì) e non ogni frame che ci sta vicino (una volta sola per chiusura). */
export function checkGateNotice() {
  if (!S.gateLocked || gateNoticeShown) return;
  const p = yardRect(); if (!p) return;
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  const insideNow = ptx >= p.x0 && ptx <= p.x1 && pty >= p.y0 && pty <= p.y1;
  if (insideNow && (ptx === p.cx - 1 || ptx === p.cx) && pty >= p.y1 - 2 && pty <= p.y1) {
    gateNoticeShown = true;
    toast('🚪 ' + tr('Caspita! È chiuso dall\'esterno!!', "Whoa! It's locked from outside!!"));
  }
}
/* il portale di ritorno a portata (E): torna dove eri prima di goHome() e sparisce.
   Sta IN MEZZO ALL'ATRIO (ATRIO_PORTAL), non fuori nel cortile — a richiesta esplicita: "il
   portale deve essere in mezzo al corridoio NON FUORI e deve comparirmi E". Si controlla la
   posizione DENTRO la scena (INT.x/INT.y), non P.x/P.y del mondo: fuori dall'atrio il
   portale semplicemente non c'è. */
export function nearbyReturnPortal() {
  if (!S.returnPortal) return null;
  if (!INT.active || !INT.b || INT.b.type !== 'house' || INT.houseRoom != null) return null;
  return (Math.abs(INT.x - ATRIO_PORTAL.x) < 32 && Math.abs(INT.y - ATRIO_PORTAL.y) < 32) ? S.returnPortal : null;
}
export function useReturnPortal() {
  if (!S.teleportBack) { S.returnPortal = null; return false; }
  if (INT.active) { INT.active = false; INT.justLeft = true; }
  if (CAVE.active) CAVE.active = false;
  P.x = S.teleportBack.x; P.y = S.teleportBack.y;
  S.teleportBack = null; S.returnPortal = null; // uso singolo: mai più di un ritorno attivo
  playSfx('found'); toast('🌀 ' + tr('Sei tornato dove eri', 'Back where you were'));
  save(); updateHUD(); return true;
}
/* il cancello chiuso a chiave (teletrasportandosi) NON è un vicolo cieco: dall'esterno lo si
   riapre sempre con E, come qualunque porta di casa propria — a richiesta: "dall'esterno lo
   posso sempre aprire". Da DENTRO invece resta come sempre (il cortile non ha mai impedito
   di uscire). */
export function nearbyLockedGate() {
  if (!S.gateLocked) return false;
  const p = yardRect(); if (!p) return false;
  const tx = Math.floor(P.x / TS), ty = Math.floor((P.y + FOOT_DY) / TS);
  /* DUE caselle di tolleranza davanti al cancello, non una: camminando col tocco ci si ferma
     dove capita, e con una casella sola l'azione compariva solo se ci si incastrava contro il
     battente. Le colonne restano quelle del cancello (non si apre da un angolo del recinto). */
  return (tx === p.cx - 1 || tx === p.cx) && (ty === p.y1 + 1 || ty === p.y1 + 2);
}
export function openLockedGate() {
  S.gateLocked = false;
  playSfx('found'); toast('🔓 ' + tr('Riapri il cancello', 'You reopen the gate'));
  save(); updateHUD(); return true;
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
    let found = false;
    /* compagno Boscaiolo/Minatore: più resa se il tipo combacia con la fonte (albero/roccia) */
    if (Math.random() < Math.min(0.85, 0.5 * companionYieldMul(src))) {
      const raw = makeRaw(zoneAt(tx, ty).id, Math.hypot(tx, ty), null, src);
      if (raw && addFossil(raw, tx, ty)) { toast(okMsg); found = true; }
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
    playSfx(found ? 'found' : kind === 'chop' ? 'chop' : 'mine'); // reperto → suono positivo; a vuoto → colpo dell'attrezzo
    save(); updateHUD();
  }, kind);
  return true;
}
export function tryChop() {
  return harvestDeco(CHOPPABLE, 'axe', choppedSet, S.chopped, 'albero', 'chop',
    '🌲 ' + tr('Tra le radici: un reperto!', 'In the roots: a find!'),
    '🪓 ' + tr('Serve l\'accetta (Negozio)', 'You need the hatchet (Shop)'));
}
export function tryMine() {
  return harvestDeco(MINEABLE, 'pick', minedSet, S.mined, 'roccia', 'mine',
    '⛰️ ' + tr('Nella roccia: un reperto!', 'In the rock: a find!'),
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
    const fishCh = Math.min(0.85, 0.4 * companionYieldMul('acqua')); // compagno Pescatore: più abboccate
    const raw = Math.random() < fishCh ? makeRaw(zoneAt(tx, ty).id, Math.hypot(tx, ty), null, 'acqua') : null;
    if (raw) {
      if (addFossil(raw, tx, ty)) toast('🎣 ' + tr('Fossile acquatico!', 'Aquatic fossil!'));
      playSfx('found');
    } else {
      /* indizio, non frustrazione: se qui c'è una specie notturna, il gioco lo lascia capire */
      const hint = !isNight() && (zonePools[zoneAt(tx, ty).id] || []).some(sp => sp.src === 'acqua' && sp.when && sp.when.night);
      toast('🎣 ' + (hint && Math.random() < 0.5
        ? tr('…niente. Di notte qui l\'acqua cambia', '…nothing. At night the water changes here')
        : tr('…non abbocca niente', '…nothing bites')));
      playSfx('fish');
    }
    save(); updateHUD();
  }, 'fish');
}

/* ---------- COMPAGNO LEGGENDARIO: raccoglitore autonomo (Fase 1) ----------
   Un compagno LEGGENDARIO di tipo terra/acqua/albero/roccia lavora DA SOLO: raggiunge una
   casella valida vicina, la lavora con animazione, e ti porta un fossile nello zaino. Cadenza
   lenta + cap (zaino pieno → si ferma) così resta più LENTO dello scavo attivo: è comodità e
   prestigio, non un sostituto (scavo = fonte principale). La grotta ha il suo potere a parte. */
/* PAUSA fra un lavoro e l'altro: `COOL` per un caso fra 3× e 10×, cioè 18–60 s.
   Prima era 6 s fissi e il raccoglitore riempiva lo zaino senza che tu facessi niente: non era
   più una comodità, era un secondo giocatore più bravo di te. Il caso serve perché una cadenza
   fissa si impara a memoria e si aspetta col cronometro.
   `LUCK`: metà delle volte non trova nulla, esattamente come capita a te. */
const CW = { GO: 118, WORK: 1.3, COOL: 6, SLOW_MIN: 3, SLOW_MAX: 10, LUCK: 0.5, RETRY: 1.6, R: 5 };
const WORK_SRC = { terra: 'terra', acqua: 'acqua', albero: 'albero', roccia: 'roccia' };
function tileValidForWork(type, tx, ty) {
  if (townInfo(tx, ty)) return false;
  if (type === 'acqua') return waterTile(tx, ty);
  /* albero e roccia: `decoAt` restituisce già null su quelli abbattuti e spaccati */
  if (type === 'albero') return CHOPPABLE.includes(decoAt(tx, ty));
  if (type === 'roccia') return MINEABLE.includes(decoAt(tx, ty));
  /* terra: scavabile, libera e MAI GIÀ SCAVATA. Senza l'ultimo controllo il raccoglitore
     tornava trenta volte sulla stessa casella — la prima buona che trovava a spirale — mentre
     a te la stessa casella dice "già scavato qui". */
  return diggable(baseTerrain(tx, ty)) && !decoAt(tx, ty) && !dugSet.has(tx + ',' + ty);
}
/* LA PAUSA VIVE NEL SALVATAGGIO, non in memoria.
 *
 * Era un contatore a runtime (`COMP.cool`), azzerato a ogni caricamento della pagina: bastava
 * ricaricare per far ripartire subito il raccoglitore, e ricaricando in continuazione scavava a
 * raffica — la pausa di 18-60 secondi non contava niente (segnalato da un giocatore).
 * Ora si salva l'ORA in cui potrà ricominciare: un ricarico non la sposta. Scorre anche a gioco
 * chiuso, ed è giusto — è un'attesa, non un lavoro che continua senza di te: al ritorno gli
 * spetta UN turno, non tutti quelli che si è perso.
 * Cambiare compagno non la azzera, altrimenti si tornerebbe al punto di partenza da un'altra
 * porta: si scambia due volte il compagno e il raccoglitore riparte quando vuoi. */
function pausaAttiva() { return (S.compNext || 0) > Date.now(); }
function mettiPausa(sec) { S.compNext = Date.now() + sec * 1000; save(); }

/* la casella si CONSUMA come quando la lavori tu: buca nel terreno, albero abbattuto, masso
   spaccato. È anche l'unica cosa che rende visibile dove ha lavorato. L'acqua no: nemmeno a te
   si esaurisce un punto di pesca. */
function segnaLavorata(type, tx, ty) {
  const key = tx + ',' + ty;
  if (type === 'terra' && !dugSet.has(key)) { dugSet.add(key); S.dug.push(key); noteDug(dugSet, key); }
  else if (type === 'albero' && !choppedSet.has(key)) { choppedSet.add(key); if (!S.chopped) S.chopped = []; S.chopped.push(key); }
  else if (type === 'roccia' && !minedSet.has(key)) { minedSet.add(key); if (!S.mined) S.mined = []; S.mined.push(key); }
}
function findWorkTile(type, cx, cy) {
  for (let r = 1; r <= CW.R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const tx = cx + dx, ty = cy + dy;
    if (tileValidForWork(type, tx, ty)) return { tx, ty };
  }
  return null;
}
/* il compagno attuale è un raccoglitore leggendario (terra/acqua/albero/roccia)? */
export function companionGathers() {
  const c = companionSpec();
  return !!c && c.q === 'leggendario' && !!WORK_SRC[companionType(c)];
}
/* passo del raccoglitore: chiamato nel game loop PRIMA di updateCompanion (che segue solo se
   non c'è un job). In grotta/interni non lavora: là il compagno non c'è. */
export function companionWorkTick(dt) {
  if (COMP.play) return;               // sta giocando: il raccoglitore aspetta il suo turno
  if (!companionGathers()) { COMP.job = null; return; }
  /* se il player si è ALLONTANATO, molla il lavoro e RAGGIUNGILO (updateCompanion segue quando
     job=null): il raccoglitore lavora SOLO restandoti vicino, così non rimane "piantato" su una
     casella a scavare mentre tu te ne vai (segnalato: "il buddy è bloccato lì"). */
  if (Math.hypot(P.x - COMP.x, P.y - COMP.y) > 4.5 * TS) { COMP.job = null; COMP.cool = 0; return; }
  const type = companionType(companionSpec());
  COMP.cool = Math.max(0, (COMP.cool || 0) - dt);
  const job = COMP.job;
  if (!job) {
    if (bagFull() || COMP.cool > 0 || pausaAttiva()) return; // zaino pieno o in pausa: segue e basta
    const cx = Math.floor(COMP.x / TS), cy = Math.floor((COMP.y + FOOT_DY) / TS);
    const t = findWorkTile(type, cx, cy);
    if (!t) { COMP.cool = CW.RETRY; return; }                // niente da lavorare qui: riprova tra poco
    COMP.job = { type, tx: t.tx, ty: t.ty, wx: t.tx * TS + 8, wy: t.ty * TS + 8, phase: 'go', t: 0, hit: -1 };
    return;
  }
  if (job.phase === 'go') {                                  // raggiungi il fianco della casella
    const gx = job.wx, gy = job.wy - 2, dx = gx - COMP.x, dy = gy - COMP.y, d = Math.hypot(dx, dy) || 1;
    const step = Math.min(d, CW.GO * dt);
    COMP.x += dx / d * step; COMP.y += dy / d * step; COMP.anim += dt;
    /* ISTERESI sul verso (come nel follow): cambia SOLO se un asse domina ×1.3, altrimenti TIENE il
       verso attuale. Senza, andando in diagonale a una casella dx≈dy flippava profilo↔fronte ogni
       frame ("parte per scavare e impazzisce"). */
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx > ady * 1.3) { COMP.face = dx < 0 ? 'left' : 'right'; COMP.dir = dx < 0 ? -1 : 1; }
    else if (ady > adx * 1.3) COMP.face = dy < 0 ? 'up' : 'down';
    if (d < 4) { job.phase = 'work'; job.t = CW.WORK; }
    return;
  }
  if (job.phase === 'work') {
    job.t -= dt; COMP.anim += dt; COMP.dir = job.wx >= COMP.x ? 1 : -1; COMP.face = COMP.dir < 0 ? 'left' : 'right';
    const ph = 1 - job.t / CW.WORK, hit = Math.floor(ph * 4);  // due colpi come lo scavo manuale
    if (hit !== job.hit) { job.hit = hit; if (hit % 2 === 1) playSfx(type === 'acqua' ? 'fish' : type === 'terra' ? 'dig' : type === 'albero' ? 'chop' : 'mine'); }
    if (job.t <= 0) {
      segnaLavorata(job.type, job.tx, job.ty);                // la buca resta, la casella è finita
      /* metà delle volte a mani vuote, e MAI XP: quello lo prende chi scava. */
      if (!bagFull() && Math.random() < CW.LUCK) {
        const raw = makeRaw(zoneAt(job.tx, job.ty).id, Math.hypot(job.tx, job.ty), null, WORK_SRC[type]);
        if (raw && addFossil(raw, job.tx, job.ty, { xp: false })) { playSfx('found'); COMP.fx.push({ x: COMP.x, y: COMP.y - 10, life: 1, q: raw.q }); }
      }
      COMP.job = null;
      mettiPausa(CW.COOL * (CW.SLOW_MIN + Math.random() * (CW.SLOW_MAX - CW.SLOW_MIN)));
    }
  }
}

/* ---------- MINIGIOCO #7: GIOCA COL COMPAGNO (lancia e riporta) ----------
   QUALSIASI compagno (non solo i leggendari raccoglitori): lanci, lui/lei corre a riportarlo,
   e c'è UNA finestra di tempismo per "prenderlo al volo" mentre torna — il timing lo si legge
   dalla barra che riempie sopra la sua testa (render.js), non è indovinare al buio.
   Ricompensa: cariche di digX2 (lo stesso buff delle spore del Cerchio di Funghi — niente
   sistema nuovo). Presa perfetta = 3 cariche, riporto qualsiasi (tardi o scaduto) = 1: MAI un
   fallimento vero, la fretta è solo quello che dà il bonus, come nel tavolo di preparazione e
   in "ricomponi lo scheletro".
   Il CORTILE è la casa naturale di questo minigioco: lì non si scava (tryDig lo blocca),
   quindi E è libero — ma nearbyYard() apre ANCHE il selettore del compagno, e quello ha già
   diritto su E. Si dà priorità al gioco SOLO se hai già un compagno pronto: altrimenti (nessun
   compagno, o sta ancora lavorando/riposando dal round precedente) resta il selettore, come
   prima. */
/* esportate: render.js le usa per disegnare l'arco del lancio e la barra di tempismo alla
   STESSA scala di questi numeri — due copie separate sarebbero potute divergere in silenzio */
export const PLAY_THROW = 0.35, PLAY_CHASE = 150, PLAY_CATCH = 1.05, PLAY_COOL = 2.5;
/* finestra d'oro dentro il tempo di cattura (frazione 0..1). PRESTO e LARGA di proposito:
   l'istinto naturale è premere E APPENA il compagno arriva (non a metà di un secondo di
   attesa) — un giocatore l'ha segnalato ("mi dà sempre bel riporto"). La finestra ora parte
   quasi subito e copre un terzo abbondante della barra, più uno "ding" (sfx) al suo inizio:
   il tempismo resta una sfida (non è premere a caso), ma è allineato a come si gioca davvero. */
export const PLAY_PERFECT = [0.12, 0.48];
/* `ignoreTile`=true salta il controllo "si scava qui" — usato dal comando console `playcomp`
   per provare il minigioco ovunque, senza dover prima cercare un parco */
export function companionPlayable(ignoreTile) {
  if (!S.companion || isMounted() || CAVE.active || INT.active || CUT.on) return false;
  if (COMP.job || COMP.play || COMP.playCool > 0) return false;
  if (!ignoreTile) {
    const { tx, ty } = digTarget(), key = tx + ',' + ty;
    if (!townInfo(tx, ty) && !yardInfo(tx, ty) && diggable(baseTerrain(tx, ty)) && !dugSet.has(key)) return false; // si scava qui: vince lo scavo
  }
  return true;
}
/* il punto d'arrivo libero non basta: il compagno corre in LINEA RETTA fino al cibo e poi torna
   da Digsy, quindi anche le due strade devono essere libere. Il cibo lanciato oltre la staccionata
   del cortile atterrava su prato libero e la creatura ci passava in mezzo (segnalato). */
function segmentClear(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
  for (let i = 1; i <= n; i++) {           // il punto di partenza è dove si sta già
    const k = i / n;
    if (!passable(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + FOOT_DY)) return false;   // i piedi: una staccionata è una casella intera
  }
  return true;
}
function throwClear(cx, cy) {
  const near = COMP.init && Math.hypot(COMP.x - P.x, COMP.y - P.y) < TS * 4;   // appena scelto: ricompare accanto a Digsy
  if (bodyHits(cx, cy, (px, py) => !passable(px, py))) return false;
  return segmentClear(P.x, P.y, cx, cy) && (!near || segmentClear(COMP.x, COMP.y, cx, cy));
}
/* lancia l'oggetto davanti a te (con un po' di spargimento): il compagno lo insegue */
export function playWithCompanion(ignoreTile) {
  if (!companionPlayable(ignoreTile)) return false;
  const dv = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[P.dir] || [0, 1];
  const base = Math.atan2(dv[1], dv[0]);
  let tx = null, ty = null;
  /* prima un lancio "vero" (davanti a te, lontano): ma il cortile di casa (M5, la casa
     naturale di questo minigioco) è un rettangolo piccolo — stando vicino a una staccionata
     un lancio lungo può cadere FUORI (recinto solido) e restare senza spazio libero nei 6
     tentativi, un fallimento silenzioso e capriccioso (segnalato: gioco non deterministico).
     Ripiego su un tiro CORTO, in QUALSIASI direzione libera (spread pieno): dentro un
     cortile 10×8 c'è sempre un metro libero da qualche parte. */
  for (let i = 0; i < 6 && tx == null; i++) {
    const ang = base + (Math.random() - 0.5) * 0.9, dist = 46 + Math.random() * 30;
    const cx = P.x + Math.cos(ang) * dist, cy = P.y + Math.sin(ang) * dist;
    if (throwClear(cx, cy)) { tx = cx; ty = cy; }
  }
  for (let i = 0; i < 10 && tx == null; i++) {
    const ang = Math.random() * Math.PI * 2, dist = 18 + Math.random() * 20;
    const cx = P.x + Math.cos(ang) * dist, cy = P.y + Math.sin(ang) * dist;
    if (throwClear(cx, cy)) { tx = cx; ty = cy; }
  }
  if (tx == null) return false; // niente spazio libero attorno: pazienza, ci si riprova
  COMP.play = { phase: 'throw', t: 0, tx, ty };
  playSfx('click');
  return true;
}
/* risolve la cattura: `auto`=true quando scade il tempo da sola (nessuna penalità, solo il
   bonus minore) — MAI chiamata due volte per lo stesso round (il chiamante controlla la fase) */
function finishCompanionCatch(auto) {
  const pl = COMP.play; if (!pl || pl.phase !== 'catch') return;
  const frac = pl.t / PLAY_CATCH;
  const perfect = !auto && frac >= PLAY_PERFECT[0] && frac <= PLAY_PERFECT[1];
  addBuff('digX2', perfect ? 3 : 1);
  playSfx(perfect ? 'found' : 'click');
  toast('🐾 ' + (perfect
    ? tr('Preso! 3 scavi più fortunati', 'Caught! 3 luckier digs')
    : tr('Bel riporto! 1 scavo più fortunato', 'Nice fetch! 1 luckier dig')));
  pl.phase = 'return'; pl.t = 0;
}
/* E durante la finestra di cattura: SEMPRE prioritario su ogni altra azione (chiamato in cima
   ad act(), come isMounted()) — un compagno che sta per prendere l'oggetto non aspetta */
export function tryCatchCompanion() {
  const pl = COMP.play; if (!pl || pl.phase !== 'catch') return false;
  finishCompanionCatch(false);
  return true;
}
/* passo del minigioco: chiamato nel game loop come companionWorkTick, PRIMA di updateCompanion
   (che segue solo a play=null) */
export function companionPlayTick(dt) {
  if (COMP.playCool > 0) COMP.playCool = Math.max(0, COMP.playCool - dt);
  const pl = COMP.play; if (!pl) return;
  pl.t += dt;
  if (pl.phase === 'throw') { if (pl.t >= PLAY_THROW) { pl.phase = 'chase'; pl.t = 0; } return; }
  if (pl.phase === 'chase' || pl.phase === 'return') {
    const gx = pl.phase === 'chase' ? pl.tx : P.x, gy = pl.phase === 'chase' ? pl.ty : P.y + 6;
    const dx = gx - COMP.x, dy = gy - COMP.y, d = Math.hypot(dx, dy) || 1;
    const step = Math.min(d, PLAY_CHASE * dt);
    COMP.x += dx / d * step; COMP.y += dy / d * step; COMP.anim += dt;
    if (Math.abs(dx) > 2) COMP.face = dx < 0 ? 'left' : 'right';
    if (d < (pl.phase === 'chase' ? 4 : 10)) {
      if (pl.phase === 'chase') { pl.phase = 'catch'; pl.t = 0; playSfx('click'); } // "ding": ORA si può prendere
      else { COMP.play = null; COMP.playCool = PLAY_COOL; }
    }
    return;
  }
  if (pl.phase === 'catch' && pl.t >= PLAY_CATCH) finishCompanionCatch(true);
}

/* ---------- COMPAGNO LEGGENDARIO DI GROTTA: cavalcatura volante (Fase 2) ----------
   Lo Speleologo leggendario è un fossile VOLANTE: lo si cavalca e si viaggia in volo sopra la
   mappa (attraversa ostacoli/acqua, più veloce). VINCOLO: in GROTTA (e negli interni) NON si
   vola — si cavalca solo all'aperto; entrando si scende. Flag propria S.mounted, MAI il cheat
   P.fly (che vanilla/godmode gestiscono a parte). */
export function companionRides() {
  const c = companionSpec();
  return !!c && c.q === 'leggendario' && companionType(c) === 'grotta';
}
export function isMounted() { return !!S.mounted && companionRides() && !CAVE.active && !INT.active; }
/* dove si può ATTERRARE: la casella calpestabile più vicina (quella sotto i piedi se già libera,
   altrimenti a spirale entro pochi passi). null = niente terreno libero → non si scende. Usa la
   collisione a piedi (bodyHits+passable) a prescindere dal volo, così rocce/alberi/montagne/acqua
   senza natante NON contano come atterraggio valido (prima si scendeva e ci si incastrava). */
function landingSpot() {
  const blocked = (x, y) => bodyHits(x, y, (px, py) => !passable(px, py));
  if (!blocked(P.x, P.y)) return { x: P.x, y: P.y };
  const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
  for (let r = 1; r <= 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;     // solo l'anello esterno del raggio
    const x = (tx + dx) * TS + 8, y = (ty + dy) * TS + 8;
    if (!blocked(x, y)) return { x, y };
  }
  return null;
}
export function toggleMount() {
  if (CAVE.active || INT.active) { toast('🕳️ ' + tr('Qui non si vola: scendi e cammina', 'No flying here: get down and walk')); return false; }
  if (!companionRides()) { toast('🐾 ' + tr('Serve un compagno di grotta leggendario', 'Needs a legendary cave companion')); return false; }
  if (S.mounted) {                          // sto per SCENDERE: serve una casella CALPESTABILE
    const spot = landingSpot();
    if (!spot) { toast('🐾 ' + tr('Qui non si scende: cerca un punto libero', "Can't land here: find open ground")); playSfx('nope'); return false; }
    P.x = spot.x; P.y = spot.y;             // atterra sul punto libero più vicino
  }
  S.mounted = !S.mounted;
  toast(S.mounted ? '✨ ' + tr('In volo! Attraversi tutto', 'Airborne! You cross anything') : '🐾 ' + tr('Sei sceso', 'You landed'));
  playSfx(S.mounted ? 'found' : 'click'); save();
  return true;
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
/* STATUA del nonno a portata (E): si legge la targa */
export function nearbyStatue() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const ti = townInfo(ptx + dx, pty + dy);
    if (ti && ti.deco && ti.deco.type === 'statue') return ti.deco;
  }
  return null;
}
/* cassetta della posta a portata (E): nelle città SENZA Museo, per spedire i grezzi */
export function nearbyMailbox() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const ti = townInfo(ptx + dx, pty + dy);
    if (ti && ti.deco && ti.deco.type === 'mailbox') return ti.deco;
  }
  return null;
}
/* SPEDISCI i reperti grezzi al Museo (dalle città senza Museo): costo a pezzo, pronti il giorno
   DOPO (transito). Poi si RITIRANO al Museo come un deposito normale. Un lotto alla volta. */
export const MAIL_COST = 2; // 🪙 a pezzo
export function shipToMuseum() {
  const n = S.raw.length;
  if (!n) { toast(tr('Niente reperti grezzi da spedire', 'No raw finds to ship')); return false; }
  const cost = n * MAIL_COST;
  if (S.coins < cost && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + cost); return false; }
  if (!isDebug()) S.coins -= cost;
  addToMuseumJob(S.day + 1); // spedizione: pronti DOMANI (o quando arriva, se c'è già un lotto)
  playSfx('coin'); toast('📮 ' + tr('Spediti! Ritiro domani al Museo', 'Shipped! Pick up tomorrow at the Museum'));
  save(); updateHUD();
  return true;
}
/* dentro (o al bordo del) cortile recintato di casa: da qui si sceglie compagno e cortile */
export function nearbyYard() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y + FOOT_DY) / TS);
  const p = yardRect(); if (!p) return null;
  return (ptx >= p.x0 - 1 && ptx <= p.x1 + 1 && pty >= p.y0 - 1 && pty <= p.y1 + 1) ? p : null;
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
export function tossLuck(markerPos, targetPos) {
  const HALF = 0.06;                                    // metà della zona d'oro (larga il 12%)
  const d = Math.abs(markerPos - targetPos);
  return d >= HALF ? 0 : 1 - d / HALF;                  // FUORI dalla zona d'oro = NESSUN boost; più centri, più fortuna
}
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
/* ESITO dei 3 giri. Centrarli TUTTI E TRE = premio ASSICURATO: sempre un reperto (mai nulla),
   ma di rarità RANDOM pesata verso il basso (comune più probabile, leggendario meno) — così il
   pieno è sempre soddisfacente senza regalare leggendari a raffica. Con meno centri la fortuna
   = quanti ne hai presi (0/3, 1/3, 2/3) sposta le probabilità, e può uscire nulla. Puro/testabile. */
export function tossOutcome(hits, roll) {
  if (hits >= 3) return roll < 0.50 ? 'comune' : roll < 0.80 ? 'raro' : roll < 0.95 ? 'eccezionale' : 'leggendario';
  return tossRarity(hits / 3, roll);
}
/* assegna l'esito del lancio: hits = quanti dei 3 giri hai centrato (la moneta l'ha già scalata tossCoin) */
export function grantToss(hits) {
  const rar = tossOutcome(hits, Math.random());
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
  /* apre il minigioco dei 3 giri; alla fine grantToss con i centri (hits). Se l'UI non c'è → 0. */
  import('./ui.js').then(u => { if (u.openToss) u.openToss(hits => grantToss(hits)); else grantToss(0); }).catch(() => grantToss(0));
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
/* piazza una mappa (X scavabile) verso un pezzo della rarità data e la ritorna (o null).
   Usata dal cartografo (buyMap) e come PREMIO SPECIALE della missione lucciole (leggendaria). */
export function grantMap(rar) {
  const t = mapSpot(rar);
  if (!t) return null;
  if (!S.maps) S.maps = [];
  const m = { x: t.x, y: t.y, rar, uid: S.uid++ };
  S.maps.push(m);
  return m;
}
export function buyMap(rar) {
  const cost = MAP_COST[rar];
  if (S.coins < cost && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + cost); return false; }
  const m = grantMap(rar);
  if (!m) { toast(tr('Il cartografo non trova nulla…', 'The cartographer finds nothing…')); return false; }
  if (!isDebug()) S.coins -= cost;
  playSfx('coin');
  toast('🗺️ ' + tr('X segnata: ', 'X marked: ') + dirTo(m.x, m.y));
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
  if (rem <= 0) { toast(tr('Sito esaurito', 'Site dug out')); return; }
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
    if (addFossil(raw, s.x, s.y)) { toast(tr('⛏️✨ Reperto pregiato dal sito! (', '⛏️✨ Precious find from the site! (') + (rem - 1) + tr(' rimasti)', ' left)')); playSfx('found'); } // suono positivo sul reperto
    save(); updateHUD();
  });
}
/* ---------- SCHELETRO SEPOLTO: 5 caselle, 5 parti, UNA specie garantita ----------
   Ogni casella del sito è UNA parte precisa (world.js decide quale). Si scava come i siti
   normali (adiacente, non sotto i piedi: sono monticelli solidi), ma ogni colpo dà SEMPRE
   quella parte di QUELLA specie — mai un'altra, mai a vuoto. Il progresso vive per SITO
   (S.boneSites[key] = parti già scavate), quindi si può finire in più visite. */
export function boneSiteDug(site, part) { return (S.boneSites[site.key] || []).includes(part); }
export function boneSiteProgress(site) { return (S.boneSites[site.key] || []).length; }
export function nearbyBoneSite() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const b = boneSiteAt(ptx + dx, pty + dy);
    if (b && !boneSiteDug(b.site, b.part)) return b;
  }
  return null;
}
export function digBoneSite() {
  const b = nearbyBoneSite(); if (!b) return;
  const { site, part } = b;
  if (!S.tools.spade && !isDebug()) { toast('🪏 ' + tr('Serve la pala (Negozio)', 'You need a spade (Shop)')); return; }
  if (S.energy <= 0 && !isDebug()) { toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn')); playSfx('nope'); return; }
  beginDig(0.55, () => {
    if (!isDebug()) spendEnergy(1);
    if (!S.boneSites[site.key]) S.boneSites[site.key] = [];
    S.boneSites[site.key].push(part);
    const sp = spById[site.sp], dist = Math.hypot(site.x, site.y);
    const val = Math.max(2, Math.round(7 * ptById[part].mult * RAR.find(r => r.id === sp.r).mult * (1 + dist / 900)));
    const raw = { uid: S.uid++, s: site.sp, t: part, q: sp.r, val };
    const done = boneSiteProgress(site) >= 5;
    if (addFossil(raw, site.x, site.y)) {
      toast('🦴✨ ' + partName(part) + tr(' di ', ' of ') + sp.name + ' — ' + boneSiteProgress(site) + '/5' + (done ? tr(' · scheletro completo!', ' · skeleton complete!') : ''));
      playSfx(done ? 'fanfare' : 'found');
    }
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
  const g = makeGoodById(h.id);
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
  const g = makeGoodById(id); addGood(g);
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
/* ARREDO DI CASA — tocca DIRETTAMENTE il mobile per raccoglierlo, o la casella per posarlo:
   non serve più camminarci sopra come per {act} (richiesto esplicitamente: "devo poterli
   spostare come mi pare"). Chiamata dal tocco sulla canvas (input.js), PRIMA del tocca-per-
   camminare — un `true` vuol dire "gestito qui", niente meta di cammino sopra. Un tocco su
   una casella VUOTA (senza tenere nulla in mano) torna `false` apposta: deve restare un
   comando per camminare lì, non aprire il vassoio a ogni passo. */
export function tapFurnitureAt(gx, gy) {
  if (!INT.active || !INT.b || INT.b.type !== 'house' || INT.houseRoom == null) return false;
  const room = INT.houseRoom;
  if (!isFloorCell(gx, gy)) return false;
  if (isHolding()) {
    setHoldTarget(gx, gy);
    if (placeHold(room, gx, gy)) { nudgeOffFurniture(); toast('🎨 ' + tr('Piazzato!', 'Placed!')); }
    else toast('🎨 ' + tr('Qui non si può piazzare', "Can't place it here"));
    return true;
  }
  if (!roomUnlocked(room)) return false;
  const f = furnAt(room, gx, gy);
  if (!f) return false; // niente da raccogliere: resta un tocco per camminare
  if (f.itemId === PEDESTAL_ID) { openPedestal(room, gx, gy); return true; }
  if ((FURN_BY_ID[f.itemId] || {}).slot === 'letto') { openBed(room, gx, gy); return true; }
  if (pickUpFurniture(room, gx, gy)) toast('🎨 ' + furnLabel(f.itemId) + ' ' + keys(tr('in mano: tocca dove piazzarlo', 'in hand: tap where to place it')));
  return true;
}
export function act() {
  if (P.digging) return; // un colpo alla volta
  /* DURANTE UNA CUTSCENE NON SI AGISCE. Il Curatore che consegna il Libro toglie il controllo
     al giocatore, ma `act()` restava viva: premendo E si apriva il pannello del Museo MENTRE
     la scenetta andava avanti, e ci si ritrovava con una modale aperta sopra un video che
     nessuno poteva più far avanzare — un limbo da cui si usciva solo ricaricando (segnalato
     con foto). La scenetta si fa avanzare col clic, che ha già la sua strada (cutAdvance). */
  if (CUT.on) return;
  /* il compagno che sta per prendere il riporto NON aspetta: se c'è una finestra di cattura
     aperta, E vale sempre "prendilo", prima di ogni altra cosa vicina */
  if (tryCatchCompanion()) return;
  /* il round è in corso ma non ancora catturabile (lancio/inseguimento/ritorno): E non deve
     "sfuggire" ad altro (riaprire il selettore del parco, scavare) — resta in attesa, muto,
     come premere E un attimo troppo presto. Senza questo un E impaziente durante l'inseguimento
     apriva il pannello del compagno SOPRA al round ancora in corso. */
  if (COMP.play) return;
  if (isMounted()) { toast('🐾 ' + tr('In volo non si scava', "No digging while flying")); return; } // la cavalcatura serve solo a spostarsi
  if (CAVE.active) { // in grotta: scava i giacimenti luminosi
    const r = digCave();
    if (r === 'nopick') toast('⛏️ ' + tr('Serve il piccone (Negozio)', 'Needs the pickaxe (Shop)'));
    else if (r === 'noenergy') toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn'));
    else if (r === 'bagfull') { toast('🎒 ' + tr('Zaino pieno: il cristallo resta qui', 'Bag full: the crystal stays here')); playSfx('nope'); }
    else if (r === false) toast(tr('Avvicinati a un giacimento luminoso', 'Get close to a glowing deposit'));
    return;
  }
  if (INT.active) { // parla con l'NPC o leggi l'etichetta di un'esposizione
    if (nearbyReturnPortal()) { useReturnPortal(); return; } // portale di ritorno (goHome): in mezzo all'atrio
    if (nearMentorInt()) { openMentor(); return; } // Maestro Scavatore: spiega i livelli
    if (nearNpc()) { openBuilding(INT.b); return; }
    { const pet = nearPet(); if (pet) { petShopAnimal(); return; } }
    const nc = nearCase(); if (nc) { openExhibit(nc.sp.id); return; }
    const gate = nearLockedGate(); if (gate != null) { openRoomLock(gate); return; } // casa: porta a lucchetto
    /* casa: piazzare/raccogliere arredo sulla propria casella (M3) — stesso criterio di
       digTarget(), si agisce sotto i piedi, mai sul cubetto verso cui si guarda */
    const cell = houseFloorHere();
    if (cell) {
      if (isHolding()) { // mobile in mano: {act} lo posa DOVE SI VEDE l'anteprima
        /* l'anteprima è quello che il giocatore sta guardando: posare da un'altra parte
           (sotto i piedi) sarebbe un dispetto. Sotto i piedi si ripiega solo se l'anteprima
           non è mai stata mossa. NIENTE controllo "cella occupata" a priori: una cella può
           avere un mobile solido E un decoro insieme (tappeto sotto la sedia) — è
           `placeHold`/`tryPlaceFurniture` (house.js) a sapere se lo STRATO giusto è libero. */
        const t = holdTarget();
        const ok = t ? placeHold(cell.room) : placeHold(cell.room, cell.gx, cell.gy);
        if (ok) { nudgeOffFurniture(); toast('🎨 ' + tr('Piazzato!', 'Placed!')); }
        else toast('🎨 ' + tr('Qui non si può piazzare', "Can't place it here"));
      }
      else if (cell.itemId === PEDESTAL_ID) openPedestal(cell.room, cell.gx, cell.gy);
      /* il letto fa DUE cose e la principale è dormirci: raccoglierlo di colpo col tasto
         azione voleva dire smontare il letto ogni volta che ci si passava sopra */
      else if (cell.itemId && (FURN_BY_ID[cell.itemId] || {}).slot === 'letto') openBed(cell.room, cell.gx, cell.gy);
      else if (cell.itemId) {
        /* quello appeso sta una casella più in su: si tocca da sotto, stando al muro */
        const pgy = cell.wall ? cell.gy - 1 : cell.gy;
        if (pickUpFurniture(cell.room, cell.gx, pgy)) toast('🎨 ' + furnLabel(cell.itemId) + ' ' + keys(tr('in mano: {act} per posarlo', 'in hand: {act} to place it')));
      } else if (cell.unlocked) openFurnitureTray(cell.room, cell.gx, cell.gy);
    }
    return;
  }
  { const w = nearbyWonder(); if (w) { openWonder(w); return; } } // meraviglia: pannello col suo dono
  if (nearbyLockedGate()) { openLockedGate(); return; } // cancello chiuso a chiave: si riapre sempre da fuori
  if (nearbyBoard()) { openQuestBoard(); return; } // cartello delle missioni
  if (nearbyStatue()) { openStatue(); return; }    // targa del monumento al nonno
  if (nearbyMailbox()) { openMailbox(); return; } // cassetta: spedisci i grezzi al Museo
  /* già ne hai uno pronto? nel parco si GIOCA invece di riaprire il selettore (che resta per
     chi non ha ancora scelto, o mentre il compagno lavora/riposa dal round precedente) */
  if (companionPlayable()) { if (playWithCompanion()) return; }
  if (nearbyYard()) { openCompanionPicker(); return; } // cortile: scegli compagno e cortile
  if (nearbyBoneSite()) { digBoneSite(); return; }
  if (nearbySite()) { digSite(); return; }
  if (nearbyDrop()) { collectPickup(); return; } // un FOSSILE caduto a terra (zaino pieno) ha la PRIORITÀ sulla fontana
  if (nearbyFountain()) { tossCoin(); return; }
  if (collectPickup()) return;                 // oggetto di superficie a portata
  if (onBoat()) { if (nearbyWreck()) digWreck(); else tryFish(); return; } // relitto o pesca
  if (tryCatchFireflies()) return;             // di notte con la missione: E dà la retinata alle lucciole a portata
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
    playSfx('found'); return msg + (got < n ? tr(' (zaino pieno: resto a terra)', ' (bag full: rest on the ground)') : '');
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
    case 'mushring': addBuff('digX2', 10); out = '🍄 ' + tr('Spore fortunate: 10 scavi più fortunati', 'Lucky spores: 10 luckier digs'); playSfx('found'); break;
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
  /* niente toast: il regalo lo si è appena visto arrivare nell'intro, e il tutorial ricorda
     da solo che va portato al Museo. Un avviso che scorre via nei primi secondi si somma agli
     altri e li rende tutti rumore. */
}
/* MERCATO: il prezzo alla vendita scala con la richiesta del giorno per quella specie (market.js).
   Il valore base (it.val) resta intatto — guida commissioni/restauro/Museo, non tocca a loro
   sapere di questo. Qui, e SOLO qui, si applica. */
export function sellItem(uid) { const i = S.items.findIndex(x => x.uid === uid); if (i < 0) return; const it = S.items[i]; S.coins += marketPrice(it.val, it.s, S.day); S.items.splice(i, 1); playSfx('coin'); save(); updateHUD(); }
export function sellAll() { let g = 0; S.items.forEach(it => g += marketPrice(it.val, it.s, S.day)); S.coins += g; const n = S.items.length; S.items = []; if (n) playSfx('coin'); save(); updateHUD(); return { g, n }; }
/* ---------- museo: consegni i GREZZI, gli esperti identificano in 1 giorno ----------
   Al ritiro: i pezzi che il museo HA GIÀ tornano a te (identificati, vendibili);
   i pezzi NUOVI vengono esposti (niente monete). Teca completa 5/5 → FIALETTA DNA
   intera (S.dna +2 mezze), da usare al Laboratorio. Debug: ritiro immediato. */
/* RESTAURO al ritiro: il Curatore lo propone SOLO se hai consegnato almeno PREP_RARE_MIN pezzi
   raro+ insieme, e solo sul MIGLIORE dei doppioni che ti tornano (quelli che poi vendi). */
export const PREP_RARE_MIN = 3;
const RARE_PLUS = ['raro', 'eccezionale', 'leggendario'];
/* aggiunge i grezzi dello zaino al LOTTO del Museo. Se ce n'è GIÀ uno in lavorazione, i nuovi ci
   si AGGIUNGONO invece di essere rifiutati: prima con la borsa piena e un lotto non ancora
   ritirato si restava in stallo (non potevi consegnare né svuotare la borsa). Il lotto è pronto
   quando arriva l'ultimo pezzo (ready = il più tardi). */
function addToMuseumJob(arriveDay) {
  const raw = S.raw.splice(0);
  if (S.museumJob) { S.museumJob.items.push(...raw); S.museumJob.ready = Math.max(S.museumJob.ready, arriveDay); }
  else S.museumJob = { items: raw, ready: arriveDay };
  S.museumJob.prepOk = S.museumJob.items.filter(it => RARE_PLUS.includes(it.q)).length >= PREP_RARE_MIN;
}
export function museumDeposit() {
  if (!S.raw.length) { toast(tr('Niente reperti grezzi da consegnare', 'No raw finds to hand in')); return false; }
  addToMuseumJob(S.day); // consegna di persona: identificazione ISTANTANEA (ready = oggi)
  if (tutBump('museum') === 'step') announceTutStep();   // ultimo passo: il ciclo è chiuso
  save(); updateHUD();
  return true;
}
export function museumJobReady() { return !!S.museumJob && (isDebug() || S.day >= S.museumJob.ready); }
export function museumCollect() {
  if (!museumJobReady()) return null;
  const prepOk = !!S.museumJob.prepOk;
  const back = [], shown = [], vials = [], left = [], amberShown = [], amberDone = [];
  for (const it of S.museumJob.items) {
    if (!S.codex.includes(it.s)) S.codex.push(it.s); // identificato in ogni caso
    if (it.amber) {
      /* pezzo d'AMBRA: va nella seconda fila della teca; se c'è già torna a te (vale il triplo) */
      const am = (S.amber || (S.amber = {}))[it.s] || (S.amber[it.s] = []);
      if (am.includes(it.t)) { if (bagFull()) { left.push(it); continue; } S.items.push(it); back.push(it); continue; }
      am.push(it.t); amberShown.push(it);
      if (am.length === PARTS.length && !S.amberDone.includes(it.s)) {
        S.amberDone.push(it.s); amberDone.push(it.s);
        S.coins += amberReward(it.s); gainXp(60);
      }
      continue;
    }
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
  S.museumJob = left.length ? { items: left, ready: S.day, prepOk } : null;
  if (left.length) toast('🎒 ' + tr('Zaino pieno: ', 'Bag full: ') + left.length + tr(' pezzi restano al Museo', ' pieces wait at the Museum'));
  /* proposta di RESTAURO: solo se il lotto aveva ≥ PREP_RARE_MIN raro+, sul MIGLIORE doppione
     raro+ che ti è tornato (quello che poi vendi). Uno solo, e si può saltare (lo decide la UI). */
  let prepCand = null;
  if (prepOk) prepCand = back.filter(it => RARE_PLUS.includes(it.q) && it.prep == null).sort((a, b) => (b.val || 0) - (a.val || 0))[0] || null;
  save(); updateHUD();
  return { back, shown, vials, left, prepCand, amberShown, amberDone };
}
/* Sonno alternato: metà-giornata = giorno [0,0.5) o notte [0.5,1). halfIndex monotòno crescente. */
function curHalf() { return S.day * 2 + (isNight() ? 1 : 0); }
/* si può dormire solo dopo aver passato almeno una metà sveglio (niente due sonni di fila) */
export function canSleep() { return isDebug() || S.sleepBlockHalf == null || curHalf() >= S.sleepBlockHalf; }
export function sleepBlocked() { return !canSleep(); }
/* dormire di GIORNO → ci si sveglia di NOTTE (stesso giorno);
   dormire di NOTTE → alba del giorno dopo. Poi va passata una metà sveglio. */
export function restInn() {
  if (!canSleep()) { toast(tr('Troppo presto per dormire', 'Too soon to sleep')); return false; }
  const night = isNight();
  if (night) { S.day++; S.tod = 0.02; }   // notte → alba del giorno dopo
  else { S.tod = 0.60; }                   // giorno → notte fonda dello stesso giorno
  /* dormire salta a domani senza passare dall'orologio del game loop: la scadenza delle
     missioni va CONTATA qui, e prima di updateHUD — è updateHUD stesso a svuotare lo stack
     scaduto, quindi dopo non ci sarebbe più niente da contare e chi va a letto con tre
     richieste in corso si sveglierebbe senza che nessuno gliel'abbia spiegato. */
  const questsLost = night ? expireQuests(S.day) : 0;
  S.energy = S.maxEnergy;
  S.sleepBlockHalf = curHalf() + 1;        // sblocco solo dopo una metà passata sveglio
  save(); updateHUD();
  toast(night ? (tr('Alba del giorno ', 'Dawn of day ') + S.day + tr('! Energia piena', '! Full energy'))
    : tr('Cala la notte. Energia piena', 'Night falls. Full energy'));
  { const t = questExpiryText(questsLost); if (t) toast(t); }
  return true;
}
/* DORMIRE NEL PROPRIO LETTO. La Locanda resta (è comoda quando sei lontano), ma il letto di
   casa dà in più il "ben riposato": tante fatiche gratis quanto è curata la stanza. È il
   motivo per cui arredare conviene davvero, e il gioco lo dice in chiaro invece di lasciarlo
   scoprire (REGOLA #7: ogni testo dice cosa fa davvero). */
export function sleepAtHome(room) {
  const bonus = restFreeFor(room);
  if (!restInn()) return false;
  S.restFree = bonus;
  if (bonus) toast('😴 ' + tr('Ben riposato: le prossime ', 'Well rested: your next ') + bonus + tr(' fatiche non costano energia', ' efforts cost no energy'));
  else toast('😴 ' + tr('Dormito. Stanza spoglia: niente bonus', 'Slept. Bare room: no bonus'));
  save(); updateHUD();
  return true;
}

/* RISTORI — l'energia era una risorsa finta: 15🪙 fissi e ristori illimitati significavano
   che nessuna giornata poteva mai andare storta. Ora il fornaio ne ha pochi al giorno e il
   prezzo sale a ogni acquisto: la seconda metà di giornata va pianificata, non comprata. */
/* 20 e non 15: la pala costa 15, e nel tutorial il primo obiettivo è mettere insieme
   ESATTAMENTE quella cifra. Con due cose diverse allo stesso prezzo sullo stesso bancone si
   compra il ristoro credendo di comprare la pala, e il tutorial resta fermo senza colpa di
   nessuno. Prezzi: 20 · 32 · 44 · 56. */
export const SNACK_BASE = 20, SNACK_STEP = 12, SNACK_MAX_DAY = 4;
function snackDayReset() { if (S.snackDay !== S.day) { S.snackDay = S.day; S.snackBought = 0; } }
export function snacksLeftToday() { snackDayReset(); return Math.max(0, SNACK_MAX_DAY - (S.snackBought || 0)); }
export function snackPrice() { snackDayReset(); return SNACK_BASE + SNACK_STEP * (S.snackBought || 0); }
export function buyEnergy() {
  snackDayReset();
  if (snacksLeftToday() <= 0 && !isDebug()) {
    toast(tr('Ristori finiti: torna domani', 'Snacks sold out: come back tomorrow'));
    return;
  }
  const cost = snackPrice();
  if (S.coins < cost && !isDebug()) { toast(tr('Servono ', 'You need ') + cost + ' 🪙'); return; }
  if (!isDebug()) { S.coins -= cost; S.snackBought = (S.snackBought || 0) + 1; }
  playSfx('coin');
  S.snacks = (S.snacks || 0) + 1;
  /* non è energia subito: lo si mangia dallo zaino. Il tasto passa da {key:} — sul telefono non esiste */
  toast('🍞 ' + keys(tr('Ristoro nello zaino{key:I}: +15 ⚡', 'Snack in your bag{key:I}: +15 ⚡')));
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
/* L'ASSEMBLAGGIO DIRETTO (cranio+torace+zampa → chimera al volo) È STATO TOLTO: due strade per
   la stessa cosa (assembla o alleva) rendevano l'allevamento una scorciatoia più lenta e
   nessuno lo usava. Ora le chimere nascono SOLO dall'allevamento (breeding.js): prima risvegli
   specie PURE (awakenSpecies, invariato), poi le ibridi fra loro — la prima chimera è un
   traguardo di metà partita, non un click a 🪙40 appena hai i tre pezzi giusti. */

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
  /* va DA SOLA nel cortile di casa: prima restava solo "scegliibile" e chi non apriva il pannello
     del cortile non la vedeva mai camminare. È il momento in cui si vuole vederla. */
  try { ensureHouseState(); } catch (e) { /* stub */ }
  if (S.house) { if (!S.house.yard) S.house.yard = []; if (!S.house.yard.includes('sp' + spId)) S.house.yard.push('sp' + spId); }
  gainXp(25);
  save(); updateHUD();
  /* IL RISVEGLIO È IL TRAGUARDO DEL GIOCO (goal.js): una scena sua, lo scheletro che torna vivo, con
     la didascalia che dice dove ritrovarla */
  if (typeof document !== 'undefined') import('./ui.js').then(u => u.playAwakening && u.playAwakening(spId)).catch(() => {});
  /* la PRIMA volta si dice dove porta tutto questo: è l'unico istante in cui il giocatore ha
     appena visto con i suoi occhi cosa vuol dire "riportarle in vita", ed è lì che la frase
     attacca. Dalla seconda in poi basta il conto. */
  toast('🧬 ' + spById[spId].name + tr(' è nel tuo giardino.', ' is in your garden.')
    + (alive() === 1
      ? tr(' Il nonno non ne vide mai una viva: tu sì. Ne restano ', ' Your grandparent never saw one alive: you did. ')
        + (aliveTotal() - 1) + tr('.', ' left to go.')
      : ' ' + goalTitle() + ': ' + goalLine()));
  /* LA SOGLIA SI ANNUNCIA QUANDO SCATTA, dicendo cosa è comparso nel parco. Il parco cresce da
     solo (parkDeco legge il conteggio), ma senza dirlo il giocatore non collega le due cose:
     torna al recinto settimane dopo e crede che sia sempre stato così. */
  {
    const m = milestoneReached();
    if (m) {
      const dono = milestoneGift(m);
      if (m === aliveTotal()) bigMoment('🌳 ' + tr('IL MONDO DEL NONNO', "YOUR GRANDPARENT'S WORLD"), dono);
      else toast('🌳 ' + goalTitle() + ': ' + goalLine() + ' — ' + dono);
    }
  }
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
export function collide(x, y) { if (P.fly || isMounted()) return false; return bodyHits(x, y, (px, py) => !passable(px, py)); }
