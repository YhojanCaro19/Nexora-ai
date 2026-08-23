// components/experience/scene/SceneContainer.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { CameraRig } from './CameraRig';
import { Environment } from './Environment';
import { Lighting } from './Lighting';
import { RobotScene } from './RobotScene';
import { PostProcessing } from './PostProcessing';
import { useQuality } from '../providers/QualityProvider';

export const SceneContainer = () => {
  // dpr real por nivel de calidad (Ultra=2 … Low=1) — antes quedaba fijo
  // en [1, 2] sin importar el nivel, así que arrancar en 'Low' en mobile
  // no bajaba el conteo de píxeles renderizados, el ahorro más grande
  // disponible acá.
  const { config } = useQuality();

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 3.0], fov: 30 }}
        dpr={config.dpr}
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