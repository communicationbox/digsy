/* PUBBLICARE, CONTROLLANDO CHE SIA ANDATA BENE.
 *
 * Finora si pubblicava con `tar | ssh` a mano: nessuna verifica dopo, nessun modo rapido di
 * tornare indietro, e se un file arrivava a metà il sito restava rotto finché qualcuno non
 * apriva la pagina. Per un gioco con giocatori veri è poco.
 *
 *   npm run deploy            → costruisce, pubblica, verifica; se qualcosa non torna, TORNA INDIETRO
 *   npm run deploy -- --check → solo la verifica, senza pubblicare niente
 *
 * Cosa fa, in ordine:
 *   1. pretende che test ed e2e siano verdi (si pubblica solo roba provata)
 *   2. mette da parte la versione che c'è ora, sul server
 *   3. pubblica
 *   4. controlla che il gioco risponda, che la versione online sia quella nuova, che l'API
 *      stia in piedi e che i file riservati restino irraggiungibili
 *   5. se un controllo fallisce, rimette la versione di prima e lo dice
 */
import { execSync, execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'digsy';
const REMOTO = '/var/www/digsy.dev-box.it/httpdocs';
const GIOCO = REMOTO;                   // il gioco vive alla RADICE (la vetrina è stata tolta)
const SITO = 'https://digsy.dev-box.it';
const MUX = `/tmp/dbssh-mux-${process.getuid()}-%C`;

const ssh = (cmd) => execFileSync('ssh',
  ['-o', 'ControlMaster=no', '-o', `ControlPath=${MUX}`, HOST, cmd],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 });

const stato = (url) => {
  try {
    return execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', url],
      { encoding: 'utf8' }).trim();
  } catch (e) { return '000'; }
};
const corpo = (url) => {
  try { return execFileSync('curl', ['-s', url], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); }
  catch (e) { return ''; }
};

function versioneLocale() {
  const m = /VERSION\s*=\s*'([^']+)'/.exec(readFileSync(join(ROOT, 'src/version.js'), 'utf8'));
  return m ? m[1] : '?';
}
function versioneOnline() {
  const html = corpo(SITO + '/');
  const js = /assets\/(index|main)-[A-Za-z0-9_-]+\.js/.exec(html);
  if (!js) return null;
  const m = /v\d+\.\d+\.\d+/.exec(corpo(SITO + '/' + js[0]));
  return m ? m[0] : null;
}

/* I controlli che decidono se la pubblicazione è riuscita. Non "il server risponde": anche
   una pagina di errore risponde. Si guarda che ci sia il GIOCO, nella versione giusta, con
   l'API viva e i file riservati ancora chiusi. */
function verifica(atteso) {
  const esiti = [];
  const dai = (nome, ok, extra) => esiti.push({ nome, ok, extra: extra || '' });

  dai('la radice risponde', stato(SITO + '/') === '200');
  /* IL GIOCO STA ALLA RADICE (la vetrina è stata tolta). Non basta "200": una pagina
     d'errore risponde uguale — si guarda che ci sia il canvas del gioco. */
  dai('alla radice c\'è il gioco', corpo(SITO + '/').includes('id="cv"'));
  const v = versioneOnline();
  dai('online c\'è la versione appena pubblicata', v === atteso, (v || 'nessuna') + ' vs ' + atteso);
  dai('l\'API è viva', stato(SITO + '/server/api/auth.php?do=me') === '200');
  const h = corpo(SITO + '/server/health.php');
  dai('database e scrittura funzionano', h.includes('"ok":true'), h.slice(0, 60));
  dai('la privacy è raggiungibile', stato(SITO + '/privacy.html') === '200');

  /* SI INSTALLA COME APP? Servono tre cose e basta una fuori posto perché "Installa" non
     compaia — senza che nessuno dica perché. */
  dai('il manifest c\'è', stato(SITO + '/manifest.webmanifest') === '200');
  dai('il service worker c\'è', stato(SITO + '/sw.js') === '200');
  /* IN PRODUZIONE CI STA SOLO IL GIOCO. Gli strumenti di lavoro (Sprite Studio, playground,
     le pagine __*.html dei test) importano i SORGENTI: tenerli online vuol dire pubblicare
     tutto il codice per far funzionare una cosa che serve a una persona sola, sul suo
     computer. Vivono in locale con `npm run dev`. */
  for (const [nome, url] of [['i sorgenti', '/src/sprites.js'], ['lo Sprite Studio', '/sprites/'],
    ['le pagine di prova', '/__e2e.html']]) {
    const st = stato(SITO + url);
    dai(nome + ' non è in produzione', st === '404' || st === '403', 'HTTP ' + st);
  }

  /* LE ISTRUZIONI DI CACHE. Sono la differenza fra pubblicare e RAGGIUNGERE i giocatori.
     Il service worker soprattutto: se resta in cache lui, decide cosa vedono tutti per un
     anno intero. Ci è già cascato — la regola generica `.js` stava DOPO e lo annullava,
     perché fra più <FilesMatch> Apache applica l'ultimo. */
  const cache = (url) => {
    try {
      const h = execFileSync('curl', ['-sI', SITO + url], { encoding: 'utf8' });
      const m = /cache-control:\s*(.+)/i.exec(h);
      return m ? m[1].trim() : '(nessuna)';
    } catch (e) { return '(errore)'; }
  };
  for (const [nome, url] of [['l\'HTML del gioco', '/'], ['il service worker', '/sw.js']]) {
    const c = cache(url);
    dai(nome + ' si ricontrolla sempre', /no-cache|no-store|max-age=0/.test(c), c);
  }
  /* e le cose che NON devono vedersi */
  for (const [nome, url] of [['il config', '/server/config.php'], ['le librerie', '/server/lib/db.php'],
    ['i test', '/server/tests/run.php']]) {
    const s = stato(SITO + url);
    dai(nome + ' resta irraggiungibile', s === '403' || s === '404', 'HTTP ' + s);
  }
  return esiti;
}

function main() {
  const soloCheck = process.argv.includes('--check');
  const v = versioneLocale();

  if (!soloCheck) {
    console.log('· prove (si pubblica solo ciò che è provato)');
    try {
      execSync('npm test', { cwd: ROOT, stdio: 'pipe' });
      execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
      execSync('npm run e2e', { cwd: ROOT, stdio: 'pipe' });
    } catch (e) {
      console.error('  prove FALLITE: non si pubblica.');
      console.error((e.stdout || '').toString().split('\n').filter(l => /FAIL|fail/.test(l)).slice(-6).join('\n'));
      return 1;
    }
    console.log('  verdi');

    console.log('· metto da parte la versione online');
    ssh(`cd ${REMOTO} && rm -rf .prev && mkdir .prev && ` +
        `tar cf - --exclude=.prev --exclude=server --exclude='__*.html' --exclude=src ` +
        `--exclude=sprites --exclude=wonders --exclude=playground --exclude=editor ` +
        `--exclude=bag-editor . | (cd .prev && tar xf -) && chmod -R a+rX .prev`);

    console.log('· pubblico ' + v);
    /* `--exclude`: la dist contiene anche gli strumenti (Vite copia tutta public/), ma in
       produzione non devono arrivare. Restano in locale, dove servono. */
    execSync(`cd ${ROOT}/dist && COPYFILE_DISABLE=1 tar czf - . | ` +
      `ssh -o ControlMaster=no -o ControlPath=${MUX} ${HOST} ` +
      /* gli strumenti si tolgono DOPO l'estrazione invece di escluderli dal tar: i pattern
         di `--exclude` si comportano diversamente fra il tar di macOS e quello di Linux, e
         un'esclusione che silenziosamente non funziona è peggio di nessuna esclusione. */
      `"mkdir -p ${GIOCO} && cd ${GIOCO} && tar xzf - && rm -rf __*.html src sprites wonders playground editor bag-editor .DS_Store && ` +
      `find . -name '._*' -delete && chmod -R a+rX ."`,
      { stdio: 'pipe', shell: '/bin/bash' });
  }

  console.log('· verifico');
  const esiti = verifica(v);
  for (const e of esiti) console.log(`  ${e.ok ? 'ok  ' : 'NO  '}${e.nome}${e.extra ? '  (' + e.extra + ')' : ''}`);
  const rotti = esiti.filter(e => !e.ok);

  if (!rotti.length) { console.log('\npubblicato ' + v + ': tutto in piedi'); return 0; }

  if (soloCheck) { console.log('\n' + rotti.length + ' controlli falliti'); return 1; }

  console.log('\n' + rotti.length + ' controlli falliti → TORNO INDIETRO');
  try {
    /* `chmod` DOPO il ripristino: `tar` conserva i permessi del backup, che nasce da una
       copia fatta con l'umask del momento. È successo davvero — il ripristino ha rimesso i
       file giusti con permessi 640, Apache non poteva leggerli e il sito è rimasto giù con
       403 su tutto. Un ritorno indietro che lascia il sito rotto è peggio di nessun ritorno
       indietro, perché fa credere di essere al sicuro. */
    ssh(`cd ${REMOTO}/.prev && tar cf - . | (cd ${REMOTO} && tar xf -) && cd ${REMOTO} && chmod -R a+rX .`);
    const dopo = verifica(versioneOnline() || '?').filter(e => !e.ok && e.nome !== 'online c\'è la versione appena pubblicata');
    console.log(dopo.length ? '  ATTENZIONE: il ripristino non ha sistemato tutto' : '  versione precedente rimessa, il sito è di nuovo in piedi');
  } catch (e) {
    console.error('  ripristino FALLITO: ' + e.message);
  }
  return 1;
}

process.exit(main());
