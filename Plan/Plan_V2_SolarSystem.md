# Plan V2 : Système Solaire Temps Réel & Terminateur Jour/Nuit

## Vision Générale

La V2 fusionne les tâches 3 et 7 de la semaine 13 en une fonctionnalité cohérente :  
le **Système Solaire en temps réel**, visible depuis le globe et le ciel nocturne.

Le Soleil devenant un objet 3D positionné astronomiquement, le **terminateur jour/nuit** en découle naturellement : la frontière jour/nuit sur le globe est tout simplement l'ombre portée par la direction réelle du Soleil — aucun calcul séparé requis.

---

## Ambition V2 : Ce qu'on construit

```
MODE GLOBE (vue de l'extérieur)
├── Système Solaire en orbite autour du Soleil
│   ├── Soleil (sphère lumineuse, PointLight)
│   ├── Terre (notre globe actuel, en orbite)
│   ├── 7 autres planètes (Mercury → Neptune)
│   └── Lignes d'orbite elliptiques
│
├── Terminateur dynamique sur la Terre
│   ├── Shader jour/nuit piloté par position 3D réelle du Soleil
│   └── Zone de pénombre (crépuscule ~10°)
│
└── Clic sur une planète → Vue détaillée planète
    ├── Zoom cinématique vers la planète
    ├── Globe 3D texturé (style globe Terre actuel)
    └── Retour au Système Solaire

MODE CIEL (vue depuis le sol)
├── Planètes visibles comme étoiles brillantes
│   ├── Taille proportionnelle à la magnitude apparente
│   ├── Couleur réaliste (Jupiter : beige, Mars : rouge…)
│   └── Tooltip + panneau détails au clic
└── Soleil : visible à sa position exacte
    └── (avec avertissement si en dessous de l'horizon)
```

---

## 1. ÉVALUATION DES SOURCES DE DONNÉES

### 1.1 Calcul des positions planétaires

Trois approches possibles :

| Approche                               | Précision            | Dépendance externe  | Complexité            | Verdict                        |
| -------------------------------------- | -------------------- | ------------------- | --------------------- | ------------------------------ |
| **NASA JPL Horizons API**              | ★★★★★ sub-arcseconde | API externe requise | Faible (fetch)        | ❌ Latence, rate limit         |
| **VSOP87** (série complète)            | ★★★★★ sub-arcseconde | Aucune              | Haute (700 Ko tables) | ⚠️ Surdimensionné pour visuels |
| **Meeus AA** (algorithmie)             | ★★★★ ~1 arcmin       | Aucune              | Moyenne               | ✅ **Retenu**                  |
| **Ephemeris simplifiée 3000BC-3000AD** | ★★★ quelques arcmin  | Aucune              | Faible                | ✅ Option B                    |

**Décision retenue : librairie npm `astronomia`**

```bash
npm install astronomia
```

- Implémente les **Algorithmes de Jean Meeus** (Astronomical Algorithms, 2e éd.)
- Calcule RA/Dec + distance hélio/géocentrique pour les 8 planètes + Soleil + Lune
- 100% frontend TypeScript, zéro dépendance API
- Précision ~1 arcmin : **très largement suffisant pour la visualisation**
- Licence MIT

**Alternative si `astronomia` insuffisant** : `ephem.js` ou appel ponctuel à JPL Horizons lors d'une session (avec cache 1h).

### 1.2 Textures planétaires

| Corps             | Source                           | Résolution           | Licence        |
| ----------------- | -------------------------------- | -------------------- | -------------- |
| Soleil            | NASA Solar Dynamics Observatory  | 2048×1024            | Domaine public |
| Mercure           | NASA Messenger                   | 2048×1024            | Domaine public |
| Vénus (surface)   | NASA Magellan                    | 2048×1024            | Domaine public |
| Mars              | NASA Mars Reconnaissance Orbiter | 4096×2048            | Domaine public |
| Jupiter           | NASA Cassini / JunoCam           | 4096×2048            | Domaine public |
| Saturne + anneaux | NASA Cassini                     | 2048×1024 + ring map | Domaine public |
| Uranus            | NASA Voyager 2                   | 1024×512             | Domaine public |
| Neptune           | NASA Voyager 2                   | 1024×512             | Domaine public |

Toutes disponibles sur [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0) ou NASA directement.

**Source principale recommandée** : https://www.solarsystemscope.com/textures/

- Toutes les planètes packagées, format JPG, qualité élevée, CC BY 4.0

---

## 2. STACK TECHNOLOGIQUE V2 (delta avec V1)

### 2.1 Nouvelles dépendances

```bash
# Calcul positions astronomiques (Meeus Algorithms)
npm install astronomia

# Optionnel : animations cinématiques de caméra
npm install @react-spring/three   # si non déjà présent
```

### 2.2 Nouveaux composants frontend

```
frontend/src/
├── components/
│   ├── SolarSystem/
│   │   ├── SolarSystem.tsx          # [NEW] Conteneur principal du système solaire
│   │   ├── Planet.tsx               # [NEW] Planète générique (mesh + texture + orbite)
│   │   ├── Sun.tsx                  # [NEW] Soleil (PointLight + surface animée)
│   │   ├── SaturnRings.tsx          # [NEW] Anneaux de Saturne
│   │   ├── OrbitLine.tsx            # [NEW] Ligne d'orbite elliptique
│   │   └── PlanetDetailView.tsx     # [NEW] Vue globe planète au clic
│   │
│   ├── Globe.tsx                    # [MODIFY] Shader terminateur jour/nuit
│   ├── NightSky.tsx                 # [MODIFY] Planètes visibles comme étoiles
│   └── MilkyWay.tsx                 # Inchangé
│
├── utils/
│   ├── skyCoords.ts                 # Inchangé
│   ├── planetaryEphemeris.ts        # [NEW] Wrapper astronomia → positions 3D
│   └── dayNightShader.ts            # [NEW] GLSL shaders terminateur
│
├── stores/
│   └── useSolarSystemStore.ts       # [NEW] Zustand : état système solaire
│
└── types/
    └── planets.ts                   # [NEW] Types PlanetData, PlanetId, etc.
```

### 2.3 Modifications backend

**Aucune modification backend requise** : les positions planétaires sont calculées entièrement côté frontend via `astronomia`. Le backend reste identique à la V1.

---

## 3. ARCHITECTURE TECHNIQUE DÉTAILLÉE

### 3.1 Système de coordonnées

Le défi principal : **les échelles** du système solaire sont incompatibles avec l'affichage direct.

```
Réel :           Terre → Soleil : 149,6 millions km
                 Terre → Neptune : 4,5 milliards km
Ratio Neptune/Terre : ~30

Affichage :      Globe Terre actuel : rayon = 1 unité THREE.js
                 → Soleil serait à ~23 500 unités (impossible)
```

**Solution : Deux modes d'affichage distincts**

#### Mode "Vue Système Solaire" (nouvelle caméra grand angle)

- Échelle logarithmique ou compressée pour rendre toutes les planètes visibles
- Soleil au centre (0,0,0), Terre à ~5 unités, Neptune à ~50 unités
- Globe Terre agrandi visuellement pour rester lisible

#### Mode "Vue Planète" (actuel + nouvelles planètes)

- Zoom sur une planète individuelle → même expérience que le globe Terre actuel
- Chaque planète a sa propre scène Three.js ou un repositionnement de caméra

### 3.2 Pipeline de calcul des positions

```typescript
// planetaryEphemeris.ts
import { solar, planetposition, base } from "astronomia";

interface PlanetPosition {
  ra: number; // Ascension droite (degrés) — pour mode ciel
  dec: number; // Déclinaison (degrés)
  distance: number; // Distance géocentrique (UA)
  helioLon: number; // Longitude héliocentrique (pour placement 3D)
  helioLat: number; // Latitude héliocentrique
  helioDist: number; // Distance au Soleil (UA)
  // Coordonnées 3D Three.js (espace compressé)
  position3D: THREE.Vector3;
}

function computePlanetPositions(
  timestamp: Date,
): Map<PlanetId, PlanetPosition> {
  // Calcul Julian Day Number
  const jde = dateToJDE(timestamp);
  // Calcul pour chaque planète via astronomia
  // Conversion coordonnées écliptiques → 3D Three.js (échelle compressée)
}
```

### 3.3 Terminateur jour/nuit — Shader GLSL

```glsl
// dayNightShader.ts — Fragment shader pour Globe.tsx

uniform sampler2D dayTexture;    // Blue Marble (actuelle)
uniform sampler2D nightTexture;  // Black Marble NASA
uniform vec3 sunDirection;       // Direction normalisée vers le Soleil (uniforme)
uniform float penumbraAngle;     // Largeur zone crépuscule (~10°)

varying vec3 vNormal;
varying vec2 vUv;

void main() {
  // Angle entre normale de surface et direction solaire
  float cosAngle = dot(normalize(vNormal), normalize(sunDirection));

  // Zone de pénombre : interpolation douce entre jour et nuit
  float blendFactor = smoothstep(-0.05, 0.15, cosAngle);

  vec4 dayColor = texture2D(dayTexture, vUv);
  vec4 nightColor = texture2D(nightTexture, vUv);

  // Mix : 0.0 = nuit totale, 1.0 = jour total
  gl_FragColor = mix(nightColor, dayColor, blendFactor);
}
```

`sunDirection` est mis à jour à chaque frame depuis la position 3D réelle du Soleil calculée par `astronomia` → le terminateur suit automatiquement la réalité.

### 3.4 Vue détaillée planète (clic → zoom)

```
Clic sur planète
  → Store : selectedPlanet = "mars"
  → Animation caméra (useFrame + lerp) : caméra → position face à la planète
  → PlanetDetailView :
      - Même structure que Globe.tsx actuel
      - Texture spécifique à la planète
      - OrbitControls locaux
      - Atmosphère si applicable (Mars rouge, Vénus dense, etc.)
  → Bouton "Retour" → animation inverse
```

---

## 4. SCÈNES ET MODES D'AFFICHAGE

### 4.1 Modes d'affichage

```
viewMode = "globe"    (actuel)
  → [NEW] Sous-mode : "earth"  (globe Terre seul, comportement V1)
  → [NEW] Sous-mode : "solar"  (vue système solaire complet)

viewMode = "sky"      (actuel, inchangé structurellement)
  → Planètes affichées comme points brillants à leur position réelle
```

### 4.2 UI ajoutée

```
Bouton toggle : [🌍 Terre] ↔ [☀️ Système Solaire]   (mode globe)
Panneau planète au clic :
  - Nom + type (tellurique / géante gazeuse / géante de glace)
  - Distance au Soleil (UA + km)
  - Distance à la Terre actuellement (UA + km)
  - Durée de révolution (jours/ans)
  - Taille relative vs Terre
  - Bouton "Explorer" → Vue détaillée globe
```

---

## 5. PERFORMANCES — ÉVALUATION & STRATÉGIE

### 5.1 Benchmarks attendus

| Élément                              | Coût GPU (estimé) | Coût CPU                     |
| ------------------------------------ | ----------------- | ---------------------------- |
| 8 planètes (mesh sphère 64 segments) | ~2 Mo VRAM        | Négligeable                  |
| Textures planètes (8×2K WebP)        | ~30 Mo VRAM       | Chargement initial           |
| Shader terminateur Globe.tsx         | +0.2ms/frame      | Négligeable                  |
| Calcul `astronomia` positions        | 0 GPU             | ~2ms/calcul (1 fois/seconde) |
| Lignes d'orbite (LineLoop)           | < 0.1 Mo          | Négligeable                  |
| Anneaux Saturne (plane + texture)    | ~1 Mo             | Négligeable                  |

**Objectif maintenu** : 60 FPS constant en mode Vue Système Solaire.

### 5.2 Stratégies d'optimisation

1. **Throttle calcul positions** : `astronomia` appelé 1 fois/seconde (positions planétaires changent très lentement), résultat interpolé visuellement
2. **LOD planètes lointaines** : Neptune/Uranus → sphère 16 segments (pas de détails visibles), Jupiter/Saturne → 64 segments
3. **Lazy loading textures** : les textures des planètes lointaines chargées uniquement si mode solaire actif
4. **Textures WebP compressées** : toutes les textures planètes converties en WebP (qualité 85%, ~40% de gain taille)
5. **Shader terminateur** : remplace uniquement le matériau du globe Terre, pas les autres planètes

### 5.3 Comparaison approches terminateur

| Approche                           | Qualité | Perf  | Complexité impl. |
| ---------------------------------- | ------- | ----- | ---------------- |
| **ShaderMaterial custom (retenu)** | ★★★★★   | ★★★★★ | ★★★              |
| Mix deux Meshes superposées        | ★★★     | ★★★   | ★★               |
| Texture générée canvas             | ★★★     | ★★    | ★★               |
| API externe image                  | ★★★★    | ★     | ★                |

---

## 6. PLAN DE RÉALISATION V2

### SEMAINE V2-1 : FONDATIONS ASTRONOMIQUES

**Objectif** : Calcul des positions planétaires + tests de précision

**Tâches** :

1. `npm install astronomia` + setup TypeScript types
2. Créer `planetaryEphemeris.ts` : wrapper complet pour les 8 planètes + Soleil
3. **Benchmark de précision** : vérifier positions vs données JPL Horizons pour 3 dates de référence
4. Définir le système de coordonnées 3D compressé (mapping UA → unités Three.js)
5. Créer `planets.ts` : types, constantes (rayons réels, couleurs, périodes)
6. Créer `useSolarSystemStore.ts` : positions mises à jour 1 fois/seconde

**Livrable** :

- Console log des 8 planètes + Soleil avec RA/Dec et position 3D toutes les secondes
- Précision vérifiée vs JPL Horizons (< 1° d'écart acceptable)

---

### SEMAINE V2-2 : VUE SYSTÈME SOLAIRE — STRUCTURE 3D

**Objectif** : Afficher le système solaire navigable en mode globe

**Tâches** :

1. Créer `Sun.tsx` : sphère auto-lumineuse + `PointLight` + animation surface (bruit Perlin ou texture animée)
2. Créer `OrbitLine.tsx` : ellipse 3D (LineLoop) avec paramètres astrophysiques (demi-grand axe, excentricité)
3. Créer `Planet.tsx` : composant générique (mesh sphère, texture, rotation propre, raycasting clic)
4. Créer `SaturnRings.tsx` : plane circulaire avec texture d'anneaux + transparence
5. Créer `SolarSystem.tsx` : assemblage + positionnement via store
6. Toggle UI "Terre ↔ Système Solaire" dans `App.tsx`
7. Adapter `OrbitControls` pour mode système solaire (limites de zoom différentes)

**Livrable** :

- Vue système solaire navigable, planètes positionnées en temps réel, orbites visibles

---

### SEMAINE V2-3 : TERMINATEUR JOUR/NUIT

**Objectif** : Shader terminateur sur le globe Terre piloté par position réelle du Soleil

**Tâches** :

1. Créer `dayNightShader.ts` : `vertexShader` + `fragmentShader` GLSL
2. Modifier `Globe.tsx` : remplacer `MeshStandardMaterial` par `ShaderMaterial`
   - Passer `dayTexture` (Blue Marble) + `nightTexture` (Black Marble) comme uniforms
   - Passer `sunDirection` depuis le store (mis à jour 1×/s)
   - Conserver : atmosphère shader existant (superposition additive)
3. Tester le terminateur à différentes dates/heures via le slider temporel
4. Ajuster la pénombre (zone crépuscule, largeur ~15°)
5. S'assurer que les normal maps (relief) fonctionnent toujours (à intégrer dans le ShaderMaterial)

**Livrable** :

- Globe Terre avec frontière jour/nuit dynamique, lumières villes côté nuit, synchronisé avec le slider temporel

---

### SEMAINE V2-4 : VUE DÉTAILLÉE PLANÈTE

**Objectif** : Clic sur une planète → exploration immersive

**Tâches** :

1. Créer `PlanetDetailView.tsx` : globe 3D générique paramétré par `PlanetId`
   - Textures spécifiques (diffuse, normal si dispo, clouds si dispo)
   - OrbitControls locaux
   - Atmosphère adaptée (Mars : fine rouge, Vénus : épaisse orange, ...)
2. Gérer la transition caméra : animation spring depuis vue système solaire → face planète
3. Panneau InfoCard : données planète (distance, masse, lune(s), température...)
4. Bouton "Explorer" visible en hover sur une planète
5. Bouton "Retour au Système Solaire" dans la vue détaillée

**Livrable** :

- Flow complet : Globe → Système Solaire → Clic planète → Vue globe planète → Retour

---

### SEMAINE V2-5 : PLANÈTES EN MODE CIEL NOCTURNE

**Objectif** : Planètes visibles comme objets brillants dans la vue ciel

**Tâches** :

1. Calculer az/alt des planètes depuis le point d'observation sélectionné (via position RA/Dec + AstroPy backend OU calcul local)
2. Modifier `NightSky.tsx` : ajouter les planètes comme points distincts (plus grands, couleurs spécifiques)
3. Tooltip au hover : nom + magnitude apparente calculée
4. Panneau détails au clic (réutiliser InfoCard de V2-4)
5. Exclure le Soleil du mode nuit (avertissement si en dessous de l'horizon)

**Livrable** :

- Planètes visibles dans ciel nocturne à leur position réelle depuis le point d'obs sélectionné

---

### SEMAINE V2-6 : POLISH, OPTIMISATIONS & TESTS

**Objectif** : Qualité production, performances vérifiées, UX cohérente

**Tâches** :

1. Benchmark GPU : 60 FPS constant mode solaire sur machine cible
2. Compresser toutes les textures planètes en WebP
3. Implémenter LOD planètes lointaines
4. Lazy loading textures planètes (uniquement si mode solaire activé)
5. Animations de transition polish (zoom, fade, caméra cinématique)
6. Tests : précision positions planètes, terminateur cohérent avec réalité
7. Responsive : contrôles tactiles mode système solaire
8. Mettre à jour `README.md` + `QUICKSTART.md`

**Livrable** :

- V2 complète, stable, performante, documentée

---

## 7. HORS SCOPE V2 (pour V3 éventuelle)

- Satellites naturels (Lunes des planètes) — sauf Lune terrestre
- Astéroïdes et ceinture d'astéroïdes (décorative)
- Exoplanètes
- Comètes (trajectoires paraboliques)
- Carte céleste planisphère 2D

---

## 8. RISQUES ET MITIGATION

| Risque                                                         | Probabilité | Impact | Mitigation                                                                  |
| -------------------------------------------------------------- | ----------- | ------ | --------------------------------------------------------------------------- |
| ShaderMaterial incompatible avec normal/specular maps          | Moyenne     | Haut   | Intégrer manuellement les calculs de normal mapping dans le fragment shader |
| `astronomia` : précision insuffisante pour planètes lointaines | Faible      | Moyen  | Fallback vers JPL Horizons API en cache 24h                                 |
| Performances < 60 FPS en vue système solaire                   | Faible      | Haut   | LOD agressif + réduction segments sphères                                   |
| Textures planètes 30 Mo : chargement lent                      | Moyenne     | Moyen  | Lazy load + spinner par planète + WebP                                      |
| Transition caméra entre vues : artefacts visuels               | Moyenne     | Faible | Tests extensifs, interpolation quaternion                                   |

---

## 9. RÉCAPITULATIF STACK V2 (delta V1)

### Nouvelles dépendances npm

```json
{
  "astronomia": "^4.x",
  "@react-spring/three": "^9.x"
}
```

### Nouvelles textures (public/textures/planets/)

```
sun.webp, mercury.webp, venus.webp, mars.webp,
jupiter.webp, saturn.webp, saturn_ring.webp,
uranus.webp, neptune.webp
+ normal maps si disponibles : mars_normal.webp, earth_clouds.webp
```

### Backend

- **Aucune modification** — 100% frontend pour le système solaire

---

**Ce plan donne une V2 autonome, dérivée de la V1 déployée, qui transforme l'app en un observatoire solaire interactif complet. 🪐**
