<?php
/* VERIFICA DELL'ACCESSO GOOGLE.
 *
 * Il browser riceve da Google un ID token (un JWT firmato) e lo manda qui. Il punto
 * fondamentale: **il token va verificato lato server**. Un JWT è testo, chiunque può
 * scriverne uno e spedirlo; se il server si limitasse a leggerlo, basterebbe inventare un
 * `sub` per entrare nella partita di chiunque.
 *
 * Qui la verifica passa dall'endpoint `tokeninfo` di Google invece che dal controllo locale
 * della firma RS256. È una chiamata di rete in più, ma si paga SOLO al momento dell'accesso
 * (poi vale la sessione nostra) e in cambio non c'è da gestire a mano il download delle
 * chiavi pubbliche, la loro cache e la scadenza — cioè i punti dove una verifica scritta a
 * mano fallisce restando silenziosamente "valida".
 *
 * Anche con la risposta di Google in mano restano tre controlli NOSTRI, e sono quelli che
 * di solito si dimenticano:
 *   - `aud` deve essere il NOSTRO client id (un token emesso per un'altra applicazione è
 *     comunque un token valido per Google: senza questo controllo vale anche qui);
 *   - `iss` deve essere Google;
 *   - `exp` deve essere nel futuro.
 */

require_once __DIR__ . '/db.php';

const GOOGLE_TOKENINFO = 'https://oauth2.googleapis.com/tokeninfo?id_token=';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/* Il recupero è iniettabile: i test devono poter provare i casi cattivi (token di un'altra
   applicazione, scaduto, email non verificata) senza chiamare Google davvero. */
function googleFetchTokenInfo(string $idToken): ?array
{
    $ch = curl_init(GOOGLE_TOKENINFO . urlencode($idToken));
    /* TIMEOUT CORTI. Questa chiamata parte da un endpoint PUBBLICO (?do=google) e blocca un
       worker PHP per tutta la sua durata: con otto secondi bastavano poche decine di
       richieste parallele — senza avere un account — per occupare l'intero pool e rendere il
       gioco irraggiungibile a tutti. Tre secondi sono già larghi per una chiamata che
       normalmente risponde in meno di uno; se Google è lento, meglio un accesso fallito che
       il sito fermo. */
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_TIMEOUT        => 3,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $code !== 200) return null;
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

/* Ritorna ['ok'=>true,'sub'=>…,'email'=>…,'name'=>…] oppure ['ok'=>false,'error'=>…].
   $fetcher serve ai test. */
function googleVerify(string $idToken, ?callable $fetcher = null): array
{
    if ($idToken === '' || strlen($idToken) > 8192) return ['ok' => false, 'error' => 'bad_token'];
    $info = ($fetcher ?? 'googleFetchTokenInfo')($idToken);
    if (!$info) return ['ok' => false, 'error' => 'unverified'];

    $clientId = config()['google_client_id'] ?? '';
    /* aud: il token è stato emesso PER NOI? */
    if (!isset($info['aud']) || !hash_equals($clientId, (string)$info['aud'])) {
        return ['ok' => false, 'error' => 'wrong_audience'];
    }
    /* iss: l'ha emesso Google? */
    if (!in_array((string)($info['iss'] ?? ''), GOOGLE_ISSUERS, true)) {
        return ['ok' => false, 'error' => 'wrong_issuer'];
    }
    /* exp: è ancora valido? */
    if ((int)($info['exp'] ?? 0) <= nowTs()) {
        return ['ok' => false, 'error' => 'expired'];
    }
    if (($info['sub'] ?? '') === '') return ['ok' => false, 'error' => 'no_sub'];
    /* email non verificata: Google la fornisce lo stesso, ma non garantisce che sia sua */
    $verified = $info['email_verified'] ?? 'false';
    if ($verified !== true && $verified !== 'true') {
        return ['ok' => false, 'error' => 'email_unverified'];
    }

    return [
        'ok'    => true,
        'sub'   => (string)$info['sub'],
        'email' => (string)($info['email'] ?? ''),
        'name'  => (string)($info['name'] ?? ''),
    ];
}
