"use client";

// Chime de entrada del onboarding — 4 notas ascendentes (Do–Mi–Sol–Do) en
// senoidales suaves con cola exponencial larga. Generado con Web Audio, sin
// archivo de audio.
//
// El navegador bloquea el audio hasta que hay un gesto del usuario: se
// intenta al montar y, si queda bloqueado, se dispara con el primer
// toque/tecla. Suena UNA sola vez por sesión (sessionStorage). Se salta
// bajo prefers-reduced-motion.
import { useEffect } from "react";

const SESSION_KEY = "aventhra-onboarding-chime";
const NOTES = [523.25, 659.25, 783.99, 1046.5];

export function OnboardingChime() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      return;
    }

    let played = false;

    const play = () => {
      if (played) return;
      const Ctx = window.AudioContext;
      if (!Ctx) return;
      try {
        const ctx = new Ctx();
        if (ctx.state === "suspended") void ctx.resume();

        const master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);

        const now = ctx.currentTime + 0.02;
        NOTES.forEach((freq, i) => {
          const t = now + i * 0.085;
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.14, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
          osc.connect(g);
          g.connect(master);
          osc.start(t);
          osc.stop(t + 2);
        });

        played = true;
        try {
          window.sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* modo privado, etc. */
        }
        window.setTimeout(() => void ctx.close(), 2600);
      } catch {
        /* audio no disponible */
      }
    };

    play();
    if (played) return;

    const onGesture = () => {
      play();
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  return null;
}
