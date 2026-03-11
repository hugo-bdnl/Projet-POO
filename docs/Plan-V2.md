# Plan V2 : Système Solaire Temps Réel & Terminateur Jour/Nuit

## Vision Générale

La V2 intègre une nouvelle fonctionnalité cohérente :  
le **Système Solaire en temps réel**, visible depuis le globe et le ciel nocturne.

Le Soleil devenant un objet 3D positionné astronomiquement, le **terminateur jour/nuit** en découle naturellement : la frontière jour/nuit sur le globe est tout simplement l'ombre portée par la direction réelle du Soleil — aucun calcul séparé requis. Toutes les positions se doivent d'être en temps réel.

---

## Ambition V2 : Ce qu'on construit

```

MODE Système Solaire (vue de l'extérieur)
├── Système Solaire en orbite autour du Soleil
│   ├── Soleil (sphère lumineuse, PointLight)
│   ├── Terre (notre globe actuel, en orbite)
│   ├── 7 autres planètes (Mercury → Neptune)
│   └── Lignes d'orbite elliptiques
│
├── Terminateur dynamique sur la Terre
│   ├── Shader jour/nuit piloté par position 3D réelle du Soleil
│   └── Zone de pénombre (crépuscule ~10°)


MODE GLOBE (vue de l'extérieur)
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

### 2.3 Modifications backend et Base de Données

**Migration de SQLite vers PostgreSQL (Prod-Ready)** :
Pour une production robuste sur Railway, la base de données migrera de SQLite (actuel `nightsky.db` commité sur Git) vers une instance PostgreSQL gérée par Railway.

- Avantages : Plus de fichier binaire sur le dépôt Git, meilleures performances concurrentes, déploiements stateless.
- Implémentation : Script d'import initial sur la DB de prod au lieu de commiter le `.db`.

Pour le système solaire spécifiquement, **aucune modification métier backend requise** : les positions planétaires sont calculées entièrement côté frontend via `astronomia`. Le backend reste focalisé sur le catalogue d'étoiles (120k+) et les constellations.

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

### 4.2 UX de Rotation et Animation Temporelle

Pour équilibrer réalisme astronomique et expérience visuelle engageante, le comportement de rotation des corps dépend de la vitesse d'écoulement du temps :

- **Au repos (Temps Réel x1)** : _Réalisme contemplatif_. Les planètes tournent à leur vitesse réelle (elles semblent donc immobiles). Le Soleil pulse légèrement via un shader et la dérive lente des nuages (Terra) maintient la scène vivante.
- **Accéléré (Time Travel via le slider)** : _Animation spectaculaire_. En glissant le slider temporel, l'orbite des planètes et leur rotation propre s'accélèrent visuellement. Sur la Terre, le terminateur balaie la surface rapidement. Cette logique pilotée par `astronomia` ne nécessite aucun appel serveur, garantissant un 60 FPS parfait pendant l'accélération.

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

### 5.2 Stratégies d'optimisation (Le défi des 30 Mo d'assets)

Le démarrage de l'application en mode "Système Solaire" requiert le chargement immédiat des textures planétaires (~30 Mo). Pour éviter un canvas noir, la stratégie suivante est adoptée :

1. **Loader 3D Global avec Suspense** : L'ensemble de la scène 3D initiale est enveloppé dans un `<Suspense>` avec un écran de chargement complet (barre de progression liée au statut de téléchargement des textures). L'univers ne s'affiche visuellement que lorsque tous les assets critiques de la vue de base sont prêts (0% de "pop-in" d'images blanches).
2. **Compression WebP Destructive qualitative (Lossy à 80%)** : Toutes les textures d'origine (JPG/PNG ultra-HD) doivent être converties en WebP avec perte (qualité `~80/100`). Les normales/specular maps pourront être divisées par deux en résolution (ex: 1024x512). Objectif : un poids total de ~10 Mo au démarrage.
3. **Preloading différencié** : Seules les _color/diffuse maps_ base résolution sont bloquantes pour le loader initial. Les textures très haute définition utilisées uniquement lors du clic/zoom sur une planète individuelle (ex: nuages HD, normal map HD) seront préchargées en arrière-plan silencieusement (`useTexture.preload()`) _après_ le démarrage de l'app.
4. **Throttle calcul positions** : `astronomia` interpole en temps réel lors du drag du slider. En x1, le calcul complet est throttlé (ex: 1/sec).
5. **LOD planètes lointaines** : Réduction drastique des segments de sphère (Uranus/Neptune → 16 segments).

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

- [x] `npm install astronomia` + setup TypeScript types
- [x] Créer `planetaryEphemeris.ts` : wrapper complet pour les 8 planètes + Soleil
- [x] **Benchmark de précision** : vérifier positions vs données JPL Horizons pour 3 dates de référence
- [x] Définir le système de coordonnées 3D compressé (mapping UA → unités Three.js)
- [x] Créer `planets.ts` : types, constantes (rayons réels, couleurs, périodes)
- [x] Créer `useSolarSystemStore.ts` : positions mises à jour 1 fois/seconde

**Livrable** :

- Console log des 8 planètes + Soleil avec RA/Dec et position 3D toutes les secondes
- Précision vérifiée vs JPL Horizons (< 1° d'écart acceptable)

---
### SEMAINE V2-2 : VUE SYSTÈME SOLAIRE — STRUCTURE 3D

**Objectif** : Afficher le système solaire navigable en mode globe

**Tâches** :

- [x] Créer `Sun.tsx` (ou intégré) : sphère auto-lumineuse + `PointLight` + animation surface (bruit Perlin ou texture animée)
- [x] Créer `OrbitLine.tsx` (ou intégré) : ellipse 3D (LineLoop) avec paramètres astrophysiques (demi-grand axe, excentricité)
- [x] Créer `Planet.tsx` (ou intégré) : composant générique (mesh sphère, texture, rotation propre, raycasting clic)
- [x] Créer `SaturnRings.tsx` (ou intégré) : plane circulaire avec texture d'anneaux + transparence
- [x] Créer `SolarSystem.tsx` : assemblage + positionnement via store
- [x] Toggle UI "Terre ↔ Système Solaire" dans `App.tsx` (via `SidePanel`)
- [x] Adapter `OrbitControls` pour mode système solaire (limites de zoom différentes)

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
3. [x] Tester le terminateur à différentes dates/heures via le slider temporel
4. [x] Ajuster la pénombre (zone crépuscule, largeur ~15°)
5. [x] S'assurer que les normal maps (relief) fonctionnent toujours (à intégrer dans le ShaderMaterial)

**Livrable** :

- Globe Terre avec frontière jour/nuit dynamique, lumières villes côté nuit, synchronisé avec le slider temporel

---
### SEMAINE V2-4 : VUE DÉTAILLÉE PLANÈTE

**Objectif** : Clic sur une planète → exploration immersive

**Tâches** :

1. [x] Créer la logique `selectedPlanet` et stocker ses propriétés physiques.
2. [x] Gérer la transition caméra : animation spring depuis vue système solaire → face planète
3. [x] Créer Panneau InfoCard : données planète (distance, masse, lune(s), température...)
4. [x] Ajouter logique interactive (curseur pointeur/hover + onClick)
5. [x] Ajouter Bouton "Retour au Système Solaire" dans la vue détaillée

**Livrable** :

- Flow complet : Globe → Système Solaire → Clic planète → Vue globe planète → Retour

---
### SEMAINE V2-5 : NOUVELLES FONCTIONNALITÉS (ROTATION, TERMINATEUR, ORBITES, ZOOM)

**Objectif** : Finalisation de la physique, des animations du système et de l'expérience visuelle.

**Tâches** :
- [x] L'animation de la rotation du système (vitesses configurables, play/pause)
- [x] Le réglage de bugs du terminateur
- [x] L'ajustement des orbites (orbites au niveau du soleil)
- [x] L'animation sur le zoom des planètes (hover scaling)

**Livrable** :
- Une simulation du système solaire fluide, interactive, et performante.

---

### SEMAINE V2-6 : AUDIT DE PERFORMANCES ET OPTIMISATIONS

**Objectif** : Fiabiliser et optimiser la version V2 pour éviter la surcharge processeur (CPU), réseau et vidéo (VRAM), garantissant une compatibilité avec les mobiles et PC modestes.

**Tâches identifiées suite à l'audit du mode Globe Unifié :**

- [x] **1. [CPU] Optimisation de l'Éphéméride** :
  - _Statut :_ **Résolu**. `computePlanetPositions` et `sunDirectionGlobal` sont désormais correctement mémoïsés via `useMemo` dans `Globe.tsx` et ne se recalculent que lorsque le temps (`tsStr`) ou la planète sélectionnée change, évitant ainsi un appel à chaque frame.

- [x] **2. [Réseau/Mémoire] Temporisation du prechargement dynamique** :
  - _Statut :_ **Résolu**. `SolarSystem.tsx` utilise un ref `hoverTimeouts` avec un `setTimeout` de 350ms sur le `onPointerOver`, qui est annulé via `onPointerOut`. Cela évite les téléchargements inutiles lors d'un survol rapide.

- [x] **3. [WebGL] Recompilation du Shader "DayNight"** :
  - _Statut :_ **Résolu**. Le code de `Globe.tsx` a été refactoré pour utiliser `CustomShaderMaterial` au lieu de `onBeforeCompile`, et `dayNightShader.ts` exporte désormais des chunks GLSL séparés pour éviter les micro-saccades de compilation.

---

**Ce plan donne une V2 autonome, dérivée de la V1 déployée, qui transforme l'app en un observatoire solaire interactif complet. 🪐**
### SEMAINE V2-7 : PLANÈTES EN MODE CIEL NOCTURNE

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
### SEMAINE V2-8 : POLISH, OPTIMISATIONS & TESTS

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
