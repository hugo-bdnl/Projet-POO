"""
Tests d'intégrité des données de constellations importées
et tests d'intégration des endpoints API constellations + health.

Tâche 5 du plan semaines 3-4 :
  - Tests API GET /api/constellations, GET /{id}, GET /search, GET /{id}/best-location
  - Tests Health GET /, GET /api/health

Usage :
    cd backend
    python -m pytest tests/test_constellations.py -v
"""

import json
import sys
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func

# Ensure app modules are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.constellation import Constellation, ConstellationStar
from app.models.star import Star
from app.main import app


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


class TestConstellationCount:
    """Vérifie le nombre total de constellations importées."""

    def test_88_constellations_imported(self, db):
        """Il doit y avoir exactement 88 constellations IAU."""
        count = db.query(func.count(Constellation.id)).scalar()
        assert count == 88, f"Attendu 88 constellations, trouvé {count}"


class TestConstellationData:
    """Vérifie la qualité des données de chaque constellation."""

    def test_all_have_valid_abbreviation(self, db):
        """Chaque constellation doit avoir une abréviation de 2-3 lettres majuscules."""
        constellations = db.query(Constellation).all()
        for c in constellations:
            assert c.abbreviation is not None, f"Constellation {c.name} sans abréviation"
            assert 2 <= len(c.abbreviation) <= 3, (
                f"Abréviation '{c.abbreviation}' de {c.name} : longueur {len(c.abbreviation)}"
            )
            assert c.abbreviation == c.abbreviation.upper(), (
                f"Abréviation '{c.abbreviation}' n'est pas en majuscules"
            )

    def test_all_have_name(self, db):
        """Chaque constellation doit avoir un nom anglais."""
        constellations = db.query(Constellation).all()
        for c in constellations:
            assert c.name is not None and len(c.name) > 0, (
                f"Constellation id={c.id} sans nom"
            )

    def test_all_have_lines_data(self, db):
        """Chaque constellation doit avoir des données de lignes JSON valides."""
        constellations = db.query(Constellation).all()
        for c in constellations:
            assert c.lines_data is not None, (
                f"Constellation {c.name} sans lines_data"
            )
            lines = json.loads(c.lines_data)
            assert isinstance(lines, list), (
                f"lines_data de {c.name} n'est pas une liste"
            )
            assert len(lines) > 0, (
                f"lines_data de {c.name} est vide"
            )
            # Chaque segment doit être une paire [hip1, hip2]
            for segment in lines:
                assert isinstance(segment, list), (
                    f"Segment de {c.name} n'est pas une liste"
                )
                assert len(segment) == 2, (
                    f"Segment {segment} de {c.name} n'a pas 2 éléments"
                )

    def test_most_have_center_coordinates(self, db):
        """La majorité des constellations doit avoir des coordonnées centrales."""
        constellations = db.query(Constellation).all()
        with_center = sum(
            1 for c in constellations
            if c.center_ra is not None and c.center_dec is not None
        )
        # Au moins 85 sur 88 devraient avoir des coordonnées
        assert with_center >= 85, (
            f"Seulement {with_center}/88 constellations avec coordonnées centrales"
        )


class TestConstellationStarAssociations:
    """Vérifie les associations étoile-constellation."""

    def test_associations_exist(self, db):
        """Il doit y avoir des associations ConstellationStar."""
        count = db.query(func.count(ConstellationStar.id)).scalar()
        assert count > 500, (
            f"Seulement {count} associations étoile-constellation (attendu >500)"
        )

    def test_associations_reference_valid_stars(self, db):
        """Toutes les associations doivent référencer des étoiles existantes."""
        orphan_count = (
            db.query(func.count(ConstellationStar.id))
            .outerjoin(Star, ConstellationStar.star_id == Star.id)
            .filter(Star.id.is_(None))
            .scalar()
        )
        assert orphan_count == 0, (
            f"{orphan_count} associations pointent vers des étoiles inexistantes"
        )

    def test_associations_reference_valid_constellations(self, db):
        """Toutes les associations doivent référencer des constellations existantes."""
        orphan_count = (
            db.query(func.count(ConstellationStar.id))
            .outerjoin(
                Constellation,
                ConstellationStar.constellation_id == Constellation.id
            )
            .filter(Constellation.id.is_(None))
            .scalar()
        )
        assert orphan_count == 0, (
            f"{orphan_count} associations pointent vers des constellations inexistantes"
        )


class TestKnownConstellations:
    """Vérifie des constellations connues spécifiques."""

    def test_orion_exists(self, db):
        """Orion (ORI) doit exister dans la base."""
        orion = db.query(Constellation).filter(
            Constellation.abbreviation == "ORI"
        ).first()
        assert orion is not None, "Orion (ORI) non trouvé"
        assert orion.name == "Orion"

    def test_orion_has_betelgeuse(self, db):
        """Orion doit contenir Betelgeuse (HIP 27989)."""
        orion = db.query(Constellation).filter(
            Constellation.abbreviation == "ORI"
        ).first()
        assert orion is not None

        betelgeuse = db.query(Star).filter(Star.hip_id == 27989).first()
        if betelgeuse:
            assoc = db.query(ConstellationStar).filter(
                ConstellationStar.constellation_id == orion.id,
                ConstellationStar.star_id == betelgeuse.id,
            ).first()
            assert assoc is not None, (
                "Betelgeuse (HIP 27989) non associée à Orion"
            )

    def test_ursa_major_exists(self, db):
        """La Grande Ourse (UMA) doit exister."""
        uma = db.query(Constellation).filter(
            Constellation.abbreviation == "UMA"
        ).first()
        assert uma is not None, "Ursa Major (UMA) non trouvé"
        assert uma.name == "Ursa Major"

    def test_cassiopeia_exists(self, db):
        """Cassiopée (CAS) doit exister."""
        cas = db.query(Constellation).filter(
            Constellation.abbreviation == "CAS"
        ).first()
        assert cas is not None, "Cassiopeia (CAS) non trouvé"

    def test_crux_exists(self, db):
        """La Croix du Sud (CRU) doit exister."""
        cru = db.query(Constellation).filter(
            Constellation.abbreviation == "CRU"
        ).first()
        assert cru is not None, "Crux (CRU) non trouvé"

    def test_unique_abbreviations(self, db):
        """Toutes les abréviations doivent être uniques."""
        abbrs = [
            c.abbreviation
            for c in db.query(Constellation.abbreviation).all()
        ]
        assert len(abbrs) == len(set(abbrs)), (
            f"Abréviations en double : "
            f"{[a for a in abbrs if abbrs.count(a) > 1]}"
        )


# ═══════════════════════════════════════════════════════════════════
#  TESTS D'INTÉGRATION API CONSTELLATIONS (TestClient FastAPI)
# ═══════════════════════════════════════════════════════════════════

class TestConstellationsAPI:
    """Tests d'intégration des endpoints API constellations."""

    def test_get_all_returns_200(self, client):
        """GET /api/constellations doit retourner 200."""
        response = client.get("/api/constellations")
        assert response.status_code == 200

    def test_get_all_returns_list(self, client):
        """GET /api/constellations doit retourner une liste."""
        response = client.get("/api/constellations")
        data = response.json()
        assert isinstance(data, list)

    def test_get_all_returns_88_constellations(self, client):
        """GET /api/constellations doit retourner 88 constellations."""
        response = client.get("/api/constellations")
        data = response.json()
        assert len(data) == 88, f"Attendu 88 constellations, reçu {len(data)}"

    def test_get_all_has_required_fields(self, client):
        """Chaque constellation doit contenir les champs requis."""
        response = client.get("/api/constellations")
        data = response.json()
        required_fields = {"id", "name", "abbreviation"}
        for c in data[:5]:
            missing = required_fields - set(c.keys())
            assert not missing, (
                f"Champs manquants pour '{c.get('name', '?')}' : {missing}"
            )

    def test_get_by_id_returns_200(self, client):
        """GET /api/constellations/1 doit retourner 200."""
        response = client.get("/api/constellations/1")
        assert response.status_code == 200

    def test_get_by_id_has_detail_fields(self, client):
        """GET /api/constellations/{id} doit contenir les champs détaillés."""
        response = client.get("/api/constellations/1")
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "abbreviation" in data
        assert "lines_data" in data
        assert data["id"] == 1

    def test_get_by_id_not_found_returns_404(self, client):
        """GET /api/constellations/99999 doit retourner 404."""
        response = client.get("/api/constellations/99999")
        assert response.status_code == 404

    def test_search_orion_returns_results(self, client):
        """Recherche 'Orion' doit retourner au moins un résultat."""
        response = client.get("/api/constellations/search", params={"q": "Orion"})
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1, "Aucun résultat pour 'Orion'"

    def test_search_returns_matching_names(self, client):
        """Les résultats de recherche doivent correspondre au terme."""
        response = client.get("/api/constellations/search", params={"q": "Ursa"})
        data = response.json()
        for c in data:
            name_lower = (c.get("name", "") + c.get("name_fr", "")).lower()
            assert "ursa" in name_lower, (
                f"Résultat '{c['name']}' ne correspond pas à 'Ursa'"
            )

    def test_search_short_query_returns_422(self, client):
        """Recherche avec un seul caractère doit retourner 422."""
        response = client.get("/api/constellations/search", params={"q": "A"})
        assert response.status_code == 422

    def test_best_location_returns_200_or_404(self, client):
        """GET /api/constellations/{id}/best-location doit retourner 200 ou 404."""
        all_resp = client.get("/api/constellations")
        constellations = all_resp.json()
        test_id = None
        for c in constellations:
            if c.get("center_ra") is not None and c.get("center_dec") is not None:
                test_id = c["id"]
                break
        if test_id is None:
            pytest.skip("Aucune constellation avec coordonnées centrales")

        response = client.get(f"/api/constellations/{test_id}/best-location")
        assert response.status_code in (200, 404)

    def test_best_location_has_required_fields(self, client):
        """Le meilleur point doit contenir les champs requis."""
        all_resp = client.get("/api/constellations")
        constellations = all_resp.json()
        test_id = None
        for c in constellations:
            if c.get("center_ra") is not None and c.get("center_dec") is not None:
                test_id = c["id"]
                break
        if test_id is None:
            pytest.skip("Aucune constellation avec coordonnées centrales")

        response = client.get(f"/api/constellations/{test_id}/best-location")
        if response.status_code == 200:
            data = response.json()
            required = {
                "observation_point_id", "observation_point_name",
                "latitude", "longitude",
                "constellation_altitude", "visibility_score",
            }
            missing = required - set(data.keys())
            assert not missing, f"Champs manquants : {missing}"

    def test_best_location_not_found_returns_404(self, client):
        """GET /api/constellations/99999/best-location doit retourner 404."""
        response = client.get("/api/constellations/99999/best-location")
        assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════
#  TESTS HEALTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

class TestHealthAPI:
    """Tests des endpoints de santé de l'application."""

    def test_root_returns_200(self, client):
        """GET / doit retourner 200."""
        response = client.get("/")
        assert response.status_code == 200

    def test_root_has_app_and_status(self, client):
        """GET / doit contenir 'app' et 'status'."""
        response = client.get("/")
        data = response.json()
        assert "app" in data, "Champ 'app' manquant"
        assert "status" in data, "Champ 'status' manquant"
        assert data["status"] == "running"

    def test_health_returns_200(self, client):
        """GET /api/health doit retourner 200."""
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_has_required_fields(self, client):
        """GET /api/health doit contenir status, database, star_count."""
        response = client.get("/api/health")
        data = response.json()
        assert "status" in data, "Champ 'status' manquant"
        assert "database" in data, "Champ 'database' manquant"
        assert "star_count" in data, "Champ 'star_count' manquant"

    def test_health_db_connected(self, client):
        """Health check doit indiquer que la DB est connectée."""
        response = client.get("/api/health")
        data = response.json()
        assert data["database"] == "connected", (
            f"DB non connectée : {data['database']}"
        )
        assert data["status"] == "healthy"

    def test_health_star_count_positive(self, client):
        """Health check doit retourner un nombre d'étoiles > 0."""
        response = client.get("/api/health")
        data = response.json()
        assert data["star_count"] > 0, "star_count doit être > 0"
