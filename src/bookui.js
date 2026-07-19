/* LIBRO DEI FOSSILI — l'enciclopedia sfogliabile: scheletro voxel 3D (o proiezione 2D se
   WebGL non c'è), descrizione generata dalla ricetta, zona, pezzi posseduti, donati.
   Estratto da ui.js. Espone anche descFor/disposeViews/remount3D perché li usano i pannelli
   del museo e del laboratorio: le chiamate sono a runtime, quindi il ciclo con ui.js è innocuo
   (stessa situazione, già collaudata, di ui↔gameplay). */
import { S } from './state.js';
import { spById, ALL_SPECIES, ZONES, MUSEUM_ZONES } from './data.js';
import { baseSpec, buildVoxels, buildFleshVoxels, BP } from './bones.js';
import { projectVox } from './voxview.js';
import { isDebug } from './debug.js';
import { icon, withIcons } from './icons.js';
import { tr, zoneName } from './i18n.js';
import { rarSpan } from './ui.js';
import { seasonOf } from './daynight.js';
import { seasonName } from './i18n.js';

/* finestra di presenza: va SCRITTA, altrimenti sembra sfortuna (regola: ogni testo dice
   cosa fa davvero). "Solo di notte" · "Solo in estate — ora è autunno" */
function windowText(sp) {
  const w = sp && sp.when; if (!w) return '';
  if (w.night) return '🌙 ' + tr('Solo di notte', 'Only at night');
  const now = seasonOf(S.day);
  const when = seasonName(w.season);
  return '🍂 ' + tr('Solo in ', 'Only in ') + when + (now === w.season ? tr(' — è adesso!', ' — that\'s now!') : '');
}


/* ---------- Libro dei Fossili: scheletri ricostruiti, sfogliabile ---------- */
/* proiezione 2D STATICA dello STESSO modello voxel del 3D: vista laterale,
   ossa bianche (3 toni per profondità z) su fondo scuro. Coerenza garantita. */
export function drawVoxel2D(cv, spec, silhouette, flesh, lit) {
  projectVox(cv, flesh ? buildFleshVoxels(spec) : buildVoxels(spec), silhouette, lit);
}
let bookPage = 0;
let liveViews = []; // viste 3D attive (libro/anteprime): da smontare a ogni cambio
export function disposeViews() { liveViews.forEach(v => { try { v.dispose(); } catch (e) { /* ok */ } }); liveViews = []; }
/* monta la vista 3D voxel; se WebGL non c'è (o siamo nei test) ripiega sulla proiezione 2D */
const viewByCv = new Map();
function mount3D(cv, spec, silhouette, flesh, lit, voxels) {
  if (typeof window === 'undefined') return;
  import('./skeleton3d.js').then(({ mountSkeleton }) => {
    try { const h = mountSkeleton(cv, spec, { silhouette, flesh, lit, voxels }); liveViews.push(h); viewByCv.set(cv, h); }
    catch (e) { drawVoxel2D(cv, spec, silhouette, flesh, lit); }
  }).catch(() => drawVoxel2D(cv, spec, silhouette, flesh, lit));
}
/* il contesto WebGL della canvas muore col dispose: si rimonta su una canvas CLONATA fresca */
export function remount3D(cv, spec, silhouette, flesh, lit) {
  const h = viewByCv.get(cv);
  if (h) { try { h.dispose(); } catch (e) { /* ok */ } liveViews = liveViews.filter(x => x !== h); viewByCv.delete(cv); }
  let target = cv;
  if (cv.parentNode && cv.cloneNode) { target = cv.cloneNode(false); cv.parentNode.replaceChild(target, cv); }
  mount3D(target, spec, silhouette, flesh, lit);
  return target;
}
/* nel Libro lo scheletro è OSCURATO: si accendono solo i pezzi consegnati al museo */
function litFor(spId) { return isDebug() ? null : (S.museum[spId] || []); }
let bookOpen = false;
export function isBookOpen() { return bookOpen; }
/* MOBILE: una pagina per volta; desktop: due (spread) */
function booksPerPage() { return (typeof matchMedia === 'function' && matchMedia('(max-width:760px)').matches) ? 1 : 2; }
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
export function descFor(sp) {
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
        <span>${sp.src === 'albero' ? '🌲 ' + tr('Negli alberi (accetta)', 'In trees (hatchet)') : sp.src === 'roccia' ? '⛰️ ' + tr('Nelle rocce (piccone)', 'In rocks (pickaxe)') : sp.src === 'acqua' ? '🎣 ' + tr('In acqua (barca)', 'In water (boat)') : '🪏 ' + tr('Sottoterra', 'Underground')}</span>
        ${windowText(sp) ? `<span>${windowText(sp)}</span>` : ''}
        <span>🦴 ${tr('Possiedi', 'Owned')}: ${owned}</span>
        ${donated ? '<span>🏛️ ✓</span>' : ''}
        ${awake ? `<span>💫 ${tr('Risvegliato', 'Awakened')}</span>` : (known ? `<span title="${tr('Porta tutti e 5 i pezzi al Laboratorio', 'Bring all 5 pieces to the Laboratory')}">🧬 ${tr('5 pezzi', '5 pieces')}</span>` : '')}
      </div>
      <div class="bk-pageno">— ${pageNo} —</div>
    </div>
  </div>`;
}
export function openBook(page) {
  if (page != null) bookPage = page;
  disposeViews();
  bookOpen = true;
  const ov = document.getElementById('bookov'); ov.classList.add('on');
  const pagesEl = document.getElementById('bk-pages'), navEl = document.getElementById('bk-nav');
  /* pagine: specie delle zone indicizzate dal museo, o già identificate (debug: tutto) */
  const visible = isDebug() ? ALL_SPECIES.slice() : ALL_SPECIES.filter(s => S.book[s.zone] || S.codex.includes(s.id));
  const lockedZones = isDebug() ? [] : MUSEUM_ZONES.filter(z => !S.book[z.id]);
  const pp = booksPerPage(); // MOBILE: 1 pagina per volta; desktop: 2 (spread)
  const maxPage = Math.max(0, Math.ceil(visible.length / pp) - 1);
  bookMaxPage = maxPage;
  bookPage = Math.max(0, Math.min(bookPage, maxPage));
  if (!visible.length) {
    pagesEl.innerHTML = withIcons(`<div class="bkpage"><div class="bk-name" style="margin-top:40px">${tr('Il libro è vuoto', 'The book is empty')}</div>
      <div class="bk-desc" style="text-align:center">${tr('Visita il <b>Museo</b> di una zona per indicizzarne i fossili,<br>poi scava e identifica per completare le pagine.', 'Visit a zone\'s <b>Museum</b> to index its fossils,<br>then dig and identify to complete the pages.')}</div></div>`);
    navEl.innerHTML = '';
  } else {
    let ph = ''; for (let i = 0; i < pp; i++) ph += bookPageHtml(visible[bookPage * pp + i], bookPage * pp + i + 1);
    pagesEl.innerHTML = withIcons(ph);
    const found = ALL_SPECIES.filter(s => S.codex.includes(s.id)).length;
    /* barra di navigazione: frecce grandi, pagina al centro, conteggio su una riga a parte
       (su mobile il tutto-in-fila si ammassava e diventava illeggibile) */
    navEl.innerHTML = withIcons(`<div class="bk-navrow">
        <button class="btn ghost" id="bkPrev" ${bookPage <= 0 ? 'disabled' : ''}>‹</button>
        <span class="bk-navpage">${bookPage + 1} / ${maxPage + 1}</span>
        <button class="btn ghost" id="bkNext" ${bookPage >= maxPage ? 'disabled' : ''}>›</button>
      </div>
      <div class="bk-navinfo">📖 ${found}/${ALL_SPECIES.length}${lockedZones.length ? ' · ' + tr('da indicizzare', 'to index') + ': ' + lockedZones.map(z => z.icon).join(' ') : ''}</div>`);
    pagesEl.querySelectorAll('.bp-cv').forEach(cv => {
      const sp = spById[cv.dataset.sp];
      mount3D(cv, baseSpec(sp), !(S.codex.includes(sp.id) || isDebug()), false, litFor(sp.id)); // scheletro 3D: accesi solo i pezzi al museo
    });
    pagesEl.querySelectorAll('.bk-sketch').forEach(cv => {   // stesso modello, proiezione 2D statica bianca
      const sp = spById[cv.dataset.sp2];
      drawVoxel2D(cv, baseSpec(sp), !(S.codex.includes(sp.id) || isDebug()), false, litFor(sp.id));
    });
    /* freccia sul 3D: switch scheletro ↔ animale VIVO */
    pagesEl.querySelectorAll('.bk-flip3d').forEach(b => b.onclick = () => {
      const sp = spById[b.dataset.fs];
      const cv = b.parentElement.querySelector('.bp-cv');
      const flesh = b.dataset.mode !== 'flesh';
      b.dataset.mode = flesh ? 'flesh' : '';
      b.textContent = flesh ? '◀ ' + tr('Scheletro', 'Skeleton') : '▶ ' + tr('Vivo', 'Alive');
      remount3D(cv, baseSpec(sp), false, flesh, flesh ? null : litFor(sp.id)); // il VIVO è sempre completo
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

