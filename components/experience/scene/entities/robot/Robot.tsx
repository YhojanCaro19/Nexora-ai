// components/experience/scene/entities/robot/Robot.tsx
'use client';

import { useGLTF } from '@react-three/drei';
import { forwardRef, useEffect } from 'react';
import { Group, Box3, Vector3 } from 'three';
import { useExperience } from '@/components/experience/providers/ExperienceProvider';

export const Robot = forwardRef<Group>((props, ref) => {
  const { actions } = useExperience();
  const { scene } = useGLTF('/models/nexora-robot.glb');

  useEffect(() => {
    if (scene) {
      // 🔍 Medimos el bounding box real del modelo para saber su tamaño exacto.
      const box = new Box3().setFromObject(scene);
      const size = new Vector3();
      const center = new Vector3();
      box.getSize(size);
      box.getCenter(center);

      console.log('📏 Robot bounding box — size:', size, 'center:', center);
      console.log('📏 Altura total (Y):', size.y, '| Top Y:', box.max.y, '| Back Z:', box.min.z);

      actions.onModelLoaded();
    }
  }, [scene, actions]);

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
});

Robot.displayName = 'Robot';