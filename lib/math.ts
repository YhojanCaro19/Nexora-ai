// lib/math.ts
// Funciones matemáticas básicas para la experiencia 3D.

/**
 * Interpolación lineal suave (Lerp) - La base de toda inercia en el proyecto.
 * @param start Valor actual
 * @param end Valor objetivo
 * @param amt Factor de interpolación (0 a 1). Bajo = lento, Alto = rápido.
 */
export const lerp = (start: number, end: number, amt: number) => {
  return (1 - amt) * start + amt * end;
};

/**
 * Clamp: Limita un valor entre un mínimo y un máximo.
 */
export const clamp = (val: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, val));
};

/**
 * Ease-out cúbico: arranca rápido y frena suave al llegar a 1.
 * @param t Progreso lineal (0 a 1).
 */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Ease-in cúbico: arranca lento y ACELERA hasta 1 — lo opuesto de
 * easeOutCubic. Sirve para movimientos que "se lanzan" (ganan velocidad
 * hacia el final) en vez de frenar al llegar.
 * @param t Progreso lineal (0 a 1).
 */
export const easeInCubic = (t: number) => t * t * t;