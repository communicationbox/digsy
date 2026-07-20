/* Splash = schermo titolo E menu pausa (ESC): Riprendi / Salva / Carica / Nuova / Musica */
import { drawHero } from './sprites.js';
import { S, load, save, slotInfo, saveToSlot, loadFromSlot, newGame, SLOTS } from './state.js';
import { audioOpts, setMusicOn, setVolume, setSfxOn, setSfxVolume, startAudio } from './audio.js';
import { tr, LANG, setLang, LANGS, isTouch } from './i18n.js';
import { getPrefs, pref, setPref } from './prefs.js';
import { commandHelp } from './commands.js';
import { withIcons } from './icons.js';
import { VERSION } from './version.js';
import { ACHS, isAchieved, achLabel, achDesc } from './achievements.js';
import { CHANGELOG } from './changelog.js';
import { drawTrophy } from './trophy.js';
import { gameStats } from './stats.js';
import { battitoAcceso, accendiBattito } from './beat.js';

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
/* `known`: il server ha già risposto a "chi sono?". Finché è false non si sa se si è
   collegati, e il pulsante non deve affermare né una cosa né l'altra. */
export const acc = { user: null, known: false, conflict: null, localSum: '', remoteSum: '', msg: '', mod: null };

/* SI PUÒ INSTALLARE — ma nessuno lo sa se non glielo si dice.
 *
 * Una PWA è invisibile: chi apre il gioco vede una scheda del browser come tutte le altre, e
 * l'invito di sistema ("Installa app") è nascosto in un menu che nessuno apre. Chi si mette
 * l'icona sulla schermata torna a giocare il giorno dopo; chi deve ricordarsi un indirizzo,
 * no — e per una prova coi beta tester questa è la differenza fra sapere se il gioco piace e
 * non saperlo.
 *
 * Il browser avvisa quando l'installazione è possibile (`beforeinstallprompt`): si mette da
 * parte quell'avviso e lo si usa quando il giocatore tocca il nostro pulsante.
 * iPhone non ha quell'evento: là si può solo SPIEGARE come si fa (Condividi → Aggiungi a
 * Home), e solo da Safari. */
export const pwa = { invito: null, installata: false, ios: false, iosAltroBrowser: false };

if (typeof window !== 'undefined') {
  /* già in esecuzione come app? allora non si propone niente */
  pwa.installata = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true;
  /* iPhone e iPad. Su iOS l'installazione la sa fare SOLO Safari — ma escludere gli altri
     browser dal pulsante voleva dire che chi usa Chrome non vedeva niente e non sapeva
     nemmeno che il gioco si potesse installare. Meglio mostrarglielo e spiegargli che serve
     Safari: un'istruzione in più è meglio di una possibilità nascosta.
     `MacIntel` con lo schermo touch è un iPad recente, che si dichiara Macintosh. */
  const ua = navigator.userAgent || '';
  pwa.ios = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  pwa.iosAltroBrowser = pwa.ios && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();                 // niente banner automatico: lo si offre quando SERVE
    pwa.invito = e;
    if (on) buildMenu(inGameMode);      // il menu è a schermo: ora può mostrare il pulsante
  });
  addEventListener('appinstalled', () => { pwa.installata = true; pwa.invito = null; });
}
/* c'è qualcosa da proporre? */
export function pwaProponibile() {
  return !pwa.installata && (!!pwa.invito || pwa.ios);
}
let gsiLoading = null;

/* Chiede al server chi siamo e ridisegna il menu. Si fa all'AVVIO, non quando si apre il
   pannello: il pulsante deve poter dire com'è messo prima che uno ci clicchi sopra. */
let probing = null;
export function probeAccount() {
  if (!cloudEnabled() || acc.known || probing) return probing || Promise.resolve(null);
  probing = (async () => {
    try {
      if (!acc.mod) acc.mod = await import('./account.js');
      acc.user = await acc.mod.refreshMe();
    } catch (e) { acc.user = null; }        // senza rete resta "non collegato", e va bene
    acc.known = true;
    if (on) buildMenu(inGameMode);          // il menu è già a schermo: si aggiorna da sé
    return acc.user;
  })();
  return probing;
}

export function accountStatus() { return acc.mod ? acc.mod.statusLabel() : ''; }

/* Il nome e l'indirizzo dell'account Google sono testo scritto da qualcun altro: finivano in
   `innerHTML` così com'erano. Il danno possibile è piccolo (sono i propri dati, e il cookie
   di sessione è httpOnly), ma mettere testo altrui dentro del markup senza ripulirlo è una
   cosa che non si fa e basta. */
function esc(t) {
  return String(t).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* SOVRASCRIVERE UNO SLOT PIENO CHIEDE CONFERMA.
 *
 * "Carica" la conferma ce l'aveva già; "Salva" — che è quello che DISTRUGGE — no: un tocco
 * di troppo e una partita spariva senza un avviso. È successo davvero, su una partita vera.
 * Su uno slot VUOTO non si chiede niente: non c'è nulla da perdere, e un attrito inutile
 * insegna solo a premere due volte senza leggere.
 *
 * Sta qui, fuori dal gestore del clic, perché una regola che protegge dalla perdita di dati
 * dev'essere verificabile da un test senza passare per un pulsante.
 */
export function slotNeedsConfirm(n) { return !!slotInfo(n); }
/* La conferma dice COSA sta per sparire — "Sicuro?" non aiuta chi ha tre slot simili.
   Il testo tradotto resta una chiave FISSA: il numero si concatena fuori da `tr`, altrimenti
   la chiave cambia a ogni giorno di gioco e la traduzione non si trova più. */
export function slotConfirmLabel(n) {
  const d = slotInfo(n);
  if (!d) return tr('Salva', 'Save');
  return tr('Sovrascrivi', 'Overwrite') + ' ' + tr('g', 'd') + (d.day || 1) + '?';
}

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

/* Perché l'accesso non è riuscito, detto in modo che si capisca chi deve fare cosa.
   Quasi tutte queste cause sono di configurazione, cioè dell'autore: al giocatore va detto
   che non è colpa sua e che non deve riprovare all'infinito. */
export function signInError(code) {
  switch (code) {
    case 'wrong_audience':
    case 'origin_mismatch':
      /* L'ORIGINE VA MOSTRATA. Google rifiuta l'accesso quando l'indirizzo da cui si è aperto
         il gioco non è fra quelli autorizzati, ma non dice QUALE fosse — e uno passa mezz'ora
         a controllare una configurazione giusta mentre stava semplicemente su un'altra porta.
         Scritta qui, la si confronta con la Console in due secondi. */
      return tr('Questo indirizzo non è autorizzato da Google: ', 'This address is not authorised with Google: ')
        + (typeof location !== 'undefined' ? location.origin : '?')
        + tr('. È una configurazione da sistemare, non dipende da te.', '. That is a setup problem, not something you did.');
    case 'unverified':
      return tr('Google non ha confermato l\'accesso. Riprova.', 'Google did not confirm the sign-in. Try again.');
    case 'not_logged':
    case 'offline':
      return tr('Nessuna rete: la partita resta salvata su questo dispositivo.',
        'No connection: your game stays saved on this device.');
    default:
      return tr('Accesso non riuscito', 'Sign-in failed') + (code ? ' (' + code + ')' : '');
  }
}

export async function openAccount() {
  if (!acc.mod) { try { acc.mod = await import('./account.js'); } catch (e) { return; } }
  acc.mod.wireSync();                    // idempotente: aggancia il salvataggio al server
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
        /* Senza credenziale non c'è stato nessun accesso: Google ha rifiutato PRIMA, di
           solito perché l'origine non è autorizzata. Chiamare il server con `undefined`
           darebbe "unverified", che manda a cercare il guasto dalla parte sbagliata. */
        if (!resp || !resp.credential) { acc.msg = signInError('origin_mismatch'); buildMenu(inGameMode); return; }
        const r = await acc.mod.signIn(resp.credential);
        /* "non riuscito" e basta non aiuta nessuno: si dice COSA è andato storto, perché le
           cause sono diverse e una sola dipende dal giocatore (la rete). */
        if (!r.ok) { acc.msg = signInError(r.error); buildMenu(inGameMode); return; }
        acc.user = r.user;
        /* la riconciliazione l'ha già fatta signIn: qui si dice solo COSA è successo, perché
           nessuno deve restare a chiedersi quale delle due partite sta giocando */
        acc.msg = r.msg || '';
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
    h += `<div class="sp-title2">💾 ${tr('Salvataggi', 'Saves')}</div><div id="sp-slots">`;
    for (let n = 1; n <= SLOTS; n++) {
      const d = slotInfo(n);
      const info = d ? `${tr('Giorno', 'Day')} ${d.day} · 🪙 ${d.coins}<br><small>${d.savedAt ? new Date(d.savedAt).toLocaleString('it-IT') : ''}</small>` : '<small>— ' + tr('vuoto', 'empty') + ' —</small>';
      h += `<div class="sp-slot"><span>Slot ${n} · ${info}</span><span class="sp-slotbtns">` +
        (inGame ? `<button class="sp-btn small" data-save="${n}">${tr('Salva', 'Save')}</button>` : '') +
        (d ? `<button class="sp-btn small" data-n="${n}">${tr('Carica', 'Load')}</button>` : '') +
        `</span></div>`;
    }
    h += `</div>`;
    /* Dove vivono questi salvataggi: chi è collegato deve sapere che se li ritrova ovunque,
       e chi non lo è deve sapere che restano su QUESTO dispositivo — prima non lo diceva
       nessuno e ci si contava sopra sbagliando. */
    if (cloudEnabled()) {
      h += `<div class="sp-note">${acc.user
        ? tr('Questi salvataggi sono anche sul server: li ritrovi su ogni dispositivo.',
          'These games are on the server too: you will find them on every device.')
        : tr('Questi salvataggi restano su questo dispositivo. Entra con Google per ritrovarli ovunque.',
          'These games stay on this device. Sign in with Google to find them anywhere.')}</div>`;
    }
    /* LE STATISTICHE HANNO UNA SCHERMATA LORO, raggiunta da qui.
       Messe in fondo a questa, dodici righe schiacciavano i tre slot fino a farli sparire:
       `#sp-slots` sta in un contenitore flessibile e con troppa roba sotto si riduce a
       niente. Una schermata dovrebbe rispondere a una domanda sola — qui "dove salvo?", di
       là "come sto andando?". */
    if (S && S.started) h += `<button class="sp-btn" id="sp-stats-btn">📊 ${tr('Statistiche', 'Stats')}</button>`;
    if (hasSave) h += `<button class="sp-btn danger" id="sp-new">🌱 ${tr('Nuova partita', 'New game')}</button>`;
    h += backBar();
  } else if (view === 'install') {
    h += closeX();
    h += `<div class="sp-title2">🏠 ${tr('Installa Digsy', 'Install Digsy')}</div>`;
    h += `<div class="sp-cfg"><div class="sp-grp">`;
    h += `<div class="sp-hint2">${tr('Con l\'icona sulla schermata il gioco si apre a tutto schermo e funziona <b>anche senza rete</b>: il mondo e il salvataggio stanno nel tuo dispositivo.', 'With the icon on your home screen the game opens full-screen and works <b>even offline</b>: the world and your save live on your device.')}</div>`;
    if (pwa.ios) {
      /* iOS non ha l'invito automatico: si può solo spiegare. E se si sta usando Chrome (o
         un altro browser), il primo passo è aprire il gioco in Safari — su iPhone è l'unico
         che sa installare, per una regola di Apple, non per una mancanza del gioco. */
      if (pwa.iosAltroBrowser) {
        h += `<div class="sp-hint2"><b>${tr('Su iPhone serve Safari.', 'On iPhone you need Safari.')}</b> `
          + tr('È una regola di Apple: gli altri browser non possono installare. Apri <b>digsy.dev-box.it</b> in Safari e torna qui.',
            'It is an Apple rule: other browsers cannot install. Open <b>digsy.dev-box.it</b> in Safari and come back here.') + `</div>`;
      }
      h += `<div class="sp-hint2">${pwa.iosAltroBrowser ? tr('Poi, in Safari:', 'Then, in Safari:') + '<br>' : ''}`
        + `1. ${tr('tocca <b>Condividi</b> in basso', 'tap <b>Share</b> at the bottom')}<br>`
        + `2. ${tr('scorri e tocca <b>Aggiungi a Home</b>', 'scroll and tap <b>Add to Home Screen</b>')}<br>`
        + `3. ${tr('conferma con <b>Aggiungi</b>', 'confirm with <b>Add</b>')}</div>`;
    } else if (pwa.invito) {
      h += `<button class="sp-btn primary" id="sp-install-go">🏠 ${tr('Installa adesso', 'Install now')}</button>`;
    } else {
      /* niente invito e non è iOS: o è già installata, o il browser non sa farlo. In ogni
         caso si spiega, invece di lasciare una schermata vuota. */
      h += `<div class="sp-hint2">${pwa.installata
        ? tr('Il gioco è già installato su questo dispositivo.', 'The game is already installed on this device.')
        : tr('Cerca <b>Installa</b> o <b>Aggiungi a schermata Home</b> nel menu del browser (i tre puntini in alto).',
          'Look for <b>Install</b> or <b>Add to Home screen</b> in your browser menu (the three dots at the top).')}</div>`;
    }
    h += `</div></div>` + backBar();
  } else if (view === 'stats') {
    h += closeX();
    h += `<div class="sp-title2">📊 ${tr('La tua partita', 'Your game')}</div>`;
    h += `<div class="sp-stats">` + gameStats(S).map(r =>
      `<div class="sp-stat"><span class="sp-stat-l">${r.icon} ${r.label}</span><b>${r.value}</b></div>`).join('') + `</div>`;
    h += backBar();
  } else if (view === 'settings') {
    /* IMPOSTAZIONI — rifatte.
     *
     * Com'erano: una colonna stretta con, sotto ogni voce, un paragrafo di spiegazione lungo
     * tre righe. Il risultato era una pagina altissima in cui gli ultimi comandi finivano
     * fuori dallo schermo (su mobile "Aggiorna il gioco" non si raggiungeva), mentre su
     * desktop restavano vuoti due terzi della larghezza.
     *
     * Adesso: SCHEDE, una per argomento, in una griglia che si adatta da sola — una colonna
     * sul telefono, due o tre sul computer, senza media query scritte a mano. Le spiegazioni
     * lunghe sono sparite: resta una riga sola, e solo dove serve davvero capire cosa cambia
     * (le modalità dei comandi). Audio e Lingua stanno QUI dentro invece di aprire due
     * sottopagine: erano due schermate per quattro interruttori.
     */
    h += closeX();
    h += `<div class="sp-title2">⚙️ ${tr('Impostazioni', 'Settings')}</div>`;
    const pf = getPrefs();
    const a = audioOpts();
    /* Niente riquadri: nel resto del gioco non ce ne sono, e cinque scatole incolonnate
       pesavano più di quello che contenevano. Un titoletto e una riga sottile bastano a
       separare gli argomenti. La riga si disegna PRIMA del gruppo e mai sopra il primo. */
    let primo = true;
    const grp = (titolo, dentro) => {
      const hr = primo ? '' : '<hr class="sp-sep">';
      primo = false;
      return `${hr}<div class="sp-grp"><h4>${titolo}</h4>${dentro}</div>`;
    };
    const riga = (etichetta, controllo) => `<div class="sp-row"><span>${etichetta}</span>${controllo}</div>`;
    /* `sp-sw`: larghezza fissa, così ON e OFF non ballano e le righe restano incolonnate */
    const sw = (id, acceso) => `<button class="sp-btn small sp-sw${acceso ? ' primary' : ''}" id="${id}">${acceso ? 'ON' : 'OFF'}</button>`;
    const seg = (attr, voci, scelto) => `<div class="sp-seg">` + voci.map(([id, lb]) =>
      `<button class="sp-btn small${scelto === id ? ' primary' : ''}" ${attr}="${id}">${lb}</button>`).join('') + `</div>`;

    h += `<div class="sp-cfg">`;

    /* COMANDI: le opzioni cambiano col DISPOSITIVO — le leve non esistono con un mouse, il
       segui-puntatore non esiste con un dito, e la mano conta solo dove ci sono comandi a
       schermo da spostare. */
    if (isTouch()) {
      h += grp('🚶 ' + tr('Comandi', 'Controls'),
        seg('data-touch', [
          ['joystick', tr('Leva fissa', 'Fixed stick')],
          ['float', tr('Leva sotto il dito', 'Stick under finger')],
          ['tap', tr('Tocca dove andare', 'Tap to move')],
        ], pf.touch)
        + `<div class="sp-hint2">${
          pf.touch === 'float' ? tr('La leva nasce dove appoggi il dito.', 'The stick appears where you put your finger.')
            : pf.touch === 'tap' ? tr('Tocchi un punto e Digsy ci cammina.', 'Tap a spot and Digsy walks there.')
              : tr('La leva resta sempre nello stesso angolo.', 'The stick stays in the same corner.')}</div>`
        + riga(tr('Mano', 'Hand'), seg('data-hand', [
          ['right', tr('Destra', 'Right')], ['left', tr('Sinistra', 'Left')],
        ], pf.hand || 'right')));
    } else {
      h += grp('🎯 ' + tr('Comandi', 'Controls'),
        seg('data-mouse', [
          ['tap', tr('Clicca dove andare', 'Click to move')],
          ['follow', tr('Segui il puntatore', 'Follow the pointer')],
          ['keys', tr('Solo tastiera', 'Keyboard only')],
        ], pf.mouse || 'tap')
        + `<div class="sp-hint2">${
          pf.mouse === 'follow' ? tr('Tieni premuto e Digsy va verso il puntatore.', 'Hold the button and Digsy walks towards the pointer.')
            : pf.mouse === 'keys' ? tr('Ci si muove con WASD o le frecce.', 'You move with WASD or the arrow keys.')
              : tr('Clicchi un punto e Digsy ci cammina.', 'Click a spot and Digsy walks there.')}</div>`
        + `<div class="sp-hint2">${tr('Il tasto destro fa quello che fa <kbd>E</kbd>.', 'The right mouse button does what <kbd>E</kbd> does.')}</div>`);
    }

    /* SCHERMO: le due cose che si vedono mentre si gioca */
    /* IL BATTITO si spegne da qui. Raccogliere quanto si gioca è utile a chi il gioco lo fa
       provare, ma dev'essere una cosa che si può dire di no — e che si legge in chiaro,
       non nascosta in fondo a una pagina di condizioni. */
    h += grp('📊 ' + tr('Statistiche anonime', 'Anonymous stats'),
      riga(tr('Manda come sta andando', 'Send how it is going'), sw('sp-beat', battitoAcceso()))
      + `<div class="sp-hint2">${tr('Quanto hai giocato e a che giorno sei arrivato, per capire dove il gioco annoia. <b>Niente</b> che dica chi sei: nessun nome, nessuna email, nessun indirizzo.', 'How long you played and how far you got, to see where the game drags. <b>Nothing</b> that says who you are: no name, no email, no address.')}</div>`);

    h += grp('✨ ' + tr('A schermo', 'On screen'),
      riga(tr('Segnalino della meta', 'Destination marker'), sw('sp-marker', pf.marker))
      + riga(tr('Suggerimenti', 'Tips'), sw('sp-tips', pf.tips))
      + `<div class="sp-hint2">${tr('I riquadri che spiegano una meccanica la prima volta. Restano nella Guida (zaino → ❔).', 'The boxes explaining a mechanic the first time. They stay in the Guide (bag → ❔).')}</div>`);

    /* AUDIO: qui dentro, non in una pagina sua — erano due schermate per quattro comandi */
    /* il cursore PRIMA dell'interruttore: così gli ON/OFF cadono tutti sulla stessa colonna
       a destra, in ogni gruppo. Con l'ordine inverso quelli dell'audio restavano indietro di
       un centinaio di pixel e la colonna sembrava rotta. */
    h += grp('🎵 Audio',
      riga(tr('Musica', 'Music'),
        `<input id="sp-vol" type="range" min="0" max="100" value="${Math.round(a.vol * 100)}" title="${tr('Volume musica', 'Music volume')}">`
        + sw('sp-mus', a.music))
      + riga(tr('Effetti', 'Sound FX'),
        `<input id="sp-sfxvol" type="range" min="0" max="100" value="${Math.round(a.sfxVol * 100)}" title="${tr('Volume effetti', 'SFX volume')}">`
        + sw('sp-sfx', a.sfx)));

    /* LINGUA: i nomi sono già nella loro lingua, non serve spiegare nulla */
    h += grp('🌍 ' + tr('Lingua', 'Language'),
      seg('data-lang', LANGS.map(l => [l.id, l.label]), LANG));

    /* AGGIORNAMENTO. Stava nei Credits, dove nessuno lo cerca: sul telefono non esiste il
       "ricarica senza cache" e si gioca per giorni a una versione superata. La versione è
       scritta sul pulsante: è la prima cosa da chiedere a un tester che segnala un bug già
       corretto. */
    h += grp('💾 ' + tr('Versione', 'Version'),
      riga(tr('Installa sul dispositivo', 'Install on device'),
        `<button class="sp-btn small" id="sp-install">🏠 ${pwa.installata ? tr('Fatto', 'Done') : tr('Come', 'How')}</button>`)
      + riga(tr('Aggiorna il gioco', 'Update the game'),
        `<button class="sp-btn small" id="sp-refresh">⟳ ${VERSION}</button>`)
      + `<div class="sp-hint2">${tr('Riscarica il gioco. Il salvataggio resta dov\'è.', 'Downloads the game again. Your save stays where it is.')}</div>`);

    h += `</div>` + backBar();
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
      h += `<p class="sp-acc-who">${esc(acc.user.email || acc.user.name || '')}</p>`;
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
    /* Che fine fanno i dati: sta QUI, accanto al pulsante di accesso, non sepolto nei
       crediti. Chi sta per entrare con Google deve poterlo leggere PRIMA, non dopo.
       Google lo pretende per tenere l'applicazione pubblicata, ma vale a prescindere. */
    h += `<p class="sp-acc-note"><a href="privacy.html" target="_blank" rel="noopener">${tr('Che fine fanno i tuoi dati', 'What happens to your data')}</a></p>`;
    h += `</div>` + backBar();
  } else {
    h += `<button class="sp-btn primary" id="sp-continue">${inGame ? '▶ ' + tr('Riprendi', 'Resume') : hasSave ? '▶ ' + tr('Continua', 'Continue') : '🌱 ' + tr('Nuova partita', 'New game')}</button>`;
    /* L'ACCESSO SI VEDE SUBITO, MA NON SBARRA LA STRADA.
       Stava in fondo al menu, indistinguibile da Audio e Lingua: nessuno lo trovava e si
       giocava per giorni senza sapere che la partita si può portare sul telefono. Metterlo
       come muro davanti al gioco però sarebbe peggio — questo è un gioco tranquillo, la
       prima cosa che si vede non può essere «identificati», e senza account funziona tutto.
       Quindi: appena sotto Gioca, con scritto COSA fa, e si ignora con un clic. */
    /* IL PULSANTE DICE GIÀ COME STAI MESSO, senza doverci entrare per scoprirlo: chiedere
       "Entra con Google" a chi è già entrato è una bugia, e obbligare ad aprire un pannello
       per sapere se si è collegati è lavoro scaricato sul giocatore.
       Tre stati, uno per riga:
         collegato    → l'indirizzo con cui sei entrato
         scollegato   → l'invito a entrare
         non si sa    → mentre si chiede al server (un attimo all'avvio)
       Nessuna classe speciale e nessun sottotitolo: è un pulsante come gli altri, e non c'è
       ragione perché sia più grande — l'importanza gliela dà la posizione, non la taglia. */
    if (cloudEnabled()) {
      const et = acc.user
        ? esc(acc.user.email || acc.user.name || tr('Collegato', 'Signed in'))
        : acc.known
          ? tr('Entra con Google', 'Sign in with Google')
          : tr('La tua partita', 'Your game');
      h += `<button class="sp-btn" id="sp-account">☁️ ${et}</button>`;
    }
    /* L'INVITO A INSTALLARE sta qui, sotto Gioca: si vede, e sparisce da solo una volta
       installato. Non è un banner che compare da sé — quelli si chiudono per riflesso. */
    if (pwaProponibile()) {
      h += `<button class="sp-btn" id="sp-install">🏠 ${tr('Installa Digsy', 'Install Digsy')}</button>`;
    }
    h += `<button class="sp-btn" id="sp-saves">💾 ${tr('Salvataggi', 'Saves')}</button>`;
    h += `<button class="sp-btn" id="sp-settings">⚙️ ${tr('Impostazioni', 'Settings')}</button>`;
    /* riga secondaria: pulsanti meno importanti, SOLO icone (peso gerarchico minore) */
    h += `<div class="sp-iconrow">`;
    h += `<button class="sp-btn ic" id="sp-troph" title="${tr('Trofei', 'Trophies')}">🏆</button>`;
    h += `<button class="sp-btn ic" id="sp-log" title="${tr('Novità', "What's new")}">📝</button>`;
    /* NIENTE VOCE "COMANDI" NEL MENU. La console (`money`, `godmode`, `goto=…`) è uno
       strumento dell'autore per provare il gioco, non una funzione da offrire: un elenco di
       cheat in bella vista invita a usarli, e una partita con le monete infinite non racconta
       più niente su come il gioco è bilanciato. Resta raggiungibile con il tasto ` per chi
       sa che c'è; la sua schermata (view 'commands') è ancora nel codice ma non ha più
       nessun pulsante che la apra. */
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
  const bIn = document.getElementById('sp-install'); if (bIn) bIn.onclick = () => go('install');
  const bIg = document.getElementById('sp-install-go');
  if (bIg) bIg.onclick = async () => {
    if (!pwa.invito) return;
    pwa.invito.prompt();                       // l'invito del browser: si può usare UNA volta
    try { await pwa.invito.userChoice; } catch (e) { /* ha chiuso: pazienza */ }
    pwa.invito = null;
    buildMenu(inGameMode);
  };
  const bBe = document.getElementById('sp-beat');
  if (bBe) bBe.onclick = () => { accendiBattito(!battitoAcceso()); buildMenu(inGameMode); };
  const bSt = document.getElementById('sp-stats-btn'); if (bSt) bSt.onclick = () => go('stats');
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
    const n = parseInt(b.dataset.save, 10);
    const scrivi = () => {
      const r = saveToSlot(n);
      if (r === true) { buildMenu(inGame); return; }
      /* sotto cheat il salvataggio è congelato, negli slot compresi: dirlo, non fingere */
      b.textContent = r === 'cheat'
        ? tr('Cheat attivi: scrivi `vanilla`', 'Cheats on: type `vanilla`')
        : tr('Spazio esaurito!', 'Storage full!');
      setTimeout(() => buildMenu(inGame), 2200);
    };
    if (!slotNeedsConfirm(n)) { scrivi(); return; }
    arm(b, slotConfirmLabel(n), scrivi);
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
  probeAccount();          // anche il menu di pausa dice subito se sei collegato
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
  probeAccount();          // il pulsante dell'account dirà da solo se sei già collegato
}

/* ☰ nell'HUD apre il menu pausa */
document.getElementById('menubtn').onclick = () => showSplash();
