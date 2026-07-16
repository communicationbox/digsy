/* Lingua: INGLESE di default, italiano secondario. tr(it,en) inline + helper per le etichette dati.
   I nomi propri (specie, città, chimere) NON si traducono. Cambio lingua → reload. */
export let LANG = (() => {
  try { return localStorage.getItem('digsy_lang') || 'en'; } catch (e) { return 'en'; }
})();
export function tr(it, en) { return LANG === 'it' ? it : en; }
export function setLang(l) {
  try { localStorage.setItem('digsy_lang', l); } catch (e) { /* ok */ }
  if (typeof location !== 'undefined' && location.reload) location.reload();
}

/* ---------- etichette dei dati ---------- */
const RARL = {
  comune: ['Comune', 'Common'], raro: ['Raro', 'Rare'],
  eccezionale: ['Eccezionale', 'Exceptional'], leggendario: ['Leggendario', 'Legendary'],
};
export function rarLabel(id) { const e = RARL[id]; return e ? (LANG === 'it' ? e[0] : e[1]) : id; }

const PARTL = {
  cranio: ['Cranio', 'Skull'], torace: ['Torace', 'Ribcage'], zampa: ['Zampa', 'Leg'],
  coda: ['Coda', 'Tail'], corno: ['Corno', 'Horn'],
};
export function partName(id) { const e = PARTL[id]; return e ? (LANG === 'it' ? e[0] : e[1]) : id; }

const ZONEL = {
  prati: ['Prati Dorati', 'Golden Meadows'], dune: ['Dune Ossee', 'Bone Dunes'],
  boschi: ['Boschi Cinerei', 'Ashen Woods'], terre: ['Terre Rosse', 'Red Lands'],
  palude: ['Palude Antica', 'Ancient Marsh'], ghiacci: ['Lande Gelide', 'Frozen Wastes'],
};
export function zoneName(id) { const e = ZONEL[id]; return e ? (LANG === 'it' ? e[0] : e[1]) : id; }

const BLDL = {
  lab: ['Laboratorio', 'Laboratory'], store: ['Negozio', 'Shop'], museum: ['Museo', 'Museum'],
  inn: ['Locanda', 'Inn'], barber: ['Barbiere', 'Barber'], tailor: ['Sartoria', 'Tailor'],
};
export function bldName(type) { const e = BLDL[type]; return e ? (LANG === 'it' ? e[0] : e[1]) : type; }

const SEASONL = [['primavera', 'spring'], ['estate', 'summer'], ['autunno', 'autumn'], ['inverno', 'winter']];
export function seasonName(i) { return LANG === 'it' ? SEASONL[i][0] : SEASONL[i][1]; }

const LOOKL = {
  hat: ['Cappello', 'Hat'], shirt: ['Maglia', 'Shirt'], pants: ['Pantaloni', 'Pants'], skin: ['Pelle', 'Skin'],
};
export function lookLabel(k) { const e = LOOKL[k]; return e ? (LANG === 'it' ? e[0] : e[1]) : k; }

const HAIRL = {
  none: ['Rasato', 'Shaved'], short: ['Corto', 'Short'], long: ['Lungo', 'Long'],
  curly: ['Riccio', 'Curly'], punk: ['Punk', 'Punk'], receding: ['Stempiato', 'Balding'],
};
export function hairLabel(id) { const e = HAIRL[id]; return e ? (LANG === 'it' ? e[0] : e[1]) : id; }

const HATL = { explorer: ['Esploratore', 'Explorer'], cap: ['Berretto', 'Cap'], beanie: ['Cuffia', 'Beanie'] };
export function hatLabel(id) { const e = HATL[id]; return e ? (LANG === 'it' ? e[0] : e[1]) : id; }

/* testi statici dell'index.html (HUD, splash, boot) applicati al boot */
export function applyStaticTexts() {
  const set = (sel, txt) => { const el = document.querySelector(sel); if (el) el.textContent = txt; };
  const lbls = document.querySelectorAll('#hud .lbl');
  const L = LANG === 'it'
    ? [' monete', ' energia', 'giorno ', 'zaino ', ' menu']
    : [' coins', ' energy', 'day ', 'bag ', ' menu'];
  lbls.forEach((el, i) => { if (L[i] !== undefined) el.textContent = L[i]; });
  set('.sp-sub', tr('scava · scopri · rianima', 'dig · discover · revive'));
}
