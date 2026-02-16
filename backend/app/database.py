"""
Configuration de la base de données SQLAlchemy.
Crée le moteur SQLite, la session factory, et la classe de base déclarative.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings


# Moteur SQLAlchemy — connect_args nécessaire pour SQLite (thread safety)
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=settings.DEBUG,
)

# Session factory — chaque requête HTTP obtient sa propre session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Classe de base pour tous les modèles SQLAlchemy."""
    pass


def get_db():
    """
    Générateur de session SQLAlchemy pour injection de dépendance FastAPI.
    Garantit la fermeture propre de la session après chaque requête.

    @yield: Session SQLAlchemy active
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    Crée toutes les tables définies par les modèles SQLAlchemy.
    Appelé au démarrage de l'application.
    """
    Base.metadata.create_all(bind=engine)
