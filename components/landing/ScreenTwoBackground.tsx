// components/landing/ScreenTwoBackground.tsx
//
// Fondo compartido de la "Pantalla 2" (todas las rutas con ScreenTwoNavbar
// + el Momento 2 del Home): el trazo de puntos reactivo (SectionDots),
// FIJO detrás del contenido.
//
// Cubre TODO el ancho — antes se cortaba en el 68% izquierdo y dejaba un
// hueco a la derecha (debajo de la cabeza del robot). Ahora los puntos van
// de lado a lado; solo se "carva" un hueco suave arriba a la derecha, donde
// va la cabeza del robot en ProductosHero, para no pisarla. En las rutas
// sin robot ese hueco es una sombra tenue casi imperceptible.
//
// Solo desktop (`lg`) — en mobile/tablet no se monta.
'use client';

import { SectionDots } from '@/components/landing/SectionDots';

const VERTICAL_FADE =
  'linear-gradient(to bottom, transparent 0%, black 9%, black 90%, transparent 100%)';
// Hueco suave donde va la cabeza del robot (arriba, hacia la derecha).
const ROBOT_HOLE =
  'radial-gradient(40vw 44vh at 85% 33%, transparent 0%, transparent 44%, black 82%)';

export function ScreenTwoBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden select-none lg:block">
      <div
        className="h-full w-full"
        style={{ WebkitMaskImage: VERTICAL_FADE, maskImage: VERTICAL_FADE }}
      >
        <div
          className="h-full w-full"
          style={{ WebkitMaskImage: ROBOT_HOLE, maskImage: ROBOT_HOLE }}
        >
          <SectionDots />
        </div>
      </div>
    </div>
  );
}
