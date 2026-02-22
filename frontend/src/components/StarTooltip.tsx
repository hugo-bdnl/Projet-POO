import { Html } from "@react-three/drei";
import { useSkyStore } from "../stores/useSkyStore";
import * as THREE from "three";

export const StarTooltip = () => {
  const { hoveredStar, viewMode } = useSkyStore();

  if (viewMode !== "sky" || !hoveredStar) return null;

  const RADIUS = 15;
  const altRad = THREE.MathUtils.degToRad(hoveredStar.altitude);
  const azRad = THREE.MathUtils.degToRad(-hoveredStar.azimuth + 90);

  const x = RADIUS * Math.cos(altRad) * Math.cos(azRad);
  const y = RADIUS * Math.sin(altRad);
  const z = RADIUS * Math.cos(altRad) * -Math.sin(azRad);

  return (
    <Html position={[x, y, z]} center style={{ pointerEvents: "none" }}>
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          whiteSpace: "nowrap",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {hoveredStar.proper_name ||
          `HIP ${hoveredStar.hip_id}` ||
          "Étoile sans nom"}
      </div>
    </Html>
  );
};
