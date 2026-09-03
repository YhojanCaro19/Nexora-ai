// Logos de marca de los canales. Los archivos viven en public/channels/
// (los pasó el usuario). Se muestran tal cual, con sus colores oficiales —
// es una pantalla de "conectar tus redes" donde la gente los reconoce de
// un vistazo.
import Image from "next/image";
import type { Channel } from "@/lib/types/channel";

const SRC: Record<Channel, string> = {
  messenger: "/channels/messenger.png",
  instagram: "/channels/instagram.png",
  whatsapp: "/channels/whatsapp.png",
};

const LABEL: Record<Channel, string> = {
  messenger: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

export function ChannelIcon({ channel, size = 22 }: { channel: Channel; size?: number }) {
  return (
    <Image
      src={SRC[channel]}
      alt={LABEL[channel]}
      width={size}
      height={size}
      className="shrink-0 object-contain"
    />
  );
}
