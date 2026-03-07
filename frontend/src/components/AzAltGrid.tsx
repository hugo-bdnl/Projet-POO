import { useMemo } from "react";
import { Line, Text } from "@react-three/drei";
import * as THREE from "three";
import { altAzToVector3, SKY_RADIUS } from "../utils/skyCoords";

/**
 * Grille azimut/altitude en mode sky.
 * - Cercles de parallèle : alt = 30°, 60°, (90° = zénith point)
 * - Méridiens d'azimut : toutes les 30° de l'horizon au zénith
 * - Labels d'altitude sur chaque cercle (tous les 90° d'azimut)
 * - Labels cardinaux sur l'horizon (N, NE, E, SE, S, SO, O, NO)
 */

const GRID_RADIUS = SKY_RADIUS * 0.99;
const LABEL_RADIUS = SKY_RADIUS * 0.97;
const SEGMENTS = 72;
const LINE_COLOR = "#ffffffff";

const ALTITUDE_CIRCLES = [30, 60];
const AZIMUTH_STEP = 30;

// Points cardinaux : azimut astronomique (N=0°, E=90°, S=180°, O=270°)
const CARDINAL_LABELS: { label: string; az: number }[] = [
  { label: "N", az: 0 },
  { label: "NE", az: 45 },
  { label: "E", az: 90 },
  { label: "SE", az: 135 },
  { label: "S", az: 180 },
  { label: "SO", az: 225 },
  { label: "O", az: 270 },
  { label: "NO", az: 315 },
];

// Azimuts où placer les labels d'altitude (tous les 90°)
const ALT_LABEL_AZIMUTHS = [0, 90, 180, 270];

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
        const alt = (i / (SEGMENTS / 4)) * 90;
        points.push(altAzToVector3(alt, az, GRID_RADIUS));
      }
      azimuthLines.push(points);
    }

    // ── Horizon (alt = 0) ─────────────────────────────────────────────────
    const horizonPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const az = (i / SEGMENTS) * 360;
      horizonPoints.push(altAzToVector3(0.5, az, GRID_RADIUS));
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
          color={LINE_COLOR}
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
          color={LINE_COLOR}
          lineWidth={1}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      ))}

      {/* Labels d'altitude sur les cercles de parallèle */}
      {ALTITUDE_CIRCLES.map((alt) =>
        ALT_LABEL_AZIMUTHS.map((az) => {
          const pos = altAzToVector3(alt, az, LABEL_RADIUS);
          return (
            <Text
              key={`alt-label-${alt}-${az}`}
              position={pos}
              fontSize={0.4}
              color="rgba(255,255,255,0.7)"
              anchorX="center"
              anchorY="middle"
              depthOffset={-1}
            >
              {alt}°
            </Text>
          );
        }),
      )}

      {/* Labels cardinaux sur l'horizon */}
      {CARDINAL_LABELS.map(({ label, az }) => {
        const pos = altAzToVector3(2, az, LABEL_RADIUS);
        const isMainCardinal = ["N", "E", "S", "O"].includes(label);
        return (
          <Text
            key={`cardinal-${label}`}
            position={pos}
            fontSize={isMainCardinal ? 0.7 : 0.5}
            color={
              isMainCardinal
                ? "rgba(255,255,255,0.95)"
                : "rgba(255,255,255,0.65)"
            }
            anchorX="center"
            anchorY="middle"
            depthOffset={-1}
          >
            {label}
          </Text>
        );
      })}
    </group>
  );
};
