<?php
/* ACCESSO, STATO E USCITA — un file solo, l'azione arriva in `?do=`.
 *
 *   POST /api/auth.php?do=google   { credential }  → verifica il token e apre la sessione
 *   GET  /api/auth.php?do=me                       → chi sono (o null)
 *   POST /api/auth.php?do=logout                   → chiude la sessione
 *   POST /api/auth.php?do=delete                   → cancella account e partite
 *
 * Da qui in poi Google non serve più: comanda il cookie di sessione.
 */

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/users.php';
require_once __DIR__ . '/../lib/google.php';

migrate();

$do = $_GET['do'] ?? '';

if ($do === 'google') {
    requireMethod('POST');
    $body = jsonBody();
    $res = googleVerify((string)($body['credential'] ?? ''));
    if (!$res['ok']) jsonErr($res['error'], 401);

    $user = userUpsert($res['sub'], $res['email'], $res['name']);
    sessionCreate((int)$user['id'], $_SERVER['HTTP_USER_AGENT'] ?? '');
    /* ogni tanto si fa pulizia delle sessioni scadute: qui costa nulla e la tabella non
       cresce all'infinito (una tabella che non si svuota mai è un problema rimandato) */
    if (random_int(1, 50) === 1) sessionsPurge();

    jsonOut(['ok' => true, 'user' => ['email' => $user['email'], 'name' => $user['name']]]);
}

if ($do === 'me') {
    requireMethod('GET');
    $u = currentUser();
    jsonOut(['ok' => true, 'user' => $u ? ['email' => $u['email'], 'name' => $u['name']] : null]);
}

if ($do === 'logout') {
    requireMethod('POST');
    sessionDestroy();
    jsonOut(['ok' => true]);
}

if ($do === 'delete') {
    /* cancellazione dell'account: obbligo di legge, e deve portarsi via TUTTO */
    requireMethod('POST');
    $u = requireUser();
    userDelete((int)$u['id']);
    sessionDestroy();
    jsonOut(['ok' => true, 'deleted' => true]);
}

jsonErr('unknown_action', 404);
