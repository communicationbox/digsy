/* DIAGNOSI SUL POSTO — il comando `fps` della console.
   «Dopo un po' non va più fluido quando mi muovo»: sulle nostre macchine di prova non si riproduce
   (tests/durata.mjs), quindi la misura va presa LÌ, nel momento in cui succede, sul computer di chi
   gioca. Per 3 secondi si registra ogni fotogramma del ciclo vero: l'intervallo (quello che l'occhio
   sente), il lavoro del gioco dentro il fotogramma (quello che dipende da noi), quanto ci si è mossi,
   e poi memoria, guardia delle cache e dimensione delle cache del mondo. Se l'intervallo è brutto e
   il lavoro è basso, il tempo si perde FUORI dal gioco (browser, raccoglitore, altre schede). */
export const DIAG = { on: false, lav: [], guardia: null };

/* il ciclo di main.js registra qui quanto è durato il suo lavoro, solo mentre si misura */
export function diagLavoro(ms) { if (DIAG.on) DIAG.lav.push(ms); }

const mediana = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; };
const p95 = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length * 0.95)] : 0; };

/* `leggi()` → { moving, cache } al momento; `fine(testo)` riceve il resoconto già scritto.
   `tr` passato da chi chiama (i18n). Restituisce false se una misura è già in corso. */
export function misuraFps(leggi, fine, tr, durata = 3000) {
  if (DIAG.on || typeof requestAnimationFrame !== 'function' || typeof performance === 'undefined') return false;
  DIAG.on = true; DIAG.lav = [];
  const iv = [];
  let prima = 0, mossi = 0, n = 0;
  const t0 = performance.now();
  const giro = t => {
    if (prima) { iv.push(t - prima); n++; if (leggi().moving) mossi++; }
    prima = t;
    if (performance.now() - t0 < durata) { requestAnimationFrame(giro); return; }
    DIAG.on = false;
    const sec = (performance.now() - t0) / 1000, lenti = iv.filter(x => x > 25), st = leggi();
    const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : tr('n/d', 'n/a');
    const c = st.cache || {};
    fine([
      '🐞 ' + tr('Misura di ', 'Measured over ') + sec.toFixed(1) + ' s' + (n ? ' · ' + tr('in movimento ', 'moving ') + Math.round(mossi / n * 100) + '%' : ''),
      'fps ' + (n / sec).toFixed(0) + ' · ' + tr('intervallo ', 'interval ') + mediana(iv).toFixed(1) + '/' + p95(iv).toFixed(1) + ' ms (' + tr('mediana/95%', 'median/95%') + ')',
      tr('strappi oltre 25 ms: ', 'hitches over 25 ms: ') + lenti.length + (lenti.length ? ' (max ' + Math.max(...lenti).toFixed(0) + ' ms)' : ''),
      tr('lavoro del gioco: ', 'game work: ') + mediana(DIAG.lav).toFixed(1) + '/' + p95(DIAG.lav).toFixed(1) + ' ms · max ' + (DIAG.lav.length ? Math.max(...DIAG.lav).toFixed(0) : 0) + ' ms',
      tr('memoria ', 'memory ') + mem + ' · cache ' + (DIAG.guardia && DIAG.guardia.on === false ? tr('SPENTE', 'OFF') : tr('accese', 'on')),
      tr('caselle in memoria: ', 'tiles in memory: ') + [c.terr, c.deco, c.ti, c.cave, c.pick].map(v => v == null ? '-' : v).join('/'),
    ].join('\n'));
  };
  requestAnimationFrame(giro);
  return true;
}
