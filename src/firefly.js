/* LUCCIOLE (#5) — minigioco NOTTURNO legato a una MISSIONE. Non parte ogni sera (sarebbe una
   noia): compare solo quando hai accettato al cartello la missione «Cattura N lucciole», e solo
   di notte, all'aperto. Passando vicino a una lucciola la prendi (col retino); il conteggio sale
   e la missione avanza. Poi la consegni al cartello.

   Le lucciole VIVE non stanno nel salvataggio (effimere): nel save c'è solo il CONTEGGIO totale
   (S.fireflies). Fase del bagliore/retino dal TEMPO; posizioni in coordinate MONDO con snap. */
import { S, P, save } from './state.js';
import { playSfx } from './audio.js';
import { fireflyQuest } from './quests.js';

const MAX = 7, REACH = 28, MOUTH = 15, FAR = 190, NIGHT_MIN = 0.35, SWING_DUR = 0.42;
let flies = [], pops = [], lastT = 0, swing = 0, swingDir = 1;

function spawn() {
  const a = Math.random() * Math.PI * 2, r = 46 + Math.random() * 130;
  return {
    x: P.x + Math.cos(a) * r, y: P.y + 8 + Math.sin(a) * r,
    dir: Math.random() * Math.PI * 2, v: 13 + Math.random() * 13,   // un po' più svelte (13–26 px/s)
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
  for (const f of flies) {                             // solo movimento: la cattura è su E (tryCatchFireflies)
    f.ph += dt * 2.4;                                  // bagliore (fase dal tempo)
    f.dir += Math.sin(time / 480 + f.seed) * dt * 2.4; // serpeggio più marcato
    f.dir += (Math.random() - 0.5) * dt * 4.5;        // piccoli scatti di direzione (un pochino erratiche)
    f.x += Math.cos(f.dir) * f.v * dt;
    f.y += Math.sin(f.dir) * f.v * dt;
    if (Math.hypot(f.x - P.x, f.y - (P.y + 8)) > FAR) Object.assign(f, spawn()); // troppo lontana → rientra
  }
}

/* c'è una lucciola a PORTATA di retino? (per il prompt del tasto E) */
export function fireflyInReach() {
  for (const f of flies) if (Math.hypot(f.x - P.x, f.y - (P.y + 8)) < REACH) return true;
  return false;
}
/* RETINATA (tasto E): se c'è una lucciola a portata, dà la retinata verso di essa e cattura lei
   e quelle nel "sacco" del retino. Ritorna true se ha retinato (così E viene consumato). */
export function tryCatchFireflies() {
  if (!flies.length) return false;
  let target = null, td = REACH;
  for (const f of flies) { const d = Math.hypot(f.x - P.x, f.y - (P.y + 8)); if (d < td) { td = d; target = f; } }
  if (!target) return false;
  const tx = target.x, ty = target.y;
  swing = SWING_DUR; swingDir = tx - P.x >= 0 ? 1 : -1;
  let caught = 0;
  for (const f of flies) if (Math.hypot(f.x - tx, f.y - ty) < MOUTH) { caught++; pops.push({ x: f.x, y: f.y, life: 0.9 }); Object.assign(f, spawn()); }
  if (caught) { S.fireflies = (S.fireflies || 0) + caught; playSfx('found'); save(); }
  return true;
}

function fpx(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
/* RETINO da acchiappafarfalle, PIXEL-ART: manico di legno + cerchio + sacca a maglie. Nessun
   arc/stroke sfocato: solo pixel netti (snap). (hx,hy)=mano, (cx,cy)=centro del cerchio. */
function drawNet(ctx, hx, hy, cx, cy) {
  const R = 5;
  /* manico di legno (2px) dalla mano al bordo del cerchio */
  const dx = cx - hx, dy = cy - hy, len = Math.max(1, Math.hypot(dx, dy)), ux = dx / len, uy = dy / len;
  for (let i = 0; i <= len - R; i++) fpx(ctx, hx + ux * i, hy + uy * i, 2, 2, i < 2 ? '#6b4420' : '#8a5a2e');
  /* SACCA: bianco translucido dentro il cerchio + coda che si stringe sotto */
  for (let yy = -R; yy <= R + 6; yy++) for (let xx = -R; xx <= R; xx++) {
    const inRing = xx * xx + yy * yy < R * R;
    const inBag = yy > 0 && Math.abs(xx) <= R - Math.floor(yy * 0.7);
    if (inRing || inBag) fpx(ctx, cx + xx, cy + yy, 1, 1, 'rgba(238,246,255,.18)');
  }
  /* maglie: fili chiari radi */
  for (let k = -R + 1; k < R; k += 2) fpx(ctx, cx + k, cy - R + 2, 1, R + 4, 'rgba(240,244,255,.22)');
  /* CERCHIO (rim) a pixel: legno chiaro */
  for (let d = 0; d < 22; d++) { const an = d / 22 * Math.PI * 2; fpx(ctx, cx + Math.cos(an) * R, cy + Math.sin(an) * R, 1, 1, '#efe6c8'); }
  fpx(ctx, cx - 1, cy - R - 1, 2, 1, '#cbb98a'); // nodo in alto
}

export function drawFireflies(ctx, camx, camy) {
  if (!ctx || !flies.length) return;
  for (const f of flies) {
    const gx = Math.round(f.x - camx), gy = Math.round(f.y - camy);
    const glow = 0.5 + 0.5 * Math.sin(f.ph);
    fpx(ctx, gx - 3, gy - 3, 7, 7, 'rgba(150,230,120,' + (0.09 * glow).toFixed(2) + ')');           // alone morbido
    ctx.fillStyle = 'rgba(205,255,150,' + (0.35 + 0.3 * glow).toFixed(2) + ')';                       // croce di luce
    ctx.fillRect(gx - 2, gy, 5, 1); ctx.fillRect(gx, gy - 2, 1, 5);
    fpx(ctx, gx, gy, 2, 2, 'rgba(244,255,205,' + (0.7 + 0.3 * glow).toFixed(2) + ')');                // cuore acceso
  }
  const pxs = Math.round(P.x - camx), pys = Math.round(P.y - camy);
  /* RETINO: retinata a frusta — parte alto/dietro, scende in avanti e "scoopa", poi risale.
     Easing (accelera→decelera) e il braccio si allunga a metà colpo, così l'arco si legge. */
  if (swing > 0) {
    const t = 1 - swing / SWING_DUR;                  // 0→1 (fase dal timer, non da schermo)
    const prog = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) * (-2 * t + 2) / 2; // easeInOut
    const ang = swingDir * (-1.35 + prog * 2.5) - Math.PI / 2;             // da su-dietro a giù-avanti
    const reach = 8 + Math.sin(prog * Math.PI) * 6;   // il braccio si estende a metà swipe
    const hx = pxs + swingDir * 2, hy = pys - 2;      // mano
    const cx = pxs + swingDir * 3 + Math.round(Math.cos(ang) * reach);
    const cy = pys - 7 + Math.round(Math.sin(ang) * reach);
    drawNet(ctx, hx, hy, cx, cy);
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
