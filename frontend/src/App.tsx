import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Globe } from "./components/Globe";
import "./App.css";

function App() {
  return (
    <div id="canvas-container">
      <h1 className="overlay-title">🌌 Night Sky Viewer</h1>
      <p className="overlay-subtitle">
        Globe 3D interactif - Textures PBR (8K/2K)
      </p>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.2} />
        {/* Lumière directionnelle pour simuler le Soleil */}
        <directionalLight position={[5, 3, 5]} intensity={2} />

        <Suspense fallback={null}>
          <Globe />
        </Suspense>

        {/* Contrôles de caméra avec damping (fluidité de mouvement) */}
        <OrbitControls enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
}

export default App;
