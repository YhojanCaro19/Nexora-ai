// lib/services/businessBrandingService.ts
//
// Personalización del PDF de Reportes: logo, correo y teléfono propios
// del negocio (columnas nuevas en `businesses`, independientes del correo/
// teléfono del dueño en business_members — un negocio puede querer un
// correo de contacto distinto al personal del admin).
//
// Se escribe con service role, no con el cliente normal: hoy no existe
// ninguna policy de "el admin edita su propio negocio" en `businesses`
// (la fila solo se creaba antes desde createAccountFromRequest, también
// con service role) y crear una policy de UPDATE general sobre
// `businesses` abriría la puerta a que ese mismo endpoint edite columnas
// que no debería (industry_type, owner_id) sin un diseño de RLS a nivel
// de columna. Mismo criterio ya documentado en architecture.md para
// must_change_password: service role acotado a exactamente las columnas
// necesarias, nunca expuesto al navegador.
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { sanitizeImageUpload } from "@/lib/services/imageSecurityService";
import { translateError } from "@/lib/errors/translate";

export interface BusinessBranding {
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export async function getBusinessBranding(businessId: string): Promise<BusinessBranding> {
  // Lectura sí va por el cliente normal — ya hay policy de SELECT para
  // cualquier miembro del negocio sobre `businesses`.
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("logo_url, contact_email, contact_phone")
    .eq("id", businessId)
    .maybeSingle();

  return {
    logoUrl: data?.logo_url ?? null,
    contactEmail: data?.contact_email ?? null,
    contactPhone: data?.contact_phone ?? null,
  };
}

export async function updateBusinessContact(
  businessId: string,
  input: { contactEmail: string; contactPhone: string }
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("businesses")
    .update({
      contact_email: input.contactEmail || null,
      contact_phone: input.contactPhone || null,
    })
    .eq("id", businessId);

  if (error) {
    console.error("[updateBusinessContact] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return { error: translateError(error) };
  }
  return { error: null };
}

export async function uploadBusinessLogo(
  businessId: string,
  file: File
): Promise<{ error: string | null; url: string | null }> {
  // Un logo no necesita el mismo tamaño que una foto de producto — se
  // guarda más pequeño.
  const { error, buffer } = await sanitizeImageUpload(file, { maxDimension: 800, maxBytes: 3 * 1024 * 1024 });
  if (error || !buffer) {
    return { error, url: null };
  }

  const admin = createAdminClient();
  const path = `${businessId}/logo.jpg`;

  const { error: uploadError } = await admin.storage
    .from("business-logos")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    console.error("[uploadBusinessLogo] error de storage:", uploadError);
    return { error: "No se pudo subir el logo, intenta de nuevo", url: null };
  }

  const { data } = admin.storage.from("business-logos").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await admin.from("businesses").update({ logo_url: url }).eq("id", businessId);
  if (dbError) {
    console.error("[uploadBusinessLogo] error al guardar logo_url:", dbError);
    return { error: translateError(dbError), url: null };
  }

  return { error: null, url };
}
