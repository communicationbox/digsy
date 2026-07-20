<?php
/* GLI SCHIANTI DEI GIOCATORI — perché arrivino qui invece di morire sul loro telefono.
 *
 * Tutti i guasti corretti finora li ha segnalati una persona che si è presa la briga di
 * scrivere. Per uno che scrive ce ne sono dieci che chiudono la scheda. Un errore JavaScript
 * su un telefono che non si possiede è invisibile: non c'è modo di riprodurlo, e spesso
 * nemmeno di sapere che è successo.
 *
 * Qui si raccoglie il minimo per capire: messaggio, dove, versione, che dispositivo. NIENTE
 * che identifichi la persona — non l'IP, non l'account, non la partita. Serve a riparare il
 * gioco, non a sapere chi stava giocando.
 *
 * Il file si tiene corto da solo: gli errori si ripetono a valanga (lo stesso bug su cento
 * partite è la stessa riga), quindi si conta quante volte invece di scriverlo cento volte.
 */

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/ratelimit.php';

requireMethod('POST');
/* è un endpoint pubblico come quello dell'accesso: stesso freno, o diventa un modo per
   riempire il disco di qualcun altro */
if (!rateLimitOk('oops:' . clientIp(), 20)) jsonErr('too_many', 429);

$body = jsonBody();
$msg = trim((string)($body['msg'] ?? ''));
if ($msg === '') jsonErr('vuoto', 400);

/* tutto accorciato: un messaggio d'errore lungo un chilometro è un tentativo di riempire il
   disco, non una segnalazione */
$riga = [
  'msg'  => mb_substr($msg, 0, 300),
  'dove' => mb_substr((string)($body['dove'] ?? ''), 0, 200),
  'ver'  => mb_substr((string)($body['ver'] ?? ''), 0, 20),
  'ua'   => mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 160),
];

$c = config();
$dir = $c['oops_dir'] ?? (dirname(__DIR__) . '/data');
if (!is_dir($dir)) @mkdir($dir, 0700, true);
$file = $dir . '/oops.json';

/* si CONTA invece di accumulare: lo stesso guasto su cento partite è una riga sola con
   scritto cento. Così il file resta leggibile e non cresce all'infinito. */
$chiave = hash('sha256', $riga['msg'] . '|' . $riga['dove'] . '|' . $riga['ver']);
$tutti = [];
if (is_file($file)) { $tutti = json_decode((string)file_get_contents($file), true) ?: []; }

if (isset($tutti[$chiave])) {
    $tutti[$chiave]['n']++;
    $tutti[$chiave]['ultimo'] = time();
} else {
    if (count($tutti) >= 200) {   // tetto: si tengono i più recenti
        uasort($tutti, fn($a, $b) => $b['ultimo'] <=> $a['ultimo']);
        $tutti = array_slice($tutti, 0, 150, true);
    }
    $tutti[$chiave] = $riga + ['n' => 1, 'primo' => time(), 'ultimo' => time()];
}

@file_put_contents($file, json_encode($tutti, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
jsonOut(['ok' => true]);
