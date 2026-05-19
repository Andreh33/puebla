"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Rocas tipo "puerta" que se abren a izquierda/derecha conforme avanza el
 * scroll, revelando lo que hay detrás (referencias visuales a la web de
 * Merrell × Joffrey Spitzer).
 *
 * Sin assets externos: las rocas son geometrías procedurales (icosaedros
 * deformados con noise simple) con material en granito gris-piedra.
 */

type Props = {
  scrollProgress: React.MutableRefObject<number>;
  /** Rango del scroll en el que ocurre la apertura: [start, end] dentro de 0..1. */
  range?: [number, number];
};

function makeRockGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position!;
  const v = new THREE.Vector3();
  // Deformación pseudo-noise para que cada roca sea distinta.
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const n =
      Math.sin(v.x * 3 + seed) * 0.18 +
      Math.sin(v.y * 4 - seed) * 0.14 +
      Math.sin(v.z * 5 + seed * 0.5) * 0.12;
    v.multiplyScalar(1 + n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function Rocks({ scrollProgress, range = [0.25, 0.55] }: Props) {
  const groupL = useRef<THREE.Group>(null);
  const groupR = useRef<THREE.Group>(null);

  const leftRocks = useMemo(
    () => [
      { geo: makeRockGeometry(1.2), pos: [-2.4, -0.2, -0.5], scale: 1.6 },
      { geo: makeRockGeometry(3.1), pos: [-2.9, 0.6, -1.2], scale: 1.2 },
      { geo: makeRockGeometry(5.7), pos: [-2.2, 1.0, -2.0], scale: 1.0 },
      { geo: makeRockGeometry(7.8), pos: [-2.7, -0.9, -1.8], scale: 1.3 },
    ],
    [],
  );
  const rightRocks = useMemo(
    () => [
      { geo: makeRockGeometry(2.1), pos: [2.4, -0.4, -0.6], scale: 1.7 },
      { geo: makeRockGeometry(4.3), pos: [2.8, 0.7, -1.3], scale: 1.1 },
      { geo: makeRockGeometry(6.9), pos: [2.3, 1.1, -2.2], scale: 0.9 },
      { geo: makeRockGeometry(8.4), pos: [2.7, -1.0, -1.7], scale: 1.25 },
    ],
    [],
  );

  // Material en granito gris cálido, opaco y mate.
  const rockMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x6b6e74,
        roughness: 0.92,
        metalness: 0.04,
        flatShading: false,
      }),
    [],
  );

  useFrame(() => {
    const p = scrollProgress.current;
    const [start, end] = range;
    const local = THREE.MathUtils.smoothstep(p, start, end); // 0..1

    if (groupL.current) {
      groupL.current.position.x = -local * 2.6;
      groupL.current.rotation.y = -local * 0.6;
      groupL.current.rotation.z = -local * 0.18;
      (groupL.current as unknown as { visible: boolean }).visible = local < 1;
    }
    if (groupR.current) {
      groupR.current.position.x = local * 2.6;
      groupR.current.rotation.y = local * 0.6;
      groupR.current.rotation.z = local * 0.18;
      (groupR.current as unknown as { visible: boolean }).visible = local < 1;
    }
  });

  return (
    <>
      <group ref={groupL}>
        {leftRocks.map((r, i) => (
          <mesh
            key={`l-${i}`}
            geometry={r.geo}
            material={rockMaterial}
            position={r.pos as [number, number, number]}
            scale={r.scale}
            castShadow
            receiveShadow
          />
        ))}
      </group>
      <group ref={groupR}>
        {rightRocks.map((r, i) => (
          <mesh
            key={`r-${i}`}
            geometry={r.geo}
            material={rockMaterial}
            position={r.pos as [number, number, number]}
            scale={r.scale}
            castShadow
            receiveShadow
          />
        ))}
      </group>
    </>
  );
}
