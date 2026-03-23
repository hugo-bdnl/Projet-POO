import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface RoverModel3DProps {
  color: string;
}

/**
 * Placeholder 3D pour le modèle du rover.
 * Affiche un cube rotatif en attendant les modèles GLTF.
 */
export function RoverModel3D({ color }: RoverModel3DProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.5;
    meshRef.current.rotation.x += delta * 0.15;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.2, 0.6, 1.6]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
}
