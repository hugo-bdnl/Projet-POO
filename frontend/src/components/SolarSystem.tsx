import * as THREE from "three";
import { useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useTexture, Line } from "@react-three/drei";
import { useSkyStore } from "../stores/useSkyStore";
import { computePlanetPositions } from "../utils/planetaryEphemeris";
import { PLANETS_METADATA } from "../types/planets";

/**
 * Composant principal de la vue Système Solaire.
 * Affiche le Soleil et les 8 planètes sur leurs orbites
 * aux positions réelles calculées via VSOP87B (astronomia).
 */
export function SolarSystem() {
  const { timestamp } = useSkyStore();

  // Utilise la date du composant "time slider" (timestamp)
  // S'il n'y en a pas on utilise la date actuelle réelle du PC
  const calculationDate = timestamp ? new Date(timestamp) : new Date();

  // Le calcul d'éphémérides est très rapide et fait ~0.2ms, on peut le faire à la frame
  // ou l'enregistrer dans un ref si on veut optimiser davantage,
  // mais React le recalcule gracieusement au changement du time slider.
  const planetPositions = computePlanetPositions(calculationDate);
  const sunPos = planetPositions.get("sun")!;
  const sunMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const sunLightRef = useRef<THREE.PointLight>(null);

  const { transitionToMode } = useSkyStore();

  // Ref to track timeouts for each planet to delay preloading
  const hoverTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  const handlePointerOver = (e: ThreeEvent<PointerEvent>, planetId: string, texturePath: string) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    // Delay preloading by 350ms to prevent downloading on fast sweeps
    hoverTimeouts.current[planetId] = setTimeout(() => {
      useTexture.preload(texturePath);
    }, 350);
  };

  const handlePointerOut = (planetId: string) => {
    document.body.style.cursor = "auto";
    if (hoverTimeouts.current[planetId]) {
      clearTimeout(hoverTimeouts.current[planetId]);
      delete hoverTimeouts.current[planetId];
    }
  };

  useFrame((state) => {
    if (sunMaterialRef.current && sunLightRef.current) {
      // Pulsation subtile via une onde sinusoïdale basée sur le temps
      const t = state.clock.elapsedTime;
      const pulse = Math.sin(t * 2) * 0.1 + 0.9; // Oscille entre 0.8 et 1.0

      // On modifie la couleur de la texture émissive perçue
      sunMaterialRef.current.color.setScalar(pulse);
      sunLightRef.current.intensity = 5 * pulse; // Légèrement plus intense
    }
  });

  // Chargement asynchrone (géré par le <Suspense> parent)
  const sunTexture = useTexture("/textures/planets/sun.webp");
  const textures = useTexture({
    mercury: "/textures/planets/mercury.webp",
    venus: "/textures/planets/venus_surface.webp",
    earth: "/textures/earth_day.webp",
    mars: "/textures/planets/mars.webp",
    jupiter: "/textures/planets/jupiter.webp",
    saturn: "/textures/planets/saturn.webp",
    saturnRing: "/textures/planets/saturn_ring_alpha.webp",
    uranus: "/textures/planets/uranus.webp",
    neptune: "/textures/planets/neptune.webp",
  }) as Record<string, THREE.Texture>;

  return (
    <group>
      {/* 1. Lumière centrale issue du soleil */}
      <pointLight
        ref={sunLightRef}
        position={sunPos.position3D}
        intensity={8}
        distance={1000}
        decay={0.8} // Décroissance très lente pour bien éclairer les planètes lointaines
        color="#fffcf2"
      />
      <ambientLight intensity={0.4} />{" "}
      {/* Plus fort pour "déboucher" les zones d'ombres des textures */}
      {/* 2. Le Soleil */}
      <mesh
        position={sunPos.position3D}
        onClick={(e) => {
          e.stopPropagation();
          transitionToMode("globe", "sun");
        }}
        onPointerOver={(e) =>
          handlePointerOver(e, "sun", PLANETS_METADATA.sun.textureGlobePath)
        }
        onPointerOut={() => handlePointerOut("sun")}
      >
        {/* Soleil imposant pour rester indéniablement le centre de masse masssif vis-à-vis des géantes */}
        <sphereGeometry args={[PLANETS_METADATA.sun.visualSize, 64, 64]} />
        <meshBasicMaterial ref={sunMaterialRef} map={sunTexture} />
      </mesh>
      {/* 3. Les Planètes */}
      {Array.from(planetPositions.values()).map((p) => {
        if (p.id === "sun") return null;

        return (
          <group key={p.id}>
            {/* Orbite 3D exacte, respectant l'inclinaison par rapport au plan */}
            {p.orbitPoints && p.orbitPoints.length > 0 && (
              <Line
                points={p.orbitPoints}
                color="#ffffff"
                transparent
                opacity={0.35} // Plus visible que 0.15 selon ta demande
                lineWidth={1.5}
              />
            )}

            {/* Corps de la planète */}
            <mesh
              position={p.position3D}
              onClick={(e) => {
                e.stopPropagation();
                transitionToMode("globe", p.id);
              }}
              onPointerOver={(e) =>
                handlePointerOver(
                  e,
                  p.id,
                  PLANETS_METADATA[p.id].textureGlobePath,
                )
              }
              onPointerOut={() => handlePointerOut(p.id)}
            >
              <sphereGeometry
                args={[PLANETS_METADATA[p.id].visualSize, 64, 64]}
              />
              <meshStandardMaterial
                map={textures[p.id]}
                roughness={p.id === "earth" || p.id === "venus" ? 0.4 : 0.7}
              />
            </mesh>

            {/* Anneaux de Saturne simplifiés temporaires */}
            {p.id === "saturn" && (
              <mesh
                position={p.position3D}
                rotation={[Math.PI / 2 + 0.3, 0, 0]}
              >
                {/* Taille des anneaux ajustée à la NOUVELLE taille de Saturne (5.0) */}
                <ringGeometry args={[6.0, 11.0, 64]} />
                <meshStandardMaterial
                  map={textures.saturnRing}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
