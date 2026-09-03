// Íconos de los canales. Los logos de marca reales los va a pasar el
// usuario como archivos → cuando lleguen, se ponen en `public/channels/`
// y este componente los muestra con <img>. Por ahora, íconos neutros de
// lucide en el color de acento del panel.
import { MessageSquare, Camera, Phone } from "lucide-react";
import type { Channel } from "@/lib/types/channel";

const LUCIDE = {
  messenger: MessageSquare,
  instagram: Camera,
  whatsapp: Phone,
} as const;

export function ChannelIcon({ channel, size = 20 }: { channel: Channel; size?: number }) {
  const Icon = LUCIDE[channel];
  return (
    <Icon size={size} strokeWidth={1.75} style={{ color: "var(--nexora-nova)" }} aria-hidden />
  );
}
