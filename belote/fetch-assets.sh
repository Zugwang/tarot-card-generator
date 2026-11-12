#!/usr/bin/env bash
# Fetch Belotier's third-party assets ONCE; the output is committed so that no
# deploy ever needs the network. Re-run only to add or refresh an asset.
#
# Every source here has an explicit, verified licence — see ART-CREDITS.md.
# Sources deliberately NOT used, because their licence could not be verified or
# their site refuses automated fetches: Animate.css (Hippocratic-2.1 on main vs
# MIT on the v4 tags), Hover.css (restricted free tier), css-loaders.com and
# Animista (no licence published), uiverse.io (MIT claimed but HTTP 403).
set -euo pipefail

cd "$(dirname "$0")"
FONTS=public/fonts
ICONS=public/icons
mkdir -p "$FONTS" "$ICONS"

# A plain curl gets served TTF by Google Fonts; a browser UA gets woff2.
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
get() { curl -sSfL -A "$UA" --retry 2 --max-time 30 "$1" -o "$2"; }

# ---------------------------------------------------------------- fonts (OFL)
# The `latin` subset (U+0000-00FF) — NOT `latin-ext` — is the one that carries
# the digits and the French accents. The repo's older woff2 in ../public/fonts
# are latin-ext subsets with NO digits, which is pitfall #5 in CLAUDE.md: a
# scoreboard in such a font silently falls back to another face. The assertion
# at the bottom of this script is what keeps that from happening again.
echo "== polices (SIL OFL, Google Fonts)"
declare -A FACES=(
  [pirata-one]='Pirata+One'
  [cinzel]='Cinzel:wght@400..900'
  [eb-garamond]='EB+Garamond:wght@400..800'
)
for name in "${!FACES[@]}"; do
  css=$(curl -sSfL -A "$UA" --max-time 30 \
    "https://fonts.googleapis.com/css2?family=${FACES[$name]}&display=swap")
  # Take the woff2 whose unicode-range starts at U+0000 — that is `latin`.
  # awk with RS="}" so each record is a whole @font-face block: grep alone works
  # line by line and would only ever return the unicode-range line, never the
  # src: URL sitting two lines above it.
  url=$(printf '%s' "$css" \
    | awk 'BEGIN { RS = "}" } /unicode-range: *U\+0000-00FF/ { print; exit }' \
    | grep -o 'https://[^)]*\.woff2' \
    | head -1)
  [ -n "$url" ] || { echo "ECHEC: pas de sous-ensemble latin pour $name" >&2; exit 1; }
  get "$url" "$FONTS/$name.woff2"
  printf '  %-12s %6d octets\n' "$name" "$(stat -c%s "$FONTS/$name.woff2")"
done

# ------------------------------------------------- icons (CC BY 3.0, required)
# game-icons.net serves recolourable single-path SVGs. CC BY 3.0 obliges us to
# name the author, so the author is baked into the filename and into CREDITS.txt.
echo "== icones (CC BY 3.0, game-icons.net)"
ICON_LIST=(
  lorc/compass             lorc/pentagram-rose     lorc/wax-seal
  lorc/candle-flame        lorc/candle-light       lorc/candle-holder
  lorc/burning-embers      lorc/crystal-ball       lorc/eclipse
  lorc/moon                lorc/sundial            lorc/third-eye
  lorc/hourglass           lorc/key                lorc/feather
  lorc/scroll-unfurled     lorc/book-cover         lorc/open-book
  lorc/crown               lorc/laurel-crown       lorc/cowled
  lorc/ouroboros           lorc/magic-swirl        lorc/star-swirl
  lorc/triple-yin          lorc/trefoil-lily       lorc/suits
  lorc/skull-crossed-bones delapouite/throne-king  delapouite/round-table
  delapouite/card-exchange delapouite/card-joker   delapouite/stamper
)
: > "$ICONS/CREDITS.txt"
cat >> "$ICONS/CREDITS.txt" <<'EOF'
Icônes : game-icons.net — licence Creative Commons BY 3.0.
https://game-icons.net/  —  https://creativecommons.org/licenses/by/3.0/
L'attribution est obligatoire. Auteur de chaque icône ci-dessous ; le nom de
fichier reprend la forme <auteur>--<icone>.svg.

EOF
for spec in "${ICON_LIST[@]}"; do
  author=${spec%%/*}; icon=${spec##*/}
  out="$ICONS/${author}--${icon}.svg"
  # ffffff on transparent: we recolour with CSS `fill`/`filter` at use site.
  if get "https://game-icons.net/icons/ffffff/000000/1x1/${author}/${icon}.svg" "$out"; then
    echo "$icon — $author" >> "$ICONS/CREDITS.txt"
  else
    echo "  (absente, ignoree) $spec" >&2
    rm -f "$out"
  fi
done
echo "  $(ls -1 "$ICONS"/*.svg | wc -l) icones, $(du -sh "$ICONS" | cut -f1)"
# Two things make the raw downloads unusable as-is, and both are easy to miss:
#  1. every icon ships an opaque black background rect covering the whole 512
#     box, which would hide whatever is behind it;
#  2. the glyph has a hard-coded fill="#fff".
# Stripped of the rect, the file carries alpha only where the glyph is, so
# `mask-image: url(...)` + `background: currentColor` recolours it from CSS.
# The fill becomes currentColor too, for the inline-SVG case.
echo "== nettoyage (fond opaque retire, couleur rendue variable)"
python3 -I - "$ICONS" <<'PYEOF'
import pathlib, re, sys
total = 0
for f in sorted(pathlib.Path(sys.argv[1]).glob("*.svg")):
    s = f.read_text()
    s = re.sub(r'<path d="M0 0h512v512H0z"[^/]*/>', "", s)
    s = s.replace('fill="#fff"', 'fill="currentColor"')
    f.write_text(s)
    total += len(s.encode())
print(f"  {total // 1024} Ko apres nettoyage")
PYEOF


# --------------------------------------------------------- easings (MIT) check
# open-props is MIT. We copy the handful of spring curves we need into
# src/easings.css by hand rather than taking on an npm dependency — the project
# deliberately keeps a single runtime dependency. This only verifies that the
# upstream values we transcribed still match, so a drift is noticed.
echo "== courbes open-props (MIT) — verification de la transcription"
if get "https://unpkg.com/open-props@1.7.23/easings.min.css" /tmp/op-easings.css; then
  for curve in '--ease-3' '--ease-elastic-3' '--ease-spring-3'; do
    grep -q -- "$curve:" /tmp/op-easings.css \
      && echo "  $curve present en amont" \
      || echo "  ATTENTION: $curve absent en amont" >&2
  done
  rm -f /tmp/op-easings.css
else
  echo "  (reseau indisponible, verification sautee)"
fi

# ------------------------------------------------------------------ assertions
# Pitfall #5, turned into a test: a subset without digits must fail loudly here
# rather than silently fall back to another face on the scoreboard.
# fc-query prints ranges like "20-7e a0-ff 131 152-153", so a literal grep for
# "30-3b" finds nothing even when the digits are present inside 20-7e. The only
# correct check is to expand the ranges and test membership.
echo "== assertion de couverture (chiffres + accents)"
for f in "$FONTS"/*.woff2; do
  fc-query -f '%{charset}' "$f" 2>/dev/null | head -1 \
  | python3 -I -c '
import sys
need = {**{ord(c): c for c in "0123456789"},
        **{ord(c): c for c in "àâäçéèêëîïôöùûü«»"}}
spans = []
for tok in sys.stdin.read().split():
    a, _, b = tok.partition("-")
    try:
        lo = int(a, 16); hi = int(b, 16) if b else lo
    except ValueError:
        continue
    spans.append((lo, hi))
missing = [c for cp, c in need.items() if not any(lo <= cp <= hi for lo, hi in spans)]
sys.exit("manque: " + " ".join(missing) if missing else 0)
' && echo "  OK    $(basename "$f")" || { echo "  ECHEC $(basename "$f")" >&2; exit 1; }
done

echo
echo "Termine. Total ajoute : $(du -sh "$FONTS" "$ICONS" | awk '{s=$1; print "  "$2" "s}')"
echo "Pense a committer public/fonts et public/icons : le deploiement ne doit jamais dependre du reseau."
