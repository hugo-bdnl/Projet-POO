---
name: Testing
description: Conventions et procédures pour écrire et exécuter les tests du projet Night Sky Viewer
---

# Testing — Night Sky Viewer

## Objectif

Ce skill définit comment écrire, organiser et exécuter les tests.
Il est déclenché automatiquement quand on me demande de tester du code,
d'écrire des tests, ou de vérifier que les tests passent.

---

## Stack de test

| Couche             | Outil                    | Config                                      |
| ------------------ | ------------------------ | ------------------------------------------- |
| Backend unit tests | **PyTest**               | `backend/tests/`                            |
| Backend API tests  | **TestClient** (FastAPI) | `from fastapi.testclient import TestClient` |
| Frontend (futur)   | **Vitest**               | `frontend/`                                 |

---

## Organisation des tests backend

```
backend/tests/
├── __init__.py
├── test_observation_points.py   ← Tests ObservationPoint (API + données)
├── test_stars.py                ← Tests Stars (API + données BD)
├── test_constellations.py       ← Tests Constellations (API + données)
└── test_services.py             ← Tests Services (Astronomy + Cache)
```

### Convention de nommage

- Fichiers : `test_<module>.py`
- Classes : `class Test<Feature>:`
- Méthodes : `def test_<comportement_attendu>(self):`

### Exemple de structure d'un fichier test

```python
"""Tests pour le module <nom>."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestNomEndpoint:
    """Tests pour l'endpoint /api/<resource>."""

    def test_returns_200(self):
        """Vérifie que l'endpoint retourne 200."""
        response = client.get("/api/<resource>")
        assert response.status_code == 200

    def test_returns_list(self):
        """Vérifie que la réponse est une liste."""
        response = client.get("/api/<resource>")
        data = response.json()
        assert isinstance(data, list)

    def test_data_quality(self):
        """Vérifie la qualité des données retournées."""
        response = client.get("/api/<resource>")
        data = response.json()
        for item in data:
            assert "id" in item
            assert "name" in item
```

---

## Exécution des tests

### Commandes principales

```bash
# Depuis la racine du projet — tous les tests backend
cd backend && python -m pytest tests/ -v

# Un fichier spécifique
cd backend && python -m pytest tests/test_stars.py -v

# Une classe spécifique
cd backend && python -m pytest tests/test_stars.py::TestStarsData -v

# Avec couverture
cd backend && python -m pytest tests/ --cov=app --cov-report=term-missing

# Stopper au premier échec
cd backend && python -m pytest tests/ -x -v
```

### ⚠️ Prérequis

- Activer le venv : `backend\venv\Scripts\activate` (Windows)
- La base de données `nightsky.db` doit exister et être peuplée
- Les dépendances doivent être installées : `pip install -r requirements.txt`

---

## Règles de test

### Ce qui DOIT être testé

1. **Chaque endpoint API** — status code, format de réponse, cas d'erreur
2. **Chaque service** — logique métier avec cas nominaux + limites
3. **Données BD** — comptage, qualité des colonnes, valeurs critiques
4. **Cas d'erreur** — IDs inexistants (404), paramètres invalides (422)

### Ce qui NE DOIT PAS être testé

- Les méthodes privées directement (tester via l'interface publique)
- Le framework FastAPI/SQLAlchemy lui-même
- Les configurations environnement-spécifiques

### Bonnes pratiques

- **Indépendance** : chaque test doit pouvoir tourner seul
- **Lisibilité** : le nom du test décrit le comportement attendu
- **Assertions explicites** : une assertion principale par test
- **Pas de sleep** : utiliser des mocks si nécessaire pour le temps
- **Données réelles** : on teste contre la vraie BD (pas de mock BD pour les tests d'intégration)

---

## Rapport de test

Après exécution, je dois rapporter :

1. ✅ Nombre de tests passés / total
2. ❌ Détail de chaque échec (assertion + traceback)
3. 📊 Couverture si disponible
4. 🔧 Actions correctives proposées si échecs
