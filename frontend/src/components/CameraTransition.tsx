import { useThree, useFrame } from "@react-three/fiber";
import { useSkyStore } from "../stores/useSkyStore";
import * as THREE from "three";

export const CameraTransition = () => {
  const { viewMode } = useSkyStore();
  const { camera } = useThree();

  // On utilise useFrame pour animer la caméra doucement
  useFrame((_, delta) => {
    // Rend l'interpolation linéaire indépendante du framerate avec Math.exp
    const lerpFactor = 1.0 - Math.exp(-3.5 * delta);

    if (viewMode === "sky") {
      // Transition douce vers l'origine (plongée immersive)
      // On se place legèrement sous l'origine, en regardant vers (0,0,0), la vue monte vers le ciel
      camera.position.lerp(new THREE.Vector3(0, -0.15, 0.1), lerpFactor);
    } else {
      // Transition douce vers l'orbite lointaine (vue globe)
      camera.position.lerp(new THREE.Vector3(0, 0, 2.5), lerpFactor);
    }
  });

  return null; // Composant sans rendu (logique pure)
};
