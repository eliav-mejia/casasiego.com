#!/bin/sh
# Builds docs/casasiego-vX.pdf from docs/src/casasiego-vX.html (synode-vX before 1.1.0, from _interno/docs/, or a brand PDF, see below)
# with headless Chrome or Edge.
# Run from the project root:  sh docs/src/build-pdf.sh 1.1.0
# Fiel price study:           python3 docs/src/ajustes-fiel.py && sh docs/src/build-pdf.sh ajustes-fiel
# Justo SEO strategy:         sh docs/src/build-pdf.sh seo-justo   (internal: _interno/docs/)
# Variant D setup guide:      sh docs/src/build-pdf.sh variante-d  (internal: _interno/)
# Club offer guide:           sh docs/src/build-pdf.sh club        (internal: _interno/)
# Internal version notes:     sh docs/src/build-pdf.sh interno-1.2.0  (internal: _interno/docs/)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
VERSION="${1:-1.1.0}"
case "$VERSION" in
  ajustes-fiel)
    SRC="$HERE/ajustes-fiel-2026-10.html"
    OUT="$HERE/../ajustes-fiel-2026-10.pdf" ;;
  seo-justo)
    SRC="$HERE/../../_interno/docs/src/seo-justo-trajes.html"
    OUT="$HERE/../../_interno/docs/seo-justo-trajes-2026-10.pdf" ;;
  variante-d)
    SRC="$HERE/../../_interno/docs/src/variante-d-registro.html"
    OUT="$HERE/../../_interno/variante-d-guia-de-configuracion.pdf" ;;
  club)
    SRC="$HERE/../../_interno/docs/src/club-casa-siego-guia.html"
    OUT="$HERE/../../_interno/club-casa-siego-guia-de-oferta.pdf" ;;
  interno-*)
    SRC="$HERE/../../_interno/docs/src/casasiego-v${VERSION#interno-}.html"
    OUT="$HERE/../../_interno/docs/casasiego-v${VERSION#interno-}.pdf" ;;
  *)
    if [ -f "$HERE/casasiego-v$VERSION.html" ]; then
      SRC="$HERE/casasiego-v$VERSION.html"; OUT="$HERE/../casasiego-v$VERSION.pdf"
    else   # renamed at 1.1.0: the Synodé versions are internal
      SRC="$HERE/../../_interno/docs/src/synode-v$VERSION.html"; OUT="$HERE/../../_interno/docs/synode-v$VERSION.pdf"
    fi ;;
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
