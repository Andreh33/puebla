"use client";

import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Carga el modelo .glb de la zapatilla del cliente (ASICS GEL-Nimbus low poly,
 * 1.6MB en public/3d/zapatilla.glb).
 *
 * - Aplica materiales tweakables (metalness/roughness suaves para look premium).
 * - Recibe `scrollProgress` 0..1 controlado desde la escena padre con GSAP/Lenis.
 * - Animación: rotación Y continua + Y-position basado en scroll + roll lateral
 *   en transiciones.
 */
type Props = {
  scrollProgress: React.MutableRefObject<number>;
  /** Si true, la zapatilla rota libre sin depender del scroll (hero). */
  autoRotate?: boolean;
};

export function Shoe({ scrollProgress, autoRotate = false }: Props) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/3d/zapatilla.glb");

  // Setup inicial: centrar, escalar, mejorar materiales una sola vez.
  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.4 / maxDim;
    scene.scale.setScalar(scale);
    scene.position.sub(center.multiplyScalar(scale));

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          // Suavizar acabados: ajusta a tu gusto si el modelo viene con materiales
          // muy planos del PBR low-poly.
          if ("roughness" in mat) mat.roughness = Math.max(0.35, mat.roughness ?? 0.6);
          if ("metalness" in mat) mat.metalness = Math.min(0.15, mat.metalness ?? 0.1);
          mat.envMapIntensity = 1.1;
          mat.needsUpdate = true;
        }
      }
    });
  }, [scene]);

  // Animación por frame
  useFrame((state, dt) => {
    if (!group.current) return;
    const p = scrollProgress.current; // 0..1

    if (autoRotate) {
      group.current.rotation.y += dt * 0.4;
    } else {
      // Rotación completa a lo largo del scroll, con un poco de easing
      const target = p * Math.PI * 2;
      group.current.rotation.y += (target - group.current.rotation.y) * 0.06;
    }

    // Roll lateral sutil en función del scroll para acentuar movimiento.
    const roll = Math.sin(p * Math.PI * 2) * 0.18;
    group.current.rotation.z += (roll - group.current.rotation.z) * 0.05;

    // "Flotación" vertical + descenso ligero hacia el final del scroll.
    const float = Math.sin(state.clock.elapsedTime * 1.4) * 0.06;
    const yTarget = -p * 0.35 + float;
    group.current.position.y += (yTarget - group.current.position.y) * 0.08;
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/3d/zapatilla.glb");
