// components/experience/scene/entities/robot/RobotAnimator.tsx
'use client';

import { useFrame } from '@react-three/fiber';
import { forwardRef, useRef } from 'react';
import { Group } from 'three';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';
import { lerp } from '@/lib/math';

interface RobotAnimatorProps {
  isInteractive: boolean;
  /** false mientras el robot todavía está bajando sostenido por los cables:
   * se queda rígido, sin flotar ni respirar ni seguir el mouse. */
  active: boolean;
  mouse: {
    smoothX: number;
    smoothY: number;
  };
}

export const RobotAnimator = forwardRef<Group, RobotAnimatorProps>(
  ({ isInteractive, active, mouse }, ref) => {
    // Guardamos el estado actual de la rotación para aplicar inercia (lerp)
    const currentRotation = useRef({ x: 0, y: 0 });

    useFrame((state) => {
      if (!ref || !('current' in ref) || !ref.current) return;
      if (!active) return; // sigue colgado de los cables, sin animación propia

      const time = state.clock.getElapsedTime();

      // --- 1. FLOTACIÓN ---
      // El robot sube y baja suavemente usando una onda senoidal.
      const floatY = Math.sin(time * EXPERIENCE_CONFIG.robot.floatSpeed) * EXPERIENCE_CONFIG.robot.floatAmplitude;
      ref.current.position.y = floatY;

      // La "respiración" por escala de grupo se quitó de aquí: ahora el rig
      // respira de verdad con la animación idle_breathe horneada en el .glb
      // (ver Robot.tsx) — tenerlas las dos a la vez las hacía pisarse.

      // --- 2. SEGUIMIENTO DEL MOUSE (Inercia Pesada) ---
      if (isInteractive) {
        // Calculamos el ángulo objetivo basado en el mouse suavizado
        // Multiplicamos por la sensibilidad configurada
        const targetRotY = mouse.smoothX * EXPERIENCE_CONFIG.camera.maxYaw;
        const targetRotX = mouse.smoothY * EXPERIENCE_CONFIG.camera.maxPitch;

        // Aplicamos la inercia (lerp). Un valor bajo (0.03) = extremadamente pesado y lento.
        const inertia = EXPERIENCE_CONFIG.robot.inertia;
        currentRotation.current.y = lerp(currentRotation.current.y, targetRotY, inertia);
        currentRotation.current.x = lerp(currentRotation.current.x, targetRotX, inertia);

        // Aplicamos la rotación final al robot
        ref.current.rotation.y = currentRotation.current.y;
        ref.current.rotation.x = currentRotation.current.x;
      } else {
        // Cuando no es interactivo (está oscuro), lo mantenemos en posición neutral
        currentRotation.current.y = lerp(currentRotation.current.y, 0, 0.02);
        currentRotation.current.x = lerp(currentRotation.current.x, 0, 0.02);
        ref.current.rotation.y = currentRotation.current.y;
        ref.current.rotation.x = currentRotation.current.x;
      }
    });

    return null;
  }
);

RobotAnimator.displayName = 'RobotAnimator';