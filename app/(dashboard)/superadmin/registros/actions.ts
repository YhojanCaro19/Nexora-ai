"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import {
  resendRegistrationEmail,
  createManualPendingRegistration,
  type BillingPeriod,
} from "@/lib/services/registrationService";

async function requireSuperadmin() {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "superadmin") return null;
  return profile;
}

export async function resendRegistrationEmailAction(id: string) {
  const profile = await requireSuperadmin();
  if (!profile) return { error: "No autorizado" };

  const result = await resendRegistrationEmail(id);
  revalidatePath("/superadmin/registros");
  return result;
}

export async function createManualRegistrationAction(formData: FormData) {
  const profile = await requireSuperadmin();
  if (!profile) return { error: "No autorizado" };

  const result = await createManualPendingRegistration({
    email: String(formData.get("email") ?? ""),
    planKey: String(formData.get("planKey") ?? ""),
    billingPeriod: String(formData.get("billingPeriod") ?? "monthly") as BillingPeriod,
    createdBy: profile.userId,
  });
  revalidatePath("/superadmin/registros");
  return result;
}
