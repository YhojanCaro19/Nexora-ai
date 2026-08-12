"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isCurrentUserPlatformAdmin,
  createAccountFromRequest,
  rejectRequest,
} from "@/lib/services/adminService";

export async function createAccountAction(requestId: string, industryType: string) {
  const isAdmin = await isCurrentUserPlatformAdmin();
  if (!isAdmin) {
    return { error: "No autorizado", data: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "No autorizado", data: null };
  }

  const result = await createAccountFromRequest(requestId, industryType, user.id);
  revalidatePath("/superadmin/solicitudes");
  return result;
}

export async function rejectRequestAction(requestId: string) {
  const isAdmin = await isCurrentUserPlatformAdmin();
  if (!isAdmin) {
    return { error: "No autorizado" };
  }

  const result = await rejectRequest(requestId);
  revalidatePath("/superadmin/solicitudes");
  return result;
}