// components/experience/scene/RobotScene.tsx
'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { RobotController } from './entities/robot/RobotController';
import { DescentCables } from './entities/robot/DescentCables';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';
import { easeOutCubic } from '@/lib/math';

const BASE_X = 2.5;
const BASE_Y = -0.46;
const ROTATION_Y = -1.2;
const SCALE = 0.55;

// Constante durante toda la vida del componente (no depende de props/estado),
// así que no hace falta memoizarla ni guardarla en un ref para leerla en el render.
const START_Y = BASE_Y + EXPERIENCE_CONFIG.entryAnimation.dropHeight;

export const RobotScene = () => {
  const robotGroupRef = useRef<Group>(null);
  const currentYRef = useRef(START_Y);
  const elapsedRef = useRef(0);
  // Progreso 0→1 de la "soltada": cables retrayéndose/desvaneciéndose y
  // cabeza enderezándose, todos leen este mismo ref — un solo reloj, sin
  // temporizadores independientes que se puedan desincronizar.
  const releaseProgressRef = useRef(0);

  const [arrived, setArrived] = useState(false);
  const [cablesMounted, setCablesMounted] = useState(true);

  useFrame((state, delta) => {
    if (!arrived) {
      elapsedRef.current += delta;
      const t = Math.min(1, elapsedRef.current / EXPERIENCE_CONFIG.entryAnimation.descentDuration);
      const eased = easeOutCubic(t);
      currentYRef.current = START_Y + (BASE_Y - START_Y) * eased;

      // Leve balanceo tipo péndulo mientras baja — se apaga solo (× (1 - t))
      // así llega quieto a destino, sin frenazo brusco.
      if (robotGroupRef.current) {
        const { swayAmplitude, swaySpeed } = EXPERIENCE_CONFIG.entryAnimation;
        const sway = Math.sin(state.clock.getElapsedTime() * swaySpeed) * swayAmplitude * (1 - eased);
        robotGroupRef.current.rotation.z = sway;
      }

      if (t >= 1) {
        setArrived(true);
      }
    } else if (releaseProgressRef.current < 1) {
      releaseProgressRef.current = Math.min(
        1,
        releaseProgressRef.current + delta / EXPERIENCE_CONFIG.entryAnimation.releaseDuration
      );
      if (releaseProgressRef.current >= 1 && cablesMounted) {
        setCablesMounted(false);
      }
    }

    if (robotGroupRef.current) {
      robotGroupRef.current.position.y = currentYRef.current;
    }
  });

  return (
    <>
      <group
        ref={robotGroupRef}
        position={[BASE_X, START_Y, EXPERIENCE_CONFIG.entryAnimation.endZ]}
        rotation={[0, ROTATION_Y, 0]}
        scale={SCALE}
      >
        <RobotController arrived={arrived} releaseProgressRef={releaseProgressRef} />
      </group>

      {cablesMounted && (
        <DescentCables
          baseX={BASE_X}
          endZ={EXPERIENCE_CONFIG.entryAnimation.endZ}
          rotationY={ROTATION_Y}
          startY={START_Y}
          currentYRef={currentYRef}
          releaseProgressRef={releaseProgressRef}
        />
      )}
    </>
  );
};
