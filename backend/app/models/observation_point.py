"""
Modèle SQLAlchemy pour les points d'observation (villes mondiales).
"""

from sqlalchemy import Column, Integer, Float, String

from app.database import Base


class ObservationPoint(Base):
    """
    Point d'observation pré-défini sur le globe terrestre.

    Représente une ville ou un lieu avec ses coordonnées GPS
    et son fuseau horaire IANA (ex: 'Europe/Paris').
    """

    __tablename__ = "observation_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, doc="Nom de la ville / lieu")
    country = Column(String, nullable=True, doc="Pays")
    latitude = Column(Float, nullable=False, doc="Latitude (degrés, N positif)")
    longitude = Column(Float, nullable=False, doc="Longitude (degrés, E positif)")
    timezone = Column(
        String, nullable=False, default="UTC",
        doc="Fuseau horaire IANA (ex: Europe/Paris)"
    )
    elevation = Column(Float, nullable=True, default=0.0, doc="Altitude en mètres")

    def __repr__(self) -> str:
        return (
            f"<ObservationPoint(name='{self.name}', "
            f"lat={self.latitude}, lon={self.longitude})>"
        )
