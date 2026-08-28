"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { ownProfileSchema } from "@/lib/validators/profileSchema";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import {
  updateOwnPlatformAdminProfile,
  uploadPlatformAdminAvatar,
  deletePlatformAdminAvatar,
} from "@/lib/services/profileService";
// signOutAllDevices no depende de business_id (lo comprueba internamente en
// admin/perfil/actions.ts), así que la MISMA lógica sirve para superadmin
// tal cual. Un archivo "use server" exige que TODO lo exportado sea
// directamente una función async (Next.js no permite re-exportar un
// binding tal cual) — por eso es un wrapper delgado, no duplica lógica.
import { signOutAllDevicesAction as adminSignOutAllDevicesAction } from "@/app/(dashboard)/admin/perfil/actions";

export async function signOutAllDevicesAction() {
  return adminSignOutAllDevicesAction();
}

// Estas tres sí son distintas de las de admin/perfil/actions.ts: ahí
// exigen profile.businessId (escriben en business_members); acá exigen
// justo lo contrario, que sea superadmin de verdad (escriben en
// platform_admins). Nunca deben mezclarse.
export async function updateOwnProfileAction(input: { fullName: string; phone: string }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "superadmin") return { error: "No autorizado" };

  const parsed = ownProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await updateOwnPlatformAdminProfile(profile.userId, {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone ?? "",
  });
  revalidatePath("/superadmin/perfil");
  return result;
}

export async function uploadAvatarAction(file: File) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "superadmin") return { error: "No autorizado", url: null };

  const limit = checkRateLimit(`upload-avatar:${profile.userId}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiadas subidas seguidas. Espera ${limit.retryAfterSeconds}s.`, url: null };
  }

  const result = await uploadPlatformAdminAvatar(profile.userId, file);
  revalidatePath("/superadmin/perfil");
  return result;
}

export async function deleteAvatarAction() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "superadmin") return { error: "No autorizado" };

  const result = await deletePlatformAdminAvatar(profile.userId);
  revalidatePath("/superadmin/perfil");
  return result;
}
