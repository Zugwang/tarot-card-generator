#!/usr/bin/env bash
# Belotier — one-time provisioning. Idempotent: safe to re-run.
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> system user"
id -u belotier >/dev/null 2>&1 || sudo useradd --system --shell /usr/sbin/nologin --no-create-home belotier

echo "==> /opt/belotier"
sudo mkdir -p /opt/belotier/{server,dist}
sudo chown -R k1000:k1000 /opt/belotier      # deploys then need no sudo

echo "==> python venv"
if [ ! -x /opt/belotier/venv/bin/python ]; then
  python3 -m venv /opt/belotier/venv
fi
/opt/belotier/venv/bin/pip install -q --disable-pip-version-check -r "$PROJECT_DIR/server/requirements.txt"

echo "==> nginx: connection-limit zone"
sudo tee /etc/nginx/conf.d/belotier-limit.conf >/dev/null <<'ZONE'
# Shared memory for the belotier /ws connection limit (see the vhost).
limit_conn_zone $binary_remote_addr zone=belotier_conn:1m;
ZONE

echo "==> nginx: vhost"
sudo cp "$PROJECT_DIR/deploy/belotier-nginx.conf" /etc/nginx/sites-available/belotier
sudo ln -sf /etc/nginx/sites-available/belotier /etc/nginx/sites-enabled/belotier

echo "==> systemd unit"
sudo cp "$PROJECT_DIR/deploy/belotier.service" /etc/systemd/system/belotier.service
sudo mkdir -p /etc/systemd/system/belotier.service.d
sudo cp "$PROJECT_DIR/deploy/belotier-swapcap.conf" /etc/systemd/system/belotier.service.d/50-swapcap.conf
sudo systemctl daemon-reload
sudo systemctl enable belotier >/dev/null

echo "==> done. Now run deploy/deploy-belotier.sh"
