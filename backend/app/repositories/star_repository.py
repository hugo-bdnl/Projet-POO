"""
Repository d'accès aux données pour les étoiles.
Encapsule toutes les requêtes SQL liées aux étoiles.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.star import Star


class StarRepository:
    """
    Data Access Layer pour le modèle Star.
    Fournit des méthodes de requête optimisées avec filtrage et pagination.
    """

    def __init__(self, db: Session):
        """
        @param db: Session SQLAlchemy active
        """
        self._db = db

    def get_by_id(self, star_id: int) -> Star | None:
        """
        Récupère une étoile par son identifiant primaire.

        @param star_id: Identifiant unique de l'étoile
        @return: Instance Star ou None si non trouvée
        """
        return self._db.get(Star, star_id)

    def get_by_hip_id(self, hip_id: int) -> Star | None:
        """
        Récupère une étoile par son identifiant Hipparcos.

        @param hip_id: Identifiant Hipparcos
        @return: Instance Star ou None
        """
        stmt = select(Star).where(Star.hip_id == hip_id)
        return self._db.execute(stmt).scalar_one_or_none()

    def get_by_magnitude_and_declination(
        self,
        mag_limit: float,
        dec_min: float,
        dec_max: float,
    ) -> list[Star]:
        """
        Récupère les étoiles filtrées par magnitude et déclinaison.
        Utilisé pour le pré-filtrage avant le calcul des positions horizontales.

        @param mag_limit: Magnitude maximale (inclusive)
        @param dec_min: Déclinaison minimale (degrés)
        @param dec_max: Déclinaison maximale (degrés)
        @return: Liste d'instances Star correspondantes
        """
        stmt = (
            select(Star)
            .where(Star.magnitude <= mag_limit)
            .where(Star.dec >= dec_min)
            .where(Star.dec <= dec_max)
            .order_by(Star.magnitude.asc())
        )
        return list(self._db.execute(stmt).scalars().all())

    def get_by_constellation(self, constellation_abbr: str) -> list[Star]:
        """
        Récupère les étoiles appartenant à une constellation donnée.

        @param constellation_abbr: Abréviation IAU 3 lettres (ex: 'ORI')
        @return: Liste d'étoiles de la constellation
        """
        stmt = (
            select(Star)
            .where(Star.constellation_abbr == constellation_abbr)
            .order_by(Star.magnitude.asc())
        )
        return list(self._db.execute(stmt).scalars().all())

    def search_by_name(self, query: str, limit: int = 20) -> list[Star]:
        """
        Recherche d'étoiles par nom (recherche partielle, insensible à la casse).

        @param query: Terme de recherche
        @param limit: Nombre maximum de résultats
        @return: Liste d'étoiles correspondantes
        """
        stmt = (
            select(Star)
            .where(Star.proper_name.ilike(f"%{query}%"))
            .order_by(Star.magnitude.asc())
            .limit(limit)
        )
        return list(self._db.execute(stmt).scalars().all())

    def count(self) -> int:
        """
        Compte le nombre total d'étoiles en base.

        @return: Nombre d'étoiles
        """
        from sqlalchemy import func
        stmt = select(func.count(Star.id))
        return self._db.execute(stmt).scalar_one()
