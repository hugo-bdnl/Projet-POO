import { useState, useEffect } from "react";
import { useSkyStore } from "../stores/useSkyStore";
import { MARS_ROVERS } from "../types/rovers";

interface RoverPhoto {
  id: number;
  img_src: string;
  earth_date: string;
  sol: number;
  camera_name: string;
  camera_full_name: string;
}

const API_URL = import.meta.env.VITE_API_URL || "";

// Rovers avec photos disponibles sur l'API NASA (Zhurong non supporté)
const NASA_ROVER_IDS = new Set(["curiosity", "opportunity", "spirit", "perseverance"]);

// ── Ligne d'info réutilisable ─────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        borderBottom: "1px solid rgba(120, 160, 255, 0.1)",
        paddingBottom: "7px",
        fontSize: "0.82rem",
      }}
    >
      <span style={{ color: "#778899", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: "bold", textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────

export function RoverInfoCard() {
  const { viewMode, selectedPlanet, selectedRoverId, setSelectedRoverId } =
    useSkyStore();

  const [photos, setPhotos] = useState<RoverPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const rover = MARS_ROVERS.find((r) => r.id === selectedRoverId) ?? null;

  // Fetch photos NASA au changement de rover sélectionné
  useEffect(() => {
    if (!selectedRoverId || !NASA_ROVER_IDS.has(selectedRoverId)) {
      setPhotos([]);
      return;
    }

    setLoading(true);
    setFetchError(null);

    fetch(`${API_URL}/api/rovers/${selectedRoverId}/photos`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setPhotos(data.photos ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setFetchError("Photos indisponibles.");
        setLoading(false);
        console.error("Erreur fetch photos rover:", err);
      });
  }, [selectedRoverId]);

  // Visible uniquement en mode Globe sur Mars avec un rover sélectionné
  if (viewMode !== "globe" || selectedPlanet !== "mars" || !rover) return null;

  const coordLabel = `${Math.abs(rover.lat).toFixed(1)}°${rover.lat >= 0 ? "N" : "S"}, ${rover.lon.toFixed(1)}°E`;
  const borderColor = rover.active
    ? "rgba(0, 240, 255, 0.35)"
    : "rgba(100, 120, 160, 0.3)";
  const glowColor = rover.active
    ? "rgba(0, 240, 255, 0.12)"
    : "rgba(0, 0, 0, 0.4)";

  return (
    <div
      style={{
        position: "absolute",
        top: "2rem",
        left: "2rem",
        width: "360px",
        maxHeight: "80vh",
        overflowY: "auto",
        background: "rgba(10, 15, 25, 0.88)",
        backdropFilter: "blur(12px)",
        borderRadius: "15px",
        border: `1px solid ${borderColor}`,
        color: "white",
        padding: "20px",
        boxShadow: `0 8px 32px ${glowColor}`,
        zIndex: 100,
        fontFamily: "system-ui, -apple-system, sans-serif",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(120, 160, 255, 0.3) transparent",
      }}
    >
      {/* Bouton fermer */}
      <button
        onClick={() => setSelectedRoverId(null)}
        style={{
          position: "absolute",
          top: "12px",
          right: "14px",
          background: "transparent",
          border: "none",
          color: "#6688aa",
          cursor: "pointer",
          fontSize: "1.1rem",
          padding: 0,
          lineHeight: 1,
        }}
        aria-label="Fermer"
      >
        ✕
      </button>

      {/* En-tête */}
      <div style={{ marginBottom: "14px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "4px",
          }}
        >
          {/* Pastille couleur rover */}
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: rover.active ? rover.color : "#445566",
              boxShadow: rover.active ? `0 0 8px ${rover.color}` : "none",
              flexShrink: 0,
            }}
          />
          <h2 style={{ margin: 0, fontSize: "1.35rem", color: "#ffffff" }}>
            {rover.name}
          </h2>
          <span
            style={{
              marginLeft: "auto",
              marginRight: "24px",
              fontSize: "0.68rem",
              fontWeight: "bold",
              padding: "3px 8px",
              borderRadius: "20px",
              background: rover.active
                ? "rgba(60, 200, 80, 0.18)"
                : "rgba(100, 100, 120, 0.28)",
              color: rover.active ? "#70ee70" : "#8899aa",
              border: `1px solid ${rover.active ? "rgba(60, 200, 80, 0.4)" : "rgba(100, 120, 160, 0.3)"}`,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            {rover.active ? "Actif" : "Inactif"}
          </span>
        </div>
        <div
          style={{
            color: "#6080b0",
            fontSize: "0.78rem",
            letterSpacing: "0.5px",
          }}
        >
          {rover.agency}
        </div>
      </div>

      <p
        style={{
          fontSize: "0.84rem",
          color: "#aabcce",
          lineHeight: "1.55",
          margin: "0 0 14px",
        }}
      >
        {rover.description}
      </p>

      {/* Infos mission */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}
      >
        <InfoRow label="Site d'atterrissage" value={rover.landingSite} />
        <InfoRow label="Arrivée sur Mars" value={rover.missionStart} />
        <InfoRow
          label={rover.missionEnd ? "Fin de mission" : "En mission depuis"}
          value={rover.missionEnd ?? rover.missionStart}
        />
        <InfoRow label="Coordonnées" value={coordLabel} />
      </div>

      {/* Galerie photos NASA */}
      {NASA_ROVER_IDS.has(rover.id) && (
        <>
          <div
            style={{
              color: "#6080b0",
              fontSize: "0.75rem",
              fontWeight: "bold",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "10px",
              borderTop: "1px solid rgba(120, 160, 255, 0.15)",
              paddingTop: "14px",
            }}
          >
            Dernières photos NASA
          </div>

          {loading && (
            <div
              style={{
                color: "#6080b0",
                fontSize: "0.82rem",
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              Chargement…
            </div>
          )}

          {fetchError && !loading && (
            <div style={{ fontSize: "0.82rem", padding: "8px 0" }}>
              <span style={{ color: "#cc6655" }}>
                API NASA indisponible.{" "}
              </span>
              {rover.galleryUrl && (
                <a
                  href={rover.galleryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#60c8ff", textDecoration: "underline" }}
                >
                  Voir les photos sur NASA.gov →
                </a>
              )}
            </div>
          )}

          {!loading && !fetchError && photos.length === 0 && (
            <div
              style={{
                color: "#6080b0",
                fontSize: "0.82rem",
                textAlign: "center",
                padding: "8px 0",
              }}
            >
              Aucune photo disponible.
            </div>
          )}

          {!loading && photos.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "5px",
              }}
            >
              {photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.img_src}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${photo.camera_full_name} — Sol ${photo.sol} — ${photo.earth_date}`}
                  style={{
                    display: "block",
                    borderRadius: "6px",
                    overflow: "hidden",
                    border: "1px solid rgba(120, 160, 255, 0.15)",
                  }}
                >
                  <img
                    src={photo.img_src}
                    alt={`${rover.name} — Sol ${photo.sol}`}
                    loading="lazy"
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                      display: "block",
                      opacity: 0.85,
                      transition: "opacity 0.2s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.opacity = "0.85";
                    }}
                  />
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
