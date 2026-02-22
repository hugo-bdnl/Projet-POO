import { EffectComposer, Bloom } from "@react-three/postprocessing";

export const Effects = () => {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.5}
        luminanceSmoothing={0.9}
        intensity={1.5}
        mipmapBlur
      />
    </EffectComposer>
  );
};
