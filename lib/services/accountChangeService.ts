// lib/services/accountChangeService.ts
//
// Cambio de cuenta de acceso (Google) mediado por el superadmin. El login
// es 100% "Continuar con Google", así que el correo de la cuenta ES la
// llave de acceso — el usuario no lo puede cambiar solo. Crea una
// solicitud, el superadmin verifica identidad por fuera (llama al teléfono
// del registro) y aprueba; recién ahí se cambia el correo en Auth y se
// borra la identidad de Google vieja para que la cuenta anterior deje de
// tener acceso. Máximo 1 vez al año por persona.
//
// Toda la tabla `account_change_requests` se toca SOLO con service role
// (no tiene policies) desde server actions que ya derivan
// user_id/business_id de getSessionProfile() — mismo criterio que
// pending_registrations (docs/sql/auto-signup.sql §4).
import { createAdminClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import {
  sendAccountChangeRequestedEmail,
  sendAccountChangeResolvedEmail,
} from "@/lib/services/emailService";
import type { AccountChangeRequestInput, AccountChangeResolveInput } from "@/lib/validators/accountChangeSchema";

// 1 vez al año, contado desde el último cambio efectivo (no desde la
// última solicitud).
const ACCESS_CHANGE_COOLDOWN_MS = 365 * 24 * 60 * 60 * 1000;

export type AccountChangeStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface AccountChangeRequest {
  id: string;
  businessId: string;
  requestedBy: string;
  memberRole: string;
  currentEmail: string;
  requestedEmail: string;
  reason: string;
  contactPhone: string | null;
  status: AccountChangeStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface AccountChangeRequestListItem extends AccountChangeRequest {
  businessName: string | null;
  requesterName: string | null;
}

interface RequestRow {
  id: string;
  business_id: string;
  requested_by: string;
  member_role: string;
  current_email: string;
  requested_email: string;
  reason: string;
  contact_phone: string | null;
  status: AccountChangeStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

function mapRow(row: RequestRow): AccountChangeRequest {
  return {
    id: row.id,
    businessId: row.business_id,
    requestedBy: row.requested_by,
    memberRole: row.member_role,
    currentEmail: row.current_email,
    requestedEmail: row.requested_email,
    reason: row.reason,
    contactPhone: row.contact_phone,
    status: row.status,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
  };
}

export interface AccessChangeEligibility {
  // null = nunca se cambió. Si no, ISO de cuándo se hizo el último cambio.
  lastChangedAt: string | null;
  // null = puede solicitar ya. Si no, ISO de cuándo se vuelve a habilitar.
  nextEligibleAt: string | null;
  // La solicitud pendiente de esta persona, si hay una.
  pendingRequest: AccountChangeRequest | null;
}

function nextEligibleAt(lastChangedAtIso: string | null): string | null {
  if (!lastChangedAtIso) return null;
  const at = new Date(lastChangedAtIso).getTime() + ACCESS_CHANGE_COOLDOWN_MS;
  return at <= Date.now() ? null : new Date(at).toISOString();
}

// Estado de "cambio de cuenta de acceso" para la pantalla de Perfil de una
// persona concreta.
export async function getAccessChangeEligibility(
  userId: string,
  businessId: string
): Promise<AccessChangeEligibility> {
  const admin = createAdminClient();

  const [{ data: member }, { data: pending }] = await Promise.all([
    admin
      .from("business_members")
      .select("access_email_changed_at")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .maybeSingle(),
    admin
      .from("account_change_requests")
      .select("*")
      .eq("requested_by", userId)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  const lastChangedAt = (member as { access_email_changed_at: string | null } | null)?.access_email_changed_at ?? null;

  return {
    lastChangedAt,
    nextEligibleAt: nextEligibleAt(lastChangedAt),
    pendingRequest: pending ? mapRow(pending as RequestRow) : null,
  };
}

interface CreateRequestParams {
  userId: string;
  businessId: string;
  memberRole: string;
  currentEmail: string;
  contactPhone: string | null;
  input: AccountChangeRequestInput;
}

export async function createAccountChangeRequest(
  params: CreateRequestParams
): Promise<{ error: string | null }> {
  const { userId, businessId, memberRole, currentEmail, contactPhone, input } = params;

  if (input.requestedEmail === currentEmail.trim().toLowerCase()) {
    return { error: "El correo nuevo es igual al que ya tienes." };
  }

  const eligibility = await getAccessChangeEligibility(userId, businessId);
  if (eligibility.pendingRequest) {
    return { error: "Ya tienes una solicitud de cambio en revisión." };
  }
  if (eligibility.nextEligibleAt) {
    return {
      error: `Solo se puede cambiar la cuenta de acceso una vez al año. Podrás pedir otro cambio a partir del ${new Date(
        eligibility.nextEligibleAt
      ).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}.`,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("account_change_requests").insert({
    business_id: businessId,
    requested_by: userId,
    member_role: memberRole,
    current_email: currentEmail,
    requested_email: input.requestedEmail,
    reason: input.reason,
    contact_phone: contactPhone,
  });

  if (error) {
    // 23505 = violación del índice único parcial (ya hay una pendiente) —
    // carrera contra el chequeo de arriba.
    if ((error as { code?: string }).code === "23505") {
      return { error: "Ya tienes una solicitud de cambio en revisión." };
    }
    console.error("[createAccountChangeRequest] error:", error);
    return { error: translateError(error) };
  }

  // Aviso al correo ACTUAL — si alguien pidió el cambio sin ser el dueño
  // de la cuenta, el dueño real se entera.
  await sendAccountChangeRequestedEmail(currentEmail, { requestedEmail: input.requestedEmail });

  return { error: null };
}

export async function cancelAccountChangeRequest(
  requestId: string,
  userId: string
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_change_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("requested_by", userId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    console.error("[cancelAccountChangeRequest] error:", error);
    return { error: translateError(error) };
  }
  if (!data || data.length === 0) {
    return { error: "No se encontró la solicitud o ya no está pendiente." };
  }
  return { error: null };
}

// -------------------- Superadmin --------------------

export async function listAccountChangeRequests(): Promise<AccountChangeRequestListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_change_requests")
    .select("*, businesses(name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listAccountChangeRequests] error:", error);
    return [];
  }

  const rows = (data ?? []) as (RequestRow & { businesses: { name: string } | null })[];

  // Nombre de quien pidió — desde business_members (mismo negocio).
  const byBusiness = new Map<string, string[]>();
  for (const r of rows) {
    byBusiness.set(r.business_id, [...(byBusiness.get(r.business_id) ?? []), r.requested_by]);
  }
  const nameByUser = new Map<string, string>();
  await Promise.all(
    rows.map(async (r) => {
      if (nameByUser.has(r.requested_by)) return;
      const { data: m } = await admin
        .from("business_members")
        .select("full_name")
        .eq("user_id", r.requested_by)
        .eq("business_id", r.business_id)
        .maybeSingle();
      nameByUser.set(r.requested_by, (m as { full_name: string | null } | null)?.full_name ?? "");
    })
  );

  return rows
    .map((r) => ({
      ...mapRow(r),
      businessName: r.businesses?.name ?? null,
      requesterName: nameByUser.get(r.requested_by) || null,
    }))
    .sort((a, b) => {
      // Pendientes primero, luego por fecha desc.
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

// Borra una identidad de Auth vía la API admin de GoTrue — el SDK de
// supabase-js no la expone, hay que ir por REST. Devuelve un mensaje de
// error legible o null.
async function deleteAuthIdentity(userId: string, identityId: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "Faltan variables de entorno de Supabase.";

  try {
    const res = await fetch(`${url}/auth/v1/admin/users/${userId}/identities/${identityId}`, {
      method: "DELETE",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[deleteAuthIdentity] respuesta no OK:", res.status, body);
      return `No se pudo desvincular la cuenta de Google anterior (${res.status}).`;
    }
    return null;
  } catch (err) {
    console.error("[deleteAuthIdentity] excepción:", err);
    return "No se pudo desvincular la cuenta de Google anterior.";
  }
}

export async function resolveAccountChangeRequest(
  requestId: string,
  superadminUserId: string,
  input: AccountChangeResolveInput
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { data: reqRow, error: readError } = await admin
    .from("account_change_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (readError || !reqRow) {
    return { error: "No se encontró la solicitud." };
  }
  const request = mapRow(reqRow as RequestRow);
  if (request.status !== "pending") {
    return { error: "Esta solicitud ya fue resuelta." };
  }

  const nowIso = new Date().toISOString();

  if (input.action === "reject") {
    const { error } = await admin
      .from("account_change_requests")
      .update({
        status: "rejected",
        resolved_by: superadminUserId,
        resolved_at: nowIso,
        resolution_note: input.note ?? null,
      })
      .eq("id", requestId)
      .eq("status", "pending");
    if (error) {
      console.error("[resolveAccountChangeRequest] error al rechazar:", error);
      return { error: translateError(error) };
    }
    await sendAccountChangeResolvedEmail(request.currentEmail, {
      approved: false,
      newEmail: request.requestedEmail,
      note: input.note ?? null,
    });
    return { error: null };
  }

  // ---- Aprobar: el cambio real ----

  // Re-chequeo del límite de 1 año (por si pasó entre pedir y aprobar).
  const { data: member } = await admin
    .from("business_members")
    .select("access_email_changed_at")
    .eq("user_id", request.requestedBy)
    .eq("business_id", request.businessId)
    .maybeSingle();
  const memberLastChanged = (member as { access_email_changed_at: string | null } | null)?.access_email_changed_at ?? null;
  if (nextEligibleAt(memberLastChanged)) {
    return { error: "Esta persona ya cambió su cuenta de acceso en el último año." };
  }

  const { data: userRes, error: getUserError } = await admin.auth.admin.getUserById(request.requestedBy);
  if (getUserError || !userRes.user) {
    return { error: "No se encontró la cuenta de Auth de esta persona." };
  }
  const targetUser = userRes.user;

  // 1) Cambiar el correo en Auth.
  const { error: updateError } = await admin.auth.admin.updateUserById(request.requestedBy, {
    email: request.requestedEmail,
    email_confirm: true,
    user_metadata: { ...targetUser.user_metadata },
  });
  if (updateError) {
    console.error("[resolveAccountChangeRequest] updateUserById:", updateError);
    // "email address ... already registered" y similares llegan acá.
    return { error: translateError(updateError) };
  }

  // 2) Desvincular la identidad de Google vieja — si no, la cuenta de
  //    Google anterior sigue entrando (GoTrue la resuelve por su `sub`,
  //    no por el correo).
  const googleIdentity = (targetUser.identities ?? []).find((i) => i.provider === "google");
  if (googleIdentity) {
    const identityId =
      (googleIdentity as { identity_id?: string }).identity_id ?? googleIdentity.id;
    const delError = await deleteAuthIdentity(request.requestedBy, identityId);
    if (delError) {
      // Rollback del correo — dejar la cuenta a medias es peor.
      await admin.auth.admin.updateUserById(request.requestedBy, {
        email: request.currentEmail,
        email_confirm: true,
      });
      return {
        error: `${delError} Se revirtió el cambio. Hazlo manualmente desde el panel de Supabase (Authentication → Users) o reintenta.`,
      };
    }
  }

  // 3) Marcar el cambio + resolver la solicitud.
  await admin
    .from("business_members")
    .update({ access_email_changed_at: nowIso })
    .eq("user_id", request.requestedBy)
    .eq("business_id", request.businessId);

  const { error: resolveError } = await admin
    .from("account_change_requests")
    .update({
      status: "approved",
      resolved_by: superadminUserId,
      resolved_at: nowIso,
      resolution_note: input.note ?? null,
    })
    .eq("id", requestId)
    .eq("status", "pending");
  if (resolveError) {
    console.error("[resolveAccountChangeRequest] error al marcar aprobada:", resolveError);
    // El cambio en Auth ya se hizo; no se revierte por un fallo de log.
  }

  // 4) Avisar a ambos correos (mejor esfuerzo).
  await Promise.all([
    sendAccountChangeResolvedEmail(request.currentEmail, {
      approved: true,
      newEmail: request.requestedEmail,
      note: input.note ?? null,
    }),
    sendAccountChangeResolvedEmail(request.requestedEmail, {
      approved: true,
      newEmail: request.requestedEmail,
      note: input.note ?? null,
    }),
  ]);

  return { error: null };
}
