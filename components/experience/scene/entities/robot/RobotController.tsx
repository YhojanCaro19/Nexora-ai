// components/experience/scene/entities/robot/RobotController.tsx
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { useExperience } from '@/components/experience/providers/ExperienceProvider';
import { useMouse } from '@/components/experience/providers/MouseProvider';
import { ExperiencePhase } from '@/types/experience.type';
import { Robot } from './Robot';
import { RobotAnimator } from './RobotAnimator';
// ELIMINAMOS LA IMPORTACIÓN DE CABLES DE AQUÍ
// import { Cables } from '@/components/experience/scene/entities/cables/Cables';

export const RobotController = () => {
  const robotGroupRef = useRef<Group>(null);
  const { state } = useExperience();
  const mouse = useMouse();

  return (
    <>
      {/* 
        ELIMINAMOS LOS CABLES DE AQUÍ. 
        Los cables se renderizarán de forma independiente y estática en el SceneContainer.
      */}
      
      <group ref={robotGroupRef}>
        <Robot />
      </group>

      <RobotAnimator 
        ref={robotGroupRef} 
        isInteractive={state.phase === ExperiencePhase.INTERACTIVE}
        mouse={mouse}
      />
    </>
  );
};