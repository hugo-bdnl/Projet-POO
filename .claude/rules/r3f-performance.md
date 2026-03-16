---
description: Règles de performance React Three Fiber — appliquées à tout code touchant useFrame, composants 3D ou shaders
globs: ["frontend/src/**/*.tsx", "frontend/src/**/*.ts"]
---

# Performance React Three Fiber

## useFrame — zone critique (60 appels/s)

### Interdit dans useFrame
- `new THREE.Vector3()`, `new THREE.Matrix4()`, `new THREE.Color()` ou tout `new` Three.js
- Création de tableaux `[]` ou objets `{}`
- Appels à `useState` setters (provoque re-render React à 60fps)
- Appels réseau ou calculs lourds non throttlés

### Obligatoire
- Variables de calcul **pré-allouées** hors du composant (scratch variables)
- Mutations directes via **refs** (`meshRef.current.position.x = ...`)
- Calculs lourds dans `useMemo` ou throttlés (ex: `astronomia` → 1 calcul/seconde max)

```tsx
// Pattern correct
const _vec = new THREE.Vector3();  // scratch, hors composant

function MyComp() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    _vec.set(state.clock.elapsedTime, 0, 0);
    ref.current!.position.copy(_vec);
  });
}
```

## Ressources GPU

- Partager géométries/matériaux entre meshes similaires (planètes, étoiles)
- Textures en WebP, résolution adaptée au cas d'usage (2K pour vue lointaine, 4K+ pour zoom)
- LOD : réduire les segments de sphère pour objets lointains (Uranus/Neptune → 16 segments)
- `dispose()` les ressources custom quand elles ne sont plus utilisées

## React vs Three.js

- Animation → **refs**, jamais `useState`
- Données calculées une fois → `useMemo`
- `useTexture.preload()` pour le chargement anticipé en arrière-plan
