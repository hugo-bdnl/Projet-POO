import { useProgress } from "@react-three/drei";
import "./TransitionScreen.css";

import { useEffect, useState, useRef } from "react";
import { useSkyStore } from "../stores/useSkyStore";

export function LoaderUI() {
  const { active, progress } = useProgress();
  const { isTransitioning, viewMode, selectedPlanet } = useSkyStore();

  const [displayProgress, setDisplayProgress] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [forceVisibleTimer, setForceVisibleTimer] = useState(true);
  const prevModeRef = useRef(viewMode);

  useEffect(() => {
    prevModeRef.current = viewMode;
  }, [viewMode]);

  // Timer de 1.5s pour forcer le chargement initial
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceVisibleTimer(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Marquer la fin du premier chargement une fois le temps min passé et ThreeJS prêt
  useEffect(() => {
    if (isFirstLoad && !active && !forceVisibleTimer) {
      setIsFirstLoad(false);
    }
  }, [active, forceVisibleTimer, isFirstLoad]);

  // Affiche l'écran si timer initial en cours, ou R3F charge, ou on force une transition
  const visible = forceVisibleTimer || active || isTransitioning;

  // Suit la progression réelle de ThreeJS
  useEffect(() => {
    if (active) {
      setDisplayProgress((p) => Math.max(p, progress));
    }
  }, [active, progress]);

  // Si on est en transition forcée (textures en cache) ou au premier chargement forcé,
  // on fait grimper la barre à 100% de manière fluide.
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

  // Détermination du sous-titre dynamique
  let titleText = "Récupération du flux vidéo en cours...";
  let statusText = "";

  if (isFirstLoad) {
    // 🛠️ TEXTE DU PREMIER CHARGEMENT
    titleText = "Session initialization...";
    statusText = ""; // Aucun sous-texte
  } else {
    // 🛠️ TEXTES DE TRANSITION (MODIFIABLES ICI SELON LES SITUATIONS)
    if (viewMode === "globe") {
      if (prevModeRef.current === "sky") {
        statusText = "Back to globe";
      } else {
        const planetName = selectedPlanet
          ? selectedPlanet.charAt(0).toUpperCase() + selectedPlanet.slice(1)
          : "Planète";
        statusText = `Cible : ${planetName}`;
      }
    } else if (viewMode === "sky") {
      statusText = "Cible : Étoiles";
    } else if (viewMode === "system") {
      statusText = "Back to system";
    }
  }

  return (
    <div className="transition-overlay">
      <div className="scanlines"></div>

      <div className="transition-content">
        <div className="spinner-container">
          <div className="futuristic-spinner"></div>
          <div className="spinner-core"></div>
        </div>

        {/* Titre principal dynamique */}
        <h2 className="transition-title">{titleText}</h2>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${displayProgress}%` }}
          ></div>
        </div>

        <div className="progress-text">
          {displayProgress.toFixed(0)}%{statusText ? ` ${statusText}` : ""}
        </div>
      </div>
    </div>
  );
}

// Loader3D kept as noop — LoaderUI est désormais rendu hors Canvas dans App.tsx
// pour garantir un positionnement fixed fiable sur mobile.
export function Loader3D() {
  return null;
}
