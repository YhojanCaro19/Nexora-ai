"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Palette, History, Download, ChevronLeft } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-10">
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

      {view === "customize" ? <CustomizePdfForm branding={branding} /> : <ReportHistoryList history={history} />}
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
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="flex flex-col items-center justify-center gap-3 w-48 h-48 rounded-3xl border transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
        style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
      >
        <Download size={32} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
        <span className="text-sm font-medium text-center px-2" style={{ color: 'var(--nexora-ink)' }}>
          {loading ? "Descargando..." : "Descargar reporte de hoy"}
        </span>
      </button>
      {error && (
        <span className="text-xs text-center max-w-48" style={{ color: 'var(--nexora-alert)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
