"""
Repository d'accès aux données pour les constellations.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.constellation import Constellation


class ConstellationRepository:
    """
    Data Access Layer pour le modèle Constellation.
    """

    def __init__(self, db: Session):
        """
        @param db: Session SQLAlchemy active
        """
        self._db = db

    def get_all(self) -> list[Constellation]:
        """
        Récupère toutes les constellations, triées par nom.

        @return: Liste de toutes les constellations
        """
        stmt = select(Constellation).order_by(Constellation.name.asc())
        return list(self._db.execute(stmt).scalars().all())

    def get_by_id(self, constellation_id: int) -> Constellation | None:
        """
        Récupère une constellation par son identifiant.

        @param constellation_id: Identifiant unique
        @return: Instance Constellation ou None
        """
        return self._db.get(Constellation, constellation_id)

    def get_by_abbreviation(self, abbreviation: str) -> Constellation | None:
        """
        Récupère une constellation par son abréviation IAU.

        @param abbreviation: Abréviation 3 lettres (ex: 'ORI')
        @return: Instance Constellation ou None
        """
        stmt = select(Constellation).where(
            Constellation.abbreviation == abbreviation.upper()
        )
        return self._db.execute(stmt).scalar_one_or_none()

    def search_by_name(self, query: str) -> list[Constellation]:
        """
        Recherche de constellations par nom (partiel, insensible à la casse).

        @param query: Terme de recherche
        @return: Liste de constellations correspondantes
        """
        stmt = (
            select(Constellation)
            .where(
                Constellation.name.ilike(f"%{query}%")
                | Constellation.name_fr.ilike(f"%{query}%")
            )
            .order_by(Constellation.name.asc())
        )
        return list(self._db.execute(stmt).scalars().all())
