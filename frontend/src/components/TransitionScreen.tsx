import { useEffect, useState } from "react";
import { useSkyStore } from "../stores/useSkyStore";
import { PLANETS_METADATA } from "../types/planets";
import "./TransitionScreen.css";

export function TransitionScreen() {
  const { isTransitioning, endTransitionToGlobe, selectedPlanet } =
    useSkyStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isTransitioning) {
      setProgress(0);
      return;
    }

    // Durée totale de la transition: 2.5s
    const totalDuration = 2500;
    const intervalTime = 50;
    const steps = totalDuration / intervalTime;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setProgress(Math.min((currentStep / steps) * 100, 100));

      if (currentStep >= steps) {
        clearInterval(interval);
        endTransitionToGlobe();
      }
    }, intervalTime);

    // Préchargement de la texture de la planète ciblée (optionnel mais fluide)
    if (selectedPlanet && PLANETS_METADATA[selectedPlanet]) {
      const img = new Image();
      img.src = PLANETS_METADATA[selectedPlanet].textureGlobePath;
    }

    return () => clearInterval(interval);
  }, [isTransitioning, endTransitionToGlobe, selectedPlanet]);

  if (!isTransitioning) return null;

  return (
    <div className="transition-overlay">
      <div className="scanlines"></div>

      <div className="transition-content">
        <div className="spinner-container">
          <div className="futuristic-spinner"></div>
          <div className="spinner-core"></div>
        </div>

        <h2 className="transition-title">RÉCUPÉRATION DU FLUX VIDÉO</h2>

        <div className="planet-target">
          Cible:{" "}
          <span className="highlight">
            {selectedPlanet ? selectedPlanet.toUpperCase() : "INCONNUE"}
          </span>
        </div>

        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="progress-text">
          {Math.floor(progress)}% - CALIBRATION DES CAPTEURS...
        </div>
      </div>
    </div>
  );
}
