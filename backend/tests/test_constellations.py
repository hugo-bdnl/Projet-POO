"""
Tests d'intégrité des données de constellations importées.
Vérifie que les 88 constellations IAU sont correctement importées
avec leurs patterns de lignes et associations étoiles.

Usage :
    cd backend
    python -m pytest tests/test_constellations.py -v
"""

import json
import sys
import os

import pytest
from sqlalchemy import func

# Ensure app modules are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.constellation import Constellation, ConstellationStar
from app.models.star import Star


@pytest.fixture(scope="module")
def db():
    """Fournit une session DB pour tous les tests du module."""
    session = SessionLocal()
    yield session
    session.close()


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
