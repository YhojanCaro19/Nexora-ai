"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { resolveAccountChangeRequest } from "@/lib/services/accountChangeService";
import { accountChangeResolveSchema } from "@/lib/validators/accountChangeSchema";

async function requireSuperadmin() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "superadmin") return null;
  return profile;
}

export async function resolveAccountChangeAction(
  requestId: string,
  input: { action: "approve" | "reject"; note?: string }
) {
  const profile = await requireSuperadmin();
  if (!profile) return { error: "No autorizado" };

  const parsed = accountChangeResolveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await resolveAccountChangeRequest(requestId, profile.userId, parsed.data);
  revalidatePath("/superadmin/solicitudes");
  return result;
}
