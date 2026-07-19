/* PARTITA IN CLOUD — il lato gioco dell'accesso Google e della sincronizzazione.
 *
 * Modulo PURO nella parte che conta: tutto passa da `fetch`, che è iniettabile. Così i casi
 * che contano davvero — non c'è rete, la sessione è scaduta, un altro dispositivo ha
 * salvato — si provano nei test invece di scoprirli con la partita di un giocatore.
 *
 * Tre idee, e la terza è quella che salva le partite:
 *
 * 1. IL GIOCO NON ASPETTA MAI IL SERVER. Si continua a salvare in locale come sempre; il
 *    cloud è una copia che parte per conto suo. Se la rete manca, non succede niente di
 *    visibile: si riprova più tardi.
 * 2. NON SI SINCRONIZZA A OGNI SALVATAGGIO. Il gioco salva ogni 5 secondi: mandarli tutti
 *    sarebbe una richiesta ogni 5 secondi per giocatore, per niente. Si aspetta una pausa
 *    (`SYNC_DEBOUNCE`) e si manda l'ultimo stato.
 * 3. IL CONFLITTO NON SI RISOLVE DA SOLO. Se il server è più avanti, la scrittura viene
 *    rifiutata e si CHIEDE al giocatore quale partita tenere. Un merge non è possibile (lo
 *    stato è monolitico, non un elenco di eventi) e "vince l'ultimo che scrive" vorrebbe
 *    dire cancellare in silenzio mezz'ora giocata sull'altro dispositivo.
 */

const API = './api';
export const SYNC_DEBOUNCE = 4000;    // ms di quiete prima di mandare
const TIMEOUT = 12000;

/* stato del collegamento, leggibile da chi disegna l'interfaccia */
export const cloud = {
  user: null,          // { email, name } quando si è collegati
  version: 0,          // versione del salvataggio che il gioco ha in mano
  status: 'off',       // off · syncing · ok · offline · conflict · error
  lastError: '',
  pending: false,      // c'è un salvataggio da mandare
  conflict: null,      // { server, local } quando serve la scelta del giocatore
};

/* fetch iniettabile: i test passano il loro */
let doFetch = (...a) => (typeof fetch === 'function' ? fetch(...a) : Promise.reject(new Error('no fetch')));
export function setFetch(fn) { doFetch = fn; }

async function api(path, opts = {}) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl && typeof setTimeout === 'function' ? setTimeout(() => ctl.abort(), TIMEOUT) : null;
  try {
    const res = await doFetch(API + path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',        // il cookie di sessione viaggia con la richiesta
      signal: ctl ? ctl.signal : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  } catch (e) {
    /* rete assente, richiesta annullata, server irraggiungibile: per il gioco è tutto
       "offline". Non è un errore da mostrare: si riproverà. */
    return { status: 0, ok: false, offline: true, data: {} };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ---------- accesso ---------- */

/* chi è collegato? Da chiamare all'avvio: se la sessione è ancora valida non si chiede
   niente al giocatore. */
export async function fetchMe() {
  const r = await api('/auth.php?do=me');
  if (r.offline) { cloud.status = 'offline'; return null; }
  cloud.user = (r.data && r.data.user) || null;
  cloud.status = cloud.user ? 'ok' : 'off';
  return cloud.user;
}

/* il token arriva dal pulsante Google; il server lo verifica (qui non ci si fida di nulla) */
export async function loginWithGoogle(credential) {
  const r = await api('/auth.php?do=google', { method: 'POST', body: { credential } });
  if (r.offline) { cloud.status = 'offline'; cloud.lastError = 'offline'; return null; }
  if (!r.ok) {
    cloud.status = 'error';
    cloud.lastError = (r.data && r.data.error) || 'login_failed';
    return null;
  }
  cloud.user = r.data.user || null;
  cloud.status = 'ok';
  cloud.version = 0;      // ancora non si sa cosa c'è sul server: lo dirà il primo pull
  return cloud.user;
}

export async function logout() {
  await api('/auth.php?do=logout', { method: 'POST' });
  cloud.user = null; cloud.version = 0; cloud.status = 'off'; cloud.conflict = null;
}

export async function deleteAccount() {
  const r = await api('/auth.php?do=delete', { method: 'POST' });
  if (r.ok) { cloud.user = null; cloud.version = 0; cloud.status = 'off'; }
  return !!r.ok;
}

/* ---------- partita ---------- */

/* Scarica la partita dal server. Non la applica: decidere se sovrascrivere quella locale è
   una scelta che spetta a chi chiama (e a volte al giocatore). */
export async function pullSave() {
  const r = await api('/save.php');
  if (r.offline) { cloud.status = 'offline'; return null; }
  if (r.status === 401) { cloud.user = null; cloud.status = 'off'; return null; }
  const save = (r.data && r.data.save) || null;
  if (save) cloud.version = save.version;
  return save;
}

/* Manda la partita. `force` solo dopo una scelta esplicita del giocatore. */
export async function pushSave(json, summary, device, force = false) {
  if (!cloud.user) return { ok: false, error: 'not_logged' };
  cloud.status = 'syncing';
  const r = await api('/save.php', {
    method: 'POST',
    body: { data: json, summary, device, base_version: cloud.version, force: !!force },
  });
  if (r.offline) { cloud.status = 'offline'; cloud.pending = true; return { ok: false, offline: true }; }
  if (r.status === 401) { cloud.user = null; cloud.status = 'off'; return { ok: false, error: 'not_logged' }; }
  if (r.status === 409) {
    /* QUI si decide se un giocatore perde mezz'ora di gioco: non si tocca niente, si
       registra il conflitto e si aspetta la sua risposta */
    cloud.status = 'conflict';
    cloud.conflict = { server: r.data.server || null };
    return { ok: false, conflict: true, server: r.data.server || null };
  }
  if (!r.ok) {
    cloud.status = 'error';
    cloud.lastError = (r.data && r.data.error) || 'save_failed';
    return { ok: false, error: cloud.lastError };
  }
  cloud.version = r.data.version || cloud.version + 1;
  cloud.status = 'ok';
  cloud.pending = false;
  cloud.conflict = null;
  return { ok: true, version: cloud.version };
}

/* ---------- ritmo della sincronizzazione ---------- */

let timer = null, lastPayload = null;

/* Chiede di sincronizzare, ma non subito: il gioco salva ogni 5 secondi e mandarli tutti
   sarebbe traffico per niente. Si manda l'ULTIMO stato dopo una pausa. */
export function scheduleSync(getPayload, delay = SYNC_DEBOUNCE) {
  if (!cloud.user) return false;
  lastPayload = getPayload;
  cloud.pending = true;
  if (timer) return true;                       // già in coda: si manderà lo stato più fresco
  timer = setTimeout(async () => {
    timer = null;
    const p = lastPayload && lastPayload();
    if (!p) return;
    await pushSave(p.json, p.summary, p.device);
  }, delay);
  return true;
}

/* manda subito quello che c'è in coda (uscita dal gioco, ritorno della rete) */
export async function flushSync() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!cloud.user || !lastPayload) return { ok: false, error: 'nothing' };
  const p = lastPayload();
  if (!p) return { ok: false, error: 'nothing' };
  return pushSave(p.json, p.summary, p.device);
}

export function cancelSync() { if (timer) { clearTimeout(timer); timer = null; } cloud.pending = false; }

/* ---------- descrizione leggibile di una partita ---------- */

/* Serve alla schermata del conflitto: due partite vanno confrontate con quello che il
   giocatore riconosce — giorno, monete, reperti — non con un numero di versione. */
export function describeSave(state) {
  if (!state) return '';
  const day = state.day || 1;
  const coins = state.coins || 0;
  const finds = (state.items || []).length + (state.raw || []).length;
  return `g${day} · ${coins}c · ${finds}r`;
}

/* Qual è la partita più avanti? Non decide da sola: dà solo l'informazione a chi chiede al
   giocatore. Il giorno è il criterio più leggibile, le monete spareggiano. */
export function compareSaves(a, b) {
  const da = (a && a.day) || 0, db = (b && b.day) || 0;
  if (da !== db) return da > db ? 1 : -1;
  const ca = (a && a.coins) || 0, cb = (b && b.coins) || 0;
  if (ca !== cb) return ca > cb ? 1 : -1;
  return 0;
}

/* nome del dispositivo, per far capire QUALE partita è quale nella schermata di scelta */
export function deviceName() {
  if (typeof navigator === 'undefined') return 'dispositivo';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone/iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'dispositivo';
}
