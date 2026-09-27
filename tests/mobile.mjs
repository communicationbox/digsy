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
/* PLAYWRIGHT SI TROVA DA SOLO: prima quello indicato, poi quello installato, poi quello che
   `npx playwright` ha lasciato in cache — c'è quasi sempre, e chiedere ogni volta il percorso
   era il modo sicuro perché questa prova non la facesse girare nessuno. */
let chromium, devices;
{
  const { readdirSync, existsSync: ex } = await import('node:fs');
  const home = process.env.HOME || '';
  const cache = home + '/.npm/_npx';
  const candidati = [process.env.PLAYWRIGHT_PATH, 'playwright'];
  try { for (const d of readdirSync(cache)) { const f = `${cache}/${d}/node_modules/playwright/index.mjs`; if (ex(f)) candidati.push(f); } } catch (e) { /* niente cache */ }
  for (const c of candidati.filter(Boolean)) {
    try { ({ chromium, devices } = await import(c)); break; } catch (e) { /* il prossimo */ }
  }
  if (!chromium) { console.error('mobile: Playwright non trovato — `npx playwright install chromium` oppure PLAYWRIGHT_PATH=…'); process.exit(1); }
}
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
/* la stanza finta, rimessa ogni poco: il gioco vero prova a collegarsi a un centralino che
   qui non c'è e la spegnerebbe prima dello scatto */
const IN_DUE = 'setInterval(()=>{ if (G.mpFinta) G.mpFinta(["Ada","Fenn"], true); }, 150); ';
const SPLASH = 'const sp0=document.getElementById("splash"); if(sp0) sp0.style.display=""; document.getElementById("menubtn").click(); ';
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
  /* il menu in legno: titolo, salvataggi (tre schede intere) e impostazioni */
  /* ANCHE QUESTE TRE non mostravano il menu: la splash era nascosta con `display:none` e
     cliccare ☰ toglie solo la classe `off`. Le foto ritraevano la stanza, e la prova passava
     senza aver guardato niente — per questo ora ogni scena dice COSA deve vedersi (terzo
     campo), e se non si vede la prova fallisce. */
  ['menu', 'Promise.resolve(G.closeModal && G.closeModal(true)).then(()=>{ ' + SPLASH + ' })', '#sp-menu'],
  ['salvataggi', SPLASH + 'return new Promise(r=>setTimeout(r,300)).then(()=>document.getElementById("sp-saves").click())', '#sp-slots'],
  ['impostazioni', SPLASH + 'return new Promise(r=>setTimeout(r,300)).then(()=>document.getElementById("sp-settings").click())', '.sp-card.cfg'],
  /* ---- LE SCHERMATE DELLA COMPAGNIA. Erano tutte fuori da questa prova: nate dopo, provate
     solo su un monitor, e su un telefono non le aveva mai aperte nessuno. `IN_DUE` rimette la
     stanza finta ogni poco — la partita vera intanto prova a collegarsi a un centralino che qui
     non c'è, e la spegnerebbe prima dello scatto. */
  /* la splash va RIACCESA: all'avvio la prova la nasconde con `display:none`, e riaprire il
     menu toglie solo la classe `off` — la foto mostrava il gioco, e la misura non trovava
     niente di storto perché non c'era niente da misurare */
  ['amici', IN_DUE + 'G.state().amici=[{c:"Q2D4FG7HJK",n:"Luca"},{c:"M7RAC3DEFG",n:"Ada"},{c:"T4KWP9DENQ",n:"Fenn"}]; ' + SPLASH + 'return new Promise(r=>setTimeout(r,300)).then(()=>G.splashView("amici"))', '#sp-mp-mio'],
  ['taccuino', SPLASH + 'return G.mod("chat").then(c=>{c.dimenticaTutto(); c.segna("Ada","ci vediamo al museo domani?",false); c.segna("Bruno","guarda che pinne ho trovato",false); c.segna("Zoe","il mio parco è pieno",true);}).then(()=>new Promise(r=>setTimeout(r,300))).then(()=>G.splashView("taccuino"))', '.tacc-carta'],
  ['chat', IN_DUE + 'return new Promise(r=>setTimeout(r,300)).then(()=>{ G.updateHUD && G.updateHUD(); const b=document.getElementById("chattag"); if(!b||getComputedStyle(b).display==="none") throw new Error("in compagnia il pulsante Parla non c\'è"); b.click(); })', '#chatbar.on'],
  ['sottotitoli', IN_DUE + 'return G.mod("chat").then(c=>G.mod("mp").then(mp=>{ const P2=G.player(); setInterval(()=>{ for (const q of mp.MP.room.peers.values()) q.buf=[{t:performance.now(),x:P2.x+4000,y:P2.y,d:"down",m:0,s:"world"}]; c.arrivato("u1","Ada","ci vediamo alla fontana appena finisco di scavare",performance.now()); c.arrivato("u2","Fenn","ho trovato un cranio enorme",performance.now()); G.chatlog(performance.now(),"world"); },150); }))', '#chatlog.on'],
  ['nomi', IN_DUE + 'return new Promise(r=>setTimeout(r,300)).then(()=>G.frame && G.frame(1200))'],
  ['volo', 'G.mod("volo").then(v=>v.partiVolo("Ada"))', '#volo.on'],
  ['sogno', 'G.sogno()', '#dream.on'],
  ['locanda', 'Promise.resolve(G.leaveRoom && G.leaveRoom()).then(()=>G.cmd("goto=city")).then(()=>G.openInn())', '#innName'],
  ['invito', 'G.mod("ui").then(u=>u.mostraInvito("Luca",()=>{},()=>{}))', '#invito'],
  ['scheletro', 'G.cmd("play=skeleton")', '#skfitov.on'],
];

const report = [];
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => existsSync(p));
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
/* MOBILE_SOLO=amici,chat fa girare solo quelle scene: sedici scene per quattro telefoni sono
   cinque minuti, e mentre si sistema una schermata basta guardare quella */
const SOLO = process.env.MOBILE_SOLO ? process.env.MOBILE_SOLO.split(',') : null;
for (const [dname, dev] of DEV) {
  for (const [sname, code, atteso] of SCENES) {
    if (SOLO && !SOLO.includes(sname)) continue;
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
    /* una scena è un'espressione, oppure (quelle in compagnia) un corpo con dentro un return */
    const corpo = /\breturn\b/.test(code) ? code : 'return (' + code + ');';
    try { await page.evaluate(`(async()=>{ const G = window.__digsy; await (async()=>{ ${corpo} })(); })()`); } catch (e) { errs.push('scena: ' + e.message); }
    await page.waitForTimeout(900);
    /* LA SCHERMATA C'È DAVVERO? Senza questo controllo una scena che non si apre passa verde:
       niente esce dallo schermo, niente è piccolo… perché non c'è niente. È successo a menu,
       salvataggi e impostazioni per chissà quanto. */
    if (atteso) {
      const c = await page.evaluate((q) => {
        const el = document.querySelector(q); if (!el) return 'manca';
        if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return 'nascosta';
        const r = el.getBoundingClientRect(); return (r.width > 4 && r.height > 4) ? '' : 'vuota';
      }, atteso);
      if (c) errs.push('la schermata non si è aperta (' + atteso + ' ' + c + ')');
    }
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
      /* GIOCABILITÀ COL POLLICE: un bersaglio più piccolo di 40px non si centra con un dito, e
         sotto gli 11px il testo su un telefono non si legge. Misurare è l'unico modo: a
         occhio, su una foto scalata, sembra sempre tutto grande abbastanza. */
      const piccoli = [], minuti = [];
      const nome = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + [...el.classList].slice(0, 2).join('.'));
      for (const el of document.querySelectorAll('button, .btn, [data-comp], [data-yard], [role="button"], #joy, #abtn')) {
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
        /* LE LINGUETTE DEL TACCUINO sono un indice, come quello laterale della rubrica di un
           telefono: ventisei lettere in una colonna non possono essere alte 36 l'una su uno
           schermo da 568. Si pretende che restino PRENDIBILI (30×22), non che siano pulsanti. */
        if (el.classList.contains('tacc-tab')) { if (r.width < 28 || r.height < 22) piccoli.push(nome(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); continue; }
        if (r.width < 40 || r.height < 36) piccoli.push(nome(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
      }
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        if (!el.childNodes.length) continue;
        let testo = false;
        for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim().length > 2) testo = true;
        if (!testo) continue;
        const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
        if (parseFloat(cs.fontSize) < 11) minuti.push(nome(el) + ' ' + cs.fontSize);
      }
      /* COPERTI DAI COMANDI. La riga della chat, i sottotitoli di chi parla e l'invito stanno
         in basso, dove stanno anche joystick e tasto azione: se si toccano, sotto il pollice
         c'è quello che si voleva leggere — o il tasto azione sopra il campo in cui si scrive. */
      const coperti = [];
      const vis = el => { if (!el) return null; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return null; const r = el.getBoundingClientRect(); return (r.width > 2 && r.height > 2) ? r : null; };
      const tocca = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
      const comandi = ['#joy', '#abtn', '#exitbtn'].map(q => [q, vis(document.querySelector(q))]).filter(x => x[1]);
      for (const q of ['#chatbar', '#chatlog', '.invito', '#inv']) {
        const r = vis(document.querySelector(q)); if (!r) continue;
        for (const [cq, cr] of comandi) if (tocca(r, cr)) coperti.push(q + '×' + cq);
      }
      /* TAGLIATI DI LATO. Un pezzo più largo del riquadro che lo contiene non esce dallo
         schermo — il riquadro lo nasconde — e quindi il controllo qui sopra non lo vede: è
         così che la seconda colonna di linguette del taccuino spariva su un telefono piccolo.
         Si guarda solo in orizzontale: in verticale quel riquadro scorre, ed è giusto. */
      const tagliati = [];
      for (const el of document.querySelectorAll('.tacc-carta, .tacc-abc, .sp-riga, .sp-code, .sp-btn, .cl-riga, .vl-cv, .dr-cv, .sk-board')) {
        const r = vis(el); if (!r) continue;
        let a = el.parentElement;
        while (a && a !== document.body) {
          const s2 = getComputedStyle(a);
          if (/(hidden|auto|scroll|clip)/.test(s2.overflowX + s2.overflow)) break;
          a = a.parentElement;
        }
        if (!a || a === document.body) continue;
        const ra = a.getBoundingClientRect();
        if (r.left < ra.left - 1 || r.right > ra.right + 1) tagliati.push(nome(el) + ' ' + Math.round(r.left - ra.left) + '/' + Math.round(ra.right - r.right));
      }
      /* le LINGUETTE del taccuino dentro il loro foglio, anche in verticale: sul telefono
         più piccolo l'ultima (M) usciva dal fondo e si vedeva a metà */
      for (const el of document.querySelectorAll('.tacc-tab')) {
        const r = vis(el), f = el.closest('.tacc-carta'); if (!r || !f) continue;
        const rf = f.getBoundingClientRect();
        if (r.bottom > rf.bottom + 1 || r.top < rf.top - 1) tagliati.push('linguetta ' + el.textContent + ' fuori dal foglio');
      }
      const doc = document.documentElement;
      return { W, H, scrollW: doc.scrollWidth, scrollH: doc.scrollHeight, out: out.slice(0, 8),
        piccoli: [...new Set(piccoli)].slice(0, 6), minuti: [...new Set(minuti)].slice(0, 6), coperti,
        tagliati: [...new Set(tagliati)].slice(0, 6) };
    });
    await page.screenshot({ path: `${OUT}${dname}-${sname}.png` });
    report.push({ dname, sname, ...m, errs });
    await ctxb.close();
  }
}
/* ---- SI GIOCA DAVVERO COL DITO? Muoversi col joystick e scavare col tasto azione. Le scene
   qui sopra dicono solo che niente esce dallo schermo: che il gioco RISPONDA al dito è un'altra
   domanda, e senza chiederla non se ne accorge nessuno finché non lo prova una persona. */
const prova = [];
{
  const ctxb = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctxb.newPage();
  await page.goto(`http://127.0.0.1:${port}/index.html?nosplash&seed=777`);
  await page.waitForFunction(() => window.__digsy && window.__digsy.cmd, null, { timeout: 15000 }).catch(() => {});
  /* la splash si CHIUDE col suo bottone, non nascondendo l'elemento: finché è "attiva" il
     gioco ignora joystick e tasto azione, e la prova col dito sarebbe una prova truccata */
  { const c = await page.$('#sp-continue'); if (c) { await c.tap().catch(() => {}); await page.waitForTimeout(700); } }
  await page.evaluate(() => { const sp = document.getElementById('splash'); if (sp && !sp.classList.contains('off')) { sp.classList.add('off'); sp.style.display = 'none'; } });
  await page.waitForTimeout(600);
  if (await page.$('#lookDone')) { await page.tap('#lookDone').catch(() => {}); await page.waitForTimeout(700); }
  for (let k = 0; k < 3; k++) { const sk = await page.$('#introskip'); if (sk && await sk.isVisible()) { await sk.tap().catch(() => {}); await page.waitForTimeout(700); } }
  /* SI PROVA DOVE COMINCIA DAVVERO LA PARTITA: dentro casa, col tutorial al primo passo. È
     il primo minuto di chi apre il gioco su un telefono, ed è lì che il dito deve funzionare. */
  for (let k = 0; k < 3; k++) { await page.evaluate(() => { const G = window.__digsy; if (G.closeModal) G.closeModal(true); }); await page.waitForTimeout(250); }
  const prima = await page.evaluate(() => window.__digsy.heroPos());
  const joy = await page.$('#joy');
  if (!joy) prova.push('manca il joystick');
  else {
    /* il dito sul joystick: si costruisce un PointerEvent VERO dentro la pagina. Gli eventi
       sintetici di fuori non arrivavano al gestore, e il risultato era una prova che diceva
       «non ci si muove» quando invece ci si muoveva benissimo. */
    /* UNA direzione per volta, e si guarda SUBITO: spingendo prima di là e poi di qua il
       personaggio tornava al punto di partenza e la prova diceva che non si era mosso. */
    let mosso = 0;
    for (const verso of [1, -1]) {
      const p0 = await page.evaluate(() => window.__digsy.heroPos());
      await page.evaluate((v) => {
        const j = document.getElementById('joy'), r = j.getBoundingClientRect();
        const ev = (t, x) => new PointerEvent(t, { pointerId: 7, isPrimary: true, pointerType: 'touch', bubbles: true, cancelable: true, clientX: x, clientY: r.top + r.height / 2 });
        j.dispatchEvent(ev('pointerdown', r.left + r.width / 2));
        j.dispatchEvent(ev('pointermove', r.left + r.width / 2 + v * Math.round(r.width * 0.35)));
      }, verso);
      await page.waitForTimeout(700);
      await page.evaluate(() => {
        const j = document.getElementById('joy'), r = j.getBoundingClientRect();
        j.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, isPrimary: true, pointerType: 'touch', bubbles: true, clientX: r.left + r.width, clientY: r.top + r.height / 2 }));
      });
      const p1 = await page.evaluate(() => window.__digsy.heroPos());
      mosso = Math.max(mosso, Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y));
      if (mosso >= 6) break;                           // basta una direzione libera
    }
    if (mosso < 6) prova.push('col joystick non ci si muove (' + prima.dove + ', spostamento ' + mosso.toFixed(1) + 'px)');
  }
  /* il TASTO AZIONE: si prova dove DEVE fare qualcosa, cioè sul letto — il primo passo del
     tutorial. Premerlo in mezzo alla stanza vuota non fa niente, ed è giusto così: quella
     sarebbe stata una prova che non prova nulla. */
  const a = await page.$('#abtn');
  if (!a) prova.push('manca il tasto azione');
  else {
    const rb = await a.boundingBox();
    if (rb.width < 56 || rb.height < 56) prova.push('tasto azione piccolo ' + Math.round(rb.width) + '×' + Math.round(rb.height));
    const sulLetto = await page.evaluate(() => {
      const G = window.__digsy, S = G.state();
      const f = ((S.house.rooms[0] || {}).furn || []).find(x => x.itemId && /letto|giaciglio|amaca|baldacchino/.test(x.itemId));
      if (!f || !G.intPos) return false;
      G.intPos(f.gx, f.gy); return true;
    });
    if (!sulLetto) prova.push('in casa non c\'è un letto su cui provare il tasto azione');
    else {
      await page.waitForTimeout(500);
      await a.tap().catch(() => {});
      await page.waitForTimeout(800);
      const aperto = await page.evaluate(() => { const m = document.getElementById('modal'); return !!(m && getComputedStyle(m).display !== 'none'); });
      if (!aperto) prova.push('il tasto azione sul letto non apre niente');
    }
  }
  await page.screenshot({ path: `${OUT}pixel7-giocabilita.png` });
  await ctxb.close();
}
await browser.close(); server.close();
let problemi = 0;
for (const r of report) {
  if (r.out.length || r.errs.length || r.piccoli.length || r.minuti.length || (r.coperti || []).length || (r.tagliati || []).length) problemi++;
  console.log(`${r.dname.padEnd(14)} ${r.sname.padEnd(8)} ${r.W}x${r.H} scroll ${r.scrollW}x${r.scrollH}`
    + (r.out.length ? '  FUORI: ' + r.out.join(' ') : '')
    + (r.piccoli.length ? '  PICCOLI: ' + r.piccoli.join(' ') : '')
    + (r.minuti.length ? '  TESTO MINUTO: ' + r.minuti.join(' ') : '')
    + ((r.coperti || []).length ? '  COPERTI DAI COMANDI: ' + r.coperti.join(' ') : '')
    + ((r.tagliati || []).length ? '  TAGLIATI DI LATO: ' + r.tagliati.join(' ') : '')
    + (r.errs.length ? '  ERRORI: ' + r.errs.join(' | ') : ''));
}
if (prova.length) { problemi += prova.length; console.log('GIOCABILITÀ COL DITO: ' + prova.join(' · ')); }
else console.log('giocabilità col dito: ci si muove col joystick e si scava col tasto azione');
console.log(problemi ? `mobile: ${problemi} scene con problemi (foto in .shots/mobile/)` : 'mobile: nessun elemento fuori schermo, nessun errore (foto in .shots/mobile/)');
process.exit(problemi ? 1 : 0);
