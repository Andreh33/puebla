"use client";

import { useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Representación 3D estilizada de la fachada de la tienda física (Zona Sport
 * — C. Silos 3). Aparece en la fase final del scroll. Es una composición
 * geométrica sencilla con tipografía 3D y los colores de marca; cuando el
 * cliente nos pase fotos reales sustituimos por una textura plane-billboard.
 */

type Props = {
  scrollProgress: React.MutableRefObject<number>;
  range?: [number, number];
};

export function StoreFacade({ scrollProgress, range = [0.65, 0.95] }: Props) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!group.current) return;
    const p = scrollProgress.current;
    const [start, end] = range;
    const local = THREE.MathUtils.smoothstep(p, start, end);
    group.current.position.z = -10 + local * 8;
    group.current.position.y = -0.6 + local * 0.4;
    (group.current.children as unknown as { length: number }).length;
    group.current.rotation.y = (1 - local) * 0.35;

    // Visibilidad suave para evitar pop-in.
    group.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.material) {
        const m = mesh.material as THREE.Material;
        if ("opacity" in m) {
          (m as THREE.MeshStandardMaterial).transparent = true;
          (m as THREE.MeshStandardMaterial).opacity = THREE.MathUtils.lerp(
            (m as THREE.MeshStandardMaterial).opacity ?? 1,
            local > 0.05 ? 1 : 0,
            0.15,
          );
        }
      }
    });
  });

  return (
    <group ref={group} position={[0, -0.6, -10]}>
      {/* Edificio principal (fachada blanca, cristalera, toldo rojo) */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[5.4, 2.6, 0.4]} />
        <meshStandardMaterial color="#f7f7f4" roughness={0.85} />
      </mesh>
      {/* Toldo rojo */}
      <mesh position={[0, 2.0, 0.3]} castShadow>
        <boxGeometry args={[5.6, 0.25, 0.6]} />
        <meshStandardMaterial color="#dc2626" roughness={0.55} />
      </mesh>
      {/* Cristalera */}
      <mesh position={[0, 0.3, 0.2]}>
        <boxGeometry args={[4.6, 1.8, 0.05]} />
        <meshStandardMaterial color="#1a2a4a" roughness={0.18} metalness={0.4} />
      </mesh>
      {/* Puerta */}
      <mesh position={[1.6, 0.05, 0.21]}>
        <boxGeometry args={[1.0, 2.0, 0.06]} />
        <meshStandardMaterial color="#14225b" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Suelo / acera */}
      <mesh position={[0, -0.8, 0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 4]} />
        <meshStandardMaterial color="#bfbfbf" roughness={0.95} />
      </mesh>

      {/* Rótulo "ZONA SPORT" */}
      <Text
        position={[0, 2.45, 0.35]}
        fontSize={0.42}
        color="#14225b"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#ffffff"
      >
        ZONA
      </Text>
      <Text
        position={[1.4, 2.45, 0.35]}
        fontSize={0.42}
        color="#dc2626"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#ffffff"
      >
        SPORT
      </Text>

      {/* Mini balón fútbol decorativo en cristalera */}
      <mesh position={[-1.6, 0.3, 0.25]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh position={[1.0, 0.3, 0.25]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#c8da46" roughness={0.55} />
      </mesh>
    </group>
  );
}
