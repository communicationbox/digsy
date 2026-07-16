/* Splash = schermo titolo E menu pausa (ESC): Riprendi / Salva / Carica / Nuova / Musica */
import { drawHero } from './sprites.js';
import { load, save, slotInfo, saveToSlot, loadFromSlot, newGame, SLOTS } from './state.js';
import { audioOpts, setMusicOn, setVolume, setSfxOn, setSfxVolume, startAudio } from './audio.js';
import { tr, LANG, setLang } from './i18n.js';
import { withIcons } from './icons.js';

let on = true, pause = false, onPlayCb = null, animOn = false;
let view = 'main', inGameMode = false; // sottomenu: main | saves | audio | lang
export function splashActive() { return on; }

/* in dev: salta la splash SOLO sui reload innescati da Vite (modifiche ai file) */
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeFullReload', () => {
    try { sessionStorage.setItem('digsy_skipsplash', '1'); } catch (e) { /* ok */ }
  });
}

const sp = () => document.getElementById('splash');
function reloadInto() { try { sessionStorage.setItem('digsy_skipsplash', '1'); } catch (e) { /* ok */ } location.reload(); }
function arm(btn, label, fn) {
  if (btn.dataset.armed) { fn(); return; }
  btn.dataset.armed = '1'; btn.dataset.orig = btn.textContent; btn.textContent = label;
  setTimeout(() => { if (btn.isConnected) { btn.dataset.armed = ''; btn.textContent = btn.dataset.orig; } }, 2500);
}
function dismiss() {
  on = false; pause = false;
  sp().classList.add('off');
  startAudio(); // gesto utente: qui può partire la musica
  if (onPlayCb) { const cb = onPlayCb; onPlayCb = null; cb(); }
}
/* ESC dalla splash: nei sottomenu torna indietro, dal principale riprende (se in pausa) */
export function resumeSplash() {
  if (!on) return;
  if (view !== 'main') { view = 'main'; buildMenu(inGameMode); return; }
  if (pause) dismiss();
}

function startAnim() {
  if (animOn) return; animOn = true;
  const dc = document.getElementById('sp-digsy');
  const c2 = dc.getContext('2d'); c2.imageSmoothingEnabled = false;
  (function anim(ts) {
    if (!on) { animOn = false; return; }
    c2.clearRect(0, 0, 20, 18);
    drawHero(c2, 2, 1, 'right', Math.floor((ts || 0) / 180) % 2);
    requestAnimationFrame(anim);
  })(0);
}

/* menu del titolo/pausa con sottomenu: main → Partite / Audio */
function buildMenu(inGame) {
  inGameMode = inGame;
  const hasSave = inGame || !!load();
  const menu = document.getElementById('sp-menu');
  let h = '';
  if (view === 'saves') {
    h += `<div class="sp-title2">💾 ${tr('Partite', 'Games')}</div><div id="sp-slots">`;
    for (let n = 1; n <= SLOTS; n++) {
      const d = slotInfo(n);
      const info = d ? `${tr('Giorno', 'Day')} ${d.day} · 🪙 ${d.coins}<br><small>${d.savedAt ? new Date(d.savedAt).toLocaleString('it-IT') : ''}</small>` : '<small>— ' + tr('vuoto', 'empty') + ' —</small>';
      h += `<div class="sp-slot"><span>Slot ${n} · ${info}</span><span class="sp-slotbtns">` +
        (inGame ? `<button class="sp-btn small" data-save="${n}">${tr('Salva', 'Save')}</button>` : '') +
        (d ? `<button class="sp-btn small" data-n="${n}">${tr('Carica', 'Load')}</button>` : '') +
        `</span></div>`;
    }
    h += `</div>`;
    if (hasSave) h += `<button class="sp-btn danger" id="sp-new">🌱 ${tr('Nuova partita', 'New game')}</button>`;
    h += `<button class="sp-btn small" id="sp-back">← ${tr('Indietro', 'Back')}</button>`;
  } else if (view === 'audio') {
    const a = audioOpts();
    h += `<div class="sp-title2">🎵 Audio</div>`;
    h += `<div class="sp-set"><span>${tr('Musica', 'Music')}</span><button class="sp-btn small" id="sp-mus">${a.music ? 'ON' : 'OFF'}</button>
      <input id="sp-vol" type="range" min="0" max="100" value="${Math.round(a.vol * 100)}" title="${tr('Volume musica', 'Music volume')}"></div>`;
    h += `<div class="sp-set"><span>${tr('Effetti', 'Sound FX')}</span><button class="sp-btn small" id="sp-sfx">${a.sfx ? 'ON' : 'OFF'}</button>
      <input id="sp-sfxvol" type="range" min="0" max="100" value="${Math.round(a.sfxVol * 100)}" title="${tr('Volume effetti', 'SFX volume')}"></div>`;
    h += `<button class="sp-btn small" id="sp-back">← ${tr('Indietro', 'Back')}</button>`;
  } else if (view === 'lang') {
    h += `<div class="sp-title2">🌍 ${tr('Lingua', 'Language')}</div>`;
    h += `<button class="sp-btn${LANG === 'en' ? ' primary' : ''}" id="sp-en">English${LANG === 'en' ? ' ✓' : ''}</button>`;
    h += `<button class="sp-btn${LANG === 'it' ? ' primary' : ''}" id="sp-it">Italiano${LANG === 'it' ? ' ✓' : ''}</button>`;
    h += `<button class="sp-btn small" id="sp-back">← ${tr('Indietro', 'Back')}</button>`;
  } else {
    h += `<button class="sp-btn primary" id="sp-continue">${inGame ? '▶ ' + tr('Riprendi', 'Resume') : hasSave ? '▶ ' + tr('Continua', 'Continue') : '▶ ' + tr('Gioca', 'Play')}</button>`;
    h += `<button class="sp-btn" id="sp-saves">💾 ${tr('Partite', 'Games')}</button>`;
    h += `<button class="sp-btn" id="sp-audio">🎵 Audio</button>`;
    h += `<button class="sp-btn" id="sp-lang">🌍 ${tr('Lingua', 'Language')}</button>`;
  }
  menu.innerHTML = withIcons(h);

  const go = (v) => { view = v; buildMenu(inGame); };
  const bC = document.getElementById('sp-continue'); if (bC) bC.onclick = () => dismiss();
  const bS = document.getElementById('sp-saves'); if (bS) bS.onclick = () => go('saves');
  const bA = document.getElementById('sp-audio'); if (bA) bA.onclick = () => go('audio');
  const bL = document.getElementById('sp-lang'); if (bL) bL.onclick = () => go('lang');
  const bEn = document.getElementById('sp-en'); if (bEn) bEn.onclick = () => setLang('en');
  const bIt = document.getElementById('sp-it'); if (bIt) bIt.onclick = () => setLang('it');
  const bB = document.getElementById('sp-back'); if (bB) bB.onclick = () => go('main');
  menu.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
    if (saveToSlot(parseInt(b.dataset.save, 10))) buildMenu(inGame);
  });
  menu.querySelectorAll('[data-n]').forEach(b => b.onclick = () =>
    arm(b, tr('Confermi?', 'Confirm?'), () => { if (loadFromSlot(parseInt(b.dataset.n, 10))) reloadInto(); }));
  const nb = document.getElementById('sp-new');
  if (nb) nb.onclick = () => arm(nb, tr('Sicuro?', 'Sure?'), () => { newGame(); reloadInto(); });
  const mus = document.getElementById('sp-mus');
  if (mus) mus.onclick = () => { setMusicOn(!audioOpts().music); buildMenu(inGame); };
  const vol = document.getElementById('sp-vol');
  if (vol) vol.oninput = () => setVolume(parseInt(vol.value, 10) / 100);
  const sfx = document.getElementById('sp-sfx');
  if (sfx) sfx.onclick = () => { setSfxOn(!audioOpts().sfx); buildMenu(inGame); };
  const sfv = document.getElementById('sp-sfxvol');
  if (sfv) sfv.oninput = () => setSfxVolume(parseInt(sfv.value, 10) / 100);
}

/* riapri come menu pausa (ESC / ☰ in gioco) */
export function showSplash() {
  if (on && pause) return;
  try { save(); } catch (e) { /* ok */ }
  pause = true; view = 'main';
  if (!on) { on = true; sp().classList.remove('off'); }
  buildMenu(true);
  startAnim();
}

export function initSplash(onPlay) {
  onPlayCb = onPlay;
  /* skip: auto-reload di Vite, dopo Carica/Nuova o ?nosplash; ?splash la forza sempre */
  const params = new URLSearchParams(location.search);
  let skip = params.has('nosplash');
  try { if (sessionStorage.getItem('digsy_skipsplash')) { skip = true; sessionStorage.removeItem('digsy_skipsplash'); } } catch (e) { /* ok */ }
  if (params.has('splash')) skip = false;
  if (skip) { on = false; sp().classList.add('off'); const cb = onPlayCb; onPlayCb = null; cb(); return; }
  view = 'main';
  buildMenu(false);
  startAnim();
}

/* ☰ nell'HUD apre il menu pausa */
document.getElementById('menubtn').onclick = () => showSplash();
