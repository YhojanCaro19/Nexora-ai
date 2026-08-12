"use server";

import { revalidatePath } from "next/cache";
import { isCurrentUserPlatformAdmin } from "@/lib/services/adminService";
import { updateIndustryTemplate } from "@/lib/services/agentTemplateService";

export async function updateIndustryTemplateAction(industryType: string, toolKeys: string[]) {
  const isAdmin = await isCurrentUserPlatformAdmin();
  if (!isAdmin) {
    return { error: "No autorizado" };
  }

  const result = await updateIndustryTemplate(industryType, toolKeys);
  revalidatePath("/superadmin/agentes");
  return result;
}
