/* Meccaniche: scavo, economia, chimere, collisioni, interazione */
import { TS, PARTS, RAR, ptById, spById, zonePools, CHIMERA_COST } from './data.js';
import { S, P, save, dugSet } from './state.js';
import { baseTerrain, diggable, digChance, townInfo, solidPx, siteForCell, SCELL } from './world.js';
import { zoneAt } from './regions.js';
import { isDebug } from './debug.js';
import { toast, updateHUD, openBuilding } from './ui.js';
import { INT, nearNpc } from './interior.js';
import { tr, partName, rarLabel } from './i18n.js';

/* ---------- scavo ---------- */
/* gradiente di esplorazione: più lontano dall'origine → più peso a rari e leggendari */
export function rarWeights(dist) {
  const g = 1 + Math.min(2, (dist || 0) / 600); // in tile
  return { comune: 58 / g, raro: 27, eccezionale: 12 * g, leggendario: 3 * g * g };
}
/* reperto della ZONA: specie pescata con peso = rarità intrinseca (× gradiente distanza) */
export function makeRaw(zoneId, dist, forceRar) {
  const pool = zonePools[zoneId] || zonePools.prati;
  let sp;
  if (forceRar) {
    const cand = pool.filter(s => s.r === forceRar);
    sp = cand[Math.floor(Math.random() * cand.length)] || pool[0];
  } else {
    const w = rarWeights(dist);
    const tot = pool.reduce((a, s) => a + w[s.r], 0);
    let r = Math.random() * tot;
    sp = pool[0];
    for (const s of pool) { r -= w[s.r]; if (r <= 0) { sp = s; break; } }
  }
  const part = PARTS[Math.floor(Math.random() * PARTS.length)].id;
  const val = Math.max(2, Math.round(7 * ptById[part].mult * RAR.find(r => r.id === sp.r).mult * (1 + (dist || 0) / 900)));
  return { uid: S.uid++, s: sp.id, t: part, q: sp.r, val };
}
/* ---------- animazione di scavo: i controlli subito, l'esito a fine colpi ---------- */
function beginDig(dur, cb) { if (P.digging) return false; P.digging = { t: 0, dur, cb }; return true; }
/* chiamato dal game loop: avanza l'animazione e risolve alla fine */
export function stepDig(dt) {
  const d = P.digging; if (!d) return;
  d.t += dt;
  if (d.t >= d.dur) { P.digging = null; d.cb(); }
}
/* si scava la casella VERSO CUI si guarda */
export function digTarget() {
  const fx = P.dir === 'left' ? -1 : P.dir === 'right' ? 1 : 0;
  const fy = P.dir === 'up' ? -1 : P.dir === 'down' ? 1 : 0;
  return { tx: Math.floor(P.x / TS) + fx, ty: Math.floor(P.y / TS) + fy };
}
export function tryDig() {
  const { tx, ty } = digTarget();
  const key = tx + ',' + ty;
  const t = baseTerrain(tx, ty);
  const ti = townInfo(tx, ty);
  if (ti && ti.floor) { toast(tr('Non si scava in città', 'No digging in town')); return; }
  if (!diggable(t)) { toast(tr('Qui non si può scavare', 'You can\'t dig here')); return; }
  if (dugSet.has(key)) { toast(tr('Già scavato qui', 'Already dug here')); return; }
  if (S.energy <= 0 && !isDebug()) { toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn')); return; }
  beginDig(0.45, () => {
    if (!isDebug()) S.energy--;
    dugSet.add(key); S.dug.push(key);
    if (Math.random() < (digChance[t] || 0.3)) {
      const raw = makeRaw(zoneAt(tx, ty).id, Math.hypot(tx, ty)); S.raw.push(raw);
      toast(tr('Reperto grezzo trovato! (da identificare)', 'Raw find unearthed! (needs identifying)'));
    } else {
      toast(tr('…solo terra', '…just dirt'));
    }
    save(); updateHUD();
  });
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
/* lancia 1 🪙 nella fontana: quasi sempre nulla, a salire fino al leggendario (molto raro) */
export function tossCoin() {
  if (S.coins < 1 && !isDebug()) { toast(tr('Serve 1 🪙 da lanciare', 'You need 1 🪙 to toss')); return; }
  if (!isDebug()) S.coins--;
  const r = Math.random();
  // 55% nulla · 30% comune · 10% raro · 4% eccezionale · 1% leggendario
  const rar = r < 0.55 ? null : r < 0.85 ? 'comune' : r < 0.95 ? 'raro' : r < 0.99 ? 'eccezionale' : 'leggendario';
  if (!rar) {
    toast(tr('🪙 Plin! …solo cerchi nell\'acqua', '🪙 Plink! …just ripples'));
  } else {
    const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
    const it = makeRaw(zoneAt(ptx, pty).id, Math.hypot(ptx, pty), rar);
    S.items.push(it); if (!S.codex.includes(it.s)) S.codex.push(it.s);
    toast(tr('✨ La fontana ti dona: ', '✨ The fountain grants you: ') + partName(it.t) + tr(' di ', ' of ') + spById[it.s].name + ' (' + rarLabel(rar) + ')');
  }
  save(); updateHUD();
}
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
  if (S.energy <= 0 && !isDebug()) { toast(tr('Senza energia — riposa alla Locanda', 'Out of energy — rest at the Inn')); return; }
  beginDig(0.55, () => {
    if (!isDebug()) S.energy--;
    S.sites[s.key] = (S.sites[s.key] || 0) + 1;
    const dist = Math.hypot(s.x, s.y);
    const w = siteRarWeights(dist);
    const tot = w.raro + w.eccezionale + w.leggendario;
    let r = Math.random() * tot, rar = 'raro';
    for (const q of ['raro', 'eccezionale', 'leggendario']) { r -= w[q]; if (r <= 0) { rar = q; break; } }
    const raw = makeRaw(zoneAt(s.x, s.y).id, dist, rar);
    S.raw.push(raw);
    toast(tr('⛏️✨ Reperto pregiato dal sito! (', '⛏️✨ Precious find from the site! (') + (rem - 1) + tr(' rimasti)', ' left)'));
    save(); updateHUD();
  });
}
export function act() {
  if (P.digging) return; // un colpo alla volta
  if (INT.active) { if (nearNpc()) openBuilding(INT.b); return; } // parla con l'NPC
  if (nearbySite()) { digSite(); return; }
  if (nearbyFountain()) { tossCoin(); return; }
  tryDig();
}

/* ---------- economia ---------- */
export function identifyAll() {
  if (!S.raw.length) { toast(tr('Niente da identificare', 'Nothing to identify')); return []; }
  const revealed = S.raw.slice();
  S.raw.forEach(it => { S.items.push(it); if (!S.codex.includes(it.s)) S.codex.push(it.s); });
  S.raw = []; save(); updateHUD(); return revealed;
}
export function sellItem(uid) { const i = S.items.findIndex(x => x.uid === uid); if (i < 0) return; const it = S.items[i]; S.coins += it.val; S.items.splice(i, 1); save(); updateHUD(); }
export function sellAll() { let g = 0; S.items.forEach(it => g += it.val); S.coins += g; const n = S.items.length; S.items = []; save(); updateHUD(); return { g, n }; }
/* museo: si espone PEZZO PER PEZZO. Taglia in monete per ogni pezzo nuovo;
   completare tutti e 5 i pezzi di una specie → il museo estrae il DNA = specie RISVEGLIATA. */
export function donateItem(uid) {
  const i = S.items.findIndex(x => x.uid === uid); if (i < 0) return false;
  const it = S.items[i];
  const col = S.museum[it.s] || (S.museum[it.s] = []);
  if (col.includes(it.t)) return 'dup';
  col.push(it.t); S.items.splice(i, 1);
  const bounty = it.val * 2; S.coins += bounty;
  let dna = false;
  if (col.length === PARTS.length) {
    if (!S.donated.includes(it.s)) S.donated.push(it.s);
    if (!S.awakened.includes(it.s)) { S.awakened.push(it.s); dna = true; }
  }
  save(); updateHUD();
  return { bounty, dna, count: col.length };
}
/* dormire porta SEMPRE all'alba del giorno dopo (tod=0.02 → pieno giorno) */
export function restInn() { S.energy = S.maxEnergy; S.day++; S.tod = 0.02; save(); updateHUD(); toast(tr('Alba del giorno ', 'Dawn of day ') + S.day + tr('! Energia piena', '! Full energy')); }
export function buyEnergy() {
  if (S.coins < 15 && !isDebug()) { toast(tr('Servono 15 🪙', 'You need 15 🪙')); return; }
  if (S.energy >= S.maxEnergy) { toast(tr('Energia già piena', 'Energy already full')); return; }
  if (!isDebug()) S.coins -= 15;
  S.energy = Math.min(S.maxEnergy, S.energy + 15); save(); updateHUD();
}

/* ---------- chimere ---------- */
/* nome portmanteau: attacco del nome-cranio + finale del nome-zampa ("Gastro"+"donte") */
export function chimeraName(skullSp, legSp) {
  const pre = (skullSp.name.match(/^[^aeiou]*[aeiou]+[^aeiou]+[aeiou]/i) || [skullSp.name.slice(0, 5)])[0];
  const suf = (legSp.name.match(/[^aeiou]?[aeiou][^aeiou]+[aeiou]+$/i) || [legSp.name.slice(-5)])[0];
  return /[aeiou]$/i.test(pre) && /^[aeiou]/i.test(suf) ? pre + suf.replace(/^[aeiou]+/i, '') : pre + suf;
}
export function assembleChimera(uidC, uidT, uidZ) {
  if (S.coins < CHIMERA_COST && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + CHIMERA_COST); return false; }
  const pick = u => S.items.find(x => x.uid === u);
  const c = pick(uidC), t = pick(uidT), z = pick(uidZ);
  if (!c || !t || !z || c.t !== 'cranio' || t.t !== 'torace' || z.t !== 'zampa') return false;
  if (!isDebug()) S.coins -= CHIMERA_COST;
  [uidC, uidT, uidZ].forEach(u => { const i = S.items.findIndex(x => x.uid === u); S.items.splice(i, 1); });
  const ri = Math.max(...[c, t, z].map(it => RAR.findIndex(r => r.id === it.q)));
  const cr = { uid: S.uid++, name: chimeraName(spById[c.s], spById[z.s]), skull: c.s, torso: t.s, leg: z.s, q: RAR[ri].id };
  S.creatures.push(cr); save(); updateHUD();
  toast('✨ ' + cr.name + tr(' si è rianimato! Passeggia nel parco delle città grandi', ' has been reanimated! It roams the big-city park'));
  return true;
}

/* ---------- risveglio: TUTTI e 5 i pezzi di una specie → nel Libro appare VIVA ---------- */
export function awakenReady(spId) {
  return PARTS.every(pt => S.items.some(it => it.s === spId && it.t === pt.id));
}
export function awakenSpecies(spId) {
  if (S.awakened.includes(spId) || !awakenReady(spId)) return false;
  for (const pt of PARTS) { const i = S.items.findIndex(it => it.s === spId && it.t === pt.id); S.items.splice(i, 1); }
  S.awakened.push(spId);
  save(); updateHUD();
  toast('💫 ' + spById[spId].name + tr(' è stato risvegliato! Guardalo VIVO nel Libro (L)', ' has been awakened! See it ALIVE in the Book (L)'));
  return true;
}

/* ---------- collisione player (4 angoli dei piedi) ---------- */
export function collide(x, y) { return solidPx(x - 5, y + 10) || solidPx(x + 5, y + 10) || solidPx(x - 5, y + 15) || solidPx(x + 5, y + 15); }
