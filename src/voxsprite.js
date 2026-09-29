/* LA CREATURA DISEGNATA DAL SUO MODELLO — da voxel a pixel art.
   Prima era una proiezione di profilo pura: ogni voxel il suo pixel, la luce ricavata solo dalla
   profondità. Le bestie uscivano piatte e a blocchi, «proprio TANTO brutte» (segnalato). Qui:
   - VISTA 3/4 DALL'ALTO, la stessa di tutto il gioco: la profondità scende sullo schermo di
     `INCLINA` pixel per voxel, quindi si vede anche il dorso, non solo il fianco;
   - LUCE VERA: la normale di ogni voxel si ricava dal modello 3D (quali vicini sono vuoti), e
     la luce viene da sopra a sinistra, un po' davanti — come nel resto del gioco;
   - QUATTRO TONI con lo spostamento di tinta della pixel art: l'ombra vira al freddo, la luce
     al caldo (mai solo più scuro e più chiaro, che fa grigio);
   - OMBRA NELLE PIEGHE: dove il voxel è circondato (sotto la pancia, fra le zampe, all'attacco
     della testa) il tono scende di un gradino;
   - CONTORNO del colore della parte, molto scurito, e una linea dove una parte passa davanti a
     un'altra.
   Il resto del gioco non cambia: stesse opzioni, stessa tela con `_ax`, `_back`, `_front`. */
import { shade8 } from './brush.js';

export const INCLINA = 0.5;            // quanto si vede dall'alto: mezza casella di profondità per riga

function mix(a, b, k) {
  const n1 = parseInt(a.slice(1), 16), n2 = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((n1 >> s) & 255) * (1 - k) + ((n2 >> s) & 255) * k);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
const FREDDO = '#2c2f66', CALDO = '#fff1c8';
/* i quattro toni di un colore: ombra fonda, ombra, pieno, luce */
const TONI = new Map();
function toni(col) {
  let t = TONI.get(col);
  if (!t) {
    t = [mix(shade8(col, 0.6), FREDDO, 0.22), mix(shade8(col, 0.8), FREDDO, 0.1), col, mix(shade8(col, 1.14), CALDO, 0.2)];
    TONI.set(col, t);
  }
  return t;
}

/* `view`: 'side' (di profilo, muso a sinistra) · 'front' (muso verso chi guarda) · 'back' */
export function spriteDaVoxel(vox, view, o, seme, ss = 1) {
  o = o || {};
  /* assi: h = orizzontale sullo schermo, d = verso chi guarda (+ = vicino), y = su.
     FRONT: la testa (x piccolo) sta davanti; BACK all'opposto. */
  const proj = view === 'side' ? v => [v.x, v.z] : view === 'front' ? v => [v.z, -v.x] : v => [v.z, v.x];
  /* la luce, dallo spazio dello schermo (sinistra, su, verso chi guarda) a quello del modello */
  const Lh = -0.5, Ly = 0.72, Ld = 0.48;
  const L = view === 'side' ? [Lh, Ly, Ld] : view === 'front' ? [-Ld, Ly, Lh] : [Ld, Ly, Lh];   // [x, y, z]
  const Ln = Math.hypot(L[0], L[1], L[2]); L[0] /= Ln; L[1] /= Ln; L[2] /= Ln;

  /* il modello in una GRIGLIA piena (non un insieme di stringhe): il disegno chiede i vicini di
     ogni voxel in vista un centinaio di volte, e con le stringhe una creatura costava 20 ms */
  let gx0 = 1e9, gy0 = 1e9, gz0 = 1e9, gx1 = -1e9, gy1 = -1e9, gz1 = -1e9;
  for (const v of vox) { if (v.x < gx0) gx0 = v.x; if (v.x > gx1) gx1 = v.x; if (v.y < gy0) gy0 = v.y; if (v.y > gy1) gy1 = v.y; if (v.z < gz0) gz0 = v.z; if (v.z > gz1) gz1 = v.z; }
  const GX = gx1 - gx0 + 1, GY = gy1 - gy0 + 1, GZ = gz1 - gz0 + 1;
  const griglia = new Uint8Array(GX * GY * GZ);
  for (const v of vox) griglia[((v.x - gx0) * GY + (v.y - gy0)) * GZ + (v.z - gz0)] = 1;
  const c = (x, y, z) => { x -= gx0; y -= gy0; z -= gz0; return x >= 0 && y >= 0 && z >= 0 && x < GX && y < GY && z < GZ && griglia[(x * GY + y) * GZ + z] === 1; };

  let mnh = 1e9, mxh = -1e9, mny = 1e9, mxy = -1e9, mnd = 1e9, mxd = -1e9;
  for (const v of vox) { const [h, d] = proj(v); if (h < mnh) mnh = h; if (h > mxh) mxh = h; if (v.y < mny) mny = v.y; if (v.y > mxy) mxy = v.y; if (d < mnd) mnd = d; if (d > mxd) mxd = d; }
  /* IN CAMMINO il riquadro deve restare quello della bestia ferma: se un piede che va avanti o
     indietro allargasse la sagoma, centrarla o appoggiarla al fondo la farebbe scattare di lato a
     ogni passo. Con `o.base` (i limiti della posa ferma) l'origine resta quella, e `ox/oy` dicono
     di quanto questa posa sborda a sinistra e in alto rispetto alla ferma. */
  const base = o.base;
  /* la profondità di riferimento resta ESATTAMENTE quella della ferma: l'inclinazione si arrotonda
     riga per riga, e spostarla anche di un voxel faceva scattare di un pixel mezza bestia */
  if (base) { mnh = Math.min(mnh, base.mnh); mxy = Math.max(mxy, base.mxy); mnd = base.mnd; }
  const pad = 1;
  const sx = h => pad + (h - mnh);
  const sy = (y, d) => pad + (mxy - y) + Math.round((d - mnd) * INCLINA);
  let W = (mxh - mnh + 1) + pad * 2, H = (mxy - mny + 1) + Math.round((mxd - mnd) * INCLINA) + pad * 2;

  /* PER OGNI PIXEL il voxel più vicino a chi guarda (davanti e in alto) */
  let buf = new Map();
  for (const v of vox) {
    const [h, d] = proj(v);
    const px = sx(h), py = sy(v.y, d), k = px + ',' + py, pri = d + v.y * INCLINA;
    const cur = buf.get(k);
    if (!cur || pri > cur.pri) buf.set(k, { pri, d, v });
  }
  const at = (x, y) => buf.get(x + ',' + y);
  /* [nx, ny, nz, quanto è pieno attorno 0..1] */
  const RN = 3, OFF = [];
  for (let dx = -RN; dx <= RN; dx++) for (let dy = -RN; dy <= RN; dy++) for (let dz = -RN; dz <= RN; dz++) {
    const r2 = dx * dx + dy * dy + dz * dz; if (!r2 || r2 > RN * RN + 1) continue;
    OFF.push([dx, dy, dz, 1 / Math.sqrt(r2)]);
  }
  /* normale e luce una volta per pixel, scritte sul pixel stesso (prima una mappa per oggetto:
     era la voce più pesante del disegno) */
  const prepara = (p) => { if (p.l === undefined) { const n = normale(p.v); p.l = n[0] * L[0] + n[1] * L[1] + n[2] * L[2]; p.m = n[3]; } return p; };
  const normale = (v) => {
    let nx = 0, ny = 0, nz = 0, pieni = 0;
    for (const [dx, dy, dz, w] of OFF) if (c(v.x + dx, v.y + dy, v.z + dz)) { nx -= dx * w; ny -= dy * w; nz -= dz * w; pieni++; }
    const l = Math.hypot(nx, ny, nz);
    return l < 1e-6 ? [0, 1, 0, pieni / OFF.length] : [nx / l, ny / l, nz / l, pieni / OFF.length];
  };

  /* la pancia più chiara: dall'alto al basso della sagoma, colonna per colonna */
  const colTop = {}, colBot = {};
  for (const k of buf.keys()) { const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1); colTop[x] = Math.min(colTop[x] ?? 1e9, y); colBot[x] = Math.max(colBot[x] ?? -1e9, y); }
  const sid = String(seme || ''), hsh = [...sid].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const disegno = hsh % 3;                                     // 0 niente · 1 macchie · 2 strisce sul dorso

  let pix = new Map();                                         // "x,y" → colore finale
  for (const [k, p] of buf) {
    const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1), v = p.v;
    if (v.k === 'eye') {
      if (view === 'back') { pix.set(k, shade8(v.col || '#33291f', 0.9)); continue; }
      const su = at(x, y - 1), sx2 = at(x - 1, y);
      pix.set(k, (su && su.v.k === 'eye') || (sx2 && sx2.v.k === 'eye') ? '#1a1410' : '#f6f0e0');   // luce in alto a sinistra dell'occhio
      continue;
    }
    /* NORMALE LISCIA dal modello: si guarda la MASSA attorno al voxel in un raggio di due, e la
       normale punta dove ce n'è meno. Coi soli vicini immediati, a questa risoluzione, la luce
       usciva granulosa e a righe — ogni gradino di voxel diventava una macchia. */
    /* la luce di questo pixel è la MEDIA con i vicini della stessa superficie (profondità simile):
       con la vista dall'alto una riga di pixel pesca voxel di due profondità, e la loro luce
       appena diversa, divisa in quattro toni, diventava una fila di righe sul fianco */
    let luce = 0, massa = 0, peso = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const q = at(x + dx, y + dy); if (!q || Math.abs(q.d - p.d) > 3 || q.v.k === 'eye') continue;
      const w = dx || dy ? 1 : 2;
      prepara(q); luce += q.l * w; massa += q.m * w; peso += w;
    }
    luce /= peso || 1; massa /= peso || 1;
    const n = [0, 0, 0, massa];
    let tono = o.piatto ? 2 : luce > 0.55 ? 3 : luce > 0.12 ? 2 : luce > -0.3 ? 1 : 0;
    if (n[3] > 0.7 && tono > 0) tono--;                        // piega: tanta massa attorno, meno luce
    let col = v.col || '#c8b078';
    const bh = Math.max(1, colBot[x] - colTop[x]), vy = (y - colTop[x]) / bh;
    if (vy > 0.66 && bh > 6 && !v.wing) col = mix(col, '#f4e8cc', 0.25);   // pancia
    /* LINEA dove una parte passa davanti a un'altra: il pixel di quella DIETRO si scurisce */
    for (const nb of [at(x, y - 1), at(x, y + 1), at(x - 1, y), at(x + 1, y)]) if (nb && nb.d > p.d + 7) { tono = 0; break; }
    pix.set(k, toni(col)[tono]);
  }

  /* IL MODELLO A RISOLUZIONE DOPPIA, RIDOTTO: con `ss` = 2 il modello arriva costruito fine il
     doppio (voxel grandi la metà) e ogni blocco di 2×2 pixel diventa un pixel solo, col colore
     che c'è di più. La creatura resta grande uguale, ma i contorni curvi, le corna, le orecchie
     e le macchie escono puliti — a risoluzione singola erano gradini da un voxel intero.
     Un occhio vince sempre (è il punto che dà vita), e un blocco pieno a metà resta pieno: così
     le zampe sottili e le punte non spariscono. */
  if (ss === 2) {
    const blocchi = new Map();
    for (const [k, col] of pix) {
      const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1), bk = (x >> 1) + ',' + (y >> 1);
      let b = blocchi.get(bk); if (!b) { b = { n: 0, conta: new Map(), occhio: null, primo: null }; blocchi.set(bk, b); }
      const p2 = buf.get(k);
      b.n++; b.conta.set(col, (b.conta.get(col) || 0) + 1);
      if (p2.v.k === 'eye' && (!b.occhio || col === '#1a1410')) b.occhio = col;
      if (!b.primo || p2.pri > b.primo.pri) b.primo = p2;
    }
    const buf2 = new Map(), pix2 = new Map();
    for (const [bk, b] of blocchi) {
      if (b.n < 2 && !b.occhio) continue;
      let migliore = null, quanti = -1;
      for (const [col, n2] of b.conta) if (n2 > quanti || (n2 === quanti && col < migliore)) { migliore = col; quanti = n2; }
      pix2.set(bk, b.occhio || migliore);
      buf2.set(bk, b.primo);
    }
    buf = buf2; pix = pix2; W = Math.ceil(W / 2); H = Math.ceil(H / 2);
    for (const k in colTop) delete colTop[k];
    for (const k of buf.keys()) { const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1); colTop[x] = Math.min(colTop[x] ?? 1e9, y); }
  }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.bnd = { mnh, mxy, mnd };
  cv.ox = base ? Math.round((base.mnh - mnh) / ss) : 0;
  cv.oy = base ? Math.round((mxy - base.mxy) / ss) : 0;
  const g = cv.getContext('2d');
  /* contorno: il colore di chi tocca, molto scurito e un filo freddo — mai un nero uniforme */
  const fatti = new Set();
  for (const [k, p] of buf) {
    const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = (x + dx) + ',' + (y + dy);
      if (buf.has(nk) || fatti.has(nk)) continue; fatti.add(nk);
      g.fillStyle = mix(shade8(p.v.col || '#c8b078', 0.3), FREDDO, 0.15); g.fillRect(x + dx, y + dy, 1, 1);
    }
  }
  for (const [k, col] of pix) { const i = k.indexOf(','); g.fillStyle = col; g.fillRect(+k.slice(0, i), +k.slice(i + 1), 1, 1); }

  /* ALA VICINA a parte (solo cavalcatura, di profilo): si ridisegna SOPRA il pilota */
  if (o.wingFlap != null && view === 'side') {
    const near = new Set();
    for (const [k, p] of buf) if (p.v.wing && p.v.z > 0) near.add(k);
    if (near.size) {
      const fcv = document.createElement('canvas'); fcv.width = W; fcv.height = H;
      const fg = fcv.getContext('2d');
      for (const k of near) {
        const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nk = (x + dx) + ',' + (y + dy); if (near.has(nk)) continue;
          fg.fillStyle = mix(shade8(buf.get(k).v.col || '#c8b078', 0.3), FREDDO, 0.15); fg.fillRect(x + dx, y + dy, 1, 1);
        }
      }
      for (const k of near) { const i = k.indexOf(','); fg.fillStyle = pix.get(k); fg.fillRect(+k.slice(0, i), +k.slice(i + 1), 1, 1); }
      cv._front = fcv;
    } else cv._front = null;
  }
  const spanH = Math.round((mxh - mnh + 1) / ss);
  cv._ax = spanH / 2 + pad;
  /* la cima della schiena vicino al centro (per sella e cavaliere): la colonna più bassa fra le cinque centrali */
  let back = -1; const mid = Math.round(spanH / 2 + pad);
  for (let dx = -2; dx <= 2; dx++) { const tpy = colTop[mid + dx]; if (tpy !== undefined && tpy > back) back = tpy; }
  cv._back = back < 0 ? 0 : back;
  /* DI FRONTE E DI SPALLE la cima delle colonne centrali è il COLLO (la testa sta sopra il corpo, e
     di spalle è la cosa più lontana, quindi più in alto): il pilota ci finiva seduto sopra
     (segnalato con foto). Lì la groppa si prende dal modello: la cima del torace a metà corpo,
     proiettata come il resto del disegno. */
  if (view !== 'side') {
    const torso = vox.filter(v => v.p === 'torace' && !v.wing);
    if (torso.length) {
      let x0 = 1e9, x1 = -1e9;
      for (const v of torso) { if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; }
      const midX = (x0 + x1) / 2, fascia = Math.max(1, Math.round((x1 - x0) / 8));
      let cima = null;
      for (const v of torso) if (Math.abs(v.x - midX) <= fascia && (!cima || v.y > cima.y)) cima = v;
      const riga = sy(cima.y, proj(cima)[1]);
      cv._back = Math.max(0, ss === 2 ? riga >> 1 : riga);
    }
  }
  return cv;
}
