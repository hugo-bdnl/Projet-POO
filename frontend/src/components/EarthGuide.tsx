import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useSkyStore } from "../stores/useSkyStore";
import { altAzToVector3 } from "../utils/skyCoords";

/**
 * Indicateur directionnel vers la Terre en mode sky.
 * La Terre se situe toujours au nadir (alt = −90°), donc sous l'horizon.
 * Affiche une flèche HTML au bord de l'écran pointant vers le bas,
 * avec un style Tron Legacy (blanc néon, halo lumineux).
 */

// Vecteur nadir pré-calculé (la Terre est toujours à alt = -90°)
const EARTH_DIRECTION = altAzToVector3(-90, 0);

export const EarthGuide = () => {
  const { viewMode } = useSkyStore();
  const { camera, size } = useThree();

  const arrowRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group>(null);
  // Vecteurs pré-alloués — pas de new Vector3 dans useFrame
  const projectedVec = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!arrowRef.current || viewMode !== "sky") return;

    projectedVec.current.copy(EARTH_DIRECTION).project(camera);
    const projected = projectedVec.current;

    // Si la Terre est dans le champ de vision → cacher l'indicateur
    const isOnScreen =
      projected.z < 1 &&
      Math.abs(projected.x) < 0.85 &&
      Math.abs(projected.y) < 0.85;

    if (isOnScreen) {
      arrowRef.current.style.opacity = "0";
      return;
    }

    arrowRef.current.style.opacity = "1";

    // Angle vers le nadir projeté
    const angle = Math.atan2(projected.y, projected.x);

    // Position elliptique en bord d'écran avec une marge légèrement
    // différente de ConstellationGuide pour éviter la superposition
    const marginX = size.width * 0.38;
    const marginY = size.height * 0.33;
    const posX = Math.cos(angle) * marginX;
    const posY = Math.sin(angle) * marginY;

    arrowRef.current.style.transform = `translate(${posX}px, ${-posY}px) rotate(${-angle}rad)`;
  });

  if (viewMode !== "sky") return null;

  return (
    <group ref={groupRef}>
      <Html center style={{ pointerEvents: "none" }}>
        <div
          ref={arrowRef}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5px",
            transition: "opacity 0.3s ease",
            opacity: 1,
          }}
        >
          {/* Icône Terre + flèche — style Tron Legacy blanc néon */}
          <div
            style={{
              width: "52px",
              height: "52px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter
                  id="earth-glow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="2.5"
                    result="blur"
                  />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Halo extérieur doux */}
              <circle
                cx="24"
                cy="24"
                r="21"
                fill="none"
                stroke="rgba(200, 240, 255, 0.12)"
                strokeWidth="2"
              />

              {/* Globe Terre stylisé — cercle principal */}
              <circle
                cx="24"
                cy="24"
                r="11"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.8"
                filter="url(#earth-glow)"
              />
              {/* Équateur */}
              <ellipse
                cx="24"
                cy="24"
                rx="11"
                ry="4.5"
                fill="none"
                stroke="#c8f0ff"
                strokeWidth="1.2"
                filter="url(#earth-glow)"
              />
              {/* Méridien */}
              <ellipse
                cx="24"
                cy="24"
                rx="4.5"
                ry="11"
                fill="none"
                stroke="#c8f0ff"
                strokeWidth="1.2"
                filter="url(#earth-glow)"
              />

              {/* Flèche directionnelle pointant à droite */}
              <path
                d="M36 24 L44 24 M40 20 L44 24 L40 28"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#earth-glow)"
              />
            </svg>
          </div>

          {/* Label "TERRE" */}
          <div
            style={{
              background: "rgba(5, 10, 25, 0.88)",
              padding: "3px 10px",
              borderRadius: "10px",
              border: "1px solid rgba(200, 240, 255, 0.45)",
              color: "#ffffff",
              fontFamily: "monospace",
              fontSize: "0.65rem",
              fontWeight: "bold",
              whiteSpace: "nowrap",
              letterSpacing: "2px",
              textTransform: "uppercase",
              textShadow: "0 0 8px #ffffff, 0 0 18px #a0d8ff",
              boxShadow:
                "0 0 10px rgba(200, 240, 255, 0.15), inset 0 0 6px rgba(255,255,255,0.05)",
            }}
          >
            TERRE
          </div>
        </div>
      </Html>
    </group>
  );
};
