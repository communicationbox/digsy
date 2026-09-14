/* PROVA VERA SU TELEFONI EMULATI (Playwright): iPhone SE, iPhone 13 in verticale e in orizzontale,
 * Pixel 7, col tocco attivo. Conferma il personaggio col dito, salta l'intro, attraversa le scene
 * (mondo, città, atrio, stanza, bottega, museo, negozio, bottega d'arredo, vassoio, mappa, libro),
 * fotografa in .shots/mobile/ e segnala gli elementi dell'interfaccia che escono dallo schermo.
 * Nata perché "su mobile viene tutto tagliato": gli e2e girano in Chrome headless, che su macOS
 * non scende sotto ~500px di larghezza, e lo zoom sbagliato su telefono non lo vedevano.
 *
 *   npm run build && npm run mobile
 *
 * Playwright NON è una dipendenza del gioco: se manca, `npm i -g playwright` oppure
 * PLAYWRIGHT_PATH=/percorso/a/playwright/index.mjs npm run mobile. Usa il Chrome del sistema. */
let chromium, devices;
try { ({ chromium, devices } = await import(process.env.PLAYWRIGHT_PATH || 'playwright')); }
catch (e) { console.error('mobile: Playwright non trovato — `npm i -g playwright` o PLAYWRIGHT_PATH=…'); process.exit(1); }
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = ROOT + 'dist';
const OUT = ROOT + '.shots/mobile/';
(await import('node:fs')).mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = join(DIST, p);
  if (!existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0);
const port = server.address().port;

const DEV = [
  ['iphoneSE', devices['iPhone SE']],
  ['iphone13', devices['iPhone 13']],
  ['iphone13-land', devices['iPhone 13 landscape']],
  ['pixel7', devices['Pixel 7']],
];
const SCENES = [
  ['mondo', 'Promise.resolve(G.leaveRoom && G.leaveRoom()).then(()=>G.cmd("goto=prati"))'],
  ['citta', 'Promise.resolve(G.leaveRoom && G.leaveRoom()).then(()=>G.cmd("goto=city"))'],
  ['atrio', 'G.enterRoom("house")'],
  ['stanza', 'G.enterRoom("house").then(()=>{G.state().house.rooms[3].unlocked=true; return G.enterHouseRoom(3);})'],
  ['bottega', 'G.enterRoom("inn")'],
  ['museo', 'G.cmd("godmode").then(()=>G.debug(false)).then(()=>G.enterRoom("museum"))'],
  ['negozio', 'G.openStore()'],
  ['arredo', 'G.openFurnShop()'],
  ['vassoio', 'G.cmd("godfurn").catch(()=>{}).then(()=>G.enterRoom("house")).then(()=>G.openTray())'],
  ['mappa', 'G.openMap()'],
  ['libro', 'G.openBook()'],
];

const report = [];
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => existsSync(p));
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
for (const [dname, dev] of DEV) {
  for (const [sname, code] of SCENES) {
    const ctxb = await browser.newContext({ ...dev });
    const page = await ctxb.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/index.html?nosplash&seed=777`);
    await page.waitForFunction(() => window.__digsy && window.__digsy.cmd, null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => { const sp = document.getElementById('splash'); if (sp) { sp.classList.add('off'); sp.style.display = 'none'; } });
    await page.waitForTimeout(600);
    /* come un giocatore vero: conferma il personaggio col dito e salta l'intro */
    if (await page.$('#lookDone')) { await page.tap('#lookDone').catch(() => {}); await page.waitForTimeout(700); }
    for (let k = 0; k < 3; k++) { const sk = await page.$('#introskip'); if (sk && await sk.isVisible()) { await sk.tap().catch(() => {}); await page.waitForTimeout(700); } }
    await page.evaluate(() => { const G = window.__digsy; if (G && G.closeModal) G.closeModal(true); });
    await page.waitForTimeout(400);
    try { await page.evaluate(`(async()=>{ const G = window.__digsy; await (${code}); })()`); } catch (e) { errs.push('scena: ' + e.message); }
    await page.waitForTimeout(900);
    /* cosa esce dallo schermo: elementi visibili dell'interfaccia oltre i bordi */
    const m = await page.evaluate(() => {
      const W = innerWidth, H = innerHeight, out = [];
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        if (el.closest('[style*="display: none"]')) continue;
        const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
        if (cs.position === 'fixed' || el.id || el.classList.length) {
          if (r.left < -2 || r.right > W + 2 || r.top < -2 || r.bottom > H + 2) {
            let sc = el.parentElement, clipped = false;
            while (sc) { const s2 = getComputedStyle(sc); if (/(auto|scroll|hidden)/.test(s2.overflow + s2.overflowX + s2.overflowY) && sc !== document.body && sc !== document.documentElement) { clipped = true; break; } sc = sc.parentElement; }
            if (!clipped) out.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + [...el.classList].slice(0, 2).join('.')) + ' [' + [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)].join(',') + ']');
          }
        }
      }
      const doc = document.documentElement;
      return { W, H, scrollW: doc.scrollWidth, scrollH: doc.scrollHeight, out: out.slice(0, 8) };
    });
    await page.screenshot({ path: `${OUT}${dname}-${sname}.png` });
    report.push({ dname, sname, ...m, errs });
    await ctxb.close();
  }
}
await browser.close(); server.close();
let problemi = 0;
for (const r of report) { if (r.out.length || r.errs.length) problemi++; console.log(`${r.dname.padEnd(14)} ${r.sname.padEnd(8)} ${r.W}x${r.H} scroll ${r.scrollW}x${r.scrollH}${r.out.length ? '  FUORI: ' + r.out.join(' ') : ''}${r.errs.length ? '  ERRORI: ' + r.errs.join(' | ') : ''}`); }
console.log(problemi ? `mobile: ${problemi} scene con problemi (foto in .shots/mobile/)` : 'mobile: nessun elemento fuori schermo, nessun errore (foto in .shots/mobile/)');
process.exit(problemi ? 1 : 0);
