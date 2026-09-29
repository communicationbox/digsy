/* PROVA DI DURATA — il gioco lasciato acceso a lungo, camminando.
 * Nata da «dopo un po' che sta acceso non va più fluido quando mi muovo; le altre animazioni
 * sono fluide». `npm run perf` misura una scena per pochi secondi a cache calde: un difetto che
 * CRESCE col tempo lì non si vede. Qui si cammina davvero (tasti tenuti, direzione che cambia,
 * così si scopre mondo nuovo) per MINUTI e si registra ogni fotogramma del ciclo vero: per
 * ogni tratto di cammino quanti fotogrammi, quanti strappi (>25 ms) e quanta memoria. In più si segna
 * quando parte un salvataggio, per vedere se gli strappi gli cadono addosso.
 *
 *   npm run build && node tests/durata.mjs            → 4 minuti
 *   DURATA_MIN=10 node tests/durata.mjs               → quanti minuti
 *   DURATA_SFONDO=1 node tests/durata.mjs             → a metà la scheda va in background per 30 s
 * Playwright come in perf.mjs (non è una dipendenza). */
let chromium;
{
  const { readdirSync, existsSync: ex } = await import('node:fs');
  const cache = (process.env.HOME || '') + '/.npm/_npx';
  const cand = [process.env.PLAYWRIGHT_PATH, 'playwright'];
  try { for (const d of readdirSync(cache)) { const f = `${cache}/${d}/node_modules/playwright/index.mjs`; if (ex(f)) cand.push(f); } } catch (e) { /* no */ }
  for (const c of cand.filter(Boolean)) { try { ({ chromium } = await import(c)); break; } catch (e) { /* next */ } }
  if (!chromium) { console.error('durata: Playwright non trovato'); process.exit(1); }
}
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIN = +(process.env.DURATA_MIN || 4);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = join(ROOT + 'dist', p);
  if (!existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => existsSync(p));
const browser = await chromium.launch({ ...(CHROME ? { executablePath: CHROME } : {}), headless: true, args: ['--mute-audio', '--enable-precise-memory-info'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
/* il registro sta nella pagina PRIMA del gioco: ogni fotogramma del ciclo vero e ogni salvataggio */
await page.addInitScript(() => {
  const R = window.__durata = { f: [], salvi: [], lav: [] };
  const raf = window.requestAnimationFrame.bind(window);
  /* il LAVORO di ogni fotogramma (quanto dura il ciclo del gioco), non solo l'intervallo: col
     vsync l'intervallo resta 16,7 finché il lavoro ci sta dentro, e un costo che cresce si vede
     prima qui che negli fps */
  window.requestAnimationFrame = cb => raf(t => { const a = performance.now(); cb(t); R.lav.push([t, performance.now() - a]); });
  let prima = 0;
  const giro = t => { if (prima) R.f.push([t, t - prima]); prima = t; raf(giro); };
  raf(giro);
  const set = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    const a = performance.now(); const r = set.call(this, k, v);
    if (String(k).startsWith('ossa_world')) R.salvi.push([a, performance.now() - a, String(v).length]);
    return r;
  };
});
await page.goto(`${BASE}/index.html?nosplash&seed=777`);
await page.waitForFunction(() => window.__digsy && window.__digsy.cmd, null, { timeout: 20000 }).catch(() => {});
await page.evaluate(() => { const sp = document.getElementById('splash'); if (sp) { sp.classList.add('off'); sp.style.display = 'none'; } });
await page.waitForTimeout(500);
if (await page.$('#lookDone')) { await page.click('#lookDone').catch(() => {}); await page.waitForTimeout(600); }
for (let k = 0; k < 3; k++) { const sk = await page.$('#introskip'); if (sk && await sk.isVisible()) { await sk.click().catch(() => {}); await page.waitForTimeout(600); } }
await page.evaluate(async () => {
  const G = window.__digsy; if (G.closeModal) G.closeModal(true);
  try { G.state().tut = { i: 99, n: 0, done: true, fatto: true }; } catch (e) { /* no */ }
  await G.leaveRoom(); await G.cmd('goto=prati');
  /* un compagno, come in una partita vera: è lui la cosa che si muove insieme a te */
  try { await G.cmd('companion=terra'); } catch (e) { /* no */ }
  /* IN BICI (DURATA_PIEDI=1 a piedi): si scopre mondo tre volte più in fretta, ed è anche il caso segnalato */
  if (!window.__durataPiedi) { const S = G.state(); S.tools.bike = true; S.gear = 'bike'; }
  /* dopo il teletrasporto può aprirsi una finestra (lettera, benvenuto): con una modale aperta non si cammina */
  if (G.closeModal) G.closeModal(true);
});
const cdp = await ctx.newCDPSession(page);
/* DURATA_CPU=4: la CPU rallentata come un portatile carico o un telefono (di serie 1) */
if (+process.env.DURATA_CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.DURATA_CPU });
if (process.env.DURATA_PIEDI) await page.evaluate(() => { window.__durataPiedi = true; });
const t0 = Date.now(), fine = t0 + MIN * 60000, VERSI = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
let v = 0, sfondoFatto = false;
const righe = [];
let da = 0;
/* IL VIAGGIO. Coi tasti Digsy sbatteva contro gli alberi e girava nello stesso quadrato: di mondo
   nuovo ne vedeva poco, e il difetto (che cresce con le caselle viste) non compariva. Qui viaggia
   in linea retta alla velocità della bici attraverso il mondo, a ogni fotogramma del ciclo vero —
   come ore di gioco compresse in minuti. DURATA_TASTI=1 torna ai tasti. */
/* DURATA_ORA=0.9 (notte) e DURATA_METEO=pioggia: le condizioni in cui ci si trova "dopo un po'" */
if (process.env.DURATA_ORA) await page.evaluate(o => { window.__digsy.state().tod = o; }, +process.env.DURATA_ORA);
if (process.env.DURATA_METEO) await page.evaluate(m => window.__digsy.cmd('weather=' + m), process.env.DURATA_METEO);
if (!process.env.DURATA_TASTI) await page.evaluate((v) => {
  const G = window.__digsy, P = G.player();
  let prima = 0;
  const passo = t => { if (prima && !window.__durataFermo) { const dt = Math.min(0.05, (t - prima) / 1000); P.x += v * dt; P.y += v * 0.35 * dt; P.moving = true; P.dir = 'right'; } prima = t; requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
}, +(process.env.DURATA_V || 276));
while (Date.now() < fine) {
  await page.evaluate(() => { const G = window.__digsy; if (G.closeModal) G.closeModal(true); });
  if (process.env.DURATA_TASTI) {
    const tasto = VERSI[v++ % 4];
    await page.keyboard.down(tasto);
    await page.waitForTimeout(v % 3 ? 6000 : 3000);          // lati diversi: si scopre mondo nuovo
    await page.keyboard.up(tasto);
  } else await page.waitForTimeout(15000);
  if (process.env.DURATA_SFONDO && !sfondoFatto && Date.now() > t0 + MIN * 30000) {
    sfondoFatto = true;
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false }).catch(() => {});
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const altra = await ctx.newPage(); await altra.bringToFront(); await altra.waitForTimeout(+(process.env.DURATA_SFONDO_S || 30) * 1000); await altra.close();
    console.log('--- di nuovo in primo piano');
    await page.bringToFront();
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  }
  /* una finestra di misura ogni ~20 s */
  const m = await page.evaluate((da) => {
    const R = window.__durata, f = R.f.slice(da), lav = R.lav.filter(x => f.length && x[0] >= f[0][0]).map(x => x[1]).sort((a, b) => a - b), iv = f.map(x => x[1]).filter(x => x < 500);
    iv.sort((a, b) => a - b);
    const lenti = f.filter(x => x[1] > 25 && x[1] < 500);
    const salvi = R.salvi.filter(s => f.length && s[0] >= f[0][0]);
    const vicini = lenti.filter(l => salvi.some(s => Math.abs(s[0] - (l[0] - l[1])) < l[1] + 5)).length;
    const mem = performance.memory ? performance.memory.usedJSHeapSize : 0;
    return { n: f.length, fine: R.f.length, med: iv[iv.length >> 1] || 0, p95: iv[Math.floor(iv.length * 0.95)] || 0, lenti: lenti.length, max: lenti.reduce((m, x) => Math.max(m, x[1]), 0), salvi: salvi.length, salvaMs: salvi.reduce((m, s) => Math.max(m, s[1]), 0), json: salvi.length ? salvi[salvi.length - 1][2] : 0, vicini, mem, lmed: lav[lav.length >> 1] || 0, l99: lav[Math.floor(lav.length * 0.99)] || 0, lmax: lav[lav.length - 1] || 0, sec: f.length ? (f[f.length - 1][0] - f[0][0]) / 1000 : 1 };
  }, da);
  m.st = await page.evaluate(() => window.__digsy.cacheStat ? window.__digsy.cacheStat() : null).catch(() => null);
  m.pos = await page.evaluate(() => { const P = window.__digsy.player(); return Math.round(P.x / 32) + ',' + Math.round(P.y / 32); });
  da = m.fine;
  if (m.n < 30) continue;
  const min = ((Date.now() - t0) / 60000).toFixed(1);
  righe.push({ min, ...m });
  console.log(`${min.padStart(5)} min  fps ${(m.n / m.sec).toFixed(0).padStart(3)}  mediana ${m.med.toFixed(1)} ms  p95 ${m.p95.toFixed(1)} ms  lavoro ${m.lmed.toFixed(1)}/${m.l99.toFixed(1)}/${m.lmax.toFixed(0)} ms  strappi ${String(m.lenti).padStart(3)} (max ${m.max.toFixed(0)} ms, ${m.vicini} su un salvataggio)  salvataggi ${m.salvi} (≤${m.salvaMs.toFixed(1)} ms, ${(m.json / 1024).toFixed(0)} KB)  memoria ${(m.mem / 1048576).toFixed(0)} MB  a ${m.pos}${m.st ? '  ' + JSON.stringify(m.st) : ''}`);
}
if (errs.length) console.log('errori:', [...new Set(errs)].slice(0, 5).join(' | '));
await browser.close(); server.close();
