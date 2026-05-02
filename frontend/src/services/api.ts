import axios from "axios";
import type {
  ObservationPoint,
  VisibleStar,
  ConstellationListItem,
  ConstellationDetail,
  BestLocation,
} from "../types";
import type { RoverPosition } from "../types/rovers";
import type { SatelliteTLEResponse } from "../types/satellite";

// URL de base : variable d'env en prod déployée, sinon URL relative vide pour
// que les appels /api/* passent par le proxy Vite (dev port 5173 / preview port 4173)
const API_URL = import.meta.env.VITE_API_URL || "";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const astronomyService = {
  /**
   * Récupère la liste des 50 points d'observation.
   */
  getObservationPoints: async (): Promise<ObservationPoint[]> => {
    const response = await apiClient.get<ObservationPoint[]>(
      "/api/observation-points",
    );
    return response.data;
  },

  /**
   * Récupère les étoiles visibles depuis des coordonnées spécifiques (lat/lon).
   * @param timestamp Date optionnelle au format ISO string.
   */
  getVisibleStars: async (
    lat: number,
    lon: number,
    timestamp?: string,
    magLimit: number = 5,
  ): Promise<VisibleStar[]> => {
    const params: Record<string, string | number> = {
      lat,
      lon,
      mag_limit: magLimit,
    };
    if (timestamp) params.timestamp = timestamp;

    const response = await apiClient.get<VisibleStar[]>("/api/stars/visible", {
      params,
    });
    return response.data;
  },

  /**
   * Récupère la liste des 88 constellations
   */
  getConstellations: async (): Promise<ConstellationListItem[]> => {
    const response = await apiClient.get<ConstellationListItem[]>(
      "/api/constellations",
    );
    return response.data;
  },

  /**
   * Recherche de constellations par nom
   */
  searchConstellations: async (q: string): Promise<ConstellationListItem[]> => {
    const response = await apiClient.get<ConstellationListItem[]>(
      "/api/constellations/search",
      { params: { q } },
    );
    return response.data;
  },

  /**
   * Récupère les détails et pattern géométrique d'une constellation
   */
  getConstellation: async (id: number): Promise<ConstellationDetail> => {
    const response = await apiClient.get<ConstellationDetail>(
      `/api/constellations/${id}`,
    );
    return response.data;
  },

  /**
   * Trouve le meilleur point d'observation sur Terre pour une constellation
   */
  getBestLocation: async (
    id: number,
    timestamp?: string,
  ): Promise<BestLocation> => {
    const params: Record<string, string> = {};
    if (timestamp) params.timestamp = timestamp;

    const response = await apiClient.get<BestLocation>(
      `/api/constellations/${id}/best-location`,
      { params },
    );
    return response.data;
  },

  /**
   * Récupère les positions de tous les rovers martiens.
   */
  getRoverPositions: async (): Promise<RoverPosition[]> => {
    const response = await apiClient.get<{
      rovers: RoverPosition[];
      total: number;
    }>("/api/rovers/positions");
    return response.data.rovers;
  },

  /**
   * Récupère les TLE d'un groupe de satellites depuis le proxy CelesTrak.
   */
  getSatelliteTLEs: async (group: string): Promise<SatelliteTLEResponse> => {
    const response = await apiClient.get<SatelliteTLEResponse>(
      "/api/satellites/tle",
      { params: { group } },
    );
    return response.data;
  },
};
