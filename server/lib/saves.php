<?php
/* SALVATAGGI — e soprattutto i CONFLITTI, che sono il vero problema del gioco su più
 * dispositivi. Il login è la parte facile; questa è quella che, fatta male, cancella ore di
 * gioco senza dire niente.
 *
 * Il salvataggio di Digsy è uno stato monolitico, non un elenco di eventi: due partite
 * divergenti NON si possono fondere. Se il giocatore ha giocato mezz'ora sul telefono in
 * aereo e poi apre il PC, una delle due deve cedere — e a deciderlo dev'essere lui, non un
 * "l'ultimo che scrive vince" silenzioso.
 *
 * Il meccanismo è quello di un numero di versione. Chi salva dichiara da quale versione
 * parte; se il server nel frattempo è più avanti, la scrittura viene RIFIUTATA e si
 * restituisce cosa c'è sul server, così il gioco può mostrare le due partite e far scegliere.
 * Solo una scelta esplicita del giocatore ($force) sovrascrive.
 */

require_once __DIR__ . '/db.php';

const SAVE_MAX_BYTES = 4 * 1024 * 1024;   // una partita da 40 ore sta in 175 KB: 4 MB è già larghissimo

function saveLoad(int $userId, int $slot = 0): ?array
{
    $st = db()->prepare('SELECT version, data, summary, device, updated_at
                         FROM saves WHERE user_id = ? AND slot = ?');
    $st->execute([$userId, $slot]);
    $row = $st->fetch();
    if (!$row) return null;
    $row['version'] = (int)$row['version'];
    $row['updated_at'] = (int)$row['updated_at'];
    return $row;
}

/* Scrive la partita. $baseVersion è la versione da cui parte il client.
 * Ritorna ['ok'=>true,'version'=>n] oppure ['ok'=>false,'conflict'=>true,'server'=>[…]]. */
function saveStore(int $userId, int $slot, string $data, string $summary, string $device,
                   int $baseVersion, bool $force = false): array
{
    if (strlen($data) > SAVE_MAX_BYTES) {
        return ['ok' => false, 'error' => 'too_big'];
    }
    if (json_decode($data) === null && json_last_error() !== JSON_ERROR_NONE) {
        /* se non è JSON valido è un guasto del client: meglio rifiutare che conservare
           una partita che al ritorno non si potrà più caricare */
        return ['ok' => false, 'error' => 'not_json'];
    }

    $pdo = db();
    $cur = saveLoad($userId, $slot);
    $curVersion = $cur['version'] ?? 0;

    if (!$force && $curVersion !== $baseVersion) {
        return ['ok' => false, 'conflict' => true, 'server' => $cur];
    }

    $next = $curVersion + 1;
    if ($cur) {
        $st = $pdo->prepare('UPDATE saves SET version = ?, data = ?, summary = ?, device = ?, updated_at = ?
                             WHERE user_id = ? AND slot = ?');
        $st->execute([$next, $data, substr($summary, 0, 255), substr($device, 0, 120), nowTs(), $userId, $slot]);
    } else {
        $st = $pdo->prepare('INSERT INTO saves (user_id, slot, version, data, summary, device, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?)');
        $st->execute([$userId, $slot, $next, $data, substr($summary, 0, 255), substr($device, 0, 120), nowTs()]);
    }
    return ['ok' => true, 'version' => $next];
}
