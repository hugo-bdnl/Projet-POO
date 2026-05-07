import { useEffect, useMemo, useState } from "react";
import { useConstellationStore } from "../stores/useConstellationStore";
import { useSkyStore } from "../stores/useSkyStore";
import { useObservationStore } from "../stores/useObservationStore";
import type { ConstellationListItem } from "../types";
import { altAzToXYZ, SKY_RADIUS } from "../utils/skyCoords";

/**
 * Composant pour un dessin de constellation miniature en 2D (SVG)
 */
function ConstellationMiniature({
  constellation,
}: {
  constellation: ConstellationListItem;
}) {
  const linesAndPoints = useMemo(() => {
    if (
      !constellation.lines_data ||
      !constellation.pattern_stars ||
      constellation.pattern_stars.length === 0
    ) {
      return null;
    }

    try {
      const pairs: [number, number][] = JSON.parse(constellation.lines_data);

      // Projeter les coordonnées RA/DEC en 2D
      // On centre sur la constellation pour la miniature
      const centerRa = constellation.center_ra || 0;
      const centerDec = constellation.center_dec || 0;

      const rad = Math.PI / 180;
      const cosDec = Math.cos(centerDec * rad);

      const points: { x: number; y: number }[] = [];
      const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];

      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

      // Project all stars and get bounding box
      const projectedStars = new Map<number, { x: number; y: number }>();

      for (const p of constellation.pattern_stars) {
        // Equirectangular projection local to the center
        // RA goes East, so to look at the sky from Earth, RA increases to the left
        // X = -(RA - center) * cos(centerDec)
        let dRa = p.ra - centerRa;
        // Wrap RA if it crosses 0/360 boundary
        if (dRa > 180) dRa -= 360;
        if (dRa < -180) dRa += 360;

        const x = -dRa * cosDec;
        const y = p.dec - centerDec;

        projectedStars.set(p.hip_id, { x, y });
        points.push({ x, y });

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      // Add padding to bounding box
      const pad = Math.max((maxX - minX) * 0.1, (maxY - minY) * 0.1, 1);
      minX -= pad;
      maxX += pad;
      minY -= pad;
      maxY += pad;

      pairs.forEach(([hip1, hip2]) => {
        const p1 = projectedStars.get(hip1);
        const p2 = projectedStars.get(hip2);
        if (p1 && p2) {
          lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
        }
      });

      return {
        points,
        lines,
        viewBox: `${minX} ${-maxY} ${maxX - minX} ${maxY - minY}`,
      };
    } catch (e) {
      console.error("Error parsing constellation miniature data", e);
      return null;
    }
  }, [constellation]);

  if (!linesAndPoints) {
    return <div className="miniature-fallback">🌌</div>;
  }

  return (
    <svg viewBox={linesAndPoints.viewBox} className="constellation-svg">
      {/* SVG inverted Y axis because SVG Y goes down, but DEC goes up */}
      {linesAndPoints.lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={-l.y1}
          x2={l.x2}
          y2={-l.y2}
          stroke="rgba(0, 240, 255, 0.4)" // <-- Changer ici pour modifier la couleur des lignes
          strokeWidth={(linesAndPoints.viewBox.split(" ")[2] as any) / 40}
        />
      ))}
      {linesAndPoints.points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={-p.y}
          r={(linesAndPoints.viewBox.split(" ")[2] as any) / 45} // <-- Changer ici pour modifier la taille des étoiles
          fill="#fff" // <-- Changer ici pour modifier la couleur des étoiles
        />
      ))}
    </svg>
  );
}

export function ConstellationSidebar() {
  const {
    viewMode,
    timestamp,
    setViewMode,
    fetchVisibleStars,
    setCameraTarget,
    selectedPlanet,
    setIsTransitioning,
  } = useSkyStore();
  const { setSelectedPoint } = useObservationStore();
  const {
    allConstellations,
    fetchAllConstellations,
    loadingList,
    fetchConstellationDetailAndLocation,
    isConstellationSidebarOpen,
    setConstellationSidebarOpen,
  } = useConstellationStore();

  const [localSearch, setLocalSearch] = useState("");
  const [loadingActionId, setLoadingActionId] = useState<number | null>(null);

  // Fetch all constellations on mount if not already loaded
  useEffect(() => {
    fetchAllConstellations();
  }, [fetchAllConstellations]);

  // Sur mobile, replier la sidebar des constellations par défaut pour
  // libérer la vue 3D. L'utilisateur peut toujours l'ouvrir via le toggle.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
      setConstellationSidebarOpen(false);
    }
    // S'exécute uniquement au montage initial — l'état utilisateur prime ensuite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filtering
  const filteredConstellations = useMemo(() => {
    if (!localSearch.trim()) return allConstellations;
    const term = localSearch.toLowerCase();
    return allConstellations.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.name_fr && c.name_fr.toLowerCase().includes(term)) ||
        c.abbreviation.toLowerCase().includes(term),
    );
  }, [localSearch, allConstellations]);

  // Only show in globe mode for Earth
  if (viewMode !== "globe" || (selectedPlanet && selectedPlanet !== "earth"))
    return null;

  const handleSelect = async (id: number) => {
    setLoadingActionId(id);
    // Afficher le loader immédiatement — les appels API suivants prennent 5-6s sur mobile
    setIsTransitioning(true);
    // Vider les extras du pattern précédent
    useSkyStore.getState().clearConstellationExtras();

    try {
      await fetchConstellationDetailAndLocation(id, timestamp);

      const { bestLocation, selectedConstellation } =
        useConstellationStore.getState();
      if (bestLocation) {
        const point = {
          id: bestLocation.observation_point_id,
          name: bestLocation.observation_point_name,
          latitude: bestLocation.latitude,
          longitude: bestLocation.longitude,
          timezone: "UTC",
        };

        setSelectedPoint(point);
        setViewMode("sky");
        await fetchVisibleStars(
          bestLocation.latitude,
          bestLocation.longitude,
          timestamp,
        );

        const currentStars = useSkyStore.getState().stars;
        if (selectedConstellation?.lines_data && currentStars.length > 0) {
          try {
            const pairs: [number, number][] = JSON.parse(
              selectedConstellation.lines_data,
            );
            let cx = 0,
              cy = 0,
              cz = 0,
              count = 0;
            const starsByHip = new Map(
              currentStars
                .filter((s) => s.hip_id !== null)
                .map((s) => [s.hip_id!, s]),
            );

            const hipIds = new Set(pairs.flat());

            // Fetcher les étoiles manquantes du pattern APRÈS fetchVisibleStars
            // (les coordonnées currentLat/currentLon sont maintenant celles du best location)
            await useSkyStore.getState().fetchConstellationExtras(hipIds);

            for (const hipId of hipIds) {
              const star = starsByHip.get(hipId);
              if (star) {
                const [sx, sy, sz] = altAzToXYZ(
                  star.altitude,
                  star.azimuth,
                  SKY_RADIUS,
                );
                cx += sx;
                cy += sy;
                cz += sz;
                count++;
              }
            }
            if (count > 0) {
              setCameraTarget([cx / count, cy / count, cz / count]);
            }
          } catch (e) {
            console.error("Erreur calcul barycentre constellation", e);
          }
        }
      }
    } finally {
      // Fin du chargement — le loader disparaît (R3F prend le relai si des
      // ressources 3D doivent encore se charger via useProgress.active)
      setIsTransitioning(false);
      setLoadingActionId(null);
    }
  };

  return (
    <div
      className={`constellation-sidebar ${!isConstellationSidebarOpen ? "collapsed" : ""}`}
    >
      <button
        className="sidebar-toggle-button"
        onClick={() => setConstellationSidebarOpen(!isConstellationSidebarOpen)}
        title={
          !isConstellationSidebarOpen
            ? "Afficher les constellations"
            : "Masquer les constellations"
        }
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <div className="sidebar-header">
        <h2>IAU Constellations</h2>
        <input
          type="text"
          placeholder="Rechercher une constellation..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="sidebar-search"
        />
      </div>

      <div className="sidebar-content">
        {loadingList ? (
          <p className="loading-text">Chargement des constellations...</p>
        ) : (
          <div className="constellation-grid">
            {filteredConstellations.map((c) => (
              <div
                key={c.id}
                className={`constellation-card ${loadingActionId === c.id ? "loading" : ""}`}
                onClick={() => handleSelect(c.id)}
              >
                <div className="miniature-container">
                  <ConstellationMiniature constellation={c} />
                </div>
                <div className="card-info">
                  <span className="card-name">{c.name_fr || c.name}</span>
                  <span className="card-abbr">{c.abbreviation}</span>
                </div>
              </div>
            ))}
            {filteredConstellations.length === 0 && (
              <p className="no-results">Aucune constellation trouvée.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
