<?php
/* INSTALLAZIONE — crea le tabelle e dice cosa non va, in italiano, senza far indovinare.
 *
 * Si usa in due modi:
 *   da riga di comando (SSH):   php install.php
 *   dal browser:                https://…/server/install.php?token=IL_TOKEN
 *
 * Il token sta in config.php ed è OBBLIGATORIO via web: senza, questo file sarebbe un
 * pulsante "tocca il mio database" esposto a chiunque passi. Da riga di comando non serve —
 * chi è già dentro il server non ha bisogno di questa porta.
 *
 * È RIPETIBILE. Le CREATE sono IF NOT EXISTS: rilanciarlo su un database già a posto non
 * cancella niente e non duplica niente. Serve anche come diagnosi quando qualcosa smette
 * di funzionare.
 *
 * QUANDO HAI FINITO, CANCELLALO DAL SERVER. Le tabelle restano; questo file no.
 */

require_once __DIR__ . '/lib/db.php';

$cli = PHP_SAPI === 'cli';
if (!$cli) header('Content-Type: text/plain; charset=utf-8');

$out = [];
$fail = function (string $msg, string $fix = '') use (&$out, $cli) {
    $out[] = 'ERRORE: ' . $msg;
    if ($fix !== '') $out[] = '';
    if ($fix !== '') $out[] = 'COSA FARE: ' . $fix;
    echo implode("\n", $out), "\n";
    if (!$cli) http_response_code(500);
    exit(1);
};

$out[] = '=== Digsy — installazione del database ===';
$out[] = '';

/* ---------- 1. il file di configurazione ---------- */
try {
    $c = config();
} catch (Throwable $e) {
    $fail($e->getMessage(),
        'Copia config.example.php in config.php e compila utente e password del database.');
}
$d = $c['db'] ?? [];
/* solo MySQL ha una password da compilare: SQLite (i test) è un file e non ne vuole */
if (($d['driver'] ?? 'mysql') !== 'sqlite'
    && (($d['pass'] ?? '') === 'DA_COMPILARE' || ($d['pass'] ?? '') === '')) {
    $fail('la password del database non è stata compilata in config.php',
        'Apri config.php e sostituisci DA_COMPILARE con la password vera.');
}

/* ---------- 2. il token, solo via web ---------- */
if (!$cli) {
    $tok = (string)($c['install_token'] ?? '');
    if ($tok === '' || $tok === 'DA_COMPILARE') {
        $fail("manca 'install_token' in config.php",
            "Aggiungi a config.php una riga tipo:\n           'install_token' => '" . bin2hex(random_bytes(16)) . "',\n           poi richiama questa pagina con ?token=quel_valore");
    }
    $got = (string)($_GET['token'] ?? '');
    /* confronto a tempo costante: con == la lunghezza della risposta racconta quanto ci si
       è andati vicino, e un token si indovina un carattere alla volta */
    if (!hash_equals($tok, $got)) {
        http_response_code(403);
        echo "Token mancante o sbagliato.\n";
        exit(1);
    }
}

$out[] = 'configurazione:  letta';
$out[] = 'driver:          ' . ($d['driver'] ?? '?');
$out[] = 'database:        ' . ($d['name'] ?? '?') . ' su ' . ($d['host'] ?? '?');
$out[] = 'utente:          ' . ($d['user'] ?? '?');
$out[] = '';

/* ---------- 3. la connessione ---------- */
try {
    $pdo = db();
} catch (PDOException $e) {
    $msg = $e->getMessage();
    $code = $e->getCode();
    if (str_contains($msg, 'Unknown database')) {
        $fail("il database '" . ($d['name'] ?? '?') . "' non esiste",
            "Crealo dal pannello dell'hosting (o con: CREATE DATABASE `" . ($d['name'] ?? 'digsy') . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;) e assegna l'utente '" . ($d['user'] ?? '') . "'.");
    }
    if ($code === 1045 || str_contains($msg, 'Access denied')) {
        $fail("utente o password rifiutati dal database",
            "Controlla utente e password in config.php. Se il database sta su un altro host, cambia anche 'host'.");
    }
    if (str_contains($msg, 'Connection refused') || str_contains($msg, "Can't connect")) {
        $fail("il server MySQL non risponde su '" . ($d['host'] ?? '?') . "'",
            "Se stai lanciando questo script dal tuo computer, non funzionerà: 'localhost' è il server. Caricalo su digsy.dev-box.it ed eseguilo da lì.");
    }
    $fail('connessione fallita: ' . $msg, 'Controlla i dati in config.php.');
}
$out[] = 'connessione:     riuscita';

/* ---------- 4. le tabelle ---------- */
$before = tabelle($pdo);
try {
    migrate($pdo);
} catch (PDOException $e) {
    $fail('creazione delle tabelle fallita: ' . $e->getMessage(),
        "All'utente '" . ($d['user'] ?? '') . "' serve il permesso CREATE su questo database. Chiedi al pannello dell'hosting di concederlo, oppure crea le tabelle a mano.");
}
$after = tabelle($pdo);

$attese = ['users', 'sessions', 'saves'];
$mancanti = array_values(array_diff($attese, $after));
if ($mancanti) {
    $fail('queste tabelle non risultano create: ' . implode(', ', $mancanti),
        'Controlla i permessi dell\'utente sul database.');
}

$nuove = array_values(array_diff($after, $before));
$out[] = 'tabelle:         ' . implode(', ', $attese) . ' — a posto'
       . ($nuove ? ' (create ora: ' . implode(', ', $nuove) . ')' : ' (c\'erano già)');

/* ---------- 5. si scrive e si legge davvero? ---------- */
try {
    $pdo->beginTransaction();
    $sub = 'prova-installazione-' . bin2hex(random_bytes(6));
    $st = $pdo->prepare('INSERT INTO users (google_sub, email, name, created_at, last_seen_at) VALUES (?,?,?,?,?)');
    $st->execute([$sub, 'prova@example.com', 'Prova', time(), time()]);
    $id = (int)$pdo->lastInsertId();
    $st = $pdo->prepare('SELECT email FROM users WHERE id = ?');
    $st->execute([$id]);
    $letto = $st->fetchColumn();
    $pdo->rollBack();                      // la riga di prova non resta
    if ($letto !== 'prova@example.com') $fail('scrittura e rilettura non coincidono');
    $out[] = 'scrittura:       riuscita (la riga di prova è stata annullata)';
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $fail('il database non accetta scritture: ' . $e->getMessage(),
        "All'utente servono i permessi SELECT, INSERT, UPDATE, DELETE su questo database.");
}

/* ---------- 6. quante partite ci sono già ---------- */
$nUsers = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$nSaves = (int)$pdo->query('SELECT COUNT(*) FROM saves')->fetchColumn();
$out[] = 'contenuto:       ' . $nUsers . ' account, ' . $nSaves . ' partite salvate';

$out[] = '';
$out[] = 'TUTTO A POSTO. Il database è pronto.';
$out[] = '';
$out[] = 'Restano due cose:';
$out[] = '  1. CANCELLA QUESTO FILE dal server (install.php). Ha finito il suo lavoro.';
$out[] = '  2. Verifica che config.php NON sia scaricabile: aprilo nel browser,';
$out[] = '     deve dare 403 o pagina vuota, mai il contenuto.';

echo implode("\n", $out), "\n";

/* elenco delle tabelle presenti, su entrambi i motori */
function tabelle(PDO $pdo): array
{
    $drv = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $sql = $drv === 'sqlite'
        ? "SELECT name FROM sqlite_master WHERE type='table'"
        : 'SHOW TABLES';
    return array_map('strval', $pdo->query($sql)->fetchAll(PDO::FETCH_COLUMN));
}
