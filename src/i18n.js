/* Lingua: INGLESE di default, italiano secondario, RUSSO da dizionario.
   I nomi propri (specie, città, chimere) NON si traducono. Cambio lingua → reload.

   Italiano e inglese stanno inline nelle chiamate `tr(it, en)`: sono le due lingue in cui il
   gioco è stato scritto. Le lingue AGGIUNTIVE non toccano le 669 chiamate sparse nel codice —
   arrivano da un dizionario che ha per chiave la stringa INGLESE (il default del gioco).
   Chiave mancante = si vede l'inglese, mai una stringa vuota o un codice: una traduzione
   incompleta resta giocabile. */
import { RU } from './lang/ru.js';

export const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'it', label: 'Italiano' },
  { id: 'ru', label: 'Русский' },
];
const DICT = { ru: RU };
export let LANG = (() => {
  try { return localStorage.getItem('digsy_lang') || 'en'; } catch (e) { return 'en'; }
})();
export function tr(it, en) {
  if (LANG === 'it') return it;
  const d = DICT[LANG];
  if (d) { const v = d[en]; if (v !== undefined) return v; }
  return en;
}
/* quante stringhe mancano alla lingua corrente (usato dai test e dalla pagina di prova) */
export function dictOf(lang) { return DICT[lang] || null; }
export function setLang(l) {
  try { localStorage.setItem('digsy_lang', l); } catch (e) { /* ok */ }
  if (typeof location !== 'undefined' && location.reload) location.reload();
}

/* ---------- etichette dei dati ---------- */
/* una coppia [it, en] passa dallo stesso dizionario delle frasi: chiave = la voce inglese */
function lab(e) { return LANG === 'it' ? e[0] : tr(e[0], e[1]); }
const RARL = {
  comune: ['Comune', 'Common'], raro: ['Raro', 'Rare'],
  eccezionale: ['Eccezionale', 'Exceptional'], leggendario: ['Leggendario', 'Legendary'],
};
export function rarLabel(id) { const e = RARL[id]; return e ? lab(e) : id; }

const PARTL = {
  cranio: ['Cranio', 'Skull'], torace: ['Torace', 'Ribcage'], zampa: ['Zampa', 'Leg'],
  coda: ['Coda', 'Tail'], corno: ['Corno', 'Horn'],
};
export function partName(id) { const e = PARTL[id]; return e ? lab(e) : id; }

const ZONEL = {
  prati: ['Prati Dorati', 'Golden Meadows'], dune: ['Dune Ossee', 'Bone Dunes'],
  boschi: ['Boschi Cinerei', 'Ashen Woods'], terre: ['Terre Rosse', 'Red Lands'],
  palude: ['Palude Antica', 'Ancient Marsh'], ghiacci: ['Lande Gelide', 'Frozen Wastes'],
  grotta: ['Grotte Profonde', 'Deep Caves'],
};
export function zoneName(id) { const e = ZONEL[id]; return e ? lab(e) : id; }

const BLDL = {
  lab: ['Laboratorio', 'Laboratory'], store: ['Negozio', 'Shop'], museum: ['Museo', 'Museum'],
  inn: ['Locanda', 'Inn'], barber: ['Barbiere', 'Barber'], tailor: ['Sartoria', 'Tailor'],
};
export function bldName(type) { const e = BLDL[type]; return e ? lab(e) : type; }

/* TAGLIE DEGLI ABITATI — le chiavi interne sono in italiano (borgo/paese/città) e finivano
   dritte nell'interfaccia: un inglese si leggeva "borgo" sulla mappa. I nomi dicono anche
   cosa ci si trova, che è l'unica cosa che interessa a chi guarda la mappa per decidere dove
   andare: solo la città grande ha il Museo, e il Museo è il posto dove si identifica tutto. */
const TOWNSIZEL = {
  borgo: ['Borgo', 'Hamlet'],
  paese: ['Paese', 'Town'],
  'città': ['Città', 'City'],
};
export function townSizeLabel(id) { const e = TOWNSIZEL[id]; return e ? lab(e) : id; }

const SEASONL = [['primavera', 'spring'], ['estate', 'summer'], ['autunno', 'autumn'], ['inverno', 'winter']];
export function seasonName(i) { return lab(SEASONL[i]); }

const LOOKL = {
  hat: ['Cappello', 'Hat'], shirt: ['Maglia', 'Shirt'], pants: ['Pantaloni', 'Pants'], skin: ['Pelle', 'Skin'],
};
export function lookLabel(k) { const e = LOOKL[k]; return e ? lab(e) : k; }

const HAIRL = {
  none: ['Rasato', 'Shaved'], short: ['Corto', 'Short'], long: ['Lungo', 'Long'],
  curly: ['Riccio', 'Curly'], punk: ['Punk', 'Punk'], receding: ['Stempiato', 'Balding'],
  meadow: ['Germogli', 'Sprouts'], dunespike: ['Duna', 'Dune'], afro: ['Boschivo', 'Woodland'],
  ember: ['Fiamma', 'Ember'], algae: ['Alghe', 'Algae'], frost: ['Gelo', 'Frost'],
};
export function hairLabel(id) { const e = HAIRL[id]; return e ? lab(e) : id; }

const HATL = { explorer: ['Esploratore', 'Explorer'], cap: ['Berretto', 'Cap'], beanie: ['Cuffia', 'Beanie'],
  vikingo: ['Vichingo', 'Viking'], cowboy: ['Cowboy', 'Cowboy'], sombrero: ['Sombrero', 'Sombrero'],
  partyhat: ['Festa', 'Party'], santa: ['Babbo Natale', 'Santa'],
  flowercrown: ['Coroncina', 'Flower crown'], bandana: ['Bandana', 'Bandana'], hood: ['Cappuccio', 'Hood'],
  snorkel: ['Boccaglio', 'Snorkel'], ushanka: ['Colbacco', 'Ushanka'] };
export function hatLabel(id) { const e = HATL[id]; return e ? lab(e) : id; }

/* testi statici dell'index.html (HUD, splash, boot) applicati al boot */
export function applyStaticTexts() {
  const set = (sel, txt) => { const el = document.querySelector(sel); if (el) el.textContent = txt; };
  /* Le etichette dell'HUD si assegnano per ID, non per POSIZIONE. Erano un elenco ordinato
     e bastava infilare un pulsante nuovo in mezzo perché tutte slittassero di uno: appena
     aggiunta la mappa fra zaino e menu, la mappa si è ritrovata scritto "menu". Con gli id
     l'ordine nel markup non conta più. */
  const HUD_LBL = { bagbtn: tr('zaino ', 'bag '), mapbtn: tr(' mappa', ' map'), menubtn: tr(' menu', ' menu') };
  for (const [id, txt] of Object.entries(HUD_LBL)) {
    const host = document.getElementById(id);
    const el = host && host.querySelector ? host.querySelector('.lbl') : null;
    if (el) el.textContent = txt;
  }
  set('.sp-sub', tr('esplora · scava · scopri', 'explore · dig · discover'));
  /* Testi scritti a mano dentro index.html: da soli non passano MAI da tr() e restano in
     italiano per tutti. Vanno riscritti qui, PRIMA di hydrateIcons(), altrimenti si
     cancellerebbero le <img> delle icone già montate. */
  set('#pr-done', tr('Fatto', 'Done'));
  set('#pr-brush', tr('Spazzola', 'Brush'));
  set('#pr-pick', tr('Stecca', 'Fine tool'));
  set('#pr-lab-clean', tr('Pulizia', 'Cleaned'));
  set('#pr-lab-integ', tr('Integrità', 'Intact'));
  set('#exitbtn', '🚪 ' + tr('Esci', 'Exit'));
  set('#debugtag', '🐞 ' + tr('CHEAT · NIENTE SALVATAGGIO', 'CHEAT · NO SAVE'));
}

/* TASTI NEI TESTI — su un telefono non esiste nessun tasto E: c'è il pulsante A.
   Ogni testo che nomina un comando deve passare da qui, così dice sempre la verità
   sul dispositivo che si ha in mano (regola: ogni testo dice cosa fa davvero). */
export function isTouch() {
  return (typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches)
    || (typeof innerWidth === 'number' && innerWidth <= 760);
}
/* il comando "agisci": E da tastiera, A sul telefono */
export function actKey() { return isTouch() ? '<kbd>A</kbd>' : '<kbd>E</kbd>'; }
/* scorciatoie che sul telefono NON esistono: si scrivono solo su desktop */
export function keyHint(k) { return isTouch() ? '' : ' (<kbd>' + k + '</kbd>)'; }
/* SEGNAPOSTO nei testi tradotti: {act} = il tasto azione, {key:M} = una scorciatoia.
   Servono perché la chiave del dizionario deve restare STABILE: se si concatena actKey()
   dentro la stringa, la chiave cambia da dispositivo a dispositivo e la traduzione non
   viene più trovata (i suggerimenti restavano in inglese sui telefoni). */
export function keys(s) {
  return String(s).replace(/\{act\}/g, actKey()).replace(/\{key:([A-Z])\}/g, (_, k) => keyHint(k));
}
