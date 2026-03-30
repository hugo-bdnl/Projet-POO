"""
Router pour les données satellites (TLE proxy CelesTrak).
"""

from fastapi import APIRouter, HTTPException, Query

from app.schemas.satellite import SatelliteTLEResponse
from app.services.satellite_service import (
    VALID_GROUPS,
    fetch_satellite_tles,
)

router = APIRouter(prefix="/api/satellites", tags=["Satellites"])


@router.get("/tle", response_model=SatelliteTLEResponse)
async def get_satellite_tles(
    group: str = Query(
        default="stations",
        description="Groupe de satellites CelesTrak",
        enum=sorted(VALID_GROUPS),
    ),
):
    """
    Récupère les TLE d'un groupe de satellites.

    Données proxiées depuis CelesTrak, cachées 12h.
    Groupes disponibles : stations, starlink, gps-ops, weather,
    resource, science, galileo, active.
    """
    try:
        satellites = await fetch_satellite_tles(group)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Impossible de récupérer les TLE depuis CelesTrak : {e}",
        )

    return SatelliteTLEResponse(
        group=group,
        count=len(satellites),
        satellites=satellites,
    )


@router.get("/groups")
async def get_available_groups():
    """Liste les groupes de satellites disponibles."""
    return {"groups": sorted(VALID_GROUPS)}
