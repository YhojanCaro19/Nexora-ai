"use client";

import { FileDown } from "lucide-react";
import { formatDateOnly, formatShortDateTime } from "@/lib/utils/date";
import type { ReportDownloadRecord } from "@/lib/services/reportHistoryService";

// Solo lectura — el registro se crea del lado del servidor, en
// /api/reportes/dia, cada vez que la descarga del PDF se completa.
export function ReportHistoryList({ history }: { history: ReportDownloadRecord[] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
        Todavía no has descargado ningún reporte — cuando lo hagas, va a quedar registrado acá.
      </p>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-2">
      {history.map((record) => (
        <div
          key={record.id}
          className="flex items-center gap-3 rounded-xl border p-3"
          style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
        >
          <FileDown size={18} strokeWidth={1.5} style={{ color: 'var(--nexora-nova)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--nexora-ink)' }}>
              Reporte del {formatDateOnly(record.reportDate)}
            </p>
            <p className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
              Descargado el {formatShortDateTime(record.downloadedAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
