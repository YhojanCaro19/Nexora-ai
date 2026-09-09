"use client";

// Estela de color de marca del onboarding. Elipse cian/violeta muy
// difuminada (blur) sobre una capa que se sale del viewport para que el
// borde del blur no haga viñeta. Entra con un fundido al montar.
//
// Solo se muestra en las pantallas de personalización (datos / industria /
// "personalizando" / "listo"), NUNCA en el "welcome" — el montaje lo
// controla el OnboardingShell a partir del estado del wizard.
//
// Centrada en el viewport y con buen cuerpo: es el telón de fondo del
// formulario.
import { motion, useReducedMotion } from "framer-motion";

export function OnboardingEstela() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-0"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.1, ease: "easeOut" }}
      style={{
        top: "-30%",
        left: "-30%",
        width: "160%",
        height: "160%",
        background:
          "radial-gradient(ellipse 92vw 56vh at 50% 50%, rgba(129,140,248,0.72), rgba(129,140,248,0.28) 40%, transparent 80%)",
        filter: "blur(90px)",
      }}
    />
  );
}
