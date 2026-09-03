// app/api/webhooks/meta/route.ts
//
// Webhook ÚNICO para los tres canales de Meta (Messenger, Instagram,
// WhatsApp). Meta distingue el canal en el campo `object` del body.
//
//   GET  → handshake de verificación (hub.challenge)
//   POST → mensaje entrante:
//     1. verificar la firma X-Hub-Signature-256 (HMAC del raw body con el
//        App Secret) — igual criterio que app/api/webhooks/wompi
//     2. enrutar por `object`, resolver el negocio por el id que recibió
//        el mensaje (Page ID / IG id / phone_number_id)
//     3. runAgentTurn(...) → metaChannelService.sendChannelMessage(...)
//     4. responder 200
//
// Dedupe best-effort en memoria por id de mensaje: Meta reintenta si no
// ve un 2xx a tiempo y no queremos responder dos veces al cliente. Para
// producción multi-instancia esto necesita un store durable.
//
// Ver docs/channels-module-plan.md §4.6.
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getConnectionByExternalId } from "@/lib/services/channelConnectionService";
import { sendChannelMessage, isAuthError } from "@/lib/services/metaChannelService";
import { markConnectionError } from "@/lib/services/channelConnectionService";
import { runAgentTurn } from "@/lib/services/agentEngineService";
import type { Channel } from "@/lib/types/channel";

export const dynamic = "force-dynamic";

// ── verificación ─────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const got = header.slice("sha256=".length);
  const a = Buffer.from(got, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── dedupe best-effort ───────────────────────────────────────────────────

const seen = new Set<string>();
function alreadyHandled(id: string): boolean {
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 2000) seen.delete(seen.values().next().value as string);
  return false;
}

// ── tipos mínimos del payload ────────────────────────────────────────────

interface MessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean };
}
interface WhatsAppValue {
  metadata?: { phone_number_id?: string };
  messages?: { id?: string; from?: string; type?: string; text?: { body?: string } }[];
}
interface WebhookEntry {
  id?: string;
  messaging?: MessagingEvent[];
  changes?: { value?: WhatsAppValue }[];
}
interface WebhookBody {
  object?: string;
  entry?: WebhookEntry[];
}

// ── entrante ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    console.error("[webhooks/meta] firma inválida — rechazado");
    return new NextResponse("invalid signature", { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  try {
    if (body.object === "page" || body.object === "instagram") {
      const channel: Channel = body.object === "page" ? "messenger" : "instagram";
      for (const entry of body.entry ?? []) {
        const receiverId = entry.id;
        for (const ev of entry.messaging ?? []) {
          await handleMessengerLike(channel, receiverId, ev);
        }
      }
    } else if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          await handleWhatsApp(change.value);
        }
      }
    }
  } catch (err) {
    // 200 igual — un reintento de Meta no arregla un bug nuestro.
    console.error("[webhooks/meta] error procesando:", err);
  }

  return NextResponse.json({ received: true });
}

async function handleMessengerLike(
  channel: Channel,
  receiverId: string | undefined,
  ev: MessagingEvent
): Promise<void> {
  const text = ev.message?.text?.trim();
  const senderId = ev.sender?.id;
  const mid = ev.message?.mid;
  if (!receiverId || !senderId || !text || ev.message?.is_echo) return;
  if (mid && alreadyHandled(mid)) return;

  const connection = await getConnectionByExternalId(channel, receiverId);
  if (!connection || connection.status !== "active") {
    console.warn(`[webhooks/meta] ${channel} sin conexión activa para ${receiverId}`);
    return;
  }

  const result = await runAgentTurn(connection.businessId, senderId, text, channel, {
    serviceRole: true,
  });
  if (result.error || !result.reply) {
    console.error(`[webhooks/meta] runAgentTurn: ${result.error ?? "sin respuesta"}`);
    return;
  }

  const sent = await sendChannelMessage(connection, senderId, result.reply);
  if (sent.error && isAuthError(sent.graphCode)) {
    await markConnectionError(connection.id, sent.error);
  }
}

async function handleWhatsApp(value: WhatsAppValue | undefined): Promise<void> {
  const phoneNumberId = value?.metadata?.phone_number_id;
  if (!phoneNumberId) return;

  for (const msg of value?.messages ?? []) {
    const text = msg.type === "text" ? msg.text?.body?.trim() : undefined;
    const from = msg.from;
    if (!from || !text) continue;
    if (msg.id && alreadyHandled(msg.id)) continue;

    const connection = await getConnectionByExternalId("whatsapp", phoneNumberId);
    if (!connection || connection.status !== "active") {
      console.warn(`[webhooks/meta] whatsapp sin conexión activa para ${phoneNumberId}`);
      continue;
    }

    const result = await runAgentTurn(connection.businessId, from, text, "whatsapp", {
      serviceRole: true,
    });
    if (result.error || !result.reply) continue;

    const sent = await sendChannelMessage(connection, from, result.reply);
    if (sent.error && isAuthError(sent.graphCode)) {
      await markConnectionError(connection.id, sent.error);
    }
  }
}
