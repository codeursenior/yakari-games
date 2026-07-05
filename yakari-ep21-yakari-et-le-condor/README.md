# Yakari et le condor — EP21 « plateau »

Jeu tiré de l'épisode 21 « Yakari et le condor » : au printemps, la rivière
des castors est presque à sec. Grand Aigle souffle l'énigme — « celui qui a la
tête dans les nuages connaît la source » — et Yakari part dans la montagne,
rencontre le condor et fait revenir l'eau.

Gameplay façon **Pokémon sur Game Boy Color** : vue de dessus, déplacement
case par case, caméra qui suit, et on interagit en marchant contre les
personnages et les objets. Même moteur que `yakari2/`.

## Comment lancer le jeu

Double-cliquer sur `index.html`. Aucun compte, aucune installation, aucune
connexion nécessaire. Recharger la page recommence l'aventure de zéro (voulu).

## Comment jouer

- **Clavier** : flèches (ou ZQSD / WASD).
- **Tactile** : croix directionnelle en bas à droite, **ou toucher directement
  une case de la carte** — Yakari s'y rend tout seul (pratique pour les petits).
- On interagit en **marchant contre** : contre la marmotte pour la caresser,
  contre une boule de neige pour la pousser, contre le condor pour lui parler...
- La **flèche jaune qui rebondit** montre toujours l'objectif en cours.

## Les plateaux (fidèles à l'épisode)

1. **La rivière endormie** — c'est le printemps mais la marmotte dort encore
   (3 caresses pour la réveiller), puis le castor explique : presque plus
   d'eau, les castors ont fait un barrage pour garder la dernière eau.
2. **L'énigme de Grand Aigle** — « celui qui a la tête dans les nuages connaît
   la source ». Monter sur Petit Tonnerre et partir vers la montagne.
3. **Le sentier de la montagne** — grimper les corniches enneigées à cheval ;
   une avalanche bloque le chemin de 4 boules de neige à pousser ; tout en
   haut, la rencontre du condor, l'oiseau-tonnerre.
4. **Sur le dos du condor** — Petit Tonnerre redescend, Yakari vole dans le
   ciel ! Dire bonjour aux 2 chèvres des montagnes, puis descendre vers le
   ruisseau.
5. **Le rocher têtu** — un rocher d'avalanche bloque le ruisseau. Trop lourd !
   Apporter 3 pierres qui brillent au condor, qui les lâche du ciel : raté,
   presque... BOUM ! L'eau coule à nouveau.
6. **La fête des castors** (aube) — le condor a redéposé Yakari près de la
   rivière, « endormi comme après un rêve ». Faire la fête avec les 2 castors,
   retrouver Petit Tonnerre, puis Grand Aigle : « je suis fier de toi ». BRAVO !

Durée : environ 10 minutes.

## Pensé pour jouer avec un enfant de 3 ans

- Narration écrite ET lue à voix haute (synthèse vocale fr du navigateur),
  bouton 🗣️ pour réécouter, 🔊 pour couper.
- Aucun échec possible, pas de chrono, pas de game over : les « ratés » des
  lâchers de pierres sont scénarisés et rigolos (pouf !).
- Le toucher-pour-y-aller calcule le chemin tout seul (BFS) et « touche » la
  cible à l'arrivée : un enfant peut jouer rien qu'en tapant sur ce qui brille.
- Une plume s'allume à chaque plateau réussi (6 en tout).

## Technique

- HTML/CSS/JS pur, zéro dépendance, zéro build. Canvas 480×320 mis à l'échelle
  (rendu pixelisé volontaire, esprit Game Boy Color).
- Cartes déclarées en ASCII (une lettre = une case) dans `game.js`.
- La logique avance sur un minuteur séparé du rendu : le jeu ne se fige pas si
  le navigateur met les animations en pause.
- Ambiances : neige, ciel et nuages, eau qui revient dans le lit sec, aube.
