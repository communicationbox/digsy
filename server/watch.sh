#!/bin/bash
# GUARDIANO — controlla che il gioco sia in piedi e avvisa quando non lo è.
#
# Gira dal cron ogni cinque minuti. Senza, un guasto si scopre quando un giocatore si prende
# la briga di scriverlo: possono passare giorni.
#
# Due regole che fanno la differenza fra un guardiano utile e uno che si finisce per zittire:
#
#   1. AVVISA UNA VOLTA SOLA. Un servizio giù per sei ore sono 72 controlli falliti: mandare
#      72 mail vuol dire che alla settima nessuno le legge più. Si avvisa quando CAMBIA lo
#      stato — quando cade e quando torna.
#   2. NON GRIDA AL PRIMO INCIAMPO. Una singola richiesta può fallire per un pacchetto perso.
#      Si riprova tre volte a distanza prima di dichiarare un guasto.
#
# Installazione (già fatta):  */5 * * * * /var/www/digsy.dev-box.it/watch.sh

DEST="${DIGSY_ALERT_TO:-dev@communicationbox.it}"
SITO="https://digsy.dev-box.it"
STATO="/var/www/digsy.dev-box.it/.watch-stato"     # 'su' oppure 'giu'
LOG="/var/www/digsy.dev-box.it/.watch-log"

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
  {
    echo "Digsy World non risponde."
    echo
    echo "Cosa non va:$guasti"
    echo "Quando:      $(date '+%F %T %Z')"
    echo
    echo "Da guardare:"
    echo "  $SITO/server/health.php   (segni vitali: database, tabelle, scrittura)"
    echo "  ultimi controlli: tail -20 $LOG"
    echo
    echo "Se il database è irraggiungibile, il gioco resta giocabile in locale:"
    echo "nessuno perde la partita, ma i salvataggi non salgono più."
  } | mail -s "[Digsy] il gioco non risponde" "$DEST"
else
  {
    echo "Digsy World è tornato su."
    echo
    echo "Quando: $(date '+%F %T %Z')"
    echo "Quanto è durata: vedi $LOG"
  } | mail -s "[Digsy] tornato su" "$DEST"
fi
