// app/(dashboard)/admin/clientes/channel-labels.ts
//
// `customers.channel`/`conversations.channel` son texto libre en la base
// (ver customerService.ts) — hoy el único valor real es "test" (canal de
// prueba interno, ver TEST_CHANNEL en agentEngineService.ts). Este mapa
// traduce los valores conocidos a algo legible sin romper si en el futuro
// llega un canal nuevo (ej. "whatsapp") que todavía no está en el mapa:
// cae al valor crudo en vez de mostrar undefined.
const CHANNEL_LABELS: Record<string, string> = {
  test: "Canal de prueba",
  whatsapp: "WhatsApp",
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}
