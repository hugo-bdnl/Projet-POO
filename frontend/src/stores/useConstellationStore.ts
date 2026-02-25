import { create } from "zustand";
import { astronomyService } from "../services/api";
import type {
  ConstellationListItem,
  ConstellationDetail,
  BestLocation,
} from "../types";

interface ConstellationState {
  searchQuery: string;
  results: ConstellationListItem[];
  loadingList: boolean;
  selectedConstellation: ConstellationDetail | null;
  bestLocation: BestLocation | null;
  loadingDetail: boolean;
  error: string | null;
  /** Mapping abréviation → nom complet (fr de préférence) */
  constellationNameMap: Record<string, string>;

  setSearchQuery: (q: string) => void;
  searchConstellations: () => Promise<void>;
  fetchConstellationDetailAndLocation: (
    id: number,
    timestamp?: string,
  ) => Promise<void>;
  clearSelection: () => void;
  /** Charge la table de correspondance abréviation → nom complet (une seule fois) */
  fetchConstellationNames: () => Promise<void>;
}

export const useConstellationStore = create<ConstellationState>((set, get) => ({
  searchQuery: "",
  results: [],
  loadingList: false,
  selectedConstellation: null,
  bestLocation: null,
  loadingDetail: false,
  error: null,
  constellationNameMap: {},

  setSearchQuery: (q) => set({ searchQuery: q }),

  searchConstellations: async () => {
    const { searchQuery } = get();
    if (searchQuery.length < 2) {
      set({ results: [], error: null });
      return;
    }

    set({ loadingList: true, error: null });
    try {
      const data = await astronomyService.searchConstellations(searchQuery);
      set({ results: data, loadingList: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Erreur de recherche",
        loadingList: false,
      });
    }
  },

  fetchConstellationDetailAndLocation: async (
    id: number,
    timestamp?: string,
  ) => {
    set({ loadingDetail: true, error: null });
    try {
      // 1. Fetch geometry detail
      const detail = await astronomyService.getConstellation(id);

      // 2. Fetch the best spot to see it
      const location = await astronomyService.getBestLocation(id, timestamp);

      set({
        selectedConstellation: detail,
        bestLocation: location,
        loadingDetail: false,
      });
    } catch (err: unknown) {
      set({
        error:
          err instanceof Error
            ? err.message
            : "Impossible de charger la constellation",
        loadingDetail: false,
      });
    }
  },

  fetchConstellationNames: async () => {
    // Ne charger qu'une seule fois
    if (Object.keys(get().constellationNameMap).length > 0) return;
    try {
      const list = await astronomyService.getConstellations();
      const map: Record<string, string> = {};
      for (const c of list) {
        map[c.abbreviation] = c.name_fr || c.name;
      }
      set({ constellationNameMap: map });
    } catch {
      // Silencieux : on affichera l'abréviation en fallback
    }
  },

  clearSelection: () =>
    set({ selectedConstellation: null, bestLocation: null }),
}));
