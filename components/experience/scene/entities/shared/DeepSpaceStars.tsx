// components/experience/scene/entities/shared/DeepSpaceStars.tsx
//
// Extraído de Environment.tsx (donde vivía como función local sin
// exportar) para reutilizarlo tal cual en la escena 3D mobile/tablet del
// wordmark (MobileWordmarkScene.tsx) sin duplicar la generación de
// estrellas — ahí se pide "fondo súper lleno", por eso ahora acepta
// `count` en vez de tener el número de partículas fijo.
//
// Fija, NO depende del nivel de calidad automático — ver la nota de más
// abajo (arrastrada del original en Environment.tsx): el ajuste de FPS no
// debe hacer parpadear la cantidad de estrellas a mitad de una animación.
'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const DEFAULT_STAR_COUNT = 20000;
const DEFAULT_RADIUS_MIN = 30;
const DEFAULT_RADIUS_MAX = 70;

interface DeepSpaceStarsProps {
  count?: number;
  /** Radio mínimo/máximo de la esfera donde se reparten las estrellas —
   * MobileWordmarkScene.tsx pasa un radio mucho menor (la cámara ahí está
   * mucho más cerca que en desktop) para que el mismo conteo se sienta
   * "denso" en vez de disperso. */
  radiusMin?: number;
  radiusMax?: number;
}

export function DeepSpaceStars({
  count = DEFAULT_STAR_COUNT,
  radiusMin = DEFAULT_RADIUS_MIN,
  radiusMax = DEFAULT_RADIUS_MAX,
}: DeepSpaceStarsProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const spread = radiusMax - radiusMin;
    for (let i = 0; i < count; i++) {
      const r = radiusMin + Math.random() * spread;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      positions[i * 3 + 2] = Math.cos(phi) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count, radiusMin, radiusMax]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#a0b4ff',
        size: 0.15,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0001;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
