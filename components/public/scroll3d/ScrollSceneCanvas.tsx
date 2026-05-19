"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  ContactShadows,
  AdaptiveDpr,
  AdaptiveEvents,
  PerformanceMonitor,
  useProgress,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Shoe } from "./Shoe";
import { Rocks } from "./Rocks";
import { StoreFacade } from "./StoreFacade";
import { Particles } from "./Particles";

type Props = {
  /** Ref al progreso 0..1 controlado desde el componente padre con Lenis/scroll. */
  scrollProgress: React.MutableRefObject<number>;
  /** Si true, render simplificado para móvil / reduced-motion. */
  low?: boolean;
  /** Callback con el progreso de carga (0..100) para el SceneLoader externo. */
  onLoadingChange?: (state: { progress: number; loaded: boolean }) => void;
};

/**
 * Reporta el progreso de carga de useProgress al callback externo. Tiene que
 * estar DENTRO del Canvas porque useProgress accede al cache global de drei
 * (en realidad funciona también fuera, pero por convención lo metemos dentro).
 */
function LoadingProbe({
  onChange,
}: {
  onChange?: (s: { progress: number; loaded: boolean }) => void;
}) {
  const { progress, active } = useProgress();
  useEffect(() => {
    if (!onChange) return;
    onChange({ progress, loaded: !active && progress >= 100 });
  }, [progress, active, onChange]);
  return null;
}

/**
 * Mueve la cámara con scroll para crear sensación cinemática.
 * t = 0 → cámara amplia mirando la zapatilla en el centro
 * t = 0.3 → cámara baja, rocas se abren
 * t = 0.65 → cámara retrocede, aparece la tienda
 * t = 1 → cámara estable sobre la tienda
 */
function CameraRig({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  useFrame((state) => {
    const p = scrollProgress.current;
    const cam = state.camera;

    // Trayectoria interpolada
    const targetX = Math.sin(p * Math.PI) * 0.3;
    const targetY = THREE.MathUtils.lerp(1.1, 0.4, THREE.MathUtils.smoothstep(p, 0.0, 0.7));
    const targetZ = THREE.MathUtils.lerp(5.2, 3.4, THREE.MathUtils.smoothstep(p, 0.0, 0.5));
    const targetZFar = THREE.MathUtils.lerp(targetZ, 6.0, THREE.MathUtils.smoothstep(p, 0.7, 1.0));

    cam.position.x += (targetX - cam.position.x) * 0.08;
    cam.position.y += (targetY - cam.position.y) * 0.08;
    cam.position.z += (targetZFar - cam.position.z) * 0.08;

    const lookY = THREE.MathUtils.lerp(0.1, 0.6, THREE.MathUtils.smoothstep(p, 0.6, 1.0));
    cam.lookAt(0, lookY, 0);
  });
  return null;
}

export function ScrollSceneCanvas({ scrollProgress, low = false, onLoadingChange }: Props) {
  const [dpr, setDpr] = useState<[number, number]>([1, low ? 1.25 : 2]);
  const [frameloop, setFrameloop] = useState<"always" | "demand">("always");
  const visibleRef = useRef(true);

  // Pausa el bucle 3D cuando el canvas no es visible (ahorra batería)
  useEffect(() => {
    const target = document.getElementById("zs-scroll3d");
    if (!target) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const v = entries[0]?.isIntersecting ?? true;
        visibleRef.current = v;
        setFrameloop(v ? "always" : "demand");
      },
      { threshold: 0.02 },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, []);

  return (
    <Canvas
      id="zs-scroll3d"
      dpr={dpr}
      frameloop={frameloop}
      shadows
      camera={{ position: [0, 1.1, 5.2], fov: 35, near: 0.1, far: 50 }}
      gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#0b1228"]} />
      <fog attach="fog" args={["#0b1228", 6, 18]} />

      <PerformanceMonitor
        onDecline={() => setDpr([1, 1])}
        onIncline={() => setDpr([1, low ? 1.25 : 2])}
      />

      {/* Iluminación cinemática */}
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[5, 6, 4]}
        intensity={1.4}
        color="#fff7e8"
        castShadow
        shadow-mapSize-width={low ? 1024 : 2048}
        shadow-mapSize-height={low ? 1024 : 2048}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      {/* Rim azul corporativo */}
      <directionalLight position={[-4, 3, -3]} intensity={0.6} color="#5e7eea" />
      {/* Toque tenis */}
      <pointLight position={[2, -1.5, 2]} intensity={0.3} color="#c8da46" />

      <Suspense fallback={null}>
        <Shoe scrollProgress={scrollProgress} />
        {!low && <Rocks scrollProgress={scrollProgress} />}
        <StoreFacade scrollProgress={scrollProgress} />
        {!low && <Particles count={low ? 80 : 220} />}

        <ContactShadows
          position={[0, -1.05, 0]}
          opacity={0.6}
          scale={9}
          blur={2.4}
          far={4}
        />

        <Environment preset="studio" environmentIntensity={0.45} />
      </Suspense>

      <CameraRig scrollProgress={scrollProgress} />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <LoadingProbe onChange={onLoadingChange} />
    </Canvas>
  );
}
