# La piste des voleurs — épisode 56

Jeu de plateau façon **Pokémon sur Game Boy Color** (vue de dessus,
déplacement case par case, caméra qui suit, on interagit en marchant contre
les choses), qui retrace l'épisode 56 de Yakari, « La piste des voleurs ».
Pensé pour une enfant de 3 ans qui joue avec un parent.

## Comment lancer

Double-cliquer sur `index.html`. Aucun compte, aucune installation, aucun
build, aucun fichier externe : tout tient dans `index.html` + `game.js`
(+ le moteur commun `../yakari-engine/`).

- **Clavier** : flèches ou ZQSD.
- **Tactile** : croix directionnelle, ou toucher directement une case de la
  carte — Yakari s'y rend tout seul (BFS) et « touche » ce qui s'y trouve.
- Recharger la page recommence l'aventure de zéro (voulu, pas de sauvegarde).
- La flèche jaune qui rebondit montre toujours l'objectif en cours, la
  narration est lue à voix haute (voix française du navigateur), et une plume
  s'allume à chaque plateau réussi (6 en tout).

## Déroulé des plateaux

1. **Le village au matin** — On a volé l'objet sacré de la tribu dans le
   tipi de Roc Tranquille ! Écouter Roc Tranquille, puis Graine de Bison qui
   se vante d'être le meilleur pisteur, monter sur Petit Tonnerre et partir.
2. **La prairie** — Retrouver les 4 empreintes des voleurs qui scintillent
   pour découvrir la piste.
3. **La course vers la rivière** — Graine de Bison double Yakari au galop.
   Yakari veut aller trop vite et gronde Petit Tonnerre... qui s'en va,
   tout triste. La nuit tombe.
4. **La nuit** — Retrouver Petit Tonnerre dans le noir (halos de lumière) et
   se réconcilier en le caressant, puis traverser le gué.
5. **L'aube au marais** — Graine de Bison appelle au secours : Éclair Vif
   est coincé dans la boue. Yakari arrête la course pour apporter une grande
   branche et libérer le cheval.
6. **Le repaire des voleurs** — Faire une grosse peur aux deux voleurs
   endormis (ils détalent en « pouf »), reprendre l'objet sacré qui brille,
   puis le rapporter à Roc Tranquille au village. Papa Regard Droit est
   fier : le vrai honneur, ce n'est pas de gagner, c'est d'aider les autres.

## Choix de conception pour une enfant de 3 ans

- **Aucun échec possible** : pas de chrono, pas de game over, pas d'ennemi
  qui poursuit. Marcher dans une flaque ou la boue fait juste « splash ».
- **Un seul objectif à la fois**, montré par la flèche jaune qui rebondit,
  et rappelé par une narration courte lue à voix haute.
- **Interactions au contact** : tout se fait en marchant contre les
  personnages et les objets (pas de bouton d'action, pas de menu).
- **Toucher-pour-y-aller** : l'enfant peut simplement toucher ce qui brille,
  Yakari s'y rend et interagit tout seul.
- **La colère n'est jamais punie, elle se répare** : la dispute avec Petit
  Tonnerre se résout avec des caresses et des cœurs — c'est le cœur de
  l'épisode (l'honneur n'est pas dans la victoire mais dans l'amitié).
- **Les voleurs ne sont pas effrayants** : ils dorment en ronflant et
  s'enfuient en courant dès qu'on les touche, sans confrontation.
- Partie complète en une dizaine de minutes, six plumes à collectionner.
