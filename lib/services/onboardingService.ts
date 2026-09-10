// lib/services/onboardingService.ts
//
// El onboarding del PRIMER LOGIN del dueño (ruta /bienvenida). El negocio
// ya existe con datos provisionales (lo provisionó el webhook de Wompi o el
// alta manual del superadmin — ver registrationService.ts); acá se
// completan los datos reales y se genera el agente desde la plantilla de la
// industria.
//
// Server-only: usa el cliente service role. La server action
// (app/bienvenida/actions.ts) valida al usuario por SESIÓN y deriva el
// businessId/userId de ahí antes de llamar acá — nunca del cliente.
import { createAdminClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { createAgentConfigFromTemplate } from "@/lib/services/registrationService";
import type { BookingMode } from "@/lib/types/reservation";
import { sanitizeCatalogKind, type CatalogKind } from "@/lib/config/catalogKind";

export interface CompleteOnboardingInput {
  businessId: string;
  userId: string;
  fullName: string;
  businessName: string;
  phone: string | null;
  /** ISO2 resuelto del teléfono — para la zona horaria de Reportes. */
  countryIso2: string | null;
  industryType: string;
  /** "¿Qué vende u ofrece tu negocio?" → agent_configs.business_description. */
  businessDescription: string | null;
  /** "¿Qué vende tu negocio?" → businesses.catalog_kind. */
  catalogKind: CatalogKind;
  /** "¿Atiende con reservas o citas?" → booking_settings.mode. */
  bookingMode: BookingMode;
}

/**
 * Aplica los datos del onboarding: nombre/industria del negocio,
 * nombre/teléfono del dueño en business_members, agent_configs desde la
 * plantilla de la industria y, al final, marca onboarding_completed.
 *
 * Idempotente: todas las escrituras son updates/upsert por id, así que un
 * doble submit no rompe nada.
 */
export async function completeOnboarding(
  input: CompleteOnboardingInput
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { error: bizError } = await admin
    .from("businesses")
    .update({
      name: input.businessName,
      industry_type: input.industryType,
      catalog_kind: sanitizeCatalogKind(input.catalogKind),
      ...(input.countryIso2 ? { country_iso2: input.countryIso2 } : {}),
    })
    .eq("id", input.businessId);
  if (bizError) {
    console.error("[completeOnboarding] error al actualizar businesses:", bizError.message);
    return { error: translateError(bizError) };
  }

  const { error: memberError } = await admin
    .from("business_members")
    .update({ full_name: input.fullName, phone: input.phone })
    .eq("business_id", input.businessId)
    .eq("user_id", input.userId);
  if (memberError) {
    console.error("[completeOnboarding] error al actualizar business_members:", memberError.message);
    return { error: translateError(memberError) };
  }

  // No es fatal: la cuenta y el negocio ya son válidos; el agente se puede
  // configurar después desde "Mi Agente" — mismo criterio que el flujo de
  // provisión anterior. `businessDescription` viene del paso 3 del
  // onboarding y se guarda junto con la plantilla de la industria.
  const agent = await createAgentConfigFromTemplate(
    input.businessId,
    input.industryType,
    input.businessDescription,
  );
  if (agent.error) {
    console.error("[completeOnboarding] no se pudo crear agent_configs:", agent.error);
  }

  // Módulo de Reservas: solo se crea la fila si el negocio dijo que agenda
  // algo. Sin fila, getBookingSettings ya devuelve mode:"off" y el ítem
  // "Reservas" no aparece en el menú. El resto de la agenda (horarios,
  // empleados, mesas) el dueño la completa en el módulo.
  if (input.bookingMode !== "off") {
    const { error: bookingError } = await admin
      .from("booking_settings")
      .upsert({ business_id: input.businessId, mode: input.bookingMode }, { onConflict: "business_id" });
    if (bookingError) {
      console.error("[completeOnboarding] no se pudo crear booking_settings:", bookingError.message);
    }
  }

  const { error: doneError } = await admin
    .from("businesses")
    .update({ onboarding_completed: true })
    .eq("id", input.businessId);
  if (doneError) {
    console.error("[completeOnboarding] error al marcar onboarding_completed:", doneError.message);
    return { error: translateError(doneError) };
  }

  return { error: null };
}
