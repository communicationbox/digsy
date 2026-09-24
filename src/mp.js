/* LA PARTITA IN COMPAGNIA — il lato vivo: la socket, il battito delle posizioni, chi c'è.
 *
 * Il protocollo e la stanza stanno in net.js e sono puri. Qui c'è l'unica cosa che non si può
 * essere puri su: tenere aperto un collegamento. Il TRASPORTO si inietta (`setTransport`), così
 * la suite lo prova con una socket finta e queste righe girano a ogni `npm test` invece di
 * essere un ramo che nessuno esegue (REGOLA FERREA 9).
 *
 * TRE COSE CHE QUESTO MODULO NON FA, e sono decisioni, non dimenticanze:
 *
 * 1. NON DECIDE NIENTE DI GIOCO. Non sa cos'è uno scavo, non tocca `S`, non muove nessuno. Sa
 *    dove sono gli altri; cosa farne lo decide chi disegna. L'autorità è il client di chi
 *    ospita (vedi MULTIPLAYER.md), e questo modulo non è quello.
 *
 * 2. NON SI COLLEGA DA SOLO. Il gioco in solitaria non apre nessuna socket: chi non gioca in
 *    compagnia non si porta dietro un pezzo di rete che non userà mai — è la stessa regola con
 *    cui il cloud si carica solo se acceso.
 *
 * 3. NON INSISTE ALL'INFINITO. Se il centralino non c'è (sviluppo in locale, server spento,
 *    treno in galleria) si riprova con attese che crescono e poi ci si ferma. Un gioco che
 *    tenta di collegarsi per sempre scalda il telefono e non lo dice a nessuno.
 */
import { PROTO, T, encode, decode, makeRoom, applyMessage, peerAt, shouldSend, markSent } from './net.js';

/* stati, in italiano perché si leggono anche nell'interfaccia:
   spento · collego · dentro · caduto */
export const MP = { stato: 'spento', room: makeRoom(), motivo: null, tentativi: 0 };

const RIPROVE = [500, 1500, 4000, 10000];   // attese fra un tentativo e l'altro, poi si smette
let sock = null, mio = null, stanza = null, invio = {}, riprova = 0;
let apri = (url) => new WebSocket(url);      // sostituibile dai test
let dopo = (fn, ms) => (typeof setTimeout === 'function' ? setTimeout(fn, ms) : null);

export function setTransport(fn) { apri = fn; }
/* anche l'ATTESA si inietta: la riconnessione è la parte che si rompe in silenzio, e senza
   poterla far scorrere a comando resterebbe l'unico pezzo mai provato. */
export function setTimer(fn) { dopo = fn; }

/* l'indirizzo del centralino: la stessa origine da cui arriva il gioco, in sicuro. Un browser
   su una pagina https non accetterebbe un `ws://` in chiaro, quindi non lo si offre nemmeno. */
export function relayUrl(loc) {
  const l = loc || (typeof location !== 'undefined' ? location : null);
  if (!l) return null;
  const sicuro = l.protocol === 'https:';
  return (sicuro ? 'wss://' : 'ws://') + l.host + '/ws';
}

export function connect(url, me) {
  if (sock) disconnect('riconnessione');
  mio = { name: (me && me.name) || 'Digsy', look: (me && me.look) || null, room: (me && me.room) || null };
  stanza = mio.room;
  MP.stato = 'collego'; MP.motivo = null;
  aprire(url);
}

function aprire(url) {
  MP.url = url;
  let s;
  try { s = apri(url); } catch (e) { caduta('trasporto: ' + e.message); return; }
  sock = s;
  s.onopen = () => {
    MP.tentativi = 0; riprova = 0;
    manda(T.HELLO, { v: PROTO, name: mio.name, look: mio.look });
  };
  s.onmessage = (ev) => ricevi(ev && ev.data, ora());
  s.onerror = () => { /* il perché arriva sempre da onclose: qui non si fa niente due volte */ };
  s.onclose = () => { if (MP.stato !== 'spento') caduta('collegamento chiuso'); };
}

/* Un messaggio in arrivo. `decode` ha già scartato quello che non ha la forma giusta: qui non
   si controlla di nuovo, si reagisce. */
export function ricevi(raw, now) {
  const m = decode(raw);
  if (!m) return null;
  const t = applyMessage(MP.room, m, now);
  if (m.t === T.WELCOME && stanza) manda(T.JOIN, { room: stanza });
  if (m.t === T.ROOM) { MP.stato = 'dentro'; invio = {}; }
  /* il centralino avvisa che la stanza si è chiusa mandando un `leave` con l'indicazione
     `host`: il mondo era suo, quindi non c'è più niente in cui restare */
  if (m.t === T.LEAVE && raw && String(raw).includes('"host":true')) disconnect('la stanza si è chiusa');
  return t;
}

function manda(t, data) {
  if (!sock || sock.readyState !== 1) return false;
  try { sock.send(encode(t, data)); return true; } catch (e) { return false; }
}

/* DOVE SONO. Si chiama dal ciclo di gioco a ogni fotogramma: decide `shouldSend`, che parla
   dieci volte al secondo e solo se c'è qualcosa da dire (più un battito da fermi). */
export function tick(now, pos) {
  if (MP.stato !== 'dentro' || !pos) return false;
  if (!shouldSend(invio, now, pos.x, pos.y, pos.dir, pos.moving)) return false;
  const ok = manda(T.AT, { x: Math.round(pos.x * 10) / 10, y: Math.round(pos.y * 10) / 10, d: pos.dir, m: !!pos.moving, s: pos.scene || 'world' });
  if (ok) markSent(invio, now, pos.x, pos.y, pos.dir, pos.moving);
  return ok;
}

/* CHI DISEGNARE, e dove sta in questo istante: già interpolato, già filtrato per scena — chi
   è entrato in una bottega non si vede dal mondo di fuori. */
export function visibili(now, scena = 'world') {
  const out = [];
  for (const p of MP.room.peers.values()) {
    const a = peerAt(p, now);
    if (!a || a.scene !== scena) continue;
    out.push({ id: p.id, name: p.name, look: p.look, x: a.x, y: a.y, dir: a.dir, moving: a.moving });
  }
  return out;
}

export function disconnect(motivo) {
  MP.stato = 'spento'; MP.motivo = motivo || null;
  MP.room = makeRoom(); invio = {}; stanza = null;
  const s = sock; sock = null;
  if (s) { try { s.onclose = null; s.close(); } catch (e) { /* già morta */ } }
}

/* CADUTA: si riprova con attese che crescono, e dopo l'ultima si smette per davvero. Non è
   pessimismo: è che un telefono che ritenta per sempre si scalda in tasca e nessuno lo sa. */
function caduta(motivo) {
  sock = null;
  MP.motivo = motivo;
  if (riprova >= RIPROVE.length) { MP.stato = 'caduto'; return; }
  MP.stato = 'collego';
  const attesa = RIPROVE[riprova++];
  MP.tentativi = riprova;
  dopo(() => { if (MP.stato === 'collego') aprire(MP.url); }, attesa);
}

/* attesa prima del prossimo tentativo: esposta per i test e per l'interfaccia */
export function prossimaAttesa() { return riprova < RIPROVE.length ? RIPROVE[riprova] : null; }

function ora() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
