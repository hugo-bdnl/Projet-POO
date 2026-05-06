import { useMemo, useState } from "react";
import { useSkyStore } from "../stores/useSkyStore";
import { PLANETS_METADATA } from "../types/planets";
import { computePlanetPositions } from "../utils/planetaryEphemeris";

/**
 * Bandeau cliquable en haut à droite (mobile uniquement, géré par CSS) qui
 * remplace le PlanetInfoCard. Tap → overlay plein écran avec toutes les infos
 * planète + bouton retour vers le système solaire.
 */
export function MobilePlanetBadge() {
  const {
    viewMode,
    transitionToMode,
    selectedPlanet,
    setSelectedPlanet,
    timestamp,
  } = useSkyStore();
  const [open, setOpen] = useState(false);

  const dynamicData = useMemo(() => {
    if (!selectedPlanet) return null;
    const calcDate = timestamp ? new Date(timestamp) : new Date();
    const positions = computePlanetPositions(calcDate, true);
    return positions.get(selectedPlanet);
  }, [selectedPlanet, timestamp]);

  if (viewMode !== "globe" || !selectedPlanet) return null;
  const meta = PLANETS_METADATA[selectedPlanet];
  if (!meta || !dynamicData) return null;

  const handleReturnToSystem = () => {
    setOpen(false);
    setSelectedPlanet(null);
    transitionToMode("system");
  };

  return (
    <>
      <button
        className="mobile-planet-badge"
        onClick={() => setOpen(true)}
        aria-label={`Infos ${dynamicData.name}`}
      >
        <span className="mobile-planet-badge__name">{dynamicData.name}</span>
        <span className="mobile-planet-badge__caret">ℹ</span>
      </button>

      {open && (
        <div className="mobile-planet-overlay" role="dialog">
          <div className="mobile-planet-overlay__header">
            <h2>{dynamicData.name}</h2>
            <button
              className="mobile-planet-overlay__close"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="mobile-planet-overlay__content">
            <div className="mobile-planet-overlay__type">{meta.type}</div>
            <p className="mobile-planet-overlay__desc">{meta.description}</p>

            <div className="mobile-planet-overlay__rows">
              <Row
                label="Distance à la Terre"
                value={`${dynamicData.distanceToEarth.toFixed(3)} UA`}
              />
              {selectedPlanet !== "sun" && (
                <Row
                  label="Distance au Soleil"
                  value={`${dynamicData.helioDist.toFixed(3)} UA`}
                />
              )}
              <Row
                label="Rayon équatorial"
                value={`${meta.radiusKm.toLocaleString()} km`}
              />
              <Row label="Masse" value={meta.mass} />
              <Row label="Température moyenne" value={meta.tempAvg} />
              <Row label="Satellites naturels" value={String(meta.moons)} />
            </div>
          </div>

          <button
            className="mobile-planet-overlay__back"
            onClick={handleReturnToSystem}
          >
            ← Retour au Système Solaire
          </button>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mobile-planet-row">
      <span className="mobile-planet-row__label">{label}</span>
      <span className="mobile-planet-row__value">{value}</span>
    </div>
  );
}
