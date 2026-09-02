// lib/services/registrationService.ts
//
// Orquesta el alta de cuentas por PAGO (Wompi):
//   /precios  → createCheckoutSession → Wompi
//   webhook   → processApprovedPayment → pending_registrations + correo
//   /registro → completeRegistration  → cuenta + negocio + agente + créditos
//
// La creación real de la cuenta (usuario Auth sin password, negocio,
// business_members, agent_configs, con rollback en cascada) vive en
// `provisionBusinessAccount` — antes era `adminService.createAccountFromRequest`.
//
// Degrada suave: si el módulo de créditos / estas tablas no están aplicados,
// las funciones lanzan y el llamador (webhook / server action) lo atrapa.
import { randomBytes, createHash } from "crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { getIndustryTemplate } from "@/lib/services/agentTemplateService";
import { industryTypes } from "@/lib/validators/businessSchema";
import {
  sendRegistrationLinkEmail,
  sendAccountReadyEmail,
} from "@/lib/services/emailService";
import { buildCheckoutUrl, type WompiTransaction } from "@/lib/services/wompiService";

const REGISTRATION_TOKEN_TTL_DAYS = 30;

// ---------------------------------------------------------------
// Planes
// ---------------------------------------------------------------

export interface PublicPlan {
  id: string;
  key: string;
  name: string;
  priceMonthlyCop: number;
  priceAnnualCop: number;
  monthlyCredits: number;
  maxBusinesses: number;
  includedAgentConversations: number;
  includedCampaigns: number;
  includedImages: number;
}

interface PlanRow {
  id: string;
  key: string;
  name: string;
  price_monthly_cop: number;
  price_annual_cop: number;
  monthly_credits: number;
  max_businesses: number;
  included_agent_conversations: number | null;
  included_campaigns: number | null;
  included_images: number | null;
  is_active: boolean;
  sort_order: number;
}

function rowToPlan(r: PlanRow): PublicPlan {
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    priceMonthlyCop: r.price_monthly_cop,
    priceAnnualCop: r.price_annual_cop,
    monthlyCredits: r.monthly_credits,
    maxBusinesses: r.max_businesses,
    includedAgentConversations: r.included_agent_conversations ?? 0,
    includedCampaigns: r.included_campaigns ?? 0,
    includedImages: r.included_images ?? 0,
  };
}

const PLAN_COLUMNS =
  "id, key, name, price_monthly_cop, price_annual_cop, monthly_credits, max_businesses, " +
  "included_agent_conversations, included_campaigns, included_images, is_active, sort_order";

/** Planes activos para mostrar en /precios. Lectura pública (RLS: plans_read). */
export async function getPublicPlans(): Promise<PublicPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    if (error) console.error("[getPublicPlans] error:", error.message);
    return [];
  }
  return (data as unknown as PlanRow[]).map(rowToPlan);
}

async function getPlanByKey(planKey: string): Promise<PlanRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("key", planKey)
    .eq("is_active", true)
    .maybeSingle();
  return (data as unknown as PlanRow) ?? null;
}

export type BillingPeriod = "monthly" | "annual";

function planAmountInCents(plan: PlanRow, period: BillingPeriod): number {
  return period === "annual" ? plan.price_annual_cop : plan.price_monthly_cop;
}

function planRenewsAtISO(period: BillingPeriod): string {
  const d = new Date();
  if (period === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

// ---------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "";

export interface StartCheckoutResult {
  checkoutUrl: string | null;
  error: string | null;
}

/**
 * Crea la fila `checkout_sessions` y devuelve la URL de Wompi. La
 * `reference` es única y es la que el webhook usa para saber qué plan se
 * pagó.
 */
export async function createCheckoutSession(
  planKey: string,
  period: BillingPeriod
): Promise<StartCheckoutResult> {
  if (!isBillingPeriod(period)) {
    return { checkoutUrl: null, error: "Periodo de facturación inválido" };
  }

  const plan = await getPlanByKey(planKey);
  if (!plan) {
    return { checkoutUrl: null, error: "Plan no disponible" };
  }

  const amountInCents = planAmountInCents(plan, period);
  const reference = `AVX-${randomBytes(12).toString("hex")}`;

  const admin = createAdminClient();
  const { error } = await admin.from("checkout_sessions").insert({
    reference,
    plan_id: plan.id,
    plan_key: plan.key,
    billing_period: period,
    amount_in_cents: amountInCents,
  });

  if (error) {
    console.error("[createCheckoutSession] error al insertar:", error.message);
    return { checkoutUrl: null, error: translateError(error) };
  }

  try {
    const checkoutUrl = buildCheckoutUrl({
      reference,
      amountInCents,
      redirectUrl: `${APP_URL()}/gracias`,
    });
    return { checkoutUrl, error: null };
  } catch (err) {
    console.error("[createCheckoutSession] error al firmar el checkout:", err);
    return { checkoutUrl: null, error: "No se pudo iniciar el pago" };
  }
}

function isBillingPeriod(period: string): period is BillingPeriod {
  return period === "monthly" || period === "annual";
}

// ---------------------------------------------------------------
// Webhook — pago aprobado
// ---------------------------------------------------------------

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/**
 * Llamado por el webhook de Wompi cuando una transacción quedó APPROVED
 * (ya reconfirmada server-to-server por el route handler). Idempotente.
 */
export async function processApprovedPayment(tx: WompiTransaction): Promise<void> {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("checkout_sessions")
    .select("id, plan_id, plan_key, billing_period, amount_in_cents, status, wompi_transaction_id")
    .eq("reference", tx.reference)
    .maybeSingle();

  if (!session) {
    console.error("[processApprovedPayment] sin checkout_session para reference:", tx.reference);
    return;
  }

  // Idempotencia: ya se procesó esta compra.
  if (session.status === "paid") return;

  if (session.amount_in_cents !== tx.amount_in_cents) {
    console.error("[processApprovedPayment] monto no coincide:", {
      reference: tx.reference,
      esperado: session.amount_in_cents,
      recibido: tx.amount_in_cents,
    });
    return;
  }

  // Marca "paid" de forma ATÓMICA: el `.eq("status","pending")` +
  // `.select()` hace que solo UNA de dos entregas concurrentes del webhook
  // (Wompi reintenta) se lleve la fila. Si no vino nada, otra entrega ya
  // la tomó → esta se corta acá y no vuelve a acreditar el plan.
  const { data: claimed } = await admin
    .from("checkout_sessions")
    .update({ status: "paid", wompi_transaction_id: tx.id, updated_at: new Date().toISOString() })
    .eq("id", session.id)
    .in("status", ["pending", "expired"])
    .select("id")
    .maybeSingle();

  if (!claimed) {
    console.warn("[processApprovedPayment] la sesión ya fue tomada por otra entrega:", tx.reference);
    return;
  }

  const email = (tx.customer_email ?? "").trim().toLowerCase();
  if (!email) {
    console.error("[processApprovedPayment] transacción sin customer_email:", tx.id);
    return;
  }

  const period = session.billing_period as BillingPeriod;

  // ¿El correo ya es dueño de un negocio? → renovación, no alta nueva.
  const existingBusinessId = await findBusinessIdByOwnerEmail(email);
  if (existingBusinessId) {
    await applyPlanToBusiness(existingBusinessId, session.plan_key, period);
    return;
  }

  // Alta nueva: registro pendiente + correo con el link.
  const rawToken = randomBytes(32).toString("base64url");
  const { data: pending, error } = await admin
    .from("pending_registrations")
    .insert({
      email,
      token_hash: hashToken(rawToken),
      plan_id: session.plan_id,
      plan_key: session.plan_key,
      billing_period: period,
      checkout_session_id: session.id,
      wompi_transaction_id: tx.id,
      source: "payment",
    })
    .select("id, expires_at")
    .single();

  if (error || !pending) {
    // wompi_transaction_id unique → si ya existe, es un reintento del webhook.
    console.error("[processApprovedPayment] no se pudo crear pending_registration:", error?.message);
    return;
  }

  const plan = await getPlanByKey(session.plan_key);
  const { error: mailError } = await sendRegistrationLinkEmail(email, {
    link: `${APP_URL()}/registro/${rawToken}`,
    planName: plan?.name ?? session.plan_key,
    expiresAt: pending.expires_at,
  });
  if (mailError) {
    console.error("[processApprovedPayment] falló el envío del correo de registro:", mailError);
  }
}

async function findBusinessIdByOwnerEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();

  // El correo solo vive en Auth. La Admin API no filtra por email, así que
  // se pagina hasta encontrarlo (o agotar la lista). Con el volumen actual
  // de AVENTHRA son 1–2 páginas; si esto crece, conviene duplicar el email
  // en una columna indexada.
  let user: { id: string } | undefined;
  for (let page = 1; page <= 20 && !user; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    user = users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (users.length < 1000) break;
  }
  if (!user) return null;

  const { data: membership } = await admin
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return membership?.business_id ?? null;
}

/**
 * Acredita los créditos del plan a un negocio y deja registrado el plan
 * vigente en el wallet. Usado por la renovación (webhook) y por el alta
 * nueva (completeRegistration).
 */
async function applyPlanToBusiness(
  businessId: string,
  planKey: string,
  period: BillingPeriod
): Promise<void> {
  const admin = createAdminClient();
  const plan = await getPlanByKey(planKey);
  if (!plan) {
    console.error("[applyPlanToBusiness] plan inexistente:", planKey);
    return;
  }

  const { error: rpcError } = await admin.rpc("reset_plan_credits", {
    p_business_id: businessId,
    p_new_amount: plan.monthly_credits,
    p_renews_at: planRenewsAtISO(period),
  });
  if (rpcError) {
    console.error("[applyPlanToBusiness] reset_plan_credits falló:", rpcError.message);
    throw new Error(rpcError.message);
  }

  await admin
    .from("credit_wallets")
    .update({ plan_key: planKey, billing_period: period, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
}

// ---------------------------------------------------------------
// Registro — el cliente completa sus datos
// ---------------------------------------------------------------

export interface PendingRegistrationView {
  id: string;
  email: string;
  planKey: string;
  planName: string;
  billingPeriod: BillingPeriod;
}

type TokenLookup =
  | { ok: true; registration: PendingRegistrationRow }
  | { ok: false; reason: "not_found" | "completed" | "expired" };

interface PendingRegistrationRow {
  id: string;
  email: string;
  plan_id: string | null;
  plan_key: string;
  billing_period: BillingPeriod;
  status: "pending" | "completed" | "expired";
  expires_at: string;
}

async function lookupByToken(rawToken: string): Promise<TokenLookup> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pending_registrations")
    .select("id, email, plan_id, plan_key, billing_period, status, expires_at")
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle();

  if (!data) return { ok: false, reason: "not_found" };
  const reg = data as PendingRegistrationRow;
  if (reg.status === "completed") return { ok: false, reason: "completed" };
  if (reg.status === "expired" || new Date(reg.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, registration: reg };
}

/** Para la página /registro/[token] — datos a mostrar, o el motivo del rechazo. */
export async function getPendingRegistrationByToken(
  rawToken: string
): Promise<
  | { status: "ok"; data: PendingRegistrationView }
  | { status: "not_found" | "completed" | "expired" }
> {
  const result = await lookupByToken(rawToken);
  if (!result.ok) return { status: result.reason };

  const reg = result.registration;
  const plan = await getPlanByKey(reg.plan_key);
  return {
    status: "ok",
    data: {
      id: reg.id,
      email: reg.email,
      planKey: reg.plan_key,
      planName: plan?.name ?? reg.plan_key,
      billingPeriod: reg.billing_period,
    },
  };
}

export interface CompleteRegistrationInput {
  businessName: string;
  industryType: string;
  phone: string;
  countryIso2?: string;
  fullName: string;
}

export interface CompleteRegistrationResult {
  error: string | null;
  data: { email: string } | null;
}

/**
 * El cliente envía el formulario de /registro. Crea la cuenta completa y
 * acredita los créditos del plan pagado.
 */
export async function completeRegistration(
  rawToken: string,
  input: CompleteRegistrationInput
): Promise<CompleteRegistrationResult> {
  const lookup = await lookupByToken(rawToken);
  if (!lookup.ok) {
    const msg =
      lookup.reason === "completed"
        ? "Este enlace ya se usó. Entra con Google."
        : lookup.reason === "expired"
          ? "Este enlace venció. Escríbenos para reenviarte uno nuevo."
          : "Enlace inválido.";
    return { error: msg, data: null };
  }

  const reg = lookup.registration;

  if (!industryTypes.some((it) => it.value === input.industryType)) {
    return { error: "Tipo de negocio inválido", data: null };
  }
  if (input.businessName.trim().length < 2) {
    return { error: "El nombre del negocio es muy corto", data: null };
  }
  if (input.fullName.trim().length < 2) {
    return { error: "El nombre es muy corto", data: null };
  }

  const provision = await provisionBusinessAccount({
    email: reg.email,
    fullName: input.fullName.trim(),
    businessName: input.businessName.trim(),
    phone: input.phone,
    industryType: input.industryType,
    countryIso2: input.countryIso2,
    createdBy: null,
  });

  if (provision.error || !provision.businessId) {
    return { error: provision.error ?? "No se pudo crear la cuenta", data: null };
  }

  // Créditos del plan pagado.
  try {
    await applyPlanToBusiness(provision.businessId, reg.plan_key, reg.billing_period);
  } catch (err) {
    console.error("[completeRegistration] no se pudieron acreditar los créditos del plan:", err);
    // No se revierte la cuenta: existe y es válida; el superadmin puede
    // acreditar a mano. Se deja registrado.
  }

  const admin = createAdminClient();
  await admin
    .from("pending_registrations")
    .update({
      status: "completed",
      business_id: provision.businessId,
      completed_at: new Date().toISOString(),
    })
    .eq("id", reg.id);

  const { error: mailError } = await sendAccountReadyEmail(reg.email, {
    businessName: input.businessName.trim(),
  });
  if (mailError) {
    console.error("[completeRegistration] falló el correo 'cuenta lista':", mailError);
  }

  return { error: null, data: { email: reg.email } };
}

// ---------------------------------------------------------------
// Provisión de la cuenta (extraído de adminService.createAccountFromRequest)
// ---------------------------------------------------------------

export interface ProvisionInput {
  email: string;
  fullName: string;
  businessName: string;
  phone: string;
  industryType: string;
  countryIso2?: string;
  /** superadmin, si el alta la hizo una persona; null en el flujo por pago. */
  createdBy: string | null;
}

export interface ProvisionResult {
  error: string | null;
  businessId: string | null;
}

/**
 * Crea: usuario de Auth (sin password, email_confirm) + negocio +
 * completa la fila que deja el trigger on_business_created en
 * business_members + agent_configs desde la plantilla de la industria.
 * Rollback en cascada si algo falla a mitad de camino.
 */
export async function provisionBusinessAccount(
  input: ProvisionInput
): Promise<ProvisionResult> {
  const admin = createAdminClient();

  // Sin `password`: la cuenta solo se usa vía Google OAuth con este mismo
  // correo. `email_confirm: true` deja el correo verificado para que
  // Supabase vincule la identidad de Google al iniciar sesión (ver
  // docs/decisions.md — "Autenticación solo con Google").
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (createError || !newUser.user) {
    return { error: translateError(createError), businessId: null };
  }

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({
      owner_id: newUser.user.id,
      name: input.businessName || input.fullName,
      industry_type: input.industryType,
      ...(input.countryIso2 ? { country_iso2: input.countryIso2 } : {}),
    })
    .select()
    .single();

  if (businessError || !business) {
    console.error("[provisionBusinessAccount] error al crear businesses:", businessError?.message);
    await admin.auth.admin.deleteUser(newUser.user.id);
    return { error: translateError(businessError), businessId: null };
  }

  // El trigger on_business_created ya insertó la fila mínima en
  // business_members (business_id, user_id, role) — acá se completa.
  const { error: memberError } = await admin
    .from("business_members")
    .update({
      full_name: input.fullName,
      phone: input.phone,
      created_by: input.createdBy,
    })
    .eq("business_id", business.id)
    .eq("user_id", newUser.user.id);

  if (memberError) {
    console.error("[provisionBusinessAccount] error al completar business_members:", memberError.message);
    await admin.from("businesses").delete().eq("id", business.id);
    await admin.auth.admin.deleteUser(newUser.user.id);
    return { error: translateError(memberError), businessId: null };
  }

  // Agente con la plantilla COMPLETA de la industria (no solo tools).
  const template = await getIndustryTemplate(input.industryType);
  const { error: agentError } = await admin.from("agent_configs").insert({
    business_id: business.id,
    enabled_tools: template.toolKeys,
    personality: template.personality,
    greeting_message: template.greetingMessage,
    escalation_message: template.escalationMessage,
    fallback_message: template.fallbackMessage,
    after_hours_message: template.afterHoursMessage,
    farewell_message: template.farewellMessage,
    faqs: template.faqs,
    response_length: template.responseLength,
    use_emojis: template.useEmojis,
    // Lote 1: el motor y el panel ahora leen emoji_mode; se siembra desde
    // el use_emojis de la plantilla hasta que las plantillas tengan su
    // propio campo. Ver docs/agente-lote1.md.
    emoji_mode: template.useEmojis ? "pocos" : "ninguno",
    restrictions: template.restrictions,
  });

  if (agentError) {
    // No es fatal: la cuenta y el negocio ya son válidos. El admin puede
    // configurar el agente después desde "Mi Agente".
    console.error("[provisionBusinessAccount] error al crear agent_configs:", agentError.message);
  }

  return { error: null, businessId: business.id };
}

// ---------------------------------------------------------------
// Superadmin — vía manual de soporte
// ---------------------------------------------------------------

export interface PendingRegistrationListItem {
  id: string;
  email: string;
  planKey: string;
  billingPeriod: string;
  source: string;
  status: string;
  businessId: string | null;
  createdAt: string;
  expiresAt: string;
  completedAt: string | null;
}

export async function listPendingRegistrations(): Promise<PendingRegistrationListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pending_registrations")
    .select(
      "id, email, plan_key, billing_period, source, status, business_id, created_at, expires_at, completed_at"
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("[listPendingRegistrations] error:", error.message);
    return [];
  }

  return (data as Array<Record<string, string | null>>).map((r) => ({
    id: r.id as string,
    email: r.email as string,
    planKey: r.plan_key as string,
    billingPeriod: r.billing_period as string,
    source: r.source as string,
    status: r.status as string,
    businessId: r.business_id,
    createdAt: r.created_at as string,
    expiresAt: r.expires_at as string,
    completedAt: r.completed_at,
  }));
}

export async function createManualPendingRegistration(params: {
  email: string;
  planKey: string;
  billingPeriod: BillingPeriod;
  createdBy: string;
}): Promise<{ error: string | null }> {
  const email = params.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Correo inválido" };
  }
  if (!isBillingPeriod(params.billingPeriod)) {
    return { error: "Periodo inválido" };
  }

  const plan = await getPlanByKey(params.planKey);
  if (!plan) return { error: "Plan no disponible" };

  if (await findBusinessIdByOwnerEmail(email)) {
    return { error: "Ese correo ya tiene un negocio en AVENTHRA" };
  }

  const admin = createAdminClient();
  const rawToken = randomBytes(32).toString("base64url");
  const { data: pending, error } = await admin
    .from("pending_registrations")
    .insert({
      email,
      token_hash: hashToken(rawToken),
      plan_id: plan.id,
      plan_key: plan.key,
      billing_period: params.billingPeriod,
      source: "manual",
      created_by: params.createdBy,
    })
    .select("expires_at")
    .single();

  if (error || !pending) {
    return { error: translateError(error) };
  }

  const { error: mailError } = await sendRegistrationLinkEmail(email, {
    link: `${APP_URL()}/registro/${rawToken}`,
    planName: plan.name,
    expiresAt: pending.expires_at,
  });
  if (mailError) {
    return { error: `Registro creado, pero el correo falló: ${mailError}` };
  }

  return { error: null };
}

/**
 * Reenvía el correo de un registro pendiente. Rota el token (invalida el
 * anterior) y extiende la vigencia.
 */
export async function resendRegistrationEmail(id: string): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { data: reg } = await admin
    .from("pending_registrations")
    .select("id, email, plan_key, status")
    .eq("id", id)
    .maybeSingle();

  if (!reg) return { error: "Registro no encontrado" };
  if ((reg as { status: string }).status !== "pending") {
    return { error: "Este registro ya no está pendiente" };
  }

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + REGISTRATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await admin
    .from("pending_registrations")
    .update({ token_hash: hashToken(rawToken), expires_at: expiresAt })
    .eq("id", id);

  if (error) return { error: translateError(error) };

  const plan = await getPlanByKey((reg as { plan_key: string }).plan_key);
  const { error: mailError } = await sendRegistrationLinkEmail(
    (reg as { email: string }).email,
    {
      link: `${APP_URL()}/registro/${rawToken}`,
      planName: plan?.name ?? (reg as { plan_key: string }).plan_key,
      expiresAt,
    }
  );
  if (mailError) return { error: mailError };

  return { error: null };
}
