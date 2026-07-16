/* Canvas fullscreen a scala intera (pixel netti) */
import { TS } from './data.js';

export const cv = document.getElementById('cv');
export const ctx = cv.getContext('2d');

/* risoluzione interna derivata dalla finestra, ricalcolata a ogni resize */
export const view = { K: 3, VW: 17, VH: 13, W: 17 * TS, H: 13 * TS };

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
