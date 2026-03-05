import { create } from "zustand";
import type { VisibleStar } from "../types";
import { astronomyService } from "../services/api";

type ViewMode = "globe" | "sky";

interface SkyState {
  viewMode: ViewMode;
  timestamp: string | undefined;
  stars: VisibleStar[];
  loadingStars: boolean;
  hoveredStar: VisibleStar | null;
  selectedStar: VisibleStar | null;
  error: string | null;

  setViewMode: (mode: ViewMode) => void;
  setTimestamp: (iso: string) => void;
  fetchVisibleStars: (
    lat: number,
    lon: number,
    timestamp?: string,
  ) => Promise<void>;
  setHoveredStar: (star: VisibleStar | null) => void;
  setSelectedStar: (star: VisibleStar | null) => void;
  cameraTarget: [number, number, number] | null;
  setCameraTarget: (target: [number, number, number] | null) => void;
  showAzAltGrid: boolean;
  toggleAzAltGrid: () => void;
}

export const useSkyStore = create<SkyState>((set) => ({
  viewMode: "globe",
  timestamp: undefined,
  stars: [],
  loadingStars: false,
  hoveredStar: null,
  selectedStar: null,
  error: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setTimestamp: (iso) => set({ timestamp: iso }),

  fetchVisibleStars: async (lat, lon, timestamp) => {
    set({ loadingStars: true, error: null });
    try {
      const data = await astronomyService.getVisibleStars(lat, lon, timestamp);
      set({ stars: data, loadingStars: false });
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors de la récupération des étoiles",
        loadingStars: false,
      });
      console.error("Échec de fetchVisibleStars:", err);
    }
  },

  setHoveredStar: (star) => set({ hoveredStar: star }),
  setSelectedStar: (star) => set({ selectedStar: star }),

  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),

  showAzAltGrid: false,
  toggleAzAltGrid: () => set((s) => ({ showAzAltGrid: !s.showAzAltGrid })),
}));
