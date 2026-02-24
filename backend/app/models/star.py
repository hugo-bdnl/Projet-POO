"""
Modèle SQLAlchemy représentant une étoile du catalogue HYG.
Stocke les propriétés intrinsèques (position, magnitude, type spectral, etc.).
"""

from sqlalchemy import Column, Integer, Float, String, Index
from sqlalchemy.orm import relationship

from app.database import Base


class Star(Base):
    """
    Entité représentant une étoile issue du catalogue HYG Database v3.7.

    Les coordonnées (ra, dec) sont en degrés, époque J2000.
    La magnitude apparente détermine la visibilité à l'œil nu (< 6.0).
    """

    __tablename__ = "stars"

    # Index composite pour accélérer le pré-filtrage (magnitude + déclinaison)
    __table_args__ = (
        Index("idx_star_mag_dec", "magnitude", "dec"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    hip_id = Column(Integer, index=True, nullable=True, doc="Identifiant Hipparcos")
    hd_id = Column(Integer, nullable=True, doc="Identifiant Henry Draper")
    proper_name = Column(String, nullable=True, doc="Nom commun (ex: Sirius, Vega)")
    ra = Column(Float, nullable=False, doc="Ascension droite J2000 (degrés)")
    dec = Column(Float, nullable=False, doc="Déclinaison J2000 (degrés)")
    magnitude = Column(Float, nullable=False, index=True, doc="Magnitude apparente")
    abs_magnitude = Column(Float, nullable=True, doc="Magnitude absolue")
    spectral_type = Column(String, nullable=True, doc="Type spectral (ex: G2V)")
    color_index = Column(Float, nullable=True, doc="Indice de couleur B-V")
    distance_ly = Column(Float, nullable=True, doc="Distance en années-lumière")
    constellation_abbr = Column(
        String(3), nullable=True, index=True,
        doc="Abréviation constellation IAU (ex: ORI)"
    )

    # Relation many-to-many avec Constellation (via table de jonction)
    constellations = relationship(
        "Constellation",
        secondary="constellation_stars",
        back_populates="stars",
    )

    def __repr__(self) -> str:
        name = self.proper_name or f"HIP {self.hip_id}" or f"#{self.id}"
        return f"<Star(id={self.id}, name='{name}', mag={self.magnitude})>"
