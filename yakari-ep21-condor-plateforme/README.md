# Yakari et le condor — plateforme 🏹

Variante **jeu de plateforme** (façon Aladdin sur Mega Drive) de l'épisode 21
*Yakari et le condor*. Même scénario que la version vue de dessus
(`yakari-ep21-yakari-et-le-condor/`), mais en défilement horizontal, avec
saut, arc à flèches et... la possibilité de perdre !

## Les 6 niveaux (le scénario du condor)

1. **Le pré de la marmotte** — réveiller la marmotte qui a oublié le printemps.
2. **Le barrage du castor** — le castor n'a plus d'eau ; Grand Aigle donne
   l'énigme (« celui qui a la tête dans les nuages connaît la source »).
3. **La montagne enneigée** — Yakari prend son arc ; boules de neige
   grognonnes à chasser ; le condor attend au sommet.
4. **Dans les nuages** — saut de nuage en nuage, chèvres des montagnes à
   saluer, corbeaux grognons.
5. **Le ruisseau à sec** — guêpes, et le gros rocher qui bloque l'eau :
   trois flèches pour le casser.
6. **La fête de la rivière** — tour d'honneur, tous les amis à saluer.

## Règles de jeu

- **3 cœurs**, rechargés à chaque niveau. Toucher un ennemi ou tomber dans un
  trou coûte un cœur. À zéro cœur : **on recommence au niveau 1** (c'est la
  grande différence avec les autres jeux Yakari, qui sont sans échec).
- Le jeu reste **très facile** (pensé pour un enfant) : ennemis lents et peu
  nombreux, sauts courts, réapparition au dernier endroit sûr après une
  chute, invincibilité temporaire après un coup.
- **L'arc** arrive au niveau 3. Les **flèches sont limitées** (max 9) : on
  ramasse des carquois (+3 flèches) dans les niveaux. Sans flèche, on ne
  peut plus tirer. Au niveau 5, si on est à sec devant le rocher, Grand
  Aigle laisse tomber un carquois (anti-blocage).
- Les ennemis (dans certains niveaux seulement) : boules de neige (niv. 3),
  corbeaux (niv. 4), guêpes (niv. 5). Une flèche les fait disparaître en
  « pouf », sans violence. On peut aussi les écraser en sautant dessus.
- **Entre deux niveaux**, un extrait de 15-20 s de l'épisode (vidéo YouTube
  de la chaîne officielle « YAKARI OFFICIEL ») fait la transition. Les
  horodatages sont dans `CUTSCENES` en tête de `game.js` — à ajuster là si
  un extrait ne tombe pas sur la bonne scène. Le bouton « Continuer
  l'aventure » passe l'extrait à tout moment (et rien ne bloque si la vidéo
  est indisponible).
- La narration vocale prend une voix grave et posée, façon Grand Aigle
  (meilleure voix française masculine disponible sur l'appareil).

## Commandes

- **Clavier** : ← → pour courir, ↑ / Espace / Z pour sauter, X / C / K pour
  tirer une flèche.
- **Tactile** : boutons ◀ ▶ à gauche, 🏹 et ⬆ à droite (affichés
  automatiquement sur écran tactile).

## Architecture

Contrairement aux 4 jeux d'épisode, ce jeu **n'utilise pas
`yakari-engine/`** (pensé pour la vue de dessus case par case). Tout le
moteur de plateforme est autonome dans `game.js` : physique (gravité, saut
variable, coyote time, plateformes traversables par dessous), caméra
horizontale, ennemis, projectiles, particules, thèmes de décor par niveau,
narration `speechSynthesis` et sons WebAudio (mêmes conventions que le
moteur commun).

Les niveaux sont construits par de petites fonctions (`ground`, `plat`,
`put`, `row`) sur une grille ASCII de 20 lignes — une lettre = une case de
16 px (légende en tête de `game.js`).
