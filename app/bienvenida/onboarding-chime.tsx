"use client";

// Chime de entrada del onboarding — un acorde mayor con extensión (Do–Mi–
// Sol–Si, Cmaj7 + quinta grave) que entra escalonado y sostiene la
// armonía, con timbre de campana (triangular + armónico octava, ligero
// detune para shimmer) y una reverb generada (impulso de ruido con caída
// exponencial). Todo con Web Audio, sin archivo.
//
// IMPORTANTE: el navegador NO deja sonar nada hasta que hay un gesto del
// usuario (política de autoplay). Por eso:
//   · <OnboardingChime/> intenta al montar y, si queda bloqueado, arma un
//     listener (captura, varios eventos) que lo dispara con el primer
//     toque/tecla en la página.
//   · playOnboardingChime() se puede llamar desde un onClick (ej. el botón
//     "Comenzar") para dispararlo en ese gesto concreto.
// Suena UNA sola vez por sesión.
import { useEffect } from "react";

const SESSION_KEY = "aventhra-onboarding-chime";
const NOTES = [261.63, 523.25, 659.25, 783.99, 987.77];

type AC = typeof AudioContext;

let played = false;

function alreadyPlayed(): boolean {
  if (played) return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markPlayed() {
  played = true;
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* modo privado */
  }
}

function getAudioCtx(): AudioContext | null {
  const Ctx: AC | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    return new Ctx();
  } catch {
    return null;
  }
}

// Impulso corto para el ConvolverNode: ráfaga de ruido con caída
// exponencial → reverb suave tipo "sala pequeña brillante".
function makeImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
  }
  return buf;
}

/** Intenta reproducir el chime. Devuelve `true` si el audio realmente
 *  arrancó (contexto en `running`). Sin efecto si ya sonó esta sesión. */
export async function playOnboardingChime(): Promise<boolean> {
  if (typeof window === "undefined" || alreadyPlayed()) return false;

  const ctx = getAudioCtx();
  if (!ctx) return false;
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

  const t0 = ctx.currentTime + 0.04;

  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  dry.connect(master);

  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx, 2.6);
  wet.connect(reverb);
  reverb.connect(master);

  NOTES.forEach((freq, i) => {
    const t = t0 + i * 0.11;
    const voice = ctx.createGain();
    voice.gain.setValueAtTime(0.0001, t);
    voice.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    voice.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    voice.connect(dry);
    voice.connect(wet);

    const partials: {
      type: OscillatorType;
      mult: number;
      gain: number;
      detune: number;
    }[] = [
      { type: "triangle", mult: 1, gain: 1, detune: -3 },
      { type: "sine", mult: 2, gain: 0.32, detune: 4 },
    ];
    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      osc.type = p.type;
      osc.frequency.value = freq * p.mult;
      osc.detune.value = p.detune;
      const pg = ctx.createGain();
      pg.gain.value = p.gain;
      osc.connect(pg);
      pg.connect(voice);
      osc.start(t);
      osc.stop(t + 3);
    });
  });

  window.setTimeout(() => void ctx.close(), 3600);
  markPlayed();
  return true;
}

export function OnboardingChime() {
  useEffect(() => {
    if (typeof window === "undefined" || alreadyPlayed()) return;

    const events = [
      "pointerdown",
      "pointerup",
      "keydown",
      "touchstart",
      "click",
    ] as const;

    const onGesture = () => {
      void playOnboardingChime().then((ok) => {
        if (ok) events.forEach((e) => window.removeEventListener(e, onGesture, true));
      });
    };

    void playOnboardingChime().then((ok) => {
      if (ok) return;
      events.forEach((e) =>
        window.addEventListener(e, onGesture, { capture: true, passive: true })
      );
    });

    return () => {
      events.forEach((e) => window.removeEventListener(e, onGesture, true));
    };
  }, []);

  return null;
}
