import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useObservationStore } from "../stores/useObservationStore";

// Nous devons recevoir l'objet complet pour l'envoyer au Store
interface LocationMarkerProps {
  id: number;
  lat: number;
  lon: number;
  name?: string;
  timezone?: string;
  radius?: number; // Rayon de la sphère terrestre (par défaut 1)
}

// Vecteurs d'échelle pré-alloués (évite l'instanciation dans la boucle de rendu useFrame)
const SCALE_HOVERED = new THREE.Vector3(1.5, 1.5, 1.5);
const SCALE_NORMAL = new THREE.Vector3(1, 1, 1);

export function LocationMarker({
  id,
  lat,
  lon,
  name = "Point d'observation",
  timezone = "UTC",
  radius = 1,
}: LocationMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);

  // Utilisation du state global pour la sélection
  const { selectedPoint, setSelectedPoint } = useObservationStore();
  const isSelected = selectedPoint?.id === id;

  // Conversion Latitude/Longitude en coordonnées cartésiennes (x, y, z)
  // Formule pour une sphère de rayon `radius`
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  // Animation de scale en fonction du survol ou de la sélection
  // On court-circuite si rien ne se passe (scale déjà normale) pour éviter
  // 50 boucles qui tournent en permanence sans raison
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (hovered || isSelected) {
      meshRef.current.scale.lerp(SCALE_HOVERED, delta * 10);
    } else if (!meshRef.current.scale.equals(SCALE_NORMAL)) {
      meshRef.current.scale.lerp(SCALE_NORMAL, delta * 10);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[x, y, z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Toggle de la sélection
        if (isSelected) {
          setSelectedPoint(null);
        } else {
          setSelectedPoint({
            id,
            name,
            latitude: lat,
            longitude: lon,
            timezone,
          });
        }
      }}
    >
      {/* On utilise une petite sphère comme "pin" principal */}
      <sphereGeometry args={[0.015, 16, 16]} />
      <meshStandardMaterial
        color={isSelected ? "#ff4040" : hovered ? "#ffaa40" : "#40aaff"}
        emissive={isSelected ? "#ff0000" : hovered ? "#ff5500" : "#0055ff"}
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </mesh>
  );
}
