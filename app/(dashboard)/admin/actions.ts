"use server";

import { revalidatePath } from "next/cache";
import { isCurrentUserPlatformAdmin, createAccountFromRequest } from "@/lib/services/adminService";

export async function createAccountAction(requestId: string) {
  const isAdmin = await isCurrentUserPlatformAdmin();
  if (!isAdmin) {
    return { error: "No autorizado", data: null };
  }

  const result = await createAccountFromRequest(requestId);
  revalidatePath("/admin");
  return result;
}