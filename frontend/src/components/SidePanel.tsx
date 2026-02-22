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
  } = useSkyStore();

  const {
    searchQuery,
    setSearchQuery,
    searchConstellations,
    results,
    loadingList,
    fetchConstellationDetailAndLocation,
    loadingDetail,
  } = useConstellationStore();

  const handleObserveSky = () => {
    if (selectedPoint) {
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
  };

  const handleSearchConstellation = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setSearchQuery(e.target.value);
    searchConstellations();
  };

  const selectConstellationAndView = async (id: number) => {
    await fetchConstellationDetailAndLocation(id, timestamp);
    // On recupere les nouvelles donnes
    const { bestLocation } = useConstellationStore.getState();
    if (bestLocation) {
      // 1. Simuler ou recupérer le point d'observation correspondant au bestLocation
      const point = {
        id: bestLocation.observation_point_id,
        name: bestLocation.observation_point_name,
        latitude: bestLocation.latitude,
        longitude: bestLocation.longitude,
        timezone: "UTC", // Fallback, on n'a plus forcément la timezone
      };

      // 2. Mettre ce point comme selected pour la vue
      setSelectedPoint(point);

      // 3. Basculer l'affichage
      setViewMode("sky");
      fetchVisibleStars(
        bestLocation.latitude,
        bestLocation.longitude,
        timestamp,
      );
    }
  };

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
              <h2>Recherche Céleste</h2>
              <p style={{ color: "grey", fontSize: "0.9em" }}>
                Cliquez un point sur le globe, ou cherchez une constellation :
              </p>
              <input
                type="text"
                placeholder="Ex : Orion, Ursa Major..."
                value={searchQuery}
                onChange={handleSearchConstellation}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "10px",
                  borderRadius: "4px",
                  border: "1px solid #444",
                  background: "#222",
                  color: "white",
                }}
              />
              {loadingList && (
                <p style={{ fontSize: "0.8em", color: "#888" }}>Recherche...</p>
              )}
              {loadingDetail && (
                <p style={{ fontSize: "0.8em", color: "#bb88f6" }}>
                  Calcul de l'orbite optimale...
                </p>
              )}
              {results.length > 0 && (
                <ul
                  style={{
                    listStyleType: "none",
                    padding: 0,
                    margin: "10px 0 0 0",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {results.map((c) => (
                    <li
                      key={c.id}
                      onClick={() => selectConstellationAndView(c.id)}
                      style={{
                        padding: "8px",
                        cursor: "pointer",
                        borderBottom: "1px solid #333",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#333")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <strong>{c.name_fr || c.name}</strong> ({c.abbreviation})
                    </li>
                  ))}
                </ul>
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
                      {selectedStar.constellation_abbr || "N/A"}
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
