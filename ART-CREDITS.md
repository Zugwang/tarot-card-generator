# Crédits des illustrations

## Atouts + l'Excuse (`public/art/atouts/`)

Tarot de Marseille de **Jean Dodal** (Lyon, ~1701). Œuvre du **domaine public**
(auteur mort depuis plus de 70 ans ; reproductions photographiques d'une œuvre 2D
PD, sans droit voisin).

Source : Wikimedia Commons — catégorie
« Tarot de Marseille - Jean Dodal »
(https://commons.wikimedia.org/wiki/Category:Tarot_de_Marseille_-_Jean_Dodal).
Images récupérées via `Special:FilePath` (redimensionnées à ~500 px de large).

Mapping : `trump 01..21` → atouts 1 à 21 ; `trump Fool` → l'Excuse (Le Mat).

## Figures poker (`public/art/courts/poker/`)

Set **English pattern** (SVG vectoriel) issu de Wikimedia Commons — catégorie
« SVG English pattern playing cards ». Motif de cartes anglais du domaine public.
Valet/Dame/Roi × 4 (pas de Cavalier dans le jeu de 52).

## Figures Marseille (`public/art/courts/marseille/`)

Set « Tarot de Marseille (Single Cards) » de Wikimedia Commons (domaine public) :
Valet/Cavalier/Dame/Roi × Épées(pique)/Coupes(cœur)/Deniers(carreau)/Bâtons(trèfle).

## Figures « Trad 1898 » (`public/art/courts/grimaud/`)

Tarot nouveau Grimaud 1898 (domaine public), 16 figures. Source : Wikimedia
Commons — catégorie « Tarot nouveau - Grimaud - 1898 ».

## Style « Blanc »

Aucune image : carte vierge avec index seul, à composer en mode libre. Les
mineures 2–10 du Marseille sont des cartes à points, générées par le moteur de pips.

## Atouts « Trad 1898 » (`public/art/atouts-grimaud/`)

Tarot nouveau Grimaud 1898 (« Trumps » 01–21 + Excuse), domaine public.
Source : Wikimedia Commons — catégorie « Tarot nouveau - Grimaud - 1898 ».

## Polices (`public/fonts/`)

Set d'incrustation texte, self-hébergé en woff2 (licence SIL Open Font License) :
Cinzel, Bebas Neue, Pirata One, Rye, Major Mono Display. Source : Google Fonts
(OFL). À l'export, la police utilisée est inlinée en data-URL (@font-face) pour
un SVG/PNG autonome.

---

# Belotier (`belote/`)

Tout ce que la direction artistique « Grimoire / Marseille » emprunte à
l'extérieur, avec sa licence. Le script `belote/fetch-assets.sh` récupère ces
fichiers **une fois** ; la sortie est committée pour qu'aucun déploiement ne
dépende du réseau.

## Icônes (`belote/public/icons/`)

**game-icons.net** — licence **Creative Commons BY 3.0**
(https://game-icons.net/ · https://creativecommons.org/licenses/by/3.0/).
**L'attribution est obligatoire** : l'auteur de chaque icône est repris dans le
nom de fichier (`<auteur>--<icone>.svg`), listé dans
`belote/public/icons/CREDITS.txt`, et **affiché sous chaque icône** sur la page
`/template`. Auteurs utilisés : **Lorc** et **Delapouite**.

Les fichiers ont été modifiés : le rectangle de fond opaque livré d'origine est
retiré et `fill="#fff"` devient `fill="currentColor"`, ce qui permet de les
recolorer en CSS via `mask-image`.

## Polices (`belote/public/fonts/`)

**Pirata One**, **Cinzel** (variable 400–900) et **EB Garamond** (variable
400–800), Google Fonts, licence **SIL Open Font License**. Self-hébergées en
woff2.

⚠️ Ce sont les sous-ensembles **`latin` (U+0000-00FF)**, et non les `latin-ext`
du dossier `public/fonts/` de Tarotier : eux ne contiennent **ni chiffres ni
accents**. `fetch-assets.sh` vérifie la couverture et échoue si elle manque.

## Courbes d'animation (`belote/src/easings.css`)

**open-props** v1.7.23, Copyright (c) 2021 Adam Argyle, licence **MIT**
(https://github.com/argyleink/open-props). Six courbes **transcrites à la main**
plutôt qu'installées en dépendance ; l'avis de licence figure en tête du fichier.

## Sources écartées, et pourquoi

Aucune bibliothèque de boutons ou d'animations CSS n'est utilisée : les cinq
candidates examinées ont échoué sur la licence ou sur la récupérabilité. Tous
les boutons et toutes les animations de Belotier sont donc écrits à la main.

| Écartée | Raison |
|---|---|
| Animate.css | Licence contradictoire : `Hippocratic-2.1` dans le `package.json` de `main`, en-têtes MIT sur les copies v4.1.1. |
| Hover.css | Palier gratuit restreint (« your application can't be sold ») ; conditions commerciales au-delà de la 2.2.0. |
| css-loaders.com | Aucune licence publiée trouvable. |
| Animista | Ni licence ni conditions sur le site. |
| uiverse.io | MIT annoncé, mais HTTP 403 à toute requête automatisée : impossible de vendoriser honnêtement. |

Ce tableau est repris en section 10 de la page `/template`.
