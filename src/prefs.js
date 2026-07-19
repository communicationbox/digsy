/* IMPOSTAZIONI — preferenze del GIOCATORE, non della partita.
   Stanno fuori dal salvataggio (come l'audio): valgono per questo dispositivo e restano
   anche iniziando una partita nuova. È il punto: chi è alla seconda o terza partita non
   vuole rivedere i suggerimenti da capo, e non deve doverli spegnere ogni volta.

   Chiave localStorage `digsy_prefs`. */

const KEY = 'digsy_prefs';

export const DEFAULTS = {
  tips: true,          // suggerimenti al primo incontro
  /* comandi su schermo, uno solo alla volta:
     'joystick' leva fissa in un angolo · 'float' leva che nasce dove appoggi il dito
     (e un tocco secco vale come "vai lì") · 'tap' solo tocca-dove-andare */
  touch: 'joystick',
  /* col MOUSE le leve non esistono: le opzioni sono altre.
     'tap' clicca dove andare · 'follow' tieni premuto e Digsy insegue il puntatore
     · 'keys' solo tastiera */
  mouse: 'tap',
  hand: 'right',       // mano che tiene il telefono: sposta i comandi dalla parte giusta
  marker: true,        // segnalino sulla destinazione quando si tocca dove andare
};

let prefs = { ...DEFAULTS };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) prefs = { ...DEFAULTS, ...(JSON.parse(raw) || {}) };
} catch (e) { /* preferenze illeggibili: si riparte dai valori di serie */ }

export function getPrefs() { return { ...prefs }; }
export function pref(k) { return prefs[k]; }
export function setPref(k, v) {
  if (!(k in DEFAULTS)) return false;
  prefs[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* quota piena: pazienza */ }
  return true;
}
export function resetPrefs() { prefs = { ...DEFAULTS }; try { localStorage.removeItem(KEY); } catch (e) { /* ok */ } }

/* scorciatoie usate in giro */
export function tipsOn() { return prefs.tips !== false; }
/* La LEVA FISSA disegnata in un angolo esiste solo nella modalità 'joystick': con quella
   fluttuante nasce sotto il dito e non c'è nulla da mostrare a riposo; col solo tocco non
   serve affatto e coprirebbe proprio la parte di schermo da toccare.
   (Chi ha in memoria il vecchio 'both' viene portato sul tocco.) */
/* le due leve esistono SOLO su un dispositivo touch: con un mouse non si trascina un pollice */
export function joystickOn() { return isTouchDevice() && prefs.touch === 'joystick'; }
export function floatStickOn() { return isTouchDevice() && prefs.touch === 'float'; }
/* il tocco secco porta il personaggio dove si è toccato: sempre in 'tap', e anche in 'float'
   (lì trascinare guida, toccare manda) */
/* il tocco/clic secco porta il personaggio dove si è indicato */
export function tapToMoveOn() {
  return isTouchDevice()
    ? (prefs.touch === 'tap' || prefs.touch === 'both' || prefs.touch === 'float')
    : prefs.mouse === 'tap';
}
/* tenere premuto e farsi seguire dal puntatore: solo col mouse */
export function followMouseOn() { return !isTouchDevice() && prefs.mouse === 'follow'; }
export function leftHanded() { return prefs.hand === 'left'; }
/* qui non si importa i18n per non creare un anello di dipendenze: la domanda è la stessa */
function isTouchDevice() {
  return (typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches)
    || (typeof innerWidth === 'number' && innerWidth <= 760);
}
