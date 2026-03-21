import type { PlanetId } from "./planets";

export interface MoonData {
  id: string;
  name: string;
  planetId: PlanetId;
  radiusKm: number;
  semiMajorAxisKm: number;
  /** Période orbitale en jours. Négatif = orbite rétrograde (Triton) */
  periodDays: number;
  /** Inclinaison orbitale en degrés */
  inclination: number;
  texturePath: string;
  description: string;
}

export const MOONS_DATA: MoonData[] = [
  // ── Terre ────────────────────────────────────────────────────────────────
  {
    id: "moon",
    name: "Lune",
    planetId: "earth",
    radiusKm: 1737,
    semiMajorAxisKm: 384400,
    periodDays: 27.32,
    inclination: 5.1,
    texturePath: "/textures/moons/8k_moon.webp",
    description: "Le seul satellite naturel de la Terre. Stabilise l'axe de rotation terrestre et génère les marées.",
  },

  // ── Mars ─────────────────────────────────────────────────────────────────
  {
    id: "phobos",
    name: "Phobos",
    planetId: "mars",
    radiusKm: 11,
    semiMajorAxisKm: 9376,
    periodDays: 0.319,
    inclination: 1.1,
    texturePath: "/textures/moons/phobos.webp",
    description: "La plus grande lune de Mars. Elle orbite si près que les marées la rapprochent de 2 cm/an — elle finira par s'écraser dans ~50 millions d'années.",
  },
  {
    id: "deimos",
    name: "Deimos",
    planetId: "mars",
    radiusKm: 6,
    semiMajorAxisKm: 23463,
    periodDays: 1.263,
    inclination: 1.8,
    texturePath: "/textures/moons/deimos.webp",
    description: "La plus petite et la plus éloignée des deux lunes de Mars. Sa surface est recouverte d'une épaisse couche de régolithe.",
  },

  // ── Jupiter — lunes galiléennes ───────────────────────────────────────────
  {
    id: "io",
    name: "Io",
    planetId: "jupiter",
    radiusKm: 1821,
    semiMajorAxisKm: 421800,
    periodDays: 1.769,
    inclination: 0.05,
    texturePath: "/textures/moons/Io.webp",
    description: "Le corps le plus volcaniquement actif du système solaire. Les forces de marée de Jupiter alimentent des centaines de volcans.",
  },
  {
    id: "europa",
    name: "Europa",
    planetId: "jupiter",
    radiusKm: 1560,
    semiMajorAxisKm: 671100,
    periodDays: 3.551,
    inclination: 0.47,
    texturePath: "/textures/moons/Europa.webp",
    description: "Sa croûte de glace recouvre un océan liquide de ~100 km de profondeur. L'un des candidats les plus prometteurs pour la vie extraterrestre.",
  },
  {
    id: "ganymede",
    name: "Ganymède",
    planetId: "jupiter",
    radiusKm: 2634,
    semiMajorAxisKm: 1070400,
    periodDays: 7.155,
    inclination: 0.20,
    texturePath: "/textures/moons/ganymede.webp",
    description: "La plus grande lune du système solaire — plus grande que Mercure. Possède son propre champ magnétique.",
  },
  {
    id: "callisto",
    name: "Callisto",
    planetId: "jupiter",
    radiusKm: 2410,
    semiMajorAxisKm: 1882700,
    periodDays: 16.69,
    inclination: 0.19,
    texturePath: "/textures/moons/Callisto.webp",
    description: "La surface la plus cratérisée du système solaire — aucune activité géologique depuis des milliards d'années.",
  },

  // ── Saturne ───────────────────────────────────────────────────────────────
  {
    id: "enceladus",
    name: "Encelade",
    planetId: "saturn",
    radiusKm: 252,
    semiMajorAxisKm: 238020,
    periodDays: 1.370,
    inclination: 0.02,
    texturePath: "/textures/moons/enceladus.webp",
    description: "Envoie des geysers de vapeur d'eau dans l'espace, alimentant l'anneau E de Saturne. Un océan liquide chaud se cache sous sa surface de glace.",
  },
  {
    id: "tethys",
    name: "Téthys",
    planetId: "saturn",
    radiusKm: 531,
    semiMajorAxisKm: 294619,
    periodDays: 1.888,
    inclination: 1.09,
    texturePath: "/textures/moons/thetys.webp",
    description: "Quasi entièrement composée de glace d'eau. Marquée par un énorme cratère (Odysseus) et un canyon (Ithaca Chasma) qui en fait presque le tour.",
  },
  {
    id: "dione",
    name: "Dioné",
    planetId: "saturn",
    radiusKm: 561,
    semiMajorAxisKm: 377396,
    periodDays: 2.737,
    inclination: 0.02,
    texturePath: "/textures/moons/dione.webp",
    description: "Lune glacée avec des falaises de glace atteignant des centaines de mètres. Possède peut-être un océan souterrain.",
  },
  {
    id: "rhea",
    name: "Rhéa",
    planetId: "saturn",
    radiusKm: 763,
    semiMajorAxisKm: 527108,
    periodDays: 4.518,
    inclination: 0.35,
    texturePath: "/textures/moons/rhea.webp",
    description: "Deuxième plus grande lune de Saturne. Sa surface glacée porte des traces d'une ancienne activité tectonique.",
  },
  {
    id: "titan",
    name: "Titan",
    planetId: "saturn",
    radiusKm: 2574,
    semiMajorAxisKm: 1221831,
    periodDays: 15.95,
    inclination: 0.33,
    texturePath: "/textures/moons/Titan.webp",
    description: "Seul satellite avec une atmosphère dense (N₂ + méthane). Possède des lacs et rivières de méthane liquide — une chimie prébiotique unique.",
  },

  // ── Uranus ────────────────────────────────────────────────────────────────
  {
    id: "miranda",
    name: "Miranda",
    planetId: "uranus",
    radiusKm: 236,
    semiMajorAxisKm: 129900,
    periodDays: 1.413,
    inclination: 4.34,
    texturePath: "/textures/moons/miranda.webp",
    description: "Terrain chaotique extrême : falaises de 20 km de haut, canyons et terrasses côte à côte. Probablement fracturée et ré-assemblée après un impact.",
  },
  {
    id: "ariel",
    name: "Ariel",
    planetId: "uranus",
    radiusKm: 579,
    semiMajorAxisKm: 190900,
    periodDays: 2.520,
    inclination: 0.04,
    texturePath: "/textures/moons/ariel.webp",
    description: "Surface la plus jeune des grandes lunes d'Uranus. Marquée par des vallées profondes et des plaines lisses issus d'une ancienne activité.",
  },
  {
    id: "umbriel",
    name: "Umbriel",
    planetId: "uranus",
    radiusKm: 585,
    semiMajorAxisKm: 266000,
    periodDays: 4.144,
    inclination: 0.13,
    texturePath: "/textures/moons/umbriel.webp",
    description: "La plus sombre des lunes d'Uranus. Sa surface ancienne et peu modifiée contraste avec un mystérieux anneau brillant (Wunda) en son pôle.",
  },
  {
    id: "titania",
    name: "Titania",
    planetId: "uranus",
    radiusKm: 789,
    semiMajorAxisKm: 436300,
    periodDays: 8.706,
    inclination: 0.08,
    texturePath: "/textures/moons/titania.webp",
    description: "La plus grande lune d'Uranus. Parcourue de failles géantes et de canyons suggérant une expansion interne passée.",
  },
  {
    id: "oberon",
    name: "Obéron",
    planetId: "uranus",
    radiusKm: 761,
    semiMajorAxisKm: 583500,
    periodDays: 13.46,
    inclination: 0.07,
    texturePath: "/textures/moons/oberon.webp",
    description: "La lune la plus éloignée d'Uranus parmi les grandes. Sa surface cratérisée est parsemée de dépôts sombres d'origine inconnue.",
  },

  // ── Neptune ───────────────────────────────────────────────────────────────
  {
    id: "triton",
    name: "Triton",
    planetId: "neptune",
    radiusKm: 1353,
    semiMajorAxisKm: 354759,
    // Négatif = orbite rétrograde
    periodDays: -5.877,
    inclination: 157,
    texturePath: "/textures/moons/triton.webp",
    description: "Orbite rétrograde — certitude qu'il a été capturé depuis la Ceinture de Kuiper. Ses geysers d'azote actifs en font un monde géologiquement vivant.",
  },
];

/** Retourne les lunes d'une planète donnée */
export function getMoonsForPlanet(planetId: PlanetId): MoonData[] {
  return MOONS_DATA.filter((m) => m.planetId === planetId);
}
