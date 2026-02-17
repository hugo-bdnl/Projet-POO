"""
Script de téléchargement et compression des textures Terre.

Sources :
  - Earth Day / Night Maps : Solar System Scope (CC BY 4.0)
    https://www.solarsystemscope.com/textures/
  - Earth Normal / Specular Maps : Three.js examples (MIT License)
    https://github.com/mrdoob/three.js

Résultat : 4 fichiers WebP dans frontend/public/textures/
  - earth_day.webp      (8192×4096)  Carte jour Terre
  - earth_night.webp    (8192×4096)  Lumières nocturnes
  - earth_normal.webp   (2048×1024)  Relief (normal map)
  - earth_specular.webp (2048×1024)  Réflexion océans

Usage :
  python frontend/scripts/download_textures.py
"""

import sys
import requests
from pathlib import Path
from PIL import Image

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "textures"
WEBP_QUALITY = 85

TEXTURES = [
    {
        "name": "earth_day",
        "url": "https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg",
        "description": "Earth Day Map (8K, Solar System Scope)",
    },
    {
        "name": "earth_night",
        "url": "https://www.solarsystemscope.com/textures/download/8k_earth_nightmap.jpg",
        "description": "Earth Night Lights (8K, Solar System Scope)",
    },
    {
        "name": "earth_normal",
        "url": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg",
        "description": "Earth Normal Map (2K, Three.js examples)",
    },
    {
        "name": "earth_specular",
        "url": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg",
        "description": "Earth Specular Map (2K, Three.js examples)",
    },
]


def download_file(url: str, dest: Path) -> bool:
    """Télécharge un fichier avec barre de progression."""
    print(f"  Downloading {url}")
    try:
        response = requests.get(url, stream=True, timeout=120)
        response.raise_for_status()
        total = int(response.headers.get("content-length", 0))
        downloaded = 0
        with open(dest, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total > 0:
                    pct = downloaded * 100 // total
                    print(f"\r    [{pct:3d}%] {downloaded/(1024*1024):.1f}/{total/(1024*1024):.1f} Mo", end="", flush=True)
        print()
        return True
    except requests.RequestException as e:
        print(f"\n  ERROR: {e}")
        return False


def convert_to_webp(src: Path, dest: Path) -> bool:
    """Convertit une image en WebP."""
    print(f"  Converting to WebP (quality {WEBP_QUALITY}%)...")
    try:
        with Image.open(src) as img:
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGB")
            img.save(dest, "WEBP", quality=WEBP_QUALITY, method=4)
        src_mb = src.stat().st_size / (1024 * 1024)
        dest_mb = dest.stat().st_size / (1024 * 1024)
        ratio = (1 - dest_mb / src_mb) * 100
        print(f"    {src_mb:.1f} Mo -> {dest_mb:.1f} Mo (reduction {ratio:.0f}%)")
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def main():
    print("=" * 55)
    print("  Earth Textures — Download & WebP Compression")
    print("=" * 55)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    success = 0
    for i, tex in enumerate(TEXTURES, 1):
        print(f"\n[{i}/{len(TEXTURES)}] {tex['description']}")
        webp_file = OUTPUT_DIR / f"{tex['name']}.webp"

        # Skip if already done
        if webp_file.exists() and webp_file.stat().st_size > 50_000:
            mb = webp_file.stat().st_size / (1024 * 1024)
            with Image.open(webp_file) as img:
                print(f"  Already exists: {img.size[0]}x{img.size[1]}, {mb:.1f} Mo")
            success += 1
            continue

        # Download
        ext = tex["url"].rsplit(".", 1)[-1]
        tmp = OUTPUT_DIR / f"_tmp.{ext}"
        if not download_file(tex["url"], tmp):
            continue

        # Convert
        if convert_to_webp(tmp, webp_file):
            success += 1
        tmp.unlink(missing_ok=True)

    print(f"\n{'=' * 55}")
    print(f"  Result: {success}/{len(TEXTURES)} textures ready")
    print(f"\n  Files in {OUTPUT_DIR}:")
    for f in sorted(OUTPUT_DIR.iterdir()):
        if f.is_file():
            print(f"    {f.name:28s} {f.stat().st_size/(1024*1024):6.1f} Mo")
    print(f"{'=' * 55}")
    return 0 if success == len(TEXTURES) else 1


if __name__ == "__main__":
    sys.exit(main())
