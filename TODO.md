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

## Fait (suite)

- [x] **Export PNG** : carte / planche / dos (inline des images en data-URL puis canvas)
- [x] **Sauvegarde / chargement projet JSON** (inclut les calques du mode libre)
- [x] **Mode libre** : onglet dédié, calques enseigne/texte/image, déplacement à
      la souris, propriétés (taille/rotation/couleur), masquage du fond ;
      inclus dans l'export PNG et le JSON

## Fait (suite 2)

- [x] Enseignes du tarot (épée/coupe/denier/bâton) comme variantes
- [x] Image de site (bannière + soleil du mode jour)
- [x] Mode libre : poignées resize/rotation, z-order (avancer/reculer), duplication
- [x] Export SVG sans perte (carte/dos) + planche SVG
- [x] Recadrage des illustrations (entier/rempli) ; recoloration par enseigne
- [x] Doc d'architecture (ARCHITECTURE.md)

## Fait (suite 3)

- [x] Amorce Document Model : `cardElements()` (générer = émettre des calques) ;
      auto-décomposition en mode libre
- [x] Dos traité comme une carte (1re carte) + motif/couleur en fond
- [x] Format libre (dimensions réglables) + proportions affichées
- [x] Figures : « blanc » + « poker » (English pattern PD) ; « généré » retiré
- [x] Taille des enseignes jusqu'à 100
- [x] Export : toggle Carte/Jeu (PNG/SVG)
- [x] Template pips « super-espacé »
- [x] Mode libre : « Regénérer depuis le modèle » ; Suppr/Échap au clavier

## Fait (suite 4)

- [x] Export **ZIP** (fichiers séparés PNG/SVG, JSZip en lazy-chunk)
- [x] Atouts : 2ᵉ style « Trad 1898 » (Grimaud) sélectionnable
- [x] Dos : motifs chevrons/étoiles + motif dérivé de l'enseigne
- [x] Mode libre : **formes** (rect/cercle/ligne), **copier/coller** (Ctrl+C/V),
      **snap** au centre + guides

## Reste (gros chantiers, volontairement non faits)

- [ ] **Multi-sélection** au canvas (marquee, déplacement/suppression groupés) —
      demande de retravailler le modèle de sélection (aujourd'hui : 1 calque).
- [ ] **Document Model, unification 100%** : faire passer AUSSI le rendu des cartes
      générées par la liste d'`Element` (aujourd'hui : le générateur émet des
      calques pour la décomposition, mais `renderCardSVG` rend encore en direct).
      Risque de régression sur le cadrage des images → à faire prudemment.
- [ ] **Impression pro** : PDF (dépend de pdf-lib), dimensions physiques mm,
      bleed/safe/crop marks, recto-verso, CMYK. Chantier à part entière ;
      l'utilisateur a priorisé écran/PNG. À cadrer séparément.
