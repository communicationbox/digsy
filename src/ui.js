/* UI DOM: HUD, prompt, toast, modale edifici, zaino, editor/barbiere/sartoria */
import { TS, furnSize, furnPlace, furnIsSolid, SPECIES, ALL_SPECIES, MUSEUM_ZONES, spById, ptById, PARTS, RAR, ZONES, zonePools, SERVICE_COST, LOOKS, LOOK_LABELS, HAIR_STYLES, HAIR_COLORS, EYE_COLORS, HAT_STYLES, SHIRT_STYLES, PANTS_STYLES, ZONE_COSMETICS, PREMIUM_HATS, PREMIUM_HAT_COST, NAMES, randomName, FURN_SETS, FURN_BY_ID, PEDESTAL_ID } from './data.js';
import { zoneAt } from './regions.js';
import { S, P, save, dugSet, isCheatLock } from './state.js';
import { baseTerrain, diggable, townForTile, townInfo } from './world.js';
import { ensureQuests, boardOffers, acceptQuest, deliverQuest, abandonQuest, questText, questRewardText, questHave, canComplete, isActive, isDone, activeQuests, giverName, MAX_ACTIVE } from './quests.js';
import { playSfx } from './audio.js';
import { companionCandidates, setCompanion, clearCompanion, isCurrentCompanion, companionType, companionPowers, companionSpec, COMP } from './companion.js';
import { playerLevel, playerXp, xpToNext, digDurationMul, rareBonus } from './progress.js';
import { TRACKS, checkAchievements, trackLabel, trackGoal, trackTier, trophyTier, trophyCount, nextThreshold, tierLabel, tierCol, TIER_TOTAL, TIERS } from './achievements.js';
import { weatherAt, weatherLabel } from './weather.js';
import { marketPrice, marketLabel } from './market.js';
import { egg as breedEgg, eggReady, eggDaysLeft, foodPreview, mutationChance, bumpChance, previewOffspring, canLay, layEgg, hatchEgg, EGG_FOOD, EGG_ENERGY, EGG_DAYS } from './breeding.js';
import { applyLook, drawHero, HATS, HAIRS } from './sprites.js';
import { nearbyWonder, useWonder, bagFull, nearbyHarvest, companionPlayable, nearbyBoneSite, boneSiteProgress, nearbyReturnPortal } from './gameplay.js';
import { sellItem, sellAll, sellGood, sellAllGoods, goodName, restInn, sleepAtHome, canSleep, nearbyLockedGate, buyEnergy, eatSnack, snackPrice, snacksLeftToday, nearbyDoor, nearbyFountain, nearbySite, nearbyPickup, nearbyGround, nearbyDrop, nearbyWreck, nearbyBoard, nearbyYard, wreckRemaining, onBoat, gainXp, buyBag, bagCap, bagLevel, fossilCount, nextBagCost, BAG_CAPS, discardToGround, siteRemaining, awakenReady, awakenSpecies, museumDeposit, museumCollect, museumJobReady, shipToMuseum, MAIL_COST, buyMap, buyDna, dnaOf, buyTool, buyTeleport, useTeleport, fuseDupes, gearActive, toggleGear, compassActive, toggleCompass, companionRides, isMounted, toggleMount, debugSpawnAll, dirTo, tossLuck, MAP_COST, MAP_DIST, DNA_COST, TOOL_COST, TELEPORT_COST } from './gameplay.js';
import { darknessAt, seasonOf, SEASONS, isNight } from './daynight.js';
import { fireflyInReach } from './firefly.js';
import { INT, nearNpc, nearCase, nearMentorInt, nearExit, nearLockedGate, houseFloorHere, nudgeOffFurniture, interiorLeave, npcName, sayNpc } from './interior.js';
import { roomPrice, tryUnlockRoom, buyFurniture, furnLevelLock, ownedUnplaced, ownedBackdrops, placeTarget, canPlace, roomComfort, restFreeFor, COMFORT_MAX, pickUpFurniture, tryPlaceFurniture, removeFurnitureAt, furnAt, pedestalCandidates, assignPedestal, ensureHouseState, isHolding, holdItem, cancelHold, rotateHold, applyBackdrop, clearBackdrop, roomPaper, roomGround } from './house.js';
import { drawFurnThumb } from './furnArt.js';
import { letterTitle, letterBody, hasLetter, allLetters, roomsDone, roomsTotal, nextRoom } from './letters.js';
import { goalTitle, goalLine, goalHint, goalEnd, alive, aliveTotal, toNextMilestone, milestoneReached } from './goal.js';
import { isExplored, revealArea, exploredTiles } from './map.js';
import { TIPS, TIP_IDS, tipSeen, markTip, tipTitle, tipText, tipsSeenCount } from './tips.js';
import { STEP_IDS, tutActive, tutIndex, tutStepId, tutChecked, tutProgress, tutTitle, tutHint, tutSkip, tutRestart, tutDone, tutSkipped } from './tutorial.js';
import { landmarkForCell, LCELL } from './world.js';
import { drawWonder } from './wonderart.js';
import { wonderName, wonderDesc, wonderGrandpa, wonderPower, wonderCd, wonderStatusText, wonderReadyIn, markWonderUsed, archList, travelToArch, isDiscovered, WONDERS } from './wonders.js';
import { CAVE, caveNodeReach, exitCave, nearCaveExit } from './cave.js';
import { baseSpec, buildVoxels, buildFleshVoxels, partVoxels, composedPartsVox, shadeHex, BP } from './bones.js';
import { isDebug } from './debug.js';
import { tipsOn, joystickOn, leftHanded } from './prefs.js';
import { fusibleGroups, nextRarity } from './fuse.js';
import { projectVox } from './voxview.js';
import { openMap, closeMap, isMapOpen, revealMap, mapZoomBy, mapReset } from './mapui.js';
export { openMap, closeMap, isMapOpen, revealMap };
import { openBook, closeBook, isBookOpen, bookFlip, descFor, disposeViews, drawVoxel2D, mountSpecies3D, litForSpecies } from './bookui.js';
export { openBook, closeBook, isBookOpen, bookFlip, descFor };
import { openPrepare, closePrepare, isPrepOpen, prepCandidate } from './prepui.js';
export { openPrepare, closePrepare, isPrepOpen, prepCandidate };
import { nearestSocket, gradeForTime, SKIP_GRADE, SOCKETS, partLabel } from './skeletonfit.js';
import { offerFor as cmOfferFor, active as cmActive, accept as cmAccept, deliver as cmDeliver,
  have as cmHave, canDeliver as cmCanDeliver, text as cmText, rewardText as cmRewardText,
  dueText as cmDueText, pruneExpired as cmPrune, DURATION as DURATION_CM, rewardParts as cmRewardParts } from './commission.js';
import { icon, withIcons } from './icons.js';
import { groundPalette } from './tiles.js';
import { tr, actKey, keyHint, keys, isTouch, LANG, rarLabel, partName, zoneName, bldName, seasonName, lookLabel, hairLabel, hatLabel, shirtLabel, pantsLabel, furnLabel, roomName } from './i18n.js';

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
/* TUTORIAL: la lista degli obiettivi, ridisegnata a ogni giro d'HUD. Il testo non sta
   nell'HTML ma qui, perché deve cambiare lingua e mostrare il tasto giusto per il dispositivo
   (su un telefono il tasto E non esiste). */
/* un'icona per obiettivo: si capisce cosa fare prima di aver letto la riga */
const TUT_ICON = { pick: '🌾', shop: '🏪', dig: '🪏', museum: '🏛️' };
function syncTutorial() {
  const box = document.getElementById('tutbox'); if (!box || !box.style) return;
  if (!tutActive() || splashOpen()) { box.style.display = 'none'; return; }
  const cur = tutIndex(), id = tutStepId(), p = tutProgress();
  /* i quadratini dicono a che punto sei senza scrivere l'elenco di tutto quello che non hai
     ancora fatto: quello faceva sembrare il tutorial più lungo di quanto è */
  let h = '<div class="tut-top"><span class="tut-pips">'
    + STEP_IDS.map((sid, i) => `<i class="${tutChecked(i) ? 'ok' : i === cur ? 'on' : ''}"></i>`).join('')
    + `</span><button class="tut-skip" id="tut-skip" type="button">${tr('salta', 'skip')}</button></div>`;
  h += `<div class="tut-main"><span class="tut-ic">${TUT_ICON[id] || '📜'}</span><div>`
    + `<div class="tut-obj">${tutTitle(id)}</div><div class="tut-how">${tutHint(id)}</div></div></div>`;
  /* la barra solo quando c'è davvero qualcosa da contare: un "1 su 1" è rumore */
  if (p.need > 1) {
    const pc = Math.max(3, Math.min(100, Math.round(p.have / p.need * 100)));
    h += `<div class="tut-bar"><i style="width:${pc}%"></i><b>${p.have} / ${p.need} 🪙</b></div>`;
  }
  box.innerHTML = withIcons(h);
  box.style.display = '';
  const sk = document.getElementById('tut-skip');
  if (sk) sk.onclick = () => { tutSkip(); updateHUD(); toast('🎓 ' + tr('Tutorial saltato — lo rifai dalla Guida', 'Tutorial skipped — you can redo it from the Guide')); };
}
/* la splash copre lo schermo: sotto non deve restare acceso niente */
function splashOpen() {
  const el = (typeof document !== 'undefined' && document.getElementById) ? document.getElementById('splash') : null;
  return !!(el && el.classList && typeof el.classList.contains === 'function' && !el.classList.contains('off'));
}
/* un passo chiuso si ANNUNCIA una volta sola: la spunta da sola, in un riquadro laterale,
   passa inosservata proprio nel momento in cui il giocatore ha fatto la cosa giusta. */
export function announceTutStep() {
  updateHUD();
  if (tutDone()) { toast('🎓 ' + tr('Hai finito il tutorial. Da qui in poi decidi tu.', 'Tutorial complete. From here on it is up to you.')); playSfx('found'); return; }
  const id = tutStepId(); if (!id) return;
  toast('✓ ' + tr('Fatto. Ora: ', 'Done. Now: ') + tutTitle(id)); playSfx('found');
  /* il foglio scatta una volta: senza, l'obiettivo cambia in silenzio in un angolo dello
     schermo proprio nell'istante in cui il giocatore ha fatto la cosa giusta */
  const box = document.getElementById('tutbox');
  if (box && box.classList) {
    box.classList.remove('pop');
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => box.classList.add('pop'));
    else box.classList.add('pop');
  }
}

export function updateHUD() {
  const dbg = isDebug();
  syncModalCoins();
  syncTouchControls();
  syncTutorial();
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
    checkAchievements((t, tier) => {
      const medal = tierLabel(tier);
      let extra = `<div class="sub" style="margin-top:4px">${trackGoal(t)}: ${t.tiers[tier - 1]}</div>`;
      /* premi cosmetici: ORO sblocca il cappello-trofeo, PLATINO lo rende glitter + accende l'aura dorata */
      if (tier >= 3 && t.reward) {
        if (!S.unlocked.hats.includes(t.reward)) S.unlocked.hats.push(t.reward);
        if (tier === 4) { if (!S.glitterHats) S.glitterHats = []; if (!S.glitterHats.includes(t.reward)) S.glitterHats.push(t.reward); }
        extra = `<div class="sub" style="margin-top:4px">${tier === 4 ? '✨ ' + tr('Cappello PLATINO glitterato + AURA dorata!', 'PLATINUM glitter hat + golden AURA!') : '🎁 ' + tr('Nuovo cappello: ', 'New hat: ') + hatLabel(t.reward)}</div>`;
      }
      toast('🏆 ' + medal + ' · ' + trackLabel(t)); playSfx('fanfare');
      showBanner(`🏆 ${trackLabel(t)} — <b style="color:${tierCol(tier)}">${medal}</b>${extra}`, 2400);
    });
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
  if (CAVE.active) exitCave(); else if (INT.active) interiorLeave();
  syncExitBtn();
};
export function syncExitBtn() {
  if (!exitBtn || !exitBtn.classList) return;
  const show = (INT.active && nearExit()) || (CAVE.active && nearCaveExit());
  exitBtn.classList.toggle('on', !!show);
  if (show) exitBtn.innerHTML = withIcons('🚪 ' + tr('Esci', 'Leave'));
}
/* ARREDO IN MANO: Ruota/Annulla — un mobile appena raccolto non ha un tasto dedicato (su
   mobile non c'è nemmeno la tastiera), quindi due bottoni a schermo come per l'uscita. */
const furnHold = document.getElementById('furnhold');
const furnRotBtn = document.getElementById('furnrotbtn');
const furnCancelBtn = document.getElementById('furncancelbtn');
const furnHoldPv = document.getElementById('furnholdpv');
/* niente ghost nel mondo: si piazza SEMPRE sulla casella dei propri piedi, e un'anteprima lì
   finiva dietro al personaggio (quasi invisibile) o, prima della scala giusta, spuntava sopra
   la testa — segnalato con Playwright ("disassamento verticale"). L'anteprima vera vive qui,
   ridisegnata a ogni rotazione. */
function syncFurnHoldPreview() {
  if (!furnHoldPv || !furnHoldPv.getContext) return;
  const c2 = furnHoldPv.getContext('2d'); if (!c2) return;
  c2.clearRect(0, 0, furnHoldPv.width, furnHoldPv.height);
  const hv = isHolding() && holdItem(); if (!hv) return;
  /* è lo STESSO disegno che finirà nella stanza, scalato per stare nel riquadro: un'anteprima
     "simile ma non uguale" è il modo sicuro per far divergere le due (è già successo). */
  try { drawFurnThumb(furnHoldPv, hv.itemId); } catch (e) { /* stub nei test */ }
}
if (furnRotBtn) furnRotBtn.onclick = () => { playSfx('ui'); rotateHold(); syncFurnHoldPreview(); };
if (furnCancelBtn) furnCancelBtn.onclick = () => {
  playSfx('ui'); cancelHold();
  toast('🎨 ' + tr('Torna nel vassoio', 'Back in your tray'));
};
function syncFurnHold() {
  if (!furnHold || !furnHold.classList) return;
  const on = INT.active && isHolding();
  if (on && !furnHold.classList.contains('on')) syncFurnHoldPreview(); // appena raccolto: disegna subito
  furnHold.classList.toggle('on', on);
}
export function updatePrompt() {
  syncExitBtn();
  syncFurnHold();
  if (isModalOpen()) { setPrompt(null); return; }
  if (CAVE.active) {
    setPrompt(caveNodeReach() ? withIcons(actKey() + ' ' + tr('Scava il giacimento ⛏️', 'Dig the deposit ⛏️')) : null);
    return;
  }
  if (INT.active) {
    if (nearbyReturnPortal()) { setPrompt(withIcons(actKey() + ' ' + tr('Torna indietro 🌀', 'Teleport back 🌀'))); return; }
    if (nearMentorInt()) { setPrompt(withIcons(actKey() + ' ' + tr('Parla col Maestro Scavatore 🎓', 'Talk to the Master Digger 🎓'))); return; }
    const nc = nearCase();
    if (nc) { setPrompt(withIcons((S.codex.includes(nc.sp.id) ? nc.sp.name : '???') + ' · ' + nc.n + '/' + PARTS.length + (nc.n === PARTS.length ? ' 💫' : ''))); return; }
    if (nearNpc()) {
      if (!INT.greeted && INT.b) { sayGreet(INT.b.type); INT.greeted = true; } // saluto (una frase a caso) avvicinandosi
      setPrompt(withIcons(actKey() + ' ' + tr('Parla con ', 'Talk to ') + npcName(INT.b.type))); return;
    }
    { const gate = nearLockedGate(); if (gate != null) { setPrompt(withIcons(actKey() + ' ' + roomName(gate) + ' 🔒 (🪙 ' + roomPrice(gate) + ')')); return; } }
    { // casa: arreda/raccogli/piazza la cella sotto i piedi (M3-M4)
      const cell = houseFloorHere();
      if (cell) {
        if (isHolding()) {
          /* "Cella occupata" è la risposta sbagliata per un quadro: quello va SULLA parete,
             e la casella sotto può benissimo essere piena. Chiede a chi lo sa (house.js). */
          const hv = holdItem();
          const t2 = hv && placeTarget(cell.gx, cell.gy, hv.itemId);
          const ok = !!t2 && canPlace(cell.room, t2.gx, t2.gy, hv.itemId, hv.rot || 0);
          setPrompt(withIcons(ok ? actKey() + ' ' + (furnPlace(hv.itemId) === 'wall' ? tr('Appendi qui 🎨', 'Hang it here 🎨') : tr('Piazza qui 🎨', 'Place here 🎨'))
            : furnPlace(hv.itemId) === 'wall' ? tr('I quadri si appendono al muro di fondo', 'Wall pieces hang on the back wall')
              : tr('Qui non ci sta', "It doesn't fit here")));
          return;
        }
        if (cell.itemId === PEDESTAL_ID) { setPrompt(withIcons(actKey() + ' ' + tr('Piedistallo 🏛️', 'Pedestal 🏛️'))); return; }
        if (cell.itemId) { setPrompt(withIcons(actKey() + ' ' + (cell.wall ? tr('Stacca ', 'Take down ') : tr('Raccogli ', 'Pick up ')) + furnLabel(cell.itemId) + ' 🎨')); return; }
        if (cell.unlocked) { setPrompt(withIcons(actKey() + ' ' + tr('Arreda 🎨', 'Furnish 🎨'))); return; }
      }
    }
    setPrompt(null); return;
  }
  /* "GIOCA COL COMPAGNO": il prompt deve dire la VERITÀ su cosa fa E in questo istante — con
     un solo tasto per tutto, un E che non corrisponde a niente (o corrisponde a qualcos'altro)
     è quello che confonde di più. Durante il round E ha SEMPRE la priorità assoluta (act() la
     controlla per prima), quindi anche qui viene prima di ogni altro prompt. */
  if (COMP.play) {
    setPrompt(COMP.play.phase === 'catch'
      ? withIcons(actKey() + ' ' + tr('Prendilo AL VOLO! 🐾', 'Catch it NOW! 🐾'))
      : null); // lancio/inseguimento/ritorno: E non fa niente adesso, meglio tacere che mentire
    return;
  }
  { /* MERAVIGLIA: il prompt dice sempre se il dono è pronto o quanto deve riposare */
    const w = nearbyWonder();
    if (w) {
      const st2 = wonderStatusText(w.type, w.x, w.y);
      setPrompt(withIcons(actKey() + ' ' + wonderName(w.type) + ' ✨ (' + st2 + ')')); return;
    }
  }
  /* SCHELETRO SEPOLTO: dice SUBITO di chi è (il traguardo è chiaro, non una sorpresa scavata
     alla cieca) e a che punto sei — così un sito a metà si riconosce a colpo d'occhio */
  const bs = nearbyBoneSite();
  if (bs) {
    const sp = spById[bs.site.sp];
    setPrompt(withIcons(actKey() + ' ' + tr('Scava: ', 'Dig: ') + partName(bs.part) + tr(' di ', ' of ') + (sp ? sp.name : '?') + ' 🦴 (' + boneSiteProgress(bs.site) + '/5)'));
    return;
  }
  const st = nearbySite();
  if (st) {
    const rem = siteRemaining(st);
    setPrompt(withIcons(rem > 0 ? actKey() + ' ' + tr('Scava al sito ⛏️ (', 'Dig at the site ⛏️ (') + rem + tr(' rimasti)', ' left)') : tr('Sito esaurito', 'Site exhausted')));
    return;
  }
  if (nearbyBoard()) { setPrompt(withIcons(actKey() + ' ' + tr('Bacheca delle missioni 📋', 'Mission board 📋'))); return; }
  /* CANCELLO CHIUSO A CHIAVE: il prompt mancava del tutto, e davanti al cancello si leggeva
     "Compagno e cortile" — cioè l'azione che il tasto NON fa lì (act() sblocca il cancello,
     che ha la precedenza). Su mobile, dove il tasto non si può nemmeno intuire, voleva dire
     restare fuori da casa propria senza sapere come rientrare (segnalato). */
  if (nearbyLockedGate()) { setPrompt(withIcons(actKey() + ' ' + tr('Riapri il cancello 🔓', 'Reopen the gate 🔓'))); return; }
  /* già ne hai uno pronto? nel cortile si GIOCA invece di riaprire il selettore (stessa
     priorità di act(): companionPlayable() prima di nearbyYard()) */
  if (companionPlayable()) { setPrompt(withIcons(actKey() + ' ' + tr('Gioca col compagno 🐾', 'Play with your companion 🐾'))); return; }
  if (nearbyYard()) { setPrompt(withIcons(actKey() + ' ' + tr('Compagno e cortile 🐾', 'Companion & yard 🐾'))); return; }
  if (nearbyDrop()) { setPrompt(withIcons(actKey() + ' ' + tr('Raccogli da terra ✨', 'Pick up from the ground ✨'))); return; } // il fossile caduto viene prima della fontana
  if (nearbyFountain()) { setPrompt(withIcons(actKey() + ' ' + tr('Lancia 1 🪙 nella fontana', 'Toss 1 🪙 into the fountain'))); return; }
  if (onBoat() && nearbyWreck()) { const rem = wreckRemaining(nearbyWreck()); setPrompt(withIcons(rem > 0 ? actKey() + ' ' + tr('Fruga nel relitto 🚢 (', 'Search the wreck 🚢 (') + rem + tr(' rimasti)', ' left)') : tr('Relitto ripulito', 'Wreck picked clean'))); return; }
  if (nearbyGround()) {
    const h = nearbyHarvest();
    setPrompt(withIcons(actKey() + ' ' + (h ? tr('Raccogli ', 'Pick ') + goodName(h.id) + ' ✨' : tr('Raccogli ✨', 'Pick up ✨')))); return;
  }
  if (fireflyInReach()) { setPrompt(withIcons(actKey() + ' ' + tr('Retina le lucciole ✨', 'Net the fireflies ✨'))); return; }
  setPrompt(null); // niente hint per lo scavo semplice
}
/* banner centrale a tutto schermo per gli eventi importanti (consegna del Libro, ecc.) */
export function showBanner(html, ms = 2600) {
  if (typeof document === 'undefined' || !document.createElement || !document.body) return;
  const b = document.createElement('div'); b.className = 'banner'; b.innerHTML = withIcons(html);
  document.body.appendChild(b);
  setTimeout(() => { if (b.classList) b.classList.add('out'); setTimeout(() => b.remove(), 400); }, ms);
}
/* I TOAST DI BENVENUTO NON CI SONO PIÙ, e la funzione resta vuota apposta (la chiama il boot).
   Erano due messaggi che scorrevano da soli nei primi due secondi: uno diceva del regalo del
   nonno, l'altro elencava i tasti. Adesso il TUTORIAL dice cosa fare, con l'obiettivo in
   chiaro e il tasto giusto per il dispositivo, e resta lì finché non l'hai fatto. Due righe
   che spariscono da sole mentre stai ancora capendo dove sei non insegnano niente: coprono
   solo il primo momento di gioco. I comandi restano nella Guida (zaino → ❔). */
export function welcomeToasts() { /* volutamente vuota: la guida d'apertura è il tutorial */ }
/* "BENTORNATO" del parco che rende (idle.js): un toast, non un banner — è un piccolo regalo,
   non un evento di trama. Chiamato dal boot SOLO se il conto (fatto lì) ha dato qualcosa. */
export function showIdleWelcome(r) {
  if (!r) return;
  const bits = [];
  if (r.coins > 0) bits.push('🪙 ' + r.coins);
  if (r.dnaSp) { const sp = spById[r.dnaSp]; if (sp) bits.push('🧬 ' + tr('mezza fialetta di ', 'half a vial of ') + sp.name); }
  if (!bits.length) return;
  toast('🐾 ' + tr('Bentornato! Il parco ha reso: ', 'Welcome back! The park earned: ') + bits.join(' · '));
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
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Le richieste del giorno degli abitanti. Ne puoi tenere ', "Today's requests from the townsfolk. You can hold ")}${MAX_ACTIVE}${tr(' alla volta; scadono a fine giornata. Puoi lasciarne una per liberare uno slot.', " at a time; they expire at day's end. You can drop one to free a slot.")}</div>`;
  const act = activeQuests();
  if (act.length) {
    h += `<div class="bighead">${tr('Le tue missioni', 'Your missions')} (${act.length}/${MAX_ACTIVE})</div>`;
    for (const q of act) {
      const have = questHave(q), ok = canComplete(q);
      h += `<div class="row"><span class="em">📋</span><div><div class="nm">${giverName(q.giver)}: ${questText(q)}</div><div class="sub">${have}/${q.n} · ${tr('premio', 'reward')} ${questRewardText(q)}</div></div><div class="rt"><button class="btn ghost" data-abandon="${q.qid}" title="${tr('Libera lo slot; i reperti restano tuoi', 'Frees the slot; your finds stay yours')}">${tr('Lascia', 'Drop')}</button> <button class="btn ${ok ? 'amber' : 'ghost'}" ${ok ? '' : 'disabled'} data-deliver="${q.qid}">${tr('Consegna', 'Deliver')}</button></div></div>`;
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
    h += `<div class="row"><span class="em">📌</span><div><div class="nm">${giverName(q.giver)}: ${questText(q)}</div><div class="sub">${tr('premio', 'reward')} ${questRewardText(q)}${badge ? ' · ' + badge : ''}</div></div><div class="rt">${(active || done) ? '' : `<button class="btn amber" data-accept="${q.qid}">${tr('Accetta', 'Accept')}</button>`}</div></div>`;
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
    if (q) { playSfx('coin'); save(); updateHUD(); toast('✅ ' + tr('Consegnata! ', 'Delivered! ') + questRewardText(q)); }
    openQuestBoard();
  });
  mBody.querySelectorAll('[data-abandon]').forEach(b => b.onclick = () => {
    if (abandonQuest(b.dataset.abandon)) { save(); updateHUD(); toast('📋 ' + tr('Missione lasciata', 'Mission dropped')); }
    openQuestBoard();
  });
}
/* CASSETTA DELLA POSTA (borghi e paesi): spedisci i grezzi al Museo a pagamento, pronti domani */
export function openMailbox() {
  const n = (S.raw || []).length, cost = n * MAIL_COST, busy = !!S.museumJob;
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Spedisci i reperti grezzi al Museo senza andarci: 🪙 ', 'Ship your raw finds to the Museum without going there: 🪙 ') + MAIL_COST + tr(" l'uno, pronti DOMANI. Poi li ritiri al Museo (doppioni indietro, pezzi nuovi in teca).", ' each, ready TOMORROW. Then collect them at the Museum (duplicates back, new pieces on display).')}</div>`;
  if (!n) h += `<div class="row"><span class="em">📭</span><div><div class="nm">${tr('Non hai reperti grezzi', 'No raw finds')}</div><div class="sub">${tr('Scava, poi torna a spedire.', 'Dig first, then come back to ship.')}</div></div></div>`;
  else {
    const can = S.coins >= cost || isDebug();
    h += `<div class="row"><span class="em">📦</span><div><div class="nm">${n} ${tr('reperti grezzi', 'raw finds')}</div><div class="sub">${tr('costo', 'cost')} 🪙 ${cost} · ${tr('pronti domani', 'ready tomorrow')}</div></div><div class="rt"><button class="btn ${can ? 'amber' : 'ghost'}" ${can ? '' : 'disabled'} data-ship="1">${tr('Spedisci', 'Ship')} 🪙 ${cost}</button></div></div>`;
    if (busy) h += `<div class="muted center" style="margin-top:6px">${tr('Si aggiungono al lotto già in lavorazione.', "They'll be added to the batch already in progress.")}</div>`;
    if (!can) h += `<div class="muted center" style="margin-top:6px">${tr('Servono 🪙 ', 'You need 🪙 ') + cost}</div>`;
  }
  mTitle.innerHTML = withIcons('📮 ' + tr('Cassetta della posta', 'Mailbox'));
  mBody.innerHTML = withIcons(h); openModal();
  mBody.querySelectorAll('[data-ship]').forEach(b => b.onclick = () => { if (shipToMuseum()) closeModal(); else openMailbox(); });
}
/* CASA — porta a lucchetto: modale di conferma prima di spendere (M2). Stesso schema della
   cassetta della posta: prezzo, bottone disabilitato se mancano i fondi. */
export function openRoomLock(roomId) {
  const price = roomPrice(roomId), can = S.coins >= price || isDebug();
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Sblocca questa stanza per sempre: potrai arredarla come vuoi.', 'Unlock this room for good: you will be able to furnish it however you like.')}</div>`;
  h += `<div class="row"><span class="em">🔒</span><div><div class="nm">${roomName(roomId)}</div><div class="sub">${tr('costo', 'cost')} 🪙 ${price}</div></div><div class="rt"><button class="btn ${can ? 'amber' : 'ghost'}" ${can ? '' : 'disabled'} data-unlock="1">${tr('Sblocca', 'Unlock')} 🪙 ${price}</button></div></div>`;
  if (!can) h += `<div class="muted center" style="margin-top:6px">${tr('Servono 🪙 ', 'You need 🪙 ') + price}</div>`;
  mTitle.innerHTML = withIcons('🔒 ' + roomName(roomId));
  mBody.innerHTML = withIcons(h); openModal();
  mBody.querySelectorAll('[data-unlock]').forEach(el => el.onclick = () => { if (tryUnlockRoom(roomId)) closeModal(); else openRoomLock(roomId); });
}
/* CASA — vassoio dell'arredo (M3): pezzi comprati ma non ancora piazzati. Si apre premendo
   il tasto azione su una cella di pavimento libera (act() → houseFloorHere), un pezzo alla
   volta, niente trascinamento. */
export function openFurnitureTray(room, gx, gy) {
  const items = ownedUnplaced();
  const papers = ownedBackdrops('paper'), grounds = ownedBackdrops('ground');
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Scegli un pezzo dal vassoio da piazzare qui. I quadri si appendono stando addossati alla parete di fondo.', 'Pick a piece from your tray to place here. Wall pieces hang when you stand against the back wall.')}</div>`;
  if (!items.length) h += `<div class="center muted">${tr('Vassoio vuoto: comprane uno al Negozio, scheda Arredamento.', 'Tray empty: buy one at the Shop, Furniture tab.')}</div>`;
  else h += items.map(id => `<div class="row"><canvas class="pv" width="44" height="40" data-fpv="${id}"></canvas><div><div class="nm">${furnLabel(id)}</div><div class="sub">${furnSizeLabel(id)}</div></div><div class="rt"><button class="btn amber" data-place="${id}">${tr('Piazza qui', 'Place here')}</button></div></div>`).join('');
  /* IL FONDO DELLA STANZA sta qui e non nel mondo: carta da parati e pavimento non si posano
     su una casella, si scelgono per la stanza in cui si è — e si tolgono, perché un cambio di
     arredo dev'essere sempre annullabile. */
  if (papers.length || grounds.length) {
    h += `<div class="sp-sep"></div><div class="muted" style="margin:8px 0">${tr('Fondo della stanza', 'Room backdrop')}</div>`;
    for (const [kind, list, cur] of [['paper', papers, roomPaper(room)], ['ground', grounds, roomGround(room)]]) {
      for (const id of list) {
        const on = cur === id;
        h += `<div class="row"><canvas class="pv" width="44" height="40" data-fpv="${id}"></canvas><div><div class="nm">${furnLabel(id)}</div><div class="sub">${kind === 'paper' ? tr('carta da parati', 'wallpaper') : tr('pavimento', 'flooring')}</div></div><div class="rt"><button class="btn ghost${on ? ' onbtn' : ''}" data-bd="${on ? '' : id}" data-bdkind="${kind}">${on ? '✓ ' + tr('in uso', 'in use') : tr('Applica', 'Apply')}</button></div></div>`;
      }
    }
  }
  mTitle.innerHTML = withIcons('🎨 ' + tr('Vassoio arredo', 'Furniture tray'));
  mBody.innerHTML = withIcons(h); openModal(); hydratePv();
  mBody.querySelectorAll('[data-place]').forEach(el => el.onclick = () => { if (tryPlaceFurniture(room, gx, gy, el.dataset.place)) { nudgeOffFurniture(); closeModal(); } });
  mBody.querySelectorAll('[data-bd]').forEach(el => el.onclick = () => {
    const id = el.dataset.bd;
    if (id) applyBackdrop(room, id); else clearBackdrop(room, el.dataset.bdkind);
    openFurnitureTray(room, gx, gy);
  });
}
/* "2×2 caselle" detto in chiaro: la taglia decide dove ci sta, ed è l'informazione che manca
   quando un pezzo viene rifiutato senza spiegazione */
function furnSizeLabel(id) {
  const sz = furnSize(id, 0), place = furnPlace(id);
  if (place === 'wall') return tr('alla parete', 'on the wall');
  if (place === 'paper') return tr('carta da parati', 'wallpaper');
  if (place === 'ground') return tr('pavimento', 'flooring');
  const size = sz.w === 1 && sz.h === 1 ? tr('1 casella', '1 tile') : sz.w + '×' + sz.h + ' ' + tr('caselle', 'tiles');
  return furnIsSolid(id) ? size : size + ' · ' + tr('ci cammini sopra', 'you walk on it');
}
/* CASA — IL LETTO: ci si dorme (è la sua funzione principale) e da qui si legge quanto è
   COMODA la stanza. Il punteggio non è un numero misterioso: dice cosa lo alza e quanto vale
   la dormita, perché "arreda e vedrai" è esattamente il tipo di promessa che nessuno segue. */
export function openBed(room, gx, gy) {
  const c = roomComfort(room), gratis = restFreeFor(room);
  const LIV = [[' spoglia', ' bare'], [' accogliente', ' cosy'], [' curata', ' well kept'], [' da rivista', ' picture perfect']][c.level];
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Il tuo letto. Dormici per rifare l\'energia — e più la stanza è curata, più il riposo rende.', 'Your bed. Sleep to refill your energy — and the better kept the room, the better you rest.')}</div>`;
  h += `<div class="row"><span class="em">🛏️</span><div><div class="nm">${roomName(room)}: ${tr('comodità', 'comfort')} ${c.score}/${COMFORT_MAX} ·${tr(LIV[0], LIV[1])}</div><div class="sub">${gratis ? tr('dormendo qui le prossime ', 'sleeping here your next ') + gratis + tr(' fatiche non costano energia', ' efforts cost no energy') : tr('così com\'è, dormire rifà solo l\'energia', 'as it is, sleeping only refills energy')}</div></div></div>`;
  /* COSA MANCA, detto per nome: un punteggio senza la lista è un giudizio, non un consiglio */
  const ha = k => c.bits.some(b => b.k === k);
  const manca = [];
  if (!ha('mobili') || c.bits.find(b => b.k === 'mobili').n < 4) manca.push(tr('altri mobili (fino a 4 contano)', 'more furniture (up to 4 counts)'));
  if (!ha('tappeto')) manca.push(tr('qualcosa a terra (un tappeto)', 'something on the floor (a rug)'));
  if (!ha('parete')) manca.push(tr('qualcosa alla parete', 'something on the wall'));
  if (!ha('parato')) manca.push(tr('la carta da parati', 'wallpaper'));
  if (!ha('pavimento')) manca.push(tr('il pavimento', 'flooring'));
  if (!ha('coerenza')) manca.push(tr('pezzi tutti della stessa zona', 'pieces all from one zone'));
  if (manca.length) h += `<div class="row"><span class="em">🎨</span><div><div class="nm">${tr('Per stare più comodi', 'To make it comfier')}</div><div class="sub">${manca.join(' · ')}</div></div></div>`;
  const dorme = canSleep();
  h += `<div class="row"><div class="btn2">${dorme ? `<button class="btn amber" data-sleep="1">😴 ${tr('Dormi', 'Sleep')}</button>` : `<button class="btn ghost" disabled>😴 ${tr('Non hai ancora sonno', 'Not sleepy yet')}</button>`}<button class="btn ghost" data-bedmove="1">🎨 ${tr('Sposta il letto', 'Move the bed')}</button></div></div>`;
  if (!dorme) h += `<div class="center muted">${tr('Si dorme dopo almeno mezza giornata sveglio.', 'You can sleep after at least half a day awake.')}</div>`;
  mTitle.innerHTML = withIcons('🛏️ ' + furnLabel(furnAt(room, gx, gy).itemId));
  mBody.innerHTML = withIcons(h); openModal();
  mBody.querySelectorAll('[data-sleep]').forEach(b => b.onclick = () => { if (sleepAtHome(room)) closeModal(); });
  mBody.querySelectorAll('[data-bedmove]').forEach(b => b.onclick = () => {
    if (pickUpFurniture(room, gx, gy)) { closeModal(); toast('🎨 ' + keys(tr('Letto in mano: cammina e {act} per ripiazzarlo', 'Bed in hand: walk and {act} to place it'))); }
  });
}
/* CASA — piedistallo (M4): espone in casa uno scheletro già consegnato al Museo (stessa
   fonte dei piedistalli della galleria, `S.museum[spId]`). Vuoto → scegli la specie;
   assegnato → sprite dell'esposizione (SOLI pezzi consegnati, `exhibitSprite`-style) + cambia/
   togli. Stesso schema di openCompanionPicker: elenco a righe, un bottone "Scegli"/"Esponi". */
export function openPedestal(room, gx, gy) {
  const f = furnAt(room, gx, gy);
  if (!f || f.itemId !== PEDESTAL_ID) return;
  if (f.spId) {
    const sp = spById[f.spId]; const parts = S.museum[f.spId] || [];
    mTitle.innerHTML = withIcons('🏛️ ' + tr('Piedistallo', 'Pedestal') + ' · ' + sp.name + ' ' + sp.emoji);
    let h = `<div class="center" style="padding:4px"><canvas id="pedCv" width="144" height="128" style="width:100%;max-width:220px;height:auto;image-rendering:pixelated;background:#f6efdd;border:2px solid #6b5137;border-radius:8px"></canvas></div>`;
    h += `<div class="row"><div class="sub">${tr('Pezzi esposti', 'Pieces on display')}: ${parts.length}/${PARTS.length}</div></div>`;
    h += `<div class="row" style="justify-content:center;gap:8px"><button class="btn ghost" data-ped-change="1">${tr('Cambia specie', 'Change species')}</button><button class="btn ghost" data-ped-remove="1">${tr('Togli piedistallo', 'Remove pedestal')}</button></div>`;
    mBody.innerHTML = withIcons(h); openModal();
    const cv = document.getElementById('pedCv');
    if (cv) try { projectVox(cv, composedPartsVox(f.spId, parts)); } catch (e) { /* stub nei test */ }
    mBody.querySelectorAll('[data-ped-change]').forEach(b => b.onclick = () => { assignPedestal(room, gx, gy, null); openPedestal(room, gx, gy); });
    mBody.querySelectorAll('[data-ped-remove]').forEach(b => b.onclick = () => { removeFurnitureAt(room, gx, gy); closeModal(); });
  } else {
    const cands = pedestalCandidates();
    let h = `<div class="muted" style="margin-bottom:8px">${tr('Scegli quale scheletro esporre (serve almeno un pezzo consegnato al Museo).', "Pick which skeleton to display (needs at least one piece delivered to the Museum).")}</div>`;
    if (!cands.length) h += `<div class="center muted">${tr('Non hai ancora consegnato nulla al Museo.', "You haven't delivered anything to the Museum yet.")}</div>`;
    else h += cands.map(id => {
      const sp = spById[id], parts = S.museum[id] || [];
      return `<div class="row"><span class="em">${sp.emoji}</span><div><div class="nm">${sp.name}</div><div class="sub">${parts.length}/${PARTS.length}</div></div><div class="rt"><button class="btn amber" data-ped-pick="${id}">${tr('Esponi', 'Display')}</button></div></div>`;
    }).join('');
    mTitle.innerHTML = withIcons('🏛️ ' + tr('Piedistallo vuoto', 'Empty pedestal'));
    mBody.innerHTML = withIcons(h); openModal();
    mBody.querySelectorAll('[data-ped-pick]').forEach(b => b.onclick = () => { assignPedestal(room, gx, gy, b.dataset.pedPick); openPedestal(room, gx, gy); });
  }
}
export function openAchievements() {
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Gradini sbloccati', 'Tiers unlocked')}: ${trophyCount()}/${TIER_TOTAL} · ${tr('Bronzo · Argento · Oro · Platino', 'Bronze · Silver · Gold · Platinum')}</div>`;
  h += TRACKS.map(t => {
    const cur = trophyTier(t.id), val = t.metric(S), nx = nextThreshold(t);
    /* 4 pallini colorati per gradino: pieni fino al gradino raggiunto */
    const dots = TIERS.map((_, i) => `<span class="tdot" style="background:${i < cur ? tierCol(i + 1) : 'transparent'};border-color:${tierCol(i + 1)}"></span>`).join('');
    const prog = nx == null ? '<b style="color:' + tierCol(4) + '">💎 ' + tr('Platino!', 'Platinum!') + '</b>' : `${val} / ${nx} → ${tierLabel(cur + 1)}`;
    return `<div class="row" style="${cur ? '' : 'opacity:.7'}"><span class="em">${t.ic}</span><div style="flex:1"><div class="nm">${trackLabel(t)} <span style="color:${tierCol(cur) || '#8a755a'}">${cur ? tierLabel(cur) : ''}</span></div><div class="sub">${trackGoal(t)} · ${prog}</div><div class="tdots">${dots}</div></div></div>`;
  }).join('');
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
/* LA TARGA DELLA STATUA. Non è arredo muto: nelle città grandi ci si passa davanti decine di
   volte andando al Museo, ed è il posto migliore per ricordare PERCHÉ si sta scavando. La targa
   dice chi era lui; sotto, a che punto sei TU — lo stesso conteggio del cancello del parco e del
   banco del Curatore, mai riscritto a mano (goal.js). */
export function openStatue() {
  mTitle.innerHTML = withIcons('🗿 ' + tr('Monumento al vecchio archeologo', 'Monument to the old archaeologist'));
  let h = `<div class="letter"><div class="lt-h">${tr('Targa incisa', 'Engraved plaque')}</div>
    <p>${tr('Trovò ciò che nessuno ricordava,<br>e passò la vita a dimostrare che era esistito.', 'He found what no one remembered,<br>and spent his life proving it had existed.')}</p>
    <p>${tr('Non ne vide mai una viva.', 'He never saw a single one alive.')}</p>
    <div class="lt-sign">— ${tr('gli abitanti', 'the townsfolk')}</div></div>`;
  h += `<div class="row" style="background:#f6e7c4"><span class="em">🧬</span><div>
    <div class="nm">${goalTitle()}: ${goalLine()}</div>
    <div class="sub">${alive() ? goalHint() : goalEnd()}</div></div></div>`;
  mBody.innerHTML = withIcons(h); openModal();
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
  /* RIFARE IL TUTORIAL: chi lo salta al primo minuto (o ricarica per una seconda partita)
     deve poterselo riprendere. Sta qui e non in un menu suo: la Guida è già il posto dove si
     torna quando non si è capito qualcosa. */
  h += `<div class="sp-sep"></div><div class="row"><span class="em">🎓</span><div><div class="nm">${tr('Tutorial d\'apertura', 'Opening tutorial')}</div>
    <div class="sub">${tutActive() ? tr('In corso: la lista degli obiettivi è in alto a sinistra.', 'In progress: the objective list is at the top left.')
      : tutSkipped() ? tr('Saltato. Ripartendo, gli obiettivi tornano in alto a sinistra.', 'Skipped. Restart it and the objectives return at the top left.')
        : tr('Finito. Puoi rifarlo quando vuoi.', 'Finished. You can redo it whenever you like.')}</div></div>
    <div class="rt"><button class="btn ghost" id="tutAgain">${tr('Rifai', 'Redo')}</button></div></div>`;
  mTitle.innerHTML = withIcons('❔ ' + tr('Guida', 'Guide'));
  mBody.innerHTML = withIcons(h); openModal();
  const ta = document.getElementById('tutAgain');
  if (ta) ta.onclick = () => { tutRestart(); updateHUD(); closeModal(); toast('🎓 ' + tr('Tutorial ripartito', 'Tutorial restarted')); };
}
export function openQuests() {
  ensureQuests(S.day);
  const act = activeQuests();
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Missioni attive (scadono a fine giornata). Consegna al cartello in città.', "Active missions (expire at day's end). Deliver at the town board.")}</div>`;
  if (!act.length) h += `<div class="center muted">${tr('Nessuna missione attiva. Cerca il cartello 📋 in città!', 'No active missions. Find the town board 📋!')}</div>`;
  else for (const q of act) { const have = questHave(q); h += `<div class="row"><span class="em">📋</span><div><div class="nm">${giverName(q.giver)}: ${questText(q)}</div><div class="sub">${have}/${q.n} · ${tr('premio', 'reward')} ${questRewardText(q)}${canComplete(q) ? ' · ✓ ' + tr('pronta', 'ready') : ''}</div></div></div>`; }
  mTitle.innerHTML = withIcons('📋 ' + tr('Le tue missioni', 'Your missions'));
  mBody.innerHTML = withIcons(h); openModal();
}

/* ---------- COMPAGNO: scelto dal parco, ti segue e aiuta ---------- */
/* il potere dipende dai TRATTI: TIPO (fonte della specie/del cranio) = quale aiuto,
   RARITÀ = quanto forte. In più ogni compagno dà FIUTO + BUSSOLA universali. */
const TYPE_TXT = {
  terra: ['🪏 Scavatore', '🪏 Digger', 'scavando', 'digging'],
  acqua: ['🎣 Pescatore', '🎣 Angler', 'pescando', 'fishing'],
  albero: ['🪓 Boscaiolo', '🪓 Woodsman', "con l'accetta", 'with the hatchet'],
  roccia: ['⛏️ Minatore', '⛏️ Miner', 'col piccone', 'with the pickaxe'],
  grotta: ['🕳️ Speleologo', '🕳️ Caver', 'in grotta', 'in caves'],
  all: ['✨ Tuttofare', '✨ Versatile', 'da tutto', 'from everything'],  // bonus universale delle chimere a estremità uguali
};
/* etichetta di UN potere (tipo + magnitudine) */
function powLabel(type, mag) {
  const e = TYPE_TXT[type]; if (!e) return '';
  const name = tr(e[0], e[1]), how = tr(e[2], e[3]);
  return type === 'grotta'
    ? name + ': ' + tr('cristalli in grotta + luce di notte', 'richer crystals + light at night')
    : name + ': +' + Math.round(mag * 100) + '% ' + tr('reperti ', 'finds ') + how;
}
/* etichetta del compagno `spec`: UNO o DUE poteri (le chimere ne hanno due, più deboli). I
   LEGGENDARI aggiungono lo speciale del CRANIO (raccoglitore o cavalcatura). */
function abilLabel(spec) {
  const powers = companionPowers(spec); if (!powers.length) return '';
  let base = powers.map(p => powLabel(p.type, p.mag)).filter(Boolean).join(' · ');
  if (spec && spec.q === 'leggendario') base += companionType(spec) === 'grotta'
    ? ' · 🐾 ' + tr('CAVALCABILE: vola sulla mappa', 'RIDEABLE: fly over the map')
    /* dice anche i LIMITI, non solo il potere: è lento, metà delle volte torna a mani vuote e
       non fa livellare. Scritto solo "raccoglie da solo e ti porta i fossili" sembrava un
       secondo giocatore al posto tuo, ed è la cosa che poi si scopre di persona e delude. */
    : ' · 🐾 ' + tr('raccoglie da solo: lento, spesso a vuoto, niente XP', 'gathers on its own: slow, often nothing, no XP');
  return base;
}
/* Nel cortile si scelgono DUE cose per ogni creatura: chi ti segue nel mondo (compagno, come
   prima) e chi vive nel cortile (M5, sostituisce il vecchio parco cittadino — illimitato,
   scelta esplicita, `S.house.yard` = elenco di `key`). Un solo pannello: qui è dove le tue
   creature vivono, ha senso decidere entrambe le cose da qui. */
export function openCompanionPicker() {
  ensureHouseState();
  const cands = companionCandidates(), cur = companionSpec();
  const yard = new Set(S.house.yard || []);
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Scegli chi ti segue nel mondo (il potere dipende dal TIPO e cresce con la RARITÀ) e chi vive nel tuo cortile (nessun limite).', 'Choose who follows you in the world (power depends on TYPE and grows with RARITY) and who lives in your yard (no limit).')}</div>`;
  if (!cands.length) h += `<div class="center muted">${tr('Nessuna chimera o fossile risvegliato. Risveglia una specie al Laboratorio (poi potrai anche allevare chimere)!', 'No chimera or awakened fossil yet. Awaken a species at the Lab (then you can breed chimeras too)!')}</div>`;
  else {
    h += `<div class="cmp-solo${cur ? '' : ' on'}"><span class="em">🚫</span>`
      + `<div class="cmp-h"><span class="cmp-n">${tr('Nessun compagno', 'No companion')}</span></div>`
      + `<div class="cmp-p">${tr('vai da solo', 'go on your own')}</div>`
      + `<div class="cmp-a"><button class="btn ghost${cur ? '' : ' onbtn'}" data-comp="">${cur ? tr('Scegli', 'Choose') : '✓ ' + tr('da solo', 'on your own')}</button></div></div>`;
    h += '<div class="cmp-list">' + cands.map(c => {
      const on = isCurrentCompanion(c.key);
      const inYard = yard.has(c.key);
      const chimera = !!(c.key && c.key.startsWith('chi'));   // parkPopulation: chimere 'chi'+uid, risvegli 'sp'+id
      const kind = chimera ? tr('Chimera', 'Chimera') : tr('Risveglio', 'Awakened');
      /* la miniatura è il modello voxel VIVO della creatura (lo stesso del cortile e del Libro):
         un elenco di nomi tutti uguali non fa riconoscere niente, la sagoma sì */
      return `<div class="cmp${chimera ? ' chimera' : ''}${on ? ' on' : ''}">`
        + `<canvas class="cmp-pv" width="48" height="44" data-cpv="${c.skull}|${c.torso}|${c.leg}"></canvas>`
        + `<div class="cmp-h"><span class="cmp-n">${c.name}</span><span class="cmp-k">${kind}</span>${rarSpan(c.q)}</div>`
        + `<div class="cmp-p">${abilLabel(c)}</div>`
        + `<div class="cmp-a">`
        + `<button class="btn ghost${on ? ' onbtn' : ''}" data-comp="${on ? '' : c.key}">${on ? '✓ ' + tr('con te', 'with you') : tr('Scegli', 'Choose')}</button>`
        + `<button class="btn ghost${inYard ? ' onbtn' : ''}" data-yard="${c.key}">🏠 ${inYard ? tr('nel cortile', 'in the yard') : tr('metti nel cortile', 'add to yard')}</button>`
        + `</div></div>`;
    }).join('') + '</div>';
  }
  mTitle.innerHTML = withIcons('🐾 ' + tr('Compagno e cortile', 'Companion & yard'));
  mBody.innerHTML = withIcons(h); openModal(); hydrateCpv();
  mBody.querySelectorAll('[data-comp]').forEach(b => b.onclick = () => {
    const key = b.dataset.comp;
    if (!key) { clearCompanion(); toast('🚫 ' + tr('Compagno a casa', 'Companion sent home')); }
    else { const spec = cands.find(c => c.key === key); if (spec) { setCompanion(spec); toast('🐾 ' + spec.name + tr(' ti segue!', ' is with you!')); } }
    updateHUD(); openCompanionPicker();
  });
  mBody.querySelectorAll('[data-yard]').forEach(b => b.onclick = () => {
    ensureHouseState();
    const key = b.dataset.yard;
    const i = S.house.yard.indexOf(key);
    if (i >= 0) { S.house.yard.splice(i, 1); toast('🏠 ' + tr('Tornata nel Libro', 'Back to the Book')); }
    else { S.house.yard.push(key); toast('🏠 ' + tr('Ora vive nel cortile!', 'Now lives in your yard!')); }
    save(); updateHUD(); openCompanionPicker();
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
  h += rowg('🐾', tr('Compagno', 'Companion') + ': ' + (cs ? cs.name : tr('nessuno', 'none')), cs ? abilLabel(cs) : tr('Scegline uno dal parco delle città grandi.', 'Choose one at the park in big cities.'));
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

/* ---------- FONTANA (#3): TRE TIRI di fila, uno più rapido dell'altro. Ogni tiro va fermato nel
   riflesso d'oro; SBAGLIARNE UNO chiude i tiri. Tre su tre = premio assicurato; se ti fermi
   prima, prendi in base a quanti ne hai azzeccati. Cozy: nessuna percentuale a schermo. ---------- */
const TOSS_SPEEDS = [0.018, 0.028, 0.04];   // ogni tiro più veloce del precedente
let tossActive = false, tossOpen = false, tossBetween = false, tossRAF = 0;
let tossPos = 0, tossDir = 1, tossTarget = 0.5, tossRound = 0, tossHits = 0, tossOnDone = null;
export function isTossOpen() { return tossActive; }
export function openToss(onDone) {
  const ov = document.getElementById('tossov'); if (!ov) { if (onDone) onDone(0); return; }
  if (typeof requestAnimationFrame === 'undefined') { if (onDone) onDone(0); return; } // niente animazione = niente tiri
  tossOnDone = onDone || null; tossActive = true; tossRound = 0; tossHits = 0;
  const title = document.getElementById('toss-title'); if (title) title.innerHTML = withIcons(tr('Aumenta la tua fortuna', 'Boost your luck'));
  ov.classList.add('on');
  tossArm(ov, () => { if (tossOpen) stopRound(); });
  startRound();
}
/* IL TOCCO DEVE FERMARE IL TIRO NELL'ISTANTE IN CUI TOCCHI.
   Prima si ascoltava `click`, che su un telefono arriva 250-300 ms DOPO il dito: nel frattempo
   il cursore aveva percorso da 0.27 a 0.60 della barra, cioè da 2 a 5 volte la larghezza della
   zona d'oro (12%). Centrarla era impossibile, e non per bravura — il gioco registrava il tocco
   dove il cursore NON era più (segnalato da un giocatore).
   `pointerdown` scatta al contatto. Il `click` che il browser genera subito dopo va ignorato,
   o il tiro seguente si fermerebbe da solo: per questo l'ultimo pointerdown si ricorda. */
/* IL MOVIMENTO DEL CURSORE, puro e misurabile. Sta fuori dal ciclo di disegno perché è la
   parte che si poteva sbagliare in silenzio: prima il passo era per FOTOGRAMMA, quindi su uno
   schermo a 120 Hz la barra correva al doppio e su un telefono lento strisciava — lo stesso
   minigioco era facile o impossibile a seconda del dispositivo, e nessuno poteva accorgersene
   guardando il codice. Ora la velocità è al SECONDO e un test la confronta a due frequenze. */
export function tossSpeed(round) { return (TOSS_SPEEDS[round - 1] || 0.04) * 60; }
export function tossAdvance(pos, dir, speed, dt) {
  let p = pos + dir * speed * dt, d = dir;
  if (p >= 1) { p = 1; d = -1; } else if (p <= 0) { p = 0; d = 1; }
  return { pos: p, dir: d };
}
let tossPointerAt = -1;
function tossNow() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0; }
function tossArm(ov, fn) {
  const azione = (e) => {
    /* il click fantasma che segue il tocco: stessa azione a pochi ms di distanza, si scarta */
    if (e && e.type === 'click' && tossPointerAt >= 0 && tossNow() - tossPointerAt < 700) return;
    if (e && e.type === 'pointerdown') { tossPointerAt = tossNow(); if (e.preventDefault) e.preventDefault(); }
    fn();
  };
  ov.onpointerdown = azione;
  ov.onclick = azione;                 // mouse senza PointerEvent, e i test
}
function startRound() {
  tossRound++; tossOpen = true; tossBetween = false; tossPos = 0; tossDir = 1;
  tossTarget = 0.12 + Math.random() * 0.76;                    // il riflesso d'oro si sposta ogni tiro
  const tgt = document.getElementById('toss-target'); if (tgt) tgt.style.left = (tossTarget * 100) + '%';
  const mk = document.getElementById('toss-marker'); if (mk) mk.style.background = '#fff';
  const hint = document.getElementById('toss-hint'); if (hint) hint.innerHTML = withIcons(tr('Ferma il tiro nel riflesso d\'oro', 'Land the toss in the golden ripple'));
  /* la velocità è AL SECONDO, non a fotogramma: col passo per frame la barra correva al doppio
     su uno schermo a 120 Hz e più piano su un telefono lento — lo stesso minigioco era facile
     o impossibile a seconda del dispositivo. I numeri sono quelli di prima moltiplicati per 60,
     così su uno schermo a 60 Hz non cambia niente. */
  const speed = tossSpeed(tossRound);
  let last = -1;
  const step = (ts) => {
    if (!tossOpen) return;
    const t = (typeof ts === 'number') ? ts : tossNow();
    const dt = last < 0 ? 1 / 60 : Math.min(0.05, (t - last) / 1000);   // cap: se la scheda torna in primo piano non salta
    last = t;
    const r = tossAdvance(tossPos, tossDir, speed, dt);
    tossPos = r.pos; tossDir = r.dir;
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
  const mk = document.getElementById('toss-marker'); if (mk) mk.style.background = hit ? '#e6b23c' : '#fff';
  if (!hit) { endToss(); return; }              // un tiro fuori e i tiri finiscono
  tossHits++;
  if (tossRound >= 3) { endToss(); return; }    // tre su tre
  const hint = document.getElementById('toss-hint');
  if (hint) hint.innerHTML = withIcons('<b>' + (tossRound === 1 ? tr('Bel lancio!', 'Nice throw!') : tr('Wow, che bravo!', 'Wow, well done!')) + '</b>');
  if (typeof setTimeout !== 'undefined') setTimeout(() => { if (tossBetween) startRound(); }, 600);
}
function endToss() {
  tossBetween = false;
  const label = tossHits >= 3 ? tr('Tre su tre, ecco il premio!', 'Three in a row — here\'s your prize!')
    : tr('Che peccato, vediamo se la fortuna ti premia!', 'Too bad — let\'s see if luck rewards you!');
  const hint = document.getElementById('toss-hint'); if (hint) hint.innerHTML = withIcons('<b>' + label + '</b>');
  const finish = () => {
    tossActive = false;
    const ov = document.getElementById('tossov'); if (ov && ov.classList) ov.classList.remove('on');
    const cb = tossOnDone; tossOnDone = null; if (cb) cb(tossHits);
  };
  const ov = document.getElementById('tossov'); if (ov) tossArm(ov, finish);
  if (typeof setTimeout !== 'undefined') setTimeout(finish, 1200);
}
/* stessa cosa del click, ma da TASTIERA (E/spazio): ferma il tiro (o chiude l'esito) */
export function tossPress() { const ov = document.getElementById('tossov'); if (tossActive && ov && typeof ov.onclick === 'function') ov.onclick(); }
/* ESC: chiude il minigioco e risolve con i tiri fatti finora (la moneta è già spesa) */
export function tossAbort() {
  if (!tossActive) return;
  tossOpen = false; tossBetween = false;
  if (tossRAF && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(tossRAF);
  tossActive = false;
  const ov = document.getElementById('tossov'); if (ov && ov.classList) ov.classList.remove('on');
  const cb = tossOnDone; tossOnDone = null; if (cb) cb(tossHits);
}

/* RICOMPONI LO SCHELETRO — museo: un pezzo NUOVO va esposto, lo trascini nel socket giusto.
   Coda di pezzi (un lotto al Museo può contenerne più di uno): si gioca un pezzo alla volta.
   Sempre saltabile (bottone Salta), mai un fallimento vero: un socket sbagliato rimanda il
   pezzo alla base, il tempo continua — la fretta è quello che dà il bonus, non l'errore. */
let skQueue = [], skItem = null, skStart = 0, skDone = null, skWired = false;
export function isSkeletonFitOpen() { return !!skItem; }
/* ESC (o un tasto) = come premere Salta: il pezzo è già garantito, si salta solo il bonus */
export function skeletonFitSkip() { if (skItem) skResolve(SK_SKIP); }
function skPieceEl() { return document.getElementById('sk-piece'); }
function skPlacePiece(xFrac, yFrac) {
  const el = skPieceEl(); if (!el) return;
  el.style.left = (xFrac * 100) + '%'; el.style.top = (yFrac * 100) + '%';
}
function skHighlight(sockId) {
  document.querySelectorAll('.sk-sock').forEach(s => s.classList.toggle('hot', s.dataset.sock === sockId));
}
export function openSkeletonFit(items, onAllDone) {
  skDone = onAllDone || null;
  skQueue = (items || []).slice();
  skNext();
}
function skNext() {
  if (!skQueue.length) { skClose(); return; }
  const ov = document.getElementById('skfitov');
  if (!ov || typeof requestAnimationFrame === 'undefined') {                 // headless/no-DOM: niente minigioco
    const it = skQueue.shift(); gainXp(SK_SKIP.xp); skNext(); return;
  }
  skItem = skQueue.shift();
  skStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  ov.classList.add('on');
  const sp = spById[skItem.s];
  const ttl = document.getElementById('sk-title'); if (ttl) ttl.innerHTML = withIcons(partName(skItem.t) + ' ' + tr('di', 'of') + ' ' + (sp ? sp.name : skItem.s));
  const hint = document.getElementById('sk-hint'); if (hint) hint.innerHTML = withIcons(tr('Trascina il pezzo nel socket giusto', 'Drag the piece into the right socket'));
  /* ogni socket mostra l'ICONA della sua parte (stessa del Libro/zaino): senza, sono 5 cerchi
     identici e non è una sfida, è indovinare a caso (segnalato da un giocatore) */
  for (const s of SOCKETS) { const el = document.getElementById('sk-s-' + s.id); if (el) el.innerHTML = withIcons(partLabel(s.id)); }
  skPlacePiece(0.5, 0.92); skHighlight(null);
  const pv = document.getElementById('sk-pv'); if (pv) { try { projectVox(pv, partVoxels(skItem.s, skItem.t)); } catch (e) { /* stub nei test */ } }
  const skip = document.getElementById('sk-skip'); if (skip) skip.onclick = () => skResolve(SK_SKIP);
  skWire();
}
function skWire() {
  const el = skPieceEl(), board = document.getElementById('sk-board');
  if (!el || !board || skWired) return;
  skWired = true;
  let down = false;
  const frac = ev => {
    const r = board.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev;
    return { x: (p.clientX - r.left) / r.width, y: (p.clientY - r.top) / r.height };
  };
  el.addEventListener('pointerdown', ev => { down = true; el.classList.add('dragging'); el.setPointerCapture && el.setPointerCapture(ev.pointerId); ev.preventDefault && ev.preventDefault(); });
  el.addEventListener('pointermove', ev => {
    if (!down || !skItem) return;
    const p = frac(ev); skPlacePiece(p.x, p.y);
    skHighlight(nearestSocket(p.x, p.y) ? nearestSocket(p.x, p.y).id : null);
  });
  const release = ev => {
    if (!down || !skItem) return;
    down = false; el.classList.remove('dragging');
    const p = frac(ev), s = nearestSocket(p.x, p.y);
    if (s && s.id === skItem.t) {
      const ms = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : 0) - skStart;
      skResolve(gradeForTime(ms));
    } else {
      skPlacePiece(0.5, 0.92); skHighlight(null); playSfx('nope');    // sbagliato: torna alla base, il tempo corre
    }
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', () => { down = false; el.classList.remove('dragging'); skPlacePiece(0.5, 0.92); });
}
function skResolve(grade) {
  const it = skItem; skItem = null;
  if (grade.xp) { gainXp(grade.xp); playSfx('found'); }
  const label = { perfetto: tr('Montaggio perfetto!', 'Perfect fit!'), buono: tr('Ben incastrato', 'Nicely fitted'),
    ok: tr('Incastrato', 'Fitted'), saltato: tr('Saltato', 'Skipped') }[grade.id] || '';
  if (it) toast('🦴 ' + label + (grade.xp ? ' — +' + grade.xp + ' XP' : ''));
  const ov = document.getElementById('skfitov'); if (ov && ov.classList) ov.classList.remove('on');
  skNext();
}
function skClose() {
  const ov = document.getElementById('skfitov'); if (ov && ov.classList) ov.classList.remove('on');
  const cb = skDone; skDone = null; if (cb) cb();
}
const SK_SKIP = SKIP_GRADE;

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
  /* mobili: la MINIATURA è lo stesso disegno che finisce nella stanza (furnArt), non un
     modellino a parte — l'anteprima deve mostrare quello che si compra */
  r.querySelectorAll('canvas[data-fpv]').forEach(cv => {
    try { drawFurnThumb(cv, cv.dataset.fpv); } catch (e) { /* stub nei test */ }
  });
}
/* miniatura di una CREATURA (compagno/cortile): stesso modello voxel VIVO del recinto e del
   Libro, proiettato in 2D. Non è un'icona decorativa — è come si riconosce la propria bestia. */
function hydrateCpv(root) {
  const r = root || mBody;
  if (!r.querySelectorAll) return;
  r.querySelectorAll('canvas[data-cpv]').forEach(cv => {
    const [sk, to, lg] = cv.dataset.cpv.split('|');
    try {
      const c = spById[sk], t = spById[to], z = spById[lg];
      if (!c || !t || !z) return;
      const spec = { heads: [{ sp: c, horns: 1 }], chest: t, arms: [z, z], legs: [z, z], tails: [t] };
      projectVox(cv, buildFleshVoxels(spec));
    } catch (e) { /* stub nei test */ }
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
  lab: ['Qui si risveglia: con DUE fialette della stessa specie la faccio rivivere tutta intera. Le chimere invece non nascono da ossa — alleva DUE creature che hai già, e scegli tu da chi eredita ogni parte.',
    'This is where things get awakened: with TWO vials of the same species I can bring it back whole. Chimeras, though, don\'t come from bones — breed TWO creatures you already have, and choose who each part is inherited from.'],
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
        const warn = mine ? '' : `<div class="sub" style="color:var(--c-clay-sh)">${tr('non ancora esposto al Museo', 'not yet on display at the Museum')}</div>`;
        return `<div class="row"><canvas class="pv" width="36" height="30" data-pv="${g.spId}|${g.part}"></canvas>
          <div><div class="nm">${partName(g.part)} ${tr('di', 'of')} ${sp ? sp.name : g.spId} ×${g.uids.length}</div>
          <div class="sub">${rarSpan(g.q)} → ${rarSpan(up)} · ${tr('stessa zona', 'same zone')}: ${zoneName(sp ? sp.zone : '')}</div>${warn}</div>
          <div class="rt"><button class="btn amber" data-fuse="${g.spId}|${g.part}">${tr('Fondi 3', 'Fuse 3')}</button></div></div>`;
      }).join('');
    }
  }
  /* ALLEVAMENTO: le chimere nascono SOLO da qui (l'assemblaggio diretto da ossa è stato tolto:
     due strade per la stessa cosa rendevano questa una scorciatoia più lenta). Prima risveglia
     specie PURE (sotto), poi ibridale — per ogni parte SCEGLI da quale genitore la eredita.
     Mangia i doppioni meno preziosi (terza strada oltre a vendita e fusione) e matura in
     qualche giorno: un motivo a tornare che nasce da una scelta già fatta, non dall'attesa sola. */
  h += `<hr class="hr"><div class="bighead">🥚 ${tr('Alleva una chimera', 'Breed a chimera')}</div>`;
  {
    const e = breedEgg();
    /* niente teca disegnata QUI: sta nella stanza vera del Laboratorio (drawEggTank in
       interiors.js), sempre visibile camminandoci — nel pannello basta il testo */
    if (e) {
      if (eggReady()) {
        h += `<div class="row" style="background:#f1e6cc"><span class="em">🥚</span><div><div class="nm">${tr('Pronto a schiudersi!', 'Ready to hatch!')}</div><div class="sub">${tr('Figlio di', 'Child of')} ${e.p1} × ${e.p2}</div></div><div class="rt"><button class="btn amber" id="doHatch">${tr('Schiudi!', 'Hatch!')}</button></div></div>`;
      } else {
        h += `<div class="row"><span class="em">🥚</span><div><div class="nm">${tr('In cova', 'Incubating')}</div><div class="sub">${tr('Figlio di', 'Child of')} ${e.p1} × ${e.p2} · ${tr('ancora', '')} ${eggDaysLeft()} ${tr('giorni', 'days left')}</div></div></div>`;
      }
    } else if (S.creatures.length < 2) {
      h += `<div class="center muted">${tr('Servono almeno 2 chimere (o risvegli) nel parco.', 'You need at least 2 chimeras (or awakened species) in the park.')}</div>`;
    } else {
      const optC = S.creatures.map(c => `<option value="${c.uid}">${c.name} (${rarLabel(c.q)})</option>`).join('');
      /* selP2 parte dal SECONDO in elenco: coi due select uguali di default il bottone nasce
         spento e il primo avviso che si vede è "scegli due genitori diversi" — vero ma inutile
         come prima impressione, quando basta un default sensato */
      const optC2 = S.creatures.map((c, i) => `<option value="${c.uid}"${i === 1 ? ' selected' : ''}>${c.name} (${rarLabel(c.q)})</option>`).join('');
      h += `<div class="muted" style="margin-bottom:6px">${tr('Scegli i due genitori, poi da chi eredita OGNI parte. L\'uovo mangia i', 'Pick the two parents, then who each part is inherited from. The egg eats the')} ${EGG_FOOD} ${tr('doppioni meno preziosi che hai (più sono pregiati, più chance di sorpresa) e matura in', 'least valuable duplicates you have (the finer they are, the better the odds of a surprise), and takes')} ${EGG_DAYS} ${tr('giorni.', 'days to hatch.')}</div>`;
      h += `<div class="row" style="flex-wrap:wrap;gap:6px">
        <select id="selP1" class="sel">${optC}</select><select id="selP2" class="sel">${optC2}</select></div>`;
      h += `<div class="row" style="flex-wrap:wrap;gap:6px">
        <select id="selInhS" class="sel"><option value="1">${tr('Cranio: genitore 1', 'Skull: parent 1')}</option><option value="2">${tr('Cranio: genitore 2', 'Skull: parent 2')}</option></select>
        <select id="selInhT" class="sel"><option value="1">${tr('Torace: genitore 1', 'Ribcage: parent 1')}</option><option value="2">${tr('Torace: genitore 2', 'Ribcage: parent 2')}</option></select>
        <select id="selInhL" class="sel"><option value="1">${tr('Zampa: genitore 1', 'Leg: parent 1')}</option><option value="2">${tr('Zampa: genitore 2', 'Leg: parent 2')}</option></select></div>`;
      h += `<div id="eggPreview" class="sub" style="margin:6px 0"></div>`;
      h += `<div class="center"><button class="btn clay" id="doLay">${tr('Deponi l\'uovo', 'Lay the egg')} ⚡${EGG_ENERGY}</button></div>`;
    }
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
  /* ALLEVAMENTO: anteprima live (chi eredita cosa, che potere ne esce, chance di sorpresa) e
     i due bottoni (deponi/schiudi) — la sorpresa vera resta alla schiusa, qui si vede solo
     la base garantita, senza mutazione. */
  {
    const doHatch = document.getElementById('doHatch');
    if (doHatch) doHatch.onclick = () => {
      const cr = hatchEgg();
      if (cr) showBanner('🥚 ' + tr('SCHIUSO!', 'HATCHED!'), cr.name);
      renderLab();
    };
    const selP1 = document.getElementById('selP1'), selP2 = document.getElementById('selP2');
    if (selP1 && selP2) {
      const refreshEgg = () => {
        const box = document.getElementById('eggPreview'), btn = document.getElementById('doLay');
        if (!box) return;
        const p1 = S.creatures.find(c => c.uid === parseInt(selP1.value, 10));
        const p2 = S.creatures.find(c => c.uid === parseInt(selP2.value, 10));
        const inh = { skull: parseInt(document.getElementById('selInhS').value, 10),
          torso: parseInt(document.getElementById('selInhT').value, 10),
          leg: parseInt(document.getElementById('selInhL').value, 10) };
        if (!p1 || !p2 || p1.uid === p2.uid) {
          box.innerHTML = withIcons(`<span style="color:var(--c-clay-sh)">${tr('Scegli due genitori DIVERSI', 'Pick two DIFFERENT parents')}</span>`);
          if (btn) btn.disabled = true; return;
        }
        const base = previewOffspring(p1, p2, inh);
        const qi = Math.max(RAR.findIndex(r => r.id === p1.q), RAR.findIndex(r => r.id === p2.q));
        const spec = { skull: base.skull, torso: base.torso, leg: base.leg, q: RAR[qi].id };
        const food = foodPreview();
        const mut = Math.round(mutationChance(food) * 100), bump = Math.round(bumpChance(food) * 100);
        const foodTxt = food.length < EGG_FOOD ? `<span style="color:var(--c-clay-sh)">${tr('Non hai abbastanza doppioni (', "You don't have enough duplicates (")}${food.length}/${EGG_FOOD})</span>`
          : food.map(it => spById[it.s].name + ' ' + partName(it.t)).join(' · ');
        box.innerHTML = withIcons(rarLabel(spec.q) + ' · ' + abilLabel(spec)
          + `<br>${tr('mutazione', 'mutation')} ${mut}% · ${tr('rarità in più', 'extra rarity')} ${bump}%`
          + `<br>${tr('cibo', 'food')}: ${foodTxt}`);
        const chk = canLay(p1.uid, p2.uid);
        if (btn) btn.disabled = !chk.ok;
      };
      [selP1, selP2, 'selInhS', 'selInhT', 'selInhL'].forEach(x => { const el = typeof x === 'string' ? document.getElementById(x) : x; if (el) el.onchange = refreshEgg; });
      refreshEgg();
      const doLay = document.getElementById('doLay');
      if (doLay) doLay.onclick = () => {
        const p1 = parseInt(selP1.value, 10), p2 = parseInt(selP2.value, 10);
        const inh = { skull: parseInt(document.getElementById('selInhS').value, 10),
          torso: parseInt(document.getElementById('selInhT').value, 10),
          leg: parseInt(document.getElementById('selInhL').value, 10) };
        const r = layEgg(p1, p2, inh);
        if (r.ok) toast('🥚 ' + tr('Uovo deposto! Torna fra ', 'Egg laid! Come back in ') + EGG_DAYS + tr(' giorni', ' days'));
        renderLab();
      };
    }
  }
}
let storeTab = 'goods';
/* `tab` esplicito = stesso schema di `openBag(tab)`: serve ai test (la scheda non si clicca
   nello stub DOM) e a chi in futuro voglia aprire il Negozio già sull'Arredamento */
export function renderStore(tab) {
  if (tab) storeTab = tab;
  const TABS = [['goods', tr('Negozio', 'Shop')], ['furn', tr('Arredamento', 'Furniture')]];
  if (!TABS.some(t => t[0] === storeTab)) storeTab = 'goods';
  let h = '<div class="pn-tabs">' + TABS.map(([id, lab]) =>
    `<button class="pn-tab${storeTab === id ? ' on' : ''}" data-stab="${id}">${lab}</button>`).join('') + '</div>';
  h += storeTab === 'furn' ? renderFurnTab() : renderStoreGoods();
  mBody.innerHTML = withIcons(h); hydratePv();
  mBody.querySelectorAll('[data-stab]').forEach(b => b.onclick = () => { storeTab = b.dataset.stab; renderStore(); });
  wireStoreGoods(); wireFurnTab();
}
/* ARREDAMENTO: solo il set della ZONA in cui si trova questo negozio (M3) — un pezzo
   comprato una volta per tutte, si piazza in casa (vassoio, act() sotto i piedi). */
function renderFurnTab() {
  const z = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
  const items = FURN_SETS[z.id] || [];
  let h = `<div class="muted" style="margin-bottom:10px">${tr('Il set di arredo di questa zona. Comprato è tuo per sempre: lo piazzi in casa dal vassoio.', "This zone's furniture set. Once bought it's yours forever: place it at home from your tray.")}</div>`;
  /* IL FONDO PRIMA DEI MOBILI, e detto per quello che è: carta da parati e pavimento cambiano
     una stanza più di qualsiasi mobile e costano meno di tutti — messi in fondo all'elenco
     sembravano un accessorio, e la prima stanza restava una scacchiera con roba sopra. */
  const riga = it => {
    const owned = (S.furnOwned || []).includes(it.id);
    const needLvl = furnLevelLock(it.id);
    const badge = owned ? ' <span class="lockp">✓</span>' : needLvl ? ` <span class="lockp">🔒 Lv${needLvl}</span>` : '';
    const btn = owned ? `<b class="sub">${tr('già tuo', 'owned')}</b>` : needLvl ? `<button class="btn ghost" disabled>🔒 Lv${needLvl}</button>` : `<button class="btn amber" data-furn="${it.id}">🪙 ${it.cost}</button>`;
    return `<div class="row"><canvas class="pv" width="44" height="40" data-fpv="${it.id}"></canvas><div><div class="nm">${furnLabel(it.id)}${badge}</div><div class="sub">${furnSizeLabel(it.id)}</div></div><div class="rt">${btn}</div></div>`;
  };
  const fondi = items.filter(it => furnPlace(it.id) === 'paper' || furnPlace(it.id) === 'ground');
  const mobili = items.filter(it => !fondi.includes(it));
  if (fondi.length) {
    h += `<div class="bighead">${tr('FONDO DELLA STANZA', 'ROOM BACKDROP')}</div>`;
    h += fondi.map(riga).join('');
  }
  h += `<div class="bighead">${tr('MOBILI E DECORI', 'FURNITURE AND DECOR')}</div>`;
  h += mobili.map(riga).join('');
  return h;
}
function wireFurnTab() {
  mBody.querySelectorAll('[data-furn]').forEach(btn => btn.onclick = () => { buyFurniture(btn.dataset.furn); renderStore(); });
}
function renderStoreGoods() {
  /* PASSO "shop" DEL TUTORIAL: comprare la pala è l'UNICA cosa che conta (senza, l'unico
     verbo del gioco resta muto) — a richiesta: "la pala deve lampeggiare e deve essere
     disabilitato ogni altro acquisto", altrimenti le prime monete raccolte finiscono in
     ristori/mappe/mezzi prima ancora di scavare una volta. Vendere resta permesso (serve
     PER pagarla), solo i NUOVI acquisti si bloccano. */
  const tutBuy = tutActive() && tutStepId() === 'shop' && !S.tools.spade;
  const lockOther = tutBuy ? ' disabled' : '';
  let h = `<div class="muted" style="margin-bottom:10px">${tr('Il negozio compra i reperti <b>identificati</b>. Quelli grezzi vanno prima al Laboratorio.', 'The shop buys <b>identified</b> finds. Raw ones must go to the Laboratory first.')}</div>`;
  if (!S.items.length) h += `<div class="center muted">${tr('Non hai reperti identificati da vendere.', 'No identified finds to sell.')}</div>`;
  else {
    /* MERCATO: la richiesta cambia per specie ogni giorno — si vede PRIMA di vendere, non si
       scopre alla cassa (regola: ogni testo dice cosa fa davvero). */
    h += `<div class="row" style="background:#f1e6cc"><div class="nm">${tr('Totale vendibile', 'Total sellable')}: 🪙 ${S.items.reduce((a, x) => a + marketPrice(x.val, x.s, S.day), 0)}</div><div class="rt"><button class="btn" id="sellAll">${tr('Vendi tutto', 'Sell all')}</button></div></div>`;
    h += S.items.map(it => {
      const price = marketPrice(it.val, it.s, S.day), lab = marketLabel(it.s, S.day);
      const badge = lab ? ` <span class="lockp">${lab}</span>` : '';
      return itemRow(it, `<button class="btn ghost" data-sell="${it.uid}">${tr('Vendi', 'Sell')} 🪙${price}</button>${badge}`);
    }).join('');
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
    const btn = left > 0 ? `<button class="btn amber" id="buyEn"${lockOther}>🪙 ${cost}</button>` : `<button class="btn" disabled>${tr('Esauriti', 'Sold out')}</button>`;
    /* non è energia istantanea: finisce nello zaino e la mangi tu quando serve */
    const keep = tr('Va nello zaino: +15 ⚡ quando lo mangi', 'Goes in your bag: +15 ⚡ when you eat it');
    h += `<hr class="hr"><div class="row"><span class="em">🍞</span><div><div class="nm">${tr('Ristoro', 'Snack')}</div><div class="sub">${keep}</div><div class="sub">${sub}</div></div><div class="rt">${btn}</div></div>`;
  }
  h += `<div class="row"><span class="em">📜</span><div><div class="nm">${tr('Pergamena di ritorno', 'Return scroll')}${S.teleports > 0 ? ` ×${S.teleports}` : ''}</div><div class="sub">${tr('Dallo zaino: teletrasporto alla città più vicina', 'From your bag: teleport to the nearest city')}</div></div><div class="rt"><button class="btn amber" id="buyTp"${lockOther}>🪙 ${TELEPORT_COST}</button></div></div>`;
  { const nb = nextBagCost(), nextCap = BAG_CAPS[bagLevel() + 1];
    h += `<div class="row"><span class="em">🎒</span><div><div class="nm">${tr('Zaino più grande', 'Bigger bag')}</div><div class="sub">${tr('Capienza fossili', 'Fossil capacity')}: ${fossilCount()}/${bagCap()}${nb != null ? ' → ' + nextCap : ' · ' + tr('al massimo', 'maxed')}</div></div><div class="rt">${nb != null ? `<button class="btn amber" id="buyBag"${lockOther}>🪙 ${nb}</button>` : ''}</div></div>`; }
  /* mappe del tesoro: X lontana → scavo garantito della rarità comprata */
  h += `<div class="bighead">🗺️ ${tr('Mappe del tesoro', 'Treasure maps')}</div><div class="muted" style="margin-bottom:6px">${tr('Una X lontana, un reperto garantito. Più raro = più lontano.', 'A distant X, a guaranteed find. Rarer = farther.')}</div>`;
  for (const r of ['raro', 'eccezionale', 'leggendario']) {
    h += `<div class="row"><span class="em">🗺️</span><div><div class="nm">${tr('Mappa', 'Map')} — ${rarLabel(r)}</div><div class="sub">${MAP_DIST[r][0]}–${MAP_DIST[r][1]} ${tr('passi', 'steps')}</div></div><div class="rt"><button class="btn amber" data-map="${r}"${lockOther}>🪙 ${MAP_COST[r]}</button></div></div>`;
  }
  /* attrezzi del mestiere: la pala LAMPEGGIA durante il passo "shop", tutto il resto è spento */
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
    const isTarget = tutBuy && id === 'spade';
    h += `<div class="row"><span class="em">${em}</span><div><div class="nm">${nm}${owned ? ' ✓' : ''}</div><div class="sub">${sub}</div></div><div class="rt">${owned ? '' : `<button class="btn amber${isTarget ? ' tut-target' : ''}" data-tool="${id}"${isTarget ? '' : lockOther}>🪙 ${TOOL_COST[id]}</button>`}</div></div>`;
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
    h += `<div class="row"><span class="em">${em}</span><div><div class="nm">${nm}${owned ? ' ✓' : ''}</div><div class="sub">${sub}</div></div><div class="rt">${owned ? '' : `<button class="btn amber" data-tool="${id}"${lockOther}>🪙 ${TOOL_COST[id]}</button>`}</div></div>`;
  }
  return h;
}
function wireStoreGoods() {
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
let museumTab = 'desk';
function renderMuseum() {
  /* il museo INDICIZZA la sua zona nel Libro dei Fossili (sagome ???) */
  const z = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
  if (!S.book[z.id]) { S.book[z.id] = true; save(); toast(tr('📖 Nuove pagine nel libro: ', '📖 New pages in the book: ') + zoneName(z.id) + '!'); }
  const complete = Object.keys(S.museum).filter(k => (S.museum[k] || []).length === PARTS.length).length;
  /* DUE SCHEDE: le AZIONI da una parte, i NUMERI dall'altra.
     Questo pannello aveva finito per impilare sette blocchi, ognuno con due o tre righe di
     spiegazione permanente sotto: sul telefono diventava un muro alto tre schermate in cui il
     pulsante "Consegna tutto" spariva in mezzo al testo (visto in foto). Il criterio è quello
     dello zaino, che nel gioco funziona già: si SEPARA quello che si fa da quello che si
     guarda. E le spiegazioni si dicono una volta, non a ogni apertura. */
  const rechargeable = ALL_SPECIES.filter(sp2 => (S.museum[sp2.id] || []).length === PARTS.length);
  const TABS = [
    ['desk', tr('Banco', 'Desk'), S.raw.length],
    ['prog', tr('Progressi', 'Progress'), 0],
  ];
  if (!TABS.some(t => t[0] === museumTab)) museumTab = 'desk';
  let h = '<div class="pn-tabs">' + TABS.map(([id, lab, n]) =>
    `<button class="pn-tab${museumTab === id ? ' on' : ''}" data-mtab="${id}">${lab}${n ? ` <span class="tn">${n}</span>` : ''}</button>`).join('') + '</div>';

  if (museumTab === 'desk') {
    /* CONSEGNA sempre disponibile se hai grezzi: consegnare AGGIUNGE al lotto in corso, così con
       la borsa piena non si resta bloccati. Il restauro si propone al RITIRO. */
    h += `<div class="row"><span class="em">🦴</span><div><div class="nm">${tr('Reperti grezzi', 'Raw finds')}: ${S.raw.length}</div></div>
      <div class="rt"><button class="btn amber" id="mudep" ${S.raw.length ? '' : 'disabled'}>${tr('Consegna tutto', 'Hand in all')}</button></div></div>`;
    if (S.museumJob && !museumJobReady()) {
      h += `<div class="row" style="background:#f1e6cc"><span class="em">🔬</span><div><div class="nm">${tr('In lavorazione', 'Being examined')}: ${S.museumJob.items.length}</div><div class="sub">${tr('Torna domani (giorno ', 'Come back tomorrow (day ')}${S.museumJob.ready})</div></div></div>`;
    } else if (S.museumJob) {
      h += `<div class="row" style="background:#f1e6cc"><span class="em">💫</span><div><div class="nm">${tr('Pronti!', 'Ready!')} ${S.museumJob.items.length} ${tr('reperti identificati', 'finds identified')}</div></div>
        <div class="rt"><button class="btn amber" id="mucol">${tr('Ritira', 'Collect')}</button></div></div>`;
    }
    h += `<div id="idResult"></div>`;
    h += commissionBlock();
    /* ricariche di DNA: solo per specie con teca completa, prezzo per rarità */
    if (rechargeable.length) {
      h += `<div class="bighead" style="margin-top:10px">🧬 ${tr('Ricariche DNA', 'DNA refills')}</div>`;
      h += rechargeable.map(sp2 => `<div class="row"><span class="em">🧬</span><div><div class="nm">${sp2.name} ${dnaBadge(sp2.id)}</div><div class="sub">${rarSpan(sp2.r)}${dnaExtra(sp2.id)}</div></div><div class="rt"><button class="btn amber" data-dna="${sp2.id}">🪙 ${DNA_COST[sp2.r]}</button></div></div>`).join('');
    }
  } else {
    /* PROGRESSI: quattro numeri, uno per riga, senza un paragrafo sotto ciascuno. Lo SCOPO in
       cima e più grande: è il fine, gli altri sono la strada per arrivarci. */
    const prossima = nextRoom();
    h += `<div class="row" style="background:#f6e7c4"><span class="em">🧬</span><div>
      <div class="nm">${goalTitle()}: ${goalLine()}</div>
      <div class="sub">${goalHint()}</div></div></div>`;
    h += '<div class="letter" style="padding:2px 4px">';
    h += `<div class="pn-stat"><span class="k">${tr('Specie scoperte', 'Species discovered')}</span><span class="v">${S.codex.length}/${ALL_SPECIES.length}</span></div>`;
    h += `<div class="pn-stat"><span class="k">${tr('Teche complete', 'Complete cases')}</span><span class="v">${complete}/${ALL_SPECIES.length}</span></div>`;
    h += `<div class="pn-stat"><span class="k">${tr('Sale del Museo', 'Museum rooms')}`
      + (prossima ? `<small>${tr('più vicina: ', 'closest: ')}${zoneName(prossima.id)} ${prossima.have}/${prossima.need}</small>`
        : `<small>${tr('tutte piene', 'all filled')}</small>`)
      + `</span><span class="v">${roomsDone()}/${roomsTotal()}</span></div>`;
    h += '</div>';
    h += `<div class="center" style="margin-top:10px"><button class="btn ghost" id="mbook">📖 ${tr('Libro dei Fossili', 'Fossil Book')}</button></div>`;
    /* la spiegazione delle sale SOLO finché non ne hai chiusa una: serve a capire la regola, e
       chi ha già una lettera in mano l'ha capita. Da lì in poi è rumore permanente. */
    if (roomsDone() === 0) {
      h += `<div class="muted" style="margin-top:8px;font-size:11px">${tr('Una sala è piena quando ogni specie della sua zona ha un pezzo esposto: il Curatore ti consegna la lettera che il nonno gli aveva lasciato.', 'A room is full when every species of its zone has a piece on display: the Curator hands you the letter your grandparent left with him.')}</div>`;
    }
  }
  mBody.innerHTML = withIcons(h); hydratePv();
  mBody.querySelectorAll('[data-mtab]').forEach(b => b.onclick = () => { museumTab = b.dataset.mtab; renderMuseum(); });
  const dep = document.getElementById('mudep'); if (dep) dep.onclick = () => {
    if (museumDeposit()) toast('🏛️ ' + (museumJobReady() ? tr('Consegnati! Pronti da ritirare', 'Handed in! Ready to collect') : tr('Consegnati! Torna domani per il ritiro', 'Handed in! Come back tomorrow to collect')));
    renderMuseum();
  };
  const col = document.getElementById('mucol'); if (col) col.onclick = () => {
    const r = museumCollect(); if (!r) return;
    for (const spId of r.vials) toast('🧬 ' + tr('Teca completa! Fialetta DNA di ', 'Case complete! DNA vial of ') + spById[spId].name);
    let keep = `<div class="bighead" style="margin-top:10px">${tr('Restituiti a te', 'Returned to you')} (${r.back.length})</div>` + (r.back.length ? r.back.map(it => itemRow(it)).join('') : `<div class="center muted">${tr('Niente doppioni: tutto esposto!', 'No duplicates: everything on display!')}</div>`) +
      `<div class="center muted" style="margin-top:4px">🏛️ ${tr('Nuovi pezzi esposti', 'New pieces displayed')}: ${r.shown.length}</div>`;
    /* PROPOSTA di RESTAURO del Curatore: sul MIGLIOR doppione raro+ tornato, e SKIPPABILE */
    if (r.prepCand) {
      const c = r.prepCand, sp = spById[c.s];
      keep += `<div class="bighead" style="margin-top:10px">🪶 ${tr('Restauro', 'Restore')} <span class="muted" style="font-weight:400">${tr('fino a ×1,5', 'up to ×1.5')}</span></div>
        <div class="row"><canvas class="pv" width="36" height="30" data-pv="${c.s}|${c.t}"></canvas>
        <div><div class="nm">${partName(c.t)} ${tr('di', 'of')} ${sp ? sp.name : '?'}</div>
        <div class="sub">${rarSpan(c.q)} · ${tr('valore', 'value')} 🪙 ${c.val}</div></div>
        <div class="rt" style="display:flex;gap:6px"><button class="btn ghost" id="prepSkip">${tr('Salta', 'Skip')}</button><button class="btn amber" id="prepGo">${tr('Restaura', 'Restore')}</button></div></div>`;
    }
    renderMuseum(); const ir = document.getElementById('idResult'); if (ir) {
      ir.innerHTML = withIcons(keep); hydratePv();
      const pg = document.getElementById('prepGo'); if (pg) pg.onclick = () => openPrepare(r.prepCand, () => { save(); renderMuseum(); });
      const ps = document.getElementById('prepSkip'); if (ps) ps.onclick = () => { const b = pg && pg.closest ? pg.closest('.row') : null; if (b) b.remove(); };
    }
    /* RICOMPONI LO SCHELETRO — un pezzo alla volta per ogni nuova esposizione, XP bonus */
    if (r.shown.length) openSkeletonFit(r.shown, () => { save(); renderMuseum(); });
  };
  wireCommission(renderMuseum);
  const mb = document.getElementById('mbook'); if (mb) mb.onclick = () => { openBook(0); };
  mBody.querySelectorAll('[data-dna]').forEach(btn => btn.onclick = () => { buyDna(btn.dataset.dna); renderMuseum(); });
}
/* COMMISSIONE — il blocco del Curatore: una alla volta, 3 giorni, ricompensa grossa.
   Tutto è scritto: cosa serve, quanto ne hai, quanto manca alla scadenza, cosa ti danno. */
/* i premi IMPILATI, uno per riga con la sua icona: su una riga sola si spezzavano in mezzo
   ("🧬 1 / fialetta di Soleburo") e non si capiva dove finiva un premio e cominciava l'altro. */
function prizeList(c) {
  const parts = cmRewardParts(c); if (!parts.length) return '';
  return '<ul class="pn-prizes">' + parts.map(p => `<li>${p}</li>`).join('') + '</ul>';
}
function commissionBlock() {
  cmPrune(S.day);
  const c = cmActive();
  let h = `<div class="bighead" style="margin-top:10px">📜 ${tr('Commissione del Museo', 'Museum commission')}</div>`;
  if (c) {
    const n = cmHave(c), ok = cmCanDeliver(c);
    h += `<div class="row" style="background:#f1e6cc"><span class="em">📜</span><div>
      <div class="nm">${cmText(c)}</div>
      <div class="sub">${tr('Ne hai', 'You have')} ${Math.min(n, c.n)}/${c.n} · ⏳ ${cmDueText(c, S.day)}</div>
      ${prizeList(c)}</div>
      <div class="rt"><button class="btn amber" id="cmdel" ${ok ? '' : 'disabled'}>${tr('Consegna', 'Deliver')}</button></div></div>`;
    if (!ok) h += `<div class="muted" style="margin-bottom:6px">${tr('Servono pezzi <b>identificati</b>: i grezzi vanno prima consegnati al banco.', 'Needs <b>identified</b> pieces: hand raw finds to the desk first.')}</div>`;
  } else {
    const o = cmOfferFor(S.day);
    h += `<div class="row"><span class="em">📜</span><div>
      <div class="nm">${cmText(o)}</div>
      <div class="sub">⏳ ${DURATION_CM} ${tr('giorni', 'days')}</div>
      ${prizeList(o)}</div>
      <div class="rt"><button class="btn amber" id="cmacc">${tr('Accetta', 'Accept')}</button></div></div>`;
    /* la regola ("una alla volta, se scade non perdi niente") sta SOTTO la riga e in piccolo,
       non dentro il blocco: infilata lì spingeva il bottone in una colonna di tre parole e su
       telefono la riga diventava alta il doppio (visto in foto). */
    h += `<div class="muted" style="margin:-2px 0 6px;font-size:11px">${tr('Una alla volta. Se scade non perdi niente: il Curatore ne propone un\'altra.', 'One at a time. If it expires you lose nothing: the Curator offers another.')}</div>`;
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
/* quante chimere usano il DNA di questa specie (cranio/torace/zampa) */
function chimeraUses(spId) { return (S.creatures || []).filter(c => c.skull === spId || c.torso === spId || c.leg === spId).length; }
/* riga extra per le ricariche DNA: già rivissuto? in quante chimere? (oltre alla quantità nello zaino) */
function dnaExtra(spId) {
  const parts = [];
  if (S.awakened && S.awakened.includes(spId)) parts.push('<b style="color:#4e8d3f">✓ ' + tr('già rivissuto', 'already revived') + '</b>');
  const n = chimeraUses(spId);
  if (n) parts.push('🧬 ' + tr('in ', 'in ') + n + ' ' + (n === 1 ? tr('chimera', 'chimera') : tr('chimere', 'chimeras')));
  return parts.length ? ' · ' + parts.join(' · ') : ' · ' + tr('non ancora usato', 'not used yet');
}
/* etichetta dell'esposizione in galleria (E sul piedistallo) */
export function openExhibit(spId) {
  const sp = spById[spId]; const parts = S.museum[spId] || [];
  mTitle.innerHTML = withIcons('🏛️ ' + sp.name + ' ' + sp.emoji);
  const zone = ZONES.find(z => z.id === sp.zone);
  /* la canvas è più grande e più chiara del francobollo di prima: qui dentro ora GIRA lo
     scheletro 3D, e un modello che ruota dentro 216×180 non si legge. Fondo carta come nel
     Libro (il 3D si disegna su sfondo chiaro), e si trascina per ruotarlo. */
  let h = `<div class="center" style="padding:4px"><canvas id="exhCv" width="220" height="165" style="width:100%;max-width:320px;height:auto;image-rendering:pixelated;background:#f6efdd;border:2px solid #6b5137;border-radius:8px;touch-action:none;cursor:grab" title="${tr('Trascina per ruotare', 'Drag to rotate')}"></canvas></div>`;
  h += `<div class="row"><div class="nm">${rarSpan(sp.r)} · ${zone ? zone.icon + ' ' + zoneName(zone.id) : ''}</div></div>`;
  h += `<div class="row"><div class="sub">${tr('Pezzi esposti', 'Pieces on display')}: ${parts.length}/${PARTS.length} — ${PARTS.map(pt => (parts.includes(pt.id) ? '✓ ' : '· ') + partName(pt.id)).join(' · ')}</div></div>`;
  if (parts.length === PARTS.length) h += `<div class="row" style="background:#f1e6cc"><div class="sub">🧬 ${tr('Teca completa: DNA disponibile al banco del Curatore', 'Case complete: DNA available at the Curator\'s desk')} ${dnaBadge(spId)}</div></div>`;
  h += `<div class="muted" style="margin-top:6px">${descFor(sp)}</div>`;
  mBody.innerHTML = withIcons(h); openModal();
  const cv = document.getElementById('exhCv');
  /* LO SCHELETRO 3D, non la proiezione piatta: è lo stesso modello del Libro, con accesi i
     soli pezzi che hai consegnato — così la teca mostra a colpo d'occhio cosa manca ancora.
     Se WebGL non c'è, mount3D ripiega da solo sul disegno 2D. */
  if (cv) try { mountSpecies3D(cv, baseSpec(sp), { lit: litForSpecies(spId) }); } catch (e) { /* stub */ }
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
  /* cavalcatura volante: solo se il compagno è un grotta LEGGENDARIO (in grotta non si vola) */
  if (companionRides()) { const fly = isMounted();
    vehicles.push(row('🐾', tr('Cavalcatura volante', 'Flying mount'), tr('sorvoli la mappa · in grotta no', 'fly over the map · not in caves'),
      `<button class="bbtn${fly ? ' on' : ''}" data-mount="1">${fly ? tr('In volo', 'Flying') : tr('Cavalca', 'Ride')}</button>`, '', 'click' + (fly ? ' on' : '')));
  }
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
    row('🧬', '🐞 DEBUG', tr('DNA infinito: risvegli gratis al Lab', 'Infinite DNA: free awakenings at the Lab'), '<span class="bqt">∞</span>') + `</div></div>`;
  else if (dnaIds.length) secDna += `<div class="bag-sec"><h3>${tr('DNA', 'DNA')}</h3><div class="bag-list">` +
    dnaIds.map(id => row('🧬', spById[id].name, tr('fialette · al Lab: 2 risvegliano la specie', 'vials · at the Lab: 2 awaken the species'), `<span class="bqt">×${S.dna[id]}</span>`)).join('') + `</div></div>`;
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
    box.querySelectorAll('[data-mount]').forEach(el => el.onclick = () => { toggleMount(); openBag(); });
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
  return `<div class="center" style="padding:6px"><canvas id="prevCv" width="120" height="44" class="prev"></canvas></div>`;
}
let prevRaf = 0;
/* riquadro NATURALE su cui sono tarate le posizioni qui sotto (personaggio ora 32×32
   nativo, non più 16×16): il canvas GRANDE (120×44, barbiere/sartoria) è esattamente
   questa taglia, e TUTTE le anteprime (editor compreso) la usano: la canvas appiccicosa
   dell'editor era 60×22, cioè metà, quindi il personaggio veniva disegnato a scala 0,5 — su
   mezzo pixel — e poi ingrandito dal CSS. Era l'unica immagine sfuocata del gioco. */
const PREV_REF_W = 120, PREV_REF_H = 44;
export function drawPreview(noHat) {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(prevRaf);
  const pc = document.getElementById('prevCv'); if (!pc) return;
  const c2 = pc.getContext('2d'); c2.imageSmoothingEnabled = false;
  const scale = Math.min(pc.width / PREV_REF_W, pc.height / PREV_REF_H);
  const paint = (fr, bob) => {
    c2.setTransform(scale, 0, 0, scale, 0, 0);
    c2.clearRect(0, 0, PREV_REF_W, PREV_REF_H);
    drawHero(c2, 4, 8 + bob, 'down', fr, noHat);   // +8 in alto: spazio per cappelli che svettano
    drawHero(c2, 44, 8 + bob, 'right', fr, noHat);
    drawHero(c2, 84, 8 + bob, 'up', fr, noHat);
  };
  paint(0, 0); // primo frame subito (e unico nei test, dove rAF è uno stub)
  if (typeof requestAnimationFrame !== 'function') return;
  /* camminata sul posto: stesso ritmo del gioco (2 frame + bob di 2px) */
  const step = (t) => {
    if (!pc.isConnected) return; // canvas rimossa (rerender/chiusura): il loop muore da solo
    const fr = Math.floor(t / 140) % 2;
    paint(fr, fr === 1 ? -2 : 0);
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
/* riga di stili: quelli non posseduti (premium/tematici) mostrano ✨prezzo e sono provabili;
   un premium con la soglia di livello NON ANCORA raggiunta si VEDE (fa venire voglia di
   arrivarci) ma resta bloccato del tutto: niente anteprima finché non ci sei. */
function styleRow(field, styles) {
  const kind = field === 'hatStyle' ? 'hat' : field === 'hairStyle' ? 'hair' : field; // shirtStyle/pantsStyle
  return `<div class="swrow">` + styles.map(st => {
    const owned = kind === 'hat' ? hatOwned(st.id) : kind === 'hair' ? hairOwned(st.id) : true; // maglia/pantaloni: tutte disponibili (per ora)
    const needLvl = kind === 'hat' ? hatLevelLock(st.id) : null;
    const on = S.look[field] === st.id;
    const label = field === 'hatStyle' ? hatLabel(st.id) : field === 'hairStyle' ? hairLabel(st.id) : field === 'shirtStyle' ? shirtLabel(st.id) : pantsLabel(st.id);
    const badge = needLvl ? ` <span class="lockp">🔒 Lv${needLvl}</span>` : owned ? '' : ` <span class="lockp">✨${cosmeticCost(kind, st.id)}</span>`;
    return `<button class="btn ghost${on ? ' onbtn' : ''}${owned ? '' : ' locked'}${needLvl ? ' lvlocked' : ''}" data-field="${field}" data-v="${st.id}">${label}${badge}</button>`;
  }).join('') + `</div>`;
}
/* posseduto = base OPPURE già sbloccato */
function hatOwned(id) { return HAT_STYLES.some(s => s.id === id) || S.unlocked.hats.includes(id); }
function hairOwned(id) { return HAIR_STYLES.some(s => s.id === id) || S.unlocked.hairs.includes(id); }
/* prezzo di sblocco: premium dal registro, tematici di zona = SERVICE_COST × 3 */
function cosmeticCost(kind, id) { return isDebug() ? 0 : (PREMIUM_HAT_COST[id] != null ? PREMIUM_HAT_COST[id] : SERVICE_COST * 3); }
/* livello ancora mancante per un premium NON posseduto, o null se già ok/posseduto/debug */
export function hatLevelLock(id) {
  if (isDebug() || hatOwned(id)) return null;
  const p = PREMIUM_HATS.find(h => h.id === id);
  return (p && p.lvl != null && playerLevel() < p.lvl) ? p.lvl : null;
}
/* opzioni BLOCCATE provabili qui: tematico di zona (nel negozio di quella zona) + TUTTI i
   premium (in Sartoria) — anche quelli ancora chiusi dal livello, che qui si VEDONO e basta */
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
/* c'è un'ANTEPRIMA look non confermata? Serve al game loop per NON autosalvare il look in prova:
   senza, bastava provare un cappello e RICARICARE il browser per tenerlo gratis (l'autosave a
   5s persisteva l'anteprima). Chiudere/ESC/fuori già ripristina (closeModal→revertLook). */
export function lookPreviewPending() { return !!lookOrig; }
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
    /* bloccato dal LIVELLO: si vede (fa venire voglia di arrivarci) ma non si prova nemmeno,
       a differenza dei premium sbloccati-per-soldi che si provano gratis */
    if (f === 'hatStyle' && hatLevelLock(v)) { toast('🔒 Lv' + hatLevelLock(v)); return; }
    if (S.look[f] === v && !(f === 'hat' && S.look.hatStyle === 'none')) return;
    if (f === 'hat' && S.look.hatStyle === 'none') S.look.hatStyle = 'explorer'; // scegliere un colore lo rimette
    S.look[f] = v; applyLook();
    if (free) save();          // editor: subito definitivo
    rerender();                // negozio: solo anteprima
  });
}
/* barra conferma: mostra il totale (servizio + sblocchi premium/tematici) */
function confirmBar(fields) {
  const { total, pend } = lookOrig ? lookCost(fields) : { total: 0, pend: [] };
  /* "c'è qualcosa da confermare" conta OGNI campo diverso dall'originale, non solo quelli a
     pagamento: togliere il cappello è gratis (lookPaidFields lo esclude apposta) ma è
     comunque una modifica — altrimenti il bottone Conferma restava spento e il giocatore
     non poteva mai salvare "senza cappello" */
  const n = (lookOrig ? fields.filter(f => S.look[f] !== lookOrig[f]).length : 0) + pend.length;
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
  h += `<div class="bighead">${lookLabel('shirt')}</div>` + styleRow('shirtStyle', SHIRT_STYLES) + swatchRow('shirt', LOOKS.shirt);
  h += `<div class="bighead">${lookLabel('pants')}</div>` + styleRow('pantsStyle', PANTS_STYLES) + swatchRow('pants', LOOKS.pants);
  const TF = ['hatStyle', 'hat', 'shirtStyle', 'shirt', 'pantsStyle', 'pants'];
  h += confirmBar(TF);
  mBody.innerHTML = withIcons(h); wireLook(false, renderTailor); wireHatOff(renderTailor); wireConfirm(TF, renderTailor); drawPreview();
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
  /* L'ANTEPRIMA RESTA IN VISTA MENTRE SI SCORRE. Stava in cima alla colonna e usciva dallo
     schermo al primo scroll: si sceglieva il colore dei capelli senza vedere il personaggio
     su cui finiva — e su telefono, dove ci sta poco, succedeva subito.
     È `position:sticky`, non un secondo riquadro che scorre per conto suo: due aree che
     scorrono una dentro l'altra sono la regola ferrea n.14, e col dito si muove sempre quella
     sbagliata. Scorre una cosa sola, e il Digsy ci resta appeso sopra. */
  /* 120×44 come l'anteprima del barbiere/sarto, NON 60×22: a metà misura il personaggio
     veniva disegnato a scala 0,5 — mezzo pixel — e poi il CSS lo ingrandiva a 360px. Il
     risultato era l'unica immagine SFUOCATA di tutto il gioco (segnalato con foto). La
     canvas ora è 1:1 col disegno e l'ingrandimento è intero (360 = 120×3). */
  let h = '<div class="ed-stick"><canvas id="prevCv" width="120" height="44" class="prev"></canvas></div>';
  h += `<div class="edcol">`;
  h += `<div class="bighead">${tr('Nome', 'Name')}</div>`;
  h += `<input id="pgname" class="nameinput" maxlength="14" value="${(S.name || '').replace(/["<>&]/g, '')}" placeholder="${tr('Nome', 'Name')}">`;
  h += `<button class="btn amber wide" id="rndAll">🎲 ${tr('Personaggio casuale', 'Random character')}</button></div>`;
  h += hatSection(HAT_STYLES); // creazione PG: SOLO cappelli base (i premium si comprano dopo)
  h += `<div class="bighead">${lookLabel('shirt')}</div>` + styleRow('shirtStyle', SHIRT_STYLES) + swatchRow('shirt', LOOKS.shirt);
  h += `<div class="bighead">${lookLabel('pants')}</div>` + styleRow('pantsStyle', PANTS_STYLES) + swatchRow('pants', LOOKS.pants);
  h += `<div class="bighead">${lookLabel('skin')}</div>` + swatchRow('skin', LOOKS.skin);
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
