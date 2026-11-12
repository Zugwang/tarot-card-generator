#!/usr/bin/env bash
# Belotier — pre-render the belote cards as WebP, at build time.
#
# Why raster and not SVG: the 12 court cards embed bitmap illustrations, so a
# "vector" SVG would either carry them as fat data-URLs or require the whole
# /art tree under the belote docroot. WebP gives 33 uniform ~20 kB files per
# template (~0.7 MB, immutable-cached), and the game client then needs no
# Tarotier rendering code whatsoever.
#
# Toolchain is already on this box: rsvg-convert (librsvg) then ImageMagick for
# WebP. ImageMagick alone cannot do it — it renders neither nested <svg> nor
# <image>, even as data-URI.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$PROJECT_DIR/belote/public/cards"
HEIGHT="${HEIGHT:-504}"          # 360x504 at the 250x350 card ratio
QUALITY="${QUALITY:-82}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT        # no leftovers, even on failure

cd "$PROJECT_DIR"
echo "==> bundling the renderers for node (SSR)"
npx vite build --ssr scripts/gen-belote-cards.ts --outDir "$TMP/ssr" --logLevel error >/dev/null

echo "==> emitting SVGs"
node "$TMP/ssr/gen-belote-cards.js" "$TMP/svg" "$PROJECT_DIR/public"

echo "==> rasterising to WebP (height ${HEIGHT}px, q${QUALITY})"
rm -rf "$OUT"
mkdir -p "$OUT"
cp "$TMP/svg/manifest.json" "$OUT/manifest.json"
total=0
for tpl_dir in "$TMP"/svg/*/; do
  tpl="$(basename "$tpl_dir")"
  mkdir -p "$OUT/$tpl"
  n=0
  # librsvg resolves <image> relative to the SVG's own directory, so rasterise
  # from inside it rather than passing an absolute path.
  for svg in "$tpl_dir"*.svg; do
    name="$(basename "$svg" .svg)"
    ( cd "$tpl_dir" && rsvg-convert -h "$HEIGHT" -o "$TMP/page.png" "$(basename "$svg")" )
    convert "$TMP/page.png" -quality "$QUALITY" -define webp:method=6 "$OUT/$tpl/$name.webp"
    n=$((n + 1))
  done
  echo "    $tpl: $n fichiers, $(du -sh "$OUT/$tpl" | cut -f1)"
  total=$((total + n))
done
echo "==> $total cartes rendues dans $OUT ($(du -sh "$OUT" | cut -f1))"
