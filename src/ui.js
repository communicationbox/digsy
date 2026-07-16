/* UI DOM: HUD, prompt, toast, modale edifici, zaino, editor/barbiere/sartoria */
import { TS, SPECIES, spById, ptById, RAR, ZONES, zonePools, CHIMERA_COST, SERVICE_COST, LOOKS, LOOK_LABELS, HAIR_STYLES, HAIR_COLORS, HAT_STYLES } from './data.js';
import { zoneAt } from './regions.js';
import { S, P, save, dugSet } from './state.js';
import { baseTerrain, diggable, townForTile } from './world.js';
import { applyLook, drawHero } from './sprites.js';
import { identifyAll, sellItem, sellAll, donateItem, restInn, buyEnergy, assembleChimera, nearbyDoor, nearbyFountain, nearbySite, siteRemaining, awakenReady, awakenSpecies, digTarget } from './gameplay.js';
import { darknessAt, seasonOf, SEASONS } from './daynight.js';
import { INT, nearNpc, nearCase, npcName } from './interior.js';
import { baseSpec, partParams, buildVoxels, buildFleshVoxels, shadeHex, BP } from './bones.js';
import { isDebug } from './debug.js';
import { icon, withIcons } from './icons.js';
import { tr, rarLabel, partName, zoneName, bldName, seasonName, lookLabel, hairLabel, hatLabel } from './i18n.js';

/* ---------- toast / HUD / prompt ---------- */
export function toast(m) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = withIcons(m);
  document.getElementById('toasts').appendChild(t); setTimeout(() => t.remove(), 2600);
}
export function updateHUD() {
  const dbg = isDebug();
  document.getElementById('h-coin').textContent = dbg ? '∞' : String(S.coins);
  document.getElementById('h-en').textContent = dbg ? '∞' : (S.energy + '/' + S.maxEnergy);
  document.getElementById('h-day').innerHTML = withIcons(S.day + ' ' + SEASONS[seasonOf(S.day)].icon + (darknessAt(S.tod || 0) > 0.5 ? ' 🌙' : ''));
  document.getElementById('h-bag').textContent = String(S.raw.length + S.items.length);
  const dt = document.getElementById('debugtag'); if (dt) dt.style.display = dbg ? '' : 'none';
}
const promptEl = document.getElementById('prompt');
/* il DOM si tocca SOLO se il contenuto cambia: riscriverlo a ogni frame fa sfarfallare */
let lastPromptHtml = null;
function setPrompt(html) {
  if (html === lastPromptHtml) return;
  lastPromptHtml = html;
  if (!html) { promptEl.style.display = 'none'; return; }
  promptEl.style.display = 'block';
  promptEl.innerHTML = html;
}
export function updatePrompt() {
  if (isModalOpen()) { setPrompt(null); return; }
  if (INT.active) {
    const nc = nearCase();
    if (nc) { setPrompt(withIcons((S.codex.includes(nc.sp.id) ? nc.sp.name : '???') + ' · ' + nc.n + '/5' + (nc.n === 5 ? ' 💫' : ''))); return; }
    if (nearNpc()) { setPrompt(withIcons('<kbd>E</kbd> ' + tr('Parla con ', 'Talk to ') + npcName(INT.b.type))); return; }
    setPrompt(null); return;
  }
  const st = nearbySite();
  if (st) {
    const rem = siteRemaining(st);
    setPrompt(withIcons(rem > 0 ? '<kbd>E</kbd> ' + tr('Scava al sito ⛏️ (', 'Dig at the site ⛏️ (') + rem + tr(' rimasti)', ' left)') : tr('Sito esaurito', 'Site exhausted')));
    return;
  }
  if (nearbyFountain()) { setPrompt(withIcons('<kbd>E</kbd> ' + tr('Lancia 1 🪙 nella fontana', 'Toss 1 🪙 into the fountain'))); return; }
  setPrompt(null); // niente hint per lo scavo semplice
}
export function welcomeToasts() {
  setTimeout(() => toast(tr('Benvenuto! Sei in una cittadina. Esplora e scava ovunque ⛏️', 'Welcome! You are in a small town. Explore and dig anywhere ⛏️')), 400);
  setTimeout(() => toast(tr('WASD/frecce per muoverti · E scava o entra · I zaino · L libro', 'WASD/arrows to move · E dig or enter · I bag · L book')), 2100);
}

/* ---------- modale ---------- */
const modal = document.getElementById('modal'), mBody = document.getElementById('m-body'), mTitle = document.getElementById('m-title');
let modalOpen = false;
export function isModalOpen() { return modalOpen || bookOpen; }
export function openModal() { modalOpen = true; modal.classList.add('on'); setPrompt(null); }
export function closeModal() { modalOpen = false; modal.classList.remove('on'); disposeViews(); }
document.getElementById('m-close').onclick = () => closeModal();
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

function rarSpan(q) { return `<span class="rar ${q}">${rarLabel(q)}</span>`; }
function itemRow(it, rightHTML) {
  const sp = spById[it.s], pt = ptById[it.t];
  return `<div class="row"><span class="em">${pt.emoji}</span><div><div class="nm">${partName(it.t)} ${tr('di', 'of')} ${sp.name} ${sp.emoji}</div><div class="sub">${rarSpan(it.q)} · ${tr('valore', 'value')} 🪙 ${it.val}</div></div><div class="rt">${rightHTML || ''}</div></div>`;
}

/* ---------- edifici ---------- */
const buildingEmoji = { store: '🏪', lab: '🔬', museum: '🏛️', inn: '🛏️', barber: '💈', tailor: '👕' };
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
}

function renderLab() {
  let h = `<div class="muted" style="margin-bottom:10px">${tr('I reperti grezzi vanno identificati qui per scoprirne specie e rarità. Solo così potrai venderli o donarli.', 'Raw finds must be identified here to reveal species and rarity. Only then can you sell or donate them.')}</div>`;
  h += `<div class="row"><span class="em">🦴</span><div><div class="nm">${tr('Reperti grezzi', 'Raw finds')}: ${S.raw.length}</div><div class="sub">${tr('Scoperte', 'Discovered')}: ${S.codex.length}/${SPECIES.length}</div></div>
      <div class="rt"><button class="btn amber" id="idAll" ${S.raw.length ? '' : 'disabled'}>${tr('Identifica tutto', 'Identify all')}</button></div></div>`;
  h += `<div id="idResult"></div>`;
  h += `<hr class="hr"><div class="bighead">${tr('Rianima una chimera', 'Reanimate a chimera')}</div>`;
  h += `<div class="muted" style="margin-bottom:8px">${tr('Monta <b>Cranio + Torace + Zampa</b> identificati', 'Assemble an identified <b>Skull + Ribcage + Leg</b>')} (🪙 ${CHIMERA_COST}): ${tr('la creatura rivive nel <b>parco</b> delle città grandi. Chimere create', 'the creature comes alive in the big-city <b>park</b>. Chimeras created')}: ${S.creatures.length}</div>`;
  const crn = S.items.filter(i => i.t === 'cranio'), tor = S.items.filter(i => i.t === 'torace'), zmp = S.items.filter(i => i.t === 'zampa');
  if (!crn.length || !tor.length || !zmp.length) {
    const miss = [!crn.length ? partName('cranio') : null, !tor.length ? partName('torace') : null, !zmp.length ? partName('zampa') : null].filter(Boolean).join(', ');
    h += `<div class="center muted">${tr('Ti manca', 'Missing')}: ${miss}.</div>`;
  } else {
    const opt = list => list.map(i => `<option value="${i.uid}">${spById[i.s].name} (${rarLabel(i.q)})</option>`).join('');
    h += `<div class="row" style="flex-wrap:wrap;gap:6px">
      <select id="selC" class="sel">${opt(crn)}</select><select id="selT" class="sel">${opt(tor)}</select><select id="selZ" class="sel">${opt(zmp)}</select>
      <div class="rt"><button class="btn clay" id="doChimera">${tr('Rianima!', 'Reanimate!')} 🪙${CHIMERA_COST}</button></div></div>`;
    h += `<div class="center" style="padding:4px 0"><canvas id="chimPrev" class="bp-cv" width="120" height="90"></canvas><div class="muted" style="font-size:11px">${tr('Anteprima della creatura assemblata', 'Preview of the assembled creature')}</div></div>`;
  }
  h += `<hr class="hr"><div class="bighead">${tr('Risveglia una specie', 'Awaken a species')}</div>`;
  h += `<div class="muted" style="margin-bottom:8px">${tr('Raccogli <b>tutti e 5 i pezzi</b> di una specie: risvegliandola la vedrai <b>VIVA</b> nel Libro. Risvegliate', 'Collect <b>all 5 pieces</b> of a species: awaken it to see it <b>ALIVE</b> in the Book. Awakened')}: ${S.awakened.length}/${SPECIES.length}</div>`;
  const ready = SPECIES.filter(s => !S.awakened.includes(s.id) && awakenReady(s.id));
  if (!ready.length) h += `<div class="center muted">${tr('Nessun set completo al momento.', 'No complete set right now.')}</div>`;
  else ready.forEach(s => h += `<div class="row"><span class="em">💫</span><div><div class="nm">${s.name}</div><div class="sub">${tr('Set completo: 5 pezzi pronti', 'Complete set: 5 pieces ready')}</div></div><div class="rt"><button class="btn amber" data-awaken="${s.id}">${tr('Risveglia', 'Awaken')}</button></div></div>`);
  h += `<hr class="hr"><div class="bighead">${tr('Libro dei Fossili', 'Fossil Book')}</div>`;
  const found = SPECIES.filter(s => S.codex.includes(s.id)).length;
  h += `<div class="row"><span class="em">📖</span><div><div class="nm">${tr('Fossili ricostruiti', 'Fossils reconstructed')}: ${found}/${SPECIES.length}</div><div class="sub">${ZONES.map(z => z.icon + ' ' + zonePools[z.id].filter(s => S.codex.includes(s.id)).length + '/10').join(' · ')}</div></div>
    <div class="rt"><button class="btn ghost" id="labBook">${tr('Apri (L)', 'Open (L)')}</button></div></div>`;
  mBody.innerHTML = withIcons(h);
  const b = document.getElementById('idAll'); if (b) b.onclick = () => {
    const rev = identifyAll();
    const keep = `<div class="bighead" style="margin-top:10px">${tr('Identificati', 'Identified')} (${rev.length})</div>` + rev.map(it => itemRow(it)).join('');
    renderLab(); document.getElementById('idResult').innerHTML = withIcons(keep);
  };
  const dc = document.getElementById('doChimera'); if (dc) dc.onclick = () => {
    const v = id => parseInt(document.getElementById(id).value, 10);
    if (assembleChimera(v('selC'), v('selT'), v('selZ'))) renderLab();
  };
  const lb = document.getElementById('labBook'); if (lb) lb.onclick = () => { bookPage = 0; openBook(); };
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
  h += `<hr class="hr"><div class="row"><span class="em">🍞</span><div><div class="nm">${tr('Ristoro', 'Snack')} (+15 ⚡)</div><div class="sub">${tr('Recupera energia al volo', 'Quick energy refill')}</div></div><div class="rt"><button class="btn amber" id="buyEn">🪙 15</button></div></div>`;
  mBody.innerHTML = withIcons(h);
  const sa = document.getElementById('sellAll'); if (sa) sa.onclick = () => { const { g, n } = sellAll(); toast(tr('Venduti ', 'Sold ') + n + tr(' reperti per 🪙', ' finds for 🪙') + g); renderStore(); };
  mBody.querySelectorAll('[data-sell]').forEach(btn => btn.onclick = () => { sellItem(parseInt(btn.dataset.sell, 10)); renderStore(); });
  const be = document.getElementById('buyEn'); if (be) be.onclick = () => { buyEnergy(); renderStore(); };
}
function renderMuseum() {
  /* il museo INDICIZZA la sua zona nel Libro dei Fossili (sagome ???) */
  const z = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
  if (!S.book[z.id]) { S.book[z.id] = true; save(); toast(tr('📖 Nuove pagine nel libro: ', '📖 New pages in the book: ') + zoneName(z.id) + '!'); }
  const complete = Object.keys(S.museum).filter(k => (S.museum[k] || []).length === 5).length;
  let h = `<div class="muted" style="margin-bottom:10px">${tr('Esponi i reperti <b>pezzo per pezzo</b>: taglia in monete per ogni pezzo nuovo. Completa <b>tutti e 5 i pezzi</b> di una specie: il museo ne estrae il <b>DNA</b> e la specie si RISVEGLIA (vista VIVA nel Libro).', 'Exhibit finds <b>piece by piece</b>: a coin bounty for each new piece. Complete <b>all 5 pieces</b> of a species: the museum extracts its <b>DNA</b> and the species AWAKENS (ALIVE view in the Book).')}</div>`;
  h += `<div class="row" style="background:#f1e6cc"><div class="nm">${tr('Specie complete', 'Complete species')}: ${complete}/${SPECIES.length}</div>
    <div class="rt"><button class="btn ghost" id="mbook">📖 ${tr('Libro', 'Book')}</button></div></div>`;
  const donatable = S.items.filter(it => !(S.museum[it.s] || []).includes(it.t));
  if (!donatable.length) h += `<div class="center muted">${tr('Nessun pezzo nuovo da esporre al momento.', 'No new pieces to exhibit right now.')}</div>`;
  else h += donatable.map(it => {
    const n = (S.museum[it.s] || []).length;
    return itemRow(it, `<div class="sub">${n}/5</div><button class="btn clay" data-don="${it.uid}">${tr('Esponi', 'Exhibit')} (+🪙${it.val * 2})</button>`);
  }).join('');
  mBody.innerHTML = withIcons(h);
  mBody.querySelectorAll('[data-don]').forEach(btn => btn.onclick = () => {
    const r = donateItem(parseInt(btn.dataset.don, 10));
    if (r === 'dup') toast(tr('Pezzo già esposto', 'Piece already exhibited'));
    else if (r && r.dna) toast(tr('🧬 DNA estratto! Specie RISVEGLIATA: guardala VIVA nel Libro (L)', '🧬 DNA extracted! Species AWAKENED: see it ALIVE in the Book (L)'));
    else if (r) toast(tr('🏛️ Esposto! Taglia +🪙', '🏛️ Exhibited! Bounty +🪙') + r.bounty + (r.count < 5 ? ' · ' + r.count + '/5' : ''));
    renderMuseum();
  });
  const mb = document.getElementById('mbook'); if (mb) mb.onclick = () => { bookPage = 0; openBook(); };
}
function renderInn() {
  mBody.innerHTML = withIcons(`<div class="center"><div style="font-size:40px">🛏️</div><div class="muted" style="margin:10px 0">${tr("Riposa per recuperare tutta l'energia. Passerà un giorno.", 'Rest to recover all energy. A day will pass.')}</div>
    <div class="row" style="justify-content:center"><div class="nm">${tr('Energia', 'Energy')}: ${S.energy}/${S.maxEnergy} · ${tr('Giorno', 'Day')} ${S.day}</div></div>
    <button class="btn" id="rest" style="margin-top:6px">${tr("Dormi fino all'alba 🌙", 'Sleep until dawn 🌙')}</button></div>`);
  document.getElementById('rest').onclick = () => { restInn(); renderInn(); };
}

/* ---------- zaino ---------- */
export function openBag() {
  mTitle.innerHTML = withIcons('🎒 ' + tr('Zaino', 'Bag'));
  let h = `<div class="row" style="background:#f1e6cc"><span class="em">🦴</span><div><div class="nm">${tr('Reperti grezzi', 'Raw finds')}: ${S.raw.length}</div><div class="sub">${tr('Portali a un Laboratorio per identificarli', 'Take them to a Laboratory to identify them')}</div></div></div>`;
  h += `<div class="bighead" style="margin-top:12px">${tr('Identificati', 'Identified')} (${S.items.length})</div>`;
  if (!S.items.length) h += `<div class="center muted">${tr('Ancora nessun reperto identificato.', 'No identified finds yet.')}</div>`;
  else h += S.items.map(it => itemRow(it)).join('');
  if (S.creatures.length) {
    h += `<div class="bighead" style="margin-top:12px">${tr('Chimere rianimate', 'Reanimated chimeras')} (${S.creatures.length})</div>`;
    h += S.creatures.map(c => `<div class="row"><span class="em">🐾</span><div><div class="nm">${c.name} ${rarSpan(c.q)}</div><div class="sub">${partName('cranio')}: ${spById[c.skull].name} · ${partName('torace')}: ${spById[c.torso].name} · ${partName('zampa')}: ${spById[c.leg].name}</div></div></div>`).join('');
  }
  h += `<div class="center" style="margin-top:8px"><button class="btn ghost" id="bagBook">📖 ${tr('Libro dei Fossili (L)', 'Fossil Book (L)')}</button></div>`;
  mBody.innerHTML = withIcons(h); openModal();
  const bb = document.getElementById('bagBook'); if (bb) bb.onclick = () => { bookPage = 0; openBook(); };
}
document.getElementById('bagbtn').onclick = () => openBag();

/* ---------- look: anteprima + swatch condivisi da editor/barbiere/sartoria ---------- */
function previewHtml() {
  return `<div class="center" style="padding:6px"><canvas id="prevCv" width="60" height="18" class="prev"></canvas></div>`;
}
export function drawPreview(noHat) {
  const pc = document.getElementById('prevCv'); if (!pc) return;
  const c2 = pc.getContext('2d'); c2.imageSmoothingEnabled = false; c2.clearRect(0, 0, 60, 18);
  drawHero(c2, 2, 1, 'down', 0, noHat); drawHero(c2, 22, 1, 'right', 0, noHat); drawHero(c2, 42, 1, 'up', 0, noHat);
}
/* sezione cappello: forme intercambiabili + colori, ultimo quadratino ✕ = senza cappello */
function hatSection() {
  let h = `<div class="bighead">${lookLabel('hat')}</div>`;
  h += styleRow('hatStyle', HAT_STYLES);
  h += `<div class="swrow">` + LOOKS.hat.map(c =>
    `<button class="sw${S.look.hat === c && S.look.hatStyle !== 'none' ? ' on' : ''}" data-field="hat" data-v="${c}" style="background:${c}"></button>`).join('') +
    `<button class="sw swx${S.look.hatStyle === 'none' ? ' on' : ''}" id="hatOff" title="Senza cappello">✕</button></div>`;
  return h;
}
/* togliere il cappello è gratis */
function wireHatOff(rerender) {
  const ho = document.getElementById('hatOff');
  if (ho) ho.onclick = () => {
    if (S.look.hatStyle === 'none') return;
    S.look.hatStyle = 'none'; applyLook(); save(); rerender();
  };
}
function swatchRow(field, colors) {
  return `<div class="swrow">` + colors.map(c =>
    `<button class="sw${S.look[field] === c ? ' on' : ''}" data-field="${field}" data-v="${c}" style="background:${c}"></button>`).join('') + `</div>`;
}
function styleRow(field, styles) {
  return `<div class="swrow">` + styles.map(st =>
    `<button class="btn ghost${S.look[field] === st.id ? ' onbtn' : ''}" data-field="${field}" data-v="${st.id}">${field === 'hatStyle' ? hatLabel(st.id) : hairLabel(st.id)}</button>`).join('') + `</div>`;
}
/* cablaggio comune: free=true → editor iniziale (gratis); altrimenti 🪙SERVICE_COST a modifica */
function wireLook(free, rerender) {
  mBody.querySelectorAll('[data-field]').forEach(b => b.onclick = () => {
    const f = b.dataset.field, v = b.dataset.v;
    if (S.look[f] === v && !(f === 'hat' && S.look.hatStyle === 'none')) return;
    if (!free && !isDebug()) {
      if (S.coins < SERVICE_COST) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + SERVICE_COST); return; }
      S.coins -= SERVICE_COST;
    }
    if (f === 'hat' && S.look.hatStyle === 'none') S.look.hatStyle = 'explorer'; // scegliere un colore lo rimette
    S.look[f] = v; applyLook(); save(); updateHUD();
    rerender();
  });
}

function renderBarber() {
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Taglio nuovo? Ogni modifica costa', 'New haircut? Each change costs')} 🪙 ${SERVICE_COST}. ${tr('(Anteprima senza cappello)', '(Preview without hat)')}</div>`;
  h += previewHtml();
  h += `<div class="bighead">${tr('Taglio', 'Haircut')}</div>` + styleRow('hairStyle', HAIR_STYLES);
  h += `<div class="bighead">${tr('Colore', 'Color')}</div>` + swatchRow('hairColor', HAIR_COLORS);
  mBody.innerHTML = withIcons(h); wireLook(false, renderBarber); drawPreview(true);
}
function renderTailor() {
  let h = `<div class="muted" style="margin-bottom:8px">${tr('Vestiti nuovi? Ogni capo costa', 'New clothes? Each item costs')} 🪙 ${SERVICE_COST}. ${tr('Togliere il cappello (✕) è gratis.', 'Removing the hat (✕) is free.')}</div>`;
  h += previewHtml();
  h += hatSection();
  for (const k of ['shirt', 'pants']) h += `<div class="bighead">${lookLabel(k)}</div>` + swatchRow(k, LOOKS[k]);
  mBody.innerHTML = withIcons(h); wireLook(false, renderTailor); wireHatOff(renderTailor); drawPreview();
}

/* ---------- Libro dei Fossili: scheletri ricostruiti, sfogliabile ---------- */
/* proiezione 2D STATICA dello STESSO modello voxel del 3D: vista laterale,
   ossa bianche (3 toni per profondità z) su fondo scuro. Coerenza garantita. */
function drawVoxel2D(cv, spec, silhouette, flesh) {
  const c2 = cv.getContext && cv.getContext('2d'); if (!c2) return;
  c2.imageSmoothingEnabled = false;
  c2.fillStyle = '#15120d'; c2.fillRect(0, 0, cv.width, cv.height);
  const vox = flesh ? buildFleshVoxels(spec) : buildVoxels(spec);
  let mnx = 9e9, mxx = -9e9, mny = 9e9, mxy = -9e9, mnz = 9e9, mxz = -9e9;
  for (const v of vox) {
    mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x);
    mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y);
    mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z);
  }
  const spanX = mxx - mnx + 1, spanY = mxy - mny + 1;
  const s = Math.max(1, Math.floor(Math.min(cv.width / (spanX + 2), cv.height / (spanY + 2))));
  const ox = Math.floor((cv.width - spanX * s) / 2), oy = Math.floor((cv.height - spanY * s) / 2);
  const zr = Math.max(1, mxz - mnz);
  for (const v of vox.slice().sort((a, b) => a.z - b.z)) { // lontano→vicino
    let col;
    const zt = (v.z - mnz) / zr;
    if (silhouette) col = '#4a4438';
    else if (v.col) col = zt < 0.34 ? shadeHex(v.col, 0.72) : zt < 0.67 ? v.col : shadeHex(v.col, 1.18);
    else if (v.k === 'eye') col = '#15120d';
    else col = zt < 0.34 ? '#8f887a' : zt < 0.67 ? '#d6d0c2' : '#ffffff';
    c2.fillStyle = col;
    c2.fillRect(ox + (v.x - mnx) * s, oy + (mxy - v.y) * s, s, s);
  }
}
let bookPage = 0;
let liveViews = []; // viste 3D attive (libro/anteprime): da smontare a ogni cambio
function disposeViews() { liveViews.forEach(v => { try { v.dispose(); } catch (e) { /* ok */ } }); liveViews = []; }
/* monta la vista 3D voxel; se WebGL non c'è (o siamo nei test) ripiega sulla proiezione 2D */
const viewByCv = new Map();
function mount3D(cv, spec, silhouette, flesh) {
  if (typeof window === 'undefined') return;
  import('./skeleton3d.js').then(({ mountSkeleton }) => {
    try { const h = mountSkeleton(cv, spec, { silhouette, flesh }); liveViews.push(h); viewByCv.set(cv, h); }
    catch (e) { drawVoxel2D(cv, spec, silhouette, flesh); }
  }).catch(() => drawVoxel2D(cv, spec, silhouette, flesh));
}
/* il contesto WebGL della canvas muore col dispose: si rimonta su una canvas CLONATA fresca */
function remount3D(cv, spec, silhouette, flesh) {
  const h = viewByCv.get(cv);
  if (h) { try { h.dispose(); } catch (e) { /* ok */ } liveViews = liveViews.filter(x => x !== h); viewByCv.delete(cv); }
  let target = cv;
  if (cv.parentNode && cv.cloneNode) { target = cv.cloneNode(false); cv.parentNode.replaceChild(target, cv); }
  mount3D(target, spec, silhouette, flesh);
  return target;
}
let bookOpen = false;
export function isBookOpen() { return bookOpen; }
/* sfogliata animata: la pagina si piega, il contenuto cambia a metà giro */
let flipping = false, bookMaxPage = 0;
export function bookFlip(dir) {
  if (flipping) return;
  if (dir > 0 && bookPage >= bookMaxPage) return; // ultima pagina: non si sfoglia oltre
  if (dir < 0 && bookPage <= 0) return;           // prima pagina: niente indietro
  const pagesEl = document.getElementById('bk-pages');
  if (!pagesEl || !pagesEl.classList || typeof requestAnimationFrame === 'undefined') { bookPage += dir; openBook(); return; }
  flipping = true;
  pagesEl.classList.add(dir > 0 ? 'turn-r' : 'turn-l');
  setTimeout(() => {
    bookPage += dir; openBook();
    pagesEl.classList.remove('turn-r', 'turn-l');
    pagesEl.classList.add(dir > 0 ? 'in-r' : 'in-l');
    setTimeout(() => { pagesEl.classList.remove('in-r', 'in-l'); flipping = false; }, 220);
  }, 170);
}
export function closeBook() {
  bookOpen = false;
  document.getElementById('bookov').classList.remove('on');
  disposeViews();
}
/* descrizione generata dalle caratteristiche della specie */
function descFor(sp) {
  const r = BP[sp.id] || {};
  const segs = (r.seg || [2]).length, big = Math.max(...(r.seg || [2]));
  const bits = [];
  bits.push([tr('Creatura minuta', 'A tiny creature'), tr('Creatura di taglia media', 'A mid-sized creature'), tr('Creatura imponente', 'A towering creature')][Math.max(0, Math.min(2, big - 1))]);
  if (segs >= 3) bits.push(tr(`dal corpo in ${segs} segmenti`, `with a ${segs}-segment body`));
  if (r.legs && r.legs[0] >= 6) bits.push(tr(`con ${r.legs[0]} zampe${r.legs[1] >= 2 ? ' lunghissime' : ''}`, `with ${r.legs[0]}${r.legs[1] >= 2 ? ' very long' : ''} legs`));
  else if (r.legs && r.legs[0] === 2 && r.tall) bits.push(tr('eretta su due zampe', 'standing on two legs'));
  else if (r.legs && r.legs[0] === 0 && !r.float) bits.push(tr('che striscia senza zampe', 'slithering legless'));
  if (r.float) bits.push(tr("che fluttua a mezz'aria", 'drifting in mid-air'));
  if (r.wings) bits.push(tr(`${r.wings[0]} ali`, `${r.wings[0]} wings`) + (r.wings[1] === 'f' ? tr(' piumate', ' of feathers') : r.wings[1] === 'i' ? tr(' da insetto', ' like an insect') : tr(' membranose', ' of membrane')));
  if (r.mand) bits.push(tr('grandi chele', 'great pincers'));
  if (r.ant) bits.push(tr('lunghe antenne', 'long antennae'));
  if (r.prob) bits.push(tr('una proboscide ad ago', 'a needle-like proboscis'));
  if ((r.horns === undefined ? 1 : r.horns) === 2 && r.head !== 'none') bits.push(tr('due corni', 'two horns'));
  const tailTxt = { club: tr('una coda a mazza chiodata', 'a spiked club tail'), sting: tr('un pungiglione ricurvo', 'a curved stinger'), fin: tr('una coda pinnata', 'a finned tail'), fan: tr('una coda a ventaglio', 'a fan tail'), long: tr('una lunga coda', 'a long tail') }[r.tail];
  if (tailTxt) bits.push(tailTxt);
  const extraTxt = { sail: tr('una vela dorsale', 'a dorsal sail'), spikes: tr('aculei sul dorso', 'spikes along the back'), shell: tr('un guscio a cupola', 'a domed shell'), hump: tr('una gobba possente', 'a mighty hump') }[r.extra];
  if (extraTxt) bits.push(extraTxt);
  const zoneFlavor = {
    prati: tr('Brucava placido tra le spighe dei Prati Dorati.', 'It grazed peacefully among the Golden Meadows.'),
    dune: tr('Scivolava silenzioso tra le sabbie delle Dune Ossee.', 'It glided silently across the Bone Dunes.'),
    boschi: tr('Si aggirava nella bruma dei Boschi Cinerei.', 'It roamed the mists of the Ashen Woods.'),
    terre: tr('Sfidava il calore delle Terre Rosse.', 'It braved the heat of the Red Lands.'),
    palude: tr('Affondava quieto nelle acque della Palude Antica.', 'It waded quietly through the Ancient Marsh.'),
    ghiacci: tr('Resisteva ai venti taglienti delle Lande Gelide.', 'It endured the cutting winds of the Frozen Wastes.'),
  }[sp.zone];
  const rarNote = sp.r === 'leggendario' ? tr(' Creatura di leggenda: pochi ne hanno mai visto le ossa.', ' A creature of legend: few have ever seen its bones.')
    : sp.r === 'eccezionale' ? tr(' Ritrovamento assai prezioso.', ' A most precious find.') : '';
  return `${bits[0]}${bits.length > 1 ? ', ' + bits.slice(1).join(', ') : ''}. ${zoneFlavor}${rarNote}`;
}
function bookPageHtml(sp, pageNo) {
  if (!sp) return `<div class="bkpage empty"></div>`;
  const known = S.codex.includes(sp.id) || isDebug();
  const z = ZONES.find(x => x.id === sp.zone);
  const owned = S.items.filter(it => it.s === sp.id).length;
  const donated = S.donated.includes(sp.id);
  const awake = S.awakened.includes(sp.id) || isDebug(); // risvegliato al Lab con tutti i 5 pezzi
  return `<div class="bkpage">
    <div class="bk-head">
      <canvas class="bk-sketch" data-sp2="${sp.id}" width="60" height="44" title="Schizzo di campo"></canvas>
      <div class="bk-zone">${z.icon} ${zoneName(z.id)}</div>
    </div>
    <div class="bk-cvwrap">
      <canvas class="bp-cv" data-sp="${sp.id}" width="220" height="165" title="Trascina per ruotare"></canvas>
      ${known && awake ? `<button class="bk-flip3d" data-fs="${sp.id}">▶ ${tr('Vivo', 'Alive')}</button>` : ''}
    </div>
    <div class="bk-name">${known ? sp.name : '? ? ?'} ${rarSpan(sp.r)}</div>
    <div class="bk-desc">${known ? descFor(sp) : tr('Ossa non ancora ricostruite. Scava nelle ', 'Bones not yet reconstructed. Dig in the ') + zoneName(z.id) + tr(' e porta i reperti al Laboratorio per identificarli.', ' and take your finds to the Laboratory.')}</div>
    <div class="bk-foot">
      <div class="bk-meta">
        <span>🗺️ ${zoneName(z.id)}</span>
        <span>🦴 ${tr('Possiedi', 'Owned')}: ${owned}</span>
        ${donated ? '<span>🏛️ ✓</span>' : ''}
        ${awake ? `<span>💫 ${tr('Risvegliato', 'Awakened')}</span>` : (known ? `<span title="${tr('Porta tutti e 5 i pezzi al Laboratorio', 'Bring all 5 pieces to the Laboratory')}">🧬 ${tr('5 pezzi', '5 pieces')}</span>` : '')}
      </div>
      <div class="bk-pageno">— ${pageNo} —</div>
    </div>
  </div>`;
}
export function openBook() {
  disposeViews();
  bookOpen = true;
  const ov = document.getElementById('bookov'); ov.classList.add('on');
  const pagesEl = document.getElementById('bk-pages'), navEl = document.getElementById('bk-nav');
  /* pagine: specie delle zone indicizzate dal museo, o già identificate (debug: tutto) */
  const visible = isDebug() ? SPECIES.slice() : SPECIES.filter(s => S.book[s.zone] || S.codex.includes(s.id));
  const lockedZones = isDebug() ? [] : ZONES.filter(z => !S.book[z.id]);
  const maxPage = Math.max(0, Math.ceil(visible.length / 2) - 1);
  bookMaxPage = maxPage;
  bookPage = Math.max(0, Math.min(bookPage, maxPage));
  if (!visible.length) {
    pagesEl.innerHTML = withIcons(`<div class="bkpage"><div class="bk-name" style="margin-top:40px">${tr('Il libro è vuoto', 'The book is empty')}</div>
      <div class="bk-desc" style="text-align:center">${tr('Visita il <b>Museo</b> di una zona per indicizzarne i fossili,<br>poi scava e identifica per completare le pagine.', 'Visit a zone\'s <b>Museum</b> to index its fossils,<br>then dig and identify to complete the pages.')}</div></div>`);
    navEl.innerHTML = '';
  } else {
    pagesEl.innerHTML = withIcons(bookPageHtml(visible[bookPage * 2], bookPage * 2 + 1) + bookPageHtml(visible[bookPage * 2 + 1], bookPage * 2 + 2));
    const found = SPECIES.filter(s => S.codex.includes(s.id)).length;
    navEl.innerHTML = withIcons(`<button class="btn ghost" id="bkPrev" ${bookPage <= 0 ? 'disabled' : ''}>‹</button>
      <span>${bookPage + 1} / ${maxPage + 1}</span>
      <button class="btn ghost" id="bkNext" ${bookPage >= maxPage ? 'disabled' : ''}>›</button>
      <span style="font-weight:700;font-size:11px;opacity:.85">📖 ${found}/${SPECIES.length}${lockedZones.length ? ' · ' + tr('da indicizzare', 'to index') + ': ' + lockedZones.map(z => z.icon).join(' ') : ''}</span>`);
    pagesEl.querySelectorAll('.bp-cv').forEach(cv => {
      const sp = spById[cv.dataset.sp];
      mount3D(cv, baseSpec(sp), !(S.codex.includes(sp.id) || isDebug())); // scheletro voxel 3D rotante+draggabile
    });
    pagesEl.querySelectorAll('.bk-sketch').forEach(cv => {   // stesso modello, proiezione 2D statica bianca
      const sp = spById[cv.dataset.sp2];
      drawVoxel2D(cv, baseSpec(sp), !(S.codex.includes(sp.id) || isDebug()));
    });
    /* freccia sul 3D: switch scheletro ↔ animale VIVO */
    pagesEl.querySelectorAll('.bk-flip3d').forEach(b => b.onclick = () => {
      const sp = spById[b.dataset.fs];
      const cv = b.parentElement.querySelector('.bp-cv');
      const flesh = b.dataset.mode !== 'flesh';
      b.dataset.mode = flesh ? 'flesh' : '';
      b.textContent = flesh ? '◀ ' + tr('Scheletro', 'Skeleton') : '▶ ' + tr('Vivo', 'Alive');
      remount3D(cv, baseSpec(sp), false, flesh);
    });
    /* risma di fogli ai lati: spessore proporzionale a dove sei nel libro */
    const el2 = document.getElementById('bk-edge-l'), er2 = document.getElementById('bk-edge-r');
    if (el2 && el2.style) { el2.style.width = Math.min(18, 2 + bookPage * 2) + 'px'; er2.style.width = Math.min(18, 2 + (maxPage - bookPage) * 2) + 'px'; }
    const bp = document.getElementById('bkPrev'), bn = document.getElementById('bkNext');
    if (bp) bp.onclick = () => bookFlip(-1);
    if (bn) bn.onclick = () => bookFlip(1);
  }
}
document.getElementById('bk-close').onclick = () => closeBook();
document.getElementById('bookov').addEventListener('click', e => { if (e.target === document.getElementById('bookov')) closeBook(); });

/* ---------- editor iniziale (prima partita, gratis) ---------- */
export function openEditor(onDone) {
  mTitle.innerHTML = withIcons('🎨 ' + tr('Crea il tuo Digsy', 'Create your Digsy'));
  let h = previewHtml();
  h += hatSection();
  for (const k of ['shirt', 'pants', 'skin']) h += `<div class="bighead">${lookLabel(k)}</div>` + swatchRow(k, LOOKS[k]);
  h += `<div class="bighead">${tr('Taglio', 'Haircut')}</div>` + styleRow('hairStyle', HAIR_STYLES);
  h += `<div class="bighead">${tr('Colore capelli', 'Hair color')}</div>` + swatchRow('hairColor', HAIR_COLORS);
  h += `<div class="center" style="margin-top:10px"><button class="btn amber" id="lookDone" style="font-size:15px">⛏️ ${tr("Inizia l'avventura!", 'Start the adventure!')}</button></div>`;
  mBody.innerHTML = withIcons(h);
  const rerender = () => openEditor(onDone);
  wireLook(true, rerender); wireHatOff(rerender); drawPreview();
  document.getElementById('lookDone').onclick = () => {
    S.lookDone = true; save(); closeModal();
    if (onDone) onDone();
  };
  openModal();
}
