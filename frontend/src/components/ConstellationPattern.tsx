import { useMemo } from "react";
import * as THREE from "three";
import { Line, Text } from "@react-three/drei";
import { useConstellationStore } from "../stores/useConstellationStore";
import { useSkyStore } from "../stores/useSkyStore";
import { altAzToVector3, SKY_RADIUS } from "../utils/skyCoords";

export const ConstellationPattern = () => {
  const { selectedConstellation } = useConstellationStore();
  const { stars } = useSkyStore();

  const linesAndLabelData = useMemo(() => {
    if (
      !selectedConstellation ||
      !selectedConstellation.lines_data ||
      stars.length === 0
    ) {
      return null;
    }

    try {
      // lines_data est un JSON stringifié ex: [[hip1, hip2], [hip2, hip3]]
      const pairs: [number, number][] = JSON.parse(
        selectedConstellation.lines_data,
      );

      // Index par hip_id pour des lookups O(1) au lieu de O(n)
      const starsByHip = new Map(
        stars.filter((s) => s.hip_id !== null).map((s) => [s.hip_id!, s]),
      );

      const lineGeometrySegments: THREE.Vector3[][] = [];
      const labelPosition = new THREE.Vector3(0, 0, 0);
      let loadedStarsCount = 0;

      pairs.forEach(([hip1, hip2]) => {
        const star1 = starsByHip.get(hip1);
        const star2 = starsByHip.get(hip2);

        if (star1 && star2) {
          const p1 = altAzToVector3(star1.altitude, star1.azimuth, SKY_RADIUS);
          const p2 = altAzToVector3(star2.altitude, star2.azimuth, SKY_RADIUS);

          lineGeometrySegments.push([p1, p2]);

          // Accumulation pour le calcul du barycentre visuel (pour le label de la constellation)
          labelPosition.add(p1).add(p2);
          loadedStarsCount += 2;
        }
      });

      if (loadedStarsCount > 0) {
        labelPosition.divideScalar(loadedStarsCount);
        // On pousse légèrement le texte vers nous pour éviter le z-fighting
        labelPosition.multiplyScalar(0.95);
      } else {
        return null;
      }

      return {
        segments: lineGeometrySegments,
        labelPos: labelPosition,
        name: selectedConstellation.name_fr || selectedConstellation.name,
      };
    } catch (e) {
      console.error("Erreur de parsing des lignes de constellation", e);
      return null;
    }
  }, [selectedConstellation, stars]);

  if (!linesAndLabelData) return null;

  return (
    <group>
      {/* 1. Tracé géométrique néon */}
      {linesAndLabelData.segments.map((segment, idx) => (
        <Line
          key={idx}
          points={segment}
          color="#00ffff"
          lineWidth={2}
          transparent
          opacity={0.8}
        />
      ))}

      {/* 2. Nom affiché au barycentre du dessin */}
      <Text
        position={linesAndLabelData.labelPos}
        fontSize={0.5}
        color="#aaddff"
        anchorX="center"
        anchorY="middle"
        // Toujours face à la caméra
        onUpdate={(self) => self.lookAt(0, 0, 0)}
      >
        {linesAndLabelData.name}
      </Text>
    </group>
  );
};
