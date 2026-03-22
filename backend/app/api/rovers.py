"""
Endpoints pour les données des rovers martiens.
Proxy vers l'API NASA Mars Rover Photos — cache 1h côté serveur.
"""

import logging

from fastapi import APIRouter, HTTPException, Path

from app.schemas.rovers import RoverPhoto, RoverPhotosResponse
from app.services.rovers_service import VALID_ROVERS, rovers_service

router = APIRouter(prefix="/api/rovers", tags=["Rovers"])

logger = logging.getLogger(__name__)


@router.get("/{rover}/photos", response_model=RoverPhotosResponse)
async def get_rover_photos(
    rover: str = Path(
        ..., description="Identifiant du rover NASA", examples=["curiosity"]
    ),
) -> RoverPhotosResponse:
    """
    Retourne les dernières photos envoyées par un rover martien.

    Les données sont mises en cache 1h côté serveur pour limiter les appels NASA.

    @param rover: curiosity | opportunity | spirit | perseverance
    @return: RoverPhotosResponse avec max 9 photos
    @raises 400: Rover invalide
    @raises 502: API NASA inaccessible
    """
    rover_lower = rover.lower()

    if rover_lower not in VALID_ROVERS:
        raise HTTPException(
            status_code=400,
            detail=f"Rover invalide. Valeurs acceptées : {', '.join(sorted(VALID_ROVERS))}",
        )

    try:
        photos_data = await rovers_service.get_latest_photos(rover_lower)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Erreur fetch photos rover %s : %s", rover, e)
        raise HTTPException(
            status_code=503,
            detail="API NASA Mars Photos temporairement indisponible",
        )

    return RoverPhotosResponse(
        rover=rover_lower,
        photos=[RoverPhoto(**p) for p in photos_data],
        total=len(photos_data),
    )
