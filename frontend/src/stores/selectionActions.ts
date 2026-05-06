import { useObservationStore } from "./useObservationStore";
import { useISSStore } from "./useISSStore";
import { useSatelliteStore } from "./useSatelliteStore";
import { useSkyStore } from "./useSkyStore";

export type SelectionScope = "point" | "iss" | "satellite" | "star";

/**
 * Sélection mutuellement exclusive — appelé par chaque setter de sélection
 * pour effacer les 3 autres. Garantit qu'un seul item est sélectionné à la
 * fois (le dernier cliqué prend la priorité, les autres disparaissent).
 *
 * Utilise `setState` direct (pas les actions publiques) pour éviter toute
 * récursion entre setters.
 */
export function clearOtherSelections(except: SelectionScope) {
  if (except !== "point") {
    useObservationStore.setState({ selectedPoint: null });
  }
  if (except !== "iss") {
    useISSStore.setState({ selectedISS: false });
  }
  if (except !== "satellite") {
    useSatelliteStore.setState({ selectedSatellite: null });
  }
  if (except !== "star") {
    useSkyStore.setState({ selectedStar: null });
  }
}
