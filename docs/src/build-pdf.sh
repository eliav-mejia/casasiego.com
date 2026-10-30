#!/bin/sh
# Builds docs/casasiego-vX.pdf from docs/src/casasiego-vX.html (synode-vX before 1.1.0, into _interno/docs/mockup/, or another PDF, see below)
# with headless Chrome or Edge.
# Run from the project root:  sh docs/src/build-pdf.sh 1.1.0
# Fiel price study:           python3 docs/src/ajustes-fiel.py && sh docs/src/build-pdf.sh ajustes-fiel
# Justo SEO strategy:         sh docs/src/build-pdf.sh seo-justo   (internal: _interno/Marketing/)
# Keyword strategy:       sh docs/src/build-pdf.sh seo-palabras-clave   (internal: _interno/Marketing/)
# Variant D setup guide:     sh docs/src/build-pdf.sh variante-d  (internal: _interno/docs/)
# Club offer guide:           sh docs/src/build-pdf.sh club        (internal: _interno/Marketing/)
# Image guide:                python3 _interno/docs/src/imagenes-casasiego.py && sh docs/src/build-pdf.sh imagenes
#                             (internal: _interno/docs/cyberseguridad/proteccion-de-propiedad-intelectual-v1.0.0.pdf)
# Internal version notes:     sh docs/src/build-pdf.sh interno-1.2.1  (internal: _interno/docs/rebranding/)
# Libro de la casa:          sh docs/src/build-pdf.sh libro   (docs/libro-casa-siego.pdf)
# Synodé versions:            sh docs/src/build-pdf.sh 1.0.3  (internal: _interno/docs/mockup/)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
VERSION="${1:-1.1.0}"
case "$VERSION" in
  libro)
    SRC="$HERE/libro-casa-siego.html"
    OUT="$HERE/../libro-casa-siego.pdf" ;;
  ajustes-fiel)
    SRC="$HERE/ajustes-fiel-2026-10.html"
    OUT="$HERE/../ajustes-fiel-2026-10.pdf" ;;
  seo-justo)
    SRC="$HERE/../../_interno/docs/src/seo-justo-trajes.html"
    OUT="$HERE/../../_interno/Marketing/seo-justo-trajes-2026-10.pdf" ;;
  seo-palabras-clave)
    SRC="$HERE/../../_interno/features/src/seo-palabras-clave-casasiego.html"
    OUT="$HERE/../../_interno/Marketing/seo-palabras-clave-v1.0.0.pdf" ;;
  variante-d)
    SRC="$HERE/../../_interno/docs/src/variante-d-registro.html"
    OUT="$HERE/../../_interno/docs/variante-d-guia-de-configuracion.pdf" ;;
  club)
    SRC="$HERE/../../_interno/docs/src/club-casa-siego-guia.html"
    OUT="$HERE/../../_interno/Marketing/club-casa-siego-guia-de-oferta.pdf" ;;
  imagenes)
    SRC="$HERE/../../_interno/docs/src/imagenes-casasiego.html"
    OUT="$HERE/../../_interno/docs/cyberseguridad/proteccion-de-propiedad-intelectual-v1.0.0.pdf" ;;
  interno-*)
    SRC="$HERE/../../_interno/docs/src/casasiego-v${VERSION#interno-}.html"
    OUT="$HERE/../../_interno/docs/rebranding/casasiego-v${VERSION#interno-}.pdf" ;;
  *)
    if [ -f "$HERE/casasiego-v$VERSION.html" ]; then
      SRC="$HERE/casasiego-v$VERSION.html"; OUT="$HERE/../casasiego-v$VERSION.pdf"
    else   # renamed at 1.1.0: the Synodé versions are internal
      SRC="$HERE/../../_interno/docs/src/synode-v$VERSION.html"; OUT="$HERE/../../_interno/docs/mockup/synode-v$VERSION.pdf"
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

# The browser does not create folders: make sure the output folder exists (e.g. _interno/docs/rebranding/).
mkdir -p "$(dirname "$OUT")"

# Git Bash / MSYS: hand Windows-style paths to the browser.
if command -v cygpath >/dev/null 2>&1; then
  URL="file:///$(cygpath -m "$SRC")"; OUT="$(cygpath -w "$OUT")"
else
  URL="file://$SRC"
fi
"$BROWSER" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=10000 --print-to-pdf="$OUT" "$URL"
echo "Wrote $OUT"
