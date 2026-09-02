"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Palette, History, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { CustomizePdfForm } from "./customize-pdf-form";
import { ReportHistoryList } from "./report-history-list";
import type { BusinessBranding } from "@/lib/services/businessBrandingService";
import type { ReportDownloadRecord } from "@/lib/services/reportHistoryService";

type View = "chooser" | "customize" | "history";

export function ReportesPanel({
  branding,
  history,
}: {
  branding: BusinessBranding;
  history: ReportDownloadRecord[];
}) {
  const [view, setView] = useState<View>("chooser");

  if (view === "chooser") {
    return (
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 py-4 sm:py-10">
        <ChooserButton icon={Palette} label="Personalizar PDF" onClick={() => setView("customize")} />
        <DownloadReportButton />
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

      {view === "customize" && <CustomizePdfForm branding={branding} />}
      {view === "history" && <ReportHistoryList history={history} />}
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
      // Mismo tratamiento que ChooserButton en Pedidos/Catálogo/
      // Colaboradores — móvil: fila compacta de ancho completo. Desktop
      // (sm:+): el mismo cuadrado grande de siempre, sin cambios.
      className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 hover:bg-white/[0.04] sm:w-48 sm:h-48 sm:flex-col sm:items-center sm:justify-center sm:gap-3 sm:rounded-3xl sm:p-0 sm:text-center sm:hover:scale-105 sm:hover:bg-transparent"
      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nexora-muted)] sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent">
        <Icon size={20} strokeWidth={1.5} className="sm:hidden" style={{ color: 'var(--nexora-nova)' }} />
        <Icon size={32} strokeWidth={1.5} className="hidden sm:block" style={{ color: 'var(--nexora-nova)' }} />
      </span>
      <span className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
        {label}
      </span>
      <ChevronRight size={16} strokeWidth={1.75} className="ml-auto shrink-0 sm:hidden" style={{ color: 'var(--nexora-ink-dim)' }} />
    </button>
  );
}

// Antes era un <a href> plano — simple, pero el historial (Reportes →
// Historial de reportes) se carga en el server component de la página, así
// que un link normal deja el historial desactualizado hasta que el admin
// refresca a mano. Por eso esto pasa por fetch(): así se puede disparar la
// descarga del blob Y avisarle a Next que vuelva a pedir los datos del
// server (router.refresh()) sin recargar el navegador ni perder en qué
// vista está el panel.
function DownloadReportButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/reportes/dia");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No se pudo descargar el reporte");
        return;
      }

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="(.+)"/)?.[1] ?? "reporte.pdf";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        // Mismo tratamiento que ChooserButton, ver comentario ahí arriba.
        className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 hover:bg-white/[0.04] disabled:opacity-60 sm:w-48 sm:h-48 sm:flex-col sm:items-center sm:justify-center sm:gap-3 sm:rounded-3xl sm:p-0 sm:text-center sm:hover:scale-105 sm:hover:bg-transparent sm:disabled:hover:scale-100"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nexora-muted)] sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent">
          <Download size={20} strokeWidth={1.5} className="sm:hidden" style={{ color: 'var(--nexora-nova)' }} />
          <Download size={32} strokeWidth={1.5} className="hidden sm:block" style={{ color: 'var(--nexora-nova)' }} />
        </span>
        <span className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
          {loading ? "Descargando..." : "Descargar reporte de hoy"}
        </span>
        <ChevronRight size={16} strokeWidth={1.75} className="ml-auto shrink-0 sm:hidden" style={{ color: 'var(--nexora-ink-dim)' }} />
      </button>
      {error && (
        <span className="text-xs text-center max-w-48" style={{ color: 'var(--nexora-alert)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
