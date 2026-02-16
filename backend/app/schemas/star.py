"""
Schémas Pydantic pour la validation et la sérialisation des étoiles.
"""

from pydantic import BaseModel, Field


class StarBase(BaseModel):
    """Propriétés de base d'une étoile."""

    id: int
    proper_name: str | None = Field(None, description="Nom commun (ex: Sirius)")
    magnitude: float = Field(..., description="Magnitude apparente")
    spectral_type: str | None = Field(None, description="Type spectral (ex: G2V)")


class StarResponse(StarBase):
    """Étoile retournée dans une liste (données minimales)."""

    hip_id: int | None = None
    ra: float = Field(..., description="Ascension droite J2000 (degrés)")
    dec: float = Field(..., description="Déclinaison J2000 (degrés)")
    constellation_abbr: str | None = None

    model_config = {"from_attributes": True}


class StarDetail(StarResponse):
    """Détail complet d'une étoile (vue individuelle)."""

    hd_id: int | None = None
    abs_magnitude: float | None = None
    color_index: float | None = None
    distance_ly: float | None = Field(None, description="Distance en années-lumière")

    model_config = {"from_attributes": True}


class VisibleStarResponse(BaseModel):
    """
    Étoile visible depuis un point d'observation à un instant t.
    Inclut les coordonnées horizontales calculées (azimut/altitude).
    """

    id: int
    proper_name: str | None = None
    hip_id: int | None = None
    magnitude: float
    spectral_type: str | None = None
    constellation_abbr: str | None = None

    # Coordonnées horizontales calculées
    azimuth: float = Field(..., description="Azimut (degrés, 0=Nord, 90=Est)")
    altitude: float = Field(..., description="Altitude au-dessus de l'horizon (degrés)")

    model_config = {"from_attributes": True}
