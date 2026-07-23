#!/usr/bin/env bash
# ZIP per itch.io — il gioco e basta, pronto da caricare.
# Sta in itch/: builda nel repo (una cartella sopra), scrive lo zip QUI dentro itch/.
#
# Perché non basta `npm run build` + zip a mano:
#  1) Su itch il gioco gira dentro un iframe su html.itch.zone, un dominio DIVERSO da
#     digsy.dev-box.it. Il battito (beat.php) e gli schianti (oops.php) usano `window.DIGSY_API`,
#     che nel sito vale `/server/api` (relativo, stesso dominio). Da itch quel percorso
#     punterebbe a html.itch.zone/server/api → 404, e non arriva NIENTE al tracker.
#     Qui lo si riscrive ASSOLUTO, ma SOLO nello zip: il sito su digsy.dev-box.it resta
#     relativo (portabile, niente CORS su sé stesso).
#     Perché funzioni serve il CORS lato server (corsAnon in server/lib/http.php): va
#     DEPLOYATO con `npm run deploy`, altrimenti il browser blocca il POST cross-origin.
#  2) In dist finiscono gli strumenti dev (playground/ sprites/ wonders/): fuori dallo zip.
#
# Uso:  bash itch/itch-build.sh   (o, da dentro itch/, bash itch-build.sh)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"   # .../itch
REPO="$(cd "$HERE/.." && pwd)"          # repo root
cd "$REPO"

API="https://digsy.dev-box.it/server/api"
VER="$(grep -oE "v[0-9]+\.[0-9]+\.[0-9]+" src/version.js | head -1)"

npm run build >/dev/null

# API assoluta SOLO nello zip (dist), non nel sorgente
perl -pi -e "s#window\\.DIGSY_API = '[^']*'#window.DIGSY_API = '$API'#" dist/index.html

find dist -name .DS_Store -delete 2>/dev/null || true

OUT="$HERE/digsy-itch-$VER.zip"
rm -f "$OUT"
( cd dist && zip -rq "$OUT" . -x "playground/*" "sprites/*" "wonders/*" "__shot.html" ".DS_Store" )

echo "zip: itch/$(basename "$OUT") ($(du -h "$OUT" | cut -f1))"
# listato una volta in variabile: con pipefail, `unzip | grep -q` fa prendere SIGPIPE a unzip
# (grep chiude la pipe al primo match) e la pipeline risulta "fallita" anche quando trova.
LIST="$(unzip -l "$OUT")"
echo -n "  index.html at root: "; grep -qE "[[:space:]]index\.html$" <<<"$LIST" && echo "sì" || echo "NO"
echo -n "  API nel build: "; grep -o "window.DIGSY_API = '[^']*'" dist/index.html
echo -n "  dev tools esclusi: "; grep -qE "playground/|sprites/|wonders/" <<<"$LIST" && echo "NO (presenti!)" || echo "sì"
