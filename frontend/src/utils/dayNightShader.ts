/**
 * Shaders customisés pour three-custom-shader-material
 * Gère le terminateur Jour/Nuit basé sur la direction du Soleil,
 * en conservant le support natif PBR de Three.js (Normal, Specular).
 */

export const dayNightVertexShader = `
varying vec3 vWorldNormalTerminator;

void main() {
    // Calcul de la normale dans l'espace monde pour le fragment shader
    vWorldNormalTerminator = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
}
`;

export const dayNightFragmentShader = `
uniform vec3 uSunDirection;
varying vec3 vWorldNormalTerminator;

void main() {
    // Calcul de l'intensité du rendu jour en fonction de la normale et du soleil
    // dot = 1 (Soleil zénith), dot = 0 (Crépuscule), dot = -1 (Pleine nuit)
    float sunDot = dot(normalize(vWorldNormalTerminator), normalize(uSunDirection));
    
    // Zone de pénombre douce (smoothstep) autour du crépuscule
    float dayIntensity = smoothstep(-0.05, 0.2, sunDot);
    
    // Nuit: l'inverse du jour
    float nightIntensity = 1.0 - dayIntensity;
    
    // 1. Atténuation de la texture de base (Jour) du côté sombre pour 
    // l'empêcher d'être éclairée par l'ambientLight.
    // On met à 0.0 pour une nuit noire (plus de diffusion ambient sur la face cachée)
    csm_DiffuseColor.rgb *= dayIntensity;
    
    // 2. Apparition des lumières des villes (Émissive) uniquement la nuit
    // L'emissive map est en fait la night map dans notre cas.
    // Filtrage Luma ("Brightness") plus agressif avec un smoothstep
    float luma = dot(csm_Emissive, vec3(0.299, 0.587, 0.114));
    
    // cityMask vaut 0 pour les zones sombres (terres/océans), monte jusqu'à 1 pour les lumières vives
    // En remontant le seuil bas à 0.2, on élimine le voile lumineux résiduel sur les océans
    float cityMask = smoothstep(0.2, 0.5, luma);
    
    // On booste l'intensité de ces villes (x 1.5) pour qu'elles ressortent bien
    csm_Emissive = csm_Emissive * cityMask * 1.5;

    // Appliquer l'intensité nuit en baissant le multiplicateur global (0.25 au lieu de 0.4) 
    // pour garder un côté sombre très profond
    csm_Emissive *= nightIntensity * 0.25;
}
`;
