#!/usr/bin/env bash
# Every var(--token) used in a component must be defined, or passed in locally.
#
# This exists because an unknown CSS custom property fails SILENTLY: the
# declaration is simply dropped, so a renamed token leaves text the colour of
# its background and neither tsc nor svelte-check says a word. Renaming the
# palette for the grimoire art direction broke 17 references this way.
set -euo pipefail
cd "$(dirname "$0")/src"

# Locals: set inline via style="--x:..." or by a parent component.
LOCAL='^(--a|--c|--i|--lift|--idle|--rx|--ry|--team|--shake-amp|--shake-dur|--)$'

defined=$(grep -ho '^[[:space:]]*--[a-z0-9-]*:' ./*.css | tr -d ' :' | sort -u)
fail=0
while read -r t; do
  [ -n "$t" ] || continue
  [[ "$t" =~ $LOCAL ]] && continue
  if ! grep -qx -- "$t" <<<"$defined"; then
    echo "INCONNU  $t  ->  $(grep -ln "var($t)" ./*.svelte ./*.css | xargs -n1 basename | tr '\n' ' ')" >&2
    fail=1
  fi
done <<<"$(grep -ho 'var(--[a-z0-9-]*' ./*.svelte ./*.css | sed 's/var(//' | sort -u)"

if [ "$fail" -ne 0 ]; then
  echo "Des jetons CSS ne sont definis nulle part — ils seraient ignores en silence." >&2
  exit 1
fi
echo "Jetons CSS : $(wc -l <<<"$defined") definis, toutes les references resolvent."
