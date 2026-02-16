"""
Script d'import des données astronomiques dans SQLite.
Importe les étoiles (HYG Database v4.2), les points d'observation,
et prépare la structure pour les constellations.

Usage :
    cd backend
    python -m scripts.import_data
"""

import gzip
import io
import os
import sys
import json
import urllib.request

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# Ajout du répertoire parent au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import Base, engine, SessionLocal
from app.models.star import Star
from app.models.constellation import Constellation, ConstellationStar
from app.models.observation_point import ObservationPoint


def import_hyg_database(db: Session) -> int:
    """
    Importe le catalogue HYG Database v3.7 dans la table 'stars'.
    Télécharge le CSV depuis GitHub si absent localement.

    @param db: Session SQLAlchemy active
    @return: Nombre d'étoiles importées
    """
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    csv_path = os.path.join(data_dir, "hyg_v37.csv")

    # Téléchargement si nécessaire
    if not os.path.exists(csv_path):
        print("📥 Téléchargement de HYG Database v4.2...")
        os.makedirs(data_dir, exist_ok=True)
        # HYG Database est sur Codeberg via Git LFS - utiliser l'API Forgejo /media
        gz_url = "https://codeberg.org/api/v1/repos/astronexus/hyg/media/data/hyg/CURRENT/hyg_v42.csv.gz"
        try:
            print(f"   URL : {gz_url}")
            req = urllib.request.Request(gz_url, headers={"User-Agent": "NightSkyViewer/1.0"})
            with urllib.request.urlopen(req, timeout=60) as response:
                gz_data = response.read()
            csv_data = gzip.decompress(gz_data)
            # Écrire le CSV décompressé
            with open(csv_path, "wb") as f:
                f.write(csv_data)
            print(f"   Sauvegardé : {csv_path} ({len(csv_data) // 1024} Ko)")
            df = pd.read_csv(csv_path)
        except Exception as e:
            raise RuntimeError(
                f"Impossible de télécharger HYG Database : {e}\n"
                "Télécharge manuellement depuis https://codeberg.org/astronexus/hyg\n"
                f"et place le CSV décompressé dans {csv_path}"
            )
    else:
        print(f"📂 Lecture de {csv_path}...")
        df = pd.read_csv(csv_path)

    print(f"   {len(df)} entrées lues")

    # Nettoyage et transformation
    stars = []
    for _, row in df.iterrows():
        star = Star(
            hip_id=int(row["hip"]) if pd.notna(row.get("hip")) else None,
            hd_id=int(row["hd"]) if pd.notna(row.get("hd")) else None,
            proper_name=row.get("proper") if pd.notna(row.get("proper")) else None,
            ra=float(row["ra"]) * 15.0 if pd.notna(row.get("ra")) else 0.0,  # heures → degrés
            dec=float(row["dec"]) if pd.notna(row.get("dec")) else 0.0,
            magnitude=float(row["mag"]) if pd.notna(row.get("mag")) else 99.0,
            abs_magnitude=float(row["absmag"]) if pd.notna(row.get("absmag")) else None,
            spectral_type=row.get("spect") if pd.notna(row.get("spect")) else None,
            color_index=float(row["ci"]) if pd.notna(row.get("ci")) else None,
            distance_ly=(
                float(row["dist"]) * 3.26156 if pd.notna(row.get("dist")) and float(row.get("dist", 0)) > 0
                else None
            ),  # parsecs → années-lumière
            constellation_abbr=row.get("con") if pd.notna(row.get("con")) else None,
        )
        stars.append(star)

    # Insertion par lots
    batch_size = 5000
    for i in range(0, len(stars), batch_size):
        batch = stars[i:i + batch_size]
        db.add_all(batch)
        db.flush()
        print(f"   ⏳ {min(i + batch_size, len(stars))}/{len(stars)} étoiles...")

    db.commit()
    print(f"✅ {len(stars)} étoiles importées avec succès")
    return len(stars)


def import_observation_points(db: Session) -> int:
    """
    Importe les 50 points d'observation pré-définis (villes mondiales).

    @param db: Session SQLAlchemy active
    @return: Nombre de points importés
    """
    points_data = [
        {"name": "Paris", "country": "France", "latitude": 48.8566, "longitude": 2.3522, "timezone": "Europe/Paris"},
        {"name": "London", "country": "United Kingdom", "latitude": 51.5074, "longitude": -0.1278, "timezone": "Europe/London"},
        {"name": "New York", "country": "USA", "latitude": 40.7128, "longitude": -74.0060, "timezone": "America/New_York"},
        {"name": "Tokyo", "country": "Japan", "latitude": 35.6762, "longitude": 139.6503, "timezone": "Asia/Tokyo"},
        {"name": "Sydney", "country": "Australia", "latitude": -33.8688, "longitude": 151.2093, "timezone": "Australia/Sydney"},
        {"name": "Beijing", "country": "China", "latitude": 39.9042, "longitude": 116.4074, "timezone": "Asia/Shanghai"},
        {"name": "Moscow", "country": "Russia", "latitude": 55.7558, "longitude": 37.6173, "timezone": "Europe/Moscow"},
        {"name": "Dubai", "country": "UAE", "latitude": 25.2048, "longitude": 55.2708, "timezone": "Asia/Dubai"},
        {"name": "São Paulo", "country": "Brazil", "latitude": -23.5505, "longitude": -46.6333, "timezone": "America/Sao_Paulo"},
        {"name": "Mumbai", "country": "India", "latitude": 19.0760, "longitude": 72.8777, "timezone": "Asia/Kolkata"},
        {"name": "Cairo", "country": "Egypt", "latitude": 30.0444, "longitude": 31.2357, "timezone": "Africa/Cairo"},
        {"name": "Cape Town", "country": "South Africa", "latitude": -33.9249, "longitude": 18.4241, "timezone": "Africa/Johannesburg"},
        {"name": "Rome", "country": "Italy", "latitude": 41.9028, "longitude": 12.4964, "timezone": "Europe/Rome"},
        {"name": "Berlin", "country": "Germany", "latitude": 52.5200, "longitude": 13.4050, "timezone": "Europe/Berlin"},
        {"name": "Madrid", "country": "Spain", "latitude": 40.4168, "longitude": -3.7038, "timezone": "Europe/Madrid"},
        {"name": "Mexico City", "country": "Mexico", "latitude": 19.4326, "longitude": -99.1332, "timezone": "America/Mexico_City"},
        {"name": "Buenos Aires", "country": "Argentina", "latitude": -34.6037, "longitude": -58.3816, "timezone": "America/Argentina/Buenos_Aires"},
        {"name": "Istanbul", "country": "Turkey", "latitude": 41.0082, "longitude": 28.9784, "timezone": "Europe/Istanbul"},
        {"name": "Bangkok", "country": "Thailand", "latitude": 13.7563, "longitude": 100.5018, "timezone": "Asia/Bangkok"},
        {"name": "Seoul", "country": "South Korea", "latitude": 37.5665, "longitude": 126.9780, "timezone": "Asia/Seoul"},
        {"name": "Singapore", "country": "Singapore", "latitude": 1.3521, "longitude": 103.8198, "timezone": "Asia/Singapore"},
        {"name": "Toronto", "country": "Canada", "latitude": 43.6532, "longitude": -79.3832, "timezone": "America/Toronto"},
        {"name": "Los Angeles", "country": "USA", "latitude": 34.0522, "longitude": -118.2437, "timezone": "America/Los_Angeles"},
        {"name": "Chicago", "country": "USA", "latitude": 41.8781, "longitude": -87.6298, "timezone": "America/Chicago"},
        {"name": "Lima", "country": "Peru", "latitude": -12.0464, "longitude": -77.0428, "timezone": "America/Lima"},
        {"name": "Nairobi", "country": "Kenya", "latitude": -1.2921, "longitude": 36.8219, "timezone": "Africa/Nairobi"},
        {"name": "Lagos", "country": "Nigeria", "latitude": 6.5244, "longitude": 3.3792, "timezone": "Africa/Lagos"},
        {"name": "Jakarta", "country": "Indonesia", "latitude": -6.2088, "longitude": 106.8456, "timezone": "Asia/Jakarta"},
        {"name": "Reykjavik", "country": "Iceland", "latitude": 64.1466, "longitude": -21.9426, "timezone": "Atlantic/Reykjavik"},
        {"name": "Atacama", "country": "Chile", "latitude": -23.8634, "longitude": -69.1328, "timezone": "America/Santiago", "elevation": 2400},
        {"name": "Mauna Kea", "country": "USA (Hawaii)", "latitude": 19.8207, "longitude": -155.4680, "timezone": "Pacific/Honolulu", "elevation": 4207},
        {"name": "Tenerife", "country": "Spain (Canaries)", "latitude": 28.2916, "longitude": -16.6291, "timezone": "Atlantic/Canary", "elevation": 2390},
        {"name": "Marrakech", "country": "Morocco", "latitude": 31.6295, "longitude": -7.9811, "timezone": "Africa/Casablanca"},
        {"name": "Helsinki", "country": "Finland", "latitude": 60.1699, "longitude": 24.9384, "timezone": "Europe/Helsinki"},
        {"name": "Oslo", "country": "Norway", "latitude": 59.9139, "longitude": 10.7522, "timezone": "Europe/Oslo"},
        {"name": "Athens", "country": "Greece", "latitude": 37.9838, "longitude": 23.7275, "timezone": "Europe/Athens"},
        {"name": "Vienna", "country": "Austria", "latitude": 48.2082, "longitude": 16.3738, "timezone": "Europe/Vienna"},
        {"name": "Lisbon", "country": "Portugal", "latitude": 38.7223, "longitude": -9.1393, "timezone": "Europe/Lisbon"},
        {"name": "Stockholm", "country": "Sweden", "latitude": 59.3293, "longitude": 18.0686, "timezone": "Europe/Stockholm"},
        {"name": "Vancouver", "country": "Canada", "latitude": 49.2827, "longitude": -123.1207, "timezone": "America/Vancouver"},
        {"name": "Anchorage", "country": "USA (Alaska)", "latitude": 61.2181, "longitude": -149.9003, "timezone": "America/Anchorage"},
        {"name": "Ushuaia", "country": "Argentina", "latitude": -54.8019, "longitude": -68.3030, "timezone": "America/Argentina/Ushuaia"},
        {"name": "Tromsø", "country": "Norway", "latitude": 69.6492, "longitude": 18.9553, "timezone": "Europe/Oslo"},
        {"name": "Kathmandu", "country": "Nepal", "latitude": 27.7172, "longitude": 85.3240, "timezone": "Asia/Kathmandu"},
        {"name": "Honolulu", "country": "USA (Hawaii)", "latitude": 21.3069, "longitude": -157.8583, "timezone": "Pacific/Honolulu"},
        {"name": "Johannesburg", "country": "South Africa", "latitude": -26.2041, "longitude": 28.0473, "timezone": "Africa/Johannesburg"},
        {"name": "Dakar", "country": "Senegal", "latitude": 14.7167, "longitude": -17.4677, "timezone": "Africa/Dakar"},
        {"name": "Auckland", "country": "New Zealand", "latitude": -36.8485, "longitude": 174.7633, "timezone": "Pacific/Auckland"},
        {"name": "La Palma", "country": "Spain (Canaries)", "latitude": 28.6835, "longitude": -17.7642, "timezone": "Atlantic/Canary", "elevation": 2400},
        {"name": "Paranal", "country": "Chile", "latitude": -24.6275, "longitude": -70.4044, "timezone": "America/Santiago", "elevation": 2635},
    ]

    for data in points_data:
        point = ObservationPoint(**data)
        db.add(point)

    db.commit()
    print(f"✅ {len(points_data)} points d'observation importés")
    return len(points_data)


# --- 88 IAU constellation names ---
CONSTELLATION_NAMES = {
    "And": ("Andromeda", "Andromède"),
    "Ant": ("Antlia", "Machine pneumatique"),
    "Aps": ("Apus", "Oiseau de paradis"),
    "Aqr": ("Aquarius", "Verseau"),
    "Aql": ("Aquila", "Aigle"),
    "Ara": ("Ara", "Autel"),
    "Ari": ("Aries", "Bélier"),
    "Aur": ("Auriga", "Cocher"),
    "Boo": ("Boötes", "Bouvier"),
    "Cae": ("Caelum", "Burin"),
    "Cam": ("Camelopardalis", "Girafe"),
    "Cnc": ("Cancer", "Cancer"),
    "CVn": ("Canes Venatici", "Chiens de chasse"),
    "CMa": ("Canis Major", "Grand Chien"),
    "CMi": ("Canis Minor", "Petit Chien"),
    "Cap": ("Capricornus", "Capricorne"),
    "Car": ("Carina", "Carène"),
    "Cas": ("Cassiopeia", "Cassiopée"),
    "Cen": ("Centaurus", "Centaure"),
    "Cep": ("Cepheus", "Céphée"),
    "Cet": ("Cetus", "Baleine"),
    "Cha": ("Chamaeleon", "Caméléon"),
    "Cir": ("Circinus", "Compas"),
    "Col": ("Columba", "Colombe"),
    "Com": ("Coma Berenices", "Chevelure de Bérénice"),
    "CrA": ("Corona Australis", "Couronne australe"),
    "CrB": ("Corona Borealis", "Couronne boréale"),
    "Crv": ("Corvus", "Corbeau"),
    "Crt": ("Crater", "Coupe"),
    "Cru": ("Crux", "Croix du Sud"),
    "Cyg": ("Cygnus", "Cygne"),
    "Del": ("Delphinus", "Dauphin"),
    "Dor": ("Dorado", "Dorade"),
    "Dra": ("Draco", "Dragon"),
    "Equ": ("Equuleus", "Petit Cheval"),
    "Eri": ("Eridanus", "Éridan"),
    "For": ("Fornax", "Fourneau"),
    "Gem": ("Gemini", "Gémeaux"),
    "Gru": ("Grus", "Grue"),
    "Her": ("Hercules", "Hercule"),
    "Hor": ("Horologium", "Horloge"),
    "Hya": ("Hydra", "Hydre femelle"),
    "Hyi": ("Hydrus", "Hydre mâle"),
    "Ind": ("Indus", "Indien"),
    "Lac": ("Lacerta", "Lézard"),
    "Leo": ("Leo", "Lion"),
    "LMi": ("Leo Minor", "Petit Lion"),
    "Lep": ("Lepus", "Lièvre"),
    "Lib": ("Libra", "Balance"),
    "Lup": ("Lupus", "Loup"),
    "Lyn": ("Lynx", "Lynx"),
    "Lyr": ("Lyra", "Lyre"),
    "Men": ("Mensa", "Table"),
    "Mic": ("Microscopium", "Microscope"),
    "Mon": ("Monoceros", "Licorne"),
    "Mus": ("Musca", "Mouche"),
    "Nor": ("Norma", "Règle"),
    "Oct": ("Octans", "Octant"),
    "Oph": ("Ophiuchus", "Ophiuchus"),
    "Ori": ("Orion", "Orion"),
    "Pav": ("Pavo", "Paon"),
    "Peg": ("Pegasus", "Pégase"),
    "Per": ("Perseus", "Persée"),
    "Phe": ("Phoenix", "Phénix"),
    "Pic": ("Pictor", "Peintre"),
    "Psc": ("Pisces", "Poissons"),
    "PsA": ("Piscis Austrinus", "Poisson austral"),
    "Pup": ("Puppis", "Poupe"),
    "Pyx": ("Pyxis", "Boussole"),
    "Ret": ("Reticulum", "Réticule"),
    "Sge": ("Sagitta", "Flèche"),
    "Sgr": ("Sagittarius", "Sagittaire"),
    "Sco": ("Scorpius", "Scorpion"),
    "Scl": ("Sculptor", "Sculpteur"),
    "Sct": ("Scutum", "Écu de Sobieski"),
    "Ser": ("Serpens", "Serpent"),
    "Sex": ("Sextans", "Sextant"),
    "Tau": ("Taurus", "Taureau"),
    "Tel": ("Telescopium", "Télescope"),
    "Tri": ("Triangulum", "Triangle"),
    "TrA": ("Triangulum Australe", "Triangle austral"),
    "Tuc": ("Tucana", "Toucan"),
    "UMa": ("Ursa Major", "Grande Ourse"),
    "UMi": ("Ursa Minor", "Petite Ourse"),
    "Vel": ("Vela", "Voiles"),
    "Vir": ("Virgo", "Vierge"),
    "Vol": ("Volans", "Poisson volant"),
    "Vul": ("Vulpecula", "Petit Renard"),
}


def import_constellations(db: Session) -> int:
    """
    Importe les 88 constellations IAU avec leurs patterns de lignes
    depuis le fichier index.json de Stellarium (modern sky culture).

    Le fichier est téléchargé depuis GitHub.
    Format JSON : chaque constellation a un id "CON modern Aql"
    et des polylines [[hip1, hip2, hip3], ...] converties en segments.

    @param db: Session SQLAlchemy active
    @return: Nombre de constellations importées
    """
    # URL du fichier Stellarium (Modern sky culture — index.json)
    json_url = (
        "https://raw.githubusercontent.com/Stellarium/stellarium/"
        "master/skycultures/modern/index.json"
    )

    print("📥 Téléchargement de index.json (Stellarium modern)...")
    try:
        req = urllib.request.Request(json_url, headers={"User-Agent": "NightSkyViewer/1.0"})
        with urllib.request.urlopen(req, timeout=60) as response:
            json_content = response.read().decode("utf-8")
        print(f"   Fichier téléchargé ({len(json_content)} octets)")
    except Exception as e:
        raise RuntimeError(
            f"Impossible de télécharger index.json : {e}\n"
            "URL : " + json_url
        )

    data = json.loads(json_content)
    constellations_data = data.get("constellations", [])
    print(f"   {len(constellations_data)} constellations trouvées dans le JSON")

    constellation_count = 0
    total_associations = 0

    # Map abbreviation lookup — Stellarium uses mixed case (e.g. "Aql")
    # Build a case-insensitive lookup for our CONSTELLATION_NAMES dict
    names_lookup = {}
    for key, value in CONSTELLATION_NAMES.items():
        names_lookup[key.lower()] = (key, value[0], value[1])

    for con_data in constellations_data:
        con_id = con_data.get("id", "")
        # Extract abbreviation from id like "CON modern Aql"
        parts = con_id.split()
        if len(parts) < 3:
            continue
        abbr_raw = parts[-1]  # e.g. "Aql"

        # Get polylines — each is a chain of HIP IDs
        polylines = con_data.get("lines", [])

        # Convert polylines to segment pairs [[hip1, hip2], [hip2, hip3], ...]
        lines = []
        all_hip_ids = set()
        for polyline in polylines:
            # Filter out non-integer IDs (Gaia DR3 IDs are strings, skip them)
            int_hips = []
            for h in polyline:
                if isinstance(h, int):
                    int_hips.append(h)
                elif isinstance(h, str) and h.isdigit() and len(h) <= 6:
                    int_hips.append(int(h))
                # Skip long Gaia DR3 string IDs and DSO references

            for i in range(len(int_hips) - 1):
                lines.append([int_hips[i], int_hips[i + 1]])
            all_hip_ids.update(int_hips)

        if not lines:
            continue

        unique_hips = list(all_hip_ids)

        # Look up names from dictionary
        lookup = names_lookup.get(abbr_raw.lower())
        if lookup:
            abbr_final, name_en, name_fr = lookup
        else:
            abbr_final = abbr_raw
            name_en = abbr_raw
            name_fr = abbr_raw

        # Compute center RA/Dec from member stars
        member_stars = (
            db.query(Star)
            .filter(Star.hip_id.in_(unique_hips))
            .all()
        )

        center_ra = None
        center_dec = None
        if member_stars:
            center_ra = sum(s.ra for s in member_stars) / len(member_stars)
            center_dec = sum(s.dec for s in member_stars) / len(member_stars)

        # Create Constellation row
        constellation = Constellation(
            name=name_en,
            abbreviation=abbr_final.upper()[:3],
            name_fr=name_fr,
            center_ra=center_ra,
            center_dec=center_dec,
            lines_data=json.dumps(lines),
        )
        db.add(constellation)
        db.flush()  # Get the generated ID

        # Create ConstellationStar associations
        for star in member_stars:
            assoc = ConstellationStar(
                constellation_id=constellation.id,
                star_id=star.id,
            )
            db.add(assoc)
            total_associations += 1

        constellation_count += 1

    db.commit()
    print(f"✅ {constellation_count} constellations importées")
    print(f"   {total_associations} associations étoile-constellation créées")
    return constellation_count


def main():
    """Point d'entrée principal du script d'import."""
    import argparse
    parser = argparse.ArgumentParser(description="Import astronomique Night Sky Viewer")
    parser.add_argument(
        "--constellations-only",
        action="store_true",
        help="Importer uniquement les constellations (étoiles déjà en base)",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("🌌 Night Sky Viewer — Import de données")
    print("=" * 60)

    # Création des tables
    print("\n📋 Création des tables...")
    Base.metadata.create_all(bind=engine)
    print("   Tables créées avec succès")

    db = SessionLocal()

    try:
        from app.repositories.star_repository import StarRepository
        repo = StarRepository(db)

        if args.constellations_only:
            # Mode constellations uniquement
            existing_stars = repo.count()
            if existing_stars == 0:
                print("\n❌ Aucune étoile en base. Lancez d'abord un import complet.")
                return
            print(f"\n📊 {existing_stars} étoiles déjà en base.")

            # Supprimer les anciennes constellations si nécessaire
            from sqlalchemy import text
            db.execute(text("DELETE FROM constellation_stars"))
            db.execute(text("DELETE FROM constellations"))
            db.commit()
            print("   Tables constellations vidées.")

            # Import constellations
            print("\n⭐ Import des constellations (Stellarium)...")
            constellation_count = import_constellations(db)

            print("\n" + "=" * 60)
            print(f"✅ Import terminé !")
            print(f"   • {constellation_count} constellations")
            print("=" * 60)
        else:
            # Import complet
            existing = repo.count()

            if existing > 0:
                print(f"\n⚠️  Base déjà peuplée ({existing} étoiles). Abandon.")
                print("   Pour re-importer : supprimer le fichier data/nightsky.db")
                print("   Pour importer les constellations : --constellations-only")
                return

            # Import étoiles
            print("\n🌟 Import des étoiles (HYG Database v3.7)...")
            star_count = import_hyg_database(db)

            # Import points d'observation
            print("\n📍 Import des points d'observation...")
            point_count = import_observation_points(db)

            # Import constellations
            print("\n⭐ Import des constellations (Stellarium)...")
            constellation_count = import_constellations(db)

            print("\n" + "=" * 60)
            print(f"✅ Import terminé !")
            print(f"   • {star_count} étoiles")
            print(f"   • {point_count} points d'observation")
            print(f"   • {constellation_count} constellations")
            print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erreur lors de l'import : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
