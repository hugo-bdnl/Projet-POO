import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export function Globe() {
  const meshRef = useRef<THREE.Mesh>(null!);

  // Chargement des textures (useTexture de drei gère la mise en cache et le suspense)
  const [colorMap, normalMap, specularMap, emissiveMap] = useTexture([
    "/textures/earth_day.webp",
    "/textures/earth_normal.webp",
    "/textures/earth_specular.webp",
    "/textures/earth_night.webp",
  ]);

  // Rotation lente automatique du globe terrestre sur son axe Y
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Sphère avec plus de segments pour un rendu plus précis, comme indiqué dans la doc */}
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        // specularMap est destiné historiquement au MeshPhongMaterial.
        // Sur un MeshStandardMaterial plus récent, on l'utilise souvent en tant que roughnessMap
        // ou metalnessMap. Ici on l'utilise comme metalness pour faire réfléchir l'océan.
        metalnessMap={specularMap}
        roughness={0.6}
        metalness={0.4}
        emissiveMap={emissiveMap}
        emissive={new THREE.Color(0xffffff)}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}
