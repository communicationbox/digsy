/* LUCCIOLE (#5) — piccolo collezionabile d'atmosfera. Di NOTTE, all'aperto, alcune lucciole
   fluttuano attorno al giocatore con un bagliore che pulsa; passandoci vicino si raccolgono
   (S.fireflies). Cozy: nessun fallimento, nessuna fretta — sono lì se hai voglia di prenderle.

   Le lucciole VIVE non stanno nel salvataggio (sono effimere, si rigenerano): nel save c'è solo
   il CONTEGGIO. Regola animazioni: la fase del bagliore viene dal TEMPO, mai dalle coordinate
   schermo; le posizioni sono in coordinate MONDO e si disegnano con snap (Math.round). */
import { S, P, save } from './state.js';
import { playSfx } from './audio.js';

const MAX = 7, CATCH_R = 11, FAR = 190, NIGHT_MIN = 0.35;
let flies = [], lastT = 0;

function spawn() {
  const a = Math.random() * Math.PI * 2, r = 46 + Math.random() * 130;
  return {
    x: P.x + Math.cos(a) * r, y: P.y + 8 + Math.sin(a) * r,
    dir: Math.random() * Math.PI * 2, v: 8 + Math.random() * 10,
    ph: Math.random() * 6.28, seed: Math.random() * 6.28,
  };
}
export function fireflyCount() { return flies.length; }
export function resetFireflies() { flies = []; lastT = 0; }
export function _fliesForTest() { return flies; }   // solo per i test

/* aggiorna: spawn/deriva/cattura. nightLevel = night() (0..1). Sotto NIGHT_MIN spariscono. */
export function updateFireflies(time, nightLevel) {
  if (nightLevel < NIGHT_MIN) { if (flies.length) flies = []; lastT = 0; return; }
  const dt = lastT ? Math.min(0.05, (time - lastT) / 1000) : 0.016; lastT = time;
  while (flies.length < MAX) flies.push(spawn());
  let caught = 0;
  for (const f of flies) {
    f.ph += dt * 2.4;                                  // bagliore (fase dal tempo)
    f.dir += Math.sin(time / 900 + f.seed) * dt * 1.3; // serpeggia
    f.x += Math.cos(f.dir) * f.v * dt;
    f.y += Math.sin(f.dir) * f.v * dt;
    const dd = Math.hypot(f.x - P.x, f.y - (P.y + 8));
    if (dd > FAR) Object.assign(f, spawn());           // troppo lontana → rientra
    else if (dd < CATCH_R) { caught++; Object.assign(f, spawn()); } // raccolta
  }
  if (caught) { S.fireflies = (S.fireflies || 0) + caught; playSfx('found'); save(); }
}

export function drawFireflies(ctx, camx, camy) {
  if (!ctx || !flies.length) return;
  for (const f of flies) {
    const gx = Math.round(f.x - camx), gy = Math.round(f.y - camy);
    const glow = 0.5 + 0.5 * Math.sin(f.ph);
    ctx.fillStyle = 'rgba(190,255,150,' + (0.14 * glow).toFixed(2) + ')'; ctx.fillRect(gx - 3, gy - 3, 6, 6); // alone
    ctx.fillStyle = 'rgba(226,255,176,' + (0.55 + 0.4 * glow).toFixed(2) + ')'; ctx.fillRect(gx - 1, gy - 1, 2, 2); // corpo
  }
}
