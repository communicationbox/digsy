/* AVATAR quadrato per i profili (Reddit, itch, Discord) — `npm run avatar`.
 *
 * Non è l'icona dell'app riciclata così com'è. `public/icon-512.png` ha una cornice scura di
 * 64px per lato che sull'icona di un telefono serve (stacca dallo sfondo), ma in un avatar
 * viene RITAGLIATA VIA in tondo: resta un faccino piccolo in mezzo a un anello marrone, e a
 * 40px — la misura vera accanto a un commento — non si capisce cosa sia. Qui la stessa immagine
 * si ingrandisce e si centra finché la cornice esce dall'inquadratura: il viso riempie il
 * cerchio. Nessun ridisegno a mano, così l'avatar non può divergere dall'icona del gioco.
 *
 * Esce in `.shots/avatar.png` (512×512) e in `reddit/immagini/avatar.png`.
 */
import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, '.shots');
const SRC = join(ROOT, 'public', 'icon-512.png');
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(c => existsSync(c));

const LATO = 512;
/* Reddit e Discord ritagliano l'avatar IN TONDO. Il quadrato va quindi composto per il cerchio
   inscritto, non per i suoi bordi: un cappello che tocca il lato in alto si ritrova gli angoli
   tagliati, perché lassù il cerchio è già rientrato di parecchio.
   La cornice dell'icona si butta via (in un tondo diventa un anello marrone attorno a un
   faccino minuscolo) e al suo posto va ARIA, che tiene il personaggio dentro il cerchio.
   Quanto tagliare NON si scrive a mano: la cornice ha gli angoli a scalini, e con un numero
   fisso restavano quattro tacche scure appese in mezzo al nulla. Si misura il personaggio
   scartando i colori del fondo, così se un giorno l'icona cambia bordo l'avatar segue. */
const MARGINE = 46;   // px di aria attorno al personaggio
const FONDO = '#3f2d1d';

const PAGINA = `<style>
  html,body{margin:0;background:#241a10}
  canvas{display:block;image-rendering:pixelated}
</style>
<canvas id="c" width="${LATO}" height="${LATO}"></canvas>
<script>
  var c = document.getElementById('c'), x = c.getContext('2d');
  var im = new Image();
  im.onload = function () {
    /* pixelated e basta non basta: il ridimensionamento del CONTESTO ha la sua impostazione,
       e senza questa riga i pixel dell'arte 8-bit escono sfocati (regola 3: scale intere,
       niente interpolazione). */
    x.imageSmoothingEnabled = false;

    /* 1) l'icona in chiaro, per misurarla */
    var mis = document.createElement('canvas');
    mis.width = im.width; mis.height = im.height;
    var mx = mis.getContext('2d', { willReadFrequently: true });
    mx.imageSmoothingEnabled = false;
    mx.drawImage(im, 0, 0);
    var px = mx.getImageData(0, 0, im.width, im.height).data;

    /* 2) riquadro del personaggio. Il fondo dell'icona è fatto di DUE marroni (la fascia
          esterna quasi nera e quella appena dentro), quindi campionare un angolo solo non
          basta: restavano quattro tacche scure degli angoli a scalini. Si separano per
          LUMINOSITÀ — i due marroni stanno sotto 70, cappello, viso e maglia molto sopra.
          Gli occhi sono scuri quanto il fondo, ma stanno in mezzo alla faccia e il riquadro
          non se ne accorge. */
    var x0 = im.width, y0 = im.height, x1 = -1, y1 = -1;
    for (var Y = 0; Y < im.height; Y++) for (var X = 0; X < im.width; X++) {
      var i = (Y * im.width + X) * 4;
      if (px[i + 3] < 8) continue;                        // trasparente: non conta
      if (px[i] * 0.299 + px[i+1] * 0.587 + px[i+2] * 0.114 < 70) continue;
      if (X < x0) x0 = X; if (X > x1) x1 = X;
      if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
    }
    /* riquadro QUADRATO attorno al personaggio: allargando il lato corto non lo si deforma */
    var lw = x1 - x0 + 1, lh = y1 - y0 + 1, lato = Math.max(lw, lh);
    var sx = x0 - (lato - lw) / 2, sy = y0 - (lato - lh) / 2;

    /* 4) fondo pieno + personaggio centrato con aria attorno */
    x.fillStyle = ${JSON.stringify(FONDO)};
    x.fillRect(0, 0, ${LATO}, ${LATO});
    var m = ${MARGINE}, d = ${LATO} - m * 2;
    x.drawImage(im, sx, sy, lato, lato, m, m, d, d);
    document.title = 'PRONTO ' + sx + ',' + sy + ' ' + lato;
  };
  im.src = '/icon-512.png';
</script>`;

const MIME = { '.html': 'text/html', '.png': 'image/png' };

async function main() {
  if (!CHROME) { console.error('avatar: Chrome non trovato'); return 1; }
  if (!existsSync(SRC)) { console.error('avatar: manca public/icon-512.png'); return 1; }
  mkdirSync(SHOTS, { recursive: true });

  const srv = createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/avatar.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(PAGINA); return; }
    let body = null;
    try { body = readFileSync(join(ROOT, 'public', u)); } catch (e) { /* non c'è */ }
    if (!body) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(u)] || 'application/octet-stream' });
    res.end(body);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const porta = srv.address().port;
  const dest = join(SHOTS, 'avatar.png');

  await new Promise((risolvi) => {
    const ch = spawn(CHROME, ['--headless=new', '--no-sandbox', '--hide-scrollbars',
      '--user-data-dir=' + mkdtempSync(join(tmpdir(), 'digsy-avatar-')),
      '--window-size=' + LATO + ',' + LATO, '--virtual-time-budget=5000',
      '--screenshot=' + dest, `http://127.0.0.1:${porta}/avatar.html`], { stdio: 'ignore' });
    const stacca = setTimeout(() => { try { ch.kill('SIGKILL'); } catch (e) {} risolvi(); }, 30000);
    ch.on('exit', () => { clearTimeout(stacca); risolvi(); });
  });
  srv.close();
  if (!existsSync(dest)) { console.error('avatar: non è stato scritto'); return 1; }

  const copia = join(ROOT, 'reddit', 'immagini', 'avatar.png');
  try { copyFileSync(dest, copia); } catch (e) { /* la cartella del post può non esserci */ }
  console.log('avatar: ' + dest + '  (' + LATO + '×' + LATO + ')');
  return 0;
}

process.exit(await main());
