import { useSkyStore } from "../stores/useSkyStore";
import { useObservationStore } from "../stores/useObservationStore";
import { useISSStore } from "../stores/useISSStore";
import { useSatelliteStore } from "../stores/useSatelliteStore";
import { useConstellationStore } from "../stores/useConstellationStore";
import { SATELLITE_GROUP_META } from "../types/satellite";

/**
 * Mini-card flottante en bas de l'écran (mobile uniquement, géré par CSS)
 * qui remplace les contenus contextuels du SidePanel.
 *
 * Affiche selon priorité :
 *   1. Étoile sélectionnée (mode sky)
 *   2. ISS sélectionnée (mode globe Terre)
 *   3. Satellite sélectionné (mode globe Terre)
 *   4. Point d'observation cliqué (mode globe Terre)
 *
 * Le polling ISS reverse-geocode reste géré par SidePanel (caché en CSS sur
 * mobile mais ses effets s'exécutent quand même), donc `issInfo.country` est
 * disponible ici sans duplication.
 */
export function MobileContextualCard() {
  const {
    viewMode,
    selectedStar,
    setSelectedStar,
    setCameraTarget,
    transitionToMode,
    fetchVisibleStars,
    timestamp,
    selectedPlanet,
  } = useSkyStore();
  const { selectedPoint, setSelectedPoint } = useObservationStore();
  const { selectedISS, issInfo, clearISSSelection } = useISSStore();
  const { selectedSatellite, clearSelection: clearSatelliteSelection } =
    useSatelliteStore();
  const { clearSelection, constellationNameMap } = useConstellationStore();

  // ── Mode sky : étoile sélectionnée ────────────────────────────────────────
  if (viewMode === "sky" && selectedStar) {
    const constellationName = selectedStar.constellation_abbr
      ? constellationNameMap[selectedStar.constellation_abbr.toUpperCase()] ||
        selectedStar.constellation_abbr
      : null;

    return (
      <div className="mobile-card">
        <button
          className="mobile-card__close"
          onClick={() => setSelectedStar(null)}
          aria-label="Fermer"
        >
          ✕
        </button>
        <div className="mobile-card__title">
          {selectedStar.proper_name ||
            (selectedStar.hip_id ? `HIP ${selectedStar.hip_id}` : "Étoile")}
        </div>
        <div className="mobile-card__rows">
          <span>Mag {selectedStar.magnitude.toFixed(2)}</span>
          {selectedStar.spectral_type && (
            <span>{selectedStar.spectral_type}</span>
          )}
          {constellationName && <span>{constellationName}</span>}
          {selectedStar.distance_ly != null && (
            <span>
              {selectedStar.distance_ly.toLocaleString("fr-FR", {
                maximumFractionDigits: 1,
              })}{" "}
              al
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Mode globe : seulement Terre ──────────────────────────────────────────
  if (viewMode !== "globe") return null;
  if (selectedPlanet && selectedPlanet !== "earth") return null;

  // ── ISS sélectionnée ──────────────────────────────────────────────────────
  if (selectedISS && issInfo) {
    return (
      <div className="mobile-card">
        <button
          className="mobile-card__close"
          onClick={clearISSSelection}
          aria-label="Fermer"
        >
          ✕
        </button>
        <div className="mobile-card__title">🛸 ISS</div>
        <div className="mobile-card__rows">
          <span>Alt {issInfo.altitude_km.toFixed(1)} km</span>
          <span>
            {Math.round(issInfo.speed_kmh).toLocaleString("fr-FR")} km/h
          </span>
          {issInfo.country && <span>📍 {issInfo.country}</span>}
        </div>
      </div>
    );
  }

  // ── Satellite sélectionné ─────────────────────────────────────────────────
  if (selectedSatellite) {
    const meta = SATELLITE_GROUP_META[selectedSatellite.group];
    const color = meta?.color ?? "#fff";
    return (
      <div className="mobile-card">
        <button
          className="mobile-card__close"
          onClick={clearSatelliteSelection}
          aria-label="Fermer"
        >
          ✕
        </button>
        <div className="mobile-card__title" style={{ color }}>
          {selectedSatellite.name}
        </div>
        <div className="mobile-card__rows">
          <span>Alt {selectedSatellite.altitude_km.toFixed(1)} km</span>
          <span>
            {Math.round(selectedSatellite.speed_kmh).toLocaleString("fr-FR")}{" "}
            km/h
          </span>
          <span>NORAD {selectedSatellite.norad_id}</span>
        </div>
      </div>
    );
  }

  // ── Point d'observation cliqué ───────────────────────────────────────────
  if (selectedPoint) {
    const handleObserve = () => {
      setCameraTarget(null);
      clearSelection();
      transitionToMode("sky");
      fetchVisibleStars(
        selectedPoint.latitude,
        selectedPoint.longitude,
        timestamp,
      );
    };

    return (
      <div className="mobile-card">
        <button
          className="mobile-card__close"
          onClick={() => setSelectedPoint(null)}
          aria-label="Fermer"
        >
          ✕
        </button>
        <div className="mobile-card__title">📍 {selectedPoint.name}</div>
        <div className="mobile-card__rows">
          <span>
            {selectedPoint.latitude.toFixed(2)}°,{" "}
            {selectedPoint.longitude.toFixed(2)}°
          </span>
          <span>{selectedPoint.timezone}</span>
        </div>
        <button className="mobile-card__action" onClick={handleObserve}>
          Observer le ciel →
        </button>
      </div>
    );
  }

  return null;
}
