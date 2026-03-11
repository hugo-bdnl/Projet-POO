# Documentation Technique — Frontend

> **Projet :** Night Sky Viewer  
> **Stack :** React 19 · TypeScript 5.9 · Vite 7 · Three.js 0.182 · React Three Fiber 9 · Zustand 5  
> **Port dev :** `http://localhost:5173`

---

## Table des matières

1. [Architecture générale](#1-architecture-générale)
2. [Structure des fichiers](#2-structure-des-fichiers)
3. [Modes de vue](#3-modes-de-vue)
4. [Composants 3D](#4-composants-3d)
5. [Composants UI (HTML/CSS)](#5-composants-ui-htmlcss)
6. [Stores Zustand](#6-stores-zustand)
7. [Service API](#7-service-api)
8. [Système de caméra](#8-système-de-caméra)
9. [Dépendances](#9-dépendances)

---

## 1. Architecture générale

L'application est une **Single Page Application** React qui embarque un canvas WebGL Three.js pour le rendu 3D. Elle s'organise autour de deux modes de vue mutuellement exclusifs, d'une couche de stores Zustand pour l'état global, et d'un service API centralisé.

```
┌─────────────────────────────────────────────────────┐
│                        App.tsx                      │
│  ┌──────────────┐  ┌────────────────┐               │
│  │  HTML UI     │  │   WebGL Canvas │               │
│  │  SidePanel   │  │                │               │
│  │  ConsSidebar │  │  MODE GLOBE    │               │
│  │  TimeSlider  │  │  └─ Globe.tsx  │               │
│  └──────────────┘  │     └─ ISS.tsx │               │
│                    │  MODE SKY      │               │
│  ┌──────────────┐  │  └─ NightSky   │               │
│  │  Stores      │  │     ├─ Stars   │               │
│  │  Zustand     │  │     ├─ Cons.   │               │
│  │  useSkyStore │  │     ├─ MilkyWay│               │
│  │  useCons..   │  │     └─ AzAlt  │               │
│  │  useObs..    │  │  OverlayHUD    │               │
│  │  useISS..    │  │  (tooltip, fx) │               │
│  └──────────────┘  └────────────────┘               │
└─────────────────────────────────────────────────────┘
              │
   astronomyService (Axios)
              │
       Backend FastAPI :8000
```

---

## 2. Structure des fichiers

```
frontend/src/
├── App.tsx              # Composant racine, canvas, routing modes
├── App.css              # Styles globaux (HUD, panels, tooltips, toast)
├── main.tsx             # Point d'entrée React DOM
├── index.css            # Reset / variables CSS de base
│
├── components/          # Composants React (15 fichiers)
│   ├── Globe.tsx        # Sphère terrestre 3D avec shader terminateur
│   ├── SolarSystem.tsx  # Système solaire en 3D (mode globe)
│   ├── PlanetInfoCard.tsx # Panneau info détaillé (Planètes)
│   ├── Loader3D.tsx     # Écran de chargement des textures/fichiers 3D
│   ├── ISS.tsx          # Modèle ISS + orbite (mode globe)
│   ├── NightSky.tsx     # Scène ciel nocturne (mode sky)
│   ├── MilkyWay.tsx     # Dôme Voie Lactée (mode sky)
│   ├── AzAltGrid.tsx    # Grille azimut/altitude (mode sky)
│   ├── ConstellationPattern.tsx # Lignes de constellation (mode sky)
│   ├── ConstellationGuide.tsx   # Indicateur constellation à l'écran
│   ├── EarthGuide.tsx           # Indicateur direction Terre (mode sky)
│   ├── CompassRose.tsx          # Boussole (mode sky)
│   ├── LocationMarker.tsx       # Marqueur point d'observation (globe)
│   ├── SidePanel.tsx    # Panneau latéral (paramètres, sélection)
│   ├── ConstellationSidebar.tsx # Sidebar recherche constellations (globe)
│   ├── StarTooltip.tsx  # Tooltip étoile survolée (3D overlay)
│   ├── TimeSlider.tsx   # Curseur temporel et temps réel
│   └── Effects.tsx      # Post-processing (bloom, etc.)
│
├── stores/              # État global Zustand
│   ├── useSkyStore.ts        # Mode de vue, étoiles, étoile sélectionnée
│   ├── useConstellationStore.ts # Constellations chargées, sélection
│   ├── useObservationStore.ts   # Point d'observation courant
│   └── useISSStore.ts           # Données ISS (TLE, position)
│
├── services/
│   └── api.ts           # Client Axios vers le backend
│
├── types/               # Interfaces TypeScript
└── utils/               # Fonctions utilitaires
```

---

## 3. Modes de vue

L'application possède deux modes exclusifs, contrôlés par `useSkyStore.viewMode` :

### Mode `"globe"` — Vue Globe

**Caméra :** position `[0, 0, 2.5]`, orbite entre `2.5` et `6` unités de distance.

**Composants actifs :**

- `Globe` — sphère terrestre avec shader dynamique jour/nuit
- `SolarSystem` — rendu 3D des orbites et des mouvements planétaires
- `PlanetInfoCard` — UI de détail lors du clic sur une planète
- `Loader3D` — gestionnaire de preloading des lourdes textures
- `ISS` — modèle 3D faible-poly de l'ISS avec ligne orbitale
- `LocationMarker` — marqueur de la ville d'observation
- `ConstellationSidebar` — barre de recherche/sélection de constellations (HTML)
- `SidePanel` — panneau de configuration (HTML)
- `TimeSlider` — curseur temporel (HTML)

**Lumière directionnelle :** `position=[5, 3, 5], intensity=2` (simule le Soleil).

---

### Mode `"sky"` — Vue Ciel Nocturne

**Caméra :** position `[0, -0.15, 0.1]` (quasi à l'origine, vue 1ère personne). Distance min `0.05`, max infinie. L'utilisateur peut regarder à 360° autour de lui.

**Composants actifs :**

- `NightSky` — scène principale (étoiles, constellations)
- `MilkyWay` — sphère inversée avec texture équirectangulaire
- `AzAltGrid` — grille azimut/altitude (activable depuis le HUD)
- `ConstellationPattern` — tracé des lignes de constellations
- `ConstellationGuide` — flèche indicatrice vers la constellation sélectionnée
- `EarthGuide` — indicateur de la direction du sol
- `CompassRose` — boussole
- `Effects` — post-processing bloom
- `StarTooltip` — tooltip au survol d'une étoile

**HUD top-right :** bouton « ← Globe » + toggle de la grille Az/Alt.

---

## 4. Composants 3D

Tous les composants listés ici fonctionnent **dans** le `<Canvas>` React Three Fiber et utilisent Three.js directement.

---

### 4.1 Globe

`components/Globe.tsx`

Sphère texturée représentant la Terre. Charge les textures WebP depuis `public/textures/`.

**Fonctionnalités :**

- Texture couleur + texture normale + texture spéculaire (eau brillante)
- Rotation automatique selon le timestamp sélectionné (GMST)
- Clic → déclenche le passage en mode `"sky"` et charge les étoiles pour la position cliquée

---

### 4.2 ISS

`components/ISS.tsx`

**Calcul de position :** utilise `satellite.js` (propagateur SGP4) avec les données TLE récupérées depuis `GET /api/iss/tle`.

**Fonctionnalités :**

- Position calculée côté frontend via SGP4 (mise à jour toutes les secondes)
- Modèle 3D procédural (géométries Three.js primitives assemblées)
- Ligne orbitale : calcul de N points orbitaux sur 90 minutes, rendu `LineLoop`
- Clic → affiche les informations (altitude, vitesse, position) dans le `SidePanel`
- Taille du modèle adaptée au zoom (scale factor)

**Store :** `useISSStore` (position ECI, données ISS, chargement TLE on-demand).

---

### 4.3 NightSky

`components/NightSky.tsx`

Scène principale du mode ciel. Orchestre tous les sous-composants.

**Fonctionnalités :**

- Rendu des étoiles : `Points` Three.js avec taille proportionnelle à la magnitude
- Couleur des étoiles dérivée de l'indice B-V (rouge → blanc → bleu)
- Clic/survol sur une étoile → mise à jour de `useSkyStore`
- Intègre `ConstellationPattern`, `MilkyWay`, `AzAltGrid`, `CompassRose`
- Recharge les étoiles via `useSkyStore.fetchVisibleStars()` quand la position ou le timestamp change

---

### 4.4 MilkyWay

`components/MilkyWay.tsx`

Sphère inversée (`side: THREE.BackSide`) avec texture équirectangulaire (2:1) de la Voie Lactée.

- Inclinaison corrigée pour le plan galactique (~62.9°)
- Segments suffisants pour éviter la déformation aux pôles
- Opacité réduite pour un rendu atmosphérique

---

### 4.5 AzAltGrid

`components/AzAltGrid.tsx`

Grille azimut/altitude en coordonnées horizontales locales.

- Cercles horizontaux tous les 30° d'altitude
- Lignes verticales tous les 30° d'azimut
- Plans opaques sous l'horizon (sol) pour masquer la Voie Lactée au-dessous
- Activable/désactivable via `useSkyStore.showAzAltGrid`

---

### 4.6 ConstellationPattern

`components/ConstellationPattern.tsx`

Trace les lignes d'une constellation sélectionnée dans la scène 3D.

- Reçoit les `lines_data` (paires HIP) depuis `useConstellationStore`
- Convertit RA/Dec → position sphérique 3D (rayon unitaire)
- Rendu `<Line>` (drei) avec couleur et opacité configurables

---

### 4.7 LocationMarker

`components/LocationMarker.tsx`

Affiche un marqueur sur le globe à la position du point d'observation sélectionné.

---

## 5. Composants UI (HTML/CSS)

Ces composants sont rendus **en dehors** du Canvas Three.js, en HTML standard superposé.

---

### 5.1 SidePanel

`components/SidePanel.tsx` — ~350 lignes

Panneau latéral gauche. Contenu conditionnel selon l'état :

| État                | Contenu                                                           |
| ------------------- | ----------------------------------------------------------------- |
| Aucune sélection    | Formulaire de configuration (ville, magnitude limite)             |
| Étoile sélectionnée | Fiche détaillée : nom, magnitude, distance, type spectral, RA/Dec |
| ISS sélectionnée    | Télémétrie ISS : altitude, vitesse, lat/lon                       |

**Actions :**

- Sélecteur de point d'observation (liste depuis `/api/observation-points`)
- Slider magnitude limite
- Bouton « Mode Ciel » → déclenche `setViewMode("sky")` + `fetchVisibleStars()`

---

### 5.2 ConstellationSidebar

`components/ConstellationSidebar.tsx`

Barre de recherche et liste des constellations (mode globe uniquement).

**Fonctionnalités :**

- Champ de recherche → appel `GET /api/constellations/search?q=...`
- Liste des 88 constellations avec nom FR/EN et abréviation
- Clic → sélectionne la constellation dans `useConstellationStore`
- Bouton « Meilleur point d'observation » → appel `GET /api/constellations/{id}/best-location`

---

### 5.3 TimeSlider

`components/TimeSlider.tsx`

Curseur temporel flottant (bas de l'écran, mode sky).

- Entrée `datetime-local` → stocke l'ISO 8601 dans `useSkyStore.timestamp`
- Bouton « Maintenant » → reset au temps réel
- Chaque changement déclenche `fetchVisibleStars()` avec le nouveau timestamp

---

### 5.4 ConstellationGuide

`components/ConstellationGuide.tsx`

Indicateur HTML qui affiche une flèche à l'écran pointant vers la constellation sélectionnée (si hors du champ de vision).

- Utilise `useThree` pour projeter les coordonnées 3D de la constellation en pixels 2D
- Si dans le champ de vision → affiche un cercle pulsant autour de la position
- Si hors champ → affiche une flèche sur le bord de l'écran

---

### 5.5 EarthGuide

`components/EarthGuide.tsx`

Indicateur de la direction du sol en mode sky. S'affiche dans le bas de l'écran quand la caméra pointe vers le haut, et monte quand la caméra pointe vers le bas.

---

### 5.6 StarTooltip

`components/StarTooltip.tsx`

Tooltip 3D affiché au survol d'une étoile dans le canvas. Affiche le nom propre (si disponible) et la magnitude.

---

### 5.7 Effects

`components/Effects.tsx`

Post-processing `@react-three/postprocessing` :

- Bloom sur les étoiles brillantes (mode sky uniquement)

---

## 6. Stores Zustand

L'état global est géré avec **Zustand v5** (stores atomiques, sans contexte React).

### 6.1 useSkyStore

| Champ           | Type                  | Description                        |
| --------------- | --------------------- | ---------------------------------- |
| `viewMode`      | `"globe" \| "sky"`    | Mode actif                         |
| `timestamp`     | `string \| undefined` | Temps ISO 8601 sélectionné         |
| `stars`         | `VisibleStar[]`       | Étoiles visibles chargées          |
| `loadingStars`  | `boolean`             | En chargement                      |
| `hoveredStar`   | `VisibleStar \| null` | Étoile survolée                    |
| `selectedStar`  | `VisibleStar \| null` | Étoile cliquée                     |
| `cameraTarget`  | `[x,y,z] \| null`     | Cible caméra (centrage sur étoile) |
| `showAzAltGrid` | `boolean`             | Grille Az/Alt visible              |
| `error`         | `string \| null`      | Message d'erreur                   |

**Actions principales :**

- `setViewMode(mode)` — bascule de mode
- `fetchVisibleStars(lat, lon, timestamp?)` — appel API + mise à jour stars
- `toggleAzAltGrid()` — toggle de la grille

---

### 6.2 useConstellationStore

| Champ                   | Type                                | Description           |
| ----------------------- | ----------------------------------- | --------------------- |
| `constellations`        | `ConstellationListResponse[]`       | Les 88 constellations |
| `selectedConstellation` | `ConstellationListResponse \| null` | Constellation active  |
| `loading`               | `boolean`                           | —                     |
| `error`                 | `string \| null`                    | —                     |

Charge les constellations via `GET /api/constellations` au montage.

---

### 6.3 useObservationStore

Gère le point d'observation courant (ville sélectionnée dans le SidePanel).

| Champ               | Type                       | Description    |
| ------------------- | -------------------------- | -------------- |
| `observationPoints` | `ObservationPoint[]`       | Liste complète |
| `selectedPoint`     | `ObservationPoint \| null` | Point actif    |

---

### 6.4 useISSStore

| Champ         | Type              | Description          |
| ------------- | ----------------- | -------------------- |
| `tleData`     | `TLEData \| null` | Données TLE brutes   |
| `issSelected` | `boolean`         | ISS est sélectionnée |
| `loading`     | `boolean`         | Chargement TLE       |

**Stratégie :** le TLE n'est récupéré que lors du premier clic sur l'ISS (on-demand), puis mis en cache dans le store.

---

## 7. Service API

`frontend/src/services/api.ts`

Client Axios centralisé. Base URL : `http://localhost:8000`.

**Méthodes exposées :**

```typescript
astronomyService.getVisibleStars(lat, lon, timestamp?)
    → GET /api/stars/visible

astronomyService.getAllConstellations()
    → GET /api/constellations

astronomyService.searchConstellations(q)
    → GET /api/constellations/search?q=...

astronomyService.getBestObservationPoint(constellationId, timestamp?)
    → GET /api/constellations/{id}/best-location

astronomyService.getObservationPoints()
    → GET /api/observation-points

astronomyService.getIssTle()
    → GET /api/iss/tle
```

---

## 8. Système de caméra

### CameraController

Composant interne (dans le Canvas) gérant les transitions de caméra entre modes.

**Algorithme de transition :**

```typescript
// Lerp exponentiel — fluide et indépendant du framerate
const lerpFactor = 1.0 - Math.exp(-3.0 * delta);

if (viewMode === "sky") {
  camera.position.lerp(SKY_CAMERA_POS, lerpFactor); // [0, -0.15, 0.1]
} else {
  camera.position.lerp(GLOBE_CAMERA_POS, lerpFactor); // [0, 0, 2.5]
}
```

- La transition dure **1.5 secondes** (timer interne), après quoi `useFrame` ne fait plus rien → contrôle total à l'utilisateur.
- Les vecteurs cibles sont **pré-alloués** (`new THREE.Vector3(...)` hors du composant) pour éviter 120 allocations/s dans la boucle de rendu.

### OrbitControls

| Mode  | `minDistance` | `maxDistance` |
| ----- | ------------- | ------------- |
| Globe | 2.5           | 6             |
| Sky   | 0.05          | Infinity      |

`dampingFactor: 0.05` pour une inertie fluide.

---

## 9. Dépendances

| Paquet                        | Version | Rôle                                          |
| ----------------------------- | ------- | --------------------------------------------- |
| `react`                       | 19.2    | UI framework                                  |
| `react-dom`                   | 19.2    | Rendu DOM                                     |
| `three`                       | 0.182   | Moteur WebGL 3D                               |
| `@react-three/fiber`          | 9.5     | Bridge React ↔ Three.js                       |
| `@react-three/drei`           | 10.7    | Utilitaires Three.js (OrbitControls, Line, …) |
| `@react-three/postprocessing` | 3.0     | Effets post-processing (bloom)                |
| `zustand`                     | 5.0     | Gestion d'état global                         |
| `axios`                       | 1.13    | Client HTTP                                   |
| `satellite.js`                | 6.0     | Propagateur SGP4 (calcul position ISS)        |
| `typescript`                  | 5.9     | Typage statique                               |
| `vite`                        | 7.3     | Bundler / dev server                          |
| `vitest`                      | 4.0     | Tests unitaires                               |
| `@testing-library/react`      | 16.3    | Tests de composants                           |
