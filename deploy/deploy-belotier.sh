#!/usr/bin/env bash
# Belotier — build the front, ship the server, restart, verify.
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "==> tests (rules + protocol)"
python3 -m unittest discover -s server/tests -t server -q

echo "==> typecheck du front"
# belote/ n'est pas couvert par tsconfig.app.json : sans ce passage, une variable
# inexistante passe le build et ne casse qu'a l'execution dans le navigateur.
npx svelte-check --tsconfig ./tsconfig.belote.json --threshold error --output human-verbose 2>&1 | tail -1

echo "==> front build"
npx vite build --config vite.belote.config.ts --logLevel error

echo "==> ship"
rsync -a --delete dist-belote/ /opt/belotier/dist/
rsync -a --delete --exclude '.venv' --exclude '__pycache__' --exclude 'tests' \
      server/ /opt/belotier/server/
/opt/belotier/venv/bin/pip install -q --disable-pip-version-check -r server/requirements.txt

echo "==> restart"
sudo systemctl restart belotier
sleep 1.5
sudo nginx -t >/dev/null && sudo systemctl reload nginx

echo "==> verify"
systemctl is-active --quiet belotier && echo "    service: active" || { echo "    service FAILED"; exit 1; }
curl -fsS --unix-socket /run/belotier/ws.sock http://localhost/health && echo "    health: ok"
echo "==> live at https://belotier.e1000.dev"
