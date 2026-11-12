#!/usr/bin/env bash
# Belotier — routine health and ghost-process check.
# The box is RAM-bound and shared, so this is worth running often.

MAIN_PID="$(systemctl show belotier -p MainPID --value 2>/dev/null)"

echo "=== service ==="
printf 'state     : %s\n' "$(systemctl is-active belotier)"
printf 'pid       : %s\n' "${MAIN_PID:-none}"
printf 'tasks     : %s (cap %s)\n' \
  "$(systemctl show belotier -p TasksCurrent --value)" \
  "$(systemctl show belotier -p TasksMax --value)"
printf 'memory    : %s Mi (high %s / max %s)\n' \
  "$(( $(systemctl show belotier -p MemoryCurrent --value) / 1048576 ))" \
  "$(( $(systemctl show belotier -p MemoryHigh --value) / 1048576 ))" \
  "$(( $(systemctl show belotier -p MemoryMax --value) / 1048576 ))"
printf 'restarts  : %s\n' "$(systemctl show belotier -p NRestarts --value)"

echo
echo "=== process tree (expect exactly one python, no children) ==="
systemd-cgls -u belotier.service --no-pager 2>/dev/null | tail -n +2

echo
echo "=== ghosts (anything belote-related OUTSIDE the service) ==="
# The service's own process is legitimate; listing it here would just train the
# reader to ignore this section.
ghosts="$(pgrep -af 'vite|esbuild|rsvg-convert|cli_game|belotier|gen-belote' \
          | grep -v "^${MAIN_PID:-_none_} " | grep -v 'check-belotier' || true)"
[ -n "$ghosts" ] && echo "$ghosts" || echo "(none)"

echo
echo "=== socket + live connections ==="
ls -l /run/belotier/ws.sock 2>/dev/null || echo "(socket missing)"
printf 'open sockets (server view): %s\n' \
  "$(curl -fsS --unix-socket /run/belotier/ws.sock http://localhost/health 2>/dev/null \
     | sed 's/.*"sockets": *\([0-9]*\).*/\1/')"

echo
echo "=== health ==="
curl -fsS --unix-socket /run/belotier/ws.sock http://localhost/health 2>/dev/null || echo "(unreachable)"

echo
echo "=== box memory ==="
free -m | head -2
