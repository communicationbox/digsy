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
import { PROTO, T, encode, decode, makeRoom, applyMessage, peerAt, shouldSend, markSent, PING_MS, PONG_MAX } from './net.js';
import { entra as entraInVisita, torna as tornaACasa, mondoDaMandare, applicaMutazione, applicaOrologio, sonoOspite } from './visita.js';
import { arrivato as chatArrivata, detto as chatDetto } from './chat.js';

/* stati, in italiano perché si leggono anche nell'interfaccia:
   spento · collego · dentro · caduto */
export const MP = { stato: 'spento', room: makeRoom(), motivo: null, tentativi: 0 };

const RIPROVE = [500, 1500, 4000, 10000];   // attese fra un tentativo e l'altro, poi si smette
let sock = null, mio = null, stanza = null, invio = {}, riprova = 0;
/* il battito della linea e l'ultima volta che la persona ha fatto qualcosa */
let ultimoPing = null, ultimoPong = null, ultimaAttività = null;
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
    /* gli orologi del battito si azzerano e si fanno partire al primo giro di `tick`, con
       QUELLO che usa il gioco: mescolare due orologi (`performance.now` qui, il tempo del
       ciclo là) fa uscire differenze negative, e il battito non partirebbe mai. */
    ultimoPing = ultimoPong = ultimaAttività = null;
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
  /* SONO L'OSPITANTE E QUALCUNO È ENTRATO: gli mando il mio mondo. Parte una volta sola, ed è
     l'unico messaggio grosso del protocollo — il mondo non si trasmette a pezzi perché è
     deterministico dal seme: quello che viaggia è il seme più quello che è stato consumato. */
  if (m.t === T.ENTER) {
    /* CHI ENTRA DEVE VEDERMI SUBITO. Le posizioni si mandano solo quando cambiano (più un
       battito lento): uno che arriva mentre sto fermo a leggere il Libro non vedrebbe nessuno
       per parecchi secondi, e si chiederebbe se è entrato nella stanza giusta. */
    invio = {};
    if (sonoOspitante()) mandaMondo();
  }
  /* SONO OSPITE E MI È ARRIVATO UN MONDO: si entra. Da qui in poi `S` è il suo. */
  if (m.t === T.MONDO && !sonoOspitante()) {
    if (!entraInVisita({ mondo: m.mondo, x: m.x, y: m.y }, m.id)) MP.motivo = 'mondo illeggibile';
  }
  if (m.t === T.PONG) ultimoPong = now;
  if (m.t === T.MUT) applicaMutazione(m.k, m.c);
  if (m.t === T.CLOCK) applicaOrologio(m.day, m.tod);
  if (m.t === T.CHAT && m.id) {
    const chi = MP.room.peers.get(m.id);
    chatArrivata(m.id, chi ? chi.name : m.id, m.m, now);
  }
  /* il centralino avvisa che la stanza si è chiusa mandando un `leave` con l'indicazione
     `host`: il mondo era suo, quindi non c'è più niente in cui restare */
  /* MI HANNO MANDATO VIA. Solo se a dirlo è il padrone di casa (il mittente lo scrive il
     centralino, non chi manda il messaggio) e solo se riguarda me: il mondo era suo, quindi si
     torna a casa propria con quello che si ha in tasca. */
  if (m.t === T.SLEEP && suSonno) suSonno(m.id, m.on);
  if (m.t === T.DAWN && m.id && m.id === MP.room.host && suAlba) suAlba(!!m.notte);
  if (m.t === T.KICK && m.who === MP.room.me && m.id && m.id === MP.room.host) {
    disconnect('ti ha mandato via chi ospita');
    return t;
  }
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
  /* MUOVERSI È ESSERE VIVI, e si guarda PRIMA di decidere se parlare: le posizioni si mandano
     dieci volte al secondo, e chiedere «ti sei mosso?» solo quando tocca parlare lascerebbe
     fuori tutto quello che succede negli altri novanta millisecondi. Il resto (una parola, un
     tasto) lo dichiara chi lo sa. */
  if (Math.abs(pos.x - (invio.lastX ?? pos.x)) > 0.5 || Math.abs(pos.y - (invio.lastY ?? pos.y)) > 0.5) attivo(now);
  battito(now);
  if (!shouldSend(invio, now, pos.x, pos.y, pos.dir, pos.moving)) return false;
  const ok = manda(T.AT, { x: Math.round(pos.x * 10) / 10, y: Math.round(pos.y * 10) / 10, d: pos.dir, m: !!pos.moving, s: pos.scene || 'world' });
  if (ok) markSent(invio, now, pos.x, pos.y, pos.dir, pos.moving);
  return ok;
}

/* ---------- il battito, e chi si è addormentato sulla sedia ----------
   Due tempi diversi che non vanno confusi:
   - **la linea** vuole un segno di vita ogni 30 secondi, perché in mezzo c'è Apache che chiude
     quello che tace da un minuto. Staccarsi un attimo non deve buttare giù la partita: se una
     risposta non torna entro due battiti si riattacca, e riattaccare vuol dire rientrare nella
     stessa stanza (`stanza` non si perde), non ricominciare;
   - **la persona** che non fa niente da cinque minuti esce. Non è una punizione: sta nel mondo
     di qualcun altro, e chi ospita non deve trovarsi in casa una statua che non risponde.
   Chi DORME in compagnia è fermo apposta — sta aspettando che passi la notte — e non conta. */
export const FERMO_MS = 5 * 60 * 1000;
export function attivo(now) { ultimaAttività = now || ora(); }
export function fermoDa(now) { return ultimaAttività === null ? 0 : (now || ora()) - ultimaAttività; }
/* lo dichiara chi lo sa: sta dormendo e aspetta, non è sparito */
let dormiente = () => false;
export function setDormiente(fn) { dormiente = fn || (() => false); }

function battito(now) {
  /* `null` e non `0`: il primo giro può arrivare con `now` uguale a zero, e con lo zero come
     «non ancora partito» l'orologio del battito non partirebbe mai (preso da un test). */
  if (ultimoPing === null) { ultimoPing = ultimoPong = now; if (ultimaAttività === null) ultimaAttività = now; return; }
  if (now - ultimoPing >= PING_MS) { ultimoPing = now; manda(T.PING, {}); }
  /* nessuna risposta per due battiti: la linea è morta anche se la socket dice di no */
  if (ultimoPong && now - ultimoPong > PONG_MAX) {
    ultimoPong = now;                       // non si ricasca subito nello stesso ramo
    const s = sock; sock = null;
    if (s) { try { s.onclose = null; s.close(); } catch (e) { /* già morta */ } }
    caduta('la linea non risponde');
    return;
  }
  if (!dormiente() && ultimaAttività !== null && now - ultimaAttività > FERMO_MS) {
    disconnect('fermo da cinque minuti');
  }
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

/* sono io che ospito? Il mondo è mio, quindi decido io l'orologio e mando io il mondo. */
export function sonoOspitante() { return !!MP.room.me && MP.room.host === MP.room.me; }

function mandaMondo() {
  const p = mondoDaMandare();
  return manda(T.MONDO, p);
}
/* UNA CASELLA CONSUMATA. La chiama il gioco nel punto in cui consuma (gameplay.js): se non c'è
   compagnia non fa niente, quindi chi gioca da solo non paga questo ramo. */
export function mutazione(k, c) {
  if (MP.stato !== 'dentro') return false;
  return manda(T.MUT, { k, c });
}
/* L'OROLOGIO, dall'ospitante a tutti. Non a ogni fotogramma: il tempo di gioco si muove piano
   e un aggiornamento ogni paio di secondi è più che sufficiente — chi riceve non ha nulla da
   interpolare, il cielo cambia lentamente. */
let ultimoOrologio = -1e9;
export function orologio(now, day, tod) {
  if (MP.stato !== 'dentro' || !sonoOspitante()) return false;
  if (now - ultimoOrologio < 2000) return false;
  ultimoOrologio = now;
  return manda(T.CLOCK, { day, tod });
}

/* DIRE UNA COSA. La nuvoletta sopra la propria testa compare SUBITO, senza aspettare che il
   messaggio faccia il giro del centralino: chi parla deve vedere di aver parlato. */
export function dire(testo, now) {
  if (MP.stato !== 'dentro') return false;
  const m = String(testo || '').trim();
  if (!m) return false;
  if (!manda(T.CHAT, { m })) return false;
  attivo(now);
  chatDetto(m, [...MP.room.peers.values()].map(p => p.name), now);
  return true;
}

/* VADO A DORMIRE (o mi alzo). Gli altri devono saperlo: chi ospita per capire se dormono
   tutti, gli altri per vedere chi sta aspettando chi. */
export function dormo(on) {
  if (MP.stato !== 'dentro') return false;
  return manda(T.SLEEP, { on: !!on });
}
/* LA NOTTE PASSA, e la fa passare chi ospita: l'orologio è suo. */
export function alba(notte) {
  if (MP.stato !== 'dentro' || !sonoOspitante()) return false;
  return manda(T.DAWN, { notte: !!notte });
}
/* cosa fare quando arriva un'alba da chi ospita: lo registra chi disegna (ui/main), perché
   qui dentro non si decide niente di gioco */
let suAlba = null;
export function setSuAlba(fn) { suAlba = fn; }
/* e quando qualcuno si corica: serve solo a chi ospita, per accorgersi che ora dormono tutti */
let suSonno = null;
export function setSuSonno(fn) { suSonno = fn; }

/* MANDA VIA qualcuno. Solo chi ospita, perché è casa sua (MULTIPLAYER.md, regola 17). Non si
   stacca la sua socket da qui — il centralino non conosce le regole e non deve impararle: gli
   si dice a voce alta nella stanza, e il suo gioco torna a casa da solo. Se non obbedisse
   resterebbe comunque in un mondo che l'ospitante può chiudere uscendo. */
export function mandaVia(id) {
  if (MP.stato !== 'dentro' || !sonoOspitante() || !id || id === MP.room.me) return false;
  if (!MP.room.peers.has(id)) return false;
  return manda(T.KICK, { who: id });
}
/* chi c'è nella stanza, per l'interfaccia: nome, e quanti salti gli sono stati contati */
export function presenti() {
  return [...MP.room.peers.values()].map(p => ({ id: p.id, name: p.name, salti: p.salti || 0 }));
}

export function disconnect(motivo) {
  /* TORNARE A CASA VIENE PRIMA DI TUTTO: se si stacca la linea mentre si è ospiti, il mondo di
     un altro è ancora dentro `S` e il salvataggio è spento. Rimetterlo a posto è la prima cosa,
     o si resta con mezzo mondo altrui e niente che salva. */
  if (sonoOspite()) tornaACasa();
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
