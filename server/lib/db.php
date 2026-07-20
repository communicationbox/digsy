<?php
/* CONNESSIONE — un solo punto che apre il database, così le credenziali stanno in un posto
 * solo e le impostazioni di sicurezza di PDO non dipendono da chi si ricorda di metterle.
 *
 * ERRMODE_EXCEPTION: senza, PDO fallisce in SILENZIO e si scopre il guasto quando i dati
 * sono già sbagliati.
 * EMULATE_PREPARES a false: le query preparate le esegue il database, non una simulazione
 * lato client — è la differenza fra un parametro davvero separato dalla query e una
 * concatenazione di stringhe travestita.
 */

require_once __DIR__ . '/schema.php';

/* DOVE STA LA CONFIGURAZIONE, in ordine di preferenza:
 *
 *   1. la variabile d'ambiente DIGSY_CONFIG            (test, e chi vuole decidere)
 *   2. ../../config/digsy.php  — FUORI dalla cartella pubblicata   ← produzione
 *   3. ../config.php           — dentro server/                    ← sviluppo locale
 *
 * La seconda è quella che conta. Un file dentro la webroot dipende, per non essere servito
 * in chiaro, dal fatto che PHP sia attivo e che l'.htaccess venga letto: due cose che un
 * aggiornamento del server o un vhost rifatto possono togliere senza avvisare, ed è così che
 * le password finiscono pubbliche. Un file che sta SOPRA la webroot non è raggiungibile da
 * nessuna URL, comunque vada la configurazione del server.
 */
function config(): array
{
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    /* Due disposizioni possibili, e vanno bene entrambe: `server/` può stare DENTRO la
       cartella pubblicata (httpdocs/server → il config è tre livelli sopra `lib`) oppure
       accanto ad essa (server/ → due livelli). Si provano tutte e due invece di imporre una
       struttura: sbagliare percorso qui dà un 500 muto, e l'errore vero si scopre solo
       andando a leggere i log del server. */
    /* DIGSY_CONFIG può arrivare dall'ambiente (riga di comando, test) oppure da `SetEnv`
       nell'.htaccess: con PHP-FPM quella non passa da getenv() ma finisce in $_SERVER, ed è
       la strada che funziona su questo hosting, dove `open_basedir` chiude PHP dentro la
       cartella pubblicata e un config "un livello sopra" non sarebbe leggibile affatto. */
    $env = getenv('DIGSY_CONFIG') ?: ($_SERVER['DIGSY_CONFIG'] ?? ($_ENV['DIGSY_CONFIG'] ?? null));
    $candidati = array_filter([
        $env,
        __DIR__ . '/../../../config/digsy.php',   // httpdocs/server/lib → …/config
        __DIR__ . '/../../config/digsy.php',      // server/lib          → …/config
        __DIR__ . '/../config.php',               // sviluppo locale
    ]);
    foreach ($candidati as $path) {
        if (is_file($path)) { $cfg = require $path; return $cfg; }
    }
    throw new RuntimeException('configurazione mancante. Cercata qui: ' . implode(' · ', $candidati));
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $c = config();
    $opts = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    if (($c['db']['driver'] ?? 'mysql') === 'sqlite') {
        $pdo = new PDO('sqlite:' . $c['db']['path'], null, null, $opts);
        $pdo->exec('PRAGMA journal_mode=WAL');       // letture e scritture non si bloccano a vicenda
        $pdo->exec('PRAGMA foreign_keys=ON');
    } else {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $c['db']['host'], $c['db']['port'] ?? 3306, $c['db']['name']);
        $pdo = new PDO($dsn, $c['db']['user'], $c['db']['pass'], $opts);
    }
    return $pdo;
}

/* Crea le tabelle se mancano. Le CREATE sono IF NOT EXISTS, quindi ripeterla è innocuo —
   ma NON è gratis: erano tre-cinque istruzioni DDL a ogni richiesta, anche di chi non è
   collegato, cioè lavoro inutile sul percorso più caldo e un moltiplicatore per chiunque
   volesse tempestare l'endpoint pubblico dell'accesso.
   Ora si chiama una volta sola per processo, e `install.php` la esegue esplicitamente. */
function migrate(?PDO $pdo = null): void
{
    static $fatto = false;
    if ($fatto && $pdo === null) return;
    $pdo = $pdo ?: db();
    foreach (schemaStatements($pdo->getAttribute(PDO::ATTR_DRIVER_NAME)) as $sql) {
        $pdo->exec($sql);
    }
    $fatto = true;
}

function nowTs(): int { return time(); }
