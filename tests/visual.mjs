/* IMPRONTA VISIVA — la rete di sicurezza per toccare il CSS.
 *
 * Convertire novecento righe di stili ai token del design system è un lavoro meccanico e
 * quindi pericoloso: basta una sostituzione sbagliata su un colore usato in ventinove punti
 * e un pannello cambia tinta senza che nessun test se ne accorga — i test misurano posizioni
 * e contrasti, non "questo era beige e adesso è grigio".
 *
 * Questo strumento apre il gioco vero in Chrome, gira tutte le schermate, e per ogni elemento
 * visibile registra COME È FATTO: colore, sfondo, bordi, testo, spaziature, ombre. Il
 * risultato è un'impronta confrontabile.
 *
 *   node tests/visual.mjs --save    → scrive l'impronta di riferimento
 *   node tests/visual.mjs           → confronta con quella salvata e ELENCA le differenze
 *
 * Così una conversione ai token si può dimostrare INVARIANTE: stessi pixel, codice migliore.
 * Se una differenza è voluta, si rilancia --save e la si mette agli atti nel commit.
 */
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const REF = join(ROOT, 'tests', 'visual-ref.json');
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(c => existsSync(c));

/* Le proprietà che raccontano l'ASPETTO. Non si prendono le posizioni: quelle cambiano con
   la larghezza della finestra e le controllano già gli e2e. */
const PROPS = ['color', 'background-color', 'border-top-color', 'border-top-width',
  'border-radius', 'font-size', 'font-weight', 'letter-spacing', 'line-height',
  'padding-top', 'padding-left', 'margin-top', 'box-shadow', 'opacity'];

const PROBE = `
(function(){
  var out = {};
  var done = false;
  setTimeout(function(){ if(!done) finish(); }, 9000);

  function chiave(el){
    /* un nome stabile: tag + id + classi, così l'impronta si legge e si confronta */
    var c = (el.className && el.className.baseVal !== undefined) ? el.className.baseVal : (el.className || '');
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
      (c ? '.' + String(c).trim().split(/\\s+/).join('.') : '');
  }
  function raccogli(dove){
    var tutti = document.querySelectorAll('#splash *, #hud *, .sheet *, #bagov *, #bookov *, #mapov *, .modal *');
    for (var i = 0; i < tutti.length; i++) {
      var el = tutti[i];
      var r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) continue;      // invisibile: non racconta niente
      var st = getComputedStyle(el);
      var k = dove + ' ' + chiave(el);
      if (out[k]) continue;                              // il primo di ogni tipo basta
      var v = {};
      ${JSON.stringify(PROPS)}.forEach(function(p){ v[p] = st.getPropertyValue(p); });
      out[k] = v;
    }
  }

  var G = window.__digsy || {};
  var sp = document.getElementById('splash');
  var viste = ['main','saves','stats','settings','trophies','changelog','credits','account'];
  var vi = 0;

  function giroSplash(){
    if (!sp || !G.splashView) return giroOverlay();
    sp.classList.remove('off');
    var passo = function(){
      if (vi >= viste.length) { sp.classList.add('off'); return giroOverlay(); }
      var v = viste[vi++];
      G.splashView(v);
      setTimeout(function(){ raccogli('splash/' + v); passo(); }, 90);
    };
    passo();
  }

  function giroOverlay(){
    raccogli('gioco');
    var apri = [['bag', G.openBag, G.closeBag], ['book', G.openBook, G.closeBook],
                ['map', G.openMap, G.closeMap], ['guide', G.openGuide, G.closeModal],
                ['achievements', G.openAchievements, G.closeModal]];
    var i = 0;
    var passo = function(){
      if (i >= apri.length) return finish();
      var a = apri[i++];
      if (typeof a[1] !== 'function') return passo();
      try { a[1](); } catch (e) { return passo(); }
      setTimeout(function(){
        raccogli(a[0]);
        try { if (typeof a[2] === 'function') a[2](); } catch (e) {}
        setTimeout(passo, 60);
      }, 140);
    };
    passo();
  }

  function finish(){
    if (done) return; done = true;
    var el = document.getElementById('R2');
    var s = '__VIS__' + JSON.stringify(out) + '__END__';
    el.textContent = s;
    el.setAttribute('data-res', s);
  }
  giroSplash();
})();
`;

function pagina() {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  return html.replace('</body>',
    `<pre id="R2"></pre><script>setTimeout(function(){${PROBE}}, 1200);</script></body>`);
}

/* Serve un server: da `file://` Chrome non carica i moduli ES e si fotograferebbe la pagina
   di avvio. E serve SPAWN, non execFileSync: quello blocca l'event loop di Node, quindi il
   server non risponderebbe e Chrome resterebbe ad aspettare per sempre. */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json' };

async function raccogli(size) {
  writeFileSync(join(DIST, '__vis.html'), pagina());
  const srv = createServer((req, res) => {
    const p = join(DIST, decodeURIComponent(req.url.split('?')[0]));
    let body = null;
    try { body = readFileSync(p); } catch (e) { /* non c'è */ }
    if (!body) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const porta = srv.address().port;
  let dom = '';
  await new Promise((risolvi) => {
    const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--user-data-dir=' + mkdtempSync(join(tmpdir(), 'digsy-vis-')),
      '--window-size=' + size, '--virtual-time-budget=20000', '--dump-dom',
      `http://127.0.0.1:${porta}/__vis.html`], { stdio: ['ignore', 'pipe', 'ignore'] });
    ch.stdout.on('data', d => { dom += d; });
    const stacca = setTimeout(() => { try { ch.kill('SIGKILL'); } catch (e) {} risolvi(); }, 90000);
    ch.on('exit', () => { clearTimeout(stacca); risolvi(); });
  });
  srv.close();
  const m = /__VIS__([\s\S]*?)__END__/.exec(dom.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

async function main() {
  if (!CHROME) { console.error('impronta visiva: Chrome non trovato'); return 1; }
  if (!existsSync(join(DIST, 'index.html'))) { console.error('impronta visiva: manca dist/ — `npm run build`'); return 1; }
  const salva = process.argv.includes('--save');
  const dati = {};
  for (const [nome, size] of [['telefono', '390,844'], ['computer', '1440,900']]) {
    const r = await raccogli(size);
    if (!r) { console.error('impronta visiva: nessun risultato su ' + nome); return 1; }
    dati[nome] = r;
  }

  if (salva) {
    writeFileSync(REF, JSON.stringify(dati, null, 1));
    const n = Object.values(dati).reduce((a, o) => a + Object.keys(o).length, 0);
    console.log('impronta salvata: ' + n + ' elementi su ' + Object.keys(dati).length + ' schermi');
    return 0;
  }

  if (!existsSync(REF)) { console.error('impronta visiva: manca il riferimento — lancia `--save`'); return 1; }
  const rif = JSON.parse(readFileSync(REF, 'utf8'));
  const diff = [];
  for (const schermo of Object.keys(rif)) {
    const a = rif[schermo], b = dati[schermo] || {};
    for (const k of Object.keys(a)) {
      if (!b[k]) { diff.push(schermo + ' · ' + k + ' → SPARITO'); continue; }
      for (const p of Object.keys(a[k])) {
        if (a[k][p] !== b[k][p]) diff.push(schermo + ' · ' + k + ' · ' + p + ': ' + a[k][p] + ' → ' + b[k][p]);
      }
    }
    for (const k of Object.keys(b)) if (!a[k]) diff.push(schermo + ' · ' + k + ' → NUOVO');
  }

  const tot = Object.values(rif).reduce((a, o) => a + Object.keys(o).length, 0);
  if (!diff.length) { console.log('impronta visiva: identica (' + tot + ' elementi)'); return 0; }
  console.log('impronta visiva: ' + diff.length + ' differenze su ' + tot + ' elementi\n');
  for (const d of diff.slice(0, 60)) console.log('  ' + d);
  if (diff.length > 60) console.log('  … e altre ' + (diff.length - 60));
  return 1;
}

process.exit(await main());
