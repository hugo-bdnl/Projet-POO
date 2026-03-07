"""
Routes API pour les étoiles.
Fournit les endpoints de consultation et de calcul de visibilité.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.repositories.star_repository import StarRepository
from app.services.astronomy_service import AstronomyService
from app.schemas.star import StarDetail, VisibleStarResponse

router = APIRouter(prefix="/api/stars", tags=["Stars"])


@router.get("/visible", response_model=list[VisibleStarResponse])
def get_visible_stars(
    lat: float = Query(..., ge=-90, le=90, description="Latitude observateur"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude observateur"),
    timestamp: datetime | None = Query(
        None, description="Horodatage UTC (ISO 8601). Défaut: maintenant"
    ),
    mag_limit: float = Query(
        settings.DEFAULT_MAG_LIMIT,
        ge=-2, le=12,
        description="Magnitude limite (défaut: 6.0 = œil nu)",
    ),
    db: Session = Depends(get_db),
):
    """
    Retourne les étoiles visibles depuis un point d'observation à un instant t.

    Effectue un pré-filtrage SQL par magnitude et déclinaison,
    puis calcule les positions horizontales (azimut/altitude) via AstroPy
    pour ne retourner que les étoiles au-dessus de l'horizon.

    @param lat: Latitude de l'observateur (degrés, -90 à 90)
    @param lon: Longitude de l'observateur (degrés, -180 à 180)
    @param timestamp: Temps d'observation UTC (défaut: heure actuelle)
    @param mag_limit: Magnitude maximale (défaut: 6.0)
    @param db: Session SQLAlchemy (injection)
    @return: Liste d'étoiles visibles avec coordonnées horizontales
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    repo = StarRepository(db)

    # Pré-filtrage SQL : magnitude + plage de déclinaison possible
    stars = repo.get_by_magnitude_and_declination(
        mag_limit=mag_limit,
        dec_min=lat - 90,
        dec_max=lat + 90,
    )

    # Calcul vectorisé des positions horizontales
    visible = AstronomyService.compute_visible_stars(
        stars=stars,
        latitude=lat,
        longitude=lon,
        timestamp=timestamp,
        mag_limit=mag_limit,
    )

    return visible


@router.get("/{star_id}", response_model=StarDetail)
def get_star_detail(
    star_id: int,
    db: Session = Depends(get_db),
):
    """
    Retourne les détails complets d'une étoile.

    @param star_id: Identifiant unique de l'étoile
    @param db: Session SQLAlchemy (injection)
    @return: Détails complets de l'étoile
    @raises HTTPException 404: Si l'étoile n'existe pas
    """
    repo = StarRepository(db)
    star = repo.get_by_id(star_id)

    if star is None:
        raise HTTPException(status_code=404, detail=f"Étoile #{star_id} non trouvée")

    return star


@router.get("/search/{query}", response_model=list[StarDetail])
def search_stars(
    query: str,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Recherche d'étoiles par nom.

    @param query: Terme de recherche (minimum 2 caractères)
    @param limit: Nombre maximum de résultats
    @param db: Session SQLAlchemy (injection)
    @return: Liste d'étoiles correspondantes
    """
    if len(query) < 2:
        raise HTTPException(
            status_code=400,
            detail="Le terme de recherche doit faire au moins 2 caractères",
        )

    repo = StarRepository(db)
    return repo.search_by_name(query, limit=limit)
