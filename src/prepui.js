/* TAVOLO DI PREPARAZIONE — RESTAURO con 3 attrezzi (logica pura in prepare.js). Si SCEGLIE
   l'attrezzo (3 bottoni) e si TRASCINA sul reperto:
   · PENNELLO  — spolvera: compare il fossile (contorno ORO) e ti fa vedere dov'è l'osso. Mai danni.
   · SCALPELLO — stacca la ROCCIA attorno; se scalpelli DENTRO il contorno (l'osso) lo scheggi.
   · SPATOLA   — pulisce la CROSTA sul fossile; insistere sull'osso già pulito lo rovina.
   L'ordine consigliato è 1→2→3, ma sei libero: così puoi rifinire ogni strato fino al 100%.
   Due barre: Pulizia e Integrità. Niente timer, si smette quando si vuole. */
import { S, save } from './state.js';
import { spById } from './data.js';
import { partVoxels } from './bones.js';
import { projectVox } from './voxview.js';
import { newBoard, work, scrape, centerCell, cleanPct, integrity, gradeFor, applyPrep, isPrepped, W as PW, H as PH } from './prepare.js';
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

const TOOLS = ['pennello', 'scalpello', 'spatola'];
const TOOL_HS = { pennello: 4, scalpello: 1, spatola: 1 };        // pennello LARGO (spolverare è solo per capire, non deve durare); precisi piccoli
let prepBoard = null, prepItem = null, prepAfter = null, prepOpenFlag = false, prepTool = 'pennello';
let prepCursor = { x: 0, y: 0, on: false };   // area d'azione dell'attrezzo (segue il puntatore)
export function isPrepOpen() { return prepOpenFlag; }

/* il cursore rovinerebbe l'osso qui? (per colorarlo di rosso) — si guarda la cella CENTRALE, dove
   avviene il danno: scalpello sull'osso; spatola sull'osso GIÀ PULITO. Pennello: mai. */
function dangerAt(tool, cx, cy) {
  if (!prepBoard || tool === 'pennello') return false;
  const i = centerCell(cx, cy);
  if (i < 0 || !prepBoard.bone[i]) return false;
  if (tool === 'scalpello') return true;
  return tool === 'spatola' && prepBoard.crust[i] <= 0.001 && prepBoard.dust[i] <= 0.5;
}

/* istruzione dell'attrezzo scelto — tr() LETTERALI (così i18n riconosce le stringhe) */
function stepText(t) {
  if (t === 'scalpello') return tr('Scalpello: trascina sulla ROCCIA scura per staccarla — non toccare il fossile chiaro', 'Chisel: drag on the dark ROCK to chip it away — don\'t touch the pale fossil');
  if (t === 'spatola') return tr('Spatola: trascina sul fossile per pulirlo — non insistere sull\'osso già pulito', 'Spatula: drag on the fossil to clean it — don\'t keep scraping bone that\'s already clean');
  return tr('Pennello: trascina per spolverare — il fossile chiaro appare nella roccia', 'Brush: drag to dust it off — the pale fossil appears in the rock');
}
/* maschera dell'OSSO per cella: dove la proiezione voxel del pezzo ha pixel (sfondo trasparente) */
function boneMaskFor(item, cvw, cvh) {
  const mask = new Uint8Array(PW * PH);
  let n = 0;
  try {
    const off = document.createElement('canvas'); off.width = cvw; off.height = cvh;
    projectVox(off, partVoxels(item.s, item.t), false, null, false, 14); // bg=false → trasparente
    const data = off.getContext('2d').getImageData(0, 0, cvw, cvh).data;
    const cw = Math.floor(cvw / PW), ch = Math.floor(cvh / PH);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
      let hit = 0;                                       // osso se QUALSIASI pixel della cella è fossile (parti sottili incluse)
      for (let yy = y * ch; yy < (y + 1) * ch; yy++) for (let xx = x * cw; xx < (x + 1) * cw; xx++) if (data[(yy * cvw + xx) * 4 + 3] > 40) hit++;
      if (hit >= 2) { mask[y * PW + x] = 1; n++; }
    }
  } catch (e) { /* niente pixel */ }
  return n ? mask : null;   // silhouette vuota → null: newBoard usa la forma di ripiego
}

function setTool(t) {
  prepTool = t;
  for (const tool of TOOLS) { const el = document.getElementById('pr-t-' + tool); if (el) el.classList.toggle('on', tool === t); }
  const step = document.getElementById('pr-hint'); if (step) step.innerHTML = withIcons(stepText(t));
}

export function openPrepare(item, after) {
  const ov = document.getElementById('prepov'); if (!ov) return;
  prepItem = item; prepAfter = after || null;
  const cv = document.getElementById('pr-cv');
  const cvw = cv ? cv.width : 224, cvh = cv ? cv.height : 192;
  prepBoard = newBoard(hashSeed(item.s + '|' + item.t + '|' + item.uid), boneMaskFor(item, cvw, cvh));
  prepOpenFlag = true;
  ov.classList.add('on');
  setTool('pennello');
  const sp = spById[item.s];
  const ttl = document.getElementById('pr-title');
  if (ttl) ttl.innerHTML = withIcons(partName(item.t) + ' ' + tr('di', 'of') + ' ' + (sp ? sp.name : item.s));
  drawPrep();
  if (cv && !cv.dataset.wired) {
    cv.dataset.wired = '1';
    let down = false, lx = 0, ly = 0;
    const at = ev => {
      const r = cv.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev;
      /* clamp al bordo: trascinando FUORI dal canvas il cursore segue fino al bordo senza scatti */
      return {
        cx: Math.max(0, Math.min(PW - 0.001, (p.clientX - r.left) / r.width * PW)),
        cy: Math.max(0, Math.min(PH - 0.001, (p.clientY - r.top) / r.height * PH)),
      };
    };
    const apply = (cx, cy) => {
      const hs = TOOL_HS[prepTool];
      const d = Math.hypot(cx - lx, cy - ly), steps = Math.max(1, Math.floor(d / 0.7));
      let workDone = 0, harm = 0, freed = false;
      for (let k = 1; k <= steps; k++) { const res = work(prepBoard, prepTool, lx + (cx - lx) * k / steps, ly + (cy - ly) * k / steps, hs); workDone += res.work; harm += res.harm; if (res.freed) freed = true; }
      /* SPATOLA: il danno viene solo da GRATTARE FERMI (over-scrape) sulla cella centrale, valutato
         UNA volta per movimento — non per sotto-passo — così pulire passandoci sopra è sicuro. */
      if (prepTool === 'spatola') harm += scrape(prepBoard, cx, cy);
      lx = cx; ly = cy;
      if (workDone > 0.01 || harm > 0.001 || freed) { drawPrep(); if (freed) playSfx('found'); else if (harm > 0.02) playSfx('nope'); else if (workDone > 0.01) playSfx('dig'); }
    };
    cv.addEventListener('pointerdown', ev => { down = true; cv.setPointerCapture && cv.setPointerCapture(ev.pointerId); const p = at(ev); lx = p.cx; ly = p.cy; prepCursor.x = p.cx; prepCursor.y = p.cy; prepCursor.on = true; apply(p.cx, p.cy); });
    cv.addEventListener('pointermove', ev => {
      if (!prepBoard) return;
      const p = at(ev); prepCursor.x = p.cx; prepCursor.y = p.cy; prepCursor.on = true;
      if (down) { ev.preventDefault(); apply(p.cx, p.cy); } else drawPrep(); // hover: muove solo il cursore
    });
    cv.addEventListener('pointerup', () => { down = false; });
    cv.addEventListener('pointercancel', () => { down = false; });
    /* uscendo dal canvas NON si interrompe il tratto (il pointer capture continua a mandare i
       move): si nasconde il cursore solo se NON stai trascinando */
    cv.addEventListener('pointerleave', () => { if (!down) { prepCursor.on = false; drawPrep(); } });
  }
  for (const tool of TOOLS) { const el = document.getElementById('pr-t-' + tool); if (el) el.onclick = () => setTool(tool); }
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
    if (!prepBoard.bone[i] && prepBoard.rock[i] > 0) {            // ROCCIA scura sulla matrice
      const t = (x * 7 + y * 13) % 3;
      c2.globalAlpha = prepBoard.rock[i];
      c2.fillStyle = t === 0 ? '#544a3c' : t === 1 ? '#605646' : '#453d31';
      c2.fillRect(px, py, cw, ch);
      c2.globalAlpha = 1; c2.fillStyle = 'rgba(0,0,0,.22)'; c2.fillRect(px, py + ch - 2, cw, 2);
    } else if (prepBoard.bone[i] && prepBoard.crust[i] > 0) {     // CROSTA leggera sull'osso (il fossile resta ben visibile)
      c2.globalAlpha = prepBoard.crust[i] * 0.35;
      c2.fillStyle = '#8a7a5c'; c2.fillRect(px, py, cw, ch); c2.globalAlpha = 1;
    }
    if (prepBoard.dust[i] > 0.02) {                               // POLVERE su tutto
      const t = (x * 5 + y * 11) % 3;
      c2.globalAlpha = Math.min(0.95, prepBoard.dust[i]);
      c2.fillStyle = t === 0 ? '#8a7350' : t === 1 ? '#9c8560' : '#7a6444';
      c2.fillRect(px, py, cw, ch); c2.globalAlpha = 1;
    }
    if (prepBoard.bone[i] && prepBoard.chip[i] > 0.25) {          // CREPA sull'osso rovinato
      c2.fillStyle = '#7a3020'; c2.fillRect(px + Math.floor(cw * 0.4), py + 1, Math.max(1, Math.floor(cw / 3)), ch - 2);
    }
  }
  /* CURSORE 8-BIT: un QUADRATO allineato alle celle mostra ESATTAMENTE dove agisce l'attrezzo;
     la cella CENTRALE è marcata (lì avviene il danno) e diventa ROSSA se rovineresti l'osso.
     Così è preciso e skill, non tentativi alla cieca. */
  if (prepCursor.on) {
    const hs = TOOL_HS[prepTool];
    const cxi = Math.floor(prepCursor.x), cyi = Math.floor(prepCursor.y);
    const x0 = Math.max(0, cxi - hs), y0 = Math.max(0, cyi - hs), x1 = Math.min(PW - 1, cxi + hs), y1 = Math.min(PH - 1, cyi + hs);
    const bx = x0 * cw, by = y0 * ch, bw = (x1 - x0 + 1) * cw, bh = (y1 - y0 + 1) * ch;
    const danger = dangerAt(prepTool, prepCursor.x, prepCursor.y);
    const col = prepTool === 'pennello' ? '#fff6dc' : '#7fe0cf';
    c2.fillStyle = col;                                  // bordo del quadrato (mattoncini netti)
    c2.fillRect(bx, by, bw, 1); c2.fillRect(bx, by + bh - 1, bw, 1);
    c2.fillRect(bx, by, 1, bh); c2.fillRect(bx + bw - 1, by, 1, bh);
    if (cxi >= 0 && cyi >= 0 && cxi < PW && cyi < PH) {  // cella CENTRALE = punto del danno
      const dcol = danger ? '#e0533a' : col;
      c2.globalAlpha = danger ? 0.5 : 0.28; c2.fillStyle = dcol; c2.fillRect(cxi * cw, cyi * ch, cw, ch); c2.globalAlpha = 1;
      c2.fillStyle = dcol; c2.fillRect(cxi * cw, cyi * ch, cw, 1); c2.fillRect(cxi * cw, cyi * ch + ch - 1, cw, 1);
      c2.fillRect(cxi * cw, cyi * ch, 1, ch); c2.fillRect(cxi * cw + cw - 1, cyi * ch, 1, ch);
    }
  }
  const clean = cleanPct(prepBoard), integ = integrity(prepBoard);
  const fill = document.getElementById('pr-fill'); if (fill) fill.style.width = Math.round(clean * 100) + '%';
  const int = document.getElementById('pr-integ');
  if (int) { int.style.width = Math.round(integ * 100) + '%'; int.style.background = integ >= 0.9 ? '#6fbf73' : integ >= 0.7 ? '#d8a53a' : '#d9683a'; }
}
