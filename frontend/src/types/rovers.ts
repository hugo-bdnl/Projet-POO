/** Métadonnées statiques d'un rover martien (côté client). */
export interface RoverMetadata {
  id: string;
  name: string;
  agency: string;
  active: boolean;
  landingSite: string;
  missionStart: string;
  /** null = mission en cours */
  missionEnd: string | null;
  description: string;
  /** Couleur hex du marker 3D */
  color: string;
  /** Chemin vers le modèle GLTF (optionnel, placeholder si absent) */
  modelPath?: string;
  /** Photos statiques (optionnel, placeholder si absent) */
  photos?: RoverPhoto[];
}

/** Photo statique d'un rover */
export interface RoverPhoto {
  src: string;
  caption: string;
  date?: string;
}

/** Position dynamique d'un rover (depuis le backend) */
export interface RoverPosition {
  slug: string;
  name: string;
  agency: string;
  active: boolean;
  latitude: number;
  longitude: number;
  landingSite: string;
}

/** Métadonnées enrichies = statique + position dynamique */
export interface RoverFull extends RoverMetadata {
  lat: number;
  lon: number;
}

/**
 * Métadonnées statiques des 5 rovers.
 * Les positions (lat/lon) viennent du backend et sont mergées au runtime.
 */
export const ROVER_METADATA: Record<string, Omit<RoverMetadata, "id">> = {
  curiosity: {
    name: "Curiosity",
    agency: "NASA / MSL",
    active: true,
    landingSite: "Gale Crater",
    missionStart: "6 août 2012",
    missionEnd: null,
    description:
      "Rover de taille voiture explorant le cratère Gale depuis 2012. Il a confirmé l'ancienne habitabilité de Mars en détectant des composés organiques et d'anciens lits de rivière.",
    color: "#e8a030",
    modelPath: "/models/Curiosity.glb",
    photos: [
      { src: "/photos/Curiosity/curiosity_1.webp", caption: "Surface du cratère Gale" },
      { src: "/photos/Curiosity/curiosity_2.webp", caption: "Formation rocheuse" },
      { src: "/photos/Curiosity/curiosity_3.webp", caption: "Mont Sharp" },
      { src: "/photos/Curiosity/curiosity_4.webp", caption: "Panorama martien" },
    ],
  },
  perseverance: {
    name: "Perseverance",
    agency: "NASA / Mars 2020",
    active: true,
    landingSite: "Jezero Crater",
    missionStart: "18 février 2021",
    missionEnd: null,
    description:
      "Le rover le plus avancé sur Mars. Il collecte des échantillons de roche pour un futur retour sur Terre et a déployé l'hélicoptère Ingenuity — le premier vol motorisé sur une autre planète.",
    color: "#60c8ff",
    modelPath: "/models/Perseverance.glb",
    photos: [
      { src: "/photos/Perseverance/perseverance_1.webp", caption: "Cratère Jezero" },
      { src: "/photos/Perseverance/perseverance_2.webp", caption: "Dépôt fluviatile" },
      { src: "/photos/Perseverance/perseverance_3.webp", caption: "Ingenuity en vol" },
      { src: "/photos/Perseverance/perseverance_4.webp", caption: "Collecte d'échantillons" },
    ],
  },
  opportunity: {
    name: "Opportunity",
    agency: "NASA / MER-B",
    active: false,
    landingSite: "Endeavour Crater",
    missionStart: "25 janvier 2004",
    missionEnd: "13 février 2019",
    description:
      "Prévu pour 90 sols, Opportunity a opéré pendant 15 ans et parcouru 45 km — un record absolu. Le contact fut définitivement perdu après une tempête de poussière planétaire en 2018.",
    color: "#cc8844",
    modelPath: "/models/Spirit_and_Opportunity.glb",
    photos: [
      { src: "/photos/Opportunity/opportunity_1.webp", caption: "Cratère Endeavour" },
      { src: "/photos/Opportunity/opportunity_2.webp", caption: "Plaines de Meridiani" },
      { src: "/photos/Opportunity/opportunity_3.webp", caption: "Roches sédimentaires" },
      { src: "/photos/Opportunity/opportunity_4.webp", caption: "Traces de roues" },
    ],
  },
  spirit: {
    name: "Spirit",
    agency: "NASA / MER-A",
    active: false,
    landingSite: "Columbia Hills",
    missionStart: "4 janvier 2004",
    missionEnd: "22 mars 2010",
    description:
      "Jumeau d'Opportunity, Spirit s'est immobilisé dans du sol mou en 2009. Sans pouvoir se repositionner pour profiter du soleil, il n'a pas survécu à l'hiver martien.",
    color: "#cc8844",
    modelPath: "/models/Spirit_and_Opportunity.glb",
    photos: [
      { src: "/photos/Spirit/spirit_1.webp", caption: "Columbia Hills" },
      { src: "/photos/Spirit/spirit_2.webp", caption: "Cratère Bonneville" },
      { src: "/photos/Spirit/spirit_3.webp", caption: "Home Plate" },
      { src: "/photos/Spirit/spirit_4.webp", caption: "Sol martien" },
    ],
  },
  zhurong: {
    name: "Zhurong",
    agency: "CNSA",
    active: false,
    landingSite: "Utopia Planitia",
    missionStart: "22 mai 2021",
    missionEnd: "~mai 2022",
    description:
      "Premier rover martien chinois. En hibernation depuis mai 2022, il n'a pas pu se réveiller comme prévu après l'hiver martien. Son état actuel reste incertain.",
    color: "#cc4444",
    // Pas de modèle 3D disponible gratuitement
    photos: [
      { src: "/photos/Zhurong/zhurong_1.webp", caption: "Utopia Planitia" },
      { src: "/photos/Zhurong/zhurong_2.webp", caption: "Site d'atterrissage" },
      { src: "/photos/Zhurong/zhurong_3.webp", caption: "Surface martienne" },
      { src: "/photos/Zhurong/zhurong_4.webp", caption: "Panorama" },
    ],
  },
};

/** Positions fallback (dupliquées du backend seed) */
const _DEFAULT_POSITIONS: Record<string, { lat: number; lon: number }> = {
  curiosity: { lat: -4.6, lon: 137.4 },
  perseverance: { lat: 18.4, lon: 77.4 },
  opportunity: { lat: -1.9, lon: 354.5 },
  spirit: { lat: -14.6, lon: 175.5 },
  zhurong: { lat: 25.1, lon: 109.9 },
};

/**
 * Ancien export de compatibilité pour MarsRovers.tsx.
 * Positions par défaut (fallback si backend indisponible).
 */
export const MARS_ROVERS: RoverFull[] = Object.entries(ROVER_METADATA).map(
  ([id, meta]) => ({
    id,
    ...meta,
    lat: _DEFAULT_POSITIONS[id]?.lat ?? 0,
    lon: _DEFAULT_POSITIONS[id]?.lon ?? 0,
  }),
);
