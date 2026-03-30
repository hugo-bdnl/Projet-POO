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
// Taille des points satellites
const SATELLITE_SIZE = 0.006;

// Scratch variables pré-allouées (JAMAIS dans useFrame)
const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

/** Satellite parsé prêt pour la propagation SGP4 */
interface ParsedSatellite {
  name: string;
  group: SatelliteGroup;
  satrec: SatRec;
  noradId: string;
  inclination_deg: number;
  period_min: number;
}

/** Convertit latitude (rad), longitude (rad), altitude (km) → Vector3 */
function geodeticToVector3(
  lat: number,
  lon: number,
  alt: number,
  target: THREE.Object3D,
) {
  const r = GLOBE_RADIUS + (alt / EARTH_RADIUS_KM) * ALTITUDE_AMPLIFICATION;
  const phi = Math.PI / 2 - lat;
  const theta = lon + Math.PI / 2;
  target.position.set(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
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
      // Extraire le NORAD ID depuis line1 (colonnes 2-6)
      const noradId = tle.line1.substring(2, 7).trim();
      // Inclinaison depuis line2 (colonnes 8-15)
      const inclination = parseFloat(tle.line2.substring(8, 16).trim());
      // Mouvement moyen (rev/jour) depuis line2 (colonnes 52-62) → période en minutes
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
      // TLE invalide, on l'ignore silencieusement
    }
  }
  return parsed;
}

export function SatelliteCoverage() {
  const { activeGroups, tleByGroup, fetchGroup, setSelectedSatellite } =
    useSatelliteStore();
  const { setSelectedPoint } = useObservationStore();

  const meshRef = useRef<THREE.InstancedMesh>(null!);
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

  // Couleurs par groupe pré-calculées
  const groupColors = useMemo(() => {
    const colors = new Map<SatelliteGroup, THREE.Color>();
    for (const [group, meta] of Object.entries(SATELLITE_GROUP_META)) {
      colors.set(group as SatelliteGroup, new THREE.Color(meta.color));
    }
    return colors;
  }, []);

  // Géométrie et matériau partagés
  const geometry = useMemo(
    () => new THREE.SphereGeometry(SATELLITE_SIZE, 6, 6),
    [],
  );
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        toneMapped: false,
      }),
    [],
  );

  // Mettre à jour le nombre d'instances quand les satellites changent
  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.count = allSatellites.length;

    // Initialiser les couleurs
    for (let i = 0; i < allSatellites.length; i++) {
      const color = groupColors.get(allSatellites[i].group) || _tempColor;
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }

    // Forcer une première propagation immédiate
    lastUpdateRef.current = -999;
  }, [allSatellites, groupColors]);

  useFrame((state) => {
    if (!meshRef.current || allSatellites.length === 0) return;

    // Throttle : propager les positions 1× par seconde seulement
    if (state.clock.elapsedTime - lastUpdateRef.current < 1) return;
    lastUpdateRef.current = state.clock.elapsedTime;

    const now = new Date();
    const gmst = gstime(now);

    for (let i = 0; i < allSatellites.length; i++) {
      const sat = allSatellites[i];
      const pv = propagate(sat.satrec, now);

      if (pv && pv.position && typeof pv.position !== "boolean") {
        const eci = pv.position as { x: number; y: number; z: number };
        const gd = eciToGeodetic(eci, gmst);
        geodeticToVector3(gd.latitude, gd.longitude, gd.height, _tempObj);
        _tempObj.updateMatrix();
        meshRef.current.setMatrixAt(i, _tempObj.matrix);
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Handler de clic sur un satellite
  const handleClick = (e: THREE.Event) => {
    // Typage de l'event R3F
    const event = e as unknown as {
      stopPropagation: () => void;
      instanceId?: number;
    };
    event.stopPropagation();
    const instanceId = event.instanceId;
    if (
      typeof instanceId !== "number" ||
      instanceId < 0 ||
      instanceId >= allSatellites.length
    )
      return;

    const sat = allSatellites[instanceId];
    const now = new Date();
    const pv = propagate(sat.satrec, now);

    if (pv && pv.position && typeof pv.position !== "boolean") {
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
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, allSatellites.length]}
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
