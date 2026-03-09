import { useState, useEffect, useRef } from "react";
import { useSkyStore } from "../stores/useSkyStore";
import { useObservationStore } from "../stores/useObservationStore";

export const TimeSlider = () => {
  const { viewMode, setTimestamp, fetchVisibleStars } = useSkyStore();
  const { selectedPoint } = useObservationStore();

  const [dateStr, setDateStr] = useState<string>("");
  const [hourRatio, setHourRatio] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Initialise l'input avec la date courante formatée pour le datetime-local
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localISOTime = new Date(now.getTime() - tzOffsetMs)
      .toISOString()
      .slice(0, 16);

    setTimeout(() => {
      setDateStr(localISOTime);
      setHourRatio(now.getHours() + now.getMinutes() / 60);
    }, 0);
  }, []);

  const triggerUpdate = (isoString: string) => {
    // Met à jour l'heure globale en direct (fluide côté Globe car transiente)
    setTimestamp(isoString);

    // Si on est en mode sky, on ne spamme pas l'API Python 60 fois par seconde.
    // On debounce (100ms) pour requérir seulement à l'arrêt ou au ralentissement du slide.
    if (viewMode === "sky" && selectedPoint) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fetchVisibleStars(
          selectedPoint.latitude,
          selectedPoint.longitude,
          isoString,
        );
      }, 100);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateStr(val);

    const dateObj = new Date(val);
    if (!isNaN(dateObj.getTime())) {
      setHourRatio(dateObj.getHours() + dateObj.getMinutes() / 60);
      triggerUpdate(dateObj.toISOString());
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRatio = parseFloat(e.target.value);
    setHourRatio(newRatio);

    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      const hours = Math.floor(newRatio);
      const minutes = Math.floor((newRatio - hours) * 60);

      dateObj.setHours(hours, minutes, 0, 0);

      // Update string representation
      const tzOffsetMs = dateObj.getTimezoneOffset() * 60 * 1000;
      const localISOTime = new Date(dateObj.getTime() - tzOffsetMs)
        .toISOString()
        .slice(0, 16);
      setDateStr(localISOTime);

      triggerUpdate(dateObj.toISOString());
    }
  };

  const handleResetToNow = () => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localISOTime = new Date(now.getTime() - tzOffsetMs)
      .toISOString()
      .slice(0, 16);
    setDateStr(localISOTime);
    setHourRatio(now.getHours() + now.getMinutes() / 60);
    setTimestamp(""); // Default backend behavior

    if (viewMode === "sky" && selectedPoint) {
      fetchVisibleStars(
        selectedPoint.latitude,
        selectedPoint.longitude,
        undefined,
      );
    }
  };

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
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        color: "white",
        boxShadow: "0 0 20px rgba(0,255,255,0.1)",
        zIndex: 10,
        minWidth: "350px",
      }}
    >
      <div style={{ display: "flex", gap: "15px", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
        <input
          type="date"
          value={dateStr.slice(0, 10)}
          onChange={(e) => {
            // Keep current time, just change date
            const newDate = e.target.value;
            const currentTime = dateStr.slice(11, 16);
            if (newDate) {
              handleDateChange({ target: { value: `${newDate}T${currentTime || "12:00"}` } } as any);
            }
          }}
          style={{
            background: "transparent",
            color: "cyan",
            border: "none",
            outline: "none",
            fontSize: "1em",
            fontFamily: "monospace",
          }}
        />
        <div style={{ fontWeight: "bold", fontFamily: "monospace", color: "#00f0ff" }}>
          {Math.floor(hourRatio).toString().padStart(2, '0')}:
          {Math.floor((hourRatio % 1) * 60).toString().padStart(2, '0')}
        </div>
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

      {viewMode !== "system" && (
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.8em", color: "#666" }}>0h</span>
          <input
            type="range"
            min="0"
            max="23.99"
            step="0.1"
            value={hourRatio}
            onChange={handleSliderChange}
            style={{
              flex: 1,
              cursor: "pointer",
              accentColor: "#00f0ff",
            }}
          />
          <span style={{ fontSize: "0.8em", color: "#666" }}>24h</span>
        </div>
      )}
    </div>
  );
};
