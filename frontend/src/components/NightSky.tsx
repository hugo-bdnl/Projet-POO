import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSkyStore } from "../stores/useSkyStore";
import type { VisibleStar } from "../types";
import { CompassRose } from "./CompassRose";
import { ConstellationPattern } from "./ConstellationPattern";

// Convertit la magnitude en taille d'étoile (plus la magnitude est faible, plus elle est grosse)
const getStarSize = (magnitude: number): number => {
  return Math.max(1.0, 6.0 - magnitude) * 1.5; // Ratio de brillance augmenté
};

// Convertit un type spectral approché en couleur
const getSpectralColor = (spectralType: string | null): THREE.Color => {
  if (!spectralType) return new THREE.Color("#ffffff");
  const t = spectralType.charAt(0).toUpperCase();
  switch (t) {
    case "O":
    case "B":
      return new THREE.Color("#9bb0ff"); // Bleu
    case "A":
      return new THREE.Color("#cad7ff"); // Blanc-bleu
    case "F":
    case "G":
      return new THREE.Color("#fff4ea"); // Jaune-blanc
    case "K":
      return new THREE.Color("#ffd2a1"); // Orange
    case "M":
      return new THREE.Color("#ffcc6f"); // Rouge
    default:
      return new THREE.Color("#ffffff");
  }
};

export const NightSky = () => {
  const { stars, setHoveredStar, setSelectedStar } = useSkyStore();
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, colors, sizes, starMap } = useMemo(() => {
    const positionsData: number[] = [];
    const colorsData: number[] = [];
    const sizesData: number[] = [];
    // Mappage (index -> VisibleStar) pour le raycasting
    const starMapData = new Map<number, VisibleStar>();

    // Distance arbitraire sur la voûte céleste locale
    const RADIUS = 15;

    stars.forEach((star, index) => {
      // Conversion azimut/altitude vers x,y,z (coordonnées sphériques -> cartésiennes)
      // Altitude: 0 à 90 (0 = horizon, 90 = zénith)
      // Azimut: 0 à 360 (0 = Nord, 90 = Est, 180 = Sud, 270 = Ouest)
      const altRad = THREE.MathUtils.degToRad(star.altitude);
      // On convertit l'azimut standard en angle mathématique (ex: Nord = Z negatif)
      // Ajustement pour aligner visuellement selon les besoins.
      const azRad = THREE.MathUtils.degToRad(-star.azimuth + 90);

      // Projection sphérique
      const x = RADIUS * Math.cos(altRad) * Math.cos(azRad);
      const y = RADIUS * Math.sin(altRad); // hauteur
      const z = RADIUS * Math.cos(altRad) * -Math.sin(azRad);

      positionsData.push(x, y, z);

      const color = getSpectralColor(star.spectral_type);
      colorsData.push(color.r, color.g, color.b);

      sizesData.push(getStarSize(star.magnitude));

      starMapData.set(index, star);
    });

    return {
      positions: new Float32Array(positionsData),
      colors: new Float32Array(colorsData),
      sizes: new Float32Array(sizesData),
      starMap: starMapData,
    };
  }, [stars]);

  // Lent mouvement de rotation de la voute celeste pour faire vivant
  useFrame((_state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0001;
    }
    if (materialRef.current) {
      // Fade-in effect overtime
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  if (stars.length === 0) return null;

  return (
    <group>
      <CompassRose />
      <ConstellationPattern />
      <points
        ref={pointsRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (e.index !== undefined) {
            setHoveredStar(starMap.get(e.index) || null);
          }
        }}
        onPointerOut={() => setHoveredStar(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.index !== undefined) {
            setSelectedStar(starMap.get(e.index) || null);
          }
        }}
      >
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        </bufferGeometry>
        {/* Shader Material custom pour supporter le per-vertex size et couleur */}
        <shaderMaterial
          ref={materialRef}
          transparent
          // Additive blending pour effet de lumière intense / cumuls
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          uniforms={{
            uTime: { value: 0.0 },
          }}
          vertexShader={`
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            void main() {
              vColor = color;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              // La taille dépend aussi de l'éloignement de la caméra
              gl_PointSize = size * (30.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            uniform float uTime;
            varying vec3 vColor;
            void main() {
              // Dessine un point circulaire au lieu d'un carré plat
              vec2 cxy = 2.0 * gl_PointCoord - 1.0;
              float r = dot(cxy, cxy);
              if (r > 1.0) discard;
              
              // Fade-in effect progressif sur 2.5 secondes
              float fadeIn = clamp(uTime / 2.5, 0.0, 1.0);

              // Effet halo doux au bord
              float alpha = (1.0 - r) * fadeIn;
              // Augmente l'intensité centrale (bloom et brillance globale conservée)
              vec3 finalColor = vColor * mix(3.0, 0.8, r);
              
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
        />
      </points>
    </group>
  );
};
