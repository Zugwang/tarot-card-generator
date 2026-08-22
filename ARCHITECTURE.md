# Tarotier — Architecture

Document de synthèse du besoin et de la cible technique. Il assume l'existant
(Svelte 5 + TS + Vite, statique, SVG) et propose une **évolution incrémentale**,
pas une réécriture. Voir aussi `analyse-gpt.md` (note externe, prise avec recul —
section « Analyse critique » ci-dessous).

## 1. Besoin

Faire évoluer Tarotier d'un générateur de Tarot vers un **éditeur/générateur
graphique de cartes** plus générique (Tarot de Marseille, tarots originaux, jeux
de 52, à terme oracles / TCG), en combinant :

- **liberté graphique** façon Canva (mode libre) ;
- **génération massive** par données + templates (mode génératif) ;
- **qualité vectorielle** (SVG = format maître) ;
- **traitement côté client** ; le serveur ne sert que des fichiers statiques
  (HTML/JS/CSS/SVG/images/JSON) — VPS 2 Go RAM / 2 vCPU, partagé.

## 2. Contrainte structurante

Le serveur reste un **hébergeur statique** (nginx). Tout le calcul — édition,
composition, génération de deck, prévisualisation, export — se fait dans le
navigateur. Pas de backend de rendu (Puppeteer/Chromium) sauf besoin d'export
pro très spécifique, et alors seulement à la demande.

## 3. Analyse critique de la note externe (`analyse-gpt.md`)

**Ce qui est juste et qu'on garde :**

- Client-side first, statique, **SVG comme format maître**, JSON comme source :
  c'est déjà notre cap.
- **Séparation modèle / renderer** : bon principe. On l'a partiellement
  (`renderCardSVG` est un renderer pur ; l'état éditeur est le « modèle »).
- **Deux modes** (génératif + libre) : déjà livrés.
- **Prudence perf** (ne pas jeter 78 SVG lourds dans le DOM) : valable — à
  surveiller quand les cartes portent des images/calques.
- **Conscience impression** (fond perdu, coupe, recto-verso) : à prévoir dans le
  modèle, à implémenter plus tard.

**Ce sur quoi je suis critique (risque de sur-ingénierie) :**

- **Big-bang générique.** La note pousse un Document Model générique complet
  (groupes, masques, clipping, filtres, symboles), un moteur de templates, un
  deck-engine 100 % JSON, un format projet ZIP. Tout construire d'emblée est le
  piège classique : gros bundle client, complexité, risque de ne jamais livrer.
  → **Évoluer par besoin réel, pas par anticipation.**
- **Perte de sûreté de typage.** Passer la définition des decks/templates en JSON
  runtime échange les garanties TypeScript (qui sécurisent aujourd'hui la
  combinatoire 32/40/52/56/78) contre une flexibilité dont on n'a pas encore
  besoin. → Garder la génération **typée** ; réserver le JSON au **bord** du
  système (sauvegarde/chargement de projet, contenu utilisateur).
- **« Le deck engine ne doit pas connaître le Tarot ».** Pureté pour la pureté.
  Certaines connaissances (dispositions de pips, rangs de figures) sont
  spécifiques et les encoder en « templates+variables » génériques ajoute de
  l'indirection sans gain immédiat.
- **Renderer Canvas maintenant : non.** Le SVG-dans-DOM suffit à la complexité
  actuelle. N'ajouter un chemin Canvas (preview/miniatures) que si le profiling
  montre une explosion de nœuds DOM.
- **Assets « résolution originale toujours ».** En tension avec notre choix
  actuel (figures downscalées à 360 px pour un VPS sobre). Vrai pour l'impression,
  inutile pour l'écran. → Décision à trancher (cf. Questions ouvertes).

**Le vrai refactor à forte valeur** (que la note effleure sans le nommer) :
**unifier « carte générée » et « calques du mode libre » en une seule liste
d'éléments** (Document Model). Aujourd'hui ce sont deux chemins de code
(`renderCardSVG` typé par `kind` vs `freeCard.layers`). Si la génération **émet
des éléments** et que le renderer **ne consomme que des éléments**, alors :
l'édition libre marche sur n'importe quelle carte de façon uniforme, l'export est
uniforme, et un « template » devient simplement une fonction `données → éléments`.
C'est une **évolution**, pas une réécriture.

## 4. Architecture cible (pragmatique)

Trois couches, le JSON au bord.

```
        PROJET (JSON, sauvegarde/chargement)
                     │
                     ▼
             DOCUMENT MODEL              Card = { w, h, bleed?, elements: Element[] }
        (liste d'éléments typés)         Element = image | symbol | text | shape | group
              │            │
     génère   │            │  édite
   (templates)▼            ▼ (mode libre)
         DECK ENGINE   ÉDITEUR
              │            │
              └────┬───────┘
                   ▼
              RENDERER  (pur)            renderElements(elements, size) → SVG
                   │
                   ▼
                EXPORT                   SVG (maître) → PNG → (PDF impression, plus tard)
```

- **Document Model** — une carte = taille + liste ordonnée d'`Element`.
  `Element` généralise l'actuel `FreeLayer` (image / symbole d'enseigne / texte /
  forme / groupe ; transform ; opacité). Indépendant de Svelte/Canvas/SVG.
- **Renderer** — `renderElements(elements, size) → string SVG`, pur (réutilisé
  pour l'aperçu via `{@html}` **et** l'export). SVG maître. Canvas seulement plus
  tard, pour miniatures/preview si mesuré nécessaire.
- **Deck Engine / Templates** — un template est une fonction typée
  `(données) → Element[]` (le moteur de pips, les styles de figures, les atouts,
  le dos sont déjà, de fait, des templates). Un deck = liste ordonnée de cartes,
  chacune (template + données). Reste **typé** ; un `DeckSpec` JSON générique
  (poker/oracle/TCG) viendra par-dessus quand le socle Element sera solide.
- **Projet** — JSON unique (avec assets en data-URL) aujourd'hui ; format ZIP
  `.tarotproject` (JSON + templates + SVG + images + métadonnées) **plus tard**,
  quand les assets deviennent lourds.

## 5. État actuel (rappel)

Déjà en place et déployé : modèle de deck typé 32/40/52/56/78 ; moteur de pips
SVG (5 templates) ; variantes d'enseignes (dont 4 tarot : épée/coupe/denier/
bâton) ; taille des enseignes ; formats carré/standard/tarot ; atouts Marseille
(Dodal, PD) ; figures A/B/C (Marseille / Grimaud 1898 / généré) ; PNG custom par
enseigne ; onglet Dos (5 motifs + couleur) ; mode libre (calques déplaçables,
texte/image/enseigne) ; export PNG (carte/planche/dos) ; sauvegarde/chargement
JSON ; mode nuit. Voir `TODO.md`.

## 6. Feuille de route (incrémentale, sans réécriture)

1. **Document Model + `renderElements`** : introduire `Element` et le renderer
   d'éléments ; réimplémenter `renderCardSVG` **par-dessus** (iso-comportement).
   ← le refactor clé.
2. **Unifier le mode libre** : l'éditeur manipule la même liste d'`Element` (on
   supprime le chemin séparé `FreeLayer`).
3. **Templates formalisés** : pips / figures / atouts / dos deviennent des
   producteurs d'`Element`.
4. **UX éditeur (Canva-ish)** : poignées resize/rotation, z-order, snapping,
   multi-sélection, duplication — par petits incréments.
5. **Impression / export** : export SVG ; dimensions physiques, bleed, safe area,
   crop marks ; planches ; recto-verso ; PDF étudié à part.
6. **Perf** : miniatures / virtualisation **si** un besoin mesuré apparaît.
7. **Généricité** : `DeckSpec` JSON générique (poker/oracle/TCG) une fois le
   socle Element+templates stabilisé.

## 7. Principes de décision

Avant d'ajouter une dépendance ou de réécrire : client-side ; compatible
Svelte+TS+Vite ; sans backend ; vectoriel quand possible ; conserver les assets
sources ; **modèle indépendant du renderer** ; sobre en RAM/CPU ; capable d'une
carte seule comme d'un deck de 78+ ; **ne pas enfermer Tarotier dans le Tarot** ;
et — ajout critique — **ne rien généraliser tant qu'un second cas d'usage concret
ne l'exige pas.**

## 8. Questions ouvertes (à trancher)

- **Ambition court terme** : excellent générateur tarot/52 (généricité = cap
  lointain), ou moteur multi-deck générique (poker/TCG/oracle) bientôt ?
- **Appétence refactor** : investir le prochain gros bloc dans le Document Model
  (plomberie, peu de gain visuel immédiat) avant d'ajouter des features ?
- **Impression** : export imprimeur (bleed/coupe/CMYK/PDF) est-il un objectif
  proche (⇒ conserver les assets pleine résolution, dimensions physiques dès
  maintenant), ou l'écran/PNG suffit à court terme (garder les assets réduits) ?
- **Dépôt** : le repo GitHub public + « je commite en local, tu pousses » est-il
  le workflow voulu ? Rien de sensible à y ajouter ?
