// lib/types/channel.ts
//
// Tipos compartidos del módulo de Canales (conectar el agente a
// WhatsApp / Messenger / Instagram vía una sola app de Meta).
// Ver docs/channels-module-plan.md.

/** Los tres canales de Meta que el agente puede atender. */
export const CHANNELS = ["messenger", "instagram", "whatsapp"] as const;
export type Channel = (typeof CHANNELS)[number];

export function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}

/** Canal interno de prueba (admin logueado probando su agente). */
export const TEST_CHANNEL = "test";

export const CHANNEL_LABELS: Record<Channel, string> = {
  messenger: "Facebook (Messenger)",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

export type ChannelConnectionStatus = "active" | "expired" | "revoked" | "error";

/**
 * Fila de `channel_connections` SIN el token — es lo único que puede
 * viajar al cliente. El token se descifra aparte, solo en código server.
 */
export interface ChannelConnectionPublic {
  id: string;
  businessId: string;
  channel: Channel;
  provider: string;
  externalId: string;
  externalName: string | null;
  tokenExpiresAt: string | null;
  webhookSubscribed: boolean;
  status: ChannelConnectionStatus;
  lastError: string | null;
  connectedAt: string;
}
