/* LUCCIOLE (#5) — minigioco NOTTURNO legato a una MISSIONE. Non parte ogni sera (sarebbe una
   noia): compare solo quando hai accettato al cartello la missione «Cattura N lucciole», e solo
   di notte, all'aperto. Passando vicino a una lucciola la prendi (col retino); il conteggio sale
   e la missione avanza. Poi la consegni al cartello.

   Le lucciole VIVE non stanno nel salvataggio (effimere): nel save c'è solo il CONTEGGIO totale
   (S.fireflies). Fase del bagliore/retino dal TEMPO; posizioni in coordinate MONDO con snap. */
import { S, P, save } from './state.js';
import { playSfx } from './audio.js';
import { fireflyQuest } from './quests.js';

const MAX = 7, CATCH_R = 12, FAR = 190, NIGHT_MIN = 0.35, SWING_DUR = 0.34;
let flies = [], pops = [], lastT = 0, swing = 0, swingDir = 1;

function spawn() {
  const a = Math.random() * Math.PI * 2, r = 46 + Math.random() * 130;
  return {
    x: P.x + Math.cos(a) * r, y: P.y + 8 + Math.sin(a) * r,
    dir: Math.random() * Math.PI * 2, v: 8 + Math.random() * 10,
    ph: Math.random() * 6.28, seed: Math.random() * 6.28,
  };
}
export function fireflyCount() { return flies.length; }
export function resetFireflies() { flies = []; pops = []; swing = 0; lastT = 0; }
export function _fliesForTest() { return flies; }   // solo per i test

export function updateFireflies(time, nightLevel) {
  const quest = fireflyQuest();
  if (nightLevel < NIGHT_MIN || !quest) { if (flies.length) { flies = []; pops = []; } lastT = 0; return; }
  const dt = lastT ? Math.min(0.05, (time - lastT) / 1000) : 0.016; lastT = time;
  while (flies.length < MAX) flies.push(spawn());
  if (swing > 0) swing = Math.max(0, swing - dt);
  for (const p of pops) p.life -= dt;
  pops = pops.filter(p => p.life > 0);
  let caught = 0;
  for (const f of flies) {
    f.ph += dt * 2.4;                                  // bagliore (fase dal tempo)
    f.dir += Math.sin(time / 900 + f.seed) * dt * 1.3; // serpeggia
    f.x += Math.cos(f.dir) * f.v * dt;
    f.y += Math.sin(f.dir) * f.v * dt;
    const dx = f.x - P.x, dy = f.y - (P.y + 8), dd = Math.hypot(dx, dy);
    if (dd > FAR) Object.assign(f, spawn());           // troppo lontana → rientra
    else if (dd < CATCH_R) {                           // raccolta col retino
      caught++; pops.push({ x: f.x, y: f.y, life: 0.9 });
      swing = SWING_DUR; swingDir = dx >= 0 ? 1 : -1;
      Object.assign(f, spawn());
    }
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
  const pxs = Math.round(P.x - camx), pys = Math.round(P.y - camy);
  /* RETINO: swipe di ~0.34 s verso l'ultima lucciola presa */
  if (swing > 0) {
    const prog = 1 - swing / SWING_DUR;               // 0→1 (fase dal timer, non da schermo)
    const a = swingDir * (-0.7 + prog * 1.4);
    const hx = pxs, hy = pys - 4;
    const ex = Math.round(hx + swingDir * 5 + Math.sin(a) * 11), ey = Math.round(hy - 10 + Math.cos(a) * -6);
    ctx.strokeStyle = '#caa46a'; ctx.lineWidth = 1;
    if (ctx.beginPath) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke(); } // manico
    ctx.strokeStyle = 'rgba(240,236,206,.9)';
    if (ctx.beginPath) { ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.stroke(); }     // cerchio del retino
  }
  /* +1 che sale ad ogni cattura */
  for (const p of pops) {
    const rise = (0.9 - p.life) * 22, al = Math.max(0, p.life / 0.9);
    const gx = Math.round(p.x - camx), gy = Math.round(p.y - camy - rise);
    if (ctx.fillText) { ctx.font = '9px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(226,255,176,' + al.toFixed(2) + ')'; ctx.fillText('+1', gx, gy); }
  }
  /* CONTATORE della missione sopra la testa: catturate / obiettivo */
  const q = fireflyQuest(), got = q ? Math.max(0, (S.fireflies || 0) - (q.base || 0)) : (S.fireflies || 0);
  const txt = q ? got + '/' + q.n : '×' + got, by = pys - 26;
  ctx.fillStyle = 'rgba(20,16,8,.72)'; ctx.fillRect(pxs - 16, by - 7, 32, 13);
  ctx.fillStyle = 'rgba(226,255,176,.95)'; ctx.fillRect(pxs - 12, by - 2, 3, 3);   // lucciolina
  if (ctx.fillText) { ctx.font = '9px ui-monospace,monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#efe3c6'; ctx.fillText(txt, pxs - 7, by + 4); }
}
