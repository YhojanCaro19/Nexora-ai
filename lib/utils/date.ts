// lib/utils/date.ts
//
// Intl.DateTimeFormat con mes abreviado ("ago" vs "ago.") da resultados
// distintos entre el servidor (Node) y el navegador según la versión de
// ICU de cada uno — eso rompe la hidratación en componentes cliente que
// formatean fechas en el render. Estas funciones no dependen de Intl para
// el mes, así que el resultado es idéntico siempre, en cualquier entorno.
const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}. ${d.getFullYear()}`;
}

export function formatShortDateTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}. ${d.getFullYear()}, ${hours}:${minutes}`;
}
