# Night Sky Viewer — Instructions projet

## Stack

| Couche | Technologies |
|---|---|
| **Backend** | Python 3.12, FastAPI 0.129, SQLAlchemy 2.0, SQLite, AstroPy 7.2, NumPy 2.4 |
| **Frontend** | React 19, TypeScript 5.9, Vite 7, Three.js 0.182, React Three Fiber 9, Zustand 5 |
| **Calculs astro frontend** | `astronomia` (Meeus Algorithms) — positions planétaires 100% client |
| **Propagateur ISS** | `satellite.js` (SGP4) — position ISS côté client |
| **Deploy** | Railway (backend) / Vercel (frontend) — auto-deploy sur push `main` |

## Architecture backend — 4 couches strictes

```
Router (app/api/)  →  Service (app/services/)  →  Repository (app/repositories/)  →  SQLite
```

- **Router** : HTTP, validation Pydantic, sérialisation. Appelle **uniquement** Service.
- **Service** : logique métier, calculs AstroPy vectorisés. Appelle **uniquement** Repository.
- **Repository** : queries SQLAlchemy, CRUD. Accès BD exclusif.
- **Schema** (`app/schemas/`) et **Model** (`app/models/`) : passifs, n'appellent rien.

Voir `.claude/rules/backend-layers.md` pour le détail.

## Architecture frontend — 3 modes de vue

Les modes sont mutuellement exclusifs, pilotés par `useSkyStore.viewMode` :

| Mode | Description | Composants clés |
|---|---|---|
| `"globe"` | Globe terrestre 3D + shader terminateur jour/nuit | `Globe.tsx`, `LocationMarker.tsx`, `ISS.tsx` |
| `"sky"` | Ciel nocturne 1ère personne (5000+ étoiles) | `NightSky.tsx`, `MilkyWay.tsx`, `ConstellationPattern.tsx` |
| `"system"` | Système solaire complet (8 planètes, orbites) | `SolarSystem.tsx`, `AsteroidBelt.tsx`, `KuiperBelt.tsx` |

## Commandes de développement

```bash
# Backend
cd backend && python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload                    # → http://localhost:8000

# Frontend
cd frontend && npm install
npm run dev                                       # → http://localhost:5173

# Tests backend
cd backend && python -m pytest tests/ -v
python -m pytest tests/ --cov=app --cov-report=term-missing

# Tests frontend
npx vitest run

# Docker (tout-en-un)
docker-compose up
```

## Fichiers clés

### Backend
- `backend/app/main.py` — point d'entrée FastAPI, CORS, lifespan
- `backend/app/services/astronomy_service.py` — calculs AstroPy vectorisés (RA/Dec → Az/Alt)
- `backend/app/services/cache_service.py` — cache TTL 2 niveaux (dynamique 10min, statique 24h)
- `backend/app/config.py` — settings via pydantic-settings + `.env`
- `backend/data/nightsky.db` — base SQLite (120k+ étoiles, 88 constellations, 50 points d'obs)

### Frontend
- `frontend/src/App.tsx` — composant racine, Canvas R3F, CameraController, routing modes
- `frontend/src/stores/useSkyStore.ts` — store principal (viewMode, stars, timestamp, selectedPlanet)
- `frontend/src/utils/planetaryEphemeris.ts` — wrapper `astronomia` → positions 3D planètes
- `frontend/src/utils/dayNightShader.ts` — GLSL vertex/fragment shaders terminateur
- `frontend/src/utils/skyCoords.ts` — conversion coordonnées célestes
- `frontend/src/types/planets.ts` — types et métadonnées des 8 planètes

### Tests
- `tests/backend/` — PyTest (observation_points, constellations, stars, services)
- `tests/frontend/` — Vitest + testing-library

## Conventions spécifiques au projet

- **Langue du code** : variables/fonctions en anglais, commentaires en français
- **Shaders GLSL** : exportés depuis `frontend/src/utils/` en tant que strings TS
- **Textures** : format WebP dans `frontend/public/textures/`, nommées `{résolution}_{sujet}.webp`
- **Calculs astronomiques lourds** (étoiles, constellations) : **backend** via AstroPy
- **Calculs astronomiques légers** (planètes, ISS) : **frontend** via astronomia/satellite.js
- **Cache API** : les endpoints stars/visible et constellations sont cachés — clé arrondie à 5 min

## Branches

- `main` — production (auto-deploy Railway + Vercel)
- `v2` — développement actif (système solaire, terminateur, planètes)

## Documentation

Toute la documentation technique détaillée est dans `docs/` :
- `BACKEND.md` — API reference, modèles, services, cache
- `FRONTEND.md` — composants 3D, stores, caméra, dépendances
- `Plan-V2.md` — plan de développement V2 complet
- `LIMITES.md` — limites mathématiques de la simulation (VSOP87, Date JS)
- `DEPLOY.md` — guide déploiement Railway/Vercel
- `TESTS.md` — inventaire et plan de tests
