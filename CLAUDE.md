# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Les documents du projet (`ARCHITECTURE.md`, `TODO.md`) sont en français, les commentaires de code
en anglais, les libellés d'interface en français. Ce fichier suit cette convention.

## Nature du projet

Tarotier est un éditeur/générateur de **jeux de cartes** (type Canva, spécialisé cartes), déployé
sur https://tarotier.e1000.dev. Vite 8 + Svelte 5 (runes) + TypeScript strict, page unique
(pas de SvelteKit, pas de routeur, pas de SSR), **100 % statique et sans backend** : nginx ne sert
que des fichiers, tout le calcul est dans le navigateur. Une seule dépendance runtime, `jszip`,
chargée en import dynamique.

⚠️ **La machine de développement EST le VPS de production** (OVH, 1,9 Gi de RAM, 2 vCPU, partagé
avec d'autres services). Voir « Contraintes machine » plus bas avant de lancer quoi que ce soit de
lourd.

## Commandes

```bash
npm run dev        # serveur de dev Vite
npm run build      # build de production → dist/
npm run check      # svelte-check + tsc — LE seul filet de sécurité automatisé
bash deploy/deploy.sh   # npm ci && npm run build && rsync dist/ → /opt/tarotier/dist
```

**Il n'y a aucun test, aucun linter, aucune CI.** `npm run check` est la seule vérification
automatisable : lance-la après toute modification de types ou de signatures. La QA visuelle est
manuelle, par le pipeline de rendu hors navigateur décrit plus bas.

Le déploiement n'a besoin d'aucun sudo (`/opt/tarotier/dist` appartient à `k1000`) et ne redémarre
aucun service.

### QA visuelle sans navigateur

Aucun navigateur n'est connecté à cette session, mais les renderers sont des fonctions pures
exécutables sous node. Recette éprouvée :

```bash
npx vite build --ssr scripts/gen-sheet.ts --outDir /tmp/qa   # bundle le code de rendu
node /tmp/qa/gen-sheet.js 52 /tmp/cards                      # un SVG par carte
rsvg-convert -o out.png /tmp/cards/00-pip-pique-1.svg        # rasterise
```

Scripts existants : `scripts/gen-sheet.ts` (un SVG par carte), `gen-qa.ts`, `gen-swatches.ts`,
`qa-render.ts` (cas ciblés, ex. halo de contraste).

**Pièges de rasterisation, coûteux à redécouvrir :**
- ImageMagick ne rend ni les `<svg>` imbriqués ni les `<image>`, même en data-URI. **Utilise
  `rsvg-convert`** (librsvg2-bin, déjà installé).
- librsvg refuse les `<image>` dont le chemin sort du dossier du SVG, et refuse `..`. Pour
  rasteriser une carte illustrée : écrire le SVG **à la racine de `dist/`**, puis
  `sed 's#"/art/#"art/#'` pour obtenir un href relatif descendant, puis `rsvg-convert`.
- Pas de `cwebp` sur la box, mais ImageMagick (`convert`) gère WebP.

## Architecture

`ARCHITECTURE.md` est le document de référence (besoin, contrainte, critique de `analyse-gpt.md`,
cible en 3 couches, feuille de route en 7 étapes). À lire avant tout refactor structurel.

### La dualité à comprendre en premier

Deux modèles de carte coexistent — c'est **la dette centrale** du projet, assumée et documentée
(`ARCHITECTURE.md` §3, `TODO.md` chantier n°2) :

1. **Modèle de deck typé** — `src/lib/model/deck.ts`. Union discriminée
   `Card = pip | court | atout | excuse | oracle | image | back`, tailles `32|40|52|56|78` via
   `DECK_SHAPES`, générateurs `generateDeck(size)` / `generateOracleDeck()` / `generateImageDeck(set)`.
2. **Modèle de calques** — `src/lib/editor/free.ts`. `FreeLayer = suit | text | image | shape`
   avec `{x, y, size, rot, opacity?, crop?}`, et `FreeCard = {hideBase, layers[], bgImage?}`.

Le pont est **`cardElements(card, opts): FreeLayer[]`** (`src/lib/render/card.ts:198`) : « générer,
c'est émettre des calques ». Utilisé par `freeFromModel()` / `ensureExploded()` / `regenerateCard()`
(`src/lib/editor/store.svelte.ts:221-238`).

**Mais `renderCardSVG` ne consomme pas `cardElements`** : il rend encore en direct par
`switch (card.kind)` (`card.ts:271-302`) et n'applique les `FreeLayer` qu'en **surcouche**
(`card.ts:319-321`). Conséquence pratique : **toute règle de rendu doit être écrite deux fois**, une
fois dans le `switch` et une fois dans `cardElements`, sinon une carte « éclatée » en mode libre
diverge de son rendu normal. L'étape 1 de la feuille de route est précisément d'unifier les deux.

Autre conséquence : **une carte éclatée a ses calques figés** — changer une option de deck ne s'y
propage plus. D'où le bouton « ↻ Regénérer depuis le modèle » (`regenerateCard`).

### Couche de rendu — pure, sans DOM

`src/lib/render/` ne contient aucun code Svelte et tourne sous node (d'où la QA SSR).

- **`card.ts`** — `renderCardSVG(card, opts): string` (`:259`) retourne un SVG autonome ;
  `RenderOptions` (`:28-53`) est le contrat de toutes les options de rendu. `FORMATS` :
  standard 250×350, carré 300×300, tarot 250×455.
- **`suits.ts`** — enseignes **SVG paramétriques inline** (pas de fichiers), ~9 variantes par
  couleur, dessinées dans une boîte 100×100. `suitSymbol(suit, variantId, color)`.
- **`pipLayouts.ts`** — 8 templates de positionnement des points.
- **`back.ts`** — motifs de dos. Le dos est **une carte** (`kind: 'back'`), pas un cas à part.
- **`illustrations.ts`** — registre carte → URL sous `/art/...`.
- **`fonts.ts`** — registre des polices ; `url` sert à la fois au `@font-face` et à l'inlining
  data-URL à l'export.

Invariants à respecter :
- **`x`/`y` d'un calque sont des fractions 0..1** de la carte ; `size` est en unités carte.
- Les ids SVG internes sont **suffixés par `cardId(card)`** (`cardclip-…`, `halo-…`, `clip-…`) :
  indispensable pour que les planches à SVG imbriqués ne se télescopent pas. Ne jamais revenir à
  un id constant.
- Tout le contenu est clippé au rectangle arrondi de la carte, donc un calque qui déborde est
  rogné et non visible hors cadre.

### État de l'éditeur

`src/lib/editor/store.svelte.ts` exporte un singleton `editor = $state({...})`, **plat et
sérialisable par construction**. Les composants mutent ses champs directement.

- `cardRenderOptions()` (`:199`) dérive les `RenderOptions` de l'état — point de passage unique.
- `formatWH()` (`:190`) **arrondit largeur et hauteur à un entier pair**, pour que `w/2, h/2`
  tombent sur une unité entière (sinon léger décalage des enseignes point-symétriques).

## Pièges qui coûtent cher

1. **`project.ts` a une liste blanche `KEYS`** (`src/lib/editor/project.ts:9-32`). Un nouveau champ
   de `editor` qui doit **persister** doit y être ajouté, sinon il est silencieusement perdu à la
   sauvegarde. Et comme l'undo/redo réutilise ces mêmes `KEYS` via `snapshotState()`, un champ
   oublié est aussi **invisible à l'undo**. Un seul endroit, deux conséquences.
2. **`primeHistory()` doit être appelé depuis `onMount`, jamais depuis un `$effect`** : il lit
   réactivement tout l'état, donc un `$effect` se ré-exécuterait et effacerait l'historique à chaque
   changement. À rappeler après un chargement de projet.
3. **L'export exige `inlineAssets()`** (`src/lib/export/png.ts:28`) = images + polices converties en
   data-URL. Sans ça, un SVG chargé dans un `<img>` ne charge pas ses refs externes **et** salit le
   canvas (`toBlob` échoue). Tout nouveau chemin d'export doit passer par là.
4. **Ajouter une source d'images distante demande une modification nginx hors dépôt** : la CSP
   `connect-src` liste explicitement les hôtes autorisés (`commons.wikimedia.org`,
   `upload.wikimedia.org`, `api.openverse.org`). Et l'hôte **de l'image** doit renvoyer `ACAO: *`,
   sinon la conversion en data-URL échoue. Voir l'en-tête de `src/lib/editor/sources.ts` (Art
   Institute of Chicago a été écarté pour cette raison : challenge Cloudflare).
5. **Polices self-hébergées** : les woff2 sont des *sous-ensembles* Google Fonts. Un sous-ensemble
   mal choisi (latin-ext) ne contient **ni chiffres ni lettres latines de base**, et le changement de
   police semble alors « ne rien faire ». Vérifier la couverture :
   `fc-query -f '%{charset}'` doit couvrir `30-3b 41-5b 61-7a`.
6. **Le type `Tab` contient encore `'dos'`, qui est mort** (onglet supprimé, contrôles déplacés dans
   « Libre »). Et l'onglet d'id `'cartes'` est **libellé « Packet »** dans l'interface — ne pas
   chercher un id `packet`.
7. **L'As est `rank: 1`**, donc son identifiant est `pip-coeur-1` et non `pip-coeur-as`
   (`cardId()`, `deck.ts:165`).

## Assets

- `public/art/` — illustrations servies en statique, référencées par URL absolue same-origin.
  Jeux **domaine public et versionnés** : atouts Marseille Dodal (~1701), Grimaud 1898, figures
  poker (English pattern), figures « danois » (BnF), tarot RWS 1909.
- **Jeux sous droits, volontairement gitignorés** (décision utilisateur : déployés mais hors dépôt
  public) : `public/art/atouts-carrington/`, `public/art/atouts-oracle/`, `public/art/tarot/syssk/`.
  Ils existent localement et ne partent que par rsync. Ne jamais les committer.
  `public/references.html` (noindex) porte la mention de droits et le contact de retrait.
- `ART-CREDITS.md` — provenance et licence de chaque jeu. **À mettre à jour en même temps qu'un
  ajout d'assets.**
- Images venant de l'utilisateur ou du réseau : toujours en **data-URL** (indispensable pour
  l'export PNG sans canvas sali). Elles voyagent donc dans le JSON de projet, ce qui le rend lourd.
- `src/lib/editor/assets.svelte.ts` — bibliothèque d'images en `localStorage`, **plafond 24**, tout
  en try/catch (quota).
- Le JSON de projet **ne contient pas** les illustrations `/art/...`, seulement leurs chemins : il
  n'est rechargeable que servi par un Tarotier.

## Contraintes machine

La box de développement est le serveur de production, et la RAM est la vraie limite :

- 1,9 Gi de RAM pour une somme de `MemoryMax` de services déjà supérieure à la RAM physique.
  nginx, gunicorn (spacedice), uptime-kuma, linkding, meilisearch, memcached y tournent.
- La session interactive `k1000` est plafonnée (`MemoryHigh=800M`, `MemoryMax=1200M`) et ce plafond
  est **partagé avec Claude Code lui-même**. Les builds Vite/SSR tournent dessous.
- `earlyoom` est actif avec `--prefer ^(gunicorn|node|python3|claude|meilisearch)$` : un `node`
  gourmand est une **cible de kill prioritaire**.

En pratique : builds ponctuels, jamais de `npm run dev` laissé en vie, et vérifier qu'on ne laisse
pas de process fantôme (`pgrep -af 'vite|esbuild|node'`, `free -m`).

## Documents du dépôt

| Fichier | Statut |
|---|---|
| `ARCHITECTURE.md` | **Référence.** Cible, feuille de route, principes de décision, questions ouvertes. |
| `TODO.md` | Chantiers restants : multi-sélection, unification du Document Model, impression pro, deck « Libre » paramétrable. |
| `ART-CREDITS.md` | Provenance/licence des assets. À tenir à jour. |
| `analyse-gpt.md` | **Note externe d'un autre LLM**, conservée pour mémoire et explicitement prise avec recul dans `ARCHITECTURE.md` §3 (risque de sur-ingénierie). Ce n'est pas une feuille de route. |
| `README.md` | **Obsolète et trompeur** : c'est le README par défaut de `create-vite`, il ne dit rien de Tarotier. Ne pas s'y fier. |
| `belote.md` | Brief d'origine de **Belotier** (voir la section dédiée plus bas). Implémenté. |

## Belotier — le jeu de belote (second produit du dépôt)

`belotier.e1000.dev`. Belote classique à 4, une seule table, servie depuis le même
dépôt mais **avec un backend** : c'est la seule entorse assumée à la règle « statique
seul », imposée par le fait qu'un jeu à information cachée exige un arbitre.

```
belote/        front Svelte 5 (app indépendante, vite.belote.config.ts, meme node_modules)
server/        serveur Python 3.12 + websockets (venv local, hors dépôt)
  rules/       moteur de règles PUR : cards, deal, bidding, legal, trick, scoring
  table.py     machine à états de la table
  app.py       serveur WebSocket (socket unix)
deploy/        belotier.service, belotier-nginx.conf, setup/deploy/check/links
```

**Trois invariants à ne pas casser :**

1. **Le serveur est l'arbitre.** Il valide chaque coup et envoie à chaque joueur sa
   liste `playable`. Le client n'embarque **aucune** règle de belote — ne l'y
   réintroduis pas « pour l'ergonomie ».
2. **`table.state_for(seat)` est le seul endroit où une main est sérialisée.** C'est
   le point unique à auditer pour la confidentialité. `public_state()` n'en contient
   aucune. Un test vérifie qu'aucune trame ne révèle la main d'un autre.
3. **Les identifiants de cartes sont ceux de Tarotier** (`cardId()`). Ils relient le
   moteur Python, les images pré-rendues et le client. `server/tests/test_assets.py`
   vérifie ce contrat entre les trois.

**Commandes :**

```bash
python3 -m unittest discover -s server/tests -t server   # 55 tests, sans réseau
server/.venv/bin/python -u server/tests/cli_game.py      # partie complète à 4, en 1 process
./belote/gen-cards.sh                                    # re-rendre les cartes (lent)
./deploy/deploy-belotier.sh                              # tests + build + mise en ligne
./deploy/check-belotier.sh                               # santé + chasse aux process fantômes
./belote/ui-check.sh                                     # vérification en navigateur réel
./belote/check-tokens.sh                                 # jetons CSS (lancé par le déploiement)
./belote/fetch-assets.sh                                 # re-télécharger polices + icônes (rare)
```

**Vérifier dans un vrai navigateur.** La box n'a pas d'interface graphique, mais un
Chromium headless y est installé (`~/.cache/ms-playwright`, ~900 Mo). `belote/ui-check.sh`
ouvre quatre fenêtres mobiles, prend les quatre places, joue une donne et capture des
écrans dans `/tmp/belotier-shots`, en signalant erreurs console, requêtes échouées et
tout « undefined » affiché, puis fait une passe sur `/template`.
**C'est le seul contrôle qui voit ce que voit un joueur** :
il a déjà attrapé un plantage au rendu, un champ d'événement erroné et un éventail de
cartes rogné hors de l'écran — trois bugs invisibles pour le typage et les tests.
Quatre pièges du harnais : les cartes ont une animation de flottement infinie, donc
Playwright ne les juge jamais « stables » (utiliser `force: true`) ; le dossier
`belote/` n'est **pas** couvert par `tsconfig.app.json` — d'où `tsconfig.belote.json`,
désormais lancé par le script de déploiement ; une capture `fullPage` d'une page
longue et animée expire (passer `animations: 'disabled'`) ; et `hasText` matche les
**descendants**, si bien qu'un sélecteur trop large tapait la tuile de démo
« cachet de cire, en service » au lieu du bouton d'effet — d'où l'assertion
« exactement une correspondance ».

### Direction artistique « Grimoire / Marseille »

Noir fumé et brun encre, or mat et oxblood, cuir et chandelle. Les jetons sont
dans `belote/src/app.css`, les courbes dans `easings.css`. **Nuancier complet,
catalogue d'animations, boutons, icônes et sons : `belotier.e1000.dev/template`**
(`belote/template/`, seconde entrée Vite, bundle séparé). Cette page importe les
*vrais* composants, affiche la source et la licence de chaque élément, et porte
la seule section que rien d'automatique ne peut vérifier : **les sons**.

Quatre pièges coûteux, tous rencontrés :

1. **Un `var(--token)` inconnu est ignoré en silence.** Ni `tsc` ni
   `svelte-check` ne le voient ; le résultat est du texte couleur de son fond.
   Renommer la palette avait cassé 17 références. D'où `check-tokens.sh`, lancé
   par `deploy-belotier.sh`. Il n'y a **plus de jeton `--ink`** : les fonds sont
   `--void` / `--bister`, pour qu'une référence périmée casse visiblement.
2. **Pirata One est une blackletter : ses chiffres sont illisibles** (son zéro
   ressemble à un domino). Son `@font-face` **exclut `U+0030-0039`** par
   `unicode-range`, et les chiffres retombent sur Cinzel — une règle, tous les
   scores réglés, y compris dans du texte pas encore écrit.
3. **Les polices doivent être les sous-ensembles `latin`, pas `latin-ext`** :
   voir le piège n°5 plus haut. `fetch-assets.sh` l'assère en développant les
   plages de `fc-query` (un `grep` littéral de `30-3b` échoue : la plage réelle
   est `20-7e`).
4. **`prefers-reduced-motion` : une durée de `.01ms` sur une animation infinie
   la fait boucler des milliers de fois par seconde** au lieu de l'arrêter. Les
   trois animations infinies (chandelle, rose des vents, foil) sont coupées
   explicitement par `animation: none`.

Les enseignes viennent de `src/lib/render/suits.ts` de Tarotier via
`belote/src/Suit.svelte` — variantes `epee` / `coupe` / `denier` / `baton`, les
quatre enseignes du tarot latin. `SUIT_GLYPH` (`♠♥♦♣`) **subsiste mais n'est plus
affiché** : il ne sert qu'aux `aria-label`, où un lecteur d'écran a besoin de
caractères et non de SVG.

Aucune bibliothèque de boutons ou d'animations CSS n'est utilisée : les cinq
candidates examinées ont une licence restreinte, introuvable, ou sont
inaccessibles à une récupération automatique. Voir `ART-CREDITS.md`, et ne pas
en réintroduire une sans vérifier les deux points.

**Pièges spécifiques :**

- **La table n'a pas de propriétaire** : pas de clé, pas d'invitation. Le salon montre
  l'occupation en direct et on clique une place libre ; `/s/<siège>` ne sert qu'à
  retrouver sa chaise au rechargement. Une première version utilisait des liens à clé,
  ce qui faisait du premier arrivé le détenteur de la table — n'y reviens pas.
- **La table se vide d'elle-même quand le dernier joueur part**, sinon un nouveau
  visiteur tombe sur quatre chaises « reprendre X » pendant tout le délai de grâce.
- **Le balayage du pli est réarmé dans `push()`**, pas aux points d'appel. Un joueur
  qui se déconnecte pendant l'affichage du pli annule le balayage ; sans ce
  réarmement centralisé la table reste bloquée à vie en `trick_done`.
- **Les sons sont synthétisés en WebAudio** (`belote/src/sfx.svelte.ts`), sans aucun
  fichier audio. Un navigateur refuse de démarrer l'audio hors geste utilisateur :
  c'est le bouton « Rejoindre la table » qui appelle `unlock()`.
- **Les cartes sont pré-rendues au build**, jamais par le serveur. Les régénérer
  suppose de respecter les contraintes librsvg décrites plus haut.
- Les variantes régionales de la belote sont dans `rules/legal.Variants` et
  `rules/scoring.ScoreVariants`, pas en dur.

## Principes de décision du projet

Repris de `ARCHITECTURE.md` §7, à appliquer avant d'ajouter une dépendance ou de réécrire :
client-side ; compatible Svelte+TS+Vite ; **sans backend** ; vectoriel quand possible ; conserver les
assets sources ; modèle indépendant du renderer ; sobre en RAM/CPU ; tenir la carte seule comme le
deck de 78 ; ne pas enfermer Tarotier dans le Tarot ; et **ne rien généraliser tant qu'un second cas
d'usage concret ne l'exige pas**.

## Git

Remote `origin` = `git@github.com:Zugwang/tarot-card-generator.git` (public), en **SSH** : Claude ne
peut pas pousser, c'est l'utilisateur qui fait `git push`. Committer localement sur `main` est la
pratique en place (la branche est actuellement en avance sur `origin/main`). Le dépôt ne contient
aucun secret ; les gros fichiers sources (`*.zip`, `*.pdf`) sont gitignorés.
