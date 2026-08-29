"use server";

import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getClientIp } from "@/lib/utils/request";
import { createCheckoutSession, type BillingPeriod } from "@/lib/services/registrationService";

// Inicia el pago de un plan: crea la fila `checkout_sessions` y redirige al
// Web Checkout de Wompi. El correo lo ingresa la persona en la página de
// Wompi — de ahí lo toma el webhook para el alta de la cuenta.
//
// No hay signup previo: cualquiera (sin sesión) puede comprar. De ahí el
// rate-limit por IP, mismo criterio que el formulario de /contacto.
//
// Firma de `useActionState`: en éxito redirige (lanza NEXT_REDIRECT); en
// error devuelve { error } para mostrarlo bajo el botón del plan.
export type CheckoutState = { error: string } | null;

export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const planKey = String(formData.get("planKey") ?? "");
  const billingPeriod = String(formData.get("billingPeriod") ?? "monthly") as BillingPeriod;

  const ip = await getClientIp();
  const limit = checkRateLimit(`checkout:${ip}`, 8, 10 * 60 * 1000);
  if (!limit.allowed) {
    return {
      error: `Demasiados intentos. Espera ${Math.ceil(limit.retryAfterSeconds / 60)} minutos.`,
    };
  }

  const { checkoutUrl, error } = await createCheckoutSession(planKey, billingPeriod);

  if (error || !checkoutUrl) {
    return { error: error ?? "No se pudo iniciar el pago" };
  }

  redirect(checkoutUrl);
}
