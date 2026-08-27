// app/page.tsx
'use client';

import { ProductosLanding } from '@/components/landing/ProductosLanding';
import { HomeExperience } from '@/components/landing/HomeExperience';
import { useViewportTier } from '@/core/hooks/useQuality';

export default function Home() {
  // Desktop: el Home partido en 2 momentos (HomeExperience) — Pantalla 1
  // (intro) + Pantalla 2 (la landing completa). Mobile/tablet: sin cortina,
  // la misma landing directo (la intro 3D mobile la maneja Experience.tsx:
  // MobileTextIntro + MobileWordmarkScene, y revela este contenido al
  // terminar).
  const tier = useViewportTier();

  if (tier !== 'desktop') {
    return <ProductosLanding />;
  }

  return <HomeExperience />;
}
