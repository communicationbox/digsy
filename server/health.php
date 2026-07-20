<?php
/* SEGNI VITALI — una pagina che dice se il servizio sta in piedi.
 *
 * Serve perché oggi, se l'API smette di rispondere o il database non è raggiungibile, lo si
 * scopre quando un giocatore si prende la briga di scriverlo. Un controllo automatico ogni
 * cinque minuti trasforma il tempo di reazione da giorni a minuti.
 *
 * Risponde 200 se tutto regge, 503 se qualcosa è rotto — così qualunque servizio di
 * sorveglianza (o un cron con curl) capisce senza dover leggere il testo.
 *
 * NON dice nulla di riservato: né versioni, né percorsi, né quanti account ci sono. Una
 * pagina di stato pubblica che racconta com'è fatto il server è un regalo a chi cerca un
 * modo per entrare.
 */

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/http.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$problemi = [];

/* 1. il database risponde? È l'unica dipendenza esterna del gioco. */
try {
    $pdo = db();
    $pdo->query('SELECT 1')->fetchColumn();
} catch (Throwable $e) {
    $problemi[] = 'database';
}

/* 2. le tabelle ci sono? Un database raggiungibile ma vuoto è rotto lo stesso, e capita
      dopo un ripristino andato a metà. */
if (!$problemi) {
    try {
        $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $pdo->query('SELECT COUNT(*) FROM saves')->fetchColumn();
    } catch (Throwable $e) {
        $problemi[] = 'tabelle';
    }
}

/* 3. si riesce a SCRIVERE? Un disco pieno o un permesso tolto si vedono solo provando:
      il database risponde alle letture fino all'ultimo. La riga di prova viene annullata. */
if (!$problemi) {
    try {
        $pdo->beginTransaction();
        $st = $pdo->prepare('INSERT INTO users (google_sub, email, name, created_at, last_seen_at) VALUES (?,?,?,?,?)');
        $st->execute(['health-' . bin2hex(random_bytes(4)), 'health@local', '', time(), time()]);
        $pdo->rollBack();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) { try { $pdo->rollBack(); } catch (Throwable $e2) { /* ok */ } }
        $problemi[] = 'scrittura';
    }
}

if ($problemi) {
    http_response_code(503);
    echo json_encode(['ok' => false, 'problemi' => $problemi]);
    exit;
}
echo json_encode(['ok' => true]);
