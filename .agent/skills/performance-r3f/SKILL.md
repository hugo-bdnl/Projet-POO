---
name: Performance R3F
description: Normes de performance et d'optimisation pour React Three Fiber (R3F)
---

# Performance R3F — Night Sky Viewer

## Objectif

Garantir une expérience fluide (60 FPS+) en appliquant des optimisations critiques pour React Three Fiber, particulièrement dans les boucles d'animation.

---

## 🚀 Optimisation de la Animation Loop (useFrame)

La fonction `useFrame` s'exécute à chaque rafraîchissement d'écran. Toute inefficacité ici est multipliée par 60 par seconde.

- **INTERDICTION : Pas de `new` dans `useFrame`**
  - Ne jamais instancier d'objets Three.js (`Vector3`, `Matrix4`, `Quaternion`, `Color`, etc.) à l'intérieur de `useFrame`.
  - Cela s'applique aussi aux tableaux `[]` ou aux objets `{}` créés à chaque frame.
  - *Conséquence :* Provoque un "Garbage Collection" (GC) fréquent, entraînant des saccades (stuttering).

- **SOLUTION : Variables persistantes (Scratch variables)**
  - Définir les variables de calcul en dehors du composant ou via `useMemo`.
  - Utiliser des variables "scratch" pour les calculs intermédiaires.

```tsx
// ❌ MAUVAIS : Création d'un nouveau vecteur à chaque frame
useFrame((state) => {
  const vec = new THREE.Vector3(state.clock.elapsedTime, 0, 0); // 🗑️ GC intense !
  meshRef.current.position.copy(vec);
});

// ✅ BON : Réutilisation d'une variable persistante
const scratchVec = new THREE.Vector3(); // Créé une seule fois

function MyComponent() {
  useFrame((state) => {
    scratchVec.set(state.clock.elapsedTime, 0, 0);
    meshRef.current.position.copy(scratchVec);
  });
}
```

---

## ⚛️ React vs Three.js Rendering

- **Éviter le State React pour les animations**
  - Ne pas mettre à jour un `useState` ou `useContext` à l'intérieur de `useFrame` si cela sert uniquement à l'affichage 3D.
  - Utiliser directement les **Refs** (`meshRef.current.position.x = ...`) pour modifier les objets. Les re-renders React sont trop lents pour une boucle à 60 FPS.

- **useMemo & useCallback**
  - Utiliser `useMemo` pour les géométries ou calculs lourds qui ne dépendent pas de la frame.
  - Utiliser `useMemo` pour "isoler" des calculs de vertex complexes.

---

## 📦 Gestion des Ressources (Memory management)

- **Nettoyage (Disposal)**
  - S'assurer que les ressources (géométries, matériaux, textures) sont libérées via `.dispose()` si elles sont créées dynamiquement et ne sont plus utilisées. R3F gère beaucoup de choses automatiquement, mais la vigilance est de mise pour les ressources custom.

- **Re-use (Shared resources)**
  - Partager les géométries et matériaux entre plusieurs meshs quand c'est possible (particulièrement pour les planètes, étoiles, etc.).

---

## 🛠️ Checklist à appliquer

- [ ] Est-ce qu'il y a un `new` caché dans `useFrame` ?
- [ ] Est-ce que les variables de calcul sont réutilisées ?
- [ ] Est-ce que l'on utilise bien les `refs` plutôt que le `state` pour l'animation ?
- [ ] Est-ce que les calculs lourds sont mémorisés avec `useMemo` ?
