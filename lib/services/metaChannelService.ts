// lib/services/metaChannelService.ts
//
// Envío de mensajes salientes del agente por los canales de Meta. Un solo
// punto de entrada (`sendChannelMessage`), tres formas de request según el
// canal. Reutiliza `graphPost` de metaGraphClient.
//
// Solo texto en v1 (el motor devuelve un string por turno). Adjuntos,
// botones y plantillas se agregan cuando haga falta.
//
// Ventana de 24 h: dentro de ella se responde libre (`RESPONSE`). Fuera de
// ella, Messenger permite ciertos "message tags" (ej.
// `CONFIRMED_EVENT_UPDATE` para recordatorios de una cita ya confirmada);
// Instagram no soporta ese tag y WhatsApp exige una plantilla aprobada
// (todavía no tenemos). El llamador pasa `opts.tag` cuando sabe que puede
// estar fuera de la ventana; si el envío falla, es cosa del llamador caer
// a otro medio (ej. dejar el mensaje en el hilo del CRM).
// Ver docs/channels-module-plan.md §4.9.
import { graphPost, GraphApiError } from "@/lib/services/metaGraphClient";
import { sendInstagramMessage } from "@/lib/services/instagramLoginService";
import type { ChannelConnectionWithToken } from "@/lib/services/channelConnectionService";

interface SendResult {
  error: string | null;
  /** Código de error de Graph (190 = token inválido, 10/200 = permisos, 613 = rate limit). */
  graphCode?: number | null;
}

export interface SendChannelMessageOptions {
  /**
   * Messenger: message tag para enviar FUERA de la ventana de 24 h.
   * Para recordatorios de citas confirmadas usa `CONFIRMED_EVENT_UPDATE`.
   * Ignorado en Instagram y WhatsApp (ver comentario del archivo).
   */
  tag?: string;
}

/**
 * Envía un mensaje de texto al cliente identificado por `recipientId`:
 *   - Messenger / Instagram → PSID / IGSID (viene del webhook)
 *   - WhatsApp              → teléfono E.164 sin "+"
 */
export async function sendChannelMessage(
  connection: ChannelConnectionWithToken,
  recipientId: string,
  text: string,
  opts: SendChannelMessageOptions = {}
): Promise<SendResult> {
  const body = text.trim();
  if (!body) return { error: "Mensaje vacío, no se envía." };

  try {
    switch (connection.channel) {
      case "messenger": {
        const payload: Record<string, unknown> = opts.tag
          ? { recipient: { id: recipientId }, messaging_type: "MESSAGE_TAG", tag: opts.tag, message: { text: body } }
          : { recipient: { id: recipientId }, messaging_type: "RESPONSE", message: { text: body } };
        await graphPost(`${connection.externalId}/messages`, payload, connection.accessToken);
        return { error: null };
      }

      case "instagram": {
        // Instagram Login directo → host graph.instagram.com.
        if (connection.provider === "instagram_login") {
          const r = await sendInstagramMessage(
            connection.externalId,
            connection.accessToken,
            recipientId,
            body
          );
          return { error: r.error, graphCode: r.code ?? null };
        }
        // IG ligada a una Página de FB → Messenger Platform (graph.facebook.com).
        await graphPost(
          `${connection.externalId}/messages`,
          {
            recipient: { id: recipientId },
            message: { text: body },
          },
          connection.accessToken
        );
        return { error: null };
      }

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
