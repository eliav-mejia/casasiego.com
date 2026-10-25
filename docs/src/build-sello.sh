#!/bin/sh
# Renders with headless Chrome or Edge:
#   images/sello-cs.png         1000 px CS wax seal with cast shadow, from docs/src/sello-cs.html (PDF covers, print)
#   favicon-*.png, apple-touch-icon.png, favicon.ico   the S of Siego, from docs/src/favicon-s.html (site root)
# Run from the project root:  sh docs/src/build-sello.sh
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$HERE/../.."
SRC="$HERE/sello-cs.html"
ICON="$HERE/favicon-s.html"

for b in "$CHROME" \
         "/c/Program Files/Google/Chrome/Application/chrome.exe" \
         "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
         "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
         "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         google-chrome chromium; do
  if [ -n "$b" ] && command -v "$b" >/dev/null 2>&1; then BROWSER="$b"; break; fi
done
[ -n "$BROWSER" ] || { echo "Chrome/Edge not found; set CHROME=/path/to/browser"; exit 1; }

# Windows browsers (Git Bash / WSL) need Windows-style paths.
winpath() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; elif command -v wslpath >/dev/null 2>&1 && case "$BROWSER" in *.exe) true;; *) false;; esac; then wslpath -w "$1"; else echo "$1"; fi; }
fileurl() { if command -v cygpath >/dev/null 2>&1; then echo "file:///$(cygpath -m "$1")"; elif command -v wslpath >/dev/null 2>&1 && case "$BROWSER" in *.exe) true;; *) false;; esac; then echo "file:///$(wslpath -m "$1")"; else echo "file://$1"; fi; }

shot() {  # shot <query> <px> <out> [source]
  "$BROWSER" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size="$2,$2" --virtual-time-budget=8000 --screenshot="$(winpath "$3")" "$(fileurl "${4:-$SRC}")$1" 2>/dev/null
  echo "Wrote $3"
}
shot ""          1000 "$ROOT/images/sello-cs.png"
shot "?px=512" 512 "$ROOT/favicon-512.png" "$ICON"
shot "?px=180&cuadro=1" 180 "$ROOT/apple-touch-icon.png" "$ICON"
shot "?px=48" 48 "$ROOT/favicon-48.png" "$ICON"
shot "?px=32" 32 "$ROOT/favicon-32.png" "$ICON"
shot "?px=16" 16 "$ROOT/favicon-16.png" "$ICON"
python3 "$HERE/ico.py" "$ROOT/favicon.ico" "$ROOT/favicon-16.png" "$ROOT/favicon-32.png" "$ROOT/favicon-48.png"
