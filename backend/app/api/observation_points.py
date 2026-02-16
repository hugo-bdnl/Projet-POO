"""
Routes API pour les points d'observation.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.observation_point_repository import ObservationPointRepository
from app.schemas.observation_point import ObservationPointResponse

router = APIRouter(prefix="/api/observation-points", tags=["Observation Points"])


@router.get("", response_model=list[ObservationPointResponse])
def get_all_observation_points(db: Session = Depends(get_db)):
    """
    Retourne tous les points d'observation disponibles (villes mondiales).

    @param db: Session SQLAlchemy (injection)
    @return: Liste de tous les points d'observation
    """
    repo = ObservationPointRepository(db)
    return repo.get_all()


@router.get("/{point_id}", response_model=ObservationPointResponse)
def get_observation_point(
    point_id: int,
    db: Session = Depends(get_db),
):
    """
    Retourne les détails d'un point d'observation.

    @param point_id: Identifiant du point d'observation
    @param db: Session SQLAlchemy (injection)
    @return: Détails du point d'observation
    @raises HTTPException 404: Si le point n'existe pas
    """
    repo = ObservationPointRepository(db)
    point = repo.get_by_id(point_id)

    if point is None:
        raise HTTPException(
            status_code=404,
            detail=f"Point d'observation #{point_id} non trouvé",
        )

    return point
