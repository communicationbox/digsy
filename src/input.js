/* Input: tastiera (WASD/frecce, E/spazio, I, Esc) + touch (d-pad, tasto A) */
import { isModalOpen, closeModal, openBag, openBook, closeBook, isBookOpen, bookFlip, toast, updateHUD } from './ui.js';
import { act } from './gameplay.js';
import { splashActive, showSplash, resumeSplash } from './splash.js';
import { toggleDebug } from './debug.js';
import { INT, exitInterior } from './interior.js';

export const keys = {};
const KM = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };

addEventListener('keydown', e => {
  if (splashActive()) {
    if (e.key === 'Escape') { resumeSplash(); e.preventDefault(); } // ESC di nuovo: riprendi
    return;
  }
  /* Ctrl+Shift+D: modalità debug (energia/monete infinite, libro completo, velocità ×3) */
  if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
    const on = toggleDebug();
    toast(on ? '🐞 DEBUG ON — ∞ energia/monete · libro completo · velocità ×3' : '🐞 Debug OFF');
    updateHUD(); e.preventDefault(); return;
  }
  if (isBookOpen() && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { bookFlip(e.key === 'ArrowLeft' ? -1 : 1); e.preventDefault(); return; }
  if (KM[e.key]) { keys[KM[e.key]] = true; e.preventDefault(); }
  if ((e.key === 'e' || e.key === 'E' || e.key === ' ') && !isModalOpen()) { act(); e.preventDefault(); }
  if ((e.key === 'i' || e.key === 'I') && !isModalOpen()) { openBag(); e.preventDefault(); }
  if ((e.key === 'l' || e.key === 'L') && !isModalOpen()) { openBook(); e.preventDefault(); }
  if (e.key === 'Escape') { if (isBookOpen()) closeBook(); else if (isModalOpen()) closeModal(); else if (INT.active) exitInterior(); else showSplash(); e.preventDefault(); }
});
addEventListener('keyup', e => { if (KM[e.key]) { keys[KM[e.key]] = false; e.preventDefault(); } });

document.querySelectorAll('.db').forEach(b => {
  const d = b.dataset.dir;
  const on = e => { e.preventDefault(); keys[d] = true; };
  const off = e => { e.preventDefault(); keys[d] = false; };
  b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off); b.addEventListener('touchcancel', off);
  b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
});
const ab = document.getElementById('abtn');
ab.addEventListener('touchstart', e => { e.preventDefault(); if (!isModalOpen() && !splashActive()) act(); }, { passive: false });
ab.addEventListener('click', () => { if (!isModalOpen() && !splashActive()) act(); });
