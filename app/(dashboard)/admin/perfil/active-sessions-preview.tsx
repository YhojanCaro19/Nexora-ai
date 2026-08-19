import { Clock } from "lucide-react";
import { CardDescription } from "@/components/ui/card";

// Fila "próximamente" honesta: todavía no hay forma de leer sesiones
// activas reales desde Supabase (se está evaluando en paralelo si es
// viable). No se inventan sesiones falsas ni se simula una lista — solo se
// deja el lugar reservado en el diseño para cuando exista el dato real.
export function ActiveSessionsPreview() {
  return (
    <div className="space-y-3 flex flex-col items-center text-center">
      <CardDescription>
        Ver el detalle de cada sesión activa (dispositivo, ubicación aproximada, última actividad) y poder cerrarlas
        una por una.
      </CardDescription>
      <div
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
        style={{ borderColor: 'var(--nexora-line)', color: 'var(--nexora-ink-dim)' }}
      >
        <Clock size={13} strokeWidth={1.75} />
        Próximamente
      </div>
    </div>
  );
}
