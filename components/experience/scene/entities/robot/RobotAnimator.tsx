// components/experience/scene/entities/robot/RobotAnimator.tsx
'use client';

import { useFrame } from '@react-three/fiber';
import { forwardRef, useRef } from 'react';
import { Group, MathUtils } from 'three';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';
import { lerp } from '@/lib/math';

interface RobotAnimatorProps {
  isInteractive: boolean;
  mouse: {
    smoothX: number;
    smoothY: number;
  };
}

export const RobotAnimator = forwardRef<Group, RobotAnimatorProps>(
  ({ isInteractive, mouse }, ref) => {
    // Guardamos el estado actual de la rotación para aplicar inercia (lerp)
    const currentRotation = useRef({ x: 0, y: 0 });

    useFrame((state) => {
      if (!ref || !('current' in ref) || !ref.current) return;

      const time = state.clock.getElapsedTime();

      // --- 1. FLOTACIÓN ---
      // El robot sube y baja suavemente usando una onda senoidal.
      const floatY = Math.sin(time * EXPERIENCE_CONFIG.robot.floatSpeed) * EXPERIENCE_CONFIG.robot.floatAmplitude;
      ref.current.position.y = floatY;

      // --- 2. RESPIRACIÓN ---
      // Aplicamos una escala casi imperceptible en el eje Y para simular el pecho.
      const breath = 1 + Math.sin(time * 0.8) * (EXPERIENCE_CONFIG.robot.breathScale - 1);
      // Nota: Si el GLB tiene el pivote en la base, escalar en Y hará que parezca que respira.
      // Si el pivote está en el centro, escalar uniformemente funciona.
      ref.current.scale.y = breath;

      // --- 3. SEGUIMIENTO DEL MOUSE (Inercia Pesada) ---
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