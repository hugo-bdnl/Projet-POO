import { create } from "zustand";
import type { VisibleStar } from "../types";
import { astronomyService } from "../services/api";

type ViewMode = "globe" | "sky" | "system";

interface SkyState {
  viewMode: ViewMode;
  timestamp: string | undefined;
  baseTimestamp: string | undefined;
  dragTimestamp: string | undefined;
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
  setDragTimestamp: (iso: string | undefined) => void;
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
  setSelectedPlanet: (
    planet: import("../types/planets").PlanetId | null,
  ) => void;
  selectedRoverId: string | null;
  setSelectedRoverId: (id: string | null) => void;
  cameraTarget: [number, number, number] | null;
  setCameraTarget: (target: [number, number, number] | null) => void;
  showAzAltGrid: boolean;
  toggleAzAltGrid: () => void;
  isTransitioning: boolean;
  transitionToMode: (
    mode: ViewMode,
    planet?: import("../types/planets").PlanetId | null,
  ) => void;
  isSystemRotating: boolean;
  toggleSystemRotation: () => void;
  systemRotationSpeed: number; // En jours par seconde
  setSystemRotationSpeed: (speed: number) => void;
  showOrbits: boolean;
  toggleOrbits: () => void;
}

export const useSkyStore = create<SkyState>((set, get) => ({
  viewMode: "system",
  timestamp: undefined,
  baseTimestamp: undefined,
  dragTimestamp: undefined,
  stars: [],
  constellationExtraStars: [],
  loadingStars: false,
  hoveredStar: null,
  selectedStar: null,
  selectedPlanet: null,
  selectedRoverId: null,
  error: null,
  currentLat: null,
  currentLon: null,
  isTransitioning: false,
  isSystemRotating: true,
  systemRotationSpeed: 15,
  showOrbits: true,

  toggleSystemRotation: () => set((s) => ({ isSystemRotating: !s.isSystemRotating })),
  setSystemRotationSpeed: (speed) => set({ systemRotationSpeed: speed }),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),

  setViewMode: (mode) => set({ viewMode: mode }),
  setTimestamp: (iso) => set({ timestamp: iso }),
  setDragTimestamp: (iso) => set({ dragTimestamp: iso }),

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
    if (
      currentLat === null ||
      currentLon === null ||
      patternHipIds.size === 0
    ) {
      return;
    }

    const alreadyLoaded = new Set(
      stars.filter((s) => s.hip_id !== null).map((s) => s.hip_id!),
    );

    const missingHipIds = [...patternHipIds].filter(
      (id) => !alreadyLoaded.has(id),
    );
    if (missingHipIds.length === 0) {
      return;
    }

    try {
      const allBright = await astronomyService.getVisibleStars(
        currentLat,
        currentLon,
        timestamp,
        8,
      );
      const extras = allBright.filter(
        (s) =>
          s.hip_id !== null &&
          patternHipIds.has(s.hip_id) &&
          !alreadyLoaded.has(s.hip_id),
      );
      set({ constellationExtraStars: extras });
    } catch (err) {
      console.error("Échec de fetchConstellationExtras:", err);
    }
  },

  clearConstellationExtras: () => set({ constellationExtraStars: [] }),

  setHoveredStar: (star) => set({ hoveredStar: star }),
  setSelectedStar: (star) => set({ selectedStar: star }),
  setSelectedPlanet: (planet) =>
    set({ selectedPlanet: planet, selectedRoverId: null }),
  setSelectedRoverId: (id) => set({ selectedRoverId: id }),

  cameraTarget: null,
  setCameraTarget: (target) => set({ cameraTarget: target }),

  showAzAltGrid: false,
  toggleAzAltGrid: () => set((s) => ({ showAzAltGrid: !s.showAzAltGrid })),

  transitionToMode: (mode, planet) => {
    // On force l'état isTransitioning pour afficher le Loader quoi qu'il arrive.
    // On change IMMÉDIATEMENT la destination pour commencer à charger R3F en parallèle !
    set({ isTransitioning: true, viewMode: mode });
    if (planet !== undefined) {
      set({ selectedPlanet: planet });
    }

    // On ferme la transition forcée minimale au bout de 1.5s.
    // Si Three.js charge encore, il prendra le relai avec `active`.
    setTimeout(() => {
      set({ isTransitioning: false });
    }, 1500);
  },
}));
