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

const VISIBLE_OPACITY = 0.6;
const FADE_SPEED = 2.5; // más alto = fade más rápido, en "por segundo".

interface DeepSpaceStarsProps {
  count?: number;
  /** Radio mínimo/máximo de la esfera donde se reparten las estrellas —
   * MobileWordmarkScene.tsx pasa un radio mucho menor (la cámara ahí está
   * mucho más cerca que en desktop) para que el mismo conteo se sienta
   * "denso" en vez de disperso. */
  radiusMin?: number;
  radiusMax?: number;
  /** Default `true` — MobileWordmarkScene.tsx nunca pasa esta prop, así que
   * ahí el fondo de estrellas queda exactamente igual que siempre. Solo
   * Environment.tsx (escena de desktop) la controla, para apagar suave las
   * estrellas cuando el Home entra a su Momento 2 (ver `homeMomentTwoVisible`
   * en ExperienceProvider.tsx). Se anima con un lerp de opacidad en vez de
   * desmontar/montar el componente: desmontar recalcularía las 20k
   * posiciones aleatorias cada vez (el `useMemo` de la geometría) en lugar
   * de solo perder/ganar visibilidad, y de paso permite el fundido suave
   * en vez de un corte abrupto. */
  visible?: boolean;
}

export function DeepSpaceStars({
  count = DEFAULT_STAR_COUNT,
  radiusMin = DEFAULT_RADIUS_MIN,
  radiusMax = DEFAULT_RADIUS_MAX,
  visible = true,
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
        opacity: visible ? VISIBLE_OPACITY : 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((_state, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    points.rotation.y += 0.0001;

    // Lerp de opacidad hacia el target de `visible` — fundido suave en vez
    // de un corte abrupto al entrar/salir de la Pantalla 2 del Home.
    // Mutado vía `pointsRef.current.material` (no la variable `material`
    // capturada del useMemo de arriba) — mismo objeto real, pero ir por el
    // `.current` de un ref es la vía ya establecida para mutación
    // imperativa seguida cuadro a cuadro (mismo patrón que la rotación
    // arriba mismo).
    const pointsMaterial = points.material as THREE.PointsMaterial;
    const target = visible ? VISIBLE_OPACITY : 0;
    pointsMaterial.opacity += (target - pointsMaterial.opacity) * Math.min(1, delta * FADE_SPEED);
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
