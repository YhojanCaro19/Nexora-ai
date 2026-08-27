// components/landing/HideStarfield.tsx
//
// Apaga el fondo de estrellas (DeepSpaceStars, ver Environment.tsx)
// mientras este componente esté montado, y lo restaura al desmontar.
// Reutiliza el mismo booleano compartido que ya prende/apaga el Home en
// su Pantalla 2 (`homeMomentTwoVisible`, ExperienceProvider.tsx) — pese al
// nombre "home", en el fondo representa "¿hay contenido de página real
// cubriendo la pantalla, sin necesidad del fondo de estrellas?", y las
// páginas placeholder (/soluciones, /precios, /clientes) son exactamente
// ese mismo caso — reutiliza la MISMA plomería en vez de inventar un
// segundo booleano idéntico. No renderiza nada.
//
// Desktop-only en la práctica sin necesidad de chequear el tier acá: en
// mobile/tablet nadie lee `homeMomentTwoVisible` (esa franja tiene su
// propia escena — MobileWordmarkScene, con su propio DeepSpaceStars
// independiente), así que montar esto ahí no tiene ningún efecto visual,
// solo una escritura de contexto inofensiva.
'use client';

import { useEffect } from 'react';
import { useExperience } from '@/components/experience/providers/ExperienceProvider';

export function HideStarfield() {
  const { actions } = useExperience();

  useEffect(() => {
    actions.setHomeMomentTwoVisible(true);
    return () => actions.setHomeMomentTwoVisible(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
