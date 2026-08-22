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

## Idées / raffinements

- [ ] Document Model : finir l'unification (renderer 100% élément ; le mode libre
      édite la même liste que la génération — aujourd'hui décomposition one-shot).
- [ ] Mode libre : snap/guides ; multi-sélection ; copier/coller ; formes/cadres.
- [ ] Export : **ZIP** de fichiers séparés (dépend de JSZip).
- [ ] Dos : motif dérivé de l'enseigne ; plus de motifs.
- [ ] Atouts : second style (Grimaud/Conver) sélectionnable.
- [ ] Impression (plus tard) : dimensions physiques, bleed, coupe, recto-verso, PDF.
