/* FOTO DI UNA SCHERMATA — per GUARDARE il risultato invece di indovinarlo.
 *
 * Serviva. Le schermate venivano consegnate senza che nessuno le avesse mai viste: i test
 * dicevano verde perché controllavano che i comandi ESISTESSERO, non che fossero messi bene.
 * Così sono passati tre salvataggi schiacciati fino a sparire, cinque riquadri di larghezze
 * diverse e tre taglie di pulsante nella stessa schermata — tutte cose che si vedono in un
 * secondo e che nessuna misura automatica aveva colto.
 *
 *   npm run shot                  → la schermata iniziale
 *   npm run shot -- settings      → le impostazioni
 *   npm run shot -- saves 390,844 → i salvataggi, su telefono
 *
 * Le viste sono quelle di splash.js: main · saves · stats · settings · trophies · changelog
 * · credits · account. La foto finisce in `.shots/<vista>.png`.
 *
 * Perché un server invece di aprire il file: da `file://` Chrome non carica i moduli ES e si
 * finisce per fotografare la pagina di avvio, senza stili — succede, e sembra che il CSS sia
 * rotto.
 */
import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SHOTS = join(ROOT, '.shots');
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(c => existsSync(c));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json' };

async function main() {
  const vista = process.argv[2] || 'main';
  const size = process.argv[3] || '900,1300';
  if (!CHROME) { console.error('foto: Chrome non trovato'); return 1; }
  if (!existsSync(join(DIST, 'index.html'))) { console.error('foto: manca dist/ — `npm run build`'); return 1; }
  mkdirSync(SHOTS, { recursive: true });

  /* la sonda apre la splash e va sulla vista chiesta: `splashView` è asincrona, quindi le si
     lascia il tempo di caricare il modulo prima dello scatto */
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  /* LA FOTO DICE A CHE LARGHEZZA È STATA SCATTATA, scritta in un angolo.
     Serve perché Chrome headless su macOS non scende sotto una certa larghezza di finestra:
     chiedendo 390 la pagina viene disegnata a 500 e lo screenshot RITAGLIA a 390. Il
     risultato sembra una schermata che sborda — e si passa mezz'ora a "riparare" un CSS che
     non ha niente che non va. Con la misura vera stampata sopra, l'inganno dura un secondo. */
  const probe = `<script>setTimeout(function(){
    var sp=document.getElementById('splash'); var G=window.__digsy||{};
    /* 'gioco' fotografa il gioco vero senza menu davanti: l'HUD e le scene si guardano solo
       così, e sono la parte che il giocatore vede per tutto il tempo */
    if (${JSON.stringify(vista)} === 'gioco') { if(sp) sp.classList.add('off'); }
    else {
      if(sp) sp.classList.remove('off');
      if(G.splashView) G.splashView(${JSON.stringify(vista)});
    }
    /* il badge è uno strumento di lavoro: con --pulito non si mette, perché queste foto
       finiscono anche nella vetrina e là un riquadro verde di debug stona parecchio */
    if (${JSON.stringify(process.argv.includes('--pulito'))}) return;
    var b=document.createElement('div');
    b.textContent = innerWidth + '×' + innerHeight + (innerWidth != ${JSON.stringify(size.split(',')[0])} ? '  (CHIESTO ${size.split(',')[0]}: Chrome non scende sotto ~500)' : '');
    b.style.cssText='position:fixed;left:0;bottom:0;z-index:99999;background:#000;color:#0f0;'
      + 'font:11px ui-monospace,monospace;padding:2px 6px;pointer-events:none';
    document.body.appendChild(b);
  }, 1200);</script>`;
  writeFileSync(join(DIST, '__shot.html'), html.replace('</body>', probe + '</body>'));

  const srv = createServer((req, res) => {
    const p = join(DIST, decodeURIComponent(req.url.split('?')[0]));
    /* si LEGGE prima di rispondere: scrivendo l'intestazione e fallendo dopo, il catch
       provava a scriverne una seconda e il server moriva sul primo file mancante */
    let body = null;
    try { body = readFileSync(p); } catch (e) { /* non c'è */ }
    if (!body) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const porta = srv.address().port;
  const dest = join(SHOTS, vista + '.png');
  /* SPAWN, non execFileSync: quello è SINCRONO e blocca l'event loop di Node, quindi il
     server qui sopra non risponderebbe a nessuna richiesta e Chrome resterebbe ad aspettare
     una pagina che non arriva mai — si torna con una cartella vuota e nessun errore. */
  await new Promise((risolvi) => {
    const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--user-data-dir=' + mkdtempSync(join(tmpdir(), 'digsy-shot-')),
      '--window-size=' + size, '--virtual-time-budget=6000',
      '--screenshot=' + dest, `http://127.0.0.1:${porta}/__shot.html`], { stdio: 'ignore' });
    const stacca = setTimeout(() => { try { ch.kill('SIGKILL'); } catch (e) {} risolvi(); }, 45000);
    ch.on('exit', () => { clearTimeout(stacca); risolvi(); });
  });
  srv.close();
  if (!existsSync(dest)) { console.error('foto: non è stata scritta'); return 1; }
  console.log('foto: ' + dest + '  (' + vista + ' · ' + size + ')');
  return 0;
}

process.exit(await main());
