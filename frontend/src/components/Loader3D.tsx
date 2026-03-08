import { Html, useProgress } from "@react-three/drei";

export function Loader3D() {
  const { progress } = useProgress();

  return (
    <Html center>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(10, 10, 20, 0.9)",
          padding: "2rem",
          borderRadius: "15px",
          border: "1px solid rgba(0, 240, 255, 0.3)",
          boxShadow: "0 0 30px rgba(0, 240, 255, 0.1)",
          backdropFilter: "blur(10px)",
          color: "#00f0ff",
          fontFamily: "monospace",
          width: "300px",
        }}
      >
        <div
          style={{
            fontSize: "1.2rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          Chargement Spatial
        </div>

        {/* Barre de progression externe */}
        <div
          style={{
            width: "100%",
            height: "10px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "5px",
            overflow: "hidden",
            marginBottom: "0.5rem",
          }}
        >
          {/* Remplissage de la barre */}
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #00f0ff, #0066ff)",
              transition: "width 0.2s ease",
            }}
          />
        </div>

        <div style={{ fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.7)" }}>
          {progress.toFixed(0)}%
        </div>
      </div>
    </Html>
  );
}
