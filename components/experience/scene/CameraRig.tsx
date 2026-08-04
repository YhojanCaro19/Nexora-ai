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

  // 🔥 La cámara arranca YA en su posición final — no viaja en Z.
  // Solo el robot se mueve; así el "acercamiento" se lee limpio, sin parallax que lo distorsione.
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

    camera.lookAt(3.5, 0, 0);
  });

  return null;
};