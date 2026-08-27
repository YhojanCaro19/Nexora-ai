// components/landing/ScreenTwoBackground.tsx
//
// Fondo compartido de la "Pantalla 2" (todas las rutas con ScreenTwoNavbar
// + el Momento 2 del Home): el trazo de puntos reactivo (SectionDots),
// FIJO detrás del contenido, del lado izquierdo, sin llegar al borde
// derecho. Se difumina arriba (para no pelear con el navbar) y a la
// derecha.
//
// Solo desktop (`lg`) — en mobile/tablet no se monta (esas rutas ya tienen
// su propia escena y el canvas extra no aporta).
'use client';

import { SectionDots } from '@/components/landing/SectionDots';

export function ScreenTwoBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden select-none lg:block">
      <div className="absolute left-0 top-0 h-full w-[68%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_9%,black_90%,transparent_100%)]">
        <div className="h-full w-full [mask-image:linear-gradient(to_right,black_0%,black_54%,transparent_90%)]">
          <SectionDots />
        </div>
      </div>
    </div>
  );
}
