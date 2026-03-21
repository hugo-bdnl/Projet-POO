import { useState, useMemo } from "react";
import { useTexture, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { useSkyStore } from "../stores/useSkyStore";
import { PLANETS_METADATA } from "../types/planets";
import { getMoonsForPlanet, type MoonData } from "../types/moons";
import type { PlanetId } from "../types/planets";
import { J2000_MS } from "../utils/planetaryEphemeris";

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Points sur la courbe de l'orbite */
const ORBIT_SEGMENTS = 64;

// ─── Utilitaires ───────────────────────────────────────────────────────────────

/**
 * Calcule le rayon orbital visuel (espace local de la planète, rayon = 1).
 * Utilise une échelle logarithmique pour garder les lunes proches lisibles
 * sans que les plus éloignées sortent du cadre.
 */
function visualOrbitRadius(semiMajorAxisKm: number, planetRadiusKm: number): number {
  const ratio = semiMajorAxisKm / planetRadiusKm;
  return 1.5 + Math.log2(ratio) * 0.5;
}

/**
 * Calcule le rayon visuel de la lune (espace local de la planète).
 * Proportionnel à la taille réelle, clampé pour rester lisible.
 */
function visualMoonRadius(moonRadiusKm: number, planetRadiusKm: number): number {
  return Math.max(0.05, Math.min(0.22, (moonRadiusKm / planetRadiusKm) * 2.0));
}

/**
 * Calcule l'angle orbital keplérien (rad) depuis J2000 et la période de la lune.
 * Un periodDays négatif produit un mouvement rétrograde (Triton).
 */
function keplerAngle(periodDays: number, timestampMs: number): number {
  const daysSinceJ2000 = (timestampMs - J2000_MS) / 86_400_000;
  return (((2 * Math.PI) / periodDays) * daysSinceJ2000) % (2 * Math.PI);
}

/** Formate une distance en km de façon lisible */
function formatDistance(km: number): string {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)} M km`;
  return `${km.toLocaleString("fr-FR")} km`;
}

// ─── Points d'orbite (cercle dans le plan XZ) ─────────────────────────────────

function buildOrbitPoints(orbitR: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
    const a = (i / ORBIT_SEGMENTS) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR));
  }
  return pts;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipProps {
  moon: MoonData;
}

function MoonTooltip({ moon }: TooltipProps) {
  const absPeriod = Math.abs(moon.periodDays);
  const periodLabel =
    absPeriod < 1
      ? `${Math.round(absPeriod * 24)} h`
      : absPeriod < 2
        ? `${absPeriod.toFixed(2)} jour`
        : `${absPeriod.toFixed(2)} jours`;

  return (
    <div
      style={{
        background: "rgba(8, 12, 24, 0.92)",
        border: "1px solid rgba(120, 160, 255, 0.35)",
        borderRadius: "8px",
        padding: "10px 14px",
        color: "#e8eeff",
        fontSize: "12px",
        lineHeight: "1.6",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        backdropFilter: "blur(6px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        transform: "translateX(14px) translateY(-50%)",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px", color: "#a8c4ff" }}>
        {moon.name}
      </div>
      <div style={{ color: "#8899bb" }}>Distance : {formatDistance(moon.semiMajorAxisKm)}</div>
      <div style={{ color: "#8899bb" }}>Période : {periodLabel}{moon.periodDays < 0 ? " (rétrograde)" : ""}</div>
      <div style={{ color: "#8899bb" }}>Rayon : {moon.radiusKm.toLocaleString("fr-FR")} km</div>
      <div
        style={{
          marginTop: "6px",
          paddingTop: "6px",
          borderTop: "1px solid rgba(120, 160, 255, 0.2)",
          color: "#99aabb",
          maxWidth: "240px",
          whiteSpace: "normal",
          lineHeight: "1.4",
        }}
      >
        {moon.description}
      </div>
    </div>
  );
}

// ─── Composant individuel par lune ────────────────────────────────────────────

interface MoonOrbitProps {
  moon: MoonData;
  texture: THREE.Texture;
  planetRadiusKm: number;
  timestampMs: number;
}

function MoonOrbit({ moon, texture, planetRadiusKm, timestampMs }: MoonOrbitProps) {
  const [hovered, setHovered] = useState(false);

  const orbitR = useMemo(
    () => visualOrbitRadius(moon.semiMajorAxisKm, planetRadiusKm),
    [moon.semiMajorAxisKm, planetRadiusKm],
  );

  const moonR = useMemo(
    () => visualMoonRadius(moon.radiusKm, planetRadiusKm),
    [moon.radiusKm, planetRadiusKm],
  );

  const orbitPoints = useMemo(() => buildOrbitPoints(orbitR), [orbitR]);

  // Position keplerienne mise à jour avec le timestamp (slider temporel)
  const position = useMemo<[number, number, number]>(() => {
    const angle = keplerAngle(moon.periodDays, timestampMs);
    return [Math.cos(angle) * orbitR, 0, Math.sin(angle) * orbitR];
  }, [moon.periodDays, timestampMs, orbitR]);

  // Inclinaison du plan orbital — constante pour toute la durée de vie du composant
  const inclinationRad = useMemo(
    () => THREE.MathUtils.degToRad(moon.inclination),
    [moon.inclination],
  );

  return (
    <group rotation={[inclinationRad, 0, 0]}>
      {/* Ligne d'orbite */}
      <Line
        points={orbitPoints}
        color="#7090cc"
        transparent
        opacity={0.18}
        lineWidth={0.6}
      />

      {/* Corps de la lune */}
      <mesh
        position={position}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[moonR, 16, 16]} />
        <meshStandardMaterial map={texture} roughness={0.85} metalness={0.05} />

        {hovered && (
          <Html
            center={false}
            style={{ pointerEvents: "none" }}
            zIndexRange={[100, 0]}
          >
            <MoonTooltip moon={moon} />
          </Html>
        )}
      </mesh>
    </group>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface PlanetMoonsProps {
  planetId: PlanetId;
}

export function PlanetMoons({ planetId }: PlanetMoonsProps) {
  const timestamp = useSkyStore((s) => s.timestamp);

  const moons = useMemo(() => getMoonsForPlanet(planetId), [planetId]);
  const planetRadiusKm = PLANETS_METADATA[planetId].radiusKm;

  // Batch : toutes les textures du groupe de lunes chargées en parallèle (pas de waterfall Suspense)
  const textureRecord = useMemo(
    () => Object.fromEntries(moons.map((m) => [m.id, m.texturePath])),
    [moons],
  );
  const textures = useTexture(textureRecord) as Record<string, THREE.Texture>;

  const timestampMs = useMemo(
    () => (timestamp ? new Date(timestamp).getTime() : Date.now()),
    [timestamp],
  );

  if (moons.length === 0) return null;

  return (
    <>
      {moons.map((moon) => (
        <MoonOrbit
          key={moon.id}
          moon={moon}
          texture={textures[moon.id]}
          planetRadiusKm={planetRadiusKm}
          timestampMs={timestampMs}
        />
      ))}
    </>
  );
}
