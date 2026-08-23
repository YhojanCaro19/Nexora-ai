// core/hooks/useQuality.ts
//
// Detecta el "tier" de viewport UNA SOLA VEZ (sin listener de resize) —
// sirve para (a) decidir el nivel de calidad inicial del robot 3D en
// QualityProvider.tsx sin pelear con su lógica de auto-ajuste por FPS, que
// sigue siendo la única fuente de verdad para cualquier cambio DESPUÉS del
// montaje, y (b) decidir en Experience.tsx si se monta el robot 3D real
// (desktop) o la intro cinemática (mobile/tablet) — esto último SÍ importa
// para hidratación (afecta DOM real, no solo props dentro de un <Canvas>
// aislado), así que se resuelve con useSyncExternalStore en vez de un
// useState+useEffect a mano: React ya sabe usar getServerSnapshot durante
// SSR e hidratación, y recién después de hidratar pasa a getClientSnapshot
// — sin el flash de "valor por defecto" que un booleano "mounted" manual
// necesita, y sin el warning de set-state-en-efecto que esa técnica dispara
// (ver el mismo patrón, ya con ese warning, en components/landing/
// NexoraRobotHead.tsx — no se replicó acá a propósito).
//
// Breakpoints iguales a los que ya usa Navbar.tsx para su propio cambio
// mobile/desktop ("lg:hidden" / "hidden lg:flex") — no se inventan números
// nuevos, y ambos deben moverse juntos si el corte cambia.
'use client';

import { useSyncExternalStore } from 'react';

export type ViewportTier = 'mobile' | 'tablet' | 'desktop';

const BREAKPOINTS = {
  // < 768px
  mobileMax: 767,
  // 768–1023px (el corte real "desktop" es >= 1024, el mismo breakpoint
  // `lg` que usa Navbar.tsx para su propio cambio mobile/desktop — deben
  // coincidir exacto, si no un viewport de exactamente 1024px cae en
  // "tablet" aquí pero ya ve el navbar de escritorio vía CSS).
  tabletMax: 1023,
} as const;

// Exportada además del hook de abajo — QualityProvider.tsx la usa
// DIRECTA (no vía el hook hidratación-seguro) para el valor inicial de
// `level`: ver el comentario ahí para el porqué (bug real de hidratación
// que dejaba `level` arrancando en 'Ultra' en vez de 'Low').
export function computeViewportTier(): ViewportTier {
  const width = window.innerWidth;
  if (width <= BREAKPOINTS.mobileMax) return 'mobile';
  if (width <= BREAKPOINTS.tabletMax) return 'tablet';
  return 'desktop';
}

// Nunca notifica — no hay listener de resize. useSyncExternalStore exige
// una función subscribe válida igual; esta simplemente no dispara jamás el
// callback, así que el snapshot de cliente, una vez leído, no vuelve a
// invalidarse por sí solo.
function subscribeNever() {
  return () => {};
}

// Cacheado a nivel de módulo: se calcula una única vez por carga real de
// la página (no por componente que llame al hook, todos comparten el mismo
// valor) y jamás se recalcula después, ni con resize ni con más renders.
let cachedClientTier: ViewportTier | null = null;

function getClientSnapshot(): ViewportTier {
  if (cachedClientTier === null) {
    cachedClientTier = computeViewportTier();
  }
  return cachedClientTier;
}

function getServerSnapshot(): ViewportTier {
  // Pase de SSR: 'desktop' preserva el comportamiento previo a esta
  // feature (robot 3D) si por lo que sea se llegara a pintar antes de que
  // React resuelva la hidratación con el valor real de cliente.
  return 'desktop';
}

/**
 * Tier de viewport resuelto una única vez tras la hidratación — no se
 * vuelve a recalcular mientras dure la carga de la página, ni siquiera si
 * la ventana cambia de tamaño.
 */
export function useViewportTier(): ViewportTier {
  return useSyncExternalStore(subscribeNever, getClientSnapshot, getServerSnapshot);
}
