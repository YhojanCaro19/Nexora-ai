"use client";

// Chime de entrada del onboarding — 4 notas ascendentes (Do–Mi–Sol–Do) en
// senoidales suaves con cola exponencial larga. Generado con Web Audio, sin
// archivo de audio.
//
// El navegador arranca el AudioContext SUSPENDIDO hasta que hay un gesto
// del usuario. Se intenta al montar; si el `resume()` no lo pone en
// `running`, NO se marca como reproducido y se arma un listener para el
// primer toque/tecla, que sí lo desbloquea. Suena UNA vez por sesión.
import { useEffect } from "react";

const SESSION_KEY = "aventhra-onboarding-chime";
const NOTES = [523.25, 659.25, 783.99, 1046.5];

export function OnboardingChime() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* sessionStorage bloqueado — se intenta igual */
    }

    let done = false;

    const playChime = async (): Promise<boolean> => {
      const Ctx = window.AudioContext;
      if (!Ctx) return false;
      let ctx: AudioContext;
      try {
        ctx = new Ctx();
      } catch {
        return false;
      }
      if (ctx.state !== "running") {
        try {
          await ctx.resume();
        } catch {
          /* sigue bloqueado */
        }
      }
      if (ctx.state !== "running") {
        void ctx.close();
        return false;
      }

      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);

      const now = ctx.currentTime + 0.03;
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

      window.setTimeout(() => void ctx.close(), 2800);
      return true;
    };

    const markDone = () => {
      done = true;
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* modo privado */
      }
    };

    const onGesture = () => {
      if (done) return;
      void playChime().then((ok) => {
        if (ok) markDone();
      });
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };

    void playChime().then((ok) => {
      if (ok) {
        markDone();
        return;
      }
      // Bloqueado por la política de autoplay — esperar un gesto real.
      window.addEventListener("pointerdown", onGesture);
      window.addEventListener("keydown", onGesture);
    });

    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  return null;
}
