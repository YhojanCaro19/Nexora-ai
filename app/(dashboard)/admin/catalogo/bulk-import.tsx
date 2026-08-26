"use client";

import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { parseCsv } from "@/lib/utils/csv";
import { bulkImportProductsAction, type BulkImportRowResult } from "./actions";

// Mismas columnas que products-table.tsx exporta (handleExportCsv) — un
// CSV exportado se puede editar y volver a importar tal cual. El orden no
// importa, se busca por encabezado; "nombre" y "precio" son las únicas
// obligatorias.
interface ParsedRow {
  name: string;
  description?: string;
  price: number;
  stock?: number | null;
  category?: string;
  lowStockThreshold?: number | null;
}

function parseNumberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function BulkImport({ onDone }: { onDone?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<BulkImportRowResult[] | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setResults(null);
    setParseError(null);
    setRows(null);
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const table = parseCsv(text);
      if (table.length < 2) {
        setParseError("El archivo no tiene filas de datos (solo encabezado, o está vacío).");
        return;
      }

      const header = table[0].map((h) => h.trim().toLowerCase());
      const nameIdx = header.indexOf("nombre");
      const priceIdx = header.indexOf("precio");
      if (nameIdx === -1 || priceIdx === -1) {
        setParseError(`El archivo debe tener columnas "nombre" y "precio" (encontradas: ${header.join(", ") || "ninguna"}).`);
        return;
      }
      const descIdx = header.indexOf("descripcion");
      const stockIdx = header.indexOf("stock");
      const categoryIdx = header.indexOf("categoria");
      const thresholdIdx = header.indexOf("umbral_stock_bajo");

      const parsedRows: ParsedRow[] = [];
      const skipped: number[] = [];
      table.slice(1).forEach((cells, i) => {
        const name = cells[nameIdx]?.trim();
        const price = parseNumberOrNull(cells[priceIdx] ?? "");
        if (!name || price === null) {
          skipped.push(i + 2);
          return;
        }
        parsedRows.push({
          name,
          description: descIdx >= 0 ? cells[descIdx]?.trim() : undefined,
          price,
          stock: stockIdx >= 0 ? parseNumberOrNull(cells[stockIdx] ?? "") : undefined,
          category: categoryIdx >= 0 ? cells[categoryIdx]?.trim() : undefined,
          lowStockThreshold: thresholdIdx >= 0 ? parseNumberOrNull(cells[thresholdIdx] ?? "") : undefined,
        });
      });

      if (parsedRows.length === 0) {
        setParseError("Ninguna fila tiene nombre y precio válidos.");
        return;
      }
      setRows(parsedRows);
      if (skipped.length > 0) {
        setParseError(`Se ignoraron ${skipped.length} fila(s) sin nombre o precio válido (fila ${skipped.join(", ")}).`);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!rows) return;
    setImporting(true);
    const outcome = await bulkImportProductsAction(rows);
    setImporting(false);
    if (outcome.error) {
      setParseError(outcome.error);
      return;
    }
    setResults(outcome.results);
    setRows(null);
  }

  const successCount = results?.filter((r) => !r.error).length ?? 0;
  const failedRows = results?.filter((r) => r.error) ?? [];

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Importar catálogo</CardTitle>
        <CardDescription>
          Sube un CSV con el mismo formato que exporta &quot;Exportar CSV&quot; en Ver catálogo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!results && (
          <>
            {/* Antes: los nombres de columna vivían mezclados en la prosa del
                CardDescription (6 <code> inline separados por comas) — en una
                pantalla angosta esa oración se cortaba en cualquier parte,
                sin ninguna estructura que ayudara a leerla. Separado en chips
                que se envuelven en fila, es igual de escaneable en móvil que
                en desktop. */}
            <div className="flex flex-wrap justify-center gap-1.5 max-w-sm mx-auto">
              {["nombre", "descripcion", "precio", "stock", "categoria", "umbral_stock_bajo"].map((col) => (
                <code
                  key={col}
                  className="rounded-md px-2 py-1 text-[11px]"
                  style={{ background: 'var(--nexora-muted)', color: 'var(--nexora-ink-dim)' }}
                >
                  {col}
                </code>
              ))}
            </div>
            <p className="text-xs text-center max-w-sm mx-auto" style={{ color: 'var(--nexora-ink-dim)' }}>
              Solo <span style={{ color: 'var(--nexora-ink)' }}>nombre</span> y{" "}
              <span style={{ color: 'var(--nexora-ink)' }}>precio</span> son obligatorias. Las fotos no se
              importan por CSV, se agregan después editando cada producto.
            </p>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 w-full max-w-sm h-32 rounded-2xl border border-dashed transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--nexora-nova)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
              >
                <UploadCloud size={22} strokeWidth={1.5} style={{ color: 'var(--nexora-ink-dim)' }} />
                <span className="text-xs" style={{ color: 'var(--nexora-ink-dim)' }}>
                  {fileName ?? "Selecciona un archivo CSV"}
                </span>
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
            </div>

            {parseError && (
              <p className="text-sm text-center" style={{ color: 'var(--nexora-alert)' }}>{parseError}</p>
            )}

            {rows && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm" style={{ color: 'var(--nexora-ink)' }}>
                  {rows.length} producto{rows.length === 1 ? "" : "s"} listo{rows.length === 1 ? "" : "s"} para importar.
                </p>
                <Button type="button" disabled={importing} onClick={handleImport}>
                  {importing ? "Importando..." : `Importar ${rows.length} producto${rows.length === 1 ? "" : "s"}`}
                </Button>
              </div>
            )}
          </>
        )}

        {results && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 size={18} strokeWidth={1.75} style={{ color: 'var(--nexora-signal)' }} />
              <p className="text-sm" style={{ color: 'var(--nexora-ink)' }}>
                {successCount} de {results.length} productos importados correctamente.
              </p>
            </div>
            {failedRows.length > 0 && (
              <div className="max-w-md mx-auto space-y-1.5 rounded-xl border p-3" style={{ borderColor: 'rgba(248,113,113,0.25)' }}>
                {failedRows.map((r) => (
                  <div key={r.row} className="flex items-start gap-2 text-xs">
                    <XCircle size={14} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: 'var(--nexora-alert)' }} />
                    <span style={{ color: 'var(--nexora-ink-dim)' }}>
                      Fila {r.row} ({r.name}): {r.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-center">
              <Button type="button" variant="outline" onClick={onDone}>
                Volver al catálogo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
