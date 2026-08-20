// lib/services/reportService.ts
//
// Agrega las ventas de UN negocio para "el día de hoy" según SU propia
// zona horaria (derivada de businesses.country_iso2) — nunca la hora del
// servidor. Cada negocio tiene su propio corte de medianoche.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { Order, OrderItem } from "@/lib/types/order";
import {
  getTimezoneForCountry,
  startOfDayInTimezone,
  endOfDayInTimezone,
  formatLongDateInTimezone,
  formatDateOnlyInTimezone,
} from "@/lib/utils/timezone";

export interface DailySalesSummary {
  business: {
    id: string;
    name: string;
    logoUrl: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    taxId: string | null;
    address: string | null;
    instagram: string | null;
    facebook: string | null;
    tiktok: string | null;
    twitter: string | null;
    countryIso2: string | null;
  };
  dateLabel: string;
  // "2026-08-16" — mismo día que dateLabel, en formato máquina. Para
  // guardar en columnas `date` (ej. report_downloads.report_date) sin
  // tener que reparsear el label en español.
  dateIso: string;
  timezone: string;
  orderCount: number;
  totalRevenue: number;
  items: { name: string; quantity: number; subtotal: number }[];
}

export async function getDailySalesSummary(
  businessId: string,
  referenceDate: Date = new Date(),
  // Por defecto usa el cliente de sesión (respeta RLS del admin
  // autenticado, como hoy en /api/reportes/dia). El cron de envío
  // automático (app/api/cron/daily-reports) corre sin sesión de ningún
  // usuario — ahí SÍ hace falta pasar explícitamente un
  // createAdminClient(), o esta función devolvería null para todos los
  // negocios (RLS bloqueando todo porque auth.uid() es null).
  client?: SupabaseClient<Database>
): Promise<DailySalesSummary | null> {
  const supabase = client ?? (await createClient());

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select(
      "id, name, country_iso2, logo_url, contact_email, contact_phone, tax_id, address, instagram, facebook, tiktok, twitter"
    )
    .eq("id", businessId)
    .maybeSingle();

  if (businessError || !business) {
    console.error("[getDailySalesSummary] negocio no encontrado:", businessError);
    return null;
  }

  const timezone = getTimezoneForCountry(business.country_iso2);
  const startUTC = startOfDayInTimezone(timezone, referenceDate);
  const endUTC = endOfDayInTimezone(timezone, referenceDate);

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .gte("created_at", startUTC.toISOString())
    .lt("created_at", endUTC.toISOString())
    .neq("status", "rejected");

  if (ordersError) {
    console.error("[getDailySalesSummary] error leyendo pedidos:", ordersError);
  }

  const safeOrders = (orders as Order[] | null) ?? [];

  const itemsByName = new Map<string, { quantity: number; subtotal: number }>();
  let totalRevenue = 0;

  for (const order of safeOrders) {
    totalRevenue += Number(order.total) || 0;
    for (const item of (order.items as OrderItem[]) ?? []) {
      const existing = itemsByName.get(item.name) ?? { quantity: 0, subtotal: 0 };
      existing.quantity += item.quantity;
      existing.subtotal += item.quantity * item.unit_price;
      itemsByName.set(item.name, existing);
    }
  }

  return {
    business: {
      id: business.id,
      name: business.name,
      logoUrl: business.logo_url,
      contactEmail: business.contact_email,
      contactPhone: business.contact_phone,
      taxId: business.tax_id,
      address: business.address,
      instagram: business.instagram,
      facebook: business.facebook,
      tiktok: business.tiktok,
      twitter: business.twitter,
      countryIso2: business.country_iso2,
    },
    dateLabel: formatLongDateInTimezone(startUTC, timezone),
    dateIso: formatDateOnlyInTimezone(startUTC, timezone),
    timezone,
    orderCount: safeOrders.length,
    totalRevenue,
    items: Array.from(itemsByName.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.subtotal - a.subtotal),
  };
}

export interface RangeSalesSummary {
  days: number;
  orderCount: number;
  totalRevenue: number;
  // Ranking de más vendidos del período completo, no solo de un día —
  // mismo cálculo que getDailySalesSummary().items pero sumado sobre
  // varios días en vez de uno.
  items: { name: string; quantity: number; subtotal: number }[];
}

// Comparativa por período (Reportes → dentro del propio módulo, no solo
// en Inicio): suma ventas/pedidos/ranking de los últimos `days` días,
// contados en la zona horaria local del negocio — mismo criterio de
// "medianoche local" que el resto de reportService.ts.
export async function getSalesSummaryForRange(businessId: string, days: number): Promise<RangeSalesSummary | null> {
  const supabase = await createClient();

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("country_iso2")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError || !business) {
    console.error("[getSalesSummaryForRange] negocio no encontrado:", businessError);
    return null;
  }

  const timezone = getTimezoneForCountry(business.country_iso2);
  const now = new Date();
  const todayStart = startOfDayInTimezone(timezone, now);
  const rangeStart = new Date(todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const rangeEnd = endOfDayInTimezone(timezone, now);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .gte("created_at", rangeStart.toISOString())
    .lt("created_at", rangeEnd.toISOString())
    .neq("status", "rejected");

  if (error) {
    console.error("[getSalesSummaryForRange] error leyendo pedidos:", error);
  }

  const safeOrders = (orders as Order[] | null) ?? [];
  const itemsByName = new Map<string, { quantity: number; subtotal: number }>();
  let totalRevenue = 0;

  for (const order of safeOrders) {
    totalRevenue += Number(order.total) || 0;
    for (const item of (order.items as OrderItem[]) ?? []) {
      const existing = itemsByName.get(item.name) ?? { quantity: 0, subtotal: 0 };
      existing.quantity += item.quantity;
      existing.subtotal += item.quantity * item.unit_price;
      itemsByName.set(item.name, existing);
    }
  }

  return {
    days,
    orderCount: safeOrders.length,
    totalRevenue,
    items: Array.from(itemsByName.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.subtotal - a.subtotal),
  };
}

export interface DailyTrendPoint {
  label: string;
  date: string;
  revenue: number;
  orderCount: number;
}

// Ventas por día de los últimos `days` días (hoy incluido, al final del
// arreglo) — para la gráfica de Inicio. Un solo query trae todo el rango
// y se agrupa en memoria por día local del negocio, en vez de un query
// por día.
export async function getSalesTrend(businessId: string, days: number = 7): Promise<DailyTrendPoint[]> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("country_iso2")
    .eq("id", businessId)
    .maybeSingle();

  const timezone = getTimezoneForCountry(business?.country_iso2);
  const now = new Date();
  const todayStart = startOfDayInTimezone(timezone, now);
  const rangeStart = new Date(todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const rangeEnd = endOfDayInTimezone(timezone, now);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("total, created_at, status")
    .eq("business_id", businessId)
    .gte("created_at", rangeStart.toISOString())
    .lt("created_at", rangeEnd.toISOString())
    .neq("status", "rejected");

  if (error) {
    console.error("[getSalesTrend] error leyendo pedidos:", error);
  }

  const safeOrders = orders ?? [];
  const points: DailyTrendPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayReference = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = startOfDayInTimezone(timezone, dayReference);
    const dayEnd = endOfDayInTimezone(timezone, dayReference);

    const dayOrders = safeOrders.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });

    const label = new Intl.DateTimeFormat("es", { weekday: "short", timeZone: timezone })
      .format(dayStart)
      .replace(/\.$/, "");

    points.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      date: dayStart.toISOString(),
      revenue: dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
      orderCount: dayOrders.length,
    });
  }

  return points;
}
