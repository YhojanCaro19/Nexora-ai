"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isValidPhone } from "@/lib/utils/phone";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getClientIp } from "@/lib/utils/request";
import { industryTypes } from "@/lib/validators/businessSchema";

const contactSchema = z.object({
  full_name: z.string().min(2, "El nombre es muy corto"),
  business_name: z.string().optional(),
  email: z.string().email("Correo inválido"),
  // PhoneField siempre entrega "" o un E.164 completo (código de país +
  // número) — nunca un número suelto sin código, porque Reportes depende
  // de ese código para saber la zona horaria del negocio.
  phone: z
    .string()
    .optional()
    .refine((v) => !v || isValidPhone(v), {
      message: "El teléfono no es válido, revisa el número",
    }),
  // País (ISO2) resuelto por PhoneField junto al teléfono — se guarda
  // aparte porque Reportes lo va a leer directo, sin volver a interpretar
  // el prefijo del número (varios países comparten el mismo prefijo, ej.
  // +1). Si PhoneField no pudo resolverlo (código escrito a mano que no
  // coincide con ningún país), se guarda vacío y cae al valor por defecto
  // de la columna en businesses más adelante.
  country_iso2: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  message: z.string().optional(),
  // Elegido por quien pide acceso, no inventado por el superadmin al
  // aprobar — el superadmin sigue pudiendo corregirlo en Solicitudes si
  // el solicitante se equivocó, esto solo lo precarga.
  industry_type: z
    .string()
    .optional()
    .refine((v) => !v || industryTypes.some((it) => it.value === v), {
      message: "Tipo de negocio inválido",
    }),
});

export async function submitContactRequest(formData: FormData) {
  // Es el único formulario de toda la app que cualquiera, sin sesión,
  // puede mandar — el más expuesto a spam/abuso.
  const ip = await getClientIp();
  const limit = checkRateLimit(`contacto:${ip}`, 3, 10 * 60 * 1000);
  if (!limit.allowed) {
    redirect(`/contacto?error=${encodeURIComponent(`Demasiados intentos. Espera ${Math.ceil(limit.retryAfterSeconds / 60)} minutos y vuelve a intentarlo.`)}`);
  }

  const parsed = contactSchema.safeParse({
    full_name: formData.get("full_name"),
    business_name: formData.get("business_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    country_iso2: formData.get("phone_country"),
    message: formData.get("message"),
    industry_type: formData.get("industry_type"),
  });

  if (!parsed.success) {
    redirect(
      `/contacto?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    );
  }

  // Cliente normal (anon) — la policy RLS permite insert público a cualquiera,
  // pero nadie (excepto el backend admin) puede leer estos registros después.
  const supabase = await createClient();

  const { error } = await supabase.from("contact_requests").insert(parsed.data);

  if (error) {
    console.error("[submitContactRequest] error:", error);
    redirect(`/contacto?error=No pudimos enviar tu solicitud, intenta de nuevo`);
  }

  redirect("/contacto?success=true");
}