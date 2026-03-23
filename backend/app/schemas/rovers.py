"""Schémas Pydantic pour les positions des rovers martiens."""

from pydantic import BaseModel


class RoverPosition(BaseModel):
    """Position et statut d'un rover martien."""

    slug: str
    name: str
    agency: str
    active: bool
    latitude: float
    longitude: float
    landing_site: str


class RoverPositionsResponse(BaseModel):
    """Réponse de l'endpoint positions des rovers."""

    rovers: list[RoverPosition]
    total: int
