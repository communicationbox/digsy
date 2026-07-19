<?php
/* UTENTI — un utente è un account Google, niente di più.
 *
 * La chiave è il 'sub' di Google, non l'email: l'indirizzo si può cambiare, il sub no.
 * Legare la partita all'email significherebbe che un giocatore che cambia indirizzo perde
 * tutto senza capire perché.
 */

require_once __DIR__ . '/db.php';

/* crea l'utente se è la prima volta, altrimenti aggiorna i dati e la data di ultimo accesso */
function userUpsert(string $googleSub, string $email, string $name = ''): array
{
    $pdo = db();
    $st = $pdo->prepare('SELECT * FROM users WHERE google_sub = ?');
    $st->execute([$googleSub]);
    $row = $st->fetch();
    if ($row) {
        $up = $pdo->prepare('UPDATE users SET email = ?, name = ?, last_seen_at = ? WHERE id = ?');
        $up->execute([$email, substr($name, 0, 120), nowTs(), $row['id']]);
        $row['email'] = $email;
        $row['name'] = substr($name, 0, 120);
        return $row;
    }
    $ins = $pdo->prepare('INSERT INTO users (google_sub, email, name, created_at, last_seen_at)
                          VALUES (?, ?, ?, ?, ?)');
    $ins->execute([$googleSub, $email, substr($name, 0, 120), nowTs(), nowTs()]);
    $st->execute([$googleSub]);
    return $st->fetch();
}

/* Cancellazione dell'account: utente, sessioni e partite. È un obbligo di legge (l'email è
   un dato personale) e deve essere DAVVERO completa — niente righe orfane lasciate indietro. */
function userDelete(int $userId): void
{
    $pdo = db();
    foreach (['DELETE FROM saves WHERE user_id = ?',
              'DELETE FROM sessions WHERE user_id = ?',
              'DELETE FROM users WHERE id = ?'] as $sql) {
        $pdo->prepare($sql)->execute([$userId]);
    }
}
