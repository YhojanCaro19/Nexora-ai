"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { createCollaborator } from "@/lib/services/collaboratorService";
import { collaboratorSchema, type CollaboratorInput } from "@/lib/validators/collaboratorSchema";

export async function createCollaboratorAction(input: CollaboratorInput) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado", data: null };
  }

  const parsed = collaboratorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const result = await createCollaborator(profile.businessId, profile.userId, parsed.data);
  revalidatePath("/admin/colaboradores");
  return result;
}
