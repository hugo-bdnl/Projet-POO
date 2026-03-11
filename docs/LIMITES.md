# Limites de la Simulation du Système Solaire

Ce document détaille les limitations techniques et mathématiques qui surviennent lorsque le temps est accéléré de façon extrême dans la simulation du système solaire. Il explique le phénomène visuel des planètes qui "dérivent" et sortent de leur orbite tracée.

## 1. Orbites Statiques vs. Positions Dynamiques

Dans l'application (utilisant React Three Fiber), une optimisation majeure de performance a été mise en place :
- **Le tracé visuel de l'orbite** (l'ellipse blanche pour chaque planète) n'est calculé qu'**une seule fois**, à la date d'initialisation (e.g., l'année 2026).
- **La position tridimensionnelle de la planète**, calculée et mise à jour à chaque affichage (`useFrame`), évolue dans le temps au fil de la simulation.

### La Précession Orbitale
Dans la réalité physique, les orbites des planètes ne sont pas des boucles parfaites et fixes. Sous l'influence gravitationnelle des autres planètes, ces trajectoires subissent de très lentes déformations et rotations au fil des millénaires (précession du périhélie, variation séculaire...).

La bibliothèque astronomique utilisée (`astronomia` basée sur VSOP87) est extrêmement précise et prend en compte ces perturbations gravitationnelles à long terme. Par conséquent, lorsqu'on accélère le temps à vitesse "absurde", propulsant la simulation des centaines ou milliers d'années dans le futur :
1. La planète suit rigoureusement sa *nouvelle* véritable orbite décalée.
2. La ligne blanche de l'orbite, figée pour des raisons de performance graphiques, correspond toujours à la géométrie de l'époque initiale.

Au fil du temps, le fossé se creuse entre la traînée dessinée en 2026 et l'orbite réelle de l'an 5000, donnant l'impression que la planète a "décroché" de sa trajectoire.

## 2. Limites du Modèle Mathématique (VSOP87)

Le moteur de calcul des éphémérides planétaires repose sur la théorie VSOP87 (Variations Séculaires des Orbites Planétaires). Ce modèle utilise des séries d'équations polynomiales complexes pour déterminer la position exacte des planètes sans nécessiter d'intégrations numériques lourdes en temps réel.

- **Plage de Haute Précision :** L'algorithme a été conçu pour être extrêmement précis sur la période historique allant approximativement de **-4000 avant J.-C. à +8000 après J.-C.**
- **Divergence Mathématique (L'Espace Profond) :** Si la vitesse de la simulation propulse la date bien au-delà de ces bornes temporelles (ex: l'an 20 000), les polynômes perdent tout sens physique et les variables mathématiques divergent vers l'infini. Les positions renvoyées par la fonction envoient alors la planète dériver de façon exponentielle au milieu du néant.

## 3. Limites de l'Environnement JavaScript

En poussant la simulation à des valeurs véritablement extrêmes (passé l'an ~275 000), on atteint la limite technique absolue de l'objet natif `Date` en JavaScript, fixé à `8 640 000 000 000 000` millisecondes depuis l'époque (1er Janvier 1970). Au-delà, l'objet devient invalide (`Invalid Date`), et tous les calculs d'éphémérides dépendants d'un "Julian Day" s'effondrent d'un coup.

## Conclusion

Ce comportement inattendu à très haute vitesse est paradoxalement une excellente nouvelle :
C'est la preuve palpable que la simulation repose sur des fondations mathématiques astronomiques réelles et historiques (la précession) qui se heurtent simplement aux limitations d'une optimisation de rendu statique des lignes nécessaires à de bonnes performances 3D.
