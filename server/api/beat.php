<?php
/* IL BATTITO — quanto si gioca davvero, e fino a dove si arriva.
 *
 * Digsy gira tutto nel browser: dopo il caricamento non parla più col server. Un giocatore
 * può stare tre ore in grotta senza che nessuno lo sappia. Per una fase di prova è il buio
 * completo proprio sulla domanda che conta: DOVE SMETTONO.
 *
 * Ogni cinque minuti il gioco manda una riga: da quanto sta giocando, a che giorno è
 * arrivato, che livello ha, quale versione. Da lì si ricavano le uniche cose che servono a
 * chi sta facendo provare il gioco:
 *   - quanto durano le sessioni
 *   - a che punto del gioco la gente si ferma
 *   - se qualcuno torna il giorno dopo
 *
 * COSA NON SI RACCOGLIE, di proposito:
 *   - l'indirizzo IP (nemmeno come impronta: qui non serve nemmeno a contare)
 *   - qualunque cosa leghi la riga a una persona: niente account, niente email, niente nomi
 *   - il contenuto della partita
 * L'identificativo lo genera il gioco a caso, vive nel dispositivo, e serve a una cosa sola:
 * capire se DUE righe sono la stessa sessione o due sessioni diverse. Cancellando i dati del
 * browser sparisce, e il giocatore ridiventa uno nuovo. Si spegne dalle Impostazioni.
 */

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/ratelimit.php';

requireMethod('POST');
/* endpoint pubblico: stesso freno degli altri, o diventa un modo per riempire un disco */
if (!rateLimitOk('beat:' . clientIp(), 30)) jsonErr('too_many', 429);

$body = jsonBody();
$id = preg_replace('/[^a-z0-9]/i', '', (string)($body['id'] ?? ''));
if (strlen($id) < 8 || strlen($id) > 32) jsonErr('id', 400);

$riga = [
  'min'   => max(0, min(100000, (int)($body['min'] ?? 0))),      // minuti giocati in tutto
  'day'   => max(1, min(99999, (int)($body['day'] ?? 1))),       // giorno di gioco raggiunto
  'lvl'   => max(1, min(999, (int)($body['lvl'] ?? 1))),
  'spec'  => max(0, min(999, (int)($body['spec'] ?? 0))),        // specie scoperte
  'ver'   => mb_substr((string)($body['ver'] ?? ''), 0, 20),
  'app'   => !empty($body['app']) ? 1 : 0,                       // installata sulla schermata?
  'tocco' => !empty($body['tocco']) ? 1 : 0,                     // telefono o computer
  'ts'    => time(),
];

$c = config();
$dir = $c['oops_dir'] ?? (dirname(__DIR__) . '/data');
if (!is_dir($dir)) @mkdir($dir, 0700, true);
$file = $dir . '/battito.json';

$tutti = is_file($file) ? (json_decode((string)file_get_contents($file), true) ?: []) : [];

/* una riga per giocatore, aggiornata: interessa DOVE È ARRIVATO, non ogni singolo battito.
   Così il file resta piccolo e non diventa un diario di quello che fa la gente. */
if (isset($tutti[$id])) {
    $primo = $tutti[$id]['primo'] ?? $riga['ts'];
    $sessioni = $tutti[$id]['sessioni'] ?? 1;
    /* più di mezz'ora di silenzio = è tornato: una sessione nuova */
    if ($riga['ts'] - ($tutti[$id]['ts'] ?? 0) > 1800) $sessioni++;
    $riga['primo'] = $primo;
    $riga['sessioni'] = $sessioni;
} else {
    if (count($tutti) >= 500) {          // tetto: si tengono i più recenti
        uasort($tutti, fn($a, $b) => $b['ts'] <=> $a['ts']);
        $tutti = array_slice($tutti, 0, 400, true);
    }
    $riga['primo'] = $riga['ts'];
    $riga['sessioni'] = 1;
}
$tutti[$id] = $riga;

@file_put_contents($file, json_encode($tutti, JSON_UNESCAPED_SLASHES), LOCK_EX);
jsonOut(['ok' => true]);
