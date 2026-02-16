"""
Repository d'accès aux données pour les points d'observation.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.observation_point import ObservationPoint


class ObservationPointRepository:
    """
    Data Access Layer pour le modèle ObservationPoint.
    """

    def __init__(self, db: Session):
        """
        @param db: Session SQLAlchemy active
        """
        self._db = db

    def get_all(self) -> list[ObservationPoint]:
        """
        Récupère tous les points d'observation, triés par nom.

        @return: Liste de tous les points d'observation
        """
        stmt = select(ObservationPoint).order_by(ObservationPoint.name.asc())
        return list(self._db.execute(stmt).scalars().all())

    def get_by_id(self, point_id: int) -> ObservationPoint | None:
        """
        Récupère un point d'observation par son identifiant.

        @param point_id: Identifiant unique
        @return: Instance ObservationPoint ou None
        """
        return self._db.get(ObservationPoint, point_id)
