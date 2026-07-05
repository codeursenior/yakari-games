# Yakari et le grizzly — EP16

Jeu de plateau façon **Pokémon sur Game Boy Color** (vue de dessus, déplacement
case par case, caméra qui suit, on interagit en marchant contre les choses),
sur le modèle de `yakari2/`. Il retrace l'épisode 16 « Yakari et le grizzly » :
le grizzly qui terrorise la forêt et rançonne les loutres, le conseil de Grand
Aigle (« ruse et patience surpassent la force »), l'hibernation, la poussée du
dormeur sur la glace jusqu'à l'île, puis la promesse et la leçon de natation
au printemps.

## Comment lancer le jeu

Double-cliquer sur `index.html`. Aucun compte, aucune installation, aucune
connexion nécessaire. Recharger la page recommence l'aventure de zéro (voulu).

## Comment jouer

- **Clavier** : flèches (ou ZQSD / WASD).
- **Tactile** : croix directionnelle en bas à droite, **ou toucher directement
  une case de la carte** — Yakari s'y rend tout seul (pratique pour les petits).
- On interagit en **marchant contre** : contre le grizzly pour le pousser,
  contre une loutre pour la consoler, contre Grand Aigle pour l'écouter...
- La **flèche jaune qui rebondit** montre toujours l'objectif en cours.

## Les plateaux (fidèles à l'épisode)

1. **Le bois silencieux** — c'est l'automne, et plus un bruit dans la forêt !
   À dos de Petit Tonnerre, inspecter les 3 terriers vides qui scintillent :
   tous les animaux se sont enfuis.
2. **La rivière** — l'énorme grizzly se fait apporter des poissons par les
   loutres (« c'est le quinzième ! »). Consoler les 3 animaux apeurés (les
   deux loutres et le lièvre) ; marcher contre le grizzly déclenche juste un
   gros « GRRR » rigolo.
3. **Grand Aigle** — monter au rocher écouter le conseil : « ruse et patience
   surpassent la force, l'hiver t'apportera la solution »... et la neige se
   met à tomber.
4. **L'hiver** — le grizzly gavé tombe de sommeil : le toucher doucement
   (2 fois) pour l'endormir, puis tester la glace du lac en marchant sur les
   3 étoiles qui brillent.
5. **La nuit** — avec les loutres, pousser le gros dormeur qui glisse sur la
   glace (3 poussées) jusqu'à l'île. « Bonne nuit, grosse truite ! » Halos de
   lumière dans le noir autour de Yakari et du grizzly.
6. **Le printemps** — la glace a fondu, le grizzly est cerné par l'eau et ne
   sait pas nager. Embarquer dans le canoë avec la petite loutre, obtenir sa
   promesse (« plus jamais faire peur aux animaux ! »), l'aider à nager
   (« une ! et deux ! »), puis rejoindre le festin devant sa grotte. BRAVO !

Durée : environ 10 minutes.

## Pensé pour jouer avec un enfant de 3 ans

- Narration écrite ET lue à voix haute (synthèse vocale fr du navigateur),
  bouton 🗣️ pour réécouter, 🔊 pour couper.
- Aucun échec possible, pas de chrono, pas de game over : le grizzly ne
  poursuit jamais personne, une erreur fait au pire « pouf » ou « splash ».
- Le toucher-pour-y-aller calcule le chemin tout seul (BFS) et « touche » la
  cible à l'arrivée : un enfant peut jouer rien qu'en tapant sur ce qui brille.
- Une plume s'allume à chaque plateau réussi (6 en tout).
- Mécaniques variées mais toujours simples : inspecter ce qui scintille,
  consoler en marchant contre, endormir, marcher sur les étoiles de la glace,
  pousser le dormeur, ramer en canoë, aider à nager.

## Technique

- HTML/CSS/JS pur, zéro dépendance, zéro fichier externe. Canvas 480×320 mis
  à l'échelle (rendu pixelisé volontaire, esprit Game Boy Color).
- Cartes déclarées en ASCII (une lettre = une case) dans `game.js` : le bois
  d'automne, la rivière, la clairière de Grand Aigle, le lac gelé (jour, puis
  nuit) et le lac de printemps — même relief gelé/dégelé, l'eau `w` ne devient
  franchissable qu'en canoë.
- La logique avance sur un minuteur (`setInterval`) séparé du rendu
  (`requestAnimationFrame`), sur le temps absolu (`performance.now()`) :
  le jeu ne se fige pas si le navigateur met les animations en pause.
- Effets : neige, nuit avec halos de lumière, aube, cœurs, pouf, étincelles,
  éclaboussures ; grizzly dessiné en 5 poses (assis, endormi, debout, nageur,
  joyeux).

## Moteur partagé

Ce jeu utilise le moteur commun [`../yakari-engine/`](../yakari-engine/engine.js)
(rendu, déplacement case par case, BFS toucher-pour-y-aller, audio, voix,
effets, plumes, overlay). Le dossier du jeu ne contient que ses cartes, ses
sprites et ses phases (`game.js`). Il se lance toujours en double-cliquant
`index.html`, tant que le dossier `yakari-engine/` est présent à côté.
