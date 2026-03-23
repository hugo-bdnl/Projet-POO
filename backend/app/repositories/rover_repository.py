"""
Repository d'accès aux données pour les rovers martiens.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rover import Rover


class RoverRepository:
    """
    Data Access Layer pour le modèle Rover.
    """

    def __init__(self, db: Session):
        """
        @param db: Session SQLAlchemy active
        """
        self._db = db

    def get_all(self) -> list[Rover]:
        """
        Récupère tous les rovers, triés par nom.

        @return: Liste de tous les rovers
        """
        stmt = select(Rover).order_by(Rover.name.asc())
        return list(self._db.execute(stmt).scalars().all())

    def get_by_slug(self, slug: str) -> Rover | None:
        """
        Récupère un rover par son slug (identifiant unique).

        @param slug: Identifiant du rover (ex: curiosity)
        @return: Instance Rover ou None
        """
        stmt = select(Rover).where(Rover.slug == slug)
        return self._db.execute(stmt).scalar_one_or_none()
