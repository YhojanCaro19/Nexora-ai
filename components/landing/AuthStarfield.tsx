// components/landing/AuthStarfield.tsx
//
// Fondo de estrellas SOLO para móvil/tablet en las rutas "bare" del
// entorno Pantalla 2 (login, registro…), donde Experience.tsx apaga el
// MobileSceneContainer (opacity-0) y la página queda sobre negro plano.
// Pedido del usuario: que la experiencia de login tenga el mismo fondo
// que la landing.
//
// Es un <Canvas> mínimo con ÚNICAMENTE DeepSpaceStars — NO el wordmark 3D
// ni su máquina de estados de intro (eso vive solo en '/'), para no tocar
// esa lógica. Mismos parámetros de cámara y densidad de estrellas que
// MobileWordmarkScene.tsx, así se ve idéntico a la landing.
//
// Desktop (lg+) ya tiene su propio fondo (ScreenTwoBackground, el trazo de
// puntos), así que acá se oculta con `lg:hidden`. Sin reacción al mouse
// (DeepSpaceStars sin `interactive`) — en táctil no aplica y evita montar
// listeners. Bajo prefers-reduced-motion el propio DeepSpaceStars queda en
// deriva lenta, sin nada extra.
'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  DeepSpaceStars,
  DEFAULT_STAR_COUNT,
} from '@/components/experience/scene/entities/shared/DeepSpaceStars';

// Mismo cálculo que MOBILE_STAR_COUNT en MobileWordmarkScene.tsx.
const STAR_COUNT = Math.round(DEFAULT_STAR_COUNT * 1.15 * 0.95 * 0.9);

export function AuthStarfield() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 select-none lg:hidden"
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <DeepSpaceStars count={STAR_COUNT} />
        </Suspense>
      </Canvas>
    </div>
  );
}
