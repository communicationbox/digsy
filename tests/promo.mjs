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

const SCENE = [
  /* La piazza. Ci si mette accanto alla STATUA e non in mezzo al viale: da lì entra in
     inquadratura il Museo, l'unico edificio con una sagoma sua (frontone e colonne) e il posto
     attorno a cui gira tutto il gioco. Piantati sul viale si fotografano sempre le stesse tre
     botteghe di fila, e il Museo resta fuori campo. */
  { nome: '01-citta', size: WIDE, seed: 4, passi: `
    ${PARTITA}
    ${''/* prima nei Prati e POI la città: `goto=city` da solo prende quella più vicina al punto
          di partenza, che col seme cambia bioma ogni volta — e in una città delle Dune Ossee
          sabbia, lastricato ed edifici sono tutti dello stesso beige, senza un contrasto */}
    await G.cmd('goto=prati');
    await G.cmd('goto=city');
    await G.gotoStatue();
    ${ANIMA}
  ` },
  /* Il recinto ABITATO. Il post promette che le creature "vivono nel parco": se la foto mostra
     un prato vuoto la promessa si smonta da sola. Chimere vere, assemblate dal gioco. */
  { nome: '02-parco', size: WIDE, passi: `
    ${PARTITA}
    for (var c = 0; c < 6; c++) await G.cmd('chimera');
    await G.cmd('gotopark');
    ${ANIMA}
  ` },
  /* Il Libro con lo scheletro 3D: è la cosa che nessun altro gioco cozy ha, e nelle immagini
     pubblicate finora non compariva mai. */
  { nome: '03-libro', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('goto=city');
    ${ANIMA}
    await G.openBook();
    await new Promise(function(r){ setTimeout(r, 2500); });
  ` },
  /* Le sale del museo piene: l'unico traguardo lungo del gioco, quello che dà un motivo per
     continuare a scavare. Ci si mette in MEZZO alla prima sala: si entra dall'atrio in fondo e
     da lì dei piedistalli non si vede niente. */
  { nome: '04-museo', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('goto=city');
    await G.enterRoom('museum');
    await G.intPos(15, 51);
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
  /* La notte con i lampioni accesi: il gioco ha un ciclo giorno/notte e nelle immagini non si
     era mai visto. È anche l'inquadratura più "cozy" che il gioco sappia produrre. */
  { nome: '07-notte', size: WIDE, seed: 4, passi: `
    ${PARTITA}
    await G.cmd('goto=prati');
    await G.cmd('goto=city');
    ${''/* l'ora si sposta a mano e non col comando `night`: quello accende anche la missione
          delle lucciole, e il contatore "0/6" resta piantato in mezzo alla foto */}
    G.state().tod = 0.9;
    ${ANIMA}
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
  { nome: '09-covata', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('chimera');
    await G.cmd('chimera');
    await G.enterRoom('lab');
    if (G.intPos) await G.intPos(8, 6);
    var S = G.state(), cs = S.creatures;
    S.egg = { uid: 99999, skull: cs[0].skull, torso: cs[0].torso, leg: cs[0].leg, q: 'raro',
      p1: cs[0].name, p2: cs[1].name, laidDay: S.day, readyDay: S.day };
    ${ANIMA}
  ` },
  /* Il vero USP del gioco per il marketing: due scheletri vistosi affiancati (drago alato +
     verme delle dune serpentino), non l'ennesimo screenshot dall'alto uguale a tutti i cozy
     game. Pagina 9 (0-based) del Libro = ossidraco (eccezionale, alato) + duneterno
     (leggendario, serpentino) — scelti a mano guardando bones.js per il profilo più diverso. */
  { nome: '10-scheletri', size: WIDE, passi: `
    ${PARTITA}
    await G.cmd('goto=prati');
    await G.openBook(9);
    await new Promise(function(r){ setTimeout(r, 2500); });
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
