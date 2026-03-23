"""
Endpoints pour les positions des rovers martiens.
Les positions sont stockées en base et éditables sans redéploiement.
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.rovers import RoverPosition, RoverPositionsResponse
from app.services.rovers_service import rovers_service

router = APIRouter(prefix="/api/rovers", tags=["Rovers"])

logger = logging.getLogger(__name__)


@router.get("/positions", response_model=RoverPositionsResponse)
def get_rover_positions(
    db: Session = Depends(get_db),
) -> RoverPositionsResponse:
    """
    Retourne les positions de tous les rovers martiens.

    Données stockées en base — modifiables sans redéploiement.
    Si la table est vide, les positions par défaut sont automatiquement insérées.

    @return: RoverPositionsResponse avec tous les rovers
    """
    rovers_data = rovers_service.get_all_positions(db)

    return RoverPositionsResponse(
        rovers=[RoverPosition(**r) for r in rovers_data],
        total=len(rovers_data),
    )
