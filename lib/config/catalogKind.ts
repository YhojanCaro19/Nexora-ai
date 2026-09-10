// lib/config/catalogKind.ts
//
// ¿El negocio vende productos, ofrece servicios, o ambos? (`businesses.catalog_kind`)
// Decide si el stock es obligatorio en el Catálogo: un servicio no tiene
// inventario, un producto sí. Se pregunta en el onboarding (paso 3) y se
// puede cambiar después en Mi Agente → "Sobre el negocio".
import { DEFAULT_INDUSTRY_TOOLS } from "@/lib/config/agentTools";

export type CatalogKind = "productos" | "servicios" | "ambos";

export const CATALOG_KINDS: readonly CatalogKind[] = ["productos", "servicios", "ambos"];

export function sanitizeCatalogKind(value: unknown): CatalogKind {
  return CATALOG_KINDS.includes(value as CatalogKind) ? (value as CatalogKind) : "ambos";
}

export const CATALOG_KIND_OPTIONS: { value: CatalogKind; label: string; hint: string }[] = [
  {
    value: "productos",
    label: "Vende productos",
    hint: "Cosas con inventario (una tienda, una ferretería). El stock será obligatorio.",
  },
  {
    value: "servicios",
    label: "Ofrece servicios",
    hint: "Trabajo, no cosas (una barbería, un taller, una agencia). Sin stock.",
  },
  {
    value: "ambos",
    label: "Los dos",
    hint: "Vende productos Y ofrece servicios (ej. un spa que vende cremas y da masajes).",
  },
];

// Sugerencia por industria para pre-seleccionar la respuesta en el
// onboarding — el dueño la confirma. Se deriva de las herramientas por
// defecto de la industria: `catalogo_productos`/`tomar_pedido` = vende
// productos; `agendar_cita`/`reservar_mesa` = ofrece servicios.
export function suggestedCatalogKind(industryType: string): CatalogKind {
  const tools = DEFAULT_INDUSTRY_TOOLS[industryType] ?? [];
  const hasProducts = tools.includes("catalogo_productos") || tools.includes("tomar_pedido");
  const hasServices = tools.includes("agendar_cita") || tools.includes("reservar_mesa");
  if (hasProducts && hasServices) return "ambos";
  if (hasServices) return "servicios";
  if (hasProducts) return "productos";
  return "ambos";
}
