// components/landing/RobotHead.tsx
//
// Cabeza del robot para la sección Productos (ProductosHero.tsx). Es el
// VIDEO `public/media/robot-head.mp4` con el tratamiento estándar de la
// landing — ver LandingVideo.tsx.
'use client';

import { LandingVideo } from '@/components/landing/LandingVideo';

export function RobotHead() {
  // `revealOnPlay`: arranca invisible y aparece con un fundido corto recién
  // cuando el video ya corre de verdad — nunca se ve el primer fotograma
  // congelado al entrar a la sección.
  return <LandingVideo src="/media/robot-head.mp4" revealOnPlay />;
}
