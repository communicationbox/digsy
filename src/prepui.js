/* TAVOLO DI PREPARAZIONE — la parte visibile del RESTAURO (logica pura in prepare.js).
   Si trascina l'attrezzo sul reperto e la crosta si schiarisce a poco a poco, scoprendo il
   fossile. L'osso è fragile: la Spazzola larga è veloce ma se insisti sull'osso scoperto lo
   scheggia; la Stecca fine è gentile, per i bordi. Due barre sempre a schermo: Pulizia e
   Integrità. Niente timer, nessun modo di sbagliare davvero — si smette quando si vuole. */
import { S, save } from './state.js';
import { spById } from './data.js';
import { partVoxels } from './bones.js';
import { projectVox } from './voxview.js';
import { newBoard, brush, strain, cleanPct, integrity, gradeFor, applyPrep, isPrepped, W as PW, H as PH } from './prepare.js';
import { withIcons } from './icons.js';
import { tr, partName } from './i18n.js';
import { playSfx } from './audio.js';
import { toast } from './ui.js';
import { gainXp } from './gameplay.js';

/* UN candidato per consegna: il pezzo di rarità più alta non ancora preparato, e solo da
   raro in su. Sui comuni il minigioco sarebbe una tassa sul tempo, non un momento. */
const PREP_MIN = ['raro', 'eccezionale', 'leggendario'];
export function prepCandidate() {
  let best = null;
  (S.raw || []).forEach((it, i) => {
    if (isPrepped(it) || !PREP_MIN.includes(it.q)) return;
    if (!best || (it.val || 0) > (best.it.val || 0)) best = { it, i };
  });
  return best;
}

let prepBoard = null, prepItem = null, prepAfter = null, prepOpenFlag = false, prepTool = 'brush';
export function isPrepOpen() { return prepOpenFlag; }

/* maschera dell'OSSO per cella: dove la proiezione voxel del pezzo ha pixel (bg trasparente).
   Serve a sapere dove NON insistere con la spazzola. Senza pixel (stub dei test) → vuota. */
function boneMaskFor(item, cvw, cvh) {
  const mask = new Uint8Array(PW * PH);
  try {
    const off = document.createElement('canvas'); off.width = cvw; off.height = cvh;
    projectVox(off, partVoxels(item.s, item.t), false, null, false, 14); // bg=false → trasparente
    const data = off.getContext('2d').getImageData(0, 0, cvw, cvh).data;
    const cw = Math.floor(cvw / PW), ch = Math.floor(cvh / PH);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      const sx = x * cw + (cw >> 1), sy = y * ch + (ch >> 1);
      if (data[(sy * cvw + sx) * 4 + 3] > 40) mask[y * PW + x] = 1;
    }
  } catch (e) { /* niente pixel: maschera vuota, il resto funziona lo stesso */ }
  return mask;
}

function setTool(t) {
  prepTool = t;
  const b = document.getElementById('pr-brush'), p = document.getElementById('pr-pick');
  if (b) b.classList.toggle('on', t === 'brush');
  if (p) p.classList.toggle('on', t === 'pick');
}

export function openPrepare(item, after) {
  const ov = document.getElementById('prepov'); if (!ov) return;
  prepItem = item; prepAfter = after || null; prepTool = 'brush';
  const cv = document.getElementById('pr-cv');
  const cvw = cv ? cv.width : 224, cvh = cv ? cv.height : 192;
  prepBoard = newBoard(hashSeed(item.s + '|' + item.t + '|' + item.uid), boneMaskFor(item, cvw, cvh));
  prepOpenFlag = true;
  ov.classList.add('on');
  setTool('brush');
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
    const opts = () => prepTool === 'brush' ? { r: 1.7 } : { r: 0.9, gentle: true };
    /* PULIRE è interpolato (un gesto veloce non salta celle) e NON scheggia mai. Lo SFREGARE
       (strain) si valuta UNA sola volta per movimento — non per sotto-passo — così tenere
       premuto e muovere non rovina l'osso: solo grattare fermi lo stesso punto lo scheggia. */
    const paint = (cx, cy) => {
      const d = Math.hypot(cx - lx, cy - ly), steps = Math.max(1, Math.floor(d / 0.8));
      let work = 0;
      for (let k = 1; k <= steps; k++) work += brush(prepBoard, lx + (cx - lx) * k / steps, ly + (cy - ly) * k / steps, opts());
      lx = cx; ly = cy;
      const st = prepTool === 'brush' ? strain(prepBoard, cx, cy, 1.7) : 0;
      if (work > 0.01 || st > 0) { drawPrep(); if (work > 0.01) playSfx('dig'); }
    };
    cv.addEventListener('pointerdown', ev => { down = true; cv.setPointerCapture && cv.setPointerCapture(ev.pointerId); const p = at(ev); lx = p.cx; ly = p.cy; const w = brush(prepBoard, p.cx, p.cy, opts()); if (prepTool === 'brush') strain(prepBoard, p.cx, p.cy, 1.7); if (w > 0.01) playSfx('dig'); drawPrep(); });
    cv.addEventListener('pointermove', ev => { if (!down || !prepBoard) return; ev.preventDefault(); const p = at(ev); paint(p.cx, p.cy); });
    cv.addEventListener('pointerup', () => { down = false; });
    cv.addEventListener('pointercancel', () => { down = false; });
  }
  const wireTool = (id, t) => { const el = document.getElementById(id); if (el) el.onclick = () => setTool(t); };
  wireTool('pr-brush', 'brush'); wireTool('pr-pick', 'pick');
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
      grezzo: tr('Ripulito alla buona', 'Roughly cleaned'), niente: tr('Lasciato incrostato', 'Left encrusted') }[g.id];
    toast('🪶 ' + label + ' — ' + tr('pulizia', 'clean') + ' ' + Math.round(clean * 100) + '% · ' + tr('integrità', 'intact') + ' ' + Math.round(integ * 100) + '% · ' + tr('valore', 'value') + ' ×' + g.mult + (g.xp ? ' · +' + g.xp + ' XP' : ''));
    if (g.id === 'perfetto') playSfx('fanfare');
  }
  if (after) after();
}
function drawPrep() {
  const cv = document.getElementById('pr-cv'); if (!cv || !prepBoard) return;
  const c2 = cv.getContext && cv.getContext('2d'); if (!c2) return;
  /* sotto: il pezzo vero, su fondo di ROCCIA (l'osso chiaro deve staccare dalla matrice) */
  try { projectVox(cv, partVoxels(prepItem.s, prepItem.t), false, null, '#42301f', 14); }
  catch (e) { c2.fillStyle = '#42301f'; c2.fillRect(0, 0, cv.width, cv.height); }
  const cw = Math.floor(cv.width / PW), ch = Math.floor(cv.height / PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = y * PW + x, px = x * cw, py = y * ch;
    /* crepa sull'osso scheggiato (sotto la crosta se ancora sporco, si vede quando pulisci) */
    if (prepBoard.bone[i] && prepBoard.chip[i] > 0.3 && prepBoard.dirt[i] < 0.15) {
      c2.fillStyle = '#7a4a2e'; c2.fillRect(px + Math.floor(cw * 0.4), py + 1, 2, ch - 2);
    }
    const d = prepBoard.dirt[i];
    if (d <= 0.02) continue;                       // pulito: si vede l'osso/roccia sotto
    const t = (x * 7 + y * 13) % 3;
    c2.globalAlpha = Math.min(0.95, d);            // la terra si schiarisce mentre spazzoli
    c2.fillStyle = t === 0 ? '#7a5a37' : t === 1 ? '#8a6740' : '#6b4e2f';
    c2.fillRect(px, py, cw, ch);
    c2.globalAlpha = 1;
    c2.fillStyle = 'rgba(0,0,0,.16)'; c2.fillRect(px, py + ch - 2, cw, 2);
  }
  const clean = cleanPct(prepBoard), integ = integrity(prepBoard);
  const fill = document.getElementById('pr-fill'); if (fill) fill.style.width = Math.round(clean * 100) + '%';
  const int = document.getElementById('pr-integ');
  if (int) { int.style.width = Math.round(integ * 100) + '%'; int.style.background = integ >= 0.9 ? '#6fbf73' : integ >= 0.7 ? '#d8a53a' : '#d9683a'; }
  const hint = document.getElementById('pr-hint');
  if (hint) {
    const g = gradeFor(clean, integ);
    hint.innerHTML = withIcons(tr('valore', 'value') + ' ×' + g.mult + (g.xp ? ' · +' + g.xp + ' XP' : ''));
  }
}
