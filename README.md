# Les jeux Yakari 🪶

Quatre jeux navigateur façon **Pokémon sur Game Boy Color** (vue de dessus,
déplacement case par case, caméra qui suit, on interagit en marchant contre
les choses), un par épisode du dessin animé Yakari. Pensés pour une enfant de
3 ans qui joue avec un parent : aucun échec possible, narration lue à voix
haute, toucher-la-carte pour se déplacer, une plume par plateau réussi.

## Les jeux

| Épisode | Jeu | Dossier |
|---|---|---|
| EP16 | Yakari et le grizzly | [`yakari-ep16-yakari-et-le-grizzly/`](yakari-ep16-yakari-et-le-grizzly/) |
| EP17 | Yakari sur l'île (Les prisonniers de l'île) | [`yakari-ep17-les-prisonniers-de-l-ile/`](yakari-ep17-les-prisonniers-de-l-ile/) |
| EP21 | Yakari et le condor | [`yakari-ep21-yakari-et-le-condor/`](yakari-ep21-yakari-et-le-condor/) |
| EP23 | Le mystère de la falaise | [`yakari-ep23-le-mystere-de-la-falaise/`](yakari-ep23-le-mystere-de-la-falaise/) |

`index.html` à la racine est le menu qui les rassemble.

## Comment jouer

- **En ligne** : le site est déployé sur GitHub Pages.
- **En local** : double-cliquer sur `index.html` (le menu) ou sur le
  `index.html` d'un jeu. Aucun compte, aucune installation, aucun build.
- **Clavier** : flèches (ou ZQSD / WASD). **Tactile** : croix directionnelle,
  ou toucher directement une case — Yakari s'y rend tout seul (BFS).
- Recharger la page recommence l'aventure de zéro (voulu, pas de sauvegarde).

## Architecture : yakari-engine

Le moteur commun vit dans [`yakari-engine/`](yakari-engine/) :

- `engine.js` — rendu canvas 480×320, déplacement case par case (200 ms),
  interactions par bump (anti-rebond 380 ms), toucher-pour-y-aller avec BFS
  qui « touche » automatiquement une cible solide à l'arrivée, caméra clampée
  15×10 tuiles, audio WebAudio généré, voix speechSynthesis fr-FR, effets
  (cœurs, pouf, étincelles, fumée, éclaboussures), météo (pluie, neige), nuit
  avec halos, aube, plumes de progression, overlay titre/victoire, logique
  sur `setInterval` + `performance.now()` séparée du rendu
  `requestAnimationFrame`.
- `style.css` — habillage partagé (cadre, croix tactile, bandeau de
  narration, overlay).

Chaque jeu ne contient plus que **ses** cartes ASCII (une lettre = une case),
**ses** sprites en primitives canvas et **ses** phases/quêtes, dans un seul
`game.js` chargé après `engine.js` (scripts classiques, variables partagées).

Points d'extension offerts par le moteur :

- `SOLID_TILES = "..."` — les lettres de cases solides du jeu ;
- `drawTile(chr, x, y, px, py, t)` — dessin des cases (obligatoire) ;
- `drawPlayerSprite(...)` — à redéfinir si Yakari a des montures ;
- `Object.assign(sfx, {...})` — sons supplémentaires ;
- `tileSolidHook` — solidité conditionnelle (ex : lac franchissable en canoë) ;
- `logicTickHook` — logique périodique (ex : fumée du volcan) ;
- `renderOverlayHook` — teinte plein écran (ex : éruption) ;
- `lightPos` et `{glow: true}` sur une entité — halos dans la nuit ;
- `startEngine(startPhase1)` — à appeler en fin de `game.js`.

## Créer un nouveau jeu d'épisode

1. Copier un dossier de jeu existant (`index.html` + `game.js` + `README.md`).
2. Dans `index.html` : changer titre, favicon et textes de l'overlay.
3. Dans `game.js` : remplacer cartes, sprites, phases et narrations.
4. Vérifier les pièges connus : chaque objectif atteignable en BFS, premier
   objectif visible caméra au spawn (vue 15×10), temps absolu uniquement.
5. Ajouter la carte du jeu dans le menu (`index.html` à la racine).

## Histoire du dépôt

Le premier commit contient les 4 jeux d'origine (chacun avec son moteur
copié-collé), tels qu'ils existaient dans le workspace Elrond. Le second
commit est le refactoring : extraction du moteur commun `yakari-engine/` et
renommage des dossiers par épisode.
