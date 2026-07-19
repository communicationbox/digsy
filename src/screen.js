/* Canvas fullscreen a scala intera (pixel netti) */
import { TS } from './data.js';

export const cv = document.getElementById('cv');
export const ctx = cv.getContext('2d');

/* risoluzione interna derivata dalla finestra, ricalcolata a ogni resize */
export const view = { K: 3, VW: 17, VH: 13, W: 17 * TS, H: 13 * TS };

/* INGOMBRO DELL'HUD in pixel di GIOCO. La barra in alto sta sopra la canvas: dove la camera
   si ferma al bordo della mappa (grotte, galleria del museo) il giocatore continua a salire
   e finisce NASCOSTO sotto la barra — segnalato da un giocatore, con la testa di Digsy
   coperta dai tag delle monete. Si misura l'HUD vero invece di indovinare un numero: cambia
   con la larghezza dello schermo (le etichette spariscono sotto i 760px) e con lo zoom K. */
/* L'HUD non è sempre misurabile nell'istante in cui serve: durante l'editor iniziale, con
   una modale aperta o a HUD ripiegato è display:none e il rettangolo torna 0. Misurarlo lì
   darebbe margine ZERO proprio dove il margine serve, quindi si tiene l'ultima misura buona
   e si parte da una stima prudente (l'HUD non è mai più basso di così). */
const HUD_CSS_FALLBACK = 52;   // px CSS: altezza tipica della barra col tag più alto
let hudCss = HUD_CSS_FALLBACK;
export function hudPad() {
  if (typeof document !== 'undefined') {
    const el = document.getElementById('hud');
    if (el && typeof el.getBoundingClientRect === 'function') {
      const r = el.getBoundingClientRect();
      if (r && r.bottom > 0) hudCss = r.bottom;      // misura buona: la si ricorda
    }
  }
  return Math.ceil(hudCss / view.K) + 6;   // +6 px di gioco: la testa non deve sfiorarla
}

export function fit() {
  // zoom: ~13 tile sull'asse più corto → funziona in landscape e in portrait (mobile)
  const K = Math.max(2, Math.min(6, Math.round(Math.min(innerWidth, innerHeight) / (13 * TS))));
  view.K = K;
  view.W = Math.ceil(innerWidth / K); view.H = Math.ceil(innerHeight / K);
  view.VW = Math.ceil(view.W / TS); view.VH = Math.ceil(view.H / TS);
  cv.width = view.W * K; cv.height = view.H * K;
  cv.style.width = (view.W * K) + 'px'; cv.style.height = (view.H * K) + 'px';
  ctx.setTransform(K, 0, 0, K, 0, 0); ctx.imageSmoothingEnabled = false;
}
