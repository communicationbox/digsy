/* IL BATTITO — dire al server che si sta giocando, e fin dove si è arrivati.
 *
 * Digsy gira tutto nel browser: dopo il caricamento non parla più con nessuno. Per chi fa
 * provare il gioco è il buio completo proprio sulla domanda che conta — DOVE SMETTONO.
 * I tester raccontano volentieri cosa hanno visto; quasi mai sanno dire quanto ci hanno
 * giocato o a che punto hanno smesso, perché nel momento in cui smetti non stai prendendo
 * appunti.
 *
 * Si manda una riga ogni cinque minuti: minuti giocati, giorno raggiunto, livello, specie
 * scoperte, versione. NIENTE che dica chi è la persona — l'identificativo lo genera il gioco
 * a caso e serve a distinguere due sessioni, non a riconoscere qualcuno.
 * Si spegne dalle Impostazioni, e da spento non parte niente.
 */
import { S, isCheatLock } from './state.js';
import { isDebug } from './debug.js';
import { VERSION } from './version.js';
import { getPrefs, setPref } from './prefs.js';
import { isTouch } from './i18n.js';

const CHIAVE = 'digsy_beat_id';
const OGNI = 5 * 60 * 1000;      // cinque minuti: abbastanza per non perdere una sessione corta

/* L'identificativo: casuale, nel dispositivo, senza niente di riconoscibile dentro.
   Cancellando i dati del browser sparisce e si ridiventa uno nuovo — ed è giusto così. */
function mioId() {
  try {
    let id = localStorage.getItem(CHIAVE);
    if (!id) {
      id = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 16);
      localStorage.setItem(CHIAVE, id);
    }
    return id;
  } catch (e) { return null; }        // niente localStorage: si rinuncia, non è importante
}

export function battitoAcceso() {
  const p = getPrefs();
  return p.battito !== false;         // acceso di serie, spegnibile dalle Impostazioni
}
export function accendiBattito(v) { setPref('battito', !!v); }

/* la riga da mandare: solo numeri, nessun testo che possa contenere qualcosa di personale */
export function datiBattito() {
  const s = S || {};
  return {
    id: mioId(),
    min: Math.round((s.playSec || 0) / 60),
    day: s.day || 1,
    lvl: s.level || 1,
    spec: Array.isArray(s.codex) ? s.codex.length : 0,
    ver: VERSION,
    app: (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)
      || (typeof navigator !== 'undefined' && navigator.standalone === true),
    tocco: isTouch(),          // la domanda "è un telefono?" ha già una risposta sola in i18n.js
  };
}

let timer = null;
/* esposta apposta: una regola che decide se mandare o no dei dati dev'essere provabile
   da un test, non solo dal comportamento a runtime */
export async function mandaOra() { return manda(); }
async function manda() {
  if (!battitoAcceso()) return false;
  /* SOTTO HACKS NON SI MANDA NIENTE. Con `godmode` o `goditem` i numeri diventano una
     bugia — nove specie scoperte e ancora livello 1, quaranta minuti di partita che sono
     stati venti di prove — e inquinano proprio i dati per cui il battito esiste.
     Stessa regola del salvataggio, che sotto cheat è congelato. */
  if (isCheatLock() || isDebug()) return false;
  const d = datiBattito();
  if (!d.id) return false;
  /* una partita appena aperta e mai giocata non dice niente a nessuno */
  if (!d.min && (d.day || 1) <= 1) return false;
  try {
    await fetch((typeof window !== 'undefined' && window.DIGSY_API ? window.DIGSY_API : './server/api') + '/beat.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d), keepalive: true,
    });
    return true;
  } catch (e) { return false; }       // senza rete si gioca lo stesso: non è un errore
}

export function avviaBattito() {
  if (timer || typeof setInterval !== 'function') return false;
  timer = setInterval(() => { manda(); }, OGNI);
  /* alla chiusura si manda l'ultimo: è il battito che dice DOVE si è smesso, cioè
     esattamente il dato per cui esiste tutto questo */
  if (typeof addEventListener === 'function') {
    addEventListener('pagehide', () => { manda(); });
  }
  return true;
}
export function fermaBattito() { if (timer) { clearInterval(timer); timer = null; } }
