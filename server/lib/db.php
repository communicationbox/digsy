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

function config(): array
{
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $path = getenv('DIGSY_CONFIG') ?: __DIR__ . '/../config.php';
    if (!is_file($path)) {
        throw new RuntimeException('config.php mancante: copia config.example.php e compilalo');
    }
    $cfg = require $path;
    return $cfg;
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

/* Crea le tabelle se mancano. Si può chiamare a ogni avvio: le CREATE sono IF NOT EXISTS. */
function migrate(?PDO $pdo = null): void
{
    $pdo = $pdo ?: db();
    foreach (schemaStatements($pdo->getAttribute(PDO::ATTR_DRIVER_NAME)) as $sql) {
        $pdo->exec($sql);
    }
}

function nowTs(): int { return time(); }
