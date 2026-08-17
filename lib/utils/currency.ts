// lib/utils/currency.ts
//
// Formato de moneda según el país del negocio (derivado de
// businesses.country_iso2, el mismo dato que ya usa Reportes para la zona
// horaria) — un negocio en Colombia ve "$1.234" (COP, punto de miles), uno
// en Estados Unidos ve "$1,234.00" (USD, coma de miles), etc. Sin país
// conocido, cae al formato de Colombia (mismo default que el resto de la
// app).
import { COUNTRIES, DEFAULT_COUNTRY_ISO2 } from "@/lib/data/countries";

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(countryIso2: string | null | undefined): Intl.NumberFormat {
  const country =
    COUNTRIES.find((c) => c.iso2 === countryIso2) ??
    COUNTRIES.find((c) => c.iso2 === DEFAULT_COUNTRY_ISO2)!;

  const cacheKey = `${country.locale}|${country.currency}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(country.locale, {
      style: "currency",
      currency: country.currency,
      maximumFractionDigits: 0,
    });
    formatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

export function formatCurrency(amount: number, countryIso2?: string | null): string {
  return getFormatter(countryIso2).format(amount);
}
