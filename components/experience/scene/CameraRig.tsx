// components/experience/scene/CameraRig.tsx
'use client';

import { useThree, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useMouse } from '../providers/MouseProvider';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';
import { lerp } from '@/lib/math';
import { Vector3 } from 'three';

export const CameraRig = () => {
  const { camera } = useThree();
  const mouse = useMouse();

  // La cámara arranca YA en su posición final — no viaja en Z. Antes
  // apuntaba a (3.5, 0, 0) porque el robot vivía a la derecha del encuadre;
  // ahora que el robot salió de esta escena (ver SceneContainer.tsx) el
  // objetivo vuelve al centro para que el campo de estrellas quede
  // centrado.
  const currentPos = useRef(new Vector3(0, 0, 2.8));

  useFrame(() => {
    const damping = EXPERIENCE_CONFIG.camera.damping;

    const maxOffset = 0.15;
    const targetX = mouse.normalizedX * maxOffset;
    const targetY = mouse.normalizedY * maxOffset * 0.5;

    currentPos.current.x = lerp(currentPos.current.x, targetX, damping);
    currentPos.current.y = lerp(currentPos.current.y, targetY, damping);
    // Sin lerp en Z: se queda fija en 2.8 todo el tiempo.

    camera.position.x = currentPos.current.x;
    camera.position.y = currentPos.current.y;
    camera.position.z = currentPos.current.z;

    camera.lookAt(0, 0, 0);
  });

  return null;
};