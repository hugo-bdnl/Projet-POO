import { useRef, useState, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSkyStore } from "../stores/useSkyStore";
import { ROVER_METADATA, MARS_ROVERS } from "../types/rovers";
import type { RoverFull } from "../types/rovers";

// ── Scratch vectors hors composant (évite l'allocation dans useFrame à 60 fps) ──
const _SCALE_NORMAL = new THREE.Vector3(1, 1, 1);
const _SCALE_HOVERED = new THREE.Vector3(1.6, 1.6, 1.6);
const _SCALE_SELECTED = new THREE.Vector3(2.0, 2.0, 2.0);

/**
 * Conversion lat/lon → coordonnées cartésiennes sur la sphère Mars (rayon local = 1).
 * Formule identique à LocationMarker pour cohérence avec la texture du globe.
 * Le radius légèrement > 1 lève le marker au-dessus de la surface.
 */
function latLonToXYZ(
  lat: number,
  lon: number,
  radius = 1.02,
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

// ── Marker individuel ─────────────────────────────────────────────────────────

interface RoverMarkerProps {
  rover: RoverFull;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}

function RoverMarker({ rover, isSelected, onSelect }: RoverMarkerProps) {
  const meshRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  // Position calculée une seule fois par rover (dépendances constantes)
  const position = useMemo(
    () => latLonToXYZ(rover.lat, rover.lon),
    [rover.lat, rover.lon],
  );

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const target = isSelected
      ? _SCALE_SELECTED
      : hovered
        ? _SCALE_HOVERED
        : _SCALE_NORMAL;
    if (!meshRef.current.scale.equals(target)) {
      meshRef.current.scale.lerp(target, delta * 10);
    }
  });

  const coreColor = rover.active ? rover.color : "#445566";
  const glowOpacity = isSelected ? 0.55 : hovered ? 0.4 : rover.active ? 0.22 : 0.08;

  return (
    <group
      ref={meshRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(isSelected ? null : rover.id);
      }}
    >
      {/* Noyau lumineux — toujours visible */}
      <mesh>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial color={coreColor} toneMapped={false} />
      </mesh>

      {/* Halo glow — AdditiveBlending pour l'effet lumineux */}
      <mesh>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={glowOpacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────

export function MarsRovers() {
  const selectedRoverId = useSkyStore((s) => s.selectedRoverId);
  const setSelectedRoverId = useSkyStore((s) => s.setSelectedRoverId);
  const roverPositions = useSkyStore((s) => s.roverPositions);
  const fetchRoverPositions = useSkyStore((s) => s.fetchRoverPositions);

  // Fetch les positions une fois au montage
  useEffect(() => {
    fetchRoverPositions();
  }, [fetchRoverPositions]);

  // Merge positions dynamiques (backend) avec métadonnées statiques (client)
  const rovers: RoverFull[] = useMemo(() => {
    if (roverPositions.length === 0) return MARS_ROVERS;

    return roverPositions.map((pos) => {
      const meta = ROVER_METADATA[pos.slug];
      return {
        id: pos.slug,
        lat: pos.latitude,
        lon: pos.longitude,
        ...(meta ?? {
          name: pos.name,
          agency: pos.agency,
          active: pos.active,
          landingSite: pos.landingSite,
          missionStart: "",
          missionEnd: null,
          description: "",
          color: "#888",
          galleryUrl: null,
        }),
      };
    });
  }, [roverPositions]);

  return (
    <>
      {rovers.map((rover) => (
        <RoverMarker
          key={rover.id}
          rover={rover}
          isSelected={selectedRoverId === rover.id}
          onSelect={setSelectedRoverId}
        />
      ))}
    </>
  );
}
