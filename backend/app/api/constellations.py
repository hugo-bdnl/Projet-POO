"""
Routes API pour les constellations.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.constellation_repository import ConstellationRepository
from app.repositories.observation_point_repository import ObservationPointRepository
from app.services.astronomy_service import AstronomyService
from app.schemas.constellation import (
    ConstellationListResponse,
    ConstellationDetailResponse,
    BestLocationResponse,
)

router = APIRouter(prefix="/api/constellations", tags=["Constellations"])


@router.get("", response_model=list[ConstellationListResponse])
def get_all_constellations(db: Session = Depends(get_db)):
    """
    Retourne la liste des 88 constellations IAU.

    @param db: Session SQLAlchemy (injection)
    @return: Liste des constellations avec nom et abréviation
    """
    repo = ConstellationRepository(db)
    return repo.get_all()


@router.get("/search", response_model=list[ConstellationListResponse])
def search_constellations(
    q: str = Query(..., min_length=2, description="Terme de recherche"),
    db: Session = Depends(get_db),
):
    """
    Recherche de constellations par nom (français ou anglais).

    @param q: Terme de recherche
    @param db: Session SQLAlchemy (injection)
    @return: Liste de constellations correspondantes
    """
    repo = ConstellationRepository(db)
    return repo.search_by_name(q)


@router.get("/{constellation_id}", response_model=ConstellationDetailResponse)
def get_constellation_detail(
    constellation_id: int,
    db: Session = Depends(get_db),
):
    """
    Retourne les détails d'une constellation, incluant le pattern de lignes.

    @param constellation_id: Identifiant de la constellation
    @param db: Session SQLAlchemy (injection)
    @return: Détails complets avec pattern de lignes
    @raises HTTPException 404: Si la constellation n'existe pas
    """
    repo = ConstellationRepository(db)
    constellation = repo.get_by_id(constellation_id)

    if constellation is None:
        raise HTTPException(
            status_code=404,
            detail=f"Constellation #{constellation_id} non trouvée",
        )

    # Ajouter les IDs des étoiles du pattern
    star_ids = [star.id for star in constellation.stars] if constellation.stars else []

    return ConstellationDetailResponse(
        id=constellation.id,
        name=constellation.name,
        abbreviation=constellation.abbreviation,
        name_fr=constellation.name_fr,
        center_ra=constellation.center_ra,
        center_dec=constellation.center_dec,
        lines_data=constellation.lines_data,
        description=constellation.description,
        star_ids=star_ids,
    )


@router.get(
    "/{constellation_id}/best-location",
    response_model=BestLocationResponse,
)
def get_best_observation_point(
    constellation_id: int,
    timestamp: datetime | None = Query(
        None, description="Horodatage UTC (défaut: maintenant)"
    ),
    db: Session = Depends(get_db),
):
    """
    Trouve le meilleur point d'observation pour voir une constellation
    à un instant donné. Calcule l'altitude du centre de la constellation
    depuis chaque point et retourne celui avec la meilleure visibilité.

    @param constellation_id: ID de la constellation
    @param timestamp: Horodatage UTC (défaut: maintenant)
    @param db: Session SQLAlchemy (injection)
    @return: Meilleur point d'observation avec score de visibilité
    @raises HTTPException 404: Si constellation non trouvée
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    const_repo = ConstellationRepository(db)
    constellation = const_repo.get_by_id(constellation_id)

    if constellation is None:
        raise HTTPException(
            status_code=404,
            detail=f"Constellation #{constellation_id} non trouvée",
        )

    if constellation.center_ra is None or constellation.center_dec is None:
        raise HTTPException(
            status_code=422,
            detail="Coordonnées du centre de la constellation non disponibles",
        )

    # Calcul de l'altitude depuis chaque point d'observation
    obs_repo = ObservationPointRepository(db)
    points = obs_repo.get_all()

    best_point = None
    best_altitude = -90.0

    for point in points:
        position = AstronomyService.compute_single_position(
            ra=constellation.center_ra,
            dec=constellation.center_dec,
            latitude=point.latitude,
            longitude=point.longitude,
            timestamp=timestamp,
        )
        if position["altitude"] > best_altitude:
            best_altitude = position["altitude"]
            best_point = point

    if best_point is None or best_altitude <= 0:
        raise HTTPException(
            status_code=404,
            detail="Aucun point d'observation ne permet de voir cette constellation actuellement",
        )

    # Score de visibilité : 0-100 basé sur l'altitude (90° = score max)
    visibility_score = min(100.0, max(0.0, (best_altitude / 90.0) * 100.0))

    return BestLocationResponse(
        observation_point_id=best_point.id,
        observation_point_name=best_point.name,
        latitude=best_point.latitude,
        longitude=best_point.longitude,
        constellation_altitude=round(best_altitude, 2),
        visibility_score=round(visibility_score, 1),
    )
