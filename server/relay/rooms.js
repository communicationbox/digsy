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
/* DUE TETTI, non uno. Le posizioni sono minuscole e frequenti; il MONDO che si spedisce a chi
   entra è grosso e parte una volta sola (seme, caselle scavate, mappa esplorata). Contare solo
   i messaggi lascerebbe passare quaranta mondi al secondo; contare solo i byte non fermerebbe
   una raffica di pacchetti vuoti. Quindi: quanti messaggi, e quanti byte in tutto. */
export const MAX_MSG = 256 * 1024;     // byte: tetto assoluto per un singolo messaggio (un mondo ci sta)
export const BYTE_PER_SEC = 400 * 1024; // e comunque non più di così al secondo, in totale

export function makeHub() { return { rooms: new Map(), peers: new Map() }; }

/* Un collegamento nuovo. `send` è la funzione che sa scrivere su QUELLA socket: il centralino
   non sa come, sa solo a chi. */
export function addPeer(hub, id, name, send) {
  const p = { id, name: String(name || 'Digsy').slice(0, 20), send, room: null, look: null,
    codice: null, guarda: new Set(), msgs: 0, bytes: 0, since: 0 };
  hub.peers.set(id, p);
  return p;
}

/* ---------- CHI C'È, E CHI LO VUOLE SAPERE ----------
   Il centralino non conosce le regole del gioco e non deve impararle, ma una cosa la sa per
   forza: chi è collegato. Da lì, e solo da lì, discendono le due cose che servono per invitare
   una persona invece di darle un codice da ribattere — il pallino verde accanto al nome, e un
   invito che ARRIVA. Non è memoria: nessuno tiene un elenco di amicizie. Ognuno dichiara il
   suo codice quando si presenta, e dice quali codici gli interessano; il centralino risponde
   chi di quelli è in linea adesso, e avvisa quando cambia. Chiusa la connessione, sparisce. */
export function setCodice(hub, id, codice) {
  const p = hub.peers.get(id); if (!p) return false;
  const c = String(codice || '').toUpperCase().slice(0, 20);
  p.codice = /^[A-Z0-9]{4,20}$/.test(c) ? c : null;
  return !!p.codice;
}
export function guarda(hub, id, codici) {
  const p = hub.peers.get(id); if (!p) return [];
  p.guarda = new Set((Array.isArray(codici) ? codici : []).slice(0, MAX_AMICI)
    .map(x => String(x || '').toUpperCase().slice(0, 20)).filter(Boolean));
  return inLinea(hub, [...p.guarda]);
}
export const MAX_AMICI = 50;        // quanti codici si possono tenere d'occhio: una rubrica, non un elenco telefonico
/* quali di questi codici sono collegati in questo momento */
export function inLinea(hub, codici) {
  const vivi = new Set();
  for (const p of hub.peers.values()) if (p.codice) vivi.add(p.codice);
  return (codici || []).filter(c => vivi.has(c));
}
/* le connessioni di una persona (può averne due: telefono e computer) */
export function perCodice(hub, codice) {
  const c = String(codice || '').toUpperCase();
  return [...hub.peers.values()].filter(p => p.codice === c);
}
/* chi sta guardando questo codice: a loro va detto quando compare o sparisce */
export function chiGuarda(hub, codice) {
  const c = String(codice || '').toUpperCase();
  return [...hub.peers.values()].filter(p => p.guarda && p.guarda.has(c));
}

/* Entra in una stanza. Chi la apre per primo ne è l'OSPITANTE, e resta tale finché c'è:
   il mondo è il suo, quindi non si passa la mano a metà partita. */
export function join(hub, id, roomName, ospite) {
  const p = hub.peers.get(id); if (!p) return { error: 'ignoto' };
  if (p.room) leave(hub, id);
  const key = String(roomName || '').slice(0, 40);
  if (!key) return { error: 'stanza senza nome' };
  let r = hub.rooms.get(key);
  const prima = r ? r.host : undefined;
  if (!r) {
    if (hub.rooms.size >= MAX_ROOMS) return { error: 'centralino pieno' };
    /* CHI ENTRA COME OSPITE NON DIVENTA PADRONE DI CASA. Prima era ospitante chi arrivava per
       primo, punto: due amici che si aspettavano a vicenda non si incontravano MAI — ognuno
       entrava nella stanza dell'altro, la trovava vuota e ne diventava il padrone (o, dopo,
       ne veniva buttato fuori). Una stanza può esistere SENZA ospitante: è una sala d'attesa,
       e diventa un mondo quando arriva quello di cui porta il codice. */
    r = { key, host: ospite ? null : id, peers: new Set() };
    hub.rooms.set(key, r);
  } else if (r.host === null && !ospite) {
    r.host = id;                       // arriva il padrone di casa: adesso la stanza è un mondo
  }
  if (r.peers.size >= MAX_PEERS) return { error: 'stanza piena' };
  r.peers.add(id); p.room = key;
  return { room: r, host: r.host, peers: [...r.peers].map(x => hub.peers.get(x)).filter(Boolean),
    /* l'ospitante è appena cambiato: chi stava aspettando deve saperlo */
    nuovoHost: prima === null && r.host === id };
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
  if (now - p.since >= 1000) { p.since = now; p.msgs = 0; p.bytes = 0; }
  p.msgs++; p.bytes = (p.bytes || 0) + bytes;
  return p.msgs <= MSG_PER_SEC && p.bytes <= BYTE_PER_SEC;
}
