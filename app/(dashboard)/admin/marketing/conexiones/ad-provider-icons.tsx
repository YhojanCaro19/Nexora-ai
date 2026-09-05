// Logos de marca de las plataformas de pauta. Los archivos viven en
// public/marketing/ (los pasó el usuario). Se muestran tal cual, con sus
// colores oficiales — mismo patrón que channel-icons.tsx en Perfil.
import Image from "next/image";
import type { AdProvider } from "@/lib/types/adAccount";

const SRC: Record<AdProvider, string> = {
  meta: "/marketing/meta.png",
  google: "/marketing/google.png",
  tiktok: "/marketing/tiktok.png",
};

const LABEL: Record<AdProvider, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  tiktok: "TikTok Ads",
};

export function AdProviderIcon({ provider, size = 22 }: { provider: AdProvider; size?: number }) {
  return (
    <Image
      src={SRC[provider]}
      alt={LABEL[provider]}
      width={size}
      height={size}
      // Logos ya vienen a buen tamaño → optimizarlos no ahorra nada y el
      // caché de next/image se queda con la versión vieja al reemplazar el
      // archivo (mismo motivo que channel-icons.tsx).
      unoptimized
      className="shrink-0 object-contain"
    />
  );
}
