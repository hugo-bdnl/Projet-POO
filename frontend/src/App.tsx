import { Suspense, useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Globe } from "./components/Globe";
import { SidePanel } from "./components/SidePanel";
import { NightSky } from "./components/NightSky";
import { Effects } from "./components/Effects";
import { ConstellationSidebar } from "./components/ConstellationSidebar";
import { StarTooltip } from "./components/StarTooltip";
import { TimeSlider } from "./components/TimeSlider";
import { ConstellationGuide } from "./components/ConstellationGuide";
import { EarthGuide } from "./components/EarthGuide";
import { SolarSystem } from "./components/SolarSystem";
import { Loader3D } from "./components/Loader3D";
import { useSkyStore } from "./stores/useSkyStore";
import { useConstellationStore } from "./stores/useConstellationStore";
import { useObservationStore } from "./stores/useObservationStore";
import * as THREE from "three";
import "./App.css";

/**
 * Composant interne (dans le Canvas) qui gère les transitions de caméra
 * entre les modes globe et ciel. Le lerp s'arrête après 1.5s
 * pour laisser le contrôle total à l'utilisateur.
 */

// Vecteurs cibles pré-alloués (évite 120 allocations/s dans useFrame)
const SKY_CAMERA_POS = new THREE.Vector3(0, -0.15, 0.1);
const GLOBE_CAMERA_POS = new THREE.Vector3(0, 0, 2.5);
const SYSTEM_CAMERA_POS = new THREE.Vector3(0, 45, 60); // Vue de dessus plus reculée
const ORIGIN = new THREE.Vector3(0, 0, 0);

function CameraController({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { viewMode } = useSkyStore();
  const transitionTime = useRef(0);
  const prevMode = useRef(viewMode);

  useFrame((state, delta) => {
    // Reset le timer quand le mode change
    if (prevMode.current !== viewMode) {
      transitionTime.current = 0;
      prevMode.current = viewMode;
    }

    transitionTime.current += delta;

    // Transition terminée → l'utilisateur a le contrôle
    if (transitionTime.current > 1.5) return;
    if (!controlsRef.current) return;

    const lerpFactor = 1.0 - Math.exp(-3.0 * delta);

    if (viewMode === "sky") {
      // Position caméra à l'origine pour vue immersive (horizon)
      state.camera.position.lerp(SKY_CAMERA_POS, lerpFactor);
      controlsRef.current.target.lerp(ORIGIN, lerpFactor);
    } else if (viewMode === "globe") {
      // Mode Globe : orbite lointaine
      state.camera.position.lerp(GLOBE_CAMERA_POS, lerpFactor);
      controlsRef.current.target.lerp(ORIGIN, lerpFactor);
    } else {
      // Mode System: Vue surplombante globale
      state.camera.position.lerp(SYSTEM_CAMERA_POS, lerpFactor);
      controlsRef.current.target.lerp(ORIGIN, lerpFactor);
    }
  });

  return null;
}

function App() {
  const {
    viewMode,
    showAzAltGrid,
    toggleAzAltGrid,
    error: skyError,
  } = useSkyStore();
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

  // Réglage du zoom (OrbitControls) selon le mode de vue
  useEffect(() => {
    if (controlsRef.current) {
      if (viewMode === "globe") {
        controlsRef.current.minDistance = 2.5;
        controlsRef.current.maxDistance = 6;
      } else if (viewMode === "sky") {
        controlsRef.current.minDistance = 0.05;
        controlsRef.current.maxDistance = Infinity;
      } else {
        // Mode system
        controlsRef.current.minDistance = 6;
        controlsRef.current.maxDistance = 500;
      }
      controlsRef.current.update();
    }
  }, [viewMode]);

  return (
    <div id="canvas-container">
      {/* HUD top-right en mode sky : Retour Globe + toggle grille */}
      {viewMode === "sky" && (
        <div
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "8px",
            zIndex: 100,
          }}
        >
          {/* Bouton Retour au Globe */}
          <button
            onClick={() => {
              useSkyStore.getState().setViewMode("globe");
              useSkyStore.getState().setSelectedStar(null);
              useSkyStore.getState().setCameraTarget(null);
            }}
            style={{
              background: "rgba(10, 10, 20, 0.8)",
              padding: "8px 16px",
              borderRadius: "20px",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              color: "#00f0ff",
              fontFamily: "monospace",
              fontSize: "0.9rem",
              fontWeight: "bold",
              boxShadow: "0 0 15px rgba(0, 240, 255, 0.1)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            ← Globe
          </button>

          {/* Bouton toggle Grille Az/Alt */}
          <button
            onClick={toggleAzAltGrid}
            title={
              showAzAltGrid
                ? "Masquer la grille Az/Alt"
                : "Afficher la grille Az/Alt"
            }
            style={{
              background: showAzAltGrid
                ? "rgba(0, 240, 255, 0.15)"
                : "rgba(10, 10, 20, 0.8)",
              padding: "8px 16px",
              borderRadius: "20px",
              border: `1px solid rgba(0, 240, 255, ${showAzAltGrid ? "0.7" : "0.3"})`,
              color: "#00f0ff",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              fontWeight: "bold",
              boxShadow: showAzAltGrid
                ? "0 0 18px rgba(0, 240, 255, 0.25)"
                : "0 0 15px rgba(0, 240, 255, 0.1)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {showAzAltGrid ? "⊞ GRILLE ON" : "⊞ GRILLE"}
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && <div className="toast-container">⚠️ {toastMessage}</div>}

      {/* Panneau latéral HTML UI - Tâches 2 & 6 */}
      <SidePanel />
      {/* Barre unifiée pour chercher et afficher les constellations en mode globe */}
      <ConstellationSidebar />
      {/* Contrôle Temporel - Ciel Nocturne */}
      <TimeSlider />

      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ localClippingEnabled: true }}
        raycaster={{
          params: { Points: { threshold: 0.3 } } as THREE.RaycasterParameters,
        }}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.2} />

        <Suspense fallback={<Loader3D />}>
          {viewMode === "system" && <SolarSystem />}
          {viewMode === "globe" && <Globe />}
          {viewMode === "sky" && <NightSky />}

          <StarTooltip />
          {viewMode === "sky" && <Effects />}
          {viewMode === "sky" && <ConstellationGuide />}
          {viewMode === "sky" && <EarthGuide />}
        </Suspense>

        {/* Contrôles de caméra avec damping (fluidité de mouvement) */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={
            viewMode === "globe" ? 2.5 : viewMode === "sky" ? 0.05 : 6
          }
          maxDistance={
            viewMode === "globe" ? 6 : viewMode === "sky" ? Infinity : 500
          }
        />
        <CameraController controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}

export default App;
