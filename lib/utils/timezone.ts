// lib/utils/timezone.ts
//
// Deriva la zona horaria de un negocio a partir de su `country_iso2`, y
// calcula los límites de "el día de hoy" en esa zona — sin agregar
// ninguna librería nueva, solo con Intl (ya disponible en Node).
import { COUNTRIES, DEFAULT_COUNTRY_ISO2 } from "@/lib/data/countries";

export function getTimezoneForCountry(iso2: string | null | undefined): string {
  const country = COUNTRIES.find((c) => c.iso2 === iso2);
  if (country) return country.timezone;
  // País no reconocido (o negocio sin country_iso2 todavía) — cae al
  // mismo default que usa el resto de la app.
  return COUNTRIES.find((c) => c.iso2 === DEFAULT_COUNTRY_ISO2)!.timezone;
}

// Diferencia (en ms) entre una zona horaria dada y UTC, en el instante
// `date`. Positiva si la zona va adelante de UTC.
function getTimezoneOffsetMs(timezone: string, date: Date): number {
  const inZone = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  const inUTC = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return inZone.getTime() - inUTC.getTime();
}

// Medianoche del día de `reference` EN esa zona horaria, expresada como
// instante UTC real (el mismo instante, visto desde UTC). Cubre el
// desfase por horario de verano de forma aproximada: se calcula con el
// offset vigente en el instante de referencia, no con el que vaya a regir
// exactamente a medianoche si justo ese día cambia el horario — un canto
// de precisión que no vale la pena perseguir para un reporte diario.
export function startOfDayInTimezone(timezone: string, reference: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  const naiveUTC = new Date(`${year}-${month}-${day}T00:00:00Z`);
  const offsetMs = getTimezoneOffsetMs(timezone, naiveUTC);
  return new Date(naiveUTC.getTime() - offsetMs);
}

export function endOfDayInTimezone(timezone: string, reference: Date = new Date()): Date {
  const start = startOfDayInTimezone(timezone, reference);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

// "6 de agosto de 2026" — para el encabezado del PDF.
export function formatLongDateInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: timezone }).format(date);
}
