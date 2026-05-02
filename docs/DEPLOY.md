# Guide de Déploiement — Night Sky Viewer

## Architecture de déploiement

| Service               | Plateforme | URL                                            |
| --------------------- | ---------- | ---------------------------------------------- |
| Backend (FastAPI)     | Railway    | `https://projet-poo-production.up.railway.app` |
| Frontend (React/Vite) | Vercel     | `https://projet-poo.vercel.app`                |

---

## 1. Arrêter / Démarrer le service Railway

### Arrêter (stopper les heures de compute)

1. Aller sur [railway.app](https://railway.app) → Dashboard → ton projet
2. Cliquer sur le service **backend**
3. Aller dans **Settings → Danger → Remove Service** (définitif) **OU**
4. Pour une pause temporaire : **Deployments → ⋮ → Rollback / Remove** (ou depuis le menu du service : **Suspend**)

> **Conseil** : Railway offre un bouton **"Suspend"** dans les paramètres du service pour couper le container sans supprimer le projet.

### Redémarrer

1. Dashboard Railway → service backend → **Deploy** ou **Resume**

---

## 2. Redéployer après des changements de code

Le déploiement est **automatique** dès qu'un commit est poussé sur la branche `main`.

### Workflow standard

```bash
# 1. Faire tes modifications sur la branche v2
git checkout v2

# ... modifier les fichiers ...

# 2. Committer sur v2
git add <fichiers modifiés>
git commit -m "feat/fix: description du changement"

# 3. Merger v2 dans main
git checkout main
git merge v2 --no-ff -m "Merge V2 : description"

# 4. Pousser → Railway et Vercel redéploient automatiquement
git push origin main

# 5. Revenir sur v2 pour la suite du développement
git checkout v2

# 6. (Optionnel) Maintenir v2 à jour avec main
git push origin v2
```

> Railway redéploie en ~1-2 min. Vercel redéploie en ~30-60 sec.

---

## 3. Variables d'environnement

### Railway (backend)

À configurer dans : **Dashboard → Service → Variables**

```
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://user:password@host:5432/dbname   # URL fournie par Railway PostgreSQL
CORS_ORIGINS=["https://projet-poo.vercel.app"]
CACHE_TTL_STARS=600
CACHE_MAX_SIZE=512
DEFAULT_MAG_LIMIT=6.0
MAX_STARS_RESPONSE=10000
```

> ⚠️ `DATABASE_URL` est automatiquement injectée par Railway si tu as ajouté un service **PostgreSQL** au projet (variable `${{Postgres.DATABASE_URL}}`). Ne pas mettre une URL SQLite ici en production.

> ⚠️ Après chaque modification de variable, Railway redémarre le service automatiquement.

### Vercel (frontend)

À configurer dans : **Dashboard → Project → Settings → Environment Variables**

```
VITE_API_URL=https://projet-poo-production.up.railway.app
```

> ⚠️ Après modification d'une variable Vercel, il faut **redéployer manuellement** :
> Deployments → sur le dernier déploiement → **Redeploy**

---

## 4. Base de données PostgreSQL (V2)

Depuis la V2, la base de données de production est **PostgreSQL** (instance Railway), et non plus SQLite.

### Fonctionnement

- En **local** : `DATABASE_URL` n'est pas définie dans `.env` → SQLite (`data/nightsky.db`) utilisé par défaut
- En **production Railway** : Railway injecte automatiquement `DATABASE_URL` avec l'URL PostgreSQL → `database.py` détecte le préfixe et désactive `check_same_thread`
- `psycopg2-binary` est dans `requirements.txt` — aucune dépendance supplémentaire à installer

### Import initial des données sur PostgreSQL

La base PostgreSQL Railway est vide au premier déploiement. Il faut lancer le script d'import manuellement **une seule fois** via la Railway CLI :

```bash
# 1. Installer Railway CLI
npm install -g @railway/cli

# 2. Se connecter et cibler le projet
railway login
railway link   # sélectionner le projet Night Sky Viewer

# 3. Lancer le script d'import dans l'environnement Railway
#    (DATABASE_URL est automatiquement injectée)
railway run python -m scripts.import_data
```

Le script télécharge le catalogue HYG v4.2 (~120k étoiles), les constellations et les points d'observation, puis les insère en base. Durée estimée : 2–5 minutes.

> ⚠️ Ne pas relancer ce script si la base est déjà peuplée — utiliser `GET /api/health` pour vérifier (`star_count > 0`).

### Vérification de la connexion PostgreSQL

```bash
railway run python -c "from app.database import engine; print(engine.url)"
# → postgresql://...  (confirme que PostgreSQL est bien utilisé)
```

---

## 5. Vérifier que tout fonctionne

```
# Health check backend
https://projet-poo-production.up.railway.app/api/health
→ {"status": "healthy", "database": "connected", "star_count": 119614}

# Docs API interactive
https://projet-poo-production.up.railway.app/docs

# Frontend
https://projet-poo.vercel.app
```

---

## 6. Dépannage rapide

| Symptôme                      | Cause probable                              | Solution                                              |
| ----------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| CORS error dans la console    | URL Vercel absente de `CORS_ORIGINS`        | Mettre à jour la var Railway                          |
| API unreachable               | Mauvaise `VITE_API_URL` sur Vercel          | Corriger + Redeploy Vercel                            |
| `star_count: 0`               | Import initial non lancé sur PostgreSQL     | Lancer `railway run python -m scripts.import_data`    |
| `psycopg2` error au démarrage | `DATABASE_URL` pointe encore vers SQLite    | Vérifier la variable Railway → doit commencer par `postgresql://` |
| Logs Railway : crashs répétés | Erreur Python au démarrage                  | Voir **Railway → Logs**                               |
