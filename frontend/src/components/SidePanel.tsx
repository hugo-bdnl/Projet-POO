import { useEffect } from "react";
import { useObservationStore } from "../stores/useObservationStore";
import { useSkyStore } from "../stores/useSkyStore";
import { useConstellationStore } from "../stores/useConstellationStore";
import { useISSStore } from "../stores/useISSStore";

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

  const { selectedISS, issInfo, clearISSSelection } = useISSStore();

  // Charger la table de correspondance abréviation → nom complet
  useEffect(() => {
    if (viewMode === "sky") {
      fetchConstellationNames();
    }
  }, [viewMode, fetchConstellationNames]);

  // Reverse geocoding : pays survolé par l'ISS
  // Utilise un setInterval (8s) plutôt qu'une dépendance sur issInfo pour
  // éviter tout recalcul inutile quand la position change (chaque seconde).
  // L'intervalle ne tourne que lorsque le panneau ISS est ouvert.
  useEffect(() => {
    if (!selectedISS) return;

    const doGeocode = () => {
      // On lit issInfo via le store au moment de l'appel, pas depuis les deps
      const { issInfo: currentInfo, setISSInfo: doSet } =
        useISSStore.getState();
      if (!currentInfo) return;
      const { latitude_deg, longitude_deg } = currentInfo;
      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude_deg}&longitude=${longitude_deg}&localityLanguage=fr`,
      )
        .then((r) => r.json())
        .then((data) => {
          const country = data.countryName || data.locality || null;
          doSet({ ...useISSStore.getState().issInfo!, country });
        })
        .catch(() => {
          /* silencieux */
        });
    };

    // Premier appel immédiat au clic, puis toutes les 8s
    doGeocode();
    const id = setInterval(doGeocode, 8_000);
    return () => clearInterval(id);
  }, [selectedISS]);

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
    clearISSSelection();
  };

  const fmt = (n: number, dec = 4) => n.toFixed(dec);

  // ... (Recherche céleste déplacée vers ConstellationSidebar)

  // ── Rendu ISS ──────────────────────────────────────────────────────────────
  if (viewMode === "globe" && selectedISS && issInfo) {
    return (
      <div className="side-panel">
        <button
          className="close-button"
          onClick={clearISSSelection}
          title="Fermer"
        >
          ✕
        </button>
        <h2>🛸 Station Spatiale ISS</h2>

        <div className="info-group">
          <span className="label">Latitude</span>
          <span className="value">{fmt(issInfo.latitude_deg)}°</span>
        </div>
        <div className="info-group">
          <span className="label">Longitude</span>
          <span className="value">{fmt(issInfo.longitude_deg)}°</span>
        </div>
        <div className="info-group">
          <span className="label">Altitude</span>
          <span className="value">{fmt(issInfo.altitude_km, 1)} km</span>
        </div>
        <div className="info-group">
          <span className="label">Vitesse orbitale</span>
          <span className="value">
            {Math.round(issInfo.speed_kmh).toLocaleString("fr-FR")} km/h
          </span>
        </div>
        <div className="info-group">
          <span className="label">Au-dessus de</span>
          <span className="value">
            {issInfo.country ?? (
              <span style={{ color: "#666", fontStyle: "italic" }}>
                Calcul...
              </span>
            )}
          </span>
        </div>

        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "rgba(0,240,180,0.05)",
            borderRadius: "8px",
            border: "1px solid rgba(0,240,180,0.15)",
            fontSize: "0.78rem",
            color: "#aaa",
            lineHeight: 1.6,
          }}
        >
          <div>Inclinaison orbitale : ~51.6°</div>
          <div>Période orbitale : ~92 min</div>
          <div>Altitude nominale : ~408 km</div>
          <div
            style={{ marginTop: "6px", color: "#00f0cc", fontSize: "0.7rem" }}
          >
            Données calculées en temps réel via TLE NORAD
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "system") {
    return (
      <div className="side-panel">
        <h2>☀️ Système Solaire</h2>
        <p style={{ color: "grey", fontSize: "0.9em", marginTop: "10px" }}>
          Vous observez notre système stellaire en temps réel. L'échelle des
          planètes et des orbites est ajustée pour une meilleure visualisation.
        </p>
        <button
          className="action-button"
          onClick={() => setViewMode("globe")}
          style={{
            marginTop: "30px",
            width: "100%",
            padding: "12px",
            backgroundColor: "#22ccff",
            color: "#000",
            fontWeight: "bold",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🌍 Retourner sur Terre
        </button>
      </div>
    );
  }

  return (
    <div
      className={`side-panel${viewMode === "sky" ? " side-panel--sky" : ""}`}
    >
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
              <h2>Terre</h2>
              <p style={{ color: "grey", fontSize: "0.9em" }}>
                Cliquez un point sur le globe pour explorer ce lieu.
              </p>

              {loadingDetail && (
                <p
                  style={{
                    fontSize: "0.8em",
                    color: "#bb88f6",
                    marginTop: "15px",
                  }}
                >
                  Calcul de l'orbite optimale...
                </p>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {selectedStar ? (
            <button
              className="close-button"
              onClick={() => setSelectedStar(null)}
              title="Désélectionner l'étoile"
            >
              ✕
            </button>
          ) : (
            <button
              className="close-button"
              onClick={handleReturnToGlobe}
              title="Retour au Globe"
            >
              ←
            </button>
          )}
          <h2>Depuis {selectedPoint?.name}</h2>

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
