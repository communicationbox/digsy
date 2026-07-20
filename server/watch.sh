#!/bin/bash
# GUARDIANO — controlla che il gioco sia in piedi e avvisa su DISCORD quando non lo è.
#
# Gira dal cron ogni cinque minuti. Senza, un guasto si scopre quando un giocatore si prende
# la briga di scriverlo: possono passare giorni.
#
# Discord e non la posta: una mail da un server che non ne manda quasi mai finisce nello spam
# o viene rifiutata, e un avviso che non arriva è PEGGIO di nessun avviso — perché ci si fida.
# Su Discord arriva sul telefono in due secondi.
#
# L'indirizzo del webhook è una CHIAVE (chi ce l'ha scrive nel canale): sta in `.webhook`,
# permessi 600, fuori dalla cartella pubblicata e fuori dal repository.
#
# Due regole che fanno la differenza fra un guardiano utile e uno che si finisce per zittire:
#
#   1. AVVISA UNA VOLTA SOLA. Un servizio giù per sei ore sono 72 controlli falliti: mandare
#      72 messaggi vuol dire che al settimo nessuno li legge più. Si avvisa quando CAMBIA lo
#      stato — quando cade e quando torna.
#   2. NON GRIDA AL PRIMO INCIAMPO. Una singola richiesta può fallire per un pacchetto perso.
#      Si riprova tre volte a distanza prima di dichiarare un guasto.
#
# Installazione (già fatta):  */5 * * * * /var/www/digsy.dev-box.it/watch.sh

BASE="/var/www/digsy.dev-box.it"
SITO="https://digsy.dev-box.it"
STATO="$BASE/.watch-stato"     # 'su' oppure 'giu'
QUANDO="$BASE/.watch-da"       # da quando è giù, per poter dire quanto è durata
LOG="$BASE/.watch-log"
HOOK=$(cat "$BASE/.webhook" 2>/dev/null)

# $1 testo · $2 colore · $3 titolo
#
# IL TESTO VA RIPULITO. La descrizione di un guasto contiene la risposta del server, che
# quando qualcosa si rompe è una pagina d'errore HTML — piena di VIRGOLETTE. Finivano dentro
# il JSON e lo spezzavano: Discord rispondeva "invalid JSON" e l'allarme non partiva. In
# silenzio, e proprio nel momento in cui serviva. Il messaggio di ritorno, che è testo
# scritto da noi, arrivava sempre: il guardiano sembrava funzionare.
avvisa() {
  [ -z "$HOOK" ] && return
  local testo titolo risposta
  # via virgolette, barre rovesce e a capo: sono i tre caratteri che rompono il JSON
  testo=$(printf '%s' "$1" | tr -d '\r' | sed 's/\\/\\\\/g; s/"/'"'"'/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')
  titolo=$(printf '%s' "$3" | tr -d '"\\')
  risposta=$(curl -s -m 15 -H 'Content-Type: application/json' \
    -d "$(printf '{"username":"Guardiano Digsy","embeds":[{"title":"%s","description":"%s","color":%s}]}' "$titolo" "$testo" "$2")" \
    "$HOOK" 2>&1)
  # se Discord si lamenta lo si SCRIVE nel registro: un avviso che non parte in silenzio è
  # peggio di nessun avviso, perché ci si fida
  case "$risposta" in
    *'"code"'*|*error*) echo "$(date '+%F %T') AVVISO NON PARTITO: $(echo "$risposta" | cut -c1-120)" >> "$LOG" ;;
  esac
}

# --- il controllo: tre tentativi, poi si decide -------------------------------
guasti=""
for tentativo in 1 2 3; do
  guasti=""

  # 1. la pagina del gioco
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$SITO/" 2>/dev/null)
  [ "$code" = "200" ] || guasti="$guasti pagina($code)"

  # 2. l'API risponde
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$SITO/server/api/auth.php?do=me" 2>/dev/null)
  [ "$code" = "200" ] || guasti="$guasti api($code)"

  # 3. i segni vitali: database raggiungibile, tabelle al loro posto, scrittura possibile
  corpo=$(curl -s --max-time 20 "$SITO/server/health.php" 2>/dev/null)
  case "$corpo" in
    *'"ok":true'*) ;;
    # accorciato: quando qualcosa si rompe la risposta è spesso una pagina d'errore intera,
    # e un registro pieno di HTML non lo legge nessuno
    *) guasti="$guasti salute($(echo "${corpo:-nessuna risposta}" | tr -d '\n' | cut -c1-60))" ;;
  esac

  # tutto a posto: non serve riprovare
  [ -z "$guasti" ] && break
  # un tentativo può fallire per un pacchetto perso: si respira e si riprova
  [ "$tentativo" -lt 3 ] && sleep 20
done

# --- si avvisa solo quando lo stato CAMBIA ------------------------------------
prima=$(cat "$STATO" 2>/dev/null || echo su)
adesso="su"; [ -n "$guasti" ] && adesso="giu"
echo "$(date '+%F %T') $adesso$guasti" >> "$LOG"
tail -n 500 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"   # il registro non cresce all'infinito

echo "$adesso" > "$STATO"        # sempre, anche al primo giro: così lo stato esiste da subito
[ "$prima" = "$adesso" ] && exit 0

if [ "$adesso" = "giu" ]; then
  date +%s > "$QUANDO"
  avvisa "Cosa non va:$guasti\\n\\nDa guardare: $SITO/server/health.php\\nIl gioco resta giocabile in locale: nessuno perde la partita, ma i salvataggi non salgono piu." \
    15548997 "Digsy non risponde"
else
  durata=""
  if [ -f "$QUANDO" ]; then
    sec=$(( $(date +%s) - $(cat "$QUANDO") ))
    # "0 minuti" si legge come un guasto del guardiano, non come una buona notizia
    if   [ "$sec" -lt 60 ];   then durata="\\n\\nE' stato giu meno di un minuto."
    elif [ "$sec" -lt 3600 ]; then durata="\\n\\nE' stato giu $(( sec / 60 )) minuti."
    else durata="\\n\\nE' stato giu $(( sec / 3600 ))h $(( (sec % 3600) / 60 ))m."
    fi
    rm -f "$QUANDO"
  fi
  avvisa "Tutto di nuovo in piedi.$durata" 5763719 "Digsy e tornato"
fi
