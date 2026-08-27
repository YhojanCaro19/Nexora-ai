// components/experience/scene/entities/shared/DeepSpaceStars.tsx
//
// Campo de estrellas del fondo 3D. Extraído de Environment.tsx para
// reutilizarlo tal cual en la escena mobile del wordmark
// (MobileWordmarkScene.tsx).
//
// El render de las estrellas es EXACTAMENTE el de siempre: THREE.Points +
// PointsMaterial (color #a0b4ff, size 0.15, additive, sizeAttenuation). No
// se toca su aspecto.
//
// 🖱️ Interactivo (prop `interactive`, solo desktop / Environment.tsx): con
// `onBeforeCompile` se inyecta un pequeño bloque en el vertex shader
// NATIVO de PointsMaterial — las estrellas cerca del cursor se apartan de
// él (repulsión) y, mientras el mouse se mueve, una onda radial las
// recorre. Todo en GPU; el `useFrame` solo actualiza uniforms (posición
// del mouse suavizada, tiempo). Bajo `prefers-reduced-motion` el efecto
// del mouse no se activa (las estrellas solo derivan lento, como siempre).
// MobileWordmarkScene.tsx no pasa `interactive` → sin listener ni
// distorsión, idéntico a antes.
//
// Fija, NO depende del nivel de calidad automático — el ajuste de FPS no
// debe hacer parpadear la cantidad de estrellas a mitad de una animación.
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';

export const DEFAULT_STAR_COUNT = 20000;
// Fondo de desktop (Environment.tsx) — 10% menos que el default (pedido
// del usuario). Aparte para no tocar el conteo de la escena mobile, que
// deriva del default con sus propios multiplicadores.
export const DESKTOP_STAR_COUNT = Math.round(DEFAULT_STAR_COUNT * 0.9);
const DEFAULT_RADIUS_MIN = 30;
const DEFAULT_RADIUS_MAX = 70;

const VISIBLE_OPACITY = 0.6;
const FADE_SPEED = 2.5; // más alto = fade de opacidad más rápido, "por segundo".

// Radio de influencia del cursor, en coordenadas de pantalla normalizadas
// (NDC, -1..1). ~0.4 = un círculo generoso alrededor del mouse.
const MOUSE_RADIUS = 0.42;
// Cuánto se apartan las estrellas del cursor (en NDC). Sutil a propósito.
const REPEL_STRENGTH = 0.05;
const MOUSE_LERP = 0.12; // suavizado del seguimiento del mouse
const VEL_SMOOTH = 4.0; // suavizado de la "velocidad" que alimenta la onda

interface DeepSpaceStarsProps {
  count?: number;
  /** Radio de la esfera donde se reparten las estrellas. MobileWordmarkScene
   * pasa un radio menor (cámara más cerca) para que se sienta denso. */
  radiusMin?: number;
  radiusMax?: number;
  /** Fundido de opacidad — Environment.tsx lo baja a 0 cuando el Home entra
   * a su Momento 2. Default `true`. */
  visible?: boolean;
  /** Habilita la reacción al mouse. Solo Environment.tsx (desktop) la pasa. */
  interactive?: boolean;
}

export function DeepSpaceStars({
  count = DEFAULT_STAR_COUNT,
  radiusMin = DEFAULT_RADIUS_MIN,
  radiusMax = DEFAULT_RADIUS_MAX,
  visible = true,
  interactive = false,
}: DeepSpaceStarsProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const prefersReducedMotion = useReducedMotion();
  const mouseEnabled = interactive && !prefersReducedMotion;

  // Objetivo del mouse en NDC (lo escribe el listener) y el objetivo del
  // frame anterior (para estimar cuánto se movió → alimenta la onda).
  const mouseTarget = useRef(new THREE.Vector2(-10, -10));
  const prevTarget = useRef(new THREE.Vector2(-10, -10));

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const spread = radiusMax - radiusMin;
    for (let i = 0; i < count; i++) {
      const r = radiusMin + Math.random() * spread;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      positions[i * 3 + 2] = Math.cos(phi) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count, radiusMin, radiusMax]);

  const material = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      color: '#a0b4ff',
      size: 0.15,
      transparent: true,
      opacity: visible ? VISIBLE_OPACITY : 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    if (interactive) {
      // Inyección en el vertex shader NATIVO de PointsMaterial: después de
      // `#include <project_vertex>` (que ya calculó `gl_Position` en clip
      // space), desplazamos gl_Position.xy según la distancia al mouse en
      // pantalla. No se toca `gl_PointSize` ni el color — el aspecto de la
      // estrella queda igual, solo se mueve.
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uMouse = { value: new THREE.Vector2(-10, -10) };
        shader.uniforms.uMouseVel = { value: 0 };
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uRadius = { value: MOUSE_RADIUS };
        shader.uniforms.uRepel = { value: REPEL_STRENGTH };

        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
             uniform vec2 uMouse;
             uniform float uMouseVel;
             uniform float uTime;
             uniform float uRadius;
             uniform float uRepel;`
          )
          .replace(
            '#include <project_vertex>',
            `#include <project_vertex>
             {
               vec2 ndc = gl_Position.xy / gl_Position.w;
               vec2 toStar = ndc - uMouse;
               float dm = length(toStar);
               float infl = 1.0 - smoothstep(0.0, uRadius, dm);
               if (infl > 0.0001) {
                 vec2 dir = dm > 0.0001 ? toStar / dm : vec2(0.0, 1.0);
                 float push = infl * infl * uRepel;
                 float wave = sin(dm * 34.0 - uTime * 7.0) * 0.014 * infl * uMouseVel;
                 ndc += dir * (push + wave);
                 gl_Position.xy = ndc * gl_Position.w;
               }
             }`
          );

        mat.userData.shader = shader;
      };
    }

    return mat;
    // Solo al montar — `visible` se sincroniza en el useFrame vía
    // pointsRef.current.material, sin recrear el material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mouseEnabled) return;
    const onMove = (e: MouseEvent) => {
      mouseTarget.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1)
      );
    };
    const onLeave = () => mouseTarget.current.set(-10, -10);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
    };
  }, [mouseEnabled]);

  useFrame((_state, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    points.rotation.y += 0.0001;

    const mat = points.material as THREE.PointsMaterial;

    // Fundido de opacidad hacia el target de `visible` (idéntico a antes).
    const targetOpacity = visible ? VISIBLE_OPACITY : 0;
    mat.opacity += (targetOpacity - mat.opacity) * Math.min(1, delta * FADE_SPEED);

    const shader = mat.userData.shader as { uniforms: Record<string, { value: unknown }> } | undefined;
    if (mouseEnabled && shader) {
      shader.uniforms.uTime.value = (shader.uniforms.uTime.value as number) + delta;

      const uMouse = shader.uniforms.uMouse.value as THREE.Vector2;
      uMouse.lerp(mouseTarget.current, MOUSE_LERP);

      // Cuánto se movió el mouse desde el frame anterior → onda; decae sola.
      const moved = mouseTarget.current.distanceTo(prevTarget.current);
      prevTarget.current.copy(mouseTarget.current);
      const vel = Math.min(1, moved / Math.max(delta, 0.001) / 6);
      const uVel = shader.uniforms.uMouseVel;
      uVel.value = (uVel.value as number) + (vel - (uVel.value as number)) * Math.min(1, delta * VEL_SMOOTH);
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
