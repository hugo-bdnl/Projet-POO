"""
Service de récupération des TLE satellites depuis CelesTrak.

Cache double niveau :
- Mémoire (TTLCache 12h) : rapide, réinitialisé au cold start
- Disque (JSON, 12h) : persiste entre les redémarrages du serveur (Render free tier)
"""

import json
import logging
import time
from pathlib import Path

import httpx
from cachetools import TTLCache

from app.schemas.satellite import SatelliteTLE

logger = logging.getLogger(__name__)

# Cache mémoire 12h par groupe (max 10 groupes différents)
_tle_cache: TTLCache[str, list[SatelliteTLE]] = TTLCache(maxsize=10, ttl=43200)

# Cache disque — survit aux cold starts (TTL 12h identique au cache mémoire)
_DISK_CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "tle_cache"
_DISK_CACHE_TTL = 43200  # 12h en secondes

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


def _read_disk_cache(group: str) -> list[SatelliteTLE] | None:
    """Lit le cache disque pour un groupe. Retourne None si absent ou périmé (> 12h)."""
    cache_file = _DISK_CACHE_DIR / f"{group}.json"
    if not cache_file.exists():
        return None
    try:
        if time.time() - cache_file.stat().st_mtime > _DISK_CACHE_TTL:
            return None
        data = json.loads(cache_file.read_text(encoding="utf-8"))
        return [SatelliteTLE(**s) for s in data]
    except Exception as exc:
        logger.warning("Lecture cache disque '%s' échouée : %s", group, exc)
        return None


def _write_disk_cache(group: str, satellites: list[SatelliteTLE]) -> None:
    """Persiste les TLE sur disque pour survivre aux redémarrages."""
    try:
        _DISK_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_file = _DISK_CACHE_DIR / f"{group}.json"
        cache_file.write_text(
            json.dumps([s.model_dump() for s in satellites], ensure_ascii=False),
            encoding="utf-8",
        )
    except Exception as exc:
        logger.warning("Écriture cache disque '%s' échouée : %s", group, exc)


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

    Ordre de priorité :
    1. Cache mémoire (TTL 12h, réinitialisé au cold start)
    2. Cache disque JSON (TTL 12h, persiste entre les redémarrages)
    3. Fetch live depuis CelesTrak
    """
    if group not in VALID_GROUPS:
        raise ValueError(
            f"Groupe inconnu : '{group}'. Groupes valides : {sorted(VALID_GROUPS)}"
        )

    # 1. Cache mémoire
    if group in _tle_cache:
        logger.debug("Cache mémoire hit pour le groupe '%s'", group)
        return _tle_cache[group]

    # 2. Cache disque (cold start : mémoire vide mais fichier présent)
    disk_data = _read_disk_cache(group)
    if disk_data is not None:
        logger.info("Cache disque hit pour '%s' (%d satellites)", group, len(disk_data))
        _tle_cache[group] = disk_data
        return disk_data

    # 3. Fetch depuis CelesTrak
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
    _write_disk_cache(group, satellites)
    logger.info("Groupe '%s' : %d satellites récupérés et mis en cache disque", group, len(satellites))

    return satellites
