/* PENNELLO — le primitive di disegno condivise da tutti i moduli di rendering.
   Stavano dentro render.js, che era diventato un monolite da 1800 righe: chiunque volesse
   disegnare doveva stare lì dentro. Qui non c'è logica di gioco, solo pixel sul contesto.

   snap() è obbligatorio per tutto ciò che sta nel MONDO: senza, la camera che scorre di
   frazioni di pixel fa vibrare le strutture (vedi REGOLE FERREE in CLAUDE.md). */
import { ctx, view } from './screen.js';

export function snap(v) { return Math.round(v * view.K) / view.K; }
export function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
export function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
/* ombra di contatto: ellisse schiacciata, sempre della stessa forma (PIXELART.md regola 5) */
export function shadow(cx, cy, rw) {
  ctx.fillStyle = 'rgba(15,25,15,.16)';
  for (let i = -rw; i <= rw; i++) { const h = Math.round(2 * Math.sqrt(Math.max(0, 1 - (i * i) / (rw * rw)))); ctx.fillRect(cx + i, cy - h, 1, h * 2); }
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
export const BRUSH = { rect, px, shadow, shade8, snap, get ctx() { return ctx; } };
