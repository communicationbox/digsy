/* DA DOVE ARRIVANO I NUMERI DEI GIOCATORI.
 *
 * Il battito e gli schianti sono due file JSON sul server (`server/data/*.json`, fuori dalla
 * cartella pubblica: non si scaricano dal web, si leggono via SSH). Questo modulo è l'UNICO
 * posto che sa come prenderli e ridurli a numeri: lo usano sia `npm run tester` (il racconto
 * a riga di comando) sia la pagina `/stats`, che vive solo in locale con `npm run dev`.
 *
 * Due lettori separati vorrebbero dire due conteggi che col tempo divergono, e due verità
 * sulla stessa domanda ("quanti hanno smesso entro 5 minuti?") sono peggio di nessuna.
 */
import { execFileSync } from 'node:child_process';

const HOST = 'digsy';
const DATI = '/var/www/digsy.dev-box.it/httpdocs/server/data';
/* la stessa connessione già aperta da `dbssh.sh up`: qui non si chiede mai una password
   (ControlMaster=no + ControlPath = si aggancia al multiplexing, non ne apre uno nuovo) */
const MUX = `/tmp/dbssh-mux-${process.getuid()}-%C`;

export const ssh = (cmd) => {
  try {
    return execFileSync('ssh', ['-o', 'ControlMaster=no', '-o', `ControlPath=${MUX}`, HOST, cmd],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 8 * 1024 * 1024 });
  } catch (e) { return ''; }
};

const leggiJson = (nome) => {
  let o = {};
  try { o = JSON.parse(ssh(`cat ${DATI}/${nome} 2>/dev/null`) || '{}'); } catch (e) { /* file rotto o assente */ }
  return o && typeof o === 'object' ? o : {};
};

/* le righe grezze, una per giocatore, dalla più recente */
export function righeBattito() {
  return Object.values(leggiJson('battito.json')).sort((a, b) => b.ts - a.ts);
}

/* gli schianti raggruppati per messaggio, dall'ultimo visto */
export function righeErrori() {
  return Object.values(leggiJson('oops.json')).sort((a, b) => b.ultimo - a.ultimo);
}

/* I CONTI, UNA VOLTA SOLA. Chi disegna (terminale o pagina) decide solo come mostrarli.
   `ora` si passa da fuori per poter provare il calcolo senza dipendere dall'orologio. */
export function riassunto(righe, ora = Date.now() / 1000) {
  const n = righe.length;
  if (!n) return { n: 0, attivi: 0, oggi: 0, max: 0, mediana: 0, subito: 0, tornati: 0,
    perGiorno: [], perVersione: [], perMinuti: [], tel: 0, app: 0, lvl: 0, spec: 0 };

  const minuti = righe.map(r => r.min || 0).sort((a, b) => a - b);
  const conta = (chiave) => {
    const m = new Map();
    for (const r of righe) { const k = chiave(r); m.set(k, (m.get(k) || 0) + 1); }
    return m;
  };
  /* le fasce di durata dicono una cosa che la mediana nasconde: se la gente molla SUBITO o
     si divide fra chi assaggia e chi ci passa la sera */
  const FASCE = [[0, 5, 'meno di 5 min'], [5, 15, '5 – 15 min'], [15, 30, '15 – 30 min'],
    [30, 60, '30 – 60 min'], [60, 120, '1 – 2 ore'], [120, Infinity, 'più di 2 ore']];

  return {
    n,
    attivi: righe.filter(r => ora - r.ts < 600).length,     // battito negli ultimi 10 minuti
    oggi: righe.filter(r => ora - r.ts < 86400).length,
    max: minuti[n - 1],
    mediana: minuti[Math.floor(n / 2)],
    subito: righe.filter(r => (r.min || 0) < 5).length,     // il numero da tenere d'occhio
    tornati: righe.filter(r => (r.sessioni || 1) > 1).length,
    perGiorno: [...conta(r => r.day || 1)].map(([k, v]) => ({ k: Number(k), v })).sort((a, b) => a.k - b.k),
    perVersione: [...conta(r => r.ver || '?')].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v),
    perMinuti: FASCE.map(([a, b, et]) => ({ k: et, v: righe.filter(r => (r.min || 0) >= a && (r.min || 0) < b).length })),
    tel: righe.filter(r => r.tocco).length,
    app: righe.filter(r => r.app).length,
    lvl: Math.max(...righe.map(r => r.lvl || 1)),
    spec: Math.max(...righe.map(r => r.spec || 0)),
  };
}

/* tutto quello che serve alla pagina, in una chiamata sola */
export function quadro() {
  const righe = righeBattito();
  return { ora: Math.round(Date.now() / 1000), righe, errori: righeErrori(), som: riassunto(righe) };
}
