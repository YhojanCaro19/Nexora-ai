// lib/services/profileService.ts
//
// Datos propios de la pantalla "Perfil" (app/(dashboard)/admin/perfil).
// Lectura por el cliente normal (RLS ya cubre "ver mi propia fila" vía
// is_business_member); las escrituras de acá abajo (nombre, teléfono,
// avatar, cierre de sesión global) van con service role acotado a
// columnas puntuales — mismo criterio ya documentado en
// businessBrandingService.ts y docs/database.md: no existe (ni debe
// existir) una policy de "cada quien edita su propia fila" en
// business_members, porque abriría la puerta a que un colaborador
// reescriba su propio `role` o `permissions` si el UPDATE no queda
// perfectamente acotado a nivel de columna.
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { sanitizeImageUpload } from "@/lib/services/imageSecurityService";
import { translateError } from "@/lib/errors/translate";

export interface ProfileDetails {
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  businessName: string | null;
  avatarUrl: string | null;
  lastSignInAt: string | null;
  memberSince: string | null;
}

export async function getProfileDetails(
  userId: string,
  businessId: string | null,
  role: string,
  fallbackFullName: string
): Promise<ProfileDetails> {
  const supabase = await createClient();

  const [{ data: auth }, memberResult, businessResult] = await Promise.all([
    supabase.auth.getUser(),
    businessId
      ? supabase
          .from("business_members")
          .select("full_name, phone, avatar_url, created_at")
          .eq("user_id", userId)
          .eq("business_id", businessId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    businessId
      ? supabase.from("businesses").select("name").eq("id", businessId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    fullName: memberResult.data?.full_name ?? fallbackFullName,
    email: auth.user?.email ?? null,
    phone: memberResult.data?.phone ?? null,
    role,
    businessName: businessResult.data?.name ?? null,
    avatarUrl: memberResult.data?.avatar_url ?? null,
    lastSignInAt: auth.user?.last_sign_in_at ?? null,
    memberSince: memberResult.data?.created_at ?? null,
  };
}

// Solo nombre y teléfono — nunca role, permissions, business_id ni
// cualquier otra columna, aunque el llamador (server action) ya haya
// validado sesión. El filtro doble (user_id + business_id) es la segunda
// capa de defensa contra IDOR, no la única: ambos valores deben venir de
// getSessionProfile(), jamás de un parámetro que mande el cliente.
export async function updateOwnProfile(
  userId: string,
  businessId: string,
  input: { fullName: string; phone: string }
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("business_members")
    .update({
      full_name: input.fullName,
      phone: input.phone || null,
    })
    .eq("user_id", userId)
    .eq("business_id", businessId);

  if (error) {
    console.error("[updateOwnProfile] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return { error: translateError(error) };
  }
  return { error: null };
}

// Revoca todas las sesiones (todos los refresh tokens) del usuario que
// llama — el userId siempre viene de getSessionProfile() en el server
// action, nunca de un parámetro externo, para que esto no pueda usarse
// para cerrar la sesión de otra persona.
export async function signOutAllSessions(userId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.signOut(userId, "global");

  if (error) {
    console.error("[signOutAllSessions] error:", {
      message: error.message,
      status: error.status,
    });
    return { error: translateError(error) };
  }
  return { error: null };
}

export async function uploadAvatar(
  businessId: string,
  userId: string,
  file: File
): Promise<{ error: string | null; url: string | null }> {
  // Una foto de perfil no necesita el tamaño de una foto de producto ni
  // de un logo — se guarda más pequeña todavía.
  const { error, buffer } = await sanitizeImageUpload(file, { maxDimension: 400, maxBytes: 3 * 1024 * 1024 });
  if (error || !buffer) {
    return { error, url: null };
  }

  const admin = createAdminClient();
  const path = `${businessId}/${userId}/avatar.jpg`;

  const { error: uploadError } = await admin.storage
    .from("user-avatars")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    console.error("[uploadAvatar] error de storage:", uploadError);
    return { error: "No se pudo subir la foto, intenta de nuevo", url: null };
  }

  const { data } = admin.storage.from("user-avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await admin
    .from("business_members")
    .update({ avatar_url: url })
    .eq("user_id", userId)
    .eq("business_id", businessId);

  if (dbError) {
    console.error("[uploadAvatar] error al guardar avatar_url:", dbError);
    return { error: translateError(dbError), url: null };
  }

  return { error: null, url };
}
