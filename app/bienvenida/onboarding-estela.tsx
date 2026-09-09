"use client";

// Estela de color de marca del onboarding. Elipse horizontal cian/violeta
// muy difuminada (blur) sobre una capa que se sale del viewport para que
// el borde del blur no haga viñeta. Entra con un fundido al montar (junto
// con las estrellas), antes que el contenido.
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
          "radial-gradient(ellipse 96vw 50vh at 50% 41%, rgba(129,140,248,0.58), rgba(129,140,248,0.19) 38%, transparent 80%)",
        filter: "blur(90px)",
      }}
    />
  );
}
