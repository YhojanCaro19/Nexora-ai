// lib/services/metaChannelService.ts
//
// Envío de mensajes salientes del agente por los canales de Meta. Un solo
// punto de entrada (`sendChannelMessage`), tres formas de request según el
// canal. Reutiliza `graphPost` de metaGraphClient.
//
// Solo texto en v1 (el motor devuelve un string por turno). Adjuntos,
// botones y plantillas se agregan cuando haga falta.
//
// La "ventana de 24 h" (fuera de ella WhatsApp exige plantilla y
// Messenger/IG message tags) todavía NO se maneja acá — se agrega en la
// Fase 6. Ver docs/channels-module-plan.md §4.9.
import { graphPost, GraphApiError } from "@/lib/services/metaGraphClient";
import type { ChannelConnectionWithToken } from "@/lib/services/channelConnectionService";

interface SendResult {
  error: string | null;
  /** Código de error de Graph (190 = token inválido, 10/200 = permisos, 613 = rate limit). */
  graphCode?: number | null;
}

/**
 * Envía un mensaje de texto al cliente identificado por `recipientId`:
 *   - Messenger / Instagram → PSID / IGSID (viene del webhook)
 *   - WhatsApp              → teléfono E.164 sin "+"
 */
export async function sendChannelMessage(
  connection: ChannelConnectionWithToken,
  recipientId: string,
  text: string
): Promise<SendResult> {
  const body = text.trim();
  if (!body) return { error: "Mensaje vacío, no se envía." };

  try {
    switch (connection.channel) {
      case "messenger":
        await graphPost(
          `${connection.externalId}/messages`,
          {
            recipient: { id: recipientId },
            messaging_type: "RESPONSE",
            message: { text: body },
          },
          connection.accessToken
        );
        return { error: null };

      case "instagram":
        await graphPost(
          `${connection.externalId}/messages`,
          {
            recipient: { id: recipientId },
            message: { text: body },
          },
          connection.accessToken
        );
        return { error: null };

      case "whatsapp":
        await graphPost(
          `${connection.externalId}/messages`,
          {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipientId,
            type: "text",
            text: { body },
          },
          connection.accessToken
        );
        return { error: null };
    }
  } catch (err) {
    if (err instanceof GraphApiError) {
      console.error(
        `[sendChannelMessage] ${connection.channel} code=${err.code} trace=${err.fbtraceId}: ${err.message}`
      );
      return { error: err.message, graphCode: err.code };
    }
    console.error("[sendChannelMessage] error inesperado:", err);
    return { error: "No se pudo enviar el mensaje." };
  }
}

/** Códigos de Graph que significan "el token murió, hay que reconectar". */
export function isAuthError(graphCode: number | null | undefined): boolean {
  return graphCode === 190 || graphCode === 10 || graphCode === 200 || graphCode === 463;
}
