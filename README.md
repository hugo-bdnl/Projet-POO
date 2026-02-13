# Projet-POO

## IA

Je m’appelle Hugo, j’ai 21 ans et je suis en Master « Traitement de l’information et exploitation de données ». Dans le cadre d’un projet de Programmation Orientée Objet (POO) pour mon master, je dois réaliser un projet Python en 3 mois.
Rôle attendu : Tu es un développeur senior, expert en applications web et en Python. Tu produis des recommandations de niveau professionnel, structurées, et orientées mise en œuvre. Quand du code sera demandé plus tard : il devra être de qualité professionnelle, avec des commentaires clairs et concis uniquement là où c’est nécessaire, et au début de chaque fonction je veux une documentation de style « @param », « @return », etc. (Pour l’instant, ne génère aucun code.)
Contexte / idée d’application :
Je souhaite développer une application web permettant d’afficher le ciel nocturne.

L’interface principale : un globe terrestre 3D que l’on peut faire tourner.
Sur le globe : différents points d’observation (emplacements).
Interaction : lorsqu’on clique sur un point d’observation, on s’y positionne et on voit le ciel nocturne « en direct » au-dessus (selon l’heure actuelle et la position géographique).
Volet latéral : permet de sélectionner une constellation.

Effet : l’application nous amène automatiquement au point d’observation au-dessus duquel la constellation se trouve à l’heure actuelle.
Effet visuel : la constellation sélectionnée est mise en surbrillance dans le ciel.


Interaction supplémentaire : possibilité de cliquer sur une étoile pour afficher ses informations (nom, caractéristiques, etc.).
Perspectives d’évolution : aller plus loin dans l’espace (au-delà du ciel local), afficher des nébuleuses, intégrer des images satellites avancées, etc.

Ce dont j’ai besoin (sans générer de code, uniquement une vision globale et un plan d’action détaillé) :

Données et APIs publiques


Indique précisément quelles APIs publiques ou bases de données ouvertes permettent de récupérer les données nécessaires :

Noms et informations sur les étoiles (caractéristiques, magnitude, distance si disponible, identifiants, etc.)
Informations sur les constellations (délimitations/contours, noms, étoiles principales associées)
Positions dans le ciel en fonction d’un temps t (calcul ou données) : ascension droite/déclinaison, azimut/hauteur depuis une position d’observation, prise en compte du temps (UTC / fuseaux), etc.
Coordonnées des points d’observation (ex : villes, lieux pré-définis, éventuellement géocodage)


Pour chaque source/API : indique ce qu’elle fournit, le format (si connu), les limites d’usage (quotas/clé API), et les avantages/inconvénients.
Si une partie doit être calculée plutôt que récupérée via API, explique clairement quoi calculer, pourquoi, et avec quelles bibliothèques.


Choix technologiques Frontend / Backend


Je souhaite utiliser Python pour le backend si possible, mais si une autre techno est plus optimisée pour ce cas d’usage, dis-le et justifie.
Fais un tableau comparatif des technos possibles (frontend et backend) en prenant en compte :

Performances globales (y compris appels API externes et éventuels calculs astronomiques)
Affichage 3D dynamique performant (globe + ciel nocturne + surbrillance)
Facilité de développement en 3 mois (complexité, écosystème, maturité)
Maintenabilité, qualité, structuration (POO)
Déploiement (coût, simplicité) et scalabilité raisonnable
Compatibilité avec bibliothèques 3D/astronomie et standards web


Propose une stack recommandée (et une alternative) adaptée au contexte projet/temps.


Librairies et briques existantes


Liste les bibliothèques (frontend et backend) qui peuvent aider :

Globe 3D / cartographie (rotation, points, interaction)
Rendu du ciel nocturne / étoiles / constellations
Calculs astronomiques (positions, transformations de coordonnées, temps)
Gestion des tuiles/cartes, géolocalisation, etc.


Pour chaque librairie : rôle, pertinence, avantages/limites, et comment elle s’intègre dans l’architecture.


Architecture recommandée


Décris l’architecture la plus adaptée au projet (composants, responsabilités, flux de données).
Inclure :

Schéma logique (description textuelle structurée) : frontend, backend, services externes (APIs), cache, base de données éventuelle.
Stratégie de cache (indispensable ou non ? quoi cacher ? durée ?)
Gestion du temps réel / “en direct” (rafraîchissement, fréquence, websockets ou polling si nécessaire)
Modèle de données (entités : étoile, constellation, observation point, etc.)
Endpoints / contrats d’API internes (sans code, juste description)
Gestion des erreurs et résilience (API externes indisponibles, quotas, latence)
Sécurité minimale (clé API, rate limiting, CORS, etc.) adaptée à un projet étudiant.




Plan détaillé de réalisation (sur 3 mois)


Fais un plan détaillé étape par étape (phases + jalons) :

MVP (fonctionnalités essentielles) puis itérations
Estimation du temps par phase (approximative)
Découpage en tâches concrètes (frontend, backend, intégration données, UI/UX)
Stratégie de tests (unitaires, intégration, tests UI si pertinent)
Risques principaux et mitigations
Livrables attendus à chaque jalon



Contraintes de réponse :

Ne génère aucun code pour le moment.
Le but est de visualiser l’ensemble des étapes et des choix techniques.
Réponds de façon structurée avec des sections claires et au moins :

1 tableau comparatif techno frontend/backend
1 liste d’APIs/bases de données publiques pertinentes
1 proposition d’architecture détaillée
1 plan de projet détaillé sur 3 mois

# Choix technos / fonctionnalités

