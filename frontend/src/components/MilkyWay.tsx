import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { SKY_RADIUS } from "../utils/skyCoords";

/**
 * Dôme de la Voie Lactée — sphère céleste inversée.
 *
 * Clés anti-étirement :
 *  - `THREE.BackSide` : le matériau est rendu depuis l'intérieur
 *  - 64×64 segments : évite les facettes et la distorsion polygonale aux pôles
 *  - `rotation.z` corrige l'inclinaison du plan galactique par rapport à l'équateur céleste (~62°)
 *
 * La texture ESO eso0932a est une équirectangulaire 6000×3000 (ratio 2:1) — format parfait.
 *
 * Le plan de découpe `horizonPlane` clip la moitié inférieure de la sphère (y < 0)
 * afin que la voie lactée ne soit jamais visible quand on regarde vers le sol.
 * Nécessite `localClippingEnabled: true` sur le Canvas (App.tsx).
 */

// Inclinaison galactique : le plan de la Voie Lactée est incliné ~62° par rapport
// à l'équateur céleste. On tourne la sphère pour que la bande galactique soit au bon endroit.
const GALACTIC_TILT_RAD = (62 * Math.PI) / 180;

// Plan de découpe en espace monde : ne garder que y >= 0 (au-dessus de l'horizon)
const HORIZON_CLIP_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export function MilkyWay() {
  const texture = useTexture("/textures/milkyway.jpg");

  // Configuration de la texture pour éviter les artefacts
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  const clippingPlanes = useMemo(() => [HORIZON_CLIP_PLANE], []);

  return (
    <mesh rotation={[0, 0, GALACTIC_TILT_RAD]} renderOrder={-1}>
      {/*
        - SKY_RADIUS * 0.98 : légèrement en retrait des étoiles pour éviter le z-fighting
        - 64, 64 segments : assez de polygones pour que les pôles soient "ronds" et non facettés
      */}
      <sphereGeometry args={[SKY_RADIUS * 0.98, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        color="#d1d1d1ff"
        depthWrite={false}
        toneMapped={false}
        opacity={0.15}
        transparent
        clippingPlanes={clippingPlanes}
      />
    </mesh>
  );
}
