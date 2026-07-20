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
  const js = /assets\/index-[A-Za-z0-9_-]+\.js/.exec(html);
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

  dai('la pagina risponde', stato(SITO + '/') === '200');
  const v = versioneOnline();
  dai('online c\'è la versione appena pubblicata', v === atteso, (v || 'nessuna') + ' vs ' + atteso);
  dai('l\'API è viva', stato(SITO + '/server/api/auth.php?do=me') === '200');
  const h = corpo(SITO + '/server/health.php');
  dai('database e scrittura funzionano', h.includes('"ok":true'), h.slice(0, 60));
  dai('la privacy è raggiungibile', stato(SITO + '/privacy.html') === '200');
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
        `tar cf - --exclude=.prev --exclude=server . | (cd .prev && tar xf -)`);

    console.log('· pubblico ' + v);
    execSync(`cd ${ROOT}/dist && COPYFILE_DISABLE=1 tar czf - . | ` +
      `ssh -o ControlMaster=no -o ControlPath=${MUX} ${HOST} ` +
      `"cd ${REMOTO} && tar xzf - && find . -name '._*' -delete && chmod -R a+rX ."`,
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
    ssh(`cd ${REMOTO}/.prev && tar cf - . | (cd ${REMOTO} && tar xf -)`);
    const dopo = verifica(versioneOnline() || '?').filter(e => !e.ok && e.nome !== 'online c\'è la versione appena pubblicata');
    console.log(dopo.length ? '  ATTENZIONE: il ripristino non ha sistemato tutto' : '  versione precedente rimessa, il sito è di nuovo in piedi');
  } catch (e) {
    console.error('  ripristino FALLITO: ' + e.message);
  }
  return 1;
}

process.exit(main());
