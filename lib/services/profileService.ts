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
import { formatShortDate } from "@/lib/utils/date";

// Cooldown anti-abuso ligero para cambiar nombre/teléfono, no
// antisuplantación pública (nadie busca fullName como handle público) —
// fijo en código, no configurable, mismo criterio que los límites fijos
// de checkRateLimit().
const PROFILE_FIELD_COOLDOWN_DAYS = 30;
const PROFILE_FIELD_COOLDOWN_MS = PROFILE_FIELD_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// null = ya se puede cambiar (nunca se cambió, o ya pasó el cooldown).
// Si no, la fecha (ISO) en la que se vuelve a poder cambiar.
function cooldownAvailableAt(changedAtIso: string | null): string | null {
  if (!changedAtIso) return null;
  const availableAtMs = new Date(changedAtIso).getTime() + PROFILE_FIELD_COOLDOWN_MS;
  if (availableAtMs <= Date.now()) return null;
  return new Date(availableAtMs).toISOString();
}

export interface ProfileDetails {
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  businessName: string | null;
  avatarUrl: string | null;
  lastSignInAt: string | null;
  memberSince: string | null;
  // null = se puede cambiar ahora mismo. Si no, fecha (ISO) en la que se
  // vuelve a habilitar — para que la UI la muestre sin repetir la cuenta
  // de los 30 días por su cuenta.
  fullNameChangeAvailableAt: string | null;
  phoneChangeAvailableAt: string | null;
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
          .select("full_name, phone, avatar_url, created_at, full_name_changed_at, phone_changed_at")
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
    fullNameChangeAvailableAt: cooldownAvailableAt(memberResult.data?.full_name_changed_at ?? null),
    phoneChangeAvailableAt: cooldownAvailableAt(memberResult.data?.phone_changed_at ?? null),
  };
}

// Solo la foto — a diferencia de getProfileDetails() (email, negocio,
// último acceso, etc.), esta función la usa el layout global del
// dashboard (Sidebar), que envuelve TODAS las páginas — traer ahí el
// resto de columnas y el segundo roundtrip a `businesses` en cada
// navegación sería trabajo repetido sin uso; eso solo hace falta una vez,
// en la pantalla de Perfil. businessId null ya no significa "sin avatar
// posible" — significa "buscar en platform_admins en vez de
// business_members", desde que el superadmin también tiene foto propia.
export async function getAvatarUrl(userId: string, businessId: string | null): Promise<string | null> {
  const supabase = await createClient();
  if (!businessId) {
    const { data } = await supabase
      .from("platform_admins")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.avatar_url ?? null;
  }
  const { data } = await supabase
    .from("business_members")
    .select("avatar_url")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .maybeSingle();
  return data?.avatar_url ?? null;
}

export interface UpdateOwnProfileResult {
  error: string | null;
  // Qué campo disparó el error de cooldown, para que la UI lo asocie al
  // input correcto — undefined en cualquier otro tipo de error.
  field?: "fullName" | "phone";
}

// Solo nombre y teléfono — nunca role, permissions, business_id ni
// cualquier otra columna, aunque el llamador (server action) ya haya
// validado sesión. El filtro doble (user_id + business_id) es la segunda
// capa de defensa contra IDOR, no la única: ambos valores deben venir de
// getSessionProfile(), jamás de un parámetro que mande el cliente.
//
// Cooldown de 30 días por campo (full_name_changed_at / phone_changed_at,
// por separado) — fricción anti-abuso ligera, no antisuplantación
// pública. Si el valor mandado es igual al que ya tenía, no cuenta como
// cambio: no dispara el cooldown ni bloquea el resto del guardado.
export async function updateOwnProfile(
  userId: string,
  businessId: string,
  input: { fullName: string; phone: string }
): Promise<UpdateOwnProfileResult> {
  // Lectura por el cliente normal (RLS ya cubre "ver mi propia fila" vía
  // is_business_member, mismo criterio que getProfileDetails/getAvatarUrl
  // en este archivo) — solo la escritura de abajo necesita service role.
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("business_members")
    .select("full_name, phone, full_name_changed_at, phone_changed_at")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (readError || !current) {
    console.error("[updateOwnProfile] error leyendo la fila actual:", { readError, userId, businessId });
    return { error: "No se pudo actualizar tu perfil, intenta de nuevo." };
  }

  const nextPhone = input.phone || null;
  const nameChanged = input.fullName !== current.full_name;
  const phoneChanged = nextPhone !== current.phone;

  if (nameChanged) {
    const availableAt = cooldownAvailableAt(current.full_name_changed_at);
    if (availableAt) {
      return {
        error: `Podrás cambiar tu nombre de nuevo el ${formatShortDate(availableAt)}.`,
        field: "fullName",
      };
    }
  }

  if (phoneChanged) {
    const availableAt = cooldownAvailableAt(current.phone_changed_at);
    if (availableAt) {
      return {
        error: `Podrás cambiar tu teléfono de nuevo el ${formatShortDate(availableAt)}.`,
        field: "phone",
      };
    }
  }

  const nowIso = new Date().toISOString();
  const updatePayload: {
    full_name: string;
    phone: string | null;
    full_name_changed_at?: string;
    phone_changed_at?: string;
  } = {
    full_name: input.fullName,
    phone: nextPhone,
  };
  if (nameChanged) updatePayload.full_name_changed_at = nowIso;
  if (phoneChanged) updatePayload.phone_changed_at = nowIso;

  const admin = createAdminClient();
  const { error, data } = await admin
    .from("business_members")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .select("user_id");

  if (error) {
    console.error("[updateOwnProfile] error:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return { error: translateError(error) };
  }

  // Sin .select() antes, un UPDATE que no matcheaba ninguna fila (user_id +
  // business_id sin fila correspondiente) volvía { error: null } igual —
  // se veía "Guardado" en la UI sin haber guardado nada. Ahora se detecta.
  if (!data || data.length === 0) {
    console.error("[updateOwnProfile] no matcheó ninguna fila:", { userId, businessId });
    return { error: "No se pudo actualizar tu perfil, intenta de nuevo." };
  }

  return { error: null };
}

// Revoca todas las sesiones (todos los refresh tokens) del usuario que
// llama — el userId siempre viene de getSessionProfile() en el server
// action, nunca de un parámetro externo, para que esto no pueda usarse
// para cerrar la sesión de otra persona.
// BUG real que tenía esto antes: admin.auth.admin.signOut(jwt, scope)
// espera un JWT como primer parámetro (el token de UNA sesión a revocar),
// no un user_id — pasarle un UUID producía exactamente el error que vimos
// ("token contains an invalid number of segments"). No existe una forma
// de revocar por user_id vía la Admin API; lo correcto es que el propio
// usuario cierre sesión con alcance "global" en su cliente de sesión —
// eso SÍ revoca todos los refresh tokens de esa cuenta en todos los
// dispositivos, no solo el de este navegador, y de paso limpia la cookie
// local de inmediato (sin esto, el access token ya emitido seguiría
// "viéndose" válido hasta su expiración natural).
export async function signOutAllSessions(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });

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

// --------------------------------------------------------------------
// Perfil de SUPERADMIN — mismo patrón que arriba, pero contra
// `platform_admins` en vez de `business_members`, porque un superadmin no
// tiene fila en business_members (vive fuera del esquema multi-tenant, ver
// docs/database.md). Se agregaron las mismas columnas editables
// (full_name, phone, avatar_url + *_changed_at) a platform_admins para
// que el patrón sea idéntico, no un caso especial.
export async function getPlatformAdminProfileDetails(
  userId: string,
  fallbackFullName: string
): Promise<ProfileDetails> {
  const supabase = await createClient();
  const [{ data: auth }, { data: admin }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("platform_admins")
      .select("full_name, phone, avatar_url, created_at, full_name_changed_at, phone_changed_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return {
    fullName: admin?.full_name ?? fallbackFullName,
    email: auth.user?.email ?? null,
    phone: admin?.phone ?? null,
    role: "superadmin",
    businessName: null,
    avatarUrl: admin?.avatar_url ?? null,
    lastSignInAt: auth.user?.last_sign_in_at ?? null,
    memberSince: admin?.created_at ?? null,
    fullNameChangeAvailableAt: cooldownAvailableAt(admin?.full_name_changed_at ?? null),
    phoneChangeAvailableAt: cooldownAvailableAt(admin?.phone_changed_at ?? null),
  };
}

export async function updateOwnPlatformAdminProfile(
  userId: string,
  input: { fullName: string; phone: string }
): Promise<UpdateOwnProfileResult> {
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("platform_admins")
    .select("full_name, phone, full_name_changed_at, phone_changed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError || !current) {
    console.error("[updateOwnPlatformAdminProfile] error leyendo la fila actual:", { readError, userId });
    return { error: "No se pudo actualizar tu perfil, intenta de nuevo." };
  }

  const nextPhone = input.phone || null;
  const nameChanged = input.fullName !== current.full_name;
  const phoneChanged = nextPhone !== current.phone;

  if (nameChanged) {
    const availableAt = cooldownAvailableAt(current.full_name_changed_at);
    if (availableAt) {
      return { error: `Podrás cambiar tu nombre de nuevo el ${formatShortDate(availableAt)}.`, field: "fullName" };
    }
  }
  if (phoneChanged) {
    const availableAt = cooldownAvailableAt(current.phone_changed_at);
    if (availableAt) {
      return { error: `Podrás cambiar tu teléfono de nuevo el ${formatShortDate(availableAt)}.`, field: "phone" };
    }
  }

  const nowIso = new Date().toISOString();
  const updatePayload: {
    full_name: string;
    phone: string | null;
    full_name_changed_at?: string;
    phone_changed_at?: string;
  } = { full_name: input.fullName, phone: nextPhone };
  if (nameChanged) updatePayload.full_name_changed_at = nowIso;
  if (phoneChanged) updatePayload.phone_changed_at = nowIso;

  const admin = createAdminClient();
  const { error, data } = await admin
    .from("platform_admins")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("user_id");

  if (error) {
    console.error("[updateOwnPlatformAdminProfile] error:", { message: error.message, code: error.code });
    return { error: translateError(error) };
  }
  if (!data || data.length === 0) {
    console.error("[updateOwnPlatformAdminProfile] no matcheó ninguna fila:", { userId });
    return { error: "No se pudo actualizar tu perfil, intenta de nuevo." };
  }
  return { error: null };
}

export async function uploadPlatformAdminAvatar(
  userId: string,
  file: File
): Promise<{ error: string | null; url: string | null }> {
  const { error, buffer } = await sanitizeImageUpload(file, { maxDimension: 400, maxBytes: 3 * 1024 * 1024 });
  if (error || !buffer) return { error, url: null };

  const admin = createAdminClient();
  // Namespace "platform" en vez de un business_id, que un superadmin no
  // tiene — mismo bucket (user-avatars), path determinístico igual que
  // uploadAvatar().
  const path = `platform/${userId}/avatar.jpg`;

  const { error: uploadError } = await admin.storage
    .from("user-avatars")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    console.error("[uploadPlatformAdminAvatar] error de storage:", uploadError);
    return { error: "No se pudo subir la foto, intenta de nuevo", url: null };
  }

  const { data } = admin.storage.from("user-avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await admin.from("platform_admins").update({ avatar_url: url }).eq("user_id", userId);
  if (dbError) {
    console.error("[uploadPlatformAdminAvatar] error al guardar avatar_url:", dbError);
    return { error: translateError(dbError), url: null };
  }
  return { error: null, url };
}

export async function deletePlatformAdminAvatar(userId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const path = `platform/${userId}/avatar.jpg`;

  const { error: storageError } = await admin.storage.from("user-avatars").remove([path]);
  if (storageError) {
    console.error("[deletePlatformAdminAvatar] error borrando de storage:", storageError);
  }

  const { error } = await admin.from("platform_admins").update({ avatar_url: null }).eq("user_id", userId);
  if (error) {
    console.error("[deletePlatformAdminAvatar] error:", error);
    return { error: translateError(error) };
  }
  return { error: null };
}

// Borra la foto — mismo path determinístico que uploadAvatar(), así que
// no hace falta guardar la ruta aparte. Si falla el borrado en Storage no
// bloqueamos: igual limpiamos avatar_url para que la UI vuelva al
// fallback de iniciales (peor caso: un archivo huérfano en el bucket, no
// una foto vieja que sigue apareciendo).
export async function deleteAvatar(businessId: string, userId: string): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const path = `${businessId}/${userId}/avatar.jpg`;

  const { error: storageError } = await admin.storage.from("user-avatars").remove([path]);
  if (storageError) {
    console.error("[deleteAvatar] error borrando de storage:", storageError);
  }

  const { error } = await admin
    .from("business_members")
    .update({ avatar_url: null })
    .eq("user_id", userId)
    .eq("business_id", businessId);

  if (error) {
    console.error("[deleteAvatar] error:", error);
    return { error: translateError(error) };
  }
  return { error: null };
}
