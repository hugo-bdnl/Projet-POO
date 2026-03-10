import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSkyStore } from "../stores/useSkyStore";
import { useConstellationStore } from "../stores/useConstellationStore";
import type { VisibleStar } from "../types";
import { altAzToXYZ, SKY_RADIUS } from "../utils/skyCoords";
import { CompassRose } from "./CompassRose";
import { ConstellationPattern } from "./ConstellationPattern";
import { AzAltGrid } from "./AzAltGrid";
import { MilkyWay } from "./MilkyWay";
import { computeGMST } from "../utils/skyCoords";

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
  const { stars, constellationExtraStars, setHoveredStar, setSelectedStar } =
    useSkyStore();
  const { selectedConstellation } = useConstellationStore();
  const { showAzAltGrid } = useSkyStore();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const skyRotationGroup = useRef<THREE.Group>(null);

  // Toutes les étoiles à afficher : normales + extras du pattern
  const allStars = useMemo(
    () => [...stars, ...constellationExtraStars],
    [stars, constellationExtraStars],
  );

  // Stabiliser les uniforms pour éviter la réinitialisation par React
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uHighlightActive: { value: 0.0 },
    }),
    [],
  );

  // Extraire les HIP IDs de la constellation sélectionnée
  const constellationHipIds = useMemo(() => {
    if (!selectedConstellation?.lines_data) return null;
    try {
      const pairs: [number, number][] = JSON.parse(
        selectedConstellation.lines_data,
      );
      return new Set(pairs.flat());
    } catch {
      return null;
    }
  }, [selectedConstellation]);

  const hasConstellation =
    constellationHipIds !== null && constellationHipIds.size > 0;

  const { positions, colors, sizes, highlights, starMap } = useMemo(() => {
    const positionsData: number[] = [];
    const colorsData: number[] = [];
    const sizesData: number[] = [];
    const highlightsData: number[] = [];
    const starMapData = new Map<number, VisibleStar>();

    allStars.forEach((star, index) => {
      const [x, y, z] = altAzToXYZ(star.altitude, star.azimuth, SKY_RADIUS);

      positionsData.push(x, y, z);

      const color = getSpectralColor(star.spectral_type);
      colorsData.push(color.r, color.g, color.b);

      sizesData.push(getStarSize(star.magnitude));

      // Highlight: 1.0 si étoile de la constellation (ou pas de constellation), 0.12 sinon
      const isConstellationStar =
        hasConstellation &&
        star.hip_id !== null &&
        constellationHipIds.has(star.hip_id);
      highlightsData.push(
        hasConstellation ? (isConstellationStar ? 1.0 : 0.12) : 1.0,
      );

      starMapData.set(index, star);
    });

    return {
      positions: new Float32Array(positionsData),
      colors: new Float32Array(colorsData),
      sizes: new Float32Array(sizesData),
      highlights: new Float32Array(highlightsData),
      starMap: starMapData,
    };
  }, [allStars, constellationHipIds]);

  // Animation shader : scintillement des étoiles + transition highlight constellation
  useFrame((_state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
      // Smooth transition du highlight
      const target = constellationHipIds ? 1.0 : 0.0;
      materialRef.current.uniforms.uHighlightActive.value +=
        (target - materialRef.current.uniforms.uHighlightActive.value) * 0.05;
    }

    if (skyRotationGroup.current) {
      const state = useSkyStore.getState();
      const rawCurrentLat = state.currentLat;
      const baseTimeStr = state.baseTimestamp;
      const currentTimeStr = state.timestamp;

      if (rawCurrentLat !== null && baseTimeStr) {
        // La rotation de la voûte céleste se fait autour de l'Axe Pôlaire (Pôle Nord Céleste).
        // Le PNC se trouve toujours vers le Nord (Azimut 0) à une hauteur (Altitude) égale à la latitude de l'observateur.
        const [nx, ny, nz] = altAzToXYZ(rawCurrentLat, 0, 1);
        const ncpVector = new THREE.Vector3(nx, ny, nz).normalize();

        const baseDate = new Date(baseTimeStr);
        const calculationDate = currentTimeStr ? new Date(currentTimeStr) : new Date();

        const deltaGmst = computeGMST(calculationDate) - computeGMST(baseDate);

        // La Terre tourne vers l'Est (+), donc la voûte céleste nous donne l'impression de tourner vers l'Ouest (-)
        skyRotationGroup.current.setRotationFromAxisAngle(ncpVector, THREE.MathUtils.degToRad(-deltaGmst));
      } else {
        // Reset
        skyRotationGroup.current.setRotationFromEuler(new THREE.Euler(0, 0, 0));
      }
    }
  });

  if (stars.length === 0) return null;

  const getValidIntersection = (intersections: THREE.Intersection[]) => {
    if (!hasConstellation) {
      return intersections.sort((a, b) => a.distance - b.distance)[0];
    }
    return intersections
      .filter((i) => {
        const star = i.index !== undefined ? starMap.get(i.index) : null;
        return (
          star && star.hip_id !== null && constellationHipIds!.has(star.hip_id)
        );
      })
      .sort((a, b) => a.distance - b.distance)[0];
  };

  return (
    <group>
      {/* Éléments fixes : Liés au repère local de l'observateur (Ne tournent pas) */}
      <CompassRose />
      {showAzAltGrid && <AzAltGrid />}

      {/* Éléments célestes : Tournent avec le temps autour de l'axe polaire */}
      <group ref={skyRotationGroup}>
        <MilkyWay />
        <ConstellationPattern />

        <points
          onPointerOver={(e) => {
            e.stopPropagation();
            const closest = getValidIntersection(e.intersections);
            if (closest?.index !== undefined) {
              setHoveredStar(starMap.get(closest.index) || null);
            } else {
              setHoveredStar(null);
            }
          }}
          onPointerOut={() => setHoveredStar(null)}
          onClick={(e) => {
            e.stopPropagation();
            const closest = getValidIntersection(e.intersections);
            if (closest?.index !== undefined) {
              setSelectedStar(starMap.get(closest.index) || null);
            }
          }}
        >
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
            <bufferAttribute
              attach="attributes-highlight"
              args={[highlights, 1]}
            />
          </bufferGeometry>
          {/* Shader Material custom pour supporter le per-vertex size et couleur */}
          <shaderMaterial
            ref={materialRef}
            transparent
            // Additive blending pour effet de lumière intense / cumuls
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            uniforms={uniforms}
            vertexShader={`
            attribute float size;
            attribute vec3 color;
            attribute float highlight;
            varying vec3 vColor;
            varying float vHighlight;
            void main() {
              vColor = color;
              vHighlight = highlight;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              // Taille réduite pour les étoiles non-constellation
              float sizeMultiplier = mix(1.0, highlight, step(0.5, highlight));
              gl_PointSize = size * sizeMultiplier * (30.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
            fragmentShader={`
            uniform float uTime;
            uniform float uHighlightActive;
            varying vec3 vColor;
            varying float vHighlight;
            void main() {
              vec2 cxy = 2.0 * gl_PointCoord - 1.0;
              float r = dot(cxy, cxy);
              if (r > 1.0) discard;
              
              float fadeIn = clamp(uTime / 2.5, 0.0, 1.0);

              // Modulation highlight : mix entre pleine intensité et highlight réduit
              float h = mix(1.0, vHighlight, uHighlightActive);

              float alpha = (1.0 - r) * fadeIn * h;
              vec3 finalColor = vColor * mix(3.0, 0.8, r) * h;
              
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
          />
        </points>
      </group>
    </group>
  );
};
