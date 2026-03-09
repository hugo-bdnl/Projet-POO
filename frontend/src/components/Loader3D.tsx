import { Html, useProgress } from "@react-three/drei";
import "./TransitionScreen.css";

import { useEffect, useState } from "react";
import { useSkyStore } from "../stores/useSkyStore";

function LoaderUI() {
  const { active, progress } = useProgress();
  const isTransitioning = useSkyStore((s) => s.isTransitioning);

  // Affiche l'écran si R3F charge OU si on force une transition
  const visible = active || isTransitioning;
  const [displayProgress, setDisplayProgress] = useState(0);

  // Suit la progression réelle de ThreeJS
  useEffect(() => {
    if (active) {
      setDisplayProgress((p) => Math.max(p, progress));
    }
  }, [active, progress]);

  // Si on est en transition forcée (textures en cache),
  // on fait grimper la barre à 100% de manière fluide pendant la 1.5 seconde.
  useEffect(() => {
    if (visible && !active) {
      const interval = setInterval(() => {
        setDisplayProgress((p) => Math.min(p + 4, 100)); // ~25 ticks pour arriver à 100% sur 1.5s
      }, 50);
      return () => clearInterval(interval);
    }
  }, [visible, active]);

  if (!visible) {
    if (displayProgress !== 0) setDisplayProgress(0); // Reset for next time
    return null;
  }

  return (
    <div
      className="transition-overlay"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        pointerEvents: "all",
      }}
    >
      <div className="scanlines"></div>

      <div className="transition-content">
        <div className="spinner-container">
          <div className="futuristic-spinner"></div>
          <div className="spinner-core"></div>
        </div>

        {/* 🛠️ TEXTE PERSONNALISABLE ICI : Titre principal du chargement */}
        <h2 className="transition-title">
          Récupération du flux vidéo en cours...
        </h2>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${displayProgress}%` }}
          ></div>
        </div>

        {/* 🛠️ TEXTE PERSONNALISABLE ICI : Sous-titre avec le pourcentage */}
        <div className="progress-text">
          {displayProgress.toFixed(0)}% Module XKT-500
        </div>
      </div>
    </div>
  );
}

export function Loader3D() {
  return (
    <Html center prepend zIndexRange={[100, 0]}>
      <LoaderUI />
    </Html>
  );
}
