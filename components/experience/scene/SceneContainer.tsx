// components/experience/scene/SceneContainer.tsx
//
// Escena 3D compartida y PERSISTENTE (vive en el layout vía Experience.tsx,
// nunca se desmonta). Hoy = SOLO el fondo: campo de estrellas interactivo
// (DeepSpaceStars, reacciona al mouse), estrellas fugaces, luz cinemática,
// bloom + viñeta.
//
// 🤖 El robot 3D (RobotScene) SALIÓ de acá — pedido explícito del usuario:
// "eliminar al robot de la Pantalla 1, ... el robot quiero que quede en
// una parte de Productos". Ahora se monta en su propio <Canvas> embebido
// en la sección donde va (ver components/landing/…), con el material
// iridiscente nuevo. Los archivos del robot (RobotScene, RobotController,
// Robot, DescentCables, EmissiveSystem) se conservan para ese uso.
'use client';

import { Canvas } from '@react-three/fiber';
import { CameraRig } from './CameraRig';
import { Environment } from './Environment';
import { Lighting } from './Lighting';
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

        <PostProcessing />
      </Canvas>
    </div>
  );
};