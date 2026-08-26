"use client";

import { useEffect, useState } from "react";
import { Download, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { getSalesRangeSummaryAction } from "./actions";
import type { RangeSalesSummary } from "@/lib/services/reportService";
import { formatCurrency } from "@/lib/utils/currency";
import { toCsv, downloadCsv } from "@/lib/utils/csv";

const RANGES = [
  { days: 7, label: "Últimos 7 días" },
  { days: 30, label: "Este mes" },
  { days: 90, label: "Últimos 3 meses" },
];

// Vive dentro del propio módulo Reportes (no solo en Inicio, donde ya
// existía la tendencia de 7 días fija) — acá el rango es elegible y
// además trae el ranking de más vendidos del período completo, no solo
// del día de hoy.
export function SalesComparison({ countryIso2 }: { countryIso2: string | null }) {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<RangeSalesSummary | null | undefined>(undefined);

  useEffect(() => {
    getSalesRangeSummaryAction(days).then(setSummary);
  }, [days]);

  // Exporta el ranking COMPLETO del período, no solo el top 10 que se ve
  // en pantalla — la vista se recorta por espacio, el CSV no tiene por
  // qué recortarse igual.
  function handleExportCsv() {
    if (!summary) return;
    const rows = summary.items.map((item, i) => ({
      puesto: i + 1,
      producto: item.name,
      cantidad: item.quantity,
      subtotal: item.subtotal,
    }));
    const csv = toCsv(rows, [
      { key: "puesto", label: "Puesto" },
      { key: "producto", label: "Producto" },
      { key: "cantidad", label: "Cantidad vendida" },
      { key: "subtotal", label: "Subtotal" },
    ]);
    downloadCsv(`reporte-mas-vendidos-${summary.days}-dias`, csv);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Mismo patrón unificado que el filtro de fecha en Pedidos
          (orders-table.tsx) — un solo Select en vez de una fila de
          pastillas. Acá siempre hay un rango activo (no hay "todos" como
          estado neutro), así que la etiqueta refleja el rango elegido
          directo, sin caso especial de placeholder. */}
      <div className="flex justify-center">
        <Select value={String(days)} onValueChange={(v) => v && setDays(Number(v))}>
          <SelectTrigger className="w-48 justify-center gap-1.5">
            <ListFilter size={14} strokeWidth={1.75} />
            {RANGES.find((r) => r.days === days)?.label}
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.days} value={String(r.days)}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summary === undefined ? (
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>Cargando...</p>
      ) : summary === null ? (
        <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
          No se pudo cargar la información de este período.
        </p>
      ) : (
        <>
          {/* grid-cols-1 sm:grid-cols-2 — mismo criterio que las tarjetas de
              KPI de Inicio (admin/page.tsx: grid-cols-1 sm:grid-cols-3): en
              un teléfono angosto, dos cifras grandes lado a lado con poco
              padding quedaban apretadas (moneda con separador de miles
              fácilmente se corta en text-2xl). Apiladas en móvil, lado a
              lado desde sm: hacia arriba. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border p-4 sm:p-5 text-center" style={{ borderColor: 'var(--nexora-line)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
                Ventas del período
              </p>
              <p className="mt-1 text-2xl font-semibold font-nexora" style={{ color: 'var(--nexora-ink)' }}>
                {formatCurrency(summary.totalRevenue, countryIso2)}
              </p>
            </div>
            <div className="rounded-2xl border p-4 sm:p-5 text-center" style={{ borderColor: 'var(--nexora-line)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--nexora-ink-dim)' }}>
                Pedidos del período
              </p>
              <p className="mt-1 text-2xl font-semibold font-nexora" style={{ color: 'var(--nexora-ink)' }}>
                {summary.orderCount}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-center" style={{ color: 'var(--nexora-ink-dim)' }}>
              {summary.items.length > 0 ? "Más vendidos del período" : "Sin ventas registradas en este período."}
            </p>
            {summary.items.length > 0 && (
              <div className="flex justify-center">
                <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
                  <Download size={14} strokeWidth={1.75} />
                  Exportar CSV
                </Button>
              </div>
            )}
            {summary.items.length > 0 && (
              <div className="rounded-2xl border divide-y" style={{ borderColor: 'var(--nexora-line)' }}>
                {summary.items.slice(0, 10).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm truncate" style={{ color: 'var(--nexora-ink)' }}>
                      {i + 1}. {item.name}
                    </span>
                    <span className="shrink-0 text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                      {item.quantity} und · {formatCurrency(item.subtotal, countryIso2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
