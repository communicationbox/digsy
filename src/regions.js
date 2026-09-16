/* Zone stile Minecraft: 6 tipi, ripetibili, dimensioni variabili (noise a bassa frequenza).
   Cache per blocchi 4×4 tile. I confini sono DOMAIN-WARPED (serpeggiano, niente righello)
   con un filo di dithering: ai bordi le zone si mescolano a chiazze.
   COERENZA CLIMATICA: il primo noise è la "temperatura" divisa in 3 fasce
   (freddo → temperato → caldo), il secondo sceglie la zona dentro la fascia.
   Così Lande Gelide e Terre Rosse non possono mai toccarsi: nel mezzo c'è sempre
   una fascia temperata. */
import { fbm, smooth } from './noise.js';
import { ZONES } from './data.js';

/* [secco, umido] per fascia: 0 freddo → 1 temperato → 2 caldo */
export const BAND = [
  [5, 2], // Lande Gelide · Boschi Cinerei
  [0, 4], // Prati Dorati · Palude Antica
  [3, 1], // Terre Rosse  · Dune Ossee
];

/* --- COME NASCE UN CONFINE ---
   Il campo climatico si campiona in un punto SPOSTATO da altri due noise (domain warp, due
   giri): i confini si attorcigliano invece di seguire una collina. Poi il valore si SPALMA su
   cinque campioni distanti: è un passa-basso che cancella le pozze piccole, ed è quello che
   impedisce i biomi microscopici — una chiazza di dieci caselle di Lande Gelide in mezzo ai
   Prati non è un bioma, è un errore che si vede.
   Infine, la decisione si prende PER CASELLA con un pizzico di rumore: dove il campo è lontano
   dalla soglia non cambia niente, ma proprio sul confine le caselle si mescolano e il bordo si
   sfrangia. Prima la decisione era per blocchi di 4×4 senza sfrangiatura, e fra due zone
   restava una lama dritta (segnalato con foto). */
const FREQ = 0.0032;          // più basso = zone più grandi
const WARP = 90, WARP2 = 34;  // i due giri di deformazione
const SPALMA = 46;            // quanto lontano si spalma il campo (in caselle)
const FRANGIA = 11;           // di quante caselle ondeggia il confine

/* il CAMPO (temperatura, umidità) al centro di un blocco 4×4, già deformato e spalmato */
function campo(cx, cy) {
  const wx = (fbm(cx * 0.02 + 7, cy * 0.02 + 13, 63) - 0.5) * WARP;
  const wy = (fbm(cx * 0.02 + 51, cy * 0.02 + 77, 64) - 0.5) * WARP;
  const wx2 = (fbm((cx + wx) * 0.006 + 3, (cy + wy) * 0.006 + 29, 67) - 0.5) * WARP2;
  const wy2 = (fbm((cx + wx) * 0.006 + 83, (cy + wy) * 0.006 + 41, 68) - 0.5) * WARP2;
  const px = cx + wx + wx2, py = cy + wy + wy2;
  /* media di cinque campioni: il centro pesa il doppio, i quattro attorno smussano le pozze */
  let a = fbm(px * FREQ, py * FREQ, 61) * 2, b = fbm(px * FREQ + 37, py * FREQ + 91, 62) * 2, peso = 2;
  for (const [dx, dy] of [[SPALMA, 0], [-SPALMA, 0], [0, SPALMA], [0, -SPALMA]]) {
    a += fbm((px + dx) * FREQ, (py + dy) * FREQ, 61);
    b += fbm((px + dx) * FREQ + 37, (py + dy) * FREQ + 91, 62);
    peso++;
  }
  /* la media SCHIACCIA il campo verso il centro: senza riallargarlo, le soglie non vengono
     più attraversate e mezzo mondo diventa una fascia climatica sola (misurato: restavano
     Prati e Palude e basta). Si riapre attorno a 0.5 di quanto la media ha stretto. */
  const apri = v => 0.5 + (v - 0.5) * 1.75;
  return { a: apri(a / peso), b: apri(b / peso) };
}
/* il CAMPO in un blocco 4×4, tenuto in cache: è la parte cara (nove giri di noise) */
const fcache = new Map();
function campoBlocco(bx, by) {
  const key = bx + ',' + by;
  let f = fcache.get(key);
  if (f === undefined) { f = campo(bx * 4 + 2, by * 4 + 2); fcache.set(key, f); }
  return f;
}
/* il campo in un punto QUALSIASI: interpolato fra i quattro blocchi attorno. Prendere di
   peso la zona del blocco scalinava il confine e, con l'ondulazione, staccava isolotti da una
   casella — cioè il bioma microscopico. Interpolando, la soglia taglia una curva continua:
   il bordo ondeggia e resta tutto d'un pezzo. */
function campoPunto(px, py) {
  const gx = (px - 2) / 4, gy = (py - 2) / 4;
  const bx = Math.floor(gx), by = Math.floor(gy), ux = gx - bx, uy = gy - by;
  const f00 = campoBlocco(bx, by), f10 = campoBlocco(bx + 1, by), f01 = campoBlocco(bx, by + 1), f11 = campoBlocco(bx + 1, by + 1);
  const mix = (p, q, u) => p + (q - p) * u;
  return {
    a: mix(mix(f00.a, f10.a, ux), mix(f01.a, f11.a, ux), uy),
    b: mix(mix(f00.b, f10.b, ux), mix(f01.b, f11.b, ux), uy),
  };
}
export function zoneIdxAt(tx, ty) {
  /* IL BORDO ONDEGGIA PERCHÉ SI SPOSTA IL PUNTO, non perché si somma rumore alla decisione.
     Sommare rumore per casella staccava chiazzette da una casella sola; spostare di qualche
     casella il punto in cui si CHIEDE il clima deforma il confine e basta. */
  const ox = (smooth(tx * 0.085, ty * 0.085, 65) - 0.5) * FRANGIA;
  const oy = (smooth(tx * 0.085 + 19, ty * 0.085 + 5, 66) - 0.5) * FRANGIA;
  const f = campoPunto(tx + ox, ty + oy);
  const band = Math.max(0, Math.min(2, Math.floor((f.a - 0.2) / 0.6 * 3)));
  return BAND[band][f.b > 0.5 ? 1 : 0];
}
export function zoneAt(tx, ty) { return ZONES[zoneIdxAt(tx, ty)]; }
