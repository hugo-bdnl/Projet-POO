import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
} from "satellite.js";
import type { SatRec } from "satellite.js";
import { useSatelliteStore } from "../stores/useSatelliteStore";
import { useObservationStore } from "../stores/useObservationStore";
import type {
  SatelliteGroup,
  SatelliteTLE,
} from "../types/satellite";
import { SATELLITE_GROUP_META } from "../types/satellite";

// --- CONSTANTES ---
const GLOBE_RADIUS = 1;
const EARTH_RADIUS_KM = 6371.0;
const ALTITUDE_AMPLIFICATION = 2.0;
// Taille en pixels, indépendante du zoom (sizeAttenuation: false)
const POINT_SIZE_PX = 3;

// Couleur de fallback pour groupe inconnu — pré-allouée hors composant
const _fallbackColor = new THREE.Color("#888888");

/** Satellite parsé prêt pour la propagation SGP4 */
interface ParsedSatellite {
  name: string;
  group: SatelliteGroup;
  satrec: SatRec;
  noradId: string;
  inclination_deg: number;
  period_min: number;
}

/**
 * Écrit les coordonnées XYZ (globe 3D) dans un Float32Array à l'offset donné.
 * Évite toute allocation dans la boucle useFrame.
 */
function writeGeodeticToBuffer(
  lat: number,
  lon: number,
  alt: number,
  arr: Float32Array,
  offset: number,
): void {
  const r = GLOBE_RADIUS + (alt / EARTH_RADIUS_KM) * ALTITUDE_AMPLIFICATION;
  const phi = Math.PI / 2 - lat;
  const theta = lon + Math.PI / 2;
  arr[offset]     = r * Math.sin(phi) * Math.cos(theta);
  arr[offset + 1] = r * Math.cos(phi);
  arr[offset + 2] = r * Math.sin(phi) * Math.sin(theta);
}

/** Parse les TLEs en satrecs avec gestion d'erreurs */
function parseTLEs(
  tles: SatelliteTLE[],
  group: SatelliteGroup,
): ParsedSatellite[] {
  const parsed: ParsedSatellite[] = [];
  for (const tle of tles) {
    try {
      const satrec = twoline2satrec(tle.line1, tle.line2);
      const noradId = tle.line1.substring(2, 7).trim();
      const inclination = parseFloat(tle.line2.substring(8, 16).trim());
      const meanMotion = parseFloat(tle.line2.substring(52, 63).trim());
      const period = meanMotion > 0 ? 1440 / meanMotion : 0;

      parsed.push({
        name: tle.name,
        group,
        satrec,
        noradId,
        inclination_deg: inclination,
        period_min: period,
      });
    } catch {
      // TLE invalide, ignoré silencieusement
    }
  }
  return parsed;
}

export function SatelliteCoverage() {
  const { activeGroups, tleByGroup, fetchGroup, setSelectedSatellite } =
    useSatelliteStore();
  const { setSelectedPoint } = useObservationStore();

  const lastUpdateRef = useRef<number>(-999);

  // Fetch les TLEs des groupes actifs au montage / changement
  useEffect(() => {
    for (const group of activeGroups) {
      fetchGroup(group);
    }
  }, [activeGroups, fetchGroup]);

  // Cache le parsing par groupe (ne re-parse que quand les TLEs changent)
  const parsedByGroup = useMemo(() => {
    const map = new Map<string, ParsedSatellite[]>();
    for (const [group, tles] of Object.entries(tleByGroup)) {
      map.set(group, parseTLEs(tles, group as SatelliteGroup));
    }
    return map;
  }, [tleByGroup]);

  // Agrège uniquement les groupes actifs (toggle rapide, sans re-parse)
  const allSatellites = useMemo(() => {
    const result: ParsedSatellite[] = [];
    for (const group of activeGroups) {
      const parsed = parsedByGroup.get(group);
      if (parsed) result.push(...parsed);
    }
    return result;
  }, [activeGroups, parsedByGroup]);

  // Couleurs par groupe pré-calculées (THREE.Color réutilisables)
  const groupColors = useMemo(() => {
    const colors = new Map<SatelliteGroup, THREE.Color>();
    for (const [group, meta] of Object.entries(SATELLITE_GROUP_META)) {
      colors.set(group as SatelliteGroup, new THREE.Color(meta.color));
    }
    return colors;
  }, []);

  // Géométrie unique, mutée en place quand les satellites changent
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);

  // Matériau : points en pixels fixes, couleurs par vertex
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: POINT_SIZE_PX,
        sizeAttenuation: false, // taille constante quel que soit le zoom
        vertexColors: true,
        toneMapped: false,
      }),
    [],
  );

  // Nettoyage GPU à la destruction du composant
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Réinitialise les buffers position + couleur quand la liste de satellites change
  useEffect(() => {
    const count = allSatellites.length;
    const positions = new Float32Array(count * 3); // initialisé à 0,0,0
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const color = groupColors.get(allSatellites[i].group) ?? _fallbackColor;
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, count);

    // Forcer une propagation immédiate au prochain frame
    lastUpdateRef.current = -999;
  }, [allSatellites, groupColors, geometry]);

  useFrame((state) => {
    if (allSatellites.length === 0) return;

    // Throttle : 1 propagation SGP4 par seconde max
    if (state.clock.elapsedTime - lastUpdateRef.current < 1) return;
    lastUpdateRef.current = state.clock.elapsedTime;

    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!posAttr) return;

    const arr = posAttr.array as Float32Array;
    const now = new Date();
    const gmst = gstime(now);

    for (let i = 0; i < allSatellites.length; i++) {
      const pv = propagate(allSatellites[i].satrec, now);
      if (pv?.position && typeof pv.position !== "boolean") {
        const eci = pv.position as { x: number; y: number; z: number };
        const gd = eciToGeodetic(eci, gmst);
        writeGeodeticToBuffer(gd.latitude, gd.longitude, gd.height, arr, i * 3);
      }
    }

    posAttr.needsUpdate = true;
  });

  // Handler de clic — `index` est l'index du point dans THREE.Points
  const handleClick = (e: THREE.Event) => {
    const event = e as unknown as {
      stopPropagation: () => void;
      index?: number;
    };
    event.stopPropagation();
    const idx = event.index;
    if (typeof idx !== "number" || idx < 0 || idx >= allSatellites.length)
      return;

    const sat = allSatellites[idx];
    const now = new Date();
    const pv = propagate(sat.satrec, now);

    if (pv?.position && typeof pv.position !== "boolean") {
      const eci = pv.position as { x: number; y: number; z: number };
      const gd = eciToGeodetic(eci, gstime(now));

      let speed_kmh = 0;
      if (pv.velocity && typeof pv.velocity !== "boolean") {
        const vel = pv.velocity as { x: number; y: number; z: number };
        speed_kmh =
          Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2) * 3600;
      }

      setSelectedPoint(null);
      setSelectedSatellite({
        name: sat.name,
        group: sat.group,
        latitude_deg: (gd.latitude * 180) / Math.PI,
        longitude_deg: (gd.longitude * 180) / Math.PI,
        altitude_km: gd.height,
        speed_kmh,
        inclination_deg: sat.inclination_deg,
        period_min: sat.period_min,
        norad_id: sat.noradId,
      });
    }
  };

  if (allSatellites.length === 0) return null;

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      onClick={handleClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    />
  );
}
