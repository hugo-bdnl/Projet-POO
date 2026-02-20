import { create } from "zustand";
import type { ObservationPoint } from "../types";
import { astronomyService } from "../services/api";

interface ObservationState {
  points: ObservationPoint[];
  selectedPoint: ObservationPoint | null;
  loading: boolean;
  error: string | null;
  fetchPoints: () => Promise<void>;
  setSelectedPoint: (point: ObservationPoint | null) => void;
}

export const useObservationStore = create<ObservationState>((set) => ({
  points: [],
  selectedPoint: null,
  loading: false,
  error: null,
  fetchPoints: async () => {
    set({ loading: true, error: null });
    try {
      const data = await astronomyService.getObservationPoints();
      set({ points: data, loading: false });
    } catch (err: any) {
      set({
        error:
          err?.message ||
          "Erreur lors de la récupération des points d'observation",
        loading: false,
      });
      console.error("Échec de fetchPoints:", err);
    }
  },
  setSelectedPoint: (point) => set({ selectedPoint: point }),
}));
