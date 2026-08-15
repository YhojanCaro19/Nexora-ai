// lib/services/reportService.ts
//
// Agrega las ventas de UN negocio para "el día de hoy" según SU propia
// zona horaria (derivada de businesses.country_iso2) — nunca la hora del
// servidor. Cada negocio tiene su propio corte de medianoche.
import { createClient } from "@/lib/supabase/server";
import type { Order, OrderItem } from "@/lib/types/order";
import {
  getTimezoneForCountry,
  startOfDayInTimezone,
  endOfDayInTimezone,
  formatLongDateInTimezone,
} from "@/lib/utils/timezone";

export interface DailySalesSummary {
  business: {
    id: string;
    name: string;
    logoUrl: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  dateLabel: string;
  timezone: string;
  orderCount: number;
  totalRevenue: number;
  items: { name: string; quantity: number; subtotal: number }[];
}

export async function getDailySalesSummary(
  businessId: string,
  referenceDate: Date = new Date()
): Promise<DailySalesSummary | null> {
  const supabase = await createClient();

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, country_iso2, logo_url, contact_email, contact_phone")
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
    .neq("status", "cancelled");

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
    },
    dateLabel: formatLongDateInTimezone(startUTC, timezone),
    timezone,
    orderCount: safeOrders.length,
    totalRevenue,
    items: Array.from(itemsByName.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.subtotal - a.subtotal),
  };
}
