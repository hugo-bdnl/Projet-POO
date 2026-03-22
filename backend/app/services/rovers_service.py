"""
Service pour récupérer les photos des rovers martiens via l'API NASA.
Cache TTL 1h — les nouvelles photos arrivent rarement (quelques fois par semaine).

Stratégie : l'endpoint /latest_photos est instable.
On passe par le manifest du rover pour récupérer max_sol, puis on
appelle /photos?sol=max_sol — approche recommandée par les exemples officiels NASA.
"""

import logging

import httpx
from cachetools import TTLCache

from app.config import settings

logger = logging.getLogger(__name__)

# Cache 1h, 5 rovers max (1 entrée par rover)
_photos_cache: TTLCache = TTLCache(maxsize=5, ttl=3600)

# Rovers supportés par l'API NASA Mars Rover Photos
VALID_ROVERS = frozenset({"curiosity", "opportunity", "spirit", "perseverance"})

_BASE = "https://api.nasa.gov/mars-photos/api/v1"
_HEADERS = {"User-Agent": "NightSkyViewer/2.0 (educational project)"}


class RoversService:
    """Récupère et met en cache les dernières photos des rovers martiens NASA."""

    async def get_latest_photos(self, rover: str, max_photos: int = 9) -> list[dict]:
        """
        Retourne les dernières photos d'un rover depuis l'API NASA.

        Étape 1 : appel manifest pour obtenir max_sol (dernier sol avec photos).
        Étape 2 : appel /photos?sol=max_sol pour récupérer les photos.

        @param rover: Identifiant du rover (curiosity, opportunity, spirit, perseverance)
        @param max_photos: Nombre max de photos à retourner (défaut : 9)
        @return: Liste de dicts normalisés
        @raises ValueError: Rover non reconnu
        @raises httpx.HTTPError: API NASA inaccessible
        """
        if rover not in VALID_ROVERS:
            raise ValueError(f"Rover invalide : {rover}")

        cache_key = f"photos_{rover}"
        if cache_key in _photos_cache:
            logger.debug("Cache hit photos rover %s", rover)
            return _photos_cache[cache_key][:max_photos]

        params = {"api_key": settings.NASA_API_KEY}

        async with httpx.AsyncClient(timeout=15.0, headers=_HEADERS) as client:
            # Étape 1 — manifest pour récupérer max_sol
            manifest_resp = await client.get(
                f"{_BASE}/manifests/{rover}", params=params
            )
            manifest_resp.raise_for_status()
            max_sol = manifest_resp.json()["photo_manifest"]["max_sol"]
            logger.debug("Rover %s — max_sol : %d", rover, max_sol)

            # Étape 2 — photos au dernier sol
            photos_resp = await client.get(
                f"{_BASE}/rovers/{rover}/photos",
                params={**params, "sol": max_sol},
            )
            photos_resp.raise_for_status()
            raw_photos = photos_resp.json().get("photos", [])

        photos = [
            {
                "id": p["id"],
                "img_src": p["img_src"],
                "earth_date": p["earth_date"],
                "sol": p["sol"],
                "camera_name": p["camera"]["name"],
                "camera_full_name": p["camera"]["full_name"],
            }
            for p in raw_photos
        ]

        _photos_cache[cache_key] = photos
        logger.info(
            "NASA photos rover %s (sol %d) : %d photos mis en cache",
            rover, max_sol, len(photos),
        )
        return photos[:max_photos]


rovers_service = RoversService()
