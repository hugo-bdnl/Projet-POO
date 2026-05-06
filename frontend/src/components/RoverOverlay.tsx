import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useSkyStore } from "../stores/useSkyStore";
import { ROVER_METADATA } from "../types/rovers";
import { RoverModel3D } from "./RoverModel3D";
import { RoverPhotoGallery } from "./RoverPhotoGallery";

/**
 * Overlay plein écran "Mission Control" pour un rover sélectionné.
 * Descend du haut avec animation slide-down, layout 3 colonnes.
 * Lazy-loaded via React.lazy() dans App.tsx.
 */
export default function RoverOverlay() {
  const selectedRoverId = useSkyStore((s) => s.selectedRoverId);
  const roverOverlayClosing = useSkyStore((s) => s.roverOverlayClosing);
  const setSelectedRoverId = useSkyStore((s) => s.setSelectedRoverId);
  const setRoverOverlayClosing = useSkyStore((s) => s.setRoverOverlayClosing);

  // État local pour l'animation d'entrée
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (selectedRoverId) {
      // Déclenche l'animation d'entrée au prochain frame
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [selectedRoverId]);

  const handleClose = useCallback(() => {
    setRoverOverlayClosing(true);
    setVisible(false);
    // Attend la fin de l'animation avant de fermer
    setTimeout(() => {
      setSelectedRoverId(null);
      setRoverOverlayClosing(false);
    }, 400);
  }, [setSelectedRoverId, setRoverOverlayClosing]);

  if (!selectedRoverId && !roverOverlayClosing) return null;

  const meta = ROVER_METADATA[selectedRoverId ?? ""];
  if (!meta && !roverOverlayClosing) return null;

  // Récupère les positions depuis le store pour enrichir l'affichage
  const roverPositions = useSkyStore.getState().roverPositions;
  const position = roverPositions.find((r) => r.slug === selectedRoverId);

  return (
    <div
      className="rover-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(2, 4, 12, 0.95)",
        backdropFilter: "blur(12px)",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 500ms cubic-bezier(0.16, 1, 0.3, 1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header — titre + bouton fermer */}
      <div
        className="rover-overlay__header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.6rem",
              fontWeight: 700,
              color: meta?.color ?? "#fff",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "0.5px",
            }}
          >
            {meta?.name ?? "Rover"}
          </h1>
          <span
            style={{
              fontSize: "0.85rem",
              color: "#889",
              fontFamily: "monospace",
            }}
          >
            {meta?.agency ?? ""} — MISSION CONTROL
          </span>
        </div>

        <button
          onClick={handleClose}
          aria-label="Fermer"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "50%",
            width: "42px",
            height: "42px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#aaa",
            fontSize: "1.2rem",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(255,80,80,0.2)";
            e.currentTarget.style.borderColor = "rgba(255,80,80,0.4)";
            e.currentTarget.style.color = "#ff6666";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            e.currentTarget.style.color = "#aaa";
          }}
        >
          ✕
        </button>
      </div>

      {/* Contenu principal — 3 colonnes */}
      <div
        className="rover-overlay__grid"
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 1fr",
          gap: "0",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Colonne gauche — Modèle 3D */}
        <div
          className="rover-overlay__col rover-overlay__col--model"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <Suspense fallback={<ModelPlaceholder />}>
              <Canvas
                camera={{ position: [0, 0.5, 3], fov: 40 }}
                style={{ width: "100%", height: "100%" }}
              >
                <ambientLight intensity={0.4} />
                <directionalLight position={[3, 3, 3]} intensity={1} />
                <RoverModel3D color={meta?.color ?? "#888"} modelPath={meta?.modelPath} />
              </Canvas>
            </Suspense>
          </div>
          {!meta?.modelPath && (
            <p
              style={{
                color: "#556",
                fontSize: "0.75rem",
                marginTop: "12px",
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              Modèle 3D non disponible
            </p>
          )}
        </div>

        {/* Colonne centre — Infos mission */}
        <div
          className="rover-overlay__col rover-overlay__col--info"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "28px 32px",
            overflowY: "auto",
            color: "#ccc",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              color: "#fff",
              margin: "0 0 20px",
              fontWeight: 600,
            }}
          >
            Informations de mission
          </h2>

          <InfoRow label="Site d'atterrissage" value={meta?.landingSite ?? "—"} />
          <InfoRow label="Début de mission" value={meta?.missionStart ?? "—"} />
          <InfoRow
            label="Fin de mission"
            value={meta?.missionEnd ?? "En cours"}
            highlight={!meta?.missionEnd}
          />
          <InfoRow
            label="Statut"
            value={meta?.active ? "Actif" : "Inactif"}
            highlight={meta?.active}
          />

          {position && (
            <>
              <InfoRow
                label="Latitude"
                value={`${position.latitude.toFixed(1)}°`}
              />
              <InfoRow
                label="Longitude"
                value={`${position.longitude.toFixed(1)}°`}
              />
            </>
          )}

          <div
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h3
              style={{
                fontSize: "0.9rem",
                color: "#aab",
                margin: "0 0 10px",
                fontWeight: 600,
              }}
            >
              Description
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                lineHeight: 1.7,
                color: "#999",
                margin: 0,
              }}
            >
              {meta?.description ?? ""}
            </p>
          </div>
        </div>

        {/* Colonne droite — Galerie photos */}
        <div
          className="rover-overlay__col rover-overlay__col--gallery"
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              color: "#fff",
              margin: "0 0 16px 8px",
              fontWeight: 600,
              fontFamily: "system-ui, sans-serif",
              flexShrink: 0,
            }}
          >
            Galerie
          </h2>
          <div style={{ flex: 1, minHeight: 0 }}>
            <RoverPhotoGallery photos={meta?.photos} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ligne d'info label/value */
function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        fontSize: "0.9rem",
      }}
    >
      <span style={{ color: "#778" }}>{label}</span>
      <span
        style={{
          color: highlight ? "#00e676" : "#ddd",
          fontWeight: highlight ? 600 : 400,
          fontFamily: "monospace",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Fallback pendant le chargement du Canvas 3D */
function ModelPlaceholder() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#445",
        fontSize: "0.85rem",
      }}
    >
      Chargement du modèle...
    </div>
  );
}
