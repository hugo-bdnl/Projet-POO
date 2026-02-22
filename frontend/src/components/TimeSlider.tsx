import { useState, useEffect } from "react";
import { useSkyStore } from "../stores/useSkyStore";
import { useObservationStore } from "../stores/useObservationStore";

export const TimeSlider = () => {
  const { viewMode, setTimestamp, fetchVisibleStars } = useSkyStore();
  const { selectedPoint } = useObservationStore();

  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    // Initialise l'input avec la date courante formatée pour le datetime-local (sans secondes)
    const now = new Date();
    // Ajustement de time-zone basique local -> iso format "YYYY-MM-DDTHH:mm"
    const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localISOTime = new Date(now.getTime() - tzOffsetMs)
      .toISOString()
      .slice(0, 16);
    setTimeout(() => setDateStr(localISOTime), 0);
    // On n'hydrate pas immédiatement le store, par défaut le backend utilise datetime.now()
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateStr(val);

    // Convertir de local à un véritable timestamp ISO UTC pour le backend
    const dateObj = new Date(val);
    if (!isNaN(dateObj.getTime())) {
      const isoString = dateObj.toISOString();
      setTimestamp(isoString);

      // Si nous sommes en pleine observation du ciel, recharge automatiquement
      if (viewMode === "sky" && selectedPoint) {
        fetchVisibleStars(
          selectedPoint.latitude,
          selectedPoint.longitude,
          isoString,
        );
      }
    }
  };

  const handleResetToNow = () => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localISOTime = new Date(now.getTime() - tzOffsetMs)
      .toISOString()
      .slice(0, 16);
    setDateStr(localISOTime);
    setTimestamp(""); // String vide pour utiliser le backend par defaut
    if (viewMode === "sky" && selectedPoint) {
      fetchVisibleStars(
        selectedPoint.latitude,
        selectedPoint.longitude,
        undefined,
      ); // Refetch fresh
    }
  };

  if (viewMode !== "sky") return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(10, 10, 10, 0.85)",
        padding: "15px 25px",
        borderRadius: "40px",
        border: "1px solid #333",
        display: "flex",
        alignItems: "center",
        gap: "15px",
        color: "white",
        boxShadow: "0 0 20px rgba(0,255,255,0.1)",
        zIndex: 10,
      }}
    >
      <span style={{ fontSize: "0.9em", fontWeight: "bold" }}>
        Chronologie Oblique :
      </span>
      <input
        type="datetime-local"
        value={dateStr}
        onChange={handleDateChange}
        style={{
          background: "transparent",
          color: "cyan",
          border: "none",
          outline: "none",
          fontSize: "1em",
        }}
      />
      <button
        onClick={handleResetToNow}
        style={{
          background: "#333",
          border: "none",
          color: "white",
          padding: "5px 10px",
          borderRadius: "15px",
          cursor: "pointer",
          fontSize: "0.8em",
        }}
      >
        Aujourd'hui
      </button>
    </div>
  );
};
