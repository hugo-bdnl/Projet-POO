import { useEffect, useRef, useState } from "react";
import { useSkyStore } from "../stores/useSkyStore";
import { useSatelliteStore } from "../stores/useSatelliteStore";
import {
  SATELLITE_GROUP_META,
  type SatelliteGroup,
} from "../types/satellite";

/**
 * Bouton flottant 🛰 (mobile uniquement, géré par CSS) qui ouvre un popup
 * compact pour activer/désactiver les satellites et choisir les groupes
 * affichés. 1 tap = ouvrir le popup.
 */
export function MobileSatellitesFab() {
  const { viewMode, selectedPlanet } = useSkyStore();
  const { showSatellites, toggleSatellites, activeGroups, toggleGroup } =
    useSatelliteStore();
  const [popupOpen, setPopupOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fermer le popup en cliquant en dehors
  useEffect(() => {
    if (!popupOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setPopupOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [popupOpen]);

  // Visible uniquement en mode globe sur la Terre
  if (viewMode !== "globe") return null;
  if (selectedPlanet && selectedPlanet !== "earth") return null;

  return (
    <div className="mobile-fab-wrapper" ref={wrapperRef}>
      <button
        className={`mobile-fab ${showSatellites ? "mobile-fab--active" : ""}`}
        onClick={() => setPopupOpen((v) => !v)}
        aria-label="Satellites"
      >
        🛰
      </button>

      {popupOpen && (
        <div className="mobile-fab__popup">
          <button
            className={`mobile-fab__toggle ${showSatellites ? "is-on" : ""}`}
            onClick={toggleSatellites}
          >
            {showSatellites ? "Désactiver les satellites" : "Activer les satellites"}
          </button>

          {showSatellites && (
            <div className="mobile-fab__groups">
              {(Object.keys(SATELLITE_GROUP_META) as SatelliteGroup[]).map(
                (g) => {
                  const m = SATELLITE_GROUP_META[g];
                  const isActive = activeGroups.has(g);
                  return (
                    <button
                      key={g}
                      className={`mobile-fab__group ${isActive ? "is-active" : ""}`}
                      onClick={() => toggleGroup(g)}
                      style={{
                        borderColor: isActive
                          ? `${m.color}66`
                          : "rgba(255,255,255,0.06)",
                        background: isActive ? `${m.color}15` : "transparent",
                        color: isActive ? m.color : "#777",
                      }}
                    >
                      <span
                        className="mobile-fab__dot"
                        style={{ background: isActive ? m.color : "#333" }}
                      />
                      {m.label}
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
