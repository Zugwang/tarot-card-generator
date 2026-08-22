# Tarotier — features

Statut au 2026-08-22.

## Fait

- [x] Déploiement statique nginx + TLS (tarotier.space-dice.com)
- [x] Modèle de deck 32/40/52/56/78 + moteur de pips SVG
- [x] Coquille éditeur : 2 modes de visu (mosaïque / bandeau), sélection
- [x] Variantes d'enseignes (3 chacune) + sélecteur
- [x] Réglage taille des enseignes (slider px)
- [x] Atouts Tarot de Marseille (Dodal, PD)
- [x] Mode nuit (bascule thème + persistance)
- [x] **Format de carte** : carré / standard / tarot allongé
- [x] **Style des figures A/B/C** + sélecteur : Marseille (single-cards),
      Trad 1898 (Grimaud), Généré (panneau + enseigne + bandeau)
- [x] **PNG custom par enseigne** (upload → data-URL, remplace le symbole)
- [x] **Templates de positionnement** : classique, espacé, circulaire, grille, diagonale
- [x] **Flèches préc./suiv.** en mode Bandeau (+ clavier ←/→)
- [x] **Onglet Dos de carte** : motifs (uni, quadrillé, losanges, pois, ornement) + couleur

## À faire

- [ ] **Export PNG** (par carte / planche) — sérialiser le SVG → canvas → `toBlob`.
      Inliner les images en data-URL (rendu data-URL déjà validé). Le dos aussi.
- [ ] **Sauvegarde / chargement projet JSON** — sérialiser `editor` (déjà plat).
- [ ] **Mode libre** — débrider le placement (déplacer / ajouter / retirer
      symboles, texte, image), éditer n'importe quelle carte et le dos hors contraintes.

## Idées / raffinements

- [ ] Figures Marseille : recadrage (bandes blanches latérales dues au ratio).
- [ ] Plus de variantes d'enseignes ; recoloration par enseigne.
- [ ] Dos : motif à partir de l'enseigne choisie ; plus de templates.
- [ ] Atouts : second style (Grimaud/Conver) sélectionnable.
