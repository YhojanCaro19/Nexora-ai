// app/(dashboard)/admin/mi-agente/canales/page.tsx
//
// Mi Agente → Canales. El admin conecta las redes del negocio (Messenger,
// Instagram, WhatsApp) para que el agente responda ahí. El rol ya lo
// valida app/(dashboard)/admin/layout.tsx.
import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSessionProfile } from "@/lib/auth/get-session";
import { listConnectionsForBusiness } from "@/lib/services/channelConnectionService";
import { CanalesPanel } from "./canales-panel";

export default async function CanalesPage() {
  const profile = await getSessionProfile();
  const connections = profile?.businessId
    ? await listConnectionsForBusiness(profile.businessId)
    : [];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/mi-agente"
          className="mx-auto flex w-fit items-center gap-1 text-xs"
          style={{ color: "var(--nexora-ink-dim)" }}
        >
          <ChevronLeft size={14} /> Mi Agente
        </Link>
        <h1
          className="mt-2 font-nexora text-xl text-center"
          style={{ color: "var(--nexora-ink)" }}
        >
          Canales
        </h1>
        <p
          className="mx-auto mt-1 max-w-md text-center text-xs leading-relaxed"
          style={{ color: "var(--nexora-ink-dim)" }}
        >
          Conecta las redes de tu negocio para que el agente responda los
          mensajes ahí. Puedes desconectar cuando quieras.
        </p>
      </div>

      <Suspense fallback={null}>
        <CanalesPanel connections={connections} />
      </Suspense>
    </div>
  );
}
