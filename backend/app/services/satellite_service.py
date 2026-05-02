"""
Service de récupération des TLE satellites depuis CelesTrak.

Cache TTL 12h pour éviter de surcharger CelesTrak.
Chaque groupe de satellites est caché indépendamment.
"""

import logging

import httpx
from cachetools import TTLCache

from app.schemas.satellite import SatelliteTLE

logger = logging.getLogger(__name__)

# Cache 12h par groupe (max 10 groupes différents)
_tle_cache: TTLCache[str, list[SatelliteTLE]] = TTLCache(maxsize=10, ttl=43200)

# Mapping groupe → URL CelesTrak
CELESTRAK_GROUPS: dict[str, str] = {
    "stations": "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
    "starlink": "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
    "gps-ops": "https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle",
    "weather": "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle",
    "resource": "https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=tle",
    "science": "https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle",
    "galileo": "https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle",
    "active": "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle",
}

VALID_GROUPS = set(CELESTRAK_GROUPS.keys())


def parse_tle_text(text: str) -> list[SatelliteTLE]:
    """Parse un fichier TLE au format 3 lignes (nom, line1, line2) avec validation stricte."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    satellites: list[SatelliteTLE] = []

    i = 0
    while i < len(lines) - 2:
        line1 = lines[i + 1]
        line2 = lines[i + 2]
        # Validation : préfixe correct + longueur minimale TLE NORAD (69 caractères)
        if (
            line1.startswith("1 ")
            and line2.startswith("2 ")
            and len(line1) >= 69
            and len(line2) >= 69
        ):
            satellites.append(
                SatelliteTLE(
                    name=lines[i].strip(),
                    line1=line1.strip(),
                    line2=line2.strip(),
                )
            )
            i += 3
        else:
            i += 1

    return satellites


async def fetch_satellite_tles(group: str) -> list[SatelliteTLE]:
    """
    Récupère les TLEs d'un groupe de satellites depuis CelesTrak.

    Résultats cachés 12h. Lève ValueError si le groupe est inconnu.
    """
    if group not in VALID_GROUPS:
        raise ValueError(
            f"Groupe inconnu : '{group}'. Groupes valides : {sorted(VALID_GROUPS)}"
        )

    if group in _tle_cache:
        logger.debug("Cache hit pour le groupe '%s'", group)
        return _tle_cache[group]

    url = CELESTRAK_GROUPS[group]
    logger.info("Fetching TLE depuis CelesTrak pour le groupe '%s'", group)

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()

    # CelesTrak renvoie un message texte (200 OK) si les données n'ont pas changé
    # depuis le dernier téléchargement de cette IP (fenêtre de 2h).
    if "has not updated" in response.text:
        raise RuntimeError(
            f"CelesTrak limite les téléchargements à 1×/2h pour le groupe '{group}' "
            "(dernier téléchargement détecté par CelesTrak depuis cette IP). "
            "Réessayez dans 2 heures."
        )

    satellites = parse_tle_text(response.text)
    _tle_cache[group] = satellites
    logger.info("Groupe '%s' : %d satellites récupérés", group, len(satellites))

    return satellites
