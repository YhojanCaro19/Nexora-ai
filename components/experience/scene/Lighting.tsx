// components/experience/scene/Lighting.tsx
'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useExperience } from '../providers/ExperienceProvider';
import { ExperiencePhase } from '@/types/experience.type';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';
import { lerp } from '@/lib/math';
import { Group } from 'three';

export const Lighting = () => {
  const { state } = useExperience();
  const lightGroup = useRef<Group>(null);
  const intensityRef = useRef(0);

  useFrame(() => {
    const targetIntensity = state.phase === ExperiencePhase.REVEAL_SCENE ||
                            state.phase === ExperiencePhase.REVEAL_UI ||
                            state.phase === ExperiencePhase.INTERACTIVE
                            ? 1 : 0;

    intensityRef.current = lerp(intensityRef.current, targetIntensity, 0.04);

    if (lightGroup.current) {
      lightGroup.current.children.forEach((child: any) => {
        if (child.isLight) {
          child.intensity = child.userData.baseIntensity * intensityRef.current;
        }
      });
    }
  });

  return (
    <group ref={lightGroup}>
      <ambientLight
        intensity={EXPERIENCE_CONFIG.lighting.intensity.ambient}
        color="#404060"
        userData={{ baseIntensity: EXPERIENCE_CONFIG.lighting.intensity.ambient }}
      />

      <directionalLight
        position={[0, 3, 6]}
        intensity={EXPERIENCE_CONFIG.lighting.intensity.key}
        color="#ffffff"
        userData={{ baseIntensity: EXPERIENCE_CONFIG.lighting.intensity.key }}
      />

      <directionalLight
        position={[-4, -2, 3]}
        intensity={EXPERIENCE_CONFIG.lighting.intensity.fill}
        color="#818CF8"
        userData={{ baseIntensity: EXPERIENCE_CONFIG.lighting.intensity.fill }}
      />

      <directionalLight
        position={[0, 4, -5]}
        intensity={EXPERIENCE_CONFIG.lighting.intensity.rim}
        color="#4CC2E8"
        userData={{ baseIntensity: EXPERIENCE_CONFIG.lighting.intensity.rim }}
      />

      {/* 🔥 LUZ ASTRAL: halo puntual detrás del robot, como si emanara luz propia */}
      <pointLight
        position={[EXPERIENCE_CONFIG.robot.baseX, EXPERIENCE_CONFIG.robot.baseY + 0.3, -1.4]}
        intensity={3.5}
        distance={4}
        color="#4CC2E8"
        userData={{ baseIntensity: 3.5 }}
      />
      <pointLight
        position={[EXPERIENCE_CONFIG.robot.baseX - 0.6, EXPERIENCE_CONFIG.robot.baseY, -1.1]}
        intensity={1.8}
        distance={3}
        color="#A78BFA"
        userData={{ baseIntensity: 1.8 }}
      />
    </group>
  );
};