---
description: Guide et exécute le déploiement vers Railway (backend) et Vercel (frontend)
user_invocable: true
---

Guide le déploiement du projet Night Sky Viewer.

## Architecture de déploiement

| Service | Plateforme | URL |
|---|---|---|
| Backend | Railway | `https://projet-poo-production.up.railway.app` |
| Frontend | Vercel | `https://projet-poo.vercel.app` |

## Workflow de déploiement

Le déploiement est **automatique** sur push vers `main`. Workflow standard :

```bash
# 1. S'assurer que la branche de dev est propre
git status

# 2. Merger vers main
git checkout main
git merge v2

# 3. Push → déclenche Railway + Vercel
git push origin main

# 4. Revenir sur la branche de dev
git checkout v2
```

Railway redéploie en ~1-2 min. Vercel en ~30-60 sec.

## Vérification post-deploy

```bash
# Health check backend
curl -s https://projet-poo-production.up.railway.app/api/health | python -m json.tool

# Vérifier le frontend
# https://projet-poo.vercel.app
```

Le health check doit retourner `"status": "healthy"` avec `star_count > 100000`.

## Variables d'environnement

### Railway (backend)
- `ENVIRONMENT=production`
- `DATABASE_URL=sqlite:///./data/nightsky.db`
- `CORS_ORIGINS=["https://projet-poo.vercel.app"]`

### Vercel (frontend)
- `VITE_API_URL=https://projet-poo-production.up.railway.app`

## Dépannage

| Symptôme | Solution |
|---|---|
| CORS error | Vérifier `CORS_ORIGINS` dans les vars Railway |
| API unreachable | Vérifier `VITE_API_URL` sur Vercel + redeploy |
| `star_count: 0` | Vérifier que `nightsky.db` est committé |
| Crash backend | Consulter Railway → Logs |

Quand l'utilisateur lance `/deploy` :
1. Vérifier `git status` et les changements non commités
2. Proposer le merge vers main si sur une branche de dev
3. Confirmer avant le push
4. Lancer la vérification post-deploy
