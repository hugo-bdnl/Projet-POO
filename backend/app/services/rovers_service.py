"""
Service pour récupérer les positions des rovers martiens depuis la base de données.

Si la table rovers est vide, insère les positions par défaut (seed).
"""

import logging

from sqlalchemy.orm import Session

from app.models.rover import Rover
from app.repositories.rover_repository import RoverRepository

logger = logging.getLogger(__name__)

# Positions par défaut — insérées si la table est vide
_DEFAULT_ROVERS = [
    {
        "slug": "curiosity",
        "name": "Curiosity",
        "agency": "NASA / MSL",
        "active": True,
        "latitude": -4.6,
        "longitude": 137.4,
        "landing_site": "Gale Crater",
    },
    {
        "slug": "perseverance",
        "name": "Perseverance",
        "agency": "NASA / Mars 2020",
        "active": True,
        "latitude": 18.4,
        "longitude": 77.4,
        "landing_site": "Jezero Crater",
    },
    {
        "slug": "opportunity",
        "name": "Opportunity",
        "agency": "NASA / MER-B",
        "active": False,
        "latitude": -1.9,
        "longitude": 354.5,
        "landing_site": "Endeavour Crater",
    },
    {
        "slug": "spirit",
        "name": "Spirit",
        "agency": "NASA / MER-A",
        "active": False,
        "latitude": -14.6,
        "longitude": 175.5,
        "landing_site": "Columbia Hills",
    },
    {
        "slug": "zhurong",
        "name": "Zhurong",
        "agency": "CNSA",
        "active": False,
        "latitude": 25.1,
        "longitude": 109.9,
        "landing_site": "Utopia Planitia",
    },
]


class RoversService:
    """Gère les positions des rovers martiens."""

    def get_all_positions(self, db: Session) -> list[dict]:
        """
        Retourne les positions de tous les rovers.
        Seed la table si elle est vide.

        @param db: Session SQLAlchemy
        @return: Liste de dicts normalisés
        """
        repo = RoverRepository(db)
        rovers = repo.get_all()

        if not rovers:
            logger.info("Table rovers vide — insertion des positions par défaut")
            self._seed_defaults(db)
            rovers = repo.get_all()

        return [
            {
                "slug": r.slug,
                "name": r.name,
                "agency": r.agency,
                "active": r.active,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "landing_site": r.landing_site,
            }
            for r in rovers
        ]

    def _seed_defaults(self, db: Session) -> None:
        """Insère les positions par défaut dans la table rovers."""
        for data in _DEFAULT_ROVERS:
            db.add(Rover(**data))
        db.commit()


rovers_service = RoversService()
