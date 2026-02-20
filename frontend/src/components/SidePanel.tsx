import { useObservationStore } from "../stores/useObservationStore";

export function SidePanel() {
  const { selectedPoint, setSelectedPoint } = useObservationStore();

  if (!selectedPoint) return null;

  return (
    <div className="side-panel">
      <button
        className="close-button"
        onClick={() => setSelectedPoint(null)}
        title="Fermer le panneau"
      >
        ✕
      </button>

      <h2>📍 {selectedPoint.name}</h2>

      <div className="info-group">
        <span className="label">Coordonnées GPS</span>
        <span className="value">
          {selectedPoint.latitude.toFixed(4)}°,{" "}
          {selectedPoint.longitude.toFixed(4)}°
        </span>
      </div>

      <div className="info-group">
        <span className="label">Fuseau Horaire</span>
        <span className="value">{selectedPoint.timezone}</span>
      </div>
    </div>
  );
}
