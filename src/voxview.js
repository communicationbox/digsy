/* PROIEZIONE VOXEL 2D — disegna un modello voxel su una canvas, ordinato dal fondo verso
   l'osservatore, con la profondità resa da tre toni. È la stessa immagine usata ovunque:
   miniature dello zaino, teche del museo, pagina del Libro, tavolo di preparazione, e come
   ripiego quando WebGL non c'è. Stava dentro ui.js, ma non ha nulla a che fare con l'interfaccia. */
import { shadeHex } from './bones.js';

/* proiezione laterale di una lista di voxel qualsiasi (usata anche per i PEZZI nello zaino).
   lit = pezzi consegnati al museo: gli altri restano oscurati */
export function projectVox(cv, vox, silhouette, lit, bg, maxS) {
  const c2 = cv.getContext && cv.getContext('2d'); if (!c2) return;
  c2.imageSmoothingEnabled = false;
  c2.fillStyle = bg || '#15120d'; c2.fillRect(0, 0, cv.width, cv.height);
  if (!vox.length) return;
  let mnx = 9e9, mxx = -9e9, mny = 9e9, mxy = -9e9, mnz = 9e9, mxz = -9e9;
  for (const v of vox) {
    mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x);
    mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y);
    mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z);
  }
  const spanX = mxx - mnx + 1, spanY = mxy - mny + 1;
  let s = Math.max(1, Math.floor(Math.min(cv.width / (spanX + 2), cv.height / (spanY + 2))));
  if (maxS) s = Math.min(s, maxS);   // tavolo di preparazione: voxel piccoli = forma leggibile
  const ox = Math.floor((cv.width - spanX * s) / 2), oy = Math.floor((cv.height - spanY * s) / 2);
  const zr = Math.max(1, mxz - mnz);
  for (const v of vox.slice().sort((a, b) => a.z - b.z)) { // lontano→vicino
    let col;
    const zt = (v.z - mnz) / zr;
    if (silhouette) col = '#4a4438';
    else if (v.col) col = zt < 0.34 ? shadeHex(v.col, 0.72) : zt < 0.67 ? v.col : shadeHex(v.col, 1.18);
    else if (v.k === 'eye') col = '#15120d';
    else if (lit && v.p && !lit.includes(v.p)) col = zt < 0.34 ? '#262231' : zt < 0.67 ? '#332e42' : '#403a55'; // pezzo non consegnato
    else col = zt < 0.34 ? '#8f887a' : zt < 0.67 ? '#d6d0c2' : '#ffffff';
    c2.fillStyle = col;
    c2.fillRect(ox + (v.x - mnx) * s, oy + (mxy - v.y) * s, s, s);
  }
}
