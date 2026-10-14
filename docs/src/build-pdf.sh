#!/bin/sh
# Builds docs/synode-vX.pdf from docs/src/synode-vX.html (or a brand PDF, see below) with headless Chrome or Edge.
# Run from the project root:  sh docs/src/build-pdf.sh 1.0.2
# Brand downloads:            sh docs/src/build-pdf.sh reino-fiel-sesiones
# Fiel price study:           python3 docs/src/ajustes-fiel.py && sh docs/src/build-pdf.sh ajustes-fiel
#   -> brands/reino_fiel/descargas/reino-fiel-guia-de-sesiones.pdf (public download, unlike docs/)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
VERSION="${1:-1.0.2}"
case "$VERSION" in
  reino-fiel-sesiones)
    SRC="$HERE/reino-fiel-sesiones.html"
    OUT="$HERE/../../brands/reino_fiel/descargas/reino-fiel-guia-de-sesiones.pdf" ;;
  ajustes-fiel)
    SRC="$HERE/ajustes-fiel-2026-10.html"
    OUT="$HERE/../ajustes-fiel-2026-10.pdf" ;;
  *)
    SRC="$HERE/synode-v$VERSION.html"
    OUT="$HERE/../synode-v$VERSION.pdf" ;;
esac

for b in "$CHROME" \
         "/c/Program Files/Google/Chrome/Application/chrome.exe" \
         "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
         "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         google-chrome chromium; do
  if [ -n "$b" ] && command -v "$b" >/dev/null 2>&1; then BROWSER="$b"; break; fi
done
[ -n "$BROWSER" ] || { echo "Chrome/Edge not found; set CHROME=/path/to/browser"; exit 1; }

# Git Bash / MSYS: hand Windows-style paths to the browser.
if command -v cygpath >/dev/null 2>&1; then
  URL="file:///$(cygpath -m "$SRC")"; OUT="$(cygpath -w "$OUT")"
else
  URL="file://$SRC"
fi
"$BROWSER" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=10000 --print-to-pdf="$OUT" "$URL"
echo "Wrote $OUT"
