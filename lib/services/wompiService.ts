// lib/services/wompiService.ts
//
// Todo lo específico de Wompi vive acá — el resto del código no sabe cómo
// se firma una transacción ni cómo se valida un evento, solo llama a estas
// funciones. Mismo criterio que emailService.ts: nada se lee del entorno
// en el top-level del módulo, así importar este archivo nunca revienta el
// build si las llaves todavía no están configuradas; solo falla cuando de
// verdad se intenta usar Wompi sin llaves.
//
// Ambientes y llaves: docs/setup-credits-payments.md §2.
//   WOMPI_ENV               'sandbox' | 'production'
//   WOMPI_PUBLIC_KEY        pub_test_ / pub_prod_
//   WOMPI_PRIVATE_KEY       prv_test_ / prv_prod_   (server-to-server)
//   WOMPI_EVENTS_SECRET     test_events_ / prod_events_   (firma de webhooks)
//   WOMPI_INTEGRITY_SECRET  test_integrity_ / prod_integrity_ (firma del checkout)
import { createHash, timingSafeEqual } from "crypto";

const CURRENCY = "COP";

// Web Checkout (redirección) — la página donde el cliente elige método de
// pago e ingresa su correo. Es la misma URL en sandbox y producción; lo
// que cambia es la llave pública.
const WEB_CHECKOUT_URL = "https://checkout.wompi.co/p/";

function apiBaseUrl(): string {
  return process.env.WOMPI_ENV === "production"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ---- Checkout (redirección a Wompi) --------------------------------

export interface BuildCheckoutUrlInput {
  reference: string;
  amountInCents: number;
  redirectUrl: string;
  /** Prellena (no bloquea) el correo en el checkout de Wompi. */
  customerEmail?: string;
  /** Vigencia del enlace de pago; ISO 8601. */
  expiresAt?: string;
}

/**
 * URL de Web Checkout con la firma de integridad. El cliente entra ahí,
 * elige método de pago e ingresa su correo. Wompi valida que
 * `signature:integrity` = SHA256(reference + amountInCents + currency + secret).
 */
export function buildCheckoutUrl(input: BuildCheckoutUrlInput): string {
  const publicKey = requireEnv("WOMPI_PUBLIC_KEY");
  const integritySecret = requireEnv("WOMPI_INTEGRITY_SECRET");

  const signature = sha256Hex(
    `${input.reference}${input.amountInCents}${CURRENCY}${integritySecret}`
  );

  const params = new URLSearchParams({
    "public-key": publicKey,
    currency: CURRENCY,
    "amount-in-cents": String(input.amountInCents),
    reference: input.reference,
    "redirect-url": input.redirectUrl,
    "signature:integrity": signature,
  });
  if (input.customerEmail) params.set("customer-data:email", input.customerEmail);
  if (input.expiresAt) params.set("expiration-time", input.expiresAt);

  return `${WEB_CHECKOUT_URL}?${params.toString()}`;
}

// ---- Webhook (validación de eventos) -------------------------------

export interface WompiTransaction {
  id: string;
  status: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING";
  reference: string;
  amount_in_cents: number;
  currency: string;
  customer_email: string | null;
}

export interface WompiEvent {
  event: string;
  data: { transaction?: WompiTransaction };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
  environment?: string;
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Recalcula el checksum del evento y lo compara en tiempo constante.
 * Algoritmo Wompi (docs.wompi.co/docs/colombia/eventos):
 *   concat(valores de data según signature.properties, en orden)
 *   + timestamp + WOMPI_EVENTS_SECRET  → SHA256 hex (mayúsculas)
 *
 * Devuelve false ante cualquier duda — nunca se procesa un evento sin match.
 */
export function verifyEventChecksum(event: WompiEvent): boolean {
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  if (!eventsSecret) {
    console.error("[wompiService] WOMPI_EVENTS_SECRET no configurada — se rechaza el evento");
    return false;
  }
  if (!event?.signature?.checksum || !Array.isArray(event.signature.properties)) {
    return false;
  }

  const concatenated = event.signature.properties
    .map((path) => {
      const value = getByPath(event.data, path);
      return value === undefined || value === null ? "" : String(value);
    })
    .join("");

  const computed = sha256Hex(`${concatenated}${event.timestamp}${eventsSecret}`).toUpperCase();
  const received = event.signature.checksum.toUpperCase();

  const a = Buffer.from(computed);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Reconfirma una transacción server-to-server con la llave privada — no se
 * confía solo en el body del webhook para acreditar dinero. Devuelve null
 * si no se puede leer (red, llave, 404).
 */
export async function fetchTransaction(id: string): Promise<WompiTransaction | null> {
  try {
    const res = await fetch(`${apiBaseUrl()}/transactions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${requireEnv("WOMPI_PRIVATE_KEY")}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[wompiService.fetchTransaction] respuesta no OK:", res.status);
      return null;
    }
    const json = (await res.json()) as { data?: WompiTransaction };
    return json.data ?? null;
  } catch (err) {
    console.error("[wompiService.fetchTransaction] excepción:", err);
    return null;
  }
}
