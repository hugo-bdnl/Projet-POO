---
description: Architecture 4 couches du backend — appliquée à tout code Python dans backend/app/
globs: ["backend/app/**/*.py"]
---

# Architecture backend — 4 couches strictes

## Matrice d'appels

| Couche | Dossier | Peut appeler | NE PEUT PAS appeler |
|---|---|---|---|
| **Router** | `app/api/` | Service, Schema | Repository, Base, Session |
| **Service** | `app/services/` | Repository | Base, Session directement |
| **Repository** | `app/repositories/` | Session SQLAlchemy, Model | — |
| **Schema** | `app/schemas/` | — | — |
| **Model** | `app/models/` | — | — |

## Violations courantes à éviter

- Logique métier dans un router (calcul, filtrage complexe) → extraire vers Service
- `db.query()` dans un service → passer par Repository
- Import direct de `database.py` dans un router
- Schema Pydantic qui importe un Model SQLAlchemy

## Ajout d'une feature

1. Model → `app/models/{feature}.py`
2. Schema → `app/schemas/{feature}.py`
3. Repository → `app/repositories/{feature}_repository.py`
4. Service → `app/services/{feature}_service.py`
5. Router → `app/api/{feature}.py`
6. Enregistrer le router dans `app/main.py`
7. Tests → `tests/backend/test_{feature}.py`

## Nommage

- Fichiers : `snake_case.py`
- Classes : `PascalCase`
- Endpoints : `kebab-case` (`/api/observation-points`)
- Tables BD : `snake_case`
