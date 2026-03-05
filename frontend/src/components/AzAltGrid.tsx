import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { altAzToVector3, SKY_RADIUS } from "../utils/skyCoords";

/**
 * Grille azimut/altitude en mode sky.
 * - Cercles de parallèle : alt = 30°, 60°, (90° = zénith point)
 * - Méridiens d'azimut : toutes les 30° de l'horizon au zénith
 * Les lignes sont tracées légèrement en-deçà du rayon ciel pour éviter le z-fighting.
 */

const GRID_RADIUS = SKY_RADIUS * 0.99;
const SEGMENTS = 72; // Fluidité des arcs
const ALT_COLOR = "#ffffffff"; // Couleur des parallèles
const AZ_COLOR = "#ffffffff"; // Couleur des méridiens

// Altitudes des cercles de parallèle (en degrés)
const ALTITUDE_CIRCLES = [30, 60];
// Pas angulaire des méridiens (en degrés)
const AZIMUTH_STEP = 30;

export const AzAltGrid = () => {
  const { altitudeLines, azimuthLines } = useMemo(() => {
    // ── Cercles d'altitude (parallèles) ──────────────────────────────────
    const altitudeLines: THREE.Vector3[][] = [];

    for (const alt of ALTITUDE_CIRCLES) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const az = (i / SEGMENTS) * 360;
        points.push(altAzToVector3(alt, az, GRID_RADIUS));
      }
      altitudeLines.push(points);
    }

    // ── Méridiens d'azimut ────────────────────────────────────────────────
    const azimuthLines: THREE.Vector3[][] = [];

    for (let az = 0; az < 360; az += AZIMUTH_STEP) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= SEGMENTS / 4; i++) {
        // De l'horizon (alt=0) au zénith (alt=90)
        const alt = (i / (SEGMENTS / 4)) * 90;
        points.push(altAzToVector3(alt, az, GRID_RADIUS));
      }
      azimuthLines.push(points);
    }

    // ── Horizon (alt = 0) ─────────────────────────────────────────────────
    const horizonPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const az = (i / SEGMENTS) * 360;
      horizonPoints.push(altAzToVector3(0.5, az, GRID_RADIUS)); // légère hauteur pour visibilité
    }
    altitudeLines.push(horizonPoints);

    return { altitudeLines, azimuthLines };
  }, []);

  return (
    <group>
      {/* Cercles de parallèle */}
      {altitudeLines.map((pts, i) => (
        <Line
          key={`alt-${i}`}
          points={pts}
          color={ALT_COLOR}
          lineWidth={1}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      ))}

      {/* Méridiens d'azimut */}
      {azimuthLines.map((pts, i) => (
        <Line
          key={`az-${i}`}
          points={pts}
          color={AZ_COLOR}
          lineWidth={1}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      ))}
    </group>
  );
};
