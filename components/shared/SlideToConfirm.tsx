"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

// Control "deslizá para confirmar" — una barra con un pulgar arrastrable.
// Se confirma de dos formas (pedido explícito del usuario: "arrastrar O
// tocar"): arrastrando el pulgar hasta el final, o tocando la barra. Pensado
// para acciones que importan y no deben dispararse por un tap accidental en
// una lista (cambiar el estado de un pedido). Sin librería — pointer events
// nativos, mismo criterio que el resto de components/shared.

type Tone = "neutral" | "success" | "danger";

const TONE: Record<Tone, { track: string; fill: string; thumb: string; thumbInk: string }> = {
  neutral: {
    track: "rgba(255,255,255,0.05)",
    fill: "color-mix(in oklch, var(--nexora-nova) 20%, transparent)",
    thumb: "var(--nexora-nova)",
    thumbInk: "var(--nexora-nova-ink)",
  },
  success: {
    track: "color-mix(in oklch, var(--nexora-signal) 9%, transparent)",
    fill: "color-mix(in oklch, var(--nexora-signal) 24%, transparent)",
    thumb: "var(--nexora-signal)",
    thumbInk: "#04140d",
  },
  danger: {
    track: "color-mix(in oklch, var(--nexora-alert) 9%, transparent)",
    fill: "color-mix(in oklch, var(--nexora-alert) 24%, transparent)",
    thumb: "var(--nexora-alert)",
    thumbInk: "var(--nexora-alert-ink)",
  },
};

const THUMB_PX = 44;
const HEIGHT_PX = 52;
const CONFIRM_AT = 0.85; // fracción del recorrido para que cuente como confirmado
const MOVE_EPS = 6; // px de movimiento para distinguir arrastre de tap

export function SlideToConfirm({
  label,
  onConfirm,
  tone = "neutral",
  loading = false,
  disabled = false,
}: {
  label: string;
  onConfirm: () => void | Promise<void>;
  tone?: Tone;
  /** El padre lo pone en true mientras corre la server action. */
  loading?: boolean;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const movedRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [prevLoading, setPrevLoading] = useState(false);

  // Ajuste de estado en render (patrón avalado por React para "reaccionar a
  // un cambio de prop"): cuando el padre termina la acción y seguimos
  // montados —típicamente porque hubo error—, la barra vuelve al inicio.
  if (prevLoading !== loading) {
    setPrevLoading(loading);
    if (!loading) setProgress(0);
  }

  const styles = TONE[tone];
  const busy = loading;
  const shown = busy ? 1 : progress;
  const locked = disabled || busy;

  function fractionFromClientX(clientX: number): number {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const usable = Math.max(1, rect.width - THUMB_PX);
    return Math.max(0, Math.min(1, (clientX - rect.left - THUMB_PX / 2) / usable));
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (locked) return;
    trackRef.current?.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    movedRef.current = false;
    setDragging(true);
    setProgress(fractionFromClientX(e.clientX));
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    if (Math.abs(e.clientX - startXRef.current) > MOVE_EPS) movedRef.current = true;
    setProgress(fractionFromClientX(e.clientX));
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    trackRef.current?.releasePointerCapture(e.pointerId);
    setDragging(false);

    // Tap (sin arrastre real) → confirma. Arrastre → confirma solo si pasó
    // el umbral; si no, vuelve al inicio.
    if (!movedRef.current || progress >= CONFIRM_AT) {
      setProgress(1);
      void onConfirm();
    } else {
      setProgress(0);
    }
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="button"
      tabIndex={locked ? -1 : 0}
      aria-label={label}
      aria-disabled={locked}
      onKeyDown={(e) => {
        if (locked) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setProgress(1);
          void onConfirm();
        }
      }}
      className="relative w-full select-none overflow-hidden rounded-full border touch-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--nexora-nova)]"
      style={{
        height: HEIGHT_PX,
        background: styles.track,
        borderColor: "var(--nexora-line)",
        cursor: locked ? "default" : "grab",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Relleno que crece detrás del pulgar */}
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `calc(${THUMB_PX / 2}px + ${shown} * (100% - ${THUMB_PX}px) + ${THUMB_PX / 2}px)`,
          background: styles.fill,
          transition: dragging ? "none" : "width 220ms ease",
        }}
      />

      {/* Etiqueta centrada — se desvanece a medida que avanza el pulgar */}
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-12 text-center text-sm font-medium"
        style={{
          color: "var(--nexora-ink)",
          opacity: busy ? 0 : 1 - shown * 1.4,
          transition: dragging ? "none" : "opacity 220ms ease",
        }}
      >
        {label}
      </span>

      {/* Pulgar */}
      <div
        className="absolute top-1/2 flex items-center justify-center rounded-full"
        style={{
          width: THUMB_PX - 8,
          height: THUMB_PX - 8,
          left: `calc(4px + ${shown} * (100% - ${THUMB_PX}px))`,
          transform: "translateY(-50%)",
          background: styles.thumb,
          color: styles.thumbInk,
          transition: dragging ? "none" : "left 220ms ease",
          boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
        }}
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin motion-reduce:animate-none" />
        ) : shown > 0.98 ? (
          <Check size={18} strokeWidth={2.5} />
        ) : (
          <ArrowRight size={18} strokeWidth={2.5} />
        )}
      </div>
    </div>
  );
}
