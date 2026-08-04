// components/experience/scene/entities/robot/EmissiveSystem.tsx
'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CircleGeometry, MeshBasicMaterial, DoubleSide } from 'three';

export const EmissiveSystem = () => {
  const materialRef = useRef<MeshBasicMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      const t = state.clock.getElapsedTime();
      const beat = Math.sin(t * 1.2) * 0.5 + 0.5;
      const pulse = Math.pow(beat, 2) * 0.4 + 0.6;
      materialRef.current.opacity = pulse;
    }
  });

  return (
    <group>
      {/* 
        CAMBIO: De PlaneGeometry a CircleGeometry.
        Esto elimina las esquinas del cuadrado azul.
      */}
      <mesh position={[0, 0.5, 0.45]} scale={[0.25, 0.35, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial 
          ref={materialRef}
          color="#4CC2E8" 
          transparent={true}
          opacity={0.7} // Un poco más brillante
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
};