/* RETE — protocollo e stato della stanza. MODULO PURO: niente WebSocket, niente DOM.
 *
 * Qui dentro c'è solo quello che si può provare senza rete: come sono fatti i messaggi, come
 * si leggono senza fidarsi, chi c'è nella stanza e dove sta in questo istante. Il trasporto
 * (la socket vera) si inietta da fuori — così la suite, che gira offline con uno stub del DOM,
 * fa girare queste righe a ogni `npm test` invece di lasciarle a un ramo mai eseguito
 * (REGOLA FERREA 9: un modulo che nessuno esegue è un crash che aspetta).
 *
 * DUE COSE CHE NON SI FANNO, e il perché:
 *
 * 1. NON CI SI FIDA DI QUELLO CHE ARRIVA. Dall'altra parte c'è il browser di un'altra persona,
 *    e `window.__digsy` è nel bundle di produzione: chiunque può mandare quello che vuole. Ogni
 *    messaggio in arrivo passa da `decode`, che scarta tutto ciò che non ha la forma giusta
 *    invece di lasciar entrare `undefined` nel gioco. Un messaggio malformato non deve poter
 *    spegnere la partita di chi lo riceve.
 *
 * 2. NON SI DISEGNA L'ULTIMA POSIZIONE ARRIVATA. I pacchetti arrivano una decina di volte al
 *    secondo, lo schermo disegna sessanta: mettere il personaggio dove dice l'ultimo pacchetto
 *    lo fa saltare da un punto all'altro. Si tiene un po' di storia e si guarda il mondo
 *    INDIETRO di `LAG` millisecondi, interpolando fra i due campioni che lo contengono. È il
 *    prezzo (un decimo di secondo di ritardo, invisibile) per vedere camminare invece che
 *    teletrasportarsi.
 */

export const PROTO = 1;          // versione del protocollo: due client diversi devono saperlo
export const LAG = 100;          // ms di ritardo su cui si interpola: sotto si vedono i buchi di rete
/* IL BATTITO DELLA LINEA. In mezzo fra il gioco e il centralino c'è Apache, che chiude le
   connessioni ferme da un minuto: senza dirsi niente ogni tanto, una partita in cui si sta
   leggendo il Libro cadrebbe da sola. Trenta secondi — metà del minuto — perché il battito
   deve arrivare anche se se ne perde uno.
   E una risposta si aspetta: se dopo DUE battiti non è tornato niente, la linea è morta
   comunque fosse — meglio accorgersene e riattaccare che restare a parlare da soli. */
export const PING_MS = 30000;
export const PONG_MAX = 60000;
export const SEND_HZ = 10;       // quante volte al secondo si dice dove si è
const KEEP = 1200;               // ms di storia tenuti per ogni compagno (oltre non serve a niente)
const MAX_PEERS = 8;             // una stanza è un salotto, non una piazza
export const MAX_CHAT = 140;     // caratteri: una riga detta a voce, non un tema

/* I TIPI DI MESSAGGIO. Nomi corti perché le posizioni viaggiano dieci volte al secondo, ma non
   tanto corti da non capirsi leggendo un registro di rete. */
export const T = {
  HELLO: 'hello',    // io → centralino: chi sono
  WELCOME: 'welcome',// centralino → io: il tuo identificativo
  JOIN: 'join',      // io → centralino: entro in questa stanza
  ROOM: 'room',      // centralino → io: chi c'è già
  ENTER: 'enter',    // centralino → tutti: è entrato qualcuno
  LEAVE: 'leave',    // centralino → tutti: è uscito qualcuno
  AT: 'at',          // dove sono (o dov'è un altro)
  MONDO: 'mondo',    // l'ospitante manda il suo mondo a chi entra (una volta sola, grosso)
  MUT: 'mut',        // una casella consumata: scavata, tagliata, spaccata, raccolta
  CLOCK: 'clock',    // l'orologio dell'ospitante: l'ospite non lo calcola, lo riceve
  CHAT: 'chat',      // una riga detta a voce alta nella stanza
  BYE: 'bye',        // esco di mia volontà
  KICK: 'kick',      // l'ospitante manda via qualcuno: è casa sua
  PING: 'ping',      // ci sono ancora (e la linea in mezzo è viva)
  PONG: 'pong',      // il centralino risponde: sì, ti sento
  SLEEP: 'sleep',    // vado a dormire / mi sveglio: gli altri devono saperlo
  DAWN: 'dawn',      // l'ospitante ha fatto passare la notte (o il giorno)
};

/* ---------- messaggi ---------- */

export function encode(t, data) { return JSON.stringify({ t, ...data }); }

/* Legge un messaggio SENZA FIDARSI: torna l'oggetto solo se ha la forma giusta, altrimenti
   null. Chi chiama non deve mai chiedersi se un campo esiste. */
export function decode(raw) {
  let m;
  try { m = JSON.parse(String(raw)); } catch (e) { return null; }
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') return null;
  const id = v => typeof v === 'string' && v.length > 0 && v.length <= 40;
  /* il NOME non si valida come un identificativo: uno lungo non è un messaggio malformato, è
     solo un nome lungo — si taglia e si va avanti. Rifiutarlo farebbe sparire la persona dalla
     stanza per colpa di un nickname chilometrico. */
  const nome = v => typeof v === 'string' && v.trim().length > 0;
  const num = v => typeof v === 'number' && Number.isFinite(v);
  switch (m.t) {
    case T.HELLO:
      return (num(m.v) && nome(m.name)) ? { t: m.t, v: m.v, name: m.name.slice(0, 20), look: cleanLook(m.look) } : null;
    case T.WELCOME:
      return id(m.id) ? { t: m.t, id: m.id } : null;
    case T.JOIN:
      return id(m.room) ? { t: m.t, room: m.room } : null;
    case T.ROOM: {
      if (!id(m.host) || !Array.isArray(m.peers)) return null;
      const peers = m.peers.filter(p => p && id(p.id) && nome(p.name)).slice(0, MAX_PEERS)
        .map(p => ({ id: p.id, name: String(p.name).slice(0, 20), look: cleanLook(p.look) }));
      return { t: m.t, host: m.host, peers };
    }
    case T.ENTER:
      return (id(m.id) && nome(m.name)) ? { t: m.t, id: m.id, name: m.name.slice(0, 20), look: cleanLook(m.look) } : null;
    case T.LEAVE:
      return id(m.id) ? { t: m.t, id: m.id } : null;
    case T.AT:
      /* `d` è il verso e `m` se sta camminando: senza, gli altri scivolerebbero con le gambe
         ferme — lo stesso difetto già visto sul giocatore locale. */
      return (num(m.x) && num(m.y)) ? {
        t: m.t, id: id(m.id) ? m.id : null,
        x: m.x, y: m.y,
        d: DIRS.includes(m.d) ? m.d : 'down',
        m: !!m.m,
        s: typeof m.s === 'string' ? m.s.slice(0, 12) : 'world',   // in quale scena: mondo, stanza, grotta
      } : null;
    case T.MONDO:
      /* il MONDO di un altro entra nel gioco: si pretende almeno che abbia un seme, o si
         resterebbe con mezzo mondo adottato e mezzo proprio */
      return (m.mondo && typeof m.mondo === 'object' && num(m.mondo.seed))
        ? { t: m.t, id: id(m.id) ? m.id : null, mondo: m.mondo, x: num(m.x) ? m.x : 0, y: num(m.y) ? m.y : 0 } : null;
    case T.MUT:
      return (MUTAZIONI.includes(m.k) && typeof m.c === 'string' && /^-?\d{1,7},-?\d{1,7}$/.test(m.c))
        ? { t: m.t, id: id(m.id) ? m.id : null, k: m.k, c: m.c } : null;
    case T.CLOCK:
      return (num(m.day) && num(m.tod)) ? { t: m.t, id: id(m.id) ? m.id : null, day: m.day, tod: m.tod } : null;
    case T.CHAT: {
      /* un messaggio di chat è testo di un'altra persona: si taglia, si ripuliscono i ritorni
         a capo (una nuvoletta di dieci righe coprirebbe lo schermo) e si scartano i vuoti */
      if (typeof m.m !== 'string') return null;
      const testo = m.m.replace(/[\r\n\t]+/g, ' ').trim().slice(0, MAX_CHAT);
      return testo ? { t: m.t, id: id(m.id) ? m.id : null, m: testo } : null;
    }
    case T.KICK:
      /* chi va mandato via. Il mittente lo scrive il CENTRALINO, non il client, quindi chi
         riceve può controllare che a mandarlo via sia davvero il padrone di casa. */
      return id(m.who) ? { t: m.t, id: id(m.id) ? m.id : null, who: m.who } : null;
    case T.PING: case T.PONG:
      return { t: m.t };
    case T.SLEEP:
      return { t: m.t, id: id(m.id) ? m.id : null, on: !!m.on };
    case T.DAWN:
      /* `notte` dice se è passata la NOTTE (alba del giorno dopo) o solo il giorno: serve a
         chi ha dormito per sapere cosa raccontare, non a decidere qualcosa */
      return { t: m.t, id: id(m.id) ? m.id : null, notte: !!m.notte };
    case T.BYE:
      return { t: m.t };
    default: return null;
  }
}
const DIRS = ['up', 'down', 'left', 'right'];
/* QUANTO IN FRETTA SI PUÒ ANDARE, al massimo. A piedi sono 92 px/s, e il mezzo più veloce
   triplica: 276. Il tetto qui è più del doppio, perché i pacchetti arrivano a mucchietti e un
   ritardo di rete fa sembrare velocissimo anche chi cammina. Sopra questo non c'è margine di
   dubbio: è un salto.
   E un salto NON è un'accusa — fra amici invitati non esiste un anti-cheat vero, e comunque
   `window.__digsy` è nel bundle di produzione (debito noto). Quello che si fa è smettere di
   far scivolare il personaggio attraverso mezza mappa (si azzera la storia: ricompare dov'è) e
   TENERNE IL CONTO, che l'ospitante vede accanto al nome. La decisione resta di chi ospita:
   è casa sua, e ha il pulsante per mandare via. */
export const MAX_VEL = 700;
/* le quattro cose che si consumano in un mondo. Una coordinata arriva come testo: si pretende
   che SIA una coordinata, o finirebbe come chiave in un insieme del gioco. */
export const MUTAZIONI = ['dug', 'chop', 'mine', 'pick'];

/* L'ASPETTO DEGLI ALTRI ARRIVA DALLA RETE e finisce nella palette: `applyLook` ci fa sopra dei
   conti (`shade` legge l'esadecimale con parseInt) e il disegno lo passa a `fillStyle`. Un
   colore inventato non fa esplodere niente — il canvas ignora quello che non capisce e tiene
   il precedente — ma ignorarlo in silenzio vuol dire un personaggio dipinto coi colori di chi
   è stato disegnato prima. Qui passa solo quello che ha la forma giusta: esadecimali per i
   colori, parole corte per le forme. Il resto cade, e si vede il Digsy di serie. */
const COLORI = ['hat', 'shirt', 'pants', 'skin', 'hairColor', 'eyeColor', 'beardColor', 'glassesColor'];
const FORME = ['hairStyle', 'hatStyle', 'shirtStyle', 'pantsStyle', 'beardStyle', 'glassesStyle'];
const HEX = /^#[0-9a-f]{6}$/i;
export function cleanLook(look) {
  if (!look || typeof look !== 'object') return null;
  const out = {};
  for (const k of COLORI) if (HEX.test(look[k])) out[k] = look[k];
  for (const k of FORME) if (typeof look[k] === 'string' && /^[a-z]{2,16}$/i.test(look[k])) out[k] = look[k];
  return Object.keys(out).length ? out : null;
}

/* ---------- chi c'è, e dove ---------- */

/* Un compagno di stanza. `buf` è la storia recente delle sue posizioni: si tiene perché
   l'interpolazione ha bisogno dei due campioni ATTORNO all'istante che si vuole disegnare. */
function makePeer(id, name, look) {
  return { id, name, look, buf: [], scene: 'world', x: 0, y: 0, dir: 'down', moving: false, anim: 0, salti: 0, dorme: false };
}

export function makeRoom() {
  return { me: null, host: null, name: null, peers: new Map(), joined: false };
}

/* Un messaggio già decodificato entra qui e cambia lo stato della stanza. Tornare il tipo
   trattato serve a chi guarda (l'interfaccia: "è entrato Luca"). */
export function applyMessage(room, m, now = 0) {
  if (!m) return null;
  switch (m.t) {
    case T.WELCOME: room.me = m.id; return m.t;
    case T.ROOM:
      room.host = m.host; room.joined = true;
      room.peers.clear();
      for (const p of m.peers) if (p.id !== room.me) room.peers.set(p.id, makePeer(p.id, p.name, p.look));
      return m.t;
    case T.ENTER:
      if (m.id !== room.me && room.peers.size < MAX_PEERS) room.peers.set(m.id, makePeer(m.id, m.name, m.look));
      return m.t;
    case T.LEAVE: room.peers.delete(m.id); return m.t;
    case T.SLEEP: {
      const p = room.peers.get(m.id); if (!p) return null;
      p.dorme = m.on; return m.t;
    }
    case T.AT: {
      if (!m.id || m.id === room.me) return null;
      const p = room.peers.get(m.id); if (!p) return null;      // uno che non è nella stanza non esiste
      /* plausibilità: solo DENTRO la stessa scena. Cambiare scena è un salto legittimo — una
         porta, un imbocco di grotta, il ritorno a casa propria — e contarlo come sospetto
         segnalerebbe chiunque entri in un negozio. */
      const ult = p.buf[p.buf.length - 1];
      if (ult && ult.s === m.s) {
        const dt = Math.max(1, now - ult.t) / 1000;
        if (Math.hypot(m.x - ult.x, m.y - ult.y) / dt > MAX_VEL) { p.salti = (p.salti || 0) + 1; p.buf.length = 0; }
      }
      p.buf.push({ t: now, x: m.x, y: m.y, d: m.d, m: m.m, s: m.s });
      /* la storia si pota QUI e non altrove: se la potatura dipendesse dal disegno, una scheda
         in secondo piano (che non disegna) accumulerebbe posizioni per tutto il tempo. */
      while (p.buf.length > 2 && now - p.buf[0].t > KEEP) p.buf.shift();
      return m.t;
    }
    default: return m.t;
  }
}

/* DOVE DISEGNARE un compagno adesso: si guarda `LAG` ms nel passato e si interpola fra i due
   campioni che contengono quell'istante. Se la rete è ferma da un po' si resta sull'ultimo
   noto (fermo è meglio che estrapolato: un personaggio che prosegue da solo e poi torna
   indietro è peggio di uno che aspetta).
   Torna null finché non si sa niente di lui. */
export function peerAt(p, now, lag = LAG) {
  if (!p || !p.buf.length) return null;
  const when = now - lag;
  const b = p.buf;
  if (when <= b[0].t) return sample(b[0]);
  const last = b[b.length - 1];
  if (when >= last.t) return sample(last);
  for (let i = b.length - 1; i > 0; i--) {
    const a = b[i - 1], c = b[i];
    if (when >= a.t && when <= c.t) {
      const span = c.t - a.t;
      const k = span > 0 ? (when - a.t) / span : 1;
      return {
        x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k,
        dir: c.d, moving: c.m || a.m, scene: c.s,
      };
    }
  }
  return sample(last);
}
function sample(s) { return { x: s.x, y: s.y, dir: s.d, moving: s.m, scene: s.s }; }

/* QUANDO DIRE DOVE SI È. Non a ogni fotogramma (sarebbe sei volte il necessario) e non solo a
   tempo: se si è fermi non c'è niente da dire, e un pacchetto ogni decimo di secondo per
   qualcuno che sta leggendo il Libro è traffico buttato. Si parla se ci si è mossi davvero,
   più un battito lento per dire "ci sono ancora". */
export function shouldSend(state, now, x, y, dir, moving) {
  /* `?? ` e non `|| `: il primo messaggio parte all'istante 0, e `0 || -1e9` vale -1e9 — con
     l'oppure si credeva che fosse passato un miliardo di millisecondi dall'ultimo invio e si
     parlava a ogni fotogramma. Preso da un test, non a occhio: da fuori si vedeva solo un po'
     più di traffico. */
  const dt = now - (state.lastAt ?? -1e9);
  if (dt < 1000 / SEND_HZ) return false;
  const mosso = Math.abs(x - (state.lastX ?? 0)) > 0.5 || Math.abs(y - (state.lastY ?? 0)) > 0.5;
  if (mosso || dir !== state.lastDir || moving !== state.lastMoving) return true;
  return dt > 1000;                                   // battito: fermo, ma vivo
}
export function markSent(state, now, x, y, dir, moving) {
  state.lastAt = now; state.lastX = x; state.lastY = y; state.lastDir = dir; state.lastMoving = moving;
}
