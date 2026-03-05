# 🌌 Night Sky Viewer

Bienvenue sur le **Night Sky Viewer**, une application Fullstack immersive permettant l'exploration spatiale géolocalisée et la visualisation des 88 constellations depuis la Terre au travers du temps !

Construit au croisement de l'ingénierie logicielle avancée et de l'astronomie open source. 🚀

## 📋 Fonctionnalités Principales

- 🌍 **Globe Interactif 3D** :  
  Un globe terrestre interactif et performant (textures PBR 8K/2K, Shaders WebGL optimisés) permettant de naviguer et de sélectionner votre zone idéale d'observation astrale (villes majeures, observatoires mondiaux) d'un simple clic.
- 💫 **Nativité Céleste (Moteur Étoilé)** :  
  Naviguez dans le Mode _Night Sky_. Le système plonge votre caméra virtuellement et dessine en temps réel la voûte céleste (calculs Alt/Az exacts et dynamiques en backend). Le ciel abrite plus de 5000 étoiles dotées de shaders personnalisés pour émettre des couleurs spectrales réalistes et simuler visuellement la luminosité et la taille par magnitude.
- 🌠 **Recherche de Constellations et Autopilot** :  
  Localisez n'importe quelle constellation officielle (ex: _Orion, Ursa Major_). Au moyen d'algorithmes mathématiques implémentés coté backend, l'application calculera instantanément **le point de vue au monde où l'altitude de la constellation cible est maximale**, y voyagera et vous en dessinera le croquis céleste en fil de néon 3D.
- ⏳ **Translation Temporelle (Time Slider)** :  
  Ajustez la date et l'heure du Ciel Nocturne à n'importe quel moment passé ou futur au sein de l'Interface Utilisateur (Bottom Sheet Overlay) et revivez l'expérience planétaire.

## 🛠️ Stack Technologique

Le projet a respecté des normes d'architecture strictes tout au long de sa construction.

### Backend (Python)

- **FastAPI** avec Uvicorn : Infrastructure asynchrone pour la réception d'APIs.
- **SQLAlchemy / SQLite** : Base de données hébergeant le catalogue `hipparcos` purifié (étoiles, points d'observation, lignes IAU de constellations).
- **Astropy / Skyfield** : Moteurs de calculs mathématiques lourds de coordonnées spatiales en fonction du temps et point de chute, gérés sous protocoles TDD (Pytest).

### Frontend (React + TypeScript)

- **Vite** : Bundleur ultra-rapide.
- **React-Three-Fiber & Drei** : Couches abstraites de `Three.js` rendant le développement de shaders (BufferGeometry, materials) déclaratif et lié au cycle de vie de React.
- **Zustand** : Management de l'état asynchrone léger et performant (sans Redux).

## 🚀 Lancement du Projet

L'application est découpée en deux espaces distincts :

#### 1. Démarrer l'API (Backend)

Dans le dossier `backend/` :

```bash
python -m venv venv
venv\Scripts\activate      # (Sur Windows)
pip install -r requirements.txt
uvicorn app.main:app --reload
```

_Le serveur démarrera sur `http://localhost:8000`._

#### 2. Démarrer l'Interface (Frontend)

Dans le dossier `frontend/` :

```bash
npm install
npm run dev
```

_Le client web est testé et fonctionne sur `http://localhost:5173`._

## 🌟 Polish & Qualité du Code

À terme de nos travaux (Semaines 1-11), nous avons ajouté :

- Une UI "Dark Space Theme" totalement responsive avec "Bottom Sheet" design for mobile.
- L'apparition fluide programmée au shader (Fade in) pour réduire l'agressivité rétinienne des objets célestes.
- Un Linter strict sans erreur TypeScript pour garantir une expérience de code de production.
