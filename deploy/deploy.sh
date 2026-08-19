#!/usr/bin/env bash
# Tarotier — build + deploy to the nginx docroot.
# Static site: no service to restart, no sudo needed (/opt/tarotier owned by k1000).
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCROOT="/opt/tarotier/dist"

cd "$PROJECT_DIR"

echo "==> Installing deps (npm ci)"
npm ci

echo "==> Building"
npm run build

echo "==> Syncing dist/ -> $DOCROOT"
rsync -a --delete "$PROJECT_DIR/dist/" "$DOCROOT/"

echo "==> Done. Live at https://tarotier.space-dice.com"
