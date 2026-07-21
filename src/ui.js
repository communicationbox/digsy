/* UI DOM: HUD, prompt, toast, modale edifici, zaino, editor/barbiere/sartoria */
import { TS, SPECIES, ALL_SPECIES, MUSEUM_ZONES, spById, ptById, PARTS, RAR, ZONES, zonePools, CHIMERA_COST, SERVICE_COST, LOOKS, LOOK_LABELS, HAIR_STYLES, HAIR_COLORS, EYE_COLORS, HAT_STYLES, ZONE_COSMETICS, PREMIUM_HATS, PREMIUM_HAT_COST, NAMES, randomName } from './data.js';
import { zoneAt } from './regions.js';
import { S, P, save, dugSet, isCheatLock } from './state.js';
import { baseTerrain, diggable, townForTile, townInfo } from './world.js';
import { ensureQuests, boardOffers, acceptQuest, deliverQuest, questText, questHave, canComplete, isActive, isDone, activeQuests, giverName, MAX_ACTIVE } from './quests.js';
import { playSfx } from './audio.js';
import { companionCandidates, setCompanion, clearCompanion, isCurrentCompanion, companionAbility, companionSpec, abilityOf } from './companion.js';
import { playerLevel, playerXp, xpToNext, digDurationMul, rareBonus } from './progress.js';
import { ACHS, checkAchievements, isAchieved, achLabel, achDesc } from './achievements.js';
import { weatherAt, weatherLabel } from './weather.js';
import { applyLook, drawHero, HATS, HAIRS } from './sprites.js';
import { nearbyWonder, useWonder, bagFull, nearbyHarvest } from './gameplay.js';
import { sellItem, sellAll, sellGood, sellAllGoods, goodName, restInn, canSleep, buyEnergy, eatSnack, snackPrice, snacksLeftToday, assembleChimera, nearbyDoor, nearbyFountain, nearbySite, nearbyPickup, nearbyGround, nearbyWreck, nearbyBoard, nearbyPark, wreckRemaining, onBoat, gainXp, buyBag, bagCap, bagLevel, fossilCount, nextBagCost, BAG_CAPS, discardToGround, siteRemaining, awakenReady, awakenSpecies, museumDeposit, museumCollect, museumJobReady, buyMap, buyDna, buyTool, buyTeleport, useTeleport, fuseDupes, gearActive, toggleGear, compassActive, toggleCompass, debugSpawnAll, dirTo, tossLuck, MAP_COST, MAP_DIST, DNA_COST, TOOL_COST, TELEPORT_COST } from './gameplay.js';
import { darknessAt, seasonOf, SEASONS, isNight } from './daynight.js';
import { INT, nearNpc, nearCase, nearMentorInt, nearExit, exitInterior, npcName, sayNpc } from './interior.js';
import { letterTitle, letterBody, hasLetter, allLetters } from './letters.js';
import { isExplored, revealArea, exploredTiles } from './map.js';
import { TIPS, TIP_IDS, tipSeen, markTip, tipTitle, tipText, tipsSeenCount } from './tips.js';
import { landmarkForCell, LCELL } from './world.js';
import { drawWonder } from './wonderart.js';
import { wonderName, wonderDesc, wonderGrandpa, wonderPower, wonderCd, wonderStatusText, wonderReadyIn, markWonderUsed, archList, travelToArch, isDiscovered, WONDERS } from './wonders.js';
import { CAVE, caveNodeReach, exitCave, nearCaveExit } from './cave.js';
import { baseSpec, partParams, buildVoxels, buildFleshVoxels, partVoxels, composedPartsVox, shadeHex, BP } from './bones.js';
import { isDebug } from './debug.js';
import { tipsOn, joystickOn, leftHanded } from './prefs.js';
import { fusibleGroups, nextRarity } from './fuse.js';
import { projectVox } from './voxview.js';
import { openMap, closeMap, isMapOpen, revealMap, mapZoomBy, mapReset } from './mapui.js';
export { openMap, closeMap, isMapOpen, revealMap };
import { openBook, closeBook, isBookOpen, bookFlip, descFor, disposeViews, remount3D, drawVoxel2D } from './bookui.js';
export { openBook, closeBook, isBookOpen, bookFlip, descFor };
import { openPrepare, closePrepare, isPrepOpen, prepCandidate } from './prepui.js';
export { openPrepare, closePrepare, isPrepOpen, prepCandidate };
import { newBoard, brush, cleanPct, gradeFor, applyPrep, isPrepped } from './prepare.js';
import { offerFor as cmOfferFor, active as cmActive, accept as cmAccept, deliver as cmDeliver,
  have as cmHave, canDeliver as cmCanDeliver, text as cmText, rewardText as cmRewardText,
  dueText as cmDueText, pruneExpired as cmPrune, DURATION as DURATION_CM } from './commission.js';
import { icon, withIcons } from './icons.js';
import { groundPalette } from './tiles.js';
import { tr, actKey, keyHint, isTouch, LANG, rarLabel, partName, zoneName, bldName, seasonName, lookLabel, hairLabel, hatLabel } from './i18n.js';

/* ---------- toast / HUD / prompt ---------- */
export function toast(m) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = withIcons(m);
  /* mai pile illeggibili: mobile 1 solo toast, desktop max 2. I nuovi sfrattano i vecchi. */
  /* su schermo piccolo un solo toast per volta: due coprirebbero mezzo gioco.
     Passa da isTouch() come tutto il resto — questa riga guardava solo il dito e ignorava
     la larghezza, quindi su una finestra stretta i toast si comportavano diversamente da
     HUD, testi e CSS, che il breakpoint lo rispettano. */
  const maxT = isTouch() ? 1 : 2;
  while (box.children && box.children.length >= maxT && box.firstChild) box.firstChild.remove();
  box.appendChild(t); setTimeout(() => t.remove(), 2600);
}
/* altezza reale dell'HUD → variabile CSS. Su mobile i chip vanno a capo e l'HUD può
   diventare alto il doppio: il prompt che gli sta sotto deve saperlo, o ci finisce dentro. */
/* la leva sparisce quando si gioca a tocchi: lasciarla lì coprirebbe il mondo per niente
   (ed è proprio la parte di schermo che si vuole toccare) */
export function syncTouchControls() {
  const joy = document.getElementById('joy');
  /* la leva DISEGNATA in un angolo esiste solo con la leva fissa: quella fluttuante nasce
     sotto il dito, e col solo tocco non serve.
     ECCEZIONE: se la leva fluttuante è in uso NON si tocca. L'HUD si aggiorna ogni due
     secondi, e senza questa riga rimetteva `off` in mezzo a un trascinamento: la leva
     spariva sotto il pollice dopo esattamente 2 secondi. */
  if (joy && joy.classList && !joy.classList.contains('floating')) joy.classList.toggle('off', !joystickOn());
  /* mancini: i comandi si specchiano (il tasto A passa a sinistra) */
  const b = typeof document !== 'undefined' ? document.body : null;
  if (b && b.classList) b.classList.toggle('lefty', leftHanded());
}
function syncHudHeight() {
  const hud = document.getElementById('hud');
  if (!hud || !hud.getBoundingClientRect || !document.documentElement || !document.documentElement.style) return;
  const h = Math.round(hud.getBoundingClientRect().height || 0);
  if (h) document.documentElement.style.setProperty('--hudh', h + 'px');
}
/* le monete anche nell'intestazione della modale: mentre compri, l'HUD è coperto */
function syncModalCoins() {
  const el = document.getElementById('m-coins'); if (!el) return;
  el.innerHTML = withIcons('🪙 ' + (isDebug() ? '∞' : String(S.coins)));
}
export function updateHUD() {
  const dbg = isDebug();
  syncModalCoins();
  syncTouchControls();
  document.getElementById('h-coin').textContent = dbg ? '∞' : String(S.coins);
  document.getElementById('h-en').textContent = dbg ? '∞' : (S.energy + '/' + S.maxEnergy);
  /* orologio: alba (tod=0) = 06:00, il giorno di gioco copre 24h */
  const mins = Math.floor((((S.tod || 0) * 24 + 6) % 24) * 60);
  const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0');
  syncHudHeight();
  document.getElementById('h-day').innerHTML = withIcons(S.day + ' · ' + hh + ':' + mm + ' ' + SEASONS[seasonOf(S.day)].icon + (darknessAt(S.tod || 0) > 0.5 ? ' 🌙' : ''));
  /* CAPIENZA sempre in vista: "3/10" invece del solo "3". Chi compra uno zaino più grande
     deve vedere subito che il secondo numero è salito, altrimenti non sa cosa ha comprato. */
  document.getElementById('h-bag').textContent = fossilCount() + '/' + bagCap();
  ensureQuests(S.day); // scadenza missioni a fine giornata
  const qt = document.getElementById('questtag'), qn = document.getElementById('h-quest');
  if (qt && qn) { const n = activeQuests().length; qn.textContent = String(n); qt.style.display = n ? '' : 'none'; }
  const ct = document.getElementById('companiontag'), cn = document.getElementById('h-comp');
  if (ct && cn) { const c = companionSpec(); if (c) { cn.textContent = c.name; ct.style.display = ''; } else ct.style.display = 'none'; }
  const lt = document.getElementById('lvltag'), ln = document.getElementById('h-lvl');
  if (lt && ln) { ln.textContent = String(playerLevel()); lt.title = tr('Livello archeologo ', 'Archaeologist level ') + playerLevel() + ' · XP ' + playerXp() + '/' + xpToNext(); }
  /* i traguardi si assegnano SOLO in gioco: mai mentre sei nel menu/splash o nell'intro */
  const hasClass = (el, c) => !!(el && el.classList && typeof el.classList.contains === 'function' && el.classList.contains(c));
  const spEl = (typeof document !== 'undefined' && document.getElementById) ? document.getElementById('splash') : null;
  const splashOn = !!(spEl && spEl.classList && typeof spEl.classList.contains === 'function' && !spEl.classList.contains('off'));
  const introOn = hasClass(typeof document !== 'undefined' ? document.body : null, 'introing');
  if (S.lookDone && !splashOn && !introOn) {
    checkAchievements(a => { toast('🏆 ' + tr('Traguardo: ', 'Achievement: ') + achLabel(a)); playSfx('fanfare'); showBanner('🏆 ' + achLabel(a) + '<div class="sub" style="margin-top:4px">' + achDesc(a) + '</div>', 2200); });
  }
  /* avvisi visivi: energia agli sgoccioli e zaino pieno (prima non si vedevano finché non
     bloccavano l'azione) */
  { const en = document.getElementById('h-en'), enTag = en && en.closest ? en.closest('.tag') : null;
    if (enTag && enTag.classList) enTag.classList.toggle('low', !isDebug() && S.energy <= 5);
    const bg = document.getElementById('bagbtn');
    if (bg && bg.classList) bg.classList.toggle('full', bagFull()); }
  const dt = document.getElementById('debugtag'); if (dt) dt.style.display = (dbg || isCheatLock()) ? '' : 'none';
}
const promptEl = document.getElementById('prompt');
/* il DOM si tocca SOLO se il contenuto cambia: riscriverlo a ogni frame fa sfarfallare */
let lastPromptHtml = null;
/* la mappa ha bisogno di spegnere il prompt quando si apre: è l'unico pezzo di interfaccia
   che le serve da qui, e passa da questa porta invece di esportare tutto */
export function setPromptFromMap(html) { setPrompt(html); }
function setPrompt(html) {
  if (html === lastPromptHtml) return;
  lastPromptHtml = html;
  if (!html) { promptEl.style.display = 'none'; return; }
  promptEl.style.display = 'block';
  promptEl.innerHTML = html;
}
/* BOTTONE DI USCITA: per uscire da una stanza bisogna camminare OLTRE la soglia, ma oltre
   la soglia non c'è schermo su cui cliccare — col solo mouse non si usciva. Il bottone
   compare avvicinandosi alla porta e fa la stessa cosa. */
const exitBtn = document.getElementById('exitbtn');
if (exitBtn) exitBtn.onclick = () => {
  playSfx('ui');
  if (CAVE.active) exitCave(); else if (INT.active) exitInterior();
  syncExitBtn();
};
export function syncExitBtn() {
  if (!exitBtn || !exitBtn.classList) return;
  const show = (INT.active && nearExit()) || (CAVE.active && nearCaveExit());
  exitBtn.classList.toggle('on', !!show);
  if (show) exitBtn.innerHTML = withIcons('🚪 ' + tr('Esci', 'Leave'));
}
export function updatePrompt() {
  syncExitBtn();
  if (isModalOpen()) { setPrompt(null); return; }
  if (CAVE.active) {
    setPrompt(caveNodeReach() ? withIcons(actKey() + ' ' + tr('Scava il giacimento ⛏️', 'Dig the deposit ⛏️')) : null);
    return;
  }
  if (INT.active) {
    if (nearMentorInt()) { setPrompt(withIcons(actKey() + ' ' + tr('Parla col Maestro Scavatore 🎓', 'Talk to the Master Digger 🎓'))); return; }
    const nc = nearCase();
    if (nc) { setPrompt(withIcons((S.codex.includes(nc.sp.id) ? nc.sp.name : '???') + ' · ' + nc.n + '/' + PARTS.length + (nc.n === PARTS.length ? ' 💫' : ''))); return; }
    if (nearNpc()) {
      if (!INT.greeted && INT.b) { sayGreet(INT.b.type); INT.greeted = true; } // saluto (una frase a caso) avvicinandosi
      setPrompt(withIcons(actKey() + ' ' + tr('Parla con ', 'Talk to ') + npcName(INT.b.type))); return;
    }
    setPrompt(null); return;
  }
  { /* MERAVIGLIA: il prompt dice sempre se il dono è pronto o quanto deve riposare */
    const w = nearbyWonder();
    if (w) {
      const st2 = wonderStatusText(w.type, w.x, w.y);
      setPrompt(withIcons(actKey() + ' ' + wonderName(w.type) + ' ✨ (' + st2 + ')')); return;
    }
  }
  const st = nearbySite();
  if (st) {
    const rem = siteRemaining(st);
    setPrompt(withIcons(rem > 0 ? actKey() + ' ' + tr('Scava al sito ⛏️ (', 'Dig at the site ⛏️ (') + rem + tr(' rimasti)', ' left)') : tr('Sito esaurito', 'Site exhausted')));
    return;
  }
  if (nearbyBoard()) { setPrompt(withIcons(actKey() + ' ' + tr('Bacheca delle missioni 📋', 'Mission board 📋'))); return; }
  if (nearbyPark()) { setPrompt(withIcons(actKey() + ' ' + tr('Scegli il compagno 🐾', 'Choose your companion 🐾'))); return; }
  if (nearbyFountain()) { setPrompt(withIcons(actKey() + ' ' + tr('Lancia 1 🪙 nella fontana', 'Toss 1 🪙 into the fountain'))); return; }
  if (onBoat() && nearbyWreck()) { const rem = wreckRemaining(nearbyWreck()); setPrompt(withIcons(rem > 0 ? actKey() + ' ' + tr('Fruga nel relitto 🚢 (', 'Search the wreck 🚢 (') + rem + tr(' rimasti)', ' left)') : tr('Relitto ripulito', 'Wreck picked clean'))); return; }
  if (nearbyGround()) {
    const h = nearbyHarvest();
    setPrompt(withIcons(actKey() + ' ' + (h ? tr('Raccogli ', 'Pick ') + goodName(h.id) + ' ✨' : tr('Raccogli ✨', 'Pick up ✨')))); return;
  }
  setPrompt(null); // niente hint per lo scavo semplice
}
/* banner centrale a tutto schermo per gli eventi importanti (consegna del Libro, ecc.) */
export function showBanner(html, ms = 2600) {
  if (typeof document === 'undefined' || !document.createElement || !document.body) return;
  const b = document.createElement('div'); b.className = 'banner'; b.innerHTML = withIcons(html);
  document.body.appendChild(b);
  setTimeout(() => { if (b.classList) b.classList.add('out'); setTimeout(() => b.remove(), 400); }, ms);
}
export function welcomeToasts() {
  const nm = S.name || 'Digsy';
  const mob = isTouch();
  setTimeout(() => toast(tr('Benvenuto, ' + nm + '! Il primo tesoro del nonno è nel tuo zaino ⛏️', 'Welcome, ' + nm + "! Grandpa's first treasure is in your bag ⛏️")), 400);
  setTimeout(() => toast(mob
    ? tr('Joystick per muoverti · A per interagire · 📖 e 🎒 in alto', 'Joystick to move · A to interact · 📖 and 🎒 up top')
    : tr('WASD/frecce per muoverti · E scava o entra · I zaino · L libro', 'WASD/arrows to move · E dig or enter · I bag · L book')), 2100);
}

/* ---------- modale ---------- */
const modal = document.getElementById('modal'), mBody = document.getElementById('m-body'), mTitle = document.getElementById('m-title');
let modalOpen = false;

let buildingModal = '', buildingCoins0 = 0; // per il fumetto di ringraziamento/commiato dell'NPC
export function isModalOpen() { return modalOpen || isBookOpen() || bagOpenFlag || isMapOpen(); }
/* modale BLOCCATA: si chiude solo dal suo pulsante (editor iniziale). Chiuderla per sbaglio
   col tap fuori saltava intro e dono del nonno. */
let modalLocked = false;
export function lockModal(v) { modalLocked = !!v; const x = document.getElementById('m-close'); if (x) x.style.display = v ? 'none' : ''; }
export function openModal() {
  modalLocked = false;                 // il blocco vale solo per l'editor, che lo rimette subito dopo
  const x = document.getElementById('m-close'); if (x) x.style.display = '';
  modalOpen = true; buildingModal = ''; modal.classList.add('on'); setPrompt(null);
  syncModalCoins();
}
export function closeModal(force) {
  if (modalLocked && !force) return;
  /* chiudendo una lettera si torna all'elenco, non al gioco */
  if (letterBack) { letterBack = false; openLetters(); return; }
  /* chiudendo il pannello di un edificio, l'NPC ringrazia se hai comprato/venduto, altrimenti saluta */
  if (buildingModal && INT.active) { const bought = S.coins !== buildingCoins0; sayNpc(pickLine(bought ? NPC_THANKS : NPC_NOBUY), 4.2); buildingModal = ''; }
  revertLook(); modalOpen = false; modal.classList.remove('on'); modal.classList.remove('opaque'); disposeViews();
}
document.getElementById('m-close').onclick = () => closeModal();  // nascosto quando la modale è bloccata
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

/* ---------- MISSIONI: cartello in città (accetta/consegna) + tracker (Q) ---------- */
export function openQuestBoard() {
  ensureQuests(S.day);
  const tw = townForTile(Math.floor(P.x / TS), Math.floor(P.y / TS));
  const [cx, cy] = (tw ? tw.key : '0,0').split(',').map(Number);
  const offers = boardOffers(cx, cy, S.day);
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Le richieste del giorno degli abitanti. Ne puoi tenere ', "Today's requests from the townsfolk. You can hold ")}${MAX_ACTIVE}${tr(' alla volta; scadono a fine giornata.', " at a time; they expire at day's end.")}</div>`;
  const act = activeQuests();
  if (act.length) {
    h += `<div class="bighead">${tr('Le tue missioni', 'Your missions')} (${act.length}/${MAX_ACTIVE})</div>`;
    for (const q of act) {
      const have = questHave(q), ok = canComplete(q);
      h += `<div class="row"><span class="em">📋</span><div><div class="nm">${giverName(q.giver)}: ${questText(q)}</div><div class="sub">${have}/${q.n} · ${tr('premio', 'reward')} 🪙 ${q.reward}</div></div><div class="rt"><button class="btn ${ok ? 'amber' : 'ghost'}" ${ok ? '' : 'disabled'} data-deliver="${q.qid}">${tr('Consegna', 'Deliver')}</button></div></div>`;
    }
  }
  /* la commissione del Museo dura 3 giorni: va vista anche da qui, non solo al banco */
  {
    cmPrune(S.day);
    const c = cmActive();
    if (c) h += `<div class="bighead">📜 ${tr('Commissione del Museo', 'Museum commission')}</div>
      <div class="row" style="background:#f1e6cc"><span class="em">📜</span><div><div class="nm">${cmText(c)}</div>
      <div class="sub">${tr('Ne hai', 'You have')} ${Math.min(cmHave(c), c.n)}/${c.n} · ⏳ ${cmDueText(c, S.day)} · ${tr('si consegna al Museo', 'deliver at the Museum')}</div>
      <div class="sub">${cmRewardText(c)}</div></div></div>`;
  }
  h += `<div class="bighead">${tr('Bacheca', 'Board')}</div>`;
  for (const q of offers) {
    const active = isActive(q.qid), done = isDone(q.qid);
    const badge = done ? tr('✓ fatta', '✓ done') : active ? tr('presa', 'taken') : '';
    h += `<div class="row"><span class="em">📌</span><div><div class="nm">${giverName(q.giver)}: ${questText(q)}</div><div class="sub">${tr('premio', 'reward')} 🪙 ${q.reward}${badge ? ' · ' + badge : ''}</div></div><div class="rt">${(active || done) ? '' : `<button class="btn amber" data-accept="${q.qid}">${tr('Accetta', 'Accept')}</button>`}</div></div>`;
  }
  mTitle.innerHTML = withIcons('📋 ' + tr('Missioni', 'Missions'));
  mBody.innerHTML = withIcons(h); openModal();
  mBody.querySelectorAll('[data-accept]').forEach(b => b.onclick = () => {
    const off = offers.find(o => o.qid === b.dataset.accept);
    const r = acceptQuest(off, S.day);
    if (r === 'full') toast('📋 ' + tr('Hai già ', 'You already have ') + MAX_ACTIVE + tr(' missioni', ' missions'));
    else if (r) { save(); updateHUD(); toast('📋 ' + tr('Missione accettata', 'Mission accepted')); }
    openQuestBoard();
  });
  mBody.querySelectorAll('[data-deliver]').forEach(b => b.onclick = () => {
    const q = deliverQuest(b.dataset.deliver);
    /* l'XP la dà `deliverQuest` (quests.js): qui ce n'era una SECONDA, e ogni consegna ne
       pagava due — col totem della doppia XP attivo bruciava anche 2 dei 10 carichi invece
       di 1. L'esperienza si conta in un posto solo, quello testato. */
    if (q) { playSfx('coin'); save(); updateHUD(); toast('✅ ' + tr('Consegnata! +🪙 ', 'Delivered! +🪙 ') + q.reward); }
    openQuestBoard();
  });
}
export function openAchievements() {
  const done = (S.achieved || []).length;
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Traguardi sbloccati', 'Achievements unlocked')}: ${done}/${ACHS.length}</div>`;
  h += ACHS.map(a => { const ok = isAchieved(a.id); return `<div class="row" style="${ok ? '' : 'opacity:.55'}"><span class="em">${ok ? a.ic : '·'}</span><div><div class="nm">${achLabel(a)}${ok ? ' ✓' : ''}</div><div class="sub">${achDesc(a)}</div></div></div>`; }).join('');
  mTitle.innerHTML = withIcons('🏆 ' + tr('Traguardi', 'Achievements'));
  mBody.innerHTML = withIcons(h); openModal();
}
/* LETTERA DEL NONNO: foglio di carta ingiallita, si legge tutta d'un fiato.
   Le lettere restano rileggibili dal menu (✉ Lettere). */
/* `back`: chiudendo la lettera si torna all'ELENCO invece che al gioco (si legge una lettera
   dopo l'altra senza riaprire ogni volta lo zaino). Quando la lettera arriva dal Curatore
   (consegna) non c'è elenco a cui tornare. */
export function openLetter(id, back = true) {
  const body = letterBody(id);
  let h = `<div class="letter"><div class="lt-h">${letterTitle(id)}</div>`;
  h += body.map(p2 => `<p>${p2}</p>`).join('');
  h += `<div class="lt-sign">${id === 'finale' ? '' : tr('— Nonno', '— Grandpa')}</div></div>`;
  h += `<div class="center" style="margin-top:10px"><button class="btn amber" id="ltBack">${back ? '← ' + tr('Torna alle lettere', 'Back to the letters') : tr('Chiudi', 'Close')}</button></div>`;
  mTitle.innerHTML = withIcons('✉ ' + tr('Lettera del nonno', 'A letter from Grandpa'));
  letterBack = back;                       // PRIMA di openModal: nessuno può azzerarlo in mezzo
  mBody.innerHTML = withIcons(h); openModal();
  const b = document.getElementById('ltBack');
  if (b) b.onclick = () => { if (back) openLetters(); else closeModal(); };
}
let letterBack = false;   // la modale aperta è una lettera che deve tornare all'elenco?
/* elenco delle lettere ricevute (menu) */
export function openLetters() {
  letterBack = false;
  const all = allLetters();
  const got = all.filter(id => hasLetter(id));
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Il nonno lasciò una lettera per ogni sala del Museo. Riempi una sala (almeno un pezzo per ogni specie) e il Curatore te la consegna.', 'Grandpa left a letter for every room of the Museum. Fill a room (at least one piece of every species) and the Curator hands it to you.')} ${got.length}/${all.length}</div>`;
  h += all.map(id => hasLetter(id)
    ? `<div class="row" data-letter="${id}" style="cursor:pointer"><span class="em">✉</span><div><div class="nm">${letterTitle(id)}</div><div class="sub">${tr('tocca per rileggerla', 'tap to read it again')}</div></div></div>`
    : `<div class="row" style="opacity:.5"><span class="em">·</span><div><div class="nm">? ? ?</div><div class="sub">${id === 'finale' ? tr('quando avrai tutte le altre', 'once you have all the others') : tr('riempi la sala di ', 'fill the room of ') + zoneName(id)}</div></div></div>`).join('');
  mTitle.innerHTML = withIcons('✉ ' + tr('Lettere del nonno', "Grandpa's letters"));
  mBody.innerHTML = withIcons(h); openModal();
  mBody.querySelectorAll('[data-letter]').forEach(el => el.onclick = () => openLetter(el.dataset.letter));
}
/* MERAVIGLIA: pannello con nome, descrizione, la riga del nonno e il dono (col riposo).
   Ogni testo dice sempre se è pronta o quanti giorni mancano: niente cooldown misteriosi. */
export function openWonder(lm) {
  if (!lm) return;
  const t = lm.type, ready = wonderReadyIn(t, lm.x, lm.y) === 0;
  let h = `<div class="wonder"><div class="wo-n">${wonderName(t)}</div><div class="wo-d">${wonderDesc(t)}</div>`;
  h += `<div class="wo-gp">“${wonderGrandpa(t)}”<span>— ${tr('dal taccuino del nonno', "from Grandpa's notebook")}</span></div></div>`;
  h += `<div class="row"><span class="em">✨</span><div><div class="nm">${wonderPower(t)}</div><div class="sub">${wonderCd(t) ? tr('si può usare una volta ogni ', 'usable once every ') + wonderCd(t) + tr(' giorni · ', ' days · ') : tr('sempre disponibile · ', 'always available · ')}<b>${wonderStatusText(t, lm.x, lm.y)}</b></div></div>
    <div class="rt">${ready ? `<button class="btn amber" id="woUse">${tr('Usa', 'Use')}</button>` : ''}</div></div>`;
  mTitle.innerHTML = withIcons('✨ ' + tr('Meraviglia', 'Wonder'));
  mBody.innerHTML = withIcons(h); openModal();
  const b = document.getElementById('woUse');
  if (b) b.onclick = () => {
    const r = useWonder(lm);
    if (r === 'travel') { openArchTravel(lm); return; }
    if (r === 'sleep') { closeModal(); markWonderUsed(t, lm.x, lm.y); restInn(true); return; }
    if (r === 'reveal') { closeModal(); markWonderUsed(t, lm.x, lm.y); revealMap(lm.x, lm.y, t === 'icespire' ? 60 : 34); return; }
    if (r === 'aurora') { closeModal(); auroraVision(lm); return; }
    closeModal(); if (r) toast(r);
  };
}
/* ARCHI: rete di viaggio rapido fra quelli già trovati */
export function openArchTravel(from) {
  const list = archList().filter(a => !(a.x === from.x && a.y === from.y));
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Gli archi si chiamano fra loro: attraversane uno pensando a un altro.', 'The arches call to each other: walk through one thinking of another.')}</div>`;
  if (!list.length) h += `<div class="center muted">${tr('Non hai ancora trovato un altro arco. Cercane uno lontano da qui.', 'You have not found another arch yet. Look for one far from here.')}</div>`;
  else h += list.map(a => `<div class="row" data-arch="${a.key}" style="cursor:pointer"><span class="em">🌀</span><div><div class="nm">${wonderName(a.t)}</div><div class="sub">${dirTo(a.x, a.y)}</div></div><div class="rt"><button class="btn">${tr('Vai', 'Go')}</button></div></div>`).join('');
  mTitle.innerHTML = withIcons('🌀 ' + tr('Passaggio', 'Passage'));
  mBody.innerHTML = withIcons(h); openModal();
  mBody.querySelectorAll('[data-arch]').forEach(el => el.onclick = () => {
    if (travelToArch(el.dataset.arch)) { closeModal(); playSfx('found'); toast('🌀 ' + tr('Attraversi l\'arco…', 'You step through the arch…')); }
  });
}
/* AURORA: rivela nel Libro una specie che non hai ancora visto (solo di notte) */
function auroraVision(lm) {
  if (!isNight()) { toast('🌌 ' + tr('L\'aurora si vede solo di notte', 'The aurora only shows at night')); return; }
  const hidden = ALL_SPECIES.filter(sp => !S.codex.includes(sp.id));
  if (!hidden.length) { toast(tr('Conosci già ogni creatura', 'You already know every creature')); return; }
  const sp = hidden[Math.floor(Math.random() * hidden.length)];
  S.codex.push(sp.id); save(); markWonderUsed(lm.type, lm.x, lm.y); playSfx('found');
  showBanner('🌌 ' + tr('VISIONE', 'VISION') + '<br><span style="font-size:.8em">' + sp.name + '</span>');
  updateHUD();
}
/* ---------- LIBRO DELLE MERAVIGLIE: quelle trovate si rivedono in 3D, le altre restano
   sagome scure con l'indizio della zona ---------- */
export function openWonderBook(sel) {
  const ids = Object.keys(WONDERS);
  const seen = ids.filter(isDiscovered);
  const cur = sel && isDiscovered(sel) ? sel : (seen.includes(sel) ? sel : seen[0] || null);
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Meraviglie trovate', 'Wonders found')}: <b>${seen.length}/${ids.length}</b> — ${tr('girale col dito per guardarle da ogni lato.', 'drag them to look from every side.')}</div>`;
  if (cur) {
    /* illustrazione: lo STESSO disegno che vedi nel mondo, ingrandito ×3 su carta da taccuino
       (i modelli 3D erano geometrie approssimative e stonavano col resto) */
    h += `<div class="wo-view"><canvas class="wo-cv" id="woCv" width="230" height="190" data-w="${cur}"></canvas>
      <div class="wo-info"><div class="wo-n">${wonderName(cur)}</div><div class="wo-z">${zoneName(WONDERS[cur].zone)}</div>
      <div class="wo-d">${wonderDesc(cur)}</div><div class="wo-gp">“${wonderGrandpa(cur)}”</div>
      <div class="sub">✨ ${wonderPower(cur)}</div></div></div>`;
  }
  h += `<div class="wo-grid">` + ids.map(id => isDiscovered(id)
    ? `<div class="wo-cell${id === cur ? ' on' : ''}" data-sel="${id}"><span class="wo-ic">✨</span><span>${wonderName(id)}</span></div>`
    : `<div class="wo-cell lock"><span class="wo-ic">?</span><span>${tr('da trovare in ', 'find it in ')}${zoneName(WONDERS[id].zone)}</span></div>`).join('') + `</div>`;
  mTitle.innerHTML = withIcons('✨ ' + tr('Meraviglie del mondo', 'Wonders of the world'));
  mBody.innerHTML = withIcons(h); openModal();
  mBody.querySelectorAll('[data-sel]').forEach(el => el.onclick = () => openWonderBook(el.dataset.sel));
  const cv = document.getElementById('woCv');
  if (cv && cur && cv.getContext) drawWonderCard(cv, cur);
}
/* Illustrazione di una meraviglia su carta: terreno del suo bioma e la struttura, ingrandita
   quanto basta a riempire il riquadro. Animata come nel mondo.
   La sagoma del giocatore accanto "per dare la scala" è stata tolta: rubava spazio proprio al
   soggetto della scheda, e la scala si legge già dal mondo vero. */
/* i colori del terreno arrivano da tiles.js, gli stessi che il gioco usa davvero: la
   tabella copiata qui aveva smesso di combaciare e le meraviglie si vedevano su un'erba
   che nel mondo non esiste */
/* Dove si disegna la meraviglia sulla tela di servizio, e quanto è grande quella tela.
   Larga: l'Albero-Mondo è alto 182 px e le sue fronde sbordano ai lati. */
const WO_PROBE_X = 130, WO_PROBE_Y = 250, WO_PROBE_W = 260, WO_PROBE_H = 270;
const woBoundsCache = new Map();
/* Rettangolo dei pixel DAVVERO dipinti, in coordinate relative al punto di disegno.
   Serve per ingrandire ogni meraviglia quanto basta e centrarla sul suo ingombro vero:
   ognuna ha la propria ancora, quindi centrare le coordinate di disegno lascia le figure
   sbilenche e con mezzo riquadro vuoto. */
function wonderBounds(type) {
  const hit = woBoundsCache.get(type);
  if (hit) return hit;
  const fallback = { x: -40, y: -80, w: 80, h: 80 };
  let out = fallback;
  try {
    const cv2 = document.createElement('canvas');
    cv2.width = WO_PROBE_W; cv2.height = WO_PROBE_H;
    const c2 = cv2.getContext('2d');
    if (c2 && c2.getImageData) {
      const g2 = {
        ctx: c2,
        rect: (x, y, w, h, col) => { c2.fillStyle = col; c2.fillRect(x, y, w, h); },
        px: (x, y, col) => { c2.fillStyle = col; c2.fillRect(x, y, 1, 1); },
        shadow: () => { /* l'ombra non conta come ingombro: allargherebbe il rettangolo a vuoto */ },
        shade8: (hex, kk) => { const n = parseInt(hex.slice(1), 16);
          const r = Math.min(255, ((n >> 16) & 255) * kk) | 0, gg = Math.min(255, ((n >> 8) & 255) * kk) | 0,
            b = Math.min(255, (n & 255) * kk) | 0;
          return '#' + (r << 16 | gg << 8 | b).toString(16).padStart(6, '0'); },
      };
      drawWonder(g2, type, WO_PROBE_X, WO_PROBE_Y, 0);
      const d = c2.getImageData(0, 0, WO_PROBE_W, WO_PROBE_H).data;
      let x0 = WO_PROBE_W, y0 = WO_PROBE_H, x1 = -1, y1 = -1;
      for (let y = 0; y < WO_PROBE_H; y++) for (let x = 0; x < WO_PROBE_W; x++) {
        if (d[(y * WO_PROBE_W + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (x1 >= x0 && y1 >= y0) {
        out = { x: x0 - WO_PROBE_X, y: y0 - WO_PROBE_Y, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      }
    }
  } catch (e) { /* niente canvas (test con DOM finto): si usa la stima */ }
  woBoundsCache.set(type, out);
  return out;
}

function drawWonderCard(cv, type) {
  const c = cv.getContext('2d'); if (!c) return;
  const W2 = cv.width, H2 = cv.height;
  const g = {
    ctx: c,
    rect: (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); },
    px: (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); },
    shadow: (cx2, cy2, rw) => { c.fillStyle = 'rgba(15,25,15,.16)';
      for (let i = -rw; i <= rw; i++) { const hh = Math.round(2 * Math.sqrt(Math.max(0, 1 - (i * i) / (rw * rw)))); c.fillRect(cx2 + i, cy2 - hh, 1, hh * 2); } },
    shade8: (hex, k) => { const n = parseInt(hex.slice(1), 16);
      const r = Math.min(255, ((n >> 16) & 255) * k) | 0, g2 = Math.min(255, ((n >> 8) & 255) * k) | 0, b = Math.min(255, (n & 255) * k) | 0;
      return '#' + (r << 16 | g2 << 8 | b).toString(16).padStart(6, '0'); },
  };
  const pal = groundPalette(WONDERS[type].zone, seasonOf(S.day || 1));
  /* INGOMBRO REALE della meraviglia. Le taglie vanno da una trentina di pixel all'Albero-Mondo
     (182): con una scala fissa o le piccole restano francobolli o le grandi escono dal
     riquadro. Si disegna una volta su una tela di servizio, si misura il rettangolo dei pixel
     davvero dipinti e si ricava di quanto ingrandire. Il risultato si tiene in cache: la
     scheda è animata, misurare a ogni fotogramma sarebbe uno spreco. */
  const box = wonderBounds(type);
  /* scala INTERA (mai frazionaria: spaccherebbe i pixel), con un margine di respiro */
  const kx = Math.floor((W2 - 12) / Math.max(1, box.w));
  const ky = Math.floor((H2 - 12) / Math.max(1, box.h));
  const k = Math.max(1, Math.min(4, Math.min(kx, ky)));
  const paint = () => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    const VW2 = Math.ceil(W2 / k), VH2 = Math.ceil(H2 / k);
    c.setTransform(k, 0, 0, k, 0, 0);
    for (let y = 0; y < VH2; y += 16) for (let x = 0; x < VW2; x += 16) {
      const t = ((x / 16) * 7 + (y / 16) * 13) % 3;
      c.fillStyle = pal[t]; c.fillRect(x, y, 16, 16);
      c.fillStyle = pal[(t + 1) % 3]; c.fillRect(x + ((x / 16) % 4) * 3, y + ((y / 16) % 4) * 3, 2, 2);
    }
    /* il soggetto CENTRATO sul suo ingombro vero, non sulle coordinate con cui viene disegnato:
       ogni meraviglia ha la sua ancora, e centrare quella lascerebbe le figure sbilenche */
    /* `box` è già RELATIVO al punto di disegno, quindi il punto giusto si ricava da lì:
       sommarci anche l'offset della tela di misura spedirebbe la figura fuori dal riquadro. */
    const dx = Math.round(VW2 / 2 - (box.x + box.w / 2));
    const dy = Math.round(VH2 - 5 - (box.y + box.h));
    drawWonder(g, type, dx, dy, performance.now ? performance.now() : Date.now());
    c.setTransform(1, 0, 0, 1, 0, 0);
  };
  paint();
  /* animazione viva finché la scheda resta aperta */
  if (cv._raf) cancelAnimationFrame(cv._raf);
  const tick = () => { if (!cv.isConnected) return; paint(); cv._raf = requestAnimationFrame(tick); };
  if (typeof requestAnimationFrame === 'function') cv._raf = requestAnimationFrame(tick);
}
/* SUGGERIMENTO al primo incontro: pannello piccolo, una volta sola, poi resta nella Guida */
export function showTip(id) {
  /* chi ha già giocato può spegnerli dalle Impostazioni: il tip resta segnato come visto,
     così la Guida non lo mostra "nuovo" e riaccendendoli non ricompare tutto insieme */
  if (!tipsOn()) { markTip(id); return false; }
  if (!markTip(id)) return false;
  let h = `<div class="tipbox"><div class="tip-t">${tipTitle(id)}</div><div class="tip-b">${tipText(id)}</div></div>`;
  h += `<div class="center" style="margin-top:10px"><button class="btn amber" id="tipOk">${tr('Ho capito', 'Got it')}</button></div>`;
  h += `<div class="muted center" style="margin-top:6px;font-size:11px">${tr('Lo ritrovi nella Guida (zaino → ❔)', 'You can find it again in the Guide (bag → ❔)')}</div>`;
  mTitle.innerHTML = withIcons('💡 ' + tr('Suggerimento', 'Tip'));
  mBody.innerHTML = withIcons(h); openModal(); playSfx('ui');
  const b = document.getElementById('tipOk'); if (b) b.onclick = () => closeModal();
  return true;
}
/* GUIDA: tutti i suggerimenti, anche quelli non ancora incontrati */
export function openGuide() {
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Tutto quello che serve sapere. I punti in grigio li incontrerai giocando.', 'Everything you need to know. The greyed out ones you will meet as you play.')} ${tipsSeenCount()}/${TIP_IDS.length}</div>`;
  h += TIP_IDS.map(id => `<div class="row${tipSeen(id) ? '' : ' miss'}"><span class="em">${tipSeen(id) ? '💡' : '·'}</span><div><div class="nm">${tipTitle(id)}</div><div class="sub">${tipText(id)}</div></div></div>`).join('');
  /* i comandi si scrivono per il dispositivo che si ha in mano: tastiera o schermo */
  h += isTouch()
    ? `<div class="muted" style="margin-top:8px;font-size:11px">${tr('Comandi: leva a sinistra per muoverti · <kbd>A</kbd> per agire · zaino in alto · menu ☰', 'Controls: left stick to move · <kbd>A</kbd> to act · bag at the top · menu ☰')}</div>`
    : `<div class="muted" style="margin-top:8px;font-size:11px">${tr('Tasti: <kbd>WASD</kbd> muovi · <kbd>E</kbd> agisci · <kbd>I</kbd> zaino · <kbd>L</kbd> libro · <kbd>M</kbd> mappa · <kbd>Q</kbd> missioni · <kbd>ESC</kbd> menu<br>Col mouse: <b>clic</b> per andare, <b>tasto destro</b> per agire.', 'Keys: <kbd>WASD</kbd> move · <kbd>E</kbd> act · <kbd>I</kbd> bag · <kbd>L</kbd> book · <kbd>M</kbd> map · <kbd>Q</kbd> missions · <kbd>ESC</kbd> menu<br>With the mouse: <b>click</b> to walk, <b>right click</b> to act.')}</div>`;
  mTitle.innerHTML = withIcons('❔ ' + tr('Guida', 'Guide'));
  mBody.innerHTML = withIcons(h); openModal();
}
export function openQuests() {
  ensureQuests(S.day);
  const act = activeQuests();
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Missioni attive (scadono a fine giornata). Consegna al cartello in città.', "Active missions (expire at day's end). Deliver at the town board.")}</div>`;
  if (!act.length) h += `<div class="center muted">${tr('Nessuna missione attiva. Cerca il cartello 📋 in città!', 'No active missions. Find the town board 📋!')}</div>`;
  else for (const q of act) { const have = questHave(q); h += `<div class="row"><span class="em">📋</span><div><div class="nm">${giverName(q.giver)}: ${questText(q)}</div><div class="sub">${have}/${q.n} · ${tr('premio', 'reward')} 🪙 ${q.reward}${canComplete(q) ? ' · ✓ ' + tr('pronta', 'ready') : ''}</div></div></div>`; }
  mTitle.innerHTML = withIcons('📋 ' + tr('Le tue missioni', 'Your missions'));
  mBody.innerHTML = withIcons(h); openModal();
}

/* ---------- COMPAGNO: scelto dal parco, ti segue e aiuta ---------- */
const ABIL_TXT = {
  sniff: ['🐾 Fiuto: segnala i reperti a terra vicini', '🐾 Sniff: points to nearby ground finds'],
  compass: ['🧭 Bussola: mostra sempre distanza e nome della città', '🧭 Compass: always shows town distance and name'],
  luck: ['✨ Fortuna: scavi più fruttuosi e oggetti più preziosi', '✨ Luck: better digs and pricier objects'],
};
function abilLabel(ab) { const e = ABIL_TXT[ab]; return e ? tr(e[0], e[1]) : ''; }
export function openCompanionPicker() {
  const cands = companionCandidates(), cur = companionSpec();
  let h = `<div class="muted" style="margin-bottom:8px">${tr("Scegli chi ti segue nel mondo. Ogni compagno ha un'abilità che ti aiuta.", 'Choose who follows you in the world. Each companion has an ability that helps you.')}</div>`;
  if (!cands.length) h += `<div class="center muted">${tr('Nessuna chimera o fossile risvegliato. Assembla una chimera o risveglia una specie al Laboratorio!', 'No chimera or awakened fossil yet. Assemble a chimera or awaken a species at the Lab!')}</div>`;
  else {
    h += `<div class="row" style="background:${cur ? '#f3ecda' : '#f1e6cc'}"><span class="em">🚫</span><div><div class="nm">${tr('Nessun compagno', 'No companion')}</div></div><div class="rt">${cur ? `<button class="btn ghost" data-comp="">${tr('Rimanda a casa', 'Send home')}</button>` : '<b>✓</b>'}</div></div>`;
    h += cands.map(c => {
      const on = isCurrentCompanion(c.key);
      return `<div class="row"><span class="em">🐾</span><div><div class="nm">${c.name} · ${rarLabel(c.q)}</div><div class="sub">${abilLabel(abilityOf(c))}</div></div><div class="rt">${on ? '<b>✓ ' + tr('con te', 'with you') + '</b>' : `<button class="btn amber" data-comp="${c.key}">${tr('Scegli', 'Choose')}</button>`}</div></div>`;
    }).join('');
  }
  mTitle.innerHTML = withIcons('🐾 ' + tr('Compagno', 'Companion'));
  mBody.innerHTML = withIcons(h); openModal();
  mBody.querySelectorAll('[data-comp]').forEach(b => b.onclick = () => {
    const key = b.dataset.comp;
    if (!key) { clearCompanion(); toast('🚫 ' + tr('Compagno a casa', 'Companion sent home')); }
    else { const spec = cands.find(c => c.key === key); if (spec) { setCompanion(spec); toast('🐾 ' + spec.name + tr(' ti segue!', ' is with you!')); } }
    updateHUD(); openCompanionPicker();
  });
}

/* ---------- guida HUD: click su una statistica → box 8-bit che spiega tutto (per chi inizia) ---------- */
const ZONE_DESC = {
  prati: ['Distese erbose e dorate: il posto più tranquillo per i primi scavi.', 'Golden grasslands: the calmest place for your first digs.'],
  dune: ['Sabbia d\'ossa e cactus: reperti nascosti sotto le dune.', 'Bone sand and cacti: finds hidden under the dunes.'],
  boschi: ['Boschi cupi e cinerei: funghi, ceppi e ossa tra gli alberi.', 'Dark ashen woods: mushrooms, stumps and bones among trees.'],
  terre: ['Terre rosse e aride: guglie di roccia e cristalli da spaccare.', 'Arid red lands: rock spires and crystals to break.'],
  palude: ['Palude antica: canneti, acque torbide e creature strane.', 'Ancient marsh: reeds, murky water and strange creatures.'],
  ghiacci: ['Lande gelide: ghiaccio, pini innevati e fossili rari.', 'Frozen wastes: ice, snowy pines and rare fossils.'],
};
export function openHudGuide() {
  const mins = Math.floor((((S.tod || 0) * 24 + 6) % 24) * 60);
  const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0');
  const z = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
  const zd = ZONE_DESC[z.id] || ['', ''];
  const rowg = (ic, k, v) => `<div class="row"><span class="em">${ic}</span><div><div class="nm">${k}</div><div class="sub">${v}</div></div></div>`;
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Cosa vuol dire quello che vedi in alto:', 'What the top bar means:')}</div>`;
  h += rowg('🪙', tr('Monete', 'Coins') + ': ' + S.coins, tr('Servono per comprare attrezzi, mappe e cosmetici.', 'Used to buy tools, maps and cosmetics.'));
  h += rowg('⚡', tr('Energia', 'Energy') + ': ' + S.energy + '/' + S.maxEnergy, tr('Ogni scavo costa 1. Dormi alla Locanda per rifarla.', 'Each dig costs 1. Sleep at the Inn to refill.'));
  h += rowg('📅', tr('Giorno', 'Day') + ': ' + S.day + ' · ' + hh + ':' + mm, tr('Il tempo scorre mentre giochi; l\'alba è alle 06:00.', 'Time passes as you play; dawn is at 06:00.'));
  h += rowg(SEASONS[seasonOf(S.day)].icon, tr('Stagione', 'Season') + ': ' + seasonName(seasonOf(S.day)), tr('Cambia ogni 3 giorni e ricolora il mondo.', 'Changes every 3 days and recolors the world.'));
  h += rowg(z.icon, tr('Zona', 'Zone') + ': ' + zoneName(z.id), tr(zd[0], zd[1]));
  const wl = weatherLabel(weatherAt(z.id, S.day));
  h += rowg('🌦️', tr('Meteo', 'Weather') + ': ' + (wl || tr('Sereno', 'Clear')), tr('Cambia ogni giorno; la pioggia rende più fruttuoso lo scavo.', 'Changes daily; rain makes digging more rewarding.'));
  h += rowg('🎓', tr('Livello archeologo', 'Archaeologist level') + ': ' + playerLevel() + ' · XP ' + playerXp() + '/' + xpToNext(), tr('Sale trovando reperti e finendo missioni: +energia max, scavo più rapido, più rari.', 'Rises by finding fossils and finishing missions: more max energy, faster digging, more rares.'));
  const nq = activeQuests().length;
  h += rowg('📋', tr('Missioni', 'Missions') + ': ' + nq + '/3', tr('Prendile al cartello 📋 in città (tasto Q per rivederle). Scadono a fine giornata.', 'Take them at the town board 📋 (press Q to review). They expire at day\'s end.'));
  const cs = companionSpec();
  h += rowg('🐾', tr('Compagno', 'Companion') + ': ' + (cs ? cs.name : tr('nessuno', 'none')), cs ? abilLabel(companionAbility()) : tr('Scegline uno dal parco delle città grandi.', 'Choose one at the park in big cities.'));
  h += `<div class="muted" style="margin-top:8px">${tr('Muoviti con WASD/frecce · <b>E</b> raccogli/scava/entra · <b>I</b> zaino · <b>L</b> libro · <b>Q</b> missioni', 'Move with WASD/arrows · <b>E</b> collect/dig/enter · <b>I</b> bag · <b>L</b> book · <b>Q</b> missions')}</div>`;
  mTitle.innerHTML = withIcons('❔ ' + tr('Guida rapida', 'Quick guide'));
  mBody.innerHTML = withIcons(h); openModal();
}
/* MAESTRO SCAVATORE: livello archeologo, barra XP e cosa dà il prossimo livello.
   Asciutto: la barra + quanto manca + i vantaggi del livello dopo (con i numeri veri).
   Prima ripeteva gli stessi tre vantaggi in quattro righe di spiegazione: muro di testo. */
export function openMentor() {
  const lv = playerLevel(), xp = playerXp(), nx = xpToNext(), pct = Math.max(3, Math.min(100, Math.round(xp / nx * 100)));
  const need = Math.max(0, nx - xp);
  let h = `<div class="xpwrap"><div class="xphead"><b>${tr('Livello', 'Level')} ${lv}</b><span>XP ${xp}/${nx}</span></div><div class="xpbar"><i style="width:${pct}%"></i></div></div>`;
  h += `<div class="row" style="background:#f1e6cc"><span class="em">🎯</span><div><div class="nm">${tr('Ti mancano ', 'You need ')}<b>${need} XP</b>${tr(' per il livello ', ' for level ')}${lv + 1}</div><div class="sub">${tr('circa ', 'about ')}${Math.max(1, Math.ceil(need / 5))}${tr(' reperti comuni', ' common finds')}</div></div></div>`;
  h += `<div class="row"><span class="em">🎁</span><div><div class="nm">${tr('Al livello ', 'At level ')}${lv + 1}</div><div class="sub">+5 ⚡ ${tr('energia max', 'max energy')} · ${tr('scavo', 'dig')} ×${digDurationMul(lv + 1).toFixed(2)} · ${tr('rari', 'rares')} ×${rareBonus(lv + 1).toFixed(2)}</div></div></div>`;
  h += `<div class="muted" style="margin-top:6px">${tr('XP scavando (più raro = più XP) e con le missioni.', 'XP from digging (rarer = more XP) and missions.')}</div>`;
  mTitle.innerHTML = withIcons('🎓 ' + tr('Maestro Scavatore', 'Master Digger'));
  mBody.innerHTML = withIcons(h); openModal();
}

/* ---------- FONTANA (#3): 3 GIRI a velocità crescente. Centri tutti e 3 → premio assicurato;
   altrimenti la fortuna = quanti giri hai centrato. Cozy: niente percentuali a schermo. ---------- */
const TOSS_SPEEDS = [0.018, 0.028, 0.04];   // il cursore va più veloce ogni giro
let tossActive = false, tossOpen = false, tossBetween = false, tossRAF = 0;
let tossPos = 0, tossDir = 1, tossTarget = 0.5, tossRound = 0, tossHits = 0, tossOnDone = null;
export function isTossOpen() { return tossActive; }
export function openToss(onDone) {
  const ov = document.getElementById('tossov'); if (!ov) { if (onDone) onDone(0); return; }
  if (typeof requestAnimationFrame === 'undefined') { if (onDone) onDone(0); return; } // niente animazione = niente mira
  tossOnDone = onDone || null; tossActive = true; tossRound = 0; tossHits = 0;
  ov.classList.add('on');
  ov.onclick = () => { if (tossOpen) stopRound(); else if (tossBetween) tossNext(); };
  startRound();
}
function startRound() {
  tossRound++; tossOpen = true; tossBetween = false; tossPos = 0; tossDir = 1;
  tossTarget = 0.12 + Math.random() * 0.76;                    // bersaglio casuale ogni giro
  const tgt = document.getElementById('toss-target'); if (tgt) tgt.style.left = (tossTarget * 100) + '%';
  const mk = document.getElementById('toss-marker'); if (mk) mk.style.background = '#fff';
  const title = document.getElementById('toss-title'); if (title) title.innerHTML = withIcons(tr('Fontana', 'Fountain') + ' — ' + tr('giro', 'round') + ' ' + tossRound + '/3');
  const hint = document.getElementById('toss-hint'); if (hint) hint.innerHTML = withIcons(tr('Ferma il cursore nella zona d\'oro!', 'Stop the marker in the golden zone!'));
  const speed = TOSS_SPEEDS[tossRound - 1] || 0.04;
  const step = () => {
    if (!tossOpen) return;
    tossPos += tossDir * speed; if (tossPos >= 1) { tossPos = 1; tossDir = -1; } else if (tossPos <= 0) { tossPos = 0; tossDir = 1; }
    if (mk) mk.style.left = 'calc(' + (tossPos * 100) + '% - 2px)';
    tossRAF = requestAnimationFrame(step);
  };
  step();
}
function stopRound() {
  if (!tossOpen) return;
  tossOpen = false; tossBetween = true;
  if (tossRAF && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(tossRAF);
  const hit = tossLuck(tossPos, tossTarget) > 0;
  if (hit) tossHits++;
  const mk = document.getElementById('toss-marker'); if (mk) mk.style.background = hit ? '#e6b23c' : '#fff';
  const hint = document.getElementById('toss-hint');
  if (hint) hint.innerHTML = withIcons('<b>' + (hit ? tr('Centro!', 'Hit!') : tr('Fuori!', 'Miss!')) + '</b> · ' + tossHits + '/' + tossRound);
  if (typeof setTimeout !== 'undefined') setTimeout(tossNext, 650);   // pausa corta, poi avanti
}
/* passa al giro dopo, o CHIUDE dopo il terzo mostrando l'esito */
function tossNext() {
  if (!tossBetween) return; tossBetween = false;
  if (tossRound < 3) { startRound(); return; }
  const label = tossHits >= 3 ? tr('Premio assicurato!!', 'Prize guaranteed!!') : tossHits > 0 ? tr('Fortuna aumentata!!', 'Luck boosted!!') : tr('Niente fortuna stavolta', 'No extra luck this time');
  const hint = document.getElementById('toss-hint'); if (hint) hint.innerHTML = withIcons('<b>' + label + '</b>');
  const finish = () => {
    tossActive = false;
    const ov = document.getElementById('tossov'); if (ov && ov.classList) ov.classList.remove('on');
    const cb = tossOnDone; tossOnDone = null; if (cb) cb(tossHits);
  };
  const ov = document.getElementById('tossov'); if (ov) ov.onclick = () => finish();
  if (typeof setTimeout !== 'undefined') setTimeout(finish, 1200);
}
/* click sulle statistiche dell'HUD (non su zaino/menu) → guida */
if (typeof document !== 'undefined' && document.getElementById) {
  for (const id of ['h-coin', 'h-en', 'h-day', 'h-lvl', 'h-zone', 'h-compass', 'h-comp']) {
    const node = document.getElementById(id);
    const el = node && node.closest ? node.closest('.tag') : null;
    if (el && el.addEventListener && !el._guide) { el._guide = true; el.style.cursor = 'help'; el.addEventListener('click', () => { if (!isModalOpen()) openHudGuide(); }); }
  }
}

export function rarSpan(q) { return `<span class="rar ${q}">${rarLabel(q)}</span>`; }
function itemRow(it, rightHTML) {
  const sp = spById[it.s];
  /* miniatura = proiezione 2D del VERO pezzo voxel (hydratePv la disegna dopo l'innerHTML) */
  return `<div class="row"><canvas class="pv" width="36" height="30" data-pv="${it.s}|${it.t}"></canvas><div><div class="nm">${partName(it.t)} ${tr('di', 'of')} ${sp.name} ${sp.emoji}</div><div class="sub">${rarSpan(it.q)} · ${tr('valore', 'value')} 🪙 ${it.val}</div></div><div class="rt">${rightHTML || ''}</div></div>`;
}
function hydratePv(root) {
  const r = root || mBody;
  if (!r.querySelectorAll) return;
  r.querySelectorAll('canvas[data-pv]').forEach(cv => {
    const [s, t] = cv.dataset.pv.split('|');
    try { projectVox(cv, partVoxels(s, t)); } catch (e) { /* stub nei test */ }
  });
}

/* ---------- edifici ---------- */
const buildingEmoji = { store: '🏪', lab: '🔬', museum: '🏛️', inn: '🛏️', barber: '💈', tailor: '👕' };
const NPC_GREET = {
  lab: [
    ['Cranio, torace, zampa… e ti monto una creatura come nuova!', 'Skull, ribcage, leg… and I build you a creature good as new!'],
    ['Ah, materiale fresco? Vediamo cosa ne salta fuori.', 'Ah, fresh material? Let\'s see what comes out.'],
    ['Le mie chimere hanno bisogno di pezzi buoni, sai?', 'My chimeras need good parts, you know?'],
    ['Con un po\' di DNA questi vecchi ossi tornano a respirare.', 'With a bit of DNA these old bones breathe again.'],
    ['Adoro il rumore delle ossa che si incastrano al posto giusto.', 'I love the sound of bones clicking into place.'],
    ['Portami tre pezzi e faccio magie, fidati.', 'Bring me three parts and I work wonders, trust me.'],
    ['Ogni creatura è un piccolo esperimento. Che si fa oggi?', 'Each creature is a little experiment. What today?'],
    ['Il parco è pieno grazie a me… e un po\' anche a te.', 'The park is full thanks to me… and a bit to you.'],
    ['Attento a non mescolare le zampe sbagliate, eh eh.', 'Careful not to mix the wrong legs, heh heh.'],
    ['La vita è tutta una questione di incastri. E di DNA.', 'Life is all about the right fit. And DNA.'],
  ],
  store: [
    ['Benvenuto! Dai un\'occhiata, ho un po\' di tutto.', 'Welcome! Take a look, I\'ve got a bit of everything.'],
    ['Reperti da vendere? Sono tutt\'orecchi.', 'Finds to sell? I\'m all ears.'],
    ['Ho attrezzi nuovi di zecca, se ti servono.', 'I\'ve got brand-new tools, if you need them.'],
    ['Le mappe del tesoro vanno a ruba, sai?', 'Treasure maps sell like hotcakes, you know?'],
    ['Un buon affare non si rifiuta mai.', 'A good deal is never turned down.'],
    ['Guarda pure con calma, non ho fretta.', 'Browse at your leisure, no rush.'],
    ['Ah, un cliente! La giornata migliora.', 'Ah, a customer! My day just got better.'],
    ['Ti serve una barca? O forse una bici?', 'Need a boat? Or maybe a bike?'],
    ['Ogni oggetto ha il suo prezzo, e il suo perché.', 'Every item has its price, and its reason.'],
    ['Se trovi qualcosa di raro, io pago bene.', 'Find something rare and I pay well.'],
  ],
  museum: [
    ['Ah, nuovi reperti? Dammeli, li sistemo io.', 'Ah, new finds? Hand them over, I\'ll sort them out.'],
    ['Il museo cresce un pezzo alla volta.', 'The museum grows one piece at a time.'],
    ['Ogni fossile racconta una storia antica.', 'Every fossil tells an ancient story.'],
    ['Le teche complete sono la mia gioia.', 'Complete cases are my joy.'],
    ['Vieni, vieni, fammi vedere cos\'hai trovato.', 'Come, come, show me what you found.'],
    ['Un giorno riempiremo ogni sala, vedrai.', 'One day we\'ll fill every hall, you\'ll see.'],
    ['Questi reperti meritano un posto d\'onore.', 'These finds deserve a place of honor.'],
    ['La scienza ti ringrazia, giovane.', 'Science thanks you, young one.'],
    ['Manca poco a completare quella collezione.', 'That collection is nearly complete.'],
    ['Con pazienza, il passato torna a vivere.', 'With patience, the past comes back to life.'],
  ],
  inn: [
    ['Una bella dormita e torni in forze!', 'A good night\'s sleep and you\'re back in shape!'],
    ['Il letto è pronto quando vuoi.', 'The bed is ready whenever you like.'],
    ['Fuori è dura, qui dentro si sta bene.', 'It\'s rough out there, cozy in here.'],
    ['Riposa, il mondo può aspettare.', 'Rest up, the world can wait.'],
    ['Camino acceso e coperte calde: che vuoi di più?', 'Warm fire, warm blankets: what more could you want?'],
    ['Anche gli esploratori devono dormire, sai?', 'Even explorers must sleep, you know?'],
    ['Un tè caldo e poi a nanna?', 'A hot tea and then off to bed?'],
    ['La stanza migliore è tua, ospite.', 'The best room is yours, guest.'],
    ['Domani si scava meglio, con le forze giuste.', 'You dig better tomorrow, well rested.'],
    ['Qui il tempo scorre piano. Rilassati.', 'Time runs slow here. Relax.'],
  ],
  barber: [
    ['Accomodati, ti sistemo la capigliatura.', 'Have a seat, I\'ll sort out your hair.'],
    ['Che stile facciamo oggi?', 'What style shall we do today?'],
    ['Un taglio nuovo cambia la giornata, fidati.', 'A fresh cut changes your day, trust me.'],
    ['Poltrona libera, tocca a te!', 'Chair\'s free, you\'re up!'],
    ['Ho le forbici che prudono, sai?', 'My scissors are itching, you know?'],
    ['Vuoi qualcosa di audace o di classico?', 'Something bold or classic?'],
    ['Ti faccio bello per l\'avventura.', 'I\'ll make you sharp for the adventure.'],
    ['Capelli in ordine, testa leggera.', 'Tidy hair, light head.'],
    ['Guarda che meraviglia posso farti.', 'Look what a wonder I can do.'],
    ['Siediti, in un attimo sei un altro.', 'Sit down, in a blink you\'re a new person.'],
  ],
  tailor: [
    ['Cerchi qualcosa da mettere? Sei nel posto giusto.', 'Looking for something to wear? Right place.'],
    ['Ho stoffe di ogni colore, guarda!', 'I\'ve got fabrics of every color, look!'],
    ['Un cappello nuovo? Ne ho di speciali.', 'A new hat? I\'ve got special ones.'],
    ['L\'abito fa l\'archeologo, si sa.', 'Clothes make the archaeologist, they say.'],
    ['Provati pure quello che vuoi.', 'Try on anything you like.'],
    ['Tessuti freschi, appena arrivati.', 'Fresh fabrics, just in.'],
    ['Ti vedo bene con qualcosa di colorato.', 'You\'d look great in something colorful.'],
    ['Un buon vestito porta fortuna.', 'Good clothes bring good luck.'],
    ['Cuci cuci, e sei subito alla moda.', 'Stitch stitch, and you\'re in fashion.'],
    ['Dai, rendiamoti elegante per il museo.', 'Come, let\'s make you elegant for the museum.'],
  ],
};
const NPC_THANKS = [
  ['Grazie, torna quando vuoi!', 'Thank you, come back anytime!'],
  ['Ottima scelta, davvero.', 'Great choice, really.'],
  ['È stato un piacere!', 'A pleasure!'],
  ['Alla prossima, mi raccomando.', 'Until next time, take care.'],
  ['Sapevo che ti sarebbe piaciuto.', 'I knew you\'d like it.'],
  ['Affare fatto! A presto.', 'Deal done! See you soon.'],
  ['Buona fortuna là fuori!', 'Good luck out there!'],
  ['Che il tuo zaino sia sempre pieno.', 'May your bag always be full.'],
];
const NPC_NOBUY = [
  ['Nessun problema, torna quando vuoi.', 'No problem, come back anytime.'],
  ['Guarda con calma, ci sono sempre.', 'Take your time, I\'m always here.'],
  ['Magari la prossima volta!', 'Maybe next time!'],
  ['Ti aspetto qui, sappilo.', 'I\'ll be right here, you know.'],
  ['Va bene così, buona esplorazione!', 'That\'s alright, happy exploring!'],
  ['La porta è sempre aperta.', 'The door is always open.'],
];
/* PRIMA visita di ogni edificio: una frase che spiega a cosa serve. Poi le 10 a rotazione. */
const NPC_FIRST = {
  lab: ['Qui costruisci le chimere: portami un cranio, un torace e una zampa identificati (+ un po\' di monete) e le assemblo — una fialetta di DNA per ogni specie usata. Con DUE fialette della stessa specie, invece, la faccio rivivere tutta intera.',
    'This is where you build chimeras: bring me an identified skull, torso and leg (+ some coins) and I assemble them — one DNA vial per species used. With TWO vials of the same species I can instead bring it back whole.'],
  store: ['Qui vendi i reperti identificati e compri il necessario: attrezzi, zaini più grandi, mappe del tesoro, ristori e mezzi. Dai pure un\'occhiata.',
    'Here you sell identified finds and buy what you need: tools, bigger bags, treasure maps, snacks and vehicles. Have a look around.'],
  museum: ['Portami i reperti GREZZI e te li identifico subito. I pezzi nuovi restano esposti; completa una teca (5 su 5) e guadagni una fialetta di DNA — al Laboratorio ne servono due per far rivivere una specie.',
    'Bring me your RAW finds and I identify them right away. New pieces stay on display; complete a case (5 of 5) and you earn a DNA vial — the Laboratory needs two of them to bring a species back.'],
  inn: ['Dormi qui per recuperare le energie: ti sveglierai all\'alba del giorno dopo. Utile prima di una lunga battuta di scavo.',
    'Sleep here to restore your energy: you\'ll wake at dawn the next day. Handy before a long dig.'],
  barber: ['Ti cambio taglio e colore di capelli. Prova quanto vuoi gratis: paghi solo quando confermi. In ogni zona c\'è uno stile esclusivo da scoprire.',
    'I change your haircut and hair color. Try as much as you like for free: you only pay on confirm. Each region hides an exclusive style.'],
  tailor: ['Qui scegli maglia, pantaloni e cappello. Prova liberamente e paghi alla conferma; alcuni cappelli speciali si sbloccano a parte.',
    'Here you pick shirt, trousers and hat. Try freely and pay on confirm; some special hats are unlocked separately.'],
};
function pickLine(arr) { if (!arr || !arr.length) return null; const e = arr[Math.floor(Math.random() * arr.length)]; return tr(e[0], e[1]); }
function sayGreet(type) {
  if (!S.npcSeen) S.npcSeen = {};
  if (!S.npcSeen[type] && NPC_FIRST[type]) {
    S.npcSeen[type] = true; save();
    const e = NPC_FIRST[type]; sayNpc(tr(e[0], e[1]), 8.5); return; // tutorial: più lungo, resta di più
  }
  const l = pickLine(NPC_GREET[type]); if (l) sayNpc(l, 5.5);
}
export function openBuilding(b) {
  const tw = townForTile(Math.floor(P.x / TS), Math.floor(P.y / TS));
  mTitle.innerHTML = withIcons((buildingEmoji[b.type] || '🏠') + ' ' + bldName(b.type) + (tw ? ' — ' + tw.name : ''));
  if (b.type === 'lab') renderLab();
  else if (b.type === 'store') renderStore();
  else if (b.type === 'museum') renderMuseum();
  else if (b.type === 'barber') renderBarber();
  else if (b.type === 'tailor') renderTailor();
  else renderInn();
  openModal();
  buildingModal = b.type; buildingCoins0 = S.coins; // openModal l'ha azzerato: lo impostiamo dopo
}

function renderLab() {
  let h = `<div class="muted" style="margin-bottom:10px">${tr('Il laboratorio risveglia: chimere e specie complete. (I reperti grezzi si identificano al <b>Museo</b>.)', 'The laboratory awakens: chimeras and complete species. (Raw finds are identified at the <b>Museum</b>.)')}</div>`;
  /* FUSIONE DEI DOPPIONI: dà uno scopo ai pezzi ripetuti quando le monete non servono più */
  {
    const groups = fusibleGroups(S.items);
    h += `<div class="bighead">${tr('Fondi i doppioni', 'Fuse duplicates')}</div>`;
    h += `<div class="muted" style="margin-bottom:8px">${tr('<b>3 pezzi uguali</b> diventano <b>1 pezzo della rarità successiva</b>, stessa parte, di una specie della stessa zona. Non costa monete: il prezzo sono i tre pezzi.', '<b>3 identical pieces</b> become <b>1 piece of the next rarity</b>, same part, from a species of the same zone. No coins needed: the three pieces are the price.')}</div>`;
    if (!groups.length) {
      h += `<div class="center muted" style="margin-bottom:10px">${tr('Nessun gruppo da 3 pezzi uguali, per ora.', 'No group of 3 identical pieces yet.')}</div>`;
    } else {
      h += groups.map(g => {
        const sp = spById[g.spId];
        const up = nextRarity(g.q);
        const mine = (S.museum[g.spId] || []).includes(g.part);
        /* avviso onesto: se quel pezzo non è ancora in vetrina, fonderlo ti toglie la teca */
        const warn = mine ? '' : `<div class="sub" style="color:#a8512e">${tr('non ancora esposto al Museo', 'not yet on display at the Museum')}</div>`;
        return `<div class="row"><canvas class="pv" width="36" height="30" data-pv="${g.spId}|${g.part}"></canvas>
          <div><div class="nm">${partName(g.part)} ${tr('di', 'of')} ${sp ? sp.name : g.spId} ×${g.uids.length}</div>
          <div class="sub">${rarSpan(g.q)} → ${rarSpan(up)} · ${tr('stessa zona', 'same zone')}: ${zoneName(sp ? sp.zone : '')}</div>${warn}</div>
          <div class="rt"><button class="btn amber" data-fuse="${g.spId}|${g.part}">${tr('Fondi 3', 'Fuse 3')}</button></div></div>`;
      }).join('');
    }
  }
  h += `<div class="bighead">${tr('Risveglia una chimera', 'Awaken a chimera')}</div>`;
  h += `<div class="muted" style="margin-bottom:8px">${tr('Monta <b>Cranio + Torace + Zampa</b> identificati', 'Assemble an identified <b>Skull + Ribcage + Leg</b>')} (🪙 ${CHIMERA_COST} + 🧬 ${tr('1 fialetta per ogni specie usata', '1 vial per species used')}): ${tr('la creatura rivive nel <b>parco</b> delle città grandi. Chimere create', 'the creature comes alive in the big-city <b>park</b>. Chimeras created')}: ${S.creatures.length}</div>`;
  const crn = S.items.filter(i => i.t === 'cranio'), tor = S.items.filter(i => i.t === 'torace'), zmp = S.items.filter(i => i.t === 'zampa');
  if (!crn.length || !tor.length || !zmp.length) {
    const miss = [!crn.length ? partName('cranio') : null, !tor.length ? partName('torace') : null, !zmp.length ? partName('zampa') : null].filter(Boolean).join(', ');
    h += `<div class="center muted">${tr('Ti manca', 'Missing')}: ${miss}.</div>`;
  } else {
    const opt = list => list.map(i => `<option value="${i.uid}">${spById[i.s].name} (${rarLabel(i.q)})</option>`).join('');
    h += `<div class="row" style="flex-wrap:wrap;gap:6px">
      <select id="selC" class="sel">${opt(crn)}</select><select id="selT" class="sel">${opt(tor)}</select><select id="selZ" class="sel">${opt(zmp)}</select>
      <div class="rt"><button class="btn clay" id="doChimera">${tr('Risveglia!', 'Awaken!')} 🪙${CHIMERA_COST}</button></div></div>`;
    h += `<div class="center" style="padding:4px 0"><canvas id="chimPrev" class="bp-cv" width="120" height="90"></canvas><div class="muted" style="font-size:11px">${tr('Anteprima della creatura assemblata', 'Preview of the assembled creature')}</div></div>`;
  }
  h += `<hr class="hr"><div class="bighead">${tr('Risveglia una specie', 'Awaken a species')}</div>`;
  h += `<div class="muted" style="margin-bottom:8px">${isDebug() ? '🐞 ' + tr('DEBUG: fialette DNA infinite. Risvegliate', 'DEBUG: infinite DNA vials. Awakened') : tr('Servono <b>2 fialette di DNA</b> della stessa specie (una teca completa 5/5 ne dà una; le altre si comprano al Museo): qui le iniettiamo e la specie torna <b>VIVA</b> nel Libro. Risvegliate', 'You need <b>2 DNA vials</b> of the same species (a complete case 5/5 gives one; more can be bought at the Museum): we inject them here and the species comes back <b>ALIVE</b> in the Book. Awakened')}: ${S.awakened.length}/${ALL_SPECIES.length}</div>`;
  /* in debug il DNA è infinito: elenca i fossili SCOPERTI (non tutti e 60) ancora da risvegliare */
  const ready = ALL_SPECIES.filter(s => !S.awakened.includes(s.id) && (isDebug() ? S.codex.includes(s.id) : awakenReady(s.id)));
  if (!ready.length) h += `<div class="center muted">${isDebug() ? tr('Scopri qualche fossile e potrai risvegliarlo.', 'Discover some fossils to awaken them.') : tr('Nessuna fialetta DNA nello zaino.', 'No DNA vials in your bag.')}</div>`;
  else ready.forEach(s => h += `<div class="row"><span class="em">🧬</span><div><div class="nm">${s.name}</div><div class="sub">${tr('Fialetta DNA pronta', 'DNA vial ready')}</div></div><div class="rt"><button class="btn amber" data-awaken="${s.id}">${tr('Risveglia', 'Awaken')}</button></div></div>`);
  if (isDebug()) h += `<hr class="hr"><div class="bighead">🐞 ${tr('Debug', 'Debug')}</div><div class="row"><span class="em">🦴</span><div><div class="nm">${tr('Spawna tutti i fossili', 'Spawn all fossils')}</div><div class="sub">${tr('Ogni pezzo di tutte le 60 specie, identificato', 'Every piece of all 60 species, identified')}</div></div><div class="rt"><button class="btn clay" id="dbgSpawn">${tr('Spawna', 'Spawn')}</button></div></div>`;
  h += `<hr class="hr"><div class="bighead">${tr('Libro dei Fossili', 'Fossil Book')}</div>`;
  const found = ALL_SPECIES.filter(s => S.codex.includes(s.id)).length;
  h += `<div class="row"><span class="em">📖</span><div><div class="nm">${tr('Fossili ricostruiti', 'Fossils reconstructed')}: ${found}/${ALL_SPECIES.length}</div><div class="sub">${MUSEUM_ZONES.map(z => z.icon + ' ' + zonePools[z.id].filter(s => S.codex.includes(s.id)).length + '/' + zonePools[z.id].length).join(' · ')}</div></div>
    <div class="rt"><button class="btn ghost" id="labBook">${tr('Apri (L)', 'Open (L)')}</button></div></div>`;
  /* le miniature dei pezzi vanno DISEGNATE dopo l'innerHTML: senza, al posto del fossile
     resta il fondo scuro della canvas (un quadrato nero) */
  mBody.innerHTML = withIcons(h); hydratePv();
  const dc = document.getElementById('doChimera'); if (dc) dc.onclick = () => {
    const v = id => parseInt(document.getElementById(id).value, 10);
    if (assembleChimera(v('selC'), v('selT'), v('selZ'))) renderLab();
  };
  mBody.querySelectorAll('[data-fuse]').forEach(b => b.onclick = () => {
    const [spId, part] = b.dataset.fuse.split('|');
    const out = fuseDupes(spId, part);
    if (out) {
      const sp = spById[out.s];
      showBanner('⚗️ ' + tr('Fusione riuscita!', 'Fusion complete!') + '<br><span style="font-size:.8em">'
        + partName(out.t) + ' ' + tr('di', 'of') + ' ' + (sp ? sp.name : out.s) + ' · ' + rarLabel(out.q) + '</span>', 2400);
    }
    renderLab();
  });
  const lb = document.getElementById('labBook'); if (lb) lb.onclick = () => { openBook(0); };
  const ds = document.getElementById('dbgSpawn'); if (ds) ds.onclick = () => { if (debugSpawnAll()) { toast('🐞 ' + tr('Tutti i fossili nello zaino!', 'All fossils in your bag!')); renderLab(); } };
  mBody.querySelectorAll('[data-awaken]').forEach(b => b.onclick = () => { if (awakenSpecies(b.dataset.awaken)) renderLab(); });
  /* anteprima 3D della chimera: testa dal cranio, petto dal torace, arti dalla zampa (VIVA) */
  const pv = document.getElementById('chimPrev');
  if (pv) {
    const specNow = () => {
      const pick = id => { const it = S.items.find(x => x.uid === parseInt(document.getElementById(id).value, 10)); return it ? spById[it.s] : null; };
      const c = pick('selC'), t = pick('selT'), z = pick('selZ');
      if (!c || !t || !z) return null;
      return { heads: [{ sp: c, horns: partParams(c).horns }], chest: t, arms: [z, z], legs: [z, z], tails: [t] };
    };
    const refresh = () => {
      const cur = document.getElementById('chimPrev'); if (!cur) return;
      const sp = specNow(); if (sp) remount3D(cur, sp, false, true);
    };
    ['selC', 'selT', 'selZ'].forEach(id => { const el = document.getElementById(id); if (el) el.onchange = refresh; });
    refresh();
  }
}
function renderStore() {
  let h = `<div class="muted" style="margin-bottom:10px">${tr('Il negozio compra i reperti <b>identificati</b>. Quelli grezzi vanno prima al Laboratorio.', 'The shop buys <b>identified</b> finds. Raw ones must go to the Laboratory first.')}</div>`;
  if (!S.items.length) h += `<div class="center muted">${tr('Non hai reperti identificati da vendere.', 'No identified finds to sell.')}</div>`;
  else {
    h += `<div class="row" style="background:#f1e6cc"><div class="nm">${tr('Totale vendibile', 'Total sellable')}: 🪙 ${S.items.reduce((a, x) => a + x.val, 0)}</div><div class="rt"><button class="btn" id="sellAll">${tr('Vendi tutto', 'Sell all')}</button></div></div>`;
    h += S.items.map(it => itemRow(it, `<button class="btn ghost" data-sell="${it.uid}">${tr('Vendi', 'Sell')} 🪙${it.val}</button>`)).join('');
  }
  /* oggetti di superficie (non fossili) raccolti in overworld */
  if (S.goods && S.goods.length) {
    h += `<div class="bighead">🐚 ${tr('Oggetti raccolti', 'Collected objects')}</div>`;
    h += `<div class="row" style="background:#f1e6cc"><div class="nm">${tr('Totale', 'Total')}: 🪙 ${S.goods.reduce((a, x) => a + x.val, 0)}</div><div class="rt"><button class="btn" id="sellAllGoods">${tr('Vendi tutti', 'Sell all')}</button></div></div>`;
    h += S.goods.map(g => `<div class="row"><span class="em">🐚</span><div><div class="nm">${goodName(g.id)}${(g.n || 1) > 1 ? ' ×' + g.n : ''}</div></div><div class="rt"><button class="btn ghost" data-sellg="${g.uid}">${tr('Vendi', 'Sell')} 🪙${g.val}</button></div></div>`).join('');
  }
  {
    /* il prezzo sale a ogni ristoro della giornata: va scritto, non scoperto alla cassa */
    const left = snacksLeftToday(), cost = snackPrice();
    const sub = left > 0
      ? tr('Ne restano ', 'Left today: ') + left + tr(' oggi · il prezzo sale a ogni ristoro', ' · the price rises with each one')
      : tr('Esauriti per oggi: il fornaio ne rifà domani', 'Sold out for today: the baker bakes more tomorrow');
    const btn = left > 0 ? `<button class="btn amber" id="buyEn">🪙 ${cost}</button>` : `<button class="btn" disabled>${tr('Esauriti', 'Sold out')}</button>`;
    h += `<hr class="hr"><div class="row"><span class="em">🍞</span><div><div class="nm">${tr('Ristoro', 'Snack')} (+15 ⚡)</div><div class="sub">${sub}</div></div><div class="rt">${btn}</div></div>`;
  }
  h += `<div class="row"><span class="em">📜</span><div><div class="nm">${tr('Pergamena di ritorno', 'Return scroll')}${S.teleports > 0 ? ` ×${S.teleports}` : ''}</div><div class="sub">${tr('Dallo zaino: teletrasporto alla città più vicina', 'From your bag: teleport to the nearest city')}</div></div><div class="rt"><button class="btn amber" id="buyTp">🪙 ${TELEPORT_COST}</button></div></div>`;
  { const nb = nextBagCost(), nextCap = BAG_CAPS[bagLevel() + 1];
    h += `<div class="row"><span class="em">🎒</span><div><div class="nm">${tr('Zaino più grande', 'Bigger bag')}</div><div class="sub">${tr('Capienza fossili', 'Fossil capacity')}: ${fossilCount()}/${bagCap()}${nb != null ? ' → ' + nextCap : ' · ' + tr('al massimo', 'maxed')}</div></div><div class="rt">${nb != null ? `<button class="btn amber" id="buyBag">🪙 ${nb}</button>` : ''}</div></div>`; }
  /* mappe del tesoro: X lontana → scavo garantito della rarità comprata */
  h += `<div class="bighead">🗺️ ${tr('Mappe del tesoro', 'Treasure maps')}</div><div class="muted" style="margin-bottom:6px">${tr('Una X lontana, un reperto garantito. Più raro = più lontano.', 'A distant X, a guaranteed find. Rarer = farther.')}</div>`;
  for (const r of ['raro', 'eccezionale', 'leggendario']) {
    h += `<div class="row"><span class="em">🗺️</span><div><div class="nm">${tr('Mappa', 'Map')} — ${rarLabel(r)}</div><div class="sub">${MAP_DIST[r][0]}–${MAP_DIST[r][1]} ${tr('passi', 'steps')}</div></div><div class="rt"><button class="btn amber" data-map="${r}">🪙 ${MAP_COST[r]}</button></div></div>`;
  }
  /* attrezzi del mestiere */
  h += `<div class="bighead">🧰 ${tr('Attrezzi', 'Tools')}</div>`;
  const TOOLS_UI = [
    ['spade', '🪏', tr('Pala', 'Spade'), tr('Indispensabile per scavare la terra', 'Essential to dig the ground')],
    ['shovel', '🪏', tr('Pala fortunata', 'Lucky shovel'), tr('60 scavi col drop aumentato', '60 digs with boosted drops') + (S.shovel > 0 ? ` · ${tr('cariche', 'charges')}: ${S.shovel}` : '')],
    ['axe', '🪓', tr('Accetta', 'Hatchet'), tr('Abbatti gli alberi: alcuni fossili vivono lì', 'Chop trees: some fossils live there')],
    ['pick', '⛏️', tr('Piccone', 'Pickaxe'), tr('Spacca massi e guglie: fossili di roccia', 'Break boulders and spires: rock fossils')],
    ['boat', '⛵', tr('Barca', 'Boat'), tr('Naviga ovunque e PESCA i fossili acquatici', 'Sail anywhere and FISH aquatic fossils')],
  ];
  for (const [id, em, nm, sub] of TOOLS_UI) {
    const owned = id !== 'shovel' && S.tools[id];
    h += `<div class="row"><span class="em">${em}</span><div><div class="nm">${nm}${owned ? ' ✓' : ''}</div><div class="sub">${sub}</div></div><div class="rt">${owned ? '' : `<button class="btn amber" data-tool="${id}">🪙 ${TOOL_COST[id]}</button>`}</div></div>`;
  }
  /* mezzi di trasporto + torcia */
  h += `<div class="bighead">🛼 ${tr('Mezzi & luce', 'Vehicles & light')}</div>`;
  const GEAR_UI = [
    ['skates', '🛼', tr('Pattini', 'Skates'), tr('Velocità ×2 a piedi', 'Speed ×2 on foot')],
    ['bike', '🚲', tr('Bicicletta', 'Bicycle'), tr('Velocità ×3 a piedi', 'Speed ×3 on foot')],
    ['motorboat', '🚤', tr('Motoscafo', 'Motorboat'), tr('Velocità ×3 sull\'acqua (serve la barca)', 'Speed ×3 on water (needs the boat)')],
    ['torch', '🔦', tr('Torcia', 'Torch'), tr('Alone di luce più ampio di notte e in grotta', 'Wider light halo at night and in caves')],
    ['compass', '🧭', tr('Bussola', 'Compass'), tr('Guida verso la città più vicina (attivabile dallo zaino)', 'Points to the nearest town (toggle from the bag)')],
  ];
  for (const [id, em, nm, sub] of GEAR_UI) {
    const owned = !!S.tools[id];
    h += `<div class="row"><span class="em">${em}</span><div><div class="nm">${nm}${owned ? ' ✓' : ''}</div><div class="sub">${sub}</div></div><div class="rt">${owned ? '' : `<button class="btn amber" data-tool="${id}">🪙 ${TOOL_COST[id]}</button>`}</div></div>`;
  }
  mBody.innerHTML = withIcons(h); hydratePv();
  const sa = document.getElementById('sellAll'); if (sa) sa.onclick = () => { const { g, n } = sellAll(); toast(tr('Venduti ', 'Sold ') + n + tr(' reperti per 🪙', ' finds for 🪙') + g); renderStore(); };
  mBody.querySelectorAll('[data-sell]').forEach(btn => btn.onclick = () => { sellItem(parseInt(btn.dataset.sell, 10)); renderStore(); });
  const sag = document.getElementById('sellAllGoods'); if (sag) sag.onclick = () => { const { g, n } = sellAllGoods(); toast(tr('Venduti ', 'Sold ') + n + tr(' oggetti per 🪙', ' objects for 🪙') + g); renderStore(); };
  mBody.querySelectorAll('[data-sellg]').forEach(btn => btn.onclick = () => { sellGood(parseInt(btn.dataset.sellg, 10)); renderStore(); });
  const be = document.getElementById('buyEn'); if (be) be.onclick = () => { buyEnergy(); renderStore(); };
  const bt = document.getElementById('buyTp'); if (bt) bt.onclick = () => { buyTeleport(); renderStore(); };
  const bbg = document.getElementById('buyBag'); if (bbg) bbg.onclick = () => { buyBag(); renderStore(); };
  mBody.querySelectorAll('[data-map]').forEach(btn => btn.onclick = () => { buyMap(btn.dataset.map); renderStore(); });
  mBody.querySelectorAll('[data-tool]').forEach(btn => btn.onclick = () => { buyTool(btn.dataset.tool); renderStore(); });
}
function renderMuseum() {
  /* il museo INDICIZZA la sua zona nel Libro dei Fossili (sagome ???) */
  const z = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
  if (!S.book[z.id]) { S.book[z.id] = true; save(); toast(tr('📖 Nuove pagine nel libro: ', '📖 New pages in the book: ') + zoneName(z.id) + '!'); }
  const complete = Object.keys(S.museum).filter(k => (S.museum[k] || []).length === PARTS.length).length;
  let h = `<div class="muted" style="margin-bottom:10px">${tr('Consegna i reperti <b>grezzi</b>: gli esperti li identificano <b>subito</b>. I pezzi che il museo ha già tornano a te (vendibili); i nuovi vengono <b>esposti in galleria</b>. Teca completa 5/5 → <b>fialetta di DNA</b> da usare al Laboratorio.', 'Hand in your <b>raw</b> finds: the experts identify them <b>instantly</b>. Pieces the museum already has come back to you (sellable); new ones go <b>on display</b>. Complete case 5/5 → a <b>DNA vial</b> to use at the Laboratory.')}</div>`;
  if (!S.museumJob) {
    h += `<div class="row"><span class="em">🦴</span><div><div class="nm">${tr('Reperti grezzi', 'Raw finds')}: ${S.raw.length}</div><div class="sub">${tr('Scoperte', 'Discovered')}: ${S.codex.length}/${ALL_SPECIES.length}</div></div>
      <div class="rt"><button class="btn amber" id="mudep" ${S.raw.length ? '' : 'disabled'}>${tr('Consegna tutto', 'Hand in all')}</button></div></div>`;
    /* TAVOLO DI PREPARAZIONE — UN pezzo per volta, e solo se ne vale la pena.
       Farlo su ogni reperto lo trasformerebbe in una catena di montaggio: il Curatore
       mette sul tavolo il pezzo migliore del lotto (raro o più), il resto si consegna
       e basta. Resta facoltativo: chi salta non perde niente rispetto a prima. */
    const cand = prepCandidate();
    if (cand) {
      const sp = spById[cand.it.s];
      h += `<div class="bighead" style="margin-top:10px">🪶 ${tr('Tavolo di preparazione', 'Preparation table')}</div>
        <div class="muted" style="margin-bottom:6px">${tr('Il Curatore mette sul tavolo <b>il pezzo migliore</b> del lotto: spazzolalo e varrà <b>fino a ×1,5</b>, con esperienza in più. Gli altri si consegnano così come sono.', 'The Curator puts <b>the best piece</b> of the batch on the table: brush it and it will be worth <b>up to ×1.5</b>, with extra XP. The rest are handed in as they are.')}</div>
        <div class="row"><canvas class="pv" width="36" height="30" data-pv="${cand.it.s}|${cand.it.t}"></canvas>
        <div><div class="nm">${partName(cand.it.t)} ${tr('di', 'of')} ${sp ? sp.name : '?'}</div>
        <div class="sub">${rarSpan(cand.it.q)} · ${tr('valore', 'value')} 🪙 ${cand.it.val}</div></div>
        <div class="rt"><button class="btn amber" data-prep="${cand.i}">${tr('Al tavolo', 'To the table')}</button></div></div>`;
    }
  } else if (!museumJobReady()) {
    h += `<div class="row" style="background:#f1e6cc"><span class="em">🔬</span><div><div class="nm">${tr('In lavorazione', 'Being examined')}: ${S.museumJob.items.length} ${tr('reperti', 'finds')}</div><div class="sub">${tr('Torna domani (giorno ', 'Come back tomorrow (day ')}${S.museumJob.ready})</div></div></div>`;
  } else {
    h += `<div class="row" style="background:#f1e6cc"><span class="em">💫</span><div><div class="nm">${tr('Pronti!', 'Ready!')} ${S.museumJob.items.length} ${tr('reperti identificati', 'finds identified')}</div></div>
      <div class="rt"><button class="btn amber" id="mucol">${tr('Ritira', 'Collect')}</button></div></div>`;
  }
  h += `<div id="idResult"></div>`;
  h += commissionBlock();
  h += `<div class="row" style="background:#f1e6cc"><div class="nm">${tr('Specie complete', 'Complete species')}: ${complete}/${ALL_SPECIES.length}</div>
    <div class="rt"><button class="btn ghost" id="mbook">📖 ${tr('Libro', 'Book')}</button></div></div>`;
  /* ricariche di DNA: solo per specie con teca completa, prezzo per rarità */
  const rechargeable = ALL_SPECIES.filter(s => (S.museum[s.id] || []).length === PARTS.length);
  if (rechargeable.length) {
    h += `<div class="bighead" style="margin-top:10px">🧬 ${tr('Ricariche DNA', 'DNA refills')}</div><div class="muted" style="margin-bottom:6px">${tr('Ogni fialetta serve al Laboratorio: <b>2</b> risvegliano la specie, <b>1</b> basta per usarla in una chimera.', 'Each vial is used at the Laboratory: <b>2</b> awaken the species, <b>1</b> is enough to use it in a chimera.')}</div>`;
    h += rechargeable.map(s => `<div class="row"><span class="em">🧬</span><div><div class="nm">${s.name} ${dnaBadge(s.id)}</div><div class="sub">${rarSpan(s.r)}</div></div><div class="rt"><button class="btn amber" data-dna="${s.id}">🪙 ${DNA_COST[s.r]}</button></div></div>`).join('');
  }
  h += `<div class="center muted" style="margin-top:6px">${tr('Gira la galleria: i pezzi consegnati sono esposti per bioma.', 'Walk the gallery: delivered pieces are on display by biome.')}</div>`;
  mBody.innerHTML = withIcons(h); hydratePv();
  const dep = document.getElementById('mudep'); if (dep) dep.onclick = () => {
    if (museumDeposit()) toast('🏛️ ' + tr('Consegnati! Torna domani per il ritiro', 'Handed in! Come back tomorrow to collect'));
    renderMuseum();
  };
  const col = document.getElementById('mucol'); if (col) col.onclick = () => {
    const r = museumCollect(); if (!r) return;
    for (const spId of r.vials) toast('🧬 ' + tr('Teca completa! Fialetta DNA di ', 'Case complete! DNA vial of ') + spById[spId].name);
    const keep = `<div class="bighead" style="margin-top:10px">${tr('Restituiti a te', 'Returned to you')} (${r.back.length})</div>` + (r.back.length ? r.back.map(it => itemRow(it)).join('') : `<div class="center muted">${tr('Niente doppioni: tutto esposto!', 'No duplicates: everything on display!')}</div>`) +
      `<div class="center muted" style="margin-top:4px">🏛️ ${tr('Nuovi pezzi esposti', 'New pieces displayed')}: ${r.shown.length}</div>`;
    renderMuseum(); const ir = document.getElementById('idResult'); if (ir) { ir.innerHTML = withIcons(keep); hydratePv(); }
  };
  mBody.querySelectorAll('[data-prep]').forEach(b => b.onclick = () => {
    const it = S.raw[parseInt(b.dataset.prep, 10)]; if (!it) return;
    openPrepare(it, () => { save(); renderMuseum(); });
  });
  wireCommission(renderMuseum);
  const mb = document.getElementById('mbook'); if (mb) mb.onclick = () => { openBook(0); };
  mBody.querySelectorAll('[data-dna]').forEach(btn => btn.onclick = () => { buyDna(btn.dataset.dna); renderMuseum(); });
}
/* COMMISSIONE — il blocco del Curatore: una alla volta, 3 giorni, ricompensa grossa.
   Tutto è scritto: cosa serve, quanto ne hai, quanto manca alla scadenza, cosa ti danno. */
function commissionBlock() {
  cmPrune(S.day);
  const c = cmActive();
  let h = `<div class="bighead" style="margin-top:10px">📜 ${tr('Commissione del Museo', 'Museum commission')}</div>`;
  if (c) {
    const n = cmHave(c), ok = cmCanDeliver(c);
    h += `<div class="row" style="background:#f1e6cc"><span class="em">📜</span><div>
      <div class="nm">${cmText(c)}</div>
      <div class="sub">${tr('Ne hai', 'You have')} ${Math.min(n, c.n)}/${c.n} · ⏳ ${cmDueText(c, S.day)}</div>
      <div class="sub">${cmRewardText(c)}</div></div>
      <div class="rt"><button class="btn amber" id="cmdel" ${ok ? '' : 'disabled'}>${tr('Consegna', 'Deliver')}</button></div></div>`;
    if (!ok) h += `<div class="muted" style="margin-bottom:6px">${tr('Servono pezzi <b>identificati</b>: i grezzi vanno prima consegnati al banco.', 'Needs <b>identified</b> pieces: hand raw finds to the desk first.')}</div>`;
  } else {
    const o = cmOfferFor(S.day);
    h += `<div class="row"><span class="em">📜</span><div>
      <div class="nm">${cmText(o)}</div>
      <div class="sub">${tr('Hai', 'You get')} ${DURATION_CM} ${tr('giorni di tempo', 'days')} · ${cmRewardText(o)}</div>
      <div class="sub">${tr('Una alla volta. Se scade non perdi niente: il Curatore ne propone un\'altra.', 'One at a time. If it expires you lose nothing: the Curator offers another.')}</div></div>
      <div class="rt"><button class="btn amber" id="cmacc">${tr('Accetta', 'Accept')}</button></div></div>`;
  }
  return h;
}
function wireCommission(redraw) {
  const acc = document.getElementById('cmacc');
  if (acc) acc.onclick = () => {
    if (cmAccept(cmOfferFor(S.day), S.day)) toast('📜 ' + tr('Commissione accettata', 'Commission accepted'));
    redraw();
  };
  const del = document.getElementById('cmdel');
  if (del) del.onclick = () => {
    const c = cmDeliver(S.day); if (!c) return;
    gainXp(c.xp);
    playSfx('fanfare');
    showBanner('📜 ' + tr('Commissione completata!', 'Commission complete!') + '<br><span style="font-size:.8em">' + cmRewardText(c) + '</span>', 2800);
    redraw();
  };
}
/* fialette intere: ×N */
function dnaBadge(spId) {
  const n = S.dna[spId] || 0; if (!n) return '';
  return '<span class="sub">🧬×' + n + '</span>';
}
/* etichetta dell'esposizione in galleria (E sul piedistallo) */
export function openExhibit(spId) {
  const sp = spById[spId]; const parts = S.museum[spId] || [];
  mTitle.innerHTML = withIcons('🏛️ ' + sp.name + ' ' + sp.emoji);
  const zone = ZONES.find(z => z.id === sp.zone);
  let h = `<div class="center" style="padding:4px"><canvas id="exhCv" width="72" height="60" style="width:216px;height:180px;image-rendering:pixelated;background:#15120d;border:2px solid #6b5137;border-radius:8px"></canvas></div>`;
  h += `<div class="row"><div class="nm">${rarSpan(sp.r)} · ${zone ? zone.icon + ' ' + zoneName(zone.id) : ''}</div></div>`;
  h += `<div class="row"><div class="sub">${tr('Pezzi esposti', 'Pieces on display')}: ${parts.length}/${PARTS.length} — ${PARTS.map(pt => (parts.includes(pt.id) ? '✓ ' : '· ') + partName(pt.id)).join(' · ')}</div></div>`;
  if (parts.length === PARTS.length) h += `<div class="row" style="background:#f1e6cc"><div class="sub">🧬 ${tr('Teca completa: DNA disponibile al banco del Curatore', 'Case complete: DNA available at the Curator\'s desk')} ${dnaBadge(spId)}</div></div>`;
  h += `<div class="muted" style="margin-top:6px">${descFor(sp)}</div>`;
  mBody.innerHTML = withIcons(h); openModal();
  const cv = document.getElementById('exhCv');
  if (cv) try { projectVox(cv, composedPartsVox(spId, parts)); } catch (e) { /* stub */ }
}
function renderInn() {
  const night = isNight();
  const can = canSleep();
  const desc = night
    ? tr('È notte: dormendo ti sveglierai all\'alba del giorno dopo.', "It's night: sleeping wakes you at dawn of the next day.")
    : tr('È giorno: dormendo ti sveglierai a notte fonda.', "It's daytime: sleeping wakes you deep at night.");
  const label = night ? tr("Dormi fino all'alba 🌙", 'Sleep until dawn 🌙') : tr('Dormi fino a notte 🌙', 'Sleep until night 🌙');
  const blockMsg = can ? '' : `<div class="row" style="background:#f1ddc0"><div class="sub">${tr('Non puoi dormire di nuovo: prima passa sveglio almeno mezza giornata.', "Can't sleep again yet: spend at least half a day awake first.")}</div></div>`;
  mBody.innerHTML = withIcons(`<div class="center"><div style="font-size:40px">🛏️</div><div class="muted" style="margin:10px 0">${desc}</div>
    <div class="row" style="justify-content:center"><div class="nm">${tr('Energia', 'Energy')}: ${S.energy}/${S.maxEnergy} · ${tr('Giorno', 'Day')} ${S.day}</div></div>
    ${blockMsg}
    <button class="btn" id="rest" style="margin-top:6px" ${can ? '' : 'disabled'}>${label}</button></div>`);
  const rb = document.getElementById('rest'); if (rb) rb.onclick = () => { if (restInn()) renderInn(); };
}

/* ---------- zaino: pannello LEGGIBILE 8-bit a SCHEDE (Reperti/Oggetti/Attrezzi/DNA) --- */
let bagOpenFlag = false;
let bagTab = 'finds';
export function isBagOpen() { return bagOpenFlag; }
export function closeBag() {
  bagOpenFlag = false;
  const ov = document.getElementById('bagov'); if (ov && ov.classList) ov.classList.remove('on');
}
/* titoli/tooltip SENZA emoji: withIcons() dentro un attributo la spezzerebbe */
function esc(s) { return String(s).replace(/[<>"]/g, ''); }
export function openBag(tab) {
  if (tab) bagTab = tab;
  const dnaIds = Object.keys(S.dna || {}).filter(id => S.dna[id] > 0);
  /* silhouette dello zaino: spallacci/maniglia e tasche stanno FUORI dal corpo clippato;
     il corpo (.bag-body) ha gli angoli 8-bit a gradini (clip-path) */
  /* se in style.css è stato incollato un telaio disegnato (--bag-frame), il pannello lo usa */
  const framed = typeof getComputedStyle !== 'undefined' && typeof document !== 'undefined' && document.documentElement
    && (getComputedStyle(document.documentElement).getPropertyValue('--bag-frame') || '').trim() !== '';
  let h = `<div class="bag-body${framed ? ' framed' : ''}">`;
  h += `<div class="bag-hd"><span class="bicn">🎒</span><h2>${tr('Zaino', 'Bag')}</h2><span class="cnt">${S.raw.length + S.items.length} ${tr('reperti', 'finds')}</span><button class="bag-close" id="bagX">✕</button></div>`;
  h += `<div class="bag-scroll">`;

  const row = (ic, t1, t2, right, data, cls) => `<div class="brow ${cls || ''}" ${data || ''}><span class="bic">${ic}</span><div class="btx"><div class="bt1">${t1}</div><div class="bt2">${t2}</div></div>${right || ''}</div>`;

  /* ---- SCHEDA REPERTI: miniature voxel, capienza, trascina-fuori per buttare a terra ---- */
  let secFinds = `<div class="bag-sec"><h3>${tr('Reperti', 'Finds')} <span class="cap">${fossilCount()}/${bagCap()}</span></h3><div class="bag-hint">${tr('Tocca 🗑 su un reperto per lasciarlo a terra (lo ritrovi lì).', 'Tap 🗑 on a find to leave it on the ground (you can pick it back up).')}</div><div class="bag-items">`;
  if (S.raw.length) secFinds += `<div class="bitile" title="${esc(tr('Reperti grezzi da consegnare al Museo', 'Raw finds for the Museum'))}"><div class="pv" style="display:flex;align-items:center;justify-content:center;font-size:30px">🦴</div><div class="bnm">${tr('Grezzi', 'Raw')} ×${S.raw.length}</div><div class="biq">${tr('al Museo', 'to Museum')}</div>${dropBtn(S.raw[S.raw.length - 1].uid, 'raw')}</div>`;
  secFinds += S.items.map(it =>
    `<div class="bitile" title="${esc(partName(it.t) + ' ' + tr('di', 'of') + ' ' + spById[it.s].name + ' · ' + rarLabel(it.q) + ' · ' + it.val + ' ' + tr('monete', 'coins'))}">
       <span class="dot ${it.q}"></span>
       <canvas class="pv" width="40" height="40" data-pv="${it.s}|${it.t}"></canvas>
       <div class="bnm">${partName(it.t)} ${spById[it.s].name}</div>
       <div class="biq">${rarLabel(it.q)} · 🪙${it.val}</div>
       ${dropBtn(it.uid, 'item')}
     </div>`).join('');
  if (!S.items.length && !S.raw.length) secFinds += `<div class="bag-empty">${tr('Vuoto: vai a scavare!', 'Empty: go dig!')}</div>`;
  secFinds += `</div></div>`;

  /* ---- SCHEDA OGGETTI: ATTREZZI e MEZZI hanno una sezione loro con l'elenco COMPLETO
     (quelli non ancora comprati restano in grigio: si vede a colpo d'occhio cosa manca);
     sotto, il resto (consumabili, mappe, cianfrusaglie da vendere). ---- */
  const shopHint = tr('non ancora acquistato · Negozio', 'not bought yet · Shop');
  /* riga di un attrezzo/mezzo: posseduto = normale (con eventuale bottone), altrimenti grigia */
  const kitRow = (has, ic, nm, sub, right, data, cls) => has
    ? row(ic, nm, sub, right || '', data || '', cls || '')
    : row(ic, nm, shopHint, '', '', 'miss');
  const tools = [
    kitRow(S.tools.spade, '🪏', tr('Pala', 'Spade'), tr('E per scavare la terra', 'E to dig the ground')),
    kitRow(S.tools.axe, '🪓', tr('Accetta', 'Hatchet'), tr('E davanti a un albero', 'E facing a tree')),
    kitRow(S.tools.pick, '⛏️', tr('Piccone', 'Pickaxe'), tr('massi, guglie e cristalli di grotta', 'boulders, spires and cave crystals')),
    kitRow(S.tools.torch, '🔦', tr('Torcia', 'Torch'), tr('alone di luce più ampio', 'wider light halo')),
  ];
  if (S.tools.compass) { const on = compassActive();
    tools.push(row('🧭', tr('Bussola', 'Compass'), on ? tr('guida verso la città', 'points to town') : tr('spenta', 'off'),
      `<button class="bbtn${on ? ' on' : ''}" data-compass="1">${on ? tr('Attiva', 'On') : tr('Attiva', 'Use')}</button>`, '', 'click' + (on ? ' on' : '')));
  } else tools.push(kitRow(false, '🧭', tr('Bussola', 'Compass'), ''));
  if (S.shovel > 0) tools.push(row('🪏', tr('Pala fortunata', 'Lucky shovel'), tr('scavi col drop aumentato', 'boosted digs'), `<span class="bqt">×${S.shovel}</span>`));
  const gearRow = (g, ic, nm, sub) => {
    if (!S.tools[g]) return kitRow(false, ic, nm, '');
    const on = gearActive(g);
    return row(ic, nm, sub, `<button class="bbtn${on ? ' on' : ''}" data-gear="${g}">${on ? tr('Attivo', 'On') : tr('Attiva', 'Use')}</button>`, '', 'click');
  };
  /* natanti: NIENTE pulsante — entri in acqua e ci sali da solo (il migliore che possiedi) */
  const boatRow = (g, ic, nm, sub) => S.tools[g]
    ? row(ic, nm, sub, `<span class="bqt">${gearActive(g) ? tr('in uso', 'in use') : tr('di scorta', 'spare')}</span>`)
    : kitRow(false, ic, nm, '');
  const vehicles = [
    gearRow('skates', '🛼', tr('Pattini', 'Skates'), tr('velocità ×2 a piedi', 'speed ×2 on foot')),
    gearRow('bike', '🚲', tr('Bicicletta', 'Bicycle'), tr('velocità ×3 a piedi', 'speed ×3 on foot')),
    boatRow('boat', '⛵', tr('Barca', 'Boat'), tr('sali da solo entrando in acqua · E per pescare', 'you board it automatically · E to fish')),
    boatRow('motorboat', '🚤', tr('Motoscafo', 'Motorboat'), tr('sostituisce la barca, ×3 sull\'acqua', 'replaces the boat, ×3 on water')),
  ];
  const nTools = [S.tools.spade, S.tools.axe, S.tools.pick, S.tools.torch, S.tools.compass].filter(Boolean).length;
  const nVeh = ['skates', 'bike', 'boat', 'motorboat'].filter(g => S.tools[g]).length;
  const orows = [];
  if (S.snacks > 0) orows.push(row('🍞', tr('Ristoro', 'Snack') + ' ×' + S.snacks, '+15 ⚡', `<button class="bbtn" data-eat="1">${tr('Usa', 'Use')}</button>`, ''));
  if (S.teleports > 0) orows.push(row('📜', tr('Pergamena di ritorno', 'Return scroll') + ' ×' + S.teleports, tr('alla città più vicina', 'to the nearest city'), `<button class="bbtn" data-tp="1">${tr('Usa', 'Use')}</button>`, ''));
  if (S.fireflies > 0) orows.push(row('✨', tr('Lucciole', 'Fireflies') + ' ×' + S.fireflies, tr('raccolte di notte', 'caught at night'), '', '', ''));
  (S.goods || []).forEach(g => orows.push(row('🐚', goodName(g.id) + ((g.n || 1) > 1 ? ' ×' + g.n : ''), '🪙 ' + g.val + ' · ' + tr('vendi al Negozio', 'sell at the Shop'), '', '', '')));
  (S.maps || []).forEach(m => { const on = S.trackMap === m.uid;
    orows.push(row('🗺️', tr('Mappa', 'Map') + ' ' + rarLabel(m.rar) + (on ? ' · 🧭' : ''), '✨ ' + dirTo(m.x, m.y),
      `<button class="bbtn">${on ? tr('Smetti', 'Stop') : tr('Segui', 'Track')}</button>`, `data-track="${m.uid}"`, 'click' + (on ? ' on' : ''))); });
  const secObjects =
    `<div class="bag-sec"><h3>⛏️ ${tr('Attrezzi', 'Tools')} <span class="cap">${nTools}/5</span></h3><div class="bag-list">${tools.join('')}</div></div>` +
    `<div class="bag-sec"><h3>⛵ ${tr('Mezzi', 'Vehicles')} <span class="cap">${nVeh}/4</span></h3><div class="bag-list">${vehicles.join('')}</div></div>` +
    (orows.length ? `<div class="bag-sec"><h3>🧰 ${tr('Altro', 'Other')}</h3><div class="bag-list">${orows.join('')}</div></div>` : '');

  /* ---- SCHEDA DNA & CHIMERE ---- */
  let secDna = '';
  if (isDebug()) secDna += `<div class="bag-sec"><h3>${tr('DNA', 'DNA')}</h3><div class="bag-list">` +
    row('🧬', '🐞 DEBUG', tr('DNA infinito: risvegli e chimere gratis al Lab', 'Infinite DNA: free awakenings and chimeras at the Lab'), '<span class="bqt">∞</span>') + `</div></div>`;
  else if (dnaIds.length) secDna += `<div class="bag-sec"><h3>${tr('DNA', 'DNA')}</h3><div class="bag-list">` +
    dnaIds.map(id => row('🧬', spById[id].name, tr('fialette · al Lab: 2 risvegliano la specie, 1 basta per una chimera', 'vials · at the Lab: 2 awaken the species, 1 is enough for a chimera'), `<span class="bqt">×${S.dna[id]}</span>`)).join('') + `</div></div>`;
  const cr = [];
  if (S.museumJob) cr.push(row('🏛️', tr('Al museo', 'At the museum') + ' ×' + S.museumJob.items.length, tr('ritiro dal giorno ', 'pickup from day ') + S.museumJob.ready));
  cr.push(...S.creatures.map(c => row('🐾', c.name + ' · ' + rarLabel(c.q), spById[c.skull].name + ' / ' + spById[c.torso].name + ' / ' + spById[c.leg].name)));
  if (cr.length) secDna += `<div class="bag-sec"><h3>${tr('Chimere', 'Chimeras')}</h3><div class="bag-list">${cr.join('')}</div></div>`;
  if (!secDna) secDna = `<div class="bag-sec"><div class="bag-empty">${tr('Niente DNA o chimere ancora', 'No DNA or chimeras yet')}</div></div>`;

  /* ---- BARRA SCHEDE (accesso rapido, niente scroll infinito) ---- */
  const dnaN = (isDebug() ? 1 : dnaIds.length) + S.creatures.length;
  /* ---- SCHEDA LETTERE: l'arco narrativo sta nello ZAINO, non nel menu di sistema ---- */
  const allL = allLetters(), gotL = allL.filter(id => hasLetter(id));
  let secLetters = `<div class="bag-sec"><h3>✉ ${tr('Lettere del nonno', "Grandpa's letters")} <span class="cap">${gotL.length}/${allL.length}</span></h3>`;
  secLetters += `<div class="bag-hint">${tr('Riempi una sala del Museo (un pezzo per ogni specie della zona) e il Curatore ti consegna la lettera che il nonno gli aveva lasciato.', 'Fill a Museum room (one piece of every species of that zone) and the Curator hands you the letter your grandparent left.')}</div><div class="bag-list">`;
  secLetters += allL.map(id => hasLetter(id)
    ? row('✉', letterTitle(id), tr('tocca per rileggerla', 'tap to read it again'), '', `data-letter="${id}"`, 'click')
    : row('·', '? ? ?', id === 'finale' ? tr('quando avrai tutte le altre', 'once you have all the others') : tr('riempi la sala di ', 'fill the room of ') + zoneName(id), '', '', 'miss')).join('');
  secLetters += `</div></div>`;
  const TABS = [
    ['finds', '🦴', tr('Reperti', 'Finds'), S.raw.length + S.items.length, secFinds],
    ['objects', '🧰', tr('Oggetti', 'Objects'), nTools + nVeh + orows.length, secObjects],
    ['dna', '🧬', tr('DNA', 'DNA'), dnaN, secDna],
    ['letters', '✉', tr('Lettere', 'Letters'), gotL.length, secLetters],
  ];
  if (!TABS.some(t => t[0] === bagTab)) bagTab = 'finds';
  h += `<div class="bag-tabs">` + TABS.map(([id, ic, lab, n]) =>
    `<button class="bag-tab${bagTab === id ? ' on' : ''}" data-tab="${id}"><span class="bic">${ic}</span><span class="bt">${lab}</span>${n ? `<span class="tn">${n}</span>` : ''}</button>`).join('') + `</div>`;
  h += (TABS.find(t => t[0] === bagTab) || TABS[0])[4];

  /* piede: la MAPPA per prima (si consulta di continuo), poi — staccati — i due libri.
     Traguardi e Guida stanno nel menu. */
  h += `</div><div class="bag-foot"><button class="btn ghost" id="bagMap">🗺️ ${tr('Mappa', 'Map')}<span class="kbd-only"> (M)</span></button>
    <span class="bf-sep"></span>
    <button class="btn ghost" id="bagBook">📖 ${tr('Libro', 'Book')}<span class="kbd-only"> (L)</span></button><button class="btn ghost" id="bagWonders">✨ ${tr('Meraviglie', 'Wonders')}</button></div></div>`;

  const box = document.getElementById('bagbox'), ov = document.getElementById('bagov');
  box.innerHTML = withIcons(h);
  hydratePv(box);
  if (ov && ov.classList) ov.classList.add('on');
  bagOpenFlag = true; setPrompt(null);
  const bx = document.getElementById('bagX'); if (bx) bx.onclick = () => closeBag();
  if (ov && ov.addEventListener && !ov._wired) { ov._wired = true; ov.addEventListener('click', e => { if (e.target === ov) closeBag(); }); }
  /* `openBook(0)` riparte dalla prima pagina. Qui c'era `bookPage = 0`, ma `bookPage` vive
     dentro bookui.js e non è mai stata importata: in un modulo ES (sempre strict) assegnare
     un identificatore non dichiarato lancia ReferenceError. L'eccezione partiva DOPO
     closeBag() e PRIMA di openBook(), quindi lo zaino si chiudeva e il Libro non si apriva
     mai — il pulsante sembrava morto e in console non guardava nessuno. */
  const bb = document.getElementById('bagBook'); if (bb) bb.onclick = () => { closeBag(); openBook(0); };
  const bm = document.getElementById('bagMap'); if (bm) bm.onclick = () => { closeBag(); openMap(); };
  const bw = document.getElementById('bagWonders'); if (bw) bw.onclick = () => { closeBag(); openWonderBook(); };
  if (box.querySelectorAll) {
    box.querySelectorAll('[data-tab]').forEach(el => el.onclick = () => { playSfx('ui'); bagTab = el.dataset.tab; openBag(); });
    box.querySelectorAll('[data-eat]').forEach(el => el.onclick = () => { eatSnack(); openBag(); });
    box.querySelectorAll('[data-tp]').forEach(el => el.onclick = () => { if (useTeleport()) closeBag(); else openBag(); });
    box.querySelectorAll('[data-gear]').forEach(el => el.onclick = () => { toggleGear(el.dataset.gear); openBag(); });
    box.querySelectorAll('[data-track]').forEach(el => el.onclick = () => {
      const uid = parseInt(el.dataset.track, 10);
      S.trackMap = S.trackMap === uid ? null : uid; save();
      toast(S.trackMap ? '🧭 ' + tr('La bussola segue la X', 'Compass tracking the X') : '🧭 ' + tr('Bussola sulla città', 'Compass back to town'));
      openBag();
    });
    box.querySelectorAll('[data-compass]').forEach(el => el.onclick = () => { toggleCompass(); openBag(); });
    box.querySelectorAll('[data-letter]').forEach(el => el.onclick = () => { closeBag(); openLetter(el.dataset.letter); });
  }
}
/* BOTTONE "lascia a terra" sulla tile del reperto. Prima si trascinava fuori dallo zaino:
   su un telefono lo zaino occupa tutto lo schermo e un "fuori" non esiste, quindi il gesto
   era impossibile. Ora è un comando solo, uguale su tutti i dispositivi. */
function dropBtn(uid, kind) {
  return `<button class="bdrop" data-drop="${uid}" data-dropk="${kind}" title="${esc(tr('Lascia a terra', 'Leave on the ground'))}" aria-label="${esc(tr('Lascia a terra', 'Leave on the ground'))}">🗑</button>`;
}
/* buttare via un pezzo raro o migliore (o un grezzo non ancora identificato) va confermato */
function dropNeedsConfirm(d) {
  const arr = d.kind === 'item' ? S.items : d.kind === 'good' ? S.goods : S.raw;
  const it = (arr || []).find(x => x.uid === d.uid);
  if (!it) return false;
  if (d.kind === 'raw') return true;
  return it.q === 'raro' || it.q === 'eccezionale' || it.q === 'leggendario';
}
function confirmDrop(d) {
  const arr = d.kind === 'item' ? S.items : d.kind === 'good' ? S.goods : S.raw;
  const it = (arr || []).find(x => x.uid === d.uid); if (!it) return;
  const nm = d.kind === 'good' ? (goodName(it.id) + ((it.n || 1) > 1 ? ' ×' + it.n : ''))
    : (partName(it.t) + ' ' + tr('di', 'of') + ' ' + (spById[it.s] ? spById[it.s].name : '?'));
  mTitle.innerHTML = withIcons('🎒 ' + tr('Lasciare a terra?', 'Leave it on the ground?'));
  mBody.innerHTML = withIcons(`<div class="row"><div><div class="nm">${nm}</div><div class="sub">${it.q ? rarSpan(it.q) + ' · ' : ''}${tr('resta per terra: lo riprendi con E', 'it stays on the ground: pick it up with E')}</div></div></div>
    <div class="center" style="margin-top:10px;display:flex;gap:10px;justify-content:center">
      <button class="btn ghost" id="dropNo">${tr('Annulla', 'Cancel')}</button>
      <button class="btn amber" id="dropYes">${tr('Lascia a terra', 'Drop it')}</button></div>`);
  openModal();
  const no = document.getElementById('dropNo'); if (no) no.onclick = () => { closeModal(); openBag(); };
  const yes = document.getElementById('dropYes'); if (yes) yes.onclick = () => { discardToGround(d.uid, d.kind); closeModal(); openBag(); };
}
document.getElementById('bagbtn').onclick = () => { playSfx('ui'); openBag(); };
{ const mb = document.getElementById('mapbtn');
  if (mb) mb.onclick = () => { if (!isModalOpen()) { playSfx('ui'); openMap(); } }; }
/* il Libro non sta più nell'HUD: si apre dallo zaino (📖) o col tasto L */
{ const qt = document.getElementById('questtag'); if (qt) qt.onclick = () => { if (!isModalOpen()) openQuests(); }; }
/* HUD mobile: una sola icona espande/collassa; da collassato restano solo toggle + menu */
{ const ht = document.getElementById('hudtoggle'), hud = document.getElementById('hud');
  if (ht && hud) {
    const isMobile = isTouch();
    if (isMobile) hud.classList.add('collapsed');
    ht.onclick = () => hud.classList.toggle('collapsed');
  } }

/* ---------- look: anteprima + swatch condivisi da editor/barbiere/sartoria ---------- */
function previewHtml() {
  return `<div class="center" style="padding:6px"><canvas id="prevCv" width="60" height="22" class="prev"></canvas></div>`;
}
let prevRaf = 0;
export function drawPreview(noHat) {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(prevRaf);
  const pc = document.getElementById('prevCv'); if (!pc) return;
  const c2 = pc.getContext('2d'); c2.imageSmoothingEnabled = false;
  const paint = (fr, bob) => {
    c2.clearRect(0, 0, 60, 22);
    drawHero(c2, 2, 4 + bob, 'down', fr, noHat);   // +4 in alto: spazio per cappelli che svettano (righe -3)
    drawHero(c2, 22, 4 + bob, 'right', fr, noHat);
    drawHero(c2, 42, 4 + bob, 'up', fr, noHat);
  };
  paint(0, 0); // primo frame subito (e unico nei test, dove rAF è uno stub)
  if (typeof requestAnimationFrame !== 'function') return;
  /* camminata sul posto: stesso ritmo del gioco (2 frame + bob di 1px) */
  const step = (t) => {
    if (!pc.isConnected) return; // canvas rimossa (rerender/chiusura): il loop muore da solo
    const fr = Math.floor(t / 140) % 2;
    paint(fr, fr === 1 ? -1 : 0);
    prevRaf = requestAnimationFrame(step);
  };
  prevRaf = requestAnimationFrame(step);
}
/* sezione cappello: forme intercambiabili + colori, ultimo quadratino ✕ = senza cappello */
function hatSection(styles) {
  let h = `<div class="bighead">${lookLabel('hat')}</div>`;
  h += styleRow('hatStyle', styles || hatStylesAvail());
  h += `<div class="swrow">` + LOOKS.hat.map(c =>
    `<button class="sw${S.look.hat === c && S.look.hatStyle !== 'none' ? ' on' : ''}" data-field="hat" data-v="${c}" style="background:${c}"></button>`).join('') +
    `<button class="sw swx${S.look.hatStyle === 'none' ? ' on' : ''}" id="hatOff" title="Senza cappello">✕</button></div>`;
  return h;
}
/* togliere il cappello è gratis (in sartoria resta anteprima fino alla conferma) */
function wireHatOff(rerender) {
  const ho = document.getElementById('hatOff');
  if (ho) ho.onclick = () => {
    if (S.look.hatStyle === 'none') return;
    S.look.hatStyle = 'none'; applyLook();
    if (!lookOrig) save();     // editor iniziale: subito; negozio: anteprima
    rerender();
  };
}
function swatchRow(field, colors) {
  return `<div class="swrow">` + colors.map(c =>
    `<button class="sw${S.look[field] === c ? ' on' : ''}" data-field="${field}" data-v="${c}" style="background:${c}"></button>`).join('') + `</div>`;
}
/* riga di stili: quelli non posseduti (premium/tematici) mostrano ✨prezzo e sono provabili */
function styleRow(field, styles) {
  const kind = field === 'hatStyle' ? 'hat' : 'hair';
  return `<div class="swrow">` + styles.map(st => {
    const owned = kind === 'hat' ? hatOwned(st.id) : hairOwned(st.id);
    const on = S.look[field] === st.id;
    const label = field === 'hatStyle' ? hatLabel(st.id) : hairLabel(st.id);
    const badge = owned ? '' : ` <span class="lockp">✨${cosmeticCost(kind, st.id)}</span>`;
    return `<button class="btn ghost${on ? ' onbtn' : ''}${owned ? '' : ' locked'}" data-field="${field}" data-v="${st.id}">${label}${badge}</button>`;
  }).join('') + `</div>`;
}
/* posseduto = base OPPURE già sbloccato */
function hatOwned(id) { return HAT_STYLES.some(s => s.id === id) || S.unlocked.hats.includes(id); }
function hairOwned(id) { return HAIR_STYLES.some(s => s.id === id) || S.unlocked.hairs.includes(id); }
/* prezzo di sblocco: premium dal registro, tematici di zona = SERVICE_COST × 3 */
function cosmeticCost(kind, id) { return isDebug() ? 0 : (PREMIUM_HAT_COST[id] != null ? PREMIUM_HAT_COST[id] : SERVICE_COST * 3); }
/* opzioni BLOCCATE provabili qui: tematico di zona (nel negozio di quella zona) + tutti i premium (in Sartoria) */
function lockedHatOpts() {
  const z = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS)), zc = ZONE_COSMETICS[z.id], out = [];
  if (zc && zc.hat && !S.unlocked.hats.includes(zc.hat)) out.push(zc.hat);
  for (const p of PREMIUM_HATS) if (!S.unlocked.hats.includes(p.id)) out.push(p.id);
  return out;
}
function lockedHairOpts() {
  const z = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS)), zc = ZONE_COSMETICS[z.id], out = [];
  if (zc && zc.hair && !S.unlocked.hairs.includes(zc.hair)) out.push(zc.hair);
  return out;
}
/* stili mostrati = posseduti (base + sbloccati che ESISTONO ancora) + bloccati provabili */
function hairStylesAvail() { return HAIR_STYLES.concat(S.unlocked.hairs.filter(id => id in HAIRS).map(id => ({ id }))).concat(lockedHairOpts().map(id => ({ id }))); }
function hatStylesAvail() { return HAT_STYLES.concat(S.unlocked.hats.filter(id => id in HATS).map(id => ({ id }))).concat(lockedHatOpts().map(id => ({ id }))); }
/* PROVA LIBERA + CONFERMA: si prova tutto gratis; alla conferma si paga SERVICE_COST per campo
   cambiato + il prezzo di SBLOCCO di eventuali cosmetici premium/tematici indossati. */
let lookOrig = null;
function beginLook() { if (!lookOrig) lookOrig = { ...S.look }; }
export function revertLook() { if (lookOrig) { S.look = { ...lookOrig }; applyLook(); lookOrig = null; } }
/* campi cambiati DA PAGARE: diversi dall'originale, escluso "togliere il cappello" (gratis) */
export function lookPaidFields(orig, cur, fields) { return fields.filter(f => cur[f] !== orig[f] && !(f === 'hatStyle' && cur[f] === 'none')); }
function changedPaid(fields) { return lookPaidFields(lookOrig, S.look, fields); }
/* cosmetici bloccati attualmente INDOSSATI → da sbloccare alla conferma */
function pendingUnlocks() {
  const out = [], hs = S.look.hatStyle, hr = S.look.hairStyle;
  if (hs && hs !== 'none' && !hatOwned(hs)) out.push({ kind: 'hat', id: hs, cost: cosmeticCost('hat', hs) });
  if (hr && !hairOwned(hr)) out.push({ kind: 'hair', id: hr, cost: cosmeticCost('hair', hr) });
  return out;
}
/* costo totale = servizio (campi cambiati, esclusi quelli in sblocco) + prezzi di sblocco */
function lookCost(fields) {
  const pend = pendingUnlocks();
  const pf = new Set(pend.map(p => p.kind === 'hat' ? 'hatStyle' : 'hairStyle'));
  const changed = changedPaid(fields).filter(f => !pf.has(f));
  const service = isDebug() ? 0 : changed.length * SERVICE_COST;
  const unlock = pend.reduce((a, p) => a + p.cost, 0);
  return { pend, changed, total: service + unlock };
}
function confirmLook(fields, rerender) {
  const { total, pend } = lookCost(fields);
  if (S.coins < total && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + total); return; }
  if (!isDebug()) S.coins -= total;
  for (const p of pend) { const arr = p.kind === 'hat' ? S.unlocked.hats : S.unlocked.hairs; if (!arr.includes(p.id)) arr.push(p.id); }
  lookOrig = { ...S.look }; save(); updateHUD();
  toast(pend.length ? '✨ ' + tr('Sbloccato! ', 'Unlocked! ') + '🪙 ' + total : (total ? tr('Applicato per 🪙 ', 'Applied for 🪙 ') + total : tr('Fatto!', 'Done!')));
  rerender();
}
/* free=true → editor iniziale (definitivo e gratis); altrimenti PREVIEW (nessun addebito finché non confermi) */
function wireLook(free, rerender) {
  mBody.querySelectorAll('[data-field]').forEach(b => b.onclick = () => {
    const f = b.dataset.field, v = b.dataset.v;
    if (S.look[f] === v && !(f === 'hat' && S.look.hatStyle === 'none')) return;
    if (f === 'hat' && S.look.hatStyle === 'none') S.look.hatStyle = 'explorer'; // scegliere un colore lo rimette
    S.look[f] = v; applyLook();
    if (free) save();          // editor: subito definitivo
    rerender();                // negozio: solo anteprima
  });
}
/* barra conferma: mostra il totale (servizio + sblocchi premium/tematici) */
function confirmBar(fields) {
  const { total, changed, pend } = lookOrig ? lookCost(fields) : { total: 0, changed: [], pend: [] };
  const n = changed.length + pend.length;
  const pendTxt = pend.length ? ' · ' + tr('sblocco', 'unlock') + ' ' + pend.map(p => (p.kind === 'hat' ? hatLabel(p.id) : hairLabel(p.id))).join(', ') : '';
  return `<div class="row" style="position:sticky;bottom:0;background:#e7d9b6;margin-top:10px">
    <div class="nm">${n ? tr('Totale', 'Total') + ': 🪙 ' + total + pendTxt : tr('Prova pure: gratis finché non confermi', 'Try freely: free until you confirm')}</div>
    <div class="rt"><button class="btn ghost" id="lookCancel">${tr('Annulla', 'Cancel')}</button>
      <button class="btn amber" id="lookOk" ${n ? '' : 'disabled'}>${tr('Conferma', 'Confirm')}</button></div></div>`;
}
function wireConfirm(fields, rerender) {
  const ok = document.getElementById('lookOk'); if (ok) ok.onclick = () => confirmLook(fields, rerender);
  const cc = document.getElementById('lookCancel'); if (cc) cc.onclick = () => { revertLook(); closeModal(); };
}
function renderBarber() {
  beginLook();
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Prova tutti i tagli che vuoi: paghi 🪙 ', 'Try any haircut you like: pay 🪙 ')}${SERVICE_COST} ${tr('a modifica solo alla conferma. I tagli ✨ tematici si sbloccano pagando. (Anteprima senza cappello)', 'per change only on confirm. ✨ themed cuts unlock on payment. (Preview without hat)')}</div>`;
  h += previewHtml();
  h += `<div class="bighead">${tr('Taglio', 'Haircut')}</div>` + styleRow('hairStyle', hairStylesAvail());
  h += `<div class="bighead">${tr('Colore', 'Color')}</div>` + swatchRow('hairColor', HAIR_COLORS);
  h += confirmBar(['hairStyle', 'hairColor']);
  mBody.innerHTML = withIcons(h); wireLook(false, renderBarber); wireConfirm(['hairStyle', 'hairColor'], renderBarber); drawPreview(true);
}
function renderTailor() {
  beginLook();
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Prova quello che vuoi: paghi 🪙 ', 'Try anything you like: pay 🪙 ')}${SERVICE_COST} ${tr('a capo solo alla conferma. I cappelli ✨ speciali si sbloccano pagando. Togliere il cappello (✕) è gratis.', 'per item only on confirm. ✨ special hats unlock on payment. Removing the hat (✕) is free.')}</div>`;
  h += previewHtml();
  h += hatSection();
  for (const k of ['shirt', 'pants']) h += `<div class="bighead">${lookLabel(k)}</div>` + swatchRow(k, LOOKS[k]);
  h += confirmBar(['hatStyle', 'hat', 'shirt', 'pants']);
  mBody.innerHTML = withIcons(h); wireLook(false, renderTailor); wireHatOff(renderTailor); wireConfirm(['hatStyle', 'hat', 'shirt', 'pants'], renderTailor); drawPreview();
}

/* ---------- editor iniziale (prima partita, gratis) ---------- */
/* look totalmente casuale: pesca da ogni set (cappello anche 'none') */
function randomLook() {
  const r = a => a[Math.floor(Math.random() * a.length)];
  return {
    hat: r(LOOKS.hat), shirt: r(LOOKS.shirt), pants: r(LOOKS.pants), skin: r(LOOKS.skin),
    hairStyle: r(HAIR_STYLES).id, hairColor: r(HAIR_COLORS),
    hatStyle: r(HAT_STYLES.concat([{ id: 'none' }])).id, eyeColor: r(EYE_COLORS),
  };
}
export function openEditor(onDone) {
  modal.classList.add('opaque'); // sfondo nero: la città non si vede dietro l'editor
  if (!S.name) S.name = randomName();                         // parte con un nome a caso, modificabile
  mTitle.innerHTML = withIcons('🎨 ' + tr('Crea il tuo Digsy', 'Create your Digsy'));
  /* anteprima, nome e "personaggio casuale" nella STESSA colonna: bordi allineati */
  let h = `<div class="edcol"><canvas id="prevCv" width="60" height="22" class="prev"></canvas>`;
  h += `<div class="bighead">${tr('Nome', 'Name')}</div>`;
  h += `<input id="pgname" class="nameinput" maxlength="14" value="${(S.name || '').replace(/["<>&]/g, '')}" placeholder="${tr('Nome', 'Name')}">`;
  h += `<button class="btn amber wide" id="rndAll">🎲 ${tr('Personaggio casuale', 'Random character')}</button></div>`;
  h += hatSection(HAT_STYLES); // creazione PG: SOLO cappelli base (i premium si comprano dopo)
  for (const k of ['shirt', 'pants', 'skin']) h += `<div class="bighead">${lookLabel(k)}</div>` + swatchRow(k, LOOKS[k]);
  h += `<div class="bighead">${tr('Occhi', 'Eyes')}</div>` + swatchRow('eyeColor', EYE_COLORS);
  h += `<div class="bighead">${tr('Taglio', 'Haircut')}</div>` + styleRow('hairStyle', HAIR_STYLES);
  h += `<div class="bighead">${tr('Colore capelli', 'Hair color')}</div>` + swatchRow('hairColor', HAIR_COLORS);
  h += `<div class="center" style="margin-top:10px"><button class="btn amber" id="lookDone" style="font-size:15px">⛏️ ${tr("Inizia l'avventura!", 'Start the adventure!')}</button></div>`;
  mBody.innerHTML = withIcons(h);
  const rerender = () => openEditor(onDone);
  wireLook(true, rerender); wireHatOff(rerender); drawPreview();
  const nameIn = document.getElementById('pgname');
  if (nameIn) nameIn.oninput = () => { S.name = nameIn.value.slice(0, 14); };
  const rndAll = document.getElementById('rndAll');
  /* applyLook() è OBBLIGATORIO dopo aver sostituito S.look: gli sprite leggono la palette
     PAL, non S.look. Senza, cambiavano solo le FORME (taglio, cappello) e i colori restavano
     quelli di prima: l'anteprima mostrava una pelle e in gioco ne compariva un'altra. */
  if (rndAll) rndAll.onclick = () => { S.look = randomLook(); applyLook(); rerender(); };
  document.getElementById('lookDone').onclick = () => {
    if (nameIn && nameIn.value.trim()) S.name = nameIn.value.trim().slice(0, 14);
    if (!S.name) S.name = randomName();
    S.lookDone = true; save(); lockModal(false); closeModal();
    if (onDone) onDone();
  };
  openModal();
  lockModal(true);   // dopo openModal (che rilascia il blocco): si esce solo da "Inizia l'avventura"
}
