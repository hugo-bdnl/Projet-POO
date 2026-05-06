import { create } from "zustand";
import axios from "axios";
import type { ISSTLEData, ISSLiveInfo } from "../types/iss";
import { clearOtherSelections } from "./selectionActions";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface ISSState {
  tleData: ISSTLEData | null;
  isLoading: boolean;
  error: string | null;
  fetchTLE: () => Promise<void>;

  // Live telemetry (updated every second by ISS.tsx)
  issInfo: ISSLiveInfo | null;
  setISSInfo: (info: ISSLiveInfo) => void;

  // Selection state
  selectedISS: boolean;
  setSelectedISS: (v: boolean) => void;
  clearISSSelection: () => void;
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
      set({
        error: "Impossible de charger les données de la Station Spatiale.",
        isLoading: false,
      });
    }
  },

  issInfo: null,
  setISSInfo: (info) =>
    set((s) => ({ issInfo: { ...s.issInfo, ...info } as typeof s.issInfo })),

  selectedISS: false,
  setSelectedISS: (v) => {
    set({ selectedISS: v });
    if (v) clearOtherSelections("iss");
  },
  clearISSSelection: () => set({ selectedISS: false }),
}));
