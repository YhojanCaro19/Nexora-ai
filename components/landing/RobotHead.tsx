// components/landing/RobotHead.tsx
//
// Cabeza del robot para la sección Productos (ProductosHero.tsx). Es el
// VIDEO `public/media/robot-head.mp4` con el tratamiento estándar de la
// landing — ver LandingVideo.tsx.
'use client';

import { LandingVideo } from '@/components/landing/LandingVideo';

export function RobotHead() {
  return <LandingVideo src="/media/robot-head.mp4" />;
}
