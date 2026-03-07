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
# 1. Faire tes modifications sur la branche v1
git checkout v1

# ... modifier les fichiers ...

# 2. Committer sur v1
git add <fichiers modifiés>
git commit -m "feat/fix: description du changement"

# 3. Merger v1 dans main
git checkout main
git merge v1

# 4. Pousser → Railway et Vercel redéploient automatiquement
git push origin main

# 5. Revenir sur v1 pour la suite du développement
git checkout v1

# 6. (Optionnel) Maintenir v1 à jour avec main
git push origin v1
```

> Railway redéploie en ~1-2 min. Vercel redéploie en ~30-60 sec.

---

## 3. Variables d'environnement

### Railway (backend)

À configurer dans : **Dashboard → Service → Variables**

```
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=sqlite:///./data/nightsky.db
CORS_ORIGINS=["https://projet-poo.vercel.app"]
CACHE_TTL_STARS=600
CACHE_MAX_SIZE=512
DEFAULT_MAG_LIMIT=6.0
MAX_STARS_RESPONSE=10000
```

> ⚠️ Après chaque modification de variable, Railway redémarre le service automatiquement.

### Vercel (frontend)

À configurer dans : **Dashboard → Project → Settings → Environment Variables**

```
VITE_API_URL=https://projet-poo-production.up.railway.app
```

> ⚠️ Après modification d'une variable Vercel, il faut **redéployer manuellement** :
> Deployments → sur le dernier déploiement → **Redeploy**

---

## 4. Vérifier que tout fonctionne

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

## 5. Dépannage rapide

| Symptôme                      | Cause probable                       | Solution                                |
| ----------------------------- | ------------------------------------ | --------------------------------------- |
| CORS error dans la console    | URL Vercel absente de `CORS_ORIGINS` | Mettre à jour la var Railway            |
| API unreachable               | Mauvaise `VITE_API_URL` sur Vercel   | Corriger + Redeploy Vercel              |
| `star_count: 0`               | DB SQLite absente du repo            | Vérifier que `nightsky.db` est committé |
| Logs Railway : crashs répétés | Erreur Python au démarrage           | Voir **Railway → Logs**                 |
