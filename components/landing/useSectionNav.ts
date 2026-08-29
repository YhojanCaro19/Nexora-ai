// components/landing/useSectionNav.ts
//
// Navegación a una sección de la landing larga (ProductosLanding) desde
// los navbars. Si ya estamos en una página que renderiza esa landing
// ('/' o '/productos'), hace scroll suave al elemento por id; si no,
// navega a /productos#<id> y el navegador ancla solo.
//
// Ids usados: 'productos' (hero, en ProductosHero), 'planes' (sección de
// planes, en Plans), 'faq' (preguntas frecuentes, en ProductosLanding).
'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const LANDING_PATHS = new Set(['/', '/productos']);

export function useSectionNav() {
  const pathname = usePathname();
  const router = useRouter();

  return useCallback(
    (id: string) => {
      if (LANDING_PATHS.has(pathname)) {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.history.replaceState(null, '', `#${id}`);
          return;
        }
      }
      router.push(`/productos#${id}`);
    },
    [pathname, router],
  );
}
