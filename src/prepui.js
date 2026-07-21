/* TAVOLO DI PREPARAZIONE — la parte visibile del RESTAURO in 3 passi (logica pura in prepare.js).
   Passo 1 PENNELLO: spolveri, il fossile compare (nessun danno). Passo 2 SCALPELLO: stacchi la
   roccia attorno, senza toccare l'osso (preciso, danni). Passo 3 SPATOLA: rifinisci l'osso
   (preciso, danni). Il passo avanza da solo quando hai finito quello prima; in alto c'è sempre
   scritto cosa fare. Due barre: Pulizia e Integrità. Niente timer, si smette quando si vuole. */
import { S, save } from './state.js';
import { spById } from './data.js';
import { partVoxels } from './bones.js';
import { projectVox } from './voxview.js';
import { newBoard, work, dustPct, cleanPct, integrity, gradeFor, applyPrep, isPrepped, PHASES, W as PW, H as PH } from './prepare.js';
import { withIcons } from './icons.js';
import { tr, partName } from './i18n.js';
import { playSfx } from './audio.js';
import { toast } from './ui.js';
import { gainXp } from './gameplay.js';

/* UN candidato per consegna: il pezzo di rarità più alta non ancora preparato, solo da raro in su */
const PREP_MIN = ['raro', 'eccezionale', 'leggendario'];
export function prepCandidate() {
  let best = null;
  (S.raw || []).forEach((it) => {
    if (isPrepped(it) || !PREP_MIN.includes(it.q)) return;
    if (!best || (it.val || 0) > (best.it.val || 0)) best = { it };
  });
  return best;
}

const TOOL_R = { pennello: 1.9, scalpello: 0.85, spatola: 0.85 };
/* istruzione del passo — tr() LETTERALI (così i18n riconosce le stringhe: coverage + orfane) */
function stepText() {
  const t = curTool();
  if (t === 'pennello') return tr('Passo 1/3 · Pennello — spolvera per far comparire il fossile', 'Step 1/3 · Brush — dust it off to reveal the fossil');
  if (t === 'scalpello') return tr('Passo 2/3 · Scalpello — stacca la roccia attorno, NON toccare l\'osso', 'Step 2/3 · Chisel — chip the rock around it, DON\'T touch the bone');
  return tr('Passo 3/3 · Spatola — pulisci l\'osso con delicatezza', 'Step 3/3 · Spatula — clean the bone gently');
}
let prepBoard = null, prepItem = null, prepAfter = null, prepOpenFlag = false, prepPhase = 0;
export function isPrepOpen() { return prepOpenFlag; }

/* maschera dell'OSSO per cella: dove la proiezione voxel del pezzo ha pixel (sfondo trasparente). */
function boneMaskFor(item, cvw, cvh) {
  const mask = new Uint8Array(PW * PH);
  let n = 0;
  try {
    const off = document.createElement('canvas'); off.width = cvw; off.height = cvh;
    projectVox(off, partVoxels(item.s, item.t), false, null, false, 14); // bg=false → trasparente
    const data = off.getContext('2d').getImageData(0, 0, cvw, cvh).data;
    const cw = Math.floor(cvw / PW), ch = Math.floor(cvh / PH);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const sx = x * cw + (cw >> 1), sy = y * ch + (ch >> 1);
      if (data[(sy * cvw + sx) * 4 + 3] > 40) { mask[y * PW + x] = 1; n++; }
    }
  } catch (e) { /* niente pixel */ }
  return n ? mask : null;   // silhouette vuota → null: newBoard usa la forma di ripiego
}

function curTool() { return PHASES[Math.min(prepPhase, PHASES.length - 1)].tool; }
function refreshTools() {
  for (const p of PHASES) {
    const el = document.getElementById('pr-t-' + p.tool);
    if (el) el.classList.toggle('on', p.tool === curTool());
  }
  const step = document.getElementById('pr-hint');
  if (step) step.innerHTML = withIcons(stepText());
}
/* avanza di passo quando quello corrente è completo abbastanza */
function maybeAdvance() {
  const ph = PHASES[prepPhase]; if (!ph || prepPhase >= PHASES.length - 1) return;
  if (ph.pct(prepBoard) >= ph.need) { prepPhase++; playSfx('found'); refreshTools(); }
}

export function openPrepare(item, after) {
  const ov = document.getElementById('prepov'); if (!ov) return;
  prepItem = item; prepAfter = after || null; prepPhase = 0;
  const cv = document.getElementById('pr-cv');
  const cvw = cv ? cv.width : 224, cvh = cv ? cv.height : 192;
  prepBoard = newBoard(hashSeed(item.s + '|' + item.t + '|' + item.uid), boneMaskFor(item, cvw, cvh));
  prepOpenFlag = true;
  ov.classList.add('on');
  refreshTools();
  const sp = spById[item.s];
  const ttl = document.getElementById('pr-title');
  if (ttl) ttl.innerHTML = withIcons(partName(item.t) + ' ' + tr('di', 'of') + ' ' + (sp ? sp.name : item.s));
  drawPrep();
  if (cv && !cv.dataset.wired) {
    cv.dataset.wired = '1';
    let down = false, lx = 0, ly = 0;
    const at = ev => {
      const r = cv.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev;
      return { cx: (p.clientX - r.left) / r.width * PW, cy: (p.clientY - r.top) / r.height * PH };
    };
    const apply = (cx, cy) => {
      const tool = curTool(), r = TOOL_R[tool];
      const d = Math.hypot(cx - lx, cy - ly), steps = Math.max(1, Math.floor(d / 0.7));
      let workDone = 0, harm = 0;
      for (let k = 1; k <= steps; k++) { const res = work(prepBoard, tool, lx + (cx - lx) * k / steps, ly + (cy - ly) * k / steps, r); workDone += res.work; harm += res.harm; }
      lx = cx; ly = cy;
      if (workDone > 0.01 || harm > 0.001) { drawPrep(); maybeAdvance(); if (harm > 0.02) playSfx('nope'); else if (workDone > 0.01) playSfx('dig'); }
    };
    cv.addEventListener('pointerdown', ev => { down = true; cv.setPointerCapture && cv.setPointerCapture(ev.pointerId); const p = at(ev); lx = p.cx; ly = p.cy; apply(p.cx, p.cy); });
    cv.addEventListener('pointermove', ev => { if (!down || !prepBoard) return; ev.preventDefault(); const p = at(ev); apply(p.cx, p.cy); });
    cv.addEventListener('pointerup', () => { down = false; });
    cv.addEventListener('pointercancel', () => { down = false; });
  }
  const done = document.getElementById('pr-done'); if (done) done.onclick = () => finishPrep();
  const x = document.getElementById('pr-close'); if (x) x.onclick = () => finishPrep();
}
function hashSeed(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h % 9973); }
export function closePrepare() {
  prepOpenFlag = false; prepBoard = null; prepItem = null;
  const ov = document.getElementById('prepov'); if (ov && ov.classList) ov.classList.remove('on');
}
function finishPrep() {
  const it = prepItem, clean = cleanPct(prepBoard), integ = integrity(prepBoard), after = prepAfter;
  const g = applyPrep(it, clean, integ);
  closePrepare();
  if (g) {
    if (g.xp) gainXp(g.xp);
    const label = { perfetto: tr('Restauro perfetto', 'Perfect restoration'), buono: tr('Ben restaurato', 'Well restored'),
      grezzo: tr('Ripulito alla buona', 'Roughly cleaned'), niente: tr('Lasciato grezzo', 'Left rough') }[g.id];
    toast('🪶 ' + label + ' — ' + tr('pulizia', 'clean') + ' ' + Math.round(clean * 100) + '% · ' + tr('integrità', 'intact') + ' ' + Math.round(integ * 100) + '% · ' + tr('valore', 'value') + ' ×' + g.mult + (g.xp ? ' · +' + g.xp + ' XP' : ''));
    if (g.id === 'perfetto') playSfx('fanfare');
  }
  if (after) after();
}
function drawPrep() {
  const cv = document.getElementById('pr-cv'); if (!cv || !prepBoard) return;
  const c2 = cv.getContext && cv.getContext('2d'); if (!c2) return;
  /* base: il FOSSILE vero su fondo scuro (la matrice attorno è scura, ci va sopra la roccia) */
  try { projectVox(cv, partVoxels(prepItem.s, prepItem.t), false, null, '#2a1c12', 14); }
  catch (e) { c2.fillStyle = '#2a1c12'; c2.fillRect(0, 0, cv.width, cv.height); }
  const cw = Math.floor(cv.width / PW), ch = Math.floor(cv.height / PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x, px = x * cw, py = y * ch;
    if (!prepBoard.bone[i] && prepBoard.rock[i] > 0) {            // ROCCIA sulla matrice
      const t = (x * 7 + y * 13) % 3;
      c2.globalAlpha = prepBoard.rock[i];
      c2.fillStyle = t === 0 ? '#736a5c' : t === 1 ? '#847a68' : '#655c50';
      c2.fillRect(px, py, cw, ch);
      c2.globalAlpha = 1; c2.fillStyle = 'rgba(0,0,0,.18)'; c2.fillRect(px, py + ch - 2, cw, 2);
    } else if (prepBoard.bone[i] && prepBoard.crust[i] > 0) {     // CROSTA sull'osso (vela)
      c2.globalAlpha = prepBoard.crust[i] * 0.7;
      c2.fillStyle = '#9a8b6e'; c2.fillRect(px, py, cw, ch); c2.globalAlpha = 1;
    }
    if (prepBoard.dust[i] > 0.02) {                               // POLVERE su tutto
      const t = (x * 5 + y * 11) % 3;
      c2.globalAlpha = Math.min(0.95, prepBoard.dust[i]);
      c2.fillStyle = t === 0 ? '#8a7350' : t === 1 ? '#9c8560' : '#7a6444';
      c2.fillRect(px, py, cw, ch); c2.globalAlpha = 1;
    }
    if (prepBoard.bone[i] && prepBoard.chip[i] > 0.25) {          // CREPA sull'osso rovinato
      c2.fillStyle = '#7a3020'; c2.fillRect(px + Math.floor(cw * 0.4), py + 1, 2, ch - 2);
    }
  }
  const clean = cleanPct(prepBoard), integ = integrity(prepBoard);
  const fill = document.getElementById('pr-fill'); if (fill) fill.style.width = Math.round(clean * 100) + '%';
  const int = document.getElementById('pr-integ');
  if (int) { int.style.width = Math.round(integ * 100) + '%'; int.style.background = integ >= 0.9 ? '#6fbf73' : integ >= 0.7 ? '#d8a53a' : '#d9683a'; }
}
