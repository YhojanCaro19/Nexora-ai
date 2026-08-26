// Chip de etiqueta reutilizado tanto en el detalle de un cliente
// (customer-detail-view.tsx, con opción de quitar) como en la lista de
// Clientes (clientes-panel.tsx, solo lectura) — un solo lugar para este
// estilo, en vez de duplicarlo en los dos archivos.
import { X } from "lucide-react";
import type { Tag } from "@/lib/services/tagService";

export function TagChip({
  tag,
  onRemove,
  removing = false,
}: {
  tag: Tag;
  onRemove?: () => void;
  removing?: boolean;
}) {
  // Antes: fondo/letra calculados desde tags.color (por-registro, siempre
  // el mismo cian de DEFAULT_TAG_COLOR en la práctica — no hay selector de
  // color en la UI, así que todas las etiquetas terminaban viéndose
  // idénticas y "azules"). Después: blanco sólido con letra oscura, pero
  // eso volvió a ser el feedback real — "no quiero que las etiquetas
  // tengan fondo blanco, quiero el mismo fondo que tiene [el chip]
  // Etiquetas" (el disparador "N etiquetas" del acordeón en
  // clientes-panel.tsx: borde sutil + fondo transparente, sin relleno
  // sólido). Mismo borde/color acá para que un chip individual se vea
  // consistente con ese disparador, sin depender de tags.color.
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'var(--nexora-ink-dim)' }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Quitar etiqueta ${tag.name}`}
          className="rounded-full p-0.5 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}
