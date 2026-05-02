---
description: Guide les commandes de développement (démarrage, tests, docker)
user_invocable: true
---

Affiche les commandes de développement du projet Night Sky Viewer de manière concise.

## Backend (Python/FastAPI — port 8000)

```bash
cd backend
venv\Scripts\activate          # Windows
uvicorn app.main:app --reload
```

Swagger docs : http://localhost:8000/docs

## Frontend (React/Vite — port 5173)

```bash
cd frontend
npm run dev
```

## Tests

```bash
# Backend (avec couverture)
cd backend && python -m pytest tests/ -v --cov=app

# Frontend
npx vitest run
```

## Docker (tout-en-un)

```bash
docker-compose up       # ou docker-compose up -d
docker-compose logs -f  # logs en temps réel
```

## Health check

- Backend : `GET http://localhost:8000/api/health`
- Frontend : http://localhost:5173

## Import données (première fois uniquement)

```bash
cd backend
venv\Scripts\activate
python -m scripts.import_data
```

Si l'utilisateur demande de lancer quelque chose, exécute la commande appropriée. Sinon, affiche juste ce résumé.
