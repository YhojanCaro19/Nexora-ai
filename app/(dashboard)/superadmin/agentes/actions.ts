"use server";

import { revalidatePath } from "next/cache";
import { isCurrentUserPlatformAdmin } from "@/lib/services/adminService";
import { updateIndustryTemplate, type IndustryTemplateInput } from "@/lib/services/agentTemplateService";

export async function updateIndustryTemplateAction(industryType: string, input: IndustryTemplateInput) {
  const isAdmin = await isCurrentUserPlatformAdmin();
  if (!isAdmin) {
    return { error: "No autorizado" };
  }

  const result = await updateIndustryTemplate(industryType, input);
  revalidatePath("/superadmin/agentes");
  return result;
}
