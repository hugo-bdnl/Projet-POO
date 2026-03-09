import * as THREE from "three";

/**
 * Matérial custom utilisant onBeforeCompile pour injecter la logique
 * de terminateur Jour/Nuit basée sur la direction du Soleil, 
 * tout en conservant le support natif PBR de Three.js (Normal, Specular).
 */
export function applyDayNightTerminator(shader: any) {
    // On déclare l'uniform uSunDirection. On l'initialise avec une valeur par défaut.
    // Lors de l'update dans Globe.tsx, il faudra mettre à jour cette valeur.
    shader.uniforms.uSunDirection = { value: new THREE.Vector3(1, 0, 0) };

    // --- VERTEX SHADER ---
    // On récupère la normale dans l'espace "monde" pour pouvoir la comparer
    // avec la direction du soleil (qui sera aussi en espace monde).
    shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
    #include <common>
    varying vec3 vWorldNormalTerminator;
    `
    );

    shader.vertexShader = shader.vertexShader.replace(
        "#include <beginnormal_vertex>",
        `
    #include <beginnormal_vertex>
    // transform normal to world space
    vWorldNormalTerminator = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);
    `
    );

    // --- FRAGMENT SHADER ---
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
    #include <common>
    uniform vec3 uSunDirection;
    varying vec3 vWorldNormalTerminator;
    `
    );

    // On se greffe à la fin du bloc "emissivemap_fragment" car c'est là 
    // que Three.js a fini de calculer diffuseColor et s'apprête à calculer totalEmissiveRadiance.
    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `
    #include <emissivemap_fragment>
    
    // Calcul de l'intensité du rendu jour en fonction de la normale et du soleil
    // dot = 1 (Soleil zénith), dot = 0 (Crépuscule), dot = -1 (Pleine nuit)
    float sunDot = dot(normalize(vWorldNormalTerminator), normalize(uSunDirection));
    
    // Zone de pénombre douce (smoothstep) autour du crépuscule
    float dayIntensity = smoothstep(-0.15, 0.15, sunDot);
    
    // Nuit: l'inverse du jour
    float nightIntensity = 1.0 - dayIntensity;
    
    // 1. Atténuation de la texture de base (Jour) du côté sombre pour 
    // l'empêcher d'être éclairée par l'ambientLight.
    // On conserve un tout petit peu de visibilité au lieu de 0.0 (ex: 0.02)
    diffuseColor.rgb *= (dayIntensity + 0.02);
    
    // 2. Apparition des lumières des villes (Émissive) uniquement la nuit
    // L'emissive map est en fait la night map dans notre cas.
    totalEmissiveRadiance *= nightIntensity;
    `
    );
}
