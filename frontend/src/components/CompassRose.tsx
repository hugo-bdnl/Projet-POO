import { Text } from "@react-three/drei";
import * as THREE from "three";

export const CompassRose = () => {
  const RADIUS = 14;
  // On place les cardinaux à l'horizon (altitude 0 => Y = 0)

  // N (Azimut 0 -> Z negatif)
  const nPos = new THREE.Vector3(0, 0, -RADIUS);
  // E (Azimut 90 -> X positif)
  const ePos = new THREE.Vector3(RADIUS, 0, 0);
  // S (Azimut 180 -> Z positif)
  const sPos = new THREE.Vector3(0, 0, RADIUS);
  // W (Azimut 270 -> X negatif)
  const wPos = new THREE.Vector3(-RADIUS, 0, 0);

  return (
    <group>
      <Text
        position={nPos}
        color="red"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
      >
        N
      </Text>
      <Text
        position={ePos}
        color="gray"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
      >
        E
      </Text>
      <Text
        position={sPos}
        color="gray"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
      >
        S
      </Text>
      <Text
        position={wPos}
        color="gray"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
      >
        O
      </Text>

      {/* Ligne d'horizon visuelle optionnelle */}
      <gridHelper
        args={[RADIUS * 2, 36, 0x222222, 0x111111]}
        position={[0, -0.1, 0]}
      />
    </group>
  );
};
