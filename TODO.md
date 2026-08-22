# Tarotier — features à intégrer

Statut au 2026-08-22. « Moteur ✅ » = logique de rendu prête, il ne manque que
le câblage UI (store + contrôle + passage des options à `CardView`).

## En cours (moteur prêt, UI manquante)

- [ ] **Format de carte** (carré / standard / tarot allongé)
  - Moteur ✅ : `FORMATS` + option `height` dans `renderCardSVG`.
  - Reste : `editor.format` dans le store, sélecteur dans l'UI, passer `height` à `CardView`.

- [ ] **Style des figures A/B/C** + sélecteur
  - Images ✅ : `public/art/courts/grimaud/` (16, trad 1898) et
    `public/art/courts/marseille/` (16, Marseille single-cards). Moteur ✅ :
    `courtImage(suit, rank, style)` + option `courtStyle`.
  - Reste : style **C « généré »** (dessin propre au lieu du placeholder pointillé) ;
    `editor.courtStyle` + sélecteur ; passer `courtStyle` à `CardView`.

- [ ] **PNG custom par enseigne**
  - Moteur ✅ : option `customSuitImages` (data-URL) dans `renderCardSVG`.
  - Reste : bouton « charger un PNG » par enseigne (FileReader → data-URL),
    `editor.customSuitImages` dans le store, passer l'option à `CardView`.

## À faire (pas commencé)

- [ ] **Templates de positionnement des pips** supplémentaires
  - Ajouter : circulaire, espacé, en grille, en diagonale… + sélecteur `editor.pipTemplateId`.
  - Fichier : `src/lib/render/pipLayouts.ts` (déjà structuré pour ça).

- [ ] **Flèches préc./suiv. en mode Bandeau**
  - Boutons ‹ › qui déplacent `editor.selectedId` dans l'ordre du deck (+ clavier ←/→).

- [ ] **Onglet « Dos de carte »**
  - Nouvel onglet (Cartes / Dos). Templates de dos (motifs SVG procéduraux :
    uni, treillis, pois, bordure ornementale…) + couleur. Rendu SVG dédié.

- [ ] **Export PNG** (par carte / planche) — sérialiser le SVG → canvas → `toBlob`.
  Les images doivent être inlinées en data-URL (le rendu data-URL est déjà validé).

- [ ] **Sauvegarde/chargement projet JSON** — sérialiser `editor` (déjà plat/sérialisable).

- [ ] **Mode libre** — débrider le placement (déplacer/ajouter/retirer symboles,
  texte, image), éditer n'importe quelle carte et le dos hors contraintes.

## Fait

- [x] Déploiement statique nginx + TLS (tarotier.space-dice.com)
- [x] Modèle de deck 32/40/52/56/78 + moteur de pips SVG
- [x] Coquille éditeur : 2 modes de visu (mosaïque / bandeau), sélection
- [x] Variantes d'enseignes (3 chacune) + sélecteur
- [x] Réglage taille des enseignes (slider px)
- [x] Atouts Tarot de Marseille (Dodal, PD)
- [x] Mode nuit (bascule thème)
