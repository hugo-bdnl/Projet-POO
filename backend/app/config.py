"""
Configuration de l'application Night Sky Viewer.
Charge les variables d'environnement et définit les constantes globales.
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Configuration centralisée de l'application.
    Les valeurs peuvent être surchargées via des variables d'environnement
    ou un fichier .env.
    """

    # --- Base de données ---
    DATABASE_URL: str = "sqlite:///./data/nightsky.db"

    # --- Application ---
    APP_NAME: str = "Night Sky Viewer"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # --- CORS ---
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",   # Vite dev
        "http://localhost:4173",   # Vite preview (npm run preview)
        "http://localhost:3000",
    ]

    # --- Cache ---
    CACHE_TTL_STARS: int = 600        # 10 minutes pour les positions calculées
    CACHE_TTL_STATIC: int = 86400     # 24h pour les données statiques
    CACHE_MAX_SIZE: int = 512         # Nombre max d'entrées en cache

    # --- Astronomie ---
    DEFAULT_MAG_LIMIT: float = 6.0    # Magnitude limite œil nu
    MAX_STARS_RESPONSE: int = 10000   # Limite de sécurité pour la réponse API

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Instance singleton
settings = Settings()
