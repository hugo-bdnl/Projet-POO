import { create } from "zustand";
import type { VisibleStar } from "../types";
import { astronomyService } from "../services/api";

type ViewMode = "globe" | "sky" | "system";

interface SkyState {
  viewMode: ViewMode;
  timestamp: string | undefined;
  baseTimestamp: string | undefined;
  stars: VisibleStar[];
  /** Étoiles du pattern de constellation absentes de stars[] (mag > 5) */
  constellationExtraStars: VisibleStar[];
  loadingStars: boolean;
  hoveredStar: VisibleStar | null;
  selectedStar: VisibleStar | null;
  selectedPlanet: import("../types/planets").PlanetId | null;
  error: string | null;

  // Coordonnées courantes pour pouvoir fetcher les extras
  currentLat: number | null;
  currentLon: number | null;

  setViewMode: (mode: ViewMode) => void;
  setTimestamp: (iso: string) => void;
  fetchVisibleStars: (
    lat: number,
    lon: number,
    timestamp?: string,
  ) => Promise<void>;
  /**
   * Fetche uniquement les étoiles manquantes pour le pattern d'une constellation.
   * Ne modifie PAS stars[] — stocke le résultat dans constellationExtraStars.
   */
  fetchConstellationExtras: (patternHipIds: Set<number>) => Promise<void>;
  /** Vide les étoiles supplémentaires lors de la déselection */
  clearConstellationExtras: () => void;
  setHoveredStar: (star: VisibleStar | null) => void;
  setSelectedStar: (star: VisibleStar | null) => void;
  setSelectedPlanet: (planet: import("../types/planets").PlanetId | null) => void;
  cameraTarget: [number, number, number] | null;
  setCameraTarget: (target: [number, number, number] | null) => void;
  showAzAltGrid: boolean;
  toggleAzAltGrid: () => void;
}

export const useSkyStore = create<SkyState>((set, get) => ({
  viewMode: "system",
  timestamp: undefined,
  baseTimestamp: undefined,
  stars: [],
  constellationExtraStars: [],
  loadingStars: false,
  hoveredStar: null,
  selectedStar: null,
  selectedPlanet: null,
  error: null,
  currentLat: null,
  currentLon: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setTimestamp: (iso) => set({ timestamp: iso }),

  fetchVisibleStars: async (lat, lon, timestamp) => {
    set({ loadingStars: true, error: null, currentLat: lat, currentLon: lon });
    try {
      const data = await astronomyService.getVisibleStars(lat, lon, timestamp);
      const fetchedTime = timestamp || new Date().toISOString();
      set({ stars: data, loadingStars: false, baseTimestamp: fetchedTime });
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

  fetchConstellationExtras: async (patternHipIds) => {
    const { currentLat, currentLon, timestamp, stars } = get();
    console.log("[DEBUG] fetchConstellationExtras called", {
      patternHipIds: [...patternHipIds],
      currentLat,
      currentLon,
      starsCount: stars.length,
    });

    if (
      currentLat === null ||
      currentLon === null ||
      patternHipIds.size === 0
    ) {
      console.log("[DEBUG] Early return: missing lat/lon or hipIds");
      return;
    }

    const alreadyLoaded = new Set(
      stars.filter((s) => s.hip_id !== null).map((s) => s.hip_id!),
    );

    const missingHipIds = [...patternHipIds].filter(
      (id) => !alreadyLoaded.has(id),
    );
    console.log("[DEBUG] Missing hip_ids:", missingHipIds);

    if (missingHipIds.length === 0) {
      console.log(
        "[DEBUG] All pattern stars already in stars[], no extras needed",
      );
      return;
    }

    try {
      const allBright = await astronomyService.getVisibleStars(
        currentLat,
        currentLon,
        timestamp,
        8,
      );
      console.log(
        "[DEBUG] Fetched with mag_limit=8:",
        allBright.length,
        "stars",
      );

      const extras = allBright.filter(
        (s) =>
          s.hip_id !== null &&
          patternHipIds.has(s.hip_id) &&
          !alreadyLoaded.has(s.hip_id),
      );
      console.log(
        "[DEBUG] Extras found:",
        extras.map((s) => ({ hip_id: s.hip_id, mag: s.magnitude })),
      );
      set({ constellationExtraStars: extras });
    } catch (err) {
      console.error("Échec de fetchConstellationExtras:", err);
    }
  },

  clearConstellationExtras: () => set({ constellationExtraStars: [] }),

  setHoveredStar: (star) => set({ hoveredStar: star }),
  setSelectedStar: (star) => set({ selectedStar: star }),
  setSelectedPlanet: (planet) => set({ selectedPlanet: planet }),

  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),

  showAzAltGrid: false,
  toggleAzAltGrid: () => set((s) => ({ showAzAltGrid: !s.showAzAltGrid })),
}));
