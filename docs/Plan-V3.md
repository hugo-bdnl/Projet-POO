# Plan V3 : Missions Spatiales, Ciel Nocturne & Polish

---

## Vision Générale V3

La V3 enrichit l'expérience autour de trois axes :

1. **Missions spatiales réelles** — modélisation de la mission Artémis 2 avec trajectoire animée en mode Globe
2. **Complétion du système solaire** — anneaux des géantes gazeuses + planètes visibles depuis le ciel nocturne
3. **Polish & production** — optimisations GPU, tests de précision, responsive, documentation

---

## Tâches V3

---

### Tâche V3-1 — Mission Artémis 2 (PRIORITÉ)

**Objectif** : Modéliser la mission Artémis 2 de la NASA (premier vol habité Artémis, survol lunaire) avec sa trajectoire animée, ses phases clés, et ses données réelles. Visible **uniquement en mode Globe sur la Terre**.

---

#### Contexte mission

| Champ | Valeur |
|---|---|
| **Mission** | Artémis 2 (NASA) |
| **Type** | Vol habité, survol lunaire libre (Free Return Trajectory) sans alunissage |
| **Équipage** | Reid Wiseman (CDR), Victor Glover (PLT), Christina Koch (MSP1), Jeremy Hansen (MSP2) |
| **Lanceur** | SLS Block 1 (Space Launch System) |
| **Vaisseau** | Orion MPCV (Module de service ESA) |
| **Site de lancement** | LC-39B, Kennedy Space Center, Floride (28.627°N, 80.621°W) |
| **Durée prévue** | ~10 jours |
| **Date cible** | Fin 2026 (à confirmer — utiliser une date configurable) |

**Phases clés de la mission** :
1. **Lancement** (J+0h) : décollage LC-39B, KSC
2. **TLI** (Trans-Lunar Injection, J+~3h) : allumage 3e étage ICPS → direction Lune
3. **Survol lunaire** (J+~4 jours) : passage à ~8 900 km de la surface lunaire
4. **Retour / TEI** (Trans-Earth Injection, J+~4–5 jours) : trajectoire de retour vers Terre
5. **Amerrissage** (J+~10 jours) : zone d'amerrissage Pacifique (~120°O, 20°N)

---

#### Données & sources

- **Trajectoire** : approximation de Free Return Trajectory basée sur les éléments orbitaux publiés par la NASA
  - Source primaire : [NASA Artemis Press Kit](https://www.nasa.gov/artemis-2/) + documentation SLS/Orion
  - Alternative : données JPL Horizons pour une approximation post-lancement (si date confirmée)
  - Approche recommandée : **trajectoire pré-calculée** sous forme de tableau de points `{time_offset_hours, lat, lon, altitude_km}` sérialisé en JSON — ni API, ni recalcul SGP4 temps réel (trajectoire déterministe connue à l'avance)
- **Position Lune** : `astronomia/moonposition` (déjà en stack) — position réelle au moment du survol
- **TLE Orion** : disponible sur CelesTrak après lancement (intégrer via `satellite.js` pour la phase orbitale basse)

---

#### Architecture technique

**Données** :
```
frontend/public/data/
└── artemis2_trajectory.json    # Points de trajectoire pré-calculés
    [{
      "t": 0,           // offset en heures depuis lancement
      "lat": 28.627,    // degrés
      "lon": -80.621,
      "alt": 0          // km (altitude)
    }, ...]
```

**Composants** :
```
frontend/src/components/Globe/
├── Artemis2.tsx              # [NEW] Composant principal, monté si toggle activé
├── Artemis2Trajectory.tsx    # [NEW] Ligne de trajectoire 3D (TubeGeometry ou Line)
├── Artemis2Marker.tsx        # [NEW] Position actuelle du vaisseau (sprite animé)
└── Artemis2Panel.tsx         # [NEW] Panneau infos mission (phases, countdown, équipage)
```

**Store** (extension `useSkyStore`) :
```typescript
artemis2Visible: boolean           // toggle depuis HUD
artemis2MissionTime: number        // heures depuis lancement (lié au slider temporel)
artemis2CurrentPhase: MissionPhase // phase active selon missionTime
```

---

#### Contraintes de performance (Globe mode only)

- La trajectoire est **statique** (JSON pré-calculé) — aucun calcul dynamique en `useFrame`
- Position du vaisseau interpolée linéairement entre les points JSON selon `missionTime`
- `TubeGeometry` ou `Line` pour la trajectoire : créée **une seule fois** au montage, pas de reconstruction frame par frame
- Le composant n'est monté **que si** `selectedPlanet === "earth"` ET `artemis2Visible === true`
- Scratch variables pré-allouées pour l'interpolation dans `useFrame`
- Pas d'instanced mesh requis (1 seul objet mobile)
- Désactiver si `viewMode !== "globe"` — strictement hors mode Système Solaire et Ciel

---

#### UX & affichage

- **Toggle HUD** : bouton `[🚀 ARTÉMIS 2]` dans la barre d'outils Globe (à côté de Satellites, ISS)
- **Trajectoire** : ligne arc orange/blanc de KSC → Lune → retour Terre (visible sur le globe)
  - Partie déjà effectuée : opacité 100%
  - Partie à venir : pointillés semi-transparents
- **Marker vaisseau** : sprite animé (Orion capsule icon) à la position interpolée selon le timestamp
- **Phases affichées** : indicateur de phase active dans le panneau (Launch / TLI / Lunar Flyby / TEI / Splashdown)
- **Panneau mission** (clic sur marker ou bouton "i") :
  - Photo équipage (statique)
  - Nom des astronautes + rôle
  - Phase actuelle + temps écoulé / restant
  - Distance à la Terre / à la Lune en temps réel (calculée depuis position interpolée)
  - Altitude actuelle
- **Interaction avec le slider temporel** : `artemis2MissionTime` est piloté par `useSkyStore.timestamp` → permet de "rejouer" la mission en avance rapide

---

#### Tâches détaillées

- [ ] Collecter et formaliser les données de trajectoire Artémis 2 (sources NASA/ESA)
- [ ] Créer `artemis2_trajectory.json` : tableau de ~200 points couvrant les 10 jours
- [ ] `Artemis2.tsx` : composant principal, lien store, toggle, gestion montage conditionnel
- [ ] `Artemis2Trajectory.tsx` : `TubeGeometry` ou `CatmullRomCurve3` + affichage bipartite (effectué/à venir)
- [ ] `Artemis2Marker.tsx` : sprite Orion, interpolation position, animations légères
- [ ] `Artemis2Panel.tsx` : panneau infos mission (équipage, phase, distances calculées)
- [ ] Intégration toggle HUD Globe (à côté des boutons ISS/Satellites)
- [ ] Connexion au slider temporel (`useSkyStore.timestamp` → `artemis2MissionTime`)
- [ ] Vérification performances : 60 FPS maintenu avec trajectoire active
- [ ] Tests visuels : position Lune cohérente avec astronomia au moment du survol

---

### Tâche V3-2 — Anneaux de Jupiter, Uranus et Neptune en mode Système

**Description** : Ajouter les anneaux planétaires manquants. Saturne en dispose déjà ; les 3 autres géantes ont des anneaux moins visibles mais réels.

| Planète | Anneaux | Caractéristiques visuelles |
|---|---|---|
| **Jupiter** | Anneau principal + halo + gossamer | Très ténus, semi-transparents, brun-rougeâtre |
| **Uranus** | 13 anneaux distincts (ε, δ, γ…) | Fins, sombres, inclinés à 97° (axe couché) |
| **Neptune** | 5 arches/anneaux (Adams, Le Verrier…) | Très ténus, légèrement bleutés |

**Sources textures** :
- [Solar System Scope](https://www.solarsystemscope.com/textures/) : ring maps disponibles pour Uranus et Neptune
- [NASA JPL Photojournal](https://photojournal.jpl.nasa.gov/) : images Voyager 2 des anneaux d'Uranus et Neptune
- Pour Jupiter : texture procédurale semi-transparente acceptable (anneaux quasi-invisibles à l'œil)

**Implémentation** :
- Réutiliser la logique de `SaturnRings.tsx` (ring plane avec texture + `DoubleSide` + `alphaMap`)
- Particularité Uranus : incliner le ring plane à ~97° (axe de rotation couché)
- Particularité Neptune : arches d'intensité variable → possible via texture avec zones plus denses
- Intégrer les rings dans `SolarSystem.tsx` aux conditions `planetId === "jupiter"` etc.

**Tâches** :
- [ ] Télécharger/créer textures ring maps pour Jupiter, Uranus, Neptune
- [ ] Créer ou étendre `PlanetRings.tsx` en composant générique (remplace `SaturnRings.tsx`)
- [ ] Appliquer l'inclinaison correcte pour Uranus
- [ ] Tester la transparence et le rendu en mode système

---

### Tâche V3-3 — Planètes en mode ciel nocturne

**Objectif** : Planètes visibles comme objets brillants dans la vue ciel nocturne

**Tâches** :

1. Calculer az/alt des planètes depuis le point d'observation sélectionné (via position RA/Dec + AstroPy backend OU calcul local)
2. Modifier `NightSky.tsx` : ajouter les planètes comme points distincts (plus grands, couleurs spécifiques)
3. Tooltip au hover : nom + magnitude apparente calculée
4. Panneau détails au clic (réutiliser InfoCard de V2-4)
5. Exclure le Soleil du mode nuit (avertissement si en dessous de l'horizon)

**Livrable** :
- Planètes visibles dans ciel nocturne à leur position réelle depuis le point d'obs sélectionné

---

### Tâche V3-4 — Polish, optimisations & tests

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
- V3 complète, stable, performante, documentée
