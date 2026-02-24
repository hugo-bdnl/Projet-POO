"""
Service de calculs astronomiques.
Transforme les coordonnées équatoriales (RA/Dec) en coordonnées
horizontales (azimut/altitude) pour un observateur à une position
et un temps donnés.

Utilise la vectorisation NumPy/AstroPy pour des performances optimales
(x50 plus rapide qu'une boucle Python).
"""

from datetime import datetime

import numpy as np
import astropy.units as u
from astropy.coordinates import SkyCoord, AltAz, EarthLocation
from astropy.time import Time

from app.models.star import Star
from app.services.cache_service import CacheService

# Instance du cache partagée
_cache = CacheService()


class AstronomyService:
    """
    Service de calculs astronomiques.

    Responsabilités :
    - Transformation coordonnées équatoriales → horizontales (vectorisée)
    - Filtrage des étoiles visibles (altitude > 0°)
    - Calcul du meilleur point d'observation pour une constellation
    """

    @staticmethod
    def compute_visible_stars(
        stars: list[Star],
        latitude: float,
        longitude: float,
        timestamp: datetime,
    ) -> list[dict]:
        """
        Calcule les positions horizontales de toutes les étoiles et retourne
        celles visibles (altitude > 0°).

        Utilise la vectorisation AstroPy : un seul appel transform_to()
        pour toutes les étoiles (au lieu d'une boucle).

        @param stars: Liste d'instances Star pré-filtrées (par magnitude/déclinaison)
        @param latitude: Latitude de l'observateur (degrés, N positif)
        @param longitude: Longitude de l'observateur (degrés, E positif)
        @param timestamp: Temps d'observation en UTC
        @return: Liste de dicts {id, proper_name, hip_id, magnitude,
                 spectral_type, constellation_abbr, azimuth, altitude}
        """
        if not stars:
            return []

        # Clé de cache arrondie à 5 minutes
        cache_key = _cache.make_time_key(
            "visible", latitude, longitude, timestamp
        )
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        # Extraction vectorisée des coordonnées RA/Dec (NumPy arrays)
        ra_array = np.array([s.ra for s in stars], dtype=np.float64)
        dec_array = np.array([s.dec for s in stars], dtype=np.float64)

        # Position de l'observateur
        location = EarthLocation(
            lat=latitude * u.degree,
            lon=longitude * u.degree,
        )

        # Temps d'observation
        obs_time = Time(timestamp)

        # Référentiel horizontal local
        altaz_frame = AltAz(obstime=obs_time, location=location)

        # Transformation vectorisée — TOUTES les étoiles en un seul appel
        sky_coords = SkyCoord(
            ra=ra_array * u.degree,
            dec=dec_array * u.degree,
            frame="icrs",
        )
        altaz_coords = sky_coords.transform_to(altaz_frame)

        # Extraction des résultats NumPy
        altitudes = altaz_coords.alt.degree
        azimuths = altaz_coords.az.degree

        # Filtrage : altitude > 0° (au-dessus de l'horizon)
        visible_mask = altitudes > 0
        result = []

        for i, star in enumerate(stars):
            if visible_mask[i]:
                result.append({
                    "id": star.id,
                    "proper_name": star.proper_name,
                    "hip_id": star.hip_id,
                    "magnitude": star.magnitude,
                    "spectral_type": star.spectral_type,
                    "constellation_abbr": star.constellation_abbr,
                    "azimuth": round(float(azimuths[i]), 4),
                    "altitude": round(float(altitudes[i]), 4),
                })

        # Mise en cache
        _cache.set(cache_key, result)

        return result

    @staticmethod
    def compute_single_position(
        ra: float,
        dec: float,
        latitude: float,
        longitude: float,
        timestamp: datetime,
    ) -> dict:
        """
        Calcule la position horizontale d'un seul objet céleste.

        @param ra: Ascension droite (degrés, J2000)
        @param dec: Déclinaison (degrés, J2000)
        @param latitude: Latitude de l'observateur (degrés)
        @param longitude: Longitude de l'observateur (degrés)
        @param timestamp: Temps d'observation UTC
        @return: Dict {azimuth, altitude, visible}
        """
        location = EarthLocation(
            lat=latitude * u.degree,
            lon=longitude * u.degree,
        )
        obs_time = Time(timestamp)
        altaz_frame = AltAz(obstime=obs_time, location=location)

        sky_coord = SkyCoord(
            ra=ra * u.degree,
            dec=dec * u.degree,
            frame="icrs",
        )
        altaz = sky_coord.transform_to(altaz_frame)

        return {
            "azimuth": round(float(altaz.az.degree), 4),
            "altitude": round(float(altaz.alt.degree), 4),
            "visible": bool(altaz.alt.degree > 0),
        }

    @staticmethod
    def compute_best_observation_point(
        ra: float,
        dec: float,
        points: list,
        timestamp: datetime,
    ) -> dict | None:
        """
        Trouve le meilleur point d'observation pour un objet céleste
        en calculant l'altitude depuis TOUS les points en un seul
        appel vectorisé AstroPy (au lieu d'une boucle séquentielle).

        @param ra: Ascension droite de l'objet (degrés, J2000)
        @param dec: Déclinaison de l'objet (degrés, J2000)
        @param points: Liste de points d'observation (avec .latitude, .longitude)
        @param timestamp: Temps d'observation UTC
        @return: Dict {point, altitude} du meilleur point, ou None
        """
        if not points:
            return None

        # Arrays vectorisés de toutes les positions d'observation
        lat_array = np.array([p.latitude for p in points], dtype=np.float64)
        lon_array = np.array([p.longitude for p in points], dtype=np.float64)

        # Création vectorisée de TOUTES les EarthLocation en un seul appel
        locations = EarthLocation(
            lat=lat_array * u.degree,
            lon=lon_array * u.degree,
        )

        obs_time = Time(timestamp)

        # Un AltAz frame par location (vectorisé nativement par AstroPy)
        altaz_frames = AltAz(obstime=obs_time, location=locations)

        # Un seul SkyCoord pour l'objet céleste
        sky_coord = SkyCoord(
            ra=ra * u.degree,
            dec=dec * u.degree,
            frame="icrs",
        )

        # Transformation vectorisée — TOUTES les locations en un seul appel
        altaz_coords = sky_coord.transform_to(altaz_frames)
        altitudes = altaz_coords.alt.degree

        # Trouver le meilleur point (altitude maximale)
        best_idx = int(np.argmax(altitudes))
        best_altitude = float(altitudes[best_idx])

        if best_altitude <= 0:
            return None

        return {
            "point": points[best_idx],
            "altitude": best_altitude,
        }
