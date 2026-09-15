#!/usr/bin/env bash
# APP DESKTOP — Windows, macOS (Apple Silicon + Intel) e Linux, in zip pronti per itch.
#
#   bash desktop/build.sh
#
# Electron sta SOLO qui dentro (desktop/node_modules): il gioco resta a zero dipendenze runtime.
# La build web è la stessa di itch (API del battito assoluta, strumenti dev esclusi).
# Le app NON sono firmate: su Mac al primo avvio serve tasto destro → Apri; su Windows
# SmartScreen chiede "Esegui comunque". Per firmarle servono i certificati Apple/Microsoft.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
cd "$REPO"
VER="$(grep -oE "v[0-9]+\.[0-9]+\.[0-9]+" src/version.js | head -1)"
API="https://digsy.dev-box.it/server/api"

npm run build >/dev/null
perl -pi -e "s#window\\.DIGSY_API = '[^']*'#window.DIGSY_API = '$API'#" dist/index.html
rm -rf "$HERE/app" && mkdir -p "$HERE/app"
( cd dist && tar cf - --exclude=playground --exclude=sprites --exclude=wonders --exclude='__*.html' --exclude=.DS_Store . ) | ( cd "$HERE/app" && tar xf - )
perl -pi -e "s#\"version\": \"[^\"]*\"#\"version\": \"${VER#v}\"#" "$HERE/package.json"

cd "$HERE"
[ -d node_modules/electron ] || npm install --no-audit --no-fund >/dev/null
rm -rf out && mkdir -p out
for target in "win32 x64" "darwin arm64" "darwin x64" "linux x64"; do
  set -- $target
  npx --no-install electron-packager . "Digsy World" --platform="$1" --arch="$2" --out=out/build --overwrite \
    --ignore='^/out($|/)' --ignore='^/build\.sh$' --asar --app-version="${VER#v}" \
    --icon=app/icon-512.png >/dev/null
  DIR="$(ls -d "out/build/Digsy World-$1-$2")"
  NAME="digsy-world-${VER}-$1-$2.zip"
  ( cd "$(dirname "$DIR")" && zip -qry "../$NAME" "$(basename "$DIR")" )
  echo "  $NAME ($(du -h "out/$NAME" | cut -f1))"
done
rm -rf out/build
