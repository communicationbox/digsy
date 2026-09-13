import { FURN_CATALOG, FURN_THEMES } from './furnCatalog.js';
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
  snorkel: ['Boccaglio', 'Snorkel'], ushanka: ['Colbacco', 'Ushanka'],
  /* cappelli-TROFEO d'oro */
  crownGold: ['Corona d\'Oro', 'Gold Crown'], gradGold: ['Tocco d\'Oro', 'Gold Cap'], laurelGold: ['Alloro d\'Oro', 'Gold Laurel'],
  gogglesGold: ['Occhialoni d\'Oro', 'Gold Goggles'], hornsGold: ['Corna d\'Oro', 'Gold Horns'], pithGold: ['Elmetto d\'Oro', 'Gold Pith'],
  featherGold: ['Piuma d\'Oro', 'Gold Feather'], hardhatGold: ['Casco d\'Oro', 'Gold Hard Hat'], lampGold: ['Lampada d\'Oro', 'Gold Lamp'] };
export function hatLabel(id) { const e = HATL[id]; return e ? lab(e) : id; }
const SHIRTL = { tshirt: ['Maglietta', 'T-shirt'], tank: ['Canottiera', 'Tank top'], shirt: ['Camicia', 'Shirt'], hoodie: ['Felpa', 'Hoodie'] };
const PANTSL = { long: ['Pantaloni', 'Trousers'], shorts: ['Pantaloncini', 'Shorts'], skirt: ['Gonna', 'Skirt'], overall: ['Salopette', 'Overalls'] };
export function shirtLabel(id) { const e = SHIRTL[id]; return e ? lab(e) : id; }
export function pantsLabel(id) { const e = PANTSL[id]; return e ? lab(e) : id; }

/* ARREDO della casa (M3): un nome per pezzo, stesso schema degli altri cosmetici */
const FURNL = {
  prati_rug: ['Tappeto di margherite', 'Daisy rug'], prati_bed: ['Letto di fiori', 'Flower bed'],
  prati_table: ['Tavolo di paglia', 'Straw table'], prati_lamp: ['Lanterna di grano', 'Wheat lantern'],
  dune_rug: ['Tappeto di sabbia', 'Sand rug'], dune_bed: ['Giaciglio beduino', 'Bedouin bedroll'],
  dune_chest: ['Scrigno d\'osso', 'Bone chest'], dune_cactus: ['Cactus in vaso', 'Potted cactus'],
  boschi_rug: ['Tappeto di muschio', 'Moss rug'], boschi_bed: ['Letto di tronco', 'Log bed'],
  boschi_chair: ['Poltrona di corteccia', 'Bark armchair'], boschi_lamp: ['Lampada a fungo', 'Mushroom lamp'],
  terre_rug: ['Tappeto d\'argilla', 'Clay rug'], terre_bed: ['Letto di roccia rossa', 'Red rock bed'],
  terre_throne: ['Trono di pietra', 'Stone throne'], terre_crystal: ['Cristallo ornamentale', 'Ornamental crystal'],
  palude_rug: ['Tappeto di alghe', 'Algae rug'], palude_bed: ['Amaca di canne', 'Reed hammock'],
  palude_vase: ['Vaso di ninfee', 'Water lily vase'], palude_lamp: ['Lanterna a fuoco fatuo', 'Will-o\'-wisp lantern'],
  ghiacci_rug: ['Tappeto di pelliccia', 'Fur rug'], ghiacci_bed: ['Letto di pelliccia', 'Fur bed'],
  ghiacci_hearth: ['Focolare glaciale', 'Glacial hearth'], ghiacci_lamp: ['Lanterna di ghiaccio', 'Ice lantern'],
  pedestal: ['Piedistallo', 'Pedestal'],
  /* FONDO della stanza: carta da parati e pavimento. Cambiano la stanza più di qualunque
     mobile, quindi hanno un nome che dice a cosa somigliano, non "parato 1". */
  prati_paper: ['Parato di spighe', 'Wheat wallpaper'], prati_ground: ['Assi di grano', 'Wheat boards'],
  dune_paper: ['Parato di sabbia', 'Sand wallpaper'], dune_ground: ['Arenaria chiara', 'Pale sandstone'],
  boschi_paper: ['Parato di felci', 'Fern wallpaper'], boschi_ground: ['Assi di quercia', 'Oak boards'],
  terre_paper: ['Parato d\'argilla', 'Clay wallpaper'], terre_ground: ['Cotto rosso', 'Red terracotta'],
  palude_paper: ['Parato di canne', 'Reed wallpaper'], palude_ground: ['Assi d\'acqua', 'Bog boards'],
  ghiacci_paper: ['Parato di brina', 'Frost wallpaper'], ghiacci_ground: ['Lastre di ghiaccio', 'Ice slabs'],
  /* PARETE: l'unica famiglia che sta in alto — un quadro/una mensola alza lo sguardo e chiude
     la stanza, che con solo mobili a terra resta una scacchiera con roba sopra. */
  prati_art: ['Ghirlanda di spighe', 'Wheat wreath'], dune_art: ['Cranio alla parete', 'Wall skull'],
  boschi_art: ['Mensola di funghi', 'Mushroom shelf'], terre_art: ['Quadro d\'argilla', 'Clay painting'],
  palude_art: ['Ninfea appesa', 'Hanging lily'], ghiacci_art: ['Specchio di ghiaccio', 'Ice mirror'],
};
export function furnLabel(id) {
  const e = FURNL[id]; if (e) return lab(e);
  const c = CATALOG_BY_ID[id];                                  // pezzi del catalogo: il nome sta nella loro scheda
  return c ? lab([c.it, c.en]) : id;
}
const CATALOG_BY_ID = Object.fromEntries(FURN_CATALOG.map(f => [f.theme + '_' + f.id.replace(f.theme + '_', ''), f]).map(([, f]) => [f.id, f]));
/* nome di un TEMA del catalogo */
export function furnThemeLabel(id) { const t = FURN_THEMES.find(x => x.id === id); return t ? lab([t.it, t.en]) : id; }

/* CASA — nomi delle stanze (pianta a corridoio, M2 ripianificato): la 0 è la Sala (gratis,
   in fondo al corridoio), le altre hanno un'identità vera di casa (Cucina/Bagno/Camera) —
   l'arredo che ci metti resta a tema di ZONA (FURN_SETS), il nome è solo l'identità della
   stanza. Fuori da queste 4 (se `ROOM_PRICES` crescesse) si ripiega su "Stanza N". */
const ROOML = { 0: ['Sala', 'Living room'], 1: ['Cucina', 'Kitchen'], 2: ['Bagno', 'Bathroom'], 3: ['Camera', 'Bedroom'] };
export function roomName(id) { const e = ROOML[id]; return e ? lab(e) : tr('Stanza', 'Room') + ' ' + (id + 1); }

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
  set('#pr-t-pennello', tr('Pennello', 'Brush'));
  set('#pr-t-scalpello', tr('Scalpello', 'Chisel'));
  set('#pr-t-spatola', tr('Spatola', 'Spatula'));
  set('#pr-lab-clean', tr('Pulizia', 'Cleaned'));
  set('#pr-lab-integ', tr('Integrità', 'Intact'));
  set('#sk-title', tr('SCHELETRO', 'SKELETON'));
  set('#sk-skip', tr('Salta', 'Skip'));
  set('#exitbtn', '🚪 ' + tr('Esci', 'Exit'));
  set('#furnrotbtn', tr('Ruota', 'Rotate'));
  set('#furncancelbtn', tr('Annulla', 'Cancel'));
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
