# 🌌 Night Sky Viewer

> Application web interactive de visualisation du ciel nocturne en temps réel.

Explorez le ciel étoilé depuis n'importe quel point du globe terrestre. Sélectionnez une ville, voyagez dans le temps, identifiez les constellations et découvrez les propriétés de chaque étoile — le tout dans un rendu 3D immersif.

---

## Aperçu

_Captures d'écran à venir après implémentation des composants visuels._

---

## Fonctionnalités

| Fonctionnalité                  | Description                                                             |
| ------------------------------- | ----------------------------------------------------------------------- |
| **Globe 3D interactif**         | Globe terrestre photoréaliste (textures NASA 8K) avec rotation libre    |
| **Points d'observation**        | 50 villes mondiales cliquables, dont des sites d'observatoires célèbres |
| **Ciel nocturne en temps réel** | 5000+ étoiles visibles avec couleurs spectrales réalistes               |
| **Détails étoiles**             | Clic sur une étoile → nom, magnitude, distance, type spectral           |
| **88 constellations**           | Sélection → navigation automatique + surbrillance du pattern            |
| **Slider temporel**             | Visualiser le ciel à n'importe quel moment passé ou futur               |
| **Points cardinaux**            | Orientation N/S/E/O dans la vue céleste                                 |
| **Effets visuels**              | Bloom, HDR, Voie lactée, couleurs spectrales réalistes                  |

---

## Architecture

### Vue d'ensemble

```
┌────────────────────────┐         ┌────────────────────────┐
│       Frontend         │  HTTP   │        Backend         │
│  React + Three.js      │ ◄─────► │  FastAPI + AstroPy     │
│  Vite + TypeScript     │  JSON   │  SQLAlchemy + SQLite   │
│  Port 5173             │         │  Port 8000             │
└────────────────────────┘         └────────────────────────┘
                                            │
                                            ▼
                                   ┌────────────────┐
                                   │   SQLite DB     │
                                   │  119k étoiles   │
                                   │  88 constellat. │
                                   │  50 villes      │
                                   └────────────────┘
```

### Architecture Backend (4 couches POO)

```
API Layer          →  FastAPI routers (stars, constellations, observation_points)
Service Layer      →  AstronomyService (calculs vectorisés), CacheService (TTLCache)
Repository Layer   →  StarRepository, ConstellationRepository, ObservationPointRepository
Model Layer        →  Star, Constellation, ConstellationStar, ObservationPoint (SQLAlchemy)
```

### Stack technique

| Couche              | Technologies                                                                        |
| ------------------- | ----------------------------------------------------------------------------------- |
| **Frontend**        | React 18, TypeScript, Vite 5, Three.js, React Three Fiber, Drei, Zustand, Axios     |
| **Backend**         | Python 3.11, FastAPI, Uvicorn, AstroPy 7.0, SQLAlchemy 2.0, Pydantic v2, cachetools |
| **Base de données** | SQLite (embarqué)                                                                   |
| **Infrastructure**  | Docker, Docker Compose                                                              |
| **Déploiement**     | Railway (backend), Vercel (frontend)                                                |

### Données

| Source                                                                 | Contenu                  | Licence        |
| ---------------------------------------------------------------------- | ------------------------ | -------------- |
| [HYG Database v3.7](https://github.com/astronexus/HYG-Database)        | 119 000 étoiles          | ODbL           |
| [Stellarium](https://github.com/Stellarium/stellarium)                 | Patterns constellations  | GPL v2         |
| [D3-Celestial](https://github.com/ofrohn/d3-celestial)                 | Limites constellations   | BSD            |
| [NASA Visible Earth](https://visibleearth.nasa.gov/)                   | Textures globe terrestre | Domaine public |
| [ESA Gaia](https://www.esa.int/Science_Exploration/Space_Science/Gaia) | Voie lactée panorama     | CC BY-SA 4.0   |

---

## Installation

### Prérequis

- **Python** 3.11+
- **Node.js** 20+
- **Docker** & Docker Compose (optionnel)

### Installation locale (sans Docker)

```bash
# 1. Cloner le repo
git clone https://github.com/hugo-bdnl/Projet-POO.git
cd Projet-POO

# 2. Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt

# 3. Importer les données astronomiques (une seule fois, ~30 secondes)
python -m scripts.import_data

# 4. Lancer le backend
uvicorn app.main:app --reload
# → API disponible sur http://localhost:8000
# → Documentation Swagger sur http://localhost:8000/docs

# 5. Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev
# → Application sur http://localhost:5173
```

### Installation avec Docker

```bash
docker-compose up
# → Backend : http://localhost:8000
# → Frontend : http://localhost:5173

# Import données (première fois uniquement)
docker exec nightsky-backend python -m scripts.import_data
```

---

## 📡 API Endpoints

| Endpoint                                     | Méthode | Description                            |
| -------------------------------------------- | ------- | -------------------------------------- |
| `GET /api/observation-points`                | GET     | Liste des 50 points d'observation      |
| `GET /api/stars/visible?lat=...&lon=...`     | GET     | Étoiles visibles depuis une position   |
| `GET /api/stars/{id}`                        | GET     | Détails d'une étoile                   |
| `GET /api/stars/search/{query}`              | GET     | Recherche d'étoiles par nom            |
| `GET /api/constellations`                    | GET     | Liste des 88 constellations            |
| `GET /api/constellations/{id}`               | GET     | Détails et pattern d'une constellation |
| `GET /api/constellations/{id}/best-location` | GET     | Meilleur point d'observation           |
| `GET /api/health`                            | GET     | État de santé de l'API                 |

Documentation interactive complète : `http://localhost:8000/docs`

---

## Tests

```bash
# Backend
cd backend
pytest --cov=app tests/

# Frontend
cd frontend
npm run test
```

---

## Structure du projet

```
Projet-POO/
├── backend/
│   ├── app/
│   │   ├── api/            # Routes FastAPI
│   │   ├── models/         # Modèles SQLAlchemy (ORM)
│   │   ├── schemas/        # Validation Pydantic
│   │   ├── repositories/   # Accès données (queries)
│   │   ├── services/       # Logique métier (astronomie, cache)
│   │   ├── main.py         # Point d'entrée
│   │   ├── config.py       # Configuration
│   │   └── database.py     # Session SQLAlchemy
│   ├── scripts/
│   │   └── import_data.py  # Import HYG + villes
│   ├── data/               # SQLite DB + données CSV
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Composants React (Globe, NightSky, ...)
│   │   ├── stores/         # Zustand state
│   │   ├── services/       # Client API Axios
│   │   └── types/          # Types TypeScript
│   ├── public/textures/    # Textures NASA
│   ├── package.json
│   └── vite.config.ts
├── Plan/
│   └── Plan.md             # Plan de réalisation détaillé
├── docker-compose.yml
└── README.md
```

---

## Auteur

**Hugo** — Master Traitement de l'Information et Exploitation de Données

Projet de Programmation Orientée Objet (POO) — 2025/2026

---

## Licence

Ce projet est un travail académique. Les données utilisées sont sous licences ouvertes (ODbL, GPL, BSD, domaine public) comme détaillé dans la section [Données](#données).

---

## Crédits

- **HYG Database** par David Nash (astronexus) — catalogue stellaire
- **NASA Visible Earth** — textures globe terrestre (Blue Marble)
- **Stellarium** — patterns de constellations
- **AstroPy** — bibliothèque de calculs astronomiques
- **Three.js** — moteur de rendu 3D WebGL
