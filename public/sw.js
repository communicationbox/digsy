/* IL GIOCO SI INSTALLA E FUNZIONA SENZA RETE.
 *
 * Con questo file `digsy.dev-box.it` diventa un'app: icona sulla schermata, niente barra del
 * browser, e si gioca anche in metropolitana. Il mondo è procedurale e il salvataggio sta nel
 * dispositivo — l'unica cosa per cui serve la rete è la partita in cloud.
 *
 * LA REGOLA CHE CONTA: NESSUNO DEVE RESTARE SU UNA VERSIONE VECCHIA.
 * Stamattina è successo esattamente questo — il browser teneva l'HTML in cache e continuava a
 * caricare un gioco di ore prima, mentre sul server c'era la versione nuova. Un service worker
 * scritto male fa la stessa cosa, ma peggio: dura per sempre e non basta ricaricare.
 * Quindi due comportamenti diversi, decisi da COSA si sta chiedendo:
 *
 *   index.html   → si chiede SEMPRE alla rete, la copia serve solo se la rete non c'è.
 *                  È il file che dice quali js/css caricare: se resta indietro lui, resta
 *                  indietro tutto.
 *   assets/…     → hanno l'HASH nel nome (index-9h9LF6nW.js): un contenuto diverso ha un
 *                  indirizzo diverso, quindi la copia va bene per sempre.
 *   l'API        → mai in cache: risponde chi sei e cosa hai salvato.
 *
 * Alla pubblicazione successiva cambia il nome della cache, e quella vecchia viene buttata.
 */

const VERSIONE = 'digsy-v1';
const CACHE = VERSIONE;

/* Il minimo per far partire il gioco senza rete. Gli asset veri (js/css con hash) si
   aggiungono da soli man mano che vengono chiesti: elencarli qui vorrebbe dire riscrivere
   questo file a ogni build. */
/* percorsi RELATIVI (./): il service worker resta legato a dove è servito, senza legarsi a un
   percorso assoluto fisso. Il gioco vive alla RADICE. */
const ESSENZIALI = [
  './', './index.html', './manifest.webmanifest',
  './favicon.svg', './icon.svg', './icon-192.png', './icon-512.png',
];

self.addEventListener('install', (e) => {
  /* `skipWaiting`: la versione nuova prende il posto della vecchia subito, senza aspettare
     che si chiudano tutte le schede. Su un gioco è quello che si vuole — nessuno tiene
     aperte due partite e si aspetta che una resti indietro. */
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESSENZIALI)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    /* via le cache delle versioni precedenti: senza, restano lì a occupare spazio per sempre */
    const nomi = await caches.keys();
    await Promise.all(nomi.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // salvataggi e accessi: mai toccati

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // Google e affini: non ci riguardano
  if (url.pathname.includes('/server/')) return;          // l'API risponde dati personali

  /* gli asset con l'hash nel nome sono immutabili: se ce l'abbiamo, è quello giusto */
  const immutabile = /\/assets\/.+\.(js|css)$/.test(url.pathname)
    || /\.(png|svg|woff2?)$/.test(url.pathname);

  if (immutabile) {
    e.respondWith((async () => {
      const copia = await caches.match(req);
      if (copia) return copia;
      const res = await fetch(req);
      if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
    return;
  }

  /* tutto il resto — l'HTML per primo — si chiede alla rete. La copia è la RETE DI SICUREZZA
     per quando la rete non c'è, non la prima scelta: è la differenza fra un gioco che si
     aggiorna e uno che resta fermo a mesi fa. */
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch (err) {
      const copia = await caches.match(req);
      if (copia) return copia;
      /* senza rete e senza copia: se stavano chiedendo una pagina, si dà il gioco */
      if (req.mode === 'navigate') {
        const home = await caches.match('./index.html');
        if (home) return home;
      }
      throw err;
    }
  })());
});

/* la pagina può chiedere di passare subito alla versione nuova (lo fa "Aggiorna il gioco") */
self.addEventListener('message', (e) => {
  if (e.data === 'aggiorna') self.skipWaiting();
});
