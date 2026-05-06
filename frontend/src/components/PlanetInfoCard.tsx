import { useSkyStore } from "../stores/useSkyStore";
import { PLANETS_METADATA } from "../types/planets";
import { useMemo } from "react";
import { computePlanetPositions } from "../utils/planetaryEphemeris";

export const PlanetInfoCard = () => {
  const {
    viewMode,
    transitionToMode,
    selectedPlanet,
    setSelectedPlanet,
    timestamp,
  } = useSkyStore();

  const dynamicData = useMemo(() => {
    if (!selectedPlanet) return null;
    const calcDate = timestamp ? new Date(timestamp) : new Date();
    const positions = computePlanetPositions(calcDate, true); // skip orbits for speed
    return positions.get(selectedPlanet);
  }, [selectedPlanet, timestamp]);

  if (viewMode !== "globe" || !selectedPlanet) return null;

  const metadata = PLANETS_METADATA[selectedPlanet];
  if (!metadata || !dynamicData) return null;

  return (
    <div
      className="planet-info-card"
      style={{
        position: "absolute",
        top: "2rem",
        right: "2rem",
        width: "320px",
        background: "rgba(10, 15, 25, 0.85)",
        backdropFilter: "blur(10px)",
        borderRadius: "15px",
        border: "1px solid rgba(0, 240, 255, 0.3)",
        color: "white",
        padding: "20px",
        boxShadow: "0 8px 32px rgba(0, 240, 255, 0.15)",
        zIndex: 100,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <button
        onClick={() => {
          setSelectedPlanet(null);
          transitionToMode("system");
        }}
        style={{
          background: "transparent",
          border: "none",
          color: "#00f0ff",
          cursor: "pointer",
          fontSize: "1rem",
          padding: 0,
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          fontWeight: "bold",
        }}
      >
        ← Retour au Système Solaire
      </button>

      <h2 style={{ margin: "0 0 5px 0", fontSize: "2rem", color: "#fff" }}>
        {dynamicData.name}
      </h2>
      <div
        style={{
          color: "#00f0ff",
          fontSize: "0.9rem",
          marginBottom: "15px",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        {metadata.type}
      </div>

      <p
        style={{
          fontSize: "0.9rem",
          lineHeight: "1.5",
          color: "#ccc",
          marginBottom: "20px",
        }}
      >
        {metadata.description}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            paddingBottom: "5px",
          }}
        >
          <span style={{ color: "#888" }}>Distance à la Terre</span>
          <span style={{ fontWeight: "bold" }}>
            {dynamicData.distanceToEarth.toFixed(3)} UA
          </span>
        </div>

        {selectedPlanet !== "sun" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: "5px",
            }}
          >
            <span style={{ color: "#888" }}>Distance au Soleil</span>
            <span style={{ fontWeight: "bold" }}>
              {dynamicData.helioDist.toFixed(3)} UA
            </span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            paddingBottom: "5px",
          }}
        >
          <span style={{ color: "#888" }}>Rayon équatorial</span>
          <span style={{ fontWeight: "bold" }}>
            {metadata.radiusKm.toLocaleString()} km
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            paddingBottom: "5px",
          }}
        >
          <span style={{ color: "#888" }}>Masse</span>
          <span style={{ fontWeight: "bold" }}>{metadata.mass}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            paddingBottom: "5px",
          }}
        >
          <span style={{ color: "#888" }}>Temp. Moyenne</span>
          <span style={{ fontWeight: "bold" }}>{metadata.tempAvg}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#888" }}>Satellites Naturels</span>
          <span style={{ fontWeight: "bold" }}>{metadata.moons}</span>
        </div>
      </div>
    </div>
  );
};
