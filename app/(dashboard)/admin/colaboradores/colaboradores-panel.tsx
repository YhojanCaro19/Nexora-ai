"use client";

import { useState } from "react";
import { UserPlus, Users, ChevronLeft } from "lucide-react";
import { CollaboratorForm } from "./collaborator-form";
import { CollaboratorsTable } from "./collaborators-table";
import type { CollaboratorListItem } from "@/lib/services/collaboratorService";

type View = "chooser" | "new" | "list";

export function ColaboradoresPanel({ collaborators }: { collaborators: CollaboratorListItem[] }) {
  const [view, setView] = useState<View>("chooser");

  if (view === "chooser") {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-10">
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
      className="flex flex-col items-center justify-center gap-3 w-48 h-48 rounded-3xl border transition-all duration-300 hover:scale-105"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      <Icon size={32} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
      <span className="text-sm font-medium text-center px-2" style={{ color: 'var(--nexora-ink)' }}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-2xl font-light" style={{ color: 'var(--nexora-ink-dim)' }}>
          {count}
        </span>
      )}
    </button>
  );
}
