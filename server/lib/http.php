<?php
/* RISPOSTE HTTP — un solo posto, così ogni endpoint risponde nello stesso modo e le
 * intestazioni di sicurezza non dipendono da chi si ricorda di scriverle.
 *
 * `nosniff` impedisce al browser di indovinare il tipo di contenuto; `no-store` tiene le
 * risposte con dati personali fuori dalle cache. Di default NIENTE CORS: il gioco è servito
 * dallo stesso dominio, e tenerlo così significa che nessun altro sito può chiamare queste
 * API col cookie del giocatore — vale per TUTTI gli endpoint delle partite (login/save).
 * L'UNICA eccezione è `corsAnon()` qui sotto, per i due endpoint pubblici e SENZA cookie.
 */

function jsonOut($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonErr(string $code, int $status = 400): void
{
    jsonOut(['ok' => false, 'error' => $code], $status);
}

/* corpo JSON della richiesta (i client mandano application/json, non form) */
function jsonBody(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

function requireMethod(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $method) jsonErr('method_not_allowed', 405);
}

/* CORS per i SOLI endpoint pubblici e ANONIMI (battito, schianti): niente cookie, niente
 * dati personali, quindi possono essere chiamati da un'altra origine. Serve perché il gioco
 * gira anche dentro l'iframe di itch.io (html.itch.zone), un dominio diverso da
 * digsy.dev-box.it: senza questo il browser blocca il POST e non arriva nessun dato.
 * `*` e NESSUN Allow-Credentials: è la coppia origin-jolly + credenziali che aprirebbe un
 * buco; senza le credenziali un altro sito non può portarsi dietro il cookie del giocatore.
 * Va chiamata PRIMA di requireMethod: la preflight è un OPTIONS, non un POST. */
function corsAnon(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
}

/* utente collegato, o 401: gli endpoint che toccano le partite passano tutti da qui */
function requireUser(): array
{
    $u = currentUser();
    if (!$u) jsonErr('not_authenticated', 401);
    return $u;
}
