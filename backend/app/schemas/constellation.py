"""
Schémas Pydantic pour les constellations.
"""

from pydantic import BaseModel, Field


class ConstellationBase(BaseModel):
    """Propriétés de base d'une constellation."""

    id: int
    name: str = Field(..., description="Nom anglais (ex: Orion)")
    abbreviation: str = Field(..., description="Abréviation IAU 3 lettres (ex: ORI)")
    name_fr: str | None = Field(None, description="Nom français")

    model_config = {"from_attributes": True}


class ConstellationListResponse(ConstellationBase):
    """Constellation dans une liste (données minimales)."""

    center_ra: float | None = None
    center_dec: float | None = None


class ConstellationDetailResponse(ConstellationBase):
    """Détail complet d'une constellation avec pattern de lignes."""

    center_ra: float | None = None
    center_dec: float | None = None
    lines_data: str | None = Field(
        None,
        description="Pattern de lignes JSON: [[hip1,hip2], [hip2,hip3], ...]"
    )
    description: str | None = None
    star_ids: list[int] = Field(
        default_factory=list,
        description="IDs des étoiles participant au pattern"
    )


class BestLocationResponse(BaseModel):
    """
    Meilleur point d'observation pour voir une constellation
    à un instant donné.
    """

    observation_point_id: int
    observation_point_name: str
    latitude: float
    longitude: float
    constellation_altitude: float = Field(
        ..., description="Altitude moyenne du centre de la constellation (degrés)"
    )
    visibility_score: float = Field(
        ..., ge=0, le=100,
        description="Score de visibilité 0-100"
    )
