# bigbooktarot — cartes extraites

Extraites de `bigbooktarot.jpeg` avec `scripts/extract-cards.py`.

## Source & droits
- **Source :** gallica.bnf.fr / **Bibliothèque nationale de France** (mention en bas de la planche).
- **Ex-libris :** cachet de collection en haut à gauche, « n° 837 » (vraisemblablement la
  collection Georges Marteau, BnF, département des Estampes — même provenance que les figures
  « Danois » déjà utilisées).
- **Domaine public** : planche ancienne (chromolithographie, XIXᵉ s.), figures à l'ancienne.

## Contenu de la planche
Épreuve non massicotée (uncut sheet) de **figures françaises** :
- 1 carte isolée en haut (épreuve, imprimée à l'envers) — fichier `00.png` ;
- **16 figures** en grille 4×4 : cavaliers, dames, rois, valets pour les 4 enseignes.
  L'ordre des enseignes **varie d'une rangée à l'autre** (planche d'imprimeur, non triée).
- une barre de contrôle couleur d'imprimeur + annotations manuscrites au crayon (non extraites).

## Fichiers
`00.png` … `NN.png`, dans l'ordre de lecture (haut→bas, gauche→droite).
`00.png` = la carte isolée du haut (à pivoter éventuellement).

> Extraction automatique : quelques bords / traits de coupe peuvent subsister. Réextraire avec
> d'autres seuils via `python3 scripts/extract-cards.py bigbooktarot.jpeg --out DIR --trim`.
