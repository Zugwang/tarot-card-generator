#!/usr/bin/env bash
# Print the four seat links. They are regenerated on every service restart, so
# re-run this after a deploy. Keeping them out of the lobby page is what stops a
# passer-by from sitting down at your table.
set -euo pipefail
HOST="${1:-https://belotier.e1000.dev}"
json="$(sudo journalctl -u belotier --no-pager -o cat \
        | grep 'liens des sièges' | tail -1 | sed 's/.*liens des sièges : //')"
[ -n "$json" ] || { echo "aucun lien trouvé — le service a-t-il démarré ?"; exit 1; }
echo "Liens de place (ne pas publier) :"
for seat in nord est sud ouest; do
  key="$(printf '%s' "$json" | python3 -c "import json,sys;print(json.load(sys.stdin)['$seat'])")"
  printf '  %-6s %s/s/%s#k=%s\n' "$seat" "$HOST" "$seat" "$key"
done
