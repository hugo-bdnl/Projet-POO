import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { LocationMarker } from "./LocationMarker";
import { useObservationStore } from "../stores/useObservationStore";
import { useSkyStore } from "../stores/useSkyStore";
import { computePlanetPositions } from "../utils/planetaryEphemeris";
import { applyDayNightTerminator } from "../utils/dayNightShader";
import { computeGMST } from "../utils/skyCoords";
import { ISS } from "./ISS";
import { PLANETS_METADATA } from "../types/planets";

export function Globe() {
  const meshRef = useRef<THREE.Mesh>(null!);

  // Connexion au state manager
  // Constantes de temps et stores
  const tsStr = useSkyStore(s => s.timestamp);
  const selectedPlanet = useSkyStore(s => s.selectedPlanet) || "earth";
  const { points, fetchPoints } = useObservationStore();

  const customUniformsRef = useRef({
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) }
  });
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

  // On fetch les 50 villes uniquement au montage du composant
  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const planetMetadata = PLANETS_METADATA[selectedPlanet];

  // Toujours charger les maps spécifiques Terre au cas où l'utilisateur revient
  const [earthNormalMap, earthSpecularMap, earthEmissiveMap] = useTexture([
    "/textures/earth_normal.webp",
    "/textures/earth_specular.webp",
    "/textures/planets/8k/8k_earth_nightmap.webp",
  ]);

  // Texture dynamique de la planète sélectionnée
  const planetTexture = useTexture(planetMetadata?.textureGlobePath || "/textures/planets/8k/8k_earth_daymap.webp");

  // Anneaux si nécessaire (Saturne)
  const saturnRingTexture = useTexture("/textures/planets/8k/8k_saturn_ring_alpha.webp");

  useFrame((_state) => {
    const calculationDate = tsStr ? new Date(tsStr) : new Date();

    if (meshRef.current) {
      // On applique la rotation temporelle exacte de la Terre (GMST) à toutes les planètes
      // pour un comportement parfaitement prédictible, unifié et contrôlable via le TimeSlider.
      const gmstDeg = computeGMST(calculationDate);
      meshRef.current.rotation.y = THREE.MathUtils.degToRad(gmstDeg);
    }

    const planets = computePlanetPositions(calculationDate, true);
    // On extrait la position orbitale réelle de la planète regardée pour calculer d'où vient SA lumière du soleil
    const fallbackPlanet = selectedPlanet === "sun" ? "earth" : selectedPlanet;
    const planetPos = planets.get(fallbackPlanet)?.position3D || new THREE.Vector3(1, 0, 0);
    // Direction Planète -> Soleil : Vecteur inverse de la position orbitale
    const sunDirectionGlobal = planetPos.clone().negate().normalize();

    if (directionalLightRef.current) {
      // Pour une lumière directionnelle, la position définit la direction depuis laquelle la lumière vient (vers 0,0,0)
      directionalLightRef.current.position.copy(sunDirectionGlobal).multiplyScalar(5);
    }

    if (meshRef.current) {
      // Crucial : Le terminateur (shader) est appliqué sur le mesh qui tourne (rotation.y).
      // Il faut donc donner au shader la direction du soleil dans le référentiel *local* de la planète 
      // pour que l'ombre reste fixe par rapport à la lumière globale pendant que la texture tourne sous l'ombre.
      const localSunDirection = meshRef.current.worldToLocal(sunDirectionGlobal.clone()).normalize();
      customUniformsRef.current.uSunDirection.value.copy(localSunDirection);
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
      {/* Pas de Stars ici car c'est géré globalement dans App.tsx */}

      <group scale={planetMetadata?.visualSize || 1}>
        <mesh ref={meshRef}>
          {/* Sphère avec segments équilibrés : 32x32 est imperceptible vs 64x64 mais 4x moins lourd */}
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            map={planetTexture}
            normalMap={selectedPlanet === "earth" ? earthNormalMap : null}
            metalnessMap={selectedPlanet === "earth" ? earthSpecularMap : null}
            roughness={selectedPlanet === "earth" || selectedPlanet === "venus" ? 0.6 : 0.8}
            metalness={selectedPlanet === "earth" ? 0.4 : 0.1}
            emissiveMap={selectedPlanet === "earth" ? earthEmissiveMap : null}
            emissive={selectedPlanet === "earth" ? new THREE.Color(0xffffff) : new THREE.Color(0x000000)}
            emissiveIntensity={1.0}
            onBeforeCompile={(shader) => {
              if (selectedPlanet === "sun") return;
              applyDayNightTerminator(shader);
              shader.uniforms.uSunDirection = customUniformsRef.current.uSunDirection;
            }}
          />
          {/* Anneaux de Saturne en mode Globe */}
          {selectedPlanet === "saturn" && (
            <mesh rotation={[Math.PI / 2 + 0.3, 0, 0]}>
              <ringGeometry args={[1.2, 2.2, 64]} />
              <meshStandardMaterial
                map={saturnRingTexture}
                side={THREE.DoubleSide}
                transparent
                opacity={0.8}
              />
            </mesh>
          )}

          {/* 50 Points d'observation depuis l'API, uniquement pour la Terre */}
          {selectedPlanet === "earth" && points.map((pt) => (
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

        {/* Tâche 6 : ISS hors du mesh rotatif (disponible que pour la Terre) */}
        {selectedPlanet === "earth" && <ISS />}
      </group>
    </>
  );
}
