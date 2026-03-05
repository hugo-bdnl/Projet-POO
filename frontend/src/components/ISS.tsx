import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { twoline2satrec, propagate, gstime, eciToGeodetic } from "satellite.js";
import { useISSStore } from "../stores/useISSStore";
import { useObservationStore } from "../stores/useObservationStore";

// --- CONFIGURATION VISUELLE (non exportée : évite l'erreur HMR Vite) ---
const ISS_SCALE = [0.02, 0.02, 0.02] as [number, number, number];
const ORBIT_COLOR = "#00ffcc";
const ORBIT_OPACITY = 0.6;

// Fenêtre temporelle de la trajectoire affichée autour de l'ISS :
//   PAST_MINUTES  minutes dans le passé  → ISS est visible SUR la ligne, pas à l'extrémité
//   FUTURE_MINUTES minutes dans le futur → trajectoire prédite
// Total ~55 min évite le retour quasi-complet (~92 min) qui crée visuellement un "décalage"
const PAST_MINUTES = 10;
const FUTURE_MINUTES = 45;

const GLOBE_RADIUS = 1;

/** Convertit latitude (rad), longitude (rad), altitude (km) → Vector3 dans la scène */
const geodeticToVector3 = (lat: number, lon: number, alt: number) => {
  const earthRadiusKm = 6371.0;
  const altitudeAmplification = 2.0;
  const r = GLOBE_RADIUS + (alt / earthRadiusKm) * altitudeAmplification;
  const phi = Math.PI / 2 - lat;
  const theta = lon + Math.PI / 2;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
};

export function ISS() {
  const { tleData, fetchTLE, setISSInfo, setSelectedISS, selectedISS } =
    useISSStore();
  const { setSelectedPoint } = useObservationStore();
  const issRef = useRef<THREE.Group>(null!);
  // Dernière télémétrie calculée — utilisée pour le snapshot immédiat au clic
  const lastTelemetryRef = useRef<{
    latitude_deg: number;
    longitude_deg: number;
    altitude_km: number;
    speed_kmh: number;
  } | null>(null);

  useEffect(() => {
    fetchTLE();
  }, [fetchTLE]);

  const satrec = useMemo(() => {
    if (!tleData) return null;
    return twoline2satrec(tleData.line1, tleData.line2);
  }, [tleData]);

  // Géométrie et ligne mémoïsées : ne sont JAMAIS recréées entre renders.
  // Recréer THREE.Line à chaque render react ferait perdre computeLineDistances().
  const orbitGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const orbitLine = useMemo(
    () =>
      new THREE.Line(
        orbitGeometry,
        new THREE.LineDashedMaterial({
          color: ORBIT_COLOR,
          dashSize: 0.05,
          gapSize: 0.05,
          opacity: ORBIT_OPACITY,
          transparent: true,
          depthWrite: false,
        }),
      ),
    [orbitGeometry],
  );

  // Ref pour throttler setISSInfo à 1× par seconde et stocker les données récentes
  const lastTelemetryUpdate = useRef<number>(-999);
  const lastOrbitUpdate = useRef<number>(-999);

  useFrame((state) => {
    if (!satrec || !issRef.current) return;

    const now = new Date();
    const nowMs = now.getTime();

    // -----------------------------------------------------------------------
    // 1. TRAJECTOIRE — mise à jour 1× par seconde
    // -----------------------------------------------------------------------
    if (state.clock.elapsedTime - lastOrbitUpdate.current > 1) {
      lastOrbitUpdate.current = state.clock.elapsedTime;

      const points: THREE.Vector3[] = [];

      for (let i = -PAST_MINUTES; i <= FUTURE_MINUTES; i++) {
        const t = new Date(nowMs + i * 60_000);
        const pv = propagate(satrec, t);
        if (pv && pv.position && typeof pv.position !== "boolean") {
          const eci = pv.position as { x: number; y: number; z: number };
          const gd = eciToGeodetic(eci, gstime(t));
          points.push(geodeticToVector3(gd.latitude, gd.longitude, gd.height));
        }
      }

      orbitGeometry.setFromPoints(points);
      orbitLine.computeLineDistances();
    }

    // -----------------------------------------------------------------------
    // 2. POSITION ISS — mise à jour chaque frame (~60/s)
    // -----------------------------------------------------------------------
    const pv = propagate(satrec, now);
    if (pv && pv.position && typeof pv.position !== "boolean") {
      const eci = pv.position as { x: number; y: number; z: number };
      const gd = eciToGeodetic(eci, gstime(now));
      const pos = geodeticToVector3(gd.latitude, gd.longitude, gd.height);
      issRef.current.position.copy(pos);

      // Orientation vers la position à +1 seconde
      const nextT = new Date(nowMs + 1_000);
      const nextPv = propagate(satrec, nextT);
      if (nextPv && nextPv.position && typeof nextPv.position !== "boolean") {
        const nextEci = nextPv.position as { x: number; y: number; z: number };
        const nextGd = eciToGeodetic(nextEci, gstime(nextT));
        issRef.current.lookAt(
          geodeticToVector3(nextGd.latitude, nextGd.longitude, nextGd.height),
        );
      }

      // ── Télémétrie — uniquement si l'ISS est sélectionné (panneau ouvert) ──
      // Pas de calcul ni de mise à jour du store si personne n'a cliqué sur l'ISS.
      // On throttle à 1× par seconde pour éviter trop de re-renders.
      if (pv.velocity && typeof pv.velocity !== "boolean") {
        const vel = pv.velocity as { x: number; y: number; z: number };
        const speed_kms = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
        const telemetry = {
          latitude_deg: (gd.latitude * 180) / Math.PI,
          longitude_deg: (gd.longitude * 180) / Math.PI,
          altitude_km: gd.height,
          speed_kmh: speed_kms * 3600,
        };
        // Toujours màj le snapshot (pour le snapshot immédiat au clic)
        lastTelemetryRef.current = telemetry;

        if (
          selectedISS &&
          state.clock.elapsedTime - lastTelemetryUpdate.current > 1
        ) {
          lastTelemetryUpdate.current = state.clock.elapsedTime;
          setISSInfo(telemetry);
        }
      }
    }
  });

  if (!satrec) return null;

  return (
    <group>
      {/* Trajectoire orbitale — objet Three.js stable (mémoïsé) */}
      <primitive object={orbitLine} />

      {/* Modèle 3D ISS — cliquable */}
      <group
        ref={issRef}
        scale={ISS_SCALE}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedPoint(null); // désélectionner la ville
          // Snapshot immédiat : réutilise le dernier propagate calculé dans useFrame
          // pour que le panneau s'affiche sans attendre 1s
          if (lastTelemetryRef.current) {
            setISSInfo(lastTelemetryRef.current);
          }
          setSelectedISS(true);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, 4, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.4, 0.4, 3, 16]} />
          <meshStandardMaterial
            color="#cccccc"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[2.5, 0, 0]} rotation={[Math.PI / 4, 0, 0]}>
          <boxGeometry args={[4, 0.05, 1.5]} />
          <meshStandardMaterial
            color="#1a3b5c"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        <mesh position={[2.5, 0, 0]} rotation={[-Math.PI / 4, 0, 0]}>
          <boxGeometry args={[4, 0.05, 1.5]} />
          <meshStandardMaterial
            color="#1a3b5c"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        <mesh position={[-2.5, 0, 0]} rotation={[Math.PI / 4, 0, 0]}>
          <boxGeometry args={[4, 0.05, 1.5]} />
          <meshStandardMaterial
            color="#1a3b5c"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        <mesh position={[-2.5, 0, 0]} rotation={[-Math.PI / 4, 0, 0]}>
          <boxGeometry args={[4, 0.05, 1.5]} />
          <meshStandardMaterial
            color="#1a3b5c"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        {/* Sphère lumineuse — visible de loin */}
        <mesh>
          <sphereGeometry args={[0.6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    </group>
  );
}
