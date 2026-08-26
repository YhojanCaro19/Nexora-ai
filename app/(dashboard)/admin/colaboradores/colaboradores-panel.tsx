"use client";

import { useState } from "react";
import { UserPlus, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { CollaboratorForm } from "./collaborator-form";
import { CollaboratorsTable } from "./collaborators-table";
import type { CollaboratorListItem } from "@/lib/services/collaboratorService";

type View = "chooser" | "new" | "list";

export function ColaboradoresPanel({ collaborators }: { collaborators: CollaboratorListItem[] }) {
  const [view, setView] = useState<View>("chooser");

  if (view === "chooser") {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 py-4 sm:py-10">
        <ChooserButton icon={UserPlus} label="Agregar colaborador" onClick={() => setView("new")} />
        <ChooserButton
          icon={Users}
          label="Ver colaboradores"
          count={collaborators.length}
          onClick={() => setView("list")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setView("chooser")}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
        style={{ color: 'var(--nexora-ink-dim)' }}
      >
        <ChevronLeft size={16} />
        Volver
      </button>

      {view === "new" ? (
        <CollaboratorForm onDone={() => setView("list")} />
      ) : (
        <CollaboratorsTable collaborators={collaborators} />
      )}
    </div>
  );
}

function ChooserButton({
  icon: Icon,
  label,
  count,
  onClick,
}: {
  icon: typeof UserPlus;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      // Mismo tratamiento que ChooserButton en Pedidos/Catálogo — móvil:
      // fila compacta de ancho completo. Desktop (sm:+): el mismo
      // cuadrado grande de siempre, sin cambios.
      className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 hover:bg-white/[0.04] sm:w-48 sm:h-48 sm:flex-col sm:items-center sm:justify-center sm:gap-3 sm:rounded-3xl sm:p-0 sm:text-center sm:hover:scale-105 sm:hover:bg-transparent"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nexora-muted)] sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent">
        <Icon size={20} strokeWidth={1.5} className="sm:hidden" style={{ color: 'var(--nexora-nova)' }} />
        <Icon size={32} strokeWidth={1.5} className="hidden sm:block" style={{ color: 'var(--nexora-nova)' }} />
      </span>

      <span className="min-w-0 flex-1 sm:flex-none">
        <span className="block text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
          {label}
        </span>
        {count !== undefined && (
          <span className="block text-xs mt-0.5 sm:hidden" style={{ color: 'var(--nexora-ink-dim)' }}>
            {count} colaborador{count === 1 ? "" : "es"}
          </span>
        )}
      </span>

      {count !== undefined && (
        <span className="hidden text-2xl font-light sm:block" style={{ color: 'var(--nexora-ink-dim)' }}>
          {count}
        </span>
      )}

      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 sm:hidden" style={{ color: 'var(--nexora-ink-dim)' }} />
    </button>
  );
}
