import { Suspense, lazy, useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
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
import { PLANETS_METADATA } from "./types/planets";
import { SolarSystem } from "./components/SolarSystem";
import { PlanetInfoCard } from "./components/PlanetInfoCard";
import { Loader3D } from "./components/Loader3D";

// Lazy-loaded : le bundle de l'overlay rover n'est chargé qu'au premier clic
const RoverOverlay = lazy(() => import("./components/RoverOverlay"));
import { useSkyStore } from "./stores/useSkyStore";
import { useConstellationStore } from "./stores/useConstellationStore";
import { useObservationStore } from "./stores/useObservationStore";
import { useSatelliteStore } from "./stores/useSatelliteStore";
import * as THREE from "three";
import "./App.css";

/** Détecte si le navigateur utilise un renderer logiciel (pas d'accélération GPU). */
function detectSoftwareRenderer(): { isSoftware: boolean; renderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return { isSoftware: true, renderer: "WebGL indisponible" };

    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (!dbg) return { isSoftware: false, renderer: "inconnu" };

    const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string;
    const isSoftware = /swiftshader|llvmpipe|software|microsoft basic render/i.test(renderer);
    return { isSoftware, renderer };
  } catch {
    return { isSoftware: false, renderer: "inconnu" };
  }
}

/**
 * Composant interne (dans le Canvas) qui gère les transitions de caméra
 * entre les modes globe et ciel. Le lerp s'arrête après 1.5s
 * pour laisser le contrôle total à l'utilisateur.
 */

// Vecteurs cibles pré-alloués (évite 120 allocations/s dans useFrame)
const SKY_CAMERA_POS = new THREE.Vector3(0, -0.15, 0.1);
const SYSTEM_CAMERA_POS = new THREE.Vector3(0, 45, 60); // Vue de dessus plus reculée
const ORIGIN = new THREE.Vector3(0, 0, 0);

function CameraController({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { viewMode, selectedPlanet } = useSkyStore();
  const transitionTime = useRef(0);
  const prevMode = useRef(viewMode);
  const prevPlanet = useRef(selectedPlanet);

  useFrame((state, delta) => {
    // Si la transition vient d'être déclenchée
    if (prevMode.current !== viewMode) {
      if (viewMode === "globe" && prevMode.current === "system") {
        // Handoff simplifié: on initialise la vue face à la planète
        const planetRatio =
          PLANETS_METADATA[selectedPlanet || "earth"]?.visualSize || 1;
        const dist = planetRatio * 3.5;

        state.camera.position.set(0, 0, dist);
        controlsRef.current?.target.set(0, 0, 0);
      }
      transitionTime.current = 0;
      prevMode.current = viewMode;
    }

    if (prevPlanet.current !== selectedPlanet) {
      transitionTime.current = 0;
      prevPlanet.current = selectedPlanet;
    }

    transitionTime.current += delta;

    // Transition terminée → l'utilisateur a le contrôle exclusif via OrbitControls
    if (transitionTime.current > 1.5) return;
    if (!controlsRef.current) return;

    const lerpFactor = 1.0 - Math.exp(-3.0 * delta);

    if (viewMode === "sky") {
      state.camera.position.lerp(SKY_CAMERA_POS, lerpFactor);
      controlsRef.current.target.lerp(ORIGIN, lerpFactor);
    } else if (viewMode === "globe") {
      // Lerp vers l'orbite lointaine si on recule depuis un zoom trop grand
      const planetRatio =
        PLANETS_METADATA[selectedPlanet || "earth"]?.visualSize || 1;
      const dist = planetRatio * 3.5;

      const targetCamPos = state.camera.position
        .clone()
        .normalize()
        .multiplyScalar(dist);
      state.camera.position.lerp(targetCamPos, lerpFactor);
      controlsRef.current.target.lerp(ORIGIN, lerpFactor);
    } else {
      // Mode System: Vue surplombante globale
      state.camera.position.lerp(SYSTEM_CAMERA_POS, lerpFactor);
      controlsRef.current.target.lerp(ORIGIN, lerpFactor);
    }
  });

  return null;
}

function StaticStarBackground() {
  const texture = useTexture("/textures/8k_stars.webp");
  // Assurer des couleurs correctes
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh renderOrder={-5}>
      <sphereGeometry args={[5000, 32, 32]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function App() {
  const {
    viewMode,
    selectedPlanet,
    showAzAltGrid,
    toggleAzAltGrid,
    error: skyError,
    isSystemRotating,
    toggleSystemRotation,
    systemRotationSpeed,
    setSystemRotationSpeed,
    showOrbits,
    toggleOrbits,
  } = useSkyStore();
  const { error: constellationError } = useConstellationStore();
  const { error: obsError } = useObservationStore();
  const { error: satelliteError } = useSatelliteStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gpuWarning, setGpuWarning] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Détection accélération GPU au montage
  useEffect(() => {
    const { isSoftware, renderer } = detectSoftwareRenderer();
    if (isSoftware) setGpuWarning(renderer);
  }, []);

  // Gestion des erreurs via Toast
  useEffect(() => {
    const error = skyError || constellationError || obsError || satelliteError;
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
        const planetSize =
          PLANETS_METADATA[selectedPlanet || "earth"]?.visualSize || 1;
        controlsRef.current.minDistance = planetSize * 1.5;
        controlsRef.current.maxDistance = planetSize * 10.0;
      } else if (viewMode === "sky") {
        controlsRef.current.minDistance = 0.05;
        controlsRef.current.maxDistance = Infinity;
      } else {
        // Mode system
        controlsRef.current.minDistance = 6;
        controlsRef.current.maxDistance = 600;
      }
      controlsRef.current.update();
    }
  }, [viewMode]);

  return (
    <div id="canvas-container">
      {/* Avertissement accélération GPU désactivée */}
      {gpuWarning && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            background: "rgba(10, 15, 25, 0.95)",
            border: "1px solid rgba(255, 160, 0, 0.6)",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "420px",
            width: "90%",
            boxShadow: "0 0 40px rgba(255, 160, 0, 0.2)",
            fontFamily: "system-ui, sans-serif",
            color: "white",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>⚠️</div>
            <h2 style={{ margin: "0 0 10px", color: "#ffa000", fontSize: "1.2rem" }}>
              Accélération GPU désactivée
            </h2>
            <p style={{ color: "#ccc", fontSize: "0.9rem", lineHeight: "1.6", margin: "0 0 8px" }}>
              Renderer détecté : <code style={{ color: "#ffa000", fontSize: "0.8rem" }}>{gpuWarning}</code>
            </p>
            <p style={{ color: "#999", fontSize: "0.85rem", lineHeight: "1.6", margin: "0 0 24px" }}>
              Cette application utilise WebGL intensivement. Sans accélération matérielle,
              les performances seront très dégradées.
              <br /><br />
              Active l'accélération matérielle dans les paramètres de ton navigateur
              (Paramètres → Système → Accélération matérielle).
            </p>
            <button
              onClick={() => setGpuWarning(null)}
              style={{
                background: "rgba(255, 160, 0, 0.15)",
                border: "1px solid rgba(255, 160, 0, 0.5)",
                borderRadius: "25px",
                color: "#ffa000",
                padding: "10px 28px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "bold",
              }}
            >
              Continuer quand même
            </button>
          </div>
        </div>
      )}

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
              useSkyStore.getState().transitionToMode("globe");
              useSkyStore.getState().setSelectedStar(null);
              useSkyStore.getState().setCameraTarget(null);
            }}
            className="hud-button"
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
            className={`hud-button ${showAzAltGrid ? "hud-button--active" : ""}`}
            style={{ fontSize: "0.85rem" }}
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
      <PlanetInfoCard />
      {/* Overlay Mission Control rover — lazy-loaded */}
      <Suspense fallback={null}>
        <RoverOverlay />
      </Suspense>
      {/* Contrôle Temporel - Ciel Nocturne */}
      <TimeSlider />

      {/* Bouton Play/Pause pour le mode Système Solaire */}
      {viewMode === "system" && (
        <div
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "2rem",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "10px",
          }}
        >
          {/* Conteneur principal (Play/Pause + Vitesse) */}
          <div
            style={{
              background: "rgba(10, 10, 10, 0.85)",
              border: "1px solid #00f0ff",
              borderRadius: "15px",
              padding: "10px 15px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 0 20px rgba(0,255,255,0.15)",
              backdropFilter: "blur(5px)",
            }}
          >
            {/* Ligne 1 : Bouton Play/Pause */}
            <button
              onClick={toggleSystemRotation}
              style={{
                fontSize: "1rem",
                padding: "8px 20px",
                borderRadius: "25px",
                background: isSystemRotating ? "rgba(0, 240, 255, 0.15)" : "transparent",
                border: "1px solid",
                borderColor: isSystemRotating ? "rgba(0, 240, 255, 0.5)" : "#333",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: "bold",
                transition: "all 0.2s ease",
                width: "100%",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(0, 240, 255, 0.3)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = isSystemRotating
                  ? "rgba(0, 240, 255, 0.15)"
                  : "transparent";
              }}
            >
              {isSystemRotating ? "⏸ PAUSE" : "▶ PLAY"}
            </button>

            {/* Ligne 2 : Contrôle de Vitesse */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#00f0ff",
                  fontSize: "0.85rem",
                  fontWeight: "bold",
                  fontFamily: "monospace",
                }}
              >
                <span>VITESSE</span>
                <span>{systemRotationSpeed} j/s</span>
              </div>
              <input
                type="range"
                min="1"
                max="365"
                step="1"
                value={systemRotationSpeed}
                onChange={(e) => setSystemRotationSpeed(Number(e.target.value))}
                disabled={!isSystemRotating}
                style={{
                  width: "200px",
                  cursor: isSystemRotating ? "pointer" : "not-allowed",
                  accentColor: "#00f0ff",
                  opacity: isSystemRotating ? 1 : 0.5,
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#666",
                  fontSize: "0.75rem",
                  marginTop: "2px",
                }}
              >
                <span>1 j/s</span>
                <span>365 j/s</span>
              </div>
            </div>

            {/* Ligne 3 : Toggle Orbites */}
            <button
              onClick={toggleOrbits}
              style={{
                fontSize: "1rem",
                padding: "8px 20px",
                borderRadius: "25px",
                background: showOrbits ? "rgba(0, 240, 255, 0.15)" : "transparent",
                border: "1px solid",
                borderColor: showOrbits ? "rgba(0, 240, 255, 0.5)" : "#333",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: "bold",
                transition: "all 0.2s ease",
                width: "100%",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(0, 240, 255, 0.3)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = showOrbits
                  ? "rgba(0, 240, 255, 0.15)"
                  : "transparent";
              }}
            >
              {showOrbits ? "ORBITES ON" : "ORBITES OFF"}
            </button>
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 0, 3], fov: 50, far: 10000 }}
        dpr={[1, 1.5]}
        gl={{ localClippingEnabled: true }}
        raycaster={{
          params: { Points: { threshold: 0.3 } } as THREE.RaycasterParameters,
        }}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.2} />

        {/* Ciel étoilé permanent pour éviter les décalages de fond EN MODE SKY */}
        {viewMode === "sky" && (
          <Stars
            radius={500}
            depth={500}
            count={7000}
            factor={7}
            saturation={0}
            fade
            speed={1}
          />
        )}

        <Loader3D />

        <Suspense fallback={null}>
          {viewMode !== "sky" && <StaticStarBackground />}

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
            viewMode === "globe"
              ? (PLANETS_METADATA[selectedPlanet || "earth"]?.visualSize || 1) *
              1.5
              : viewMode === "sky"
                ? 0.05
                : 6
          }
          maxDistance={
            viewMode === "globe"
              ? (PLANETS_METADATA[selectedPlanet || "earth"]?.visualSize || 1) *
              10.0
              : viewMode === "sky"
                ? Infinity
                : 500
          }
        />
        <CameraController controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}

export default App;
