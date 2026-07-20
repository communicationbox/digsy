<?php
/* SUITE DEL BACKEND — gira su SQLite, senza servizi da avviare e senza toccare il database
 * vero. Stesso codice della produzione: cambia solo il driver.
 *
 * `php server/tests/run.php` — esce 1 se qualcosa fallisce.
 */

$ok = 0; $fail = 0;
function check(string $name, bool $cond, string $extra = ''): void
{
    global $ok, $fail;
    if ($cond) { $ok++; echo "  OK  $name\n"; }
    else { $fail++; echo "  FAIL $name" . ($extra ? " | $extra" : '') . "\n"; }
}

/* Configurazione di prova. Di serie SQLite (nessun servizio da avviare), ma con
 * DIGSY_TEST_MYSQL=1 la stessa suite gira su MySQL/MariaDB VERO — che è quello che poi
 * risponde in produzione. Le differenze fra i due motori (tipi, AUTO_INCREMENT, indici) si
 * scoprono qui invece che sul server.
 *   DIGSY_TEST_MYSQL=1 DIGSY_TEST_DB=digsy_localtest php server/tests/run.php
 */
$useMysql = getenv('DIGSY_TEST_MYSQL') === '1';
$tmp = sys_get_temp_dir() . '/digsy_test_' . getmypid() . '.sqlite';
$cfgFile = sys_get_temp_dir() . '/digsy_test_cfg_' . getmypid() . '.php';
$dbCfg = $useMysql
    ? ['driver' => 'mysql', 'host' => getenv('DIGSY_TEST_HOST') ?: '127.0.0.1',
       'port' => (int)(getenv('DIGSY_TEST_PORT') ?: 3306),
       'name' => getenv('DIGSY_TEST_DB') ?: 'digsy_localtest',
       'user' => getenv('DIGSY_TEST_USER') ?: get_current_user(),
       'pass' => getenv('DIGSY_TEST_PASS') ?: '']
    : ['driver' => 'sqlite', 'path' => $tmp];
file_put_contents($cfgFile, '<?php return ' . var_export([
    'db' => $dbCfg,
    'google_client_id' => 'test-client.apps.googleusercontent.com',
    'session_days' => 30,
    'cookie_secure' => false,
], true) . ';');
putenv('DIGSY_CONFIG=' . $cfgFile);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/users.php';
require_once __DIR__ . '/../lib/saves.php';

echo "\nBACKEND DIGSY" . ($useMysql ? ' — su MySQL/MariaDB' : ' — su SQLite') . "\n" . str_repeat('-', 60) . "\n";
if ($useMysql) {   // si riparte puliti: la suite crea utenti e partite con dati fissi
    foreach (['saves', 'sessions', 'users'] as $t) { try { db()->exec("DROP TABLE IF EXISTS $t"); } catch (Throwable $e) { /* non c'era */ } }
}

/* ---------- schema ---------- */
migrate();
$tables = $useMysql
    ? db()->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN)
    : db()->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
check('le tre tabelle esistono', count(array_intersect(['users', 'sessions', 'saves'], $tables)) === 3,
    implode(',', $tables));
migrate();   // due volte di fila non deve esplodere: gira a ogni avvio
check('migrate() è ripetibile', true);

/* lo schema MySQL deve almeno essere sintatticamente diverso e non contenere parole di SQLite */
$my = implode(";\n", schemaStatements('mysql'));
check('lo schema MySQL non usa la sintassi di SQLite',
    !str_contains($my, 'AUTOINCREMENT') && str_contains($my, 'AUTO_INCREMENT'));
check('lo schema MySQL non usa CREATE INDEX IF NOT EXISTS (non supportato)',
    !str_contains($my, 'CREATE INDEX IF NOT EXISTS'));

/* ---------- utenti ---------- */
$u1 = userUpsert('google-sub-1', 'marco@example.com', 'Marco');
$u2 = userUpsert('google-sub-1', 'marco@example.com', 'Marco');
check('lo stesso account Google non crea due utenti', $u1['id'] === $u2['id']);
$u3 = userUpsert('google-sub-2', 'altro@example.com', 'Altro');
check('account diversi, utenti diversi', $u3['id'] !== $u1['id']);
/* l'email si può cambiare: la partita deve restare legata al 'sub', non all'indirizzo */
$u4 = userUpsert('google-sub-1', 'nuova@example.com', 'Marco');
check('cambiare email non fa perdere l\'utente', $u4['id'] === $u1['id'] && $u4['email'] === 'nuova@example.com');

/* ---------- sessioni ---------- */
$token = sessionCreate($u1['id'], 'test-agent');
check('il token di sessione è lungo e casuale', strlen($token) === 64 && ctype_xdigit($token));
$stored = db()->query('SELECT token_hash FROM sessions')->fetchColumn();
check('nel database c\'è solo l\'HASH, mai il token', $stored !== $token && $stored === hash('sha256', $token));
$_COOKIE[SESSION_COOKIE] = $token;
$me = currentUser();
check('col cookie giusto si viene riconosciuti', $me && (int)$me['id'] === (int)$u1['id']);
$_COOKIE[SESSION_COOKIE] = str_repeat('a', 64);
check('un token inventato non entra', currentUser() === null);
$_COOKIE[SESSION_COOKIE] = 'non-esadecimale';
check('un cookie malformato non entra', currentUser() === null);
/* sessione scaduta */
$_COOKIE[SESSION_COOKIE] = $token;
db()->prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
    ->execute([nowTs() - 10, hash('sha256', $token)]);
check('una sessione scaduta non entra', currentUser() === null);

/* ---------- salvataggi e CONFLITTI ---------- */
$tok2 = sessionCreate($u1['id'], 'pc');
$_COOKIE[SESSION_COOKIE] = $tok2;

check('senza salvataggi si ottiene null', saveLoad($u1['id']) === null);

$r1 = saveStore($u1['id'], 0, '{"day":3,"coins":40}', 'giorno 3 · 40 monete', 'pc', 0);
check('primo salvataggio accettato, versione 1', $r1['ok'] === true && $r1['version'] === 1);

$r2 = saveStore($u1['id'], 0, '{"day":4,"coins":55}', 'giorno 4 · 55 monete', 'pc', 1);
check('salvataggio successivo dalla versione giusta', $r2['ok'] === true && $r2['version'] === 2);

/* IL PUNTO DI TUTTO: il telefono ha giocato mezz'ora partendo dalla versione 1, intanto il
   PC ha salvato la 2. Sovrascrivere vorrebbe dire cancellare il gioco dell'altro. */
$r3 = saveStore($u1['id'], 0, '{"day":9,"coins":10}', 'giorno 9 · 10 monete', 'telefono', 1);
check('scrittura su versione superata: RIFIUTATA', $r3['ok'] === false && $r3['conflict'] === true);
check('il rifiuto restituisce la versione del server, per poter scegliere',
    ($r3['server']['summary'] ?? '') === 'giorno 4 · 55 monete');
$still = saveLoad($u1['id']);
check('dopo il rifiuto il salvataggio sul server è intatto',
    $still['version'] === 2 && str_contains($still['data'], '"day":4'));

/* forzare vince, ma solo se lo si chiede esplicitamente (è la scelta del giocatore) */
$r4 = saveStore($u1['id'], 0, '{"day":9,"coins":10}', 'giorno 9 · 10 monete', 'telefono', 1, true);
check('con la forzatura esplicita la scrittura passa', $r4['ok'] === true && $r4['version'] === 3);

/* ---------- i tre salvataggi manuali (slot 1..3) ----------
   Sono partite indipendenti: ognuna col suo numero di versione, e un conflitto su una non
   deve toccare le altre. Chi salva nello slot 2 sul computer deve ritrovarlo sul telefono. */
saveStore($u1['id'], 1, '{"day":20,"coins":500}', 'giorno 20', 'pc', 0);
saveStore($u1['id'], 2, '{"day":7,"coins":70}', 'giorno 7', 'pc', 0);
check('ogni slot ha la sua partita',
    str_contains(saveLoad($u1['id'], 1)['data'], '"day":20')
    && str_contains(saveLoad($u1['id'], 2)['data'], '"day":7'));
check('gli slot hanno versioni indipendenti',
    saveLoad($u1['id'], 1)['version'] === 1 && saveLoad($u1['id'], 0)['version'] === 3);
/* un conflitto sullo slot 1 non deve intaccare né lo slot 2 né la partita in corso */
$c = saveStore($u1['id'], 1, '{"day":99}', 'g99', 'telefono', 0);
check('conflitto su uno slot: rifiutato', empty($c['ok']) && !empty($c['conflict']));
check('e gli altri slot restano intatti',
    str_contains(saveLoad($u1['id'], 1)['data'], '"day":20')
    && str_contains(saveLoad($u1['id'], 2)['data'], '"day":7')
    && str_contains(saveLoad($u1['id'], 0)['data'], '"day":9'));
/* `savesAll`: tutte insieme, che è come le chiede il gioco all'accesso */
$all = savesAll($u1['id']);
check('savesAll restituisce partita in corso e slot, indicizzati per slot',
    isset($all['0'], $all['1'], $all['2']) && !isset($all['3'])
    && str_contains($all['1']['data'], '"day":20'));
check('savesAll porta i dati veri, non solo i riassunti',
    strlen($all['0']['data']) > 5 && $all['1']['version'] === 1);
check('savesAll di chi non ha nulla è vuoto, non esplode', savesAll($u3['id']) === []);

/* i salvataggi non si mescolano fra utenti */
saveStore($u3['id'], 0, '{"day":1}', 'giorno 1', 'altro', 0);
check('ogni utente vede solo la propria partita',
    str_contains(saveLoad($u1['id'])['data'], '"day":9') && str_contains(saveLoad($u3['id'])['data'], '"day":1'));

/* ---------- il freno sull'accesso ----------
   `?do=google` è l'unico endpoint che chiunque può chiamare senza avere un account, e ogni
   chiamata tiene occupato un worker PHP finché Google non risponde: senza un freno bastano
   poche decine di richieste parallele per fermare il gioco a tutti. */
require_once __DIR__ . '/../lib/ratelimit.php';
$rlDir = sys_get_temp_dir() . '/digsy-rl-test-' . getmypid();
@mkdir($rlDir, 0700, true);
$GLOBALS['__rl_dir'] = $rlDir;
$ip = 'prova-' . getmypid();
$passati = 0;
for ($i = 0; $i < RL_MAX; $i++) if (rateLimitOk($ip, RL_MAX, 60)) $passati++;
check('i tentativi normali passano tutti', $passati === RL_MAX);
check('oltre il limite si viene fermati', rateLimitOk($ip, RL_MAX, 60) === false);
check('un altro indirizzo non è toccato', rateLimitOk($ip . '-altro', RL_MAX, 60) === true);
/* il conteggio è per finestra: passata quella si ricomincia */
check('nella finestra dopo si riparte da zero', rateLimitOk($ip, RL_MAX, 1) === true);
/* l'indirizzo non si conserva in chiaro: sui dischi resta solo un'impronta */
$files = (array)glob(rlDir() . '/*');
$inChiaro = 0;
foreach ($files as $f) if (strpos(basename($f), $ip) !== false) $inChiaro++;
check('l\'indirizzo non finisce in chiaro sul disco', $inChiaro === 0);

/* ---------- cancellazione dell'account ---------- */
userDelete($u3['id']);
check('cancellare l\'account cancella la partita', saveLoad($u3['id']) === null);
$left = db()->prepare('SELECT COUNT(*) FROM users WHERE id = ?');
$left->execute([$u3['id']]);
check('cancellare l\'account cancella l\'utente', (int)$left->fetchColumn() === 0);

/* ---------- verifica del token Google ---------- */
require_once __DIR__ . '/../lib/google.php';
{
    /* Google finto: i test devono poter provare i casi CATTIVI senza chiamare la rete.
       Sono quelli il motivo per cui la verifica esiste: un token valido di per sé non basta. */
    $good = [
        'aud' => 'test-client.apps.googleusercontent.com',
        'iss' => 'https://accounts.google.com',
        'exp' => nowTs() + 3600,
        'sub' => '1234567890',
        'email' => 'marco@example.com',
        'email_verified' => 'true',
        'name' => 'Marco',
    ];
    $fake = fn(array $over = []) => fn(string $t) => array_merge($good, $over);

    $r = googleVerify('tok', $fake());
    check('token buono: accettato', $r['ok'] === true && $r['sub'] === '1234567890');

    /* IL controllo che si dimentica sempre: un token emesso per un'ALTRA applicazione è un
       token perfettamente valido per Google. Senza questo, vale anche qui. */
    $r = googleVerify('tok', $fake(['aud' => 'app-di-qualcun-altro.apps.googleusercontent.com']));
    check('token di un\'altra applicazione: RIFIUTATO', $r['ok'] === false && $r['error'] === 'wrong_audience');

    $r = googleVerify('tok', $fake(['iss' => 'https://evil.example.com']));
    check('emittente non Google: rifiutato', $r['ok'] === false && $r['error'] === 'wrong_issuer');

    $r = googleVerify('tok', $fake(['exp' => nowTs() - 10]));
    check('token scaduto: rifiutato', $r['ok'] === false && $r['error'] === 'expired');

    $r = googleVerify('tok', $fake(['email_verified' => 'false']));
    check('email non verificata: rifiutata', $r['ok'] === false && $r['error'] === 'email_unverified');

    $r = googleVerify('tok', fn(string $t) => null);
    check('Google non conferma il token: rifiutato', $r['ok'] === false && $r['error'] === 'unverified');

    $r = googleVerify('', $fake());
    check('token vuoto: rifiutato senza nemmeno chiedere', $r['ok'] === false && $r['error'] === 'bad_token');

    /* il confronto dell'audience non deve passare da == permissivo */
    $r = googleVerify('tok', $fake(['aud' => 'test-client.apps.googleusercontent.com.evil.com']));
    check('audience simile ma diversa: rifiutata', $r['ok'] === false);
}

/* ---------- gli endpoint esistono e sono sintatticamente validi ---------- */
foreach (['api/auth.php', 'api/save.php', 'lib/http.php'] as $f) {
    $path = __DIR__ . '/../' . $f;
    exec('php -l ' . escapeshellarg($path) . ' 2>&1', $outLines, $rc);
    check("$f compila", $rc === 0, implode(' ', $outLines));
    $outLines = [];
}

echo str_repeat('-', 60) . "\n";
echo "backend: $ok ok, $fail fail\n\n";
@unlink($tmp); @unlink($cfgFile);
exit($fail > 0 ? 1 : 0);
