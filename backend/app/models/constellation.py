"""
Modèles SQLAlchemy pour les constellations et la table d'association
étoile-constellation (pattern de lignes).
"""

from sqlalchemy import Column, Integer, Float, String, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Constellation(Base):
    """
    Entité représentant une constellation IAU.

    Contient le nom, l'abréviation standard (3 lettres IAU),
    et les coordonnées approximatives du centre pour la navigation.
    Le champ 'lines_data' stocke le pattern de lignes au format JSON.
    """

    __tablename__ = "constellations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True, doc="Nom complet (ex: Orion)")
    abbreviation = Column(
        String(3), nullable=False, unique=True, index=True,
        doc="Abréviation IAU 3 lettres (ex: ORI)"
    )
    name_fr = Column(String, nullable=True, doc="Nom en français")
    center_ra = Column(Float, nullable=True, doc="Ascension droite du centre (degrés)")
    center_dec = Column(Float, nullable=True, doc="Déclinaison du centre (degrés)")
    lines_data = Column(
        Text, nullable=True,
        doc="Pattern de lignes au format JSON : [[hip1, hip2], [hip2, hip3], ...]"
    )
    description = Column(Text, nullable=True, doc="Description de la constellation")

    # Relation many-to-many avec Star
    stars = relationship(
        "Star",
        secondary="constellation_stars",
        back_populates="constellations",
    )

    def __repr__(self) -> str:
        return f"<Constellation(abbr='{self.abbreviation}', name='{self.name}')>"


class ConstellationStar(Base):
    """
    Table d'association entre Constellation et Star.
    Permet de savoir quelles étoiles participent au pattern d'une constellation.
    """

    __tablename__ = "constellation_stars"

    id = Column(Integer, primary_key=True, autoincrement=True)
    constellation_id = Column(
        Integer, ForeignKey("constellations.id"), nullable=False, index=True
    )
    star_id = Column(
        Integer, ForeignKey("stars.id"), nullable=False, index=True
    )

    def __repr__(self) -> str:
        return (
            f"<ConstellationStar(constellation={self.constellation_id}, "
            f"star={self.star_id})>"
        )
