import { useSkyStore } from "../stores/useSkyStore";

/**
 * Petit bouton flèche en haut à gauche (mobile uniquement, géré par CSS) qui
 * fait revenir au mode Système Solaire. Toujours accessible en mode globe,
 * en complément du bouton équivalent dans l'overlay infos planète.
 */
export function MobileSystemReturnButton() {
  const { viewMode, selectedPlanet, transitionToMode, setSelectedPlanet } =
    useSkyStore();

  if (viewMode !== "globe" || !selectedPlanet) return null;

  return (
    <button
      className="mobile-system-return"
      onClick={() => {
        setSelectedPlanet(null);
        transitionToMode("system");
      }}
      aria-label="Retour au système solaire"
      title="Retour au système solaire"
    >
      ←
    </button>
  );
}
