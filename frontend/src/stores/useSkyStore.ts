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

  // Coordonnées courantes pour pouvoir refetcher
  currentLat: number | null;
  currentLon: number | null;
  magLimit: number;

  setViewMode: (mode: ViewMode) => void;
  setTimestamp: (iso: string) => void;
  fetchVisibleStars: (
    lat: number,
    lon: number,
    timestamp?: string,
  ) => Promise<void>;
  /** Refetch les étoiles avec une nouvelle limite de magnitude (sans changer lat/lon) */
  refetchWithMagLimit: (magLimit: number) => Promise<void>;
  setHoveredStar: (star: VisibleStar | null) => void;
  setSelectedStar: (star: VisibleStar | null) => void;
  cameraTarget: [number, number, number] | null;
  setCameraTarget: (target: [number, number, number] | null) => void;
  showAzAltGrid: boolean;
  toggleAzAltGrid: () => void;
}

export const useSkyStore = create<SkyState>((set, get) => ({
  viewMode: "globe",
  timestamp: undefined,
  stars: [],
  loadingStars: false,
  hoveredStar: null,
  selectedStar: null,
  error: null,
  currentLat: null,
  currentLon: null,
  magLimit: 5,

  setViewMode: (mode) => set({ viewMode: mode }),
  setTimestamp: (iso) => set({ timestamp: iso }),

  fetchVisibleStars: async (lat, lon, timestamp) => {
    set({ loadingStars: true, error: null, currentLat: lat, currentLon: lon });
    try {
      const data = await astronomyService.getVisibleStars(
        lat,
        lon,
        timestamp,
        get().magLimit,
      );
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

  refetchWithMagLimit: async (magLimit) => {
    const { currentLat, currentLon, timestamp } = get();
    if (currentLat === null || currentLon === null) return;
    set({ loadingStars: true, error: null, magLimit });
    try {
      const data = await astronomyService.getVisibleStars(
        currentLat,
        currentLon,
        timestamp,
        magLimit,
      );
      set({ stars: data, loadingStars: false });
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors du refetch des étoiles",
        loadingStars: false,
      });
      console.error("Échec de refetchWithMagLimit:", err);
    }
  },

  setHoveredStar: (star) => set({ hoveredStar: star }),
  setSelectedStar: (star) => set({ selectedStar: star }),

  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),

  showAzAltGrid: false,
  toggleAzAltGrid: () => set((s) => ({ showAzAltGrid: !s.showAzAltGrid })),
}));
