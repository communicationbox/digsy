/* IL CENTRALINO — la parte che si può provare senza rete.
 *
 * Qui non c'è nessuna socket: solo chi c'è, in quale stanza, e a chi va recapitato un
 * messaggio. Il trasporto (relay.js) chiama queste funzioni e basta. Così la logica che
 * decide chi vede cosa si prova con `npm test`, invece di scoprirla in produzione.
 *
 * REGOLA MADRE (vedi MULTIPLAYER.md): il centralino NON è un server di gioco. Non conosce le
 * regole, non simula niente, non sa nemmeno cos'è uno scavo. Sa recapitare. L'autorità è il
 * client di chi ospita: "il gioco è di chi invita".
 *
 * Da qui discendono i tre limiti qui sotto, che esistono per non lasciare una porta aperta su
 * internet: una stanza è un salotto (8), un centralino non è un servizio pubblico (60 stanze),
 * e nessuno deve poter tenere occupato il processo parlando a raffica.
 */

export const MAX_PEERS = 8;        // una stanza è un salotto, non una piazza
export const MAX_ROOMS = 60;       // tetto: oltre, si rifiuta invece di gonfiare la memoria
export const MSG_PER_SEC = 40;     // le posizioni viaggiano a 10/s: quattro volte tanto è già larghissimo
export const MAX_MSG = 4096;       // byte: un messaggio di gioco è una manciata di byte

export function makeHub() { return { rooms: new Map(), peers: new Map() }; }

/* Un collegamento nuovo. `send` è la funzione che sa scrivere su QUELLA socket: il centralino
   non sa come, sa solo a chi. */
export function addPeer(hub, id, name, send) {
  const p = { id, name: String(name || 'Digsy').slice(0, 20), send, room: null, look: null, msgs: 0, since: 0 };
  hub.peers.set(id, p);
  return p;
}

/* Entra in una stanza. Chi la apre per primo ne è l'OSPITANTE, e resta tale finché c'è:
   il mondo è il suo, quindi non si passa la mano a metà partita. */
export function join(hub, id, roomName) {
  const p = hub.peers.get(id); if (!p) return { error: 'ignoto' };
  if (p.room) leave(hub, id);
  const key = String(roomName || '').slice(0, 40);
  if (!key) return { error: 'stanza senza nome' };
  let r = hub.rooms.get(key);
  if (!r) {
    if (hub.rooms.size >= MAX_ROOMS) return { error: 'centralino pieno' };
    r = { key, host: id, peers: new Set() };
    hub.rooms.set(key, r);
  }
  if (r.peers.size >= MAX_PEERS) return { error: 'stanza piena' };
  r.peers.add(id); p.room = key;
  return { room: r, host: r.host, peers: [...r.peers].map(x => hub.peers.get(x)).filter(Boolean) };
}

/* Esce. Se esce l'OSPITANTE la stanza si chiude: il mondo era il suo, e senza di lui non c'è
   più niente in cui stare. Chi resta se ne torna a casa propria — è la regola che il gioco ha
   già accettato ("per entrare nel mio mondo devo essere online"). */
export function leave(hub, id) {
  const p = hub.peers.get(id); if (!p || !p.room) return { closed: false, others: [] };
  const r = hub.rooms.get(p.room);
  p.room = null;
  if (!r) return { closed: false, others: [] };
  r.peers.delete(id);
  const others = [...r.peers].map(x => hub.peers.get(x)).filter(Boolean);
  const closed = r.host === id || r.peers.size === 0;
  if (closed) {
    for (const o of others) o.room = null;
    hub.rooms.delete(r.key);
  }
  return { closed, others, room: r.key };
}

export function dropPeer(hub, id) {
  const out = leave(hub, id);
  hub.peers.delete(id);
  return out;
}

/* A chi va recapitato: tutti quelli della stanza tranne chi parla. Il centralino non guarda
   dentro il messaggio — non è affar suo cosa si dicono. */
export function audience(hub, id) {
  const p = hub.peers.get(id);
  if (!p || !p.room) return [];
  const r = hub.rooms.get(p.room);
  if (!r) return [];
  return [...r.peers].filter(x => x !== id).map(x => hub.peers.get(x)).filter(Boolean);
}

/* FRENO. Non è un antifrode: è il tetto che impedisce a un client rotto (o dispettoso) di
   tenere occupato il processo. Finestra di un secondo, azzerata al cambio di finestra. */
export function allow(p, now, bytes) {
  if (bytes > MAX_MSG) return false;
  if (now - p.since >= 1000) { p.since = now; p.msgs = 0; }
  p.msgs++;
  return p.msgs <= MSG_PER_SEC;
}
