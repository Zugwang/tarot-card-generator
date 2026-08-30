#!/usr/bin/env python3
"""Extract individual cards from an uncut / contact sheet of cards.

General approach (no OpenCV/numpy needed — only ImageMagick):
  1. Build a "content mask": grayscale + threshold so anything darker than the
     paper background becomes white (ink, borders, figures), paper becomes black.
  2. Row projection of the mask → horizontal bands that contain content, split by
     paper gaps → the rows of the grid (also isolates stray/offset cards).
  3. For each row band, a column projection → the individual cells in that row.
  4. Crop each cell from the ORIGINAL image (with padding), optionally trim, save.

Cells are filtered by a minimum width/height so noise (colour bars, stamps, crop
marks, handwriting) is dropped. Tunable via flags — works on any grid-ish sheet.

Usage:
  python3 scripts/extract-cards.py INPUT --out DIR [--thr-pct 68] [--min-w 120]
      [--min-h 100] [--pad 6] [--merge 10] [--row-thr 3] [--col-thr 3] [--trim]
"""
import argparse
import os
import subprocess
import sys
import tempfile


def sh(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def identify_wh(path):
    out = sh(["identify", "-format", "%w %h", path])
    w, h = out.split()
    return int(w), int(h)


def profile_from_txt(txt):
    """Parse ImageMagick `txt:` output → list of gray values (0..255)."""
    vals = []
    for line in txt.splitlines():
        # e.g. "0,3: (128,128,128)  #808080  gray(128)"
        if ":" not in line or line.startswith("#"):
            continue
        try:
            inside = line.split("(", 1)[1].split(")", 1)[0]
            first = inside.split(",")[0].strip()
            # value may be a percentage or 0..255
            v = float(first.replace("%", ""))
            if "%" in first:
                v = v * 255 / 100.0
            vals.append(v)
        except (IndexError, ValueError):
            continue
    return vals


def row_profile(mask, h):
    txt = sh(["convert", mask, "-scale", f"1x{h}!", "-depth", "8", "txt:-"])
    return profile_from_txt(txt)


def col_profile(mask, w, y0, y1):
    txt = sh([
        "convert", mask, "-crop", f"{w}x{y1 - y0}+0+{y0}", "+repage",
        "-scale", f"{w}x1!", "-depth", "8", "txt:-",
    ])
    return profile_from_txt(txt)


def bands(vals, thr, min_len, merge):
    raw, s = [], None
    for i, v in enumerate(vals):
        if v > thr:
            if s is None:
                s = i
        elif s is not None:
            raw.append((s, i))
            s = None
    if s is not None:
        raw.append((s, len(vals)))
    # merge bands separated by a gap <= merge
    out = []
    for b in raw:
        if out and b[0] - out[-1][1] <= merge:
            out[-1] = (out[-1][0], b[1])
        else:
            out.append(b)
    return [b for b in out if b[1] - b[0] >= min_len]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--out", required=True)
    ap.add_argument("--thr-pct", type=float, default=68, help="content threshold (%% lightness; lower = only darker ink counts)")
    ap.add_argument("--row-thr", type=float, default=3, help="row profile threshold 0..255")
    ap.add_argument("--col-thr", type=float, default=3, help="column profile threshold 0..255")
    ap.add_argument("--min-w", type=int, default=120)
    ap.add_argument("--min-h", type=int, default=100)
    ap.add_argument("--pad", type=int, default=6)
    ap.add_argument("--merge", type=int, default=10, help="merge bands separated by <= this many px")
    ap.add_argument("--trim", action="store_true", help="trim each crop to its content")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    w, h = identify_wh(args.input)

    with tempfile.TemporaryDirectory() as tmp:
        mask = os.path.join(tmp, "mask.png")
        sh(["convert", args.input, "-colorspace", "Gray", "-threshold", f"{args.thr_pct}%", "-negate", mask])

        rows = bands(row_profile(mask, h), args.row_thr, args.min_h, args.merge)
        cells = []
        for (y0, y1) in rows:
            cols = bands(col_profile(mask, w, y0, y1), args.col_thr, args.min_w, args.merge)
            for (x0, x1) in cols:
                cells.append((x0, y0, x1, y1))

        n = 0
        for (x0, y0, x1, y1) in cells:
            px0 = max(0, x0 - args.pad)
            py0 = max(0, y0 - args.pad)
            px1 = min(w, x1 + args.pad)
            py1 = min(h, y1 + args.pad)
            dst = os.path.join(args.out, f"{n:02d}.png")
            cmd = ["convert", args.input, "-crop", f"{px1 - px0}x{py1 - py0}+{px0}+{py0}", "+repage"]
            if args.trim:
                cmd += ["-fuzz", "8%", "-trim", "+repage"]
            cmd.append(dst)
            sh(cmd)
            n += 1

        print(f"extracted {n} cards -> {args.out}  (grid rows: {len(rows)})")


if __name__ == "__main__":
    main()
