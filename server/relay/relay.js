/* IL CENTRALINO — il trasporto. Gira come servizio sulla VPS, in ascolto SOLO su 127.0.0.1:
   il mondo esterno ci arriva attraverso Apache, che fa da proxy su wss://. Mai esposto diretto.
 *
 * UNA DIPENDENZA, ED È VOLUTA. Il resto del progetto non ne ha (il backend PHP ne va fiero:
 * "nessuna dipendenza, nessun Composer"), ma qui si userebbe `ws`. Scrivere a mano un server
 * WebSocket vuol dire implementare RFC 6455 — handshake, frammentazione, maschere, ping/pong,
 * chiusura — cioè mettere un parser scritto da me davanti a internet. `ws` non ha dipendenze
 * sue, è lo standard di fatto, ed è esattamente il pezzo che non ha senso rifare.
 *
 * Quello che il centralino NON fa: non conosce le regole del gioco, non simula niente, non
 * tiene il mondo, non guarda dentro i messaggi. Recapita. L'autorità è il client di chi ospita.
 */
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { addPeer, dropPeer, join, leave, audience, allow, setCodice, guarda, inLinea, perCodice, chiGuarda } from './rooms.js';

const PORT = +(process.env.DIGSY_RELAY_PORT || 17451);
const HOST = process.env.DIGSY_RELAY_HOST || '127.0.0.1';
const PROTO = 1;

const hub = { rooms: new Map(), peers: new Map() };
let seq = 0;
const nuovoId = () => (++seq).toString(36) + '-' + Math.random().toString(36).slice(2, 8);
const log = (...a) => console.log(new Date().toISOString(), ...a);

/* pagina di servizio: serve al guardiano (watch.sh) per sapere se il centralino è vivo, e a
   me per guardare quante stanze ci sono senza entrare nel processo */
const http = createServer((req, res) => {
  if (req.url === '/salute') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, stanze: hub.rooms.size, presenti: hub.peers.size, proto: PROTO }));
    return;
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server: http });

wss.on('connection', (ws) => {
  const id = nuovoId();
  const p = addPeer(hub, id, 'Digsy', (s) => { try { ws.send(s); } catch (e) { /* socket morta: la chiusura arriva da sé */ } });
  let presentato = false;

  const manda = (t, data) => p.send(JSON.stringify({ t, ...data }));
  const aTutti = (t, data) => { const s = JSON.stringify({ t, ...data }); for (const o of audience(hub, id)) o.send(s); };

  ws.on('message', (raw, isBinary) => {
    if (isBinary) return ws.close(1003, 'solo testo');
    const s = String(raw);
    if (!allow(p, Date.now(), s.length)) { log('freno', id); return ws.close(1008, 'troppo in fretta'); }
    let m; try { m = JSON.parse(s); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'hello') {
      if (m.v !== PROTO) return ws.close(1002, 'protocollo diverso');
      p.name = String(m.name || 'Digsy').slice(0, 20);
      p.look = m.look || null;
      /* IL PROPRIO CODICE. Serve a una cosa sola: farsi trovare da chi ti ha in rubrica —
         il pallino verde e l'invito che arriva. Il centralino non se lo scrive da nessuna
         parte: vive quanto la connessione. */
      if (m.mio) { setCodice(hub, id, m.mio); avvisaChiGuarda(true); }
      presentato = true;
      manda('welcome', { id });
      return;
    }
    if (!presentato) return ws.close(1002, 'prima ci si presenta');

    if (m.t === 'join') {
      const r = join(hub, id, m.room, !!m.ospite);
      if (r.error) { manda('leave', { id }); return; }
      /* a me chi c'è (me compreso: il client si toglie da solo), agli altri che sono arrivato */
      const elenco = r.peers.map(x => ({ id: x.id, name: x.name, look: x.look }));
      manda('room', { host: r.host, peers: elenco });
      aTutti('enter', { id, name: p.name, look: p.look });
      /* SE LA STANZA HA APPENA TROVATO IL SUO PADRONE DI CASA, chi stava aspettando lo deve
         sapere: senza, resterebbe in una sala d'attesa che nel frattempo è diventata un mondo. */
      if (r.nuovoHost) aTutti('room', { host: r.host, peers: elenco });
      log('entra', id, '→', p.room, '(' + r.peers.length + (r.host ? '' : ', in attesa') + ')');
      return;
    }
    /* IL BATTITO DELLA LINEA. Si risponde e basta: NON si inoltra agli altri, che non hanno
       niente da farsene — moltiplicare un battito per tutti i presenti è traffico buttato. In
       mezzo fra gioco e centralino c'è Apache, che chiude le connessioni ferme da un minuto:
       questo è il segno di vita che le tiene aperte, e la risposta dice al gioco che la linea
       è viva davvero (una socket può sembrare aperta e non portare più niente). */
    if (m.t === 'ping') { manda('pong', {}); return; }
    /* «QUESTI SONO I MIEI AMICI»: si risponde chi di loro è in linea adesso. Non è una lista
       che il centralino tiene — è una domanda, e la risposta vale per questo istante. */
    if (m.t === 'amici') { manda('online', { attivi: guarda(hub, id, m.codici) }); return; }
    /* UN INVITO. Il centralino lo porta a destinazione e basta: non sa cosa sia un mondo, non
       decide chi può invitare chi. Se la persona ha due dispositivi accesi, arriva a tutti e
       due — accetterà da quello che ha in mano. */
    if (m.t === 'invito' || m.t === 'rifiuto') {
      const dove = perCodice(hub, m.a);
      const fuori = JSON.stringify({ t: m.t, da: p.codice, nome: p.name, stanza: m.stanza || null });
      for (const q of dove) if (q.id !== id) q.send(fuori);
      return;
    }
    if (m.t === 'bye') { chiudiStanza(); return; }

    /* tutto il resto è roba di gioco: si inoltra senza guardarci dentro, col mittente scritto
       dal CENTRALINO e non dal client — o chiunque potrebbe firmarsi come un altro */
    aTutti(m.t, { ...m, id });
  });

  function chiudiStanza() {
    const out = leave(hub, id);
    const s = JSON.stringify({ t: 'leave', id });
    for (const o of out.others) o.send(s);
    if (out.closed && out.others.length) {
      /* se se ne va l'ospitante la stanza finisce: si avvisa, e ognuno torna a casa sua */
      const fine = JSON.stringify({ t: 'leave', id: out.room, host: true });
      for (const o of out.others) o.send(fine);
    }
  }

  /* CHI GUARDA QUESTO CODICE VA AVVISATO quando compare e quando sparisce: è il pallino che
     si accende e si spegne da solo, senza che nessuno debba richiedere niente. */
  function avvisaChiGuarda(acceso) {
    if (!p.codice) return;
    const avviso = JSON.stringify({ t: 'online', cambia: p.codice, acceso: !!acceso });
    for (const q of chiGuarda(hub, p.codice)) if (q.id !== id) q.send(avviso);
  }

  ws.on('close', () => { avvisaChiGuarda(false); chiudiStanza(); dropPeer(hub, id); });
  ws.on('error', () => { try { ws.close(); } catch (e) { /* già morta */ } });
});

/* battito di servizio: una socket che non risponde al ping è una socket morta che occupa un
   posto in una stanza da otto */
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.vivo === false) { try { ws.terminate(); } catch (e) { /* ok */ } continue; }
    ws.vivo = false;
    try { ws.ping(); } catch (e) { /* ok */ }
  }
}, 30000).unref();
wss.on('connection', ws => { ws.vivo = true; ws.on('pong', () => { ws.vivo = true; }); });

http.listen(PORT, HOST, () => log('centralino in ascolto su', HOST + ':' + PORT));
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { log('chiudo'); wss.close(); http.close(() => process.exit(0)); });
