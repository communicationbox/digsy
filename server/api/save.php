<?php
/* LA PARTITA IN CLOUD.
 *
 *   GET  /api/save.php            → { save: {version, data, summary, device, updated_at} | null }
 *   POST /api/save.php            { data, summary, device, base_version, force? }
 *
 * La POST può rispondere **409**: significa che un altro dispositivo ha salvato dopo di te.
 * Non è un errore da nascondere — è la domanda "quale partita tengo?", e la risposta arriva
 * con dentro la versione del server, così il gioco può mostrare le due e far scegliere.
 * Solo `force: true`, cioè una scelta esplicita del giocatore, sovrascrive.
 */

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/saves.php';

migrate();
$user = requireUser();
$slot = max(0, min(9, (int)($_GET['slot'] ?? 0)));

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    jsonOut(['ok' => true, 'save' => saveLoad((int)$user['id'], $slot)]);
}

requireMethod('POST');
$body = jsonBody();
$res = saveStore(
    (int)$user['id'],
    $slot,
    (string)($body['data'] ?? ''),
    (string)($body['summary'] ?? ''),
    (string)($body['device'] ?? ''),
    (int)($body['base_version'] ?? 0),
    !empty($body['force'])
);

if (!empty($res['conflict'])) {
    jsonOut(['ok' => false, 'conflict' => true, 'server' => $res['server']], 409);
}
if (empty($res['ok'])) {
    jsonErr($res['error'] ?? 'save_failed', 400);
}
jsonOut(['ok' => true, 'version' => $res['version']]);
