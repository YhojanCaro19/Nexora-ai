"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/get-session";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { signState, buildAuthorizeUrl } from "@/lib/services/metaOAuthService";
import { revokeConnection } from "@/lib/services/channelConnectionService";
import { isChannel, type Channel } from "@/lib/types/channel";

const RETURN_PATH = "/admin/mi-agente/canales";

/**
 * Arranca el flujo de conexión con Meta: firma el `state` y manda el
 * navegador del admin al diálogo de Facebook. Al volver, el callback
 * (`/api/auth/meta/callback`) guarda la conexión.
 */
export async function startMetaConnectAction(): Promise<void> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    redirect("/login");
  }

  const limit = checkRateLimit(`meta-connect:${profile.userId}`, 8, 60 * 1000);
  if (!limit.allowed) {
    redirect(`${RETURN_PATH}?error=rate`);
  }

  const state = signState({
    businessId: profile.businessId,
    userId: profile.userId,
    kind: "channels",
    returnPath: RETURN_PATH,
  });
  redirect(buildAuthorizeUrl(state, "channels"));
}

/** Desconecta un canal (marca la conexión como revocada). */
export async function disconnectChannelAction(
  channel: string
): Promise<{ error: string | null }> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.businessId) {
    return { error: "No autorizado" };
  }
  if (!isChannel(channel)) {
    return { error: "Canal inválido" };
  }

  await revokeConnection(profile.businessId, channel as Channel);
  revalidatePath(RETURN_PATH);
  return { error: null };
}
