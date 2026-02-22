import { Suspense, useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Globe } from "./components/Globe";
import { SidePanel } from "./components/SidePanel";
import { NightSky } from "./components/NightSky";
import { Effects } from "./components/Effects";
import { StarTooltip } from "./components/StarTooltip";
import { TimeSlider } from "./components/TimeSlider";
import { useSkyStore } from "./stores/useSkyStore";
import { useConstellationStore } from "./stores/useConstellationStore";
import { useObservationStore } from "./stores/useObservationStore";
import "./App.css";

function App() {
  const { viewMode, stars, error: skyError } = useSkyStore();
  const { error: constellationError } = useConstellationStore();
  const { error: obsError } = useObservationStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Gestion des erreurs via Toast
  useEffect(() => {
    const error = skyError || constellationError || obsError;
    if (error) {
      setTimeout(() => setToastMessage(error), 0);
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [skyError, constellationError, obsError]);

  // Réglage du zoom (OrbitControls) pour contrer le bug de transition
  useEffect(() => {
    if (controlsRef.current) {
      if (viewMode === "globe") {
        // En mode Globe, on encadre le zoom
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.minDistance = 1.2;
        controlsRef.current.maxDistance = 10;
      } else {
        // En mode Ciel, c'est une vue à la 1re personne, la distance est quasi 0
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.minDistance = 0.05;
        controlsRef.current.maxDistance = Infinity;
      }
    }
  }, [viewMode]);

  return (
    <div id="canvas-container">
      <h1 className="overlay-title">🌌 Night Sky Viewer</h1>
      <p className="overlay-subtitle">
        {viewMode === "globe"
          ? "Globe 3D interactif - Textures PBR (8K/2K)"
          : "Ciel Nocturne Vectorisé Physique"}
      </p>

      {/* Bonus : Compteur d'étoiles en temps réel */}
      {viewMode === "sky" && stars.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "2rem",
            background: "rgba(10, 10, 20, 0.8)",
            padding: "8px 16px",
            borderRadius: "20px",
            border: "1px solid rgba(0, 240, 255, 0.3)",
            color: "#00f0ff",
            fontFamily: "monospace",
            fontSize: "0.9rem",
            fontWeight: "bold",
            zIndex: 10,
            boxShadow: "0 0 15px rgba(0, 240, 255, 0.1)",
          }}
        >
          ✨ {stars.length} objets simulés
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && <div className="toast-container">⚠️ {toastMessage}</div>}

      {/* Panneau latéral HTML UI - Tâches 2 & 6 */}
      <SidePanel />
      {/* Contrôle Temporel - Ciel Nocturne */}
      <TimeSlider />

      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.2} />
        {/* Lumière directionnelle pour simuler le Soleil sur la Terre */}
        {viewMode === "globe" && (
          <directionalLight position={[5, 3, 5]} intensity={2} />
        )}

        <Suspense fallback={null}>
          {viewMode === "globe" ? <Globe /> : <NightSky />}
          <StarTooltip />
          {viewMode === "sky" && <Effects />}
        </Suspense>

        {/* Contrôles de caméra avec damping (fluidité de mouvement) */}
        <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
}

export default App;
