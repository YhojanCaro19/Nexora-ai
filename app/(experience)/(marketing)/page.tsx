// app/page.tsx
'use client';

import { ProductosLanding } from '@/components/landing/ProductosLanding';
import { HomeExperience } from '@/components/landing/HomeExperience';
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { useViewportTier } from '@/core/hooks/useQuality';

export default function Home() {
  // Desktop: el Home partido en 2 momentos (HomeExperience) — Pantalla 1
  // (intro) + Pantalla 2 (la landing completa). Mobile/tablet: sin cortina,
  // la misma landing directo (la intro 3D mobile la maneja Experience.tsx:
  // MobileTextIntro + MobileWordmarkScene, y revela este contenido al
  // terminar).
  const tier = useViewportTier();

  if (tier !== 'desktop') {
    // La isla flotante (ScreenTwoNavbar) va acá porque en mobile el Home
    // NO pasa por HomeExperience (que es quien la monta en desktop) y
    // ProductosLanding no trae navbar propio. `Experience.tsx` ya suprime
    // el <Navbar/> genérico en '/'.
    return (
      <>
        <ScreenTwoNavbar />
        <ProductosLanding />
      </>
    );
  }

  return <HomeExperience />;
}
