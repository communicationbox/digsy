/* PRESTAZIONI MISURATE — quanto costa davvero un fotogramma, e quanta CPU brucia il gioco.
 * Nata da «su iPhone 13 Pro lagga, e due schede fanno partire la ventola di un M2 Pro».
 *
 *   npm run build && node tests/perf.mjs            → numeri sul gioco pubblicabile (dist/)
 *   PERF_PROFILO=1 node tests/perf.mjs              → in più le funzioni che pesano di più
 *                                                    (dal dev server su :5173: nomi veri)
 *   PERF_SOLO=mondo,citta node tests/perf.mjs       → solo quelle scene
 *
 * Tre misure per scena, su due formati (portatile e telefono, quest'ultimo con la CPU
 * rallentata ×4 come un telefono vero rispetto a un M2):
 *  - COSTO: millisecondi per fotogramma del disegno (G.frame) — mediana e 95° percentile;
 *  - CPU: quota di tempo occupato del processo della pagina lasciando girare il gioco da solo
 *    per 3 s (è quella che scalda: 100% = un nucleo sempre pieno);
 *  - FPS: fotogrammi davvero disegnati in quei 3 s.
 * Playwright come in mobile.mjs (non è una dipendenza). */
let chromium, devices, webkit;
{
  const { readdirSync, existsSync: ex } = await import('node:fs');
  const cache = (process.env.HOME || '') + '/.npm/_npx';
  const cand = [process.env.PLAYWRIGHT_PATH, 'playwright'];
  try { for (const d of readdirSync(cache)) { const f = `${cache}/${d}/node_modules/playwright/index.mjs`; if (ex(f)) cand.push(f); } } catch (e) { /* no */ }
  for (const c of cand.filter(Boolean)) { try { ({ chromium, devices, webkit } = await import(c)); break; } catch (e) { /* next */ } }
  if (!chromium) { console.error('perf: Playwright non trovato'); process.exit(1); }
}
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
mkdirSync(new URL('../.shots', import.meta.url).pathname, { recursive: true });
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PROFILO = !!process.env.PERF_PROFILO;
const SOLO = process.env.PERF_SOLO ? process.env.PERF_SOLO.split(',') : null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = join(ROOT + 'dist', p);
  if (!existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0);
const BASE = PROFILO ? 'http://localhost:5173' : `http://127.0.0.1:${server.address().port}`;

const FORMATI = [
  ['portatile', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, 1],
  ['telefono', (() => { const d = { ...devices['iPhone 13 Pro'] }; if (process.env.PERF_WEBKIT) delete d.defaultBrowserType; return d; })(), 4],
];
const SCENE = [
  /* la partita nuova parte DENTRO casa: per il mondo aperto bisogna prima uscire */
  ['mondo', 'G.leaveRoom().then(()=>G.cmd("goto=prati"))'],
  ['camminata', 'G.leaveRoom().then(()=>G.cmd("goto=prati"))', true],
  /* FINE STAGIONE: la tavolozza sfuma verso la stagione dopo (ultimo 30% di ogni stagione) — è
     il caso che le cache del terreno avevano sbagliato (ridipingevano tutto a ogni fotogramma) */
  ['finestagione', 'G.leaveRoom().then(()=>G.cmd("goto=prati")).then(()=>{ const S=G.state(); S.day=3; S.tod=0.25; })', true],
  ['citta', 'G.leaveRoom().then(()=>G.cmd("goto=city"))'],
  ['notte', 'G.leaveRoom().then(()=>G.cmd("goto=city")).then(()=>G.cmd("time=22"))'],
  ['casa', 'G.enterRoom("house")'],
  ['stanza', 'G.enterRoom("house").then(()=>{ G.state().house.rooms[3].unlocked=true; return G.enterHouseRoom(3); })'],
  ['bottega', 'G.leaveRoom().then(()=>G.enterRoom("inn"))'],
  ['museo', 'G.cmd("godmode").then(()=>G.debug(false)).then(()=>G.enterRoom("museum"))'],
  ['grotta', 'G.leaveRoom().then(()=>G.cmd("goto=grotta"))'],
  ['cortile', 'G.leaveRoom().then(()=>G.cmd("chimera")).then(()=>G.cmd("chimera")).then(()=>G.cmd("chimera")).then(()=>G.cmd("gotopark"))'],
  ['stress3', 'G.leaveRoom().then(()=>G.cmd("goto=city")).then(()=>G.cmd("stress=3")).then(()=>G.cmd("gotopark"))'],
  ['menu', 'G.leaveRoom().then(()=>G.cmd("goto=city")).then(()=>{ const sp=document.getElementById("splash"); if(sp) sp.style.display=""; document.getElementById("menubtn").click(); })'],
];
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p => existsSync(p));
/* CON LA SCHEDA GRAFICA (PERF_GPU=1): senza, Chrome disegna in software e i costi che esistono
   solo sulla GPU non si vedono. SEMPRE senza finestra e senza audio: una finestra che si apre con
   la musica ogni tre secondi mentre si lavora non è una prova, è un disturbo (segnalato). */
const GPU = !!process.env.PERF_GPU;
/* PERF_WEBKIT=1: il motore di Safari (quello di OGNI browser su iPhone). Niente CDP lì: si misurano
   solo disegno e fps, la CPU resta vuota. */
const WK = !!process.env.PERF_WEBKIT;
const browser = WK ? await webkit.launch({ headless: true }) : await chromium.launch({ ...(CHROME ? { executablePath: CHROME } : {}), headless: true,
  args: ['--mute-audio', ...(GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=metal', '--enable-gpu-rasterization'] : [])] });
const righe = [];
const pesi = new Map();
for (const [fname, fopt, rallenta] of FORMATI) {
  for (const [sname, code, cammina] of SCENE) {
    if (SOLO && !SOLO.includes(sname)) continue;
    const ctx = await browser.newContext({ ...fopt });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`${BASE}/index.html?nosplash&seed=777`);
    await page.waitForFunction(() => window.__digsy && window.__digsy.cmd, null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => { const sp = document.getElementById('splash'); if (sp) { sp.classList.add('off'); sp.style.display = 'none'; } });
    await page.waitForTimeout(500);
    if (await page.$('#lookDone')) { await page.click('#lookDone').catch(() => {}); await page.waitForTimeout(600); }
    for (let k = 0; k < 3; k++) { const sk = await page.$('#introskip'); if (sk && await sk.isVisible()) { await sk.click().catch(() => {}); await page.waitForTimeout(600); } }
    await page.evaluate(() => { const G = window.__digsy; if (G && G.closeModal) G.closeModal(true); try { G.state().tut = { i: 99, n: 0, done: true, fatto: true }; } catch (e) {} });
    try { await page.evaluate(`(async()=>{ const G = window.__digsy; await (${code}); })()`); } catch (e) { errs.push('scena: ' + e.message); }
    await page.waitForTimeout(1500);                    // cache calde, come dopo un minuto di gioco
    const cdp = WK ? null : await ctx.newCDPSession(page);
    if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate: rallenta });
    /* 1) COSTO del disegno, fotogramma per fotogramma */
    const costo = await page.evaluate(async (cammina) => {
      const G = window.__digsy, t = [];
      window.__digsyFreeze = true;                       // il ciclo vero si ferma: misuriamo solo noi
      let ts = performance.now();
      if (cammina) dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      for (let i = 0; i < 180; i++) {
        if (cammina && G.stepWorld) G.stepWorld(1 / 60);
        ts += 16.7;
        const a = performance.now(); G.frame(ts); t.push(performance.now() - a);
      }
      if (cammina) dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
      window.__digsyFreeze = false;
      const grezzi = t.slice();
      t.sort((x, y) => x - y);
      return { med: t[t.length >> 1], p95: t[Math.floor(t.length * 0.95)], lenti: grezzi.map((v, i) => [i, v]).filter(x => x[1] > t[t.length >> 1] * 2.5).slice(0, 12).map(x => x[0] + ':' + x[1].toFixed(1)).join(' ') };
    }, !!cammina);
    /* 1b) QUANTE chiamate di disegno fa UN fotogramma: il costo vero sta nel numero */
    const conta = await page.evaluate(() => {
      const P2 = CanvasRenderingContext2D.prototype, n = { fillRect: 0, drawImage: 0, fillText: 0, altro: 0 };
      const orig = { fillRect: P2.fillRect, drawImage: P2.drawImage, fillText: P2.fillText };
      for (const k of Object.keys(orig)) P2[k] = function () { n[k]++; return orig[k].apply(this, arguments); };
      window.__digsyFreeze = true; window.__digsy.frame(performance.now() + 5000); window.__digsyFreeze = false;
      Object.assign(P2, orig);
      return n;
    });
    /* 1c) GLI STESSI PIXEL con la cache e senza: lo stesso istante disegnato nei due modi */
    const uguale = await page.evaluate(() => {
      const G = window.__digsy, cv = document.getElementById('cv'), g = cv.getContext('2d');
      if (!G.cacheDisegno) return 'n/d';
      window.__digsyFreeze = true;
      const t = performance.now() + 7777;
      const leggi = () => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const d = g.getImageData(0, 0, cv.width, cv.height).data; g.restore(); return d; };
      G.cacheDisegno(false); G.frame(t); const a = leggi();
      G.cacheDisegno(true); G.frame(t); G.frame(t); const b = leggi();
      window.__digsyFreeze = false;
      let diversi = 0, maxd = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
      for (let i = 0; i < a.length; i += 4) {
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]));
        if (!d) continue;
        diversi++; maxd = Math.max(maxd, d);
        const p = i / 4, x = p % cv.width, y = Math.floor(p / cv.width);
        bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
      }
      if (diversi && window.__perfDiff) {
        const mk = (d) => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const im = c.getContext('2d').createImageData(cv.width, cv.height); im.data.set(d); c.getContext('2d').putImageData(im, 0, 0); return c.toDataURL(); };
        window.__perfImgs = [mk(a), mk(b)];
      }
      /* ±1 su 255 è l'arrotondamento delle ombre semitrasparenti (dipinte su una copia e poi
         incollate invece che dritte sul terreno): a occhio non esiste. Oltre, è un'altra grafica. */
      if (diversi && maxd <= 1) return 'identici';
      return diversi ? diversi + ' px diversi (fino a ' + maxd + ' per canale, in ' + [bx0, by0, bx1, by1].join(',') + ')' : 'identici';
    });
    if (uguale !== 'identici' && uguale !== 'n/d') {
      errs.push('CACHE: ' + uguale);
      if (process.env.PERF_DIFF) {
        await page.evaluate(() => { window.__perfDiff = true; });
        /* si rifà il confronto per avere le immagini */
        const imgs = await page.evaluate(() => {
          const G = window.__digsy; window.__digsyFreeze = true; const t = performance.now() + 9999;
          const cv = document.getElementById('cv');
          G.cacheDisegno(false); G.frame(t); const a = cv.toDataURL();
          G.cacheDisegno(true); G.frame(t); G.frame(t); const b = cv.toDataURL();
          window.__digsyFreeze = false; return [a, b];
        });
        for (const [i, d] of imgs.entries()) writeFileSync(ROOT + '.shots/perf-' + fname + '-' + sname + '-' + (i ? 'cache' : 'vivo') + '.png', Buffer.from(d.split(',')[1], 'base64'));
      }
    }
    /* 2) CPU e FPS lasciando girare il gioco da solo */
    if (cdp) await cdp.send('Performance.enable');
    const m0 = cdp ? Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value])) : { TaskDuration: 0 };
    if (cammina) await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
    /* gli STRAPPI veri: intervalli fra un fotogramma e il successivo nel ciclo del gioco, oltre 25 ms */
    const f0 = await page.evaluate(() => { window.__nf = 0; window.__strappi = 0; window.__peggiore = 0; let prima = 0; const c = (t) => { window.__nf++; if (prima) { const d = t - prima; if (d > 25) window.__strappi++; if (d > window.__peggiore) window.__peggiore = d; } prima = t; if (window.__nfOn) requestAnimationFrame(c); }; window.__nfOn = true; requestAnimationFrame(c); return performance.now(); });
    if (PROFILO && cdp) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
    await page.waitForTimeout(3000);
    let prof = null;
    if (PROFILO && cdp) prof = (await cdp.send('Profiler.stop')).profile;
    const f1 = await page.evaluate(() => { window.__nfOn = false; return { t: performance.now(), n: window.__nf, strappi: window.__strappi, peggiore: window.__peggiore }; });
    const m1 = cdp ? Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value])) : { TaskDuration: 0 };
    const secs = (f1.t - f0) / 1000;
    const cpu = (m1.TaskDuration - m0.TaskDuration) / secs;
    const fps = f1.n / secs;
    if (process.env.PERF_TEMPI) console.log(fname, sname, 'fotogrammi lenti:', costo.lenti);
    righe.push([fname, sname, costo.med.toFixed(2), costo.p95.toFixed(2), (cpu * 100).toFixed(0) + '%', fps.toFixed(0), errs.join(' | ').slice(0, 80), conta.fillRect + '/' + conta.drawImage + '/' + conta.fillText, f1.strappi + ' (' + Math.round(f1.peggiore) + ' ms)']);
    if (prof) {
      /* tempo PROPRIO per funzione (senza i figli): chi consuma davvero */
      const dt = prof.timeDeltas; const self = new Map(); const byId = new Map(prof.nodes.map(n => [n.id, n]));
      for (let i = 0; i < prof.samples.length; i++) { const n = byId.get(prof.samples[i]); const cf = n.callFrame;
        const k = (cf.functionName || '(anonima)') + ' ' + (cf.url || '').split('/').pop() + ':' + (cf.lineNumber + 1);
        self.set(k, (self.get(k) || 0) + (dt[i] || 0)); }
      for (const [k, v] of self) pesi.set(k, (pesi.get(k) || 0) + v);
    }
    await ctx.close();
  }
}
await browser.close(); server.close();
console.log('\nformato    scena        disegno ms (med / p95)   CPU   fps  strappi>25ms   fillRect/drawImage/testo');
for (const r of righe) console.log(r[0].padEnd(10) + ' ' + r[1].padEnd(12) + ' ' + (r[2] + ' / ' + r[3]).padEnd(24) + ' ' + r[4].padStart(5) + ' ' + r[5].padStart(5) + '  ' + (r[8] || '').padEnd(12) + '  ' + (r[7] || '') + (r[6] ? '  ! ' + r[6] : ''));
if (PROFILO) {
  const tot = [...pesi.values()].reduce((a, b) => a + b, 0);
  console.log('\nfunzioni più pesanti (tempo proprio, tutte le scene):');
  for (const [k, v] of [...pesi].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log('  ' + (v / tot * 100).toFixed(1).padStart(5) + '%  ' + k);
}
mkdirSync(ROOT + '.shots', { recursive: true });
writeFileSync(ROOT + '.shots/perf.json', JSON.stringify(righe, null, 1));
