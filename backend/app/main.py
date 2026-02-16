"""
Point d'entrée de l'application FastAPI — Night Sky Viewer.

Configure l'application, le CORS, les routes, et initialise
la base de données SQLite au démarrage.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.api.stars import router as stars_router
from app.api.constellations import router as constellations_router
from app.api.observation_points import router as observation_points_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestion du cycle de vie de l'application.
    Crée les tables SQLite au démarrage.
    """
    create_tables()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API pour l'application Night Sky Viewer. "
        "Fournit les données d'étoiles, constellations et points d'observation, "
        "ainsi que les calculs de positions astronomiques en temps réel."
    ),
    lifespan=lifespan,
)

# --- Middleware CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Enregistrement des routes ---
app.include_router(stars_router)
app.include_router(constellations_router)
app.include_router(observation_points_router)


@app.get("/", tags=["Health"])
def root():
    """
    Endpoint racine — vérification de santé de l'API.

    @return: Nom et version de l'application
    """
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    """
    Health check détaillé pour le monitoring.

    @return: Statut de l'application et de ses dépendances
    """
    from app.database import SessionLocal
    from app.repositories.star_repository import StarRepository

    try:
        db = SessionLocal()
        repo = StarRepository(db)
        star_count = repo.count()
        db.close()
        db_status = "connected"
    except Exception as e:
        star_count = 0
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "star_count": star_count,
    }
