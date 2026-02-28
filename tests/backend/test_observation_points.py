"""
Tests pour les points d'observation.
Vérifie l'intégrité des données en base et le bon fonctionnement
de l'endpoint GET /api/observation-points.

Usage :
    cd backend
    python -m pytest tests/test_observation_points.py -v
"""

import sys
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func

# Ensure app modules are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.observation_point import ObservationPoint
from app.main import app


# ─── Fixtures ────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def db():
    """Fournit une session DB pour tous les tests du module."""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def client():
    """Fournit un client HTTP TestClient pour les tests d'intégration API."""
    with TestClient(app) as c:
        yield c


# ═══════════════════════════════════════════════════════════════════
#  TESTS DE DONNÉES (accès direct à la DB)
# ═══════════════════════════════════════════════════════════════════

class TestObservationPointCount:
    """Vérifie le nombre total de points d'observation importés."""

    def test_50_observation_points_imported(self, db):
        """Il doit y avoir exactement 50 points d'observation."""
        count = db.query(func.count(ObservationPoint.id)).scalar()
        assert count == 50, f"Attendu 50 points d'observation, trouvé {count}"


class TestObservationPointDataQuality:
    """Vérifie la qualité des données de chaque point d'observation."""

    def test_all_have_name(self, db):
        """Chaque point doit avoir un nom non vide."""
        points = db.query(ObservationPoint).all()
        for p in points:
            assert p.name is not None and len(p.name) > 0, (
                f"Point id={p.id} sans nom"
            )

    def test_all_have_valid_latitude(self, db):
        """Les latitudes doivent être dans [-90, 90]."""
        points = db.query(ObservationPoint).all()
        for p in points:
            assert p.latitude is not None, (
                f"Point '{p.name}' sans latitude"
            )
            assert -90 <= p.latitude <= 90, (
                f"Latitude {p.latitude} de '{p.name}' hors de [-90, 90]"
            )

    def test_all_have_valid_longitude(self, db):
        """Les longitudes doivent être dans [-180, 180]."""
        points = db.query(ObservationPoint).all()
        for p in points:
            assert p.longitude is not None, (
                f"Point '{p.name}' sans longitude"
            )
            assert -180 <= p.longitude <= 180, (
                f"Longitude {p.longitude} de '{p.name}' hors de [-180, 180]"
            )

    def test_all_have_timezone(self, db):
        """Chaque point doit avoir un fuseau horaire non vide."""
        points = db.query(ObservationPoint).all()
        for p in points:
            assert p.timezone is not None and len(p.timezone) > 0, (
                f"Point '{p.name}' sans fuseau horaire"
            )

    def test_unique_names(self, db):
        """Tous les noms de points d'observation doivent être uniques."""
        names = [
            p.name
            for p in db.query(ObservationPoint.name).all()
        ]
        duplicates = [n for n in names if names.count(n) > 1]
        assert len(names) == len(set(names)), (
            f"Noms en double : {set(duplicates)}"
        )


class TestKnownObservationPoints:
    """Vérifie des villes et sites astronomiques connus."""

    def test_paris_exists(self, db):
        """Paris doit exister comme point d'observation."""
        paris = db.query(ObservationPoint).filter(
            ObservationPoint.name.ilike("%paris%")
        ).first()
        assert paris is not None, "Paris non trouvé"
        assert abs(paris.latitude - 48.8566) < 1.0, (
            f"Latitude de Paris incorrecte : {paris.latitude}"
        )

    def test_tokyo_exists(self, db):
        """Tokyo doit exister comme point d'observation."""
        tokyo = db.query(ObservationPoint).filter(
            ObservationPoint.name.ilike("%tokyo%")
        ).first()
        assert tokyo is not None, "Tokyo non trouvé"
        assert abs(tokyo.latitude - 35.6762) < 1.0, (
            f"Latitude de Tokyo incorrecte : {tokyo.latitude}"
        )

    def test_new_york_exists(self, db):
        """New York doit exister comme point d'observation."""
        ny = db.query(ObservationPoint).filter(
            ObservationPoint.name.ilike("%new york%")
        ).first()
        assert ny is not None, "New York non trouvé"
        assert abs(ny.latitude - 40.7128) < 1.0, (
            f"Latitude de New York incorrecte : {ny.latitude}"
        )

    def test_mauna_kea_exists(self, db):
        """Mauna Kea (site astronomique) doit exister."""
        mk = db.query(ObservationPoint).filter(
            ObservationPoint.name.ilike("%mauna kea%")
        ).first()
        assert mk is not None, "Mauna Kea non trouvé"
        # Mauna Kea est à environ 4207m d'altitude
        if mk.elevation is not None:
            assert mk.elevation > 3000, (
                f"Altitude de Mauna Kea trop basse : {mk.elevation}m"
            )

    def test_atacama_exists(self, db):
        """Atacama (site astronomique) doit exister."""
        atacama = db.query(ObservationPoint).filter(
            ObservationPoint.name.ilike("%atacama%")
        ).first()
        assert atacama is not None, "Atacama non trouvé"
        # Atacama est dans l'hémisphère sud
        assert atacama.latitude < 0, (
            f"Atacama devrait être dans l'hémisphère sud, lat={atacama.latitude}"
        )


# ═══════════════════════════════════════════════════════════════════
#  TESTS D'INTÉGRATION API (TestClient FastAPI)
# ═══════════════════════════════════════════════════════════════════

class TestObservationPointsAPI:
    """Tests d'intégration de l'endpoint GET /api/observation-points."""

    def test_get_all_returns_200(self, client):
        """GET /api/observation-points doit retourner 200."""
        response = client.get("/api/observation-points")
        assert response.status_code == 200

    def test_get_all_returns_list(self, client):
        """GET /api/observation-points doit retourner une liste."""
        response = client.get("/api/observation-points")
        data = response.json()
        assert isinstance(data, list)

    def test_get_all_returns_50_points(self, client):
        """GET /api/observation-points doit retourner 50 points."""
        response = client.get("/api/observation-points")
        data = response.json()
        assert len(data) == 50, f"Attendu 50 points, reçu {len(data)}"

    def test_get_all_has_required_fields(self, client):
        """Chaque point doit contenir les champs requis."""
        response = client.get("/api/observation-points")
        data = response.json()
        required_fields = {"id", "name", "latitude", "longitude", "timezone"}
        for point in data:
            missing = required_fields - set(point.keys())
            assert not missing, (
                f"Champs manquants pour '{point.get('name', '?')}' : {missing}"
            )

    def test_get_all_is_sorted_by_name(self, client):
        """Les points doivent être triés par nom (alphabétique)."""
        response = client.get("/api/observation-points")
        data = response.json()
        names = [p["name"] for p in data]
        assert names == sorted(names), "Les points ne sont pas triés par nom"

    def test_get_by_id_returns_200(self, client):
        """GET /api/observation-points/1 doit retourner 200."""
        response = client.get("/api/observation-points/1")
        assert response.status_code == 200

    def test_get_by_id_returns_correct_fields(self, client):
        """GET /api/observation-points/{id} doit retourner les bons champs."""
        response = client.get("/api/observation-points/1")
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "latitude" in data
        assert "longitude" in data
        assert "timezone" in data
        assert data["id"] == 1

    def test_get_by_id_not_found_returns_404(self, client):
        """GET /api/observation-points/99999 doit retourner 404."""
        response = client.get("/api/observation-points/99999")
        assert response.status_code == 404
