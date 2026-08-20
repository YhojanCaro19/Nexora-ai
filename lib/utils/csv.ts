// lib/utils/csv.ts
//
// Exportar a CSV — genérico, sin dependencia nueva (no hace falta una
// librería para escribir un CSV bien formado a mano). Solo para cliente:
// downloadCsv() usa Blob/URL/document, no existe en el server.
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[]
): string {
  // Escapa comillas dobles y envuelve en comillas cualquier valor que
  // tenga coma, comilla o salto de línea — regla estándar de CSV (RFC
  // 4180), así Excel/Sheets lo abre bien sin desalinear columnas.
  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escape(row[c.key])).join(","));
  // BOM al inicio — sin esto, Excel en Windows a veces muestra tildes/ñ
  // rotas al abrir un CSV en UTF-8 directamente.
  return "﻿" + [header, ...body].join("\n");
}

// Parser RFC 4180 a mano (comillas, comas y saltos de línea dentro de un
// campo entre comillas, comillas escapadas como "") — no se justifica una
// dependencia nueva solo para leer un CSV con un formato controlado.
// Devuelve filas de strings crudos, sin tipar todavía (eso lo hace quien
// llama, según qué columnas espera).
export function parseCsv(text: string): string[][] {
  // Quita el BOM si el archivo lo trae (lo agrega downloadCsv, y también
  // lo agregan Excel/Sheets al exportar).
  const clean = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      // Salta filas totalmente vacías (líneas en blanco al final del
      // archivo, muy común al exportar desde Excel).
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  // Última fila si el archivo no termina en salto de línea.
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
