// components/experience/scene/entities/wordmark/MobileWordmarkScene.tsx
//
// Orquesta la secuencia completa que reemplaza la intro CSS 2D + el
// wordmark de texto del Navbar mobile/tablet:
//   1. "appear": aventhra-wordmark-cables.glb (ya recoloreado con el
//      material del robot, ver WordmarkModel.tsx) aparece de golpe —pop
//      de escala, no un fundido lento— centrado verticalmente en pantalla,
//      con chispas de "corto circuito" ya visibles (ver
//      WordmarkModel.tsx / attachSparkOverlays.ts).
//   2. "rise": el wordmark sube desde ese centro hacia su posición final,
//      cerca del borde superior de la pantalla — ahí es donde queda de
//      forma PERMANENTE, reemplazando el texto "AVENTHRA" que antes vivía
//      en la barra del Navbar.
//   3. "settled": fase final e indefinida — nada de cables cayendo (se
//      quitaron, pedido explícito): el wordmark flota en su lugar con la
//      misma onda senoidal que ya usa el robot cuando está `active`
//      (RobotAnimator.tsx), más chispas ocasionales. No hay una fase
//      "idle" aparte: "settled" ES el estado persistente.
//
// El "reparto de responsabilidades" es el mismo que ya usa RobotScene.tsx
// para el robot de desktop: ESTE componente es dueño de la máquina de
// fases y de mover el <group> (posición/escala cuadro a cuadro);
// WordmarkModel solo es dueño de lo que pasa DENTRO del modelo (material,
// chispas, ocultar los nodos de cable del GLB).
'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import { Group, PointLight } from 'three';
import { WordmarkModel } from './WordmarkModel';
import { WordmarkAmbientLighting, WORDMARK_HALO_LIGHTS } from './WordmarkLighting';
import { DeepSpaceStars, DEFAULT_STAR_COUNT } from '@/components/experience/scene/entities/shared/DeepSpaceStars';
import { useExperience } from '@/components/experience/providers/ExperienceProvider';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';
import { easeOutCubic, clamp } from '@/lib/math';

const CFG = EXPERIENCE_CONFIG.mobileWordmark;

// Fondo heredado tal cual del de desktop (Environment.tsx → mismos radios
// 30–70, los defaults de DeepSpaceStars) — pedido explícito: "hereda el
// fondo de la version desktop, solo coloca un 15% más de estrellas". Antes
// esta escena tenía su PROPIO count/radio (9000, radio 3–16, ver historial
// de EXPERIENCE_CONFIG.mobileWordmark) — quedó desalineado del de desktop
// y encima duplicaba una capa CSS aparte (Starfield.tsx, ya eliminada).
// Recorrido del multiplicador: 1.15 ("+15% más estrellas") → 1.0925
// ("bájale un 5%" sobre ese valor, ~21850 puntos) → 0.98325 ("bájale otro
// 10%" sobre ESE valor, ~19665 puntos) — cada "bájale un X%" es relativo
// al valor anterior, no al default de desktop.
//
// Sin escalar por nivel de calidad (a diferencia de ShootingStars/
// SHOOTING_STAR_COUNT_BY_QUALITY en Environment.tsx): DeepSpaceStars ya
// documenta por qué se mantiene FIJO — si el count cambiara en vivo, el
// buffer de posiciones se regeneraría entero y el fondo "parpadearía" de
// densidad a mitad de la animación de entrada. QualityProvider ya no tiene
// niveles dinámicos (fijo en 'Ultra' siempre, ver ese archivo), así que
// esto ni siquiera depende de eso — es un número fijo por diseño.
const MOBILE_STAR_COUNT = Math.round(DEFAULT_STAR_COUNT * 1.15 * 0.95 * 0.9);

// Ancho "natural" (eje X) del wordmark completo a scale=1, en unidades de
// mundo — medido una sola vez con three.Box3().setFromObject() sobre
// aventhra-wordmark-cables.glb (no en cada carga: es una propiedad fija
// del asset). Si se reemplaza el GLB por uno con proporciones distintas,
// hay que volver a medir este número.
const WORDMARK_NATURAL_WIDTH = 7.0132;
// Qué fracción del ancho VISIBLE de pantalla (a la profundidad z=0, donde
// useThree() resuelve viewport.width) debe ocupar en reposo. Recorrido:
// 0.3 original (~29%, el mismo tap-target invisible h-9 w-28 que tenía el
// Navbar mobile) → 0.35 ("un poquito más grande") → de vuelta a 0.3
// ("haz el aventhra un poco más pequeño", ajuste moderado, no drástico).
// Por álgebra, restScale = viewport.width * fraction / NATURAL_WIDTH hace
// que el ancho FINAL en pantalla sea exactamente `fraction` del ancho del
// canvas, sin importar el dispositivo — así que 0.3 es, literalmente,
// "el wordmark ocupa 30% del ancho de pantalla" en reposo, verificado en
// viewports angostos (~390px: restScale ≈0.091, MUY por debajo del clamp
// de abajo, no hay riesgo de repetir el bug de "gigante/deformado"). El
// acercamiento a cámara de CFG.restPosition (z=1.55, ver ese comentario
// para el porqué de ese valor, que NO se toca acá — es la palanca que ya
// resolvió el "se ve lejos", independiente de esta fracción) multiplica
// este resultado por ~1.35x adicional en "rise"/"settled" — combinados,
// ~40.5% del ancho en un iPhone de 390px (~158px, antes ~184px con 0.35),
// una reducción moderada, con margen holgado sin salirse de cuadro.
const WORDMARK_TARGET_WIDTH_FRACTION = 0.3;
// Clamp de seguridad para aspect ratios extremos (ej. tablet en landscape)
// — se mantiene en 0.34 (el tope que ya tenía el restScale fijo original)
// porque en la práctica nunca se acerca a dispararse con dispositivos
// reales (a 768px de ancho, restScale ≈0.2) — sigue siendo puramente una
// red de seguridad, no un valor que se espere alcanzar.
const WORDMARK_MIN_SCALE = 0.08;
const WORDMARK_MAX_SCALE = 0.34;

export function MobileWordmarkScene() {
  const { viewport } = useThree();
  const prefersReducedMotion = useReducedMotion();
  // 🔦 A propósito NO gateado por config.cableShaders de useQuality() (a
  // diferencia de DescentCables.tsx del robot): mobile SIEMPRE arranca en
  // calidad 'Low' (QualityProvider → INITIAL_LEVEL_BY_TIER.mobile), donde
  // cableShaders=false, y el auto-ajuste de FPS solo sube de nivel si el
  // dispositivo va muy sobrado — poco realista en un mobile real. El
  // pedido explícito de esta intro fue "echando las chispas del robot"
  // como parte central del efecto, así que no puede depender de un gate
  // que en la práctica casi nunca se cumple. Son pocas mallas pequeñas
  // reutilizando el mismo shader ligero del robot
  // (createSparkOverlayMaterial) — no debería pesar como para justificar
  // acá el gate de calidad automático. Si en pruebas reales se ve un
  // impacto de FPS real en un dispositivo mobile de gama baja, hay que
  // revisarlo puntualmente, no revertir esto en silencio.
  const sparksEnabled = !prefersReducedMotion;

  const restScale = clamp(
    (viewport.width * WORDMARK_TARGET_WIDTH_FRACTION) / WORDMARK_NATURAL_WIDTH,
    WORDMARK_MIN_SCALE,
    WORDMARK_MAX_SCALE
  );

  const wordmarkGroupRef = useRef<Group>(null);
  const cyanLightRef = useRef<PointLight>(null);
  const violetLightRef = useRef<PointLight>(null);
  const elapsedInPhaseRef = useRef(0);

  // Fuente de verdad de la fase en ExperienceProvider (mobileIntro), no un
  // useState local — así Experience.tsx puede leerla desde afuera del
  // <Canvas> para saber cuándo revelar <main>/<Navbar/> (ver el comentario
  // en ExperienceProvider.tsx). El valor inicial ('settled' bajo reduced
  // motion, 'appear' si no) ya se resuelve ahí, con el mismo criterio que
  // antes vivía acá.
  const { state: experienceState, actions } = useExperience();
  const phase = experienceState.mobileIntro.phase;
  const setPhase = actions.setMobileIntroPhase;

  // "ahi ya bajan las chispas" — pedido explícito: muchas chispas mientras
  // vibra en el centro (y durante el salto rápido hacia arriba), y una vez
  // asentado arriba bajan a un nivel más calmo. Se lee cada frame en
  // WordmarkModel.tsx (no depende de re-render, es un string closure
  // capturado en el mismo useFrame que ya existe ahí).
  const sparkIntensity = phase === 'settled' ? 'low' : 'high';

  useFrame((frameState, delta) => {
    elapsedInPhaseRef.current += delta;
    const t = elapsedInPhaseRef.current;
    const [rx, ry, rz] = CFG.restPosition;
    const group = wordmarkGroupRef.current;
    if (!group) return;

    if (phase === 'pending') {
      // Todavía no arrancó — MobileTextIntro (Experience.tsx) está
      // corriendo su propia intro 2D (AVENTHRA / Tu empleado virtual en
      // HTML) y recién al terminar llama a setMobileIntroPhase('appear').
      // El wordmark 3D se queda invisible (scale 0) hasta entonces — las
      // chispas/material ya están montados por debajo (WordmarkModel no
      // depende de la fase para eso), pero en escala 0 no se ven.
      group.scale.setScalar(0);
    } else if (phase === 'appear') {
      // "De la nada aparece" — pop de escala rápido en el centro de la
      // pantalla, quieto ahí (sin vibración — se probó, "no convence" con
      // el texto "Tu empleado virtual" debajo, revertido) mientras se
      // muestra ese texto (ver MobileIntroCaption en Experience.tsx).
      const popProgress = Math.min(1, t / CFG.appear.popDuration);
      const eased = easeOutCubic(popProgress);
      group.position.set(rx, CFG.appearPositionY, rz);
      group.scale.setScalar(restScale * eased);

      const appearDuration = CFG.appear.popDuration + CFG.appear.holdDuration;
      if (t >= appearDuration) {
        setPhase('rise');
        elapsedInPhaseRef.current = 0;
      }
    } else if (phase === 'rise') {
      const progress = Math.min(1, t / CFG.riseDuration);
      const eased = easeOutCubic(progress);
      const fromY = CFG.appearPositionY;
      group.position.set(rx, fromY + (ry - fromY) * eased, rz);
      group.scale.setScalar(restScale);

      if (t >= CFG.riseDuration) {
        setPhase('settled');
        elapsedInPhaseRef.current = 0;
      }
    } else {
      // 'settled': quieto en su lugar final salvo la misma flotación
      // senoidal que RobotAnimator.tsx aplica al robot cuando está
      // `active` — mismos valores de config (floatSpeed/floatAmplitude),
      // reutilizados tal cual, no una reinterpretación aparte.
      const floatY = Math.sin(frameState.clock.getElapsedTime() * EXPERIENCE_CONFIG.robot.floatSpeed)
        * EXPERIENCE_CONFIG.robot.floatAmplitude;
      group.position.set(rx, ry + floatY, rz);
      group.scale.setScalar(restScale);
    }

    // Halo lights: NUNCA hijas de `group` (ni en world space fijo, ni en
    // local space del group que escala durante 'appear' — los 2 intentos
    // anteriores, ambos con el mismo síntoma de "el brillo sube y baja
    // junto con la animación", ver el historial en WordmarkLighting.tsx).
    // Se sincronizan acá, cuadro a cuadro, como group.position + un
    // offset FIJO en unidades de mundo (NO multiplicado por group.scale)
    // — así su distancia real a la superficie del wordmark es constante
    // en TODA la animación, sin importar la fase.
    if (cyanLightRef.current) {
      const [ox, oy, oz] = WORDMARK_HALO_LIGHTS.cyan.offset;
      cyanLightRef.current.position.set(group.position.x + ox, group.position.y + oy, group.position.z + oz);
    }
    if (violetLightRef.current) {
      const [ox, oy, oz] = WORDMARK_HALO_LIGHTS.violet.offset;
      violetLightRef.current.position.set(group.position.x + ox, group.position.y + oy, group.position.z + oz);
    }
  });

  return (
    <>
      {/* Mismo fondo que desktop (Environment.tsx) — mismos radios 30–70,
          solo +15% de densidad (ver MOBILE_STAR_COUNT arriba). Siempre
          visible, en TODA fase — se probó ocultarlo durante 'appear'/
          'rise' ("que en la intro no hayan estrellas, solo un fondo
          negro") pero se revirtió ("mejor deja siempre el fondo
          estrellado"), así que ya no depende de `phase`. */}
      <DeepSpaceStars count={MOBILE_STAR_COUNT} />

      {/* Mismo rig de luces que el robot en desktop (Lighting.tsx) —
          pedido explícito tras ver una captura real del robot: "quiero
          que el AVENTHRA se vea así literal, igual". Ambient + 3
          directional van FIJAS acá afuera (world space, no dependen de
          la fase). */}
      <WordmarkAmbientLighting />

      {/* Los 2 pointLight de halo van SUELTOS acá (hermanas del <group>
          animado, no hijas) — su posición se sincroniza cuadro a cuadro
          en el useFrame de arriba, como group.position + un offset fijo
          en unidades de mundo. Necesitan vivir afuera del <group> para
          que su distancia real al wordmark no dependa del scale que ese
          <group> anima durante 'appear' (ver el historial completo en
          WordmarkLighting.tsx). El `position` inicial de abajo solo evita
          un parpadeo en el primerísimo frame, antes de que corra el
          useFrame por primera vez. */}
      <pointLight
        ref={cyanLightRef}
        position={[
          CFG.restPosition[0] + WORDMARK_HALO_LIGHTS.cyan.offset[0],
          (prefersReducedMotion ? CFG.restPosition[1] : CFG.appearPositionY) + WORDMARK_HALO_LIGHTS.cyan.offset[1],
          CFG.restPosition[2] + WORDMARK_HALO_LIGHTS.cyan.offset[2],
        ]}
        intensity={WORDMARK_HALO_LIGHTS.cyan.intensity}
        distance={WORDMARK_HALO_LIGHTS.cyan.distance}
        color={WORDMARK_HALO_LIGHTS.cyan.color}
      />
      <pointLight
        ref={violetLightRef}
        position={[
          CFG.restPosition[0] + WORDMARK_HALO_LIGHTS.violet.offset[0],
          (prefersReducedMotion ? CFG.restPosition[1] : CFG.appearPositionY) + WORDMARK_HALO_LIGHTS.violet.offset[1],
          CFG.restPosition[2] + WORDMARK_HALO_LIGHTS.violet.offset[2],
        ]}
        intensity={WORDMARK_HALO_LIGHTS.violet.intensity}
        distance={WORDMARK_HALO_LIGHTS.violet.distance}
        color={WORDMARK_HALO_LIGHTS.violet.color}
      />

      <group
        ref={wordmarkGroupRef}
        position={
          prefersReducedMotion
            ? CFG.restPosition
            : [CFG.restPosition[0], CFG.appearPositionY, CFG.restPosition[2]]
        }
        scale={prefersReducedMotion ? restScale : 0}
      >
        <WordmarkModel sparksEnabled={sparksEnabled} sparkIntensity={sparkIntensity} />
      </group>
    </>
  );
}
