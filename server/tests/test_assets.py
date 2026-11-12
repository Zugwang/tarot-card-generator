"""Cross-language contract: every card id the engine emits must have an image.

The Python engine names cards, the TypeScript generator names files, and the
client joins the two with `/cards/<template>/<id>.webp`. Nothing but this test
keeps those three in step, and a mismatch shows up in game as a broken image.
"""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))

from rules.cards import deck  # noqa: E402

CARDS_DIR = ROOT / "belote" / "public" / "cards"


class TestCardAssets(unittest.TestCase):
    def setUp(self) -> None:
        if not CARDS_DIR.is_dir():
            self.skipTest("cards not generated yet — run belote/gen-cards.sh")
        self.templates = sorted(p.name for p in CARDS_DIR.iterdir() if p.is_dir())

    def test_at_least_one_template(self):
        self.assertTrue(self.templates, "no template directory found")

    def test_every_card_has_an_image_in_every_template(self):
        expected = [c.id for c in deck()]
        self.assertEqual(len(expected), 32)
        for tpl in self.templates:
            missing = [cid for cid in expected if not (CARDS_DIR / tpl / f"{cid}.webp").is_file()]
            self.assertEqual(missing, [], f"{tpl}: missing images for {missing}")
            self.assertTrue((CARDS_DIR / tpl / "back.webp").is_file(), f"{tpl}: no back.webp")

    def test_no_stray_images(self):
        allowed = {f"{c.id}.webp" for c in deck()} | {"back.webp"}
        for tpl in self.templates:
            extra = sorted(p.name for p in (CARDS_DIR / tpl).glob("*.webp") if p.name not in allowed)
            self.assertEqual(extra, [], f"{tpl}: unexpected files {extra}")

    def test_manifest_matches_the_files(self):
        manifest = json.loads((CARDS_DIR / "manifest.json").read_text())
        self.assertEqual(sorted(manifest["templates"]), self.templates)
        for tpl, data in manifest["templates"].items():
            ids = [c["id"] for c in data["cards"]]
            self.assertEqual(sorted(ids), sorted(c.id for c in deck()), f"{tpl}: manifest drift")

    def test_images_are_not_empty(self):
        for tpl in self.templates:
            for p in (CARDS_DIR / tpl).glob("*.webp"):
                self.assertGreater(p.stat().st_size, 1500, f"{p.name} looks empty")


if __name__ == "__main__":
    unittest.main(verbosity=2)
