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
