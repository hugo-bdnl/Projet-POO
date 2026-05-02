FROM python:3.11-slim

WORKDIR /app

# Dépendances système (compilation numpy, astropy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Installation dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie code source
COPY . .

# Création du répertoire data et import des données au moment du build
# La base SQLite (étoiles, constellations, points d'observation) est baked dans l'image
# ce qui évite d'avoir une base externe en production
RUN mkdir -p data && python -m scripts.import_data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]