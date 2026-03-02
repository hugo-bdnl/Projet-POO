import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { LocationMarker } from "./LocationMarker";
import { useObservationStore } from "../stores/useObservationStore";

export function Globe() {
  const meshRef = useRef<THREE.Mesh>(null!);

  // Connexion au state manager
  const { points, fetchPoints } = useObservationStore();

  // On fetch les 50 villes uniquement au montage du composant
  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  // Chargement des textures (useTexture de drei gère la mise en cache et le suspense)
  const [colorMap, normalMap, specularMap, emissiveMap] = useTexture([
    "/textures/earth_day.webp",
    "/textures/earth_normal.webp",
    "/textures/earth_specular.webp",
    "/textures/earth_night.webp",
  ]);

  // Rotation lente automatique du globe terrestre sur son axe Y
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Sphère avec segments équilibrés : 32x32 est imperceptible vs 64x64 mais 4x moins lourd */}
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        // specularMap est destiné historiquement au MeshPhongMaterial.
        // Sur un MeshStandardMaterial plus récent, on l'utilise souvent en tant que roughnessMap
        // ou metalnessMap. Ici on l'utilise comme metalness pour faire réfléchir l'océan.
        metalnessMap={specularMap}
        roughness={0.6}
        metalness={0.4}
        emissiveMap={emissiveMap}
        emissive={new THREE.Color(0xffffff)}
        emissiveIntensity={0.2}
      />
      {/* 50 Points d'observation depuis l'API */}
      {points.map((pt) => (
        <LocationMarker
          key={pt.id}
          id={pt.id}
          lat={pt.latitude}
          lon={pt.longitude}
          name={pt.name}
          timezone={pt.timezone}
        />
      ))}

      {/* Tâche 7 : Effet Atmosphère (Glow) */}
      <mesh>
        <sphereGeometry args={[1.05, 32, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            void main() {
              float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
              gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
            }
          `}
        />
      </mesh>
    </mesh>
  );
}
