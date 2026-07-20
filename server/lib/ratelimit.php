<?php
/* FRENO SULL'ACCESSO — l'unico endpoint che chiunque può chiamare senza avere un account.
 *
 * `?do=google` fa una chiamata verso Google e tiene occupato un worker PHP finché non
 * risponde. Anche con i timeout corti, chi vuole far male può aprire richieste in parallelo
 * finché il pool non è pieno e il gioco smette di rispondere a tutti — senza bisogno di
 * essere registrato.
 *
 * Il freno è volutamente semplice: un file per finestra temporale, un contatore per IP.
 * Niente tabella nel database (una scrittura in più per ogni tentativo è proprio ciò che si
 * vuole evitare) e niente dipendenze. Per un gioco con qualche decina di giocatori basta e
 * avanza; se un giorno serviranno più server, si sposterà su Redis o su una tabella.
 *
 * L'IP si conserva come HASH: serve a contare, non a sapere chi è, e un file di indirizzi in
 * chiaro sarebbe un archivio di dati personali creato per niente.
 */

/* Quanti tentativi per IP in una finestra. Un accesso normale ne fa UNO: dieci al minuto
   lasciano spazio a errori, ricariche e a chi condivide l'indirizzo con altri. */
const RL_MAX = 10;
const RL_WINDOW = 60;          // secondi

function rlDir(): string
{
    $c = config();
    $base = $c['ratelimit_dir'] ?? (sys_get_temp_dir() . '/digsy-rl');
    if (!is_dir($base)) @mkdir($base, 0700, true);
    return $base;
}

/* true se la richiesta può passare, false se ha superato il limite. */
function rateLimitOk(string $chiave, int $max = RL_MAX, int $finestra = RL_WINDOW): bool
{
    $dir = rlDir();
    if (!is_dir($dir) || !is_writable($dir)) return true;   // non si blocca il gioco per un disco

    /* una finestra "a scatti": tutti i tentativi dello stesso minuto finiscono nello stesso
       file, e i file dei minuti passati si cancellano da soli qui sotto */
    $blocco = (int)floor(time() / $finestra);
    $file = $dir . '/' . $blocco . '-' . substr(hash('sha256', $chiave), 0, 32);

    $n = 0;
    $fp = @fopen($file, 'c+');
    if (!$fp) return true;
    if (flock($fp, LOCK_EX)) {
        $n = (int)stream_get_contents($fp);
        $n++;
        ftruncate($fp, 0); rewind($fp); fwrite($fp, (string)$n);
        flock($fp, LOCK_UN);
    }
    fclose($fp);

    /* pulizia saltuaria: i file di due finestre fa non servono più a nessuno */
    if (random_int(1, 20) === 1) {
        foreach ((array)glob($dir . '/*') as $f) {
            $b = (int)substr(basename($f), 0, strpos(basename($f), '-') ?: 0);
            if ($b < $blocco - 2) @unlink($f);
        }
    }
    return $n <= $max;
}

/* l'indirizzo di chi chiama. Dietro un proxy il vero IP sta in X-Forwarded-For, ma quella
   riga la può scrivere CHIUNQUE: la si guarda solo se il proxy è dichiarato in config. */
function clientIp(): string
{
    $c = config();
    if (!empty($c['trust_proxy'])) {
        $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if ($xff !== '') return trim(explode(',', $xff)[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}
