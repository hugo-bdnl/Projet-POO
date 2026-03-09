import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture, Stars } from "@react-three/drei";
import * as THREE from "three";
import { LocationMarker } from "./LocationMarker";
import { useObservationStore } from "../stores/useObservationStore";
import { useSkyStore } from "../stores/useSkyStore";
import { computePlanetPositions } from "../utils/planetaryEphemeris";
import { applyDayNightTerminator } from "../utils/dayNightShader";
import { computeGMST } from "../utils/skyCoords";
import { ISS } from "./ISS";

export function Globe() {
  const meshRef = useRef<THREE.Mesh>(null!);

  // Connexion au state manager
  const { points, fetchPoints } = useObservationStore();
  // On ne destructure PAS timestamp ici pour éviter un re-render complet de la Terre 60 fois par seconde pendant le *scrubbing* du TimeSlider.

  const customUniformsRef = useRef({
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) }
  });
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

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

  useFrame(() => {
    // Lecture "Transiente" de Zustand, ultra rapide et sans re-render React.
    const tsStr = useSkyStore.getState().timestamp;
    const calculationDate = tsStr ? new Date(tsStr) : new Date();

    if (meshRef.current) {
      // Calcul du Temps Sidéral Moyen de Greenwich pour aligner la rotation de la Terre
      const gmstDeg = computeGMST(calculationDate);
      // THREE.js attend des radians.
      meshRef.current.rotation.y = THREE.MathUtils.degToRad(gmstDeg);
    }

    const planets = computePlanetPositions(calculationDate, true);
    const earthPos = planets.get("earth")!.position3D;
    // Direction Terre -> Soleil : Vecteur inverse de la position de la Terre par rapport au Soleil (0,0,0)
    const sunDirection = earthPos.clone().negate().normalize();

    customUniformsRef.current.uSunDirection.value.copy(sunDirection);

    if (directionalLightRef.current) {
      // Pour une lumière directionnelle, la position définit la direction depuis laquelle la lumière vient (vers 0,0,0)
      directionalLightRef.current.position.copy(sunDirection).multiplyScalar(5);
    }
  });

  return (
    <>
      {/* Lumière directionnelle principale (Soleil) */}
      <directionalLight ref={directionalLightRef} intensity={2.5} />

      {/* Représentation visuelle du Soleil au loin */}
      <mesh position={customUniformsRef.current.uSunDirection.value.clone().multiplyScalar(150)}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshBasicMaterial color="#fffcf2" />
        {/* Glow du soleil (Aura) */}
        <mesh>
          <sphereGeometry args={[7, 32, 32]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
        </mesh>
      </mesh>
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
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
          emissiveIntensity={1.0} // Pleine intensité de base, modulée par le shader
          onBeforeCompile={(shader) => {
            applyDayNightTerminator(shader);
            shader.uniforms.uSunDirection = customUniformsRef.current.uSunDirection;
          }}
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

      {/* Tâche 6 : ISS hors du mesh rotatif — ses coordonnées sont en espace-monde (ECI → géodésique)
          et ne doivent PAS hériter de la rotation de la Terre */}
      <ISS />
    </>
  );
}
