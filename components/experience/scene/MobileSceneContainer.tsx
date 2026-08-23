// components/experience/scene/MobileSceneContainer.tsx
//
// <Canvas> real para mobile/tablet (< 1024px) — reemplaza tanto a la
// intro CSS 2D (MobileIntro.tsx, descartada) como al wordmark de texto +
// chispas CSS que vivía en el Navbar. Mismo stack que SceneContainer.tsx
// (el del robot de desktop): @react-three/fiber + drei.
//
// gl alpha sigue en true (transparente) aunque ya no exista una capa CSS
// de fondo aparte detrás (Starfield.tsx fue eliminado — MobileWordmark-
// Scene.tsx monta su propio DeepSpaceStars, mismos radios que desktop):
// se mantiene por si algún día hay contenido debajo de este Canvas que
// deba asomar, y porque scene.background nunca se fija de forma opaca
// acá (a diferencia de Environment.tsx del lado desktop).
'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { MobileWordmarkScene } from './entities/wordmark/MobileWordmarkScene';
import { PostProcessing } from './PostProcessing';
import { useQuality } from '../providers/QualityProvider';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';

export function MobileSceneContainer() {
  // QualityProvider ya no auto-ajusta nada — `config` es un valor fijo
  // ('Ultra') para toda la app, todo el tiempo (pedido explícito del
  // usuario tras el bug real de color/brillo que causaba el auto-ajuste
  // por FPS a mitad de la intro del wordmark, ver QualityProvider.tsx).
  // Antes esto necesitaba "congelarse" al valor del primer render para no
  // heredar cambios en vivo — ya no hace falta, `config` nunca cambia.
  const { config } = useQuality();

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{
          position: EXPERIENCE_CONFIG.mobileWordmark.camera.position,
          fov: EXPERIENCE_CONFIG.mobileWordmark.camera.fov,
        }}
        dpr={config.dpr}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <MobileWordmarkScene />
        </Suspense>

        {/* Mismo bloom/vignette sutil que el robot en desktop
            (SceneContainer.tsx) — sin esto el wordmark mobile no
            "brillaba" igual aunque ya comparta material y chispas. No
            depende de assets async así que va fuera del Suspense, igual
            que en desktop. */}
        <PostProcessing />
      </Canvas>
    </div>
  );
}
