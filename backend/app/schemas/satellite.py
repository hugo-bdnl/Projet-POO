"""
Schémas Pydantic pour les données satellites (TLE).
"""

from pydantic import BaseModel


class SatelliteTLE(BaseModel):
    """Un satellite avec ses Two-Line Elements."""

    name: str
    line1: str
    line2: str


class SatelliteTLEResponse(BaseModel):
    """Réponse groupée de TLEs satellites."""

    group: str
    count: int
    satellites: list[SatelliteTLE]
