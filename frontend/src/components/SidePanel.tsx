import { useEffect } from "react";
import { useObservationStore } from "../stores/useObservationStore";
import { useSkyStore } from "../stores/useSkyStore";
import { useConstellationStore } from "../stores/useConstellationStore";

export function SidePanel() {
  const { selectedPoint, setSelectedPoint } = useObservationStore();
  const {
    viewMode,
    setViewMode,
    fetchVisibleStars,
    loadingStars,
    selectedStar,
    setSelectedStar,
    stars,
    timestamp,
    setCameraTarget,
  } = useSkyStore();

  const {
    loadingDetail,
    clearSelection,
    constellationNameMap,
    fetchConstellationNames,
  } = useConstellationStore();

  // Charger la table de correspondance abréviation → nom complet
  useEffect(() => {
    if (viewMode === "sky") {
      fetchConstellationNames();
    }
  }, [viewMode, fetchConstellationNames]);

  const handleObserveSky = () => {
    if (selectedPoint) {
      setCameraTarget(null);
      clearSelection(); // Retirer la constellation pour restaurer la luminosité
      setViewMode("sky");
      fetchVisibleStars(
        selectedPoint.latitude,
        selectedPoint.longitude,
        timestamp,
      );
    }
  };

  const handleReturnToGlobe = () => {
    setViewMode("globe");
    setSelectedStar(null);
    setCameraTarget(null);
    clearSelection();
  };

  // ... (Recherche céleste déplacée vers ConstellationSidebar)

  return (
    <div className="side-panel">
      {viewMode === "globe" ? (
        <>
          {selectedPoint && (
            <>
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

              <button
                className="action-button"
                onClick={handleObserveSky}
                style={{
                  marginTop: "20px",
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Observer le ciel
              </button>
            </>
          )}

          {!selectedPoint && (
            <>
              <h2>Exploration</h2>
              <p style={{ color: "grey", fontSize: "0.9em" }}>
                Cliquez un point sur le globe pour explorer ce lieu.
              </p>

              {loadingDetail && (
                <p style={{ fontSize: "0.8em", color: "#bb88f6", marginTop: "15px" }}>
                  Calcul de l'orbite optimale...
                </p>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <button
            className="close-button"
            onClick={handleReturnToGlobe}
            title="Retour au Globe"
          >
            ←
          </button>
          <h2>🌌 Ciel Nocturne</h2>
          <p
            style={{
              margin: 0,
              paddingBottom: "15px",
              color: "#ccc",
              fontSize: "0.9em",
              borderBottom: "1px solid #333",
            }}
          >
            Depuis {selectedPoint?.name}
          </p>

          {loadingStars && (
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              Chargement des étoiles...
            </div>
          )}

          {!loadingStars && stars.length > 0 && (
            <div style={{ marginTop: "15px" }}>
              <span
                className="label"
                style={{ display: "block", marginBottom: "10px" }}
              >
                {stars.length} étoiles visibles
              </span>

              {selectedStar ? (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "15px",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: "8px",
                  }}
                >
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "1.2em" }}>
                    {selectedStar.proper_name ||
                      `Étoile HIP ${selectedStar.hip_id || "Inconnue"}`}
                  </h3>
                  <div className="info-group">
                    <span className="label">Magnitude</span>
                    <span className="value">
                      {selectedStar.magnitude.toFixed(2)}
                    </span>
                  </div>
                  <div className="info-group">
                    <span className="label">Classe spectrale</span>
                    <span className="value">
                      {selectedStar.spectral_type || "N/A"}
                    </span>
                  </div>
                  <div className="info-group">
                    <span className="label">Constellation</span>
                    <span className="value">
                      {selectedStar.constellation_abbr
                        ? constellationNameMap[
                        selectedStar.constellation_abbr.toUpperCase()
                        ] || selectedStar.constellation_abbr
                        : "N/A"}
                    </span>
                  </div>
                  <div className="info-group">
                    <span className="label">Distance</span>
                    <span className="value">
                      {selectedStar.distance_ly != null
                        ? `${selectedStar.distance_ly.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} al`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="info-group">
                    <span className="label">Position locale</span>
                    <span className="value">
                      Az: {selectedStar.azimuth.toFixed(1)}° <br />
                      Alt: {selectedStar.altitude.toFixed(1)}°
                    </span>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    color: "#888",
                    fontStyle: "italic",
                    marginTop: "20px",
                  }}
                >
                  Cliquez sur une étoile pour voir ses détails.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
