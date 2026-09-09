// app/bienvenida/onboarding-starfield.tsx
//
// Campo de estrellas de fondo para el onboarding del primer login
// (/bienvenida). Mismo <Canvas> mínimo que components/landing/AuthStarfield
// (solo DeepSpaceStars, sin el wordmark 3D ni su máquina de estados), pero
// SIN el `lg:hidden` de aquél — acá el fondo estrellado se quiere también
// en escritorio, porque esta pantalla es una experiencia inmersiva a lo
// ancho, no una ruta "bare" con el trazo de puntos de la Pantalla 2.
//
// Mismos parámetros de cámara y densidad que MobileWordmarkScene, así se ve
// idéntico a la Pantalla 1 de la landing. Sin reacción al mouse
// (DeepSpaceStars sin `interactive`); bajo prefers-reduced-motion el propio
// DeepSpaceStars queda en deriva lenta, sin nada extra.
"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { motion, useReducedMotion } from "framer-motion";
import {
  DeepSpaceStars,
  DEFAULT_STAR_COUNT,
} from "@/components/experience/scene/entities/shared/DeepSpaceStars";

// Mismo cálculo que MOBILE_STAR_COUNT en MobileWordmarkScene.tsx.
const STAR_COUNT = Math.round(DEFAULT_STAR_COUNT * 1.15 * 0.95 * 0.9);

export function OnboardingStarfield() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 select-none"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.1, ease: "easeOut" }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <DeepSpaceStars count={STAR_COUNT} />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}
