/** Groupes de satellites disponibles depuis CelesTrak */
export type SatelliteGroup =
  | "stations"
  | "starlink"
  | "gps-ops"
  | "weather"
  | "resource"
  | "science"
  | "galileo"
  | "active";

/** TLE brut d'un satellite */
export interface SatelliteTLE {
  name: string;
  line1: string;
  line2: string;
}

/** Réponse de l'API /api/satellites/tle */
export interface SatelliteTLEResponse {
  group: string;
  count: number;
  satellites: SatelliteTLE[];
}

/** Infos calculées en temps réel pour un satellite sélectionné */
export interface SatelliteLiveInfo {
  name: string;
  group: SatelliteGroup;
  latitude_deg: number;
  longitude_deg: number;
  altitude_km: number;
  speed_kmh: number;
  inclination_deg: number;
  period_min: number;
  norad_id: string;
}

/** Métadonnées d'affichage par groupe */
export interface SatelliteGroupMeta {
  label: string;
  color: string;
  description: string;
}

/** Métadonnées visuelles de chaque groupe */
export const SATELLITE_GROUP_META: Record<SatelliteGroup, SatelliteGroupMeta> = {
  stations: {
    label: "Stations",
    color: "#00ffcc",
    description: "Stations spatiales (ISS, Tiangong...)",
  },
  starlink: {
    label: "Starlink",
    color: "#4488ff",
    description: "Constellation Starlink (SpaceX)",
  },
  "gps-ops": {
    label: "GPS",
    color: "#44ff44",
    description: "Satellites de navigation GPS",
  },
  weather: {
    label: "Météo",
    color: "#ffcc00",
    description: "Satellites météorologiques",
  },
  resource: {
    label: "Ressources",
    color: "#ff8844",
    description: "Satellites d'observation des ressources",
  },
  science: {
    label: "Science",
    color: "#cc88ff",
    description: "Satellites scientifiques",
  },
  galileo: {
    label: "Galileo",
    color: "#88ddff",
    description: "Constellation Galileo (Europe)",
  },
  active: {
    label: "Tous actifs",
    color: "#ff9900",
    description: "Tous les satellites actifs (~6000)",
  },
};
