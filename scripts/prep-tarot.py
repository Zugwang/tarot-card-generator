#!/usr/bin/env python3
import os, re, json, subprocess, zipfile, sys, shutil

ROOT = "/home/k1000/Projects/ClaudeAssisted/Tarotier"
SCRATCH = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(ROOT, "public/art/tarot")

RANK = {1: "Ace", 11: "Page", 12: "Knight", 13: "Queen", 14: "King"}
NUM = {2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten"}
def rank_name(r):
    return RANK.get(r) or NUM.get(r) or str(r)

def unzip(zpath):
    d = os.path.join(SCRATCH, "ex_" + os.path.basename(zpath).split(".")[0])
    if os.path.isdir(d):
        shutil.rmtree(d)
    os.makedirs(d)
    with zipfile.ZipFile(zpath) as z:
        z.extractall(d)
    # flatten (some zips nest a folder)
    files = []
    for base, _, fs in os.walk(d):
        for f in fs:
            files.append(os.path.join(base, f))
    return files

def find(files, pred):
    for f in files:
        if pred(os.path.basename(f)):
            return f
    return None

def build_rws(files):
    order = []  # (srcpath, displayname)
    # majors 0..21
    for n in range(0, 22):
        f = find(files, lambda b, n=n: re.match(rf"RWS_Tarot_{n:02d}_", b))
        assert f, f"RWS major {n} missing"
        name = re.sub(rf"^RWS_Tarot_{n:02d}_", "", os.path.basename(f))
        name = re.sub(r"\.jpg$", "", name).replace("_", " ").strip()
        order.append((f, name))
    # minors
    suits = [("Wands", "Wands"), ("Cups", "Cups"), ("Swords", "Swords"), ("Pents", "Pentacles")]
    for pre, disp in suits:
        for r in range(1, 15):
            f = find(files, lambda b, pre=pre, r=r: re.match(rf"{pre}{r:02d}\.jpg$", b))
            if not f and pre == "Wands" and r == 9:
                f = find(files, lambda b: b == "Tarot_Nine_of_Wands.jpg")
            assert f, f"RWS {pre} {r} missing"
            order.append((f, f"{rank_name(r)} of {disp}"))
    assert len(order) == 78, len(order)
    return order

def build_syssk(files):
    order = []
    # majors 0..22
    for n in range(0, 23):
        f = find(files, lambda b, n=n: re.match(rf"{n}\s", b) or re.match(rf"{n}\.", b))
        assert f, f"syssk major {n} missing"
        name = re.sub(rf"^{n}\s+", "", os.path.basename(f))
        name = re.sub(r"\s*\([12]\)", "", name)
        name = re.sub(r"\.png$", "", name).strip()
        order.append((f, name))
    suits = [("Wand", "Wands"), ("Cup", "Cups"), ("Sword", "Swords"), ("Coin", "Coins")]
    ranks = [0] + list(range(2, 15))  # 0(ace),2..14 — this deck skips 1, ace=0
    for pre, disp in suits:
        for r in ranks:
            f = find(files, lambda b, pre=pre, r=r: re.match(rf"{pre}\s{r}(?!\d)", b))
            assert f, f"syssk {pre} {r} missing"
            rn = "Ace" if r == 0 else rank_name(r)
            order.append((f, f"{rn} of {disp}"))
    assert len(order) == 79, len(order)
    return order

def convert(order, outdir):
    os.makedirs(outdir, exist_ok=True)
    for f in os.listdir(outdir):
        os.remove(os.path.join(outdir, f))
    for i, (src, _name) in enumerate(order):
        dst = os.path.join(outdir, f"{i:02d}.webp")
        subprocess.run(
            ["convert", src, "-resize", "x760>", "-quality", "80", "-define", "webp:method=6", dst],
            check=True,
        )
    print(f"  wrote {len(order)} webp -> {outdir}")

def main():
    decks = {}
    rws = build_rws(unzip(os.path.join(ROOT, "pents-13.zip")))
    convert(rws, os.path.join(ART, "rws"))
    decks["rws"] = [n for _, n in rws]

    syssk = build_syssk(unzip(os.path.join(ROOT, "tarot-of-syssk_202606.zip")))
    convert(syssk, os.path.join(ART, "syssk"))
    decks["syssk"] = [n for _, n in syssk]

    # emit TS data
    ts = os.path.join(ROOT, "src/lib/render/tarotData.ts")
    with open(ts, "w", encoding="utf-8") as o:
        o.write("// Auto-generated image-deck names (see scripts/prep — full-art tarot decks).\n")
        o.write("// Each deck maps a card index (0..) to /art/tarot/<set>/NN.webp.\n\n")
        o.write(f"export const RWS_NAMES: string[] = {json.dumps(decks['rws'], ensure_ascii=False)};\n\n")
        o.write(f"export const SYSSK_NAMES: string[] = {json.dumps(decks['syssk'], ensure_ascii=False)};\n\n")
        o.write("export interface ImageDeck { label: string; short: string; names: string[]; copyrighted?: boolean; }\n")
        o.write("export const IMAGE_DECKS: Record<string, ImageDeck> = {\n")
        o.write("  rws: { label: 'Rider-Waite (RWS)', short: 'RWS', names: RWS_NAMES },\n")
        o.write("  syssk: { label: 'Tarot of Syssk', short: 'Syssk', names: SYSSK_NAMES, copyrighted: true },\n")
        o.write("};\n")
    print("wrote", ts)
    print("RWS[0..2] =", decks["rws"][:3], "... [22]=", decks["rws"][22])
    print("SYSSK[0..2] =", decks["syssk"][:3], "... [23]=", decks["syssk"][23])

main()
