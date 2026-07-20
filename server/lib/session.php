<?php
/* SESSIONI — dopo l'accesso Google non serve più: da lì in poi comanda un token nostro.
 *
 * Tre scelte che contano, tutte per lo stesso motivo (un token rubato è un account rubato):
 *
 * 1. il token si genera con random_bytes, non con rand()/uniqid(): quelli sono PREVEDIBILI,
 *    e chi ne indovina uno entra nella partita di un altro;
 * 2. nel database va solo l'HASH del token, mai il token; chi leggesse la tabella non
 *    otterrebbe niente di riusabile;
 * 3. il confronto passa dall'indice sull'hash, quindi non c'è nessuna ricerca a tentativi.
 *
 * Il cookie è httpOnly (JavaScript non lo può leggere: un XSS non si porta via la sessione),
 * Secure (mai su connessione in chiaro) e SameSite=Lax (non parte dalle richieste di altri
 * siti, che è la difesa contro il CSRF).
 */

require_once __DIR__ . '/db.php';

const SESSION_COOKIE = 'digsy_sid';

/* UN SOLO DISPOSITIVO ALLA VOLTA.
 *
 * Entrando da un dispositivo si chiudono le sessioni aperte altrove. Prima restavano tutte
 * valide e si poteva giocare in due posti insieme: entrambi salvavano la stessa partita e uno
 * dei due lavorava su uno stato già superato, scoprendolo solo al conflitto successivo.
 * Chiudere le altre sessioni rende la regola una sola e leggibile — «la partita è dove stai
 * giocando adesso» — al prezzo di rifare l'accesso quando si cambia dispositivo.
 *
 * Il salvataggio dell'altro dispositivo NON viene toccato: resta nel suo browser e la prima
 * volta che rientra viene riconciliato. Si chiude la sessione, non si butta via una partita.
 */
function sessionCreate(int $userId, string $userAgent = '', bool $exclusive = true): string
{
    $c = config();
    $token = bin2hex(random_bytes(32));
    $days  = (int)($c['session_days'] ?? 30);
    $exp   = nowTs() + $days * 86400;
    if ($exclusive) {
        $st = db()->prepare('DELETE FROM sessions WHERE user_id = ?');
        $st->execute([$userId]);
    }
    $st = db()->prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent)
                         VALUES (?, ?, ?, ?, ?)');
    $st->execute([hash('sha256', $token), $userId, nowTs(), $exp, substr($userAgent, 0, 255)]);
    sessionSendCookie($token, $exp);
    return $token;
}

function sessionSendCookie(string $token, int $expires): void
{
    if (headers_sent()) return;
    setcookie(SESSION_COOKIE, $token, [
        'expires'  => $expires,
        'path'     => '/',
        'secure'   => (bool)(config()['cookie_secure'] ?? true),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/* Chi è collegato adesso? null se nessuno. Ripulisce anche le sessioni scadute che incontra:
   una tabella che cresce e non si svuota mai è un problema rimandato, non evitato. */
function currentUser(): ?array
{
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if ($token === '' || !preg_match('/^[0-9a-f]{64}$/', $token)) return null;
    $st = db()->prepare('SELECT s.expires_at, u.* FROM sessions s
                         JOIN users u ON u.id = s.user_id
                         WHERE s.token_hash = ?');
    $st->execute([hash('sha256', $token)]);
    $row = $st->fetch();
    if (!$row) return null;
    if ((int)$row['expires_at'] < nowTs()) { sessionDestroy(); return null; }
    return $row;
}

function sessionDestroy(): void
{
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if ($token !== '') {
        $st = db()->prepare('DELETE FROM sessions WHERE token_hash = ?');
        $st->execute([hash('sha256', $token)]);
    }
    sessionSendCookie('', nowTs() - 3600);
}

/* manutenzione: via le sessioni scadute di tutti (da chiamare ogni tanto, non a ogni richiesta) */
function sessionsPurge(): int
{
    $st = db()->prepare('DELETE FROM sessions WHERE expires_at < ?');
    $st->execute([nowTs()]);
    return $st->rowCount();
}
