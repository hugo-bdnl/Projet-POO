---
name: Code Review
description: Checklist et conventions de relecture de code pour le projet Night Sky Viewer
---

# Code Review — Night Sky Viewer

## Objectif

Avant de valider tout changement de code, appliquer cette checklist systématiquement.
Ce skill est déclenché automatiquement lorsqu'on me demande de relire, vérifier
ou valider du code.

---

## Checklist Python (Backend FastAPI)

### 🏗️ Structure & Architecture

- [ ] Le code respecte le pattern **Repository → Service → API Router**
- [ ] Aucune logique métier dans les routers (déléguée aux services)
- [ ] Aucun accès direct à la BD dans les services (passé par les repositories)
- [ ] Les modèles SQLAlchemy sont dans `app/models/`
- [ ] Les schémas Pydantic sont dans `app/schemas/`

### 🐍 Qualité Python

- [ ] Type hints sur toutes les fonctions (paramètres + retour)
- [ ] Docstrings sur les fonctions publiques (format Google-style)
- [ ] Pas de `print()` — utiliser `logging` si nécessaire
- [ ] Pas de `# TODO` ou `# FIXME` non documentés
- [ ] Imports organisés : stdlib → third-party → local (style isort)
- [ ] Pas de secrets / credentials en dur (utiliser `.env` + `config.py`)

### ⚠️ Gestion d'erreurs

- [ ] Les endpoints FastAPI utilisent `HTTPException` avec codes appropriés
- [ ] Les erreurs sont loguées avec contexte suffisant
- [ ] Les cas limites sont gérés (listes vides, IDs inexistants, paramètres invalides)

### 🔒 Sécurité

- [ ] Pas d'injection SQL (utiliser les requêtes paramétrées de SQLAlchemy)
- [ ] Validation des entrées via Pydantic
- [ ] CORS configuré correctement (pas de `*` en production)

---

## Checklist TypeScript / React (Frontend)

### 🏗️ Structure

- [ ] Composants dans `src/components/`
- [ ] Un composant = un fichier (sauf composants internes triviaux)
- [ ] Props typées avec des interfaces TypeScript explicites

### 🎨 Qualité

- [ ] Pas de `any` — types explicites partout
- [ ] Pas de `console.log` résiduel
- [ ] Hooks React utilisés correctement (dépendances de useEffect complètes)
- [ ] Nettoyage des effets (return cleanup dans useEffect)

### 🖼️ Three.js spécifique

- [ ] Dispose des géométries et matériaux pour éviter les memory leaks
- [ ] Textures chargées de manière asynchrone
- [ ] Animation loop propre avec `requestAnimationFrame` / useFrame

---

## Checklist Globale

### 📁 Fichiers

- [ ] Pas de fichiers inutiles commités (vérifier `.gitignore`)
- [ ] Noms de fichiers en snake_case (Python) ou PascalCase (React components)
- [ ] Pas de fichiers > 300 lignes — envisager un découpage

### 📝 Documentation

- [ ] README mis à jour si nouveaux endpoints ou composants
- [ ] Commentaires en français pour ce projet
- [ ] Plan.md mis à jour si tâches complétées

### 🧪 Tests

- [ ] Tests ajoutés/mis à jour pour tout nouveau code
- [ ] Tous les tests existants passent toujours
- [ ] Couverture minimale maintenue
