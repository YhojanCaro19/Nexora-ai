// app/page.tsx
'use client';

import { HeroContent } from '@/components/landing/HeroContent';
import { HomeExperience } from '@/components/landing/HomeExperience';
import { useViewportTier } from '@/core/hooks/useQuality';

export default function Home() {
  // Mismo hook/breakpoint que ya usa Experience.tsx para decidir el robot
  // 3D (showRobot3D = tier === 'desktop') — el Home partido en 2 momentos
  // (HomeExperience) es exclusivo de esa misma franja. Mobile/tablet no
  // cambian nada: siguen viendo solo <HeroContent/>, una sola pantalla,
  // como siempre (esa franja ya tiene su propia intro con timers, ver
  // MobileTextIntro/MobileWordmarkScene en Experience.tsx).
  const tier = useViewportTier();

  if (tier !== 'desktop') {
    return <HeroContent />;
  }

  return <HomeExperience />;
}
