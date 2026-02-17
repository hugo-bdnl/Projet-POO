"""
Tests pour les étoiles — intégrité des données et endpoints API.

Tâche 3 du plan semaines 3-4 :
  - Tests données BD (119k étoiles, qualité des colonnes)
  - Tests API /api/stars/visible, /api/stars/{id}, /api/stars/search/{q}

Usage :
    cd backend
    python -m pytest tests/test_stars.py -v
"""

import sys
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func

# Ensure app modules are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.star import Star
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

class TestStarCount:
    """Vérifie le nombre total d'étoiles importées."""

    def test_star_count_above_100k(self, db):
        """Il doit y avoir plus de 100 000 étoiles (HYG = ~119k)."""
        count = db.query(func.count(Star.id)).scalar()
        assert count > 100_000, f"Attendu >100 000 étoiles, trouvé {count}"

    def test_star_count_below_200k(self, db):
        """Le nombre d'étoiles ne doit pas dépasser 200 000 (borne de sécurité)."""
        count = db.query(func.count(Star.id)).scalar()
        assert count < 200_000, f"Nombre anormalement élevé : {count}"


class TestStarDataQuality:
    """Vérifie la qualité des données de chaque étoile (échantillon)."""

    def test_all_have_valid_ra(self, db):
        """L'ascension droite doit être dans [0, 360]."""
        invalid = (
            db.query(func.count(Star.id))
            .filter((Star.ra < 0) | (Star.ra > 360))
            .scalar()
        )
        assert invalid == 0, f"{invalid} étoile(s) avec RA hors [0, 360]"

    def test_all_have_valid_dec(self, db):
        """La déclinaison doit être dans [-90, 90]."""
        invalid = (
            db.query(func.count(Star.id))
            .filter((Star.dec < -90) | (Star.dec > 90))
            .scalar()
        )
        assert invalid == 0, f"{invalid} étoile(s) avec Dec hors [-90, 90]"

    def test_all_have_magnitude(self, db):
        """Chaque étoile doit avoir une magnitude non nulle."""
        null_mag = (
            db.query(func.count(Star.id))
            .filter(Star.magnitude.is_(None))
            .scalar()
        )
        assert null_mag == 0, f"{null_mag} étoile(s) sans magnitude"

    def test_magnitude_range_reasonable(self, db):
        """Les magnitudes doivent être dans [-30, 25] (plage raisonnable, inclut le Soleil à -26.7)."""
        out_of_range = (
            db.query(func.count(Star.id))
            .filter((Star.magnitude < -30) | (Star.magnitude > 25))
            .scalar()
        )
        assert out_of_range == 0, (
            f"{out_of_range} étoile(s) avec magnitude hors [-2, 25]"
        )

    def test_naked_eye_stars_exist(self, db):
        """Il doit y avoir des étoiles visibles à l'œil nu (mag < 6.0)."""
        count = (
            db.query(func.count(Star.id))
            .filter(Star.magnitude < 6.0)
            .scalar()
        )
        assert count > 5000, (
            f"Seulement {count} étoiles à l'œil nu (attendu >5000)"
        )

    def test_named_stars_exist(self, db):
        """Il doit exister des étoiles avec un nom propre."""
        count = (
            db.query(func.count(Star.id))
            .filter(Star.proper_name.isnot(None))
            .filter(Star.proper_name != "")
            .scalar()
        )
        assert count > 200, (
            f"Seulement {count} étoiles nommées (attendu >200)"
        )

    def test_constellation_abbr_format(self, db):
        """Les abréviations de constellation doivent faire 2-3 caractères majuscules."""
        stars_with_const = (
            db.query(Star)
            .filter(Star.constellation_abbr.isnot(None))
            .filter(Star.constellation_abbr != "")
            .limit(500)
            .all()
        )
        for s in stars_with_const:
            assert 2 <= len(s.constellation_abbr) <= 3, (
                f"Étoile id={s.id} : abréviation '{s.constellation_abbr}' invalide"
            )


class TestKnownStars:
    """Vérifie des étoiles connues spécifiques."""

    def test_sirius_exists(self, db):
        """Sirius (HIP 32349) doit exister avec une magnitude proche de -1.46."""
        sirius = db.query(Star).filter(Star.hip_id == 32349).first()
        assert sirius is not None, "Sirius (HIP 32349) non trouvé"
        assert sirius.proper_name is not None
        assert abs(sirius.magnitude - (-1.46)) < 0.5, (
            f"Magnitude de Sirius inattendue : {sirius.magnitude}"
        )

    def test_vega_exists(self, db):
        """Vega (HIP 91262) doit exister avec une magnitude proche de 0.03."""
        vega = db.query(Star).filter(Star.hip_id == 91262).first()
        assert vega is not None, "Vega (HIP 91262) non trouvé"
        assert abs(vega.magnitude - 0.03) < 0.5, (
            f"Magnitude de Vega inattendue : {vega.magnitude}"
        )

    def test_polaris_exists(self, db):
        """Polaris (HIP 11767) doit exister dans la constellation UMi."""
        polaris = db.query(Star).filter(Star.hip_id == 11767).first()
        assert polaris is not None, "Polaris (HIP 11767) non trouvé"
        # Polaris est dans la constellation Ursa Minor
        assert polaris.constellation_abbr == "UMi", (
            f"Constellation de Polaris inattendue : {polaris.constellation_abbr}"
        )

    def test_betelgeuse_exists(self, db):
        """Betelgeuse (HIP 27989) doit exister dans Orion."""
        betelgeuse = db.query(Star).filter(Star.hip_id == 27989).first()
        assert betelgeuse is not None, "Betelgeuse (HIP 27989) non trouvé"
        assert betelgeuse.constellation_abbr == "Ori", (
            f"Constellation de Betelgeuse inattendue : {betelgeuse.constellation_abbr}"
        )


# ═══════════════════════════════════════════════════════════════════
#  TESTS D'INTÉGRATION API (TestClient FastAPI)
# ═══════════════════════════════════════════════════════════════════

class TestStarsVisibleAPI:
    """Tests de l'endpoint GET /api/stars/visible."""

    def test_visible_returns_200(self, client):
        """GET /api/stars/visible avec lat/lon Paris doit retourner 200."""
        response = client.get(
            "/api/stars/visible", params={"lat": 48.8566, "lon": 2.3522}
        )
        assert response.status_code == 200

    def test_visible_returns_list(self, client):
        """GET /api/stars/visible doit retourner une liste."""
        response = client.get(
            "/api/stars/visible", params={"lat": 48.8566, "lon": 2.3522}
        )
        data = response.json()
        assert isinstance(data, list)

    def test_visible_stars_have_required_fields(self, client):
        """Chaque étoile visible doit contenir les champs de coordonnées horizontales."""
        response = client.get(
            "/api/stars/visible",
            params={"lat": 48.8566, "lon": 2.3522, "mag_limit": 3.0},
        )
        data = response.json()
        if len(data) > 0:
            required = {"id", "magnitude", "azimuth", "altitude"}
            for star in data[:5]:  # Vérifier les 5 premières
                missing = required - set(star.keys())
                assert not missing, f"Champs manquants : {missing}"

    def test_visible_all_above_horizon(self, client):
        """Toutes les étoiles retournées doivent avoir altitude > 0."""
        response = client.get(
            "/api/stars/visible",
            params={"lat": 48.8566, "lon": 2.3522, "mag_limit": 4.0},
        )
        data = response.json()
        for star in data:
            assert star["altitude"] > 0, (
                f"Étoile id={star['id']} sous l'horizon : alt={star['altitude']}"
            )

    def test_visible_invalid_lat_returns_422(self, client):
        """lat hors [-90, 90] doit retourner 422."""
        response = client.get(
            "/api/stars/visible", params={"lat": 100, "lon": 0}
        )
        assert response.status_code == 422

    def test_visible_missing_params_returns_422(self, client):
        """Paramètres lat/lon manquants doit retourner 422."""
        response = client.get("/api/stars/visible")
        assert response.status_code == 422

    def test_visible_with_mag_limit(self, client):
        """mag_limit réduite doit retourner moins d'étoiles."""
        resp_full = client.get(
            "/api/stars/visible",
            params={"lat": 48.8566, "lon": 2.3522, "mag_limit": 6.0},
        )
        resp_bright = client.get(
            "/api/stars/visible",
            params={"lat": 48.8566, "lon": 2.3522, "mag_limit": 2.0},
        )
        assert len(resp_bright.json()) <= len(resp_full.json())


class TestStarDetailAPI:
    """Tests de l'endpoint GET /api/stars/{id}."""

    def test_get_star_by_id_returns_200(self, client):
        """GET /api/stars/1 doit retourner 200."""
        response = client.get("/api/stars/1")
        assert response.status_code == 200

    def test_get_star_by_id_has_fields(self, client):
        """GET /api/stars/1 doit contenir les champs d'une StarDetail."""
        response = client.get("/api/stars/1")
        data = response.json()
        required = {"id", "ra", "dec", "magnitude"}
        missing = required - set(data.keys())
        assert not missing, f"Champs manquants : {missing}"
        assert data["id"] == 1

    def test_get_star_not_found_returns_404(self, client):
        """GET /api/stars/999999 doit retourner 404."""
        response = client.get("/api/stars/999999")
        assert response.status_code == 404


class TestStarSearchAPI:
    """Tests de l'endpoint GET /api/stars/search/{query}."""

    def test_search_sirius_returns_results(self, client):
        """Recherche 'Sirius' doit retourner au moins un résultat."""
        response = client.get("/api/stars/search/Sirius")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1, "Aucun résultat pour 'Sirius'"

    def test_search_vega_returns_results(self, client):
        """Recherche 'Vega' doit retourner au moins un résultat."""
        response = client.get("/api/stars/search/Vega")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1, "Aucun résultat pour 'Vega'"

    def test_search_short_query_returns_400(self, client):
        """Recherche avec un seul caractère doit retourner 400."""
        response = client.get("/api/stars/search/A")
        assert response.status_code == 400

    def test_search_no_results(self, client):
        """Recherche d'un terme inexistant doit retourner 200 avec liste vide."""
        response = client.get("/api/stars/search/ZZZZNONEXISTENT")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
