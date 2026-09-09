"use client";

// Desplegable propio, reutilizable — NO el <Select> de components/ui
// (ese usa @base-ui/react/select, cuyo <SelectValue> a veces muestra el
// `value` crudo en vez de la etiqueta del ítem seleccionado en el primer
// render; encontrado en Superadmin → Logs, 2026-09-07). Este es más
// simple: un botón redondeado (mismo look que las pestañas
// Activos/Inhabilitados) que abre un panel con las opciones, y siempre
// muestra exactamente el texto que le pasas — sin adivinar nada.
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  key: string;
  label: string;
}

export function Dropdown({
  triggerLabel,
  options,
  activeKey,
  onSelect,
  className,
}: {
  triggerLabel: string;
  options: DropdownOption[];
  activeKey: string;
  onSelect: (key: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function choose(key: string) {
    onSelect(key);
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
        style={{ borderColor: "var(--nexora-line)", color: "var(--nexora-ink)" }}
      >
        {triggerLabel}
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform"
          style={{ color: "var(--nexora-ink-dim)", transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border py-1 shadow-xl"
          style={{ borderColor: "var(--nexora-line)", background: "var(--nexora-panel)" }}
        >
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => choose(opt.key)}
              className="block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-white/[0.06]"
              style={{ color: activeKey === opt.key ? "var(--nexora-nova)" : "var(--nexora-ink)" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
