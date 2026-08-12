// components/experience/scene/entities/robot/RobotController.tsx
'use client';

import { useRef, type RefObject } from 'react';
import { Group } from 'three';
import { useExperience } from '@/components/experience/providers/ExperienceProvider';
import { useMouse } from '@/components/experience/providers/MouseProvider';
import { ExperiencePhase } from '@/types/experience.type';
import { Robot } from './Robot';
import { RobotAnimator } from './RobotAnimator';

interface RobotControllerProps {
  /** true cuando terminó el descenso por cables — recién ahí arranca el
   * float/respiración/seguimiento de mouse y la animación idle del rig. */
  arrived: boolean;
  /** 0→1: progreso de la soltada, para enderezar la cabeza en sincronía
   * con los cables retrayéndose (ver DescentCables). */
  releaseProgressRef: RefObject<number>;
}

export const RobotController = ({ arrived, releaseProgressRef }: RobotControllerProps) => {
  const robotGroupRef = useRef<Group>(null);
  const { state } = useExperience();
  const mouse = useMouse();

  return (
    <>
      <group ref={robotGroupRef}>
        <Robot arrived={arrived} releaseProgressRef={releaseProgressRef} />
      </group>

      <RobotAnimator
        ref={robotGroupRef}
        isInteractive={arrived && state.phase === ExperiencePhase.INTERACTIVE}
        active={arrived}
        mouse={mouse}
      />
    </>
  );
};