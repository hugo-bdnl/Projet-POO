import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const DRACO_PATH = "/draco/";
/** Taille max souhaitée du modèle dans la scène */
const TARGET_SIZE = 2;

// Scratch objects pré-alloués (pas d'allocation dans useMemo à chaque render)
const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _size = new THREE.Vector3();

interface RoverModel3DProps {
  color: string;
  /** Chemin vers le modèle GLTF/GLB (optionnel — cube placeholder si absent) */
  modelPath?: string;
}

/**
 * Modèle 3D d'un rover avec rotation automatique.
 * Charge un GLTF (avec support Draco) si modelPath est fourni,
 * sinon affiche un cube placeholder.
 */
export function RoverModel3D({ color, modelPath }: RoverModel3DProps) {
  if (modelPath) {
    return <GLTFModel modelPath={modelPath} />;
  }
  return <PlaceholderCube color={color} />;
}

/** Modèle GLTF chargé avec décodeur Draco — auto-centré et auto-scalé */
function GLTFModel({ modelPath }: { modelPath: string }) {
  const groupRef = useRef<THREE.Group>(null!);
  const { scene } = useGLTF(modelPath, DRACO_PATH);

  // Calcul du centrage et du scale — reset position car useGLTF cache la scène
  const { offset, scale } = useMemo(() => {
    scene.position.set(0, 0, 0);
    _box.setFromObject(scene);
    _box.getCenter(_center);
    _box.getSize(_size);

    const maxDim = Math.max(_size.x, _size.y, _size.z);
    const s = maxDim > 0 ? TARGET_SIZE / maxDim : 1;

    return {
      offset: [-_center.x, -_center.y, -_center.z] as [number, number, number],
      scale: s,
    };
  }, [scene]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.3;
  });

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={scene} position={offset} />
    </group>
  );
}

/** Cube rotatif placeholder en attendant les modèles GLTF */
function PlaceholderCube({ color }: { color: string }) {
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
