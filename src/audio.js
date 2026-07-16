/* Musica chiptune procedurale (WebAudio, zero asset) + impostazioni persistenti.
   Lead square + basso triangle, pentatonica minore, tempo rilassato. */
const OKEY = 'digsy_audio';
let opts = { music: true, vol: 0.5, sfx: true, sfxVol: 0.7 };
try { const r = localStorage.getItem(OKEY); if (r) opts = { ...opts, ...JSON.parse(r) }; } catch (e) { /* ok */ }
const persist = () => { try { localStorage.setItem(OKEY, JSON.stringify(opts)); } catch (e) { /* ok */ } };

let actx = null, master = null, timer = 0, step = 0;

/* melodia cozy: 32 ottavi in La pent. minore (null = pausa) */
const LEAD = [9, null, 12, null, 14, null, 12, 9, 7, null, 9, null, 12, null, 9, null,
  4, null, 7, null, 9, null, 7, 4, 2, null, 4, null, 7, null, 4, null];
const BASS = [-15, -15, -17, -17, -20, -20, -19, -17];

export function audioOpts() { return { ...opts }; }
export function setVolume(v) {
  opts.vol = Math.max(0, Math.min(1, v)); persist();
  if (master) master.gain.value = opts.vol * 0.5;
}
export function setMusicOn(onv) {
  opts.music = !!onv; persist();
  if (opts.music) startAudio(); else stopAudio();
}
export function setSfxOn(onv) { opts.sfx = !!onv; persist(); }
export function setSfxVolume(v) { opts.sfxVol = Math.max(0, Math.min(1, v)); persist(); }
/* effetti sonori 8-bit (blip generati): pronti per essere agganciati al gameplay */
const SFX = { click: [880, 0.05, 'square'], dig: [220, 0.09, 'square'], coin: [1320, 0.08, 'square'], found: [660, 0.1, 'triangle'] };
export function playSfx(name) {
  if (!opts.sfx || !actx || !master) return;
  const def = SFX[name] || SFX.click;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = def[2]; o.frequency.value = def[0];
  g.gain.setValueAtTime(opts.sfxVol * 0.25, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + def[1]);
  o.connect(g); g.connect(actx.destination);
  o.start(); o.stop(actx.currentTime + def[1]);
}
function note(semi, dur, type, vol) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = 440 * Math.pow(2, semi / 12);
  g.gain.setValueAtTime(vol, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
  o.connect(g); g.connect(master);
  o.start(); o.stop(actx.currentTime + dur);
}
function tick() {
  if (!actx || !opts.music) return;
  const l = LEAD[step % LEAD.length];
  if (l !== null) note(l - 12, 0.2, 'square', 0.09);
  if (step % 4 === 0) note(BASS[Math.floor(step / 4) % BASS.length], 0.55, 'triangle', 0.15);
  step++;
}
/* va chiamata da un gesto utente (click sulla splash) */
export function startAudio() {
  if (!opts.music) return;
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!actx) { actx = new AC(); master = actx.createGain(); master.gain.value = opts.vol * 0.5; master.connect(actx.destination); }
  if (actx.state === 'suspended') actx.resume();
  if (!timer) timer = setInterval(tick, 210);
}
export function stopAudio() { if (timer) { clearInterval(timer); timer = 0; } }
