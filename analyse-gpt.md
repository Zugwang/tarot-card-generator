Brief technique — évolution de Tarotier

Tu travailles sur Tarotier, une application web de création de jeux de cartes :
https://tarotier.space-dice.com/
Dépôt GitHub actuel : https://github.com/Zugwang/tarot-card-generator
Objectif

Faire évoluer Tarotier d'un générateur de Tarot vers un éditeur/générateur graphique générique de cartes, capable de créer notamment :

    Tarot de Marseille ;
    Tarots originaux ;
    jeux de 52 cartes ;
    éventuellement TCG, oracles et autres cartes personnalisées.

L'objectif principal est de combiner :

    liberté graphique façon Canva/Inkscape ;
    génération massive par données/templates ;
    qualité vectorielle maximale ;
    traitement majoritairement côté client ;
    fonctionnement sur hébergement statique ;
    architecture extensible et générique.

Contraintes

Le VPS actuel dispose de seulement :

    2 Go RAM ;
    2 vCPU.

Il faut donc minimiser fortement le traitement serveur.

Le serveur devrait idéalement uniquement servir :

    HTML ;
    JS ;
    CSS ;
    SVG ;
    images ;
    JSON.

Les opérations suivantes doivent autant que possible être effectuées dans le navigateur :

    édition ;
    composition des cartes ;
    transformations ;
    génération d'un deck ;
    prévisualisation ;
    génération des fichiers exportés.

Ne pas introduire de backend de rendu lourd type Puppeteer/Chromium sauf nécessité future pour un export professionnel particulier.

Le projet utilise actuellement Svelte + TypeScript + Vite. Il n'est pas nécessaire de migrer de framework.
Architecture cible

Séparer conceptuellement le projet en trois couches.

                    PROJECT / JSON
                         │
                         ▼
                  DOCUMENT MODEL
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
        EDITOR         RENDERER        DECK
          │              │              │
          ▼              ▼              ▼
       Canvas/SVG        SVG        cartes générées
                         │
                         ▼
                       EXPORT

1. Document Model

Le JSON est le format source d'un projet/carte.

Il décrit les données et les éléments graphiques, mais ne doit pas être confondu avec le renderer.

Exemple conceptuel :

{
  "width": 70,
  "height": 120,
  "bleed": 3,
  "elements": [
    {
      "type": "image",
      "src": "assets/bateleur.webp",
      "x": 5,
      "y": 8,
      "width": 60,
      "height": 90,
      "rotation": 0
    },
    {
      "type": "text",
      "text": "I",
      "x": 5,
      "y": 4
    }
  ]
}

Prévoir un modèle extensible avec des éléments tels que :

    image raster ;
    SVG ;
    texte ;
    formes ;
    groupes ;
    cadres ;
    masques/clipping ;
    symboles ;
    transformations ;
    éventuellement filtres/effets.

Le modèle doit rester indépendant de Svelte, Canvas ou SVG.
2. Renderer

Prévoir une séparation entre le modèle et son rendu.

Le même document devrait pouvoir être rendu :

    en SVG ;
    éventuellement en Canvas pour certaines opérations d'édition/preview ;
    en DOM/SVG pour l'interface ;
    en format export.

SVG doit être considéré comme le format graphique maître, car l'objectif est de minimiser les pertes de qualité.

Éviter une architecture où le Canvas devient le format source définitif.

Le Canvas peut servir à :

    accélérer certaines previews ;
    manipuler des éléments ;
    générer des miniatures ;
    effectuer des opérations raster si nécessaire.

Mais le projet doit conserver les données vectorielles originales.
3. Deck Engine

Le moteur de cartes doit être générique et ne pas connaître spécifiquement le Tarot.

Un deck doit pouvoir être défini par JSON :

{
  "name": "Tarot de Marseille",
  "cards": [
    {
      "id": "major-00",
      "name": "Le Mat",
      "number": "0",
      "template": "major-arcana"
    },
    {
      "id": "major-01",
      "name": "Le Bateleur",
      "number": "I",
      "template": "major-arcana"
    }
  ]
}

Le même moteur doit pouvoir gérer :

{
  "name": "Poker",
  "cards": [
    {
      "rank": "A",
      "suit": "hearts",
      "template": "standard-playing-card"
    }
  ]
}

Templates

Introduire un véritable système de templates.

Exemple :

templates/
├── tarot/
│   ├── major-arcana
│   ├── minor-arcana
│   └── court
└── poker/
    └── standard

Un template définit une structure graphique réutilisable.

Exemple conceptuel :

Tarot Major Arcana
├── background
├── border
├── number
├── illustration
├── title
└── ornaments

Modifier le template doit pouvoir mettre à jour toutes les cartes qui l'utilisent.
Génération par données

Le système doit permettre de produire plusieurs cartes à partir d'un même template.

Pour les arcanes mineurs, par exemple :

{
  "template": "minor-arcana",
  "variables": {
    "suit": "batons",
    "rank": 7
  }
}

Le template peut alors déterminer :

    le symbole ;
    la couleur ;
    la disposition ;
    l'illustration ;
    le texte ;
    les ornements.

Cela permet de générer les 56 cartes à partir de règles plutôt que de maintenir 56 compositions indépendantes.
Éditeur graphique

L'interface doit progressivement tendre vers une expérience proche de Canva :

    déplacement libre ;
    redimensionnement ;
    rotation ;
    zoom ;
    alignement ;
    guides ;
    grille ;
    snapping ;
    ordre des calques ;
    duplication ;
    copier/coller ;
    édition du texte ;
    import d'images ;
    import SVG ;
    recadrage ;
    masques ;
    opacité ;
    transformations ;
    éventuellement effets.

Il faut cependant conserver la possibilité d'utiliser les templates et les données pour générer automatiquement des cartes.

Le produit doit donc proposer deux modes complémentaires :
Mode libre

L'utilisateur compose directement une carte.
Mode génératif

L'utilisateur définit :

template + données + assets

et génère plusieurs cartes.
Organisation de projet envisagée

Conceptuellement :

project/
├── project.json
├── decks/
│   ├── tarot-marseille.json
│   └── poker.json
├── templates/
│   ├── tarot/
│   └── poker/
├── assets/
│   ├── images/
│   ├── svg/
│   └── fonts/
└── exports/

Le format de projet pourrait éventuellement être exporté/importé sous forme d'un fichier ZIP propriétaire, par exemple :

.tarotproject

contenant :

    JSON ;
    templates ;
    SVG ;
    images ;
    métadonnées.

Le serveur n'a pas besoin de stocker ces projets si l'utilisateur travaille localement.
Performance

Attention à ne pas afficher simultanément des dizaines de cartes SVG extrêmement complexes dans le DOM.

Certaines collections SVG de cartes montrent que des decks complexes peuvent rapidement produire des dizaines de milliers de nodes SVG.

Préférer :

carte sélectionnée
    → rendu SVG complet et éditable

cartes non sélectionnées
    → preview simplifiée / miniature / canvas

Le DOM ne doit pas contenir inutilement 78 SVG complexes simultanément.

Utiliser éventuellement :

    virtualisation ;
    thumbnails ;
    Canvas pour previews ;
    lazy loading ;
    rendu uniquement de la carte active.

Le navigateur de l'utilisateur doit effectuer la majorité du travail.
Export

Priorité :

JSON → SVG

puis éventuellement :

SVG → PNG
SVG → PDF

Le SVG doit rester disponible comme export sans perte.

Pour les images raster :

    conserver la résolution originale ;
    ne jamais dégrader automatiquement une image haute résolution pour l'édition ;
    utiliser des previews/versions réduites uniquement pour l'affichage lorsque nécessaire ;
    conserver le fichier original pour l'export.

L'export PDF doit être étudié séparément car un PDF réellement adapté à l'impression professionnelle peut nécessiter une gestion spécifique :

    fond perdu ;
    traits de coupe ;
    dimensions physiques ;
    résolution ;
    polices ;
    profils colorimétriques ;
    images raster ;
    éventuellement CMYK.

Ne pas construire toute l'architecture autour du PDF au départ. SVG est le format maître.
Impression

Prévoir dès le départ :

    dimensions physiques ;
    bleed ;
    safe area ;
    crop marks ;
    recto ;
    verso ;
    verso commun ;
    génération de planches ;
    éventuellement placement automatique de plusieurs cartes sur A4/A3/autres formats.

Le recto-verso doit être pris en compte dans l'architecture, même si l'export imprimeur est développé plus tard.
Philosophie technique

Ne pas chercher nécessairement à intégrer un « moteur de cartes » existant.

Des projets open source sont intéressants comme références :

    Jubbly Card Creator : architecture de génération de cartes par données/templates et fonctionnement web.
    nhmkdev/CardMaker : séparation entre données et layout, scripting.
    jminor/CardMaker : templates SVG + données externes.
    Cardmeister / SVG-cards : exemples de cartes génératives en SVG.
    artofpilgrim/labels : modèle intéressant d'éditeur graphique SVG côté client.

Mais Tarotier doit probablement évoluer en moteur propre, car le besoin est plus large qu'un générateur de Tarot.
Principe architectural essentiel

Ne pas faire :

Svelte
  ↓
Canvas
  ↓
PNG
  ↓
PDF

Préférer :

JSON Document Model
        │
        ├──→ SVG Renderer ──→ SVG
        │
        ├──→ Canvas Renderer ──→ preview/édition
        │
        └──→ Export Renderer ──→ PDF/PNG

Le JSON représente la carte, le renderer ne fait que l'afficher.

Cela permettra de changer de technologie de rendu sans devoir changer le format des projets.
Priorités de développement

Ne pas tout développer immédiatement.
Phase 1

Stabiliser le Document Model JSON.

Il doit être suffisamment générique pour représenter :

    texte ;
    images ;
    SVG ;
    formes ;
    groupes ;
    transformations ;
    calques.

Phase 2

Créer un renderer SVG fiable.
Phase 3

Faire évoluer l'éditeur actuel pour manipuler ce modèle :

    sélection ;
    déplacement ;
    resize ;
    rotation ;
    calques ;
    propriétés.

Phase 4

Ajouter templates + variables.
Phase 5

Ajouter Deck Engine et génération de plusieurs cartes.
Phase 6

Ajouter import/export de projets.
Phase 7

Optimiser les previews et les performances.
Phase 8

Développer les exports impression :

    SVG ;
    PNG ;
    PDF ;
    planches ;
    recto-verso ;
    bleed/crop marks.

Règle générale pour les futures décisions

Avant d'ajouter une dépendance ou de réécrire une partie de Tarotier, privilégier une solution qui respecte ces critères :

    client-side first ;
    compatible avec Svelte + TypeScript + Vite ;
    open source et maintenable ;
    fonctionnement sans backend ;
    SVG/vectoriel lorsque possible ;
    conservation des assets originaux ;
    modèle de données indépendant du renderer ;
    faible consommation mémoire/CPU ;
    capable de gérer aussi bien une carte unique qu'un deck de 78+ cartes ;
    ne pas enfermer Tarotier dans une architecture spécifique au Tarot.

Conclusion : ne pas chercher un moteur de Tarot. Construire Tarotier comme un moteur générique de composition et de génération de cartes, avec JSON comme modèle de document, SVG comme format graphique maître, Svelte comme interface, et un traitement essentiellement côté client.

