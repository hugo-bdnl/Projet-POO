import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useSkyStore } from "../stores/useSkyStore";
import { useConstellationStore } from "../stores/useConstellationStore";

/**
 * Indicateur directionnel 3D : affiche une flèche HTML au bord de l'écran
 * pointant vers le barycentre de la constellation sélectionnée.
 * Disparaît quand la constellation est visible dans le viewport.
 */
export const ConstellationGuide = () => {
  const { cameraTarget, viewMode } = useSkyStore();
  const { selectedConstellation } = useConstellationStore();
  const { camera, size } = useThree();

  const arrowRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!arrowRef.current || !cameraTarget || viewMode !== "sky") return;

    // Projeter le barycentre en coordonnées écran normalisées (NDC)
    const target = new THREE.Vector3(
      cameraTarget[0],
      cameraTarget[1],
      cameraTarget[2],
    );
    const projected = target.clone().project(camera);

    // NDC : x et y dans [-1, 1], z < 1 = devant la caméra
    const isOnScreen =
      projected.z < 1 &&
      Math.abs(projected.x) < 0.8 &&
      Math.abs(projected.y) < 0.8;

    if (isOnScreen) {
      // Constellation visible → cacher l'indicateur
      arrowRef.current.style.opacity = "0";
      return;
    }

    // Afficher l'indicateur
    arrowRef.current.style.opacity = "1";

    // Calculer l'angle vers le barycentre projeté
    const angle = Math.atan2(projected.y, projected.x);

    // Position sur un cercle elliptique au bord de l'écran
    const marginX = size.width * 0.4;
    const marginY = size.height * 0.35;
    const posX = Math.cos(angle) * marginX;
    const posY = Math.sin(angle) * marginY;

    arrowRef.current.style.transform = `translate(${posX}px, ${-posY}px) rotate(${-angle}rad)`;
  });

  // Ne rien afficher si pas de constellation ou pas en mode ciel
  if (!cameraTarget || viewMode !== "sky" || !selectedConstellation) {
    return null;
  }

  const constellationName =
    selectedConstellation.name_fr || selectedConstellation.name;

  return (
    <group ref={groupRef}>
      {/* Html de Drei : overlay HTML ancré au centre de la scène 3D */}
      <Html center style={{ pointerEvents: "none" }}>
        <div
          ref={arrowRef}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            transition: "opacity 0.3s ease",
            opacity: 1,
          }}
        >
          {/* Flèche directionnelle */}
          <div
            style={{
              width: "50px",
              height: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Halo glow */}
              <circle
                cx="22"
                cy="22"
                r="20"
                fill="none"
                stroke="rgba(0, 240, 255, 0.15)"
                strokeWidth="2"
              />
              {/* Flèche pointant à droite (rotation gérée par le transform parent) */}
              <path
                d="M14 22 L30 22 M24 16 L30 22 L24 28"
                stroke="#00f0ff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {/* Nom de la constellation */}
          <div
            style={{
              background: "rgba(10, 10, 30, 0.85)",
              padding: "4px 10px",
              borderRadius: "12px",
              border: "1px solid rgba(0, 240, 255, 0.4)",
              color: "#00f0ff",
              fontFamily: "monospace",
              fontSize: "0.7rem",
              fontWeight: "bold",
              whiteSpace: "nowrap",
              boxShadow: "0 0 12px rgba(0, 240, 255, 0.15)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {constellationName}
          </div>
        </div>
      </Html>
    </group>
  );
};
