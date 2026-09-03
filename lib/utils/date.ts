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

// Solo la hora, sin fecha, en formato de 12 h con am/pm — la gente en
// Colombia no lee formato de 24 h. Usado en burbujas de chat (Clientes >
// conversaciones), la agenda de Reservas y las citas del cliente.
// am/pm calculado a mano (sin Intl) por lo mismo que el resto del archivo:
// resultado idéntico en servidor y navegador.
export function formatTimeOnly(iso: string): string {
  return toTwelveHour(new Date(iso).getHours(), new Date(iso).getMinutes());
}

// "14:30" (24 h) → "2:30 pm". Para strings de hora ya calculados (ej. las
// franjas de la agenda: "09:00", "09:30"…).
export function hhmmTo12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return toTwelveHour(h, m);
}

function toTwelveHour(hours24: number, minutes: number): string {
  const period = hours24 < 12 ? "am" : "pm";
  const h12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mm = minutes.toString().padStart(2, "0");
  return `${h12}:${mm} ${period}`;
}

// Para columnas `date` sin hora (ej. "2026-08-16", como report_date). A
// diferencia de formatShortDate/formatShortDateTime, NO pasa por `new
// Date(iso)` — ese constructor interpreta un string sin hora como
// medianoche UTC, y en husos horarios negativos (toda Latinoamérica)
// eso se lee un día antes al convertir de vuelta a hora local. Parsear
// los componentes directo del string evita el corrimiento.
export function formatDateOnly(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS_ES[month - 1]}. ${year}`;
}
