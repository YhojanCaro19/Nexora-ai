// components/experience/scene/RobotScene.tsx
'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { RobotController } from './entities/robot/RobotController';
import { lerp } from '@/lib/math';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';

const BASE_X = 2.5;
const BASE_Y = -0.46;
const CAMERA_Z = 2.8; // debe coincidir con el z fijo en CameraRig

export const RobotScene = () => {
  const robotGroupRef = useRef<Group>(null);

  // 🔥 Posición final real del robot (a donde queremos que llegue)
  const finalPosition = useMemo(
    () => new Vector3(BASE_X, BASE_Y, EXPERIENCE_CONFIG.entryAnimation.endZ),
    []
  );

  // 🔥 Dirección exacta desde la cámara hasta esa posición final.
  // Mover al robot SOBRE esta línea garantiza que su proyección en pantalla
  // no cambie de lugar — solo cambia de tamaño (se acerca).
  const rayDirection = useMemo(() => {
    const cameraBase = new Vector3(0, 0, CAMERA_Z);
    return finalPosition.clone().sub(cameraBase).normalize();
  }, [finalPosition]);

  // "s" = qué tan lejos está el robot MÁS ALLÁ de su posición final, sobre el rayo.
  // Empieza grande (muy lejos) y termina en 0 (exactamente en su posición final).
  const startDistance = Math.abs(
    EXPERIENCE_CONFIG.entryAnimation.startZ - EXPERIENCE_CONFIG.entryAnimation.endZ
  );
  const currentS = useRef(startDistance);
  const hasArrivedRef = useRef(false);
  const [arrived, setArrived] = useState(false);

  const easingFactor = EXPERIENCE_CONFIG.entryAnimation.easingFactor;

  useFrame((state) => {
    currentS.current = lerp(currentS.current, 0, easingFactor);

    if (!hasArrivedRef.current && currentS.current < 0.02) {
      hasArrivedRef.current = true;
      setArrived(true);
    }

    if (robotGroupRef.current) {
      // Posición = destino final + dirección * distancia restante sobre el rayo.
      const pos = finalPosition.clone().addScaledVector(rayDirection, currentS.current);
      robotGroupRef.current.position.x = pos.x;
      robotGroupRef.current.position.z = pos.z;

      if (hasArrivedRef.current) {
        const t = state.clock.getElapsedTime();
        const { floatAmplitude, floatSpeed } = EXPERIENCE_CONFIG.robot;
        robotGroupRef.current.position.y = pos.y + Math.sin(t * floatSpeed) * floatAmplitude;
      } else {
        robotGroupRef.current.position.y = pos.y;
      }
    }
  });

  return (
    <group
      ref={robotGroupRef}
      position={[BASE_X, BASE_Y, EXPERIENCE_CONFIG.entryAnimation.startZ]}
      rotation={[0, -0.9, 0]}
      scale={1.1}
    >
      <RobotController />
    </group>
  );
};