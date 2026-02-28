"""
Tests unitaires des services — AstronomyService et CacheService.

Tâche 4 du plan semaines 3-4 :
  - AstronomyService : compute_visible_stars, compute_single_position
  - CacheService : get/set, make_time_key, clear

Usage :
    cd backend
    python -m pytest tests/test_services.py -v
"""

import sys
import os
from datetime import datetime, timezone

import pytest

# Ensure app modules are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.cache_service import CacheService
from app.services.astronomy_service import AstronomyService
from app.database import SessionLocal
from app.models.star import Star


# ─── Fixtures ────────────────────────────────────────────────────────

@pytest.fixture
def cache():
    """Fournit une instance CacheService propre pour chaque test."""
    cs = CacheService()
    cs.clear()
    yield cs
    cs.clear()


@pytest.fixture(scope="module")
def db():
    """Fournit une session DB pour les tests qui nécessitent de vraies étoiles."""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def sample_stars(db):
    """
    Récupère un petit échantillon d'étoiles brillantes pour tester
    compute_visible_stars sans surcharger les tests.
    """
    stars = (
        db.query(Star)
        .filter(Star.magnitude < 3.0)
        .limit(50)
        .all()
    )
    return stars


# ═══════════════════════════════════════════════════════════════════
#  TESTS CACHESERVICE
# ═══════════════════════════════════════════════════════════════════

class TestCacheServiceGetSet:
    """Tests des opérations get/set du cache dynamique."""

    def test_set_then_get_returns_value(self, cache):
        """set suivi de get doit retourner la même valeur."""
        cache.set("test_key", {"data": 42})
        result = cache.get("test_key")
        assert result == {"data": 42}

    def test_get_missing_key_returns_none(self, cache):
        """get d'une clé inexistante doit retourner None."""
        result = cache.get("nonexistent_key")
        assert result is None

    def test_set_overwrites_existing(self, cache):
        """set avec la même clé doit écraser la valeur précédente."""
        cache.set("key1", "old")
        cache.set("key1", "new")
        assert cache.get("key1") == "new"

    def test_set_stores_different_types(self, cache):
        """Le cache doit accepter différents types de valeurs."""
        cache.set("str_key", "hello")
        cache.set("list_key", [1, 2, 3])
        cache.set("dict_key", {"a": 1})

        assert cache.get("str_key") == "hello"
        assert cache.get("list_key") == [1, 2, 3]
        assert cache.get("dict_key") == {"a": 1}


class TestCacheServiceStatic:
    """Tests des opérations get_static/set_static du cache statique."""

    def test_static_set_then_get(self, cache):
        """set_static suivi de get_static doit retourner la valeur."""
        cache.set_static("static_key", "static_value")
        result = cache.get_static("static_key")
        assert result == "static_value"

    def test_static_get_missing_returns_none(self, cache):
        """get_static d'une clé absente doit retourner None."""
        result = cache.get_static("missing_static")
        assert result is None


class TestCacheServiceMakeTimeKey:
    """Tests de la génération de clés de cache temporelles."""

    def test_make_time_key_returns_string(self):
        """make_time_key doit retourner une chaîne."""
        ts = datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
        key = CacheService.make_time_key("visible", 48.86, 2.35, ts)
        assert isinstance(key, str)

    def test_make_time_key_contains_prefix(self):
        """La clé doit contenir le préfixe."""
        ts = datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
        key = CacheService.make_time_key("visible", 48.86, 2.35, ts)
        assert key.startswith("visible:")

    def test_make_time_key_rounds_to_5_minutes(self):
        """Deux timestamps dans le même intervalle de 5min donnent la même clé."""
        ts1 = datetime(2024, 6, 15, 12, 2, 0, tzinfo=timezone.utc)
        ts2 = datetime(2024, 6, 15, 12, 4, 0, tzinfo=timezone.utc)
        key1 = CacheService.make_time_key("visible", 48.86, 2.35, ts1)
        key2 = CacheService.make_time_key("visible", 48.86, 2.35, ts2)
        assert key1 == key2, "Clés différentes dans le même intervalle 5min"

    def test_make_time_key_different_intervals(self):
        """Deux timestamps dans des intervalles différents donnent des clés différentes."""
        ts1 = datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
        ts2 = datetime(2024, 6, 15, 12, 6, 0, tzinfo=timezone.utc)
        key1 = CacheService.make_time_key("visible", 48.86, 2.35, ts1)
        key2 = CacheService.make_time_key("visible", 48.86, 2.35, ts2)
        assert key1 != key2, "Clés identiques pour des intervalles différents"

    def test_make_time_key_different_locations(self):
        """Des positions différentes donnent des clés différentes."""
        ts = datetime(2024, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
        key_paris = CacheService.make_time_key("visible", 48.86, 2.35, ts)
        key_tokyo = CacheService.make_time_key("visible", 35.68, 139.69, ts)
        assert key_paris != key_tokyo


class TestCacheServiceClear:
    """Tests du vidage du cache."""

    def test_clear_removes_all_entries(self, cache):
        """clear doit vider le cache dynamique et statique."""
        cache.set("dyn_key", "dyn_val")
        cache.set_static("stat_key", "stat_val")

        cache.clear()

        assert cache.get("dyn_key") is None
        assert cache.get_static("stat_key") is None


# ═══════════════════════════════════════════════════════════════════
#  TESTS ASTRONOMYSERVICE
# ═══════════════════════════════════════════════════════════════════

class TestComputeSinglePosition:
    """Tests de AstronomyService.compute_single_position."""

    def test_returns_dict_with_required_keys(self):
        """compute_single_position doit retourner azimuth, altitude, visible."""
        ts = datetime(2024, 6, 15, 22, 0, 0, tzinfo=timezone.utc)
        result = AstronomyService.compute_single_position(
            ra=0.0, dec=0.0, latitude=48.86, longitude=2.35, timestamp=ts
        )
        assert isinstance(result, dict)
        assert "azimuth" in result
        assert "altitude" in result
        assert "visible" in result

    def test_azimuth_in_valid_range(self):
        """L'azimut doit être dans [0, 360]."""
        ts = datetime(2024, 6, 15, 22, 0, 0, tzinfo=timezone.utc)
        result = AstronomyService.compute_single_position(
            ra=100.0, dec=20.0, latitude=48.86, longitude=2.35, timestamp=ts
        )
        assert 0 <= result["azimuth"] <= 360

    def test_altitude_in_valid_range(self):
        """L'altitude doit être dans [-90, 90]."""
        ts = datetime(2024, 6, 15, 22, 0, 0, tzinfo=timezone.utc)
        result = AstronomyService.compute_single_position(
            ra=100.0, dec=20.0, latitude=48.86, longitude=2.35, timestamp=ts
        )
        assert -90 <= result["altitude"] <= 90

    def test_visible_matches_altitude(self):
        """visible doit être True si altitude > 0, False sinon."""
        ts = datetime(2024, 6, 15, 22, 0, 0, tzinfo=timezone.utc)
        result = AstronomyService.compute_single_position(
            ra=100.0, dec=20.0, latitude=48.86, longitude=2.35, timestamp=ts
        )
        expected = result["altitude"] > 0
        assert result["visible"] == expected

    def test_polaris_visible_from_paris(self):
        """
        Polaris (RA ≈ 37.95°, Dec ≈ 89.26°) doit être visible depuis Paris
        à toute heure, avec une altitude ≈ latitude de Paris (~48°).
        """
        ts = datetime(2024, 6, 15, 22, 0, 0, tzinfo=timezone.utc)
        result = AstronomyService.compute_single_position(
            ra=37.95, dec=89.26,
            latitude=48.86, longitude=2.35,
            timestamp=ts,
        )
        assert result["visible"] is True, "Polaris non visible depuis Paris"
        # L'altitude de Polaris ≈ latitude de l'observateur (+/- quelques degrés)
        assert abs(result["altitude"] - 48.86) < 5, (
            f"Altitude de Polaris inattendue : {result['altitude']}° "
            f"(attendu ≈ {48.86}°)"
        )

    def test_polaris_not_visible_from_south_pole(self):
        """Polaris ne doit pas être visible depuis le pôle Sud."""
        ts = datetime(2024, 6, 15, 22, 0, 0, tzinfo=timezone.utc)
        result = AstronomyService.compute_single_position(
            ra=37.95, dec=89.26,
            latitude=-90.0, longitude=0.0,
            timestamp=ts,
        )
        assert result["visible"] is False, (
            "Polaris visible depuis le pôle Sud !"
        )


class TestComputeVisibleStars:
    """Tests de AstronomyService.compute_visible_stars."""

    def test_empty_list_returns_empty(self):
        """Une liste vide d'étoiles doit retourner une liste vide."""
        ts = datetime(2024, 6, 15, 22, 0, 0, tzinfo=timezone.utc)
        result = AstronomyService.compute_visible_stars(
            stars=[], latitude=48.86, longitude=2.35, timestamp=ts
        )
        assert result == []

    def test_returns_list_of_dicts(self, sample_stars):
        """compute_visible_stars doit retourner une liste de dicts."""
        ts = datetime(2024, 6, 15, 22, 0, 0, tzinfo=timezone.utc)
        result = AstronomyService.compute_visible_stars(
            stars=sample_stars, latitude=48.86, longitude=2.35, timestamp=ts
        )
        assert isinstance(result, list)
        if len(result) > 0:
            assert isinstance(result[0], dict)

    def test_visible_stars_have_required_keys(self, sample_stars):
        """Chaque étoile visible doit avoir id, azimuth, altitude, magnitude."""
        ts = datetime(2024, 6, 15, 22, 0, 0, tzinfo=timezone.utc)
        result = AstronomyService.compute_visible_stars(
            stars=sample_stars, latitude=48.86, longitude=2.35, timestamp=ts
        )
        required = {"id", "azimuth", "altitude", "magnitude"}
        for star in result[:5]:
            missing = required - set(star.keys())
            assert not missing, f"Champs manquants : {missing}"

    def test_all_visible_have_positive_altitude(self, sample_stars):
        """Toutes les étoiles retournées doivent avoir altitude > 0."""
        ts = datetime(2024, 6, 15, 22, 0, 0, tzinfo=timezone.utc)
        result = AstronomyService.compute_visible_stars(
            stars=sample_stars, latitude=48.86, longitude=2.35, timestamp=ts
        )
        for star in result:
            assert star["altitude"] > 0, (
                f"Étoile id={star['id']} sous l'horizon"
            )
