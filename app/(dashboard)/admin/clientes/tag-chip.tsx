// Chip de etiqueta reutilizado tanto en el detalle de un cliente
// (customer-detail-view.tsx, con opción de quitar) como en la lista de
// Clientes (clientes-panel.tsx, solo lectura) — un solo lugar para el
// mapeo hex -> fondo con opacidad baja, en vez de duplicarlo en los dos
// archivos.
import { X } from "lucide-react";
import type { Tag } from "@/lib/services/tagService";

// El color de una etiqueta es un valor por-registro que viene de la base
// de datos (tags.color, elegido por el admin al crearla) — no es un color
// del sistema Nexora, así que esta conversión hex->rgba es la excepción
// legítima a "nunca un hex suelto": el hex acá es dato, no diseño.
function hexToRgba(hex: string, alpha: number): string | null {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  if (Number.isNaN(value) || full.length !== 6) {
    return null;
  }
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function TagChip({
  tag,
  onRemove,
  removing = false,
}: {
  tag: Tag;
  onRemove?: () => void;
  removing?: boolean;
}) {
  // Si el color guardado no es un hex válido (no debería pasar, siempre
  // sale de DEFAULT_TAG_COLOR o de un input controlado), cae a los tokens
  // Nexora en vez de un valor inventado.
  const background = hexToRgba(tag.color, 0.16) ?? 'var(--nexora-muted)';
  const ink = hexToRgba(tag.color, 1) ? tag.color : 'var(--nexora-ink-dim)';

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background, color: ink }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Quitar etiqueta ${tag.name}`}
          className="rounded-full p-0.5 transition-colors hover:bg-white/15 disabled:opacity-50"
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}
