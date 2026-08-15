"use client";

import { useState } from "react";
import { Palette, History, Download, ChevronLeft } from "lucide-react";
import { CustomizePdfForm } from "./customize-pdf-form";
import type { BusinessBranding } from "@/lib/services/businessBrandingService";

type View = "chooser" | "customize" | "history";

export function ReportesPanel({ branding }: { branding: BusinessBranding }) {
  const [view, setView] = useState<View>("chooser");

  if (view === "chooser") {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-10">
        <ChooserButton icon={Palette} label="Personalizar PDF" onClick={() => setView("customize")} />
        <ChooserLink icon={Download} label="Descargar reporte de hoy" href="/api/reportes/dia" />
        <ChooserButton icon={History} label="Historial de reportes" onClick={() => setView("history")} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setView("chooser")}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
        style={{ color: 'var(--nexora-ink-dim)' }}
      >
        <ChevronLeft size={16} />
        Volver
      </button>

      {view === "customize" ? (
        <CustomizePdfForm branding={branding} />
      ) : (
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          El historial de reportes enviados va a vivir acá — todavía no está construido.
        </p>
      )}
    </div>
  );
}

function ChooserButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Palette;
  label: string;
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
    </button>
  );
}

// Descarga directa (Content-Disposition: attachment en la ruta) — un link
// normal es suficiente, no hace falta JS para disparar la descarga.
function ChooserLink({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Palette;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center gap-3 w-48 h-48 rounded-3xl border transition-all duration-300 hover:scale-105"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      <Icon size={32} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
      <span className="text-sm font-medium text-center px-2" style={{ color: 'var(--nexora-ink)' }}>
        {label}
      </span>
    </a>
  );
}
