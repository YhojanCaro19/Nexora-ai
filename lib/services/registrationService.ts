// lib/services/registrationService.ts
//
// Orquesta el alta de cuentas por PAGO (Wompi):
//   /precios  → createCheckoutSession → Wompi
//   webhook   → processApprovedPayment → cuenta mínima + correo "cuenta lista"
//
// Ya NO hay link ni formulario por correo: el webhook provisiona la cuenta
// mínima de inmediato (usuario Auth sin password + negocio con nombre e
// industria provisionales). El dueño completa nombre/industria/teléfono y
// se genera el agente en el ONBOARDING de su primer login (/bienvenida →
// lib/services/onboardingService.ts).
//
// La creación de la cuenta (usuario Auth, negocio, business_members, con
// rollback en cascada) vive en `provisionAccountCore` / `provisionMinimalAccount`.
//
// Degrada suave: si el módulo de créditos / estas tablas no están aplicados,
// las funciones lanzan y el llamador (webhook / server action) lo atrapa.
import { randomBytes } from "crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { translateError } from "@/lib/errors/translate";
import { getIndustryTemplate } from "@/lib/services/agentTemplateService";
import { industryTypes } from "@/lib/validators/businessSchema";
import { sendAccountReadyEmail } from "@/lib/services/emailService";
import { buildCheckoutUrl, type WompiTransaction } from "@/lib/services/wompiService";

// Industria placeholder para la cuenta recién provisionada — el dueño elige
// la real en el onboarding. Se resuelve contra el catálogo por si el value
// llega a cambiar.
const DEFAULT_INDUSTRY_TYPE =
  industryTypes.find((it) => it.value === "online_store")?.value ?? industryTypes[0].value;

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
    includedAgentConversations: r.included_agent_conversations ?? 0,
    includedCampaigns: r.included_campaigns ?? 0,
    includedImages: r.included_images ?? 0,
  };
}

const PLAN_COLUMNS =
  "id, key, name, price_monthly_cop, price_annual_cop, monthly_credits, " +
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

// `pending_registrations.token_hash` es NOT NULL + UNIQUE y ya no se usa
// ningún link — se rellena con un valor descartable único por fila.
function throwawayTokenHash(): string {
  return randomBytes(24).toString("hex");
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

  // Marca "paid" de forma ATÓMICA: el `.in("status", [...])` + `.select()`
  // hace que solo UNA de dos entregas concurrentes del webhook (Wompi
  // reintenta) se lleve la fila. Si no vino nada, otra entrega ya la tomó →
  // esta se corta acá y no vuelve a acreditar el plan ni a provisionar.
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

  // Alta nueva: se provisiona la cuenta MÍNIMA de inmediato (sin link ni
  // formulario). El dueño completa nombre/industria/teléfono y se crea el
  // agente en el onboarding de su primer login (/bienvenida).
  const provision = await provisionMinimalAccount({ email, createdBy: null });
  if (provision.error || !provision.businessId) {
    console.error("[processApprovedPayment] no se pudo provisionar la cuenta:", provision.error);
    return;
  }

  // Créditos del plan pagado.
  try {
    await applyPlanToBusiness(provision.businessId, session.plan_key, period);
  } catch (err) {
    console.error("[processApprovedPayment] no se pudieron acreditar los créditos del plan:", err);
  }

  // Fila en pending_registrations para que Superadmin → Registros lo vea.
  // Nace 'completed' con el business_id: no hay nada pendiente por hacer.
  // `wompi_transaction_id` (UNIQUE) mantiene la idempotencia si una
  // reentrega del webhook llegara hasta acá pese al claim atómico de arriba.
  const { error: pendingError } = await admin.from("pending_registrations").insert({
    email,
    token_hash: throwawayTokenHash(),
    plan_id: session.plan_id,
    plan_key: session.plan_key,
    billing_period: period,
    checkout_session_id: session.id,
    wompi_transaction_id: tx.id,
    source: "payment",
    status: "completed",
    business_id: provision.businessId,
    completed_at: new Date().toISOString(),
  });
  if (pendingError) {
    console.error(
      "[processApprovedPayment] no se pudo registrar en pending_registrations:",
      pendingError.message
    );
  }

  const { error: mailError } = await sendAccountReadyEmail(email);
  if (mailError) {
    console.error("[processApprovedPayment] falló el envío del correo 'cuenta lista':", mailError);
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
 * vigente en el wallet. Usado por la renovación y por el alta nueva (webhook
 * y alta manual del superadmin).
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
// Provisión de la cuenta
// ---------------------------------------------------------------

export interface ProvisionResult {
  error: string | null;
  businessId: string | null;
}

interface ProvisionCoreInput {
  email: string;
  fullName: string;
  businessName: string;
  phone: string | null;
  industryType: string;
  countryIso2?: string;
  /** superadmin, si el alta la hizo una persona; null en el flujo por pago. */
  createdBy: string | null;
}

/**
 * Crea: usuario de Auth (sin password, email_confirm) + negocio + completa
 * la fila que deja el trigger on_business_created en business_members.
 * NO crea agent_configs (eso ocurre al terminar el onboarding). Rollback en
 * cascada si algo falla a mitad de camino.
 */
async function provisionAccountCore(input: ProvisionCoreInput): Promise<ProvisionResult> {
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
    console.error("[provisionAccountCore] error al crear businesses:", businessError?.message);
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
    console.error("[provisionAccountCore] error al completar business_members:", memberError.message);
    await admin.from("businesses").delete().eq("id", business.id);
    await admin.auth.admin.deleteUser(newUser.user.id);
    return { error: translateError(memberError), businessId: null };
  }

  return { error: null, businessId: business.id };
}

/**
 * Cuenta MÍNIMA para el flujo por pago / alta manual: usuario + negocio con
 * nombre e industria provisionales, sin agente. El dueño completa los datos
 * reales y genera el agente en /bienvenida
 * (onboardingService.completeOnboarding).
 */
export async function provisionMinimalAccount(input: {
  email: string;
  createdBy: string | null;
}): Promise<ProvisionResult> {
  const localPart = input.email.split("@")[0]?.trim() || "Mi negocio";
  return provisionAccountCore({
    email: input.email,
    fullName: localPart,
    businessName: "Mi negocio",
    phone: null,
    industryType: DEFAULT_INDUSTRY_TYPE,
    createdBy: input.createdBy,
  });
}

/**
 * Crea (o reemplaza) agent_configs de un negocio desde la plantilla COMPLETA
 * de su industria. Lo usa el onboarding al terminar. Idempotente (upsert por
 * business_id) para tolerar un doble submit.
 */
export async function createAgentConfigFromTemplate(
  businessId: string,
  industryType: string,
  businessDescription?: string | null
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const template = await getIndustryTemplate(industryType);
  const { error } = await admin.from("agent_configs").upsert(
    {
      business_id: businessId,
      // Lo único que NO viene de la plantilla: lo escribe el dueño en el
      // paso 3 del onboarding ("¿Qué vende u ofrece tu negocio?").
      business_description: businessDescription?.trim() || null,
      enabled_tools: template.toolKeys,
      personality: template.personality,
      greeting_message: template.greetingMessage,
      escalation_message: template.escalationMessage,
      fallback_message: template.fallbackMessage,
      after_hours_message: template.afterHoursMessage,
      farewell_message: template.farewellMessage,
      faqs: template.faqs,
      response_length: template.responseLength,
      // Ya no se adivina desde un booleano — la plantilla trae su propio
      // emoji_mode/address_form/escalation_triggers/language, igual que Mi
      // Agente. Ver docs/sql/industry-templates-persona.sql.
      emoji_mode: template.emojiMode,
      emoji_set: template.emojiSet,
      address_form: template.addressForm,
      escalation_triggers: template.escalationTriggers,
      language: template.language,
      restrictions: template.restrictions,
    },
    { onConflict: "business_id" }
  );

  if (error) {
    console.error("[createAgentConfigFromTemplate] error al crear agent_configs:", error.message);
    return { error: translateError(error) };
  }
  return { error: null };
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

/**
 * Alta manual del superadmin (cortesías / soporte). Mismo camino que el
 * webhook: provisiona la cuenta mínima directo. El negocio aparece en
 * Registros y el dueño onboardea en su primer login.
 */
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

  const provision = await provisionMinimalAccount({ email, createdBy: params.createdBy });
  if (provision.error || !provision.businessId) {
    return { error: provision.error ?? "No se pudo crear la cuenta" };
  }

  try {
    await applyPlanToBusiness(provision.businessId, plan.key, params.billingPeriod);
  } catch (err) {
    console.error("[createManualPendingRegistration] no se pudieron acreditar los créditos:", err);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("pending_registrations").insert({
    email,
    token_hash: throwawayTokenHash(),
    plan_id: plan.id,
    plan_key: plan.key,
    billing_period: params.billingPeriod,
    source: "manual",
    status: "completed",
    business_id: provision.businessId,
    created_by: params.createdBy,
    completed_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[createManualPendingRegistration] pending_registrations:", error.message);
  }

  const { error: mailError } = await sendAccountReadyEmail(email);
  if (mailError) {
    return { error: `Cuenta creada, pero el correo falló: ${mailError}` };
  }

  return { error: null };
}

/**
 * Reenvía el correo de "cuenta lista" a un registro existente — para
 * soporte, cuando el dueño perdió el correo original. Ya no hay token ni
 * link que rotar: la cuenta existe desde que se creó el registro.
 */
export async function resendAccountReadyEmail(id: string): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { data: reg } = await admin
    .from("pending_registrations")
    .select("email, business_id")
    .eq("id", id)
    .maybeSingle();

  if (!reg) return { error: "Registro no encontrado" };

  const { error } = await sendAccountReadyEmail((reg as { email: string }).email);
  return { error: error ?? null };
}
