<?php
/* SCHEMA — utenti, sessioni e partite salvate.
 *
 * Tre tabelle, volutamente minuscole. Il salvataggio di Digsy è un JSON piccolo (841 byte
 * appena creato, 7 KB dopo tre ore, 175 KB dopo quaranta), quindi non si spezza in colonne:
 * si conserva com'è e il gioco resta l'unico a sapere cosa contiene. Se un domani il formato
 * del salvataggio cambia, qui non si tocca niente.
 *
 * Perché generato da PHP e non due file .sql: gira su MySQL in produzione e su SQLite nei
 * test, e i due motori non scrivono la stessa DDL (AUTO_INCREMENT contro AUTOINCREMENT,
 * MySQL non accetta CREATE INDEX IF NOT EXISTS). Due file separati divergerebbero al primo
 * ritocco, e la differenza salterebbe fuori in produzione. Qui la fonte è una sola.
 */

function schemaStatements(string $driver): array
{
    $sqlite = $driver === 'sqlite';
    $pk   = $sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
    $text = $sqlite ? 'TEXT' : 'LONGTEXT';
    /* MySQL non supporta IF NOT EXISTS sugli indici: là si dichiarano dentro la CREATE TABLE */
    $sessIdx = $sqlite ? '' : ",\n  INDEX idx_sessions_user (user_id),\n  INDEX idx_sessions_exp (expires_at)";

    $out = [];

    /* 'google_sub' è l'identificatore STABILE dell'account Google. L'email si può cambiare,
       quello no: legare la partita all'email vorrebbe dire perderla al primo cambio. */
    $out[] = "CREATE TABLE IF NOT EXISTS users (
  id            $pk,
  google_sub    VARCHAR(64)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL,
  name          VARCHAR(120) NOT NULL DEFAULT '',
  created_at    BIGINT       NOT NULL,
  last_seen_at  BIGINT       NOT NULL
)";

    /* Del token di sessione si conserva solo l'HASH: se il database finisse in mani sbagliate,
       i token rubati non varrebbero comunque nulla. Il token in chiaro vive solo nel cookie. */
    $out[] = "CREATE TABLE IF NOT EXISTS sessions (
  token_hash    CHAR(64)     NOT NULL PRIMARY KEY,
  user_id       BIGINT       NOT NULL,
  created_at    BIGINT       NOT NULL,
  expires_at    BIGINT       NOT NULL,
  user_agent    VARCHAR(255) NOT NULL DEFAULT ''$sessIdx
)";
    if ($sqlite) {
        $out[] = 'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id)';
        $out[] = 'CREATE INDEX IF NOT EXISTS idx_sessions_exp  ON sessions (expires_at)';
    }

    /* VERSION è il perno del rilevamento dei conflitti: cresce di uno a ogni scrittura
       accettata. Chi salva dichiara su quale versione sta scrivendo; se nel frattempo un
       altro dispositivo ha salvato, la scrittura viene RIFIUTATA invece di cancellare
       silenziosamente mezz'ora di gioco. SUMMARY tiene giorno e monete in chiaro, così la
       schermata "quale partita tengo?" può mostrarle senza interpretare il JSON. */
    $out[] = "CREATE TABLE IF NOT EXISTS saves (
  user_id       BIGINT       NOT NULL,
  slot          INT          NOT NULL DEFAULT 0,
  version       BIGINT       NOT NULL DEFAULT 0,
  data          $text        NOT NULL,
  summary       VARCHAR(255) NOT NULL DEFAULT '',
  device        VARCHAR(120) NOT NULL DEFAULT '',
  updated_at    BIGINT       NOT NULL,
  PRIMARY KEY (user_id, slot)
)";

    return $out;
}
