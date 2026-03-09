/**
 * Utilitaire partagé pour la conversion Alt/Az → Coordonnées 3D
 * sur la voûte céleste.
 *
 * Utilisé par : NightSky, ConstellationPattern, SidePanel
 */

import * as THREE from "three";

/** Rayon de la sphère céleste virtuelle (unités Three.js) */
export const SKY_RADIUS = 15;

/**
 * Convertit des coordonnées horizontales (altitude/azimut) en position 3D
 * sur la voûte céleste.
 *
 * Convention :
 * - X : Est-Ouest (Est positif)
 * - Y : Hauteur (altitude)
 * - Z : Nord-Sud (Nord négatif)
 *
 * @param altitude - Altitude en degrés au-dessus de l'horizon
 * @param azimuth  - Azimut en degrés depuis le Nord, sens horaire
 * @param radius   - Rayon de la sphère (défaut: SKY_RADIUS)
 * @returns Position THREE.Vector3 sur la sphère céleste
 */
export function altAzToVector3(
  altitude: number,
  azimuth: number,
  radius: number = SKY_RADIUS,
): THREE.Vector3 {
  const altRad = THREE.MathUtils.degToRad(altitude);
  const azRad = THREE.MathUtils.degToRad(-azimuth + 90);

  return new THREE.Vector3(
    radius * Math.cos(altRad) * Math.cos(azRad),
    radius * Math.sin(altRad),
    radius * Math.cos(altRad) * -Math.sin(azRad),
  );
}

/**
 * Calcule les composantes (x, y, z) brutes des coordonnées Alt/Az.
 * Variante sans allocation d'objet Vector3, pour les boucles intensives.
 *
 * @param altitude - Altitude en degrés
 * @param azimuth  - Azimut en degrés
 * @param radius   - Rayon de la sphère
 * @returns Tuple [x, y, z]
 */
export function altAzToXYZ(
  altitude: number,
  azimuth: number,
  radius: number = SKY_RADIUS,
): [number, number, number] {
  const altRad = (altitude * Math.PI) / 180;
  const azRad = ((-azimuth + 90) * Math.PI) / 180;

  return [
    radius * Math.cos(altRad) * Math.cos(azRad),
    radius * Math.sin(altRad),
    radius * Math.cos(altRad) * -Math.sin(azRad),
  ];
}

export function computeGMST(date: Date): number {
  const jd =
    date.getTime() / 86400000.0 +
    2440587.5;
  const t = (jd - 2451545.0) / 36525.0;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000.0;
  gmst = (gmst % 360.0 + 360.0) % 360.0;
  return gmst;
}
