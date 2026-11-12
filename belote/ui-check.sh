#!/usr/bin/env bash
# Belotier — drive the real site in a headless Chromium: four mobile viewports
# take seats, a deal is played, screenshots land in /tmp/belotier-shots.
#
# This is the only check that sees what a player sees. It has already caught a
# crash-on-render, a wrong event field painting "undefined" on screen, and a
# hand fan clipped off the bottom of a phone — none of which the type checker,
# the unit tests or the protocol test could notice.
#
# Chromium lives in ~/.cache/ms-playwright (~900 MB). Remove it with
#   rm -rf ~/.cache/ms-playwright
# and reinstall with  npx --yes playwright@1.56.0 install chromium
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PW="$(ls -d "$HOME"/.npm/_npx/*/node_modules 2>/dev/null | while read -r d; do
        [ -d "$d/playwright" ] && echo "$d"; done | head -1)"
if [ -z "${PW:-}" ]; then
  echo "playwright absent — installe-le :  npx --yes playwright@1.56.0 install chromium"
  exit 1
fi
mkdir -p /tmp/belotier-shots
rm -f /tmp/belotier-shots/*.png
BASE="${BASE:-https://belotier.e1000.dev}" NODE_PATH="$PW" node "$PROJECT_DIR/belote/ui-check.cjs"
status=$?
# Never leave a headless browser behind on this RAM-bound box.
pkill -f "chrome.*headless" 2>/dev/null || true
echo "captures : /tmp/belotier-shots"
exit $status
