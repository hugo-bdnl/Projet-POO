# 🚀 Lancement Rapide — Night Sky Viewer

> **Documentation technique complète :**
>
> - 🖥️ [BACKEND.md](./BACKEND.md) — API Reference, modèles, services, cache
> - 🎨 [FRONTEND.md](./FRONTEND.md) — Composants 3D, stores, architecture React/Three.js
> - 🧪 [TESTS.md](./TESTS.md) — Tests unitaires et d'intégration

## 1. Backend (Python / FastAPI)

```bash
cd backend

# Créer et activer le venv (première fois)
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur (port 8000)
uvicorn app.main:app --reload
```

📍 **API accessible** : http://localhost:8000  
📖 **Swagger docs** : http://localhost:8000/docs

---

## 2. Base de données (SQLite)

```bash
cd backend

# Activer le venv si pas déjà fait
venv\Scripts\activate

# Importer les données (étoiles, constellations, villes)
python -m scripts.import_data
```

📁 **Fichier BD** : `backend/data/nightsky.db`  
⚠️ L'import ne doit être fait **qu'une seule fois** (ou pour réinitialiser les données).

---

## 3. Frontend (React / Vite)

```bash
cd frontend

# Installer les dépendances (première fois)
npm install

# Lancer le serveur de développement (port 5173)
npm run dev
```

📍 **App accessible** : http://localhost:5173

---

## 4. Docker Compose (tout-en-un)

```bash
# Depuis la racine du projet
docker-compose up

# En arrière-plan
docker-compose up -d

# Voir les logs
docker-compose logs -f backend

# Arrêter
docker-compose down
```

📍 **Backend** : http://localhost:8000  
📍 **Frontend** : http://localhost:5173

---

## 5. Tests

```bash
# Tests backend
cd backend
venv\Scripts\activate
python -m pytest tests/ -v

# Tests avec couverture
python -m pytest tests/ --cov=app

# Tests frontend
cd frontend
npm run test
```

📖 **Détails des tests** : voir [`docs/TESTS.md`](./TESTS.md)
