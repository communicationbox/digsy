/* Splash = schermo titolo E menu pausa (ESC): Riprendi / Salva / Carica / Nuova / Musica */
import { drawHero } from './sprites.js';
import { load, save, slotInfo, saveToSlot, loadFromSlot, newGame, SLOTS } from './state.js';
import { audioOpts, setMusicOn, setVolume, setSfxOn, setSfxVolume, startAudio } from './audio.js';
import { tr, LANG, setLang, LANGS, isTouch } from './i18n.js';
import { getPrefs, pref, setPref } from './prefs.js';
import { commandHelp } from './commands.js';
import { withIcons } from './icons.js';
import { VERSION } from './version.js';
import { ACHS, isAchieved, achLabel, achDesc } from './achievements.js';
import { CHANGELOG } from './changelog.js';
import { drawTrophy } from './trophy.js';

/* Il ritrovo dei giocatori. Sta qui e non sparso nei testi: un invito Discord si rinnova o
   si cambia, e deve esserci un posto solo da aggiornare. */
export const DISCORD_URL = 'https://discord.gg/BpZNuVnVz';

/* ---------- ACCOUNT (partita su più dispositivi) ----------
   Tutto quello che riguarda l'accesso vive qui dentro e si carica SOLO quando si apre la
   schermata: lo script di Google è l'unica dipendenza esterna del gioco, e chi non usa
   l'account non deve pagarne il costo all'avvio. */
/* Il salvataggio in cloud è acceso? Si guarda l'interruttore in index.html, che si può
   cambiare direttamente sul server senza ricostruire il gioco. */
export function cloudEnabled() {
  return typeof window !== 'undefined' && window.DIGSY_CLOUD === true;
}
export const acc = { user: null, conflict: null, localSum: '', remoteSum: '', msg: '', mod: null };
let gsiLoading = null;

export function accountStatus() { return acc.mod ? acc.mod.statusLabel() : ''; }

/* carica lo script di Google una volta sola, e solo se serve */
function loadGoogle() {
  if (typeof document === 'undefined') return Promise.resolve(false);
  if (window.google && window.google.accounts) return Promise.resolve(true);
  if (gsiLoading) return gsiLoading;
  gsiLoading = new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'https://accounts.google.com/gsi/client';
    sc.async = true; sc.defer = true;
    sc.onload = () => res(true);
    sc.onerror = () => res(false);       // senza rete o con Google bloccato: si dice e basta
    document.head.appendChild(sc);
  });
  return gsiLoading;
}

export async function openAccount() {
  if (!acc.mod) { try { acc.mod = await import('./account.js'); } catch (e) { return; } }
  const me = await acc.mod.refreshMe();
  acc.user = me;
  buildMenu(inGameMode);
  if (me) return;
  const ok = await loadGoogle();
  if (!ok || !window.google || !window.google.accounts) {
    acc.msg = tr('Google non raggiungibile. Riprova più tardi.', 'Google is unreachable. Try again later.');
    buildMenu(inGameMode); return;
  }
  const holder = document.getElementById('sp-gbtn'); if (!holder) return;
  try {
    window.google.accounts.id.initialize({
      client_id: (window.DIGSY_GOOGLE_CLIENT_ID || ''),
      callback: async (resp) => {
        const r = await acc.mod.signIn(resp.credential);
        if (!r.ok) { acc.msg = tr('Accesso non riuscito', 'Sign-in failed'); buildMenu(inGameMode); return; }
        acc.user = r.user;
        /* la partita locale non si tocca senza chiedere: 'ask' apre la scelta */
        if (r.action === 'pull') acc.mod.applyRemote(r.remote);
        else if (r.action === 'push') await acc.mod.keepLocal();
        else if (r.action === 'ask') {
          acc.conflict = r.remote;
          acc.localSum = acc.mod.saveSummary(S);
          try { acc.remoteSum = acc.mod.saveSummary(JSON.parse(r.remote.data)); } catch (e) { acc.remoteSum = '?'; }
        }
        buildMenu(inGameMode);
      },
    });
    window.google.accounts.id.renderButton(holder, { theme: 'filled_black', size: 'large', text: 'signin_with' });
  } catch (e) {
    acc.msg = tr('Accesso non disponibile', 'Sign-in unavailable');
    buildMenu(inGameMode);
  }
}

/* i pulsanti della schermata: si ricollegano a ogni ridisegno del menu */
export function wireAccountButtons(redraw) {
  const kl = document.getElementById('sp-keeplocal');
  if (kl) kl.onclick = async () => { await acc.mod.keepLocal(); acc.conflict = null; redraw(); };
  const kr = document.getElementById('sp-keepremote');
  if (kr) kr.onclick = () => { acc.mod.applyRemote(acc.conflict); };
  const so = document.getElementById('sp-signout');
  if (so) so.onclick = async () => { await acc.mod.signOut(); acc.user = null; redraw(); };
  const da = document.getElementById('sp-delacc');
  if (da) da.onclick = async () => {
    /* cancella l'account, NON la partita su questo dispositivo: chi se ne va non deve
       ritrovarsi il gioco azzerato */
    if (!confirm(tr('Cancello account e partite salvate sul server? La partita su questo dispositivo resta.',
      'Delete your account and the games saved on the server? The game on this device stays.'))) return;
    await acc.mod.removeAccount(); acc.user = null; redraw();
  };
}

let on = true, pause = false, onPlayCb = null, animOn = false;
let view = 'main', inGameMode = false; // sottomenu: main | saves | audio | lang
export function splashActive() { return on; }
/* usata dalle pagine di prova per aprire un sottomenu e verificarne l'uscita */
export function setView(v) { view = v; buildMenu(inGameMode); }

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

/* SCORCIATOIE da tastiera mostrate nel menu (solo desktop). NIENTE cheat: sono per sviluppatori. */
const SHORTCUTS = [
  ['WASD / ←↑→↓', 'muoviti', 'move'],
  ['E', 'scava · interagisci · entra', 'dig · interact · enter'],
  ['I / Z', 'zaino', 'bag'],
  ['L', 'libro dei fossili', 'fossil book'],
  ['Q', 'missioni', 'missions'],
  ['ESC', 'menu · indietro', 'menu · back'],
];
/* menu del titolo/pausa con sottomenu: main → Partite / Audio */
/* Nei sottomenu l'unica via d'uscita è la X in alto (closeX): un solo comando, sempre visibile,
   fuori dall'area che scorre. Il vecchio pulsante "Indietro" in fondo faceva doppione e su
   mobile finiva sotto il bordo dello schermo. */
function backBar() { return ''; }
/* la X sta IN ALTO, fuori dall'area che scorre: da lì si esce sempre */
function closeX() { return `<button class="sp-x" id="sp-x" aria-label="chiudi">✕</button>`; }
function buildMenu(inGame) {
  inGameMode = inGame;
  const hasSave = inGame || !!load();
  const menu = document.getElementById('sp-menu');
  let h = '';
  if (view === 'saves') {
    h += closeX();
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
    h += backBar();
  } else if (view === 'audio') {
    h += closeX();
    const a = audioOpts();
    h += `<div class="sp-title2">🎵 Audio</div>`;
    h += `<div class="sp-set"><span>${tr('Musica', 'Music')}</span><button class="sp-btn small" id="sp-mus">${a.music ? 'ON' : 'OFF'}</button>
      <input id="sp-vol" type="range" min="0" max="100" value="${Math.round(a.vol * 100)}" title="${tr('Volume musica', 'Music volume')}"></div>`;
    h += `<div class="sp-set"><span>${tr('Effetti', 'Sound FX')}</span><button class="sp-btn small" id="sp-sfx">${a.sfx ? 'ON' : 'OFF'}</button>
      <input id="sp-sfxvol" type="range" min="0" max="100" value="${Math.round(a.sfxVol * 100)}" title="${tr('Volume effetti', 'SFX volume')}"></div>`;
    h += backBar();
  } else if (view === 'settings') {
    h += closeX();
    h += `<div class="sp-title2">⚙️ ${tr('Impostazioni', 'Settings')}</div>`;
    const pf = getPrefs();
    /* SUGGERIMENTI: alla seconda partita non si vogliono rivedere tutti da capo */
    h += `<div class="sp-set"><span>${tr('Suggerimenti', 'Tips')}</span>
      <button class="sp-btn small" id="sp-tips">${pf.tips ? 'ON' : 'OFF'}</button></div>`;
    h += `<div class="sp-note">${tr('I riquadri che spiegano una meccanica la prima volta che la incontri. Restano sempre nella Guida (zaino → ❔).', 'The boxes explaining a mechanic the first time you meet it. They always stay in the Guide (bag → ❔).')}</div>`;
    /* CONTROLLI: joystick, tocca dove andare, o entrambi */
    /* le opzioni cambiano col DISPOSITIVO: le leve non esistono con un mouse, il
       segui-puntatore non esiste con un dito, e la mano conta solo dove ci sono comandi
       a schermo da spostare. */
    if (isTouch()) {
      h += `<div class="sp-set"><span>${tr('Comandi a schermo', 'On-screen controls')}</span></div>`;
      h += `<div class="sp-seg">` + [
        ['joystick', tr('Leva fissa', 'Fixed stick')],
        ['float', tr('Leva sotto il dito', 'Stick under finger')],
        ['tap', tr('Tocca dove andare', 'Tap to move')],
      ].map(([id, lb]) => `<button class="sp-btn small${pf.touch === id ? ' primary' : ''}" data-touch="${id}">${lb}</button>`).join('') + `</div>`;
      h += `<div class="sp-note">${
        pf.touch === 'float'
          ? tr('La leva <b>nasce dove appoggi il dito</b> e non occupa un angolo dello schermo: trascina per guidare Digsy. Un tocco <b>senza trascinare</b> lo manda dove hai toccato.', 'The stick <b>appears where you put your finger</b> instead of sitting in a corner: drag to steer Digsy. A tap <b>without dragging</b> sends him where you tapped.')
          : pf.touch === 'tap'
            ? tr('Tocchi un punto della mappa e Digsy ci cammina, aggirando gli ostacoli. Tocca una porta per entrarci.', 'Tap a spot and Digsy walks there, going around obstacles. Tap a door to go in.')
            : tr('La leva resta in un angolo dello schermo, sempre nello stesso posto.', 'The stick stays in a corner of the screen, always in the same place.')
      }</div>`;
      h += `<div class="sp-set"><span>${tr('Mano', 'Hand')}</span></div>`;
      h += `<div class="sp-seg">` + [
        ['right', tr('Destro', 'Right-handed')],
        ['left', tr('Mancino', 'Left-handed')],
      ].map(([id, lb]) => `<button class="sp-btn small${(pf.hand || 'right') === id ? ' primary' : ''}" data-hand="${id}">${lb}</button>`).join('') + `</div>`;
      h += `<div class="sp-note">${tr('Sposta il tasto <b>A</b> (e la leva fissa) dalla parte opposta.', 'Moves the <b>A</b> button (and the fixed stick) to the other side.')}</div>`;
    } else {
      h += `<div class="sp-set"><span>${tr('Mouse', 'Mouse')}</span></div>`;
      h += `<div class="sp-seg">` + [
        ['tap', tr('Clicca dove andare', 'Click to move')],
        ['follow', tr('Segui il puntatore', 'Follow the pointer')],
        ['keys', tr('Solo tastiera', 'Keyboard only')],
      ].map(([id, lb]) => `<button class="sp-btn small${(pf.mouse || 'tap') === id ? ' primary' : ''}" data-mouse="${id}">${lb}</button>`).join('') + `</div>`;
      h += `<div class="sp-note">${
        pf.mouse === 'follow'
          ? tr('<b>Tieni premuto</b> il tasto del mouse e Digsy va verso il puntatore, finché non lo rilasci. WASD funziona sempre.', '<b>Hold</b> the mouse button and Digsy walks towards the pointer until you let go. WASD always works.')
          : pf.mouse === 'keys'
            ? tr('Ci si muove solo con WASD o le frecce: il mouse serve alle finestre.', 'You move only with WASD or the arrow keys: the mouse is for windows.')
            : tr('Clicchi un punto della mappa e Digsy ci cammina, aggirando gli ostacoli. Clicca una porta per entrarci.', 'Click a spot and Digsy walks there, going around obstacles. Click a door to go in.')
      }</div>`;
      h += `<div class="sp-note">${tr('In ogni modalità il <b>tasto destro</b> fa quello che fa <kbd>E</kbd>: scava, entra, parla. Così si gioca senza toccare la tastiera.', 'In every mode the <b>right mouse button</b> does what <kbd>E</kbd> does: dig, enter, talk. That way you can play without touching the keyboard.')
      }</div>`;
    }
    h += `<div class="sp-set"><span>${tr('Segnalino della meta', 'Destination marker')}</span>
      <button class="sp-btn small" id="sp-marker">${pf.marker ? 'ON' : 'OFF'}</button></div>`;
    /* AGGIORNAMENTO FORZATO. Stava nascosto nei Credits, dove nessuno lo cerca: chi resta
       su una versione vecchia non va a leggere i ringraziamenti, va nelle Impostazioni.
       Serve perché sul telefono non esiste il "ricarica senza cache" e capita di giocare
       per giorni a una versione superata senza accorgersene.
       La versione è scritta accanto: è la prima cosa da chiedere a un tester che segnala
       un bug già corretto. */
    h += `<div class="sp-set" style="margin-top:16px"><span>${tr('Aggiorna il gioco', 'Update the game')}</span>
      <button class="sp-btn small" id="sp-refresh">⟳ ${VERSION}</button></div>`;
    h += `<div class="sp-note">${tr('Scarica di nuovo l\'ultima versione del gioco. Il salvataggio resta dov\'è.', 'Downloads the latest version of the game again. Your save stays where it is.')}</div>`;
    h += backBar();
  } else if (view === 'lang') {
    h += closeX();
    h += `<div class="sp-title2">🌍 ${tr('Lingua', 'Language')}</div>`;
    /* un bottone per lingua, generati da LANGS: aggiungerne una non tocca più questo file */
    h += LANGS.map(l => `<button class="sp-btn${LANG === l.id ? ' primary' : ''}" data-lang="${l.id}">${l.label}${LANG === l.id ? ' ✓' : ''}</button>`).join('');
    h += backBar();
  } else if (view === 'trophies') {
    h += closeX();
    const done = ACHS.filter(a => isAchieved(a.id)).length;
    h += `<div class="sp-title2">🏆 ${tr('Sala dei Trofei', 'Hall of Fame')} — ${done}/${ACHS.length}</div>`;
    h += `<div class="sp-hall">`;
    const PER = 3;
    for (let i = 0; i < ACHS.length; i += PER) {
      const row = ACHS.slice(i, i + PER);
      h += `<div class="sp-shelf"><div class="cups">` + row.map((a, j) => {
        const ok = isAchieved(a.id), gi = i + j;
        return `<div class="cup${ok ? ' won' : ''}" title="${ok ? achDesc(a) : tr('Bloccato', 'Locked')}"><canvas class="cupcv" width="44" height="52" data-i="${gi}" data-won="${ok ? 1 : 0}"></canvas><span class="cupname">${ok ? achLabel(a) : '???'}</span></div>`;
      }).join('') + `</div><div class="plank"></div></div>`;
    }
    h += `</div>` + backBar();
  } else if (view === 'changelog') {
    h += closeX();
    h += `<div class="sp-title2">📝 ${tr('Novità', "What's new")}</div><div class="sp-log">`;
    for (const c of CHANGELOG) h += `<div class="sp-logv"><b>${c.v}</b><ul>` + tr(c.it, c.en).map(l => `<li>${l}</li>`).join('') + `</ul></div>`;
    h += `</div>` + backBar();
  } else if (view === 'commands') {
    h += closeX();
    h += `<div class="sp-title2">📜 ${tr('Comandi', 'Controls')}</div>`;
    h += `<div class="sp-keys">`;
    for (const c of SHORTCUTS) h += `<div class="sp-keyrow"><kbd>${c[0]}</kbd><span>${tr(c[1], c[2])}</span></div>`;
    h += `</div>`;
    /* CONSOLE: chi cerca "come faccio a…" apre questa pagina, non la console. Prima i
       comandi si scoprivano solo scrivendo `help` dentro la console stessa — cioè
       sapendo già che esisteva. */
    h += `<div class="sp-title3">${tr('Console', 'Console')} <kbd>\\</kbd></div>`;
    h += `<div class="sp-note" style="max-width:none"><kbd>\\</kbd> ${tr('apre la console: scrivi un comando e invio. Servono a provare il gioco: attivano i «cheat» e il salvataggio resta congelato finché non scrivi <b>vanilla</b>.', 'opens the console: type a command and hit enter. They are for testing: they turn on cheats and saving stays frozen until you type <b>vanilla</b>.')}</div>`;
    h += `<div class="sp-cmds">` + commandHelp().map(t => {
      const i = t.indexOf('—');
      const name = i > 0 ? t.slice(0, i).trim() : t;
      const desc = i > 0 ? t.slice(i + 1).trim() : '';
      return `<div class="sp-cmdrow"><code>${name}</code><span>${desc}</span></div>`;
    }).join('') + `</div>`;
    h += backBar();
  } else if (view === 'credits') {
    h += closeX();
    h += `<div class="sp-title2">ℹ️ Credits</div><div class="sp-log sp-credits">`;
    h += `<p><b>Digsy World</b></p>`;
    h += `<p>${tr('un cozy game di scavo e scoperta.', 'a cozy game of digging and discovery.')}</p>`;
    h += `<p>${tr('di', 'by')} <b>Marco Giacobazzi</b></p>`;
    h += `<p style="opacity:.7">${VERSION}</p>`;
    h += `</div>` + backBar();
  } else if (view === 'account') {
    /* LA PARTITA SU PIÙ DISPOSITIVI. Il testo dice cosa succede DAVVERO: chi entra si aspetta
       di ritrovare la partita, e va detto prima che il salvataggio viaggia su un server. */
    h += closeX();
    h += `<div class="sp-title2">☁️ ${tr('La tua partita', 'Your game')}</div>`;
    h += `<div class="sp-acc">`;
    if (acc.user) {
      h += `<p class="sp-acc-who">${acc.user.email || acc.user.name || ''}</p>`;
      h += `<p class="sp-acc-st">${accountStatus()}</p>`;
      if (acc.conflict) {
        /* DUE PARTITE DIVERSE: non si sceglie per lui. Si mostrano le due con quello che
           riconosce (giorno, monete, reperti) e decide. */
        h += `<p class="sp-acc-warn">${tr('Su questo dispositivo e sul server ci sono due partite diverse. Quale tieni?', 'This device and the server have two different games. Which one do you keep?')}</p>`;
        h += `<button class="sp-btn" id="sp-keeplocal">${tr('questa', 'this one')} · ${acc.localSum}</button>`;
        h += `<button class="sp-btn" id="sp-keepremote">${tr('quella salvata', 'the saved one')} · ${acc.remoteSum}</button>`;
      } else {
        h += `<button class="sp-btn" id="sp-signout">${tr('Esci dall\'account', 'Sign out')}</button>`;
        h += `<button class="sp-btn danger" id="sp-delacc">${tr('Cancella account e partite', 'Delete account and games')}</button>`;
      }
    } else {
      h += `<p class="sp-acc-st">${tr('Entra e ritrovi la stessa partita sul telefono e sul computer. Il salvataggio viene copiato su digsy.dev-box.it.', 'Sign in and find the same game on your phone and computer. Your save is copied to digsy.dev-box.it.')}</p>`;
      h += `<div id="sp-gbtn"></div>`;
      h += `<p class="sp-acc-note" id="sp-accmsg">${acc.msg || ''}</p>`;
    }
    h += `</div>` + backBar();
  } else {
    h += `<button class="sp-btn primary" id="sp-continue">${inGame ? '▶ ' + tr('Riprendi', 'Resume') : hasSave ? '▶ ' + tr('Continua', 'Continue') : '🌱 ' + tr('Nuova partita', 'New game')}</button>`;
    h += `<button class="sp-btn" id="sp-saves">💾 ${tr('Partite', 'Games')}</button>`;
    h += `<button class="sp-btn" id="sp-audio">🎵 Audio</button>`;
    h += `<button class="sp-btn" id="sp-lang">🌍 ${tr('Lingua', 'Language')}</button>`;
    /* la voce compare solo col salvataggio in cloud acceso (window.DIGSY_CLOUD): vedi
       index.html — senza database sul server l'accesso fallirebbe e basta */
    if (cloudEnabled()) h += `<button class="sp-btn" id="sp-account">☁️ ${tr('La tua partita', 'Your game')}</button>`;
    h += `<button class="sp-btn" id="sp-settings">⚙️ ${tr('Impostazioni', 'Settings')}</button>`;
    /* riga secondaria: pulsanti meno importanti, SOLO icone (peso gerarchico minore) */
    h += `<div class="sp-iconrow">`;
    h += `<button class="sp-btn ic" id="sp-troph" title="${tr('Trofei', 'Trophies')}">🏆</button>`;
    h += `<button class="sp-btn ic" id="sp-log" title="${tr('Novità', "What's new")}">📝</button>`;
    h += `<button class="sp-btn ic" id="sp-cmds" title="${tr('Comandi', 'Commands')}">📜</button>`;
    h += `<button class="sp-btn ic" id="sp-credits" title="Credits">ℹ️</button>`;
    /* Discord: si apre in una scheda nuova, mai al posto del gioco — una partita in corso
       non deve sparire perché si è toccata un'icona. `noopener` è d'obbligo sui link
       esterni: senza, la pagina aperta può manovrare quella che l'ha aperta. */
    h += `<a class="sp-btn ic" id="sp-discord" href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer" title="Discord">💬</a>`;
    h += `</div>`;
  }
  menu.innerHTML = withIcons(h);
  const card = document.querySelector ? document.querySelector('.sp-card') : null; if (card && card.classList) card.classList.toggle('wide', view === 'trophies' || view === 'changelog' || view === 'commands' || view === 'credits');
  if (view === 'trophies' && menu.querySelectorAll) menu.querySelectorAll('.cupcv').forEach(cv => drawTrophy(cv, +cv.dataset.i, cv.dataset.won === '1'));

  const go = (v) => { view = v; buildMenu(inGame); };
  const bC = document.getElementById('sp-continue'); if (bC) bC.onclick = () => dismiss();
  const bS = document.getElementById('sp-saves'); if (bS) bS.onclick = () => go('saves');
  const bT = document.getElementById('sp-troph'); if (bT) bT.onclick = () => go('trophies');
  const bLg = document.getElementById('sp-log'); if (bLg) bLg.onclick = () => go('changelog');
  const bCm = document.getElementById('sp-cmds'); if (bCm) bCm.onclick = () => go('commands');
  const bCr = document.getElementById('sp-credits'); if (bCr) bCr.onclick = () => go('credits');
  const bA = document.getElementById('sp-audio'); if (bA) bA.onclick = () => go('audio');
  const bL = document.getElementById('sp-lang'); if (bL) bL.onclick = () => go('lang');
  const bSet = document.getElementById('sp-settings'); if (bSet) bSet.onclick = () => go('settings');
  const bAcc = document.getElementById('sp-account'); if (bAcc) bAcc.onclick = () => { go('account'); openAccount(); };
  wireAccountButtons(() => buildMenu(inGameMode));
  const bTips = document.getElementById('sp-tips');
  if (bTips) bTips.onclick = () => { setPref('tips', !pref('tips')); buildMenu(inGameMode); };
  const bMark = document.getElementById('sp-marker');
  if (bMark) bMark.onclick = () => { setPref('marker', !pref('marker')); buildMenu(inGameMode); };
  const setBox = document.querySelector('.sp-card');
  if (setBox && setBox.querySelectorAll) setBox.querySelectorAll('[data-mouse]').forEach(b => {
    b.onclick = () => { setPref('mouse', b.dataset.mouse); buildMenu(inGameMode); };
  });
  if (setBox && setBox.querySelectorAll) setBox.querySelectorAll('[data-hand]').forEach(b => {
    b.onclick = () => {
      setPref('hand', b.dataset.hand);
      import('./ui.js').then(u => u.syncTouchControls());
      buildMenu(inGameMode);
    };
  });
  if (setBox && setBox.querySelectorAll) setBox.querySelectorAll('[data-touch]').forEach(b => {
    b.onclick = () => {
      setPref('touch', b.dataset.touch);
      import('./ui.js').then(u => u.syncTouchControls());   // la leva compare/sparisce subito
      buildMenu(inGameMode);
    };
  });
  const rf = document.getElementById('sp-refresh');
  if (rf) rf.onclick = () => { rf.textContent = '…'; hardRefresh(); };
  const langBox = document.querySelector('.sp-card');
  if (langBox && langBox.querySelectorAll) langBox.querySelectorAll('[data-lang]').forEach(b => { b.onclick = () => setLang(b.dataset.lang); });
  const bB = document.getElementById('sp-back'); if (bB) bB.onclick = () => go('main');
  const bX = document.getElementById('sp-x'); if (bX) bX.onclick = () => go('main');   // via d'uscita sempre in alto
  menu.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
    const r = saveToSlot(parseInt(b.dataset.save, 10));
    if (r === true) { buildMenu(inGame); return; }
    /* sotto cheat il salvataggio è congelato, negli slot compresi: dirlo, non fingere */
    b.textContent = r === 'cheat'
      ? tr('Cheat attivi: scrivi `vanilla`', 'Cheats on: type `vanilla`')
      : tr('Spazio esaurito!', 'Storage full!');
    setTimeout(() => buildMenu(inGame), 2200);
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

/* AGGIORNAMENTO FORZATO — solo per i betatester.
   Su un telefono non esiste il ricarica-senza-cache (niente Ctrl+Shift+R): capita di restare
   su una versione vecchia senza accorgersene. Questo bottoncino svuota le cache del browser
   e ricarica con un parametro nuovo, così l'HTML non può arrivare dalla cache.
   NON tocca il salvataggio: sta in localStorage, che qui non viene mai sfiorato.
   Quando i test finiscono si toglie: una riga qui, una in index.html, una nel CSS. */
export async function hardRefresh() {
  try {
    if (typeof caches !== 'undefined' && caches.keys) {
      const ks = await caches.keys();
      await Promise.all(ks.map(k => caches.delete(k)));
    }
    if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      const rs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rs.map(r => r.unregister()));
    }
  } catch (e) { /* cache non disponibile: si ricarica lo stesso */ }
  const u = new URL(location.href);
  u.searchParams.set('v', String(Date.now()));   // URL nuovo = niente HTML dalla cache
  location.replace(u.toString());
}

export function initSplash(onPlay) {
  onPlayCb = onPlay;
  const ve = document.getElementById('sp-ver'); if (ve) ve.textContent = VERSION;

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
