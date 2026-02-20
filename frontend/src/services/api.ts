import axios from "axios";
import type { ObservationPoint } from "../types";

// L'URL de base est tirée de la variable d'environnement Vite ou via un fallback
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
};
