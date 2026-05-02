"""
Modèle SQLAlchemy pour les rovers martiens.
"""

from sqlalchemy import Column, Integer, Float, String, Boolean

from app.database import Base


class Rover(Base):
    """
    Position et métadonnées d'un rover martien.

    Les positions (lat/lon) sont éditables en base sans redéploiement,
    permettant la mise à jour des rovers actifs (Curiosity, Perseverance).
    """

    __tablename__ = "rovers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String, unique=True, nullable=False, doc="Identifiant unique (ex: curiosity)")
    name = Column(String, nullable=False, doc="Nom affiché")
    agency = Column(String, nullable=False, doc="Agence spatiale (ex: NASA / MSL)")
    active = Column(Boolean, nullable=False, default=False, doc="Mission en cours")
    latitude = Column(Float, nullable=False, doc="Latitude (degrés, N positif)")
    longitude = Column(Float, nullable=False, doc="Longitude (degrés, E positif)")
    landing_site = Column(String, nullable=False, doc="Nom du site d'atterrissage")

    def __repr__(self) -> str:
        return (
            f"<Rover(slug='{self.slug}', "
            f"lat={self.latitude}, lon={self.longitude})>"
        )
