/* QUANTO SI SOMIGLIANO DUE CREATURE — per la prova che le tiene diverse («tanti animali si
   assomigliano»). Si confronta quello che l'occhio confronta: la SAGOMA (normalizzata alla stessa
   grandezza, su una griglia 16×12) e i COLORI (quanta parte del corpo è di ogni tinta).
   Modulo puro: lavora su una tela già disegnata. 1 = identiche, 0 = niente in comune. */
const GW = 16, GH = 12;
export function firma(cv) {
  const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const g = new Float32Array(GW * GH), n = new Float32Array(GW * GH);
  const tinte = new Float32Array(64); let pieni = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const o = (y * w + x) * 4; const gx = Math.min(GW - 1, Math.floor((x - x0) / (x1 - x0 + 1) * GW)), gy = Math.min(GH - 1, Math.floor((y - y0) / (y1 - y0 + 1) * GH));
    n[gy * GW + gx]++;
    if (d[o + 3] > 128) {
      g[gy * GW + gx]++; pieni++;
      /* il colore VERO in 4×4×4 scatole: il bianco e il bruno sono colori diversi anche se
         nessuno dei due ha una tinta (col solo cerchio delle tinte, un gufo bianco e uno bruno
         risultavano uguali) */
      tinte[(d[o] >> 6) * 16 + (d[o + 1] >> 6) * 4 + (d[o + 2] >> 6)]++;
    }
  }
  for (let i = 0; i < g.length; i++) g[i] = n[i] ? g[i] / n[i] : 0;
  let st = 0; for (const t of tinte) st += t; if (st) for (let i = 0; i < 64; i++) tinte[i] /= st;
  return { forma: g, tinte, aspetto: (x1 - x0 + 1) / Math.max(1, y1 - y0 + 1) };
}
export function somiglianza(a, b) {
  let inter = 0, uni = 0;
  for (let i = 0; i < a.forma.length; i++) { inter += Math.min(a.forma[i], b.forma[i]); uni += Math.max(a.forma[i], b.forma[i]); }
  const forma = uni ? inter / uni : 1;
  let col = 0; for (let i = 0; i < 64; i++) col += Math.min(a.tinte[i], b.tinte[i]);
  const asp = Math.min(a.aspetto, b.aspetto) / Math.max(a.aspetto, b.aspetto);
  return forma * 0.55 + col * 0.3 + asp * 0.15;
}
