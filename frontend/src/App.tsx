import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "./App.css";

/**
 * Composant cube 3D rotatif — test de validation React Three Fiber.
 * Vérifie que Three.js, R3F, et Drei sont correctement configurés.
 */
function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_state, delta) => {
    meshRef.current.rotation.x += delta * 0.5;
    meshRef.current.rotation.y += delta * 0.8;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#6366f1" roughness={0.3} metalness={0.7} />
    </mesh>
  );
}

function App() {
  return (
    <div id="canvas-container">
      <h1 className="overlay-title">🌌 Night Sky Viewer</h1>
      <p className="overlay-subtitle">Three.js + React Three Fiber — Test OK</p>
      <Canvas camera={{ position: [4, 3, 4], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#818cf8" />
        <RotatingCube />
        <OrbitControls enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
}

export default App;
