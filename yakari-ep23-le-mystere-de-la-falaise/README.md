# Yakari et le mystère de la falaise — EP23

Jeu de plateau façon **Pokémon sur Game Boy Color** (vue de dessus, déplacement
case par case, caméra qui suit, on interagit en marchant contre les choses),
sur le modèle de `yakari2/`. Il retrace l'épisode 23 « Le mystère de la
falaise » : le squelette géant découvert dans la falaise, le rêve envoyé par
Grand Aigle, la rencontre avec Diatryma et Eohippus, et l'éruption du volcan
qui explique le mystère.

## Comment lancer le jeu

Double-cliquer sur `index.html`. Aucun compte, aucune installation, aucune
connexion nécessaire. Recharger la page recommence l'aventure de zéro (voulu).

## Comment jouer

- **Clavier** : flèches (ou ZQSD / WASD).
- **Tactile** : croix directionnelle en bas à droite, **ou toucher directement
  une case de la carte** — Yakari s'y rend tout seul (pratique pour les petits).
- On interagit en **marchant contre** : contre Diatryma pour le caresser,
  contre le squelette pour l'observer, contre Grand Aigle pour lui parler...
- La **flèche jaune qui rebondit** montre toujours l'objectif en cours.

## Les plateaux (fidèles à l'épisode)

1. **La plage inconnue** — la rivière a emporté Yakari, Arc-en-ciel et Petit
   Tonnerre jusqu'à une plage au pied d'une falaise. Ramasser les 3 morceaux
   de bois qui brillent et allumer le feu pour sécher les vêtements.
2. **Le squelette géant** — toucher le squelette dans la falaise : un oiseau
   géant... sans ailes ! Puis attraper le poisson qui brille dans l'eau et
   l'apporter à Arc-en-ciel pour le dîner.
3. **La nuit** — une lumière dans le noir (halos autour du feu et de Yakari) :
   Grand Aigle est venu répondre aux questions de Yakari et l'emmène en voyage.
4. **Le rêve** — Yakari se réveille au temps des volcans. Saluer Diatryma,
   l'ancêtre des oies sauvages (3 caresses), puis monter sur son dos.
5. **Eohippus** — au point d'eau, le minuscule cheval des premiers temps (des
   doigts à la place des sabots !) lance un défi : la course jusqu'au drapeau.
   Puis aller boire au point d'eau... et le sol se met à trembler.
6. **L'éruption** — la lave coule du volcan ! Rejoindre Grand Aigle à dos de
   Diatryma (« tout ceci n'est qu'un rêve »), puis se réveiller à l'aube sur
   la plage et raconter le voyage aux amis. BRAVO !

Durée : environ 10 minutes.

## Pensé pour jouer avec un enfant de 3 ans

- Narration écrite ET lue à voix haute (synthèse vocale fr du navigateur),
  bouton 🗣️ pour réécouter, 🔊 pour couper.
- Aucun échec possible, pas de chrono, pas de game over : la lave ne touche
  jamais Yakari, le lynx n'existe pas, une erreur fait au pire « pouf ».
- Le toucher-pour-y-aller calcule le chemin tout seul (BFS) et « touche » la
  cible à l'arrivée : un enfant peut jouer rien qu'en tapant sur ce qui brille.
- Une plume s'allume à chaque plateau réussi (6 en tout).
- Mécaniques variées mais toujours simples : ramasser ce qui scintille,
  caresser en marchant contre, apporter un objet, courir jusqu'au drapeau,
  trouver une lumière dans le noir.

## Technique

- HTML/CSS/JS pur, zéro dépendance, zéro fichier externe. Canvas 480×320 mis
  à l'échelle (rendu pixelisé volontaire, esprit Game Boy Color).
- Cartes déclarées en ASCII (une lettre = une case) dans `game.js` :
  la plage sous la falaise (jour, nuit, aube) et la vallée préhistorique
  (rêve calme, puis éruption avec coulée de lave).
- La logique avance sur un minuteur (`setInterval`) séparé du rendu
  (`requestAnimationFrame`), sur le temps absolu (`performance.now()`) :
  le jeu ne se fige pas si le navigateur met les animations en pause.
- Effets : nuit avec halos de lumière, aube, teinte rouge d'éruption, fumée
  du cratère, cœurs, pouf, étincelles.
