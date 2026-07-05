# Yakari sur l'île — v2 « plateau »

Deuxième version du jeu : même épisode (« Les prisonniers de l'île », EP17),
mais un gameplay façon **Pokémon sur Game Boy Color** : vue de dessus, on déplace
Yakari case par case sur des plateaux, la caméra suit, et on interagit en
marchant contre les personnages et les objets.

## Comment lancer le jeu

Double-cliquer sur `index.html`. Aucun compte, aucune installation, aucune
connexion nécessaire. Recharger la page recommence l'aventure de zéro (voulu).

## Comment jouer

- **Clavier** : flèches (ou ZQSD / WASD).
- **Tactile** : croix directionnelle en bas à droite, **ou toucher directement
  une case de la carte** — Yakari s'y rend tout seul (pratique pour les petits).
- On interagit en **marchant contre** : contre Petit Tonnerre pour le caresser,
  contre une branche pour l'enlever, contre le lynx pour lui faire peur...
- La **flèche jaune qui rebondit** montre toujours l'objectif en cours.

## Les plateaux (fidèles à l'épisode)

1. **Le village sous la pluie** — réveiller Petit Tonnerre (3 caresses), monter
   sur son dos, sortir du village.
2. **Le chemin de la colline** — à cheval entre les grosses flaques jusqu'à la
   grotte secrète d'Arc-en-ciel.
3. **L'île** — au matin, l'eau a tout recouvert : prisonniers ! Ramasser les
   4 morceaux de bois sec, allumer le feu, envoyer les signaux de fumée.
4. **Le petit élan** — enlever les 4 branches du trou, aller chercher l'attelle
   près de la grotte, soigner sa patte cassée.
5. **La nuit** — Grand Aigle a prévenu : « une île n'est pas toujours déserte ».
   Retrouver le lynx dans le noir (3 fois) pour le faire fuir.
6. **La traversée** — l'eau a baissé : franchir le gué de pierres sur le dos de
   maman élan, avec Petit Tonnerre qui suit, jusqu'à papa. BRAVO !

Durée : environ 10 minutes.

## Pensé pour jouer avec un enfant

- Narration écrite ET lue à voix haute (synthèse vocale fr du navigateur),
  bouton 🗣️ pour réécouter, 🔊 pour couper.
- Aucun échec possible, pas de chrono, pas d'ennemi qui attaque.
- Le toucher-pour-y-aller calcule le chemin tout seul (BFS) et « touche » la
  cible à l'arrivée : un enfant peut jouer rien qu'en tapant sur ce qui brille.
- Une plume s'allume à chaque plateau réussi (6 en tout).

## Technique

- HTML/CSS/JS pur, zéro dépendance, zéro build. Canvas 480×320 mis à l'échelle
  (rendu pixelisé volontaire, esprit Game Boy Color).
- Cartes déclarées en ASCII (une lettre = une case) dans `game.js`.
- La logique avance sur un minuteur séparé du rendu : le jeu ne se fige pas si
  le navigateur met les animations en pause.
- Effets : pluie, nuit avec halos de lumière (feu + Yakari), aube, fumée, cœurs.
