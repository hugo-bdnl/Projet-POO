import * as THREE from "three";
import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useSkyStore } from "../stores/useSkyStore";
import { compressRadius } from "../utils/planetaryEphemeris";

const KUIPER_OBJECT_COUNT = 4000;

function KuiperHud({ radius }: { radius: number }) {
  const markerRef = useRef<THREE.Group>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPolylineElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const scratchVec = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }) => {
    if (!markerRef.current) return;

    // Place the marker on the far left edge of the Kuiper Belt (relative to camera)
    const angle = Math.atan2(camera.position.z, camera.position.x) + Math.PI / 2;
    markerRef.current.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );

    // Compute screen coordinates strictly for HTML offsets without re-rendering React
    markerRef.current.getWorldPosition(scratchVec);
    scratchVec.project(camera);

    const x = (scratchVec.x * 0.5 + 0.5) * size.width;
    const y = (-(scratchVec.y) * 0.5 + 0.5) * size.height;

    // Anchor coordinates of the drawn line relative to the screen (top-left)
    const PANEL_FIXED_X = 50; 
    const PANEL_FIXED_Y = 280; 

    // Conversion from screen space to local Html space
    const targetX = PANEL_FIXED_X - x;
    const targetY = PANEL_FIXED_Y - y;

    if (panelRef.current) {
      // Dynamic inverse translation
      const panelTopLeftX = 20 - x;
      const panelTopLeftY = 70 - y;
      panelRef.current.style.transform = `translate(${panelTopLeftX}px, ${panelTopLeftY}px)`;
    }

    if (lineRef.current) {
      // Path: anchor point -> straight down to marker's height -> horizontal to marker
      lineRef.current.setAttribute("points", `${targetX},${targetY} ${targetX},0 0,0`);
      
      // Hide if behind the camera
      if (scratchVec.z > 1) {
          lineRef.current.style.opacity = "0";
      } else {
          lineRef.current.style.opacity = "1";
      }
    }
  });

  return (
    <group ref={markerRef}>
      {/* Small interactive 3D Star Marker */}
      <mesh 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <octahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color="#00f0ff" wireframe />
      </mesh>

      {/* HTML DOM Overlay tied to the 3D marker's coordinates */}
      <Html center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'relative', overflow: 'visible', pointerEvents: isOpen ? 'auto' : 'none' }}>
          
          {isOpen && (
            <>
              {/* Le Trait Orthogonal */}
              <svg 
                style={{ 
                  position: 'absolute', 
                  top: 0, left: 0, 
                  overflow: 'visible',
                  pointerEvents: 'none'
                }}
              >
                <polyline 
                  ref={lineRef}
                  points={`0,0 0,0`}
                  fill="none" 
                  stroke="#00f0ff" 
                  strokeWidth="1.5"
                />
                <circle cx="0" cy="0" r="3" fill="#00f0ff" />
              </svg>

              {/* Le Panneau InfoCard */}
              <div
                ref={panelRef}
                style={{
                  position: 'absolute',
                  width: "320px",
                  background: "rgba(10, 15, 25, 0.85)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "15px",
                  border: "1px solid rgba(0, 240, 255, 0.3)",
                  color: "white",
                  padding: "20px",
                  boxShadow: "0 8px 32px rgba(0, 240, 255, 0.15)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  userSelect: "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "5px" }}>
                  <h2 style={{ margin: "0", fontSize: "1.8rem", color: "#fff" }}>Ceinture de Kuiper</h2>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#00f0ff",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                      padding: "0 5px",
                      fontWeight: "bold",
                    }}
                  >
                    ✕
                  </button>
                </div>
                
                <div style={{ color: "#00f0ff", fontSize: "0.9rem", marginBottom: "15px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  DISQUE DE PETITS CORPS
                </div>
                <p style={{ fontSize: "0.9rem", lineHeight: "1.5", color: "#ccc", marginBottom: "20px" }}>
                  Vaste anneau de corps glacés situé au-delà de l'orbite de Neptune. Il s'agit des vestiges de la formation du système solaire, abritant des planètes naines comme Pluton, Hauméa et Makémaké.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "5px" }}>
                    <span style={{ color: "#888" }}>Distance au Soleil</span>
                    <span style={{ fontWeight: "bold" }}>30 à 50 UA</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "5px" }}>
                    <span style={{ color: "#888" }}>Objets connus</span>
                    <span style={{ fontWeight: "bold" }}>&gt; 100 000</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "5px" }}>
                    <span style={{ color: "#888" }}>Composition</span>
                    <span style={{ fontWeight: "bold" }}>Glace et Roche</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Marqueur textuel INFO fermé */}
          {!isOpen && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              onPointerOver={() => {
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "auto";
              }}
              style={{
                position: 'absolute',
                left: "15px",
                top: "-15px",
                background: "rgba(10, 15, 25, 0.6)",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(0, 240, 255, 0.3)",
                color: "#00f0ff",
                padding: "5px 10px",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                pointerEvents: 'auto'
              }}
            >
              INFO
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

export function KuiperBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { isSystemRotating, systemRotationSpeed } = useSkyStore();

  // Scratch object for performance - avoids instantiating objects in useFrame
  const scratchObject3D = useMemo(() => new THREE.Object3D(), []);

  // Generate kuiper belt objects data
  const kuiperData = useMemo(() => {
    const data = [];
    for (let i = 0; i < KUIPER_OBJECT_COUNT; i++) {
      // Random distance between 30 AU and 50 AU
      const u = Math.random() + Math.random() + Math.random(); 
      const distanceAU = 30.0 + (u / 3) * 20.0; 
      const radius = compressRadius(distanceAU);

      const angle = Math.random() * Math.PI * 2;
      const ascendingNode = Math.random() * Math.PI * 2;
      const inclination = (Math.random() - 0.5) * (15 * Math.PI / 180);

      const periodYears = Math.pow(distanceAU, 1.5);
      const periodDays = periodYears * 365.25;
      const angularSpeed = (Math.PI * 2) / periodDays;

      data.push({
        radius,
        angle,
        ascendingNode,
        inclination,
        angularSpeed,
        scale: 0.05 + Math.random() * 0.15, 
        rotationSpeedX: (Math.random() - 0.5) * 1.0,
        rotationSpeedY: (Math.random() - 0.5) * 1.0,
        rotationSpeedZ: (Math.random() - 0.5) * 1.0,
        selfRotationX: Math.random() * Math.PI * 2,
        selfRotationY: Math.random() * Math.PI * 2,
        selfRotationZ: Math.random() * Math.PI * 2,
      });
    }
    return data;
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const deltaDays = isSystemRotating ? delta * systemRotationSpeed : 0;

    for (let i = 0; i < KUIPER_OBJECT_COUNT; i++) {
      const data = kuiperData[i];

      if (isSystemRotating) {
        data.angle += data.angularSpeed * deltaDays;
        data.selfRotationX += data.rotationSpeedX * delta;
        data.selfRotationY += data.rotationSpeedY * delta;
        data.selfRotationZ += data.rotationSpeedZ * delta;
      }

      const x = Math.cos(data.angle) * data.radius;
      const z = Math.sin(data.angle) * -data.radius;
      const y = Math.sin(data.angle - data.ascendingNode) * Math.sin(data.inclination) * data.radius;

      scratchObject3D.position.set(x, y, z);
      scratchObject3D.rotation.set(
        data.selfRotationX,
        data.selfRotationY,
        data.selfRotationZ
      );
      scratchObject3D.scale.setScalar(data.scale);
      scratchObject3D.updateMatrix();

      meshRef.current.setMatrixAt(i, scratchObject3D.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const markerRadius = compressRadius(42);

  return (
    <group>
      <instancedMesh 
        ref={meshRef} 
        args={[undefined as any, undefined as any, KUIPER_OBJECT_COUNT]}
      >
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial 
          color="#8ea3b5" // Grayish-blue icy rock color
          roughness={0.9} 
          onBeforeCompile={(shader) => {
            shader.vertexShader = shader.vertexShader.replace(
              '#include <begin_vertex>',
              `
              #include <begin_vertex>
              #ifdef USE_INSTANCING
                vec4 instanceCenter = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                float distToCamera = length(instanceCenter.xyz);
                
                float scaleFactor = max(1.0, distToCamera / 50.0);
                
                transformed *= scaleFactor;
              #endif
              `
            );
          }}
        />
      </instancedMesh>

      {/* Interface Dynamique pour la ceinture */}
      <KuiperHud radius={markerRadius} />
    </group>
  );
}
