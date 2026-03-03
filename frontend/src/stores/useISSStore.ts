import { create } from "zustand";
import axios from "axios";
import type { ISSTLEData } from "../types/iss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ISSState {
  tleData: ISSTLEData | null;
  isLoading: boolean;
  error: string | null;
  fetchTLE: () => Promise<void>;
}

export const useISSStore = create<ISSState>((set) => ({
  tleData: null,
  isLoading: false,
  error: null,

  fetchTLE: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get<ISSTLEData>(`${API_URL}/api/iss/tle`);
      set({ tleData: response.data, isLoading: false });
    } catch (err) {
      console.error("Failed to fetch ISS TLE details:", err);
      // We don't want to crash the app if ISS tracking fails, just show a silent error or no ISS
      set({
        error: "Impossible de charger les données de la Station Spatiale.",
        isLoading: false,
      });
    }
  },
}));
