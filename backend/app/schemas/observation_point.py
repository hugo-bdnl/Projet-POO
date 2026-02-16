"""
Schéma Pydantic pour les points d'observation.
"""

from pydantic import BaseModel, Field


class ObservationPointResponse(BaseModel):
    """Point d'observation (ville) retourné par l'API."""

    id: int
    name: str
    country: str | None = None
    latitude: float = Field(..., description="Latitude (degrés)")
    longitude: float = Field(..., description="Longitude (degrés)")
    timezone: str = Field(..., description="Fuseau horaire IANA")
    elevation: float | None = Field(0.0, description="Altitude en mètres")

    model_config = {"from_attributes": True}
