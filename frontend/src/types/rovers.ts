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
  /** Lien vers la galerie photos officielle */
  galleryUrl: string | null;
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
    galleryUrl: "https://mars.nasa.gov/msl/multimedia/raw-images/",
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
    galleryUrl: "https://mars.nasa.gov/mars2020/multimedia/raw-images/",
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
    galleryUrl: "https://mars.nasa.gov/mer/gallery/all/opportunity.html",
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
    galleryUrl: "https://mars.nasa.gov/mer/gallery/all/spirit.html",
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
    galleryUrl: null,
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
