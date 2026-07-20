/* ACCOUNT — il lato giocatore del salvataggio in cloud: entrare, sincronizzare, e decidere
 * cosa fare quando due dispositivi hanno giocato la stessa partita da punti diversi.
 *
 * La regola che governa tutto: NON SI PERDE MAI UNA PARTITA SENZA CHIEDERE. Un salvataggio
 * di Digsy è una fotografia dello stato, non un elenco di mosse: due versioni divergenti non
 * si possono fondere. Quindi, quando non è ovvio quale tenere, si mostrano entrambe e sceglie
 * il giocatore. Tutte le decisioni stanno in funzioni PURE (decideAfterLogin, saveSummary),
 * così i casi si provano nei test invece di scoprirli con la partita di qualcuno.
 */
import { S, save as saveLocal, snapshotState, setSaveHook, setSlotSaveHook,
  slotRaw, setSlotRaw, SLOTS } from './state.js';
import { cloud, fetchMe, loginWithGoogle, logout, deleteAccount, pullSave, pushSave,
  scheduleSync, flushSync, describeSave, compareSaves, deviceName, setKickedHandler,
  pullAllSaves } from './cloud.js';
import { tr } from './i18n.js';
import { toast } from './ui.js';

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
   - 'pull'  → si scarica quella del server
   - 'push'  → si carica quella locale
   - 'none'  → non c'è niente da nessuna parte: si continua e basta
 *
 * VINCE LA PARTITA PIÙ AVANTI, e si dice al giocatore cosa è successo. Prima, davanti a due
 * partite diverse, si apriva una scelta ('ask'): corretto sulla carta, ma nella pratica
 * l'interruzione arriva quando uno vuole solo giocare, e la domanda «giorno 12 · 400 monete
 * oppure giorno 9 · 120 monete?» la si legge male e si sbaglia. Il confronto lo sanno fare
 * i numeri: si tiene quella con più progressi e l'altra resta recuperabile (copia di riserva
 * locale prima di ogni sovrascrittura).
 *
 * Il peso non basta per decidere: `compareSaves` guarda giorno e monete, cioè quello che il
 * giocatore riconosce come "più avanti". A parità esatta si tiene quella del server, che è
 * l'unica che anche gli ALTRI dispositivi vedranno. */
export const KEEP_THRESHOLD = 3;      // sotto questo peso una partita è "appena nata"
export function decideAfterLogin(localState, serverSave) {
  const hasServer = !!(serverSave && serverSave.data);
  const w = saveWeight(localState);
  if (!hasServer) return w > 0 ? 'push' : 'none';
  if (w < KEEP_THRESHOLD) return 'pull';       // in locale c'è poco o nulla: nessun dubbio
  let remote = null;
  try { remote = JSON.parse(serverSave.data); } catch (e) { return 'push'; }  // illeggibile: vale la locale
  return compareSaves(localState, remote) > 0 ? 'push' : 'pull';
}
/* Cosa dire al giocatore dopo la riconciliazione: mai lasciarlo a chiedersi quale partita
   stia giocando. */
export function reconcileMessage(action, localState, serverSave) {
  let remote = null;
  try { remote = serverSave && serverSave.data ? JSON.parse(serverSave.data) : null; } catch (e) { /* pazienza */ }
  if (action === 'pull') {
    return tr('Ripresa la partita salvata (', 'Picked up your saved game (') + describeSave(remote) + ')';
  }
  if (action === 'push') {
    return tr('Tenuta la partita di questo dispositivo (', 'Kept this device\'s game (') + describeSave(localState) + ')';
  }
  return '';
}

/* riassunto leggibile di una partita, per la schermata di scelta: si confrontano le cose che
   il giocatore riconosce, non un numero di versione */
export function saveSummary(st) { return describeSave(st); }

/* ---------- i tre salvataggi manuali ----------
 *
 * Gli slot sono partite a tutti gli effetti: chi ne salva una sul computer si aspetta di
 * ritrovarla sul telefono. Viaggiano sullo stesso meccanismo della partita in corso (slot 0),
 * ognuno col SUO numero di versione — sono indipendenti, e un conflitto su uno non deve
 * bloccare gli altri.
 *
 * La regola è la stessa scelta per la partita in corso: vince quella più avanti. Qui però il
 * confronto va fatto slot per slot, perché lo slot 2 del telefono e lo slot 2 del computer
 * possono benissimo essere due partite diverse.
 */
export function decideSlot(localRaw, serverSave) {
  const hasServer = !!(serverSave && serverSave.data);
  if (!localRaw) return hasServer ? 'pull' : 'none';
  if (!hasServer) return 'push';
  let a = null, b = null;
  try { a = JSON.parse(localRaw); } catch (e) { return 'pull'; }   // locale illeggibile: vale il server
  try { b = JSON.parse(serverSave.data); } catch (e) { return 'push'; }
  return compareSaves(a, b) > 0 ? 'push' : 'pull';
}

/* Allinea i tre slot col server. Ritorna cosa è stato fatto, slot per slot, per poterlo dire
   al giocatore e per poterlo provare nei test. */
export async function syncSlots(remoteSaves) {
  const esito = {};
  if (!cloud.user) return esito;
  const saves = remoteSaves || await pullAllSaves();
  if (!saves) return esito;                       // offline: si riproverà al prossimo accesso
  for (let n = 1; n <= SLOTS; n++) {
    const localRaw = slotRaw(n);
    const remote = saves[String(n)] || null;
    const azione = decideSlot(localRaw, remote);
    esito[n] = azione;
    if (azione === 'pull') setSlotRaw(n, remote.data);
    else if (azione === 'push') {
      let st = null;
      try { st = JSON.parse(localRaw); } catch (e) { esito[n] = 'none'; continue; }
      const r = await pushSave(localRaw, describeSave(st), deviceName(), false, n);
      /* conflitto su uno slot: il server è più avanti di quanto credevamo. Non si sovrascrive
         niente — si riprende la sua versione, che è quella che vedono gli altri dispositivi. */
      if (r && r.conflict && r.server && r.server.data) { setSlotRaw(n, r.server.data); esito[n] = 'pull'; }
    }
  }
  return esito;
}
/* manda UNO slot appena salvato dal giocatore */
export async function pushSlot(n) {
  if (!cloud.user) return { ok: false, error: 'not_logged' };
  const raw = slotRaw(n);
  if (!raw) return { ok: false, error: 'empty' };
  let st = null;
  try { st = JSON.parse(raw); } catch (e) { return { ok: false, error: 'not_json' }; }
  let r = await pushSave(raw, describeSave(st), deviceName(), false, n);
  /* Salvare in uno slot è un gesto ESPLICITO: se il server ha un'altra partita lì, vince
     quella appena salvata. È la stessa cosa che il giocatore ha appena chiesto premendo
     "Salva", e la versione precedente resta comunque nel suo slot sull'altro dispositivo. */
  if (r && r.conflict) r = await pushSave(raw, describeSave(st), deviceName(), true, n);
  return r;
}

/* ---------- collegamento col salvataggio locale ---------- */

let wired = false;
/* Aggancia la sincronizzazione al salvataggio del gioco. Il gioco salva ogni 5 secondi: non
   si manda tutto, si chiede a cloud.js di aspettare una pausa e spedire l'ultimo stato.
 *
 * Prima questa funzione non faceva NIENTE (metteva una bandiera e usciva) e nessuno la
 * chiamava: `onLocalSave` non veniva mai eseguita, quindi `scheduleSync` era irraggiungibile
 * e dopo l'accesso i progressi non salivano mai da soli. Si scaricava la partita entrando e
 * poi si giocava per ore senza che il server ne sapesse più nulla — il modo peggiore di
 * fallire, perché sembra tutto a posto. */
export function wireSync() {
  if (wired) return false;
  wired = true;
  setSaveHook(onLocalSave);
  setSlotSaveHook(n => { pushSlot(n).catch(() => { /* riproverà al prossimo accesso */ }); });
  /* scollegati da un altro dispositivo: si continua a giocare, ma si dice che da qui in poi
     la partita resta su questo telefono/computer e non sale più */
  setKickedHandler(() => {
    toast('☁️ ' + tr('Sei entrato da un altro dispositivo: qui la partita resta salvata in locale.',
      'You signed in on another device: here the game stays saved locally.'));
  });
  /* Chiudendo la scheda l'ultimo salvataggio è ancora in attesa dei 4 secondi di quiete:
     `pagehide` è l'unico evento affidabile anche su iOS, dove `beforeunload` spesso non
     scatta e la scheda viene congelata senza preavviso. */
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pagehide', () => { flushSync().catch(() => {}); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { flushSync().catch(() => {}); return; }
      /* TORNANDO IN PRIMO PIANO SI RICONTROLLA CHI SIAMO.
         Entrando da un altro dispositivo questa sessione viene chiusa sul server, ma qui non
         lo sa nessuno finché non si prova a salvare: se nel frattempo la scheda era ferma,
         il menu continuava a mostrare l'email come se fosse tutto a posto. L'interfaccia
         mentiva. Il commento qui sopra prometteva già questo controllo — il codice non lo
         faceva. */
      checkSession().catch(() => { /* offline: si riproverà */ });
    });
  }
  return true;
}
/* Siamo ancora collegati? Se il server dice di no e noi credevamo di sì, è perché il
   giocatore è entrato da un'altra parte: si avvisa una volta sola, con lo stesso messaggio
   del rifiuto in scrittura. Ritorna true se la sessione è ancora buona. */
export async function checkSession() {
  if (!cloud.user) return false;
  const me = await fetchMe();
  if (me) return true;
  onKickedNotice();
  return false;
}
let avvisato = false;
function onKickedNotice() {
  if (avvisato) return;                 // non un toast a ogni cambio di scheda
  avvisato = true;
  toast('☁️ ' + tr('Sei entrato da un altro dispositivo: qui la partita resta salvata in locale.',
    'You signed in on another device: here the game stays saved locally.'));
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
  const msg = reconcileMessage(action, S, remote);
  /* La decisione si APPLICA qui, non la si rimanda a chi chiama: era compito della splash e
     un percorso (quello del conflitto) restava scoperto. Chi entra deve ritrovarsi la partita
     giusta, non una schermata da interpretare. */
  /* gli slot si allineano PRIMA di applicare la partita corrente: `applyRemote` ricarica la
     pagina, e tutto quello che viene dopo non verrebbe mai eseguito */
  const slots = await syncSlots().catch(() => ({}));
  if (action === 'pull') applyRemote(remote);          // ricarica la pagina: cache legate al seed
  else if (action === 'push') { backupLocal(); await keepLocal(); }
  return { ok: true, user: u, action, remote, msg, slots };
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
