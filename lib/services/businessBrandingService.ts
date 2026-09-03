// lib/services/businessBrandingService.ts
//
// Personalización del PDF de Reportes: logo, correo, teléfono, NIT/
// documento, dirección y redes sociales — todos propios del negocio
// (columnas en `businesses`, independientes del correo/teléfono del
// dueño en business_members — un negocio puede querer un correo de
// contacto distinto al personal del admin). NIT, dirección y redes son
// opcionales, igual que el logo.
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
import { createAdminClient, createClient, type SupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeImageUpload } from "@/lib/services/imageSecurityService";
import { translateError } from "@/lib/errors/translate";

export interface BusinessBranding {
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  taxId: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  twitter: string | null;
}

// Usado por Pedidos/Catálogo para formatear precios/totales en la moneda
// real del negocio (ver lib/utils/currency.ts) — el mismo country_iso2
// que ya usa Reportes para la zona horaria.
export async function getBusinessCountryIso2(
  businessId: string,
  db?: SupabaseServerClient
): Promise<string | null> {
  const supabase = db ?? (await createClient());
  const { data } = await supabase
    .from("businesses")
    .select("country_iso2")
    .eq("id", businessId)
    .maybeSingle();
  return data?.country_iso2 ?? null;
}

// Usado por Catálogo para saber qué lista de categorías sugerir en el
// formulario de producto (ver lib/config/productCategories.ts) — cada
// industria tiene las suyas, no tiene sentido mostrarle "Anillos/Aretes"
// a un taller mecánico.
export async function getBusinessIndustryType(businessId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("industry_type")
    .eq("id", businessId)
    .maybeSingle();
  return data?.industry_type ?? null;
}

export async function getBusinessBranding(businessId: string): Promise<BusinessBranding> {
  // Lectura sí va por el cliente normal — ya hay policy de SELECT para
  // cualquier miembro del negocio sobre `businesses`.
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("logo_url, contact_email, contact_phone, tax_id, address, instagram, facebook, tiktok, twitter")
    .eq("id", businessId)
    .maybeSingle();

  return {
    logoUrl: data?.logo_url ?? null,
    contactEmail: data?.contact_email ?? null,
    contactPhone: data?.contact_phone ?? null,
    taxId: data?.tax_id ?? null,
    address: data?.address ?? null,
    instagram: data?.instagram ?? null,
    facebook: data?.facebook ?? null,
    tiktok: data?.tiktok ?? null,
    twitter: data?.twitter ?? null,
  };
}

export async function updateBusinessBranding(
  businessId: string,
  input: {
    contactEmail: string;
    contactPhone: string;
    taxId: string;
    address: string;
    instagram: string;
    facebook: string;
    tiktok: string;
    twitter: string;
  }
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("businesses")
    .update({
      contact_email: input.contactEmail || null,
      contact_phone: input.contactPhone || null,
      tax_id: input.taxId || null,
      address: input.address || null,
      instagram: input.instagram || null,
      facebook: input.facebook || null,
      tiktok: input.tiktok || null,
      twitter: input.twitter || null,
    })
    .eq("id", businessId);

  if (error) {
    console.error("[updateBusinessBranding] error:", {
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
