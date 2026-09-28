/* PROIEZIONE VOXEL 2D — disegna un modello voxel su una canvas, ordinato dal fondo verso
   l'osservatore, con la profondità resa da tre toni. È la stessa immagine usata ovunque:
   miniature dello zaino, teche del museo, pagina del Libro, tavolo di preparazione, e come
   ripiego quando WebGL non c'è. Stava dentro ui.js, ma non ha nulla a che fare con l'interfaccia. */
import { spriteDaVoxel } from './voxsprite.js';

/* INQUADRATURA del Libro 3D (skeleton3d.js): centro, lato inquadrato e profondità della camera
   ortografica. near/far vengono dal raggio vero del modello (spigoli dei voxel compresi): la
   rotazione lo tiene dentro la sfera, quindi nessun pezzo esce dai piani di taglio. Con far fisso
   a 100 la metà dietro della creatura spariva a fette mentre girava.
   res = voxel per pixel di gioco (2 nel Libro, 1 per i modelli dati già alla loro misura). */
export function frameVox(voxels, res) {
  let mn = [9e9, 9e9, 9e9], mx = [-9e9, -9e9, -9e9];
  for (const v of voxels) { [v.x, v.y, v.z].forEach((c, i) => { mn[i] = Math.min(mn[i], c); mx[i] = Math.max(mx[i], c); }); }
  if (!voxels.length) mn = mx = [0, 0, 0];
  const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2;
  /* inquadratura con minimo fisso: le creature piccole APPAIONO piccole (la taglia si legge) */
  const span = Math.max(26 * res, Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) + 4 * res);
  let radius = 0;
  for (const v of voxels) radius = Math.max(radius, Math.hypot(Math.abs(v.x - cx) + 0.5, Math.abs(v.y - cy) + 0.5, Math.abs(v.z - cz) + 0.5));
  const dir = [1, 0.7, 1], len = Math.hypot(...dir);
  const dist = span * len;
  return {
    cx, cy, cz, span, radius, dist,
    pos: dir.map(d => (d / len) * dist),
    near: Math.max(0.1, Math.floor(dist - radius - 2)),
    far: Math.ceil(dist + radius + 2),
  };
}

/* proiezione laterale di una lista di voxel qualsiasi (usata anche per i PEZZI nello zaino).
   lit = pezzi consegnati al museo: gli altri restano oscurati */
export function projectVox(cv, vox, silhouette, lit, bg, maxS) {
  const c2 = cv.getContext && cv.getContext('2d'); if (!c2) return;
  c2.imageSmoothingEnabled = false;
  /* bg === false → NON riempie lo sfondo: resta trasparente, così la silhouette dei voxel si
     legge dall'alpha (serve al tavolo di preparazione per sapere DOVE c'è l'osso). */
  if (bg !== false) { c2.fillStyle = bg || '#15120d'; c2.fillRect(0, 0, cv.width, cv.height); }
  else c2.clearRect(0, 0, cv.width, cv.height);
  if (!vox.length) return;
  /* LO STESSO DISEGNO DELLE CREATURE (voxsprite.js): vista 3/4 dall'alto, luce dal modello,
     quattro toni e contorno. Era una proiezione di lato con tre toni di profondità: ossa bianche
     piatte a blocchi, «proprio TANTO brutte». Qui si dà a ogni voxel il suo colore (osso, ombra,
     occhio, pezzo non ancora consegnato) e il resto lo fa il disegno. La SAGOMA resta piatta: è
     un'ombra, non un oggetto. */
  const col = v => {
    if (silhouette) return '#4a4438';
    if (v.col) return v.col;
    if (v.k === 'eye') return '#15120d';
    if (lit && v.p && !lit.includes(v.p)) return v.k === 'shade' || v.k === 'dark' ? '#2c283a' : '#3a3450';   // pezzo non consegnato
    return v.k === 'dark' ? '#a89c84' : v.k === 'shade' ? '#d8cdb4' : '#f0eadb';
  };
  const colorati = vox.map(v => ({ x: v.x, y: v.y, z: v.z, col: col(v), k: v.k === 'eye' && !silhouette ? 'eye' : undefined }));
  return disegnaSu(c2, cv, colorati, silhouette, maxS);
}
/* ossa e carne con i colori del disegno (usato anche dalle teche e dallo scheletro del museo) */
export function ossaColorate(vox) {
  return vox.map(v => ({ x: v.x, y: v.y, z: v.z, k: v.k === 'eye' ? 'eye' : undefined,
    col: v.col || (v.k === 'eye' ? '#15120d' : v.k === 'dark' ? '#a89c84' : v.k === 'shade' ? '#d8cdb4' : '#f0eadb') }));
}
function disegnaSu(c2, cv, colorati, silhouette, maxS) {
  let sp;
  try { sp = spriteDaVoxel(colorati, 'side', { piatto: !!silhouette }, '', 1); } catch (e) { sp = null; }
  if (!sp) return;
  let s = Math.max(1, Math.floor(Math.min(cv.width / (sp.width + 2), cv.height / (sp.height + 2))));
  if (maxS) s = Math.min(s, maxS);   // tavolo di preparazione: voxel piccoli = forma leggibile
  const ox = Math.floor((cv.width - sp.width * s) / 2), oy = Math.floor((cv.height - sp.height * s) / 2);
  c2.drawImage(sp, ox, oy, sp.width * s, sp.height * s);
}
