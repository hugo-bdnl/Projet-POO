import * as THREE from "three";

export type PlanetId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export interface PlanetPosition {
  id: PlanetId;
  name: string;

  // Coordonnées héliocentriques exactes calculées via VSOP87B
  helioLon: number; // Longitude (rad)
  helioLat: number; // Latitude (rad)
  helioDist: number; // Distance au Soleil (AU)

  // Distance relative à la Terre
  distanceToEarth: number; // L'unité sera des AU

  // Position 3D compressée pour le rendu dans Three.js
  position3D: THREE.Vector3;

  // Tracé mathématique de l'orbite (Points 3D interpolés sur une période complète)
  orbitPoints: THREE.Vector3[];
}

export interface PlanetData {
  id: PlanetId;
  name: string;
  radiusBase: number; // Taille visuelle relative dans l'application
  color: string;
  texturePath: string;
  hasRings?: boolean;
}

export interface PlanetMetadata {
  id: PlanetId;
  type: string;
  mass: string;
  radiusKm: number;
  moons: number;
  tempAvg: string;
  description: string;
  texturePath: string;
  textureGlobePath: string;
  visualSize: number;
}

export const PLANETS_METADATA: Record<PlanetId, PlanetMetadata> = {
  sun: {
    id: "sun",
    type: "Étoile (Naine Jaune)",
    mass: "1.989 × 10^30 kg (333 000 Terres)",
    radiusKm: 696340,
    moons: 0,
    tempAvg: "5 500 °C (surface)",
    description: "Le cœur de notre système solaire. Il contient 99.8% de la masse totale du système.",
    texturePath: "/textures/planets/sun.webp",
    textureGlobePath: "/textures/planets/8k/8k_sun.webp",
    visualSize: 12.0,
  },
  mercury: {
    id: "mercury",
    type: "Planète Tellurique",
    mass: "3.301 × 10^23 kg (0.055 Terres)",
    radiusKm: 2439,
    moons: 0,
    tempAvg: "167 °C (-173 à 427 °C)",
    description: "La planète la plus petite et la plus proche du Soleil. Sans atmosphère pour retenir la chaleur, ses températures extrêmes varient drastiquement entre le jour et la nuit.",
    texturePath: "/textures/planets/mercury.webp",
    textureGlobePath: "/textures/planets/8k/8k_mercury.webp",
    visualSize: 0.8,
  },
  venus: {
    id: "venus",
    type: "Planète Tellurique",
    mass: "4.867 × 10^24 kg (0.815 Terres)",
    radiusKm: 6051,
    moons: 0,
    tempAvg: "464 °C",
    description: "La planète la plus chaude du système solaire à cause de son effet de serre extrême. Sa rotation est rétrograde (elle tourne à l'envers).",
    texturePath: "/textures/planets/venus_surface.webp",
    textureGlobePath: "/textures/planets/8k/8k_venus_surface.webp",
    visualSize: 1.8,
  },
  earth: {
    id: "earth",
    type: "Planète Tellurique",
    mass: "5.972 × 10^24 kg",
    radiusKm: 6371,
    moons: 1,
    tempAvg: "15 °C",
    description: "Notre foyer. La seule planète connue pour abriter la vie, recouverte à 71% d'eau liquide.",
    texturePath: "/textures/earth_day.webp",
    textureGlobePath: "/textures/planets/8k/8k_earth_daymap.webp",
    visualSize: 1.8,
  },
  mars: {
    id: "mars",
    type: "Planète Tellurique",
    mass: "6.39 × 10^23 kg (0.107 Terres)",
    radiusKm: 3389,
    moons: 2,
    tempAvg: "-65 °C",
    description: "La planète rouge. Froide et désertique, elle possède des calottes glaciaires et le plus grand volcan du système solaire (Olympus Mons).",
    texturePath: "/textures/planets/mars.webp",
    textureGlobePath: "/textures/planets/8k/8k_mars.webp",
    visualSize: 1.2,
  },
  jupiter: {
    id: "jupiter",
    type: "Géante Gazeuse",
    mass: "1.898 × 10^27 kg (317 Terres)",
    radiusKm: 69911,
    moons: 95,
    tempAvg: "-110 °C",
    description: "La plus grande planète. Connue pour sa Grande Tache Rouge (une tempête géante) et ses nombreuses lunes, dont Europe, qui cache un océan sous la glace.",
    texturePath: "/textures/planets/jupiter.webp",
    textureGlobePath: "/textures/planets/8k/8k_jupiter.webp",
    visualSize: 5.0,
  },
  saturn: {
    id: "saturn",
    type: "Géante Gazeuse",
    mass: "5.683 × 10^26 kg (95 Terres)",
    radiusKm: 58232,
    moons: 146,
    tempAvg: "-140 °C",
    description: "Célèbre pour son système d'anneaux spectaculaires faits de glace et de roche. C'est la planète la moins dense (elle pourrait flotter sur l'eau).",
    texturePath: "/textures/planets/saturn.webp",
    textureGlobePath: "/textures/planets/8k/8k_saturn.webp",
    visualSize: 5.0,
  },
  uranus: {
    id: "uranus",
    type: "Géante de Glace",
    mass: "8.681 × 10^25 kg (14.5 Terres)",
    radiusKm: 25362,
    moons: 28,
    tempAvg: "-195 °C",
    description: "Une géante de glace très froide. Sa particularité est de rouler sur son orbite avec un axe de rotation incliné à près de 98 degrés.",
    texturePath: "/textures/planets/uranus.webp",
    textureGlobePath: "/textures/planets/uranus.webp", // Normal car tu n'en as pas
    visualSize: 3.5,
  },
  neptune: {
    id: "neptune",
    type: "Géante de Glace",
    mass: "1.024 × 10^26 kg (17.1 Terres)",
    radiusKm: 24622,
    moons: 16,
    tempAvg: "-200 °C",
    description: "La planète la plus éloignée du Soleil. Un monde sombre, froid et parcouru par des vents supersoniques pouvant atteindre 2000 km/h.",
    texturePath: "/textures/planets/neptune.webp",
    textureGlobePath: "/textures/planets/neptune.webp", // Normal car tu n'en as pas
    visualSize: 3.5,
  },
};
