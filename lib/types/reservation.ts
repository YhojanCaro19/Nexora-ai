// lib/types/reservation.ts
//
// Tipos y constantes de reservas importables desde componentes cliente.
// reservationService.ts / bookingConfigService.ts (que tocan la base de
// datos con next/headers) importan de acá, no al revés.

export type BookingMode = "off" | "tables" | "appointments" | "both";
export type ReservationKind = "table" | "appointment";
export type ResourceKind = "staff" | "table";

export const RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "no_show",
  "cancelled",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

// Estados que ocupan el recurso (cuentan para el exclusion constraint y
// para el cálculo de disponibilidad).
export const ACTIVE_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  "pending",
  "confirmed",
  "seated",
];

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  seated: "En curso",
  completed: "Completada",
  no_show: "No llegó",
  cancelled: "Cancelada",
};

// De qué estado se puede pasar a cuál — nunca retrocede a un estado
// terminal ya cerrado. reservationService lo hace cumplir en el servidor.
export const ALLOWED_RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["seated", "completed", "no_show", "cancelled"],
  seated: ["completed", "no_show"],
  completed: [],
  no_show: [],
  cancelled: [],
};

export function isValidReservationStatus(value: string): value is ReservationStatus {
  return (RESERVATION_STATUSES as readonly string[]).includes(value);
}

export interface BookingSettings {
  mode: BookingMode;
  slotMinutes: number;
  defaultDurationMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  mode: "off",
  slotMinutes: 30,
  defaultDurationMinutes: 90,
  minNoticeMinutes: 60,
  maxAdvanceDays: 60,
};

export interface BusinessHour {
  id: string;
  weekday: number; // 0 = domingo
  opensAt: string; // "HH:MM"
  closesAt: string; // "HH:MM"
}

export interface BookingResource {
  id: string;
  kind: ResourceKind;
  name: string;
  capacity: number | null;
  active: boolean;
  sortOrder: number;
}

export interface BookingService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
  active: boolean;
  sortOrder: number;
}

export interface BusinessClosure {
  id: string;
  resourceId: string | null;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export interface Reservation {
  id: string;
  businessId: string;
  kind: ReservationKind;
  resourceId: string;
  resourceName?: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  startsAt: string;
  endsAt: string;
  partySize: number | null;
  serviceId: string | null;
  serviceName: string | null;
  status: ReservationStatus;
  source: "manual" | "agent";
  notes: string | null;
  createdBy: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Una franja libre que se le puede ofrecer al cliente.
export interface AvailabilitySlot {
  startsAt: string;
  endsAt: string;
  // Recursos libres en esa franja (mesas que caben, o el empleado).
  resourceIds: string[];
}

const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const weekdayLabel = (weekday: number) => WEEKDAY_LABELS[weekday] ?? String(weekday);

export const MODE_LABELS: Record<BookingMode, string> = {
  off: "Desactivado",
  tables: "Reserva de mesas",
  appointments: "Turnos / citas",
  both: "Mesas y turnos",
};
