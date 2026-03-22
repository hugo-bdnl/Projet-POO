"""Schémas Pydantic pour les données des rovers martiens."""

from pydantic import BaseModel


class RoverPhoto(BaseModel):
    """Une photo individuelle envoyée par un rover."""

    id: int
    img_src: str
    earth_date: str
    sol: int
    camera_name: str
    camera_full_name: str


class RoverPhotosResponse(BaseModel):
    """Réponse de l'endpoint photos d'un rover."""

    rover: str
    photos: list[RoverPhoto]
    total: int
