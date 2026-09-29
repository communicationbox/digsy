/* FOTO PER LA VETRINA — le immagini che finiscono su Reddit, itch e le schede del gioco.
 *
 * Diverso da `npm run shot`, che fotografa UNA schermata di menu per controllare che sia messa
 * bene. Qui serve l'opposto: partite già avanti (chimere nel parco, scheletri completi, sale del
 * museo piene) inquadrate in orizzontale, senza HUD di debug, senza badge, senza splash che
 * traspare. Fatte a mano una per una, si finiva sempre per pubblicare quelle che si avevano —
 * un recinto vuoto intitolato "creature park", un libro ancora da riempire.
 *
 *   npm run promo               → tutte le foto in .shots/promo/
 *   npm run promo -- parco      → solo quella
 *   npm run promo -- parco --seed=42 → la stessa scena in un altro mondo
 *
 * Le scene si portano nello stato giusto con la console dei comandi (`G.cmd`), gli stessi
 * comandi che si userebbero giocando: niente salvataggi finti da mantenere allineati.
 *
 * Ogni scena porta il SEME del suo mondo (`?seed=`, vedi initState). Senza, ogni scatto nasceva
 * in un mondo nuovo: la città capitava nel bioma che voleva lei e la stessa foto non si poteva
 * rifare dopo una modifica — si ripartiva a caccia di un'inquadratura fortunata. I semi qui
 * sotto sono scelti guardando il risultato; cambiarli cambia la foto.
 */
import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, '.shots', 'promo');
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(c => existsSync(c));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json' };

const WIDE = '1920,1080';

/* Il mondo va fatto girare a mano: in headless il requestAnimationFrame non avanza, quindi
   senza questi giri le creature restano schierate sulla griglia di partenza e ogni animazione
   (acqua, chiome, fuoco) resta ferma al primo fotogramma. Mezzo minuto di parco basta a
   sparpagliarle: partono tutte da una posizione derivata dall'uid, cioè in fila. */
const ANIMA = `
  for (var i = 0; i < 900; i++) { if (G.stepPark) G.stepPark(1/30); }
  ${''/* SEI secondi di fotogrammi, non mezzo: il meteo sfuma in ~3s (weatherStep) e con pochi
        giri il crossfade non finisce mai — l'HUD continuava a dire "Sandstorm" con il cielo
        sereno già impostato. Vale per ogni animazione a dissolvenza. */}
  for (var j = 0; j < 40; j++) G.frame(4000 + j * 150);
  if (G.updateHUD) G.updateHUD();
`;

/* Una partita presentabile. `godmode` da solo non basta e in parte fa danno: accende il tag
   🐞 CHEAT, mette ∞ al posto dei numeri, risveglia tutte e 66 le specie (il recinto diventa un
   ammasso) e riempie lo zaino a 330 pezzi su 14 posti — che in una foto si legge come un bug.
   Qui si sblocca tutto e poi si RIPORTA INDIETRO a una partita che qualcuno potrebbe avere
   davvero: dieci creature nel parco, uno zaino a metà, i numeri veri nell'HUD. */
const PARTITA = `
  await G.cmd('godmode');
  await G.debug(false);
  await G.cmd('speed=1');
  await G.cmd('money=1240');
  await G.cmd('heal');
  await G.cmd('weather=sereno');
  var S = G.state();
  S.items.length = 9;
  S.awakened = S.awakened.slice(0, 10);
  S.tut = { i: 0, n: 0, done: true, skipped: true };
  S.maps = [];
`;

/* FERMA: dopo l'ultimo fotogramma scelto il ciclo del gioco si ferma (window.__digsyFreeze). Lo
   scatto avviene alla fine del tempo virtuale, ~18 s dopo la scena: senza, le creature del cortile
   se ne andavano per conto loro dalle posizioni composte, e la foto non era quella decisa. */
const FERMA = t => `window.__digsyFreeze = ${t};`;
/* IL CORTILE COMPOSTO: Digsy sul prato fra la casa (tutta in vista, in alto) e il cancello, fino a
   nove bestie attorno in due file sfalsate, su caselle SENZA arredo (un cespuglio o un sasso sotto
   una bestia la spezzava in due) e fuori dalla casa. Poi qualche passo vero a fotogrammi alterni,
   così le zampe sono a metà passo, e si ferma. `quante` bestie, `dy` di quanto stare sotto la casa. */
const CORTILE = (quante, dy, sx, daX, yDa, yA) => `
    var yr = await G.yard(), pk = await G.mod('park'), wd = await G.mod('world'), rr = await G.mod('render'), P = G.player();
    var S = G.state(), ck = S.companion && S.companion.key;
    P.x = yr.cx * 32 + 16 + ${sx || 0}; P.y = (yr.y1 - ${dy}) * 32; P.dir = 'down'; P.moving = false;
    S.house.yard = pk.parkPopulation().filter(function(c){ return c.key !== ck; }).slice(0, ${quante}).map(function(c){ return c.key; });
    pk.yardAnimals.length = 0; pk.yardList();
    ${''/* il cortile si disegna solo se è "in vista" (yardNear), e a deciderlo è il ciclo del gioco:
          col ciclo fermo va detto a mano, o le bestie ci sono ma non si vedono */}
    pk.refreshVisParks();
    var ko = pk.houseKeepOut(), n = pk.yardAnimals.length;
    var libera = function(x, y){
      var tx = Math.floor(x / 32), ty = Math.floor(y / 32);
      for (var ddx = -1; ddx <= 1; ddx++) for (var ddy = -1; ddy <= 0; ddy++) if (wd.parkDeco(yr, yr.cx, tx + ddx, ty + ddy, n)) return false;
      if (ko && x > ko.x0 - 40 && x < ko.x1 + 40 && y > ko.y0 && y < ko.y1 + 30) return false;
      if (Math.abs(x - P.x) < 110 && Math.abs(y - P.y) < 90) return false;
      return tx > yr.x0 + 1 && tx < yr.x1 - 1 && ty > yr.y0 + 1 && ty < yr.y1 - 1;
    };
    var posti = [];
    for (var yy = P.y + (${yDa == null ? -200 : yDa}); yy <= P.y + (${yA == null ? 170 : yA}); yy += 26) for (var xx = P.x + (${daX == null ? -780 : daX}); xx <= P.x + 780; xx += 40) if (libera(xx, yy)) posti.push([xx, yy]);
    ${''/* si pesca lontano da chi è già stato messo: sparse, mai una sopra l'altra */}
    var messi = [];
    pk.yardAnimals.forEach(function(a, i){
      var best = null, bd = -1;
      posti.forEach(function(q){ var d = messi.reduce(function(m, r){ return Math.min(m, Math.hypot(q[0] - r[0], (q[1] - r[1]) * 1.6)); }, 1e9); d = Math.min(d, Math.hypot(q[0] - P.x, (q[1] - P.y) * 1.6) + 60); if (d > bd) { bd = d; best = q; } });
      messi.push(best); a.x = best[0]; a.y = best[1];
      a.tx = a.x + (i % 2 ? -60 : 60); a.ty = a.y; a.pause = 0;
    });
    pk.yardAnimals.forEach(function(a){ ['side', 'front', 'back'].forEach(function(v){ for (var g = 0; g < 4; g++) rr.creatureSprite(a, v, { gait: g, gaitFB: v !== 'side' }); }); });
    for (var i = 0; i < 40; i++) { pk.updatePark(1 / 30); G.frame(4000 + i * 33); }
    if (G.updateHUD) G.updateHUD();
    ${FERMA(4000 + 39 * 33)}
`;

const SCENE = [
  /* LA PIAZZA vista dal centro, nei Prati (seme 37: città vera col Museo, quasi niente acqua attorno):
     la fontana, le due file di botteghe e il Museo riempiono la foto. Prima: goto=city lasciava
     Digsy dove capitava e mezza foto era palude fuori città. */
  { nome: '01-citta', size: WIDE, seed: 37, passi: `
    ${PARTITA}
    await G.cmd('goto=city');
    var wd = await G.mod('world'), P = G.player();
    var t = wd.townForTile(Math.floor(P.x / 32), Math.floor(P.y / 32));
    P.x = (t.C.x + 2) * 32 + 16; P.y = t.C.y * 32; P.dir = 'down'; P.moving = false;
    ${ANIMA}
    ${FERMA(4000 + 39 * 150)}
  ` },
  /* Il cortile ABITATO, di giorno: la casa intera in alto, le bestie sparse attorno a Digsy. */
  { nome: '02-parco', size: WIDE, passi: `
    ${PARTITA}
    for (var c = 0; c < 9; c++) await G.cmd('chimera');
    await G.cmd('gotopark');
    ${CORTILE(9, 5)}
  ` },
  /* Il Libro con le creature VIVE, colorate (Terre Rosse: vulcanide e magmarex). Gli scheletri
     stanno già in 10-scheletri: qui si mostra cosa tornano a essere. */
  { nome: '03-libro', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('goto=city');
    ${ANIMA}
    var S2 = G.state(); ['vulcanide', 'magmarex'].forEach(function(id){ if (S2.awakened.indexOf(id) < 0) S2.awakened.push(id); });
    await G.openBook(19);
    await new Promise(function(r){ setTimeout(r, 1500); });
    document.querySelectorAll('.bk-flip3d').forEach(function(b){ b.click(); });
    await new Promise(function(r){ setTimeout(r, 2500); });
  ` },
  /* Una sala del museo PIENA, e di un bioma diverso dalle altre foto: le Dune (sala 1 = a destra del
     corridoio, fila più lontana dall'atrio: centro attorno a 32,35). Digsy un po' sotto il centro,
     così il nome della sala sul muro non finisce sotto la barra in alto. */
  { nome: '04-museo', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('goto=city');
    await G.enterRoom('museum');
    await G.intPos(32, 35);
    ${ANIMA}
    ${FERMA(4000 + 39 * 150)}
  ` },
  /* Le teche d'AMBRA accanto a quelle d'oro: la seconda collezione della v0.98, copertina del devlog */
  { nome: '04b-ambra', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('godamber');
    await G.cmd('goto=city');
    await G.enterRoom('museum');
    await G.intPos(9, 15);
    ${ANIMA}
  ` },
  /* Un bioma che non sia il prato: dice "mondo grande" senza doverlo scrivere nel post. */
  { nome: '05-ghiacci', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('goto=ghiacci');
    ${ANIMA}
  ` },
  { nome: '06-palude', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('goto=palude');
    ${ANIMA}
  ` },
  /* LA NOTTE vista dal bordo di una città delle Lande Gelide (seme 29): in alto l'abitato con le
     finestre accese e l'alone, attorno il buio con la neve, Digsy col suo cono di luce che guarda
     verso casa. Dentro le mura la notte non si vede (le città restano illuminate apposta), e in
     mezzo a un bosco era solo verde scuro: nessuna delle due diceva "sera accogliente". */
  { nome: '07-notte', size: WIDE, seed: 29, passi: `
    ${PARTITA}
    await G.cmd('goto=city');
    var wd = await G.mod('world'), P = G.player();
    var t = wd.townForTile(Math.floor(P.x / 32), Math.floor(P.y / 32));
    P.x = t.C.x * 32 + 16; P.y = (t.C.y + 1) * 32; P.dir = 'down'; P.moving = false;
    ${''/* l'ora si sposta a mano e non col comando `night`: quello accende anche la missione
          delle lucciole, e il contatore "0/6" resta piantato in mezzo alla foto */}
    G.state().tod = 0.9;
    ${ANIMA}
    ${FERMA(4000 + 39 * 150)}
  ` },
  /* La mappa a pergamena. Serve anche da verifica: la stellina "sei qui" e la legenda senza i
     nomi dei biomi si giudicano solo guardandole. `stress=1` è l'unico modo di avere una mappa
     ESPLORATA senza camminare per ore (scopre i blocchi attorno al giocatore). In headless il
     rAF è fermo, quindi la stella resta nella fase grande: è quella che si vuole controllare. */
  { nome: '08-mappa', size: WIDE, seed: 4, passi: `
    ${PARTITA}
    await G.cmd('goto=prati');
    await G.cmd('goto=city');
    await G.cmd('stress=1');
    ${ANIMA}
    await G.openMap();
    await new Promise(function(r){ setTimeout(r, 900); });
  ` },
  /* La teca di cova nel Laboratorio, per il devlog dell'allevamento: l'uovo dentro il vetro,
     non un pannello di testo. Due chimere finte bastano da genitori, l'uovo si pianta a mano
     già pronto (stesso trucco usato dai test — vedi tests/shot.mjs vista 'uovo'). */
  /* 1280×720: la stanza è di 10×7 caselle a scala intera, e a 1920×1080 restava in mezzo a
     una cornice nera larga metà foto */
  { nome: '09-covata', size: '1280,720', passi: `
    ${PARTITA}
    await G.cmd('chimera');
    await G.cmd('chimera');
    await G.enterRoom('lab');
    if (G.intPos) await G.intPos(8, 6);
    var S = G.state(), cs = S.creatures;
    S.egg = { uid: 99999, skull: cs[0].skull, torso: cs[0].torso, leg: cs[0].leg, q: 'raro',
      p1: cs[0].name, p2: cs[1].name, laidDay: S.day, readyDay: S.day };
    ${ANIMA}
    ${FERMA(4000 + 39 * 150)}
  ` },
  /* LA SCHIUSA in corso: è la scena dell'aggiornamento, e si vede solo dopo due giorni di cova.
     Il comando `anim=hatch` la fa partire subito; si aspetta il momento in cui il guscio si è
     appena aperto (ROTTURA = 3,5 s) e il piccolo è già fuori. */
  { nome: '11-schiusa', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('chimera');
    await G.cmd('anim=hatch');
    ${''/* 3,2 s: l'attimo PRIMA che il guscio ceda (ROTTURA = 3,5 s) — l'uovo è tutto crepato e
          si legge cos'è. Dopo la rottura restano il lampo e una creatura in mezzo al buio, che
          in una foto ferma non racconta la schiusa. */}
    await new Promise(function(r){ setTimeout(r, 3200); });
  ` },
  /* Il vero USP del gioco per il marketing: due scheletri vistosi affiancati (drago alato +
     verme delle dune serpentino), non l'ennesimo screenshot dall'alto uguale a tutti i cozy
     game. Pagina 9 (0-based) del Libro = ossidraco (eccezionale, alato) + duneterno
     (leggendario, serpentino) — scelti a mano guardando bones.js per il profilo più diverso. */
  { nome: '10-scheletri', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('goto=prati');
    ${''/* pagina 14: ramarrospino e cinerarca dei Boschi Cinerei — sagome che non somigliano a
          niente delle altre foto. (La 24 no: il rospo gigante usciva dalla cornice coi piedi.) */}
    await G.openBook(14);
    await new Promise(function(r){ setTimeout(r, 2500); });
  ` },
  /* LA TESTATA della pagina itch: una striscia larga di cortile con le bestie in cammino e il
     titolo del gioco (lo stesso della splash, `.sp-title`) sopra. Senza la barra dell'HUD: qui
     non si mostra come si gioca, si dice cos'è. */
  /* scattata a 1920×1080 perché il gioco sceglie la scala dal lato corto (a 560 di altezza i
     pixel restavano piccoli e si vedeva mezzo mondo); la banda della testata si ritaglia dopo */
  { nome: 'testata', size: WIDE, passi: `
    ${PARTITA}
    for (var c = 0; c < 9; c++) await G.cmd('chimera');
    await G.cmd('gotopark');
    ${CORTILE(7, 5, 0, -60, -150, 60)}
    var st = document.createElement('style');
    st.textContent = '#hud,#bagbtn,#joy,#abtn,#exitbtn,.hudbar,#compass{display:none!important}' +
      '#testata{position:fixed;left:6%;top:50%;transform:translateY(-50%);z-index:50;text-align:center;' +
      'padding:26px 44px 30px;background:rgba(20,16,12,.55);border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.35)}' +
      '#testata .sp-title{animation:none;font-size:96px;margin:0}' +
      '#testata .sp-sub{margin:18px 0 0;font-size:15px;color:#f2e6cc}';
    document.head.appendChild(st);
    var box = document.createElement('div'); box.id = 'testata';
    box.innerHTML = '<h1 class="sp-title">DIGSY<em>WORLD</em></h1><div class="sp-sub">dig · discover · bring them back</div>';
    document.body.appendChild(box);
  ` },
];

function sonda(passi) {
  /* I tre elementi di servizio si spengono con un FOGLIO DI STILE, non a mano da JavaScript.
     Nasconderli dopo averli disegnati è una gara col tempo che si perde: il toast del bioma
     ("Entering: Ancient Marsh") lo rimette il primo giro di bussola, il tag rosso dei cheat
     ogni updateHUD, e lo scatto avviene quando finisce il tempo virtuale — cioè in un momento
     che il codice della sonda non sceglie. Una regola CSS vale già prima che nascano. */
  const nascondi = '<style>#toasts,#debugtag,#tutbox,#cmd{display:none!important}</style>';
  /* 1200 ms come in shot.mjs: `window.__digsy` viene montato dentro un import dinamico, prima
     di quel momento i ganci non esistono ancora e la scena partirebbe a vuoto. */
  return nascondi + `<script>setTimeout(function(){ (async function(){
    var G = window.__digsy || {};
    var sp = document.getElementById('splash');
    /* display:none e non solo la classe: .off sfuma, e allo scatto si leggevano ancora
       "Continue" e "Sign in with Google" in mezzo al mondo */
    if (sp) { sp.classList.add('off'); sp.style.display = 'none'; }
    var cmd = document.getElementById('cmd'); if (cmd) cmd.style.display = 'none';
    try { ${passi} } catch (e) { document.title = 'ERRORE: ' + (e && e.message); }
  })(); }, 1200);</script>`;
}

async function scatta(scena, porta) {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const pagina = '__promo-' + scena.nome + '.html';
  writeFileSync(join(DIST, pagina), html.replace('</body>', sonda(scena.passi) + '</body>'));
  const forza = (process.argv.find(a => a.startsWith('--seed=')) || '').split('=')[1];
  const seme = forza || scena.seed || 7;
  /* con un seme forzato la foto va in un file suo: serve a confrontare più mondi affiancati,
     e sovrascrivere quella buona mentre si cerca di meglio è il modo più rapido di perderla */
  const dest = join(OUT, scena.nome + (forza ? '-s' + forza : '') + '.png');
  await new Promise((risolvi) => {
    /* SPAWN e non execFileSync: quello blocca l'event loop di Node e il server qui sotto non
       risponderebbe più, lasciando Chrome ad aspettare una pagina che non arriva mai. */
    /* WebGL acceso via SwiftShader, e NIENTE --disable-gpu: gli scheletri del Libro sono
       Three.js, e senza contesto 3D il gioco ripiega sul disegno 2D piatto. Nella foto si
       vedevano macchie bianche al posto dei modelli — cioè proprio la cosa da mostrare. */
    const ch = spawn(CHROME, ['--headless=new', '--no-sandbox', '--hide-scrollbars',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--user-data-dir=' + mkdtempSync(join(tmpdir(), 'digsy-promo-')),
      '--window-size=' + scena.size, '--virtual-time-budget=20000',
      '--screenshot=' + dest, `http://127.0.0.1:${porta}/${pagina}?seed=${seme}`], { stdio: 'ignore' });
    const stacca = setTimeout(() => { try { ch.kill('SIGKILL'); } catch (e) {} risolvi(); }, 90000);
    ch.on('exit', () => { clearTimeout(stacca); risolvi(); });
  });
  return existsSync(dest) ? dest : null;
}

async function main() {
  if (!CHROME) { console.error('promo: Chrome non trovato'); return 1; }
  if (!existsSync(join(DIST, 'index.html'))) { console.error('promo: manca dist/ — `npm run build`'); return 1; }
  mkdirSync(OUT, { recursive: true });

  const filtro = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const lista = filtro.length ? SCENE.filter(s => filtro.some(f => s.nome.includes(f))) : SCENE;
  if (!lista.length) { console.error('promo: nessuna scena — ' + SCENE.map(s => s.nome).join(' ')); return 1; }

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

  let male = 0;
  for (const scena of lista) {
    const f = await scatta(scena, porta);
    if (f) console.log('  ✓ ' + scena.nome + '  ' + scena.size);
    else { console.error('  ✗ ' + scena.nome + ' — non scritta'); male++; }
  }
  srv.close();
  console.log('\nfoto in ' + OUT);
  return male ? 1 : 0;
}

process.exit(await main());
