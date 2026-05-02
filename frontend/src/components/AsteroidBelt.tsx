import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useSkyStore } from "../stores/useSkyStore";
import { compressRadius } from "../utils/planetaryEphemeris";

const ASTEROID_COUNT = 2000;

export function AsteroidBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { isSystemRotating, systemRotationSpeed } = useSkyStore();

  // Scratch object for performance - avoids instantiating objects in useFrame
  const scratchObject3D = useMemo(() => new THREE.Object3D(), []);

  // Generate asteroid baseline data
  const asteroidsData = useMemo(() => {
    const data = [];
    for (let i = 0; i < ASTEROID_COUNT; i++) {
        
      // Random distance between 2.0 and 3.4 AU (concentrated around 2.7 AU)
      const u = Math.random() + Math.random() + Math.random(); 
      const distanceAU = 2.0 + (u / 3) * 1.4; 
      const radius = compressRadius(distanceAU);

      const angle = Math.random() * Math.PI * 2;
      const ascendingNode = Math.random() * Math.PI * 2;
      const inclination = (Math.random() - 0.5) * (10 * Math.PI / 180);

      // Period in years (Kepler's 3rd law)
      const periodYears = Math.pow(distanceAU, 1.5);
      const periodDays = periodYears * 365.25;
      const angularSpeed = (Math.PI * 2) / periodDays;

      data.push({
        radius,
        angle,
        ascendingNode,
        inclination,
        angularSpeed,
        scale: 0.05 + Math.random() * 0.15, // Small varied sizes
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

    // Delta in days, scaling factor from useSkyStore
    const deltaDays = isSystemRotating ? delta * systemRotationSpeed : 0;

    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const data = asteroidsData[i];

      if (isSystemRotating) {
        data.angle += data.angularSpeed * deltaDays;
        data.selfRotationX += data.rotationSpeedX * delta;
        data.selfRotationY += data.rotationSpeedY * delta;
        data.selfRotationZ += data.rotationSpeedZ * delta;
      }

      // Orbital positions (Y-up coordinate system where Z is depth)
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

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, ASTEROID_COUNT]}>
      {/* icosahedronGeometry provides a rocky look with 0 detail level */}
      <icosahedronGeometry args={[0.4, 0]} />
      <meshStandardMaterial 
        color="#8B7D6B" 
        roughness={0.9} 
        onBeforeCompile={(shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            #ifdef USE_INSTANCING
              // Calcule la distance de la caméra au centre de cette instance
              vec4 instanceCenter = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
              float distToCamera = length(instanceCenter.xyz);
              
              // Facteur d'agrandissement dynamique (pour ne pas disparaître au loin)
              // Diviseur 40.0 : plus le chiffre est bas, plus les particules lointaines seront grosses.
              float scaleFactor = max(1.0, distToCamera / 40.0);
              
              // On applique cette mise à l'échelle sur les sommets de ce mesh localement
              transformed *= scaleFactor;
            #endif
            `
          );
        }}
      />
    </instancedMesh>
  );
}
