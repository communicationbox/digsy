/* PENNELLO — le primitive di disegno condivise da tutti i moduli di rendering.
   Stavano dentro render.js, che era diventato un monolite da 1800 righe: chiunque volesse
   disegnare doveva stare lì dentro. Qui non c'è logica di gioco, solo pixel sul contesto.

   snap() è obbligatorio per tutto ciò che sta nel MONDO: senza, la camera che scorre di
   frazioni di pixel fa vibrare le strutture (vedi REGOLE FERREE in CLAUDE.md). */
import { ctx, view } from './screen.js';

export function snap(v) { const k = view.PX || view.K; return Math.round(v * k) / k; }   // griglia dei pixel FISICI
/* LA TELA SU CUI SI DIPINGE. Di solito è quella del gioco; `dipingiIn` la sposta per un momento
   su un'altra (la cache del terreno in render.js): chi disegna con px/rect non se ne accorge,
   e il disegno che finisce nella copia è esattamente quello che finirebbe sullo schermo. */
let tela = null;
export function dipingiIn(c, fn) { const prima = tela; tela = c; try { fn(); } finally { tela = prima; } }
export function px(x, y, c) { const g = tela || ctx; g.fillStyle = c; g.fillRect(x, y, 1, 1); }
export function rect(x, y, w, h, c) { const g = tela || ctx; g.fillStyle = c; g.fillRect(x, y, w, h); }
/* ombra di contatto: ellisse schiacciata, sempre della stessa forma (PIXELART.md regola 5) */
export function shadow(cx, cy, rw) {
  const g = tela || ctx;
  g.fillStyle = 'rgba(15,25,15,.16)';
  for (let i = -rw; i <= rw; i++) { const h = Math.round(2 * Math.sqrt(Math.max(0, 1 - (i * i) / (rw * rw)))); g.fillRect(cx + i, cy - h, 1, h * 2); }
}
/* schiarisce/scurisce un colore #rrggbb (k<1 scuro, k>1 chiaro) */
export function shade8(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * k)) | 0;
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) * k)) | 0;
  const b = Math.max(0, Math.min(255, (n & 255) * k)) | 0;
  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}
/* il pennello passato ai moduli che disegnano "a ricetta" (wonderart, spritebank) */
export const BRUSH = { rect, px, shadow, shade8, snap, get ctx() { return tela || ctx; },
  /* i moduli di disegno «puri» (townArt, decoArt) non importano niente: il pezzo fermo lo chiedono al pennello */
  pezzo: (key, fn) => pezzo(BRUSH, key, fn) };

/* PENNELLO SU UNA CANVAS QUALSIASI (miniature del negozio/vassoio, pagine di prova): stesse
   primitive, ma su un contesto che non è quello del gioco. Serve perché le anteprime devono
   mostrare ESATTAMENTE il disegno che finisce nella stanza — una seconda funzione "simile"
   è il modo sicuro per farle divergere (è già successo con la scala dei mobili). */
export function makeCanvasBrush(c2) {
  return {
    ctx: c2,
    rect: (x, y, w, h, c) => { c2.fillStyle = c; c2.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); },
    px: (x, y, c) => { c2.fillStyle = c; c2.fillRect(Math.round(x), Math.round(y), 1, 1); },
    shadow: (cx, cy, rw) => {
      c2.fillStyle = 'rgba(15,25,15,.16)';
      for (let i = -rw; i <= rw; i++) { const h = Math.round(2 * Math.sqrt(Math.max(0, 1 - (i * i) / (rw * rw)))); c2.fillRect(cx + i, cy - h, 1, h * 2); }
    },
    shade8,
    snap: v => Math.round(v),
  };
}

/* UNO STRATO FERMO, disegnato una volta e poi copiato: il pavimento del museo (sessanta per
   quarantotto caselle di marmo, tappeti, medaglione, lucernari), quello di una stanza di casa, lo
   stesso ogni fotogramma finché non cambia la chiave. `paint()` disegna in coordinate dello
   strato con l'angolo (x0,y0) — le stesse della scena — e si copia solo il pezzo `vis` in vista
   (se dato). Una scrittura sola, poi solo letture: nessuna attesa della scheda grafica.
   `stratiOn` si spegne per le prove che confrontano i pixel con e senza. */
const STRATI = new Map();
let stratiOn = true;
export function setStrati(on) { stratiOn = !!on; STRATI.clear(); PEZZI.clear(); }
export function strato(key, x0, y0, w, h, paint, vis) {
  if (!stratiOn || typeof document === 'undefined' || !document.createElement) { paint(); return; }
  let cv = STRATI.get(key);
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h);
    const g = cv.getContext && cv.getContext('2d');
    if (!g || !ctx.drawImage) { paint(); return; }
    g.translate(-x0, -y0);
    dipingiIn(g, paint);
    if (STRATI.size >= 6) STRATI.delete(STRATI.keys().next().value);   // pochi e grandi: si tengono gli ultimi
    STRATI.set(key, cv);
  }
  if (vis) {
    const sx = Math.max(0, Math.floor(vis.x - x0)), sy = Math.max(0, Math.floor(vis.y - y0));
    const sw = Math.min(cv.width - sx, Math.ceil(vis.w) + 2), sh = Math.min(cv.height - sy, Math.ceil(vis.h) + 2);
    if (sw > 0 && sh > 0) ctx.drawImage(cv, sx, sy, sw, sh, x0 + sx, y0 + sy, sw, sh);
  } else ctx.drawImage(cv, x0, y0);
}

/* UN PEZZO FERMO DENTRO UN DISEGNO CHE SI MUOVE: il tetto di una bottega col palo che gira, una
   sagoma arrotondata dell'arredo. `fn(g)` si registra la prima volta (quali rettangoli, di che
   colore), si stampa su una tela piccola grande quanto serve, e da lì in poi si copia con una sola
   operazione invece di centinaia. Solo col pennello del gioco (le miniature hanno il loro) e solo
   se il disegno cade su pixel interi: altrimenti la copia non sarebbe identica, e si disegna come
   sempre. La chiave deve dire TUTTO quello da cui il disegno dipende. */
const PEZZI = new Map();
export function pezzo(g, key, fn) {
  if (g !== BRUSH || !stratiOn || typeof document === 'undefined' || !document.createElement) { fn(g); return; }
  let p = PEZZI.get(key);
  if (!p) {
    const ops = []; let intero = true, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const nota = (x, y, w, h, c) => {
      if (w <= 0 || h <= 0) return;
      /* un colore «nessuno» (null) sulla tela vera riusa l'ULTIMO colore impostato, che dipende da
         cosa è stato disegnato prima: in una copia non si può rifare, quindi quel pezzo resta dal vivo */
      if (typeof c !== 'string') intero = false;
      if (x !== Math.round(x) || y !== Math.round(y) || w !== Math.round(w) || h !== Math.round(h)) intero = false;
      ops.push(x, y, w, h, c);
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (x + w > x1) x1 = x + w; if (y + h > y1) y1 = y + h;
    };
    const ombra = (cx, cy, rw) => { for (let i = -rw; i <= rw; i++) { const h = Math.round(2 * Math.sqrt(Math.max(0, 1 - (i * i) / (rw * rw)))); nota(cx + i, cy - h, 1, h * 2, 'rgba(15,25,15,.16)'); } };
    /* chi chiede la tela vera (`ctx`) disegna qualcosa che non si registra: quel pezzo resta dal vivo */
    fn({ rect: nota, px: (x, y, c) => nota(x, y, 1, 1, c), shade8, snap, shadow: ombra, get ctx() { intero = false; return tela || ctx; } });
    p = { live: true };
    if (intero && ops.length && x1 - x0 < 1024 && y1 - y0 < 1024) {
      const cv = document.createElement('canvas'); cv.width = x1 - x0; cv.height = y1 - y0;
      const c2 = cv.getContext && cv.getContext('2d');
      if (c2) {
        for (let i = 0; i < ops.length; i += 5) { c2.fillStyle = ops[i + 4]; c2.fillRect(ops[i] - x0, ops[i + 1] - y0, ops[i + 2], ops[i + 3]); }
        p = { cv, x0, y0 };
      }
    }
    if (PEZZI.size > 400) PEZZI.delete(PEZZI.keys().next().value);
    PEZZI.set(key, p);
  }
  const dove = tela || ctx;
  if (p.live || typeof dove.drawImage !== 'function') { fn(g); return; }
  dove.drawImage(p.cv, p.x0, p.y0);
}
