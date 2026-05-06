import { create } from "zustand";
import type {
  SatelliteGroup,
  SatelliteTLE,
  SatelliteLiveInfo,
} from "../types/satellite";
import { astronomyService } from "../services/api";
import { clearOtherSelections } from "./selectionActions";

interface SatelliteState {
  // Toggle global d'affichage des satellites
  showSatellites: boolean;
  toggleSatellites: () => void;

  // Groupes activés (visibles sur le globe)
  activeGroups: Set<SatelliteGroup>;
  toggleGroup: (group: SatelliteGroup) => void;

  // TLE data cachées par groupe
  tleByGroup: Record<string, SatelliteTLE[]>;
  loadingGroups: Set<string>;
  error: string | null;
  fetchGroup: (group: SatelliteGroup) => Promise<void>;

  // Satellite sélectionné (clic)
  selectedSatellite: SatelliteLiveInfo | null;
  setSelectedSatellite: (info: SatelliteLiveInfo | null) => void;
  clearSelection: () => void;
}

export const useSatelliteStore = create<SatelliteState>((set, get) => ({
  showSatellites: false,
  toggleSatellites: () => set((s) => ({ showSatellites: !s.showSatellites })),

  activeGroups: new Set<SatelliteGroup>(["stations", "gps-ops"]),
  toggleGroup: (group) =>
    set((s) => {
      const next = new Set(s.activeGroups);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return { activeGroups: next };
    }),

  tleByGroup: {},
  loadingGroups: new Set(),
  error: null,

  fetchGroup: async (group) => {
    const state = get();
    // Déjà chargé ou en cours
    if (state.tleByGroup[group] || state.loadingGroups.has(group)) return;

    set((s) => ({
      loadingGroups: new Set(s.loadingGroups).add(group),
      error: null,
    }));
    try {
      const data = await astronomyService.getSatelliteTLEs(group);
      set((s) => {
        const nextLoading = new Set(s.loadingGroups);
        nextLoading.delete(group);
        return {
          tleByGroup: { ...s.tleByGroup, [group]: data.satellites },
          loadingGroups: nextLoading,
        };
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : `Impossible de charger les satellites (${group})`;
      console.error(`Échec de chargement du groupe '${group}':`, err);
      set((s) => {
        const nextLoading = new Set(s.loadingGroups);
        nextLoading.delete(group);
        return { loadingGroups: nextLoading, error: message };
      });
    }
  },

  selectedSatellite: null,
  setSelectedSatellite: (info) => {
    set({ selectedSatellite: info });
    if (info) clearOtherSelections("satellite");
  },
  clearSelection: () => set({ selectedSatellite: null }),
}));
