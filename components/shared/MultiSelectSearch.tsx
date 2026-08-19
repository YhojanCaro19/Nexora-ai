"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export type MultiSelectItem = {
  id: string;
  label: string;
};

// Multi-select genérico con buscador incorporado — no depende de Radix ni
// cmdk (no están instalados en el proyecto): el abierto/cerrado y el texto
// de búsqueda se manejan con useState, y el cierre al hacer click afuera
// con useRef + useEffect (mismo patrón que ya usa components/shared/PhoneField.tsx).
//
// El panel se renderiza con un portal a document.body en vez de quedar
// anidado en el DOM: las Card de Nexora tienen overflow-hidden, así que un
// dropdown posicionado absolute adentro se recortaría contra el borde de la
// tarjeta. El portal (createPortal de react-dom, ya es una dependencia
// existente, no una nueva) evita ese recorte y mantiene el z-index simple.
//
// Genérico en items {id, label} a propósito — cualquier pantalla que
// necesite "elegir varios de una lista larga con buscador" reutiliza esto
// en vez de duplicar el patrón.
export function MultiSelectSearch({
  items,
  selectedIds,
  onToggle,
  idPrefix = "multiselect",
  searchPlaceholder = "Buscar...",
  triggerPlaceholder = "Selecciona una o más opciones",
  selectedSuffix = "seleccionados",
  emptyMessage = "Sin resultados.",
}: {
  items: MultiSelectItem[];
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  idPrefix?: string;
  searchPlaceholder?: string;
  triggerPlaceholder?: string;
  selectedSuffix?: string;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function measureRect() {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  function openDropdown() {
    measureRect();
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setQuery("");
  }

  // Mientras está abierto, mantiene la posición del panel al día si se
  // hace scroll o resize (el panel vive fuera del flujo normal del DOM por
  // el portal, así que no se mueve solo). El listener solo se suscribe
  // mientras `open` es true, nunca dispara un setState en el cuerpo del
  // efecto — solo dentro del callback del evento.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measureRect);
    window.addEventListener("scroll", measureRect, true);
    return () => {
      window.removeEventListener("resize", measureRect);
      window.removeEventListener("scroll", measureRect, true);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);
      if (!clickedTrigger && !clickedPanel) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const summary = selectedIds.length === 0 ? triggerPlaceholder : `${selectedIds.length} ${selectedSuffix}`;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closeDropdown() : openDropdown())}
        aria-expanded={open}
        className="flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className="truncate"
          style={{ color: selectedIds.length === 0 ? 'var(--nexora-ink-dim)' : 'var(--nexora-ink)' }}
        >
          {summary}
        </span>
        <ChevronDown size={14} strokeWidth={1.75} style={{ color: 'var(--nexora-ink-dim)' }} />
      </button>

      {open && rect &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-50 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
            style={{ top: rect.top, left: rect.left, width: rect.width }}
          >
            <div className="p-1.5 border-b" style={{ borderColor: 'var(--nexora-line)' }}>
              <div className="relative">
                <Search
                  size={13}
                  strokeWidth={1.75}
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--nexora-ink-dim)' }}
                />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                  {emptyMessage}
                </p>
              ) : (
                filtered.map((item) => (
                  <Label
                    key={item.id}
                    htmlFor={`${idPrefix}-${item.id}`}
                    className="font-normal rounded-md px-1.5 py-1 cursor-pointer hover:bg-muted"
                  >
                    <Checkbox
                      id={`${idPrefix}-${item.id}`}
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={(checked) => onToggle(item.id, checked === true)}
                    />
                    <span className="truncate" style={{ color: 'var(--nexora-ink)' }}>{item.label}</span>
                  </Label>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
