/** Métadonnées statiques d'un rover martien. */
export interface RoverMetadata {
  id: string;
  name: string;
  agency: string;
  active: boolean;
  /** Latitude en degrés (Nord positif) */
  lat: number;
  /** Longitude en degrés (Est positif) */
  lon: number;
  landingSite: string;
  missionStart: string;
  /** null = mission en cours */
  missionEnd: string | null;
  description: string;
  /** Couleur hex du marker 3D */
  color: string;
  /** Lien vers la galerie photos officielle (fallback si API indisponible) */
  galleryUrl: string | null;
}

export const MARS_ROVERS: RoverMetadata[] = [
  {
    id: "curiosity",
    name: "Curiosity",
    agency: "NASA / MSL",
    active: true,
    lat: -4.6,
    lon: 137.4,
    landingSite: "Gale Crater",
    missionStart: "6 août 2012",
    missionEnd: null,
    description:
      "Rover de taille voiture explorant le cratère Gale depuis 2012. Il a confirmé l'ancienne habitabilité de Mars en détectant des composés organiques et d'anciens lits de rivière.",
    color: "#e8a030",
    galleryUrl: "https://mars.nasa.gov/msl/multimedia/raw-images/",
  },
  {
    id: "perseverance",
    name: "Perseverance",
    agency: "NASA / Mars 2020",
    active: true,
    lat: 18.4,
    lon: 77.4,
    landingSite: "Jezero Crater",
    missionStart: "18 février 2021",
    missionEnd: null,
    description:
      "Le rover le plus avancé sur Mars. Il collecte des échantillons de roche pour un futur retour sur Terre et a déployé l'hélicoptère Ingenuity — le premier vol motorisé sur une autre planète.",
    color: "#60c8ff",
    galleryUrl: "https://mars.nasa.gov/mars2020/multimedia/raw-images/",
  },
  {
    id: "opportunity",
    name: "Opportunity",
    agency: "NASA / MER-B",
    active: false,
    lat: -1.9,
    lon: 354.5,
    landingSite: "Endeavour Crater",
    missionStart: "25 janvier 2004",
    missionEnd: "13 février 2019",
    description:
      "Prévu pour 90 sols, Opportunity a opéré pendant 15 ans et parcouru 45 km — un record absolu. Le contact fut définitivement perdu après une tempête de poussière planétaire en 2018.",
    color: "#cc8844",
    galleryUrl: "https://mars.nasa.gov/mer/gallery/all/opportunity.html",
  },
  {
    id: "spirit",
    name: "Spirit",
    agency: "NASA / MER-A",
    active: false,
    lat: -14.6,
    lon: 175.5,
    landingSite: "Columbia Hills",
    missionStart: "4 janvier 2004",
    missionEnd: "22 mars 2010",
    description:
      "Jumeau d'Opportunity, Spirit s'est immobilisé dans du sol mou en 2009. Sans pouvoir se repositionner pour profiter du soleil, il n'a pas survécu à l'hiver martien.",
    color: "#cc8844",
    galleryUrl: "https://mars.nasa.gov/mer/gallery/all/spirit.html",
  },
  {
    id: "zhurong",
    name: "Zhurong",
    agency: "CNSA",
    active: false,
    lat: 25.1,
    lon: 109.9,
    landingSite: "Utopia Planitia",
    missionStart: "22 mai 2021",
    missionEnd: "~mai 2022",
    description:
      "Premier rover martien chinois. En hibernation depuis mai 2022, il n'a pas pu se réveiller comme prévu après l'hiver martien. Son état actuel reste incertain.",
    color: "#cc4444",
    galleryUrl: null,
  },
];
