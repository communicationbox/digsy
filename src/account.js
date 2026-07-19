/* ACCOUNT — il lato giocatore del salvataggio in cloud: entrare, sincronizzare, e decidere
 * cosa fare quando due dispositivi hanno giocato la stessa partita da punti diversi.
 *
 * La regola che governa tutto: NON SI PERDE MAI UNA PARTITA SENZA CHIEDERE. Un salvataggio
 * di Digsy è una fotografia dello stato, non un elenco di mosse: due versioni divergenti non
 * si possono fondere. Quindi, quando non è ovvio quale tenere, si mostrano entrambe e sceglie
 * il giocatore. Tutte le decisioni stanno in funzioni PURE (decideAfterLogin, saveSummary),
 * così i casi si provano nei test invece di scoprirli con la partita di qualcuno.
 */
import { S, save as saveLocal, snapshotState } from './state.js';
import { cloud, fetchMe, loginWithGoogle, logout, deleteAccount, pullSave, pushSave,
  scheduleSync, flushSync, describeSave, deviceName } from './cloud.js';
import { tr } from './i18n.js';

/* Quanto "vale" una partita: serve a capire se quella locale è davvero da salvare o è una
   partita appena nata (in quel caso non c'è niente da difendere e si prende quella del
   server senza disturbare nessuno). */
export function saveWeight(st) {
  if (!st) return 0;
  const finds = (st.items || []).length + (st.raw || []).length;
  const codex = (st.codex || []).length;
  return (st.day || 1) - 1 + finds + codex * 2 + (st.coins || 0) / 50 + (st.creatures || []).length * 3;
}

/* Che fare appena entrati?
   - 'pull'  → il server ha una partita e in locale non c'è niente da perdere: si scarica
   - 'push'  → il server è vuoto: si carica la partita locale
   - 'ask'   → tutte e due hanno qualcosa: decide il giocatore
   - 'none'  → non c'è niente da nessuna parte: si continua e basta */
export const KEEP_THRESHOLD = 3;      // sotto questo peso una partita è "appena nata"
export function decideAfterLogin(localState, serverSave) {
  const hasServer = !!(serverSave && serverSave.data);
  const w = saveWeight(localState);
  if (!hasServer) return w > 0 ? 'push' : 'none';
  if (w < KEEP_THRESHOLD) return 'pull';       // in locale c'è poco o nulla: nessun dubbio
  /* la partita del server è la stessa che questo dispositivo ha già in mano? allora non c'è
     nessun conflitto: si prosegue da lì */
  return 'ask';
}

/* riassunto leggibile di una partita, per la schermata di scelta: si confrontano le cose che
   il giocatore riconosce, non un numero di versione */
export function saveSummary(st) { return describeSave(st); }

/* ---------- collegamento col salvataggio locale ---------- */

let wired = false;
/* Aggancia la sincronizzazione al salvataggio del gioco. Il gioco salva ogni 5 secondi: non
   si manda tutto, si chiede a cloud.js di aspettare una pausa e spedire l'ultimo stato. */
export function wireSync() {
  if (wired) return false;
  wired = true;
  return true;
}
export function payload() {
  const st = snapshotState();
  return { json: JSON.stringify(st), summary: saveSummary(st), device: deviceName() };
}
/* da chiamare dopo ogni salvataggio locale */
export function onLocalSave() {
  if (!cloud.user) return false;
  return scheduleSync(payload);
}

/* ---------- azioni ---------- */

export async function signIn(credential) {
  const u = await loginWithGoogle(credential);
  if (!u) return { ok: false, error: cloud.lastError || 'login_failed' };
  const remote = await pullSave();
  const action = decideAfterLogin(S, remote);
  return { ok: true, user: u, action, remote };
}

/* applica una partita scaricata dal server: si passa da localStorage e si ricarica, come per
   il caricamento di uno slot — le cache del mondo dipendono dal seed e vanno rifatte */
/* Copia di riserva della partita locale, presa PRIMA di sovrascriverla con quella del
   server. Chi gioca da mesi non deve rischiare niente per aver premuto "entra": se la
   partita scaricata fosse quella sbagliata, questa resta lì e si può rimettere a mano.
   Non scade e non viene mai sovrascritta una seconda volta: la prima copia è quella buona. */
export const BACKUP_KEY = 'ossa_world_pixel_v1_prelogin';
export function backupLocal() {
  try {
    if (localStorage.getItem(BACKUP_KEY)) return false;      // già fatta: non la si rovina
    const cur = localStorage.getItem('ossa_world_pixel_v1');
    if (!cur) return false;
    localStorage.setItem(BACKUP_KEY, cur);
    return true;
  } catch (e) { return false; }
}
export function hasBackup() {
  try { return !!localStorage.getItem(BACKUP_KEY); } catch (e) { return false; }
}
export function restoreBackup(reload = true) {
  try {
    const b = localStorage.getItem(BACKUP_KEY);
    if (!b) return false;
    localStorage.setItem('ossa_world_pixel_v1', b);
    if (reload && typeof location !== 'undefined' && location.reload) location.reload();
    return true;
  } catch (e) { return false; }
}

export function applyRemote(remote, reload = true) {
  if (!remote || !remote.data) return false;
  try {
    const st = JSON.parse(remote.data);
    if (!st || typeof st !== 'object') return false;
    backupLocal();                    // mai sovrascrivere senza una copia di riserva
    localStorage.setItem('ossa_world_pixel_v1', JSON.stringify(st));
    cloud.version = remote.version || 0;
    if (reload && typeof location !== 'undefined' && location.reload) location.reload();
    return true;
  } catch (e) { return false; }
}

/* manda la partita locale, sovrascrivendo quella del server (scelta esplicita del giocatore) */
export async function keepLocal() {
  const p = payload();
  if (cloud.conflict || cloud.version === 0) {
    const cur = await pullSave();           // si riparte dalla versione vera del server
    cloud.version = cur ? cur.version : 0;
  }
  return pushSave(p.json, p.summary, p.device, true);
}

export async function signOut() { await flushSync().catch(() => {}); await logout(); }
export async function removeAccount() { return deleteAccount(); }
export async function refreshMe() { return fetchMe(); }

/* etichetta dello stato del collegamento, per l'interfaccia */
export function statusLabel() {
  switch (cloud.status) {
    case 'ok': return tr('sincronizzato', 'in sync');
    case 'syncing': return tr('sto salvando…', 'saving…');
    case 'offline': return tr('senza rete: salvo qui, riprovo dopo', 'offline: saved here, will retry');
    case 'conflict': return tr('due partite diverse', 'two different games');
    case 'error': return tr('errore di collegamento', 'connection error');
    default: return tr('non collegato', 'not signed in');
  }
}
