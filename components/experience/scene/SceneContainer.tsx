// components/experience/scene/SceneContainer.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { CameraRig } from './CameraRig';
import { Environment } from './Environment';
import { Lighting } from './Lighting';
import { RobotScene } from './RobotScene';
import { PostProcessing } from './PostProcessing';

export const SceneContainer = () => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 3.0], fov: 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        shadows={false}
      >
        <Environment />
        <Lighting />
        <CameraRig />
        
        <RobotScene />

        <PostProcessing />
      </Canvas>
    </div>
  );
};