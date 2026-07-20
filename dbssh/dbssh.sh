#!/usr/bin/env bash
#
# dbssh.sh — accesso al DB MySQL/MariaDB di un server via SSH + query rapide (dev).
# Due strategie per-profilo: `remote` (esegue mysql SUL server via ssh, nessun client locale)
# e `tunnel` (apre `ssh -L` e usa un client mysql locale). Standalone, da copiare in ogni progetto.
# GENERALISTA + MULTI-CONNESSIONE: nessun valore di progetto hardcoded. Gestisce piu'
# connessioni nominate (es. "staging", "prod"); all'`up` scegli quale lanciare o ne crei
# una nuova. Config e password sono cachate per-profilo in ./.local/ (auto-gitignorato).
# Nessun segreto nel file: le password sono inserite a runtime e salvate solo in locale
# (mode 600), mai committate.
#
# Uso:
#   ./dbssh.sh up [nome]   apre il tunnel: senza nome mostra il menu (scegli/crea); con nome
#                       lancia (o crea) quella connessione
#   ./dbssh.sh q "<SQL>"   query sulla connessione attiva (default SOLO lettura)
#   ./dbssh.sh shell       shell mysql interattiva sulla connessione attiva
#   ./dbssh.sh list        elenco connessioni configurate (* = attiva)
#   ./dbssh.sh use <nome>  imposta la connessione attiva (senza aprire il tunnel)
#   ./dbssh.sh config [nome] crea/modifica una connessione (parametri SSH + DB)
#   ./dbssh.sh status      stato tunnel + connessione attiva
#   ./dbssh.sh down        chiude il tunnel della connessione attiva e ne rimuove la password
#
# Da Terminale PhpStorm:  ! ./dbssh.sh up
#
# Note:
#  - Modalita' per-profilo (scelta in `config`):
#      tunnel  apre `ssh -L` verso il DB e usa il client `mysql` locale (server con
#              TcpForwarding abilitato e DB raggiungibile in TCP o via socket inoltrato);
#      remote  NON apre tunnel: esegue `mysql` sul server via ssh, con l'SQL passato su
#              stdin (server con AllowTcpForwarding no e/o DB solo-socket). Nessun client
#              mysql locale richiesto. Auth DB (campo `DB_AUTH`): socket (utente di sistema)
#              | sudo (`sudo mysql`) | password (utente+password DB — caso bash-utility
#              "ACCESSO SSH SVILUPPO": la password viaggia via stdin in un my.cnf 0600 sul
#              server, MAI su command line).
#  - Ogni connessione ha una porta locale distinta di default (13306, 13307, ...), cosi'
#    piu' tunnel (es. staging + prod) possono restare aperti insieme.
#  - L'utente DB nel prompt ha come default il nome del DB (spesso coincidono): dai invio.
#  - Alias SSH: se indichi il nome di un `Host` di ~/.ssh/config, lo script si connette con
#    `ssh <alias>` e NON passa utente/porta/chiave → li decide ssh dal suo config. Risolve il
#    "Too many authentication failures" di chi ha molte chiavi (usa IdentityFile/IdentitiesOnly).
#  - Chiave SSH (solo senza alias): opzionale. Se vuota usa ~/.ssh/config / agent; se indicata
#    → `ssh -i <key> -o IdentitiesOnly=yes` (offre SOLO quella chiave).
#  - Override via env (saltano i prompt): MODE, SUDO, DB_AUTH, SSH_ALIAS, SSH_HOST, SSH_USER,
#    SSH_PORT, SSH_KEY, DB_NAME, DB_USER, LOCAL_PORT. Scrittura: per query non-SELECT serve DBSH_ALLOW_WRITE=1 (sconsigliato).
#  - Per azzerare tutto: rimuovi `.local/`.
#
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_DIR="$DIR/.local"
CONN_DIR="$LOCAL_DIR/conn"
CURRENT_FILE="$LOCAL_DIR/current"

# Default non segreti (sovrascrivibili in `config` o via env)
DEF_SSH_PORT="22"; DEF_LOCAL_PORT="13306"
# DB remoto: default al SOCKET unix di MariaDB. Motivo: i server gestiti con
# bash-utility ("ACCESSO SSH SVILUPPO") sono hardened con `AllowTcpForwarding no`
# → un forward TCP (`-L p:127.0.0.1:3306`) viene RIFIUTATO dal server; inoltre il
# DB user del sito è socket-only (`<base>@'localhost'`, nessun grant @'127.0.0.1').
# Inoltrare verso il socket (`-L p:/run/mysqld/mysqld.sock`) usa un canale
# direct-streamlocal (NON bloccato da AllowTcpForwarding no) e arriva via socket
# → matcha @'localhost'. Per un DB in TCP "normale" basta digitare l'IP nel prompt.
DEF_REMOTE_DB_HOST="/run/mysqld/mysqld.sock"; DEF_REMOTE_DB_PORT="3306"
DEF_MODE="tunnel"   # tunnel = ssh -L + mysql locale | remote = mysql eseguito sul server via ssh

# my.cnf temporaneo con la password: var globale + cleanup garantito all'uscita
# (return 0: in modalità remote CNF resta vuoto e il test non deve alterare l'exit status)
CNF=""; cleanup() { [ -n "${CNF:-}" ] && rm -f "$CNF"; return 0; }; trap cleanup EXIT

mysql_bin() { command -v mysql 2>/dev/null || echo "/opt/homebrew/opt/mysql-client/bin/mysql"; }
port_open() { nc -z -w2 127.0.0.1 "${LOCAL_PORT:-$DEF_LOCAL_PORT}" >/dev/null 2>&1; }

# Crea .local/ e la rende auto-ignorata da git (indipendente dal .gitignore del repo).
ensure_local_dir() {
  mkdir -p "$CONN_DIR"
  [ -f "$LOCAL_DIR/.gitignore" ] || printf '*\n' > "$LOCAL_DIR/.gitignore"
}

# Chiede un valore con default. Uso: val=$(prompt_def "Etichetta" "default")
# (prompt su stderr, valore su stdout: catturabile con $(...) )
prompt_def() {
  local label="$1" def="${2:-}" ans
  if [ -n "$def" ]; then printf '%s [%s]: ' "$label" "$def" >&2; else printf '%s: ' "$label" >&2; fi
  IFS= read -r ans
  printf '%s' "${ans:-$def}"
}

sanitize_name() { printf '%s' "$1" | tr -cd 'A-Za-z0-9_-'; }

# Avvisa (senza bloccare) se l'alias non risulta in ~/.ssh/config: `ssh -G <alias>` risolve
# comunque, ma con hostname == alias e utente = quello locale → segno che la voce Host manca.
check_ssh_alias() {
  local a="$1" g h u
  g="$(ssh -G "$a" 2>/dev/null || true)"
  [ -n "$g" ] || return 0
  h="$(printf '%s\n' "$g" | awk '$1=="hostname"{print $2; exit}')"
  u="$(printf '%s\n' "$g" | awk '$1=="user"{print $2; exit}')"
  if [ "$h" = "$a" ] && [ "$u" = "$(id -un)" ]; then
    echo "! attenzione: '$a' non sembra un Host di ~/.ssh/config (nessun override host/utente)." >&2
  else
    echo "  ssh risolve '$a' → ${u}@${h}:$(printf '%s\n' "$g" | awk '$1=="port"{print $2; exit}')"
  fi
  return 0
}
list_profiles() { [ -d "$CONN_DIR" ] || return 0; for f in "$CONN_DIR"/*.conf; do [ -e "$f" ] || continue; basename "$f" .conf; done; }
current_profile() { [ -s "$CURRENT_FILE" ] && cat "$CURRENT_FILE" || printf ''; }
set_current() { ensure_local_dir; printf '%s' "$1" > "$CURRENT_FILE"; }
# Imposta il profilo attivo e i path di conf/password/pid/credenziali-remote
set_profile() { PROFILE="$1"; CONF_FILE="$CONN_DIR/$PROFILE.conf"; PW_FILE="$CONN_DIR/$PROFILE.pw"; PID_FILE="$CONN_DIR/$PROFILE.pid"; RCNF_FILE="$CONN_DIR/$PROFILE.rcnf"; }
# Legge un valore dal file conf: get_cfg <file> <KEY>
get_cfg() { sed -n "s/^$2=\"\(.*\)\"\$/\1/p" "$1" 2>/dev/null || true; }

# (Ri)configura una connessione nominata e la salva in .local/conn/<nome>.conf.
# L'utente DB defaulta al nome del DB; la porta locale defaulta a 13306+N (N = profili esistenti).
do_config() {
  ensure_local_dir
  local name="${1:-}"
  [ -n "$name" ] || name="$(prompt_def 'Nome connessione (es. staging, prod)' '')"
  name="$(sanitize_name "$name")"
  [ -n "$name" ] || { echo "Nome connessione non valido." >&2; exit 1; }
  set_profile "$name"
  [ -f "$CONF_FILE" ] && echo "(modifico la connessione esistente '$name')"

  # Default: env > valore salvato > default calcolato
  local cA cH cU cP cK cN cDU cL cRH cRP cM cS defLocal nExist
  cA="$(get_cfg "$CONF_FILE" SSH_ALIAS_CFG)"
  cH="$(get_cfg "$CONF_FILE" SSH_HOST_CFG)"; cU="$(get_cfg "$CONF_FILE" SSH_USER_CFG)"
  cP="$(get_cfg "$CONF_FILE" SSH_PORT_CFG)"; cN="$(get_cfg "$CONF_FILE" DB_NAME_CFG)"
  cDU="$(get_cfg "$CONF_FILE" DB_USER_CFG)"; cL="$(get_cfg "$CONF_FILE" LOCAL_PORT_CFG)"
  cK="$(get_cfg "$CONF_FILE" SSH_KEY_CFG)"
  cRH="$(get_cfg "$CONF_FILE" REMOTE_DB_HOST_CFG)"; cRP="$(get_cfg "$CONF_FILE" REMOTE_DB_PORT_CFG)"
  cM="$(get_cfg "$CONF_FILE" MODE_CFG)"; cS="$(get_cfg "$CONF_FILE" SUDO_CFG)"
  local cAuth; cAuth="$(get_cfg "$CONF_FILE" DB_AUTH_CFG)"
  nExist="$(list_profiles | grep -c . || true)"
  defLocal=$(( DEF_LOCAL_PORT + nExist ))   # porta locale distinta per ogni nuova connessione

  local mode sshAlias sshHost sshUser sshPort sshKey dbName dbUser localPort remoteHost remotePort sudo dbAuth
  dbAuth="${cAuth:-}"

  # ── 1. Modalità ──────────────────────────────────────────────────────────
  echo "" >&2
  echo "Come vuoi raggiungere il database?" >&2
  echo "  remote  = esegue mysql SUL SERVER via SSH — nessun client mysql sul tuo PC (consigliato)" >&2
  echo "  tunnel  = apre un tunnel e usa un client mysql LOCALE (serve mysql installato sul PC;" >&2
  echo "            utile per puntarci una GUI o il .env del progetto)" >&2
  mode=$(prompt_def 'Modalità (remote|tunnel)' "${MODE:-${cM:-remote}}")
  case "$mode" in tunnel|remote) ;; *) echo "Modalità non valida: usa 'remote' o 'tunnel'." >&2; exit 1 ;; esac

  # ── 2. Connessione SSH al server ─────────────────────────────────────────
  echo "" >&2
  echo "── Connessione SSH al server ──" >&2
  echo "Se hai già una voce 'Host' in ~/.ssh/config (con HostName/User/Port/IdentityFile)," >&2
  echo "scrivi qui il suo nome: userà quella e NON ti chiederà host/utente/porta/chiave." >&2
  sshAlias=$(prompt_def 'Alias SSH da ~/.ssh/config (INVIO per inserire i dati a mano)' "${SSH_ALIAS:-$cA}")
  if [ -n "$sshAlias" ]; then
    check_ssh_alias "$sshAlias"
    sshHost="$sshAlias"; sshUser=""; sshPort=""; sshKey=""
  else
    sshHost=$(prompt_def 'Indirizzo del server (hostname o IP)' "${SSH_HOST:-$cH}")
    sshUser=$(prompt_def 'Utente SSH (siti bash-utility: web_<slug>, es. web_traido_it)' "${SSH_USER:-$cU}")
    sshPort=$(prompt_def 'Porta SSH (spesso NON è la 22)' "${SSH_PORT:-${cP:-$DEF_SSH_PORT}}")
    sshKey=$(prompt_def  'Percorso della chiave privata SSH (INVIO = agent/chiavi di default)' "${SSH_KEY:-$cK}")
  fi

  # ── 3. Database ──────────────────────────────────────────────────────────
  echo "" >&2
  echo "── Database ──" >&2
  dbName=$(prompt_def 'Nome del database' "${DB_NAME:-$cN}")

  if [ "$mode" = "tunnel" ]; then
    dbUser=$(prompt_def 'Utente del database (di solito coincide col nome del DB)' "${DB_USER:-${cDU:-$dbName}}")
    echo "Dove ascolta il DB SUL SERVER? Lascia il socket unix (default: server bash-utility)," >&2
    echo "oppure scrivi un indirizzo IP se il DB è raggiungibile in TCP." >&2
    remoteHost=$(prompt_def 'Socket unix del DB, oppure IP' "${REMOTE_DB_HOST:-${cRH:-$DEF_REMOTE_DB_HOST}}")
    case "$remoteHost" in
      /*) remotePort="${cRP:-$DEF_REMOTE_DB_PORT}" ;;   # è un socket → la porta non serve, non la chiedo
      *)  remotePort=$(prompt_def 'Porta del DB sul server' "${REMOTE_DB_PORT:-${cRP:-$DEF_REMOTE_DB_PORT}}") ;;
    esac
    localPort=$(prompt_def 'Porta locale sul tuo PC (poi punti GUI/.env a 127.0.0.1:questa-porta)' "${LOCAL_PORT:-${cL:-$defLocal}}")
    sudo="no"; dbAuth=""
  else
    echo "Come ci si autentica al database SUL SERVER?" >&2
    echo "  password = utente + password del DB — caso tipico dei siti bash-utility" >&2
    echo "             (l'utente web_<slug> accede come <base>@'localhost' con la password del sito)" >&2
    echo "  socket   = l'utente SSH possiede già il DB via socket (nessuna password)" >&2
    echo "  sudo     = usa 'sudo mysql' (l'utente SSH deve avere sudo senza password)" >&2
    dbAuth=$(prompt_def 'Autenticazione DB (password|socket|sudo)' "${DB_AUTH:-${cAuth:-password}}")
    case "$dbAuth" in socket|sudo|password) ;; *) echo "Auth non valida: usa 'password', 'socket' o 'sudo'." >&2; exit 1 ;; esac
    if [ "$dbAuth" = "password" ]; then
      dbUser=$(prompt_def 'Utente del database (di solito coincide col nome del DB)' "${DB_USER:-${cDU:-$dbName}}")
      [ -n "$dbUser" ] || { echo "Utente DB obbligatorio (auth password)." >&2; exit 1; }
      echo "  (la password del DB verrà chiesta al primo 'up', non ora)" >&2
    else
      dbUser="${cDU:-$dbName}"
    fi
    sudo="no"; [ "$dbAuth" = "sudo" ] && sudo="yes"
    # valori tunnel-only conservati (default) per non perderli se si torna a 'tunnel'
    remoteHost="${cRH:-$DEF_REMOTE_DB_HOST}"
    remotePort="${cRP:-$DEF_REMOTE_DB_PORT}"; localPort="${cL:-$defLocal}"
  fi

  if [ -n "$sshAlias" ]; then
    [ -n "$dbName" ] || { echo "Nome DB obbligatorio." >&2; exit 1; }
  else
    [ -n "$sshHost" ] && [ -n "$sshUser" ] && [ -n "$dbName" ] || {
      echo "Host SSH, Utente SSH e Nome DB sono obbligatori." >&2; exit 1; }
  fi
  [ "$mode" = "tunnel" ] && [ -z "$dbUser" ] && { echo "Utente DB obbligatorio (modalità tunnel)." >&2; exit 1; }

  umask 077
  cat > "$CONF_FILE" <<EOF
MODE_CFG="$mode"
SUDO_CFG="$sudo"
DB_AUTH_CFG="$dbAuth"
SSH_ALIAS_CFG="$sshAlias"
SSH_HOST_CFG="$sshHost"
SSH_USER_CFG="$sshUser"
SSH_PORT_CFG="$sshPort"
SSH_KEY_CFG="$sshKey"
DB_NAME_CFG="$dbName"
DB_USER_CFG="$dbUser"
REMOTE_DB_HOST_CFG="$remoteHost"
REMOTE_DB_PORT_CFG="$remotePort"
LOCAL_PORT_CFG="$localPort"
EOF
  rm -f "$PW_FILE" "$RCNF_FILE"   # nuova connessione: password/credenziali da reinserire
  set_current "$name"
  local dest; if [ -n "$sshAlias" ]; then dest="$sshAlias (alias ~/.ssh/config)"; else dest="$sshUser@$sshHost:$sshPort"; fi
  echo "" >&2
  echo "✓ Connessione '$name' salvata e resa attiva. Riepilogo:" >&2
  echo "    modalità : $mode" >&2
  echo "    server   : ssh $dest" >&2
  if [ "$mode" = "tunnel" ]; then
    local dbloc="$remoteHost"
    case "$remoteHost" in /*) ;; *) dbloc="$remoteHost:$remotePort" ;; esac
    echo "    database : $dbUser @ $dbName" >&2
    echo "    DB sul server: $dbloc" >&2
    echo "    porta locale : 127.0.0.1:$localPort" >&2
    echo "" >&2
    echo "  Prossimo passo:  ./dbssh.sh up $name   (apre il tunnel e chiede la password DB)" >&2
  else
    local authinfo="$dbAuth"
    [ "$dbAuth" = "password" ] && authinfo="password, utente $dbUser"
    local pwhint=""
    [ "$dbAuth" = "password" ] && pwhint=" e chiede la password DB"
    echo "    database : $dbName   (auth: $authinfo)" >&2
    echo "" >&2
    echo "  Prossimo passo:  ./dbssh.sh up $name   (verifica l'accesso$pwhint)" >&2
    echo "  Poi:             ./dbssh.sh q \"SHOW TABLES\"   |   ./dbssh.sh shell" >&2
  fi
}

# Menu di `up` senza nome: scegli un profilo esistente o creane uno nuovo (imposta PROFILE).
select_or_create() {
  local profiles; profiles="$(list_profiles)"
  if [ -z "$profiles" ]; then do_config ""; return; fi
  echo "Connessioni disponibili:"
  local i=0 cur def=1; cur="$(current_profile)"; local names=()
  while IFS= read -r n; do
    [ -n "$n" ] || continue; i=$((i+1)); names+=("$n")
    [ "$n" = "$cur" ] && def=$i
    printf '  %d) %-16s (db: %s @ %s)%s\n' "$i" "$n" \
      "$(get_cfg "$CONN_DIR/$n.conf" DB_NAME_CFG)" "$(get_cfg "$CONN_DIR/$n.conf" SSH_HOST_CFG)" \
      "$( [ "$n" = "$cur" ] && printf ' *' )"
  done <<< "$profiles"
  echo "  n) nuova connessione"
  local ch; ch="$(prompt_def 'Scelta' "$def")"
  if [ "$ch" = "n" ] || [ "$ch" = "N" ]; then do_config ""; return; fi
  if printf '%s' "$ch" | grep -qE '^[0-9]+$' && [ "$ch" -ge 1 ] && [ "$ch" -le "$i" ]; then
    set_profile "${names[$((ch-1))]}"; set_current "$PROFILE"
  else
    echo "Scelta non valida." >&2; exit 1
  fi
}

# Carica la conf del profilo attivo in variabili effettive (env > conf > default).
load_conf() {
  [ -f "$CONF_FILE" ] || { echo "Connessione '$PROFILE' non configurata. Lancia: ./dbssh.sh up" >&2; exit 1; }
  . "$CONF_FILE"
  MODE="${MODE:-${MODE_CFG:-$DEF_MODE}}"
  SUDO="${SUDO:-${SUDO_CFG:-no}}"
  # Auth DB in modalità remote: socket | sudo | password. Retrocompat: se il
  # profilo non ha DB_AUTH_CFG (config vecchia) lo deriviamo dal vecchio SUDO.
  DB_AUTH="${DB_AUTH:-${DB_AUTH_CFG:-}}"
  if [ -z "$DB_AUTH" ]; then
    [ "$SUDO" = "yes" ] && DB_AUTH="sudo" || DB_AUTH="socket"
  fi
  SSH_ALIAS="${SSH_ALIAS:-${SSH_ALIAS_CFG:-}}"
  SSH_HOST="${SSH_HOST:-${SSH_HOST_CFG:-}}"
  SSH_USER="${SSH_USER:-${SSH_USER_CFG:-}}"
  SSH_PORT="${SSH_PORT:-${SSH_PORT_CFG:-$DEF_SSH_PORT}}"
  DB_NAME="${DB_NAME:-${DB_NAME_CFG:-}}"
  DB_USER="${DB_USER:-${DB_USER_CFG:-}}"
  LOCAL_PORT="${LOCAL_PORT:-${LOCAL_PORT_CFG:-$DEF_LOCAL_PORT}}"
  SSH_KEY="${SSH_KEY:-${SSH_KEY_CFG:-}}"
  [ -n "$SSH_KEY" ] && SSH_KEY="${SSH_KEY/#\~\//$HOME/}"   # espande un ~/ iniziale
  REMOTE_DB_HOST="${REMOTE_DB_HOST:-${REMOTE_DB_HOST_CFG:-$DEF_REMOTE_DB_HOST}}"
  REMOTE_DB_PORT="${REMOTE_DB_PORT:-${REMOTE_DB_PORT_CFG:-$DEF_REMOTE_DB_PORT}}"
  # Destinazione ssh: con alias è l'alias e basta (utente/porta/chiave li mette ~/.ssh/config).
  if [ -n "$SSH_ALIAS" ]; then SSH_DEST="$SSH_ALIAS"; SSH_LABEL="$SSH_ALIAS (alias)"
  else SSH_DEST="$SSH_USER@$SSH_HOST"; SSH_LABEL="$SSH_USER@$SSH_HOST:$SSH_PORT"; fi
  if [ "$MODE" = "tunnel" ]; then
    # SE il "DB remoto host" è un percorso (inizia con /) ALLORA inoltra verso il SOCKET unix
    # del server (DB senza TCP). ALTRIMENTI forward TCP host:porta.
    case "$REMOTE_DB_HOST" in
      /*) FWD="$LOCAL_PORT:$REMOTE_DB_HOST" ;;
      *)  FWD="$LOCAL_PORT:$REMOTE_DB_HOST:$REMOTE_DB_PORT" ;;
    esac
  fi
}

# Opzioni SSH comuni (porta + chiave) → array globale SSH_OPTS (usato da tunnel e remote).
# CON alias: nessuna opzione di connessione, così vince interamente ~/.ssh/config (incluse
# IdentityFile/IdentitiesOnly) — è il modo per non far offrire a ssh tutte le chiavi del Mac
# e incappare in "Too many authentication failures" (MaxAuthTries del server, di solito 6).
ssh_base_opts() {
  SSH_OPTS=(-o ServerAliveInterval=30 -o ServerAliveCountMax=3)
  if [ -z "${SSH_ALIAS:-}" ]; then
    SSH_OPTS+=(-p "$SSH_PORT")
    # chiave esplicita: offri SOLO quella (IdentitiesOnly), niente rassegna di chiavi/agent
    [ -n "${SSH_KEY:-}" ] && SSH_OPTS+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
  fi
  return 0   # non far propagare a set -e il test precedente quando SSH_KEY è vuota
}

# Multiplexing SSH (solo modalità remote): la prima connessione apre un "master" che le
# query successive RIUSANO → niente nuovo handshake/auth per ogni `q`, molto più veloce ed
# evita di far scattare i rate-limiter del server (fail2ban) con tante connessioni ravvicinate.
# ControlPath usa il token %C (hash di utente@host:porta) → path corto e identico fra i comandi.
# Il master resta idle per DBSH_MUX_PERSIST secondi (default 600), poi si chiude da solo; `down`
# lo chiude subito. Va aggiunto DOPO ssh_base_opts. Imposta anche MUX_DEST per i comandi -O.
ssh_mux_opts() {
  # ControlPath sotto /tmp (non TMPDIR: su macOS è lungo e il socket unix ha un limite di
  # ~104 char). Include l'UID per isolarlo fra utenti della stessa macchina; %C tiene il resto corto.
  SSH_OPTS+=(-o ControlMaster=auto \
    -o "ControlPath=/tmp/dbssh-mux-$(id -u)-%C" \
    -o "ControlPersist=${DBSH_MUX_PERSIST:-600}")
  MUX_DEST="$SSH_DEST"
  return 0
}

# true se esiste un master SSH attivo per il profilo remote corrente.
mux_alive() { ssh -O check "${SSH_OPTS[@]}" "$MUX_DEST" >/dev/null 2>&1; }

# Comando mysql da eseguire SUL server (modalità remote), secondo DB_AUTH:
#   socket   → mysql <db>                          (auth utente di sistema)
#   sudo     → sudo mysql <db>
#   password → mysql --defaults-extra-file=<RCNF> <db>   (RCNF = my.cnf temporaneo
#              sul server con utente+password, creato da remote_pw_ensure_cnf)
remote_db_cmd() {
  local db="${DB_NAME:+ $DB_NAME}"
  case "${DB_AUTH:-socket}" in
    sudo)     printf 'sudo mysql%s' "$db" ;;
    password) printf 'mysql --defaults-extra-file=%s%s' "$RCNF" "$db" ;;
    *)        printf 'mysql%s' "$db" ;;
  esac
}

# Chiede (una volta) e cacha la password del DB in $PW_FILE (mode 600, gitignorato).
# Usata da tunnel (mysql locale) e da remote+password (my.cnf sul server).
cache_db_password() {
  [ -f "$PW_FILE" ] && { echo "password già cachata ($PW_FILE)."; return 0; }
  ensure_local_dir; umask 077
  printf 'Password DB (%s @ %s) [invio se l'\''utente non ha password]: ' "$DB_USER" "$DB_NAME"
  stty -echo; IFS= read -r PW; stty echo; echo
  printf '%s' "$PW" > "$PW_FILE"; unset PW
  echo "password cachata in .local/conn/$PROFILE.pw ($(wc -c <"$PW_FILE") byte, gitignorato)."
}

# remote+password: assicura un my.cnf temporaneo SUL server (mode 600, owner utente
# SSH) con [client] user/password, e mette il suo path in $RCNF. Le credenziali
# viaggiano via STDIN di ssh (cifrato) e finiscono in un file: MAI su command line
# (né locale né remota → niente leak via `ps` su server multi-tenant). Riusa il file
# se già presente (path in $RCNF_FILE) e ancora esistente sul server.
remote_pw_ensure_cnf() {
  local saved=""
  [ -f "$RCNF_FILE" ] && saved="$(cat "$RCNF_FILE" 2>/dev/null || true)"
  if [ -n "$saved" ] && ssh "${SSH_OPTS[@]}" "$MUX_DEST" "test -f '$saved'" >/dev/null 2>&1; then
    RCNF="$saved"; return 0
  fi
  [ -f "$PW_FILE" ] || { echo "password non cachata per '$PROFILE'. Lancia: ./dbssh.sh up $PROFILE" >&2; return 1; }
  local pw out; pw="$(cat "$PW_FILE")"
  # Il path viene emesso con un marcatore e ri-estratto con sed: così un eventuale
  # banner SSH (MOTD/Banner) mescolato all'output non corrompe il path catturato.
  out="$(printf '[client]\nuser=%s\npassword=%s\n' "$DB_USER" "$pw" \
    | ssh "${SSH_OPTS[@]}" "$MUX_DEST" 'f="$(mktemp)" && chmod 600 "$f" && cat > "$f" && printf "DBSSH_RCNF=%s\n" "$f"' 2>/dev/null)"
  unset pw
  RCNF="$(printf '%s\n' "$out" | sed -n 's/^DBSSH_RCNF=//p' | tail -n1)"
  [ -n "$RCNF" ] || { echo "impossibile creare il file credenziali temporaneo sul server." >&2; return 1; }
  printf '%s' "$RCNF" > "$RCNF_FILE"
  return 0
}

# Guardia sola-lettura sul primo token dell'SQL (bypass con DBSH_ALLOW_WRITE=1).
guard_readonly() {
  [ "${DBSH_ALLOW_WRITE:-0}" = "1" ] && return 0
  local first; first="$(printf '%s\n' "$1" | awk 'NR==1{print toupper($1); exit}')"
  case "$first" in
    SELECT|SHOW|DESC|DESCRIBE|EXPLAIN|WITH) return 0 ;;
    *) echo "Bloccato (non-lettura): '$first'. Per scrivere: DBSH_ALLOW_WRITE=1 ./dbssh.sh q ..." >&2; exit 1 ;;
  esac
}

# Per q/shell/status/down: imposta il profilo attivo da .local/current.
resolve_current() {
  local p; p="$(current_profile)"
  [ -n "$p" ] || { echo "Nessuna connessione attiva. Lancia: ./dbssh.sh up" >&2; exit 1; }
  set_profile "$p"
}

# Analizza lo stderr di ssh (file $1) e stampa una diagnosi mirata (modalità tunnel).
# Usa $REMOTE_DB_HOST e $PROFILE del profilo corrente.
diagnose_ssh_err() {
  local log="$1" txt
  txt="$(cat "$log" 2>/dev/null || true)"
  [ -n "$txt" ] && { printf -- '--- ssh dice: ---\n' >&2; printf '%s\n' "$txt" | sed 's/^/  /' >&2; printf -- '------------------\n' >&2; }
  case "$txt" in
    *"administratively prohibited"*|*"open failed"*|*"connect failed"*)
      case "$REMOTE_DB_HOST" in
        /*) echo "→ Il server RIFIUTA il forward verso il socket ($REMOTE_DB_HOST)." >&2
            echo "  (a) percorso socket errato → verificalo sul server:" >&2
            echo "        ss -lx | grep -i mysql     oppure     mysqladmin variables | grep -w socket" >&2
            echo "  (b) StreamLocal forwarding disabilitato lato server (AllowStreamLocalForwarding no)" >&2
            echo "      → ricrea il profilo in modalità 'remote': ./dbssh.sh config $PROFILE" >&2 ;;
        *)  echo "→ Il server blocca il forwarding TCP (bash-utility hardened: AllowTcpForwarding no)." >&2
            echo "  Con 'ACCESSO SSH SVILUPPO' il DB si raggiunge SOLO via SOCKET, non via TCP." >&2
            echo "  Riconfigura:  ./dbssh.sh config $PROFILE   →   DB remoto = /run/mysqld/mysqld.sock" >&2 ;;
      esac ;;
    *"Permission denied"*|*"publickey"*)
      echo "→ SSH ha rifiutato la chiave. Verifica: utente = web_<slug> (NON il dominio), porta SSH" >&2
      echo "  corretta, e che la chiave PUBBLICA sia incollata in 'ACCESSO SSH SVILUPPO'. Con molte" >&2
      echo "  chiavi sul Mac → usa un alias ~/.ssh/config (IdentityFile + IdentitiesOnly)." >&2 ;;
    *"Too many authentication failures"*)
      echo "→ Troppe chiavi offerte in sequenza. Metti l'host in ~/.ssh/config (IdentityFile +" >&2
      echo "  IdentitiesOnly yes) e usa l'alias in config, oppure compila il campo 'Chiave SSH'." >&2 ;;
    *"Address already in use"*|*"cannot listen"*|*"bind"*)
      echo "→ La porta locale $LOCAL_PORT è già occupata. Cambia 'Porta locale' in config, o chiudi l'altro tunnel." >&2 ;;
    *"Connection refused"*|*"timed out"*|*"No route to host"*)
      echo "→ Host/porta SSH irraggiungibili, o IP bannato da fail2ban (troppi tentativi). Verifica" >&2
      echo "  host/porta; se bannato attendi il cooldown (~10 min) o sblocca da spanel." >&2 ;;
    *) : ;;
  esac
}

cmd_up() {
  local argname="${1:-}"
  if [ -n "$argname" ]; then
    set_profile "$(sanitize_name "$argname")"
    if [ ! -f "$CONF_FILE" ]; then echo "Connessione '$PROFILE' non esiste: la creo."; do_config "$PROFILE"; fi
    set_current "$PROFILE"
  else
    select_or_create
  fi
  load_conf
  if [ "$MODE" = "remote" ]; then cmd_up_remote; else cmd_up_tunnel; fi
}

# Modalità tunnel: apre `ssh -L` e cacha la password del DB.
cmd_up_tunnel() {
  if port_open; then echo "tunnel '$PROFILE' già attivo su 127.0.0.1:$LOCAL_PORT"; else
    echo "Apro il tunnel SSH '$PROFILE' ($SSH_LABEL, forward $FWD)${SSH_KEY:+ [key: $SSH_KEY]}..."
    ssh_base_opts
    ensure_local_dir
    local errlog; errlog="$(mktemp)"
    # NB: NON usiamo `-f` (che stacca ssh e ci fa perdere lo stderr): ci gestiamo
    # noi il background con `&`, redirigendo lo stderr in $errlog per la diagnosi.
    # `ExitOnForwardFailure` intercetta il fallimento del BIND locale; il rifiuto
    # del CANALE lato server (forwarding vietato) emerge solo alla prima connessione
    # → lo forziamo subito dopo con un probe e ispezioniamo $errlog.
    ssh -N -o ExitOnForwardFailure=yes -o TCPKeepAlive=yes "${SSH_OPTS[@]}" \
        -L "$FWD" "$SSH_DEST" 2>"$errlog" &
    local sshpid=$!
    printf '%s' "$sshpid" > "$PID_FILE"
    # attendi il bind della porta locale (max ~4s), o l'uscita di ssh (errore)
    local i=0
    while [ $i -lt 20 ]; do
      port_open && break
      kill -0 "$sshpid" 2>/dev/null || break
      sleep 0.2; i=$((i+1))
    done
    if ! port_open; then
      echo "tunnel NON attivo." >&2
      diagnose_ssh_err "$errlog"
      rm -f "$errlog" "$PID_FILE"
      exit 1
    fi
    # probe: apri e chiudi una connessione alla porta locale per forzare l'apertura
    # del canale verso il target; se il forward è rifiutato ssh scrive in $errlog.
    nc -z -w2 127.0.0.1 "$LOCAL_PORT" >/dev/null 2>&1 || true
    sleep 0.4
    if grep -qiE 'open failed|administratively prohibited|connect failed' "$errlog" 2>/dev/null; then
      echo "tunnel su MA il forward verso il DB è RIFIUTATO dal server." >&2
      diagnose_ssh_err "$errlog"
      kill "$sshpid" 2>/dev/null || true
      rm -f "$errlog" "$PID_FILE"
      exit 1
    fi
    rm -f "$errlog"
    echo "tunnel su."
  fi
  cache_db_password
  echo "Connessione attiva: '$PROFILE'. Esempi: ./dbssh.sh q \"SHOW TABLES\"  |  ./dbssh.sh shell"
}

# Modalità remote: nessun tunnel/password. Verifica l'accesso E apre la connessione master
# (multiplexing) che le query successive riuseranno.
cmd_up_remote() {
  ssh_base_opts; ssh_mux_opts
  if [ "$DB_AUTH" = "password" ]; then
    cache_db_password
    remote_pw_ensure_cnf || exit 1
  fi
  echo "Verifico accesso remoto '$PROFILE' ($SSH_LABEL → mysql $DB_NAME, auth=$DB_AUTH)${SSH_KEY:+ [key: $SSH_KEY]}..."
  if printf 'SELECT 1;\n' | ssh "${SSH_OPTS[@]}" "$MUX_DEST" "$(remote_db_cmd)" >/dev/null 2>&1; then
    if mux_alive; then echo "accesso remoto OK, connessione master SSH aperta (multiplexing). Attiva: '$PROFILE'."
    else echo "accesso remoto OK. Connessione attiva: '$PROFILE'."; fi
  else
    echo "accesso remoto FALLITO. Verifica chiave/utente SSH e permessi mysql sul server." >&2
    if [ -n "${SSH_ALIAS:-}" ]; then
      echo "prova manuale: ssh $SSH_ALIAS '$(remote_db_cmd) -e \"SELECT 1\"'" >&2
    else
      echo "prova manuale: ssh -p $SSH_PORT $SSH_DEST '$(remote_db_cmd) -e \"SELECT 1\"'" >&2
      echo "(molte chiavi sul Mac → 'Too many authentication failures'? metti l'host in ~/.ssh/config e usa l'alias: ./dbssh.sh config $PROFILE)" >&2
    fi
    exit 1
  fi
  echo "Esempi: ./dbssh.sh q \"SHOW TABLES\"  |  ./dbssh.sh shell"
}

ensure_ready() {
  port_open || { echo "tunnel giù per '$PROFILE'. Lancia: ./dbssh.sh up $PROFILE" >&2; exit 1; }
  [ -f "$PW_FILE" ] || { echo "password non cachata per '$PROFILE'. Lancia: ./dbssh.sh up $PROFILE" >&2; exit 1; }
}

# Crea il my.cnf temporaneo (mode 600) in CNF; rimosso dalla trap EXIT.
make_cnf() {
  CNF="$(mktemp)"; chmod 600 "$CNF"
  { printf '[client]\nhost=127.0.0.1\nport=%s\nuser=%s\ndatabase=%s\npassword=' \
      "$LOCAL_PORT" "$DB_USER" "$DB_NAME"; cat "$PW_FILE"; printf '\n'; } > "$CNF"
}

cmd_q() {
  resolve_current; load_conf
  local sql="${1:-}"; [ -n "$sql" ] || { echo "uso: ./dbssh.sh q \"<SQL>\"" >&2; exit 1; }
  guard_readonly "$sql"
  if [ "$MODE" = "remote" ]; then
    ssh_base_opts; ssh_mux_opts
    [ "$DB_AUTH" = "password" ] && { remote_pw_ensure_cnf || exit 1; }
    printf '%s\n' "$sql" | ssh "${SSH_OPTS[@]}" "$MUX_DEST" "$(remote_db_cmd)"
    return
  fi
  ensure_ready
  local mb; mb="$(mysql_bin)"
  if [ -x "$mb" ] || command -v "$mb" >/dev/null 2>&1; then
    make_cnf
    "$mb" --defaults-extra-file="$CNF" -e "$sql"
  else
    # fallback: PHP mysqli (sempre disponibile)
    SQL="$sql" PW_FILE="$PW_FILE" DB_USER="$DB_USER" DB_NAME="$DB_NAME" LOCAL_PORT="$LOCAL_PORT" php -r '
      mysqli_report(MYSQLI_REPORT_OFF);
      $c=@mysqli_connect("127.0.0.1",getenv("DB_USER"),file_get_contents(getenv("PW_FILE")),getenv("DB_NAME"),(int)getenv("LOCAL_PORT"));
      if(!$c){fwrite(STDERR,"FAIL: ".mysqli_connect_error()."\n");exit(1);}
      $r=mysqli_query($c,getenv("SQL")); if(!$r){fwrite(STDERR,mysqli_error($c)."\n");exit(1);}
      if($r===true){echo "OK\n";exit;}
      while($x=mysqli_fetch_row($r)) echo implode("\t",array_map(fn($v)=>$v===null?"NULL":$v,$x))."\n";'
  fi
}

cmd_shell() {
  resolve_current; load_conf
  if [ "$MODE" = "remote" ]; then
    ssh_base_opts; ssh_mux_opts
    [ "$DB_AUTH" = "password" ] && { remote_pw_ensure_cnf || exit 1; }
    ssh -t "${SSH_OPTS[@]}" "$MUX_DEST" "$(remote_db_cmd)"
    return
  fi
  ensure_ready
  local mb; mb="$(mysql_bin)"
  if ! { [ -x "$mb" ] || command -v "$mb" >/dev/null 2>&1; }; then
    echo "client mysql non trovato (brew install mysql-client)" >&2; exit 1; fi
  make_cnf
  "$mb" --defaults-extra-file="$CNF"
}

cmd_list() {
  local profiles cur; profiles="$(list_profiles)"; cur="$(current_profile)"
  [ -n "$profiles" ] || { echo "nessuna connessione configurata (./dbssh.sh up)"; return; }
  echo "Connessioni:"
  local n m a dest
  while IFS= read -r n; do
    [ -n "$n" ] || continue
    m="$(get_cfg "$CONN_DIR/$n.conf" MODE_CFG)"; m="${m:-tunnel}"
    a="$(get_cfg "$CONN_DIR/$n.conf" SSH_ALIAS_CFG)"
    if [ -n "$a" ]; then dest="$a (alias)"
    else dest="$(get_cfg "$CONN_DIR/$n.conf" SSH_HOST_CFG):$(get_cfg "$CONN_DIR/$n.conf" SSH_PORT_CFG)"; fi
    printf '  %s %-16s [%-6s] db: %s @ %s  (porta locale %s)\n' \
      "$( [ "$n" = "$cur" ] && printf '*' || printf ' ' )" "$n" "$m" \
      "$(get_cfg "$CONN_DIR/$n.conf" DB_NAME_CFG)" "$dest" \
      "$(get_cfg "$CONN_DIR/$n.conf" LOCAL_PORT_CFG)"
  done <<< "$profiles"
}

cmd_use() {
  local name; name="$(sanitize_name "${1:-}")"
  [ -n "$name" ] || { echo "uso: ./dbssh.sh use <nome>" >&2; exit 1; }
  [ -f "$CONN_DIR/$name.conf" ] || { echo "connessione '$name' inesistente (./dbssh.sh list)" >&2; exit 1; }
  set_current "$name"; echo "→ connessione attiva: '$name'"
}

cmd_status() {
  local cur; cur="$(current_profile)"
  [ -n "$cur" ] || { echo "connessione attiva: nessuna (./dbssh.sh up)"; return; }
  set_profile "$cur"; load_conf
  if [ "$MODE" = "remote" ]; then
    ssh_base_opts; ssh_mux_opts
    echo "modalità: remote (mysql sul server via ssh, auth=$DB_AUTH)"
    echo "connessione attiva: '$cur'  →  ssh $SSH_LABEL  db: $DB_NAME${SSH_KEY:+  key: $SSH_KEY}"
    [ "$DB_AUTH" = "password" ] && { [ -f "$PW_FILE" ] && echo "password DB: cachata ($PW_FILE)" || echo "password DB: assente (verrà chiesta all'up)"; }
    if mux_alive; then echo "master SSH: attivo (multiplexing, riuso connessione)"
    else echo "master SSH: nessuno (verrà aperto al primo comando)"; fi
    return
  fi
  echo "modalità: tunnel"
  port_open && echo "tunnel: UP (127.0.0.1:$LOCAL_PORT)" || echo "tunnel: giù"
  echo "connessione attiva: '$cur'  →  ssh $SSH_LABEL  db: $DB_USER@$DB_NAME${SSH_KEY:+  key: $SSH_KEY}"
  if [ -f "$PW_FILE" ]; then echo "password: cachata ($PW_FILE)$( [ -s "$PW_FILE" ] || printf ' [vuota]')"; else echo "password: assente"; fi
}

cmd_down() {
  resolve_current; load_conf
  if [ "$MODE" = "remote" ]; then
    ssh_base_opts; ssh_mux_opts
    # rimuovi il my.cnf temporaneo sul server (se auth password) PRIMA di chiudere il master
    if [ -f "$RCNF_FILE" ]; then
      local rc; rc="$(cat "$RCNF_FILE" 2>/dev/null || true)"
      [ -n "$rc" ] && ssh "${SSH_OPTS[@]}" "$MUX_DEST" "rm -f '$rc'" 2>/dev/null || true
      rm -f "$RCNF_FILE"
    fi
    if mux_alive; then
      ssh -O exit "${SSH_OPTS[@]}" "$MUX_DEST" >/dev/null 2>&1 && echo "connessione master SSH di '$PROFILE' chiusa."
    else
      echo "modalità remote: nessuna connessione master aperta per '$PROFILE'."
    fi
    # auth password: rimuovi anche la password cachata in locale
    [ "$DB_AUTH" = "password" ] && rm -f "$PW_FILE" 2>/dev/null || true
    return
  fi
  local killed=0
  # 1) chiusura pulita via pidfile (il processo ssh che abbiamo lanciato noi)
  if [ -f "$PID_FILE" ]; then
    local p; p="$(cat "$PID_FILE" 2>/dev/null || true)"
    [ -n "$p" ] && kill "$p" 2>/dev/null && killed=1
    rm -f "$PID_FILE"
  fi
  # 2) fallback: match sul forward (tunnel aperto da una sessione precedente)
  [ "$killed" -eq 0 ] && pkill -f "ssh.*-L $FWD" 2>/dev/null && killed=1
  [ "$killed" -eq 1 ] && echo "tunnel '$PROFILE' chiuso." || echo "nessun tunnel da chiudere per '$PROFILE'."
  rm -f "$PW_FILE"; echo "password di '$PROFILE' rimossa (conf mantenuta; per modificarla: ./dbssh.sh config $PROFILE)."
}

case "${1:-}" in
  up)     shift; cmd_up "${1:-}" ;;
  q)      shift; cmd_q "${1:-}" ;;
  shell)  cmd_shell ;;
  list)   cmd_list ;;
  use)    shift; cmd_use "${1:-}" ;;
  config) shift; do_config "${1:-}" ;;
  status) cmd_status ;;
  down)   cmd_down ;;
  *) sed -n '3,41p' "$0"; exit 1 ;;
esac
