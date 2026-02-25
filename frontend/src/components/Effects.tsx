import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export const Effects = () => {
  const gl = useThree((state) => state.gl);

  // Sauvegarder l'état du renderer au montage, le restaurer au démontage
  // pour éviter la dégradation cumulative de luminosité
  useEffect(() => {
    const prevToneMapping = gl.toneMapping;
    const prevToneMappingExposure = gl.toneMappingExposure;
    return () => {
      gl.toneMapping = prevToneMapping;
      gl.toneMappingExposure = prevToneMappingExposure;
    };
  }, [gl]);

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.5}
        luminanceSmoothing={0.9}
        intensity={0.8}
      />
    </EffectComposer>
  );
};
