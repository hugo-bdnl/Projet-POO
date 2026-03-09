import * as THREE from "three";
// @ts-ignore
import { julian, planetposition } from "astronomia";
// @ts-ignore
import mercuryData from "astronomia/data/vsop87Bmercury";
// @ts-ignore
import venusData from "astronomia/data/vsop87Bvenus";
// @ts-ignore
import earthData from "astronomia/data/vsop87Bearth";
// @ts-ignore
import marsData from "astronomia/data/vsop87Bmars";
// @ts-ignore
import jupiterData from "astronomia/data/vsop87Bjupiter";
// @ts-ignore
import saturnData from "astronomia/data/vsop87Bsaturn";
// @ts-ignore
import uranusData from "astronomia/data/vsop87Buranus";
// @ts-ignore
import neptuneData from "astronomia/data/vsop87Bneptune";

import type { PlanetId, PlanetPosition } from "../types/planets";

// Instanciation des objets Planètes (Algorithmes de Meeus)
const mercury = new planetposition.Planet(mercuryData.default || mercuryData);
const venus = new planetposition.Planet(venusData.default || venusData);
const earth = new planetposition.Planet(earthData.default || earthData);
const mars = new planetposition.Planet(marsData.default || marsData);
const jupiter = new planetposition.Planet(jupiterData.default || jupiterData);
const saturn = new planetposition.Planet(saturnData.default || saturnData);
const uranus = new planetposition.Planet(uranusData.default || uranusData);
const neptune = new planetposition.Planet(neptuneData.default || neptuneData);

const planetsMap = {
  mercury,
  venus,
  earth,
  mars,
  jupiter,
  saturn,
  uranus,
  neptune,
};

// Périodes orbitales approximatives en jours pour générer les tracés
const ORBITAL_PERIODS_DAYS: Record<PlanetId, number> = {
  sun: 0,
  mercury: 88,
  venus: 225,
  earth: 365.25,
  mars: 687,
  jupiter: 4333,
  saturn: 10759,
  uranus: 30688,
  neptune: 60182,
};

/**
 * Fonction de conversion sphérique (L, B, R) en coordonnées cartésiennes
 * pour le système solaire.
 * On suit la même approche Y-up que la V1 pour le Ciel/Globe.
 */
function sphericalToVector3(
  lonRad: number,
  latRad: number,
  radius: number,
): THREE.Vector3 {
  // L (lon) correspond au plan du système solaire (X, Z).
  // B (lat) est l'élévation par rapport à ce plan (Y).
  return new THREE.Vector3(
    radius * Math.cos(latRad) * Math.cos(lonRad),
    radius * Math.sin(latRad),
    radius * Math.cos(latRad) * -Math.sin(lonRad),
  );
}

/**
 * Échelle logique pour ramener les orbites immenses dans l'affichage 3D.
 * Terre = 1 AU -> affichée à X unités dans le canvas.
 * On utilise une échelle compressée ou logarithmique pour l'affichage
 * du système solaire (mode "solar") pour que Jupiter et Neptune soient visibles.
 */
function compressRadius(au: number): number {
  if (au === 0) return 0;
  // Compressons les distances de façon artificielle pour la vue 3D
  // Le Soleil ayant un rayon de 12 unités, l'orbite 0 commence au-delà.
  // Exposant encore plus agressif (0.65 au lieu de 0.8) pour rapprocher Uranus et Neptune :
  // 1 AU = ~25 unités
  // 30 AU (Neptune) = ~90 unités
  return 15 + Math.pow(au, 0.65) * 12;
}

export function computePlanetPositions(
  date: Date,
  skipOrbits: boolean = false
): Map<PlanetId, PlanetPosition> {
  const jd = new julian.CalendarGregorian(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1, // astronomia months are 1-based
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400,
  ).toJD();

  const positions = new Map<PlanetId, PlanetPosition>();

  // 1. Position du Soleil (Immobile au centre)
  const sunPos = new THREE.Vector3(0, 0, 0);
  positions.set("sun", {
    id: "sun",
    name: "Sun",
    helioLon: 0,
    helioLat: 0,
    helioDist: 0,
    distanceToEarth: 1.0, // sera corrigé juste en dessous
    position3D: sunPos,
    orbitPoints: [],
  });

  // 2. Positions des planètes (héliocentriques)
  for (const [key, planet] of Object.entries(planetsMap)) {
    const pId = key as PlanetId;
    const helio = planet.position(jd); // { lon, lat, range }

    // Position cartésienne compressée pour l'affichage 3D
    const renderedRadius = compressRadius(helio.range);
    const pos3D = sphericalToVector3(helio.lon, helio.lat, renderedRadius);

    // Génération du tracé de l'orbite (128 segments) uniquement si demandé (sinon ça lag sévèrement dans useFrame)
    const orbitPoints: THREE.Vector3[] = [];
    if (!skipOrbits) {
      const pointsCount = 128;
      const period = ORBITAL_PERIODS_DAYS[pId];
      const step = period / pointsCount;

      // On calcule la position à différents jours pour tracer l'ellipse exacte (inclinaison comprise)
      for (let i = 0; i <= pointsCount; i++) {
        const orbitJd = jd + i * step;
        const helioOrbit = planet.position(orbitJd);
        const orbitRenderedRadius = compressRadius(helioOrbit.range);
        const orbitPos3D = sphericalToVector3(
          helioOrbit.lon,
          helioOrbit.lat,
          orbitRenderedRadius,
        );
        orbitPoints.push(orbitPos3D);
      }
    }

    positions.set(pId, {
      id: pId,
      name: pId.charAt(0).toUpperCase() + pId.slice(1),
      helioLon: helio.lon,
      helioLat: helio.lat,
      helioDist: helio.range,
      distanceToEarth: 0, // calculé après
      position3D: pos3D,
      orbitPoints,
    });
  }

  // 3. Post-traitement : Distances réelles par rapport à la Terre (en AU non compensées)
  const earthReal3D = sphericalToVector3(
    positions.get("earth")!.helioLon,
    positions.get("earth")!.helioLat,
    positions.get("earth")!.helioDist,
  );

  positions.get("sun")!.distanceToEarth = positions.get("earth")!.helioDist;

  for (const [key, planetPos] of positions.entries()) {
    if (key === "sun" || key === "earth") continue;

    // Calcul de distance euclidienne sur le vecteur réel
    const planetReal3D = sphericalToVector3(
      planetPos.helioLon,
      planetPos.helioLat,
      planetPos.helioDist,
    );
    planetPos.distanceToEarth = earthReal3D.distanceTo(planetReal3D);
  }

  return positions;
}
