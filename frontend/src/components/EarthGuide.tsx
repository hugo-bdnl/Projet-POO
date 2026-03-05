import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useSkyStore } from "../stores/useSkyStore";

/**
 * Indicateur directionnel vers la Terre en mode sky.
 * Affiche une flèche HTML en bas de l'écran pointant vers la Terre
 * lorsque celle-ci est sortie du champ de vision (quand on regarde le zénith).
 */

export const EarthGuide = () => {
  const { viewMode } = useSkyStore();
  const { camera, size } = useThree();

  const arrowRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group>(null);
  // Vecteurs pré-alloués — pas de new Vector3 dans useFrame
  const cameraDirVec = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!arrowRef.current || viewMode !== "sky") return;

    camera.getWorldDirection(cameraDirVec.current);

    // On calcule l'altitude (pitch) de la caméra. camera.up est (0, 1, 0)
    // donc cameraDir.y contient le sinus du pitch.
    const pitch = Math.asin(cameraDirVec.current.y) * THREE.MathUtils.RAD2DEG;
    const fov = (camera as THREE.PerspectiveCamera).fov || 50;

    // La Terre (horizon) est visible si le bas de l'écran est proche ou en dessous de l'horizon.
    // On ajoute une marge pour s'assurer qu'au moindre flou sur l'horizon, on cache l'indicateur.
    const isEarthVisible = pitch - fov / 2 < 2;

    if (isEarthVisible) {
      arrowRef.current.style.opacity = "0";
      return;
    }

    arrowRef.current.style.opacity = "1";

    // Si on ne voit plus la Terre, c'est qu'on regarde vers le zénith.
    // L'indicateur pointe toujours vers le bas (pitch down) pour la retrouver.
    const angle = -Math.PI / 2;

    // Position fixe en bas de l'écran (légèrement remontée pour éviter la chronologie)
    const marginY = size.height * 0.32;
    const posX = 0;
    const posY = Math.sin(angle) * marginY; // équivalent à -marginY

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
