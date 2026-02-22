import { useMemo } from "react";
import * as THREE from "three";
import { Line, Text } from "@react-three/drei";
import { useConstellationStore } from "../stores/useConstellationStore";
import { useSkyStore } from "../stores/useSkyStore";

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

      const lineGeometrySegments: THREE.Vector3[][] = [];
      const labelPosition = new THREE.Vector3(0, 0, 0);
      let loadedStarsCount = 0;

      // Distance arbitraire sur la voûte céleste (identique à NightSky)
      const RADIUS = 15;

      pairs.forEach(([hip1, hip2]) => {
        const star1 = stars.find((s) => s.hip_id === hip1);
        const star2 = stars.find((s) => s.hip_id === hip2);

        if (star1 && star2) {
          // Conversion Alt/Az -> Vecteur 3D
          const getPos = (star: { altitude: number; azimuth: number }) => {
            const altRad = THREE.MathUtils.degToRad(star.altitude);
            const azRad = THREE.MathUtils.degToRad(-star.azimuth + 90);
            return new THREE.Vector3(
              RADIUS * Math.cos(altRad) * Math.cos(azRad),
              RADIUS * Math.sin(altRad), // Hauteur
              RADIUS * Math.cos(altRad) * -Math.sin(azRad),
            );
          };

          const p1 = getPos(star1);
          const p2 = getPos(star2);

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
        fontSize={0.8}
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
