"use client";

import {
  useEffect,
  useRef,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

// Input segmentado para el código OTP — una casilla grande por dígito.
// El largo sale de quien lo usa (OTP_CODE_LENGTH, hoy 8), nunca se
// hardcodea acá. Pensado para reusarse en todos los flujos que piden el
// código de acción destructiva (eliminar colaborador y, a futuro,
// eliminar negocio u otras). No usa librería: son inputs nativos con
// manejo de foco, backspace y pegado, mismo criterio que el resto de
// components/shared (AvatarCropper, MultiSelectSearch).
//
// El valor es siempre un string compacto de dígitos alineado a la
// izquierda (sin huecos): la casilla `i` muestra `value[i]`.
export function OtpInput({
  value,
  onChange,
  length,
  disabled = false,
  autoFocus = false,
  onComplete,
}: {
  value: string;
  onChange: (next: string) => void;
  length: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  function commit(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  }

  function focusAt(index: number) {
    const clamped = Math.max(0, Math.min(index, length - 1));
    inputsRef.current[clamped]?.focus();
    inputsRef.current[clamped]?.select();
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    const next = value.slice(0, index) + digit + value.slice(index + 1);
    commit(next);
    focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) {
        commit(value.slice(0, index) + value.slice(index + 1));
        focusAt(index);
      } else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index));
        focusAt(index - 1);
      }
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(e: ReactClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    commit(pasted);
    focusAt(pasted.length);
  }

  // Al enfocar una casilla más allá del último dígito escrito, se
  // reubica el cursor en la primera casilla vacía — así no quedan huecos.
  function handleFocus(index: number) {
    if (index > value.length) focusAt(value.length);
  }

  return (
    <div className="flex justify-center gap-1.5 sm:gap-2" role="group" aria-label="Código de verificación">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(i)}
          aria-label={`Dígito ${i + 1}`}
          className="w-8 h-11 sm:w-11 sm:h-14 rounded-lg text-center text-lg sm:text-xl font-nexora tabular-nums outline-none transition-colors disabled:opacity-50 focus:ring-2 focus:ring-[var(--nexora-nova)]"
          style={{
            background: "var(--nexora-secondary)",
            border: "1px solid var(--nexora-line)",
            color: "var(--nexora-ink)",
          }}
        />
      ))}
    </div>
  );
}
