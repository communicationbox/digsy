<?php
/* RISPOSTE HTTP — un solo posto, così ogni endpoint risponde nello stesso modo e le
 * intestazioni di sicurezza non dipendono da chi si ricorda di scriverle.
 *
 * `nosniff` impedisce al browser di indovinare il tipo di contenuto; `no-store` tiene le
 * risposte con dati personali fuori dalle cache. Nessun header CORS: il gioco è servito
 * dallo stesso dominio, e tenerlo così significa che nessun altro sito può chiamare queste
 * API col cookie del giocatore.
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

/* utente collegato, o 401: gli endpoint che toccano le partite passano tutti da qui */
function requireUser(): array
{
    $u = currentUser();
    if (!$u) jsonErr('not_authenticated', 401);
    return $u;
}
