"""
Service de cache en mémoire utilisant cachetools.
Remplace Redis pour simplifier l'infrastructure tout en conservant
des performances de cache optimales pour un projet étudiant.
"""

from datetime import datetime

from cachetools import TTLCache

from app.config import settings


class CacheService:
    """
    Cache en mémoire avec TTL (Time To Live).

    Utilise un singleton interne pour partager le cache entre
    toutes les instances du service. Thread-safe via cachetools.
    """

    # Cache partagé (singleton au niveau module)
    _stars_cache: TTLCache = TTLCache(
        maxsize=settings.CACHE_MAX_SIZE,
        ttl=settings.CACHE_TTL_STARS,
    )
    _static_cache: TTLCache = TTLCache(
        maxsize=128,
        ttl=settings.CACHE_TTL_STATIC,
    )

    def get(self, key: str) -> object | None:
        """
        Récupère une valeur du cache dynamique (étoiles/positions).

        @param key: Clé de cache
        @return: Valeur cachée ou None si absente/expirée
        """
        return self._stars_cache.get(key)

    def set(self, key: str, value: object) -> None:
        """
        Stocke une valeur dans le cache dynamique.

        @param key: Clé de cache
        @param value: Valeur à stocker
        """
        self._stars_cache[key] = value

    def get_static(self, key: str) -> object | None:
        """
        Récupère une valeur du cache statique (constellations, etc.).

        @param key: Clé de cache
        @return: Valeur cachée ou None
        """
        return self._static_cache.get(key)

    def set_static(self, key: str, value: object) -> None:
        """
        Stocke une valeur dans le cache statique (TTL long).

        @param key: Clé de cache
        @param value: Valeur à stocker
        """
        self._static_cache[key] = value

    @staticmethod
    def make_time_key(prefix: str, lat: float, lon: float, timestamp: datetime, *args) -> str:
        """
        Génère une clé de cache arrondie à 5 minutes.
        Les positions des étoiles changent très lentement :
        arrondir évite de recalculer inutilement.

        @param prefix: Préfixe de la clé (ex: 'visible')
        @param lat: Latitude arrondie à 2 décimales
        @param lon: Longitude arrondie à 2 décimales
        @param timestamp: Horodatage arrondi à 5 minutes
        @param args: Autres paramètres à inclure dans la clé (ex: mag_limit)
        @return: Clé de cache unique
        """
        # Arrondi à 5 minutes (300 secondes)
        rounded_ts = int(timestamp.timestamp()) // 300 * 300
        key = f"{prefix}:{round(lat, 2)}:{round(lon, 2)}:{rounded_ts}"
        for arg in args:
            key += f":{arg}"
        return key

    def clear(self) -> None:
        """Vide tous les caches."""
        self._stars_cache.clear()
        self._static_cache.clear()
