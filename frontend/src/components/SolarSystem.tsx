import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useTexture, Line } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useSkyStore } from "../stores/useSkyStore";
import { computePlanetPositions } from "../utils/planetaryEphemeris";
import { PLANETS_METADATA } from "../types/planets";
import { AsteroidBelt } from "./AsteroidBelt";
import { KuiperBelt } from "./KuiperBelt";

/**
 * Composant principal de la vue Système Solaire.
 * Affiche le Soleil et les 8 planètes sur leurs orbites
 * aux positions réelles calculées via VSOP87B (astronomia).
 */
export function SolarSystem() {
  const { timestamp, isSystemRotating, systemRotationSpeed, showOrbits } = useSkyStore();

  // Optimisation: Memorize pour éviter de recalculer les 128 points d'orbite à chaque render
  const calculationDate = useMemo(() => timestamp ? new Date(timestamp) : new Date(), [timestamp]);
  const animatedDateRef = useRef(calculationDate.getTime());

  const planetPositions = useMemo(() => computePlanetPositions(calculationDate), [calculationDate]);

  useEffect(() => {
    animatedDateRef.current = calculationDate.getTime();
  }, [calculationDate]);

  const sunPos = planetPositions.get("sun")!;
  const sunMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const sunLightRef = useRef<THREE.PointLight>(null);

  const { transitionToMode } = useSkyStore();

  // Ref to track timeouts for each planet to delay preloading
  const hoverTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  // Optimisations: Stockages sans re-rendus pour l'animation au survol
  const meshesRef = useRef<Record<string, THREE.Group | THREE.Mesh | null>>({});
  const hoveredRef = useRef<Record<string, boolean>>({});

  const handlePointerOver = (e: ThreeEvent<PointerEvent>, planetId: string, texturePath: string) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    hoveredRef.current[planetId] = true;
    // Delay preloading by 350ms to prevent downloading on fast sweeps
    hoverTimeouts.current[planetId] = setTimeout(() => {
      // Préchargement furtif via le cache du navigateur (évite de réveiller THREE.DefaultLoadingManager)
      // Cela supprime le parasite visuel (l'écran de chargement qui s'affichait au survol)
      const img = new Image();
      img.src = texturePath;
    }, 350);
  };

  const handlePointerOut = (planetId: string) => {
    document.body.style.cursor = "auto";
    hoveredRef.current[planetId] = false;
    if (hoverTimeouts.current[planetId]) {
      clearTimeout(hoverTimeouts.current[planetId]);
      delete hoverTimeouts.current[planetId];
    }
  };

  useFrame((state, delta) => {
    if (sunMaterialRef.current && sunLightRef.current) {
      // Pulsation subtile via une onde sinusoïdale basée sur le temps
      const t = state.clock.elapsedTime;
      const pulse = Math.sin(t * 2) * 0.1 + 0.9; // Oscille entre 0.8 et 1.0

      // On modifie la couleur de la texture émissive perçue
      sunMaterialRef.current.color.setScalar(pulse);
      sunLightRef.current.intensity = 5 * pulse; // Légèrement plus intense
    }

    // Avancer le temps pour l'animation (ex: 15 jours par seconde)
    if (isSystemRotating) {
      const SIMULATION_SPEED = systemRotationSpeed * 86400 * 1000;
      animatedDateRef.current += delta * SIMULATION_SPEED;
    }

    // Calcul optimisé (skipOrbits = true) pour l'animation
    const newPositions = computePlanetPositions(new Date(animatedDateRef.current), true);

    // Animation de survol (agrandissement) et mise à jour des positions orbitale
    for (const id in meshesRef.current) {
      const mesh = meshesRef.current[id];
      if (mesh) {
        const targetScale = hoveredRef.current[id] ? 1.5 : 1.0;
        const currentScale = mesh.scale.x;

        if (Math.abs(currentScale - targetScale) > 0.001) {
          mesh.scale.setScalar(
            THREE.MathUtils.lerp(currentScale, targetScale, delta * 15)
          );
        } else if (currentScale !== targetScale) {
          mesh.scale.setScalar(targetScale);
        }

        // Mise à jour de la position orbitale
        if (id !== "sun") {
          const newPos = newPositions.get(id as any);
          if (newPos) {
            mesh.position.copy(newPos.position3D);
          }
        }

        // Animation de rotation (spin) sur eux-mêmes
        if (isSystemRotating) {
          mesh.rotation.y += delta * (id === "sun" ? 0.05 : 0.5);
        }
      }
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

      {/* Ajout d'un effet Bloom ciblé pour l'esthétique "sans orbite" */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2} // Ajusté pour que le soleil brille fort (1.0), et les planètes légèrement
          luminanceSmoothing={0.9} // Transition douce
          intensity={0.4} // Intensité globale subtile pour ne pas aveugler
          mipmapBlur // Requis pour un rendu moderne et propre
        />
      </EffectComposer>

      {/* 2. Le Soleil */}
      <mesh
        ref={(el) => {
          meshesRef.current["sun"] = el;
        }}
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

      {/* Ceinture d'astéroïdes */}
      <AsteroidBelt />

      {/* Ceinture de Kuiper */}
      <KuiperBelt />

      {/* 3. Les Planètes */}
      {Array.from(planetPositions.values()).map((p) => {
        if (p.id === "sun") return null;

        return (
          <group key={p.id}>
            {/* Orbite 3D exacte, respectant l'inclinaison par rapport au plan */}
            {showOrbits && p.orbitPoints && p.orbitPoints.length > 0 && (
              <Line
                points={p.orbitPoints}
                color="#ffffff"
                transparent
                opacity={0.35} // Plus visible que 0.15 selon ta demande
                lineWidth={1.5}
              />
            )}

            {/* Groupe englobant pour la position et l'agrandissement global au survol */}
            <group
              ref={(el) => {
                meshesRef.current[p.id] = el;
              }}
              position={p.position3D}
            >
              {/* Corps de la planète */}
              <mesh
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
                <mesh rotation={[Math.PI / 2 + 0.3, 0, 0]}>
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
          </group>
        );
      })}
    </group>
  );
}
