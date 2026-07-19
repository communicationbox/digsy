/* TAVOLO DI PREPARAZIONE — la parte visibile del secondo verbo (la logica sta in prepare.js).
   Si trascina il dito sul reperto e la crosta viene via a scaglie; la percentuale e il bonus
   sono sempre a schermo, così non si indovina mai a che punto si è. */
import { S, save } from './state.js';
import { spById } from './data.js';
import { partVoxels } from './bones.js';
import { projectVox } from './voxview.js';
import { newBoard, brush, cleanPct, gradeFor, applyPrep, isPrepped } from './prepare.js';
import { withIcons } from './icons.js';
import { tr, partName } from './i18n.js';
import { playSfx } from './audio.js';
import { toast } from './ui.js';
import { gainXp } from './gameplay.js';

/* ---------- TAVOLO DI PREPARAZIONE ---------- */
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
/* Il gesto: si trascina il dito (o il mouse) sul reperto e la crosta viene via a scaglie.
   Niente timer, niente modo di sbagliare: si smette quando si vuole e il grado si prende
   com'è. La percentuale è sempre a schermo, così non si indovina mai. */
let prepBoard = null, prepItem = null, prepAfter = null, prepOpenFlag = false;
export function isPrepOpen() { return prepOpenFlag; }
export function openPrepare(item, after) {
  const ov = document.getElementById('prepov'); if (!ov) return;
  prepItem = item; prepAfter = after || null;
  prepBoard = newBoard(hashSeed(item.s + '|' + item.t + '|' + item.uid));
  prepOpenFlag = true;
  ov.classList.add('on');
  const sp = spById[item.s];
  const ttl = document.getElementById('pr-title');
  if (ttl) ttl.innerHTML = withIcons(partName(item.t) + ' ' + tr('di', 'of') + ' ' + (sp ? sp.name : item.s));
  drawPrep();
  const cv = document.getElementById('pr-cv');
  if (cv && !cv.dataset.wired) {
    cv.dataset.wired = '1';
    let down = false;
    const at = ev => {
      const r = cv.getBoundingClientRect();
      const p = ev.touches ? ev.touches[0] : ev;
      return { cx: (p.clientX - r.left) / r.width * PW, cy: (p.clientY - r.top) / r.height * PH };
    };
    const move = ev => {
      if (!down || !prepBoard) return;
      ev.preventDefault();
      const { cx, cy } = at(ev);
      if (brush(prepBoard, cx, cy)) { drawPrep(); playSfx('dig'); }
    };
    cv.addEventListener('pointerdown', ev => { down = true; cv.setPointerCapture && cv.setPointerCapture(ev.pointerId); move(ev); });
    cv.addEventListener('pointermove', move);
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
  const it = prepItem, pct = cleanPct(prepBoard), after = prepAfter;
  const g = applyPrep(it, pct);
  closePrepare();
  if (g) {
    if (g.xp) gainXp(g.xp);
    const label = { perfetto: tr('Preparazione perfetta', 'Perfect preparation'), buono: tr('Ben preparato', 'Well prepared'),
      grezzo: tr('Ripulito alla buona', 'Roughly cleaned'), niente: tr('Lasciato incrostato', 'Left encrusted') }[g.id];
    toast('🪶 ' + label + ' — ' + Math.round(pct * 100) + '% · ' + tr('valore', 'value') + ' ×' + g.mult + (g.xp ? ' · +' + g.xp + ' XP' : ''));
    if (g.id === 'perfetto') playSfx('fanfare');
  }
  if (after) after();
}
const PW = 14, PH = 12;               // celle: coincidono con W/H di prepare.js
function drawPrep() {
  const cv = document.getElementById('pr-cv'); if (!cv || !prepBoard) return;
  const c2 = cv.getContext && cv.getContext('2d'); if (!c2) return;
  /* sotto: il pezzo vero (stessa proiezione voxel delle miniature) */
  /* fondo di ROCCIA, non nero: l'osso chiaro deve staccare dalla matrice in cui è sepolto */
  try { projectVox(cv, partVoxels(prepItem.s, prepItem.t), false, null, '#42301f', 14); }
  catch (e) { c2.fillStyle = '#42301f'; c2.fillRect(0, 0, cv.width, cv.height); }
  /* sopra: la crosta, a celle intere (niente mezzi pixel) */
  const cw = Math.floor(cv.width / PW), ch = Math.floor(cv.height / PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    if (!prepBoard.cells[y * PW + x]) continue;
    const t = (x * 7 + y * 13) % 3;
    c2.fillStyle = t === 0 ? '#7a5a37' : t === 1 ? '#8a6740' : '#6b4e2f';
    c2.fillRect(x * cw, y * ch, cw, ch);
    c2.fillStyle = 'rgba(0,0,0,.18)';
    c2.fillRect(x * cw, y * ch + ch - 2, cw, 2);
  }
  const pct = cleanPct(prepBoard);
  const fill = document.getElementById('pr-fill'); if (fill) fill.style.width = Math.round(pct * 100) + '%';
  const hint = document.getElementById('pr-hint');
  if (hint) {
    const g = gradeFor(pct);
    hint.innerHTML = withIcons(Math.round(pct * 100) + '% · ' + tr('valore', 'value') + ' ×' + g.mult + (g.xp ? ' · +' + g.xp + ' XP' : ''));
  }
}

