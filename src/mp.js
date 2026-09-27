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
import { PROTO, T, encode, decode, makeRoom, applyMessage, peerAt, shouldSend, markSent, muto, PING_MS, PONG_MAX } from './net.js';
import { entra as entraInVisita, torna as tornaACasa, mondoDaMandare, applicaMutazione, applicaOrologio, sonoOspite, applicaCasa } from './visita.js';
import { arrivato as chatArrivata, detto as chatDetto } from './chat.js';
import { S, save } from './state.js';

/* stati, in italiano perché si leggono anche nell'interfaccia:
   spento · collego · dentro · caduto */
export const MP = { stato: 'spento', room: makeRoom(), motivo: null, tentativi: 0, stanza: null, url: null,
  /* chi dei miei amici è in linea adesso (codici). Non è una lista che qualcuno conserva: è la
     risposta del centralino a «di questi, chi c'è?», e si aggiorna quando uno arriva o se ne va. */
  online: new Set() };

/* ATTESE FRA UN TENTATIVO E L'ALTRO, e poi si continua PIANO — non ci si arrende.
   Prima dopo quattro tentativi (sedici secondi) si smetteva per sempre: bastava un riavvio del
   centralino, o un tunnel, per restare invisibili agli amici fino al prossimo ricaricamento —
   e senza che niente lo dicesse. La ragione per cui si smetteva («un telefono che ritenta per
   sempre si scalda in tasca») vale per i tentativi fitti, non per uno al minuto. */
const RIPROVE = [500, 1500, 4000, 10000, 30000];
const COMP_RIDÌ = 5000;      // ogni quanto si ripete chi è la propria bestia, per chi è entrato dopo
const RIPROVA_LENTA = 60000;
let sock = null, mio = null, stanza = null, invio = {}, riprova = 0;
/* il battito della linea e l'ultima volta che la persona ha fatto qualcosa */
let ultimoPing = null, ultimoPong = null, ultimaAttività = null;
let ospiteAtteso = false;    // sto entrando col codice di un ALTRO?
let apri = (url) => new WebSocket(url);      // sostituibile dai test
let dopo = (fn, ms) => (typeof setTimeout === 'function' ? setTimeout(fn, ms) : null);

export function setTransport(fn) { apri = fn; }
/* anche l'ATTESA si inietta: la riconnessione è la parte che si rompe in silenzio, e senza
   poterla far scorrere a comando resterebbe l'unico pezzo mai provato. */
export function setTimer(fn) { dopo = fn; }

/* l'indirizzo del centralino: la stessa origine da cui arriva il gioco, in sicuro. Un browser
   su una pagina https non accetterebbe un `ws://` in chiaro, quindi non lo si offre nemmeno. */
/* IN CASA = il gioco aperto da localhost, cioè sulla macchina di chi lo sta facendo. È l'unico
   posto dove si possono allentare le regole: nessun altro può fingersi localhost dal proprio
   browser, perché l'indirizzo lo decide da dove arriva la pagina. */
export function inCasa(loc) {
  const l = loc || (typeof location !== 'undefined' ? location : null);
  return !!l && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(String(l.hostname || ''));
}
/* il centralino pubblicato, scritto UNA volta sola */
export const CENTRALINO_ONLINE = 'wss://digsy.dev-box.it/ws';

/* A QUALE CENTRALINO ATTACCARSI. Di norma quello della stessa origine da cui arriva il gioco
   (in sicuro se la pagina è in sicuro: una pagina https non accetterebbe un `ws://` in chiaro).
   IN CASA si può scegliere con `?ws=`, e serve per una cosa sola ma importante: provare in due
   fra il gioco che si sta scrivendo e quello pubblicato. Senza, il dev server parla col
   centralino locale e il telefono con quello online — due mondi che non si incontrano mai.
     ?ws=online   → il centralino pubblicato
     ?ws=wss://…  → un centralino qualsiasi (prove)
   Fuori da casa il parametro NON si guarda: il gioco pubblicato non deve poter essere dirottato
   su un altro centralino da un indirizzo confezionato. */
/* LA SCELTA DEL CENTRALINO SI RICORDA, come la stanza. `?ws=online` si scriveva una volta e
   si perdeva al primo ricaricamento (o aprendo una scheda nuova sull'indirizzo nudo): da lì il
   gioco tornava a parlare col centralino locale SENZA dirlo, e dall'altra parte l'amico entrava
   in una stanza che restava vuota. Nel registro del centralino si vedeva benissimo: sei ingressi
   di fila, sempre «(1)» — sempre uno solo, mai due insieme.
   Vale solo in casa, e `?ws=locale` la annulla. */
const CHIAVE_WS = 'digsy_ws';
function wsScelto() { try { return (typeof localStorage !== 'undefined' && localStorage.getItem(CHIAVE_WS)) || ''; } catch (e) { return ''; } }
function scegliWs(v) {
  try { if (typeof localStorage === 'undefined') return; if (v) localStorage.setItem(CHIAVE_WS, v); else localStorage.removeItem(CHIAVE_WS); }
  catch (e) { /* pazienza: si riscrive nell'indirizzo */ }
}
export function relayUrl(loc) {
  const l = loc || (typeof location !== 'undefined' ? location : null);
  if (!l) return null;
  if (inCasa(l)) {
    let v = '';
    try { v = new URLSearchParams(l.search || '').get('ws') || ''; } catch (e) { v = ''; }
    if (v === 'locale' || v === 'local') { scegliWs(''); return in_chiaro(l); }
    if (v === 'online' || v === 'prod') { scegliWs(CENTRALINO_ONLINE); return CENTRALINO_ONLINE; }
    if (/^wss?:\/\/[^\s]+$/i.test(v)) { scegliWs(v); return v; }
    const r = wsScelto();
    if (/^wss?:\/\/[^\s]+$/i.test(r)) return r;    // scelto prima, e non ancora annullato
  }
  return in_chiaro(l);
}
function in_chiaro(l) {
  const sicuro = l.protocol === 'https:';
  return (sicuro ? 'wss://' : 'ws://') + l.host + '/ws';
}

/* LA STANZA SOPRAVVIVE A UN RICARICAMENTO DELLA PAGINA. Il gioco si ricarica da solo più
   volte (carica una partita, cambia lingua, aggiorna la versione), e ogni volta la socket
   moriva in silenzio: restavi «fuori» senza che nessuno te lo dicesse, mentre dall'altra parte
   qualcuno entrava nella tua stanza e non trovava nessuno. Qui si ricorda dove si era, e il
   gioco ci rientra da sé all'avvio. Vive nelle preferenze del dispositivo, non nel
   salvataggio: è come si è collegati, non parte della partita. */
const CHIAVE_STANZA = 'digsy_stanza_viva';
function ricorda(v) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (v) localStorage.setItem(CHIAVE_STANZA, JSON.stringify(v)); else localStorage.removeItem(CHIAVE_STANZA);
  } catch (e) { /* spazio finito o navigazione privata: pazienza, si riapre a mano */ }
}
export function stanzaRicordata() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(CHIAVE_STANZA);
    const o = raw ? JSON.parse(raw) : null;
    return (o && typeof o.room === 'string' && o.room) ? o : null;
  } catch (e) { return null; }
}
export function scordaStanza() { ricorda(null); }

export function connect(url, me) {
  if (sock) disconnect('riconnessione');
  mio = { name: (me && me.name) || 'Digsy', look: (me && me.look) || null, comp: (me && me.comp) || null, room: (me && me.room) || null };
  /* se chi chiama dichiara anche chi è, lo si registra UNA volta: da lì in poi vale per tutte
     le connessioni che verranno, comprese quelle che si riaprono da sole */
  if (me && me.codice) identita.codice = me.codice;
  if (me && me.amici) identita.amici = me.amici;
  /* CASA MIA O CASA D'ALTRI. Lo dichiara chi apre il collegamento, e il valore di partenza è
     «casa mia»: chi non dice niente sta aprendo la propria stanza (è così in tutti i punti
     che non sono il pulsante «entra col codice»). Serve a riconoscere il caso qui sotto: se
     entro col codice di un ALTRO e mi ritrovo padrone di casa, quella stanza era vuota. */
  ospiteAtteso = !!(me && me.ospite);
  stanza = mio.room; MP.stanza = stanza;
  ricorda({ room: stanza, ospite: ospiteAtteso, name: mio.name });
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
    manda(T.HELLO, { v: PROTO, name: mio.name, look: mio.look, comp: mio.comp || null, mio: identita.codice || null });
    chiediChiCè();
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
  if (m.t === T.WELCOME) {
    if (stanza) manda(T.JOIN, { room: stanza, ospite: ospiteAtteso });
    /* IN LINEA SENZA STANZA. Ci si collega anche quando si gioca da soli: è l'unico modo
       perché un amico ti veda col pallino acceso e perché un invito ti ARRIVI. Non costa
       niente — una socket ferma e un battito ogni mezzo minuto — e non cambia niente nel
       gioco: nessun mondo condiviso finché non si accetta un invito. */
    else MP.stato = 'linea';
  }
  if (m.t === T.ROOM) {
    MP.stato = 'dentro'; invio = {};
    /* ENTRARE COL CODICE DI UN ALTRO E RITROVARSI PADRONE DI CASA vuol dire una cosa sola: in
       quella stanza non c'era nessuno — il centralino fa ospitante chi arriva per primo. Prima
       si restava lì dentro, nel PROPRIO mondo, con scritto «è il TUO mondo» e il codice di un
       altro sopra: sembrava di essere entrati e non si era entrati da nessuna parte
       (segnalato con foto: «non sono andato nel mondo di localhost»).
       Si esce e si dice il perché. Restare sarebbe pure peggio: l'amico che arriva dopo col
       SUO codice finirebbe ospite nel MIO mondo, cioè l'esatto contrario di quello che voleva. */
    /* SI PUÒ ASPETTARE. Entrando col codice di un altro non si diventa padroni di casa: se lui
       non c'è ancora, la stanza è una SALA D'ATTESA (host nullo) e ci si resta finché arriva.
       Prima si veniva buttati fuori, e due amici che si aspettavano a vicenda non si
       incontravano mai (visto in due schermate affiancate). */
    if (sonoOspitante() && MP.room.peers.size) mandaMondo();   // sono arrivato io: ecco il mio mondo
    spediscoInviti();                  // la stanza è aperta: partono gli inviti che aspettavano
    /* NESSUNO PUÒ ASPETTARE SÉ STESSO. Se si è finiti ospiti in una stanza che non ha padrone
       e che porta il PROPRIO codice, la si apre: è casa nostra, e aspettare avrebbe voluto
       dire aspettarsi. Sta qui e non solo nel pannello perché la strada per arrivarci è più
       d'una (il ricordo di un avvio precedente, per esempio). */
    if (inAttesa() && ospiteAtteso && mioStessoCodice()) {
      ospiteAtteso = false;
      ricorda({ room: stanza, ospite: false, name: mio && mio.name });
      manda(T.JOIN, { room: stanza, ospite: false });
    }
    spediscoInviti();
  }
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
  /* SONO OSPITE E L'OSPITANTE HA SPOSTATO UN MOBILE: la sua casa cambia sotto i miei occhi. */
  if (m.t === T.CASA && !sonoOspitante() && sonoOspite()) applicaCasa(m.casa);
  /* SONO OSPITE E MI È ARRIVATO UN MONDO: si entra. Da qui in poi `S` è il suo. */
  if (m.t === T.MONDO && !sonoOspitante()) {
    if (!entraInVisita({ mondo: m.mondo, x: m.x, y: m.y }, m.id)) MP.motivo = 'mondo illeggibile';
    /* SI È ARRIVATI DA QUALCHE PARTE, e si deve vedere. Chi disegna lo racconta a modo suo
       (il volo in aereo): qui si dice solo che è successo, e di chi è il mondo. */
    else if (suVisita) { const p = MP.room.peers.get(m.id); suVisita((p && p.name) || ''); }
  }
  if (m.t === T.PONG) ultimoPong = now;
  if (m.t === T.ONLINE) {
    if (m.attivi) { MP.online = new Set(m.attivi); }
    else if (m.acceso) MP.online.add(m.cambia);
    else MP.online.delete(m.cambia);
    if (suOnline) suOnline();
  }
  /* UN INVITO ARRIVATO. Qui non si decide niente: si passa a chi disegna, che lo chiederà alla
     persona. Accettare o no è una risposta, non una conseguenza. */
  if (m.t === T.INVITO && suInvito) suInvito({ da: m.da, nome: m.nome });
  if (m.t === T.RIFIUTO && suRifiuto) suRifiuto({ da: m.da, nome: m.nome });
  /* LA RICEVUTA dell'invito: a quante persone è arrivato. Zero è una risposta — e va detta. */
  if (m.t === T.RECAPITO && suRecapito) suRecapito({ a: m.a, quanti: m.quanti });
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
    scordaStanza();                       // mandati via non si rientra da soli al prossimo avvio
    restaInLinea('ti ha mandato via chi ospita');
    return t;
  }
  if (m.t === T.LEAVE && raw && String(raw).includes('"host":true')) { scordaStanza(); restaInLinea('la stanza si è chiusa'); }
  return t;
}

function manda(t, data) {
  if (!sock || sock.readyState !== 1) return false;
  try { sock.send(encode(t, data)); return true; } catch (e) { return false; }
}

/* DOVE SONO. Si chiama dal ciclo di gioco a ogni fotogramma: decide `shouldSend`, che parla
   dieci volte al secondo e solo se c'è qualcosa da dire (più un battito da fermi). */
export function tick(now, pos) {
  /* senza posizione (o fuori da una stanza) resta il battito: tenere viva la linea serve
     anche a chi sta giocando da solo, o l'invito di un amico non arriverebbe mai */
  if (MP.stato === 'linea' || !pos) { if (MP.stato === 'linea' || MP.stato === 'dentro') battito(now); return false; }
  if (MP.stato !== 'dentro') return false;
  /* MUOVERSI È ESSERE VIVI, e si guarda PRIMA di decidere se parlare: le posizioni si mandano
     dieci volte al secondo, e chiedere «ti sei mosso?» solo quando tocca parlare lascerebbe
     fuori tutto quello che succede negli altri novanta millisecondi. Il resto (una parola, un
     tasto) lo dichiara chi lo sa. */
  if (Math.abs(pos.x - (invio.lastX ?? pos.x)) > 0.5 || Math.abs(pos.y - (invio.lastY ?? pos.y)) > 0.5) attivo(now);
  battito(now);
  if (!shouldSend(invio, now, pos.x, pos.y, pos.dir, pos.moving)) return false;
  /* LO STAMPO DELLA BESTIA (quali specie) si dice all'ingresso e poi SOLO quando cambia, o
     ogni tanto per chi è arrivato dopo: mandarlo dieci volte al secondo sarebbe ripetere
     sessanta byte immutabili per tutta la partita, mandarlo una volta sola lascerebbe la
     bestia invisibile a chi entra più tardi e sbagliata a chi era già lì quando la cambi. */
  const st = pos.comp ? JSON.stringify(pos.comp.spec) : '';
  const rinfresco = st && (st !== invio.compSt || (now - (invio.compT || 0)) > COMP_RIDÌ);
  const ok = manda(T.AT, { x: Math.round(pos.x * 10) / 10, y: Math.round(pos.y * 10) / 10, d: pos.dir, m: !!pos.moving, s: pos.scene || 'world',
    /* DOV'È LA MIA BESTIA. Non si ricava dalla mia posizione: il compagno gira per conto suo e
       si allontana a scavare, quindi o si dice dov'è o gli altri la vedono incollata a me. */
    c: pos.comp ? { x: Math.round(pos.comp.x * 10) / 10, y: Math.round(pos.comp.y * 10) / 10, d: pos.comp.dir, f: Math.round((pos.comp.anim || 0) * 100) / 100 } : null,
    cs: rinfresco ? pos.comp.spec : undefined });
  if (ok && rinfresco) { invio.compSt = st; invio.compT = now; }
  if (ok && !st) { invio.compSt = ''; invio.compT = 0; }
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
  /* SOLO CHI È OSPITE IN CASA D'ALTRI. Da soli (in linea senza stanza) e in casa propria non
     c'è nessuno a cui dare fastidio — e l'attività si misura solo dentro una stanza, quindi da
     soli il conto correva sempre: dopo cinque minuti di gioco il telefono risultava «offline»
     agli amici e restava così fino al riavvio (segnalato). E anche l'ospite fermo non va
     spento: esce dalla stanza e resta IN LINEA, così un invito gli arriva ancora. */
  if (sonoOspite() && !dormiente() && ultimaAttività !== null && now - ultimaAttività > FERMO_MS) {
    scordaStanza();                       // chi si è alzato dalla sedia non rientra da solo
    restaInLinea('fermo da cinque minuti');
  }
}

/* CHI DISEGNARE, e dove sta in questo istante: già interpolato, già filtrato per scena — chi
   è entrato in una bottega non si vede dal mondo di fuori. */
export function visibili(now, scena = 'world') {
  const out = [];
  for (const p of MP.room.peers.values()) {
    if (muto(p, now)) continue;                 // fantasma di una socket morta: non si disegna
    const a = peerAt(p, now);
    if (!a || a.scene !== scena) continue;
    /* e la sua BESTIA, se ce l'ha e se questo è il momento in cui l'ha detto: `comp` è lo
       stampo (quali specie), `a.comp` è dove sta adesso. Senza tutte e due non si disegna. */
    out.push({ id: p.id, name: p.name, look: p.look, x: a.x, y: a.y, dir: a.dir, moving: a.moving,
      comp: (p.comp && a.comp) ? { ...p.comp, x: a.comp.x, y: a.comp.y, dir: a.comp.dir, anim: a.comp.anim } : null });
  }
  return out;
}

/* DOVE SONO GLI ALTRI NEL MONDO, anche quelli che adesso stanno dentro da qualche parte. Per
   la mappa non serve la posizione di ADESSO ma l'ultima nota SUL MONDO: le coordinate dentro
   una bottega sono relative alla stanza (una decina di caselle), e messe sulla carta
   finirebbero tutte in un angolo dell'oceano. L'ultimo passo fatto fuori è la porta da cui
   sono entrati — cioè esattamente il posto dove si va a prenderli. */
export function visibiliOvunque(now) {
  const t = now === undefined ? ora() : now;
  const out = [];
  for (const p of MP.room.peers.values()) {
    if (muto(p, t)) continue;
    if (p.wx === null || p.wy === null) continue;   // mai visto fuori: non si sa dove metterlo
    out.push({ id: p.id, name: p.name, x: p.wx, y: p.wy, dentro: p.buf[p.buf.length - 1].s !== 'world' });
  }
  return out;
}
/* ---------- COME TI CHIAMI ----------
   Il nome si cambia in gioco, dal registro della Locanda (ui.js): sta qui perché cambiarlo
   mentre si è in una stanza vuol dire RIATTACCARE la linea — è l'unico modo perché la
   targhetta sopra la testa cambi anche sugli schermi degli altri, e chi sta guardando il
   pannello Amici veda il nome nuovo nella propria rubrica. Da soli è solo un campo salvato. */
export function setPlayerName(nome) {
  const v = String(nome || '').trim().slice(0, 14);
  if (!v) return false;
  S.name = v; save();
  if (mio) mio.name = v;
  if (MP.stato === 'dentro' && MP.stanza) {
    const bs = S && S.companion;
    connect(relayUrl(), { name: v, look: S && S.look, room: MP.stanza, ospite: !sonoOspitante(),
      comp: bs ? { skull: bs.skull, torso: bs.torso, leg: bs.leg, q: bs.q } : null });
  }
  return true;
}
/* sono io che ospito? Il mondo è mio, quindi decido io l'orologio e mando io il mondo. */
export function sonoOspitante() { return !!MP.room.me && MP.room.host === MP.room.me; }
/* stanza aperta ma senza padrone di casa: si sta aspettando che arrivi */
export function inAttesa() { return MP.stato === 'dentro' && !MP.room.host; }
/* la stanza in cui sono porta il MIO codice? (mp.js non conosce i codici: glielo si dichiara) */
let mioCodiceOra = () => '';
export function setMioCodice(fn) { mioCodiceOra = fn || (() => ''); }
function mioStessoCodice() { const c = mioCodiceOra(); return !!c && MP.stanza === 'w-' + c; }

function mandaMondo() {
  const p = mondoDaMandare();
  return manda(T.MONDO, p);
}
/* LA CASA È CAMBIATA. La chiama house.js dopo ogni mobile spostato, comprato o tolto: chi sta
   guardando la stanza deve vedere il cambio SUBITO, non alla prossima visita. Va solo da chi
   OSPITA a chi è in casa sua — l'arredo è di chi la casa ce l'ha (MULTIPLAYER.md, regola 3),
   e un ospite non ha niente da dire in proposito.
   Si manda tutta la casa e non il singolo pezzo: sono poche decine di mobili, si sposta un
   mobile ogni tanto (non dieci volte al secondo), e un messaggio che vale da sé non può
   arrivare fuori ordine o perdersi lasciando due stanze diverse sui due schermi. */
export function mandaCasa(casa) {
  if (MP.stato !== 'dentro' || !sonoOspitante() || !MP.room.peers.size) return false;
  return manda(T.CASA, { casa });
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

/* ---------- AMICI: chi c'è, e gli inviti ----------
   Il codice serve a farsi aggiungere in rubrica. Tutto il resto passa da qui: si dice al
   centralino quali codici interessano, lui risponde chi è in linea e avvisa quando cambia;
   e un invito lo si manda a una persona, non a una stanza. */
/* CHI SONO NON DIPENDE DALLA CONNESSIONE. Il codice e la rubrica sono della PERSONA: restano
   uguali se apro il mio mondo, se entro in quello di un altro, se la linea cade e si riattacca.
   Tenerli dentro `mio` — che si riscrive a ogni `connect` — voleva dire perderli: aprendo il
   proprio mondo si ripartiva senza dire più chi si era, e gli amici ti vedevano SPARIRE
   proprio mentre li stavi aspettando (visto in due schermate: uno ospitava, l'altro lo dava
   per assente). */
const identita = { codice: null, amici: [] };
export function setIdentita(codice, lista) {
  identita.codice = codice || null;
  identita.amici = lista || [];
  chiediChiCè();
}
export function setAmici(codici) { identita.amici = codici || []; chiediChiCè(); }
export function setMioCodiceInvio(c) { identita.codice = c || null; }
function chiediChiCè() {
  if (!identita.amici.length) return false;
  return manda(T.AMICI, { codici: identita.amici });
}
export function inLinea(codice) { return MP.online.has(String(codice || '').toUpperCase()); }
/* INVITO una persona: gli arriva dove sta giocando, e decide lui.
   L'INVITO ASPETTA CHE LA STANZA SIA APERTA. Invitare qualcuno e aprire il proprio mondo sono
   la stessa cosa — nessuno invita per poi restare fuori — ma aprire il mondo vuol dire aprire
   una socket, e una socket si apre quando vuole lei: l'invito partiva PRIMA che la linea
   esistesse e finiva nel vuoto, senza dire niente. Bisognava premere «Invita» due volte, la
   prima per aprire la stanza e la seconda per invitare davvero («non ha senso»). Ora si mette
   in coda e parte da solo appena si è padroni di casa.
   La coda SCADE: un invito che parte mezzo minuto dopo, magari da un'altra stanza, è un
   invito che nessuno si aspetta più. */
const INVITO_ATTESA = 12000;
let inCoda = [];
export function invita(codice) {
  const a = String(codice || '').toUpperCase();
  if (!a) return false;
  if (MP.stato === 'dentro' && sonoOspitante()) return manda(T.INVITO, { a });
  inCoda = inCoda.filter(v => v.a !== a).concat([{ a, t: ora() }]);
  return true;                       // «preso in carico»: parte appena la stanza è aperta
}
/* svuota la coda: si chiama quando si diventa padroni di casa */
function spediscoInviti() {
  if (!inCoda.length) return;
  const adesso = ora();
  const da = inCoda.filter(v => adesso - v.t < INVITO_ATTESA);
  inCoda = [];
  if (MP.stato !== 'dentro' || !sonoOspitante()) return;
  for (const v of da) manda(T.INVITO, { a: v.a });
}
export function invitiInCoda() { return inCoda.length; }
export function rifiuta(codice) { return manda(T.RIFIUTO, { a: String(codice || '').toUpperCase() }); }
let suInvito = null, suRifiuto = null, suOnline = null, suRecapito = null, suVisita = null;
export function setSuRecapito(fn) { suRecapito = fn; }
export function setSuInvito(fn) { suInvito = fn; }
/* «sei appena arrivato nel mondo di X»: lo dice a chi disegna, che ci mette sopra il viaggio */
export function setSuVisita(fn) { suVisita = fn; }
export function setSuRifiuto(fn) { suRifiuto = fn; }
export function setSuOnline(fn) { suOnline = fn; }

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
export function presenti(now) {
  /* anche l'elenco del pannello salta i fantasmi: due volte la stessa persona fra «con te» è
     la stessa bugia che si vedeva nel mondo. Chi non ha ancora detto niente invece SÌ: è
     appena entrato, e non averlo in elenco per un secondo sarebbe peggio. */
  const t = now === undefined ? ora() : now;
  return [...MP.room.peers.values()]
    .filter(p => !p.buf.length || !muto(p, t))
    .map(p => ({ id: p.id, name: p.name, salti: p.salti || 0 }));
}

/* USCIRE È UNA DECISIONE: si dimentica la stanza, e all'avvio dopo non ci si rientra. Cadere
   invece no — la linea che salta non è una scelta di nessuno, e al ritorno si riprende. */
export function esci(motivo) { scordaStanza(); return restaInLinea(motivo || 'uscito'); }
/* USCIRE DA UNA STANZA NON È USCIRE DAL GIOCO. Si chiude la stanza e si riattacca SENZA stanza:
   in linea da soli, col pallino acceso per gli amici e gli inviti che arrivano. Prima uscire,
   essere mandati via o vedere la stanza chiudersi spegneva la linea del tutto, e agli amici si
   risultava «offline» finché non si riavviava il gioco (segnalato). */
export function restaInLinea(motivo) {
  const url = MP.url, me = mio ? { ...mio, room: null, ospite: false } : null;
  disconnect(motivo);
  if (!url || !me) return;
  connect(url, me);
  MP.motivo = motivo || null;          // il perché resta da leggere nel pannello
}
/* IL TELEFONO SI È RISVEGLIATO (la scheda torna visibile, la rete torna). In tasca il sistema
   chiude le socket e rallenta i timer: l'attesa del prossimo tentativo può durare minuti, e
   intanto agli amici si risulta «offline» mentre si sta giocando. Si riprova SUBITO. */
export function svegliati() {
  if (sock || !MP.url) return false;
  if (MP.stato !== 'collego' && MP.stato !== 'caduto') return false;
  riprova = 0; MP.stato = 'collego';
  aprire(MP.url);
  return true;
}

export function disconnect(motivo) {
  /* TORNARE A CASA VIENE PRIMA DI TUTTO: se si stacca la linea mentre si è ospiti, il mondo di
     un altro è ancora dentro `S` e il salvataggio è spento. Rimetterlo a posto è la prima cosa,
     o si resta con mezzo mondo altrui e niente che salva. */
  if (sonoOspite()) tornaACasa();
  MP.stato = 'spento'; MP.motivo = motivo || null;
  /* CHI ERA IN LINEA NON LO SAPPIAMO PIÙ. Il pallino verde dice «sta giocando adesso»: è la
     risposta del centralino a una domanda, e senza centralino non c'è nessuna risposta.
     Tenerselo acceso dopo che la linea è caduta è la bugia più facile da raccontare — e si è
     vista, in una schermata dove un amico risultava in gioco mentre quel gioco non era
     collegato a niente. */
  MP.online = new Set();
  MP.room = makeRoom(); invio = {}; stanza = null; MP.stanza = null;
  const s = sock; sock = null;
  if (s) { try { s.onclose = null; s.close(); } catch (e) { /* già morta */ } }
}

/* CADUTA: si riprova con attese che crescono, e dopo l'ultima si smette per davvero. Non è
   pessimismo: è che un telefono che ritenta per sempre si scalda in tasca e nessuno lo sa. */
function caduta(motivo) {
  sock = null;
  MP.motivo = motivo;
  MP.online = new Set();          // vedi disconnect: senza centralino non si sa chi c'è
  const fitti = riprova < RIPROVE.length;
  const attesa = fitti ? RIPROVE[riprova] : RIPROVA_LENTA;
  riprova++;
  MP.tentativi = riprova;
  /* dopo i tentativi fitti lo si DICE (il pannello mostra il motivo) ma si continua a
     riprovare piano: il centralino torna, e quando torna ci si deve essere */
  MP.stato = fitti ? 'collego' : 'caduto';
  /* `!sock`: se nel frattempo ha già riaperto qualcun altro (svegliati), una seconda socket
     vorrebbe dire la stessa persona due volte nella stanza */
  dopo(() => { if (!sock && (MP.stato === 'collego' || MP.stato === 'caduto')) aprire(MP.url); }, attesa);
}

/* attesa prima del prossimo tentativo: esposta per i test e per l'interfaccia */
export function prossimaAttesa() { return riprova < RIPROVE.length ? RIPROVE[riprova] : RIPROVA_LENTA; }

function ora() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
