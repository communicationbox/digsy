<?php
/* CONFIGURAZIONE — copia questo file in `config.php` e compilalo.
 *
 * config.php NON va nel repository (è in .gitignore): contiene le credenziali del database
 * e l'identificativo dell'applicazione Google. Se finisse in un commit pubblico andrebbero
 * cambiate tutte.
 */

return [
    'db' => [
        /* 'mysql' in produzione. 'sqlite' lo usano i test: stesso codice, nessun servizio da
           avviare per far girare la suite. */
        'driver' => 'mysql',
        'host'   => 'localhost',
        'port'   => 3306,
        'name'   => 'digsy',
        'user'   => 'digsy',
        'pass'   => 'DA_COMPILARE',
        /* solo per sqlite: dove sta il file. Va tenuto FUORI dalla cartella pubblicata,
           altrimenti chiunque può scaricarsi il database dal browser. */
        'path'   => __DIR__ . '/../data/digsy.sqlite',
    ],

    /* Client ID OAuth preso da Google Cloud Console (Credenziali → ID client OAuth 2.0,
       tipo "Applicazione web", con https://digsy.dev-box.it fra le origini autorizzate).
       Non è un segreto — sta anche nella pagina — ma il server DEVE controllare che il token
       ricevuto sia stato emesso proprio per questo ID: senza, vale un token ottenuto da
       un'altra applicazione qualsiasi. */
    'google_client_id' => 'DA_COMPILARE.apps.googleusercontent.com',

    /* Durata della sessione. 30 giorni: un gioco non è una banca, e rifare l'accesso a ogni
       partita sarebbe proprio l'attrito che stiamo togliendo. */
    'session_days' => 30,

    /* In sviluppo su http://localhost il cookie Secure non viene mai inviato dal browser.
       Metti false SOLO in locale; in produzione deve restare true. */
    'cookie_secure' => true,
];
