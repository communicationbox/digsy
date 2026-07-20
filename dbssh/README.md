# dbssh — accesso al DB via SSH + query rapide (solo DEV)

Utility DEV **multi-connessione**: accede al DB di un ambiente (staging/prod…) via
SSH e permette query/shell rapide. Nessun valore hardcoded, **nessun segreto
committato**: config e password stanno in `.local/` (auto-gitignorato).

## Due modalità (per-profilo)

Scelte in `config`, la modalità decide *come* si raggiunge il DB:

- **`tunnel`** — apre `ssh -L` verso il DB e usa il client `mysql` **locale**. Per server
  con `AllowTcpForwarding` abilitato e DB raggiungibile (TCP o socket inoltrato). A tunnel
  attivo puoi puntarci anche il `.env` del progetto (`host=127.0.0.1`, `port=<porta locale>`).
- **`remote`** — **niente tunnel**: esegue `mysql` **sul server** via SSH, con l'SQL passato
  su stdin. **Non serve un client `mysql` locale.** Per server con `AllowTcpForwarding no` e/o
  DB **solo-socket**. Nessuna porta locale. Auth al DB (campo `DB_AUTH`, per-profilo):
  - **`socket`** — l'utente SSH è proprietario del DB via unix_socket (nessuna password).
  - **`sudo`** — `sudo mysql` (l'utente SSH deve avere `sudo` senza password).
  - **`password`** — **utente + password DB**. È il caso **bash-utility "ACCESSO SSH SVILUPPO"**:
    l'utente `web_<slug>` apre `mysql` sul server via socket autenticandosi come `<base>@'localhost'`
    con la password del sito. La password viaggia via **stdin** dentro un `my.cnf` `0600` sul
    server (rimosso al `down`), **mai** sulla riga di comando → sicuro anche su server multi-tenant.

> **Quale scegliere con bash-utility "ACCESSO SSH SVILUPPO"?** Se ti serve solo interrogare il
> DB (CLI) e **non hai** un client `mysql` sul Mac → **`remote` + `password`** (la via più
> semplice). Se invece ti serve una porta locale per una **GUI** o per il `.env` del progetto →
> **`tunnel`** verso il socket (richiede un `mysql`/driver locale).

I comandi (`up`/`q`/`shell`/`status`/`down`) sono identici nelle due modalità: lo script
sceglie da sé il comportamento in base al profilo attivo.

## Comandi

```bash
cd box/tools/dbssh
./dbssh.sh up [nome]      # tunnel: apre il tunnel · remote: verifica l'accesso (senza nome: menu)
./dbssh.sh q "<SQL>"      # query sulla connessione attiva (default SOLO lettura)
./dbssh.sh shell         # shell mysql interattiva
./dbssh.sh list          # elenco connessioni ([modalità], * = attiva)
./dbssh.sh use <nome>    # cambia connessione attiva
./dbssh.sh config [nome] # crea/modifica una connessione (chiede la modalità)
./dbssh.sh status        # stato connessione (tunnel su/giù · remote: master SSH sì/no)
./dbssh.sh down          # tunnel: chiude + rimuove la password · remote: chiude il master SSH
```

Da terminale PhpStorm: `! ./dbssh.sh up`.

### Comando più comodo: `dbssh` (opzionale)

Per non dover fare `cd` nella cartella e digitare `./dbssh.sh`, aggiungi al tuo `~/.zshrc`
(o `~/.bashrc`) una funzione che trova il `dbssh.sh` del progetto **risalendo** dalla cartella
in cui ti trovi:

```zsh
# dbssh: trova il dbssh.sh del progetto risalendo dalla cwd
dbssh() {
  local d="$PWD" p
  while [ "$d" != "/" ]; do
    for p in "$d/dbssh.sh" "$d/dbssh/dbssh.sh" \
             "$d/box/tools/dbssh/dbssh.sh" "$d/tools/dbssh/dbssh.sh"; do
      [ -x "$p" ] && { "$p" "$@"; return; }
    done
    d="$(dirname "$d")"
  done
  echo "dbssh.sh non trovato risalendo da $PWD" >&2; return 1
}
```

Dopo `source ~/.zshrc`, da **qualunque** cartella del progetto:

```bash
dbssh up traido
dbssh q "SHOW TABLES"
dbssh shell
```

Funziona perché `.local/` (config + password) sta **accanto allo script**: le connessioni restano
per-progetto anche lanciando `dbssh` da una sottocartella, e la funzione sceglie il `dbssh.sh` del
progetto in cui sei. Vale anche nel terminale PhpStorm: `! dbssh up`. Una **funzione** (non un `alias`)
perché deve individuare lo script del progetto corrente, ovunque si trovi (`dbssh/`,
`box/tools/dbssh/`, …). NB: un symlink globale in `/usr/local/bin` è sconsigliato → metterebbe
`.local/` accanto al master e condividerebbe le connessioni tra tutti i progetti.

## Come funziona

**Modalità `tunnel`:**

- Al primo `up` lo script chiede i parametri (host/utente SSH, nome/utente DB, porta
  locale) e la **password DB** (inserita a runtime, cachata **mode 600** in `.local/`,
  mai committata; passata a `mysql` via un `my.cnf` temporaneo, non negli argomenti).
- **La password DB è separata dall'accesso SSH**: la chiave SSH autentica il *tunnel*,
  ma MySQL/MariaDB richiede comunque le credenziali dell'utente DB sulla connessione.
  **Utente DB senza password**: premi **invio** al prompt → viene cachata una password
  vuota (valida) e `q`/`shell` funzionano.
- Ogni connessione ha una **porta locale distinta** (13306, 13307, …) → più tunnel
  (es. staging + prod) restano aperti insieme.
- A tunnel attivo puoi connetterti anche con un client esterno o col `.env` del progetto a
  `host = 127.0.0.1`, `port = <porta locale>`.

**Modalità `remote`:**

- `up` fa un **test di accesso** (`SELECT 1` sul server) e apre una **connessione SSH
  master** (multiplexing). L'SQL di `q` viene inviato su **stdin** a `[sudo] mysql <db>`
  eseguito via SSH → niente quoting, niente porta locale, niente password DB da gestire.
- **Multiplexing SSH**: la prima connessione apre un master (`ControlMaster`), le `q`/`shell`
  successive lo **riusano** → nessun nuovo handshake per ogni query (molto più veloce) e niente
  raffica di login che farebbe scattare i rate-limiter del server (`fail2ban`). Il master resta
  idle per 10 min (override `DBSH_MUX_PERSIST=<sec>`), poi si chiude da solo; `down` lo chiude
  subito. Socket in `/tmp/dbssh-mux-<uid>-<hash>` (mode 600). Se manca, il primo comando lo ricrea.
- L'autenticazione al DB (`DB_AUTH`) è **una di tre**: `socket` (utente di sistema del profilo
  SSH, proprietario del DB via unix_socket), `sudo` (`sudo mysql`, utente amministrativo del DB),
  oppure `password` (**utente + password DB**: per i siti bash-utility, dove `web_<slug>` non
  possiede il DB ma vi accede come `<base>@'localhost'` con la password del sito). In modalità
  `password` lo script crea un `my.cnf` `0600` temporaneo **sul server** (credenziali via stdin,
  mai in `ps`), riusato dalle query e rimosso al `down`.
- `shell` apre una **shell mysql interattiva sul server** (`ssh -t … mysql <db>`).

## Server bash-utility ("ACCESSO SSH SVILUPPO")

I server gestiti con **bash-utility** che abilitano la voce sito *ACCESSO SSH SVILUPPO* hanno
due vincoli che rendono **obbligatoria la modalità `tunnel` verso il SOCKET** (non TCP):

1. **`AllowTcpForwarding no`** (hardening del setup): un forward TCP `-L porta:127.0.0.1:3306`
   viene **rifiutato** dal server (`administratively prohibited: open failed`). Un forward verso
   il **socket unix** (`-L porta:/run/mysqld/mysqld.sock`) usa invece un canale *direct-streamlocal*,
   che **non** è bloccato da quella direttiva (`AllowStreamLocalForwarding` resta al default `yes`).
2. **DB user socket-only**: l'utente DB del sito è `<base>@'localhost'` → autentica **solo via
   socket**, non esiste il corrispettivo `@'127.0.0.1'`. Anche se il forward TCP passasse, il login
   fallirebbe. Passando per il socket, MariaDB vede una connessione socket e matcha `@'localhost'`.

L'**utente SSH** è `web_<slug>` (il dominio con `.`/`-` → `_`, es. `dominio.it` → `web_dominio_it`),
la **porta SSH** è quella del server (spesso non la 22): le trovi nella schermata *ISTRUZIONI DI
CONNESSIONE* della stessa voce del pannello. Con molte chiavi sul Mac, metti l'host in
`~/.ssh/config` (IdentityFile + IdentitiesOnly) e usa l'alias, per evitare `Too many auth failures`:

```sshconfig
Host traido
    HostName oracle.communicationbox.it
    User     web_traido_it
    Port     17422
    IdentityFile ~/.ssh/id_traido
    IdentitiesOnly yes
```

### A) Solo CLI, senza `mysql` sul Mac → `remote` + `password` (consigliato)

```bash
./dbssh.sh config traido
#   Modalità: remote
#   Alias SSH: traido
#   Nome DB / Utente DB: traido_it   (i nomi del sito)
#   Auth DB: password
./dbssh.sh up traido        # chiede la password DB (mail di creazione o RESET PASSWORD DATABASE)
./dbssh.sh q "SHOW TABLES"  # esegue mysql SU oracle, niente tunnel, niente client locale
./dbssh.sh shell            # shell mysql interattiva sul server
```

### B) Serve una porta locale per GUI/.env → `tunnel` verso il socket (richiede `mysql`/driver locale)

```bash
./dbssh.sh config traido
#   Modalità: tunnel · Alias SSH: traido · DB remoto: /run/mysqld/mysqld.sock (default)
./dbssh.sh up traido        # chiede la password DB
# .env / GUI → host=127.0.0.1  port=13306  user=traido_it  db=traido_it
```

## Note

- `.local/` (config + password) è **auto-gitignorato** dallo script; il box lo ignora
  anche via `.gitignore`. Per azzerare tutto: `rm -rf .local/`.
- **Alias SSH** (consigliato): primo campo di `config`. Se indichi il nome di un `Host` di
  `~/.ssh/config`, lo script si connette con **`ssh <alias>`** e non passa né utente né porta
  né chiave: **decide tutto `~/.ssh/config`**. `config` non chiede più host/utente/porta/chiave
  e mostra come ssh risolve l'alias (avvisa se la voce `Host` non esiste). Lascia il campo
  **vuoto** per i parametri manuali (comportamento di prima).
- **Chiave SSH** (solo senza alias): campo opzionale. Se **vuoto**, l'autenticazione usa
  l'ssh-agent / le chiavi di default. Se indichi un **path** (anche `~/...`) viene passato con
  `ssh -i … -o IdentitiesOnly=yes` (offre **solo** quella chiave). In ogni caso l'accesso SSH
  è a chiave (mai password SSH).
- **DB remoto** (solo `tunnel`): `config` chiede *DB remoto host o socket* (come visto **dal
  server**), default il **socket unix** `/run/mysqld/mysqld.sock` (vedi sotto perché). Metti un
  **host TCP** (es. `127.0.0.1`) + porta solo se il DB è raggiungibile in TCP e il forwarding TCP
  è permesso. Un valore che inizia con `/` è trattato come socket (la porta è ignorata).
- **`DB_AUTH`** (solo `remote`): campo in `config` — `socket` (default) | `sudo` | `password`.
  `password` chiede utente+password DB e li usa via un `my.cnf` temporaneo sul server (vedi sopra);
  è la scelta per i siti bash-utility "ACCESSO SSH SVILUPPO". `sudo` richiede un utente SSH che
  possa fare `sudo` senza password. La password DB (modalità `password`) è cachata in `.local/`
  come per `tunnel` e rimossa al `down`.
- `q` è **sola-lettura** per sicurezza. Per scrivere: `DBSH_ALLOW_WRITE=1 ./dbssh.sh q "…"` (sconsigliato).
- Prerequisiti: `ssh` sempre; il client `mysql` locale (`brew install mysql-client`, fallback PHP
  `mysqli`) serve solo in modalità **tunnel** — in **remote** basta `mysql` sul server.
- Windows: Git Bash o WSL.
- Override via env (saltano i prompt): `MODE`, `SUDO`, `DB_AUTH`, `SSH_ALIAS`, `SSH_HOST`, `SSH_USER`, `SSH_PORT`, `SSH_KEY`, `DB_NAME`, `DB_USER`, `LOCAL_PORT`, `REMOTE_DB_HOST`, `REMOTE_DB_PORT`. Solo `remote`: `DBSH_MUX_PERSIST` (secondi di vita del master SSH, default 600).

## Troubleshooting

- **`Too many authentication failures` / il server chiude prima di chiedere la chiave giusta**:
  con più di 3-4 chiavi in `~/.ssh`, ssh le offre **tutte in sequenza** e il server taglia al
  `MaxAuthTries` (di norma 6) prima di arrivare a quella buona. Soluzione: metti l'host in
  `~/.ssh/config` con `IdentityFile` + `IdentitiesOnly yes` e usa l'**alias** in `config`:

  ```sshconfig
  Host fluidwork-staging
      HostName oracle.communicationbox.it
      Port     17422
      User     cbox
      IdentityFile ~/.ssh/id_ed25519_cbox
      IdentitiesOnly yes
  ```
  poi `./dbssh.sh config <profilo>` → *Alias SSH* = `fluidwork-staging`. In alternativa,
  senza alias, basta compilare il campo *Chiave SSH* (lo script aggiunge `IdentitiesOnly=yes`).
- **`administratively prohibited` / `open failed` con target TCP** (es. `127.0.0.1:3306`): il
  server ha **`AllowTcpForwarding no`** (tipico bash-utility) → il forward **TCP** è vietato. **NON**
  serve passare a `remote`: basta inoltrare verso il **SOCKET** — `./dbssh.sh config <p>` → *DB
  remoto* = `/run/mysqld/mysqld.sock` (il forward socket usa `direct-streamlocal`, non bloccato).
  Lo script ora lo rileva da sé e te lo suggerisce. (Se invece il forward **verso il socket** viene
  rifiutato, allora anche `AllowStreamLocalForwarding` è `no` sul server → usa `remote`.)
- **`Lost connection ... reading initial communication packet`** (modalità `tunnel`): il
  tunnel locale è su ma a *DB remoto host:porta* (sul server) non risponde un MySQL. Verifica
  dove ascolta il DB sul server (`ss -tlnp | grep -i mysql`) e reimposta *DB remoto host/porta*
  in `config`, poi `down` + `up`.
- **DB solo via socket** (MariaDB/MySQL con `skip-networking`, nessuna porta TCP): due opzioni:
  in **`tunnel`** metti come *DB remoto host* il **percorso del socket** (es.
  `/run/mysqld/mysqld.sock`) e lo script inoltra la porta locale verso quel socket; oppure — se
  anche il forwarding è disabilitato o l'auth è per utente di sistema — usa **`remote`**.
- **`remote` chiede la password del DB o dà `Access denied`**: l'auth sul server è per utente
  di sistema. Imposta `sudo=si` in `config` (l'utente SSH deve poter fare `sudo` senza password),
  oppure usa un utente SSH che sia già il proprietario del DB via socket.
- **`sudo: a password is required`** (modalità `remote`, `sudo=si`): l'utente SSH non ha `sudo`
  senza password sul server → usa `sudo=no` con l'utente proprietario del DB, o un altro profilo.
- **`Connection refused` sulla porta SSH dopo tante query** (modalità `remote`): il server ha
  bannato l'IP (`fail2ban`) per troppi login ravvicinati. Il **multiplexing** lo previene
  (le query riusano il master); assicurati che il socket master esista (`status` → «master SSH:
  attivo»). Se sei già bannato, attendi la fine del cooldown (di norma ~10 min).
